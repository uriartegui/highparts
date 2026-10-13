import { env } from "cloudflare:workers";
import { applyBlingProductWebhook, applyBlingStockWebhook, verifyBlingWebhook } from "../../../../bling";

type BlingEvent = {
  eventId?: string;
  event?: string;
  data?: unknown;
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-bling-signature-256") || "";
  if (!await verifyBlingWebhook(rawBody, signature))
    return Response.json({ error: "Assinatura inválida." }, { status: 401 });
  let input: BlingEvent;
  try {
    input = JSON.parse(rawBody) as BlingEvent;
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  const eventId = String(input.eventId || "");
  if (!eventId || !input.event) return Response.json({ ok: true, ignored: "invalid_event" });
  const existing = await env.DB.prepare("SELECT id FROM integration_events WHERE id=?").bind(eventId).first();
  if (existing) return Response.json({ ok: true, duplicate: true });
  let applied = false;
  if (input.event === "stock.updated" || input.event === "stock.created"
    || input.event === "virtual_stock.updated" || input.event === "stock_virtual.updated")
    applied = await applyBlingStockWebhook(input.data);
  else if (input.event === "product.updated" || input.event === "product.created")
    applied = await applyBlingProductWebhook(input.data);
  await env.DB.prepare(
    "INSERT OR IGNORE INTO integration_events(id,provider,event_type,payload) VALUES(?,'bling',?,?)",
  ).bind(eventId, input.event, JSON.stringify({ applied })).run();
  return Response.json({ ok: true, applied });
}
