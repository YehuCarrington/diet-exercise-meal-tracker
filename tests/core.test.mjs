import test from "node:test";
import assert from "node:assert/strict";
import { load, week, seed, today } from "./helpers.mjs";

const plain = (v) => JSON.parse(JSON.stringify(v));

test("targets: a losing man gets about 500 kcal under what he burns", () => {
  const c = load();
  const T = c.targets();
  assert.equal(c.mode(), "lose");
  assert.ok(T.tdee > 2600 && T.tdee < 2720, `tdee ${T.tdee}`);
  assert.ok(Math.abs(T.tdee - 500 - T.target) <= 10);
  assert.equal(T.protein, 140);
});

test("targets: a gaining woman gets a 300 kcal surplus, and holding gets none", () => {
  const c = load({ sex: "f", start: 118, goal: 135, height: 65, age: 23 });
  assert.equal(c.mode(), "gain");
  const T = c.targets();
  assert.ok(Math.abs(T.tdee + 300 - T.target) <= 10, `${T.tdee} -> ${T.target}`);
  c.S.settings.goal = 118;
  assert.equal(c.mode(), "hold");
  assert.ok(Math.abs(c.targets().tdee - c.targets().target) <= 10);
});

test("targets never go below the calorie floor", () => {
  const c = load({ sex: "f", start: 110, goal: 100, height: 60, age: 60, act: 1.3 });
  assert.equal(c.targets().target, 1400);
});

for (const [name, s] of [
  ["207 lb man losing", {}],
  ["140 lb woman losing", { sex: "f", start: 140, goal: 125, height: 62, age: 50, act: 1.3 }],
  ["118 lb woman gaining", { sex: "f", start: 118, goal: 135, height: 65, age: 23 }],
  ["150 lb man gaining", { start: 150, goal: 175, height: 71, age: 25 }],
]) {
  test(`day plans land near the target: ${name}`, () => {
    const c = load(s);
    for (const P of week(c)) {
      if (P.meals.some((m) => m.meal.free)) continue; // Saturday's free meal is a fixed estimate
      const off = Math.abs(P.kcal - P.target) / P.target;
      assert.ok(off < 0.12, `${P.key}: ${P.kcal} vs ${P.target}`);
      assert.ok(P.prot >= P.T.protein, `${P.key}: protein ${P.prot} under floor ${P.T.protein}`);
      assert.equal(P.meals.length, 4);
    }
  });
}

test("vegetarian weeks contain no meat or fish and still vary", () => {
  const c = load({ noMeat: true });
  const names = new Set();
  for (const P of week(c)) for (const m of P.meals) {
    if (m.meal.free) continue;
    assert.ok(!m.meal.meat && m.meal.x !== "fish", `${m.meal.n} is not vegetarian`);
    for (const it of m.items) assert.ok(!/chicken|tuna|sardine|saltfish|carite|kingfish/i.test(it.x), it.x);
    if (m.slot.id === "d") names.add(m.meal.n);
  }
  assert.ok(names.size >= 3, "dinners should rotate through at least three plates");
  for (const P of week(c)) if (!P.meals.some((m) => m.meal.free)) assert.ok(P.prot >= P.T.protein, `${P.key}: protein ${P.prot} under ${P.T.protein}`);
});

test("no-fish, no-egg and no-dairy switches remove those plates", () => {
  const c = load({ noFish: true, noEggs: true, noDairy: true });
  for (const P of week(c)) for (const m of P.meals) assert.ok(!["fish", "egg", "dairy"].includes(m.meal.x), m.meal.n);
  const eggs = c.MEALS.b.find((m) => m.x === "egg");
  assert.ok(c.banned(eggs));
  c.S.settings.noEggs = false;
  assert.ok(!c.banned(eggs));
});

test("gain-only plates are offered only when gaining", () => {
  const big = load().MEALS.b.find((m) => m.gain);
  assert.ok(load().banned(big));
  assert.ok(!load({ start: 150, goal: 175 }).banned(big));
});

test("gaining trims meat portions and keeps the day on target", () => {
  const lose = load({ start: 150, goal: 140, height: 71, age: 25 });
  const gain = load({ start: 150, goal: 175, height: 71, age: 25 });
  const chicken = (c) => c.dayPlan(c.parseKey("2026-11-09")).meals[1].items.find((x) => /chicken/.test(x.t)).q;
  assert.ok(chicken(gain) < chicken(lose));
});

