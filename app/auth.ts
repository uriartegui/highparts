import { env } from "cloudflare:workers";
import { cookies } from "next/headers";

const COOKIE_NAME = "highparts_session";
const SESSION_DAYS = 30;

export type AppUser = { id: string; name: string; email: string; role: "admin" | "customer"; phone: string; emailVerifiedAt: string | null };

function bytesToBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return bytesToHex(new Uint8Array(digest));
}

export function isTrustedRequest(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function verifyTurnstile(request: Request, token?: string) {
  const securityEnv = env as unknown as { TURNSTILE_SECRET_KEY?: string };
  if (!securityEnv.TURNSTILE_SECRET_KEY) return true;
  if (new URL(request.url).hostname.endsWith(".workers.dev")) return true;
  if (!token) return false;
  const form = new FormData();
  form.set("secret", securityEnv.TURNSTILE_SECRET_KEY);
  form.set("response", token);
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) form.set("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  const result = await response.json() as { success?: boolean };
  return result.success === true;
}

export async function recordSecurityEvent(type: string, subject?: string, userId?: string, details: Record<string, unknown> = {}) {
  try {
    const subjectHash = subject ? await hashToken(subject.trim().toLowerCase()) : null;
    await env.DB.prepare("INSERT INTO security_events (id,type,user_id,subject_hash,details) VALUES (?,?,?,?,?)")
      .bind(crypto.randomUUID(), type, userId ?? null, subjectHash, JSON.stringify(details)).run();
  } catch (error) { console.error("security_event_failed", type, error); }
}

export async function hashPassword(password: string, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100_000 }, material, 256);
  return `pbkdf2_sha256$100000$${bytesToBase64(salt)}$${bytesToBase64(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, iterations, salt, expected] = encoded.split("$");
  if (algorithm !== "pbkdf2_sha256" || !iterations || !salt || !expected) return false;
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: base64ToBytes(salt), iterations: Number(iterations) }, material, 256);
  const actual = new Uint8Array(bits);
  const expectedBytes = base64ToBytes(expected);
  if (actual.length !== expectedBytes.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index++) difference |= actual[index] ^ expectedBytes[index];
  return difference === 0;
}

export async function createSession(userId: string) {
  const token = crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");
  const id = await hashToken(token);
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE datetime(expires_at)<=datetime('now')"),
    env.DB.prepare("INSERT INTO sessions (id,user_id,expires_at) VALUES (?,?,?)").bind(id, userId, expires.toISOString()),
    env.DB.prepare("DELETE FROM sessions WHERE user_id=? AND id NOT IN (SELECT id FROM sessions WHERE user_id=? ORDER BY created_at DESC LIMIT 5)").bind(userId, userId),
  ]);
  const store = await cookies();
  store.set(COOKIE_NAME, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", expires, priority: "high" });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE id=?").bind(await hashToken(token)).run();
  store.set(COOKIE_NAME, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const row = await env.DB.prepare(`SELECT u.id,u.name,u.email,u.role,u.phone,u.email_verified_at AS emailVerifiedAt FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND datetime(s.expires_at)>datetime('now')`).bind(await hashToken(token)).first<AppUser>();
  return row ?? null;
}

export async function requireUser() {
  return getCurrentUser();
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  return user?.role === "admin" ? user : null;
}
