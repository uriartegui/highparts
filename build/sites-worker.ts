import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

// Baseline hardening applied to every response. The CSP deliberately leaves
// script-src open (hydration uses inline scripts, Turnstile loads remotely) and
// focuses on clickjacking, base-tag hijacking, plugins and form exfiltration.
const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
};

function withSecurityHeaders(response: Response) {
  if (response.status === 101) return response;
  const secured = new Response(response.body, response);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!secured.headers.has(name)) secured.headers.set(name, value);
  }
  if (!import.meta.env.DEV) secured.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return secured;
}

// CSRF guard for every state-changing API call, including routes added later.
// Browsers always send Origin (and Sec-Fetch-Site) on cross-origin writes, so
// a mismatch means another site is driving the user's session. Requests with
// no Origin (curl, server-to-server) can't ride on browser cookies and pass;
// the only exemption is the exact Mercado Pago webhook path, which is called
// server-to-server and authenticates with its HMAC signature.
const CSRF_EXEMPT_PATHS = new Set(["/api/payments/mercado-pago/webhook"]);

function isCrossSiteWrite(request: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return false;
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/") || CSRF_EXEMPT_PATHS.has(url.pathname)) return false;
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) return true;
  return request.headers.get("sec-fetch-site") === "cross-site";
}

export default {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    // Canonical host: www.highparts.com.br permanently redirects to the apex.
    const incoming = new URL(request.url);
    if (incoming.hostname === "www.highparts.com.br") {
      incoming.hostname = "highparts.com.br";
      incoming.protocol = "https:";
      return withSecurityHeaders(Response.redirect(incoming.toString(), 301));
    }
    if (isCrossSiteWrite(request)) {
      return withSecurityHeaders(Response.json({ error: "Origem da solicitação não permitida." }, { status: 403 }));
    }
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    return Promise.resolve(runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx))).then(withSecurityHeaders);
  },
};
