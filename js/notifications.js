import { session, esc, setNotificationsRead } from "./app-shell.js";
import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { toast } from "./ui.js";

const list = document.getElementById("notif-list");
const prefsEl = document.getElementById("prefs");
const markAll = document.getElementById("mark-all");
const READ_KEY = "coolteam.notifs.read";

const items = [
  {
    title: "Review requested",
    text: "Pris requested your approval on Northstar motion study.",
    tag: ["Review", "badge--brand"],
    time: "14m",
    unread: true,
  },
  {
    title: "New mention",
    text: "Warwick mentioned you in Map the new client onboarding flow.",
    tag: ["Comment", "badge--brand"],
    time: "39m",
    unread: true,
  },
  {
    title: "Task due today",
    text: "Prepare version three for client review is due today.",
    tag: ["Deadline", "badge--warning"],
    time: "58m",
    unread: true,
  },
  {
    title: "Project update",
    text: "Waliyat completed Define social usage guidelines.",
    tag: ["Project", "badge--neutral"],
    time: "2h",
    unread: false,
  },
];
try {
  if (localStorage.getItem(READ_KEY) === "1")
    items.forEach((i) => (i.unread = false));
} catch {}

const PREFS = [
  { key: "emailMentions", label: "Email for mentions", on: true },
  { key: "inAppReviews", label: "In-app review requests", on: true },
  { key: "deadlineReminders", label: "Deadline reminders", on: true },
  { key: "weeklyDigest", label: "Weekly workspace digest", on: false },
];

function renderList() {
  list.innerHTML = items
    .map(
      (n) => `
    <li class="notif${n.unread ? " is-unread" : ""}">
      <span class="notif__dot" aria-hidden="true"></span>
      <div>
        <h3 class="notif__title">${n.unread ? '<span class="sr-only">Unread: </span>' : ""}${esc(n.title)}</h3>
        <p class="notif__text">${esc(n.text)}</p>
        <span class="badge ${n.tag[1]}">${n.tag[0]}</span>
      </div>
      <time>${esc(n.time)}</time>
    </li>`,
    )
    .join("");
  const unread = items.filter((i) => i.unread).length;
  markAll.hidden = unread === 0;
}

function renderPrefs() {
  prefsEl.innerHTML = PREFS.map(
    (p) => `
    <label class="setting-row">
      <span>${p.label}</span>
      <span class="switch"><input type="checkbox" role="switch" data-key="${p.key}"${p.on ? " checked" : ""}><span class="switch__track"></span></span>
    </label>`,
  ).join("");
}

markAll.addEventListener("click", () => {
  items.forEach((i) => (i.unread = false));
  setNotificationsRead(true);
  renderList();
  document.getElementById("status").textContent =
    "All notifications marked as read.";
  toast("All caught up");
});

let uid = null;
prefsEl.addEventListener("change", async (e) => {
  const input = e.target.closest("[data-key]");
  if (!input || !uid) return;
  PREFS.find((p) => p.key === input.dataset.key).on = input.checked;
  try {
    await setDoc(
      doc(db, "users", uid),
      {
        notificationPrefs: Object.fromEntries(PREFS.map((p) => [p.key, p.on])),
      },
      { merge: true },
    );
    toast("Preference saved");
  } catch {
    input.checked = !input.checked;
    toast("Couldn’t save that preference. Try again.");
  }
});

renderList();
renderPrefs();

session.then(async ({ user }) => {
  uid = user.uid;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    const saved = snap.exists() ? snap.data().notificationPrefs : null;
    if (saved) {
      PREFS.forEach((p) => {
        if (p.key in saved) p.on = saved[p.key];
      });
      renderPrefs();
    }
  } catch {
    /* keep defaults */
  }
});
