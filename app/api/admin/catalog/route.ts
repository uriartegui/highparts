import { env } from "cloudflare:workers";
import { getAdmin } from "../../../admin/admin-auth";

export const dynamic="force-dynamic";

export async function GET(request:Request){
  if(!await getAdmin())return Response.json({error:"Não autorizado"},{status:403});
  const q=(new URL(request.url).searchParams.get("q")||"").trim();
  const status=(new URL(request.url).searchParams.get("status")||"all").trim();
  const pattern=`%${q}%`;
  const conditions:string[]=["(active=1 OR bling_draft=1)"];
  if(q)conditions.push("(code LIKE ? OR product LIKE ? OR application LIKE ?)");
  if(status==="missing-price")conditions.push("price_cents IS NULL");
  if(status==="missing-stock")conditions.push("stock_quantity IS NULL");
  if(status==="ready")conditions.push("price_cents IS NOT NULL AND stock_quantity>0");
  if(status==="bling-draft")conditions.push("bling_draft=1");
  if(status==="missing-shipping")conditions.push("(weight_grams IS NULL OR length_cm IS NULL OR width_cm IS NULL OR height_cm IS NULL)");
  const where=conditions.length?`WHERE ${conditions.join(" AND ")}`:"";
  const query=env.DB.prepare(`SELECT code,original_code AS originalCode,product,application,axle,type,price_cents AS priceCents,stock_quantity AS stockQuantity,image_url AS imageUrl,active,bling_draft AS blingDraft,bling_name AS blingName,weight_grams AS weightGrams,length_cm AS lengthCm,width_cm AS widthCm,height_cm AS heightCm,shipping_data_source AS shippingDataSource FROM products ${where} ORDER BY bling_draft DESC,code LIMIT 100`);
  const products=q?await query.bind(pattern,pattern,pattern).all():await query.all();
  const stats=await env.DB.batch([
    env.DB.prepare("SELECT COUNT(*) AS value FROM products WHERE active=1"),
    env.DB.prepare("SELECT COUNT(*) AS value FROM products WHERE active=1 AND price_cents IS NOT NULL"),
    env.DB.prepare("SELECT COUNT(*) AS value FROM products WHERE active=1 AND stock_quantity IS NOT NULL"),
    env.DB.prepare("SELECT COUNT(*) AS value FROM orders"),
    env.DB.prepare("SELECT COUNT(*) AS value FROM products WHERE bling_draft=1"),
  ]);
  return Response.json({products:products.results.map((p:any)=>({...p,active:Boolean(p.active),blingDraft:Boolean(p.blingDraft)})),summary:{products:Number(stats[0].results[0]?.value||0),priced:Number(stats[1].results[0]?.value||0),stockDefined:Number(stats[2].results[0]?.value||0),orders:Number(stats[3].results[0]?.value||0),drafts:Number(stats[4].results[0]?.value||0)}});
}
