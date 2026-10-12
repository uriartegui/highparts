import { env } from "cloudflare:workers";
import { requireUser } from "../../../../../auth";
import { createMercadoPagoPreference, mercadoPagoConfigured } from "../../../../../mercado-pago";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Não autorizado." }, { status: 401 });
  if (!mercadoPagoConfigured(request))
    return Response.json({ error: "Pagamento ainda não configurado." }, { status: 503 });
  const { id } = await context.params;
  const order = await env.DB.prepare(
    "SELECT id,status,customer_name AS customerName,customer_email AS customerEmail " +
    "FROM orders WHERE id=? AND user_id=?",
  ).bind(id, user.id).first<{
    id: string;
    status: string;
    customerName: string;
    customerEmail: string;
  }>();
  if (!order) return Response.json({ error: "Pedido não encontrado." }, { status: 404 });
  if (!["awaiting_payment", "payment_failed"].includes(order.status))
    return Response.json({ error: "Este pedido não aceita um novo pagamento." }, { status: 409 });
  const items = await env.DB.prepare(
    "SELECT item_key AS code,name,quantity,unit_price_cents AS unitPriceCents " +
    "FROM order_snapshot_items WHERE order_id=?",
  ).bind(id).all();
  const preference = await createMercadoPagoPreference({
    request,
    orderId: id,
    payer: { name: order.customerName, email: order.customerEmail },
    items: items.results as Array<{ code: string; name: string; quantity: number; unitPriceCents: number }>,
  });
  await env.DB.prepare(
    "UPDATE orders SET payment_provider='mercado_pago',payment_reference=?,payment_mode=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
  ).bind(preference.id, preference.mode, id).run();
  return Response.json({ checkoutUrl: preference.checkoutUrl });
}
