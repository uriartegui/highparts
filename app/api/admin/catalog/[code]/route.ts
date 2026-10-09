import { env } from "cloudflare:workers";
import { getAdmin } from "../../../../admin/admin-auth";

export async function PATCH(request:Request,{params}:{params:Promise<{code:string}>}){
  if(!await getAdmin())return Response.json({error:"Não autorizado"},{status:403});
  const {code}=await params;const body=await request.json() as {priceCents:number|null;stockQuantity:number|null;imageUrl?:string|null;active:boolean};
  if(body.priceCents!=null&&(!Number.isInteger(body.priceCents)||body.priceCents<0))return Response.json({error:"Preço inválido"},{status:400});
  if(body.stockQuantity!=null&&(!Number.isInteger(body.stockQuantity)||body.stockQuantity<0))return Response.json({error:"Estoque inválido"},{status:400});
  const imageUrl=String(body.imageUrl??"").trim().slice(0,1000)||null;
  if(imageUrl&&!/^https:\/\//i.test(imageUrl))return Response.json({error:"A imagem precisa usar um endereço HTTPS"},{status:400});
  await env.DB.prepare("UPDATE products SET price_cents=?,stock_quantity=?,image_url=?,active=?,updated_at=CURRENT_TIMESTAMP WHERE code=?").bind(body.priceCents,body.stockQuantity,imageUrl,body.active?1:0,decodeURIComponent(code)).run();
  return Response.json({ok:true});
}
