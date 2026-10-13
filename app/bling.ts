import { env } from "cloudflare:workers";

const API = "https://api.bling.com.br/Api/v3";
const TOKEN_URL = "https://www.bling.com.br/Api/v3/oauth/token";
const AUTH_URL = "https://www.bling.com.br/Api/v3/oauth/authorize";

type TokenSet = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type?: string;
  scope?: string;
};

type StoredCredential = { encryptedTokens: string; expiresAt: number };

function required(name: keyof Cloudflare.Env) {
  const value = String(env[name] || "").trim();
  if (!value) throw new Error(`Configuração ausente: ${name}`);
  return value;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function encryptionKey() {
  const material = new TextEncoder().encode(required("BLING_TOKEN_ENCRYPTION_KEY"));
  const digest = await crypto.subtle.digest("SHA-256", material);
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptTokens(tokens: TokenSet) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(),
    new TextEncoder().encode(JSON.stringify(tokens)),
  );
  return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(encrypted))}`;
}

async function decryptTokens(value: string) {
  const [iv, encrypted] = value.split(".");
  if (!iv || !encrypted) throw new Error("Credencial do Bling inválida.");
  const clear = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(iv) },
    await encryptionKey(),
    base64ToBytes(encrypted),
  );
  return JSON.parse(new TextDecoder().decode(clear)) as TokenSet;
}

async function digest(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function basicAuthorization() {
  return `Basic ${btoa(`${required("BLING_CLIENT_ID")}:${required("BLING_CLIENT_SECRET")}`)}`;
}

async function exchangeToken(body: URLSearchParams) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      authorization: basicAuthorization(),
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body,
  });
  const result = (await response.json().catch(() => ({}))) as TokenSet & { error?: string; error_description?: string };
  if (!response.ok || !result.access_token || !result.refresh_token)
    throw new Error(result.error_description || result.error || `Falha de autenticação no Bling (${response.status}).`);
  return result;
}

async function saveTokens(tokens: TokenSet) {
  const expiresAt = Date.now() + Math.max(60, Number(tokens.expires_in || 3600)) * 1000;
  const encrypted = await encryptTokens(tokens);
  await env.DB.prepare(
    `INSERT INTO integration_credentials(provider,encrypted_tokens,expires_at) VALUES('bling',?,?)
     ON CONFLICT(provider) DO UPDATE SET encrypted_tokens=excluded.encrypted_tokens,
     expires_at=excluded.expires_at,updated_at=CURRENT_TIMESTAMP`,
  ).bind(encrypted, expiresAt).run();
  return expiresAt;
}

export function blingConfigured() {
  return Boolean(env.BLING_CLIENT_ID && env.BLING_CLIENT_SECRET && env.BLING_TOKEN_ENCRYPTION_KEY);
}

export function blingEnabled() {
  return String(env.BLING_INTEGRATION_ENABLED || "").toLowerCase() === "true";
}

export async function createBlingAuthorization() {
  if (!blingConfigured()) throw new Error("As credenciais do aplicativo Bling ainda não foram configuradas.");
  const state = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const stateHash = await digest(state);
  const expiresAt = Date.now() + 10 * 60 * 1000;
  await env.DB.batch([
    env.DB.prepare("DELETE FROM integration_oauth_states WHERE provider='bling' OR expires_at<?").bind(Date.now()),
    env.DB.prepare("INSERT INTO integration_oauth_states(state_hash,provider,expires_at) VALUES(?,'bling',?)").bind(stateHash, expiresAt),
  ]);
  const url = new URL(AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", required("BLING_CLIENT_ID"));
  url.searchParams.set("state", state);
  return url.toString();
}

export async function finishBlingAuthorization(code: string, state: string) {
  const stateHash = await digest(state);
  const saved = await env.DB.prepare(
    "SELECT expires_at AS expiresAt FROM integration_oauth_states WHERE state_hash=? AND provider='bling'",
  ).bind(stateHash).first<{ expiresAt: number }>();
  await env.DB.prepare("DELETE FROM integration_oauth_states WHERE state_hash=?").bind(stateHash).run();
  if (!saved || saved.expiresAt < Date.now()) throw new Error("Autorização expirada ou inválida.");
  const tokens = await exchangeToken(new URLSearchParams({ grant_type: "authorization_code", code }));
  await saveTokens(tokens);
}

async function accessToken() {
  const stored = await env.DB.prepare(
    "SELECT encrypted_tokens AS encryptedTokens,expires_at AS expiresAt FROM integration_credentials WHERE provider='bling'",
  ).first<StoredCredential>();
  if (!stored) throw new Error("A conta Bling ainda não foi conectada.");
  let tokens = await decryptTokens(stored.encryptedTokens);
  if (stored.expiresAt <= Date.now() + 60_000) {
    tokens = await exchangeToken(new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
    }));
    await saveTokens(tokens);
  }
  return tokens.access_token;
}

export async function blingRequest<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
      authorization: `Bearer ${await accessToken()}`,
    },
  });
  if (response.status === 401 && retry) {
    await env.DB.prepare("UPDATE integration_credentials SET expires_at=0 WHERE provider='bling'").run();
    return blingRequest<T>(path, init, false);
  }
  const result = (await response.json().catch(() => ({}))) as T & { error?: { message?: string }; message?: string };
  if (!response.ok) throw new Error(result.error?.message || result.message || `Bling respondeu ${response.status}.`);
  return result;
}

export async function blingStatus() {
  const credential = await env.DB.prepare(
    "SELECT expires_at AS expiresAt,updated_at AS updatedAt FROM integration_credentials WHERE provider='bling'",
  ).first<{ expiresAt: number; updatedAt: string }>();
  const counts = await env.DB.prepare(
    `SELECT COUNT(*) AS total,
     SUM(CASE WHEN bling_product_id IS NOT NULL THEN 1 ELSE 0 END) AS linked,
     SUM(CASE WHEN inventory_source='bling' THEN 1 ELSE 0 END) AS official
     FROM products`,
  ).first<{ total: number; linked: number; official: number }>();
  return {
    configured: blingConfigured(),
    connected: Boolean(credential),
    enabled: blingEnabled(),
    credentialUpdatedAt: credential?.updatedAt || null,
    products: {
      total: Number(counts?.total || 0),
      linked: Number(counts?.linked || 0),
      official: Number(counts?.official || 0),
    },
  };
}

type BlingProduct = {
  id: number;
  codigo?: string;
  preco?: number;
  situacao?: string;
  estoque?: { saldoVirtualTotal?: number };
};

async function applyBlingProduct(product: BlingProduct) {
  const code = String(product.codigo || "").trim();
  if (!code) return false;
  const priceCents = Number.isFinite(Number(product.preco)) ? Math.max(0, Math.round(Number(product.preco) * 100)) : null;
  const hasOfficialStock = Number.isFinite(Number(product.estoque?.saldoVirtualTotal));
  const official = hasOfficialStock
    ? Math.max(0, Math.floor(Number(product.estoque?.saldoVirtualTotal)))
    : null;
  const result = await env.DB.prepare(
    `UPDATE products SET bling_product_id=?,bling_stock_quantity=COALESCE(?,bling_stock_quantity),
     inventory_source=CASE WHEN ? IS NULL THEN inventory_source ELSE 'bling' END,
     stock_quantity=CASE WHEN ? IS NULL THEN stock_quantity ELSE MAX(0,?-COALESCE((
       SELECT SUM(i.quantity) FROM order_snapshot_items i JOIN orders o ON o.id=i.order_id
       WHERE i.item_key=products.code AND o.bling_order_id IS NULL
       AND o.status IN ('awaiting_payment','payment_failed','paid')
     ),0)) END,
     price_cents=COALESCE(?,price_cents),active=CASE WHEN ?='A' THEN active ELSE 0 END,
     bling_synced_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE code=?`,
  ).bind(
    String(product.id), official, official, official, official,
    priceCents, product.situacao || "A", code,
  ).run();
  return (result.meta?.changes || 0) > 0;
}

export async function syncBlingInventory() {
  let page = 1;
  let seen = 0;
  let linked = 0;
  for (;;) {
    const response = await blingRequest<{ data?: BlingProduct[] }>(`/produtos?pagina=${page}&limite=100&criterio=2`);
    const products = response.data || [];
    for (const product of products) {
      seen++;
      if (await applyBlingProduct(product)) linked++;
    }
    if (products.length < 100) break;
    page++;
    if (page > 1000) throw new Error("A sincronização excedeu o limite de segurança.");
  }
  return { seen, linked };
}

export async function verifyBlingWebhook(rawBody: string, signature: string) {
  if (!signature.startsWith("sha256=") || !env.BLING_CLIENT_SECRET) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.BLING_CLIENT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)));
  const expected = `sha256=${[...signed].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  if (expected.length !== signature.length) return false;
  let different = 0;
  for (let index = 0; index < expected.length; index++) different |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  return different === 0;
}

