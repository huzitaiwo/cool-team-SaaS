/* CoolTeam · forms.js — shared validation + UI helpers */

export const isEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const errorEl = (input) => document.getElementById(`${input.id}-error`);

export function setFieldError(input, message) {
  const field = input.closest(".field");
  const error = errorEl(input);
  field.classList.add("has-error");
  input.setAttribute("aria-invalid", "true");
  if (error) {
    error.querySelector("span").textContent = message;
    error.hidden = false;
  }
}

export function clearFieldError(input) {
  const field = input.closest(".field");
  const error = errorEl(input);
  field.classList.remove("has-error");
  input.removeAttribute("aria-invalid");
  if (error) error.hidden = true;
}

export function showFormError(form, message) {
  const alert = form.querySelector(".form-alert");
  if (!alert) return;
  alert.querySelector("span").textContent = message;
  alert.hidden = false;
}

export function clearFormErrors(form) {
  form.querySelectorAll(".field__input").forEach(clearFieldError);
  const alert = form.querySelector(".form-alert");
  if (alert) alert.hidden = true;
}

export function setLoading(button, isLoading, loadingLabel = "Please wait…") {
  const label = button.querySelector(".btn__label");
  if (isLoading) {
    button.dataset.label = label.textContent;
    label.textContent = loadingLabel;
  } else if (button.dataset.label) {
    label.textContent = button.dataset.label;
  }
  button.classList.toggle("is-loading", isLoading);
  button.disabled = isLoading;
  button.setAttribute("aria-busy", String(isLoading));
}

export function initPasswordToggles(root = document) {
  root.querySelectorAll("[data-toggle-password]").forEach((btn) => {
    const input = document.getElementById(btn.getAttribute("aria-controls"));
    if (!input) return;
    btn.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.setAttribute("aria-pressed", String(show));
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
  });
}

export function initLiveClear(form) {
  form.querySelectorAll(".field__input").forEach((input) => {
    input.addEventListener("input", () => clearFieldError(input));
  });
}
