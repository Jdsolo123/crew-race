// Reading the coach's sheet and all the math. No DOM here, so test.js can run it.
(function (root) {
  const SHEET = "https://docs.google.com/spreadsheets/d/1qNPoqlYaegbV-TzscMeOVSLWithNq0VOoj55T5Gb7aQ/export?format=csv";
  const TEAMS = ["CHUDS", "DiH", "EUGH"];

  function csv(text) {
    const rows = [[]]; let cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch !== '"') cell += ch; else if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else if (ch === '"') q = true;
      else if (ch === ",") { rows.at(-1).push(cell); cell = ""; }
      else if (ch === "\n") { rows.at(-1).push(cell); cell = ""; rows.push([]); }
      else if (ch !== "\r") cell += ch;
    }
    rows.at(-1).push(cell);
    return rows;
  }

  // Each "TEAM TOTALS" row closes the block of rowers above it.
  function parse(text) {
    const rows = csv(text), people = [], fullNames = {};
    const dateRow = rows.find(r => r[1] === "Workout Date");
    if (!dateRow) throw new Error("The sheet layout changed: no Workout Date row.");
    const days = dateRow.slice(5, 10);
    let block = [];
    for (const r of rows) {
      if (r[3] === "TEAM TOTALS") {
        const team = r[1].trim();
        if (!TEAMS.includes(team)) throw new Error("The sheet has an unknown team: " + team);
        block.forEach(p => { people.push({ ...p, team }); fullNames[team] = p.full; });
        block = [];
        continue;
      }
      const exp = parseFloat(r[4]);
      if (!/^\d+$/.test(r[0]) || !r[1] || !r[2] || !(exp > 0)) continue;
      const daily = r.slice(5, 10).map(v => parseFloat(v) || 0);
      const last = r[1].trim().replace(/^Lorenz[ES]$/, "Lorenz"), first = r[2].trim();
      block.push({ first, last, name: first + " " + last, full: r[3].trim(), exp, daily, pts: daily.reduce((a, b) => a + b, 0) });
    }
    if (TEAMS.some(t => !fullNames[t])) throw new Error("The sheet layout changed: a team is missing.");
    return { days, people, fullNames };
  }

  const frac = p => (p.exp ? p.pts / p.exp : 0);
  function standings(people) {
    return TEAMS.map(name => {
      const members = people.filter(p => p.team === name);
      const sum = f => members.reduce((a, p) => a + f(p), 0);
      const pts = sum(p => p.pts), exp = sum(p => p.exp);
      return { name, members, pts, exp, pct: exp ? pts / exp : 0, logged: members.filter(p => p.pts > 0).length,
        daily: [0, 1, 2, 3, 4].map(i => sum(p => p.daily[i])) };
    }).sort((a, b) => b.pct - a.pct);
  }
  // Smallest half point that puts a team strictly ahead of the target fraction.
  const need = (team, pct) => Math.max(0, (Math.floor((pct * team.exp - team.pts) * 2 + 1e-9) + 1) / 2);
  const leaders = people => people.filter(p => p.pts > 0).sort((a, b) => frac(b) - frac(a) || b.pts - a.pts);

  // Match emailed result rows to sheet rowers; the two spell some names differently.
  const ALIAS = { "shastrideonikar": "shasdeo", "pecora": "percora" };
  const key = (last, first) => { const l = last.toLowerCase().replace(/[^a-z]/g, ""); return (ALIAS[l] || l) + "|" + first[0].toLowerCase(); };
  const secs = t => t.split(":").reduce((a, x) => a * 60 + +x, 0);
  function ergFor(person, results) {
    return results.flatMap(t => {
      const sorted = [...t.rows].sort((a, b) => secs(a[3]) - secs(b[3]));
      const i = sorted.findIndex(r => key(r[0], r[1]) === key(person.last, person.first));
      return i < 0 ? [] : [{ id: t.id, label: t.label, date: t.date, time: sorted[i][2], split: sorted[i][3], rank: i + 1, of: sorted.length }];
    });
  }

  const byPoints = people => people.filter(p => p.pts > 0).sort((a, b) => b.pts - a.pts || frac(b) - frac(a));

  // Every badge is computed from the sheet or the emailed results, nothing else.
  function badges(person, people, results) {
    const out = [], ergs = ergFor(person, results);
    const best = Math.max(0, ...people.flatMap(p => p.daily));
    if (person.pts >= person.exp) out.push(["Goal smashed", "Hit the stage goal"]);
    else if (frac(person) >= 0.5) out.push(["Halfway", "Past half the stage goal"]);
    if (person.pts > 0) out.push(["On the board", "Logged points this stage"]);
    if (best > 0 && person.daily.includes(best)) out.push(["Biggest day", `${best} points in one day, the squad high`]);
    if (person.daily.filter(v => v > 0).length >= 3) out.push(["Three days", "Points on three or more days"]);
    const top = ergs.filter(e => e.rank <= 10);
    if (top.length) out.push(["Top 10 erg", top.map(e => `${e.label} ${e.date}`).join(", ")]);
    const a = ergs.find(e => e.id === "2x6k-1119"), b = ergs.find(e => e.id === "2x6k-1124");
    if (a && b && secs(b.split) < secs(a.split)) out.push(["Got faster", `2x6K split ${a.split} to ${b.split}`]);
    return out;
  }

  const pc = x => (x * 100).toFixed(1) + "%";
  function recap(people) {
    const s = standings(people), top = leaders(people).slice(0, 3);
    return ["Break points update",
      ...s.map((t, i) => `${i + 1}. ${t.name} ${pc(t.pct)} (${t.pts} pts, ${t.logged}/${t.members.length} on the board)`),
      ...s.slice(1).map(t => `${t.name} needs ${need(t, s[0].pct)} pts to pass ${s[0].name}.`),
      top.length ? "Leading: " + top.map(p => `${p.name} ${pc(frac(p))}`).join(", ") : "Nobody on the board yet."].join("\n");
  }

  const api = { SHEET, TEAMS, csv, parse, standings, need, leaders, byPoints, badges, ergFor, secs, key, frac, pc, recap };
  if (typeof module !== "undefined") module.exports = api; else root.Core = api;
})(this);
