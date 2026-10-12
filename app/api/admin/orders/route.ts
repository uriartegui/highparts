import { env } from "cloudflare:workers";
import { getAdmin } from "../../../admin/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getAdmin()))
    return Response.json({ error: "Não autorizado" }, { status: 403 });
  const [orders, items] = await Promise.all([
    env.DB.prepare(
      `
    SELECT o.id, o.customer_name AS customerName, o.customer_email AS customerEmail,
           o.customer_phone AS customerPhone, o.shipping_address AS shippingAddress,
           o.vehicle_plate AS vehiclePlate, o.total_cents AS totalCents, o.status,
           o.payment_provider AS paymentProvider, o.payment_mode AS paymentMode, o.created_at AS createdAt,
           o.shipping_carrier AS shippingCarrier,o.shipping_service AS shippingService,
           o.tracking_code AS trackingCode,o.shipped_at AS shippedAt,
           COALESCE(SUM(i.quantity), 0) AS itemCount
      FROM orders o LEFT JOIN order_snapshot_items i ON i.order_id=o.id
     GROUP BY o.id ORDER BY o.created_at DESC LIMIT 200
  `,
    ).all(),
    env.DB.prepare(
      `SELECT i.order_id AS orderId,i.item_key AS itemKey,i.name,i.unit_price_cents AS unitPriceCents,
      i.quantity,COALESCE(f.packed,0) AS packed
      FROM order_snapshot_items i JOIN orders o ON o.id=i.order_id
      LEFT JOIN order_fulfillment_items f ON f.order_id=i.order_id AND f.item_key=i.item_key
      ORDER BY i.order_id,i.name`,
    ).all(),
  ]);
  const lines = items.results as Array<{ orderId: string }>;
  return Response.json({
    orders: orders.results.map((order) => ({
      ...order,
      items: lines.filter((item) => item.orderId === order.id),
    })),
  });
}
