import { session, esc, icon, initials } from "./app-shell.js";
import { db } from "./firebase.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { PROJECTS, PEOPLE } from "./sample-data.js";
import {
  STATUSES,
  listTasks,
  createTask,
  saveTask,
  removeTask,
} from "./task-store.js";
import {
  avatar,
  STATUS,
  toast,
  confirmDialog,
  emptyBox,
  errorBox,
  listSkeleton,
} from "./ui.js";

const $ = (s, r = document) => r.querySelector(s);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const SLABEL = Object.fromEntries(STATUSES);
const pid = new URLSearchParams(location.search).get("id");

let ctx,
  project,
  tasks = [],
  mode = "live",
  current = null,
  held = null,
  saveTimer = null;
const canEdit = () => mode !== "viewonly" && ctx.role !== "guest";
const shown = () => (mode === "empty" ? [] : tasks);
const byId = (id) => tasks.find((t) => t.id === id);
const colTasks = (s) =>
  shown()
    .filter((t) => t.status === s)
    .sort((a, b) => a.order - b.order);
const announce = (m) => {
  $("#announce").textContent = "";
  setTimeout(() => ($("#announce").textContent = m), 30);
};

/* Dates -------------------------------------------------------------------- */
const startToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const dueInfo = (t) => {
  if (!t.due) return null;
  const d = new Date(`${t.due}T00:00`);
  const diff = Math.round((d - startToday()) / 864e5);
  const label =
    diff === 0
      ? "Today"
      : diff === 1
        ? "Tomorrow"
        : new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
          }).format(d);
  return { label, diff, overdue: diff < 0 && t.status !== "done" };
};
const timeAgo = (iso) => {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso)) / 60000));
  return m < 60
    ? `${m}m ago`
    : m < 1440
      ? `${Math.round(m / 60)}h ago`
      : `${Math.round(m / 1440)}d ago`;
};
const person = (key) =>
  key && PEOPLE[key]
    ? avatar(key)
    : '<span class="avatar avatar--sm avatar--empty" title="Unassigned">–</span>';

/* Project loading ---------------------------------------------------------- */
async function loadProject() {
  const demo = PROJECTS.find((p) => p.id === pid);
  if (demo) return demo;
  if (!ctx.workspace || !pid) return null;
  const snap = await getDoc(
    doc(db, "workspaces", ctx.workspace.id, "projects", pid),
  );
  if (!snap.exists()) return null;
  const x = snap.data();
  return {
    id: snap.id,
    name: x.name,
    client: "Internal",
    due: "No deadline",
    progress: x.progress || 0,
    status: x.status || "active",
    dot: "#7f22fe",
    members: [{ name: ctx.name, initials: initials(ctx.name), color: "" }],
  };
}

/* Header ------------------------------------------------------------------- */
function renderHeader() {
  const [cls, label] = STATUS[project.status] || STATUS.active;
  document.title = `${project.name} — CoolTeam`;
  $("#page-title").textContent = project.name;
  $("#crumb-name").textContent = project.name;
  $("#proj-meta").innerHTML =
    `<span class="badge ${cls}">${label}</span><span>${esc(project.client)} · ${project.due.startsWith("No") ? esc(project.due) : `due ${esc(project.due)}`}</span><span class="avatar-stack">${project.members.map((m) => avatar(m)).join("")}</span>`;
  $("#banner").innerHTML = !canEdit()
    ? `<div class="banner banner--info" role="status"><span class="banner__icon" aria-hidden="true">${icon("lock")}</span><p class="banner__text"><strong>You have view-only access to this project.</strong>You can read tasks and comments. Ask a project manager if you need to make changes.</p></div>`
    : "";
  $("#add-task").hidden = !canEdit();
}

