import { session, initials } from "./app-shell.js";
import { auth, db } from "./firebase.js";
import {
  updateProfile,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { toast, confirmDialog } from "./ui.js";
import {
  setFieldError,
  clearFieldError,
  clearFormErrors,
  showFormError,
} from "./forms.js";

const $ = (s) => document.querySelector(s);
const tabs = [...document.querySelectorAll('[role="tab"]')];
const panels = tabs.map((t) =>
  document.getElementById(t.getAttribute("aria-controls")),
);
let ctx = null;

/* Tabs --------------------------------------------------------------------- */
function selectTab(tab, focus = false) {
  tabs.forEach((t, i) => {
    const on = t === tab;
    t.setAttribute("aria-selected", String(on));
    t.tabIndex = on ? 0 : -1;
    panels[i].hidden = !on;
  });
  if (focus) tab.focus();
  history.replaceState(null, "", `#${tab.id.replace("tab-", "")}`);
}
tabs.forEach((t, i) => {
  t.addEventListener("click", () => selectTab(t));
  t.addEventListener("keydown", (e) => {
    const move = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (move) {
      e.preventDefault();
      selectTab(tabs[(i + move + tabs.length) % tabs.length], true);
    }
    if (e.key === "Home") {
      e.preventDefault();
      selectTab(tabs[0], true);
    }
    if (e.key === "End") {
      e.preventDefault();
      selectTab(tabs.at(-1), true);
    }
  });
});
const initial = tabs.find((t) => t.id === `tab-${location.hash.slice(1)}`);
if (initial) selectTab(initial);

/* Profile ------------------------------------------------------------------ */
const nameInput = $("#full-name");
$("#profile-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  clearFormErrors(form);
  const name = nameInput.value.trim();
  if (name.length < 2) {
    setFieldError(nameInput, "Enter your full name.");
    return nameInput.focus();
  }
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true;
  btn.textContent = "Saving…";
  try {
    await updateProfile(ctx.user, { displayName: name });
    await setDoc(
      doc(db, "users", ctx.user.uid),
      { displayName: name },
      { merge: true },
    );
    ["#side-name"].forEach((s) => ($(s).textContent = name));
    ["#side-avatar", "#top-avatar"].forEach(
      (s) => ($(s).textContent = initials(name)),
    );
    document
      .querySelectorAll("[data-me-avatar]")
      .forEach((a) => (a.textContent = initials(name)));
    document
      .querySelectorAll("[data-me-name]")
      .forEach((h) => (h.textContent = name));
    toast("Profile saved");
  } catch {
    showFormError(
      form,
      "We couldn’t save your profile. Check your connection and try again.",
    );
  } finally {
    btn.disabled = false;
    btn.textContent = "Save changes";
  }
});
nameInput.addEventListener("input", () => clearFieldError(nameInput));

/* Workspace ---------------------------------------------------------------- */
const wsName = $("#ws-name"),
  wsSlug = $("#ws-slug");
const slugify = (s) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
$("#workspace-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  clearFormErrors(form);
  const name = wsName.value.trim(),
    slug = slugify(wsSlug.value);
  let bad = null;
  if (name.length < 2) {
    setFieldError(wsName, "Enter a workspace name.");
    bad = wsName;
  }
  if (slug.length < 2) {
    setFieldError(wsSlug, "Use at least 2 letters or numbers.");
    bad = bad || wsSlug;
  }
  if (bad) return bad.focus();
  const btn = $("#ws-save");
  btn.disabled = true;
  btn.textContent = "Saving…";
  try {
    await updateDoc(doc(db, "workspaces", ctx.workspace.id), { name, slug });
    wsSlug.value = slug;
    $("#side-role").textContent =
      `${ctx.role.charAt(0).toUpperCase() + ctx.role.slice(1)} · ${name}`;
    ctx.workspace.name = name;
    toast("Workspace saved");
  } catch {
    showFormError(
      form,
      "We couldn’t save the workspace. Check your connection and try again.",
    );
  } finally {
    btn.disabled = false;
    btn.textContent = "Save changes";
  }
});
[wsName, wsSlug].forEach((i) =>
  i.addEventListener("input", () => clearFieldError(i)),
);

