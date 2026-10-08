import { env } from "cloudflare:workers";
import { createSession, hashPassword, isTrustedRequest, recordSecurityEvent, verifyPassword, verifyTurnstile } from "../../../auth";

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

export async function POST(request: Request) {
  if (!isTrustedRequest(request)) return Response.json({ error: "Origem da solicitação não permitida." }, { status: 403 });
  const input = await request.json().catch(() => ({})) as { email?: string; password?: string; turnstileToken?: string };
  const email = input.email?.trim().toLowerCase() ?? "";
  const password = input.password ?? "";
  const fieldErrors: Record<string, string> = {};
  if (!/^\S+@\S+\.\S+$/.test(email)) fieldErrors.email = "Informe um e-mail válido.";
  if (!password) fieldErrors.password = "Informe sua senha.";
  if (!await verifyTurnstile(request, input.turnstileToken)) fieldErrors.turnstile = "Confirme que você não é um robô.";
  if (Object.keys(fieldErrors).length) return Response.json({ fieldErrors }, { status: 400 });

  const limiter = await env.DB.prepare("SELECT attempts,window_started_at AS windowStartedAt,locked_until AS lockedUntil FROM login_attempts WHERE email=?").bind(email).first<{ attempts: number; windowStartedAt: string; lockedUntil: string | null }>();
  if (limiter?.lockedUntil && new Date(limiter.lockedUntil).getTime() > Date.now()) {
    return Response.json({ error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." }, { status: 429 });
  }

  const user = await env.DB.prepare("SELECT id,name,email,role,phone,password_hash AS passwordHash FROM users WHERE email=?").bind(email).first<any>();
  const valid = user ? await verifyPassword(password, user.passwordHash) : (await hashPassword(password), false);
  if (!valid) {
    const windowExpired = !limiter || Date.now() - new Date(limiter.windowStartedAt.replace(" ", "T") + (limiter.windowStartedAt.includes("Z") ? "" : "Z")).getTime() > WINDOW_MINUTES * 60_000;
    const attempts = (windowExpired ? 0 : limiter.attempts) + 1;
    const lockedUntil = attempts >= MAX_ATTEMPTS ? new Date(Date.now() + WINDOW_MINUTES * 60_000).toISOString() : null;
    await env.DB.prepare(`INSERT INTO login_attempts (email,attempts,window_started_at,locked_until) VALUES (?,?,CURRENT_TIMESTAMP,?)
      ON CONFLICT(email) DO UPDATE SET attempts=?,window_started_at=CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE window_started_at END,locked_until=?,updated_at=CURRENT_TIMESTAMP`).bind(email, attempts, lockedUntil, attempts, windowExpired ? 1 : 0, lockedUntil).run();
    await recordSecurityEvent(lockedUntil ? "login_locked" : "login_failed", email, user?.id, { attempts });
    return Response.json({ error: attempts >= MAX_ATTEMPTS ? "Muitas tentativas. Aguarde 15 minutos e tente novamente." : "E-mail ou senha incorretos." }, { status: attempts >= MAX_ATTEMPTS ? 429 : 401 });
  }

  await env.DB.batch([
    env.DB.prepare("DELETE FROM login_attempts WHERE email=?").bind(email),
    env.DB.prepare("UPDATE users SET last_login_at=CURRENT_TIMESTAMP WHERE id=?").bind(user.id),
  ]);
  await createSession(user.id);
  await recordSecurityEvent("login_succeeded", email, user.id);
  delete user.passwordHash;
  return Response.json({ user });
}
