import { env } from "cloudflare:workers";
import catalog from "@/public/catalog.json";
import { getAdmin } from "../../../../admin/admin-auth";

type SourceItem={code:string;original:string;application:string;axle:string;product:string;type:string;hub:string};
export async function POST(){
  if(!await getAdmin())return Response.json({error:"Não autorizado"},{status:403});
  const sql=`INSERT INTO products (code,original_code,application,axle,product,type,hub,active) VALUES (?,?,?,?,?,?,?,1)
    ON CONFLICT(code) DO UPDATE SET original_code=excluded.original_code,application=excluded.application,axle=excluded.axle,product=excluded.product,type=excluded.type,hub=excluded.hub,updated_at=CURRENT_TIMESTAMP`;
  const source=catalog as SourceItem[];
  try{
    for(let start=0;start<source.length;start+=75){
      const batch=source.slice(start,start+75).map(item=>env.DB.prepare(sql).bind(item.code,item.original,item.application,item.axle,item.product,item.type,item.hub));
      await env.DB.batch(batch);
    }
    return Response.json({imported:source.length});
  }catch(error){console.error("catalog sync failed",error);return Response.json({error:"Falha ao gravar o catálogo no banco."},{status:500})}
}