/* Overview ----------------------------------------------------------------- */
function renderOverview() {
  const el = $("#view-overview");
  if (mode === "loading") {
    el.innerHTML = `<div class="ov-grid"><div class="skeleton" style="--h:18rem;border-radius:1.2rem"></div><div class="skeleton" style="--h:18rem;border-radius:1.2rem"></div></div>`;
    return;
  }
  if (mode === "error") {
    el.innerHTML = `<section class="panel">${errorBox()}</section>`;
    return;
  }
  const list = shown();
  const done = list.filter((t) => t.status === "done").length;
  const pct = list.length
    ? Math.round((done / list.length) * 100)
    : project.progress;
  const overdue = list.filter((t) => dueInfo(t)?.overdue).length;
  const week = list.filter((t) => {
    const d = dueInfo(t);
    return d && d.diff >= 0 && d.diff <= 7 && t.status !== "done";
  }).length;
  const upcoming = list
    .filter((t) => t.status !== "done")
    .sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"))
    .slice(0, 5);
  const events = list
    .flatMap((t) => (t.activity || []).map((a) => ({ ...a, title: t.title })))
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 5);

  el.innerHTML = `<div class="ov-grid">
    <div class="ov-stack">
      <section class="panel" aria-labelledby="ov-progress">
        <div class="panel__head"><div><h2 class="panel__title" id="ov-progress">Progress</h2><p class="panel__sub">Based on completed tasks.</p></div></div>
        <div class="big-progress"><strong>${pct}%</strong><span>${done} of ${list.length} tasks done</span></div>
        <div class="progress" style="margin-top:1rem" role="progressbar" aria-label="Project progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span class="progress__bar" style="--value:${pct}%"></span></div>
        <div class="mini-stats">
          <div class="mini-stat"><strong>${list.length - done}</strong><span>Open</span></div>
          <div class="mini-stat"><strong>${done}</strong><span>Done</span></div>
          <div class="mini-stat"><strong>${overdue}</strong><span>Overdue</span></div>
          <div class="mini-stat"><strong>${week}</strong><span>Due this week</span></div>
        </div>
      </section>
      <section class="panel" aria-labelledby="ov-upcoming">
        <div class="panel__head"><div><h2 class="panel__title" id="ov-upcoming">Upcoming work</h2><p class="panel__sub">What needs attention next.</p></div></div>
        ${
          upcoming.length
            ? upcoming
                .map((t) => {
                  const d = dueInfo(t);
                  return `<button class="row-btn" type="button" data-open="${t.id}"><span class="row-btn__text"><span class="row-btn__title">${esc(t.title)}</span><span class="row-btn__meta">${SLABEL[t.status]}${d ? ` · <span class="${d.overdue ? "is-overdue" : ""}">${d.label}${d.overdue ? " · Overdue" : ""}</span>` : ""}</span></span>${person(t.assignee)}</button>`;
                })
                .join("")
            : emptyBox(
                "Nothing upcoming.",
                "Add a task to start planning the work.",
              )
        }
      </section>
    </div>
    <div class="ov-stack">
      <section class="panel" aria-labelledby="ov-team">
        <div class="panel__head"><h2 class="panel__title" id="ov-team">Team</h2></div>
        ${project.members
          .map((m) => {
            const p = typeof m === "string" ? PEOPLE[m] : m;
            return `<div class="person-row">${avatar(m, "md")}<span>${esc(p.name)}</span></div>`;
          })
          .join("")}
      </section>
      <section class="panel" aria-labelledby="ov-activity">
        <div class="panel__head"><h2 class="panel__title" id="ov-activity">Recent activity</h2></div>
        ${events.length ? `<ul class="activity-mini">${events.map((e) => `<li><strong>${esc(e.title)}</strong> — ${esc(e.text)} · ${timeAgo(e.at)}</li>`).join("")}</ul>` : emptyBox("You’re all caught up.", "Activity shows up as work moves.")}
      </section>
    </div></div>`;
}

