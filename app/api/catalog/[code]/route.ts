import { env } from "cloudflare:workers";

export async function GET(_request:Request,{params}:{params:Promise<{code:string}>}){
  const {code}=await params;
  const product=await env.DB.prepare(`
    SELECT code, original_code AS originalCode, product, application, axle, type, hub,
           price_cents AS priceCents, stock_quantity AS stockQuantity, image_url AS imageUrl
      FROM products WHERE code=? AND active=1 LIMIT 1
  `).bind(decodeURIComponent(code).slice(0,80)).first();
  if(!product)return Response.json({error:"Produto não encontrado."},{status:404});
  return Response.json({product},{headers:{"cache-control":"public, max-age=120, stale-while-revalidate=300"}});
}