export async function applyBlingStockWebhook(data: unknown) {
  const payload = data as {
    produto?: { id?: number; codigo?: string };
    saldoVirtualTotal?: number;
  };
  const productId = String(payload.produto?.id || "");
  const code = String(payload.produto?.codigo || "").trim();
  const official = Math.max(0, Math.floor(Number(payload.saldoVirtualTotal || 0)));
  if (!productId && !code) return false;
  const result = await env.DB.prepare(
    `UPDATE products SET bling_stock_quantity=?,inventory_source='bling',
     stock_quantity=MAX(0,?-COALESCE((
       SELECT SUM(i.quantity) FROM order_snapshot_items i JOIN orders o ON o.id=i.order_id
       WHERE i.item_key=products.code AND o.bling_order_id IS NULL
       AND o.status IN ('awaiting_payment','payment_failed','paid')
     ),0)),bling_synced_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
     WHERE bling_product_id=? OR (?<>'' AND code=?)`,
  ).bind(official, official, productId, code, code).run();
  return (result.meta?.changes || 0) > 0;
}

export async function applyBlingProductWebhook(data: unknown) {
  const product = data as { id?: number; codigo?: string; preco?: number; situacao?: string };
  const code = String(product.codigo || "").trim();
  if (!product.id || !code) return false;
  const priceCents = Number.isFinite(Number(product.preco)) ? Math.max(0, Math.round(Number(product.preco) * 100)) : null;
  const result = await env.DB.prepare(
    `UPDATE products SET bling_product_id=?,price_cents=COALESCE(?,price_cents),
     active=CASE WHEN ?='I' THEN 0 ELSE active END,bling_synced_at=CURRENT_TIMESTAMP,
     updated_at=CURRENT_TIMESTAMP WHERE code=?`,
  ).bind(String(product.id), priceCents, product.situacao || "A", code).run();
  return (result.meta?.changes || 0) > 0;
}

