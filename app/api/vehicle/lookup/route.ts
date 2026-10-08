import { env } from "cloudflare:workers";

type FalconResponse = { data?: { marca?:string; modelo?:string; ano?:string|number; ano_modelo?:string|number; combustivel?:string; cilindradas?:string|number }; message?:string; error?:string };

const jsonHeaders = { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" };

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

  const token = (env as unknown as { VEHICLE_API_TOKEN?: string }).VEHICLE_API_TOKEN;
  if (!token) return Response.json({ error: "A consulta de placas está pronta, mas a chave do provedor ainda não foi configurada.", configured: false }, { status: 503, headers: jsonHeaders });

  try {
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
    return Response.json({ vehicle: {
      brand: info.marca.trim(),
      model: info.modelo.trim(),
      version: info.combustivel?.trim() || "Versão não informada",
      year: String(info.ano_modelo || info.ano || "Ano não informado"),
      engine: cc >= 600 ? (cc / 1000).toFixed(1) : null,
    } }, { headers: jsonHeaders });
  } catch {
    return Response.json({ error: "O serviço de identificação veicular não respondeu. Tente novamente em instantes." }, { status: 502, headers: jsonHeaders });
  }
}
