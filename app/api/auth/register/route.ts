import { env } from "cloudflare:workers";
import { createSession, hashPassword, isTrustedRequest } from "../../../auth";

export async function POST(request: Request) {
  if (!isTrustedRequest(request)) return Response.json({ error: "Origem da solicitação não permitida." }, { status: 403 });
  const input = await request.json().catch(() => ({})) as { name?: string; email?: string; password?: string; confirmPassword?: string; phone?: string };
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
  return Response.json({ user: { id, name, email, role } }, { status: 201 });
}