/* Notification preferences ------------------------------------------------- */
$("#prefs-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const prefs = Object.fromEntries(
    [...e.currentTarget.querySelectorAll("input[name]")].map((i) => [
      i.name,
      i.checked,
    ]),
  );
  const btn = e.currentTarget.querySelector("button[type=submit]");
  btn.disabled = true;
  btn.textContent = "Saving…";
  try {
    await setDoc(
      doc(db, "users", ctx.user.uid),
      { settingsPrefs: prefs },
      { merge: true },
    );
    toast("Preferences saved");
  } catch {
    toast("Couldn’t save preferences. Try again.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Save changes";
  }
});

/* Security ----------------------------------------------------------------- */
$("#signout-all").addEventListener("click", async () => {
  const ok = await confirmDialog({
    title: "Sign out of this device?",
    text: "You’ll be signed out here. Other devices stay signed in until their sessions expire.",
    confirmLabel: "Sign out",
  });
  if (ok) {
    await signOut(auth);
    location.replace("login.html");
  }
});

const delModal = $("#delete-modal"),
  delInput = $("#delete-confirm"),
  delSubmit = $("#delete-submit");
$("#delete-ws").addEventListener("click", () => {
  if (!ctx.workspace) return toast("There’s no workspace to delete.");
  if (ctx.role !== "owner")
    return toast("Only the workspace owner can delete it.");
  $("#delete-name").textContent = ctx.workspace.name;
  delInput.value = "";
  delSubmit.disabled = true;
  delModal.querySelector(".form-alert").hidden = true;
  delModal.showModal();
  delInput.focus();
});
delInput.addEventListener("input", () => {
  delSubmit.disabled = delInput.value.trim() !== ctx.workspace.name;
});
delModal.addEventListener("click", (e) => {
  if (e.target === delModal || e.target.closest("[data-close]"))
    delModal.close();
});
$("#delete-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  delSubmit.disabled = true;
  delSubmit.textContent = "Deleting…";
  try {
    await deleteDoc(doc(db, "workspaces", ctx.workspace.id));
    await setDoc(
      doc(db, "users", ctx.user.uid),
      { defaultWorkspaceId: null, onboardingComplete: false },
      { merge: true },
    );
    location.replace("onboarding.html");
  } catch {
    const a = delModal.querySelector(".form-alert");
    a.querySelector("span").textContent =
      "We couldn’t delete the workspace. Check your connection and try again.";
    a.hidden = false;
    delSubmit.disabled = false;
    delSubmit.textContent = "Delete workspace";
  }
});

/* Boot --------------------------------------------------------------------- */
session.then(async (s) => {
  ctx = s;
  document
    .querySelectorAll("[data-me-avatar]")
    .forEach((a) => (a.textContent = initials(s.name)));
  document
    .querySelectorAll("[data-me-name]")
    .forEach((h) => (h.textContent = s.name));
  nameInput.value = s.name;
  $("#email").value = s.user.email;

  wsName.value = s.workspace?.name || "";
  wsSlug.value = s.workspace?.slug || "";
  if (!s.workspace || !["owner", "admin"].includes(s.role)) {
    [wsName, wsSlug, $("#ws-save")].forEach((el) => (el.disabled = true));
    $("#ws-note").hidden = false;
  }

  try {
    const snap = await getDoc(doc(db, "users", s.user.uid));
    const prefs = snap.exists() ? snap.data().settingsPrefs : null;
    if (prefs)
      Object.entries(prefs).forEach(([k, v]) => {
        const i = document.querySelector(`#prefs-form [name="${k}"]`);
        if (i) i.checked = v;
      });
  } catch {
    /* defaults */
  }
});
