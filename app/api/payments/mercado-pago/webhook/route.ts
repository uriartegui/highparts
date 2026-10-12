import { env } from "cloudflare:workers";
import { getMercadoPagoPayment, verifyMercadoPagoWebhook } from "../../../../mercado-pago";

type Notification = { type?: string; data?: { id?: string | number } };
const paymentStatus: Record<string, string> = {
  approved: "paid",
  pending: "awaiting_payment",
  in_process: "awaiting_payment",
  authorized: "awaiting_payment",
  rejected: "payment_failed",
  cancelled: "payment_failed",
  refunded: "refunded",
  charged_back: "refunded",
};

export async function POST(request: Request) {
  const url = new URL(request.url);
  const input = (await request.json().catch(() => ({}))) as Notification;
  const dataId = String(url.searchParams.get("data.id") || input.data?.id || "");
  const type = url.searchParams.get("type") || input.type;
  if (type !== "payment" || !dataId) return Response.json({ ok: true });
  if (!(await verifyMercadoPagoWebhook(request, dataId)))
    return Response.json({ error: "Assinatura inválida." }, { status: 401 });

  const payment = await getMercadoPagoPayment(dataId);
  const orderId = String(payment.external_reference || "");
  if (!orderId || !payment.status) return Response.json({ ok: true });
  const order = await env.DB.prepare(
    "SELECT total_cents AS totalCents,status FROM orders WHERE id=?",
  ).bind(orderId).first<{ totalCents: number; status: string }>();
  if (!order) return Response.json({ ok: true });
  const receivedCents = Math.round(Number(payment.transaction_amount || 0) * 100);
  if (payment.currency_id !== "BRL" || receivedCents !== order.totalCents) {
    console.error("mercado_pago_amount_mismatch", orderId, dataId);
    return Response.json({ error: "Pagamento divergente." }, { status: 409 });
  }

  const nextStatus = paymentStatus[payment.status] || "awaiting_payment";
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE orders SET status=?,payment_provider='mercado_pago',payment_id=?," +
      "paid_at=CASE WHEN ?='paid' THEN COALESCE(paid_at,CURRENT_TIMESTAMP) ELSE paid_at END," +
      "updated_at=CURRENT_TIMESTAMP WHERE id=?",
    ).bind(nextStatus, dataId, nextStatus, orderId),
    env.DB.prepare(
      "INSERT OR IGNORE INTO payment_events " +
      "(id,order_id,provider,payment_id,status,payload) VALUES (?,?,?,?,?,?)",
    ).bind(
      dataId + ":" + payment.status,
      orderId,
      "mercado_pago",
      dataId,
      payment.status,
      JSON.stringify({
        status: payment.status,
        amountCents: receivedCents,
        currency: payment.currency_id,
      }),
    ),
  ]);
  return Response.json({ ok: true });
}
