import { env } from "cloudflare:workers";
import { requireUser } from "../../../auth";

export async function GET() {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const result = await env.DB.prepare("SELECT item_key AS itemKey,name,fit,price_cents AS priceCents,quantity FROM saved_cart_items WHERE user_id=? ORDER BY created_at").bind(user.id).all();
  return Response.json({ items: result.results });
}

export async function PUT(request: Request) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const input = await request.json() as { items?: Array<{ itemKey: string; name: string; fit?: string; priceCents: number; quantity: number }> };
  const items = (input.items ?? []).filter((item) => String(item.itemKey).trim() && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99).slice(0, 100);
  await env.DB.prepare("DELETE FROM saved_cart_items WHERE user_id=?").bind(user.id).run();
  for (let start = 0; start < items.length; start += 25) {
    const statements = items.slice(start, start + 25).map((item) => env.DB.prepare("INSERT INTO saved_cart_items (id,user_id,item_key,name,fit,price_cents,quantity) VALUES (?,?,?,?,?,?,?)")
      .bind(crypto.randomUUID(), user.id, String(item.itemKey), String(item.name), String(item.fit ?? ""), Math.max(0, Number(item.priceCents)), Math.max(1, Number(item.quantity))));
    if (statements.length) await env.DB.batch(statements);
  }
  return Response.json({ ok: true });
}
