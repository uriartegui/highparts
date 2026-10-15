import { env } from "cloudflare:workers";
import { getAdmin } from "../../../../../admin/admin-auth";

const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const MAX_BYTES = 1024 * 1024;

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!await getAdmin()) return Response.json({ error: "Não autorizado" }, { status: 403 });
  const { code: encodedCode } = await params;
  const code = decodeURIComponent(encodedCode);
  const product = await env.DB.prepare("SELECT code FROM products WHERE code=?").bind(code).first<{ code: string }>();
  if (!product) return Response.json({ error: "Produto não encontrado." }, { status: 404 });

  const form = await request.formData();
  const image = form.get("image");
  if (!(image instanceof File)) return Response.json({ error: "Selecione uma imagem." }, { status: 400 });
  const extension = ALLOWED_TYPES.get(image.type);
  if (!extension) return Response.json({ error: "Use uma imagem JPG, PNG ou WebP." }, { status: 400 });
  if (!image.size || image.size > MAX_BYTES) return Response.json({ error: "A imagem compactada deve ter no máximo 1 MB." }, { status: 400 });

  const content = await image.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", content);
  const etag = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const imageUrl = `/media/product/${encodeURIComponent(code)}?v=${etag.slice(0, 12)}`;
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO product_uploaded_images(product_code,content,content_type,etag,updated_at)
      VALUES(?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(product_code) DO UPDATE SET
      content=excluded.content,content_type=excluded.content_type,etag=excluded.etag,updated_at=CURRENT_TIMESTAMP`)
      .bind(code, content, image.type, etag),
    env.DB.prepare("UPDATE products SET image_url=?,updated_at=CURRENT_TIMESTAMP WHERE code=?").bind(imageUrl, code),
  ]);
  return Response.json({ imageUrl });
}