/* Board -------------------------------------------------------------------- */
function cardHTML(t) {
  const due = dueInfo(t);
  const subs = t.subtasks || [];
  const done = subs.filter((s) => s.done).length;
  const edit = canEdit();
  return `<li class="card${held?.id === t.id ? " is-held" : ""}${edit ? "" : " is-readonly"}" tabindex="0" draggable="${edit}" data-id="${t.id}" aria-labelledby="ct-${t.id}" aria-describedby="board-help">
    ${t.labels?.length ? `<div class="card__labels">${t.labels.map((l) => `<span class="tag">${esc(l)}</span>`).join("")}</div>` : ""}
    <p class="card__title" id="ct-${t.id}">${esc(t.title)}</p>
    <div class="card__meta">
      ${due ? `<span class="${due.overdue ? "is-overdue" : ""}">${icon("calendar")}${due.label}${due.overdue ? " · Overdue" : ""}</span>` : ""}
      ${subs.length ? `<span>${icon("list-checks")}<span class="sr-only">Subtasks </span>${done}/${subs.length}</span>` : ""}
      ${t.comments?.length ? `<span>${icon("message-square")}<span class="sr-only">Comments </span>${t.comments.length}</span>` : ""}
    </div>
    <div class="card__foot"><span class="badge badge--${t.priority}">${cap(t.priority)}</span>
      <span class="card__actions">${person(t.assignee)}${edit ? `<button class="card__move" type="button" data-move="${t.id}" aria-label="Move “${esc(t.title)}” to another column" aria-haspopup="menu">${icon("more")}</button>` : ""}</span></div>
  </li>`;
}

function renderBoard() {
  const el = $("#board-body");
  if (mode === "loading") {
    el.innerHTML = `<div class="board" aria-hidden="true">${STATUSES.map(() => `<div class="column"><span class="skeleton" style="--w:40%;--h:1rem"></span>${[0, 1].map(() => `<div class="card"><span class="skeleton" style="--h:.85rem"></span><span class="skeleton" style="--w:60%;--h:.7rem;margin-top:.7rem"></span></div>`).join("")}</div>`).join("")}</div>`;
    return;
  }
  if (mode === "error") {
    el.innerHTML = `<section class="panel">${errorBox()}</section>`;
    return;
  }
  el.innerHTML = `<div class="board">${STATUSES.map(([key, label]) => {
    const list = colTasks(key);
    return `<section class="column" data-status="${key}" aria-labelledby="col-${key}">
      <header class="column__head"><h3 class="column__title" id="col-${key}">${label}</h3><span class="column__count" aria-label="${list.length} tasks">${list.length}</span></header>
      <ul class="column__list" data-status="${key}">${list.map(cardHTML).join("") || `<li class="column__empty">${canEdit() ? "Drop a task here" : "No tasks"}</li>`}</ul>
      ${canEdit() ? `<form class="quick-add" data-status="${key}"><label class="sr-only" for="qa-${key}">Add a task to ${label}</label><input id="qa-${key}" placeholder="+ Add task" maxlength="140" autocomplete="off"></form>` : ""}
    </section>`;
  }).join("")}</div>`;
}

/* List --------------------------------------------------------------------- */
function renderList() {
  const el = $("#view-list");
  if (mode === "loading") {
    el.innerHTML = `<section class="panel">${listSkeleton(5)}</section>`;
    return;
  }
  if (mode === "error") {
    el.innerHTML = `<section class="panel">${errorBox()}</section>`;
    return;
  }
  const list = shown()
    .slice()
    .sort(
      (a, b) =>
        STATUSES.findIndex(([k]) => k === a.status) -
          STATUSES.findIndex(([k]) => k === b.status) || a.order - b.order,
    );
  if (!list.length) {
    el.innerHTML = `<section class="panel">${emptyBox("No tasks yet.", "Add the first task to start planning this project.", canEdit() ? { label: "Add task", attr: "data-add" } : null)}</section>`;
    return;
  }
  el.innerHTML = `<div class="table-wrap"><table class="table"><caption class="sr-only">Tasks in ${esc(project.name)}</caption>
    <thead><tr><th scope="col">Task</th><th scope="col">Status</th><th scope="col">Assignee</th><th scope="col">Priority</th><th scope="col">Due</th></tr></thead>
    <tbody>${list
      .map((t) => {
        const d = dueInfo(t);
        return `<tr>
      <td data-label="Task"><button class="list-title${t.status === "done" ? " is-done" : ""}" type="button" data-open="${t.id}">${esc(t.title)}</button></td>
      <td data-label="Status"><select class="inline-select" data-status-for="${t.id}" aria-label="Status for ${esc(t.title)}"${canEdit() ? "" : " disabled"}>${STATUSES.map(([k, l]) => `<option value="${k}"${k === t.status ? " selected" : ""}>${l}</option>`).join("")}</select></td>
      <td data-label="Assignee"><span class="member">${person(t.assignee)}<span>${t.assignee ? esc(PEOPLE[t.assignee].name) : "Unassigned"}</span></span></td>
      <td data-label="Priority"><span class="badge badge--${t.priority}">${cap(t.priority)}</span></td>
      <td data-label="Due">${d ? `<span class="${d.overdue ? "is-overdue" : ""}">${d.label}${d.overdue ? " · Overdue" : ""}</span>` : "—"}</td></tr>`;
      })
      .join("")}</tbody></table></div>`;
}

