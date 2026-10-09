import { env } from "cloudflare:workers";
import { requireUser } from "../../../../auth";

export async function DELETE(_request:Request,{params}:{params:Promise<{id:string}>}){
  const user=await requireUser();
  if(!user)return Response.json({error:"Não autorizado"},{status:401});
  const {id}=await params;
  await env.DB.prepare("DELETE FROM saved_addresses WHERE id=? AND user_id=?").bind(id,user.id).run();
  const current=await env.DB.prepare("SELECT id FROM saved_addresses WHERE user_id=? AND is_default=1 LIMIT 1").bind(user.id).first();
  if(!current)await env.DB.prepare("UPDATE saved_addresses SET is_default=1 WHERE id=(SELECT id FROM saved_addresses WHERE user_id=? ORDER BY created_at DESC LIMIT 1)").bind(user.id).run();
  return Response.json({ok:true});
}
