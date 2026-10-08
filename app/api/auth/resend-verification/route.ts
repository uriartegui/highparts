import { env } from "cloudflare:workers";
import { getCurrentUser, hashToken, isTrustedRequest, recordSecurityEvent } from "../../../auth";
import { sendAuthEmail } from "../../../email";

function randomToken(){const bytes=crypto.getRandomValues(new Uint8Array(32));return btoa(String.fromCharCode(...bytes)).replaceAll("+","-").replaceAll("/","_").replaceAll("=","")}

export async function POST(request:Request){
  if(!isTrustedRequest(request))return Response.json({error:"Origem não permitida."},{status:403});
  const user=await getCurrentUser();
  if(!user)return Response.json({error:"Entre na conta para continuar."},{status:401});
  if(user.emailVerifiedAt)return Response.json({ok:true,alreadyVerified:true});
  const recent=await env.DB.prepare("SELECT created_at AS createdAt FROM email_verification_tokens WHERE user_id=? ORDER BY datetime(created_at) DESC LIMIT 1").bind(user.id).first<{createdAt:string}>();
  if(recent&&Date.now()-new Date(recent.createdAt.replace(" ","T")+"Z").getTime()<60_000)return Response.json({error:"Aguarde um minuto antes de solicitar outro e-mail."},{status:429});
  const token=randomToken();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM email_verification_tokens WHERE user_id=? OR datetime(expires_at)<=datetime('now')").bind(user.id),
    env.DB.prepare("INSERT INTO email_verification_tokens (token_hash,user_id,expires_at) VALUES (?,?,?)").bind(await hashToken(token),user.id,new Date(Date.now()+24*60*60_000).toISOString()),
  ]);
  const url=`${new URL(request.url).origin}/verificar-email?token=${encodeURIComponent(token)}`;
  const delivery=await sendAuthEmail(user.email,"Confirme seu e-mail da HighParts",`<p>Olá, ${user.name}.</p><p><a href="${url}">Confirme seu e-mail da HighParts</a>.</p><p>Este link expira em 24 horas.</p>`);
  await recordSecurityEvent("verification_requested",user.email,user.id,{sent:delivery.sent});
  if(!delivery.configured)return Response.json({error:"O envio de e-mail ainda está sendo configurado."},{status:503});
  if(!delivery.sent)return Response.json({error:"Não foi possível enviar agora. Tente novamente mais tarde."},{status:503});
  return Response.json({ok:true});
}