function renderAll() {
  renderHeader();
  renderOverview();
  renderBoard();
  renderList();
}

/* Persisting moves --------------------------------------------------------- */
async function persist(t, snapshot) {
  try {
    await saveTask(ctx.workspace?.id, pid, t);
  } catch {
    Object.assign(t, snapshot);
    renderAll();
    toast("Couldn’t save that change. It has been undone.");
  }
}
function move(t, status, order, why = "Moved") {
  const snap = { status: t.status, order: t.order, activity: t.activity };
  if (t.status !== status)
    t.activity = [
      ...(t.activity || []),
      { text: `${why} to ${SLABEL[status]}`, at: new Date().toISOString() },
    ];
  t.status = status;
  t.order = order;
  renderAll();
  return persist(t, snap);
}
const orderFor = (status, ignoreId, beforeId) => {
  const arr = colTasks(status).filter((x) => x.id !== ignoreId);
  const idx = beforeId ? arr.findIndex((x) => x.id === beforeId) : arr.length;
  const prev = arr[idx - 1]?.order,
    next = arr[idx]?.order;
  return prev != null && next != null
    ? (prev + next) / 2
    : prev != null
      ? prev + 1000
      : next != null
        ? next - 1000
        : Date.now();
};

/* Board: mouse drag & drop ------------------------------------------------- */
const board = $("#board-body");
let dragId = null;
board.addEventListener("dragstart", (e) => {
  const c = e.target.closest(".card");
  if (!c || !canEdit()) return;
  dragId = c.dataset.id;
  e.dataTransfer.setData("text/plain", dragId);
  e.dataTransfer.effectAllowed = "move";
  requestAnimationFrame(() => c.classList.add("is-dragging"));
});
board.addEventListener("dragend", () => {
  dragId = null;
  board
    .querySelectorAll(".is-dragging,.is-over")
    .forEach((n) => n.classList.remove("is-dragging", "is-over"));
});
board.addEventListener("dragover", (e) => {
  const c = e.target.closest(".column");
  if (!c || !dragId) return;
  e.preventDefault();
  board
    .querySelectorAll(".is-over")
    .forEach((n) => n !== c && n.classList.remove("is-over"));
  c.classList.add("is-over");
});
board.addEventListener("drop", (e) => {
  const c = e.target.closest(".column");
  if (!c || !dragId) return;
  e.preventDefault();
  const status = c.dataset.status;
  const cards = [...c.querySelectorAll(".card:not(.is-dragging)")];
  const before = cards.find((n) => {
    const r = n.getBoundingClientRect();
    return e.clientY < r.top + r.height / 2;
  });
  const t = byId(dragId);
  const order = orderFor(status, dragId, before?.dataset.id);
  announce(`${t.title} moved to ${SLABEL[status]}.`);
  move(t, status, order);
});

