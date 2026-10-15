import { env } from "cloudflare:workers";
import { hashToken } from "../../../auth";
import { quoteShipping, ShippingError } from "../../../shipping";

const MAX_QUOTES_PER_HOUR = 60;

// Per-IP hourly budget so the public endpoint can't exhaust the provider quota.
// Reuses the generic (subject_hash, window_start, attempts) limits table.
async function allowQuote(request: Request) {
  const subject = await hashToken(`shipping:${request.headers.get("CF-Connecting-IP") || "unknown"}`);
  const row = await env.DB.prepare(
    `INSERT INTO vehicle_lookup_limits (subject_hash, window_start, attempts) VALUES (?, ?, 1)
     ON CONFLICT(subject_hash, window_start) DO UPDATE SET attempts = attempts + 1 RETURNING attempts`,
  ).bind(subject, new Date().toISOString().slice(0, 13)).first<{ attempts: number }>();
  return (row?.attempts ?? 1) <= MAX_QUOTES_PER_HOUR;
}

export async function POST(request: Request) {
  const input = (await request.json().catch(() => ({}))) as { postalCode?: string; items?: Array<{ code?: string; itemKey?: string; quantity?: number }> };
  if (!(await allowQuote(request)))
    return Response.json({ error: "Muitas consultas de frete. Tente novamente em alguns minutos." }, { status: 429 });
  try {
    const options = await quoteShipping(
      input.postalCode,
      (input.items ?? []).map((item) => ({ code: String(item.code ?? item.itemKey ?? ""), quantity: Number(item.quantity) })),
    );
    return Response.json({ options }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof ShippingError) {
      const status = error.code === "INVALID_POSTAL_CODE" ? 400 : error.code === "MISSING_DATA" || error.code === "NO_OPTIONS" ? 422 : 503;
      return Response.json({ error: error.message, code: error.code }, { status });
    }
    console.error("shipping_quote_failed", error);
    return Response.json({ error: "Não foi possível calcular o frete agora." }, { status: 503 });
  }
}
