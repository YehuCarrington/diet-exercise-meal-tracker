// Cut Plan sync API. Static files in ./public are served by the assets binding;
// this Worker only handles /api/state, one JSON document in KV, guarded by a bearer key.
const MAX_BYTES = 256 * 1024;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

async function sameKey(given, expected) {
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(given)),
    crypto.subtle.digest("SHA-256", enc.encode(expected)),
  ]);
  const x = new Uint8Array(a), y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/state") return env.ASSETS.fetch(request);

    if (!env.SYNC_KEY) return json({ error: "SYNC_KEY secret is not set" }, 500);
    const auth = request.headers.get("authorization") || "";
    const given = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!given || !(await sameKey(given, env.SYNC_KEY))) return json({ error: "unauthorized" }, 401);

    if (request.method === "GET") {
      const raw = await env.CUTPLAN.get("state");
      if (!raw) return json({ error: "empty" }, 404);
      return new Response(raw, { headers: { "content-type": "application/json", "cache-control": "no-store" } });
    }

    if (request.method === "PUT") {
      const raw = await request.text();
      if (raw.length > MAX_BYTES) return json({ error: "too large" }, 413);
      let doc;
      try { doc = JSON.parse(raw); } catch { return json({ error: "invalid json" }, 400); }
      if (!doc || typeof doc !== "object" || Array.isArray(doc) || typeof doc.updated !== "number") {
        return json({ error: "invalid document" }, 400);
      }
      // Refuse to overwrite newer data with an older copy from a device that was offline.
      const current = await env.CUTPLAN.get("state", "json");
      if (current && current.updated > doc.updated) return json({ error: "stale", updated: current.updated }, 409);
      await env.CUTPLAN.put("state", raw);
      return json({ ok: true, updated: doc.updated });
    }

    return json({ error: "method not allowed" }, 405);
  },
};
