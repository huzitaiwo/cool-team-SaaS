import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  doc,
  collection,
  getDoc,
  writeBatch,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { isEmail, setLoading } from "./forms.js";

const TOTAL = 9;
const KEY = "coolteam.onboarding";

const form = document.getElementById("onboarding-form");
const panels = [...form.querySelectorAll(".step-panel")];
const segments = [...document.querySelectorAll("#segments span")];
const countEl = document.getElementById("step-count");
const barEl = document.getElementById("progress-bar");
const btnBack = document.getElementById("btn-back");
const btnSkip = document.getElementById("btn-skip");
const btnNext = document.getElementById("btn-next");
const workspaceInput = document.getElementById("workspace");
const projectInput = document.getElementById("project");
const inviteInput = document.getElementById("invite-email");
const inviteList = document.getElementById("invite-list");
const saveError = document.getElementById("save-error");

let user = null;
let saving = false;

/* State -------------------------------------------------------------------- */
const blank = {
  step: 1,
  teamType: "",
  role: "",
  size: "",
  goals: [],
  workspace: "",
  project: "",
  invites: [],
};
const load = () => {
  try {
    return { ...blank, ...JSON.parse(localStorage.getItem(KEY)) };
  } catch {
    return { ...blank };
  }
};
const persist = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
};
const state = load();

/* Inline errors ------------------------------------------------------------ */
const showError = (id, message) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.querySelector("span").textContent = message;
  el.hidden = false;
};
const hideError = (id) => {
  const el = document.getElementById(id);
  if (el) el.hidden = true;
};

/* Rendering ---------------------------------------------------------------- */
function render(step, direction = "forward", focus = true) {
  state.step = step;
  persist();

  panels.forEach((panel) => {
    const active = Number(panel.dataset.step) === step;
    panel.hidden = !active;
    panel.classList.remove("is-entering", "is-entering-back");
    if (active) {
      void panel.offsetWidth; // restart animation
      panel.classList.add("is-entering");
      if (direction === "back") panel.classList.add("is-entering-back");
    }
  });

  segments.forEach((s, i) => s.classList.toggle("is-done", i < step));
  barEl.style.setProperty("--progress", `${(step / TOTAL) * 100}%`);
  barEl.style.width = `${(step / TOTAL) * 100}%`;
  countEl.textContent = `${step} / ${TOTAL}`;

  btnSkip.hidden = step !== 7;
  btnBack.hidden = step === TOTAL; // data is already saved at this point
  btnNext.querySelector(".btn__label").textContent =
    step === TOTAL ? "Open workspace" : "Continue";

  if (focus)
    panels
      .find((p) => !p.hidden)
      .querySelector("h1")
      .focus({ preventScroll: true });
}

function restoreInputs() {
  ["teamType", "role", "size"].forEach((name) => {
    form
      .querySelectorAll(`input[name="${name}"]`)
      .forEach((r) => (r.checked = r.value === state[name]));
  });
  form
    .querySelectorAll('input[name="goals"]')
    .forEach((c) => (c.checked = state.goals.includes(c.value)));
  workspaceInput.value = state.workspace;
  projectInput.value = state.project;
  renderInvites();
}

/* Invites ------------------------------------------------------------------ */
function renderInvites() {
  inviteList.innerHTML = "";
  state.invites.forEach((email) => {
    const li = document.createElement("li");
    li.className = "invite-chip";
    li.innerHTML = `<span></span><button type="button" aria-label="Remove invite"><svg class="icon" aria-hidden="true" focusable="false"><use href="#i-x"></use></svg></button>`;
    li.querySelector("span").textContent = email;
    li.querySelector("button").setAttribute("aria-label", `Remove ${email}`);
    li.querySelector("button").addEventListener("click", () => {
      state.invites = state.invites.filter((e) => e !== email);
      persist();
      renderInvites();
      inviteInput.focus();
    });
    inviteList.appendChild(li);
  });
}

function addInvite() {
  hideError("err-7");
  const value = inviteInput.value.trim().toLowerCase();
  if (!value) return true;
  if (!isEmail(value)) {
    showError("err-7", "Enter a valid email address.");
    inviteInput.focus();
    return false;
  }
  if (value === (user?.email || "").toLowerCase()) {
    showError("err-7", "That’s your own email—you’re already in.");
    return false;
  }
  if (state.invites.includes(value)) {
    showError("err-7", "You’ve already added that email.");
    return false;
  }
  if (state.invites.length >= 20) {
    showError("err-7", "You can invite up to 20 people right now.");
    return false;
  }
  state.invites.push(value);
  inviteInput.value = "";
  persist();
  renderInvites();
  return true;
}

