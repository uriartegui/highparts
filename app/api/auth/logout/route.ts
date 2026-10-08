import { destroySession, isTrustedRequest } from "../../../auth";
export async function POST(request: Request) { if (!isTrustedRequest(request)) return Response.json({ error: "Origem não permitida." }, { status: 403 }); await destroySession(); return Response.json({ ok: true }); }
