declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    RESEND_API_KEY?: string;
    AUTH_FROM_EMAIL?: string;
    TURNSTILE_SITE_KEY?: string;
    TURNSTILE_SECRET_KEY?: string;
    VEHICLE_API_TOKEN?: string;
    MELHOR_ENVIO_TOKEN?: string;
    MELHOR_ENVIO_ENV?: string;
    BLING_CLIENT_ID?: string;
    BLING_CLIENT_SECRET?: string;
    BLING_TOKEN_ENCRYPTION_KEY?: string;
    BLING_PAYMENT_METHOD_ID?: string;
    BLING_PAID_ORDER_STATUS_ID?: string;
    BLING_INTEGRATION_ENABLED?: string;
  }
}