test("a training day adds one banana and changes nothing else", () => {
  const c = load();
  const before = plain(c.dayPlan(today()));
  c.S.train[c.key(today())] = 1;
  const after = plain(c.dayPlan(today()));
  assert.equal(after.target, before.target + 105);
  assert.ok(Math.abs(after.kcal - before.kcal - 105) <= 10);
  for (const i of [0, 1, 3]) assert.deepEqual(after.meals[i].items, before.meals[i].items);
});

test("meal times stay at least two and a half hours apart on a short day", () => {
  const c = load({ wake: "09:00", bed: "22:30" });
  const t = c.times();
  assert.ok(t.l - t.b >= 150 && t.s - t.l >= 150 && t.d - t.s >= 150, JSON.stringify(t));
  assert.equal(t.close, c.mins("22:30") - 180);
});

test("streak counts days with three or more plates", () => {
  const c = load();
  for (let i = 1; i <= 5; i++) c.S.done[c.key(c.addDays(today(), -i))] = i === 4 ? { b: 1 } : { b: 1, l: 1, d: 1 };
  const s = c.streaks();
  assert.equal(s.cur, 3);
  assert.equal(s.best, 3);
});

test("trend advice: losing", () => {
  const c = load();
  seed(c, 207, 206); assert.equal(c.trend().state, "ok");
  seed(c, 207, 206.9); assert.equal(c.trend().delta, -150);
  seed(c, 207, 206.9, 1); assert.equal(c.trend().state, "adh");
  seed(c, 207, 204); assert.equal(c.trend().delta, 150);
});

test("trend advice: gaining, then holding once the goal is reached", () => {
  const c = load({ sex: "f", start: 118, goal: 135, height: 65, age: 23 });
  seed(c, 118, 118.6); assert.equal(c.trend().state, "ok");
  seed(c, 118, 118.05); assert.equal(c.trend().delta, 150);
  seed(c, 118, 120); assert.equal(c.trend().delta, -150);
  seed(c, 134, 135.5); assert.equal(c.mode(), "hold");
});

test("healthy-weight limits for a goal", () => {
  const c = load();
  assert.ok(Math.abs(c.minGoal(70) - 129) < 1.5);
  assert.ok(Math.abs(c.maxGoal(65) - 180.3) < 1.5);
});

test("units: kg display and input round-trip", () => {
  const c = load({ units: "kg" });
  assert.equal(c.U(), "kg");
  assert.equal(c.wOut(220.46, 0), "100");
  assert.ok(Math.abs(c.wIn(100) - 220.46) < 0.01);
  seed(c, 207, 206);
  assert.match(c.trend().msg, /0\.5 kg/);
});

test("plain food names are added only when switched on", () => {
  const c = load();
  assert.equal(c.gloss("2 tbsp mashed zaboca"), "2 tbsp mashed zaboca");
  c.S.settings.plain = true;
  assert.equal(c.gloss("2 tbsp mashed zaboca"), "2 tbsp mashed zaboca (avocado)");
  assert.equal(c.gloss("1 cup boiled provision (sweet potato, dasheen or cassava)"), "1 cup boiled provision (sweet potato, dasheen (taro) or cassava)");
});

test("plate picture shares add up and name real groups", () => {
  const c = load();
  for (const m of c.dayPlan(today()).meals) {
    const sh = plain(c.plateShares(m.items));
    assert.ok(Math.abs(sh.reduce((a, s) => a + s[1], 0) - 1) < 1e-9);
    for (const [g] of sh) assert.ok(g in c.GROUPS);
  }
});

test("shopping list is built from the planned plates", () => {
  const c = load();
  const list = plain(c.shopList(c.parseKey("2026-11-09"), 7)); // a Monday
  const all = list.flatMap((g) => g.items);
  const find = (re) => all.find((i) => re.test(i.name));
  assert.match(find(/Chicken breast/).amt, /kg|g/);
  assert.ok(find(/Rice/) && find(/Bananas/) && find(/Protein powder/));
  assert.equal(new Set(all.map((i) => i.id)).size, all.length, "ids are unique");
  assert.ok(!find(/choice/i));
});

test("shopping list follows exclusions and includes your own meals", () => {
  const c = load({ noMeat: true });
  const mon = c.parseKey("2026-11-09");
  c.S.custom.push({ id: "x1", slot: "d", n: "Aunty's stew", k: 500, p: 30, ing: ["2 christophene", "1 tin coconut milk"] });
  c.S.swaps[c.key(mon)] = { d: "c:x1" };
  const all = plain(c.shopList(mon, 7)).flatMap((g) => g.items);
  assert.ok(!all.some((i) => /chicken|tuna|kingfish|saltfish/i.test(i.name)));
  assert.ok(all.some((i) => /Soya chunks|Firm tofu|Lentils/.test(i.name)));
  assert.ok(all.some((i) => i.name === "2 christophene"));
});

