import { getAdmin } from "../../../../admin/admin-auth";
import { syncBlingInventory } from "../../../../bling";

export async function POST() {
  if (!await getAdmin()) return Response.json({ error: "Não autorizado" }, { status: 403 });
  try {
    return Response.json({ ok: true, ...(await syncBlingInventory()) });
  } catch (error) {
    console.error("bling_inventory_sync_failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Falha ao sincronizar o Bling." }, { status: 502 });
  }
}
