import { env } from "cloudflare:workers";

const MAX_LIMIT = 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(url.searchParams.get("limit")) || 24));
  const saleOnly = url.searchParams.get("saleOnly") === "1";
  const conditions = ["active=1"];
  const bindings: Array<string | number> = [];

  if (search) {
    conditions.push("(code LIKE ? OR product LIKE ? OR application LIKE ? OR type LIKE ?)");
    const pattern = `%${search}%`;
    bindings.push(pattern, pattern, pattern, pattern);
  }
  if (saleOnly) conditions.push("price_cents IS NOT NULL AND stock_quantity > 0");

  const statement = env.DB.prepare(`
    SELECT code, product, application, axle, type, hub,
           price_cents AS priceCents, stock_quantity AS stockQuantity, image_url AS imageUrl
      FROM products
     WHERE ${conditions.join(" AND ")}
     ORDER BY CASE WHEN price_cents IS NOT NULL AND stock_quantity > 0 THEN 0 ELSE 1 END,
              product, code
     LIMIT ?
  `).bind(...bindings, limit);
  const products = await statement.all();
  return Response.json({ products: products.results });
}
