import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
  isEmail,
  passwordIsValid,
  setFieldError,
  clearFormErrors,
  showFormError,
  setLoading,
  initPasswordToggles,
  initPasswordChecklist,
  initLiveClear,
} from "./forms.js";

const form = document.getElementById("signup-form");
const nameInput = document.getElementById("name");
const email = document.getElementById("email");
const password = document.getElementById("password");
const submit = document.getElementById("signup-submit");

const ERRORS = {
  "auth/email-already-in-use":
    "An account with this email already exists. Try logging in instead.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/weak-password":
    "Choose a stronger password with at least 8 characters.",
  "auth/network-request-failed":
    "We couldn’t reach the network. Check your connection and try again.",
  "auth/too-many-requests":
    "Too many attempts. Please wait a few minutes and try again.",
};

let creating = false;

onAuthStateChanged(auth, (user) => {
  if (user && !creating) location.replace("onboarding.html");
});

initPasswordToggles(form);
initPasswordChecklist(password, document.getElementById("password-rules"));
initLiveClear(form);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFormErrors(form);

  let invalid = null;
  if (nameInput.value.trim().length < 2) {
    setFieldError(nameInput, "Enter your full name.");
    invalid = nameInput;
  }
  if (!email.value.trim()) {
    setFieldError(email, "Enter your email address.");
    invalid = invalid || email;
  } else if (!isEmail(email.value)) {
    setFieldError(email, "Enter a valid email address.");
    invalid = invalid || email;
  }
  if (!passwordIsValid(password.value)) {
    setFieldError(
      password,
      "Your password doesn’t meet all the requirements yet.",
    );
    invalid = invalid || password;
  }
  if (invalid) return invalid.focus();

  creating = true;
  setLoading(submit, true, "Creating account…");
  try {
    const { user } = await createUserWithEmailAndPassword(
      auth,
      email.value.trim(),
      password.value,
    );
    const displayName = nameInput.value.trim();
    await updateProfile(user, { displayName });
    await setDoc(doc(db, "users", user.uid), {
      displayName,
      email: user.email,
      onboardingComplete: false,
      createdAt: serverTimestamp(),
    });
    sendEmailVerification(user).catch(() => {}); // non-blocking
    location.replace("onboarding.html");
  } catch (error) {
    creating = false;
    showFormError(
      form,
      ERRORS[error.code] ||
        "Something went wrong on our side. Please try again.",
    );
    setLoading(submit, false);
  }
});
