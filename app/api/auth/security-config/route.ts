import { env } from "cloudflare:workers";
export async function GET(request: Request) {
  const value = env as unknown as { TURNSTILE_SITE_KEY?: string };
  const temporaryHost = new URL(request.url).hostname.endsWith(".workers.dev");
  return Response.json({ turnstileSiteKey: temporaryHost ? null : value.TURNSTILE_SITE_KEY ?? null }, { headers: { "cache-control": "public, max-age=300" } });
}
