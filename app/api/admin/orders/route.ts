import { env } from "cloudflare:workers";
import { getAdmin } from "../../../admin/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!await getAdmin()) return Response.json({ error: "Não autorizado" }, { status: 403 });
  const orders = await env.DB.prepare(`
    SELECT o.id, o.customer_name AS customerName, o.customer_email AS customerEmail,
           o.customer_phone AS customerPhone, o.shipping_address AS shippingAddress,
           o.vehicle_plate AS vehiclePlate, o.total_cents AS totalCents, o.status,
           o.payment_provider AS paymentProvider, o.created_at AS createdAt,
           COALESCE(SUM(i.quantity), 0) AS itemCount
      FROM orders o LEFT JOIN order_snapshot_items i ON i.order_id=o.id
     GROUP BY o.id ORDER BY o.created_at DESC LIMIT 200
  `).all();
  return Response.json({ orders: orders.results });
}
