import { env } from "cloudflare:workers";

const MAX_LIMIT = 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(url.searchParams.get("limit")) || 24));
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const saleOnly = url.searchParams.get("saleOnly") === "1";
  const category = (url.searchParams.get("category") ?? "").trim().slice(0, 80);
  const brand = (url.searchParams.get("brand") ?? "").trim().slice(0, 40);
  const axle = (url.searchParams.get("axle") ?? "").trim().slice(0, 40);
  const conditions = ["active=1"];
  const bindings: Array<string | number> = [];

  if (search) {
    conditions.push("(code LIKE ? OR product LIKE ? OR application LIKE ? OR type LIKE ?)");
    const pattern = `%${search}%`;
    bindings.push(pattern, pattern, pattern, pattern);
  }
  if (saleOnly) conditions.push("price_cents IS NOT NULL AND stock_quantity > 0");
  if (category) { conditions.push("product = ?"); bindings.push(category); }
  if (brand === "VOLKSWAGEN") { conditions.push("(application LIKE ? OR application LIKE ?)"); bindings.push("%[VW]%", "%[VOLKSWAGEN]%"); }
  else if (brand === "CHEVROLET") { conditions.push("(application LIKE ? OR application LIKE ?)"); bindings.push("%[GM]%", "%[CHEVROLET]%"); }
  else if (brand) { conditions.push("application LIKE ?"); bindings.push(`%[${brand}]%`); }
  if (axle === "DIANTEIRO") conditions.push("(UPPER(axle) LIKE 'D%' OR UPPER(axle) LIKE '%DIANT%') AND UPPER(axle) NOT LIKE '%TRAS%' AND UPPER(axle) NOT LIKE '%/T%'");
  else if (axle === "TRASEIRO") conditions.push("(UPPER(axle) LIKE 'T%' OR UPPER(axle) LIKE '%TRAS%') AND UPPER(axle) NOT LIKE '%DIANT%' AND UPPER(axle) NOT LIKE 'D/T%'");
  else if (axle === "DIANTEIRO / TRASEIRO") conditions.push("(UPPER(axle) LIKE '%DIANT%TRAS%' OR UPPER(axle) LIKE 'D/T%')");

  const statement = env.DB.prepare(`
    SELECT code, product, application, axle, type, hub,
           price_cents AS priceCents, stock_quantity AS stockQuantity, image_url AS imageUrl
      FROM products
     WHERE ${conditions.join(" AND ")}
     ORDER BY CASE WHEN price_cents IS NOT NULL AND stock_quantity > 0 THEN 0 ELSE 1 END,
              product, code
     LIMIT ? OFFSET ?
  `).bind(...bindings, limit, (page - 1) * limit);
  const products = await statement.all();
  const total = await env.DB.prepare(`SELECT COUNT(*) AS count FROM products WHERE ${conditions.join(" AND ")}`).bind(...bindings).first<{count:number}>();
  let facets = { categories:[] as string[], brands:[] as string[], axles:[] as string[] };
  if (url.searchParams.get("facets") === "1") {
    const [categories, applications, axles] = await Promise.all([
      env.DB.prepare("SELECT DISTINCT product AS value FROM products WHERE active=1 AND product<>'' ORDER BY product").all<{value:string}>(),
      env.DB.prepare("SELECT application FROM products WHERE active=1").all<{application:string}>(),
      env.DB.prepare("SELECT DISTINCT axle AS value FROM products WHERE active=1 AND axle<>'' ORDER BY axle").all<{value:string}>(),
    ]);
    const brands = new Set<string>();
    for (const row of applications.results) for (const match of row.application.matchAll(/\[([^\]]+)\]/g)) {
      let value = match[1].trim().toUpperCase();
      if (!/^[A-ZÀ-Ü][A-ZÀ-Ü &/-]{1,28}$/.test(value)) continue;
      if (value === "VW") value = "VOLKSWAGEN";
      if (value === "GM") value = "CHEVROLET";
      brands.add(value);
    }
    facets = {
      categories: categories.results.map(x=>x.value).filter(value=>/^(CILINDRO MESTRE|CUBO DE RODA|DISCO DE FREIO|TAMBOR DE FREIO)$/i.test(value)),
      brands:[...brands].sort(),
      axles: axles.results.length ? ["DIANTEIRO", "TRASEIRO", "DIANTEIRO / TRASEIRO"] : [],
    };
  }
  return Response.json({ products: products.results, total: total?.count ?? 0, facets });
}