/* Board: keyboard alternative ---------------------------------------------- */
const focusCard = (id) => $(`.card[data-id="${CSS.escape(id)}"]`)?.focus();
board.addEventListener("keydown", (e) => {
  const card = e.target.closest(".card");
  if (!card || e.target !== card) return;
  const t = byId(card.dataset.id);
  if (!held) {
    if (e.key === "Enter") {
      e.preventDefault();
      openTask(t.id);
    }
    if (e.key === " " && canEdit()) {
      e.preventDefault();
      held = {
        id: t.id,
        status: t.status,
        order: t.order,
        activity: t.activity,
      };
      card.classList.add("is-held");
      announce(
        `Picked up ${t.title}. Use left and right arrows to change column, up and down to reorder, space to drop, escape to cancel.`,
      );
    }
    return;
  }
  if (held.id !== t.id) return;
  const idx = STATUSES.findIndex(([k]) => k === t.status);
  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
    e.preventDefault();
    const ni = idx + (e.key === "ArrowRight" ? 1 : -1);
    if (ni < 0 || ni >= STATUSES.length) return;
    t.status = STATUSES[ni][0];
    t.order = (colTasks(t.status).at(-1)?.order || 0) + 1000;
    renderBoard();
    focusCard(t.id);
    announce(
      `${t.title}, ${SLABEL[t.status]}, position ${colTasks(t.status).findIndex((x) => x.id === t.id) + 1} of ${colTasks(t.status).length}.`,
    );
  } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
    e.preventDefault();
    const list = colTasks(t.status),
      i = list.findIndex((x) => x.id === t.id),
      j = i + (e.key === "ArrowDown" ? 1 : -1);
    if (j < 0 || j >= list.length) return;
    [t.order, list[j].order] = [list[j].order, t.order];
    renderBoard();
    focusCard(t.id);
    announce(`${t.title}, position ${j + 1} of ${list.length}.`);
  } else if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    const snap = held;
    held = null;
    if (t.status !== snap.status)
      t.activity = [
        ...(t.activity || []),
        { text: `Moved to ${SLABEL[t.status]}`, at: new Date().toISOString() },
      ];
    renderAll();
    focusCard(t.id);
    announce(`Dropped ${t.title} in ${SLABEL[t.status]}.`);
    persist(t, {
      status: snap.status,
      order: snap.order,
      activity: snap.activity,
    });
  } else if (e.key === "Escape") {
    e.preventDefault();
    Object.assign(t, {
      status: held.status,
      order: held.order,
      activity: held.activity,
    });
    held = null;
    renderAll();
    focusCard(t.id);
    announce("Move cancelled.");
  }
});
board.addEventListener("focusout", (e) => {
  if (
    held &&
    e.target.classList?.contains("card") &&
    !board.contains(e.relatedTarget)
  ) {
    /* keep held until dropped or cancelled */
  }
});

/* Board: move menu (touch-friendly) ---------------------------------------- */
let menu = null;
const closeMenu = () => {
  menu?.remove();
  menu = null;
};
board.addEventListener("click", (e) => {
  const mv = e.target.closest("[data-move]");
  if (mv) {
    e.stopPropagation();
    closeMenu();
    const t = byId(mv.dataset.move),
      r = mv.getBoundingClientRect();
    menu = document.createElement("div");
    menu.className = "menu move-menu";
    menu.setAttribute("role", "menu");
    menu.style.top = `${Math.min(r.bottom + 4, innerHeight - 260)}px`;
    menu.style.left = `${Math.max(8, Math.min(r.right - 180, innerWidth - 196))}px`;
    menu.innerHTML = STATUSES.map(
      ([k, l]) =>
        `<button type="button" role="menuitemradio" aria-checked="${k === t.status}" data-to="${k}">${l}${icon("check")}</button>`,
    ).join("");
    document.body.append(menu);
    menu.querySelector('[aria-checked="true"]').focus();
    menu.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-to]");
      if (!b) return;
      closeMenu();
      if (b.dataset.to !== t.status) {
        announce(`${t.title} moved to ${SLABEL[b.dataset.to]}.`);
        move(t, b.dataset.to, orderFor(b.dataset.to, t.id));
        focusCard(t.id);
      }
    });
    menu.addEventListener("keydown", (ev) => {
      const items = [...menu.querySelectorAll("button")],
        i = items.indexOf(document.activeElement);
      if (ev.key === "ArrowDown") {
        ev.preventDefault();
        items[(i + 1) % items.length].focus();
      }
      if (ev.key === "ArrowUp") {
        ev.preventDefault();
        items[(i - 1 + items.length) % items.length].focus();
      }
      if (ev.key === "Escape") {
        closeMenu();
        focusCard(t.id);
      }
    });
    return;
  }
  const card = e.target.closest(".card");
  if (card && !held) openTask(card.dataset.id);
});
document.addEventListener("click", (e) => {
  if (menu && !menu.contains(e.target)) closeMenu();
});

