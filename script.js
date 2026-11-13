const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const projects = window.portfolioProjects || [];

const body = document.body;
const header = $("[data-header]");
const progressBar = $(".scroll-progress span");
const menuToggle = $(".menu-toggle");
const siteNav = $(".site-nav");
const themeToggle = $("#theme-toggle");
const filterButtons = $$(".filter-button");
const photoGrid = $("#photo-grid");
const lightbox = $("#lightbox");
const lightboxImage = $("#lightbox img");

let activeFilter = "all";
let visibleImages = [];
let lightboxIndex = 0;
let lastLightboxTrigger = null;
let touchStartX = 0;

const updateScrollUI = () => {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  if (progressBar) progressBar.style.width = `${Math.min(progress, 100)}%`;
  header?.classList.toggle("is-scrolled", window.scrollY > 30);
};

const closeMenu = () => {
  if (!menuToggle || !siteNav) return;
  menuToggle.setAttribute("aria-expanded", "false");
  $(".sr-only", menuToggle).textContent = "Abrir menu";
  siteNav.classList.remove("is-open");
  body.classList.remove("menu-open");
};

window.addEventListener("scroll", updateScrollUI, { passive: true });
window.addEventListener("resize", () => { if (window.innerWidth > 840) closeMenu(); });

menuToggle?.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  $(".sr-only", menuToggle).textContent = isOpen ? "Abrir menu" : "Fechar menu";
  siteNav.classList.toggle("is-open", !isOpen);
  body.classList.toggle("menu-open", !isOpen);
});
siteNav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

const setTheme = (light) => {
  body.classList.toggle("is-light", light);
  themeToggle?.setAttribute("aria-pressed", String(light));
  try { localStorage.setItem("matheus-theme", light ? "light" : "dark"); } catch { /* armazenamento opcional */ }
};
let savedTheme = false;
try { savedTheme = localStorage.getItem("matheus-theme") === "light"; } catch { /* armazenamento opcional */ }
setTheme(savedTheme);
themeToggle?.addEventListener("click", () => setTheme(!body.classList.contains("is-light")));

const projectPriority = [
  "andreia-30-anos",
  "aniversario-lucca",
  "hadassa-15-anos",
  "junior-e-milli",
  "casamento-Ana-e-Joao",
  "apresentacoes-infantis",
  "festa-15-anos",
];

const allImages = projects.flatMap((project, projectIndex) => project.images.map((image, imageIndex) => ({
  ...image,
  projectId: project.id,
  projectTitle: project.title,
  category: project.category,
  projectIndex,
  imageIndex,
})));

const priorityFor = (projectId) => {
  const index = projectPriority.indexOf(projectId);
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
};

const filteredImages = () => allImages
  .filter((image) => activeFilter === "all" || image.category === activeFilter || projects.find((project) => project.id === image.projectId)?.tags?.includes(activeFilter))
  .sort((a, b) => priorityFor(a.projectId) - priorityFor(b.projectId) || a.imageIndex - b.imageIndex);

const safeId = (value) => String(value).replace(/[^a-z0-9_-]/gi, "-");

const mountGalleryTiles = () => {
  const tiles = $$(".photo-tile", photoGrid);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    tiles.forEach((tile) => tile.classList.add("is-ready"));
    return;
  }
  window.requestAnimationFrame(() => tiles.forEach((tile) => tile.classList.add("is-ready")));
};

