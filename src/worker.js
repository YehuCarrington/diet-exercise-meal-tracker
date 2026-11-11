// Plateful API. Static files in ./public are served by the assets binding; this Worker handles /api/*.
//
//   /api/auth/google     start Google sign-in
//   /api/auth/callback   Google returns here; sets a signed session cookie
//   /api/me              who is signed in, and whether sign-in is configured
//   /api/logout          clear the session
//   /api/state           one JSON document per person in KV (GET, PUT, DELETE)
//   /api/import?url=     read the schema.org Recipe data from a recipe page
//
// Secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SESSION_SECRET. Optional legacy SYNC_KEY (bearer key, single shared document).
const MAX_BYTES = 256 * 1024;
const SESSION_DAYS = 180;
const enc = new TextEncoder();

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  });
}
function b64u(buf) {
  let s = "";
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64uText(str) {
  const pad = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  return new TextDecoder().decode(Uint8Array.from(atob(pad), (c) => c.charCodeAt(0)));
}
async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64u(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}
async function sameText(a, b) {
  const [x, y] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(a)), crypto.subtle.digest("SHA-256", enc.encode(b))]);
  const p = new Uint8Array(x), q = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < p.length; i++) diff |= p[i] ^ q[i];
  return diff === 0;
}
function cookies(request) {
  const out = {};
  for (const part of (request.headers.get("cookie") || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}
function setCookie(name, value, maxAge) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
async function makeSession(env, user) {
  const body = b64u(enc.encode(JSON.stringify({ ...user, exp: Date.now() + SESSION_DAYS * 864e5 })));
  return body + "." + (await hmac(env.SESSION_SECRET, body));
}
async function readSession(env, request) {
  if (!env.SESSION_SECRET) return null;
  const raw = cookies(request).cp_session;
  if (!raw || raw.indexOf(".") < 0) return null;
  const [body, sig] = raw.split(".");
  if (!(await sameText(sig, await hmac(env.SESSION_SECRET, body)))) return null;
  try {
    const s = JSON.parse(b64uText(body));
    return s.exp > Date.now() && s.sub ? s : null;
  } catch {
    return null;
  }
}
const googleReady = (env) => !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.SESSION_SECRET);

// Which KV key does this request read and write? null means not authorised.
async function storageKey(env, request) {
  const session = await readSession(env, request);
  if (session) return "u:" + session.sub;
  const auth = request.headers.get("authorization") || "";
  const given = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (given && env.SYNC_KEY && (await sameText(given, env.SYNC_KEY))) return "state";
  return null;
}

async function authStart(env, url) {
  if (!googleReady(env)) return json({ error: "sign-in is not configured" }, 501);
  const state = b64u(crypto.getRandomValues(new Uint8Array(16)));
  const q = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: url.origin + "/api/auth/callback",
    response_type: "code",
    scope: "openid email",
    state,
    prompt: "select_account",
  });
  return new Response(null, {
    status: 302,
    headers: { location: "https://accounts.google.com/o/oauth2/v2/auth?" + q, "set-cookie": setCookie("cp_state", state, 600), "cache-control": "no-store" },
  });
}

async function authCallback(env, request, url) {
  if (!googleReady(env)) return json({ error: "sign-in is not configured" }, 501);
  const fail = (why) => new Response(null, { status: 302, headers: { location: "/?signin=" + why + "#more", "cache-control": "no-store" } });
  const code = url.searchParams.get("code"), state = url.searchParams.get("state");
  if (!code || !state || state !== cookies(request).cp_state) return fail("cancelled");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: url.origin + "/api/auth/callback",
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) return fail("failed");
  let claims;
  try {
    // The ID token comes straight from Google's token endpoint over TLS, so its claims can be read without checking the signature.
    claims = JSON.parse(b64uText((await res.json()).id_token.split(".")[1]));
  } catch {
    return fail("failed");
  }
  const issOk = claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com";
  if (!issOk || claims.aud !== env.GOOGLE_CLIENT_ID || !claims.sub || claims.email_verified === false) return fail("failed");
  const headers = new Headers({ location: "/#more", "cache-control": "no-store" });
  headers.append("set-cookie", setCookie("cp_session", await makeSession(env, { sub: "g:" + claims.sub, email: claims.email || "" }), SESSION_DAYS * 86400));
  headers.append("set-cookie", setCookie("cp_state", "", 0));
  return new Response(null, { status: 302, headers });
}