/* Quick add ---------------------------------------------------------------- */
board.addEventListener("submit", async (e) => {
  const f = e.target.closest(".quick-add");
  if (!f) return;
  e.preventDefault();
  const input = f.querySelector("input"),
    title = input.value.trim();
  if (!title) return;
  const status = f.dataset.status;
  input.disabled = true;
  try {
    const t = await createTask(ctx.workspace?.id, pid, {
      title,
      status,
      order: (colTasks(status).at(-1)?.order || 0) + 1000,
    });
    tasks.push(t);
    renderAll();
    $(`#qa-${status}`)?.focus();
    announce(`Added ${title} to ${SLABEL[status]}.`);
  } catch {
    toast("Couldn’t add that task. Check your connection and try again.");
    input.disabled = false;
  }
});
$("#add-task").addEventListener("click", () => {
  selectTab($("#tab-board"));
  $("#qa-todo")?.focus();
});

/* Tabs --------------------------------------------------------------------- */
const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(tab, focus = false) {
  tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute("aria-selected", String(on));
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
  });
  if (focus) tab.focus();
  history.replaceState(
    null,
    "",
    `?id=${encodeURIComponent(pid)}#${tab.id.replace("tab-", "")}`,
  );
}
tabs.forEach((t, i) => {
  t.addEventListener("click", () => selectTab(t));
  t.addEventListener("keydown", (e) => {
    const m = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (m) {
      e.preventDefault();
      selectTab(tabs[(i + m + tabs.length) % tabs.length], true);
    }
  });
});

/* Overview / list interactions -------------------------------------------- */
document.addEventListener("click", (e) => {
  const open = e.target.closest("[data-open]");
  if (open) openTask(open.dataset.open);
  if (e.target.closest("[data-add]")) {
    selectTab($("#tab-board"));
    $("#qa-todo")?.focus();
  }
  if (e.target.closest("[data-retry]")) {
    $('input[value="live"]').checked = true;
    mode = "live";
    boot();
  }
});
$("#view-list").addEventListener("change", (e) => {
  const s = e.target.closest("[data-status-for]");
  if (!s) return;
  const t = byId(s.dataset.statusFor);
  move(t, s.value, orderFor(s.value, t.id));
  announce(`${t.title} moved to ${SLABEL[s.value]}.`);
});

/* Task drawer -------------------------------------------------------------- */
const drawer = $("#drawer");
const F = {
  title: $("#d-title"),
  status: $("#d-status"),
  priority: $("#d-priority"),
  assignee: $("#d-assignee"),
  due: $("#d-due"),
  desc: $("#d-desc"),
  labelIn: $("#d-label-input"),
  subIn: $("#d-sub-input"),
  comment: $("#d-comment"),
};
F.status.innerHTML = STATUSES.map(
  ([k, l]) => `<option value="${k}">${l}</option>`,
).join("");
F.assignee.innerHTML = `<option value="">Unassigned</option>${Object.entries(
  PEOPLE,
)
  .map(([k, p]) => `<option value="${k}">${p.name}</option>`)
  .join("")}`;

function setState(state) {
  const el = $("#d-state");
  el.dataset.state = state;
  el.innerHTML =
    state === "saving"
      ? "Saving…"
      : state === "error"
        ? `${icon("alert-circle")}Couldn’t save · <button type="button" id="d-retry">Retry</button>`
        : state === "editing"
          ? "Editing…"
          : `${icon("check")}Saved`;
}

