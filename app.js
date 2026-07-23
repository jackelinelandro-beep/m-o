(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const config = window.WEDDING_CONFIG || {};
  const hasBackend = Boolean(config.supabaseUrl && config.supabaseAnonKey && window.supabase?.createClient);
  const db = hasBackend ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  }) : null;

  const safeStorage = {
    get(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
    }
  };

  const randomId = () => window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  let voterId = safeStorage.get("wedding-voter", "");
  if (!voterId) { voterId = randomId(); safeStorage.set("wedding-voter", voterId); }

  const toast = (message) => {
    const node = $("#toast");
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove("show"), 3200);
  };

  const setStatus = (selector, message, kind = "") => {
    const node = $(selector);
    node.textContent = message;
    node.className = `form-status ${kind}`.trim();
  };

  const setSubmitting = (form, state) => {
    const button = $("button[type='submit']", form);
    if (!button) return;
    button.disabled = state;
    if (state) {
      button.dataset.label = button.textContent;
      button.textContent = "Guardando…";
    } else if (button.dataset.label) {
      button.textContent = button.dataset.label;
    }
  };

  const rateLimited = (action, milliseconds = 8000) => {
    const key = `wedding-rate-${action}`;
    const last = Number(safeStorage.get(key, 0));
    if (Date.now() - last < milliseconds) return true;
    safeStorage.set(key, Date.now());
    return false;
  };

  async function track(eventType, metadata = {}) {
    if (!db) return;
    try {
      await db.from("interaction_events").insert({ event_type: eventType, metadata });
    } catch { /* Analytics must never interrupt the guest. */ }
  }

  // Cinematic opening
  const opening = $("#opening");
  const openingCanvas = $("#opening-canvas");
  const openingContext = openingCanvas.getContext("2d");
  let openingFrame = 0;
  let openingClosed = false;
  document.body.classList.add("intro-active");

  function sizeOpening() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    openingCanvas.width = Math.round(innerWidth * ratio);
    openingCanvas.height = Math.round(innerHeight * ratio);
    openingContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  sizeOpening();
  window.addEventListener("resize", sizeOpening, { passive: true });
  const sparks = Array.from({ length: 70 }, () => ({
    x: Math.random(), y: Math.random(), size: Math.random() * 2 + .4,
    speed: Math.random() * .0012 + .0003, alpha: Math.random() * .65 + .15
  }));
  function drawOpening() {
    openingContext.clearRect(0, 0, innerWidth, innerHeight);
    sparks.forEach(spark => {
      spark.y -= spark.speed;
      if (spark.y < -.02) { spark.y = 1.02; spark.x = Math.random(); }
      openingContext.fillStyle = `rgba(230,170,55,${spark.alpha})`;
      openingContext.fillRect(spark.x * innerWidth, spark.y * innerHeight, spark.size, spark.size);
    });
    if (!openingClosed) openingFrame = requestAnimationFrame(drawOpening);
  }
  drawOpening();
  ["03", "02", "01"].forEach((value, index) => window.setTimeout(() => {
    if (!openingClosed) $("#opening-count").textContent = value;
  }, 650 + index * 850));
  window.setTimeout(() => {
    if (!openingClosed) $("#opening-count").textContent = "READY";
  }, 3150);
  function closeOpening() {
    if (openingClosed) return;
    openingClosed = true;
    cancelAnimationFrame(openingFrame);
    opening.classList.add("done");
    document.body.classList.remove("intro-active");
    window.setTimeout(() => opening.remove(), 800);
  }
  $("#skip-opening").addEventListener("click", closeOpening);
  window.setTimeout(closeOpening, matchMedia("(prefers-reduced-motion: reduce)").matches ? 150 : 4650);

  // Header and countdown
  const header = $(".site-header");
  const updateHeader = () => header.classList.toggle("scrolled", window.scrollY > 40);
  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();

  const weddingDate = new Date("2026-08-29T12:00:00+02:00");
  const countdownNodes = [$("#days"), $("#hours"), $("#minutes"), $("#seconds")];
  function updateCountdown() {
    const distance = Math.max(0, weddingDate.getTime() - Date.now());
    const values = [
      Math.floor(distance / 86400000),
      Math.floor(distance / 3600000) % 24,
      Math.floor(distance / 60000) % 60,
      Math.floor(distance / 1000) % 60
    ];
    values.forEach((value, index) => countdownNodes[index].textContent = String(value).padStart(2, "0"));
  }
  updateCountdown();
  window.setInterval(updateCountdown, 1000);

  // Physical story reader
  const comicPages = [
    ["assets/images/comic/00-portada.webp", "Portada", "Portada de Béjar Unlocked", 1122, 1402],
    ["assets/images/comic/01-escena-0.webp", "Misión: llegar al sí", "Presentación de Merce y Oscar", 1086, 1448],
    ["assets/images/comic/02-escena-1.webp", "Capítulo 1 · El bar", "El primer encuentro de Merce y Oscar en un bar", 1800, 1800],
    ["assets/images/comic/03-escena-2.webp", "Capítulo 2 · Noches de pantalla", "Las llamadas nocturnas de Merce y Oscar", 1024, 1536],
    ["assets/images/comic/04-escena-3.webp", "Capítulo 3 · Cáceres unlocked", "El viaje a Cáceres", 1122, 1402],
    ["assets/images/comic/05-escena-4.webp", "Capítulo 4 · Plot twist", "El primer beso", 1122, 1402],
    ["assets/images/comic/06-escena-5.webp", "Capítulo 5 · Madrid", "El viaje a Madrid", 1122, 1402],
    ["assets/images/comic/07-escena-6.webp", "Capítulo 6 · Doce", "Doce entra en la historia", 1800, 1800],
    ["assets/images/comic/08-escena-7.webp", "Capítulo 7 · Vega", "Vega, la jefa final", 1024, 1536],
    ["assets/images/comic/09-escena-8.webp", "Level final · Life unlocked", "La familia completa", 1122, 1402],
    ["assets/images/comic/10-contraportada.webp", "Contraportada", "Contraportada de Béjar Unlocked", 1024, 1536]
  ];
  const stage = $("#comic-stage");
  const pageImage = $("#comic-page");
  const pageUnderlay = $("#comic-underlay");
  const pageSheet = $("#comic-sheet");
  const pageSlices = $("#page-slices");
  const storyReader = $(".comic-reader");
  const dialog = $("#comic-dialog");
  const dialogImage = $("#comic-dialog-image");
  let comicIndex = 0;
  let comicTurning = false;
  let currentAngle = 0;
  let dragState = null;
  let flipFrame = 0;
  let flipDirection = 1;
  $("#comic-total").textContent = comicPages.length;

  function unlockStory() {
    const storySection = $("#story-reader");
    storySection.classList.remove("story-locked");
    storySection.classList.add("story-opening");
    storySection.setAttribute("aria-hidden", "false");
    storyReader.classList.add("revealed");
    document.body.classList.add("story-modal-open");
    preloadComic(0);
    window.setTimeout(() => {
      stage.focus({ preventScroll: true });
    }, 120);
    track("story_unlocked");
  }
  function closeStory() {
    const storySection = $("#story-reader");
    storySection.classList.remove("story-opening");
    storySection.classList.add("story-locked");
    storySection.setAttribute("aria-hidden", "true");
    document.body.classList.remove("story-modal-open");
  }
  $("#story-unlock").addEventListener("click", unlockStory);
  $("#story-close").addEventListener("click", closeStory);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && $("#story-reader").classList.contains("story-opening") && !dialog.open) closeStory();
  });
  $$('[data-story-entry]').forEach(card => {
    card.addEventListener("click", unlockStory);
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); unlockStory(); }
    });
  });

  const dots = $("#comic-dots");
  comicPages.forEach((page, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `Ir a ${page[1]}`);
    button.addEventListener("click", () => showComicPage(index));
    dots.append(button);
  });

  function preloadComic(index) {
    [index - 1, index + 1].forEach(i => {
      if (!comicPages[i]) return;
      const image = new Image();
      image.src = comicPages[i][0];
    });
  }

  function updateComicUI() {
    const page = comicPages[comicIndex];
    pageImage.src = page[0];
    pageImage.alt = page[2];
    stage.style.setProperty("--page-ratio", `${page[3]} / ${page[4]}`);
    $("#comic-label").textContent = page[1];
    $("#comic-current").textContent = comicIndex + 1;
    $$("#comic-dots button").forEach((dot, index) => {
      dot.classList.toggle("active", index === comicIndex);
      dot.setAttribute("aria-current", index === comicIndex ? "page" : "false");
    });
    $$('[data-comic-prev]').forEach(button => button.disabled = comicIndex === 0);
    $$('[data-comic-next]').forEach(button => button.disabled = comicIndex === comicPages.length - 1);
    preloadComic(comicIndex);
  }

  function prepareFlip(index, direction) {
    if (!comicPages[index]) return false;
    flipDirection = direction;
    pageUnderlay.src = comicPages[index][0];
    pageUnderlay.classList.add("ready");
    pageSheet.style.transformOrigin = direction > 0 ? "left center" : "right center";
    pageSheet.classList.add("turning");
    return true;
  }

  function renderFlip(angle) {
    currentAngle = angle;
    const progress = Math.min(1, Math.abs(angle) / 180);
    const curl = Math.sin(progress * Math.PI);
    const sign = flipDirection > 0 ? -1 : 1;
    const bow = Math.sin(progress * Math.PI * 2) * curl;
    pageSheet.style.setProperty("--fold-shadow", String(curl));
    pageSheet.style.setProperty("--page-curl", String(curl));
    pageSheet.style.transform = `perspective(1900px) translate3d(${sign * curl * 11}px,0,${curl * 32}px) rotateY(${angle}deg) rotateZ(${sign * bow * .65}deg) skewY(${sign * bow * 1.15}deg) scaleX(${1 - curl * .025})`;
  }

  function resetFlipVisuals() {
    pageSlices.classList.remove("active");
    pageSheet.classList.remove("wave-hidden", "turning");
    pageSheet.style.transform = "";
    pageSheet.style.removeProperty("--fold-shadow");
    pageSheet.style.removeProperty("--page-curl");
    currentAngle = 0;
  }

  function springTo(targetAngle, targetIndex = null, initialVelocity = 0) {
    cancelAnimationFrame(flipFrame);
    comicTurning = true;
    const startAngle = currentAngle;
    const distance = Math.abs(targetAngle - startAngle);
    const duration = targetAngle === 0 ? 470 : Math.max(700, 820 - Math.min(120, Math.abs(initialVelocity) * 6));
    const startedAt = performance.now();
    function step(now) {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = targetAngle === 0
        ? 1 - Math.pow(1 - progress, 3)
        : .5 - Math.cos(progress * Math.PI) / 2;
      renderFlip(startAngle + (targetAngle - startAngle) * eased);
      if (progress >= 1) {
        if (targetIndex !== null) {
          comicIndex = targetIndex;
          updateComicUI();
          if (comicIndex === comicPages.length - 1) track("comic_completed");
        }
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resetFlipVisuals();
            pageUnderlay.classList.remove("ready");
            comicTurning = false;
            stage.classList.remove("is-dragging");
          });
        });
        return;
      }
      flipFrame = requestAnimationFrame(step);
    }
    flipFrame = requestAnimationFrame(step);
  }

  function showComicPage(index) {
    const nextIndex = Math.max(0, Math.min(comicPages.length - 1, index));
    if (nextIndex === comicIndex || comicTurning) return;
    const direction = nextIndex > comicIndex ? 1 : -1;
    prepareFlip(nextIndex, direction);
    renderFlip(0);
    springTo(direction > 0 ? -180 : 180, nextIndex, direction > 0 ? -2.8 : 2.8);
  }

  $$('[data-comic-prev]').forEach(button => button.addEventListener("click", () => showComicPage(comicIndex - 1)));
  $$('[data-comic-next]').forEach(button => button.addEventListener("click", () => showComicPage(comicIndex + 1)));
  stage.addEventListener("keydown", event => {
    if (event.key === "ArrowRight") { event.preventDefault(); showComicPage(comicIndex + 1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); showComicPage(comicIndex - 1); }
  });
  stage.addEventListener("pointerdown", event => {
    if (comicTurning || event.target.closest("button")) return;
    dragState = { x: event.clientX, y: event.clientY, time: performance.now(), direction: 0, target: null, lastX: event.clientX, velocity: 0 };
    stage.setPointerCapture?.(event.pointerId);
  });
  stage.addEventListener("pointermove", event => {
    if (!dragState) return;
    const dx = event.clientX - dragState.x;
    const dy = event.clientY - dragState.y;
    if (!dragState.direction && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      dragState.direction = dx < 0 ? 1 : -1;
      dragState.target = comicIndex + dragState.direction;
      if (!prepareFlip(dragState.target, dragState.direction)) { dragState = null; return; }
      stage.classList.add("is-dragging");
    }
    if (!dragState.direction) return;
    event.preventDefault();
    const elapsed = Math.max(16, performance.now() - dragState.time);
    dragState.velocity = (event.clientX - dragState.lastX) / elapsed * 16;
    dragState.lastX = event.clientX;
    const progress = Math.min(1, Math.abs(dx) / Math.max(180, stage.clientWidth * .72));
    const eased = 1 - Math.pow(1 - progress, 1.25);
    renderFlip((dragState.direction > 0 ? -1 : 1) * eased * 178);
  });
  function releasePage() {
    if (!dragState) return;
    const state = dragState;
    dragState = null;
    if (!state.direction) return;
    const complete = Math.abs(currentAngle) > 52 || Math.abs(state.velocity) > 7;
    if (complete) springTo(state.direction > 0 ? -180 : 180, state.target, state.velocity * .65);
    else springTo(0, null, state.velocity * .35);
  }
  stage.addEventListener("pointerup", releasePage);
  stage.addEventListener("pointercancel", releasePage);
  stage.addEventListener("dblclick", openComicDialog);
  $("[data-comic-zoom]").addEventListener("click", openComicDialog);
  function openComicDialog() {
    dialogImage.src = comicPages[comicIndex][0];
    dialogImage.alt = comicPages[comicIndex][2];
    dialog.showModal();
  }
  $(".dialog-close", dialog).addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
  updateComicUI();

  // Calendar and directions
  $$(".track-directions").forEach(link => link.addEventListener("click", () => track("directions_opened", { place: link.closest("article")?.querySelector("h3")?.textContent })));
  $("#calendar-download").addEventListener("click", () => {
    const calendar = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Merce y Oscar//Boda//ES", "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT", "UID:boda-mercedes-oscar-20260829@bejar-unlocked", "DTSTAMP:20260711T120000Z",
      "DTSTART:20260829T100000Z", "DTEND:20260829T180000Z", "SUMMARY:Boda de Merce y Oscar",
      "LOCATION:Casa Rural La Gavia y La Cerrallana, Béjar, Salamanca",
      "DESCRIPTION:Ceremonia a las 12:00 en Casa Rural La Gavia. Comida y fiesta a las 14:30 en La Cerrallana.",
      "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([calendar], { type: "text/calendar;charset=utf-8" }));
    link.download = "boda-mercedes-oscar-29-08-2026.ics";
    link.click();
    URL.revokeObjectURL(link.href);
    track("calendar_downloaded");
  });

  // Community tabs
  $$(".community-tabs [role='tab']").forEach(tab => tab.addEventListener("click", () => {
    $$(".community-tabs [role='tab']").forEach(item => item.setAttribute("aria-selected", String(item === tab)));
    $$(".community-panel").forEach(panel => {
      const active = panel.id === `panel-${tab.dataset.tab}`;
      panel.hidden = !active;
      panel.classList.toggle("active", active);
    });
  }));

  const defaultMessages = [
    { body: "Que la aventura siga siempre sin mapa, pero en el mismo equipo.", author: "El equipo de Béjar" },
    { body: "Por muchas noches de pantalla, cinco minutos más y planes improvisados.", author: "Doce (supervisado)" }
  ];
  const defaultLogs = [
    { body: "Lisboa en octubre. Sin agenda, con el Tajo de fondo y tiempo para perderse.", author: "Alguien que volvería", subtype: "place" },
    { body: "Una ruta por la Patagonia y un día entero sin mirar el reloj.", author: "El viajero", subtype: "travel" }
  ];
  const defaultAdvice = [
    { body: "Construid una vida que os guste también los martes, no solo los domingos con sol.", author: "Quien ya aprendió" },
    { body: "Elegíos incluso en los días grises. Sobre todo en esos.", author: "22 años de experiencia" }
  ];
  let messages = [];
  let logs = [];
  let advice = [];
  let ideas = [];
  let photos = [];

  function renderMessages() {
    const wall = $("#message-wall");
    wall.replaceChildren();
    const items = messages.length ? messages : defaultMessages;
    items.forEach((message, index) => {
      const card = document.createElement("article");
      card.className = "message-card";
      card.style.setProperty("--tilt", `${[-1.1, .8, -.4, 1.2][index % 4]}deg`);
      const body = document.createElement("p");
      body.textContent = `“${message.body}”`;
      const author = document.createElement("span");
      author.textContent = `— ${message.author || "Anónimo"}${message.pending ? " · pendiente de revisión" : ""}`;
      card.append(body, author);
      wall.append(card);
    });
  }

  function renderLogs() {
    const grid = $("#log-grid");
    grid.replaceChildren();
    const icons = { travel: "✈", place: "⌖", experience: "∞" };
    (logs.length ? logs : defaultLogs).forEach(item => {
      const card = document.createElement("article");
      card.className = "log-card";
      card.dataset.icon = icons[item.subtype] || "✦";
      const body = document.createElement("p"); body.textContent = `“${item.body}”`;
      const author = document.createElement("span"); author.textContent = `— ${item.author || "Anónimo"}${item.pending ? " · pendiente" : ""}`;
      card.append(body, author); grid.append(card);
    });
  }

  function renderAdvice() {
    const grid = $("#advice-grid");
    grid.replaceChildren();
    (advice.length ? advice : defaultAdvice).forEach((item, index) => {
      const card = document.createElement("article");
      card.className = "advice-card";
      card.style.setProperty("--tilt", `${[-1.2,.8,-.5,1.1][index % 4]}deg`);
      card.dataset.number = String(index + 1).padStart(2, "0");
      const body = document.createElement("p"); body.textContent = `“${item.body}”`;
      const author = document.createElement("span"); author.textContent = `— ${item.author || "Anónimo"}${item.pending ? " · pendiente" : ""}`;
      card.append(body, author); grid.append(card);
    });
  }

  function renderIdeas() {
    const list = $("#ideas-list");
    list.replaceChildren();
    if (!ideas.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Las primeras propuestas se desbloquearán aquí.";
      list.append(empty);
      return;
    }
    [...ideas].sort((a, b) => b.score - a.score).forEach(idea => {
      const card = document.createElement("article");
      card.className = "idea-card";
      const votes = document.createElement("div");
      votes.className = "vote-box";
      const score = document.createElement("strong");
      score.textContent = idea.score || 0;
      const up = document.createElement("button");
      up.type = "button"; up.textContent = "▲"; up.setAttribute("aria-label", `Votar a favor de ${idea.body}`);
      const down = document.createElement("button");
      down.type = "button"; down.textContent = "▼"; down.setAttribute("aria-label", `Votar en contra de ${idea.body}`);
      up.addEventListener("click", () => castVote(idea, 1));
      down.addEventListener("click", () => castVote(idea, -1));
      votes.append(score, up, down);
      const copy = document.createElement("div");
      const body = document.createElement("p"); body.textContent = idea.body;
      const author = document.createElement("span"); author.textContent = `— ${idea.author || "Anónimo"}${idea.pending ? " · pendiente de revisión" : ""}`;
      copy.append(body, author);
      card.append(votes, copy);
      list.append(card);
    });
  }

  function renderPhotos() {
    const wall = $("#photo-wall");
    wall.replaceChildren();
    photos.forEach(photo => {
      const figure = document.createElement("figure");
      figure.className = "photo-card";
      const image = document.createElement("img");
      image.src = photo.public_url;
      image.alt = photo.caption || `Foto compartida por ${photo.author || "un invitado"}`;
      image.loading = "lazy";
      const caption = document.createElement("figcaption");
      caption.textContent = `${photo.caption || "Recuerdo desbloqueado"} — ${photo.author || "Anónimo"}${photo.pending ? " · pendiente de revisión" : ""}`;
      figure.append(image, caption);
      wall.append(figure);
    });
  }

  async function loadCommunity() {
    if (!db) {
      messages = safeStorage.get("wedding-messages", []);
      logs = safeStorage.get("wedding-logs", []);
      advice = safeStorage.get("wedding-advice", []);
      ideas = safeStorage.get("wedding-ideas", [
        { id: "local-1", body: "Que suene una canción de rock elegida por los novios.", author: "La tribuna", score: 8 },
        { id: "local-2", body: "Foto de equipo completo con Doce por videollamada.", author: "Club del gato", score: 5 }
      ]);
      renderMessages(); renderLogs(); renderAdvice(); renderIdeas(); renderPhotos();
      return;
    }
    try {
      const [messageResult, ideaResult, photoResult] = await Promise.all([
        db.from("messages").select("id,body,author,category,subtype,created_at").eq("approved", true).order("created_at", { ascending: false }).limit(80),
        db.from("suggestions").select("id,body,author,score,created_at").eq("approved", true).order("score", { ascending: false }).limit(50),
        db.from("photos").select("id,public_url,caption,author,created_at").eq("approved", true).order("created_at", { ascending: false }).limit(40)
      ]);
      if (messageResult.error || ideaResult.error || photoResult.error) throw messageResult.error || ideaResult.error || photoResult.error;
      const allMessages = messageResult.data || [];
      messages = allMessages.filter(item => !item.category || item.category === "note");
      logs = allMessages.filter(item => item.category === "log");
      advice = allMessages.filter(item => item.category === "advice");
      ideas = ideaResult.data || [];
      photos = photoResult.data || [];
    } catch (error) {
      console.error(error);
      toast("La parte participativa no ha podido conectarse. Puedes seguir viendo la invitación.");
    }
    renderMessages(); renderLogs(); renderAdvice(); renderIdeas(); renderPhotos();
  }

  $("#message-form").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.elements.website.value || rateLimited("message")) return;
    const payload = { body: form.elements.body.value.trim(), author: form.elements.author.value.trim() || "Anónimo", category: "note" };
    setSubmitting(form, true);
    try {
      if (db) {
        const { error } = await db.from("messages").insert(payload);
        if (error) throw error;
      } else {
        const local = safeStorage.get("wedding-messages", []);
        local.unshift({ ...payload, id: randomId() });
        safeStorage.set("wedding-messages", local);
      }
      messages.unshift({ ...payload, pending: Boolean(db) });
      renderMessages(); form.reset();
      setStatus("#message-status", db ? "Mensaje recibido. Aparecerá tras una revisión rápida." : "Mensaje guardado en este dispositivo.", "success");
      track("message_submitted");
    } catch (error) {
      console.error(error); setStatus("#message-status", "No se ha podido guardar. Inténtalo de nuevo.", "error");
    } finally { setSubmitting(form, false); }
  });

  function bindNarrativeForm(selector, category, target, storageKey, render, statusSelector) {
    $(selector).addEventListener("submit", async event => {
      event.preventDefault();
      const form = event.currentTarget;
      if (rateLimited(category)) return setStatus(statusSelector, "Espera unos segundos antes de volver a enviar.", "error");
      const payload = {
        body: form.elements.body.value.trim(),
        author: form.elements.author.value.trim() || "Anónimo",
        category,
        subtype: form.elements.subtype?.value || null
      };
      setSubmitting(form, true);
      try {
        if (db) {
          const { error } = await db.from("messages").insert(payload);
          if (error) throw error;
        } else {
          const local = safeStorage.get(storageKey, []);
          local.unshift({ ...payload, id: randomId() });
          safeStorage.set(storageKey, local);
        }
        target.unshift({ ...payload, pending: Boolean(db) });
        render(); form.reset();
        setStatus(statusSelector, db ? "Recibido. Aparecerá después de revisarlo." : "Guardado en este dispositivo.", "success");
        track(category === "log" ? "log_submitted" : "advice_submitted");
      } catch (error) {
        console.error(error); setStatus(statusSelector, "No se ha podido guardar. Inténtalo de nuevo.", "error");
      } finally { setSubmitting(form, false); }
    });
  }
  bindNarrativeForm("#log-form", "log", logs, "wedding-logs", renderLogs, "#log-status");
  bindNarrativeForm("#advice-form", "advice", advice, "wedding-advice", renderAdvice, "#advice-status");

  $("#idea-form").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.elements.website.value || rateLimited("idea")) return;
    const payload = { body: form.elements.body.value.trim(), author: form.elements.author.value.trim() || "Anónimo" };
    setSubmitting(form, true);
    try {
      if (db) {
        const { error } = await db.from("suggestions").insert(payload);
        if (error) throw error;
      } else {
        const local = safeStorage.get("wedding-ideas", ideas);
        local.push({ ...payload, id: randomId(), score: 0 });
        safeStorage.set("wedding-ideas", local);
      }
      ideas.push({ ...payload, id: randomId(), score: 0, pending: Boolean(db) });
      renderIdeas(); form.reset();
      setStatus("#idea-status", db ? "Propuesta recibida. Se publicará después de revisarla." : "Propuesta guardada en este dispositivo.", "success");
      track("suggestion_submitted");
    } catch (error) {
      console.error(error); setStatus("#idea-status", "No se ha podido enviar. Inténtalo de nuevo.", "error");
    } finally { setSubmitting(form, false); }
  });

  async function castVote(idea, direction) {
    if (idea.pending) return toast("Podrás votar esta propuesta cuando esté aprobada.");
    try {
      if (db) {
        const { data, error } = await db.rpc("cast_vote", { p_suggestion_id: idea.id, p_voter_id: voterId, p_direction: direction });
        if (error) throw error;
        idea.score = Number(data);
      } else {
        idea.score = Number(idea.score || 0) + direction;
        safeStorage.set("wedding-ideas", ideas);
      }
      renderIdeas();
      track("suggestion_voted", { direction });
    } catch (error) {
      console.error(error); toast("No hemos podido registrar el voto.");
    }
  }

  const PHOTO_INPUT_LIMIT = 15 * 1024 * 1024;
  const PHOTO_OUTPUT_LIMIT = 3 * 1024 * 1024;
  const PHOTO_MAX_DIMENSION = 2400;

  function decodePhoto(file) {
    if ("createImageBitmap" in window) {
      return createImageBitmap(file, { imageOrientation: "from-image" })
        .catch(() => createImageBitmap(file));
    }
    return new Promise((resolve, reject) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);
      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("No se ha podido leer la imagen."));
      };
      image.src = objectUrl;
    });
  }

  function encodeCanvas(canvas, mimeType, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error("No se ha podido optimizar la imagen."));
      }, mimeType, quality);
    });
  }

  async function canvasToBlob(canvas, quality) {
    const webp = await encodeCanvas(canvas, "image/webp", quality);
    return webp.type === "image/webp"
      ? webp
      : encodeCanvas(canvas, "image/jpeg", quality);
  }

  async function optimisePhoto(file) {
    const source = await decodePhoto(file);
    const sourceWidth = source.naturalWidth || source.width;
    const sourceHeight = source.naturalHeight || source.height;
    if (!sourceWidth || !sourceHeight) throw new Error("La imagen no tiene dimensiones válidas.");

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("Este navegador no puede procesar la imagen.");

    let maxDimension = PHOTO_MAX_DIMENSION;
    let quality = 0.84;
    let optimised = null;

    try {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
        canvas.width = Math.max(1, Math.round(sourceWidth * scale));
        canvas.height = Math.max(1, Math.round(sourceHeight * scale));
        context.fillStyle = "#fff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(source, 0, 0, canvas.width, canvas.height);
        optimised = await canvasToBlob(canvas, quality);
        if (optimised.size <= PHOTO_OUTPUT_LIMIT) return optimised;

        if (quality > 0.68) quality -= 0.08;
        else {
          maxDimension = Math.max(1200, Math.round(maxDimension * 0.82));
          quality = 0.78;
        }
      }
    } finally {
      if (typeof source.close === "function") source.close();
      canvas.width = 1;
      canvas.height = 1;
    }

    if (!optimised || optimised.size > PHOTO_OUTPUT_LIMIT) {
      throw new Error("La imagen sigue siendo demasiado grande tras optimizarla.");
    }
    return optimised;
  }

  const photoForm = $("#photo-form");
  const dropZone = $("#drop-zone");
  ["dragenter", "dragover"].forEach(type => dropZone.addEventListener(type, event => { event.preventDefault(); dropZone.classList.add("dragging"); }));
  ["dragleave", "drop"].forEach(type => dropZone.addEventListener(type, event => { event.preventDefault(); dropZone.classList.remove("dragging"); }));
  dropZone.addEventListener("drop", event => {
    if (event.dataTransfer.files[0]) photoForm.elements.photo.files = event.dataTransfer.files;
  });
  photoForm.elements.photo.addEventListener("change", () => {
    const file = photoForm.elements.photo.files[0];
    if (file) $("strong", dropZone).textContent = file.name;
  });
  photoForm.addEventListener("submit", async event => {
    event.preventDefault();
    const file = photoForm.elements.photo.files[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > PHOTO_INPUT_LIMIT) return setStatus("#photo-status", "Usa una imagen JPG, PNG o WebP de máximo 15 MB.", "error");
    if (rateLimited("photo", 15000)) return setStatus("#photo-status", "Espera unos segundos antes de subir otra foto.", "error");
    if (!db) return setStatus("#photo-status", "Conecta Supabase para poder recibir fotografías.", "error");
    setSubmitting(photoForm, true);
    setStatus("#photo-status", "Optimizando la foto…");
    try {
      const uploadFile = await optimisePhoto(file);
      const uploadExtension = uploadFile.type === "image/webp" ? "webp" : "jpg";
      const path = `public/${randomId()}.${uploadExtension}`;
      const savedMegabytes = (uploadFile.size / (1024 * 1024)).toFixed(1).replace(".", ",");
      setStatus("#photo-status", `Subiendo la foto optimizada (${savedMegabytes} MB)…`);
      const upload = await db.storage.from("wedding-photos").upload(path, uploadFile, { cacheControl: "31536000", upsert: false, contentType: uploadFile.type });
      if (upload.error) throw upload.error;
      const publicUrl = db.storage.from("wedding-photos").getPublicUrl(path).data.publicUrl;
      const payload = {
        storage_path: path,
        public_url: publicUrl,
        author: photoForm.elements.author.value.trim() || "Anónimo",
        caption: photoForm.elements.caption.value.trim() || null
      };
      const metadata = await db.from("photos").insert(payload);
      if (metadata.error) {
        await db.storage.from("wedding-photos").remove([path]);
        throw metadata.error;
      }
      photos.unshift({ ...payload, pending: true });
      renderPhotos(); photoForm.reset(); $("strong", dropZone).textContent = "Sube una foto con los novios";
      setStatus("#photo-status", "Foto recibida. Aparecerá en el mural tras revisarla.", "success");
      track("photo_uploaded", { original_bytes: file.size, uploaded_bytes: uploadFile.size });
    } catch (error) {
      console.error(error); setStatus("#photo-status", "No se ha podido subir la foto. Comprueba la conexión e inténtalo de nuevo.", "error");
    } finally { setSubmitting(photoForm, false); }
  });

  // Persistent auction
  const auctionState = {
    "bride-league": { amount: 0, bidder: "" },
    "groom-boxers": { amount: 0, bidder: "" }
  };
  function renderAuction() {
    $$(".lot-card").forEach(card => {
      const bid = auctionState[card.dataset.lot];
      $("[data-bid-amount]", card).textContent = Number(bid.amount || 0).toLocaleString("es-ES");
      $("[data-bid-leader]", card).textContent = bid.bidder ? `Lidera ${bid.bidder}` : "Nadie ha pujado todavía";
      const input = $("input[name='amount']", card);
      input.min = Math.floor(Number(bid.amount || 0)) + 1;
      input.placeholder = String(Math.floor(Number(bid.amount || 0)) + 5);
    });
  }
  async function loadAuction() {
    if (!db) {
      Object.assign(auctionState, safeStorage.get("wedding-auction", auctionState));
      renderAuction(); return;
    }
    try {
      const { data, error } = await db.from("auction_bids").select("lot_id,bidder,amount,created_at").order("amount", { ascending: false }).limit(100);
      if (error) throw error;
      (data || []).forEach(bid => {
        if (auctionState[bid.lot_id] && Number(bid.amount) > auctionState[bid.lot_id].amount) auctionState[bid.lot_id] = { amount: Number(bid.amount), bidder: bid.bidder };
      });
    } catch (error) { console.error(error); }
    renderAuction();
  }
  $$(".bid-form").forEach(form => form.addEventListener("submit", async event => {
    event.preventDefault();
    const lot = form.closest(".lot-card").dataset.lot;
    const bidder = form.elements.bidder.value.trim();
    const amount = Number(form.elements.amount.value);
    const status = $(".form-status", form);
    if (rateLimited(`bid-${lot}`, 5000)) { status.textContent = "Espera unos segundos antes de volver a pujar."; return; }
    if (!bidder || !Number.isFinite(amount) || amount <= auctionState[lot].amount) { status.textContent = `La puja debe superar €${auctionState[lot].amount}.`; return; }
    setSubmitting(form, true);
    try {
      if (db) {
        const { data, error } = await db.rpc("place_bid", { p_lot_id: lot, p_bidder: bidder, p_amount: amount });
        if (error) throw error;
        auctionState[lot] = { amount: Number(data.amount), bidder: data.bidder };
      } else {
        auctionState[lot] = { amount, bidder };
        safeStorage.set("wedding-auction", auctionState);
      }
      renderAuction(); form.reset();
      status.textContent = db ? "¡Puja registrada! Ahora mismo lideras el lote." : "Puja guardada en este dispositivo.";
      status.className = "form-status success";
      toast(`€${amount} · ${bidder} entra en la subasta`);
      track("bid_placed", { lot });
    } catch (error) {
      console.error(error); status.textContent = "Otra puja se ha adelantado o no hay conexión. Actualiza e inténtalo de nuevo."; status.className = "form-status error";
      await loadAuction();
    } finally { setSubmitting(form, false); }
  }));

  // Doce 3D lab
  const catLab = $(".cat-lab");
  const catCanvas = $("#cat-canvas");
  const catMessages = [
    "Doce te ha visto. No apartes la mirada: la inspección acaba de empezar.",
    "Segundo toque registrado. Tu expediente sigue abierto y, de momento, sin arañazos.",
    "Nivel de respeto: aceptable. Nivel de confianza: todavía sospechosamente bajo.",
    "No confundas paciencia con aprobación. Doce solo está calculando la distancia de salto.",
    "Has desbloqueado un parpadeo casi amistoso. Nadie podrá demostrarlo.",
    "Doce exige mesa propia, copa sin alcohol y derecho de veto sobre la música.",
    "El supervisor considera tu solicitud. Ha pedido referencias a Vega.",
    "Sigue. Él jamás admitiría que le gusta, pero ese pequeño salto dice otra cosa.",
    "Protocolo de ronroneo iniciado. Puede ser cariño; también puede ser una advertencia.",
    "Solo faltan dos. Mantén la dignidad y conserva los dedos dentro del dispositivo.",
    "Una interacción más… Doce está preparando un comunicado oficial para toda la sala.",
    "Acceso concedido. Se abre el mensaje clasificado del supervisor supremo."
  ];
  const catSecret = $("#cat-secret");
  let catClicks = 0;
  function burstCat() {
    const burst = $("#cat-burst");
    for (let index = 0; index < 18; index += 1) {
      const particle = document.createElement("i");
      const angle = Math.PI * 2 * index / 18;
      const distance = 90 + Math.random() * 150;
      particle.style.setProperty("--x", `${Math.cos(angle) * distance}px`);
      particle.style.setProperty("--y", `${Math.sin(angle) * distance}px`);
      burst.append(particle);
      particle.addEventListener("animationend", () => particle.remove(), { once: true });
    }
  }
  function interactCat() {
    if (catClicks >= 12) {
      window.cat3d?.celebrate?.();
      if (!catSecret.open) catSecret.showModal();
      return;
    }
    catClicks += 1;
    $("#cat-clicks").textContent = String(Math.min(catClicks, 12)).padStart(2, "0");
    $("#cat-message").textContent = catMessages[Math.min(catClicks, 12) - 1];
    burstCat();
    window.cat3d?.react?.();
    catCanvas.classList.remove("cat-pounce");
    void catCanvas.offsetWidth;
    catCanvas.classList.add("cat-pounce");
    if (catClicks === 6 || catClicks === 9) {
      catLab.classList.add("party");
      window.setTimeout(() => catLab.classList.remove("party"), 850);
    }
    if (catClicks === 12) {
      catLab.classList.remove("party"); catLab.classList.add("boss", "secret-mode");
      window.cat3d?.celebrate?.();
      toast("Mensaje clasificado desbloqueado por Doce 🐾");
      window.setTimeout(() => catSecret.showModal(), 420);
      track("cat_secret_unlocked");
    }
  }
  catCanvas.addEventListener("click", interactCat);
  catCanvas.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); interactCat(); }
  });
  $$("[data-cat-mode]").forEach(button => button.addEventListener("click", () => {
    $$("[data-cat-mode]").forEach(item => item.classList.toggle("active", item === button));
    catLab.classList.remove("party", "boss");
    const mode = button.dataset.catMode;
    if (mode === "party") {
      catLab.classList.add("party");
      window.cat3d?.setMode("party");
      $("#cat-message").textContent = "Modo fiesta: Doce niega cualquier responsabilidad.";
    } else if (mode === "boss") {
      catLab.classList.add("boss");
      window.cat3d?.setMode("boss");
      $("#cat-message").textContent = "Modo jefe: todos los presentes quedan bajo supervisión.";
    } else {
      window.cat3d?.setMode("calm");
      $("#cat-message").textContent = "Doce está evaluando tu nivel de compromiso.";
    }
  }));
  function closeCatSecret() {
    catSecret.close();
    catLab.classList.remove("secret-mode");
    window.cat3d?.setMode("boss");
  }
  $(".cat-secret-close").addEventListener("click", closeCatSecret);
  $(".cat-secret-accept").addEventListener("click", closeCatSecret);
  catSecret.addEventListener("click", event => { if (event.target === catSecret) closeCatSecret(); });

  const backendState = $("#backend-state");
  backendState.textContent = db ? "Interacciones conectadas y protegidas" : "Modo de demostración · falta conectar Supabase";
  backendState.classList.add(db ? "connected" : "demo");
  loadCommunity();
  loadAuction();
})();
