import { esc, icon } from "./app-shell.js";
import { PEOPLE } from "./sample-data.js";

export const avatar = (who, size = "sm") => {
  const p = typeof who === "string" ? PEOPLE[who] : who;
  return `<span class="avatar avatar--${size}${p.color ? ` avatar--${p.color}` : ""}" title="${esc(p.name)}">${esc(p.initials)}</span>`;
};

export const STATUS = {
  "on-track": ["badge--success", "On track"],
  "at-risk": ["badge--warning", "At risk"],
  delayed: ["badge--danger", "Delayed"],
  active: ["badge--success", "Active"],
  planning: ["badge--neutral", "Planning"],
  "on-hold": ["badge--warning", "On hold"],
};

export const projectCardHTML = (p) => {
  const [cls, label] = STATUS[p.status] || STATUS.active;
  return `
  <article class="project-card">
    <div class="project-card__top">
      <span class="project-card__dot" style="--dot:${p.dot}" aria-hidden="true"></span>
      <span class="badge ${cls}">${label}</span>
    </div>
        <h3 class="project-card__title"><a class="project-card__link" href="project.html?id=${encodeURIComponent(p.id)}">${esc(p.name)}</a></h3>
    <p class="project-card__meta">${esc(p.client)} · ${p.due.startsWith("No") ? esc(p.due) : `due ${esc(p.due)}`}</p>
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
};

export const projectsGridHTML = (list, view = "grid", cols = 2) =>
  `<div class="project-grid${cols === 3 ? " project-grid--3" : ""}${view === "list" ? " project-grid--list" : ""}">${list.map(projectCardHTML).join("")}</div>`;

export const projectsSkeleton = (cols = 2, n = 4) => `
  <div class="project-grid${cols === 3 ? " project-grid--3" : ""}" aria-hidden="true">
    ${Array.from(
      { length: n },
      () => `
      <div class="project-card">
        <div class="project-card__top"><span class="skeleton" style="--w:.55rem;--h:.55rem"></span><span class="skeleton" style="--w:4.5rem;--h:1.4rem;border-radius:99px"></span></div>
        <span class="skeleton" style="--w:70%;--h:1.3rem;margin-top:1.1rem"></span>
        <span class="skeleton" style="--w:50%;--h:.7rem;margin-top:.7rem"></span>
        <span class="skeleton" style="--h:.4rem;margin-top:1.4rem"></span>
      </div>`,
    ).join("")}
  </div>`;

export const listSkeleton = (n = 4, round = true) => `
  <div class="task-list" aria-hidden="true">
    ${Array.from(
      { length: n },
      () => `
      <div class="task-row">
        <span class="skeleton skeleton--round" style="--w:${round ? "2.2rem" : "1.4rem"};--h:${round ? "2.2rem" : "1.4rem"};flex:none"></span>
        <div class="task-row__text"><span class="skeleton" style="--w:80%;--h:.85rem"></span><span class="skeleton" style="--w:40%;--h:.65rem;margin-top:.5rem"></span></div>
      </div>`,
    ).join("")}
  </div>`;

export const emptyBox = (title, text, action) => `
  <div class="state-box">
    <span class="state-box__icon" aria-hidden="true">${icon("sparkles")}</span>
    <h3>${title}</h3><p>${text}</p>
    ${action ? (action.href ? `<a class="btn btn--primary" href="${action.href}">${action.label}</a>` : `<button class="btn btn--primary" type="button" ${action.attr || ""}>${action.label}</button>`) : ""}
  </div>`;

export const errorBox = () => `
  <div class="state-box" role="alert">
    <span class="state-box__icon state-box__icon--error" aria-hidden="true">${icon("alert-circle")}</span>
    <h3>We couldn’t load this section</h3>
    <p>The connection dropped before the data arrived. Check your network, then try again—nothing has been changed.</p>
    <button class="btn btn--primary" type="button" data-retry>${icon("refresh")} Try again</button>
  </div>`;

/* Toast ------------------------------------------------------------------- */
export function toast(message) {
  document.querySelector(".toast")?.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.innerHTML = `${icon("circle-check")}<span></span>`;
  el.querySelector("span").textContent = message;
  document.body.append(el);
  setTimeout(() => {
    el.classList.add("is-leaving");
    setTimeout(() => el.remove(), 300);
  }, 2800);
}

/* Confirm dialog (returns Promise<boolean>) -------------------------------- */
export function confirmDialog({
  title,
  text,
  confirmLabel = "Confirm",
  danger = false,
}) {
  return new Promise((resolve) => {
    const d = document.createElement("dialog");
    d.className = "modal";
    d.setAttribute("aria-labelledby", "cd-title");
    d.innerHTML = `
      <div class="modal__head"><h2 class="modal__title" id="cd-title"></h2>
        <button class="modal__close" type="button" data-cancel aria-label="Close">${icon("x")}</button></div>
      <p class="modal__text"></p>
      <div class="modal__actions">
        <button class="btn btn--outline btn--md" type="button" data-cancel>Cancel</button>
        <button class="btn ${danger ? "btn--danger" : "btn--primary"} btn--md" type="button" data-ok></button>
      </div>`;
    d.querySelector(".modal__title").textContent = title;
    d.querySelector(".modal__text").textContent = text;
    d.querySelector("[data-ok]").textContent = confirmLabel;
    let result = false;
    d.addEventListener("click", (e) => {
      if (e.target === d || e.target.closest("[data-cancel]")) d.close();
    });
    d.querySelector("[data-ok]").addEventListener("click", () => {
      result = true;
      d.close();
    });
    d.addEventListener("close", () => {
      d.remove();
      resolve(result);
    });
    document.body.append(d);
    d.showModal();
  });
}
