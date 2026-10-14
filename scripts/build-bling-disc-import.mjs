import fs from "node:fs";
import path from "node:path";

const sourceDir = process.argv[2];
const modelCsv = process.argv[3];
const outputCsv = process.argv[4];

if (!sourceDir || !modelCsv || !outputCsv) {
  throw new Error("Uso: node scripts/build-bling-disc-import.mjs <origem> <modelo.csv> <saida.csv>");
}

const headerLine = fs.readFileSync(modelCsv, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0];
const headers = headerLine.split(",");

const quote = (value = "") => {
  const text = String(value).replace(/\r?\n/g, "\n");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const folders = fs
  .readdirSync(sourceDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^HF/i.test(entry.name))
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));

const rows = folders.map((folder) => {
  const raw = fs.readFileSync(path.join(sourceDir, folder, "texto_anuncio.txt"), "utf8");
  const sku = folder.replace(/^HF\s*/i, "HF ");
  const technicalName = `PAR DE DISCOS DE FREIO HIPPER FREIOS ${sku}`;
  const description = raw
    .replace(/CONTEÚDO:\s*\[[^\]]+\]/iu, "CONTEÚDO DA EMBALAGEM: 1 par com 2 discos de freio.")
    .replace(
      /Vendido e enviado por HIGH PARTS\./iu,
      "Precisa comprar somente 1 disco? Entre em contato com o suporte da HIGH PARTS antes de realizar o pedido.\n\nVendido e enviado por HIGH PARTS.",
    );

  const values = {
    "Código": sku,
    "Descrição": technicalName,
    "Unidade": "PAR",
    "Observações": "Venda padrão em par com 2 discos. Para comprar somente 1 disco, contatar o suporte da HIGH PARTS.",
    "Situação": "Inativo",
    "Descrição Complementar": description,
    "Produto Variação": "Produto",
    "Tipo Produção": "Terceiros",
    "Marca": "HIPPER FREIOS",
    "Descrição Curta": "Par com 2 discos de freio. Venda unitária somente pelo suporte da HIGH PARTS.",
    "Condição do produto": "NOVO",
    "Categoria do produto": "DISCO DE FREIO",
  };

  return headers.map((header) => quote(values[header] ?? "")).join(",");
});

fs.mkdirSync(path.dirname(outputCsv), { recursive: true });
fs.writeFileSync(outputCsv, `\uFEFF${headerLine}\r\n${rows.join("\r\n")}\r\n`, "utf8");
console.log(JSON.stringify({ outputCsv, products: folders.length, skus: folders.map((f) => f.replace(/^HF\s*/i, "HF ")) }, null, 2));
