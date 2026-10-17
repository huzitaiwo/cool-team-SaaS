import { session, esc } from "./app-shell.js";
import { PROJECTS } from "./sample-data.js";
import { STATUS } from "./ui.js";

const $ = (s) => document.querySelector(s);

const DATA = {
  7: {
    completion: 78,
    cycle: "5.1d",
    delta: "-0.2d vs. prior period",
    overdue: 1,
    workload: 61,
    bars: [4, 7, 5, 9, 6, 8, 10, 7, 9, 6, 8, 11],
  },
  30: {
    completion: 84,
    cycle: "4.8d",
    delta: "-0.7d vs. prior period",
    overdue: 1,
    workload: 68,
    bars: [22, 38, 28, 52, 34, 60, 46, 72, 54, 66, 42, 58],
  },
  90: {
    completion: 81,
    cycle: "5.3d",
    delta: "+0.1d vs. prior period",
    overdue: 2,
    workload: 72,
    bars: [90, 120, 104, 138, 112, 150, 126, 160, 134, 148, 118, 142],
  },
};

function stat(label, value, note, tone) {
  return `<article class="stat"><h2 class="stat__label">${label}</h2><p class="stat__value">${value}</p><p class="stat__note stat__note--${tone}">${note}</p></article>`;
}

function render() {
  const days = $("#range").value;
  const d = DATA[days];

  $("#stats").innerHTML =
    stat("Completion", `${d.completion}%`, "On track", "good") +
    stat(
      "Average cycle",
      d.cycle,
      d.delta,
      d.delta.startsWith("-") ? "good" : "warn",
    ) +
    stat("Overdue", d.overdue, "Needs attention", "warn") +
    stat(
      "Workload",
      `${d.workload}%`,
      d.workload > 80 ? "Near capacity" : "Healthy range",
      d.workload > 80 ? "warn" : "good",
    );

  const max = Math.max(...d.bars);
  const span = Math.round((days / d.bars.length) * 10) / 10;
  $("#chart-sub").textContent = `${days} days · Completed work over time`;
  $("#chart").setAttribute("aria-labelledby", "chart-caption");
  $("#chart").innerHTML = d.bars
    .map(
      (v, i) =>
        `<span class="chart__bar" style="--h:${Math.round((v / max) * 100)}%;--n:${i}" title="${v} tasks"></span>`,
    )
    .join("");
  $("#chart-caption").textContent =
    `Bar chart of tasks completed across the last ${days} days, in ${d.bars.length} intervals. Highest interval: ${max} tasks.`;
  $("#chart-table").innerHTML =
    `<caption>Tasks completed per interval</caption><thead><tr><th scope="col">Interval</th><th scope="col">Tasks</th></tr></thead><tbody>${d.bars.map((v, i) => `<tr><td>Interval ${i + 1} (~${span} days)</td><td>${v}</td></tr>`).join("")}</tbody>`;

  $("#health").innerHTML = PROJECTS.slice(0, 3)
    .map((p) => {
      const [cls, label] = STATUS[p.status];
      const tone =
        p.status === "at-risk" ? "progress__bar--amber" : "progress__bar--teal";
      return `<div class="health-row">
      <div class="health-row__top"><span>${esc(p.name)}</span><span class="badge ${cls}">${label}</span></div>
      <div class="progress" role="progressbar" aria-label="${esc(p.name)} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p.progress}"><span class="progress__bar ${tone}" style="--value:${p.progress}%"></span></div>
    </div>`;
    })
    .join("");

  $("#status").textContent = `Analytics updated for the last ${days} days.`;
}

$("#range").addEventListener("change", render);
session.then(render);
