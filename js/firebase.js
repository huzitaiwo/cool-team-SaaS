import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAsP7GiJxNHIHJARuuhyAQB3vbTX9jgkaE",
  authDomain: "cool-team-99ec2.firebaseapp.com",
  projectId: "cool-team-99ec2",
  storageBucket: "cool-team-99ec2.firebasestorage.app",
  messagingSenderId: "94196507482",
  appId: "1:94196507482:web:ca4f00ac85823330e04963",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
