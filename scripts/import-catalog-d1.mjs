import { readFile } from "node:fs/promises";

const { CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID } = process.env;

if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_D1_DATABASE_ID) {
  throw new Error("Cloudflare token, account ID and D1 database ID are required.");
}

const catalog = JSON.parse(await readFile(new URL("../public/catalog.json", import.meta.url), "utf8"));
const endpoint = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${CLOUDFLARE_D1_DATABASE_ID}/query`;
for (let start = 0; start < catalog.length; start += 10) {
  const batch = catalog.slice(start, start + 10);
  const values = batch.map(() => "(?, ?, ?, ?, ?, ?, ?, 1)").join(", ");
  const sql = `INSERT INTO products (code, original_code, application, axle, product, type, hub, active)
VALUES ${values}
ON CONFLICT(code) DO UPDATE SET
  original_code=excluded.original_code,
  application=excluded.application,
  axle=excluded.axle,
  product=excluded.product,
  type=excluded.type,
  hub=excluded.hub,
  updated_at=CURRENT_TIMESTAMP`;
  const params = batch.flatMap((item) => [
    item.code,
    item.original,
    item.application,
    item.axle,
    item.product,
    item.type,
    item.hub,
  ]);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  });
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(`Catalog import failed at item ${start}: ${JSON.stringify(result.errors ?? result)}`);
  }
  process.stdout.write(`\rImported ${Math.min(start + batch.length, catalog.length)} of ${catalog.length}`);
}

process.stdout.write("\nCatalog import complete.\n");
