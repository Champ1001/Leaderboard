const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ2GT8KWEkO26Zegh2rX8iImmx2Ncg0JeVb9YsMkpfbzTDRu-W4xMyG4fveUjfofGvQekllYvidT7a9/pub?gid=0&single=true&output=csv";

let raw = [];
let players = [];
let currentSeries = "ALL";

async function loadData() {
  const res = await fetch(CSV_URL + "&t=" + Date.now());
  const text = await res.text();

  const rows = text.trim().split("\n").slice(1);
  raw = rows.map(r => {
    const [series, player, match_no, points, order, prev_rank] = r.split(",");
    return {
      series,
      player,
      match_no: Number(match_no),
      points: Number(points),
      order: Number(order),
      prev_rank: Number(prev_rank)
    };
  });

  setupSeries();
}

function setupSeries() {
  const select = document.getElementById("seriesSelect");
  const seriesList = [...new Set(raw.map(r => r.series))];

  select.innerHTML = "";
  select.innerHTML += `<option value="ALL">🌍 All-Time</option>`;

  seriesList.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    select.appendChild(opt);
  });

  currentSeries = "ALL";
  select.onchange = () => {
    currentSeries = select.value;
    processData();
  };

  processData();
}

function processData() {
  const data = currentSeries === "ALL"
    ? raw
    : raw.filter(r => r.series === currentSeries);

  const maxMatch = Math.max(...data.map(r => r.match_no));

  const map = {};
  data.forEach(r => {
    if (!map[r.player]) {
      map[r.player] = {
        player: r.player,
        order: r.order,
        prev_rank: r.prev_rank,
        matchPoints: {},
        matches: new Set()
      };
    }

    const key = currentSeries === "ALL"
      ? `${r.series}-${r.match_no}`
      : r.match_no;

    map[r.player].matchPoints[key] = r.points;
    map[r.player].matches.add(key);
  });

  players = Object.values(map).map(p => {
    let total = 0;
    Object.values(p.matchPoints).forEach(v => total += v);

    return {
      player: p.player,
      points: total,
      matches: p.matches.size,
      avg: p.matches.size ? total / p.matches.size : 0,
      order: p.order,
      prev_rank: p.prev_rank
    };
  });

  players.sort((a, b) =>
    b.points - a.points ||
    b.avg - a.avg ||
    a.order - b.order
  );

  render();
}

function render() {
  const tbody = document.getElementById("leaderboard");
  tbody.innerHTML = "";

  const maxPoints = Math.max(...players.map(p => p.points));

  players.forEach((p, i) => {
    let bg =
      i === 0 ? "bg-yellow-500/15" :
      i === 1 ? "bg-slate-400/15" :
      i === 2 ? "bg-amber-700/15" : "";

    let arrow = "➖", color = "text-slate-400";
    if (p.prev_rank) {
      if (p.prev_rank > i + 1) { arrow = "▲"; color = "text-green-400"; }
      else if (p.prev_rank < i + 1) { arrow = "▼"; color = "text-red-400"; }
    }

    const width = maxPoints ? (p.points / maxPoints) * 100 : 0;

    tbody.innerHTML += `
      <tr onclick="openProfile('${p.player}')"
          class="cursor-pointer hover:bg-slate-800 ${bg}">
        <td class="px-4 py-4 font-bold">
          ${i + 1}
          <span class="ml-2 ${color}">${arrow}</span>
        </td>
        <td class="px-4 py-4 font-semibold">${p.player}</td>
        <td class="px-4 py-4">
          ${p.points}
          <div class="w-full bg-slate-800 h-2 rounded mt-2">
            <div class="bg-blue-500 h-2 rounded" style="width:${width}%"></div>
          </div>
        </td>
        <td class="px-4 py-4">${p.matches}</td>
        <td class="px-4 py-4">${p.avg.toFixed(2)}</td>
      </tr>
    `;
  });
}
function openProfile(name) {
  const profile = document.getElementById("profile");

  // Get relevant rows
  const rows = raw.filter(r =>
    r.player === name &&
    (currentSeries === "ALL" || r.series === currentSeries)
  );

  if (rows.length === 0) return;

  // Find max match number
  const maxMatch = Math.max(...rows.map(r => r.match_no));

  let total = 0;
  let matchesPlayed = new Set();
  const matchMap = {};

  rows.forEach(r => {
    matchMap[r.match_no] = r.points;
    total += r.points;
    matchesPlayed.add(
      currentSeries === "ALL"
        ? `${r.series}-${r.match_no}`
        : r.match_no
    );
  });

  const avg = matchesPlayed.size ? (total / matchesPlayed.size).toFixed(2) : "0.00";

  // Build match-wise HTML
  let matchHTML = `<h4 class="mt-4 mb-2 font-semibold">
    ${currentSeries === "ALL" ? "Match Breakdown (All Series)" : `Match Breakdown (${currentSeries})`}
  </h4>`;

  matchHTML += `<div class="space-y-1 text-sm">`;

  if (currentSeries === "ALL") {
    // Group by series
    const seriesMap = {};
    rows.forEach(r => {
      if (!seriesMap[r.series]) seriesMap[r.series] = {};
      seriesMap[r.series][r.match_no] = r.points;
    });

    Object.keys(seriesMap).forEach(series => {
      const matches = seriesMap[series];
      const maxM = Math.max(...Object.keys(matches).map(Number));

      matchHTML += `<div class="mt-2 font-semibold text-slate-300">${series}</div>`;
      for (let i = 1; i <= maxM; i++) {
        matchHTML += `
          <div class="flex justify-between">
            <span>Match ${i}</span>
            <span>${matches[i] || 0} pts</span>
          </div>`;
      }
    });

  } else {
    // Single series
    for (let i = 1; i <= maxMatch; i++) {
      matchHTML += `
        <div class="flex justify-between">
          <span>Match ${i}</span>
          <span>${matchMap[i] || 0} pts</span>
        </div>`;
    }
  }

  matchHTML += `</div>`;

  document.getElementById("profileName").innerText = name;
  document.getElementById("profileData").innerHTML = `
    <p><b>View:</b> ${currentSeries === "ALL" ? "All-Time" : currentSeries}</p>
    <p><b>Total Points:</b> ${total}</p>
    <p><b>Matches:</b> ${matchesPlayed.size}</p>
    <p><b>Average:</b> ${avg}</p>
    ${matchHTML}
  `;

  profile.classList.remove("hidden");
  profile.classList.add("flex");
}
function closeProfile() {
  document.getElementById("profile").classList.add("hidden");
  document.getElementById("profile").classList.remove("flex");
}

loadData();
