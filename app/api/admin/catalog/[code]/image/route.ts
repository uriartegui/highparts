import { env } from "cloudflare:workers";
import { getAdmin } from "../../../../../admin/admin-auth";

const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!await getAdmin()) return Response.json({ error: "Não autorizado" }, { status: 403 });
  if (!env.BUCKET) return Response.json({ error: "O armazenamento de imagens ainda não está configurado." }, { status: 503 });

  const { code: encodedCode } = await params;
  const code = decodeURIComponent(encodedCode);
  const product = await env.DB.prepare("SELECT image_url AS imageUrl FROM products WHERE code=?").bind(code).first<{ imageUrl: string | null }>();
  if (!product) return Response.json({ error: "Produto não encontrado." }, { status: 404 });

  const form = await request.formData();
  const image = form.get("image");
  if (!(image instanceof File)) return Response.json({ error: "Selecione uma imagem." }, { status: 400 });
  const extension = ALLOWED_TYPES.get(image.type);
  if (!extension) return Response.json({ error: "Use uma imagem JPG, PNG ou WebP." }, { status: 400 });
  if (!image.size || image.size > MAX_BYTES) return Response.json({ error: "A imagem deve ter no máximo 5 MB." }, { status: 400 });

  const safeCode = code.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "produto";
  const key = `products/${safeCode}/${crypto.randomUUID()}.${extension}`;
  await env.BUCKET.put(key, image.stream(), {
    httpMetadata: { contentType: image.type, cacheControl: "public, max-age=31536000, immutable" },
    customMetadata: { productCode: code },
  });

  const imageUrl = `/media/${key}`;
  try {
    await env.DB.prepare("UPDATE products SET image_url=?,updated_at=CURRENT_TIMESTAMP WHERE code=?").bind(imageUrl, code).run();
  } catch (error) {
    await env.BUCKET.delete(key);
    throw error;
  }

  const oldKey = product.imageUrl?.startsWith("/media/") ? product.imageUrl.slice("/media/".length) : null;
  if (oldKey && oldKey !== key) await env.BUCKET.delete(oldKey).catch(() => undefined);
  return Response.json({ imageUrl });
}
