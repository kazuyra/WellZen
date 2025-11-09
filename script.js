/* ===========================================================
   TeenWell • Global UI utilities (non-auth)
   - "More" menu toggle + outside/ESC close
   - Active nav highlighting (fallback)
   - Reveal-on-scroll
   - Stats number counter animation
   - FAQ (details/summary) accordion behavior
   - Tag row active state
   - Newsletter fake-submit + toast
   - Footer year
   =========================================================== */

(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* -------------------- 1) NAV: More menu -------------------- */
  const moreToggle = $(".more-toggle");
  const moreMenu = $(".more-menu");

  if (moreToggle && moreMenu) {
    const closeMenu = () => {
      moreToggle.setAttribute("aria-expanded", "false");
      moreMenu.classList.remove("open");
    };

    const openMenu = () => {
      moreToggle.setAttribute("aria-expanded", "true");
      moreMenu.classList.add("open");
    };

    moreToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const expanded = moreToggle.getAttribute("aria-expanded") === "true";
      expanded ? closeMenu() : openMenu();
    });

    // Click outside closes
    document.addEventListener("click", (e) => {
      if (!moreMenu.contains(e.target) && e.target !== moreToggle) closeMenu();
    });

    // ESC closes
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
  }

  /* ------------- 2) Fallback active link highlighting -------- */
  // If author didn't mark current link with .active, do it by path
  const path = location.pathname.replace(/index\.html$/, "");
  $$(".nav-links a").forEach((a) => {
    const href = a.getAttribute("href");
    // Normalize relative "/blog/" vs "blog/"
    const normalized = (href || "").replace(/index\.html$/, "");
    if (normalized && path.endsWith(normalized)) {
      a.classList.add("active");
    }
  });

  /* --------------------- 3) Reveal-on-scroll ------------------ */
  const revealTargets = $$(".reveal, .card, .post-card, .timeline li, .timeline .timeline-item");
  if (revealTargets.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((ent) => {
          if (ent.isIntersecting) {
            ent.target.classList.add("in");
            io.unobserve(ent.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealTargets.forEach((el) => io.observe(el));
  }

  /* ---------------- 4) Stats number counter (About) ----------- */
  const counters = $$(".stat-number[data-target]");
  if (counters.length) {
    const runCounter = (el) => {
      const target = parseInt(el.dataset.target || "0", 10);
      const dur = 1400; // ms
      const start = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - start) / dur);
        el.textContent = Math.round(target * (0.2 + 0.8 * easeOutCubic(p)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);

    const io2 = new IntersectionObserver(
      (entries) => {
        entries.forEach((ent) => {
          if (ent.isIntersecting) {
            runCounter(ent.target);
            io2.unobserve(ent.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    counters.forEach((el) => io2.observe(el));
  }

  /* --------------------- 5) FAQ accordion --------------------- */
  // If one <details> opens, close the others
  const faq = $(".faq");
  if (faq) {
    faq.addEventListener("toggle", (e) => {
      const opened = e.target;
      if (opened.tagName.toLowerCase() !== "details" || !opened.open) return;
      $$(".faq details").forEach((d) => {
        if (d !== opened) d.removeAttribute("open");
      });
    });
  }

  /* -------------------- 6) Tag row active --------------------- */
  $$(".tag-row .tag").forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest(".tag-row");
      if (!row) return;
      $$(".tag", row).forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
    });
  });

  /* --------- 7) Newsletter fake submit + local save ----------- */
  const newsletterForm = $("form.signup") || $('main form[action="#"][method="post"]');
  if (newsletterForm) {
    newsletterForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("#name", newsletterForm)?.value?.trim() || "";
      const email = $("#email", newsletterForm)?.value?.trim() || "";

      if (!email) return toast("Please enter an email.", "warn");

      // Store locally so we can prefill later pages
      try {
        const subs = JSON.parse(localStorage.getItem("tw_newsletter") || "[]");
        const exists = subs.some((s) => s.email === email);
        if (!exists) subs.push({ name, email, ts: Date.now() });
        localStorage.setItem("tw_newsletter", JSON.stringify(subs));
      } catch (_) {}

      // UI: clear + thank you
      newsletterForm.reset();
      toast("Subscribed! Check your inbox for a welcome note.");
    });
  }

  /* -------------------- 8) Footer year helper ----------------- */
  const yearSpots = $$("footer .year");
  if (yearSpots.length) {
    const y = new Date().getFullYear();
    yearSpots.forEach((el) => (el.textContent = y));
  }

  /* ---------------------- 9) Tiny toast ------------------------ */
  function toast(msg, type = "ok") {
    let box = $("#tw_toast");
    if (!box) {
      box = document.createElement("div");
      box.id = "tw_toast";
      box.style.position = "fixed";
      box.style.left = "50%";
      box.style.bottom = "28px";
      box.style.transform = "translateX(-50%)";
      box.style.padding = "10px 14px";
      box.style.borderRadius = "999px";
      box.style.background = "var(--accent, #2fb277)";
      box.style.color = "white";
      box.style.boxShadow = "0 8px 24px rgba(0,0,0,.2)";
      box.style.fontWeight = "600";
      box.style.zIndex = "9999";
      document.body.appendChild(box);
    }
    box.style.background =
      type === "warn" ? "rgba(230,120,40,.95)" : "var(--accent, #2fb277)";
    box.textContent = msg;
    box.style.opacity = "1";
    clearTimeout(box._hide);
    box._hide = setTimeout(() => {
      box.style.opacity = "0";
    }, 2200);
  }
})();
