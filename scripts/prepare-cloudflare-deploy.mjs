import { readFile, writeFile } from "node:fs/promises";

const sourcePath = new URL("../dist/server/wrangler.json", import.meta.url);
const outputPath = new URL("../dist/server/wrangler.deploy.json", import.meta.url);
const required = ["CLOUDFLARE_D1_DATABASE_ID", "CLOUDFLARE_D1_DATABASE_NAME", "CLOUDFLARE_WORKER_NAME"];
const missing = required.filter((name) => !process.env[name]);

if (missing.length) {
  throw new Error(`Missing GitHub variables: ${missing.join(", ")}`);
}

const config = JSON.parse(await readFile(sourcePath, "utf8"));
config.name = process.env.CLOUDFLARE_WORKER_NAME;
config.topLevelName = process.env.CLOUDFLARE_WORKER_NAME;
config.d1_databases = [{
  binding: "DB",
  database_name: process.env.CLOUDFLARE_D1_DATABASE_NAME,
  database_id: process.env.CLOUDFLARE_D1_DATABASE_ID,
  migrations_dir: "../../drizzle",
}];
config.r2_buckets = [{
  binding: "BUCKET",
  bucket_name: process.env.CLOUDFLARE_R2_BUCKET_NAME || "highparts-product-images",
}];

// Plain (non-secret) runtime vars live in the deploy config so `wrangler deploy`
// publishes them every time; vars added only in the dashboard are removed on
// deploy. Secrets (TURNSTILE_SECRET_KEY, RESEND_API_KEY, ...) stay in Cloudflare.
const TURNSTILE_SITE_KEY = "0x4AAAAAAFRY1fj2LtDemWa3"; // public by design: rendered in every page
config.vars = {
  ...config.vars,
  TURNSTILE_SITE_KEY: process.env.TURNSTILE_SITE_KEY || TURNSTILE_SITE_KEY,
  ...(process.env.AUTH_FROM_EMAIL ? { AUTH_FROM_EMAIL: process.env.AUTH_FROM_EMAIL } : {}),
  // Only the exact value "production" enables live Mercado Pago checkout.
  ...(process.env.MERCADO_PAGO_ENV ? { MERCADO_PAGO_ENV: process.env.MERCADO_PAGO_ENV } : {}),
  ...(process.env.BLING_INTEGRATION_ENABLED ? { BLING_INTEGRATION_ENABLED: process.env.BLING_INTEGRATION_ENABLED } : {}),
  ...(process.env.BLING_PAYMENT_METHOD_ID ? { BLING_PAYMENT_METHOD_ID: process.env.BLING_PAYMENT_METHOD_ID } : {}),
  ...(process.env.BLING_PAID_ORDER_STATUS_ID ? { BLING_PAID_ORDER_STATUS_ID: process.env.BLING_PAID_ORDER_STATUS_ID } : {}),
};
if (!config.vars.AUTH_FROM_EMAIL) {
  console.warn("AUTH_FROM_EMAIL is not set: verification and password reset emails will not be sent.");
}
if (process.env.BLING_INTEGRATION_ENABLED === "true") {
  config.triggers = { ...config.triggers, crons: ["*/5 * * * *"] };
}

await writeFile(outputPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Prepared ${outputPath.pathname} for ${config.name}.`);

