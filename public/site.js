const grid = document.querySelector('#projects');
const filters = document.querySelector('#filters');
const search = document.querySelector('#search');
const result = document.querySelector('#results');
const template = document.querySelector('#project-template');
let projects = [];
let category = '';

function renderProjects() {
  const query = search.value.trim().toLowerCase();
  const matches = projects.filter(project => (!category || project.category === category) &&
    [project.name, project.url, project.category, project.description, ...project.tags]
      .some(value => value.toLowerCase().includes(query)));
  result.textContent = matches.length ? `Showing ${matches.length} of ${projects.length} projects` : 'No projects match your filters.';
  grid.replaceChildren(...matches.map(project => {
    const card = template.content.firstElementChild.cloneNode(true);
    const link = card.querySelector('a');
    link.href = project.url;
    link.setAttribute('aria-label', `Visit ${project.name} (opens in a new tab)`);
    card.querySelector('h3').textContent = project.name;
    card.querySelector('.domain').textContent = new URL(project.url).hostname;
    card.querySelector('.category').textContent = project.category;
    card.querySelector('.description').textContent = project.description;
    const art = card.querySelector('.card-art');
    const coverMark = art.querySelector('.cover-mark');
    coverMark.textContent = project.name.split(/\s+/u).slice(0, 2)
      .map(word => Array.from(word)[0]).join('').toUpperCase();
    if (project.image) {
      const image = document.createElement('img');
      image.alt = '';
      image.loading = 'lazy';
      image.addEventListener('load', () => { coverMark.hidden = true; });
      image.addEventListener('error', () => image.remove());
      image.src = project.image;
      art.prepend(image);
    }
    for (const tag of project.tags) {
      const label = document.createElement('span');
      label.textContent = tag;
      card.querySelector('.tags').append(label);
    }
    return card;
  }));
}

async function loadProjects() {
  const response = await fetch('/api/projects');
  if (!response.ok) throw new Error('Could not load projects.');
  projects = await response.json();
  document.querySelector('#total').textContent = `${projects.length} projects`;
  for (const name of ['', ...new Set(projects.map(project => project.category))]) {
    const button = document.createElement('button');
    button.textContent = name || 'All work';
    button.setAttribute('aria-pressed', String(!name));
    button.addEventListener('click', () => {
      category = name;
      for (const filter of filters.children) filter.setAttribute('aria-pressed', String(filter === button));
      renderProjects();
    });
    filters.append(button);
  }
  search.addEventListener('input', renderProjects);
  renderProjects();
}

loadProjects().catch(() => { result.textContent = 'Projects are temporarily unavailable.'; });

const rail = document.querySelector('.profile-rail');
const menuToggle = document.querySelector('#menu-toggle');
const mobile = window.matchMedia('(max-width: 860px)');
const sectionLinks = Array.from(rail.querySelectorAll('.rail-nav a[href^="#"]'));
const sections = sectionLinks.map(link => ({ link, section: document.querySelector(link.hash) }));

function closeMenu() {
  menuToggle.setAttribute('aria-expanded', 'false');
}

function syncMenu() {
  menuToggle.hidden = !mobile.matches;
  closeMenu();
}

menuToggle.addEventListener('click', () => {
  menuToggle.setAttribute('aria-expanded', String(menuToggle.getAttribute('aria-expanded') === 'false'));
});

rail.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menuToggle.focus();
  }
});

rail.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || menuToggle.getAttribute('aria-expanded') !== 'true') return;
  closeMenu();
  const section = document.querySelector(link.hash);
  section.setAttribute('tabindex', '-1');
  section.focus({ preventScroll: true });
});

function updateCurrentSection() {
  const headerOffset = mobile.matches ? rail.offsetHeight + 28 : 112;
  const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
  let current = sections[0];
  for (const item of sections) {
    if (atEnd || item.section.getBoundingClientRect().top <= headerOffset) current = item;
  }
  for (const item of sections) {
    if (item === current) item.link.setAttribute('aria-current', 'location');
    else item.link.removeAttribute('aria-current');
  }
}

let frame;
function scheduleSectionUpdate() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = null;
    updateCurrentSection();
  });
}

rail.classList.add('menu-ready');
mobile.addEventListener('change', syncMenu);
window.addEventListener('scroll', scheduleSectionUpdate, { passive: true });
window.addEventListener('resize', scheduleSectionUpdate);
syncMenu();
scheduleSectionUpdate();
