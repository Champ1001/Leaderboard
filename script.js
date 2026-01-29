const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ2GT8KWEkO26Zegh2rX8iImmx2Ncg0JeVb9YsMkpfbzTDRu-W4xMyG4fveUjfofGvQekllYvidT7a9/pub?gid=0&single=true&output=csv";

let rawData = [];

async function loadData() {
  const res = await fetch(CSV_URL + "&t=" + Date.now());

  const text = await res.text();

  const rows = text.trim().split("\n").slice(1);

  rawData = rows.map(r => {
    const [series, player, points, matches, order] = r.split(",");
    return {
      series,
      player,
      points: Number(points),
      matches: Number(matches),
      order: Number(order)
    };
  });

  setupSeries();
}

function setupSeries() {
  const select = document.getElementById("seriesSelect");
  const seriesSet = new Set(rawData.map(r => r.series));

  select.innerHTML = `<option value="ALL">🌍 All-Time</option>`;
  seriesSet.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    select.appendChild(opt);
  });

  select.onchange = () => render(select.value);
  render("ALL");
}

function render(series) {
  let data = [];

  if (series === "ALL") {
    const map = {};
    rawData.forEach(r => {
      if (!map[r.player]) map[r.player] = { points: 0, matches: 0 };
      map[r.player].points += r.points;
      map[r.player].matches += r.matches;
    });

    data = Object.entries(map).map(([player, v]) => ({
      player,
      points: v.points,
      matches: v.matches
    }));
  } else {
    data = rawData.filter(r => r.series === series);
  }

  data.sort((a, b) => b.points - a.points);

  const tbody = document.getElementById("leaderboard");
  tbody.innerHTML = "";

  data.forEach((p, i) => {
    const avg = p.matches ? (p.points / p.matches).toFixed(2) : "0.00";
    tbody.innerHTML += `
      <tr onclick="openProfile('${p.player}')">
        <td>${i + 1}</td>
        <td>${p.player}</td>
        <td>${p.points}</td>
        <td>${p.matches}</td>
        <td>${avg}</td>
      </tr>
    `;
  });
}

function openProfile(name) {
  const profile = document.getElementById("profile");
  const data = rawData.filter(r => r.player === name);

  let totalPoints = 0, totalMatches = 0;

  let html = "<ul>";
  data.forEach(r => {
    totalPoints += r.points;
    totalMatches += r.matches;
    html += `<li>${r.series}: ${r.points} pts, ${r.matches} matches</li>`;
  });
  html += "</ul>";

  document.getElementById("profileName").innerText = name;
  document.getElementById("profileData").innerHTML = `
    <p><b>Total Points:</b> ${totalPoints}</p>
    <p><b>Total Matches:</b> ${totalMatches}</p>
    <p><b>Average:</b> ${(totalPoints / totalMatches).toFixed(2)}</p>
    <h4>Series Breakdown</h4>
    ${html}
  `;

  profile.classList.remove("hidden");
}

function closeProfile() {
  document.getElementById("profile").classList.add("hidden");
}

loadData();
