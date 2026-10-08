import { env } from "cloudflare:workers";
import { hashToken, isTrustedRequest, recordSecurityEvent } from "../../../auth";

export async function POST(request: Request) {
  if (!isTrustedRequest(request)) return Response.json({ error: "Origem não permitida." }, { status: 403 });
  const { token } = await request.json().catch(() => ({})) as { token?: string };
  if (!token) return Response.json({ error: "Link inválido ou expirado." }, { status: 400 });
  const tokenHash = await hashToken(token);
  const row = await env.DB.prepare("SELECT user_id AS userId FROM email_verification_tokens WHERE token_hash=? AND used_at IS NULL AND datetime(expires_at)>datetime('now')")
    .bind(tokenHash).first<{ userId: string }>();
  if (!row) return Response.json({ error: "Link inválido ou expirado." }, { status: 400 });
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET email_verified_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(row.userId),
    env.DB.prepare("UPDATE email_verification_tokens SET used_at=CURRENT_TIMESTAMP WHERE token_hash=?").bind(tokenHash),
  ]);
  await recordSecurityEvent("email_verified", undefined, row.userId);
  return Response.json({ ok: true });
}
