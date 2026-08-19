
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


// Sprint 1 — progression de lecture et partage
const progressBar = document.querySelector('#reading-progress-bar');
if (progressBar) {
  const updateProgress = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
  };
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();
}

document.querySelectorAll('.copy-link').forEach(button => {
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      const original = button.textContent;
      button.textContent = '✓ Lien copié';
      setTimeout(() => button.textContent = original, 1800);
    } catch {
      window.prompt('Copiez ce lien :', window.location.href);
    }
  });
});

document.querySelectorAll('.pinterest-share').forEach(link => {
  const pageUrl = encodeURIComponent(window.location.href);
  const description = encodeURIComponent(document.title);
  link.href = `https://www.pinterest.com/pin/create/button/?url=${pageUrl}&description=${description}`;
});


// magazine-v2-reveal
const editorialReveal = document.querySelectorAll('.editorial-selection, .manifesto-strip, .pinterest-showcase');
if ('IntersectionObserver' in window) {
  const editorialObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        editorialObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  editorialReveal.forEach(el => {
    el.classList.add('soft-reveal');
    editorialObserver.observe(el);
  });
} else {
  editorialReveal.forEach(el => el.classList.add('visible'));
}


// Boutique — ajoute l’onglet à la navigation sur toutes les pages
(() => {
  const navs = document.querySelectorAll('.main-nav');
  navs.forEach(nav => {
    if (nav.querySelector('.shop-nav-link')) return;

    const isArticle = window.location.pathname.includes('/articles/');
    const href = isArticle ? '../boutique.html' : 'boutique.html';
    const link = document.createElement('a');
    link.href = href;
    link.textContent = 'Boutique';
    link.className = 'shop-nav-link';

    const searchButton = nav.querySelector('.search-open');
    if (searchButton) nav.insertBefore(link, searchButton);
    else nav.appendChild(link);
  });
})();

// Boutique — filtres de catégories
document.querySelectorAll('.shop-filter').forEach(button => {
  button.addEventListener('click', () => {
    const filter = button.dataset.shopFilter;
    document.querySelectorAll('.shop-filter').forEach(btn => btn.classList.remove('is-active'));
    button.classList.add('is-active');

    document.querySelectorAll('.shop-card').forEach(card => {
      const categories = (card.dataset.shopCategory || '').split(/\s+/);
      card.hidden = filter !== 'all' && !categories.includes(filter);
    });
  });
});

