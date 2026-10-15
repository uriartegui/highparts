import { env } from "cloudflare:workers";
import { COMPANY } from "./company";

// Freight quotes through Melhor Envio (https://docs.melhorenvio.com.br).
// The token is a server-side secret; quotes are always recomputed on the
// server when an order is created, so the client can never set its own price.

type ShippingEnv = { MELHOR_ENVIO_TOKEN?: string; MELHOR_ENVIO_ENV?: string; MELHOR_ENVIO_API_URL?: string };

// Business days added to the carrier's estimate for picking and packing.
export const HANDLING_DAYS = 1;

export type ShippingItem = { code: string; quantity: number };
export type ShippingOption = {
  id: string;
  carrier: string;
  service: string;
  priceCents: number;
  deliveryDays: number;
  logo: string | null;
};

export class ShippingError extends Error {
  constructor(public code: "NOT_CONFIGURED" | "INVALID_POSTAL_CODE" | "MISSING_DATA" | "UNAVAILABLE" | "NO_OPTIONS", message: string, public products: string[] = []) {
    super(message);
  }
}

function shippingEnv() {
  return env as unknown as ShippingEnv;
}

export function shippingConfigured() {
  return Boolean(shippingEnv().MELHOR_ENVIO_TOKEN);
}

function apiBase() {
  // MELHOR_ENVIO_API_URL is only for local end-to-end tests against a mock.
  const override = shippingEnv().MELHOR_ENVIO_API_URL;
  if (override) return override.replace(/\/$/, "");
  return shippingEnv().MELHOR_ENVIO_ENV === "sandbox" ? "https://sandbox.melhorenvio.com.br" : "https://melhorenvio.com.br";
}

export function normalizePostalCode(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length === 8 ? digits : "";
}

type ProductShippingRow = {
  code: string;
  priceCents: number | null;
  weightGrams: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
};

type MelhorEnvioService = {
  id?: number;
  name?: string;
  price?: string | number;
  custom_price?: string | number;
  delivery_time?: number;
  custom_delivery_time?: number;
  error?: string;
  company?: { name?: string; picture?: string };
};

async function cacheKey(payload: unknown) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(payload)));
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return new Request(`https://shipping-cache.highparts.internal/${hex}`);
}

export async function quoteShipping(postalCodeInput: unknown, requested: ShippingItem[]): Promise<ShippingOption[]> {
  const token = shippingEnv().MELHOR_ENVIO_TOKEN;
  if (!token) throw new ShippingError("NOT_CONFIGURED", "O cálculo de frete ainda não foi configurado.");
  const postalCode = normalizePostalCode(postalCodeInput);
  if (!postalCode) throw new ShippingError("INVALID_POSTAL_CODE", "Informe um CEP válido com 8 dígitos.");

  const quantities = new Map<string, number>();
  for (const item of requested) {
    const code = String(item.code ?? "").trim();
    const quantity = Math.floor(Number(item.quantity));
    if (code && quantity > 0 && quantity <= 99) quantities.set(code, (quantities.get(code) ?? 0) + quantity);
  }
  const codes = [...quantities.keys()].slice(0, 100);
  if (!codes.length) throw new ShippingError("NO_OPTIONS", "O carrinho está vazio.");

  const rows = await env.DB.prepare(
    `SELECT code,price_cents AS priceCents,weight_grams AS weightGrams,length_cm AS lengthCm,
     width_cm AS widthCm,height_cm AS heightCm FROM products WHERE active=1 AND code IN (${codes.map(() => "?").join(",")})`,
  ).bind(...codes).all<ProductShippingRow>();
  const byCode = new Map(rows.results.map((row) => [row.code, row]));
  const missing = codes.filter((code) => {
    const row = byCode.get(code);
    return !row || !(row.weightGrams! > 0 && row.lengthCm! > 0 && row.widthCm! > 0 && row.heightCm! > 0);
  });
  if (missing.length)
    throw new ShippingError("MISSING_DATA", "Não conseguimos calcular o frete para todos os itens. Fale com o nosso atendimento.", missing);

  const origin = normalizePostalCode(COMPANY.address.postalCode);
  const payload = {
    from: { postal_code: origin },
    to: { postal_code: postalCode },
    products: codes.map((code) => {
      const row = byCode.get(code)!;
      return {
        id: code,
        width: row.widthCm,
        height: row.heightCm,
        length: row.lengthCm,
        weight: Number(row.weightGrams) / 1000,
        insurance_value: (row.priceCents ?? 0) / 100,
        quantity: quantities.get(code),
      };
    }),
    options: { receipt: false, own_hand: false },
  };

  // Identical quotes (same CEP, items, dimensions and prices) are cached briefly
  // to keep checkout fast and stay well within the provider's rate limits.
  const key = await cacheKey({ base: apiBase(), payload });
  const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
  const cached = await cache?.match(key).catch(() => undefined);
  if (cached) return (await cached.json()) as ShippingOption[];

  let services: MelhorEnvioService[];
  try {
    const response = await fetch(`${apiBase()}/api/v2/me/shipment/calculate`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        "user-agent": `HighParts (${COMPANY.supportEmail})`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      console.error("melhor_envio_quote_failed", response.status, (await response.text().catch(() => "")).slice(0, 300));
      throw new Error("quote_failed");
    }
    services = (await response.json()) as MelhorEnvioService[];
  } catch {
    throw new ShippingError("UNAVAILABLE", "O cálculo de frete está indisponível agora. Tente novamente em instantes.");
  }

  const options = (Array.isArray(services) ? services : [])
    .filter((service) => !service.error && service.id != null && Number(service.custom_price ?? service.price) > 0)
    .map((service) => ({
      id: String(service.id),
      carrier: String(service.company?.name || "Transportadora"),
      service: String(service.name || "Entrega"),
      priceCents: Math.round(Number(service.custom_price ?? service.price) * 100),
      deliveryDays: Math.max(1, Number(service.custom_delivery_time ?? service.delivery_time) || 0) + HANDLING_DAYS,
      logo: service.company?.picture || null,
    }))
    .sort((a, b) => a.priceCents - b.priceCents || a.deliveryDays - b.deliveryDays);
  if (!options.length) throw new ShippingError("NO_OPTIONS", "Nenhuma transportadora atende este CEP para estes itens.");

  await cache?.put(key, new Response(JSON.stringify(options), { headers: { "cache-control": "max-age=900", "content-type": "application/json" } })).catch(() => {});
  return options;
}
