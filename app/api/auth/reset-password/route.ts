import { env } from "cloudflare:workers";
import { hashPassword, hashToken, isTrustedRequest } from "../../../auth";

export async function POST(request: Request) {
  if (!isTrustedRequest(request)) return Response.json({ error: "Origem não permitida." }, { status: 403 });
  const input = await request.json().catch(() => ({})) as { token?: string; password?: string; confirmPassword?: string };
  const fieldErrors: Record<string, string> = {};
  const password = input.password ?? "";
  if (password.length < 10) fieldErrors.password = "A senha deve ter pelo menos 10 caracteres.";
  else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) fieldErrors.password = "Use pelo menos uma letra e um número.";
  if (password !== (input.confirmPassword ?? "")) fieldErrors.confirmPassword = "As senhas não coincidem.";
  if (Object.keys(fieldErrors).length) return Response.json({ fieldErrors }, { status: 400 });
  if (!input.token) return Response.json({ error: "Link de recuperação inválido ou expirado." }, { status: 400 });

  const tokenHash = await hashToken(input.token);
  const reset = await env.DB.prepare("SELECT user_id AS userId FROM password_reset_tokens WHERE token_hash=? AND used_at IS NULL AND datetime(expires_at)>datetime('now')").bind(tokenHash).first<{ userId: string }>();
  if (!reset) return Response.json({ error: "Link de recuperação inválido ou expirado." }, { status: 400 });
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET password_hash=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(await hashPassword(password), reset.userId),
    env.DB.prepare("UPDATE password_reset_tokens SET used_at=CURRENT_TIMESTAMP WHERE token_hash=?").bind(tokenHash),
    env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(reset.userId),
    env.DB.prepare("DELETE FROM login_attempts WHERE email=(SELECT email FROM users WHERE id=?)").bind(reset.userId),
  ]);
  return Response.json({ ok: true });
}
