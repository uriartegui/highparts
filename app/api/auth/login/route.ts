import { env } from "cloudflare:workers";
import { createSession, hashPassword, hashToken, isTrustedRequest, recordSecurityEvent, verifyPassword, verifyTurnstile } from "../../../auth";

const WINDOW_MINUTES = 15;
// Per-account limit protects one account; the per-IP limit stops one client
// from spraying passwords across many accounts (credential stuffing).
const MAX_ATTEMPTS_PER_EMAIL = 5;
const MAX_ATTEMPTS_PER_IP = 20;
const TOO_MANY = "Muitas tentativas. Aguarde 15 minutos e tente novamente.";

type Limiter = { attempts: number; windowStartedAt: string; lockedUntil: string | null };

// login_attempts is keyed by a free-form subject: the e-mail, or "ip:<sha256>".
async function readLimiter(key: string) {
  return env.DB.prepare("SELECT attempts,window_started_at AS windowStartedAt,locked_until AS lockedUntil FROM login_attempts WHERE email=?").bind(key).first<Limiter>();
}

function isLocked(limiter: Limiter | null) {
  return Boolean(limiter?.lockedUntil && new Date(limiter.lockedUntil).getTime() > Date.now());
}

async function recordFailure(key: string, limiter: Limiter | null, maxAttempts: number) {
  const windowExpired = !limiter || Date.now() - new Date(limiter.windowStartedAt.replace(" ", "T") + (limiter.windowStartedAt.includes("Z") ? "" : "Z")).getTime() > WINDOW_MINUTES * 60_000;
  const attempts = (windowExpired ? 0 : limiter.attempts) + 1;
  const lockedUntil = attempts >= maxAttempts ? new Date(Date.now() + WINDOW_MINUTES * 60_000).toISOString() : null;
  await env.DB.prepare(`INSERT INTO login_attempts (email,attempts,window_started_at,locked_until) VALUES (?,?,CURRENT_TIMESTAMP,?)
    ON CONFLICT(email) DO UPDATE SET attempts=?,window_started_at=CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE window_started_at END,locked_until=?,updated_at=CURRENT_TIMESTAMP`).bind(key, attempts, lockedUntil, attempts, windowExpired ? 1 : 0, lockedUntil).run();
  return { attempts, locked: Boolean(lockedUntil) };
}

export async function POST(request: Request) {
  if (!isTrustedRequest(request)) return Response.json({ error: "Origem da solicitação não permitida." }, { status: 403 });
  const input = await request.json().catch(() => ({})) as { email?: string; password?: string; turnstileToken?: string };
  const email = input.email?.trim().toLowerCase() ?? "";
  const password = input.password ?? "";
  const fieldErrors: Record<string, string> = {};
  if (!/^\S+@\S+\.\S+$/.test(email)) fieldErrors.email = "Informe um e-mail válido.";
  if (!password) fieldErrors.password = "Informe sua senha.";
  if (Object.keys(fieldErrors).length) return Response.json({ fieldErrors }, { status: 400 });
  // Checked only after the cheap field validation so a typo does not burn the single-use token.
  if (!await verifyTurnstile(request, input.turnstileToken)) return Response.json({ fieldErrors: { turnstile: "Confirme que você não é um robô." } }, { status: 400 });

  const ipKey = "ip:" + await hashToken(request.headers.get("CF-Connecting-IP") || "unknown");
  const [emailLimiter, ipLimiter] = await Promise.all([readLimiter(email), readLimiter(ipKey)]);
  if (isLocked(emailLimiter) || isLocked(ipLimiter)) return Response.json({ error: TOO_MANY }, { status: 429 });

  const user = await env.DB.prepare("SELECT id,name,email,role,phone,password_hash AS passwordHash FROM users WHERE email=?").bind(email).first<any>();
  const valid = user ? await verifyPassword(password, user.passwordHash) : (await hashPassword(password), false);
  if (!valid) {
    const [byEmail, byIp] = await Promise.all([
      recordFailure(email, emailLimiter, MAX_ATTEMPTS_PER_EMAIL),
      recordFailure(ipKey, ipLimiter, MAX_ATTEMPTS_PER_IP),
    ]);
    const locked = byEmail.locked || byIp.locked;
    await recordSecurityEvent(locked ? "login_locked" : "login_failed", email, user?.id, { attempts: byEmail.attempts, ipAttempts: byIp.attempts });
    return Response.json({ error: locked ? TOO_MANY : "E-mail ou senha incorretos." }, { status: locked ? 429 : 401 });
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
