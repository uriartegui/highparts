import { env } from "cloudflare:workers";

type MercadoPagoEnv = {
  MERCADO_PAGO_ENV?: string;
  MERCADO_PAGO_ACCESS_TOKEN_TEST?: string;
  MERCADO_PAGO_ACCESS_TOKEN?: string;
  MERCADO_PAGO_WEBHOOK_SECRET?: string;
};

export type MercadoPagoMode = "production" | "test";

// Live storefront hostnames. Test (sandbox) checkout is never offered here, so
// real customers cannot be sent to a sandbox and "pay" with test cards.
const PRODUCTION_HOSTS = new Set(["highparts.com.br", "www.highparts.com.br"]);

export type CheckoutItem = { code: string; name: string; quantity: number; unitPriceCents: number };
type PreferenceResponse = { id?: string; init_point?: string; sandbox_init_point?: string; message?: string };
type PaymentResponse = { id?: number; status?: string; external_reference?: string; transaction_amount?: number; currency_id?: string; live_mode?: boolean };

function paymentEnv() {
  return env as unknown as MercadoPagoEnv;
}

// Mode is explicit: only MERCADO_PAGO_ENV=production uses live credentials.
// Anything else is test mode, which uses only the TEST token. Tokens are never
// mixed, so a test token can't silently serve production or vice versa.
export function mercadoPagoMode(): MercadoPagoMode {
  return paymentEnv().MERCADO_PAGO_ENV === "production" ? "production" : "test";
}

function accessToken() {
  const current = paymentEnv();
  return mercadoPagoMode() === "production"
    ? current.MERCADO_PAGO_ACCESS_TOKEN
    : current.MERCADO_PAGO_ACCESS_TOKEN_TEST;
}

export function mercadoPagoConfigured(request: Request) {
  if (!accessToken()) return false;
  if (mercadoPagoMode() === "test" && PRODUCTION_HOSTS.has(new URL(request.url).hostname)) return false;
  return true;
}

function publicOrigin(request: Request) {
  const url = new URL(request.url);
  return ["localhost", "127.0.0.1"].includes(url.hostname) ? "https://highparts.com.br" : url.origin;
}

export async function createMercadoPagoPreference(input: {
  request: Request;
  orderId: string;
  payer: { name: string; email: string };
  items: CheckoutItem[];
}) {
  const token = accessToken();
  if (!token || !mercadoPagoConfigured(input.request)) throw new Error("MERCADO_PAGO_NOT_CONFIGURED");
  const mode = mercadoPagoMode();
  const origin = publicOrigin(input.request);
  const returnUrl = origin + "/pagamento/retorno?pedido=" + encodeURIComponent(input.orderId);
  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      authorization: "Bearer " + token,
      "content-type": "application/json",
      "x-idempotency-key": "highparts-" + input.orderId,
    },
    body: JSON.stringify({
      items: input.items.map((item) => ({
        id: item.code,
        title: item.name.slice(0, 250),
        currency_id: "BRL",
        quantity: item.quantity,
        unit_price: item.unitPriceCents / 100,
      })),
      payer: { name: input.payer.name, email: input.payer.email },
      external_reference: input.orderId,
      statement_descriptor: "HIGHPARTS",
      back_urls: {
        success: returnUrl + "&resultado=sucesso",
        pending: returnUrl + "&resultado=pendente",
        failure: returnUrl + "&resultado=falha",
      },
      auto_return: "approved",
      notification_url: origin + "/api/payments/mercado-pago/webhook",
    }),
  });
  const body = (await response.json().catch(() => ({}))) as PreferenceResponse;
  const checkoutUrl = mode === "production" ? body.init_point : body.sandbox_init_point;
  if (!response.ok || !body.id || !checkoutUrl) {
    console.error("mercado_pago_preference_failed", response.status, body.message);
    throw new Error("MERCADO_PAGO_PREFERENCE_FAILED");
  }
  return { id: body.id, checkoutUrl, mode };
}

export async function getMercadoPagoPayment(id: string) {
  const token = accessToken();
  if (!token) throw new Error("MERCADO_PAGO_NOT_CONFIGURED");
  const response = await fetch("https://api.mercadopago.com/v1/payments/" + encodeURIComponent(id), {
    headers: { authorization: "Bearer " + token },
  });
  if (!response.ok) throw new Error("MERCADO_PAGO_PAYMENT_LOOKUP_FAILED");
  return (await response.json()) as PaymentResponse;
}

function parseSignature(header: string) {
  return Object.fromEntries(header.split(",").map((part) => {
    const separator = part.indexOf("=");
    return [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
  }));
}

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++)
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export async function verifyMercadoPagoWebhook(request: Request, dataId: string) {
  const secret = paymentEnv().MERCADO_PAGO_WEBHOOK_SECRET;
  const signature = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  if (!secret || !signature || !requestId || !dataId) return false;
  const { ts, v1 } = parseSignature(signature);
  if (!ts || !v1 || !/^[a-f0-9]{64}$/i.test(v1)) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const manifest = "id:" + dataId + ";request-id:" + requestId + ";ts:" + ts + ";";
  const expected = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest)));
  return constantTimeEqual(expected, v1.toLowerCase());
}
