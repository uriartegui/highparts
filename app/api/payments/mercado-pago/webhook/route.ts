import { env } from "cloudflare:workers";
import { getMercadoPagoPayment, mercadoPagoMode, verifyMercadoPagoWebhook } from "../../../../mercado-pago";

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

// Order statuses a payment notification may move FROM, per target status.
// Notifications can arrive late, repeated or out of order, so they may only
// advance the payment lifecycle: they never reopen cancelled orders, never
// pull a paid/fulfilled order back to pending, and never touch fulfillment
// (processing/shipped/delivered) except to record a refund or chargeback.
const allowedFrom: Record<string, string[]> = {
  awaiting_payment: ["awaiting_payment", "payment_failed"],
  payment_failed: ["awaiting_payment", "payment_failed"],
  paid: ["awaiting_payment", "payment_failed"],
  refunded: ["paid", "processing", "shipped", "delivered"],
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
  if (!payment) {
    console.warn("mercado_pago_payment_not_found", dataId);
    return Response.json({ ok: true, ignored: "payment_not_found" });
  }
  const orderId = String(payment.external_reference || "");
  if (!orderId || !payment.status) return Response.json({ ok: true });
  const order = await env.DB.prepare(
    "SELECT total_cents AS totalCents,status,payment_id AS paymentId FROM orders WHERE id=?",
  ).bind(orderId).first<{ totalCents: number; status: string; paymentId: string | null }>();
  if (!order) return Response.json({ ok: true });

  // A sandbox payment must never settle an order while running in production
  // mode, and a live payment must never be processed by a test deployment.
  const mode = mercadoPagoMode();
  if (Boolean(payment.live_mode) !== (mode === "production")) {
    console.error("mercado_pago_mode_mismatch", orderId, dataId, mode);
    return Response.json({ ok: true, ignored: "mode_mismatch" });
  }

  const receivedCents = Math.round(Number(payment.transaction_amount || 0) * 100);
  if (payment.currency_id !== "BRL" || receivedCents !== order.totalCents) {
    console.error("mercado_pago_amount_mismatch", orderId, dataId);
    return Response.json({ error: "Pagamento divergente." }, { status: 409 });
  }

  const nextStatus = paymentStatus[payment.status] || "awaiting_payment";
  const fromStatuses = allowedFrom[nextStatus] ?? [];
  // Refunds/chargebacks only apply to the payment that settled the order.
  const refundOfOtherPayment = nextStatus === "refunded" && order.paymentId !== dataId;
  const applies = fromStatuses.includes(order.status) && !refundOfOtherPayment;

  const event = env.DB.prepare(
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
      mode,
      applied: applies,
      orderStatus: order.status,
    }),
  );

  if (!applies) {
    if (nextStatus === "paid" && order.status === "cancelled")
      console.error("mercado_pago_paid_cancelled_order_needs_refund", orderId, dataId);
    else if (order.status !== nextStatus)
      console.warn("mercado_pago_transition_ignored", orderId, order.status, nextStatus);
    await event.run();
    return Response.json({ ok: true, ignored: "transition" });
  }

  // The status guard is repeated in SQL so concurrent notifications or admin
  // edits between the SELECT above and this write cannot be overwritten.
  const placeholders = fromStatuses.map(() => "?").join(",");
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE orders SET status=?,payment_provider='mercado_pago',payment_id=?,payment_mode=?," +
      "paid_at=CASE WHEN ?='paid' THEN COALESCE(paid_at,CURRENT_TIMESTAMP) ELSE paid_at END," +
      "updated_at=CURRENT_TIMESTAMP WHERE id=? AND status IN (" + placeholders + ")",
    ).bind(nextStatus, dataId, mode, nextStatus, orderId, ...fromStatuses),
    event,
  ]);
  return Response.json({ ok: true });
}