async function refreshBlingStock(productIds: string[]) {
  const ids = [...new Set(productIds.filter(Boolean))];
  for (let start = 0; start < ids.length; start += 100) {
    const params = new URLSearchParams();
    for (const id of ids.slice(start, start + 100)) params.append("idsProdutos[]", id);
    const response = await blingRequest<{ data?: Array<{
      produto?: { id?: number; codigo?: string };
      saldoVirtualTotal?: number;
    }> }>(`/estoques/saldos?${params}`);
    for (const item of response.data || []) await applyBlingStockWebhook(item);
  }
}

type OrderRow = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  postalCode: string;
  shippingAddress: string;
  totalCents: number;
  status: string;
  blingOrderId: string | null;
};

type OrderItem = {
  itemKey: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  blingProductId: string | null;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function parseAddress(value: string, postalCode: string) {
  const [first = "", cityPart = ""] = value.split(" - ", 2);
  const firstParts = first.split(",").map((part) => part.trim()).filter(Boolean);
  const cityParts = cityPart.split(",").map((part) => part.trim()).filter(Boolean);
  const cityState = cityParts.at(-1)?.split("/").map((part) => part.trim()) || [];
  return {
    endereco: firstParts[0] || value.slice(0, 100),
    numero: firstParts[1] || "S/N",
    complemento: firstParts.slice(2).join(", "),
    bairro: cityParts.length > 1 ? cityParts[0] : "",
    municipio: cityState[0] || "",
    uf: cityState[1] || "",
    cep: postalCode.replace(/\D/g, ""),
  };
}

async function getOrCreateBlingContact(order: OrderRow) {
  const email = order.customerEmail.trim().toLowerCase();
  const mapped = await env.DB.prepare(
    "SELECT bling_contact_id AS blingContactId FROM bling_contacts WHERE customer_email=?",
  ).bind(email).first<{ blingContactId: string }>();
  if (mapped) return mapped.blingContactId;
  const payload = {
    nome: order.customerName,
    codigo: `HP-${(await digest(email)).slice(0, 16)}`,
    situacao: "A",
    tipo: "F",
    indicadorIe: 9,
    email,
    emailNotaFiscal: email,
    telefone: order.customerPhone,
    endereco: { geral: parseAddress(order.shippingAddress, order.postalCode) },
  };
  const created = await blingRequest<{ data?: { id?: number } }>("/contatos", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const id = String(created.data?.id || "");
  if (!id) throw new Error("O Bling não retornou o contato criado.");
  await env.DB.prepare(
    `INSERT INTO bling_contacts(customer_email,bling_contact_id) VALUES(?,?)
     ON CONFLICT(customer_email) DO UPDATE SET bling_contact_id=excluded.bling_contact_id,updated_at=CURRENT_TIMESTAMP`,
  ).bind(email, id).run();
  return id;
}

async function findExistingBlingOrder(orderId: string) {
  const params = new URLSearchParams({ limite: "100" });
  params.append("numerosLojas[]", orderId);
  const found = await blingRequest<{ data?: Array<{ id?: number; numeroLoja?: string }> }>(`/pedidos/vendas?${params}`);
  const match = (found.data || []).find((order) => order.numeroLoja === orderId) || found.data?.[0];
  return match?.id ? String(match.id) : "";
}

export async function syncOrderToBling(orderId: string) {
  if (!blingEnabled()) return { skipped: "disabled" as const };
  const order = await env.DB.prepare(
    `SELECT id,customer_name AS customerName,customer_email AS customerEmail,
     customer_phone AS customerPhone,postal_code AS postalCode,shipping_address AS shippingAddress,
     total_cents AS totalCents,status,bling_order_id AS blingOrderId FROM orders WHERE id=?`,
  ).bind(orderId).first<OrderRow>();
  if (!order) throw new Error("Pedido não encontrado para sincronizar com o Bling.");
  if (order.blingOrderId) return { id: order.blingOrderId, duplicate: true };
  if (!["paid", "processing", "shipped", "delivered"].includes(order.status)) return { skipped: "not_paid" as const };
  try {
    await env.DB.prepare("UPDATE orders SET bling_sync_status='syncing',bling_sync_error=NULL WHERE id=?").bind(orderId).run();
    const existing = await findExistingBlingOrder(orderId);
    if (existing) {
      await env.DB.prepare(
        "UPDATE orders SET bling_order_id=?,bling_sync_status='synced',bling_synced_at=CURRENT_TIMESTAMP,bling_sync_error=NULL WHERE id=?",
      ).bind(existing, orderId).run();
      return { id: existing, recovered: true };
    }
    const itemsResult = await env.DB.prepare(
      `SELECT i.item_key AS itemKey,i.name,i.unit_price_cents AS unitPriceCents,i.quantity,
       p.bling_product_id AS blingProductId FROM order_snapshot_items i
       LEFT JOIN products p ON p.code=i.item_key WHERE i.order_id=?`,
    ).bind(orderId).all<OrderItem>();
    const items = itemsResult.results;
    if (!items.length) throw new Error("Pedido sem itens.");
    const missing = items.find((item) => !item.blingProductId);
    if (missing) throw new Error(`O SKU ${missing.itemKey} ainda não foi vinculado ao Bling.`);
    const contactId = await getOrCreateBlingContact(order);
    const paymentMethodId = Number(required("BLING_PAYMENT_METHOD_ID"));
    if (!Number.isSafeInteger(paymentMethodId) || paymentMethodId <= 0)
      throw new Error("BLING_PAYMENT_METHOD_ID inválido.");
    const date = today();
    const statusId = Number(required("BLING_PAID_ORDER_STATUS_ID"));
    if (!Number.isSafeInteger(statusId) || statusId <= 0)
      throw new Error("BLING_PAID_ORDER_STATUS_ID inválido.");
    const payload = {
      numeroLoja: order.id,
      data: date,
      dataSaida: date,
      dataPrevista: date,
      contato: { id: Number(contactId) },
      situacao: { id: statusId },
      itens: items.map((item) => ({
        codigo: item.itemKey,
        unidade: "UN",
        quantidade: item.quantity,
        valor: item.unitPriceCents / 100,
        descricao: item.name,
        produto: { id: Number(item.blingProductId) },
      })),
      parcelas: [{
        dataVencimento: date,
        valor: order.totalCents / 100,
        observacoes: `Mercado Pago · pedido ${order.id}`,
        formaPagamento: { id: paymentMethodId },
      }],
      observacoesInternas: `Pedido pago no site HighParts. Referência: ${order.id}`,
    };
    const created = await blingRequest<{ data?: { id?: number } }>("/pedidos/vendas", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const blingOrderId = String(created.data?.id || "");
    if (!blingOrderId) throw new Error("O Bling não retornou o pedido criado.");
    await env.DB.prepare(
      "UPDATE orders SET bling_order_id=?,bling_sync_status='synced',bling_synced_at=CURRENT_TIMESTAMP,bling_sync_error=NULL WHERE id=?",
    ).bind(blingOrderId, orderId).run();
    await refreshBlingStock(items.map((item) => String(item.blingProductId || "")));
    return { id: blingOrderId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida.";
    await env.DB.prepare(
      "UPDATE orders SET bling_sync_status='failed',bling_sync_error=? WHERE id=?",
    ).bind(message.slice(0, 500), orderId).run();
    throw error;
  }
}

export async function cancelBlingOrder(blingOrderId: string) {
  if (!blingEnabled() || !blingOrderId) return;
  const params = new URLSearchParams();
  params.append("idsPedidosVendas[]", blingOrderId);
  await blingRequest(`/pedidos/vendas?${params}`, { method: "DELETE" });
}

export async function syncPendingBlingOrders(limit = 20) {
  if (!blingEnabled()) throw new Error("A integração automática ainda não está ativada.");
  const rows = await env.DB.prepare(
    `SELECT id FROM orders WHERE status IN ('paid','processing','shipped','delivered')
     AND bling_order_id IS NULL ORDER BY datetime(created_at) LIMIT ?`,
  ).bind(Math.max(1, Math.min(limit, 100))).all<{ id: string }>();
  const results: Array<{ orderId: string; ok: boolean; error?: string }> = [];
  for (const row of rows.results) {
    try {
      await syncOrderToBling(row.id);
      results.push({ orderId: row.id, ok: true });
    } catch (error) {
      results.push({ orderId: row.id, ok: false, error: error instanceof Error ? error.message : "Falha desconhecida." });
    }
  }
  return results;
}
