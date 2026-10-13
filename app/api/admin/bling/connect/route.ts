import { getAdmin } from "../../../../admin/admin-auth";
import { createBlingAuthorization } from "../../../../bling";

export async function GET() {
  if (!await getAdmin()) return Response.json({ error: "Não autorizado" }, { status: 403 });
  try {
    return Response.redirect(await createBlingAuthorization(), 302);
  } catch (error) {
    console.error("bling_oauth_start_failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível iniciar a conexão." }, { status: 503 });
  }
}
