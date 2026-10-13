import { finishBlingAuthorization } from "../../../../bling";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const target = new URL("/admin", url.origin);
  if (!code || !state) {
    target.searchParams.set("bling", "denied");
    return Response.redirect(target, 302);
  }
  try {
    await finishBlingAuthorization(code, state);
    target.searchParams.set("bling", "connected");
  } catch (error) {
    console.error("bling_oauth_callback_failed", error);
    target.searchParams.set("bling", "error");
  }
  return Response.redirect(target, 302);
}
