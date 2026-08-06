
const menuBtn = document.querySelector('.menu-btn');
const nav = document.querySelector('.main-nav');
if (menuBtn && nav) {
  menuBtn.addEventListener('click', () => nav.classList.toggle('open'));
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
}
const form = document.querySelector('#newsletter-form');
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    document.querySelector('#newsletter-msg').hidden = false;
    form.reset();
  });
}


// Version 6 — recherche globale et filtre d'articles
const searchOpen = document.querySelector('.search-open');
const searchOverlay = document.querySelector('#search-overlay');
const searchClose = document.querySelector('.search-close');
const siteSearch = document.querySelector('#site-search');
const searchResults = document.querySelector('#search-results');

async function loadArticles() {
  const response = await fetch('articles.json');
  if (!response.ok) throw new Error('Impossible de charger les articles.');
  return response.json();
}

if (searchOpen && searchOverlay) {
  searchOpen.addEventListener('click', () => {
    searchOverlay.hidden = false;
    document.body.classList.add('no-scroll');
    setTimeout(() => siteSearch?.focus(), 50);
  });
  searchClose?.addEventListener('click', () => {
    searchOverlay.hidden = true;
    document.body.classList.remove('no-scroll');
  });
  searchOverlay.addEventListener('click', (event) => {
    if (event.target === searchOverlay) {
      searchOverlay.hidden = true;
      document.body.classList.remove('no-scroll');
    }
  });
  let cachedArticles = [];
  loadArticles().then(data => cachedArticles = data).catch(() => {});
  siteSearch?.addEventListener('input', () => {
    const q = siteSearch.value.trim().toLowerCase();
    if (!q) {
      searchResults.innerHTML = '<p>Commencez à écrire pour rechercher un article.</p>';
      return;
    }
    const matches = cachedArticles.filter(a =>
      `${a.title} ${a.category} ${a.description}`.toLowerCase().includes(q)
    );
    searchResults.innerHTML = matches.length
      ? matches.map(a => `<a class="search-result" href="${a.url}"><small>${a.category}</small><strong>${a.title}</strong><span>${a.description}</span></a>`).join('')
      : '<p>Aucun résultat trouvé.</p>';
  });
}

const articleFilter = document.querySelector('#article-filter');
if (articleFilter) {
  const cards = [...document.querySelectorAll('.listing-card')];
  const emptyState = document.querySelector('#empty-state');
  articleFilter.addEventListener('input', () => {
    const q = articleFilter.value.trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const match = `${card.dataset.title} ${card.dataset.category}`.includes(q);
      card.hidden = !match;
      if (match) visible++;
    });
    if (emptyState) emptyState.hidden = visible !== 0;
  });
}


// Version 8 — animations douces au défilement
const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealItems.forEach(item => observer.observe(item));
} else {
  revealItems.forEach(item => item.classList.add('visible'));
}
