import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  isEmail,
  setFieldError,
  clearFormErrors,
  showFormError,
  setLoading,
  initPasswordToggles,
  initLiveClear,
} from "./forms.js";

const form = document.getElementById("login-form");
const email = document.getElementById("email");
const password = document.getElementById("password");
const submit = document.getElementById("login-submit");

const ERRORS = {
  "auth/invalid-credential":
    "That email and password don’t match. Check them and try again.",
  "auth/user-not-found":
    "That email and password don’t match. Check them and try again.",
  "auth/wrong-password":
    "That email and password don’t match. Check them and try again.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/user-disabled":
    "This account has been disabled. Contact your workspace owner.",
  "auth/too-many-requests":
    "Too many attempts. Wait a few minutes, or reset your password.",
  "auth/network-request-failed":
    "We couldn’t reach the network. Check your connection and try again.",
};

// Only allow same-site .html destinations (prevents open redirects)
const destination = () => {
  const next = new URLSearchParams(location.search).get("next") || "";
  return /^[\w\-/]+\.html$/.test(next) ? next : "dashboard.html";
};

onAuthStateChanged(auth, (user) => {
  if (user) location.replace(destination());
});

initPasswordToggles(form);
initLiveClear(form);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFormErrors(form);

  let invalid = null;
  if (!email.value.trim()) {
    setFieldError(email, "Enter your email address.");
    invalid = email;
  } else if (!isEmail(email.value)) {
    setFieldError(email, "Enter a valid email address.");
    invalid = email;
  }
  if (!password.value) {
    setFieldError(password, "Enter your password.");
    invalid = invalid || password;
  }
  if (invalid) return invalid.focus();

  setLoading(submit, true, "Signing in…");
  try {
    await signInWithEmailAndPassword(auth, email.value.trim(), password.value);
    location.replace(destination());
  } catch (error) {
    showFormError(
      form,
      ERRORS[error.code] ||
        "Something went wrong on our side. Please try again.",
    );
    setLoading(submit, false);
  }
});
