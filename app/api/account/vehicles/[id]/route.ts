import { env } from "cloudflare:workers";
import { requireUser } from "../../../../auth";
export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await context.params;
  await env.DB.prepare("DELETE FROM vehicles WHERE id=? AND user_id=?").bind(id, user.id).run();
  return Response.json({ ok: true });
}
