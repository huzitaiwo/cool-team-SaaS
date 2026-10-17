import { session, esc, icon } from "./app-shell.js";
import { db } from "./firebase.js";
import {
  doc,
  collection,
  getDocs,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { toast, confirmDialog, errorBox } from "./ui.js";

const $ = (s) => document.querySelector(s);
const root = $("#billing-root");

const PLANS = {
  free: {
    name: "Free",
    price: 0,
    limits: { members: 2, projects: 3, storage: 1, guests: 2 },
  },
  starter: {
    name: "Starter",
    price: 12,
    limits: { members: 5, projects: 25, storage: 20, guests: 5 },
  },
  team: {
    name: "Team",
    price: 24,
    limits: { members: 20, projects: 50, storage: 100, guests: 15 },
  },
  business: {
    name: "Business",
    price: 49,
    limits: { members: 100, projects: 200, storage: 500, guests: 50 },
  },
};
const ORDER = ["free", "starter", "team", "business"];
const LABELS = {
  members: "Members",
  projects: "Active projects",
  storage: "Storage",
  guests: "Guest reviewers",
};

const fmtDate = (d) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(d);
const fmtShort = (d) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    d,
  );
const money = (n) => `$${n.toFixed(2)}`;
const monthStart = (back) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - back);
  return d;
};
const endOfMonth = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth() + 1, 0);
};

let ctx = null,
  mode = "live",
  model = null;
const canManage = () =>
  mode === "demo" ||
  mode === "pastdue" ||
  ["owner", "admin"].includes(ctx?.role);

/* Data --------------------------------------------------------------------- */
function demoModel(pastDue = false) {
  const seats = 8,
    price = PLANS.team.price;
  return {
    plan: "team",
    status: "active",
    effective: null,
    usage: { members: seats, projects: 6, storage: 38, guests: 3 },
    invoices: [183, 170, 158].map((n, i) => ({
      id: `INV-${String(n).padStart(4, "0")}`,
      date: monthStart(i),
      amount: seats * price,
      status: pastDue && i === 0 ? "past_due" : "paid",
    })),
    seats,
    pastDue,
  };
}

async function liveModel() {
  const ws = ctx.workspace;
  if (!ws) throw new Error("no workspace");
  const [members, projects, invites, invoices] = await Promise.all([
    getDocs(collection(db, "workspaces", ws.id, "members")),
    getDocs(collection(db, "workspaces", ws.id, "projects")),
    getDocs(collection(db, "workspaces", ws.id, "invites")),
    getDocs(collection(db, "workspaces", ws.id, "invoices")),
  ]);
  const guests =
    members.docs.filter((d) => d.data().role === "guest").length +
    invites.docs.filter((d) => d.data().role === "guest").length;
  return {
    plan: PLANS[ws.plan] ? ws.plan : "free",
    status: ws.planStatus || "active",
    effective: ws.cancelEffective ? new Date(ws.cancelEffective) : null,
    usage: {
      members: members.size,
      projects: projects.docs.filter((d) => d.data().status !== "archived")
        .length,
      storage: 0,
      guests,
    },
    invoices: invoices.docs
      .map((d) => ({
        id: d.id,
        ...d.data(),
        date: d.data().date?.toDate?.() || new Date(),
      }))
      .sort((a, b) => b.date - a.date),
    seats: Math.max(members.size, 1),
    pastDue: false,
  };
}

async function persist(patch) {
  Object.assign(model, patch);
  if (mode === "live") {
    const fields = {};
    if ("plan" in patch) fields.plan = patch.plan;
    if ("status" in patch) fields.planStatus = patch.status;
    if ("effective" in patch)
      fields.cancelEffective = patch.effective
        ? patch.effective.toISOString()
        : null;
    await updateDoc(doc(db, "workspaces", ctx.workspace.id), fields);
  }
}

/* Rendering ---------------------------------------------------------------- */
const pct = (v, l) => Math.min(100, Math.round((v / l) * 100));

