import { validateContact, type ContactInput } from "@/lib/contact";

/**
 * Contact form endpoint: validates, rate-limits, and (once connected) sends.
 * It never reports success it hasn't earned: with no provider configured it
 * answers 503 and the form points people to the email address instead.
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 3;
/** Ceiling across all senders: forwarded-for headers can be forged, so per-sender limits alone are not enough. */
const MAX_GLOBAL = 60;
// Best effort: per server instance. A shared store (KV, Redis) would make it global.
const hits = new Map<string, number[]>();
let global: number[] = [];

function limited(key: string, now = Date.now()) {
  global = global.filter((t) => now - t < WINDOW_MS);
  if (global.length >= MAX_GLOBAL) return true;
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  global.push(now);
  hits.set(key, recent);
  // Forget only expired senders, never the whole table.
  if (hits.size > 5000) for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  return false;
}

// TODO: connect email provider (Resend, Postmark, SES…). Return true only when the provider accepted the message.
async function sendEmail(_message: ContactInput): Promise<boolean> {
  return false;
}

const providerConfigured = () => Boolean(process.env.CONTACT_PROVIDER_KEY);

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  if (limited(ip)) return Response.json({ ok: false, error: "rate-limited" }, { status: 429, headers: { "Retry-After": "600" } });

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object") throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "bad-request" }, { status: 400 });
  }

  // Honeypot: real people never see this field.
  if (typeof body.website === "string" && body.website.length > 0) return Response.json({ ok: false, error: "bad-request" }, { status: 400 });

  const { value, errors } = validateContact(body);
  if (!value) return Response.json({ ok: false, error: "invalid", errors }, { status: 422 });

  if (!providerConfigured()) return Response.json({ ok: false, error: "not-configured" }, { status: 503 });

  const sent = await sendEmail(value);
  return sent ? Response.json({ ok: true }) : Response.json({ ok: false, error: "send-failed" }, { status: 502 });
}
