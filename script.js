const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const projects = window.portfolioProjects || [];

const header = $("[data-header]");
const progressBar = $(".scroll-progress span");
const menuToggle = $(".menu-toggle");
const siteNav = $(".site-nav");
const filterButtons = $$(".filter-button");
const photoGrid = $("#photo-grid");
const projectDialog = $("#project-dialog");
const projectDetail = $("#project-detail");
const lightbox = $("#lightbox");
const lightboxImage = $("#lightbox img");
const lightboxTitle = $("#lightbox-title");
const lightboxCounter = $("#lightbox-counter");

let activeFilter = "all";
let activeProject = null;
let lightboxIndex = 0;
let lastProjectTrigger = null;
let lastLightboxTrigger = null;
let touchStartX = 0;

const updateScrollUI = () => {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  progressBar.style.width = `${Math.min(progress, 100)}%`;
  header.classList.toggle("is-scrolled", window.scrollY > 30);
};

const closeMenu = () => {
  menuToggle.setAttribute("aria-expanded", "false");
  $(".sr-only", menuToggle).textContent = "Abrir menu";
  siteNav.classList.remove("is-open");
  document.body.classList.remove("menu-open");
};

window.addEventListener("scroll", updateScrollUI, { passive: true });
window.addEventListener("resize", () => { if (window.innerWidth > 840) closeMenu(); });

menuToggle.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  $(".sr-only", menuToggle).textContent = isOpen ? "Abrir menu" : "Fechar menu";
  siteNav.classList.toggle("is-open", !isOpen);
  document.body.classList.toggle("menu-open", !isOpen);
});
siteNav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

const projectPriority = [
  "andreia-30-anos",
  "aniversario-lucca",
  "hadassa-15-anos",
  "junior-e-milli",
  "casamento-noite",
  "apresentacoes-infantis",
  "festa-15-anos",
];

const filteredProjects = () => {
  const visible = activeFilter === "all"
    ? projects.slice()
    : projects.filter((project) => project.category === activeFilter || project.tags?.includes(activeFilter));
  return visible.sort((a, b) => {
    const aPriority = projectPriority.indexOf(a.id);
    const bPriority = projectPriority.indexOf(b.id);
    return (aPriority < 0 ? 999 : aPriority) - (bPriority < 0 ? 999 : bPriority);
  });
};

const mountProjectCards = () => {
  const cards = $$(".photo-card", photoGrid);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    cards.forEach((card) => card.classList.add("is-ready"));
    return;
  }
  window.requestAnimationFrame(() => cards.forEach((card) => card.classList.add("is-ready")));
};

const renderProjects = () => {
  photoGrid.innerHTML = filteredProjects().map((project, index) =>
    `<button class="photo-card photo-card-${project.coverOrientation || "portrait"}" style="--card-index:${index}" type="button" data-project-id="${project.id}" aria-label="Abrir álbum ${project.title}">
      <span class="photo-card-media"><img src="${project.cover}" alt="${project.images[0].alt}" loading="${index < 2 ? "eager" : "lazy"}" decoding="async" /></span>
      <span class="photo-meta"><span><small>${project.categoryLabel}</small><b>${project.title}</b></span><span class="photo-meta-bottom"><span class="photo-count">${String(project.images.length).padStart(2, "0")} imagens</span><span class="photo-card-cta">Abrir capítulo</span></span></span>
    </button>`
  ).join("");
  mountProjectCards();
};

