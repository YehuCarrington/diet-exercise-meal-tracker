// Loads the browser scripts (data + core) into an isolated context so the plan logic can be tested without a browser.
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "js");

export function load(settings = {}) {
  const ctx = vm.createContext({ console });
  for (const f of ["data.js", "core.js"]) vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
  vm.runInContext("var S = clone(DEF);", ctx);
  Object.assign(ctx.S.settings, { onboarded: true, start: 207, goal: 180, height: 70, age: 30, sex: "m", act: 1.4 }, settings);
  return ctx;
}
export const today = () => new Date();
export function week(ctx) {
  const days = [];
  for (let i = 0; i < 7; i++) days.push(ctx.dayPlan(ctx.addDays(today(), i)));
  return days;
}
// Seed two weeks of weigh-ins and plate ticks ending today.
export function seed(ctx, olderWeek, thisWeek, platesPerDay = 4) {
  ctx.S.weights = {}; ctx.S.done = {};
  for (let i = 0; i < 14; i++) {
    const k = ctx.key(ctx.addDays(today(), -i));
    ctx.S.weights[k] = i < 7 ? thisWeek : olderWeek;
    ctx.S.done[k] = Object.fromEntries(["b", "l", "s", "d"].slice(0, platesPerDay).map((id) => [id, 1]));
  }
}