async function stateApi(env, request) {
  const key = await storageKey(env, request);
  if (!key) return json({ error: "unauthorized" }, 401);
  if (request.method === "GET") {
    const raw = await env.CUTPLAN.get(key);
    if (!raw) return json({ error: "empty" }, 404);
    return new Response(raw, { headers: { "content-type": "application/json", "cache-control": "no-store" } });
  }
  if (request.method === "PUT") {
    const raw = await request.text();
    if (raw.length > MAX_BYTES) return json({ error: "too large" }, 413);
    let doc;
    try { doc = JSON.parse(raw); } catch { return json({ error: "invalid json" }, 400); }
    if (!doc || typeof doc !== "object" || Array.isArray(doc) || typeof doc.updated !== "number") return json({ error: "invalid document" }, 400);
    // Refuse to overwrite newer data with an older copy from a device that was offline.
    const current = await env.CUTPLAN.get(key, "json");
    if (current && current.updated > doc.updated) return json({ error: "stale", updated: current.updated }, 409);
    await env.CUTPLAN.put(key, raw);
    return json({ ok: true, updated: doc.updated });
  }
  if (request.method === "DELETE") {
    await env.CUTPLAN.delete(key);
    return json({ ok: true });
  }
  return json({ error: "method not allowed" }, 405);
}

// Pull the schema.org Recipe block that most recipe sites embed for search engines.
function findRecipe(node) {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const n of node) { const r = findRecipe(n); if (r) return r; }
    return null;
  }
  const t = node["@type"];
  if (t === "Recipe" || (Array.isArray(t) && t.includes("Recipe"))) return node;
  return findRecipe(node["@graph"]);
}
const num = (v) => { const m = String(v ?? "").match(/[\d.]+/); return m ? Math.round(parseFloat(m[0])) : null; };
const clean = (v) => String(v ?? "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, " ").trim().slice(0, 200);

async function importApi(env, request, url) {
  if (!(await storageKey(env, request))) return json({ error: "unauthorized" }, 401);
  let target;
  try { target = new URL(url.searchParams.get("url") || ""); } catch { return json({ error: "bad url" }, 400); }
  const host = target.hostname;
  if (target.protocol !== "https:" || !host.includes(".") || /^[\d.]+$/.test(host) || host.includes(":") || host.endsWith(".local") || host === url.hostname) {
    return json({ error: "bad url" }, 400);
  }
  let html;
  try {
    const res = await fetch(target.toString(), { headers: { "user-agent": "Mozilla/5.0 (compatible; PlatefulRecipeImport/1.0)", accept: "text/html" }, redirect: "follow" });
    if (!res.ok) return json({ error: "fetch failed", status: res.status }, 502);
    html = (await res.text()).slice(0, 3_000_000);
  } catch {
    return json({ error: "fetch failed" }, 502);
  }
  let recipe = null;
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { recipe = findRecipe(JSON.parse(m[1].trim())); } catch { /* skip malformed block */ }
    if (recipe) break;
  }
  if (!recipe) return json({ error: "no recipe data" }, 422);
  const n = recipe.nutrition || {};
  const yieldVal = Array.isArray(recipe.recipeYield) ? recipe.recipeYield[0] : recipe.recipeYield;
  return json({
    name: clean(recipe.name),
    ingredients: (Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : []).slice(0, 40).map(clean).filter(Boolean),
    kcal: num(n.calories),
    protein: num(n.proteinContent),
    servings: clean(yieldVal),
    url: target.toString(),
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;
    if (!p.startsWith("/api/")) return env.ASSETS.fetch(request);
    if (p === "/api/auth/google") return authStart(env, url);
    if (p === "/api/auth/callback") return authCallback(env, request, url);
    if (p === "/api/me") {
      const s = await readSession(env, request);
      return json({ configured: googleReady(env), email: s ? s.email || "Google account" : null });
    }
    if (p === "/api/logout") return json({ ok: true }, 200, { "set-cookie": setCookie("cp_session", "", 0) });
    if (p === "/api/state") return stateApi(env, request);
    if (p === "/api/import" && request.method === "GET") return importApi(env, request, url);
    return json({ error: "not found" }, 404);
  },
};
