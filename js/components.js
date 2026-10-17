/* ==========================================================================
   CoolTeam · components.js — shared markup injected on every page
   ========================================================================== */
(() => {
  /* Icon sprite ---------------------------------------------------------- */
  const icons = {
    "arrow-right": '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    "arrow-left": '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    "chevron-right": '<path d="m9 18 6-6-6-6"/>',
    play: '<polygon points="7 4 20 12 7 20 7 4" fill="currentColor"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    sparkles:
      '<path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0L14.06 8.5a2 2 0 0 0 1.44 1.44l6.14 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/>',
    menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    layers:
      '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
    calendar:
      '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/>',
    "shield-check":
      '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    command:
      '<path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/>',
    "circle-check": '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    "file-image":
      '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><circle cx="10" cy="13" r="2"/><path d="m20 17-1.1-1.1a2 2 0 0 0-2.8 0L10 22"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    eye: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
    "eye-off":
      '<path d="M10.73 5.08a10.74 10.74 0 0 1 11.21 6.57 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-1.44 2.49"/><path d="M14.08 14.16a3 3 0 0 1-4.24-4.24"/><path d="M17.48 17.5a10.75 10.75 0 0 1-15.42-5.15 1 1 0 0 1 0-.7 10.75 10.75 0 0 1 4.45-5.14"/><path d="m2 2 20 20"/>',
    "alert-circle":
      '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    "mail-plus":
      '<path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/><path d="M19 16v6"/><path d="M16 19h6"/>',
    "layout-grid":
      '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    folder:
      '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    files:
      '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    users:
      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    activity:
      '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>',
    bell: '<path d="M10.27 21a2 2 0 0 0 3.46 0"/><path d="M3.26 15.33A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.67C19.41 13.96 18 12.5 18 8A6 6 0 0 0 6 8c0 4.5-1.41 5.96-2.74 7.33"/>',
    sliders:
      '<path d="M21 4h-7"/><path d="M10 4H3"/><path d="M21 12h-9"/><path d="M8 12H3"/><path d="M21 20h-5"/><path d="M12 20H3"/><path d="M14 2v4"/><path d="M8 10v4"/><path d="M16 18v4"/>',
    "credit-card":
      '<rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    "panel-left":
      '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    "log-out":
      '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    refresh:
      '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
    list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
    "cloud-upload":
      '<path d="M12 13v8"/><path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/><path d="m8 17 4-4 4 4"/>',
    "chevron-left": '<path d="m15 18-6-6 6-6"/>',
    "bar-chart":
      '<path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/>',
  };

  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>${Object.entries(
    icons,
  )
    .map(
      ([name, body]) =>
        `<symbol id="i-${name}" viewBox="0 0 24 24">${body}</symbol>`,
    )
    .join("")}</defs></svg>`;

  const icon = (name, cls = "") =>
    `<svg class="icon ${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;

  /* Templates ------------------------------------------------------------ */
  const logo = (href = "index.html") =>
    `<a class="logo" href="${href}" aria-label="CoolTeam home"><span class="logo__mark" aria-hidden="true">C</span><span>coolteam</span></a>`;

  const header = (variant) => `
    <header class="site-header${variant === "light" ? " site-header--light" : ""}">
      <div class="container site-header__inner">
        ${logo()}
        <nav class="site-nav" aria-label="Primary">
          <ul class="site-nav__list">
            <li><a class="site-nav__link" href="index.html#how-it-works">How it works</a></li>
            <li><a class="site-nav__link" href="index.html#product">Product</a></li>
            <li><a class="site-nav__link" href="index.html#pricing">Pricing</a></li>
          </ul>
        </nav>
        <div class="site-header__actions">
          <a class="site-header__login" href="login.html">Log in</a>
          <a class="btn btn--light" href="signup.html">Start for free</a>
        </div>
        <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu">
          ${icon("menu", "icon--open")}${icon("x", "icon--close")}
        </button>
      </div>
      <nav class="mobile-menu" id="mobile-menu" aria-label="Mobile" inert>
        <a class="mobile-menu__link" href="index.html#how-it-works">How it works</a>
        <a class="mobile-menu__link" href="index.html#pricing">Pricing</a>
        <a class="mobile-menu__link" href="login.html">Log in</a>
      </nav>
    </header>`;

  const footer = () => `
    <footer class="site-footer">
      <div class="container site-footer__inner">
        ${logo()}
        <p class="site-footer__tagline">Designed for teams who take the work—and each other—seriously.</p>
        <nav class="site-footer__links" aria-label="Footer">
          <a href="index.html#product">Product</a>
          <a href="index.html#pricing">Pricing</a>
          <a href="login.html">Log in</a>
        </nav>
      </div>
    </footer>`;

  const plans = [
    {
      name: "Free",
      price: "$0",
      desc: "For focused personal work",
      cta: "Start free",
      href: "signup.html",
      features: ["Up to 2 members", "3 active projects", "1 GB storage"],
    },
    {
      name: "Starter",
      price: "$12",
      desc: "For independent creatives",
      cta: "Start free",
      href: "signup.html",
      features: ["Up to 5 members", "Unlimited projects", "20 GB storage"],
    },
    {
      name: "Team",
      price: "$24",
      desc: "For growing creative teams",
      cta: "Start free",
      href: "signup.html",
      featured: true,
      features: ["Up to 20 members", "Creative review", "100 GB storage"],
    },
    {
      name: "Business",
      price: "$49",
      desc: "For multi-project studios",
      cta: "Start free",
      href: "signup.html",
      features: ["Unlimited members", "Advanced insights", "500 GB storage"],
    },
    {
      name: "Enterprise",
      price: "Let’s talk",
      desc: "For scaled creative operations",
      cta: "Contact us",
      href: "contact.html",
      custom: true,
      features: ["Custom permissions", "Priority support", "Security review"],
    },
  ];

  const pricing = () => `
    <section class="section pricing" id="pricing" aria-labelledby="pricing-title">
      <div class="container">
        <div data-reveal>
          <p class="eyebrow eyebrow--teal">Simple, sensible pricing</p>
          <h2 class="section-title" id="pricing-title" style="margin-top:1rem">Choose room to make your best work.</h2>
          <p class="pricing__lead">Start with the essentials, then grow into the collaboration and oversight your team needs.</p>
        </div>
        <ul class="plans">
          ${plans
            .map(
              (p, i) => `
            <li data-reveal style="--i:${i}">
              <article class="plan${p.featured ? " plan--featured" : ""}">
                <h3 class="plan__name">${p.name}</h3>
                <p class="plan__price">${p.custom ? p.price : `${p.price}<small>/mo</small>`}</p>
                <p class="plan__desc">${p.desc}</p>
                <a class="btn ${p.featured ? "btn--dark" : "btn--light"}" href="${p.href}">${p.cta}</a>
                <ul class="plan__features">
                  ${p.features.map((f) => `<li>${icon("check")}${f}</li>`).join("")}
                </ul>
              </article>
            </li>`,
            )
            .join("")}
        </ul>
      </div>
    </section>`;

  const ctaBanner = () => `
    <section class="section" aria-labelledby="cta-title">
      <div class="container">
        <div class="cta-banner" data-reveal>
          <div>
            <p class="cta-banner__eyebrow">Give your work a calmer home</p>
            <h2 class="cta-banner__title" id="cta-title">The next great delivery starts with a clearer day.</h2>
          </div>
          <a class="btn btn--light" href="signup.html">Start for free ${icon("arrow-right")}</a>
        </div>
      </div>
    </section>`;

  const registry = {
    header: (el) => header(el.dataset.variant),
    footer,
    pricing,
    "cta-banner": ctaBanner,
  };

  /* Mount ---------------------------------------------------------------- */
  document.body.insertAdjacentHTML("afterbegin", sprite);
  document.querySelectorAll("[data-component]").forEach((el) => {
    const render = registry[el.dataset.component];
    if (render) el.outerHTML = render(el).trim();
  });
})();
