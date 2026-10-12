import { env } from "cloudflare:workers";
import { getAdmin } from "../../../../admin/admin-auth";
import { sendAuthEmail } from "../../../../email";

const statuses = new Set([
  "awaiting_payment",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
]);
const labels: Record<string, string> = {
  awaiting_payment: "Aguardando pagamento",
  paid: "Pagamento aprovado",
  processing: "Em separação",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdmin();
  if (!admin)
    return Response.json({ error: "Não autorizado" }, { status: 403 });
  const { id: encodedId } = await params;
  const id = decodeURIComponent(encodedId);
  const input = (await request.json()) as {
    status?: string;
    shippingCarrier?: string;
    shippingService?: string;
    trackingCode?: string;
    packedItems?: string[];
  };
  if (input.status && !statuses.has(input.status))
    return Response.json({ error: "Status inválido" }, { status: 400 });
  const order = await env.DB.prepare(
    "SELECT status,customer_name AS customerName,customer_email AS customerEmail FROM orders WHERE id=?",
  )
    .bind(id)
    .first<{ status: string; customerName: string; customerEmail: string }>();
  if (!order)
    return Response.json({ error: "Pedido não encontrado" }, { status: 404 });
  if (
    order.status === "cancelled" &&
    input.status &&
    input.status !== "cancelled"
  )
    return Response.json(
      { error: "Um pedido cancelado não pode ser reaberto." },
      { status: 409 },
    );

  const nextStatus = input.status || order.status;
  const carrier = String(input.shippingCarrier ?? "")
    .trim()
    .slice(0, 80);
  const service = String(input.shippingService ?? "")
    .trim()
    .slice(0, 80);
  const tracking = String(input.trackingCode ?? "")
    .trim()
    .slice(0, 100);
  if (nextStatus === "shipped" && (!carrier || !tracking))
    return Response.json(
      {
        error:
          "Informe transportadora e código de rastreio antes de marcar como enviado.",
      },
      { status: 400 },
    );

  const statements = [
    env.DB.prepare(
      `UPDATE orders SET status=?,shipping_carrier=?,shipping_service=?,tracking_code=?,
    shipped_at=CASE WHEN ?='shipped' AND shipped_at IS NULL THEN CURRENT_TIMESTAMP ELSE shipped_at END,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    ).bind(nextStatus, carrier, service, tracking, nextStatus, id),
  ];
  if (Array.isArray(input.packedItems)) {
    const packed = new Set(input.packedItems.map(String));
    const orderItems = await env.DB.prepare(
      "SELECT item_key AS itemKey FROM order_snapshot_items WHERE order_id=?",
    )
      .bind(id)
      .all<{ itemKey: string }>();
    for (const item of orderItems.results)
      statements.push(
        env.DB.prepare(
          `INSERT INTO order_fulfillment_items(order_id,item_key,packed) VALUES(?,?,?)
      ON CONFLICT(order_id,item_key) DO UPDATE SET packed=excluded.packed,updated_at=CURRENT_TIMESTAMP`,
        ).bind(id, item.itemKey, packed.has(item.itemKey) ? 1 : 0),
      );
  }
  if (nextStatus === "cancelled" && order.status !== "cancelled") {
    const items = await env.DB.prepare(
      "SELECT item_key AS itemKey,quantity FROM order_snapshot_items WHERE order_id=?",
    )
      .bind(id)
      .all<{ itemKey: string; quantity: number }>();
    for (const item of items.results)
      statements.push(
        env.DB.prepare(
          "UPDATE products SET stock_quantity=COALESCE(stock_quantity,0)+?,updated_at=CURRENT_TIMESTAMP WHERE code=?",
        ).bind(item.quantity, item.itemKey),
      );
  }
  if (nextStatus !== order.status)
    statements.push(
      env.DB.prepare(
        "INSERT INTO order_events(id,order_id,admin_email,event_type,details) VALUES(?,?,?,?,?)",
      ).bind(
        crypto.randomUUID(),
        id,
        admin.email,
        "status_changed",
        JSON.stringify({ from: order.status, to: nextStatus }),
      ),
    );
  await env.DB.batch(statements);

  let emailSent = false;
  if (nextStatus !== order.status) {
    const trackingHtml =
      nextStatus === "shipped" && tracking
        ? `<p>Transportadora: <b>${carrier}</b><br>Código de rastreio: <b>${tracking}</b></p>`
        : "";
    const delivery = await sendAuthEmail(
      order.customerEmail,
      `Pedido ${id}: ${labels[nextStatus]}`,
      `<p>Olá, ${order.customerName}.</p><p>O status do seu pedido <b>${id}</b> foi atualizado para <b>${labels[nextStatus]}</b>.</p>${trackingHtml}<p>Acompanhe os detalhes na sua conta HighParts.</p>`,
    );
    emailSent = delivery.sent;
  }
  return Response.json({ ok: true, emailSent });
}
