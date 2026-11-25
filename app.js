const C = Core, $ = id => document.getElementById(id);
const CACHE = "umrt-sheet-v2", MINE = "umrt-me";
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
const RESULTS = window.RESULTS || [];
let data = null, picked = store.get(MINE) || "", shown = null, board = "pct", test = "2x6k-1124";
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
const cheered = new Set();

function confetti() {
  if (calm) return;
  const colors = ["#ffcb05", "#ffffff", "#45e0c8", "#ff7a45"];
  for (let i = 0; i < 90; i++) {
    const bit = document.createElement("i");
    bit.className = "confetti";
    bit.style.cssText = `left:${Math.random() * 100}vw;background:${colors[i % 4]};--dx:${Math.random() * 160 - 80}px;animation-duration:${1.8 + Math.random() * 1.6}s;animation-delay:${Math.random() * .5}s`;
    bit.onanimationend = () => bit.remove();
    document.body.append(bit);
  }
}

// What the chosen rower has to celebrate right now.
function news() {
  const me = data.people.find(p => p.name === picked);
  if (!me) return "";
  if (me.pts >= me.exp) return "You hit your stage goal!";
  const lead = C.standings(data.people)[0];
  return lead.pts > 0 && lead.name === me.team ? `${me.team} is in the lead!` : "";
}