function bannerHTML() {
  const p = PLANS[model.plan];
  if (model.pastDue) {
    return `<div class="banner banner--danger" role="alert"><span class="banner__icon" aria-hidden="true">${icon("alert-circle")}</span>
      <p class="banner__text"><strong>Your last payment didn’t go through.</strong>Update your payment method before the grace period ends to keep your workspace running.</p>
      <button class="btn btn--danger btn--md" type="button" data-act="payment">Update payment method</button></div>`;
  }
  if (model.status === "cancelling") {
    return `<div class="banner banner--warning" role="status"><span class="banner__icon" aria-hidden="true">${icon("clock")}</span>
      <p class="banner__text"><strong>Your plan ends on ${fmtDate(model.effective)}.</strong>You’re in a grace period and keep full access until then. Your files and projects stay put.</p>
      <button class="btn btn--primary btn--md" type="button" data-act="resume">Keep my plan</button></div>`;
  }
  const hit = Object.entries(p.limits).find(([k, l]) => model.usage[k] >= l);
  const next = PLANS[ORDER[ORDER.indexOf(model.plan) + 1]];
  if (hit && next) {
    return `<div class="banner banner--info" role="status"><span class="banner__icon" aria-hidden="true">${icon("sparkles")}</span>
      <p class="banner__text"><strong>You’ve reached your ${LABELS[hit[0]].toLowerCase()} limit.</strong>${next.name} raises it to ${hit[0] === "storage" ? `${next.limits.storage} GB` : next.limits[hit[0]]}. Nothing stops working until you’re ready.</p>
      <button class="btn btn--primary btn--md" type="button" data-act="upgrade" data-plan="${ORDER[ORDER.indexOf(model.plan) + 1]}">Upgrade to ${next.name}</button></div>`;
  }
  return "";
}

function usageHTML() {
  const limits = PLANS[model.plan].limits;
  return Object.entries(limits)
    .map(([k, l]) => {
      const v = model.usage[k],
        p = pct(v, l);
      const tone =
        v >= l
          ? "progress__bar--danger"
          : p >= 80
            ? "progress__bar--amber"
            : "progress__bar--teal";
      const val = k === "storage" ? `${v} / ${l} GB` : `${v} / ${l}`;
      const note =
        v >= l
          ? ' <em class="is-over">· Limit reached</em>'
          : p >= 80
            ? " <em>· Near limit</em>"
            : "";
      return `<div class="usage">
      <div class="usage__row"><strong>${LABELS[k]}</strong><span>${val}${note}</span></div>
      <div class="progress" role="progressbar" aria-label="${LABELS[k]} usage" aria-valuemin="0" aria-valuemax="${l}" aria-valuenow="${v}"><span class="progress__bar ${tone}" style="--value:${p}%"></span></div>
    </div>`;
    })
    .join("");
}

function planCardHTML() {
  const p = PLANS[model.plan];
  const paid = p.price > 0;
  const meta = paid
    ? `${money(p.price).replace(".00", "")} per member / month · ${model.status === "cancelling" ? `Ends ${fmtShort(model.effective)}` : `Next bill ${fmtShort(endOfMonth())}`}`
    : "Free for focused personal work · No billing";
  const options =
    ORDER.map(
      (k) =>
        `<option value="${k}"${k === model.plan ? " selected" : ""}>${PLANS[k].name}</option>`,
    ).join("") + '<option value="enterprise">Enterprise — contact us</option>';
  return `
  <section class="plan-card" aria-labelledby="plan-name">
    <p class="plan-card__eyebrow">Current plan</p>
    <h2 class="plan-card__name" id="plan-name">${p.name}</h2>
    <p class="plan-card__meta">${meta}</p>
    ${paid ? icon("credit-card", "plan-card__icon") : ""}
    <div class="plan-card__actions">
      <label class="sr-only" for="plan-select">Change plan</label>
      <select class="plan-card__select" id="plan-select"${canManage() ? "" : " disabled"}>${options}</select>
      ${paid && model.status === "active" ? `<button class="btn btn--outline-light" type="button" data-act="cancel"${canManage() ? "" : " disabled"}>Cancel plan</button>` : ""}
    </div>
    <p class="plan-card__foot">${canManage() ? "" : "Only owners and admins can change the plan. "}<strong>Payment method:</strong> ${paid ? "None on file yet." : "Not needed on Free."} Payments aren’t connected yet, so nothing is charged.</p>
  </section>`;
}

