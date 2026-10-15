import { env } from "cloudflare:workers";

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (path.length !== 2 || path[0] !== "product") return new Response("Not found", { status: 404 });
  const code = decodeURIComponent(path[1]);
  const image = await env.DB.prepare("SELECT content,content_type AS contentType,etag FROM product_uploaded_images WHERE product_code=?")
    .bind(code).first<{ content: number[]; contentType: string; etag: string }>();
  if (!image) return new Response("Not found", { status: 404 });
  const headers = new Headers({ "content-type": image.contentType });
  headers.set("etag", `"${image.etag}"`);
  headers.set("x-content-type-options", "nosniff");
  headers.set("cache-control", "public, max-age=604800");
  return new Response(Uint8Array.from(image.content), { headers });
}
