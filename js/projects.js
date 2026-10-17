import { session, esc, icon, initials } from "./app-shell.js";
import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { PROJECTS } from "./sample-data.js";
import {
  projectsGridHTML,
  projectsSkeleton,
  emptyBox,
  errorBox,
} from "./ui.js";

const $ = (s) => document.querySelector(s);
const body = $("#projects-body");
const FILTERS = [
  ["all", "All projects"],
  ["on-track", "On track"],
  ["at-risk", "At risk"],
  ["active", "Active"],
  ["planning", "Planning"],
  ["on-hold", "On hold"],
];

let ctx = null,
  all = [],
  view = "grid",
  status = "all",
  q = "",
  mode = "default";

async function load() {
  body.innerHTML = projectsSkeleton(3, 6);
  body.setAttribute("aria-busy", "true");
  try {
    let own = [];
    if (ctx.workspace) {
      const snap = await getDocs(
        query(
          collection(db, "workspaces", ctx.workspace.id, "projects"),
          orderBy("createdAt", "desc"),
        ),
      );
      own = snap.docs.map((d) => {
        const x = d.data();
        return {
          id: d.id,
          name: x.name,
          client: "Internal",
          due: "No deadline",
          progress: x.progress || 0,
          status: x.status || "active",
          dot: "#7f22fe",
          members: [
            { name: ctx.name, initials: initials(ctx.name), color: "" },
          ],
        };
      });
    }
    all = [...own, ...PROJECTS];
    body.removeAttribute("aria-busy");
    render();
  } catch {
    body.removeAttribute("aria-busy");
    body.innerHTML = errorBox();
  }
}

function render() {
  if (mode === "loading") {
    body.innerHTML = projectsSkeleton(3, 6);
    return;
  }
  if (mode === "error") {
    body.innerHTML = errorBox();
    return;
  }
  if (mode === "empty") {
    body.innerHTML = emptyBox(
      "Your workspace is ready for its first project.",
      "Create a project to bring briefs, people, and deadlines into one calm place.",
      { label: "Create project", attr: "data-new-project" },
    );
    return;
  }
  const term = q.trim().toLowerCase();
  const list = all.filter(
    (p) =>
      (status === "all" || p.status === status) &&
      (!term || `${p.name} ${p.client}`.toLowerCase().includes(term)),
  );
  if (!list.length) {
    body.innerHTML = emptyBox(
      "No projects match.",
      "Try a different search or clear the filter.",
      { label: "Clear filters", attr: "data-clear" },
    );
    $("#status").textContent = "No projects match.";
    return;
  }
  body.innerHTML = projectsGridHTML(list, view, 3);
  $("#status").textContent =
    `${list.length} project${list.length === 1 ? "" : "s"} shown.`;
}

/* Filter menu */
const menu = $("#filter-menu");
const filterBtn = $("#filter-btn");
menu.innerHTML = FILTERS.map(
  ([v, l]) =>
    `<button type="button" role="menuitemradio" aria-checked="${v === status}" data-filter="${v}">${l}${icon("check")}</button>`,
).join("");
const setMenu = (open) => {
  menu.hidden = !open;
  filterBtn.setAttribute("aria-expanded", String(open));
  if (open) menu.querySelector('[aria-checked="true"]').focus();
};
filterBtn.addEventListener("click", () => setMenu(menu.hidden));
menu.addEventListener("click", (e) => {
  const b = e.target.closest("[data-filter]");
  if (!b) return;
  status = b.dataset.filter;
  menu
    .querySelectorAll("button")
    .forEach((x) => x.setAttribute("aria-checked", String(x === b)));
  $("#filter-label").textContent =
    status === "all" ? "Filter" : FILTERS.find(([v]) => v === status)[1];
  setMenu(false);
  filterBtn.focus();
  render();
});
document.addEventListener("click", (e) => {
  if (!menu.hidden && !menu.contains(e.target) && !filterBtn.contains(e.target))
    setMenu(false);
});
menu.addEventListener("keydown", (e) => {
  const items = [...menu.querySelectorAll("button")],
    i = items.indexOf(document.activeElement);
  if (e.key === "ArrowDown") {
    e.preventDefault();
    items[(i + 1) % items.length].focus();
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    items[(i - 1 + items.length) % items.length].focus();
  }
  if (e.key === "Escape") {
    setMenu(false);
    filterBtn.focus();
  }
});

/* Search, view toggle, states */
$("#search").addEventListener("input", (e) => {
  q = e.target.value;
  render();
});
document.querySelectorAll("[data-view]").forEach((b) =>
  b.addEventListener("click", () => {
    view = b.dataset.view;
    document
      .querySelectorAll("[data-view]")
      .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    render();
  }),
);
document.querySelectorAll('input[name="state"]').forEach((r) =>
  r.addEventListener("change", () => {
    mode = r.value;
    if (mode === "default" && !all.length) load();
    else render();
  }),
);
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-retry]")) {
    document.querySelector('input[name="state"][value="default"]').checked =
      true;
    mode = "default";
    load();
  }
  if (e.target.closest("[data-clear]")) {
    q = "";
    status = "all";
    $("#search").value = "";
    $("#filter-label").textContent = "Filter";
    menu
      .querySelectorAll("button")
      .forEach((x) =>
        x.setAttribute("aria-checked", String(x.dataset.filter === "all")),
      );
    render();
  }
});
document.addEventListener("project:created", load);

session.then((s) => {
  ctx = s;
  load();
});