const setFilter = (filter) => {
  activeFilter = filter;
  filterButtons.forEach((button) => {
    const active = button.dataset.filter === filter;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  renderProjects();
};
filterButtons.forEach((button) => button.addEventListener("click", () => setFilter(button.dataset.filter)));

const openProject = (project, trigger) => {
  activeProject = project;
  lastProjectTrigger = trigger;
  const sourceLink = `<span class="project-local-note">Galeria editorial · ${project.images.length} registros</span>`;
  projectDetail.innerHTML =
    `<div class="project-detail-head"><div><p class="section-index">${project.categoryLabel}</p><h2 id="project-detail-title">${project.title}</h2></div><p>${project.description}</p></div>` +
    `<div class="project-dialog-grid">${project.images.map((image, index) =>
      `<button class="project-image-button" type="button" data-project-image="${index}" aria-label="Abrir ${image.alt}"><img src="${image.src}" alt="${image.alt}" loading="lazy" width="900" height="1100" /><span>${String(index + 1).padStart(2, "0")}</span></button>`
    ).join("")}</div>` +
    `<div class="project-detail-footer">${sourceLink}<a class="button button-primary" href="https://www.instagram.com/matheusfotografiasz/" target="_blank" rel="noreferrer">Pedir orçamento <span aria-hidden="true">↗</span></a></div>`;
  projectDialog.showModal();
  document.body.classList.add("project-open");
  $(".project-dialog-close").focus();
};

photoGrid.addEventListener("click", (event) => {
  const card = event.target.closest("[data-project-id]");
  if (card) openProject(projects.find((project) => project.id === card.dataset.projectId), card);
});
projectDetail.addEventListener("click", (event) => {
  const imageButton = event.target.closest("[data-project-image]");
  if (imageButton && activeProject) openLightbox(activeProject, Number(imageButton.dataset.projectImage), imageButton);
});

$(".project-dialog-close").addEventListener("click", () => projectDialog.close());
projectDialog.addEventListener("click", (event) => { if (event.target === projectDialog) projectDialog.close(); });
projectDialog.addEventListener("close", () => {
  document.body.classList.remove("project-open");
  if (lastProjectTrigger) lastProjectTrigger.focus();
});

function setLightboxImage(index) {
  if (!activeProject) return;
  lightboxIndex = (index + activeProject.images.length) % activeProject.images.length;
  const image = activeProject.images[lightboxIndex];
  lightboxImage.src = image.src;
  lightboxImage.alt = image.alt;
  lightboxTitle.textContent = activeProject.title;
  lightboxCounter.textContent = `${lightboxIndex + 1} / ${activeProject.images.length}`;
}

function openLightbox(project, index, trigger) {
  activeProject = project;
  lastLightboxTrigger = trigger;
  setLightboxImage(index);
  lightbox.showModal();
  document.body.classList.add("lightbox-open");
  $(".lightbox-close").focus();
}

function closeLightbox() { if (lightbox.open) lightbox.close(); }
$(".lightbox-close").addEventListener("click", closeLightbox);
$(".lightbox-prev").addEventListener("click", () => setLightboxImage(lightboxIndex - 1));
$(".lightbox-next").addEventListener("click", () => setLightboxImage(lightboxIndex + 1));
lightbox.addEventListener("click", (event) => { if (event.target === lightbox) closeLightbox(); });
lightbox.addEventListener("touchstart", (event) => { touchStartX = event.changedTouches[0].screenX; }, { passive: true });
lightbox.addEventListener("touchend", (event) => {
  const delta = event.changedTouches[0].screenX - touchStartX;
  if (Math.abs(delta) > 40) setLightboxImage(lightboxIndex + (delta < 0 ? 1 : -1));
}, { passive: true });
lightbox.addEventListener("close", () => {
  document.body.classList.remove("lightbox-open");
  if (lastLightboxTrigger) lastLightboxTrigger.focus();
});
document.addEventListener("keydown", (event) => {
  if (!lightbox.open) return;
  if (event.key === "ArrowLeft") setLightboxImage(lightboxIndex - 1);
  if (event.key === "ArrowRight") setLightboxImage(lightboxIndex + 1);
});

const revealTargets = $$(".section-heading, .photo-card, .portfolio-footer");
if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  revealTargets.forEach((item) => item.classList.add("reveal"));
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
  }), { threshold: 0.08 });
  revealTargets.forEach((item) => observer.observe(item));
}

updateScrollUI();
renderProjects();
$("#year").textContent = new Date().getFullYear();
