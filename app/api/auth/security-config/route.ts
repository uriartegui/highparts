import { env } from "cloudflare:workers";
export async function GET() {
  const value = env as unknown as { TURNSTILE_SITE_KEY?: string };
  return Response.json({ turnstileSiteKey: value.TURNSTILE_SITE_KEY ?? null }, { headers: { "cache-control": "public, max-age=300" } });
}
