import { env } from "cloudflare:workers";
import { getAdmin } from "../../../../admin/admin-auth";

const statuses = new Set(["awaiting_payment", "paid", "processing", "shipped", "delivered", "cancelled"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdmin()) return Response.json({ error: "Não autorizado" }, { status: 403 });
  const { id } = await params;
  const input = await request.json() as { status?: string };
  if (!input.status || !statuses.has(input.status)) return Response.json({ error: "Status inválido" }, { status: 400 });
  const result = await env.DB.prepare("UPDATE orders SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(input.status, decodeURIComponent(id)).run();
  if (!result.meta.changes) return Response.json({ error: "Pedido não encontrado" }, { status: 404 });
  return Response.json({ ok: true });
}
