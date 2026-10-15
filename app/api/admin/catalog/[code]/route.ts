import { env } from "cloudflare:workers";
import { getAdmin } from "../../../../admin/admin-auth";

export async function PATCH(request:Request,{params}:{params:Promise<{code:string}>}){
  if(!await getAdmin())return Response.json({error:"Não autorizado"},{status:403});
  const {code}=await params;const body=await request.json() as {priceCents:number|null;stockQuantity:number|null;imageUrl?:string|null;active:boolean;product?:string;application?:string;axle?:string;originalCode?:string};
  if(body.priceCents!=null&&(!Number.isInteger(body.priceCents)||body.priceCents<0))return Response.json({error:"Preço inválido"},{status:400});
  if(body.stockQuantity!=null&&(!Number.isInteger(body.stockQuantity)||body.stockQuantity<0))return Response.json({error:"Estoque inválido"},{status:400});
  const imageUrl=String(body.imageUrl??"").trim().slice(0,1000)||null;
  if(imageUrl&&!(/^(https:\/\/|\/)/i.test(imageUrl)))return Response.json({error:"A imagem precisa usar HTTPS ou um caminho interno do site"},{status:400});
  const product=String(body.product??"").trim().slice(0,120);
  const application=String(body.application??"").trim().slice(0,12000);
  const axle=String(body.axle??"").trim().slice(0,80);
  const originalCode=String(body.originalCode??"").trim().slice(0,500);
  const current=await env.DB.prepare("SELECT bling_draft AS blingDraft FROM products WHERE code=?").bind(decodeURIComponent(code)).first<{blingDraft:number}>();
  if(body.active&&current?.blingDraft&&(!product||!application||!axle||!imageUrl))return Response.json({error:"Para publicar, informe categoria, aplicação, eixo e imagem."},{status:400});
  await env.DB.prepare("UPDATE products SET original_code=?,product=?,application=?,axle=?,price_cents=?,stock_quantity=?,image_url=?,active=?,bling_draft=CASE WHEN ?=1 THEN 0 ELSE bling_draft END,updated_at=CURRENT_TIMESTAMP WHERE code=?").bind(originalCode,product,application,axle,body.priceCents,body.stockQuantity,imageUrl,body.active?1:0,body.active?1:0,decodeURIComponent(code)).run();
  return Response.json({ok:true});
}
