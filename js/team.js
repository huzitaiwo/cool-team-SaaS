import { session, esc, initials } from "./app-shell.js";
import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { PEOPLE } from "./sample-data.js";
import { avatar, confirmDialog, toast } from "./ui.js";
import { isEmail, setFieldError, clearFieldError } from "./forms.js";

const $ = (s) => document.querySelector(s);
const tbody = $("#team-body");
const ROLES = ["Admin", "Project Manager", "Member", "Guest"];
const COLORS = ["", "teal", "rose", "amber", "blue"];

const members = [
  {
    who: "handsome",
    dept: "Design",
    role: "Owner",
    projects: 4,
    status: "Active",
  },
  {
    who: "warwick",
    dept: "Operations",
    role: "Project Manager",
    projects: 5,
    status: "Active",
  },
  {
    who: "olanma",
    dept: "Design",
    role: "Member",
    projects: 3,
    status: "Active",
  },
  {
    who: "waliyat",
    dept: "Development",
    role: "Member",
    projects: 2,
    status: "Active",
  },
  {
    who: "pris",
    dept: "Client",
    role: "Guest",
    projects: 1,
    status: "Invited",
  },
].map((m, i) => ({ ...m, id: i, person: PEOPLE[m.who] }));
let ctx = null,
  q = "",
  nextId = members.length;

const BADGE = {
  Active: "badge--success",
  Invited: "badge--warning",
  Suspended: "badge--neutral",
};

function render() {
  const term = q.trim().toLowerCase();
  const list = members.filter(
    (m) =>
      !term ||
      `${m.person.name} ${m.dept} ${m.role}`.toLowerCase().includes(term),
  );
  tbody.innerHTML = list.length
    ? list
        .map(
          (m) => `
    <tr data-id="${m.id}">
      <td data-label="Member"><div class="member">${avatar(m.person, "lg")}<span><strong>${esc(m.person.name)}</strong><small>${esc(m.dept)}</small></span></div></td>
      <td data-label="Role">
        <select class="role-select" aria-label="Role for ${esc(m.person.name)}" ${m.role === "Owner" ? "disabled" : ""}>
          ${m.role === "Owner" ? "<option>Owner</option>" : ROLES.map((r) => `<option${r === m.role ? " selected" : ""}>${r}</option>`).join("")}
        </select>
      </td>
      <td data-label="Projects">${m.projects}</td>
      <td data-label="Status"><span class="badge ${BADGE[m.status]}">${m.status}</span></td>
      <td class="align-end">${m.role === "Owner" ? "" : `<button class="btn-text" type="button" data-action="suspend">${m.status === "Suspended" ? "Reinstate" : "Suspend"}</button>`}</td>
    </tr>`,
        )
        .join("")
    : `<tr><td colspan="5" style="text-align:center;color:var(--color-muted);padding:2rem">No members match “${esc(q)}”.</td></tr>`;
  $("#status").textContent =
    `${list.length} member${list.length === 1 ? "" : "s"} shown.`;
}

tbody.addEventListener("change", (e) => {
  const sel = e.target.closest(".role-select");
  if (!sel) return;
  const m = members.find((x) => x.id === Number(sel.closest("tr").dataset.id));
  m.role = sel.value;
  toast(
    `${m.person.name} is now ${sel.value === "Admin" ? "an" : "a"} ${sel.value}`,
  );
});

tbody.addEventListener("click", async (e) => {
  const b = e.target.closest('[data-action="suspend"]');
  if (!b) return;
  const m = members.find((x) => x.id === Number(b.closest("tr").dataset.id));
  const suspending = m.status !== "Suspended";
  const ok = await confirmDialog({
    title: suspending
      ? `Suspend ${m.person.name}?`
      : `Reinstate ${m.person.name}?`,
    text: suspending
      ? "They’ll lose access to this workspace until you reinstate them. Their work stays where it is."
      : "They’ll regain access to the projects they were part of.",
    confirmLabel: suspending ? "Suspend" : "Reinstate",
    danger: suspending,
  });
  if (!ok) return;
  m.status = suspending ? "Suspended" : "Active";
  render();
  toast(
    suspending ? `${m.person.name} suspended` : `${m.person.name} reinstated`,
  );
});

$("#search").addEventListener("input", (e) => {
  q = e.target.value;
  render();
});

/* Invite modal */
const modal = $("#invite-modal");
const form = $("#invite-form");
const email = $("#invite-email");
const submit = $("#invite-submit");
const openInvite = () => {
  form.reset();
  clearFieldError(email);
  form.querySelector(".form-alert").hidden = true;
  if (!modal.open) modal.showModal();
  email.focus();
};
$("#invite-open").addEventListener("click", openInvite);
modal.addEventListener("click", (e) => {
  if (e.target === modal || e.target.closest("[data-close]")) modal.close();
});
email.addEventListener("input", () => clearFieldError(email));
if (location.hash === "#invite") session.then(openInvite);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const value = email.value.trim().toLowerCase();
  const alertBox = form.querySelector(".form-alert");
  alertBox.hidden = true;
  if (!isEmail(value)) {
    setFieldError(
      email,
      value ? "Enter a valid email address." : "Enter an email address.",
    );
    return email.focus();
  }
  if (members.some((m) => m.person.email === value)) {
    setFieldError(email, "That person has already been invited.");
    return email.focus();
  }

  submit.disabled = true;
  submit.textContent = "Sending…";
  try {
    if (ctx?.workspace) {
      await addDoc(collection(db, "workspaces", ctx.workspace.id, "invites"), {
        email: value,
        role: $("#invite-role").value.toLowerCase().replace(" ", "-"),
        status: "pending",
        invitedBy: ctx.user.uid,
        createdAt: serverTimestamp(),
      });
    }
    const name = value.split("@")[0];
    members.push({
      id: nextId++,
      who: null,
      dept: "Invited",
      role: $("#invite-role").value,
      projects: 0,
      status: "Invited",
      person: {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        email: value,
        initials: initials(name),
        color: COLORS[nextId % COLORS.length],
      },
    });
    modal.close();
    render();
    toast(`Invite sent to ${value}`);
  } catch {
    alertBox.querySelector("span").textContent =
      "We couldn’t send that invite. Check your connection and try again.";
    alertBox.hidden = false;
  } finally {
    submit.disabled = false;
    submit.textContent = "Send invite";
  }
});

session.then((s) => {
  ctx = s;
  render();
});
