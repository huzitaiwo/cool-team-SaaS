/* ==========================================================================
   CoolTeam · sample-data.js — demo content for the app until the real
   Projects / Tasks / Activity collections exist in Firestore.
   Edit names here and every page updates.
   ========================================================================== */

const fmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
export const inDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return fmt.format(d);
};

/* People (owner = Handsome) */
export const PEOPLE = {
  handsome: { name: "Handsome", initials: "HA", color: "" },
  warwick: { name: "Warwick", initials: "WA", color: "teal" },
  olanma: { name: "Olanma", initials: "OL", color: "rose" },
  waliyat: { name: "Waliyat", initials: "WL", color: "amber" },
  pris: { name: "Pris", initials: "PR", color: "blue" },
};

export const PROJECTS = [
  {
    id: "northstar",
    name: "Northstar identity",
    client: "Cryptix",
    due: inDays(7),
    progress: 72,
    status: "on-track",
    dot: "#5b45e6",
    members: ["handsome", "olanma", "waliyat"],
  },
  {
    id: "atlas",
    name: "Atlas launch system",
    client: "Folabs",
    due: inDays(13),
    progress: 42,
    status: "at-risk",
    dot: "#0f9d8a",
    members: ["handsome", "warwick", "olanma"],
  },
  {
    id: "fieldnotes",
    name: "Fieldnotes campaign",
    client: "Cryptix",
    due: inDays(21),
    progress: 88,
    status: "on-track",
    dot: "#f2733d",
    members: ["warwick", "waliyat"],
  },
  {
    id: "swell",
    name: "Swell web refresh",
    client: "Folabs",
    due: inDays(29),
    progress: 18,
    status: "on-track",
    dot: "#2563eb",
    members: ["olanma", "waliyat"],
  },
];

export const TASKS = [
  {
    id: "t1",
    title: "Collect visual references for the campaign",
    meta: `${inDays(0)} · Backlog`,
    assignee: "olanma",
  },
  {
    id: "t2",
    title: "Map the new client onboarding flow",
    meta: `${inDays(1)} · To Do`,
    assignee: "warwick",
  },
  {
    id: "t3",
    title: "Build out the brand motion studies",
    meta: `${inDays(2)} · In Progress`,
    assignee: "olanma",
  },
  {
    id: "t4",
    title: "Prepare version three for client review",
    meta: "Today · Review",
    assignee: "handsome",
  },
];

export const WORKLOAD = [
  { person: "handsome", planned: 68 },
  { person: "warwick", planned: 84 },
  { person: "olanma", planned: 52 },
  { person: "waliyat", planned: 39 },
];

export const ACTIVITY = [
  {
    person: "olanma",
    verb: "shared a new review version",
    target: "Northstar campaign visual system",
    time: "14m",
  },
  {
    person: "warwick",
    verb: "moved a task to",
    target: "In Progress",
    time: "39m",
  },
  {
    person: "waliyat",
    verb: "completed",
    target: "Define social usage guidelines",
    time: "1h",
  },
  {
    person: "pris",
    verb: "left feedback on",
    target: "Brand motion studies",
    time: "2h",
  },
];

export const STATS = [
  {
    key: "active",
    label: "Active projects",
    value: 6,
    note: "2 delivery dates this month",
    icon: "folder",
    tone: "purple",
  },
  {
    key: "due",
    label: "Due today",
    value: 4,
    note: "1 needs a review",
    icon: "clock",
    tone: "orange",
  },
  {
    key: "overdue",
    label: "Overdue",
    value: 1,
    note: "Check the Atlas launch",
    icon: "alert-circle",
    tone: "slate",
  },
  {
    key: "done",
    label: "Completed this week",
    value: 18,
    note: "+12% from last week",
    icon: "circle-check",
    tone: "teal",
  },
];

export const NOTIFICATIONS = [
  { text: "Pris left feedback on brand motion studies.", time: "14m ago" },
  { text: "Northstar identity is ready for review.", time: "39m ago" },
  { text: "You were mentioned in a project update.", time: "1h ago" },
];

export const COMMANDS = [
  {
    title: "Create project",
    desc: "Start a fresh workspace",
    href: "projects.html#new",
    icon: "plus",
  },
  {
    title: "Go to dashboard",
    desc: "See what needs attention",
    href: "dashboard.html",
    icon: "plus",
  },
  {
    title: "Open calendar",
    desc: "See deadlines and capacity",
    href: "calendar.html",
    icon: "plus",
  },
  {
    title: "Invite a member",
    desc: "Bring a teammate into your workspace",
    href: "team.html#invite",
    icon: "plus",
  },
  {
    title: "Open billing",
    desc: "Plans, usage, and invoices",
    href: "billing.html",
    icon: "plus",
  },
];

/* Swap this for Firestore queries when those pages exist */
export function fetchDashboard({ fail = false, delay = 700 } = {}) {
  return new Promise((resolve, reject) =>
    setTimeout(
      () =>
        fail
          ? reject(new Error("network"))
          : resolve({
              stats: STATS,
              projects: PROJECTS,
              tasks: TASKS,
              workload: WORKLOAD,
              activity: ACTIVITY,
            }),
      delay,
    ),
  );
}
