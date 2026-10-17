import { session, esc, icon } from "./app-shell.js";
import { avatar, emptyBox } from "./ui.js";
import { inDays } from "./sample-data.js";

const body = document.getElementById("tasks-body");
const status = document.getElementById("status");

const tasks = [
  {
    id: 1,
    title: "Collect visual references for the campaign",
    project: "Northstar identity",
    meta: `${inDays(0)} · Backlog`,
    priority: "low",
    assignee: "olanma",
    done: false,
  },
  {
    id: 2,
    title: "Map the new client onboarding flow",
    project: "Northstar identity",
    meta: `${inDays(1)} · To Do`,
    priority: "high",
    assignee: "warwick",
    done: false,
  },
  {
    id: 3,
    title: "Build out the brand motion studies",
    project: "Northstar identity",
    meta: `${inDays(2)} · In Progress`,
    priority: "high",
    assignee: "olanma",
    done: false,
  },
  {
    id: 4,
    title: "Prepare version three for client review",
    project: "Northstar identity",
    meta: "Today · Review",
    priority: "medium",
    assignee: "handsome",
    done: false,
  },
];
let filter = "open";

function render() {
  const list = tasks.filter(
    (t) => filter === "all" || (filter === "done" ? t.done : !t.done),
  );
  if (!list.length) {
    body.innerHTML =
      filter === "done"
        ? emptyBox(
            "Nothing finished yet.",
            "Completed tasks will collect here.",
          )
        : emptyBox(
            "No tasks assigned to you.",
            "When work is assigned, it will appear here.",
          );
    return;
  }
  body.innerHTML = `<ul class="task-list">${list
    .map(
      (t) => `
    <li class="task-row${t.done ? " is-done" : ""}">
      <button class="task-check" type="button" data-id="${t.id}" aria-pressed="${t.done}" aria-label="Mark “${esc(t.title)}” as ${t.done ? "not done" : "done"}">${icon("check")}</button>
      <div class="task-row__text">
        <p class="task-row__title">${esc(t.title)}</p>
        <p class="task-row__meta">${esc(t.project)} · ${esc(t.meta)}</p>
      </div>
      <div class="task-row__side">
        <span class="badge badge--${t.priority}">${t.priority[0].toUpperCase() + t.priority.slice(1)}</span>
        ${avatar(t.assignee)}
      </div>
    </li>`,
    )
    .join("")}</ul>`;
  status.textContent = `${list.length} task${list.length === 1 ? "" : "s"} shown.`;
}

document.querySelectorAll('input[name="filter"]').forEach((r) =>
  r.addEventListener("change", () => {
    filter = r.value;
    render();
  }),
);
body.addEventListener("click", (e) => {
  const b = e.target.closest(".task-check");
  if (!b) return;
  const t = tasks.find((x) => x.id === Number(b.dataset.id));
  t.done = !t.done;
  const row = b.closest(".task-row");
  row.classList.toggle("is-done", t.done);
  b.setAttribute("aria-pressed", String(t.done));
  if (filter !== "all") setTimeout(render, 450);
});

session.then(render);