test("amounts round up to shop sizes", () => {
  const c = load();
  assert.equal(c.amount(1010, "g"), "1.1 kg");
  assert.equal(c.amount(120, "g"), "150 g");
  assert.equal(c.amount(2.2, "can"), "3 cans");
  assert.equal(c.amount(1, "can"), "1 can");
  assert.equal(c.amount(8.5, ""), "9");
});

test("sync: changes on different days from two devices both survive", () => {
  const c = load();
  const base = c.merge(plain(c.S));
  const phone = c.clone(base), ipad = c.clone(base);
  phone.weights["2026-11-10"] = 206; c.stampChanges(base, phone, 1000); phone.updated = 1000;
  ipad.done["2026-11-11"] = { b: 1, l: 1 }; c.stampChanges(base, ipad, 2000); ipad.updated = 2000;
  const a = plain(c.mergeStates(phone, ipad)), b = plain(c.mergeStates(ipad, phone));
  assert.equal(a.weights["2026-11-10"], 206);
  assert.deepEqual(a.done["2026-11-11"], { b: 1, l: 1 });
  assert.ok(c.sameData(a, b), "merge gives the same answer from either side");
});

test("sync: for the same day the later change wins, including a deletion", () => {
  const c = load();
  const base = c.merge(plain(c.S));
  base.weights["2026-11-10"] = 207; c.stampChanges(null, base, 500);
  const phone = c.clone(base), ipad = c.clone(base);
  phone.weights["2026-11-10"] = 205; c.stampChanges(base, phone, 1000);
  delete ipad.weights["2026-11-10"]; c.stampChanges(base, ipad, 2000);
  assert.equal(plain(c.mergeStates(phone, ipad)).weights["2026-11-10"], undefined);
  assert.equal(plain(c.mergeStates(ipad, phone)).weights["2026-11-10"], undefined);
});

test("sync: settings and own meals merge as blocks", () => {
  const c = load();
  const base = c.merge(plain(c.S));
  const phone = c.clone(base), ipad = c.clone(base);
  phone.settings.goal = 175; c.stampChanges(base, phone, 1000);
  ipad.custom.push({ id: "m", slot: "d", n: "Mine", k: 400, p: 30, ing: [] }); c.stampChanges(base, ipad, 900);
  const m = plain(c.mergeStates(phone, ipad));
  assert.equal(m.settings.goal, 175);
  assert.equal(m.custom.length, 1);
});

test("sync: data saved before stamps existed falls back to newest overall", () => {
  const c = load();
  const fresh = c.merge({}), old = c.merge({ updated: 50, settings: { start: 207, goal: 180, height: 70, age: 30 }, weights: { "2026-11-01": 207 } });
  const m = plain(c.mergeStates(fresh, old));
  assert.equal(m.weights["2026-11-01"], 207);
  assert.equal(m.settings.onboarded, true);
});

test("lift history keeps one entry per day and shows earlier sessions", () => {
  const c = load();
  c.recordLift("Goblet squat", 30, "2026-11-02");
  c.recordLift("Goblet squat", 35, "2026-11-04");
  c.recordLift("Goblet squat", 37.5, "2026-11-04");
  assert.deepEqual(plain(c.S.lifthist["Goblet squat"]), [["2026-11-02", 30], ["2026-11-04", 37.5]]);
  assert.deepEqual(plain(c.liftBefore("Goblet squat", "2026-11-04")), [30]);
  assert.equal(c.S.lifts["Goblet squat"], 37.5);
});

test("both training plans have three days of six exercises", () => {
  const c = load();
  for (const set of [c.WORKOUTS, c.WORKOUTS_HOME]) for (const d of ["A", "B", "C"]) {
    assert.equal(set[d].ex.length, 6);
    for (const x of set[d].ex) assert.ok(x.n && x.s > 0 && x.r && x.c.length >= 2);
  }
  c.S.settings.gym = "home";
  assert.equal(c.workoutSet(), c.WORKOUTS_HOME);
});

test("a day short on protein is topped up with powder at the snack, without overshooting calories", () => {
  const c = load({ noMeat: true });
  const day = week(c).find((P) => P.meals[2].items.some((x) => /extra scoop/.test(x.x)));
  assert.ok(day, "at least one vegetarian day needs a top-up");
  assert.ok(Math.abs(day.kcal - day.target) / day.target < 0.12);
  const meatDay = load().dayPlan(load().parseKey("2026-11-09"));
  assert.ok(!meatDay.meals[2].items.some((x) => /extra scoop/.test(x.x)), "no top-up when the plates already cover it");
});
