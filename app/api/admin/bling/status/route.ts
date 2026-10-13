import { getAdmin } from "../../../../admin/admin-auth";
import { blingStatus } from "../../../../bling";

export async function GET() {
  if (!await getAdmin()) return Response.json({ error: "Não autorizado" }, { status: 403 });
  try {
    return Response.json(await blingStatus());
  } catch (error) {
    console.error("bling_status_failed", error);
    return Response.json({ error: "Não foi possível consultar a integração." }, { status: 500 });
  }
}
