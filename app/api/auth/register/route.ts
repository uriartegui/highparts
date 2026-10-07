import { env } from "cloudflare:workers";
import { ADMIN_EMAIL, createSession, hashPassword } from "../../../auth";

export async function POST(request: Request) {
  const input = await request.json() as { name?: string; email?: string; password?: string; confirmPassword?: string; phone?: string };
  const name = input.name?.trim() ?? "";
  const email = input.email?.trim().toLowerCase() ?? "";
  const password = input.password ?? "";
  const phone = (input.phone ?? "").replace(/\D/g, "");
  if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
    return Response.json({ error: "Informe nome, e-mail válido e senha com pelo menos 8 caracteres." }, { status: 400 });
  }
  if (password !== input.confirmPassword) {
    return Response.json({ error: "As senhas não coincidem." }, { status: 400 });
  }
  if (!/^\d{11}$/.test(phone)) {
    return Response.json({ error: "Informe um celular válido com DDD." }, { status: 400 });
  }
  if (await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first()) {
    return Response.json({ error: "Este e-mail já possui uma conta." }, { status: 409 });
  }
  if (await env.DB.prepare("SELECT id FROM users WHERE phone=?").bind(phone).first()) {
    return Response.json({ error: "Este telefone já possui uma conta." }, { status: 409 });
  }
  const id = crypto.randomUUID();
  const role = email === ADMIN_EMAIL ? "admin" : "customer";
  try {
    await env.DB.prepare("INSERT INTO users (id,name,email,password_hash,role,phone) VALUES (?,?,?,?,?,?)")
      .bind(id, name, email, await hashPassword(password), role, phone).run();
  } catch {
    return Response.json({ error: "E-mail ou telefone já cadastrado." }, { status: 409 });
  }
  await createSession(id);
  return Response.json({ user: { id, name, email, role } }, { status: 201 });
}
