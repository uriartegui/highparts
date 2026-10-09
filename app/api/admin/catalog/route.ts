import { env } from "cloudflare:workers";
import { getAdmin } from "../../../admin/admin-auth";

export const dynamic="force-dynamic";

export async function GET(request:Request){
  if(!await getAdmin())return Response.json({error:"Não autorizado"},{status:403});
  const q=(new URL(request.url).searchParams.get("q")||"").trim();
  const status=(new URL(request.url).searchParams.get("status")||"all").trim();
  const pattern=`%${q}%`;
  const conditions:string[]=[];
  if(q)conditions.push("(code LIKE ? OR product LIKE ? OR application LIKE ?)");
  if(status==="missing-price")conditions.push("price_cents IS NULL");
  if(status==="missing-stock")conditions.push("stock_quantity IS NULL");
  if(status==="ready")conditions.push("active=1 AND price_cents IS NOT NULL AND stock_quantity>0");
  const where=conditions.length?`WHERE ${conditions.join(" AND ")}`:"";
  const query=env.DB.prepare(`SELECT code,product,application,axle,type,price_cents AS priceCents,stock_quantity AS stockQuantity,image_url AS imageUrl,active FROM products ${where} ORDER BY code LIMIT 100`);
  const products=q?await query.bind(pattern,pattern,pattern).all():await query.all();
  const stats=await env.DB.batch([
    env.DB.prepare("SELECT COUNT(*) AS value FROM products"),
    env.DB.prepare("SELECT COUNT(*) AS value FROM products WHERE price_cents IS NOT NULL"),
    env.DB.prepare("SELECT COUNT(*) AS value FROM products WHERE stock_quantity IS NOT NULL"),
    env.DB.prepare("SELECT COUNT(*) AS value FROM orders"),
  ]);
  return Response.json({products:products.results.map((p:any)=>({...p,active:Boolean(p.active)})),summary:{products:Number(stats[0].results[0]?.value||0),priced:Number(stats[1].results[0]?.value||0),stockDefined:Number(stats[2].results[0]?.value||0),orders:Number(stats[3].results[0]?.value||0)}});
}
