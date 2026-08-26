
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


// Recherche globale — uniquement les produits de la Boutique
const searchOpen = document.querySelector('.search-open');
const searchOverlay = document.querySelector('#search-overlay');
const searchClose = document.querySelector('.search-close');
const siteSearch = document.querySelector('#site-search');
const searchResults = document.querySelector('#search-results');

const SEARCH_BASE = window.location.pathname.includes('/articles/') ? '../' : '';

function normalizeSearchText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function escapeSearchHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function resolveSearchUrl(url = '') {
  if (!url) return '#';
  if (/^(?:https?:|mailto:|tel:|#)/i.test(url)) return url;
  return `${SEARCH_BASE}${url.replace(/^\.?\//, '')}`;
}

async function loadSearchProducts() {
  const response = await fetch(`${SEARCH_BASE}boutique.html`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Impossible de charger la boutique.');

  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');

  return [...doc.querySelectorAll('.shop-card')].map(card => {
    const title =
      card.querySelector('.compact-product-name')?.textContent?.trim() ||
      card.querySelector('h3')?.textContent?.trim() ||
      '';

    const price =
      card.querySelector('.compact-product-price')?.textContent?.replace(/\s+/g, ' ').trim() ||
      '';

    const link =
      card.querySelector('a.compact-product-button')?.getAttribute('href') ||
      card.querySelector('a[href*="produit-"]')?.getAttribute('href') ||
      '';

    const category =
      card.dataset.shopCategory ||
      'Boutique';

    const keywords =
      card.dataset.shopSearch ||
      '';

    return {
      title,
      category,
      price,
      url: resolveSearchUrl(link),
      searchText: normalizeSearchText(
        `${title} ${price} ${category} ${keywords}`
      )
    };
  }).filter(product => product.title && product.url !== '#');
}

if (searchOpen && searchOverlay) {
  let productIndex = [];
  let productIndexPromise = null;

  async function ensureProductIndex() {
    if (productIndex.length) return productIndex;
    if (productIndexPromise) return productIndexPromise;

    productIndexPromise = loadSearchProducts()
      .then(products => {
        productIndex = products;
        return productIndex;
      });

    return productIndexPromise;
  }

  searchOpen.addEventListener('click', () => {
    searchOverlay.hidden = false;
    document.body.classList.add('no-scroll');

    if (searchResults) {
      searchResults.innerHTML =
        '<p>Recherchez un produit dans la boutique.</p>';
    }

    ensureProductIndex().catch(() => {});

    setTimeout(() => siteSearch?.focus(), 50);
  });

  searchClose?.addEventListener('click', () => {
    searchOverlay.hidden = true;
    document.body.classList.remove('no-scroll');
  });

  searchOverlay.addEventListener('click', event => {
    if (event.target === searchOverlay) {
      searchOverlay.hidden = true;
      document.body.classList.remove('no-scroll');
    }
  });

  siteSearch?.addEventListener('input', async () => {
    const q = normalizeSearchText(siteSearch.value);

    if (!q) {
      searchResults.innerHTML =
        '<p>Recherchez un produit dans la boutique.</p>';
      return;
    }

    searchResults.innerHTML = '<p>Recherche…</p>';

    const products = await ensureProductIndex();

    const allMatches = products
      .filter(product => product.searchText.includes(q));

    const matches = allMatches.slice(0, 4);

    if (!matches.length) {
      searchResults.innerHTML = '<p>Aucun produit trouvé dans la boutique.</p>';
      return;
    }

    const productResults = matches.map(product => `
      <a class="search-result" href="${escapeSearchHtml(product.url)}">
        <small>Boutique · ${escapeSearchHtml(product.category)}</small>
        <strong>${escapeSearchHtml(product.title)}</strong>
        <span>${escapeSearchHtml(product.price || 'Voir le produit')}</span>
      </a>
    `).join('');

    const categoryRules = [
      {
        words: ['plaid', 'couverture'],
        categoryTerms: ['plaid'],
        hash: 'plaids',
        label: 'Voir tous les plaids'
      },
      {
        words: ['fauteuil', 'chaise', 'mobilier'],
        categoryTerms: ['fauteuil', 'mobilier'],
        hash: 'mobilier',
        label: 'Voir tous les fauteuils'
      },
      {
        words: ['lampe', 'lanterne', 'eclairage', 'éclairage', 'lumiere', 'lumière'],
        categoryTerms: ['lampe'],
        hash: 'lampes',
        label: 'Voir toutes les lampes'
      },
      {
        words: ['tapis'],
        categoryTerms: ['tapis'],
        hash: 'tapis',
        label: 'Voir tous les tapis'
      },
      {
        words: ['miroir', 'decoration', 'décoration', 'deco', 'déco'],
        categoryTerms: ['decoration', 'décoration'],
        hash: 'decoration',
        label: 'Voir toute la décoration'
      },
      {
        words: ['livre', 'lecture', 'roman'],
        categoryTerms: ['livre', 'lecture'],
        hash: 'livres',
        label: 'Voir tous les livres'
      },
      {
        words: ['papeterie', 'carnet', 'stylo'],
        categoryTerms: ['papeterie'],
        hash: 'papeterie',
        label: 'Voir toute la papeterie'
      },
      {
        words: ['enfant', 'petit', 'petits'],
        categoryTerms: ['petit'],
        hash: 'petits',
        label: 'Voir le coin des petits'
      }
    ];

    const normalizedCategories = matches.map(product =>
      normalizeSearchText(product.category)
    );

    const activeRule = categoryRules.find(rule =>
      rule.words.some(word => q.includes(normalizeSearchText(word))) ||
      rule.categoryTerms.some(term =>
        normalizedCategories.some(category =>
          category.includes(normalizeSearchText(term))
        )
      )
    );

    const viewAllLink = activeRule
      ? `
        <a
          class="search-view-all"
          href="${escapeSearchHtml(resolveSearchUrl(`boutique.html?categorie=${activeRule.hash}`))}"
          style="
            display:flex;
            align-items:center;
            justify-content:center;
            margin-top:14px;
            padding:13px 18px;
            border-radius:999px;
            background:var(--brown);
            color:#fff;
            font-weight:600;
            text-align:center;
          "
        >
          ${escapeSearchHtml(activeRule.label)} →
        </a>
      `
      : '';

    searchResults.innerHTML = productResults + viewAllLink;
  });
}

// Page Articles — sous-menu catégories + recherche combinée
(() => {
  const articleFilter = document.querySelector('#article-filter');
  const cards = [...document.querySelectorAll('.listing-card')];
  const categoryButtons = [...document.querySelectorAll('[data-category-filter]')];
  const emptyState = document.querySelector('#empty-state');

  if (!cards.length || (!articleFilter && !categoryButtons.length)) return;

  let activeCategory = '';

  function applyArticleFilters() {
    const q = (articleFilter?.value || '').trim().toLowerCase();
    let visible = 0;

    cards.forEach(card => {
      const title = (card.dataset.title || '').toLowerCase();
      const category = (card.dataset.category || '').toLowerCase();

      const matchesSearch = !q || `${title} ${category}`.includes(q);
      const matchesCategory = !activeCategory || category === activeCategory;

      const show = matchesSearch && matchesCategory;
      card.hidden = !show;

      if (show) visible++;
    });

    if (emptyState) {
      emptyState.hidden = visible !== 0;
    }
  }

  categoryButtons.forEach(button => {
    button.addEventListener('click', () => {
      const requestedCategory = (button.dataset.categoryFilter || '').toLowerCase();

      // Un second clic sur l'onglet actif revient à l'affichage de tous les articles.
      activeCategory = activeCategory === requestedCategory ? '' : requestedCategory;

      categoryButtons.forEach(btn => {
        btn.classList.toggle(
          'is-active',
          (btn.dataset.categoryFilter || '').toLowerCase() === activeCategory
        );
      });

      applyArticleFilters();
    });
  });

  articleFilter?.addEventListener('input', applyArticleFilters);

  applyArticleFilters();
})();


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

// Boutique — filtres de catégories + URL partageable
(() => {
  const buttons = [...document.querySelectorAll('.shop-filter')];
  const cards = [...document.querySelectorAll('.shop-card, .home-product-card')];

  if (!buttons.length || !cards.length) return;

  function applyShopFilter(filter, updateUrl = true) {
    const validFilters = buttons.map(btn => btn.dataset.shopFilter);

    if (!validFilters.includes(filter)) {
      filter = 'all';
    }

    buttons.forEach(button => {
      button.classList.toggle(
        'is-active',
        button.dataset.shopFilter === filter
      );
    });

    cards.forEach(card => {
      const categories = (card.dataset.shopCategory || '')
        .split(/\s+/)
        .filter(Boolean);

      card.hidden =
        filter !== 'all' &&
        !categories.includes(filter);
    });

    if (updateUrl) {
      const url = new URL(window.location.href);

      if (filter === 'all') {
        url.hash = '';
      } else {
        url.hash = filter;
      }

      history.pushState(
        { shopFilter: filter },
        '',
        url
      );
    }
  }

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      applyShopFilter(button.dataset.shopFilter);
    });
  });

  const initialFilter =
    window.location.hash.replace('#', '') || 'all';

  applyShopFilter(initialFilter, false);

  window.addEventListener('popstate', () => {
    const filter =
      window.location.hash.replace('#', '') || 'all';

    applyShopFilter(filter, false);
  });
})();