function invoicesHTML() {
  const rows = model.invoices
    .map(
      (i) => `
    <li class="invoice">
      <div><strong>${esc(i.id)}</strong><small>${fmtDate(i.date)}</small></div>
      <span class="badge ${i.status === "past_due" ? "badge--danger" : "badge--success"}">${i.status === "past_due" ? "Past due" : "Paid"}</span>
      <span class="invoice__amount">${money(Number(i.amount) || 0)}</span>
      <button class="billing-actions" type="button" data-act="download" data-id="${esc(i.id)}" aria-label="Download invoice ${esc(i.id)}">Download</button>
    </li>`,
    )
    .join("");
  return `
  <section class="panel invoices" aria-labelledby="inv-title">
    <div class="invoices__head">
      <div><h2 class="panel__title" id="inv-title">Invoice history</h2><p class="panel__sub">Your latest billing records.</p></div>
      <button class="billing-actions" type="button" data-act="download-all"${model.invoices.length ? "" : " disabled"}>Download all</button>
    </div>
    ${model.invoices.length ? `<ul>${rows}</ul>` : `<div class="state-box" style="border-top:1px solid var(--color-border)"><span class="state-box__icon" aria-hidden="true">${icon("credit-card")}</span><h3>No invoices yet.</h3><p>Invoices appear here after your first payment on a paid plan.</p></div>`}
  </section>`;
}

function render() {
  if (mode === "loading") {
    root.innerHTML = `<div class="stack" aria-hidden="true"><div class="billing-grid">
      <div class="skeleton" style="--h:18rem;border-radius:1.3rem"></div><div class="skeleton" style="--h:18rem;border-radius:1.2rem"></div></div>
      <div class="skeleton" style="--h:15rem;border-radius:1.2rem"></div></div>`;
    root.setAttribute("aria-busy", "true");
    return;
  }
  root.removeAttribute("aria-busy");
  if (mode === "error") {
    root.innerHTML = `<section class="panel">${errorBox()}</section>`;
    return;
  }

  root.innerHTML = `<div class="stack">
    ${bannerHTML()}
    <div class="billing-grid">
      ${planCardHTML()}
      <section class="panel" aria-labelledby="usage-title">
        <div class="panel__head"><div><h2 class="panel__title" id="usage-title">Plan usage</h2><p class="panel__sub">You’ll always see limits before they interrupt work.</p></div></div>
        <div class="usage-list">${usageHTML()}</div>
      </section>
    </div>
    ${invoicesHTML()}
  </div>`;
  $("#status").textContent =
    `Billing loaded. Current plan: ${PLANS[model.plan].name}.`;
}

/* Actions ------------------------------------------------------------------ */
async function changePlan(key) {
  if (key === "enterprise") return location.assign("contact.html");
  if (key === model.plan) return;
  const cur = PLANS[model.plan],
    next = PLANS[key];
  const over = Object.entries(next.limits)
    .filter(([k, l]) => model.usage[k] > l)
    .map(([k]) => LABELS[k].toLowerCase());
  if (over.length) {
    toast(`Reduce ${over.join(" and ")} before moving to ${next.name}.`);
    return render();
  }
  const up = next.price > cur.price;
  const ok = await confirmDialog({
    title: `${up ? "Upgrade" : "Downgrade"} to ${next.name}?`,
    text: `${next.price ? `${money(next.price).replace(".00", "")} per member / month from your next bill.` : "You’ll move to the free plan."} Payments aren’t connected yet, so nothing is charged.`,
    confirmLabel: `${up ? "Upgrade" : "Downgrade"} to ${next.name}`,
  });
  if (!ok) return render();
  try {
    await persist({
      plan: key,
      status: "active",
      effective: null,
      pastDue: false,
    });
    render();
    toast(`You’re now on ${next.name}`);
  } catch {
    toast("Couldn’t change your plan. Check your connection and try again.");
    render();
  }
}

