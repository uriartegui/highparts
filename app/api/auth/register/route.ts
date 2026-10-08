import { env } from "cloudflare:workers";
import { createSession, hashPassword, hashToken, isTrustedRequest, recordSecurityEvent, verifyTurnstile } from "../../../auth";
import { sendAuthEmail } from "../../../email";

function randomToken() { const bytes=crypto.getRandomValues(new Uint8Array(32)); return btoa(String.fromCharCode(...bytes)).replaceAll("+","-").replaceAll("/","_").replaceAll("=",""); }

export async function POST(request: Request) {
  if (!isTrustedRequest(request)) return Response.json({ error: "Origem da solicitação não permitida." }, { status: 403 });
  const input = await request.json().catch(() => ({})) as { name?: string; email?: string; password?: string; confirmPassword?: string; phone?: string; turnstileToken?: string };
  const name = input.name?.trim() ?? "";
  const email = input.email?.trim().toLowerCase() ?? "";
  const password = input.password ?? "";
  const phone = (input.phone ?? "").replace(/\D/g, "");
  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Informe seu nome completo.";
  if (!/^\S+@\S+\.\S+$/.test(email)) fieldErrors.email = "Informe um e-mail válido.";
  if (!/^\d{11}$/.test(phone)) fieldErrors.phone = "Informe um celular válido com DDD.";
  if (password.length < 10) fieldErrors.password = "A senha deve ter pelo menos 10 caracteres.";
  else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) fieldErrors.password = "Use pelo menos uma letra e um número.";
  if (password !== (input.confirmPassword ?? "")) fieldErrors.confirmPassword = "As senhas não coincidem.";
  if (!await verifyTurnstile(request, input.turnstileToken)) fieldErrors.turnstile = "Confirme que você não é um robô.";

  const [emailOwner, phoneOwner] = await Promise.all([
    email && !fieldErrors.email ? env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first() : null,
    phone && !fieldErrors.phone ? env.DB.prepare("SELECT id FROM users WHERE phone=?").bind(phone).first() : null,
  ]);
  if (emailOwner) fieldErrors.email = "Este e-mail já possui uma conta.";
  if (phoneOwner) fieldErrors.phone = "Este telefone já possui uma conta.";
  if (Object.keys(fieldErrors).length) {
    return Response.json({ fieldErrors }, { status: emailOwner || phoneOwner ? 409 : 400 });
  }
  const id = crypto.randomUUID();
  const role = "customer";
  try {
    await env.DB.prepare("INSERT INTO users (id,name,email,password_hash,role,phone) VALUES (?,?,?,?,?,?)")
      .bind(id, name, email, await hashPassword(password), role, phone).run();
  } catch {
    const duplicateEmail = await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first();
    return Response.json({ fieldErrors: duplicateEmail
      ? { email: "Este e-mail já possui uma conta." }
      : { phone: "Este telefone já possui uma conta." } }, { status: 409 });
  }
  await createSession(id);
  const token = randomToken();
  await env.DB.prepare("INSERT INTO email_verification_tokens (token_hash,user_id,expires_at) VALUES (?,?,?)")
    .bind(await hashToken(token), id, new Date(Date.now()+24*60*60_000).toISOString()).run();
  const verifyUrl = `${new URL(request.url).origin}/verificar-email?token=${encodeURIComponent(token)}`;
  const delivery = await sendAuthEmail(email, "Confirme seu e-mail da HighParts", `<p>Olá, ${name}.</p><p>Confirme seu e-mail para proteger sua conta.</p><p><a href="${verifyUrl}">Confirmar meu e-mail</a></p><p>O link expira em 24 horas.</p>`);
  await recordSecurityEvent("account_registered", email, id, { verificationEmailSent: delivery.sent });
  return Response.json({ user: { id, name, email, role }, verificationEmailSent: delivery.sent }, { status: 201 });
}
