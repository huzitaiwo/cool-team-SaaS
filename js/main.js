/* ==========================================================================
   CoolTeam · main.js — behaviour shared by every page
   (must load AFTER components.js)
   ========================================================================== */
(() => {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  /* Header: solid background after scrolling ----------------------------- */
  const header = document.querySelector(".site-header");
  const onScroll = () =>
    header && header.classList.toggle("is-scrolled", window.scrollY > 24);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* Mobile menu ---------------------------------------------------------- */
  const toggle = document.querySelector(".menu-toggle");
  const menu = document.getElementById("mobile-menu");

  const setMenu = (open) => {
    if (!toggle || !menu) return;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.classList.toggle("is-open", open);
    menu.inert = !open;
  };

  if (toggle && menu) {
    toggle.addEventListener("click", () =>
      setMenu(toggle.getAttribute("aria-expanded") !== "true"),
    );
    menu.addEventListener(
      "click",
      (e) => e.target.closest("a") && setMenu(false),
    );
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menu.classList.contains("is-open")) {
        setMenu(false);
        toggle.focus();
      }
    });
    document.addEventListener("click", (e) => {
      if (
        menu.classList.contains("is-open") &&
        !menu.contains(e.target) &&
        !toggle.contains(e.target)
      )
        setMenu(false);
    });
    window
      .matchMedia("(min-width: 901px)")
      .addEventListener("change", (e) => e.matches && setMenu(false));
  }

  /* Scroll reveal -------------------------------------------------------- */
  const revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" },
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* Count-up numbers ----------------------------------------------------- */
  document.querySelectorAll("[data-count]").forEach((el) => {
    const target = Number(el.dataset.count);
    if (reduceMotion || Number.isNaN(target)) return;
    const duration = 1200;
    const start = performance.now() + 900;
    el.textContent = "0";
    const tick = (now) => {
      const t = Math.min(Math.max((now - start) / duration, 0), 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
})();