function countUp() {
  if (calm) return;
  document.querySelectorAll("[data-count]").forEach(el => {
    const end = +el.dataset.count, t0 = performance.now();
    const tick = now => {
      const k = Math.min(1, (now - t0) / 1600);
      el.textContent = (end * (1 - (1 - k) ** 3)).toFixed(1) + "%";
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

// Split over the two 2x6K workouts. Faster is higher.
function trend(ergs, team) {
  const a = ergs.find(e => e.id === "2x6k-1119"), b = ergs.find(e => e.id === "2x6k-1124");
  if (!a || !b) return "";
  const s = [C.secs(a.split), C.secs(b.split)], lo = Math.min(...s), span = Math.max(1, Math.max(...s) - lo);
  const y = v => 40 + (v - lo) / span * 46, diff = s[1] - s[0];
  const word = Math.abs(diff) < .05 ? "Same split" : `${Math.abs(diff).toFixed(1)}s ${diff < 0 ? "faster" : "slower"} per 500m`;
  return `<div class="card" style="margin-bottom:10px"><h3>2x6K: ${word}</h3>
<svg class="chart" viewBox="0 0 320 120" role="img" aria-label="2x6K split ${a.split} on Nov 19, ${b.split} on Nov 24">
<path d="M70 ${y(s[0])}L250 ${y(s[1])}" stroke="var(--${team})" stroke-width="6" stroke-linecap="round"/>
${[a, b].map((e, i) => `<circle cx="${70 + i * 180}" cy="${y(s[i])}" r="8" fill="var(--${team})" stroke="#03111f" stroke-width="3"/>
<text x="${70 + i * 180}" y="${y(s[i]) - 16}" text-anchor="middle">${e.split}</text><text class="soft" x="${70 + i * 180}" y="115" text-anchor="middle">${e.date}</text>`).join("")}</svg></div>`;
}

function ergBoard() {
  const t = RESULTS.find(r => r.id === test) || RESULTS[0];
  const rows = [...t.rows].sort((a, b) => C.secs(a[3]) - C.secs(b[3]));
  const fastest = C.secs(rows[0][3]), slowest = C.secs(rows.at(-1)[3]);
  return `<a class="back" href="#">← Race</a><h2 style="margin-top:0">Fastest splits</h2>
<div class="toggle" style="grid-template-columns:repeat(${RESULTS.length},1fr)">${RESULTS.map(r => `<button type="button" data-test="${r.id}" aria-pressed="${r.id === t.id}">${r.label}<br>${r.date}</button>`).join("")}</div>
<ul class="list">${rows.map((r, i) => {
    const p = data.people.find(x => C.key(x.last, x.first) === C.key(r[0], r[1]));
    const team = p ? p.team : null, width = 100 - (C.secs(r[3]) - fastest) / Math.max(1, slowest - fastest) * 70;
    const inner = `<span class="num">${i + 1}</span><span class="grow"><strong>${esc(p ? p.name : r[1] + " " + r[0])}</strong><span class="bar"><i style="width:${width}%;background:var(--${team || "muted"})"></i></span></span><span class="num">${r[3]}</span>`;
    return `<li>${p ? `<a class="row" href="${href(p)}">${inner}</a>` : `<div class="row">${inner}</div>`}</li>`;
  }).join("")}</ul><p class="muted">Average split per 500m, from the coach's result emails. Longer bar is faster.</p>`;
}

const esc = s => String(s).replace(/[&<>"']/g, c => "&#" + c.charCodeAt(0) + ";");
const initials = p => esc(p.first[0] + p.last[0]);
const color = team => `style="--c:var(--${team})"`;
const avatar = (p, big) => {
  const src = (window.PHOTOS || {})[p.name];
  return `<span class="avatar${big ? " big" : ""}" ${color(p.team)} aria-hidden="true">${src ? `<img src="${esc(src)}" alt="">` : initials(p)}</span>`;
};
const href = p => "#rower/" + encodeURIComponent(p.name);

// Teams with a mascot picture in crests/ use it; the rest get a drawn shield.
const MASCOTS = ["CHUDS", "EUGH", "DiH"];
const TEAM_PHOTO = { CHUDS: "crests/CHUDS-full.jpg" };
const crest = (team, size = 34) => MASCOTS.includes(team)
  ? `<img class="crest mascot" src="crests/${team}.jpg" width="${size}" height="${size}" style="--c:var(--${team})" alt="">`
  : `<svg class="crest" width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true">
<path d="M4 4h32v18c0 9-9 14-16 16C13 36 4 31 4 22Z" fill="var(--${team})" stroke="#03111f" stroke-width="3"/>
<text x="20" y="27" text-anchor="middle" font-size="21" font-weight="900" fill="#03111f" font-family="Arial">${team[0]}</text></svg>`;

// Top-down eight moving to the right. Rowers face the stern (left), so at the catch they sit
// sternward with blades toward the bow, then drive. All eight swing together.
function shell(team, lag) {
  const at = `animation-delay:${lag}s`, c = `var(--${team})`;
  let oars = "", crew = "", water = "";
  // Pixel-art splash: [dx, dy, size] squares on a 3px grid; dy points away from the hull.
  const SPLASH = [[-6,0,3],[-3,-3,3],[0,-3,3],[3,-3,3],[6,0,3],[-3,3,3],[3,3,3],[-9,3,2],[9,-3,2],[0,6,3],[6,7,2],[-6,6,2]];
  const pixels = (list, fill) => `<g fill="${fill}" shape-rendering="crispEdges">${list.map(([px, py, s]) => `<rect x="${px}" y="${py}" width="${s}" height="${s}"/>`).join("")}</g>`;
  for (let i = 0; i < 8; i++) {
    const x = 78 + i * 22, up = i % 2 === 0, side = up ? -1 : 1, tip = 40 + side * 34;
    water += `<g class="puddle" style="${at};transform-origin:${x + 15}px ${tip - side * 3}px">
${pixels(SPLASH.map(([dx, dy, s]) => [x + 15 + dx, tip - side * 3 + dy * side, s]), "#eaf8ff")}</g>`;
    oars += `<g class="oar${up ? "" : " low"}" style="transform-origin:${x}px ${40 + side * 12}px;${at}">
<line x1="${x}" y1="${40 - side * 2}" x2="${x}" y2="${tip - side * 8}" stroke="#03111f" stroke-width="4" stroke-linecap="round"/>
<line x1="${x}" y1="${40 - side * 2}" x2="${x}" y2="${tip - side * 8}" stroke="#e9eef5" stroke-width="2" stroke-linecap="round"/>
<g class="blade" style="transform-origin:${x}px ${tip}px;${at}"><rect x="${x - 5.5}" y="${tip - 9}" width="11" height="18" rx="3.5" fill="${c}" stroke="#03111f" stroke-width="1.5"/>
<rect x="${x - 5.5}" y="${tip - 2}" width="11" height="4" fill="#00274c"/></g></g>
<line x1="${x}" y1="${40 + side * 6}" x2="${x}" y2="${40 + side * 13}" stroke="#9fb4cc" stroke-width="2"/>`;
    crew += `<g class="body" style="${at}"><circle cx="${x}" cy="40" r="6.5" fill="${c}" stroke="#03111f" stroke-width="2"/></g>`;
  }
  // Wake: square foam blocks spreading behind the stern.
  const foam = [];
  for (let k = 0; k < 6; k++) {
    const wx = 27 - k * 5, spread = 4 + k * 3, s = k < 3 ? 4 : 3;
    foam.push([wx, 40 - spread - s / 2, s], [wx, 40 + spread - s / 2, s]);
    if (k % 2 === 0) foam.push([wx - 2, 38.5, 3]);
  }
  return `<svg class="shell" viewBox="0 0 280 80" aria-hidden="true">
<g class="wake" style="${at}" opacity=".85">${pixels(foam, "#d6f1ff")}</g>
${water}<g class="surge" style="${at}">${oars}
<path d="M34 40C60 29 215 30 276 40C215 50 60 51 34 40Z" fill="#fff" stroke="#03111f" stroke-width="2"/>
<path d="M60 40C100 34 200 34 244 40C200 46 100 46 60 40Z" fill="#0a2c55"/>
<path d="M252 40H274" stroke="${c}" stroke-width="3" stroke-linecap="round"/><circle cx="276" cy="40" r="2" fill="#fff"/>
${crew}<ellipse cx="53" cy="40" rx="4.5" ry="6.5" fill="${c}" stroke="#03111f" stroke-width="1.4"/><circle cx="54" cy="40" r="3" fill="#03111f"/></g></svg>`;
}

function ring(p) {
  const f = C.frac(p);
  return `<div class="ring" style="--c:var(--${p.team});--p:${Math.min(100, f * 100)}%"><b>${Math.round(f * 100)}%</b></div>`;
}
function rowerRow(p, place) {
  const f = C.frac(p);
  return `<li><a class="row" href="${href(p)}">${place ? `<span class="num">${place}</span>` : ""}${avatar(p)}
<span class="grow"><strong>${esc(p.name)}</strong><span class="bar"><i style="width:${Math.min(100, f * 100)}%;--c:var(--${p.team});background:var(--${p.team})"></i></span></span>
<span class="num">${p.pts}<span class="muted"> / ${p.exp}</span></span></a></li>`;
}
function dayBars(daily, team) {
  const max = Math.max(1, ...daily);
  return `<div class="card"><div class="days">${daily.map((v, i) => {
    const [m, d] = data.days[i].split("/");
    return `<div class="day"><b>${v}</b><i style="--c:var(--${team});height:${v / max * 100}px"></i><span>${m}/${d}</span></div>`;
  }).join("")}</div></div>`;
}

function home() {
  const s = C.standings(data.people), raw = board === "pts";
  const top = raw ? C.byPoints(data.people) : C.leaders(data.people);
  const main = p => raw ? p.pts : Math.round(C.frac(p) * 100) + "%";
  const sub = p => raw ? Math.round(C.frac(p) * 100) + "% of goal" : p.pts + " pts";
  const cheer = news();
  const scale = Math.max(1e-9, s[0].pct > 1 ? s[0].pct : s[0].pct * 1.06);
  const race = s.map((t, i) => `<a class="lane" href="#team/${t.name}" aria-label="${t.name}, place ${i + 1}, ${C.pc(t.pct)}. Open team">
<div class="lane-top"><span class="team-tag">${crest(t.name)}${i + 1}. ${t.name}</span><span class="pct" style="color:var(--${t.name})" data-count="${t.pct * 100}">${C.pc(t.pct)}</span></div>
<div class="track"><span class="finish"></span><div class="runner" style="--at:calc((100% - min(60%, 320px) - 14px) * ${Math.min(1, t.pct / scale)});animation-delay:${i * .12}s">${shell(t.name, -i * .2)}</div></div>
<p class="lane-foot">${t.pts} of ${t.exp} pts · ${i ? `${C.need(t, s[0].pct)} to catch and pass ${s[0].name}` : t.pts ? "leading" : "all level"}</p></a>`).join("");

  const me = data.people.find(p => p.name === picked);
  const names = [...data.people].sort((a, b) => a.name.localeCompare(b.name));
  const mine = me ? `<div class="me">${ring(me)}<div><h3>${esc(me.name)}</h3>
<p>${me.pts} of ${me.exp} points for ${me.team}.</p><p class="muted">${me.exp > me.pts ? `${me.exp - me.pts} to your stage goal.` : "Stage goal done."} <a class="back" href="${href(me)}">Your page →</a></p></div></div>` : "";

  const step = (p, n) => p ? `<a class="step p${n}" href="${href(p)}">${avatar(p, n === 1)}<span class="who">${esc(p.name)}<br><span class="muted">${sub(p)}</span></span>
<span class="block">${n}<small>${main(p)}</small></span></a>` : `<div></div>`;

  return `${cheer ? `<div class="card cheer" role="status">${esc(cheer)}</div>` : ""}<section class="course" aria-label="Team race">${race}</section>
<p class="muted">Boats move by percent of expected points. Tap a boat for its roster.</p>
<h2>Your boat seat</h2><div class="card"><label for="me">Who are you?</label><select id="me"><option value="">Choose your name</option>
${names.map(p => `<option${p === me ? " selected" : ""}>${esc(p.name)}</option>`).join("")}</select>${mine}</div>
<h2>Leaderboard</h2><div class="toggle"><button type="button" data-board="pct" aria-pressed="${!raw}">By percent</button><button type="button" data-board="pts" aria-pressed="${raw}">By points</button></div>${top.length ? `<div class="podium">${step(top[1], 2)}${step(top[0], 1)}${step(top[2], 3)}</div>
<ul class="list" style="margin-top:14px">${top.slice(3, 10).map((p, i) => rowerRow(p, i + 4)).join("")}</ul>` : `<div class="card">No points logged yet. First one on the board takes the top step.</div>`}
<a class="card link" href="#ergs"><span>Erg leaderboard →</span></a>
<h2>Crews</h2><div class="teams">${s.map(t => `<a class="card" href="#team/${t.name}">${crest(t.name, 58)}${t.name}</a>`).join("")}</div>
<h2>Group chat</h2><button type="button" id="copy">Copy recap</button><p class="muted" id="copied" role="status"></p>`;
}

function teamPage(name) {
  const s = C.standings(data.people), t = s.find(x => x.name === name);
  if (!t) return home();
  const roster = [...t.members].sort((a, b) => C.frac(b) - C.frac(a) || a.name.localeCompare(b.name));
  return `<a class="back" href="#">← Race</a><div class="title">${crest(t.name, 76)}<div><h2 style="margin:0">${t.name}</h2><p class="muted">${esc(data.fullNames[t.name])}</p></div></div>
${TEAM_PHOTO[t.name] ? `<img class="team-photo" src="${TEAM_PHOTO[t.name]}" alt="${t.name} team picture">` : ""}
<div class="stats"><div class="stat"><b>${s.indexOf(t) + 1}</b><span>place</span></div><div class="stat"><b>${C.pc(t.pct)}</b><span>of expected</span></div><div class="stat"><b>${t.logged}/${t.members.length}</b><span>on the board</span></div></div>
<h2>Points by day</h2>${dayBars(t.daily, t.name)}
<h2>Roster</h2><ul class="list">${roster.map(p => rowerRow(p)).join("")}</ul>`;
}

function rowerPage(name) {
  const p = data.people.find(x => x.name === name);
  if (!p) return home();
  const ergs = C.ergFor(p, RESULTS), won = C.badges(p, data.people, RESULTS);
  return `<a class="back" href="#team/${p.team}">← ${p.team}</a><div class="title">${avatar(p, true)}<div><h2 style="margin:0">${esc(p.name)}</h2><p class="muted">${esc(data.fullNames[p.team])}</p></div></div>
<div class="card me">${ring(p)}<div><h3>${p.pts} of ${p.exp} points</h3><p class="muted">${p.exp > p.pts ? `${p.exp - p.pts} to the stage goal` : "Stage goal done"}</p></div></div>
${won.length ? `<h2>Badges</h2><ul class="badges">${won.map((b, i) => `<li class="badge" style="animation-delay:${i * .07}s"><b>${esc(b[0])}</b><span>${esc(b[1])}</span></li>`).join("")}</ul>` : ""}
<h2>Points by day</h2>${dayBars(p.daily, p.team)}
<h2>Erg results</h2>${ergs.length ? `${trend(ergs, p.team)}<ul class="list">${ergs.map(e => `<li class="row"><span class="grow"><strong>${e.label} · ${e.date}</strong><span class="muted">${e.rank} of ${e.of} finishers · total ${e.time}</span></span><span class="num">${e.split}<span class="muted"> /500m</span></span></li>`).join("")}</ul>
<p class="muted">From the coach's result emails, Nov 11 to Nov 24.</p>` : `<div class="card">No finished results for this rower in the Nov 11 to Nov 24 emails.</div>`}`;
}

function render() {
  if (!data) return;
  const [kind, raw] = location.hash.slice(1).split("/");
  let arg = ""; try { arg = decodeURIComponent(raw || ""); } catch {}
  const moved = shown !== location.hash, first = shown === null;
  const draw = () => {
    $("app").innerHTML = kind === "team" ? teamPage(arg) : kind === "rower" ? rowerPage(arg) : kind === "ergs" ? ergBoard() : home();
    if (moved) { window.scrollTo(0, 0); countUp(); }
    wire();
    const key = kind === "rower" && data.people.some(p => p.name === arg && p.pts >= p.exp) ? "goal:" + arg : !kind && news();
    if (key && !cheered.has(key)) { cheered.add(key); confetti(); }
  };
  shown = location.hash;
  if (moved && !first && !calm && !document.hidden && document.startViewTransition) document.startViewTransition(draw);
  else draw();
}

// Redraw in place without losing the scroll position.
function redraw() { const y = scrollY; render(); scrollTo(0, y); }

function wire() {
  document.querySelectorAll("[data-board]").forEach(b => b.onclick = () => { board = b.dataset.board; redraw(); });
  document.querySelectorAll("[data-test]").forEach(b => b.onclick = () => { test = b.dataset.test; redraw(); });
  if ($("me")) $("me").onchange = e => { picked = e.target.value; store.set(MINE, picked); redraw(); };
  if ($("copy")) $("copy").onclick = () => {
    const text = C.recap(data.people);
    navigator.clipboard.writeText(text).then(() => $("copied").textContent = "Copied. Paste it in the chat.").catch(() => $("copied").textContent = text);
  };
}

async function load() {
  try {
    const res = await fetch(C.SHEET, { cache: "no-store" });
    if (!res.ok) throw new Error("Google returned " + res.status);
    data = C.parse(await res.text());
    store.set(CACHE, JSON.stringify({ data, at: Date.now() }));
    $("status").textContent = "Live from the coach's sheet · self-reported · " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch (err) {
    let saved = null; try { saved = JSON.parse(store.get(CACHE)); } catch {}
    if (saved) { data = saved.data; $("status").textContent = "Couldn't reach the sheet. Showing numbers from " + new Date(saved.at).toLocaleString(); }
    else { $("status").textContent = "Couldn't read the sheet: " + err.message + ". Reload to try again."; return; }
  }
  render();
}

// header.jpg in this folder becomes the banner photo.
const photo = new Image();
photo.onload = () => { const h = document.querySelector(".hero"); h.style.setProperty("--photo", "url(header.jpg)"); h.classList.add("has-photo"); };
photo.src = "header.jpg";

addEventListener("hashchange", render);
document.addEventListener("visibilitychange", () => { if (!document.hidden) load(); });
load();
