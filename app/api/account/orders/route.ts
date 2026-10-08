import { env } from "cloudflare:workers";
import { requireUser } from "../../../auth";

export async function GET() {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const orders = await env.DB.prepare("SELECT id,total_cents AS totalCents,status,payment_provider AS paymentProvider,vehicle_plate AS vehiclePlate,created_at AS createdAt FROM orders WHERE user_id=? ORDER BY created_at DESC").bind(user.id).all();
  return Response.json({ orders: orders.results });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Entre na conta para finalizar a compra." }, { status: 401 });
  if (!user.emailVerifiedAt) return Response.json({ error: "Confirme seu e-mail antes de finalizar a compra.", code: "EMAIL_NOT_VERIFIED" }, { status: 403 });
  const input = await request.json() as { phone?: string; postalCode?: string; address?: string; vehiclePlate?: string; items?: Array<{ itemKey: string; name: string; priceCents: number; quantity: number }> };
  const items = (input.items ?? []).filter((item) => item.quantity > 0 && item.priceCents >= 0);
  if (!items.length) return Response.json({ error: "O carrinho está vazio." }, { status: 400 });
  const total = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  const id = `HP-${Date.now().toString(36).toUpperCase()}`;
  await env.DB.prepare(`INSERT INTO orders (id,user_id,customer_name,customer_email,customer_phone,postal_code,shipping_address,vehicle_plate,total_cents,status,payment_provider)
    VALUES (?,?,?,?,?,?,?,?,?,'awaiting_payment','pending_provider')`).bind(id, user.id, user.name, user.email, input.phone ?? user.phone, input.postalCode ?? "", input.address ?? "", input.vehiclePlate ?? "", total).run();
  await env.DB.batch(items.map((item) => env.DB.prepare("INSERT INTO order_snapshot_items (id,order_id,item_key,name,unit_price_cents,quantity) VALUES (?,?,?,?,?,?)")
    .bind(crypto.randomUUID(), id, item.itemKey, item.name, item.priceCents, item.quantity)));
  await env.DB.prepare("DELETE FROM saved_cart_items WHERE user_id=?").bind(user.id).run();
  return Response.json({ order: { id, totalCents: total, status: "awaiting_payment" }, payment: { configured: false, message: "Pedido salvo. A cobrança será habilitada após configurar o provedor de pagamento." } }, { status: 201 });
}
