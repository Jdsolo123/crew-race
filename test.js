// node test.js  - runs against the live sheet and results.js
const assert = require("assert"), C = require("./core.js");
global.window = {}; require("./results.js");

(async () => {
  assert.deepStrictEqual(C.csv('a,"b,""c""\nd",e\r\nf'), [["a", 'b,"c"\nd', "e"], ["f"]]);
  const text = await (await fetch(C.SHEET)).text(), data = C.parse(text), s = C.standings(data.people);

  // Our totals must match the sheet's own TEAM TOTALS rows.
  for (const row of C.csv(text).filter(r => r[3] === "TEAM TOTALS")) {
    const t = s.find(x => x.name === row[1]);
    assert.strictEqual(t.pts, parseFloat(row[10]), t.name + " points");
    assert.strictEqual(t.exp, parseFloat(row[4]), t.name + " expected");
  }
  for (const t of s.slice(1)) {
    const k = C.need(t, s[0].pct);
    assert((t.pts + k) / t.exp > s[0].pct && (t.pts + k - 0.5) / t.exp <= s[0].pct, "catch-up math");
  }
  for (const test of window.RESULTS) {
    const matched = new Set(data.people.filter(p => C.ergFor(p, [test]).length).map(p => p.name));
    const missed = test.rows.filter(r => !data.people.some(p => C.ergFor(p, [{ ...test, rows: [r] }]).length));
    console.log(`${test.label} ${test.date}: ${matched.size}/${test.rows.length} matched; not on sheet: ${missed.map(r => r[1] + " " + r[0]).join(", ") || "none"}`);
    assert.strictEqual(matched.size + missed.length, test.rows.length, "one result per rower");
  }
  const raw = C.byPoints(data.people);
  assert(raw.every((p, i) => !i || raw[i - 1].pts >= p.pts), "points board order");
  const fake = { first: "Zed", last: "Zzz", pts: 10, exp: 10, daily: [4, 3, 3, 0, 0] };
  assert.deepStrictEqual(C.badges(fake, [fake], []).map(b => b[0]), ["Goal smashed", "On the board", "Biggest day", "Three days"]);
  assert.deepStrictEqual(C.badges({ ...fake, pts: 0, daily: [0, 0, 0, 0, 0] }, [], []), []);
  // Break stages: last season's stay hidden; the same layout re-dated shows up as each one starts.
  const stageText = await (await fetch(C.STAGE_TAB)).text(), after = data.days.at(-1);
  assert(C.parseStages(stageText, after, new Date(2027, 0, 20)).every(x => !/2025/.test(x.days[0])), "old season hidden");
  const redated = stageText.replace(/\b(12\/\d+\/)2025\b/g, "$12026").replace(/\b(1\/\d+\/)2026\b/g, "$12027");
  const on = day => C.parseStages(redated, after, day).map(x => x.label);
  assert.deepStrictEqual(on(new Date(2026, 11, 1)), []);
  assert.deepStrictEqual(on(new Date(2026, 11, 18)), ["Stage 1", "Stage 2"]);
  const all = C.parseStages(redated, after, new Date(2027, 0, 20));
  assert.deepStrictEqual(all.map(x => [x.label, x.days.length]), [1, 2, 3, 4].map(n => ["Stage " + n, 7]));
  const one = all[0].people.find(p => p.last === "Dimcheff");
  assert.strictEqual(one.exp, 48);
  assert.strictEqual(one.pts, one.daily.reduce((a, b) => a + b, 0));
  assert.strictEqual(C.standings(all[0].people)[0].daily.length, 7);
  console.log("ok\n" + C.recap(data.people));
})();
