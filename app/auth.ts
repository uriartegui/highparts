import { env } from "cloudflare:workers";
import { cookies } from "next/headers";

export const ADMIN_EMAIL = "alisson@highparts.com.br";
const COOKIE_NAME = "highparts_session";
const SESSION_DAYS = 30;

export type AppUser = { id: string; name: string; email: string; role: "admin" | "customer"; phone: string };

function bytesToBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
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
  const id = crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await env.DB.prepare("INSERT INTO sessions (id,user_id,expires_at) VALUES (?,?,?)").bind(id, userId, expires.toISOString()).run();
  const store = await cookies();
  store.set(COOKIE_NAME, id, { httpOnly: true, secure: true, sameSite: "lax", path: "/", expires });
}

export async function destroySession() {
  const store = await cookies();
  const id = store.get(COOKIE_NAME)?.value;
  if (id) await env.DB.prepare("DELETE FROM sessions WHERE id=?").bind(id).run();
  store.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const store = await cookies();
  const id = store.get(COOKIE_NAME)?.value;
  if (!id) return null;
  const row = await env.DB.prepare(`SELECT u.id,u.name,u.email,u.role,u.phone FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.expires_at>CURRENT_TIMESTAMP`).bind(id).first<AppUser>();
  return row ?? null;
}

export async function requireUser() {
  return getCurrentUser();
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  return user?.role === "admin" ? user : null;
}
