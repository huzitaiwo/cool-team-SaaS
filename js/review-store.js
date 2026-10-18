/* ==========================================================================
   CoolTeam · review-store.js — review data layer.
   Demo reviews live in localStorage; swap loadReview/persistReview for
   Firestore (workspaces/{id}/reviews/{reviewId}) when files are stored.
   ========================================================================== */

const KEY = (id) => `coolteam.review.${id}`;
const ago = (mins) => new Date(Date.now() - mins * 60000).toISOString();
const DAY = 1440;

export const PEOPLE_REVIEW = {
  olanma: { name: "Olanma", initials: "OL", color: "rose" },
  pris: { name: "Pris", initials: "PR", color: "blue" },
  warwick: { name: "Warwick", initials: "WA", color: "teal" },
  handsome: { name: "Handsome", initials: "HA", color: "" },
  waliyat: { name: "Waliyat", initials: "WL", color: "amber" },
};
const P = PEOPLE_REVIEW;

function seed(id, name) {
  if (id === "northstar-motion") {
    return {
      id,
      name: "Northstar motion study",
      project: "Northstar identity",
      status: "in-review",
      versions: [
        {
          n: 1,
          by: P.olanma.name,
          at: ago(6 * DAY),
          note: "Initial direction",
        },
        {
          n: 2,
          by: P.olanma.name,
          at: ago(3 * DAY),
          note: "Round-one notes applied",
        },
        {
          n: 3,
          by: P.olanma.name,
          at: ago(1 * DAY),
          note: "Pace and palette updated",
        },
      ],
      comments: [
        {
          id: "c1",
          version: 1,
          x: 30,
          y: 40,
          author: P.pris,
          text: "The opening feels too busy—can we simplify the first beat?",
          at: ago(5 * DAY),
          resolved: true,
          replies: [
            { author: P.olanma, text: "Simplified in v2.", at: ago(4 * DAY) },
          ],
        },
        {
          id: "c2",
          version: 1,
          x: null,
          y: null,
          author: P.warwick,
          text: "Let’s keep the wordmark large and centred in the final frame.",
          at: ago(5 * DAY),
          resolved: true,
          replies: [],
        },
        {
          id: "c3",
          version: 2,
          x: 70,
          y: 25,
          author: P.pris,
          text: "Love the teal glow. Could it arrive a touch later?",
          at: ago(2 * DAY),
          resolved: true,
          replies: [],
        },
        {
          id: "c4",
          version: 2,
          x: 20,
          y: 75,
          author: P.warwick,
          text: "Caption timing needs another pass.",
          at: ago(2 * DAY),
          resolved: true,
          replies: [],
        },
        {
          id: "c5",
          version: 3,
          x: 42,
          y: 55,
          author: P.pris,
          text: "Please hold the pace here.",
          at: ago(14),
          resolved: false,
          replies: [],
        },
        {
          id: "c6",
          version: 3,
          x: 78,
          y: 82,
          author: P.warwick,
          text: "Palette feels right—check contrast on the caption chip.",
          at: ago(55),
          resolved: false,
          replies: [
            {
              author: P.olanma,
              text: "On it—will bump it in the next version.",
              at: ago(30),
            },
          ],
        },
      ],
      history: [
        { text: "Version 1 uploaded by Olanma", at: ago(6 * DAY) },
        { text: "Changes requested by Pris", at: ago(5 * DAY) },
        { text: "Version 2 uploaded by Olanma", at: ago(3 * DAY) },
        { text: "Changes requested by Pris", at: ago(2 * DAY) },
        { text: "Version 3 uploaded by Olanma", at: ago(1 * DAY) },
        { text: "Sent for review", at: ago(1 * DAY) },
      ],
    };
  }
  return {
    id,
    name: name || "Untitled file",
    project: "Unassigned",
    status: "draft",
    versions: [
      { n: 1, by: "You", at: new Date().toISOString(), note: "First upload" },
    ],
    comments: [],
    history: [{ text: "Version 1 uploaded", at: new Date().toISOString() }],
  };
}

export function loadReview(id, name) {
  try {
    const v = JSON.parse(localStorage.getItem(KEY(id)));
    if (v) return v;
  } catch {}
  const r = seed(id, name);
  localStorage.setItem(KEY(id), JSON.stringify(r));
  return r;
}

export function persistReview(review) {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      try {
        localStorage.setItem(KEY(review.id), JSON.stringify(review));
        resolve();
      } catch (e) {
        reject(e);
      }
    }, 250),
  );
}
