import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/worker.js";

const kv = new Map();
const env = {
  SESSION_SECRET: "s3", GOOGLE_CLIENT_ID: "cid", GOOGLE_CLIENT_SECRET: "sec", SYNC_KEY: "legacy",
  ASSETS: { fetch: () => new Response("asset") },
  CUTPLAN: {
    get: async (k, t) => { const v = kv.get(k); return v == null ? null : t === "json" ? JSON.parse(v) : v; },
    put: async (k, v) => { kv.set(k, v); },
    delete: async (k) => { kv.delete(k); },
  },
};
const idToken = "x." + Buffer.from(JSON.stringify({ iss: "https://accounts.google.com", aud: "cid", sub: "123", email: "a@b.c", email_verified: true })).toString("base64url") + ".y";
const recipePage = '<html><script type="application/ld+json">{"@graph":[{"@type":"WebPage"},{"@type":["Recipe"],"name":"Stew &amp; rice","recipeIngredient":["1 lb chicken","2 cups <b>rice</b>"],"recipeYield":["4 servings"],"nutrition":{"calories":"412 kcal","proteinContent":"31 g"}}]}</script></html>';
globalThis.fetch = async (u) => {
  u = String(u);
  if (u.includes("oauth2.googleapis.com/token")) return new Response(JSON.stringify({ id_token: idToken }));
  if (u.includes("recipes.example.com/stew")) return new Response(recipePage);
  if (u.includes("recipes.example.com/plain")) return new Response("<html>no data</html>");
  return new Response("", { status: 404 });
};
const call = (path, init = {}) => worker.fetch(new Request("https://habitapp.yehu.dev" + path, init), env);

async function signIn() {
  const start = await call("/api/auth/google");
  const state = start.headers.get("set-cookie").match(/cp_state=([^;]+)/)[1];
  const back = await call("/api/auth/callback?code=abc&state=" + encodeURIComponent(state), { headers: { cookie: "cp_state=" + state } });
  const session = back.headers.getSetCookie().find((c) => c.startsWith("cp_session")).match(/cp_session=([^;]+)/)[1];
  return { start, back, headers: { cookie: "cp_session=" + session }, session };
}

test("anonymous visitors get no data", async () => {
  assert.deepEqual(await (await call("/api/me")).json(), { configured: true, email: null });
  assert.equal((await call("/api/state")).status, 401);
  assert.equal((await call("/api/import?url=" + encodeURIComponent("https://recipes.example.com/stew"))).status, 401);
});

test("Google sign-in sets a session and rejects a forged state", async () => {
  const { start, back, headers } = await signIn();
  assert.equal(start.status, 302);
  assert.match(start.headers.get("location"), /^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth\?/);
  assert.equal(back.headers.get("location"), "/#more");
  assert.equal((await (await call("/api/me", { headers })).json()).email, "a@b.c");
  const bad = await call("/api/auth/callback?code=abc&state=wrong", { headers: { cookie: "cp_state=right" } });
  assert.match(bad.headers.get("location"), /signin=cancelled/);
});

test("a tampered session is refused", async () => {
  const { session } = await signIn();
  assert.equal((await call("/api/state", { headers: { cookie: "cp_session=" + session.slice(0, -2) + "xx" } })).status, 401);
});

test("each account has its own document; stale writes are refused; delete removes it", async () => {
  const { headers } = await signIn();
  assert.equal((await call("/api/state", { headers })).status, 404);
  assert.equal((await call("/api/state", { method: "PUT", headers, body: JSON.stringify({ updated: 5, a: 1 }) })).status, 200);
  assert.equal((await call("/api/state", { method: "PUT", headers, body: JSON.stringify({ updated: 3 }) })).status, 409);
  assert.equal((await call("/api/state", { method: "PUT", headers, body: "[1]" })).status, 400);
  assert.equal((await call("/api/state", { method: "PUT", headers: { authorization: "Bearer legacy" }, body: JSON.stringify({ updated: 9 }) })).status, 200);
  assert.deepEqual([...kv.keys()].sort(), ["state", "u:g:123"]);
  assert.equal((await call("/api/state", { method: "DELETE", headers })).status, 200);
  assert.equal((await call("/api/state", { headers })).status, 404);
  assert.ok(kv.has("state"), "deleting one account leaves others alone");
});

test("recipe import reads schema.org data and refuses unsafe addresses", async () => {
  const { headers } = await signIn();
  const ok = await (await call("/api/import?url=" + encodeURIComponent("https://recipes.example.com/stew"), { headers })).json();
  assert.deepEqual(ok, { name: "Stew & rice", ingredients: ["1 lb chicken", "2 cups rice"], kcal: 412, protein: 31, servings: "4 servings", url: "https://recipes.example.com/stew" });
  assert.equal((await call("/api/import?url=" + encodeURIComponent("https://recipes.example.com/plain"), { headers })).status, 422);
  for (const bad of ["https://127.0.0.1/x", "http://recipes.example.com/stew", "https://localhost/x", "https://habitapp.yehu.dev/"]) {
    assert.equal((await call("/api/import?url=" + encodeURIComponent(bad), { headers })).status, 400, bad);
  }
});

test("everything outside /api is served as a static file", async () => {
  assert.equal(await (await call("/index.html")).text(), "asset");
});
