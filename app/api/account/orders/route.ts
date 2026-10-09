import { env } from "cloudflare:workers";
import { requireUser } from "../../../auth";

export async function GET() {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const orders = await env.DB.prepare(`SELECT o.id,o.total_cents AS totalCents,o.status,o.payment_provider AS paymentProvider,
    o.vehicle_plate AS vehiclePlate,o.shipping_address AS shippingAddress,o.created_at AS createdAt,
    COALESCE((SELECT SUM(i.quantity) FROM order_snapshot_items i WHERE i.order_id=o.id),0) AS itemCount
    FROM orders o WHERE o.user_id=? ORDER BY o.created_at DESC`).bind(user.id).all();
  return Response.json({ orders: orders.results });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Entre na conta para finalizar a compra." }, { status: 401 });
  if (!user.emailVerifiedAt) return Response.json({ error: "Confirme seu e-mail antes de finalizar a compra.", code: "EMAIL_NOT_VERIFIED" }, { status: 403 });
  const input = await request.json() as { phone?: string; postalCode?: string; address?: string; vehiclePlate?: string; items?: Array<{ itemKey: string; quantity: number }> };
  const requested = (input.items ?? [])
    .map((item) => ({ code: String(item.itemKey ?? "").trim(), quantity: Math.floor(Number(item.quantity)) }))
    .filter((item) => item.code && item.quantity > 0 && item.quantity <= 99)
    .slice(0, 100);
  const quantities = new Map<string, number>();
  for (const item of requested) quantities.set(item.code, (quantities.get(item.code) ?? 0) + item.quantity);
  const codes = [...quantities.keys()];
  if (!codes.length) return Response.json({ error: "O carrinho está vazio." }, { status: 400 });

  const placeholders = codes.map(() => "?").join(",");
  const result = await env.DB.prepare(`SELECT code,product,application,price_cents AS priceCents,stock_quantity AS stockQuantity
    FROM products WHERE active=1 AND code IN (${placeholders})`).bind(...codes).all();
  const available = new Map((result.results as Array<{code:string;product:string;application:string;priceCents:number|null;stockQuantity:number|null}>).map((item) => [item.code, item]));
  const items = codes.map((code) => ({ product: available.get(code), quantity: quantities.get(code)! }));
  const invalid = items.find((item) => !item.product || item.product.priceCents == null || item.product.stockQuantity == null || item.product.stockQuantity < item.quantity);
  if (invalid) return Response.json({ error: !invalid.product ? "Um produto não está mais disponível." : invalid.product.priceCents == null ? `${invalid.product.code} ainda não possui preço.` : `Estoque insuficiente para ${invalid.product.code}.` }, { status: 409 });
  const validItems = items as Array<{ product: {code:string;product:string;application:string;priceCents:number;stockQuantity:number}; quantity:number }>;
  const total = validItems.reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0);
  const id = `HP-${Date.now().toString(36).toUpperCase()}`;
  const statements = [
    env.DB.prepare(`INSERT INTO orders (id,user_id,customer_name,customer_email,customer_phone,postal_code,shipping_address,vehicle_plate,total_cents,status,payment_provider)
      VALUES (?,?,?,?,?,?,?,?,?,'awaiting_payment','pending_provider')`).bind(id, user.id, user.name, user.email, input.phone ?? user.phone, input.postalCode ?? "", input.address ?? "", input.vehiclePlate ?? "", total),
    ...validItems.map((item) => env.DB.prepare("INSERT INTO order_snapshot_items (id,order_id,item_key,name,unit_price_cents,quantity) VALUES (?,?,?,?,?,?)")
      .bind(crypto.randomUUID(), id, item.product.code, item.product.product, item.product.priceCents, item.quantity)),
    ...validItems.map((item) => env.DB.prepare("UPDATE products SET stock_quantity=stock_quantity-?,updated_at=CURRENT_TIMESTAMP WHERE code=? AND stock_quantity>=?")
      .bind(item.quantity, item.product.code, item.quantity)),
  ];
  await env.DB.batch(statements);
  await env.DB.prepare("DELETE FROM saved_cart_items WHERE user_id=?").bind(user.id).run();
  return Response.json({ order: { id, totalCents: total, status: "awaiting_payment" }, payment: { configured: false, message: "Pedido salvo. A cobrança será habilitada após configurar o provedor de pagamento." } }, { status: 201 });
}
