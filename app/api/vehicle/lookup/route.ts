import { env } from "cloudflare:workers";

type FalconResponse = { data?: { marca?:string; modelo?:string; ano?:string|number; ano_modelo?:string|number; combustivel?:string; cilindradas?:string|number }; message?:string; error?:string };
type Vehicle = { brand:string; model:string; version:string; year:string; engine:string|null };
type RuntimeEnv = { VEHICLE_API_TOKEN?: string; DB?: D1Database };

const jsonHeaders = { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" };

async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function readCachedVehicle(db: D1Database | undefined, plateHash: string) {
  if (!db) return null;
  const row = await db.prepare(
    "SELECT response_json FROM vehicle_lookup_cache WHERE plate_hash = ? AND expires_at > ?",
  ).bind(plateHash, Date.now()).first<{ response_json: string }>();
  if (!row) return null;
  try { return JSON.parse(row.response_json) as Vehicle; }
  catch { return null; }
}

async function allowLookup(db: D1Database | undefined, subjectHash: string) {
  if (!db) return true;
  const windowStart = new Date().toISOString().slice(0, 13);
  const row = await db.prepare(`
    INSERT INTO vehicle_lookup_limits (subject_hash, window_start, attempts)
    VALUES (?, ?, 1)
    ON CONFLICT(subject_hash, window_start) DO UPDATE SET attempts = attempts + 1
    RETURNING attempts
  `).bind(subjectHash, windowStart).first<{ attempts: number }>();
  return (row?.attempts ?? 1) <= 12;
}

export async function POST(request: Request) {
  let body: { type?: string; value?: string };
  try { body = await request.json(); }
  catch { return Response.json({ error: "Requisição inválida." }, { status: 400, headers: jsonHeaders }); }

  const type = body.type === "renavam" ? "renavam" : "plate";
  const value = type === "plate"
    ? String(body.value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7)
    : String(body.value ?? "").replace(/\D/g, "").slice(0, 11);

  if ((type === "plate" && value.length !== 7) || (type === "renavam" && value.length !== 11)) {
    return Response.json({ error: type === "plate" ? "Placa inválida." : "RENAVAM inválido." }, { status: 422, headers: jsonHeaders });
  }
  if (type === "renavam") {
    return Response.json({ error: "A consulta direta por RENAVAM depende de um provedor credenciado. Use a placa por enquanto." }, { status: 501, headers: jsonHeaders });
  }

  const runtime = env as unknown as RuntimeEnv;
  const token = runtime.VEHICLE_API_TOKEN;
  if (!token) return Response.json({ error: "A consulta de placas está pronta, mas a chave do provedor ainda não foi configurada.", configured: false }, { status: 503, headers: jsonHeaders });

  try {
    const plateHash = await digest(`plate:${value}`);
    const cached = await readCachedVehicle(runtime.DB, plateHash);
    if (cached) return Response.json({ vehicle: cached }, { headers: jsonHeaders });

    const clientIp = request.headers.get("cf-connecting-ip") || "unknown";
    const subjectHash = await digest(`lookup:${token}:${clientIp}`);
    if (!await allowLookup(runtime.DB, subjectHash)) {
      return Response.json({ error: "Muitas consultas foram feitas desta conexão. Tente novamente na próxima hora." }, { status: 429, headers: { ...jsonHeaders, "retry-after": "3600" } });
    }

    const upstream = await fetch(`https://beta.falcon-server.com.br/data-hub/private/v1/vehicles/${encodeURIComponent(value)}/search`, {
      method: "GET",
      headers: { "authorization": `Bearer ${token}`, "accept": "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    const data = await upstream.json() as FalconResponse;
    const info = data.data;
    if (!upstream.ok || !info?.marca || !info?.modelo) {
      return Response.json({ error: data.message || data.error || "Não foi possível identificar este veículo." }, { status: upstream.status >= 500 ? 502 : upstream.status, headers: jsonHeaders });
    }
    const cc = Number(String(info.cilindradas ?? "").replace(/\D/g, ""));
    const vehicle: Vehicle = {
      brand: info.marca.trim(),
      model: info.modelo.trim(),
      version: info.combustivel?.trim() || "Versão não informada",
      year: String(info.ano_modelo || info.ano || "Ano não informado"),
      engine: cc >= 600 ? (cc / 1000).toFixed(1) : null,
    };
    if (runtime.DB) {
      await runtime.DB.prepare(`
        INSERT INTO vehicle_lookup_cache (plate_hash, response_json, expires_at)
        VALUES (?, ?, ?)
        ON CONFLICT(plate_hash) DO UPDATE SET response_json = excluded.response_json, expires_at = excluded.expires_at
      `).bind(plateHash, JSON.stringify(vehicle), Date.now() + 30 * 24 * 60 * 60 * 1000).run();
    }
    return Response.json({ vehicle }, { headers: jsonHeaders });
  } catch {
    return Response.json({ error: "O serviço de identificação veicular não respondeu. Tente novamente em instantes." }, { status: 502, headers: jsonHeaders });
  }
}
