/* ==========================================================================
   CoolTeam · app-shell.js — auth guard + sidebar, topbar, notifications,
   command palette. Import { session } from here on every app page.
   Page markup:
     <div class="app" id="app">
       <div data-app="sidebar"></div>
       <div class="app__main">
         <div data-app="topbar" data-eyebrow="…" data-title="…"></div>
         <main class="app__content" id="main">…</main>
       </div>
     </div>
   ========================================================================== */
import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

/* Helpers ------------------------------------------------------------------ */
export const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const icon = (name, cls = "") =>
  `<svg class="icon ${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;
export const initials = (name = "") => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  return (
    words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0]
  ).toUpperCase();
};
const $ = (sel, root = document) => root.querySelector(sel);
const page = document.body.dataset.page;
const isMac = /Mac|iPhone|iPad/.test(navigator.platform);

/* Navigation config -------------------------------------------------------- */
const NAV = [
  {
    label: "Workspace",
    items: [
      ["overview", "Overview", "layout-grid", "dashboard.html"],
      ["projects", "Projects", "folder", "projects.html"],
      ["calendar", "Calendar", "calendar", "calendar.html"],
      ["files", "Files", "files", "files.html"],
      ["team", "Team", "users", "team.html"],
      ["analytics", "Analytics", "activity", "analytics.html"],
    ],
  },
  {
    label: "Personal",
    items: [
      ["tasks", "My Tasks", "circle-check", "tasks.html"],
      ["notifications", "Notifications", "bell", "notifications.html", 3],
    ],
  },
  {
    label: "Administration",
    items: [
      ["settings", "Settings", "sliders", "settings.html"],
      ["billing", "Billing", "credit-card", "billing.html"],
    ],
  },
];

/* Templates ---------------------------------------------------------------- */
const sidebarHTML = () => `
  <aside class="sidebar" id="sidebar" aria-label="Sidebar">
    <div class="sidebar__head">
      <a class="logo" href="dashboard.html" aria-label="CoolTeam dashboard"><span class="logo__mark" aria-hidden="true">C</span><span>coolteam</span></a>
      <button class="sidebar__collapse" type="button" id="sidebar-toggle" aria-label="Collapse sidebar" aria-expanded="true">
        ${icon("panel-left", "icon--open")}${icon("x", "icon--close")}
      </button>
    </div>
    <a class="btn btn--primary btn--block sidebar__create" href="projects.html#new" title="Create project">
      ${icon("plus")}<span class="btn__label">Create project</span>
    </a>
    <nav class="nav" aria-label="Main">
      ${NAV.map(
        (group) => `
        <p class="nav__label">${group.label}</p>
        ${group.items
          .map(
            ([key, label, ic, href, badge]) => `
          <a class="nav__item" href="${href}" title="${label}"${key === page ? ' aria-current="page"' : ""}>
            ${icon(ic)}<span class="nav__text">${label}</span>
            ${badge ? `<span class="nav__badge" aria-label="${badge} unread">${badge}</span>` : ""}
          </a>`,
          )
          .join("")}
      `,
      ).join("")}
    </nav>
    <div class="sidebar__foot">
      <div class="user-menu" id="user-menu" hidden>
        <a href="settings.html">${icon("sliders")}Account settings</a>
        <button type="button" id="logout">${icon("log-out")}Log out</button>
      </div>
      <button class="sidebar__user" type="button" id="user-toggle" aria-expanded="false" aria-controls="user-menu">
        <span class="avatar avatar--md" id="side-avatar">·</span>
        <span class="sidebar__user-text">
          <span class="sidebar__user-name" id="side-name">Loading…</span>
          <span class="sidebar__user-role" id="side-role">&nbsp;</span>
        </span>
      </button>
    </div>
  </aside>
  <div class="scrim" id="scrim"></div>`;

const topbarHTML = (el) => `
  <header class="topbar">
    <div class="topbar__lead">
      <button class="icon-btn topbar__menu" type="button" id="menu-toggle" aria-label="Open navigation" aria-controls="sidebar" aria-expanded="false">${icon("menu")}</button>
      <div>
        <p class="topbar__eyebrow" id="page-eyebrow">${esc(el.dataset.eyebrow || "")}</p>
        <h1 class="topbar__title" id="page-title">${esc(el.dataset.title || "")}</h1>
      </div>
    </div>
    <div class="topbar__actions">
      <select class="select" aria-label="Workspace view"><option>Default</option></select>
      <button class="search-trigger" type="button" id="palette-open" aria-label="Search everything" aria-haspopup="dialog">
        ${icon("search")}<span class="search-trigger__text">Search everything</span><kbd class="kbd" id="kbd-hint">${isMac ? "⌘ K" : "Ctrl K"}</kbd>
      </button>
      <button class="icon-btn" type="button" id="notif-toggle" aria-label="Notifications, ${NOTIFICATIONS.length} unread" aria-expanded="false" aria-controls="notif-pop">
        ${icon("bell")}<span class="icon-btn__dot" aria-hidden="true"></span>
      </button>
      <a class="avatar avatar--lg topbar__avatar" id="top-avatar" href="settings.html" aria-label="Your account">·</a>
      <section class="popover" id="notif-pop" aria-label="Notifications" hidden>
        <div class="popover__head">
          <h2 class="popover__title">Notifications</h2>
          <button class="popover__close" type="button" id="notif-close" aria-label="Close notifications">${icon("x")}</button>
        </div>
        <ul class="notice-list">
          ${NOTIFICATIONS.map((n) => `<li class="notice"><p>${esc(n.text)}<small>${esc(n.time)}</small></p></li>`).join("")}
        </ul>
        <a class="popover__all" href="notifications.html">View all notifications</a>
      </section>
    </div>
  </header>`;

const paletteHTML = () => `
  <dialog class="palette" id="palette" aria-label="Command palette">
    <div class="palette__search">
      ${icon("command")}
      <input class="palette__input" id="palette-input" type="text" role="combobox" aria-expanded="true"
             aria-controls="palette-list" aria-autocomplete="list" autocomplete="off" spellcheck="false"
             placeholder="Search projects, tasks, people, or actions…" aria-label="Search">
      <kbd class="kbd">ESC</kbd>
    </div>
    <div class="palette__body">
      <p class="palette__label" id="palette-label">Commands</p>
      <ul class="palette__list" id="palette-list" role="listbox" aria-labelledby="palette-label"></ul>
      <p class="palette__empty" id="palette-empty" role="status" hidden>No matches. Try “project”, “calendar” or “invite”.</p>
    </div>
    <div class="palette__foot"><span>↑ ↓ to navigate</span><span>↵ to open</span><span>Esc to close</span></div>
  </dialog>`;

/* Mount -------------------------------------------------------------------- */
const mount = (name, html) => {
  const el = $(`[data-app="${name}"]`);
  if (el) el.outerHTML = html(el).trim();
};
mount("sidebar", sidebarHTML);
mount("topbar", topbarHTML);
document.body.insertAdjacentHTML("beforeend", paletteHTML());

const app = $("#app");
const mqDrawer = window.matchMedia("(max-width: 1023px)");

/* Sidebar: collapse (desktop) + drawer (mobile) ---------------------------- */
const sidebar = $("#sidebar");
const sidebarToggle = $("#sidebar-toggle");
const menuToggle = $("#menu-toggle");
const scrim = $("#scrim");
const KEY = "coolteam.sidebar";

const setCollapsed = (on) => {
  app.classList.toggle("is-collapsed", on);
  sidebarToggle.setAttribute(
    "aria-label",
    on ? "Expand sidebar" : "Collapse sidebar",
  );
  sidebarToggle.setAttribute("aria-expanded", String(!on));
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {}
};
const setDrawer = (open) => {
  app.classList.toggle("is-nav-open", open);
  menuToggle?.setAttribute("aria-expanded", String(open));
  document.body.style.overflow = open ? "hidden" : "";
  syncInert();
  if (open) sidebar.querySelector(".nav__item")?.focus();
};
const syncInert = () => {
  sidebar.inert = mqDrawer.matches && !app.classList.contains("is-nav-open");
};

try {
  if (localStorage.getItem(KEY) === "1") setCollapsed(true);
} catch {}
syncInert();
mqDrawer.addEventListener("change", () => {
  setDrawer(false);
});

sidebarToggle.addEventListener("click", () =>
  mqDrawer.matches
    ? (setDrawer(false), menuToggle.focus())
    : setCollapsed(!app.classList.contains("is-collapsed")),
);
menuToggle?.addEventListener("click", () => setDrawer(true));
scrim.addEventListener("click", () => setDrawer(false));
sidebar.addEventListener("click", (e) => {
  if (e.target.closest("a.nav__item") && mqDrawer.matches) setDrawer(false);
});

/* User menu ---------------------------------------------------------------- */
const userToggle = $("#user-toggle");
const userMenu = $("#user-menu");
const setUserMenu = (open) => {
  userMenu.hidden = !open;
  userToggle.setAttribute("aria-expanded", String(open));
};
userToggle.addEventListener("click", () => setUserMenu(userMenu.hidden));
$("#logout").addEventListener("click", async () => {
  await signOut(auth);
  location.replace("login.html");
});

/* Notifications popover ---------------------------------------------------- */
const notifToggle = $("#notif-toggle");
const notifPop = $("#notif-pop");
const setNotif = (open) => {
  notifPop.hidden = !open;
  notifToggle.setAttribute("aria-expanded", String(open));
};
notifToggle.addEventListener("click", () => setNotif(notifPop.hidden));
$("#notif-close").addEventListener("click", () => {
  setNotif(false);
  notifToggle.focus();
});

document.addEventListener("click", (e) => {
  if (
    !notifPop.hidden &&
    !notifPop.contains(e.target) &&
    !notifToggle.contains(e.target)
  )
    setNotif(false);
  if (
    !userMenu.hidden &&
    !userMenu.contains(e.target) &&
    !userToggle.contains(e.target)
  )
    setUserMenu(false);
});

/* Command palette ---------------------------------------------------------- */
const dlg = $("#palette");
const input = $("#palette-input");
const list = $("#palette-list");
const emptyMsg = $("#palette-empty");
let results = [];
let active = 0;

function renderPalette(query = "") {
  const q = query.trim().toLowerCase();
  results = COMMANDS.filter(
    (c) => !q || `${c.title} ${c.desc}`.toLowerCase().includes(q),
  );
  active = 0;
  list.innerHTML = results
    .map(
      (c, i) => `
    <li role="option" id="cmd-${i}" aria-selected="${i === 0}">
      <a class="palette__item${i === 0 ? " is-active" : ""}" href="${c.href}" tabindex="-1">
        ${icon(c.icon)}<span><strong>${esc(c.title)}</strong><small>${esc(c.desc)}</small></span>${icon("arrow-right")}
      </a>
    </li>`,
    )
    .join("");
  emptyMsg.hidden = results.length > 0;
  input.setAttribute("aria-activedescendant", results.length ? "cmd-0" : "");
}
function setActive(next) {
  if (!results.length) return;
  active = (next + results.length) % results.length;
  list.querySelectorAll("li").forEach((li, i) => {
    li.setAttribute("aria-selected", String(i === active));
    li.firstElementChild.classList.toggle("is-active", i === active);
  });
  input.setAttribute("aria-activedescendant", `cmd-${active}`);
  document.getElementById(`cmd-${active}`).scrollIntoView({ block: "nearest" });
}
function openPalette() {
  setNotif(false);
  if (!dlg.open) dlg.showModal();
  input.value = "";
  renderPalette();
  input.focus();
}
$("#palette-open").addEventListener("click", openPalette);
input.addEventListener("input", () => renderPalette(input.value));
input.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    setActive(active + 1);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    setActive(active - 1);
  } else if (e.key === "Home") {
    e.preventDefault();
    setActive(0);
  } else if (e.key === "End") {
    e.preventDefault();
    setActive(results.length - 1);
  } else if (e.key === "Enter" && results[active]) {
    e.preventDefault();
    location.assign(results[active].href);
  }
});
dlg.addEventListener("click", (e) => {
  if (e.target === dlg) dlg.close();
});
list.addEventListener("mousemove", (e) => {
  const li = e.target.closest("li");
  if (li) setActive([...list.children].indexOf(li));
});

document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    dlg.open ? dlg.close() : openPalette();
  }
  if (e.key === "Escape") {
    if (!notifPop.hidden) {
      setNotif(false);
      notifToggle.focus();
    } else if (!userMenu.hidden) {
      setUserMenu(false);
      userToggle.focus();
    } else if (app.classList.contains("is-nav-open")) {
      setDrawer(false);
      menuToggle.focus();
    }
  }
});

/* Session: auth guard + user/workspace ------------------------------------- */
export const session = new Promise((resolve) => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      const here = location.pathname.split("/").pop() || "dashboard.html";
      return location.replace(`login.html?next=${encodeURIComponent(here)}`);
    }

    let profile = null;
    let workspace = null;
    let role = "member";
    try {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      profile = userSnap.exists() ? userSnap.data() : null;
      if (profile && !profile.onboardingComplete)
        return location.replace("onboarding.html");
      if (profile?.defaultWorkspaceId) {
        const [wsSnap, memberSnap] = await Promise.all([
          getDoc(doc(db, "workspaces", profile.defaultWorkspaceId)),
          getDoc(
            doc(
              db,
              "workspaces",
              profile.defaultWorkspaceId,
              "members",
              user.uid,
            ),
          ),
        ]);
        workspace = wsSnap.exists()
          ? { id: wsSnap.id, ...wsSnap.data() }
          : null;
        role = memberSnap.exists() ? memberSnap.data().role : role;
      }
    } catch {
      /* offline: fall back to auth info */
    }

    const name =
      user.displayName || profile?.displayName || user.email.split("@")[0];
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    $("#side-name").textContent = name;
    $("#side-role").textContent =
      `${cap(role)} · ${workspace?.name || "Your workspace"}`;
    $("#side-avatar").textContent = initials(name);
    $("#top-avatar").textContent = initials(name);
    document.body.classList.add("is-ready");
    resolve({ user, name, firstName: name.split(/\s+/)[0], workspace, role });
  });
});

/* ==========================================================================
   Global: notification read-state + Create project modal
   ========================================================================== */
const READ_KEY = "coolteam.notifs.read";

export function setNotificationsRead(read) {
  try {
    localStorage.setItem(READ_KEY, read ? "1" : "0");
  } catch {}
  document
    .querySelectorAll(".nav__badge, .icon-btn__dot")
    .forEach((el) => (el.hidden = read));
  notifToggle.setAttribute(
    "aria-label",
    read ? "Notifications" : `Notifications, ${NOTIFICATIONS.length} unread`,
  );
}
try {
  if (localStorage.getItem(READ_KEY) === "1") setNotificationsRead(true);
} catch {}

const projectModal = document.createElement("dialog");
projectModal.className = "modal";
projectModal.setAttribute("aria-labelledby", "pm-title");
projectModal.innerHTML = `
  <div class="modal__head">
    <h2 class="modal__title" id="pm-title">Create a project</h2>
    <button class="modal__close" type="button" data-close aria-label="Close">${icon("x")}</button>
  </div>
  <form id="pm-form" novalidate>
    <div class="form-alert" role="alert" hidden>${icon("alert-circle")}<span></span></div>
    <div class="field">
      <label class="field__label" for="pm-name">Project name</label>
      <input class="field__input" id="pm-name" type="text" maxlength="80" placeholder="e.g. Summer launch" autocomplete="off">
    </div>
    <div class="field">
      <label class="field__label" for="pm-status">Status</label>
      <select class="field__input" id="pm-status">
        <option value="active">Active</option>
        <option value="planning">Planning</option>
        <option value="on-hold">On hold</option>
      </select>
    </div>
    <button class="btn btn--primary btn--block btn--md" type="submit" id="pm-submit" disabled>Create project</button>
  </form>`;
document.body.append(projectModal);

const pmForm = $("#pm-form");
const pmName = $("#pm-name");
const pmSubmit = $("#pm-submit");

export function openProjectModal() {
  pmForm.reset();
  pmSubmit.disabled = true;
  pmForm.querySelector(".form-alert").hidden = true;
  if (!projectModal.open) projectModal.showModal();
  pmName.focus();
}

pmName.addEventListener("input", () => {
  pmSubmit.disabled = pmName.value.trim().length < 2;
});
projectModal.addEventListener("click", (e) => {
  if (e.target === projectModal || e.target.closest("[data-close]"))
    projectModal.close();
});

pmForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const alertBox = pmForm.querySelector(".form-alert");
  alertBox.hidden = true;
  const { user, workspace } = await session;
  if (!workspace) {
    alertBox.querySelector("span").textContent =
      "We couldn’t find your workspace. Finish onboarding first.";
    alertBox.hidden = false;
    return;
  }
  pmSubmit.disabled = true;
  pmSubmit.textContent = "Creating…";
  try {
    await addDoc(collection(db, "workspaces", workspace.id, "projects"), {
      name: pmName.value.trim(),
      status: $("#pm-status").value,
      progress: 0,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    });
    projectModal.close();
    document.dispatchEvent(new CustomEvent("project:created"));
    if (page !== "projects") location.assign("projects.html");
  } catch {
    alertBox.querySelector("span").textContent =
      "We couldn’t create the project. Check your connection and try again.";
    alertBox.hidden = false;
  } finally {
    pmSubmit.textContent = "Create project";
    pmSubmit.disabled = pmName.value.trim().length < 2;
  }
});

document.addEventListener("click", (e) => {
  if (e.target.closest('[data-new-project], a[href$="projects.html#new"]')) {
    e.preventDefault();
    setDrawer(false);
    openProjectModal();
  }
});
if (location.hash === "#new") session.then(openProjectModal);
