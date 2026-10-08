import { env } from "cloudflare:workers";
import { hashToken, isTrustedRequest } from "../../../auth";

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function POST(request: Request) {
  if (!isTrustedRequest(request)) return Response.json({ error: "Origem não permitida." }, { status: 403 });
  const input = await request.json().catch(() => ({})) as { email?: string };
  const email = input.email?.trim().toLowerCase() ?? "";
  if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ fieldErrors: { email: "Informe um e-mail válido." } }, { status: 400 });

  const user = await env.DB.prepare("SELECT id,name FROM users WHERE email=?").bind(email).first<{ id: string; name: string }>();
  const emailEnv = env as unknown as { RESEND_API_KEY?: string; AUTH_FROM_EMAIL?: string };
  if (user && emailEnv.RESEND_API_KEY && emailEnv.AUTH_FROM_EMAIL) {
    const token = randomToken();
    const expires = new Date(Date.now() + 30 * 60_000).toISOString();
    await env.DB.batch([
      env.DB.prepare("DELETE FROM password_reset_tokens WHERE user_id=? OR datetime(expires_at)<=datetime('now')").bind(user.id),
      env.DB.prepare("INSERT INTO password_reset_tokens (token_hash,user_id,expires_at) VALUES (?,?,?)").bind(await hashToken(token), user.id, expires),
    ]);
    const resetUrl = `${new URL(request.url).origin}/redefinir-senha?token=${encodeURIComponent(token)}`;
    const sent = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${emailEnv.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: emailEnv.AUTH_FROM_EMAIL, to: [email], subject: "Redefina sua senha da HighParts", html: `<p>Olá, ${user.name}.</p><p>Recebemos um pedido para redefinir sua senha.</p><p><a href="${resetUrl}">Criar uma nova senha</a></p><p>Este link expira em 30 minutos. Se você não fez este pedido, ignore este e-mail.</p>` }),
    });
    if (!sent.ok) return Response.json({ error: "Não foi possível enviar o e-mail agora. Tente novamente mais tarde." }, { status: 503 });
  }

  return Response.json({ ok: true, emailConfigured: Boolean(emailEnv.RESEND_API_KEY && emailEnv.AUTH_FROM_EMAIL) });
}