function openTask(id) {
  current = byId(id);
  if (!current) return;
  const ro = !canEdit();
  F.title.value = current.title;
  F.status.value = current.status;
  F.priority.value = current.priority;
  F.assignee.value = current.assignee || "";
  F.due.value = current.due || "";
  F.desc.value = current.description || "";
  F.labelIn.value = F.subIn.value = F.comment.value = "";
  [
    F.title,
    F.status,
    F.priority,
    F.assignee,
    F.due,
    F.desc,
    F.labelIn,
    F.subIn,
  ].forEach((x) => (x.disabled = ro));
  $("#d-readonly").hidden = !ro;
  $("#d-delete").hidden = ro;
  $("#d-comment-form").querySelector("button").disabled = false;
  renderDrawerLists();
  setState("saved");
  if (!drawer.open) drawer.showModal();
  F.title.focus({ preventScroll: true });
}

function renderDrawerLists() {
  const t = current,
    ro = !canEdit();
  $("#d-labels").innerHTML = (t.labels || [])
    .map(
      (l, i) =>
        `<span class="tag">${esc(l)}${ro ? "" : `<button type="button" data-rm-label="${i}" aria-label="Remove label ${esc(l)}">${icon("x")}</button>`}</span>`,
    )
    .join("");
  const subs = t.subtasks || [];
  $("#d-sub-count").textContent = subs.length
    ? `· ${subs.filter((s) => s.done).length}/${subs.length}`
    : "";
  $("#d-subs").innerHTML = subs
    .map(
      (s, i) =>
        `<div class="sub${s.done ? " is-done" : ""}"><input type="checkbox" id="sub-${i}" data-sub="${i}"${s.done ? " checked" : ""}${ro ? " disabled" : ""}><label for="sub-${i}" style="flex:1">${esc(s.text)}</label>${ro ? "" : `<button class="btn-text" type="button" data-rm-sub="${i}" aria-label="Remove subtask ${esc(s.text)}">Remove</button>`}</div>`,
    )
    .join("");
  $("#d-comments").innerHTML =
    (t.comments || [])
      .map(
        (c) =>
          `<div class="comment">${avatar({ name: c.name, initials: c.initials, color: c.color || "" }, "md")}<div><strong>${esc(c.name)}</strong><small>${timeAgo(c.at)}</small><p>${esc(c.text)}</p></div></div>`,
      )
      .join("") || `<p class="settings-note">No comments yet.</p>`;
  $("#d-activity").innerHTML = (t.activity || [])
    .slice()
    .reverse()
    .slice(0, 6)
    .map((a) => `<li>${esc(a.text)} · ${timeAgo(a.at)}</li>`)
    .join("");
}

function touch(note) {
  if (!current || !canEdit()) return;
  const t = current,
    prevStatus = t.status,
    prevAssignee = t.assignee;
  t.title = F.title.value.trim() || t.title;
  t.status = F.status.value;
  t.priority = F.priority.value;
  t.assignee = F.assignee.value;
  t.due = F.due.value;
  t.description = F.desc.value;
  t.activity = t.activity || [];
  if (t.status !== prevStatus)
    t.activity.push({
      text: `Moved to ${SLABEL[t.status]}`,
      at: new Date().toISOString(),
    });
  if (t.assignee !== prevAssignee)
    t.activity.push({
      text: t.assignee
        ? `Assigned to ${PEOPLE[t.assignee].name}`
        : "Unassigned",
      at: new Date().toISOString(),
    });
  if (note) t.activity.push({ text: note, at: new Date().toISOString() });
  setState("saving");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await saveTask(ctx.workspace?.id, pid, t);
      setState("saved");
      renderAll();
      renderDrawerLists();
    } catch {
      setState("error");
    }
  }, 500);
}
[F.title, F.desc].forEach((x) =>
  x.addEventListener("input", () => {
    setState("editing");
    touch();
  }),
);
[F.status, F.priority, F.assignee, F.due].forEach((x) =>
  x.addEventListener("change", () => touch()),
);
F.title.addEventListener("keydown", (e) => {
  if (e.key === "Enter") e.preventDefault();
});

