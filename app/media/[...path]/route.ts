import { env } from "cloudflare:workers";

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (!env.BUCKET) return new Response("Not found", { status: 404 });
  const { path } = await params;
  const key = path.join("/");
  if (!key.startsWith("products/") || key.includes("..")) return new Response("Not found", { status: 404 });
  const object = await env.BUCKET.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("x-content-type-options", "nosniff");
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
}
