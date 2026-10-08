import { env } from "cloudflare:workers";

export async function sendAuthEmail(to: string, subject: string, html: string) {
  const emailEnv = env as unknown as { RESEND_API_KEY?: string; AUTH_FROM_EMAIL?: string };
  if (!emailEnv.RESEND_API_KEY || !emailEnv.AUTH_FROM_EMAIL) return { configured: false, sent: false };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${emailEnv.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: emailEnv.AUTH_FROM_EMAIL, to: [to], subject, html }),
  });
  return { configured: true, sent: response.ok };
}
