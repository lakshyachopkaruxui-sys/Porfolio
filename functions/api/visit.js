const site = "https://lakshyachopkar.com";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const cookieName = "__Host-lakshya_visit";
const schema = "CREATE TABLE IF NOT EXISTS visits (number INTEGER PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE)";

function reply(status, value, extra = {}) {
  return Response.json(value, {status, headers: {"Cache-Control": "private, no-store", ...extra}});
}

function existingCookie(request) {
  for (const field of (request.headers.get("Cookie") || "").split(";")) {
    const [name, value] = field.trim().split("=");
    if (name === cookieName && uuid.test(value || "")) return value;
  }
  return null;
}

async function ordinal(db, hash) {
  const insert = db.prepare("INSERT OR IGNORE INTO visits(token_hash) VALUES (?)").bind(hash);
  const lookup = db.prepare("SELECT number FROM visits WHERE token_hash = ?").bind(hash);
  // D1 runs batch statements in a single transaction. Parallel requests for
  // the same key get the same number; a retry cannot allocate a second visit.
  const results = await db.batch([insert, lookup]);
  const number = results[1]?.results?.[0]?.number;
  if (!Number.isSafeInteger(number) || number <= 0) throw new Error("Invalid visit ordinal");
  return number;
}

export async function onRequest({request, env}) {
  if (request.method !== "POST") return reply(405, {error: "Use POST"}, {Allow:"POST"});
  if (new URL(request.url).origin !== site || request.headers.get("Origin") !== site ||
      request.headers.get("Sec-Fetch-Site") === "cross-site") return reply(403, {error:"Origin unavailable"});
  const cfBot = request.cf?.botManagement;
  if (cfBot?.verifiedBot || /bot\b|crawler|spider|facebookexternalhit|lighthouse/i.test(request.headers.get("User-Agent") || "")) {
    return new Response(null, {status:204, headers:{"Cache-Control":"no-store"}});
  }
  if (!env.VISIT_DB) return reply(503, {error:"Guestbook unavailable"});
  const key = request.headers.get("X-Visit-Key");
  const token = existingCookie(request) || (uuid.test(key || "") ? key : crypto.randomUUID());
  try {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    const hash = [...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,"0")).join("");
    let number;
    try {
      number = await ordinal(env.VISIT_DB, hash);
    } catch (error) {
      if (!/no such table: (?:main\.)?visits/i.test(String(error))) throw error;
      await env.VISIT_DB.prepare(schema).run();
      number = await ordinal(env.VISIT_DB, hash);
    }
    return reply(200, {number}, {"Set-Cookie": cookieName+"="+token+"; Secure; HttpOnly; SameSite=Lax; Path=/"});
  } catch {
    return reply(503, {error:"Guestbook unavailable"});
  }
}
