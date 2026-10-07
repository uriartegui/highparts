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

await writeFile(outputPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Prepared ${outputPath.pathname} for ${config.name}.`);