// Synchronisation globale Awin — Boutique + fiches produit
(() => {
  const WORKER_URL = "https://awin-sync.lespagesausoleil.workers.dev/";

  const PRODUCT_IDS = {
    "produit-bande-beige.html": "56050559385974",
    "produit-ligne-etoiles.html": "55389605790070",

    "produit-tapis-amara.html": "0fdca1798ca6424fa7784702b0ee7f40",
    "produit-tapis-warella.html": "1283a88dcc6a485698fe22b59ad47032",
    "produit-tapis-solina.html": "019a5d1f9318716eb76eb99bb36c96dd",
    "produit-tapis-ostenza.html": "1d229e89660f4fbc8f1a823753c00c35",

    "produit-fauteuil-seraluna.html": "26295-22-1",

    "produit-plaid-marpent.html": "20694-22-25",
    "produit-plaid-ensis.html": "19238-3-1",
    "produit-plaid-linares.html": "20714-22-25",
    "produit-plaid-kerenza.html": "27331-22-25",
    "produit-plaid-arsalan.html": "24602-22-1",
    "produit-plaid-ocevara.html": "26680-6-25",
    "produit-plaid-amberley.html": "15209-8-1",
    "produit-plaid-belvienne.html": "24972-2-25",
    "produit-plaid-ancy.html": "21811-6-25",

    "produit-maerlinna.html": "27368-22-36",
    "produit-junniper.html": "27223-22-12",
    "produit-indra.html": "18180-5-1",
    "produit-elomiane.html": "27312-5-12",
    "produit-clemencies.html": "27432-2-1",
    "produit-garavine.html": "27217-26-12",
    "produit-ulderina.html": "27139-1-1",
    "produit-floremont.html": "26401-22-12",
    "produit-lunavine.html": "26165-22-3",
    "produit-dunlora.html": "25718-22-1",
    "produit-ysilda.html": "27038-6-12",
    "produit-solviana.html": "26007-4-12",
    "produit-cabinda.html": "23515-26-3",
    "produit-armidale.html": "25011-5-12",
    "produit-floraine.html": "26832-3-12",
    "produit-rousseline.html": "24769-22-12",
    "produit-malencio.html": "25509-22-1",

    "produit-flavin.html": "20466-2-1",
    "produit-lagia.html": "23387-2-1",
    "produit-lomera.html": "26469-5-1",
    "produit-chexbres.html": "23319-2-1",
    "produit-oxcroft.html": "1695321",
    "produit-volanais.html": "26920-2-1",
    "produit-cornell.html": "13907-5-1",
    "produit-cortney.html": "1390921",

    "produit-ashwyn-26183.html": "26183-1-1",
    "produit-ashwyn-26150.html": "26150-5-1",
    "produit-montcelin.html": "25317-5-1",
    "produit-tavreen.html": "27413-1-1",
    "produit-alenasse.html": "27343-3-1",
    "produit-anthe.html": "23691-18-1",
    "produit-zilvento.html": "25058-5-1",

    "produit-fuzzletop.html": "26468-3-1",
    "produit-jollymoon.html": "25601-22-3",
    "produit-sovilex.html": "25897-8-25",
    "produit-starwhisper.html": "25932-6-11",
    "produit-puddlebrook.html": "26370-8-1",
    "produit-palerina-plaid.html": "24803-22-25",
    "produit-palerina-polochons.html": "24895-22-1"
  };

  const currentFile = () => {
    const file = window.location.pathname.split('/').pop();
    return file || 'index.html';
  };

  const formatPrice = (value, currency = 'EUR') => {
    const number = Number(
      String(value || '').replace(',', '.')
    );

    if (!Number.isFinite(number)) return null;

    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency || 'EUR'
    }).format(number);
  };

  async function fetchProducts(ids) {
    const uniqueIds = [
      ...new Set(ids.filter(Boolean))
    ];

    if (!uniqueIds.length) return {};

    const response = await fetch(
      `${WORKER_URL}?ids=${encodeURIComponent(
        uniqueIds.join(',')
      )}`
    );

    if (!response.ok) {
      throw new Error(
        `Awin HTTP ${response.status}`
      );
    }

    const data = await response.json();

    if (!data.ok) {
      throw new Error(
        data.error || 'Réponse Awin invalide'
      );
    }

    return data.products || {};
  }

  function updateRoot(root, product) {
    if (!root || !product) return;

    const price = formatPrice(
      product.price,
      product.currency
    );

    if (price) {
      root.querySelectorAll(
        '.compact-product-price, .product-detail-price, [data-awin-price]'
      ).forEach(el => {
        el.textContent = price;
      });
    }

    if (product.affiliateUrl) {
      root.querySelectorAll(
        '.product-affiliate-button, [data-awin-affiliate]'
      ).forEach(link => {
        if (link.tagName === 'A') {
          link.href = product.affiliateUrl;
        }
      });
    }
  }

  async function syncAwinEverywhere() {
    try {
      const cards = [
        ...document.querySelectorAll('.shop-card')
      ];

      const cardEntries = [];

      cards.forEach(card => {
        const link = card.querySelector(
          'a[href*="produit-"][href$=".html"]'
        );

        if (!link) return;

        const file = link
          .getAttribute('href')
          .split('/')
          .pop();

        const id = PRODUCT_IDS[file];

        if (!id) return;

        cardEntries.push({
          card,
          id
        });
      });

      const pageFile = currentFile();
      const pageId = PRODUCT_IDS[pageFile];

      const ids = cardEntries.map(
        entry => entry.id
      );

      if (pageId) {
        ids.push(pageId);
      }

      const products =
        await fetchProducts(ids);

      cardEntries.forEach(
        ({ card, id }) => {
          if (products[id]) {
            updateRoot(
              card,
              products[id]
            );
          }
        }
      );

      if (
        pageId &&
        products[pageId]
      ) {
        const detail =
          document.querySelector(
            '.product-detail'
          ) ||
          document.body;

        updateRoot(
          detail,
          products[pageId]
        );
      }

    } catch (error) {
      console.error(
        'Synchronisation globale Awin :',
        error
      );
    }
  }

  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      syncAwinEverywhere
    );
  } else {
    syncAwinEverywhere();
  }
})();
