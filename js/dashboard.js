import { session, esc, icon, initials } from "./app-shell.js";
import { PEOPLE, fetchDashboard } from "./sample-data.js";

const $ = (s) => document.querySelector(s);
const els = {
  stats: $("#stats"),
  projects: $("#projects-body"),
  tasks: $("#tasks-body"),
  workload: $("#workload-body"),
  activity: $("#activity-body"),
  status: $("#dash-status"),
};

/* Greeting + date ---------------------------------------------------------- */
function setGreeting(firstName) {
  const h = new Date().getHours();
  const part = h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
  $("#page-title").textContent = `Good ${part}, ${firstName}.`;
  $("#page-eyebrow").textContent = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

/* Small renderers ---------------------------------------------------------- */
const avatar = (key, size = "sm") => {
  const p = PEOPLE[key];
  return `<span class="avatar avatar--${size}${p.color ? ` avatar--${p.color}` : ""}" title="${esc(p.name)}">${esc(p.initials)}</span>`;
};
const STATUS = {
  "on-track": ["badge--success", "On track"],
  "at-risk": ["badge--warning", "At risk"],
  delayed: ["badge--danger", "Delayed"],
};

const statsHTML = (stats, mode) =>
  stats
    .map(
      (s) => `
    <article class="stat">
      <div class="stat__top">
        <h2 class="stat__label">${esc(s.label)}</h2>
        <span class="stat__tile stat__tile--${s.tone}" aria-hidden="true">${icon(s.icon)}</span>
      </div>
      <p class="stat__value">${mode === "error" ? "—" : mode === "empty" ? 0 : s.value}</p>
      <p class="stat__note">${mode === "error" ? "Couldn’t load" : mode === "empty" ? "Nothing yet" : esc(s.note)}</p>
    </article>`,
    )
    .join("");

const statsSkeleton = () =>
  Array.from(
    { length: 4 },
    () => `
    <article class="stat" aria-hidden="true">
      <div class="stat__top"><span class="skeleton" style="--w:6rem;--h:.8rem"></span><span class="skeleton" style="--w:2.4rem;--h:2.4rem;border-radius:.75rem"></span></div>
      <span class="skeleton" style="--w:3.5rem;--h:2.2rem;margin-top:.7rem"></span>
      <span class="skeleton" style="--w:70%;--h:.7rem;margin-top:.7rem"></span>
    </article>`,
  ).join("");

const projectsHTML = (projects) => `
  <div class="project-grid">
    ${projects
      .map((p) => {
        const [cls, label] = STATUS[p.status];
        return `
      <article class="project-card">
        <div class="project-card__top">
          <span class="project-card__dot" style="--dot:${p.dot}" aria-hidden="true"></span>
          <span class="badge ${cls}">${label}</span>
        </div>
        <h3 class="project-card__title">${esc(p.name)}</h3>
        <p class="project-card__meta">${esc(p.client)} · due ${esc(p.due)}</p>
        <div class="project-card__foot">
          <div class="project-card__progress">
            <div class="progress" role="progressbar" aria-label="${esc(p.name)} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p.progress}">
              <span class="progress__bar" style="--value:${p.progress}%"></span>
            </div>
            <span>${p.progress}% complete</span>
          </div>
          <span class="avatar-stack">${p.members.map((m) => avatar(m)).join("")}</span>
        </div>
      </article>`;
      })
      .join("")}
  </div>`;

const projectsSkeleton = () => `
  <div class="project-grid" aria-hidden="true">
    ${Array.from(
      { length: 4 },
      () => `
      <div class="project-card">
        <div class="project-card__top"><span class="skeleton" style="--w:.55rem;--h:.55rem" ></span><span class="skeleton" style="--w:4.5rem;--h:1.4rem;border-radius:99px"></span></div>
        <span class="skeleton" style="--w:70%;--h:1.3rem;margin-top:1.1rem"></span>
        <span class="skeleton" style="--w:50%;--h:.7rem;margin-top:.7rem"></span>
        <span class="skeleton" style="--h:.4rem;margin-top:1.4rem"></span>
      </div>`,
    ).join("")}
  </div>`;

const tasksHTML = (tasks) => `
  <ul class="task-list">
    ${tasks
      .map(
        (t) => `
      <li class="task-row" data-task="${t.id}">
        <button class="task-check" type="button" aria-pressed="false" aria-label="Mark “${esc(t.title)}” as done">${icon("check")}</button>
        <div class="task-row__text">
          <p class="task-row__title">${esc(t.title)}</p>
          <p class="task-row__meta">${esc(t.meta)}</p>
        </div>
        ${avatar(t.assignee)}
      </li>`,
      )
      .join("")}
  </ul>`;

const listSkeleton = (n, withAvatar = true) => `
  <div class="task-list" aria-hidden="true">
    ${Array.from(
      { length: n },
      () => `
      <div class="task-row">
        ${withAvatar ? '<span class="skeleton skeleton--round" style="--w:2.2rem;--h:2.2rem;flex:none"></span>' : '<span class="skeleton skeleton--round" style="--w:1.4rem;--h:1.4rem;flex:none"></span>'}
        <div class="task-row__text"><span class="skeleton" style="--w:80%;--h:.85rem"></span><span class="skeleton" style="--w:40%;--h:.65rem;margin-top:.5rem"></span></div>
      </div>`,
    ).join("")}
  </div>`;

const workloadHTML = (rows) => `
  <div class="meter-list">
    ${rows
      .map((r) => {
        const p = PEOPLE[r.person];
        const high = r.planned >= 80;
        return `
      <div class="meter">
        ${avatar(r.person, "lg")}
        <div class="meter__body">
          <div class="meter__row"><strong>${esc(p.name)}</strong><span>${r.planned}% planned${high ? '<span class="sr-only"> — near capacity</span>' : ""}</span></div>
          <div class="progress" role="progressbar" aria-label="${esc(p.name)} workload" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${r.planned}">
            <span class="progress__bar ${high ? "progress__bar--amber" : "progress__bar--teal"}" style="--value:${r.planned}%"></span>
          </div>
        </div>
      </div>`;
      })
      .join("")}
  </div>`;

const activityHTML = (items) => `
  <ul class="activity-list">
    ${items
      .map(
        (a) => `
      <li class="activity">
        ${avatar(a.person, "md")}
        <p class="activity__text"><strong>${esc(PEOPLE[a.person].name)}</strong> ${esc(a.verb)} <a href="#">${esc(a.target)}</a></p>
        <time>${esc(a.time)}</time>
      </li>`,
      )
      .join("")}
  </ul>`;

const emptyBox = (title, text, action) => `
  <div class="state-box">
    <span class="state-box__icon" aria-hidden="true">${icon("sparkles")}</span>
    <h3>${title}</h3><p>${text}</p>
    ${action ? `<a class="btn btn--primary" href="${action.href}">${action.label}</a>` : ""}
  </div>`;

const errorBox = () => `
  <div class="state-box" role="alert">
    <span class="state-box__icon state-box__icon--error" aria-hidden="true">${icon("alert-circle")}</span>
    <h3>We couldn’t load this section</h3>
    <p>The connection dropped before the data arrived. Check your network, then try again—nothing has been changed.</p>
    <button class="btn btn--primary" type="button" data-retry>${icon("refresh")} Try again</button>
  </div>`;

/* State machine ------------------------------------------------------------ */
let token = 0;

async function setState(mode) {
  const run = ++token;
  const panels = ["projects", "tasks", "workload", "activity"];

  if (mode === "loading") {
    els.stats.innerHTML = statsSkeleton();
    els.projects.innerHTML = projectsSkeleton();
    els.tasks.innerHTML = listSkeleton(4);
    els.workload.innerHTML = listSkeleton(4);
    els.activity.innerHTML = listSkeleton(4);
    panels.forEach((p) => els[p].setAttribute("aria-busy", "true"));
    els.status.textContent = "Loading dashboard…";
    return;
  }
  panels.forEach((p) => els[p].removeAttribute("aria-busy"));

  if (mode === "error") {
    els.stats.innerHTML = statsHTML(
      await import("./sample-data.js").then((m) => m.STATS),
      "error",
    );
    panels.forEach((p) => (els[p].innerHTML = errorBox()));
    els.status.textContent = "We couldn’t load the dashboard.";
    return;
  }

  if (mode === "empty") {
    els.stats.innerHTML = statsHTML(
      await import("./sample-data.js").then((m) => m.STATS),
      "empty",
    );
    els.projects.innerHTML = emptyBox(
      "Your workspace is ready for its first project.",
      "Create a project to bring briefs, people, and deadlines into one calm place.",
      { href: "projects.html#new", label: "Create project" },
    );
    els.tasks.innerHTML = emptyBox(
      "No tasks assigned to you.",
      "When work is assigned, the most useful few will appear here.",
    );
    els.workload.innerHTML = emptyBox(
      "Capacity will appear here.",
      "Invite teammates and assign work to see who has room.",
      { href: "team.html#invite", label: "Invite a member" },
    );
    els.activity.innerHTML = emptyBox(
      "You’re all caught up.",
      "Comments, reviews, and handoffs will show up as your team works.",
    );
    els.status.textContent = "Dashboard is empty.";
    return;
  }

  // default → show skeletons briefly while data loads
  setState("loading");
  try {
    const data = await fetchDashboard();
    if (run !== token - 1 && run !== token) return;
    if (run !== token) return;
    token = run;
    els.stats.innerHTML = statsHTML(data.stats, "default");
    els.projects.innerHTML = projectsHTML(data.projects);
    els.tasks.innerHTML = tasksHTML(data.tasks);
    els.workload.innerHTML = workloadHTML(data.workload);
    els.activity.innerHTML = activityHTML(data.activity);
    panels.forEach((p) => els[p].removeAttribute("aria-busy"));
    els.status.textContent = "Dashboard loaded.";
  } catch {
    if (run === token) setState("error");
  }
}

/* Events ------------------------------------------------------------------- */
document
  .querySelectorAll('input[name="state"]')
  .forEach((radio) =>
    radio.addEventListener("change", () => setState(radio.value)),
  );

document.addEventListener("click", (e) => {
  if (e.target.closest("[data-retry]")) {
    document.querySelector('input[name="state"][value="default"]').checked =
      true;
    setState("default");
  }
  const check = e.target.closest(".task-check");
  if (check) {
    const done = check.getAttribute("aria-pressed") !== "true";
    check.setAttribute("aria-pressed", String(done));
    check.closest(".task-row").classList.toggle("is-done", done);
  }
});

/* Boot --------------------------------------------------------------------- */
session.then(({ firstName }) => {
  setGreeting(firstName);
  const initial = new URLSearchParams(location.search).get("state");
  const mode = ["loading", "empty", "error"].includes(initial)
    ? initial
    : "default";
  const radio = document.querySelector(`input[name="state"][value="${mode}"]`);
  if (radio) radio.checked = true;
  setState(mode);
});
