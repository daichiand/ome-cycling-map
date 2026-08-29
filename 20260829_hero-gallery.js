(function () {
  "use strict";
  const header = document.querySelector(".site-header");
  if (!header) return;
  const slideshow = document.createElement("div");
  slideshow.className = "hero-slideshow";
  slideshow.setAttribute("aria-hidden", "true");
  header.prepend(slideshow);
  const credits = document.createElement("details");
  credits.className = "photo-credits";
  credits.innerHTML = "<summary>背景写真の出典</summary><ul></ul>";
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
      let index = 0;
      let current = null;
      const show = () => {
        const photo = photos[index];
        const image = document.createElement("div");
        image.className = "hero-image";
        image.style.backgroundImage = `url("${localPath(photo.file)}")`;
        slideshow.append(image);
        requestAnimationFrame(() => image.classList.add("is-active"));
        const outgoing = current;
        if (outgoing) {
          outgoing.classList.remove("is-active");
          window.setTimeout(() => outgoing.remove(), 1500);
        }
        current = image;
        index = (index + 1) % photos.length;
      };
      show();
      window.setInterval(show, 7000);
    } catch (_) {}
  }
  initialise();
}());