F.labelIn.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  const v = F.labelIn.value.trim();
  if (!v) return;
  if (!(current.labels || []).some((l) => l.toLowerCase() === v.toLowerCase()))
    current.labels = [...(current.labels || []), v];
  F.labelIn.value = "";
  renderDrawerLists();
  touch();
});
F.subIn.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  const v = F.subIn.value.trim();
  if (!v) return;
  current.subtasks = [...(current.subtasks || []), { text: v, done: false }];
  F.subIn.value = "";
  renderDrawerLists();
  touch();
});
drawer.addEventListener("click", (e) => {
  const rl = e.target.closest("[data-rm-label]"),
    rs = e.target.closest("[data-rm-sub]");
  if (rl) {
    current.labels.splice(Number(rl.dataset.rmLabel), 1);
    renderDrawerLists();
    touch();
  }
  if (rs) {
    current.subtasks.splice(Number(rs.dataset.rmSub), 1);
    renderDrawerLists();
    touch();
  }
  if (e.target.closest("#d-retry")) touch();
  if (e.target === drawer) drawer.close();
});
drawer.addEventListener("change", (e) => {
  const s = e.target.closest("[data-sub]");
  if (!s) return;
  current.subtasks[Number(s.dataset.sub)].done = s.checked;
  renderDrawerLists();
  touch();
});
$("#d-comment-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = F.comment.value.trim();
  if (!v) return;
  current.comments = [
    ...(current.comments || []),
    {
      name: ctx.name,
      initials: initials(ctx.name),
      color: "",
      text: v,
      at: new Date().toISOString(),
    },
  ];
  F.comment.value = "";
  renderDrawerLists();
  touch("Added a comment");
});
$("#d-close").addEventListener("click", () => drawer.close());
$("#d-done").addEventListener("click", () => drawer.close());
drawer.addEventListener("close", () => {
  clearTimeout(saveTimer);
  if (current && $("#d-state").dataset.state === "saving")
    saveTask(ctx.workspace?.id, pid, current).catch(() => {});
  current = null;
  renderAll();
});

$("#d-delete").addEventListener("click", async () => {
  const t = current;
  const ok = await confirmDialog({
    title: "Delete this task?",
    text: `“${t.title}” and its comments will be removed for everyone on this project.`,
    confirmLabel: "Delete task",
    danger: true,
  });
  if (!ok) return;
  try {
    await removeTask(ctx.workspace?.id, pid, t.id);
    tasks = tasks.filter((x) => x.id !== t.id);
    current = null;
    drawer.close();
    renderAll();
    toast("Task deleted");
  } catch {
    toast("Couldn’t delete the task. Try again.");
  }
});

/* Modes + boot ------------------------------------------------------------- */
document.querySelectorAll('input[name="mode"]').forEach((r) =>
  r.addEventListener("change", () => {
    mode = r.value;
    renderAll();
  }),
);

async function boot() {
  mode = "loading";
  renderAll();
  try {
    project = await loadProject();
    if (!project) {
      $("#main").innerHTML =
        `<section class="panel">${emptyBox("This project doesn’t exist.", "It may have been deleted, or the link is wrong. Head back to your projects to pick another.", { href: "projects.html", label: "Back to projects" })}</section>`;
      $("#page-title").textContent = "Project not found";
      return;
    }
    tasks = await listTasks(ctx.workspace?.id, pid);
    mode = document.querySelector('input[name="mode"]:checked').value;
    if (mode === "loading") mode = "live";
    renderAll();
    $("#status").textContent =
      `${project.name} loaded with ${tasks.length} tasks.`;
  } catch {
    mode = "error";
    renderAll();
  }
}

session.then((s) => {
  ctx = s;
  const start = tabs.find((t) => t.id === `tab-${location.hash.slice(1)}`);
  if (start) selectTab(start);
  boot();
});
