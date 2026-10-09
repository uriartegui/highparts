import { env } from "cloudflare:workers";
import { requireUser } from "../../../auth";

export async function GET() {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const result = await env.DB.prepare("SELECT id,plate,brand,model,year,version,has_abs AS hasAbs,nickname FROM vehicles WHERE user_id=? ORDER BY created_at DESC").bind(user.id).all();
  return Response.json({ vehicles: result.results });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const input = await request.json() as Record<string, any>;
  const plate = String(input.plate ?? "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (!/^[A-Z]{3}[0-9A-Z][0-9]{2}[0-9A-Z]$/.test(plate)) return Response.json({ error: "Placa inválida." }, { status: 400 });
  const id = crypto.randomUUID();
  const rawAbs=input.hasAbs;
  const hasAbs=rawAbs===true||rawAbs==="true"||rawAbs==="1"?1:rawAbs===false||rawAbs==="false"||rawAbs==="0"?0:null;
  await env.DB.prepare(`INSERT INTO vehicles (id,user_id,plate,brand,model,year,version,has_abs,nickname) VALUES (?,?,?,?,?,?,?,?,?)
    ON CONFLICT(user_id,plate) DO UPDATE SET brand=excluded.brand,model=excluded.model,year=excluded.year,version=excluded.version,has_abs=excluded.has_abs,nickname=excluded.nickname`)
    .bind(id, user.id, plate, String(input.brand??"").trim(), String(input.model??"").trim(), String(input.year??"").trim(), String(input.version??"").trim(), hasAbs, String(input.nickname??"").trim()).run();
  return Response.json({ ok: true, id, plate }, { status: 201 });
}
