import { env } from "cloudflare:workers";
import { getAdmin } from "../../../../admin/admin-auth";

export async function PATCH(request:Request,{params}:{params:Promise<{code:string}>}){
  if(!await getAdmin())return Response.json({error:"Não autorizado"},{status:403});
  const {code}=await params;const body=await request.json() as {priceCents:number|null;stockQuantity:number|null;imageUrl?:string|null;active:boolean;product?:string;application?:string;axle?:string;originalCode?:string;weightGrams?:number|null;lengthCm?:number|null;widthCm?:number|null;heightCm?:number|null};
  if(body.priceCents!=null&&(!Number.isInteger(body.priceCents)||body.priceCents<0))return Response.json({error:"Preço inválido"},{status:400});
  if(body.stockQuantity!=null&&(!Number.isInteger(body.stockQuantity)||body.stockQuantity<0))return Response.json({error:"Estoque inválido"},{status:400});
  const imageUrl=String(body.imageUrl??"").trim().slice(0,1000)||null;
  if(imageUrl&&!(/^(https:\/\/|\/)/i.test(imageUrl)))return Response.json({error:"A imagem precisa usar HTTPS ou um caminho interno do site"},{status:400});
  // Shipping data typed in the admin (used when Bling has no weight/dimensions).
  const dims={weightGrams:body.weightGrams,lengthCm:body.lengthCm,widthCm:body.widthCm,heightCm:body.heightCm};
  const sendsShipping=Object.values(dims).some(v=>v!==undefined);
  const limits={weightGrams:100000,lengthCm:200,widthCm:200,heightCm:200};
  for(const [key,value] of Object.entries(dims)){if(value==null)continue;if(!Number.isFinite(value)||value<=0||value>limits[key as keyof typeof limits])return Response.json({error:"Peso ou medida inválida."},{status:400})}
  const product=String(body.product??"").trim().slice(0,120);
  const application=String(body.application??"").trim().slice(0,12000);
  const axle=String(body.axle??"").trim().slice(0,80);
  const originalCode=String(body.originalCode??"").trim().slice(0,500);
  const current=await env.DB.prepare("SELECT bling_draft AS blingDraft FROM products WHERE code=?").bind(decodeURIComponent(code)).first<{blingDraft:number}>();
  if(body.active&&current?.blingDraft&&(!product||!application||!axle||!imageUrl))return Response.json({error:"Para publicar, informe categoria, aplicação, eixo e imagem."},{status:400});
  await env.DB.prepare("UPDATE products SET original_code=?,product=?,application=?,axle=?,price_cents=?,stock_quantity=?,image_url=?,active=?,bling_draft=CASE WHEN ?=1 THEN 0 ELSE bling_draft END,updated_at=CURRENT_TIMESTAMP WHERE code=?").bind(originalCode,product,application,axle,body.priceCents,body.stockQuantity,imageUrl,body.active?1:0,body.active?1:0,decodeURIComponent(code)).run();
  if(sendsShipping){
    const current=await env.DB.prepare("SELECT weight_grams AS w,length_cm AS l,width_cm AS wi,height_cm AS h FROM products WHERE code=?").bind(decodeURIComponent(code)).first<{w:number|null;l:number|null;wi:number|null;h:number|null}>();
    const changed=!current||current.w!==(dims.weightGrams??null)||current.l!==(dims.lengthCm??null)||current.wi!==(dims.widthCm??null)||current.h!==(dims.heightCm??null);
    if(changed)await env.DB.prepare("UPDATE products SET weight_grams=?,length_cm=?,width_cm=?,height_cm=?,shipping_data_source='manual',updated_at=CURRENT_TIMESTAMP WHERE code=?")
      .bind(dims.weightGrams==null?null:Math.round(dims.weightGrams),dims.lengthCm??null,dims.widthCm??null,dims.heightCm??null,decodeURIComponent(code)).run();
  }
  return Response.json({ok:true});
}
