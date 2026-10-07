import { env } from "cloudflare:workers";
import { createSession, verifyPassword } from "../../../auth";

export async function POST(request: Request) {
  const input = await request.json() as { email?: string; password?: string };
  const email = input.email?.trim().toLowerCase() ?? "";
  const user = await env.DB.prepare("SELECT id,name,email,role,phone,password_hash AS passwordHash FROM users WHERE email=?").bind(email).first<any>();
  if (!user || !await verifyPassword(input.password ?? "", user.passwordHash)) {
    return Response.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
  }
  await createSession(user.id);
  delete user.passwordHash;
  return Response.json({ user });
}
