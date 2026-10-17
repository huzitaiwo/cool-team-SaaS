import { db } from "./firebase.js";
import { PROJECTS } from "./sample-data.js";
import {
  collection,
  getDocs,
  addDoc,
  setDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export const STATUSES = [
  ["backlog", "Backlog"],
  ["todo", "To Do"],
  ["in-progress", "In Progress"],
  ["review", "Review"],
  ["done", "Done"],
];

const isDemo = (pid) => PROJECTS.some((p) => p.id === pid);
const lsKey = (pid) => `coolteam.tasks.${pid}`;
const isoIn = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const ago = (mins) => new Date(Date.now() - mins * 60000).toISOString();

const SEED = [
  [
    "Collect visual references for the campaign",
    "backlog",
    "low",
    "olanma",
    2,
    ["Research"],
    [
      ["Pull a moodboard", 1],
      ["Tag references by theme", 0],
    ],
  ],
  [
    "Map the new client onboarding flow",
    "todo",
    "high",
    "warwick",
    1,
    ["UX"],
    [
      ["Draft the happy path", 1],
      ["List edge cases", 0],
      ["Review with client", 0],
    ],
  ],
  [
    "Build out the brand motion studies",
    "in-progress",
    "high",
    "olanma",
    2,
    ["Motion", "Brand"],
    [
      ["Storyboard", 1],
      ["Animate the logo reveal", 1],
      ["Export previews", 0],
    ],
  ],
  [
    "Prepare version three for client review",
    "review",
    "medium",
    "handsome",
    0,
    ["Review"],
    [
      ["Apply round-two notes", 1],
      ["Export the deck", 1],
    ],
  ],
  ["Write the identity story", "todo", "medium", "warwick", 5, ["Copy"], []],
  [
    "Define social usage guidelines",
    "done",
    "medium",
    "waliyat",
    -3,
    ["Brand"],
    [],
  ],
  [
    "Finalize logo lockups",
    "done",
    "high",
    "handsome",
    -5,
    ["Brand"],
    [
      ["Horizontal", 1],
      ["Stacked", 1],
    ],
  ],
];

function seed() {
  return SEED.map(
    ([title, status, priority, assignee, due, labels, subs], i) => ({
      id: `seed-${i}`,
      title,
      status,
      priority,
      assignee,
      due: isoIn(due),
      labels,
      description: "",
      subtasks: subs.map(([text, done]) => ({ text, done: !!done })),
      comments:
        i === 2
          ? [
              {
                name: "Olanma",
                initials: "OL",
                color: "rose",
                text: "First pass of the reveal is in the folder—feedback welcome.",
                at: ago(95),
              },
            ]
          : [],
      activity: [{ text: "Task created", at: ago(60 * 24 * (i + 1)) }],
      order: (i + 1) * 1000,
    }),
  );
}

const read = (pid) => {
  try {
    const v = JSON.parse(localStorage.getItem(lsKey(pid)));
    if (v) return v;
  } catch {}
  const s = seed();
  write(pid, s);
  return s;
};
const write = (pid, tasks) => {
  try {
    localStorage.setItem(lsKey(pid), JSON.stringify(tasks));
  } catch {}
};
const col = (ws, pid) =>
  collection(db, "workspaces", ws, "projects", pid, "tasks");

export async function listTasks(ws, pid) {
  if (isDemo(pid)) return read(pid);
  const snap = await getDocs(query(col(ws, pid), orderBy("order")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createTask(ws, pid, data) {
  const task = {
    title: "",
    status: "todo",
    priority: "medium",
    assignee: "",
    due: "",
    labels: [],
    description: "",
    subtasks: [],
    comments: [],
    activity: [{ text: "Task created", at: new Date().toISOString() }],
    order: Date.now(),
    ...data,
  };
  if (isDemo(pid)) {
    task.id = `t-${Date.now()}`;
    const all = read(pid);
    all.push(task);
    write(pid, all);
    return task;
  }
  const ref = await addDoc(col(ws, pid), task);
  return { id: ref.id, ...task };
}

export async function saveTask(ws, pid, task) {
  if (isDemo(pid)) {
    write(
      pid,
      read(pid).map((t) => (t.id === task.id ? task : t)),
    );
    return;
  }
  const { id, ...data } = task;
  await setDoc(doc(db, "workspaces", ws, "projects", pid, "tasks", id), data);
}

export async function removeTask(ws, pid, id) {
  if (isDemo(pid)) {
    write(
      pid,
      read(pid).filter((t) => t.id !== id),
    );
    return;
  }
  await deleteDoc(doc(db, "workspaces", ws, "projects", pid, "tasks", id));
}
