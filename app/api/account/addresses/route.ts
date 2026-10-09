import { env } from "cloudflare:workers";
import { requireUser } from "../../../auth";

export async function GET(){
  const user=await requireUser();
  if(!user)return Response.json({error:"Não autorizado"},{status:401});
  const result=await env.DB.prepare(`SELECT id,label,postal_code AS postalCode,street,number,complement,neighborhood,city,state,is_default AS isDefault
    FROM saved_addresses WHERE user_id=? ORDER BY is_default DESC,created_at DESC`).bind(user.id).all();
  return Response.json({addresses:result.results});
}

export async function POST(request:Request){
  const user=await requireUser();
  if(!user)return Response.json({error:"Não autorizado"},{status:401});
  const input=await request.json() as Record<string,unknown>;
  const postalCode=String(input.postalCode??"").replace(/\D/g,"");
  const street=String(input.street??"").trim().slice(0,160);
  const number=String(input.number??"").trim().slice(0,30);
  const city=String(input.city??"").trim().slice(0,100);
  const state=String(input.state??"").trim().toUpperCase().slice(0,2);
  if(postalCode.length!==8||!street||!number||!city||state.length!==2)return Response.json({error:"Preencha CEP, rua, número, cidade e estado."},{status:400});
  const id=crypto.randomUUID();
  const count=await env.DB.prepare("SELECT COUNT(*) AS value FROM saved_addresses WHERE user_id=?").bind(user.id).first<{value:number}>();
  const isDefault=Boolean(input.isDefault)||Number(count?.value??0)===0;
  const statements=[];
  if(isDefault)statements.push(env.DB.prepare("UPDATE saved_addresses SET is_default=0 WHERE user_id=?").bind(user.id));
  statements.push(env.DB.prepare(`INSERT INTO saved_addresses (id,user_id,label,postal_code,street,number,complement,neighborhood,city,state,is_default)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(id,user.id,String(input.label??"Casa").trim().slice(0,40)||"Casa",postalCode,street,number,String(input.complement??"").trim().slice(0,100),String(input.neighborhood??"").trim().slice(0,100),city,state,isDefault?1:0));
  await env.DB.batch(statements);
  return Response.json({ok:true,id},{status:201});
}
