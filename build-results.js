// node build-results.js <transcript.jsonl>
// Copies the coach's emailed erg result tables, exactly as fetched, into results.js.
// Injury / absence rows are left out on purpose.
const fs = require("fs");
const TESTS = [
  { subject: "Wed 11 Nov 2026 10K TEST RESULTS", id: "10k-1111", label: "10K test", date: "Nov 11" },
  { subject: "Thu 19 Nov 2026  2x6K RESULTS", id: "2x6k-1119", label: "2x6K", date: "Nov 19" },
  { subject: "Tue 24 Nov 2026  2x6K RESULTS", id: "2x6k-1124", label: "2x6K", date: "Nov 24" },
];
const texts = [];
const walk = v => {
  if (typeof v === "string") {
    if (v[0] === "{" || v[0] === "[") { try { return walk(JSON.parse(v)); } catch {} }
    if (v.includes("===== " + TESTS[0].subject)) texts.push(v);
  }
  else if (v && typeof v === "object") Object.values(v).forEach(walk);
};
for (const line of fs.readFileSync(process.argv[2], "utf8").split("\n")) { try { walk(JSON.parse(line)); } catch {} }
const dump = texts.find(t => t.includes("\n===== " + TESTS[1].subject));
if (!dump) throw new Error("result tables not found");

const TIME = /^\d?\d:\d\d\.\d$/;
const out = TESTS.map(t => {
  const block = dump.split("===== " + t.subject)[1].split("=====")[0];
  const rows = [];
  for (const line of block.split("\n")) {
    const c = line.split("|");
    if (!/^\d+$/.test(c[0])) continue;
    const [, last, first] = c;
    let time, split;
    if (t.id === "10k-1111") [time, split] = [c[13], c[14]];
    else {
      if (!TIME.test(c[3]) || !TIME.test(c[5])) continue; // both pieces finished
      time = c[7];
      split = t.id === "2x6k-1124" ? c[9] : c[8];
    }
    if (TIME.test(time) && TIME.test(split)) rows.push([last, first, time, split]);
  }
  return { id: t.id, label: t.label, date: t.date, rows };
});
fs.writeFileSync(__dirname + "/results.js", "window.RESULTS=" + JSON.stringify(out) + ";\n");
console.log(out.map(t => `${t.label} ${t.date}: ${t.rows.length} finishers, fastest ${t.rows[0].join(" ")}`).join("\n"));
