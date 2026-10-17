import { session, esc } from "./app-shell.js";
import { avatar, emptyBox, toast } from "./ui.js";

const $ = (s) => document.querySelector(s);
const body = $("#files-body");

const KINDS = {
  video: [
    "Video",
    "linear-gradient(135deg,#8b45f0,#5b3de0)",
    ["mp4", "mov", "webm", "mkv"],
  ],
  pdf: ["PDF", "linear-gradient(135deg,#ff5d7a,#ff7a1a)", ["pdf"]],
  archive: [
    "Archive",
    "linear-gradient(135deg,#00d5be,#0891a8)",
    ["zip", "rar", "7z", "tar", "gz"],
  ],
  doc: [
    "Document",
    "linear-gradient(135deg,#00a6ff,#2563eb)",
    ["doc", "docx", "txt", "md", "rtf"],
  ],
  image: [
    "Image",
    "linear-gradient(135deg,#f472b6,#a855f7)",
    ["png", "jpg", "jpeg", "gif", "svg", "webp", "fig"],
  ],
  other: ["File", "linear-gradient(135deg,#94a3b8,#64748b)", []],
};
const kindOf = (name) => {
  const ext = name.split(".").pop().toLowerCase();
  return Object.keys(KINDS).find((k) => KINDS[k][2].includes(ext)) || "other";
};
const size = (b) =>
  b >= 1048576
    ? `${(b / 1048576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(b / 1024))} KB`;

let files = [
  {
    id: 1,
    name: "Northstar-motion-v3.mp4",
    kind: "video",
    size: "28.5 MB",
    by: "olanma",
  },
  {
    id: 2,
    name: "Identity-guidelines.pdf",
    kind: "pdf",
    size: "4.2 MB",
    by: "handsome",
  },
  {
    id: 3,
    name: "Campaign-assets.zip",
    kind: "archive",
    size: "112 MB",
    by: "waliyat",
  },
  {
    id: 4,
    name: "Client-brief.docx",
    kind: "doc",
    size: "0.8 MB",
    by: "warwick",
  },
];
let view = "grid",
  q = "",
  me = null;

function cardHTML(f) {
  const [label, gradient] = KINDS[f.kind];
  return `
  <article class="file-card${f.uploading ? " is-uploading" : ""}" data-id="${f.id}">
    <div class="file-card__thumb" style="--g:${gradient}"><svg class="icon" aria-hidden="true" focusable="false"><use href="#i-file-image"></use></svg></div>
    <div class="file-card__body">
      <div>
        <h3 class="file-card__name">${esc(f.name)}</h3>
        <p class="file-card__meta">${f.uploading ? `Uploading… ${f.progress}%` : `${label} · ${esc(f.size)}`}</p>
        ${f.uploading ? `<div class="progress" role="progressbar" aria-label="Uploading ${esc(f.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${f.progress}"><span class="progress__bar" style="--value:${f.progress}%;animation:none"></span></div>` : ""}
      </div>
      ${avatar(f.by)}
    </div>
  </article>`;
}

function render() {
  const term = q.trim().toLowerCase();
  const list = files.filter(
    (f) => !term || f.name.toLowerCase().includes(term),
  );
  if (!list.length) {
    body.innerHTML = term
      ? emptyBox("No files match.", "Try a different search term.")
      : emptyBox(
          "No creative files yet.",
          "Upload your first file to start building a shared library.",
          { label: "Upload file", attr: "data-upload" },
        );
    return;
  }
  body.innerHTML = `<div class="file-grid${view === "list" ? " file-grid--list" : ""}">${list.map(cardHTML).join("")}</div>`;
  $("#status").textContent =
    `${list.length} file${list.length === 1 ? "" : "s"} shown.`;
}

/* Upload (client-side preview; wire to Firebase Storage when ready) */
function upload(fileList) {
  [...fileList].forEach((file) => {
    const entry = {
      id: Date.now() + Math.random(),
      name: file.name,
      kind: kindOf(file.name),
      size: size(file.size),
      by: "handsome",
      uploading: true,
      progress: 0,
    };
    files.unshift(entry);
    const timer = setInterval(() => {
      entry.progress = Math.min(
        100,
        entry.progress + 10 + Math.round(Math.random() * 18),
      );
      if (entry.progress >= 100) {
        clearInterval(timer);
        entry.uploading = false;
        toast(`${entry.name} uploaded`);
      }
      render();
    }, 220);
  });
  render();
}

$("#upload-btn").addEventListener("click", () => $("#file-input").click());
$("#file-input").addEventListener("change", (e) => {
  if (e.target.files.length) upload(e.target.files);
  e.target.value = "";
});
body.addEventListener("click", (e) => {
  if (e.target.closest("[data-upload]")) $("#file-input").click();
});
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

session.then((s) => {
  me = s;
  render();
});
