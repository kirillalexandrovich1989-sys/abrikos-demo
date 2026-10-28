(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = motion.matches;
  motion.addEventListener("change", (event) => (reduced = event.matches));
  document.documentElement.classList.add("js");

  const menu = $("#mobile-menu");
  const toggle = $(".menu-toggle");
  const booking = $("#booking-dialog");
  const lightbox = $("#photo-dialog");
  let menuTimer;

  function syncLock() {
    const open =
      booking.open ||
      lightbox.open ||
      toggle.getAttribute("aria-expanded") === "true";
    document.body.classList.toggle("locked", open);
  }

  function closeDialog(dialog) {
    dialog.close();
    // Release scrolling immediately, even if the browser delays the close event.
    syncLock();
  }

  /* Open / closed status, salon time zone is UTC+5 */
  function updateStatus() {
    const parts = new Intl.DateTimeFormat("ru-RU", {
      timeZone: "Asia/Yekaterinburg",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const hour = Number(parts.find((p) => p.type === "hour").value);
    const isOpen = hour >= 9 && hour < 20;
    $("[data-status-dot]").className =
      "status-dot " + (isOpen ? "is-open" : "is-closed");
    $("[data-status]").textContent = isOpen
      ? "Сейчас открыто · до 20:00"
      : "Сейчас закрыто · откроемся в 09:00";
  }
  updateStatus();
  setInterval(updateStatus, 60000);

  /* Mobile menu */
  function setMenu(open) {
    clearTimeout(menuTimer);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    if (!open && menu.contains(document.activeElement)) toggle.focus({ preventScroll: true });
    menu.inert = !open;
    $$("main, footer, .mobile-bar").forEach((element) => (element.inert = open));
    if (open) {
      menu.hidden = false;
      const items = [...menu.querySelectorAll("nav a"), $(".mobile-menu-foot")];
      const step = Math.min(60, 400 / items.length);
      items.forEach((item, i) => (item.style.transitionDelay = `${i * step}ms`));
      // Flush the hidden state before transitioning; no delayed frame can reopen a closed menu.
      menu.getBoundingClientRect();
      menu.classList.add("open");
    } else {
      menu.classList.remove("open");
      menuTimer = setTimeout(() => (menu.hidden = true), reduced ? 0 : 300);
    }
    syncLock();
  }
  toggle.addEventListener("click", () =>
    setMenu(toggle.getAttribute("aria-expanded") !== "true"),
  );
  menu
    .querySelectorAll("a")
    .forEach((link) => link.addEventListener("click", () => setMenu(false)));
  matchMedia("(min-width: 961px)").addEventListener("change", (event) => {
    if (event.matches) setMenu(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Tab" && toggle.getAttribute("aria-expanded") === "true") {
      const focusable = $$(".nav a, .nav button, #mobile-menu a").filter(
        (element) => element.getClientRects().length,
      );
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      setMenu(false);
      toggle.focus();
    }
  });

  /* Booking dialog */
  let bookingOpener;
  const whatsapp = $("#whatsapp-book");
  function updateMessage() {
    const value = booking.querySelector("input[name=service]:checked")?.value;
    const text = value
      ? `Здравствуйте! Хочу записаться в «Абрикос» на услугу «${value}». Подскажите стоимость и свободное время.`
      : "Здравствуйте! Хочу записаться в «Абрикос». Подскажите, пожалуйста, по услугам и свободному времени.";
    whatsapp.href = `https://wa.me/79129382021?text=${encodeURIComponent(text)}`;
  }
  $$("[data-book]").forEach((button) =>
    button.addEventListener("click", () => {
      bookingOpener = button;
      setMenu(false);
      const value = button.dataset.book || "";
      const input = booking.querySelector(`input[value="${value}"]`);
      if (input) input.checked = true;
      updateMessage();
      booking.showModal();
      syncLock();
    }),
  );
  booking
    .querySelectorAll("input[name=service]")
    .forEach((input) => input.addEventListener("change", updateMessage));
  booking
    .querySelector(".modal-close")
    .addEventListener("click", () => closeDialog(booking));
  booking.addEventListener("close", () => {
    syncLock();
    bookingOpener?.focus({ preventScroll: true });
  });

  /* Photo lightbox */
  const photos = [
    { src: "assets/salon-3.jpg", caption: "Мастер за работой" },
    { src: "assets/salon-2.jpg", caption: "Вывеска салона вечером" },
    { src: "assets/salon-1.jpg", caption: "Вход в салон с улицы Мира" },
  ];
  let photoIndex = 0;
  let photoOpener;
  function showPhoto(index) {
    photoIndex = (index + photos.length) % photos.length;
    const img = $("#photo-full");
    img.src = photos[photoIndex].src;
    img.alt = photos[photoIndex].caption;
    $("#photo-caption").textContent = photos[photoIndex].caption;
    $("#photo-counter").textContent = `${photoIndex + 1} из ${photos.length}`;
  }
  $$("[data-gallery]").forEach((button) =>
    button.addEventListener("click", () => {
      photoOpener = button;
      showPhoto(Number(button.dataset.gallery));
      lightbox.showModal();
      syncLock();
    }),
  );
  $("#photo-prev").addEventListener("click", () => showPhoto(photoIndex - 1));
  $("#photo-next").addEventListener("click", () => showPhoto(photoIndex + 1));
  lightbox
    .querySelector(".modal-close")
    .addEventListener("click", () => closeDialog(lightbox));
  lightbox.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") showPhoto(photoIndex + 1);
    if (event.key === "ArrowLeft") showPhoto(photoIndex - 1);
  });
  lightbox.addEventListener("close", () => {
    syncLock();
    photoOpener?.focus({ preventScroll: true });
  });
  $("#photo-full").addEventListener("error", () => {
    $("#photo-caption").textContent =
      "Фотография не загрузилась. Переключите стрелками на другую.";
  });

  /* Close dialogs on backdrop click */
  [booking, lightbox].forEach((dialog) =>
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeDialog(dialog);
    }),
  );
  [booking, lightbox].forEach((dialog) =>
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      const outside =
        event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom;
      if (outside) closeDialog(dialog);
    }),
  );

  /* Scroll reveals and current nav item */
  if ("IntersectionObserver" in window) {
    const revealer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("visible");
          revealer.unobserve(entry.target);
        }),
      { rootMargin: "0px 0px -80px 0px" },
    );
    $$(".reveal").forEach((el) => revealer.observe(el));

    const links = $$('.nav-links a[href^="#"]');
    const spy = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((link) =>
            link.hash === `#${entry.target.id}`
              ? link.setAttribute("aria-current", "location")
              : link.removeAttribute("aria-current"),
          );
        }),
      { rootMargin: "-40% 0px -55% 0px" },
    );
    ["services", "about", "reviews", "contacts"].forEach((id) =>
      spy.observe(document.getElementById(id)),
    );
  } else {
    $$(".reveal").forEach((el) => el.classList.add("visible"));
  }

  /* Tagline: words light up one by one */
  const tagline = $("[data-words]");
  tagline.innerHTML = tagline.innerHTML
    .split(/(<br\s*\/?>|\s+)/)
    .map((part) =>
      part.trim() && !part.startsWith("<br")
        ? `<span class="word">${part}</span>`
        : part,
    )
    .join("");
  const words = [...tagline.querySelectorAll(".word")];
  const accent = (tagline.dataset.accent || "").split(" ");
  words.forEach((word) =>
    word.classList.toggle("hl", accent.includes(word.textContent)),
  );
  let ticking = false;
  function lightWords() {
    ticking = false;
    const line = innerHeight * 0.75;
    words.forEach((word) =>
      word.classList.toggle(
        "on",
        reduced || word.getBoundingClientRect().top < line,
      ),
    );
  }
  addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(lightWords);
    },
    { passive: true },
  );
  lightWords();
})();
