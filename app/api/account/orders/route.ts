import { env } from "cloudflare:workers";
import { requireUser } from "../../../auth";
import {
  createMercadoPagoPreference,
  mercadoPagoConfigured,
} from "../../../mercado-pago";
import { quoteShipping, ShippingError } from "../../../shipping";

export async function GET() {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const [orders, items] = await Promise.all([
    env.DB.prepare(
      `SELECT o.id,o.total_cents AS totalCents,o.status,o.payment_provider AS paymentProvider,
    o.vehicle_plate AS vehiclePlate,o.shipping_address AS shippingAddress,
    o.shipping_carrier AS shippingCarrier,o.shipping_service AS shippingService,
    o.shipping_cents AS shippingCents,o.shipping_delivery_days AS shippingDeliveryDays,
    o.tracking_code AS trackingCode,o.shipped_at AS shippedAt,o.created_at AS createdAt,
    COALESCE((SELECT SUM(i.quantity) FROM order_snapshot_items i WHERE i.order_id=o.id),0) AS itemCount
    FROM orders o WHERE o.user_id=? ORDER BY o.created_at DESC`,
    )
      .bind(user.id)
      .all(),
    env.DB.prepare(
      `SELECT i.order_id AS orderId,i.item_key AS itemKey,i.name,i.unit_price_cents AS unitPriceCents,i.quantity
      FROM order_snapshot_items i JOIN orders o ON o.id=i.order_id
      WHERE o.user_id=? ORDER BY i.order_id,i.name`,
    )
      .bind(user.id)
      .all(),
  ]);
  const lines = items.results as Array<{
    orderId: string;
    itemKey: string;
    name: string;
    unitPriceCents: number;
    quantity: number;
  }>;
  return Response.json({
    orders: orders.results.map((order) => ({
      ...order,
      items: lines.filter((item) => item.orderId === order.id),
    })),
  });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user)
    return Response.json(
      { error: "Entre na conta para finalizar a compra." },
      { status: 401 },
    );
  if (!user.emailVerifiedAt)
    return Response.json(
      {
        error: "Confirme seu e-mail antes de finalizar a compra.",
        code: "EMAIL_NOT_VERIFIED",
      },
      { status: 403 },
    );
  const input = (await request.json()) as {
    phone?: string;
    postalCode?: string;
    address?: string;
    vehiclePlate?: string;
    shippingServiceId?: string;
    items?: Array<{ itemKey: string; quantity: number }>;
  };
  const requested = (input.items ?? [])
    .map((item) => ({
      code: String(item.itemKey ?? "").trim(),
      quantity: Math.floor(Number(item.quantity)),
    }))
    .filter((item) => item.code && item.quantity > 0 && item.quantity <= 99)
    .slice(0, 100);
  const quantities = new Map<string, number>();
  for (const item of requested)
    quantities.set(item.code, (quantities.get(item.code) ?? 0) + item.quantity);
  const codes = [...quantities.keys()];
  if (!codes.length)
    return Response.json({ error: "O carrinho está vazio." }, { status: 400 });

  const placeholders = codes.map(() => "?").join(",");
  const result = await env.DB.prepare(
    `SELECT code,product,application,price_cents AS priceCents,stock_quantity AS stockQuantity
    FROM products WHERE active=1 AND code IN (${placeholders})`,
  )
    .bind(...codes)
    .all();
  const available = new Map(
    (
      result.results as Array<{
        code: string;
        product: string;
        application: string;
        priceCents: number | null;
        stockQuantity: number | null;
      }>
    ).map((item) => [item.code, item]),
  );
  const items = codes.map((code) => ({
    product: available.get(code),
    quantity: quantities.get(code)!,
  }));
  const invalid = items.find(
    (item) =>
      !item.product ||
      item.product.priceCents == null ||
      item.product.stockQuantity == null ||
      item.product.stockQuantity < item.quantity,
  );
  if (invalid)
    return Response.json(
      {
        error: !invalid.product
          ? "Um produto não está mais disponível."
          : invalid.product.priceCents == null
            ? `${invalid.product.code} ainda não possui preço.`
            : `Estoque insuficiente para ${invalid.product.code}.`,
      },
      { status: 409 },
    );
  const validItems = items as Array<{
    product: {
      code: string;
      product: string;
      application: string;
      priceCents: number;
      stockQuantity: number;
    };
    quantity: number;
  }>;
  const itemsTotal = validItems.reduce(
    (sum, item) => sum + item.product.priceCents * item.quantity,
    0,
  );
  // Freight is recalculated here from the delivery CEP and the server-side
  // product data; the client only chooses which quoted service to use.
  let shipping;
  try {
    const options = await quoteShipping(
      input.postalCode,
      validItems.map((item) => ({ code: item.product.code, quantity: item.quantity })),
    );
    shipping = options.find((option) => option.id === String(input.shippingServiceId ?? ""));
  } catch (error) {
    if (error instanceof ShippingError)
      return Response.json({ error: error.message, code: error.code }, { status: error.code === "INVALID_POSTAL_CODE" ? 400 : 422 });
    throw error;
  }
  if (!shipping)
    return Response.json(
      { error: "A opção de frete escolhida não está mais disponível. Calcule o frete novamente.", code: "SHIPPING_CHANGED" },
      { status: 409 },
    );
  const total = itemsTotal + shipping.priceCents;
  // Random suffix: two checkouts in the same millisecond must not collide.
  const id = `HP-${Date.now().toString(36).toUpperCase()}${crypto.getRandomValues(new Uint8Array(2)).reduce((code, byte) => code + byte.toString(36).toUpperCase().padStart(2, "0"), "")}`;
  const text = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);

  // Reserve stock first. Each UPDATE only applies while enough stock remains,
  // so concurrent checkouts for the last units cannot both succeed; if any line
  // could not be reserved, give back what was taken and refuse the order.
  const reservations = await env.DB.batch(
    validItems.map((item) =>
      env.DB.prepare(
        "UPDATE products SET stock_quantity=stock_quantity-?,updated_at=CURRENT_TIMESTAMP WHERE code=? AND stock_quantity>=?",
      ).bind(item.quantity, item.product.code, item.quantity),
    ),
  );
  const reserved = validItems.filter((_, index) => (reservations[index]?.meta?.changes ?? 0) > 0);
  const releaseStock = (items: typeof validItems) =>
    items.length
      ? env.DB.batch(items.map((item) =>
          env.DB.prepare(
            "UPDATE products SET stock_quantity=stock_quantity+?,updated_at=CURRENT_TIMESTAMP WHERE code=?",
          ).bind(item.quantity, item.product.code),
        ))
      : Promise.resolve([]);
  if (reserved.length !== validItems.length) {
    await releaseStock(reserved);
    const missing = validItems.find((item) => !reserved.includes(item))!;
    return Response.json(
      { error: `Estoque insuficiente para ${missing.product.code}.` },
      { status: 409 },
    );
  }

  const statements = [
    env.DB.prepare(
      `INSERT INTO orders (id,user_id,customer_name,customer_email,customer_phone,postal_code,shipping_address,vehicle_plate,total_cents,
      shipping_cents,shipping_carrier,shipping_service,shipping_service_id,shipping_delivery_days,status,payment_provider)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'awaiting_payment','pending_provider')`,
    ).bind(
      id,
      user.id,
      user.name,
      user.email,
      text(input.phone, 20) || user.phone,
      text(input.postalCode, 9),
      text(input.address, 300),
      text(input.vehiclePlate, 8).toUpperCase(),
      total,
      shipping.priceCents,
      shipping.carrier,
      shipping.service,
      shipping.id,
      shipping.deliveryDays,
    ),
    ...validItems.map((item) =>
      env.DB.prepare(
        "INSERT INTO order_snapshot_items (id,order_id,item_key,name,unit_price_cents,quantity) VALUES (?,?,?,?,?,?)",
      ).bind(
        crypto.randomUUID(),
        id,
        item.product.code,
        item.product.product,
        item.product.priceCents,
        item.quantity,
      ),
    ),
  ];
  try {
    await env.DB.batch(statements);
  } catch (error) {
    await releaseStock(validItems);
    throw error;
  }
  await env.DB.prepare("DELETE FROM saved_cart_items WHERE user_id=?")
    .bind(user.id)
    .run();
  let payment: {
    configured: boolean;
    checkoutUrl?: string;
    message?: string;
  } = {
    configured: mercadoPagoConfigured(request),
    message: "Pedido salvo. Não foi possível abrir o pagamento agora.",
  };
  if (payment.configured) {
    try {
      const preference = await createMercadoPagoPreference({
        request,
        orderId: id,
        payer: { name: user.name, email: user.email },
        items: validItems.map((item) => ({
          code: item.product.code,
          name: item.product.product,
          quantity: item.quantity,
          unitPriceCents: item.product.priceCents,
        })),
        shipping: { cents: shipping.priceCents, label: `${shipping.carrier} ${shipping.service}` },
      });
      await env.DB.prepare(
        "UPDATE orders SET payment_provider='mercado_pago',payment_reference=?,payment_mode=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
      ).bind(preference.id, preference.mode, id).run();
      payment = { configured: true, checkoutUrl: preference.checkoutUrl };
    } catch (error) {
      console.error("order_payment_preference_failed", id, error);
    }
  }
  return Response.json(
    {
      order: { id, totalCents: total, shippingCents: shipping.priceCents, status: "awaiting_payment" },
      payment,
    },
    { status: 201 },
  );
}