// Synchronisation globale Awin — Boutique + fiches produit
(() => {
  const WORKER_URL = "https://awin-sync.lespagesausoleil.workers.dev/";

  const PRODUCT_IDS = {
    "produit-bande-beige.html": "56050559385974",
    "produit-ligne-etoiles.html": "55389605790070",
    "produit-fauteuil-tago.html": "100036673",
    "produit-fauteuil-pliant-locmelar.html": "22535-2-1",

    "produit-tapis-amara.html": "0fdca1798ca6424fa7784702b0ee7f40",
    "produit-tapis-warella.html": "1283a88dcc6a485698fe22b59ad47032",
    "produit-tapis-solina.html": "019a5d1f9318716eb76eb99bb36c96dd",
    "produit-tapis-ostenza.html": "1d229e89660f4fbc8f1a823753c00c35",

    "produit-fauteuil-seraluna.html": "26295-22-1",
    "produit-fauteuil-ducan-malmo.html": "0093054",

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
    "produit-lampe-elegance.html": "48838639517924",
    "produit-lampe-nomade-3-ambiances.html": "48846264369380",

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
        '.compact-product-price, .product-detail-price, .home-product-price, [data-awin-price]'
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
        ...document.querySelectorAll('.shop-card, .home-product-card')
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

// Accueil V12 — charge les vraies infos de 4 fiches produits existantes
(() => {
  const cards = [...document.querySelectorAll('[data-home-product]')];
  if (!cards.length) return;

  async function hydrateHomeCard(card) {
    const page = card.dataset.homeProduct;
    if (!page) return;

    try {
      const response = await fetch(page);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');

      const name = doc.querySelector('.product-detail-copy h1, .product-detail h1, h1')?.textContent?.trim();
      const sourceImage = doc.querySelector('.product-detail-image img, .product-detail img')?.getAttribute('src');
      const sourcePrice = doc.querySelector('.product-detail-price, [data-awin-price]')?.textContent?.trim();

      const title = card.querySelector('h3');
      const image = card.querySelector('.home-product-image img');
      const loader = card.querySelector('.home-product-loader');
      const price = card.querySelector('.home-product-price');

      if (name && title) title.textContent = name;

      // Awin reste prioritaire. Si aucun prix ne revient du Worker,
      // on reprend automatiquement le prix de la fiche produit locale.
      if (
        sourcePrice &&
        price &&
        /\d/.test(sourcePrice) &&
        /voir le prix/i.test(price.textContent || '')
      ) {
        price.textContent = sourcePrice;
      }

      if (sourceImage && image) {
        image.src = sourceImage;
        image.alt = name || 'Produit sélectionné par Les Pages au Soleil';
        image.hidden = false;
        if (loader) loader.hidden = true;
      }
    } catch (error) {
      console.warn('Accueil : fiche produit non chargée', page, error);
    }
  }

  cards.forEach(hydrateHomeCard);

  document.querySelectorAll('.home-favorite').forEach(button => {
    button.addEventListener('click', () => {
      const active = button.classList.toggle('is-active');
      button.textContent = active ? '♥' : '♡';
      button.setAttribute('aria-label', active ? 'Retirer des favoris' : 'Ajouter aux favoris');
    });
  });
})();

// Consentement Awin — Les Pages au Soleil
(() => {
  const STORAGE_KEY = 'lps_awin_consent_v1';
  const STORAGE_DATE_KEY = 'lps_awin_consent_date_v1';
  const SIX_MONTHS = 1000 * 60 * 60 * 24 * 183;

  const AWIN_HOSTS = [
    'awin1.com',
    'www.awin1.com',
    'tidd.ly'
  ];

  function safeStorageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_) {}
  }

  function safeStorageRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch (_) {}
  }

  function storedChoice() {
    const choice = safeStorageGet(STORAGE_KEY);
    const savedAt = Number(safeStorageGet(STORAGE_DATE_KEY) || 0);

    if (!choice || !savedAt || Date.now() - savedAt > SIX_MONTHS) {
      safeStorageRemove(STORAGE_KEY);
      safeStorageRemove(STORAGE_DATE_KEY);
      return null;
    }

    return choice === 'accepted' || choice === 'refused'
      ? choice
      : null;
  }

  function consentValue() {
    return storedChoice() === 'accepted' ? '1' : '0';
  }

  function saveChoice(choice) {
    safeStorageSet(STORAGE_KEY, choice);
    safeStorageSet(STORAGE_DATE_KEY, String(Date.now()));
    updateConsentState();
  }

  function isAwinUrl(rawUrl) {
    if (!rawUrl) return false;

    try {
      const url = new URL(rawUrl, window.location.href);
      const host = url.hostname.toLowerCase();

      return AWIN_HOSTS.includes(host) ||
        host.endsWith('.awin1.com') ||
        host.endsWith('.tidd.ly');
    } catch (_) {
      return false;
    }
  }

  function withAwinConsent(rawUrl) {
    if (!isAwinUrl(rawUrl)) return rawUrl;

    try {
      const url = new URL(rawUrl, window.location.href);
      url.searchParams.set('cons', consentValue());
      return url.toString();
    } catch (_) {
      return rawUrl;
    }
  }

  // IMPORTANT :
  // le paramètre est ajouté au dernier moment, y compris aux URLs
  // mises à jour dynamiquement par le Worker Awin.
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!isAwinUrl(href)) return;

    link.href = withAwinConsent(href);
  }, true);

  // Clavier / ouverture via Enter : même protection.
  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;

    const link = document.activeElement?.closest?.('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!isAwinUrl(href)) return;

    link.href = withAwinConsent(href);
  }, true);

  function injectStyles() {
    if (document.getElementById('lps-consent-styles')) return;

    const style = document.createElement('style');
    style.id = 'lps-consent-styles';
    style.textContent = `
      .lps-consent-banner{
        position:fixed;
        left:20px;
        right:20px;
        bottom:20px;
        z-index:100000;
        max-width:760px;
        margin:0 auto;
        padding:22px 24px;
        border:1px solid rgba(76,58,43,.18);
        border-radius:22px;
        background:#fffdf9;
        box-shadow:0 18px 55px rgba(49,38,29,.18);
        color:#2d2824;
        font-family:"DM Sans",system-ui,sans-serif;
      }
      .lps-consent-banner[hidden]{display:none !important}
      .lps-consent-title{
        margin:0 0 8px;
        font-family:"Playfair Display",Georgia,serif;
        font-size:1.28rem;
        line-height:1.2;
      }
      .lps-consent-text{
        margin:0;
        color:#655c55;
        font-size:.92rem;
        line-height:1.55;
      }
      .lps-consent-text a{
        color:#6f5038;
        text-decoration:underline;
        text-underline-offset:3px;
      }
      .lps-consent-actions{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:10px;
        margin-top:17px;
      }
      .lps-consent-button{
        min-height:44px;
        border:1px solid #6f5038;
        border-radius:999px;
        padding:10px 18px;
        font:600 .9rem/1 "DM Sans",system-ui,sans-serif;
        cursor:pointer;
      }
      .lps-consent-refuse{
        background:#fffdf9;
        color:#4c3a2b;
      }
      .lps-consent-accept{
        background:#4c3a2b;
        color:#fff;
      }
      .lps-consent-manage{
        position:fixed;
        left:16px;
        bottom:16px;
        z-index:99990;
        border:1px solid rgba(76,58,43,.28);
        border-radius:999px;
        padding:8px 12px;
        background:#fffdf9;
        color:#4c3a2b;
        box-shadow:0 6px 22px rgba(49,38,29,.12);
        font:500 .76rem/1 "DM Sans",system-ui,sans-serif;
        cursor:pointer;
      }
      .lps-consent-manage[hidden]{display:none !important}
      @media(max-width:600px){
        .lps-consent-banner{
          left:12px;
          right:12px;
          bottom:12px;
          padding:20px 18px;
          border-radius:18px;
        }
        .lps-consent-actions{
          grid-template-columns:1fr;
        }
        .lps-consent-button{
          width:100%;
        }
        .lps-consent-manage{
          left:10px;
          bottom:10px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function buildUI() {
    if (document.getElementById('lps-consent-banner')) return;

    injectStyles();

    const banner = document.createElement('section');
    banner.id = 'lps-consent-banner';
    banner.className = 'lps-consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-modal', 'false');
    banner.setAttribute('aria-labelledby', 'lps-consent-title');

    banner.innerHTML = `
      <h2 class="lps-consent-title" id="lps-consent-title">
        Cookies d’affiliation
      </h2>
      <p class="lps-consent-text">
        Les Pages au Soleil utilise les traceurs d’affiliation Awin pour attribuer
        les achats réalisés après un clic sur certains liens. Ils ne sont pas
        nécessaires au fonctionnement du site. Vous pouvez accepter ou refuser,
        puis modifier votre choix à tout moment.
        <a href="confidentialite.html">En savoir plus</a>.
      </p>
      <div class="lps-consent-actions">
        <button class="lps-consent-button lps-consent-refuse"
                type="button"
                data-lps-consent="refused">
          Refuser
        </button>
        <button class="lps-consent-button lps-consent-accept"
                type="button"
                data-lps-consent="accepted">
          Accepter
        </button>
      </div>
    `;

    const manage = document.createElement('button');
    manage.id = 'lps-consent-manage';
    manage.className = 'lps-consent-manage';
    manage.type = 'button';
    manage.textContent = 'Gérer mes cookies';
    manage.setAttribute('aria-controls', 'lps-consent-banner');

    document.body.appendChild(banner);
    document.body.appendChild(manage);

    banner.querySelectorAll('[data-lps-consent]').forEach(button => {
      button.addEventListener('click', () => {
        saveChoice(button.dataset.lpsConsent);
        banner.hidden = true;
        manage.hidden = false;
      });
    });

    manage.addEventListener('click', () => {
      banner.hidden = false;
      manage.hidden = true;

      const firstButton = banner.querySelector('[data-lps-consent="refused"]');
      setTimeout(() => firstButton?.focus(), 0);
    });

    updateConsentState();
  }

  function updateConsentState() {
    const banner = document.getElementById('lps-consent-banner');
    const manage = document.getElementById('lps-consent-manage');
    if (!banner || !manage) return;

    const choice = storedChoice();

    if (choice) {
      banner.hidden = true;
      manage.hidden = false;
    } else {
      banner.hidden = false;
      manage.hidden = true;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildUI, { once:true });
  } else {
    buildUI();
  }
})();
