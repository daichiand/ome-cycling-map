(function () {
  "use strict";
  const header = document.querySelector(".site-header");
  if (!header) return;
  const slideshow = document.createElement("div");
  slideshow.className = "hero-slideshow";
  slideshow.setAttribute("aria-hidden", "true");
  header.prepend(slideshow);
  const credits = document.createElement("section");
  credits.className = "photo-credits";
  credits.innerHTML = "<button class=\"photo-credits-trigger\" type=\"button\" aria-expanded=\"false\" aria-controls=\"photo-credits-panel\">背景写真の出典</button><div class=\"photo-credits-panel\" id=\"photo-credits-panel\" hidden><div class=\"photo-credits-panel-heading\"><strong>背景写真の出典</strong><button class=\"photo-credits-close\" type=\"button\">閉じる</button></div><ul></ul></div>";
  const creditsTrigger = credits.querySelector(".photo-credits-trigger");
  const creditsPanel = credits.querySelector(".photo-credits-panel");
  creditsTrigger.addEventListener("click", () => {
    const isOpening = creditsPanel.hidden;
    creditsPanel.hidden = !isOpening;
    creditsTrigger.setAttribute("aria-expanded", String(isOpening));
  });
  credits.querySelector(".photo-credits-close").addEventListener("click", () => {
    creditsPanel.hidden = true;
    creditsTrigger.setAttribute("aria-expanded", "false");
    creditsTrigger.focus();
  });
  header.append(credits);
  const localPath = (file) => `assets/20260829_hero-photos/${file}`;
  const cleanText = (value) => String(value || "Wikimedia Commons").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  async function initialise() {
    try {
      const response = await fetch("assets/20260829_hero-photos/20260829_photo-credits.json", { cache: "no-store" });
      if (!response.ok) throw new Error("credits");
      const records = await response.json();
      const loaded = await Promise.all(records.map((record) => new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve(record);
        image.onerror = () => resolve(null);
        image.src = localPath(record.file);
      })));
      const photos = loaded.filter(Boolean);
      if (!photos.length) return;
      const creditList = credits.querySelector("ul");
      photos.forEach((photo) => {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = photo.source;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = `${cleanText(photo.title.replace(/^File:/, ""))} — ${cleanText(photo.artist)} (${photo.license})`;
        item.append(link);
        creditList.append(item);
      });
      const film = document.createElement("div");
      film.className = "hero-film";
      [...photos, ...photos].forEach((photo) => {
        const frame = document.createElement("div");
        frame.className = "hero-frame";
        frame.style.backgroundImage = `url("${localPath(photo.file)}")`;
        film.append(frame);
      });
      slideshow.append(film);
    } catch (_) {}
  }
  initialise();
}());