const cancelModal = $("#cancel-modal");
const cancelReason = $("#cancel-reason");
const cancelSubmit = $("#cancel-submit");

function openCancel() {
  const end = endOfMonth();
  $("#cancel-text").textContent =
    `You’ll keep full access until ${fmtDate(end)} — your grace period. After that your workspace moves to Free, and anything over its limits becomes read-only. You can keep your plan any time before then.`;
  $("#cancel-form").reset();
  cancelSubmit.disabled = true;
  cancelModal.showModal();
  cancelReason.focus();
}
cancelReason.addEventListener("change", () => {
  cancelSubmit.disabled = !cancelReason.value;
});
cancelModal.addEventListener("click", (e) => {
  if (e.target === cancelModal || e.target.closest("[data-close]"))
    cancelModal.close();
});
$("#cancel-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  cancelSubmit.disabled = true;
  cancelSubmit.textContent = "Cancelling…";
  try {
    await persist({ status: "cancelling", effective: endOfMonth() });
    cancelModal.close();
    render();
    toast("Plan cancelled — grace period started");
  } catch {
    toast("Couldn’t cancel the plan. Try again.");
  } finally {
    cancelSubmit.textContent = "Cancel plan";
    cancelSubmit.disabled = !cancelReason.value;
  }
});

function invoiceText(i) {
  const p = PLANS[model.plan];
  return [
    `CoolTeam invoice ${i.id}`,
    `Date: ${fmtDate(i.date)}`,
    `Workspace: ${ctx.workspace?.name || "Your workspace"}`,
    `Plan: ${p.name} (${model.seats} members × ${money(p.price)})`,
    `Total: ${money(Number(i.amount) || 0)}`,
    `Status: ${i.status === "past_due" ? "Past due" : "Paid"}`,
  ].join("\n");
}
function download(name, text, type = "text/plain") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

root.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-act]");
  if (!b) {
    if (e.target.closest("[data-retry]")) {
      mode = "live";
      $('input[value="live"]').checked = true;
      load();
    }
    return;
  }
  const act = b.dataset.act;
  if (act === "cancel") openCancel();
  if (act === "upgrade") changePlan(b.dataset.plan);
  if (act === "payment")
    toast("Payments aren’t connected yet, so there’s nothing to update.");
  if (act === "resume") {
    try {
      await persist({ status: "active", effective: null });
      render();
      toast("Your plan is back on");
    } catch {
      toast("Couldn’t resume the plan. Try again.");
    }
  }
  if (act === "download") {
    const i = model.invoices.find((x) => x.id === b.dataset.id);
    download(`${i.id}.txt`, invoiceText(i));
  }
  if (act === "download-all")
    download(
      "coolteam-invoices.csv",
      [
        "Invoice,Date,Amount,Status",
        ...model.invoices.map(
          (i) =>
            `${i.id},${fmtDate(i.date)},${Number(i.amount) || 0},${i.status}`,
        ),
      ].join("\n"),
      "text/csv",
    );
});
root.addEventListener("change", (e) => {
  if (e.target.id === "plan-select") changePlan(e.target.value);
});

/* Modes -------------------------------------------------------------------- */
async function load() {
  mode === "live"
    ? (render.call(null), (mode = "loading"), render(), (mode = "live"))
    : null;
  try {
    model = mode === "live" ? await liveModel() : demoModel(mode === "pastdue");
    render();
  } catch {
    mode = "error";
    render();
  }
}

document.querySelectorAll('input[name="mode"]').forEach((r) =>
  r.addEventListener("change", async () => {
    mode = r.value;
    if (mode === "loading" || mode === "error") return render();
    if (mode === "live") {
      model = null;
      return load();
    }
    model = demoModel(mode === "pastdue");
    render();
  }),
);

session.then((s) => {
  ctx = s;
  load();
});
