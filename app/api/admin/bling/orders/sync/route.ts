import { getAdmin } from "../../../../../admin/admin-auth";
import { syncPendingBlingOrders } from "../../../../../bling";

export async function POST() {
  if (!await getAdmin()) return Response.json({ error: "Não autorizado" }, { status: 403 });
  try {
    const results = await syncPendingBlingOrders();
    return Response.json({ ok: true, processed: results.length, failed: results.filter((item) => !item.ok).length, results });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Falha ao enviar pedidos." }, { status: 502 });
  }
}
