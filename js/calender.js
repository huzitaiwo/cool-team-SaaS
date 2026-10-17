import { session, esc } from "./app-shell.js";
import { toast } from "./ui.js";
import { setFieldError, clearFieldError } from "./forms.js";

const $ = (s) => document.querySelector(s);
const body = $("#cal-body");
const KEY = "coolteam.events";
const TYPES = {
  review: ["Review", "#7f22fe"],
  meeting: ["Meeting", "#00bba7"],
  deadline: ["Deadline", "#d97706"],
};

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return iso(d);
};

let events;
try {
  events = JSON.parse(localStorage.getItem(KEY));
} catch {}
events = events || [
  { id: 1, title: "Northstar review", date: addDays(2), type: "review" },
  { id: 2, title: "Client sync", date: addDays(5), type: "meeting" },
  {
    id: 3,
    title: "Atlas launch deadline",
    date: addDays(13),
    type: "deadline",
  },
];
const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(events));
  } catch {}
};

let cursor = new Date();
cursor.setDate(1);
let view = "month";

function render() {
  $("#cal-title").textContent = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(cursor);
  view === "month" ? renderMonth() : renderAgenda();
}

function renderMonth() {
  const first = new Date(cursor);
  const offset = (first.getDay() + 6) % 7; // Monday start
  const start = new Date(first);
  start.setDate(1 - offset);
  const todayIso = iso(new Date());
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  let rows = "";
  for (let w = 0; w < 6; w++) {
    let cells = "";
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      const key = iso(date);
      const outside = date.getMonth() !== cursor.getMonth();
      const list = events.filter((e) => e.date === key);
      const label = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(date);
      cells += `
        <td class="${outside ? "is-outside" : ""}${key === todayIso ? " is-today" : ""}">
          <button class="cal__day" type="button" data-date="${key}" aria-label="Add event on ${label}"${key === todayIso ? ' aria-current="date"' : ""}>${date.getDate()}</button>
          <ul class="cal__events">${list.map((e) => `<li class="cal-event cal-event--${e.type}" title="${esc(e.title)} (${TYPES[e.type][0]})"><span class="sr-only">${TYPES[e.type][0]}: </span>${esc(e.title)}</li>`).join("")}</ul>
        </td>`;
    }
    rows += `<tr>${cells}</tr>`;
  }
  body.innerHTML = `<table><caption class="sr-only">${$("#cal-title").textContent}</caption>
    <thead><tr>${days.map((d) => `<th scope="col">${d}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>`;
  const count = events.filter((e) =>
    e.date.startsWith(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
    ),
  ).length;
  $("#status").textContent =
    `${$("#cal-title").textContent}: ${count} event${count === 1 ? "" : "s"}.`;
}

function renderAgenda() {
  const prefix = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
  const list = events
    .filter((e) => e.date.startsWith(prefix))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!list.length) {
    body.innerHTML = `<div class="state-box"><span class="state-box__icon" aria-hidden="true"><svg class="icon"><use href="#i-calendar"></use></svg></span><h3>Nothing scheduled for this period.</h3><p>Add a review, meeting, or deadline to see it here.</p><button class="btn btn--primary" type="button" data-add>Add event</button></div>`;
    return;
  }
  const groups = list.reduce(
    (acc, e) => ((acc[e.date] ||= []).push(e), acc),
    {},
  );
  body.innerHTML = `<div class="agenda">${Object.entries(groups)
    .map(([date, items]) => {
      const d = new Date(`${date}T00:00`);
      return `<section class="agenda__day">
      <h3 class="agenda__date">${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d)}<small>${new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(d)}</small></h3>
      <ul>${items.map((e) => `<li class="agenda__item" style="--c:${TYPES[e.type][1]}">${esc(e.title)} <small>${TYPES[e.type][0]}</small></li>`).join("")}</ul>
    </section>`;
    })
    .join("")}</div>`;
}

/* Navigation */
$("#prev").addEventListener("click", () => {
  cursor.setMonth(cursor.getMonth() - 1);
  render();
});
$("#next").addEventListener("click", () => {
  cursor.setMonth(cursor.getMonth() + 1);
  render();
});
$("#today").addEventListener("click", () => {
  cursor = new Date();
  cursor.setDate(1);
  render();
});
document.querySelectorAll('input[name="view"]').forEach((r) =>
  r.addEventListener("change", () => {
    view = r.value;
    render();
  }),
);

/* Event modal */
const modal = $("#event-modal");
const form = $("#event-form");
const nameInput = $("#event-name");
const open = (date = iso(new Date())) => {
  form.reset();
  clearFieldError(nameInput);
  $("#event-date").value = date;
  if (!modal.open) modal.showModal();
  nameInput.focus();
};
$("#event-open").addEventListener("click", () => open());
body.addEventListener("click", (e) => {
  const day = e.target.closest("[data-date]");
  if (day) open(day.dataset.date);
  if (e.target.closest("[data-add]")) open();
});
modal.addEventListener("click", (e) => {
  if (e.target === modal || e.target.closest("[data-close]")) modal.close();
});
nameInput.addEventListener("input", () => clearFieldError(nameInput));

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = nameInput.value.trim();
  const date = $("#event-date").value;
  if (!title) {
    setFieldError(nameInput, "Give the event a title.");
    return nameInput.focus();
  }
  if (!date) return $("#event-date").focus();
  events.push({ id: Date.now(), title, date, type: $("#event-type").value });
  save();
  const d = new Date(`${date}T00:00`);
  cursor = new Date(d.getFullYear(), d.getMonth(), 1);
  modal.close();
  render();
  toast("Event added");
});

session.then(render);
