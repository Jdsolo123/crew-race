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
  console.log("ok\n" + C.recap(data.people));
})();