/* Validation --------------------------------------------------------------- */
function validate(step) {
  switch (step) {
    case 2:
      if (!state.teamType)
        return (
          showError("err-2", "Choose the option that fits your team best."),
          false
        );
      break;
    case 3:
      if (!state.role)
        return (
          showError("err-3", "Choose the role that’s closest to yours."),
          false
        );
      break;
    case 4:
      if (!state.size)
        return (showError("err-4", "Choose your team size."), false);
      break;
    case 5:
      if (!state.goals.length)
        return (
          showError("err-5", "Pick at least one goal to continue."),
          false
        );
      break;
    case 6:
      if (state.workspace.trim().length < 2) {
        showError(
          "err-6",
          "Give your workspace a name with at least 2 characters.",
        );
        workspaceInput.setAttribute("aria-invalid", "true");
        workspaceInput.focus();
        return false;
      }
      break;
    case 7:
      return addInvite();
    case 8:
      if (state.project.trim().length < 2) {
        showError(
          "err-8",
          "Give your project a name with at least 2 characters.",
        );
        projectInput.setAttribute("aria-invalid", "true");
        projectInput.focus();
        return false;
      }
      break;
  }
  return true;
}

/* Persist to Firestore ----------------------------------------------------- */
const slugify = (s) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "workspace";

async function saveOnboarding() {
  const workspaceRef = doc(collection(db, "workspaces"));
  const projectRef = doc(
    collection(db, "workspaces", workspaceRef.id, "projects"),
  );
  const batch = writeBatch(db);

  batch.set(workspaceRef, {
    name: state.workspace.trim(),
    slug: slugify(state.workspace),
    ownerId: user.uid,
    teamType: state.teamType,
    teamSize: state.size,
    goals: state.goals,
    plan: "free",
    createdAt: serverTimestamp(),
  });
  batch.set(doc(db, "workspaces", workspaceRef.id, "members", user.uid), {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || "",
    role: "owner",
    status: "active",
    joinedAt: serverTimestamp(),
  });
  batch.set(projectRef, {
    name: state.project.trim(),
    status: "active",
    progress: 0,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
  });
  state.invites.forEach((email) => {
    batch.set(doc(collection(db, "workspaces", workspaceRef.id, "invites")), {
      email,
      role: "member",
      status: "pending",
      invitedBy: user.uid,
      createdAt: serverTimestamp(),
    });
  });
  batch.set(
    doc(db, "users", user.uid),
    {
      onboardingComplete: true,
      jobRole: state.role,
      defaultWorkspaceId: workspaceRef.id,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await batch.commit();
}

/* Navigation --------------------------------------------------------------- */
async function next() {
  if (saving) return;
  const step = state.step;

  if (step === TOTAL) {
    localStorage.removeItem(KEY);
    return location.assign("dashboard.html");
  }
  if (!validate(step)) return;

  if (step === 8) {
    saving = true;
    saveError.hidden = true;
    setLoading(btnNext, true, "Creating workspace…");
    btnBack.disabled = true;
    try {
      await saveOnboarding();
      render(9);
    } catch (error) {
      const offline = error.code === "unavailable" || !navigator.onLine;
      saveError.querySelector("span").textContent = offline
        ? "We couldn’t reach the network. Check your connection and try again."
        : "We couldn’t create your workspace just yet. Please try again.";
      saveError.hidden = false;
    } finally {
      saving = false;
      setLoading(btnNext, false);
      btnBack.disabled = false;
    }
    return;
  }
  render(step + 1, "forward");
}

function back() {
  if (state.step === 1) return location.assign("index.html");
  render(state.step - 1, "back");
}

/* Events ------------------------------------------------------------------- */
form.addEventListener("submit", (e) => {
  e.preventDefault();
  next();
});
btnBack.addEventListener("click", back);
btnSkip.addEventListener("click", () => {
  inviteInput.value = "";
  hideError("err-7");
  render(8, "forward");
});
document.getElementById("invite-add").addEventListener("click", () => {
  addInvite();
  inviteInput.focus();
});
inviteInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    if (inviteInput.value.trim()) addInvite();
    else next();
  }
});
inviteInput.addEventListener("input", () => hideError("err-7"));

form.addEventListener("change", (e) => {
  const t = e.target;
  if (t.name === "goals") {
    state.goals = [...form.querySelectorAll('input[name="goals"]:checked')].map(
      (c) => c.value,
    );
    hideError("err-5");
  } else if (["teamType", "role", "size"].includes(t.name)) {
    state[t.name] = t.value;
    hideError({ teamType: "err-2", role: "err-3", size: "err-4" }[t.name]);
  }
  persist();
});

workspaceInput.addEventListener("input", () => {
  state.workspace = workspaceInput.value;
  workspaceInput.removeAttribute("aria-invalid");
  hideError("err-6");
  persist();
});
projectInput.addEventListener("input", () => {
  state.project = projectInput.value;
  projectInput.removeAttribute("aria-invalid");
  hideError("err-8");
  saveError.hidden = true;
  persist();
});

/* Boot: require auth, skip if already onboarded ---------------------------- */
onAuthStateChanged(auth, async (u) => {
  if (!u) return location.replace("login.html?next=onboarding.html");
  user = u;
  try {
    const snap = await getDoc(doc(db, "users", u.uid));
    if (snap.exists() && snap.data().onboardingComplete) {
      localStorage.removeItem(KEY);
      return location.replace("dashboard.html");
    }
  } catch {
    /* offline: continue with the flow */
  }

  if (!state.workspace && u.displayName) state.workspace = u.displayName;
  restoreInputs();
  render(Math.min(Math.max(state.step, 1), TOTAL - 1), "forward", false);
});