const bindGalleryMotion = () => {
  if (!photoGrid || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  $$(".photo-tile", photoGrid).forEach((tile) => {
    tile.addEventListener("pointermove", (event) => {
      const bounds = tile.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      tile.style.setProperty("--tile-x", `${(x * 5).toFixed(2)}px`);
      tile.style.setProperty("--tile-y", `${(y * 5).toFixed(2)}px`);
      tile.style.setProperty("--tile-rx", `${(-y * 1.25).toFixed(2)}deg`);
      tile.style.setProperty("--tile-ry", `${(x * 1.25).toFixed(2)}deg`);
    });
    tile.addEventListener("pointerleave", () => {
      tile.style.removeProperty("--tile-x");
      tile.style.removeProperty("--tile-y");
      tile.style.removeProperty("--tile-rx");
      tile.style.removeProperty("--tile-ry");
    });
  });
};

const drawGallery = () => {
  if (!photoGrid) return;
  visibleImages = filteredImages();
  photoGrid.setAttribute("aria-busy", "true");
  photoGrid.innerHTML = visibleImages.map((image, index) => {
    const tileId = safeId(`${image.projectId}-${image.imageIndex}`);
    return `<button class="photo-tile" style="--tile-index:${index};view-transition-name:gallery-${tileId}" type="button" data-gallery-index="${index}" aria-label="Abrir fotografia: ${image.alt}">
      <img src="${image.src}" alt="${image.alt}" loading="${index < 5 ? "eager" : "lazy"}" decoding="async" sizes="(min-width: 1600px) 25vw, (min-width: 760px) 33.333vw, 50vw" />
    </button>`;
  }).join("");
  mountGalleryTiles();
  bindGalleryMotion();
  window.requestAnimationFrame(() => photoGrid.setAttribute("aria-busy", "false"));
};

const renderGallery = () => {
  if (!photoGrid) return;
  if (typeof document.startViewTransition === "function" && document.visibilityState === "visible") {
    try {
      document.startViewTransition(drawGallery);
      return;
    } catch { /* fallback para navegadores com implementação parcial */ }
  }
  drawGallery();
};

const setFilter = (filter) => {
  activeFilter = filter;
  filterButtons.forEach((button) => {
    const active = button.dataset.filter === filter;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  renderGallery();
};
filterButtons.forEach((button) => button.addEventListener("click", () => setFilter(button.dataset.filter)));

photoGrid?.addEventListener("click", (event) => {
  const tile = event.target.closest("[data-gallery-index]");
  if (tile) openLightbox(visibleImages, Number(tile.dataset.galleryIndex), tile);
});

const preloadImage = (index) => {
  if (!visibleImages.length) return;
  const image = visibleImages[(index + visibleImages.length) % visibleImages.length];
  if (!image?.src) return;
  const preload = new Image();
  preload.decoding = "async";
  preload.src = image.src;
};

const setLightboxImage = (index, direction = 1) => {
  if (!visibleImages.length || !lightboxImage) return;
  lightboxIndex = (index + visibleImages.length) % visibleImages.length;
  const image = visibleImages[lightboxIndex];
  lightboxImage.classList.remove("is-visible");
  lightboxImage.dataset.direction = direction < 0 ? "prev" : "next";
  lightboxImage.src = image.src;
  lightboxImage.alt = image.alt;
  window.requestAnimationFrame(() => lightboxImage.classList.add("is-visible"));
  preloadImage(lightboxIndex + 1);
  preloadImage(lightboxIndex - 1);
};

const openLightbox = (images, index, trigger) => {
  if (!lightbox || !images?.length) return;
  visibleImages = images;
  lastLightboxTrigger = trigger;
  lightbox.showModal();
  body.classList.add("lightbox-open");
  setLightboxImage(index, 1);
  window.setTimeout(() => $(".lightbox-close")?.focus(), 0);
};

const closeLightbox = () => { if (lightbox?.open) lightbox.close(); };
$(".lightbox-close")?.addEventListener("click", closeLightbox);
$(".lightbox-prev")?.addEventListener("click", () => setLightboxImage(lightboxIndex - 1, -1));
$(".lightbox-next")?.addEventListener("click", () => setLightboxImage(lightboxIndex + 1, 1));
lightbox?.addEventListener("click", (event) => { if (event.target === lightbox) closeLightbox(); });
lightbox?.addEventListener("touchstart", (event) => { touchStartX = event.changedTouches[0].screenX; }, { passive: true });
lightbox?.addEventListener("touchend", (event) => {
  const delta = event.changedTouches[0].screenX - touchStartX;
  if (Math.abs(delta) > 40) setLightboxImage(lightboxIndex + (delta < 0 ? 1 : -1), delta < 0 ? 1 : -1);
}, { passive: true });
lightbox?.addEventListener("close", () => {
  body.classList.remove("lightbox-open");
  lastLightboxTrigger?.focus();
});
document.addEventListener("keydown", (event) => {
  if (!lightbox?.open) return;
  if (event.key === "Escape") { event.preventDefault(); closeLightbox(); }
  if (event.key === "ArrowLeft") { event.preventDefault(); setLightboxImage(lightboxIndex - 1, -1); }
  if (event.key === "ArrowRight") { event.preventDefault(); setLightboxImage(lightboxIndex + 1, 1); }
});

const heroVisual = $(".kaylan-hero");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const updateHeroScroll = () => {
  if (!heroVisual || reduceMotion.matches) return;
  const bounds = heroVisual.getBoundingClientRect();
  const progress = Math.max(0, Math.min(1, -bounds.top / Math.max(bounds.height, 1)));
  heroVisual.style.setProperty("--hero-scroll-y", `${(-progress * 12).toFixed(2)}px`);
};

window.addEventListener("scroll", updateHeroScroll, { passive: true });
if (heroVisual && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
  heroVisual.addEventListener("pointermove", (event) => {
    const bounds = heroVisual.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    heroVisual.style.setProperty("--hero-x", `${(x * 10).toFixed(2)}px`);
    heroVisual.style.setProperty("--hero-y", `${(y * 7).toFixed(2)}px`);
  });
  heroVisual.addEventListener("pointerleave", () => {
    heroVisual.style.removeProperty("--hero-x");
    heroVisual.style.removeProperty("--hero-y");
  });
}
updateHeroScroll();

const revealTargets = $$(".kaylan-section-heading, .work-header, .about-visual, .about-copy");
if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  revealTargets.forEach((item) => item.classList.add("reveal"));
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
  }), { threshold: 0.08 });
  revealTargets.forEach((item) => observer.observe(item));
}

updateScrollUI();
renderGallery();
const year = $("#year");
if (year) year.textContent = new Date().getFullYear();
