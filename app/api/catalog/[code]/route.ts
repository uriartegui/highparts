import { env } from "cloudflare:workers";

export async function GET(_request:Request,{params}:{params:Promise<{code:string}>}){
  const {code}=await params;
  const decodedCode=decodeURIComponent(code).slice(0,80);
  const product=await env.DB.prepare(`
    SELECT code, original_code AS originalCode, product, application, axle, type, hub,
           price_cents AS priceCents, stock_quantity AS stockQuantity, image_url AS imageUrl
      FROM products WHERE code=? AND active=1 LIMIT 1
  `).bind(decodedCode).first<Record<string,unknown>>();
  if(!product)return Response.json({error:"Produto não encontrado."},{status:404});
  const images=await env.DB.prepare(`
    SELECT image_url AS url,alt_text AS altText
      FROM product_images WHERE product_code=? ORDER BY sort_order,id
  `).bind(decodedCode).all<{url:string;altText:string}>();
  return Response.json({product:{...product,images:images.results}},{headers:{"cache-control":"public, max-age=120, stale-while-revalidate=300"}});
}
