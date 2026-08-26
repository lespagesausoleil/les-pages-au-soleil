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
    "produit-palerina-polochons.html": "24895-22-1",

    // Livres Ammareal
    "produit-livre-david-copperfield.html": "C-835-922",
    "produit-livre-du-contrat-social.html": "C-835-952",
    "produit-livre-cafe-noisette.html": "C-836-047",
    "produit-livre-en-avant-toutes.html": "C-836-058",
    "produit-livre-vie-et-mort-dun-cochon.html": "C-836-042",
    "produit-livre-barbelune.html": "C-835-944",
    "produit-livre-les-bleuets.html": "C-835-959",
    "produit-livre-merveilleux-decors.html": "C-835-889",
    "produit-livre-cuisine-provencale.html": "C-835-893",
    "produit-livre-cuisine-sud-ouest.html": "C-835-892",
    "produit-livre-cuisine-orientale.html": "C-835-891",
    "produit-livre-midi-pyreneen.html": "C-836-033"
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

// =========================================================
// MENU DEFINITIF GLOBAL — toutes les pages, y compris produits
// Exécuté APRÈS construction du DOM pour fonctionner même si
// script.js est chargé tôt dans certaines anciennes pages.
// =========================================================
(() => {
  function installUnifiedMenu() {
    const mainNav = document.querySelector('.main-nav');
    if (!mainNav) return;

    const pathname = (window.location.pathname || '/').toLowerCase();
    const inArticlesFolder = pathname.includes('/articles/');
    const base = inArticlesFolder ? '../' : '';

    const isHome =
      pathname === '/' ||
      pathname.endsWith('/index.html');

    const isArticles =
      !isHome &&
      (
        pathname.endsWith('/articles') ||
        pathname.endsWith('/articles.html') ||
        pathname.includes('/articles/') ||
        pathname.includes('rubrique-')
      );

    const isBoutique =
      pathname.includes('boutique') ||
      pathname.includes('produit-');

    const isContact = pathname.includes('contact');

    // Uniquement les 5 liens demandés + la loupe.
    mainNav.innerHTML = `
      <a href="${base}index.html"${isHome ? ' class="is-active"' : ''}>Accueil</a>
      <a href="${base}articles.html"${isArticles ? ' class="is-active"' : ''}>Articles</a>
      <a href="${base}boutique.html"${isBoutique ? ' class="shop-nav-link is-active"' : ' class="shop-nav-link"'}>Boutique</a>
      <a href="${base}index.html#apropos">À propos</a>
      <a href="${base}contact.html"${isContact ? ' class="is-active"' : ''}>Contact</a>
      <button class="search-open" type="button" aria-label="Rechercher">⌕</button>
    `;

    // Le menu mobile doit aussi se refermer avec les nouveaux liens.
    mainNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => mainNav.classList.remove('open'));
    });

    // S'assurer que la loupe possède un panneau de recherche.
    let overlay = document.getElementById('search-overlay');
    let overlayWasCreated = false;

    if (!overlay) {
      overlayWasCreated = true;
      overlay = document.createElement('div');
      overlay.className = 'search-overlay';
      overlay.id = 'search-overlay';
      overlay.hidden = true;
      overlay.innerHTML = `
        <div class="search-panel" role="dialog" aria-modal="true" aria-labelledby="search-title">
          <button class="search-close" type="button" aria-label="Fermer">×</button>
          <p class="kicker">Recherche</p>
          <h2 id="search-title">Rechercher dans la boutique</h2>
          <input id="site-search" type="search" placeholder="Ex. lampe, fauteuil, plaid, tapis…">
          <div id="search-results" class="search-results"></div>
        </div>
      `;

      const header = document.querySelector('.site-header');
      if (header) header.insertAdjacentElement('afterend', overlay);
      else document.body.prepend(overlay);
    }

    const newSearchOpen = mainNav.querySelector('.search-open');
    const close = overlay.querySelector('.search-close');
    const input = overlay.querySelector('#site-search');
    const results = overlay.querySelector('#search-results');

    // Le nouveau bouton a forcément besoin de son propre listener puisque
    // l'ancien bouton vient d'être remplacé dans le DOM.
    newSearchOpen?.addEventListener('click', () => {
      overlay.hidden = false;
      document.body.classList.add('no-scroll');

      if (results && !input?.value) {
        results.innerHTML = '<p>Recherchez un produit dans la boutique.</p>';
      }

      setTimeout(() => input?.focus(), 50);
    });

    // Si le panneau vient d'être créé sur une ancienne fiche produit,
    // on lui donne aussi son comportement complet.
    if (overlayWasCreated) {
      const hideOverlay = () => {
        overlay.hidden = true;
        document.body.classList.remove('no-scroll');
      };

      close?.addEventListener('click', hideOverlay);
      overlay.addEventListener('click', event => {
        if (event.target === overlay) hideOverlay();
      });

      document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !overlay.hidden) hideOverlay();
      });

      let productsPromise = null;

      async function getProducts() {
        if (!productsPromise) {
          productsPromise = fetch(`${base}boutique.html`, { cache: 'no-store' })
            .then(response => {
              if (!response.ok) throw new Error('Boutique inaccessible');
              return response.text();
            })
            .then(html => {
              const doc = new DOMParser().parseFromString(html, 'text/html');

              return [...doc.querySelectorAll('.shop-card')]
                .map(card => {
                  const title =
                    card.querySelector('.compact-product-name')?.textContent?.trim() ||
                    card.querySelector('h3')?.textContent?.trim() ||
                    '';

                  const price =
                    card.querySelector('.compact-product-price')?.textContent
                      ?.replace(/\s+/g, ' ')
                      .trim() || '';

                  const href =
                    card.querySelector('.compact-product-button')?.getAttribute('href') ||
                    card.querySelector('a[href*="produit-"]')?.getAttribute('href') ||
                    '';

                  const category = card.dataset.shopCategory || 'Boutique';
                  const keywords = card.dataset.shopSearch || '';

                  const normalize = value =>
                    String(value || '')
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '')
                      .toLowerCase()
                      .trim();

                  return {
                    title,
                    price,
                    category,
                    href: href ? `${base}${href.replace(/^\.?\//, '')}` : '#',
                    searchText: normalize(`${title} ${price} ${category} ${keywords}`)
                  };
                })
                .filter(product => product.title && product.href !== '#');
            });
        }

        return productsPromise;
      }

      const escapeHtml = value =>
        String(value || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');

      const normalize = value =>
        String(value || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim();

      input?.addEventListener('input', async () => {
        if (!results) return;

        const q = normalize(input.value);
        if (!q) {
          results.innerHTML = '<p>Recherchez un produit dans la boutique.</p>';
          return;
        }

        results.innerHTML = '<p>Recherche…</p>';

        try {
          const products = await getProducts();
          const matches = products
            .filter(product => product.searchText.includes(q))
            .slice(0, 4);

          if (!matches.length) {
            results.innerHTML = '<p>Aucun produit trouvé dans la boutique.</p>';
            return;
          }

          results.innerHTML = matches.map(product => `
            <a class="search-result" href="${escapeHtml(product.href)}">
              <small>Boutique · ${escapeHtml(product.category)}</small>
              <strong>${escapeHtml(product.title)}</strong>
              <span>${escapeHtml(product.price || 'Voir le produit')}</span>
            </a>
          `).join('');
        } catch (_) {
          results.innerHTML = '<p>La recherche est momentanément indisponible.</p>';
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installUnifiedMenu, { once: true });
  } else {
    installUnifiedMenu();
  }
})();


/* =========================================================
   SÉLECTIONS PRODUITS DANS LES ARTICLES — Les Pages au Soleil
   3 produits pertinents par article + prix Awin synchronisés
   ========================================================= */
(() => {
  const ARTICLE_PRODUCT_SELECTIONS = {"cadeaux-lecteurs.html":{"intro":"Trois idées simples pour prolonger le plaisir de lire avec des objets utiles et chaleureux.","products":[{"file":"produit-lampe-elegance.html","title":"Lampe rechargeable Élégance","price":"59,99 €","image":"https://eclairagedeco.com/cdn/shop/files/lampe-rechargeable-couleur-or-rose-fiche-produit-elegance.jpg?v=1777423382&width=1946","description":"La lampe rechargeable Élégance est pensée pour créer une lumière douce et modulable autour d’un fauteuil, sur une table d’appoint ou dans une chambre.","awinId":"48838639517924"},{"file":"produit-plaid-marpent.html","title":"Plaid Marpent","price":"34,95 €","image":"https://www.loberon.fr/media/1984x1984x2/69/67/bc/1735876674/225374_20694-4-25/225374_plaid_marpent_creme_grau.jpg?ts=1785894417","description":"Un plaid léger en pur coton, aux rayures crème et gris, pensé pour les soirées lecture et les moments de détente.","awinId":"20694-22-25"},{"file":"produit-chexbres.html","title":"Lanterne LED rechargeable Chexbres","price":"29,95 €","image":"https://www.loberon.fr/media/eb/14/f0/1717235768/196566_23319-5-1.jpg?ts=1786327589","description":"Une lanterne inspirée des anciennes lampes à huile, revisitée avec une ampoule LED rechargeable.","awinId":"23319-2-1"}]},"coin-lecture-cocooning.html":{"intro":"Une assise confortable, une lumière douce et un textile chaleureux suffisent souvent à composer un vrai refuge.","products":[{"file":"produit-fauteuil-seraluna.html","title":"Fauteuil Seraluna","price":"298,00 €","image":"https://www.loberon.at/media/9c/04/06/1786328954/253721_26295-22-1.jpg?ts=1787018574","description":"Une assise enveloppante pensée pour les moments où l’on ralentit vraiment.","awinId":"26295-22-1"},{"file":"produit-lampe-lecture-rechargeable.html","title":"Lampe de lecture rechargeable — cuivre","price":"44,99 €","image":"../assets/lampe-lecture-cuivre.png","description":"Une lampe sans fil compacte et chaleureuse, idéale comme éclairage d’appoint près d’un fauteuil, sur une petite table ou dans un coin lecture.","awinId":"48865647624420"},{"file":"produit-plaid-ancy.html","title":"Plaid Ancy","price":"59,95 €","image":"https://www.loberon.fr/media/04/ca/82/1717230657/161285_21811-6-25.jpg?ts=1785894626","description":"Un plaid bleu tricoté en pur coton, doux et moelleux, exactement dans l’esprit d’une longue pause lecture.","awinId":"21811-6-25"}]},"decorer-bibliotheque.html":{"intro":"Quelques points lumineux et détails décoratifs permettent d’habiller une bibliothèque sans la surcharger.","products":[{"file":"produit-lomera.html","title":"Lanterne LED Lomera","price":"29,95 €","image":"https://www.loberon.fr/media/ac/f5/a9/1766024492/251491_26469-5-1.jpg?ts=1786329056","description":"Une lanterne blanche au bel effet vieilli, avec un cylindre en verre qui met en valeur la lumière LED chaude.","awinId":"26469-5-1"},{"file":"produit-ligne-etoiles.html","title":"Ligne déco avec les étoiles — 1 m","price":"3,95 €","image":"https://deluxehomeartshop.fr/cdn/shop/files/IMG_7777.jpg?v=1742213325&width=1946","description":"Une petite ligne décorative avec étoiles pour apporter une touche lumineuse et chaleureuse à une étagère, une table ou une décoration de saison.","awinId":"55389605790070"},{"file":"produit-lampe-elegance.html","title":"Lampe rechargeable Élégance","price":"59,99 €","image":"https://eclairagedeco.com/cdn/shop/files/lampe-rechargeable-couleur-or-rose-fiche-produit-elegance.jpg?v=1777423382&width=1946","description":"La lampe rechargeable Élégance est pensée pour créer une lumière douce et modulable autour d’un fauteuil, sur une table d’appoint ou dans une chambre.","awinId":"48838639517924"}]},"fauteuils-lecture.html":{"intro":"Une fois le fauteuil choisi, quelques accessoires bien pensés complètent naturellement le coin lecture.","products":[{"file":"produit-lampe-lecture-rechargeable.html","title":"Lampe de lecture rechargeable — cuivre","price":"44,99 €","image":"../assets/lampe-lecture-cuivre.png","description":"Une lampe sans fil compacte et chaleureuse, idéale comme éclairage d’appoint près d’un fauteuil, sur une petite table ou dans un coin lecture.","awinId":"48865647624420"},{"file":"produit-plaid-marpent.html","title":"Plaid Marpent","price":"34,95 €","image":"https://www.loberon.fr/media/1984x1984x2/69/67/bc/1735876674/225374_20694-4-25/225374_plaid_marpent_creme_grau.jpg?ts=1785894417","description":"Un plaid léger en pur coton, aux rayures crème et gris, pensé pour les soirées lecture et les moments de détente.","awinId":"20694-22-25"},{"file":"produit-tapis-solina.html","title":"Tapis Solina — crème","price":"44,15 €","image":"https://www.tapis.fr/thumbnail/66/dc/46/1764144793/019abf3814147202bd1d9fce9f748917_1500.webp","description":"« Sa teinte crème et son aspect moelleux apportent immédiatement de la douceur à un coin lecture ou à une pièce de vie, tout en conservant une ambiance lumineuse et naturelle.","awinId":"019a5d1f9318716eb76eb99bb36c96dd"}]},"journee-slow-living.html":{"intro":"Des objets doux et faciles à déplacer pour accompagner les moments où l’on choisit de ralentir.","products":[{"file":"produit-plaid-marpent.html","title":"Plaid Marpent","price":"34,95 €","image":"https://www.loberon.fr/media/1984x1984x2/69/67/bc/1735876674/225374_20694-4-25/225374_plaid_marpent_creme_grau.jpg?ts=1785894417","description":"Un plaid léger en pur coton, aux rayures crème et gris, pensé pour les soirées lecture et les moments de détente.","awinId":"20694-22-25"},{"file":"produit-chexbres.html","title":"Lanterne LED rechargeable Chexbres","price":"29,95 €","image":"https://www.loberon.fr/media/eb/14/f0/1717235768/196566_23319-5-1.jpg?ts=1786327589","description":"Une lanterne inspirée des anciennes lampes à huile, revisitée avec une ampoule LED rechargeable.","awinId":"23319-2-1"},{"file":"produit-floraine.html","title":"Lot de 2 housses de coussins Floraine","price":"22,46 € 44,95 €","image":"https://www.loberon.fr/media/61/b8/2e/1770259176/259060_26832-3-12.jpg?ts=1785896428","description":"Deux housses en pur lin qui associent impression délicate et broderie en coton.","awinId":"26832-3-12"}]},"lampes-chaleureuses.html":{"intro":"Trois sources lumineuses pour créer plusieurs halos et éviter une pièce éclairée par une seule lumière trop forte.","products":[{"file":"produit-lampe-elegance.html","title":"Lampe rechargeable Élégance","price":"59,99 €","image":"https://eclairagedeco.com/cdn/shop/files/lampe-rechargeable-couleur-or-rose-fiche-produit-elegance.jpg?v=1777423382&width=1946","description":"La lampe rechargeable Élégance est pensée pour créer une lumière douce et modulable autour d’un fauteuil, sur une table d’appoint ou dans une chambre.","awinId":"48838639517924"},{"file":"produit-lampe-nomade-3-ambiances.html","title":"Lampe rechargeable Nomade 3 Ambiances","price":"24,99 €","image":"https://eclairagedeco.com/cdn/shop/files/lampe-rechargeable-argent-fiche-produit-nomade-3-ambiances.jpg?v=1777471511&width=1946","description":"La lampe rechargeable Nomade 3 Ambiances est une option simple et accessible pour ajouter une lumière douce près d’un fauteuil, sur une table d’appoint ou dans une chambre.","awinId":"48846264369380"},{"file":"produit-lagia.html","title":"Lanterne LED rechargeable Lagia","price":"34,95 €","image":"https://www.loberon.fr/media/82/19/a7/1774318281/264263_23387-2-1.jpg?ts=1786327613","description":"Une lanterne sur tige au fini vieilli, pensée pour créer un point lumineux chaleureux dans le jardin ou près d’une terrasse.","awinId":"23387-2-1"}]},"plaids-cocooning.html":{"intro":"Trois textures et ambiances différentes pour choisir un plaid selon la saison et le niveau de chaleur recherché.","products":[{"file":"produit-plaid-marpent.html","title":"Plaid Marpent","price":"34,95 €","image":"https://www.loberon.fr/media/1984x1984x2/69/67/bc/1735876674/225374_20694-4-25/225374_plaid_marpent_creme_grau.jpg?ts=1785894417","description":"Un plaid léger en pur coton, aux rayures crème et gris, pensé pour les soirées lecture et les moments de détente.","awinId":"20694-22-25"},{"file":"produit-plaid-ancy.html","title":"Plaid Ancy","price":"59,95 €","image":"https://www.loberon.fr/media/04/ca/82/1717230657/161285_21811-6-25.jpg?ts=1785894626","description":"Un plaid bleu tricoté en pur coton, doux et moelleux, exactement dans l’esprit d’une longue pause lecture.","awinId":"21811-6-25"},{"file":"produit-plaid-kerenza.html","title":"Plaid Kerenza","price":"54,95 €","image":"https://www.loberon.fr/media/1a/4a/28/1779846463/270175_27331-22-25.jpg?ts=1785896669","description":"Un plaid chaud au motif chevrons crème et marron, tissé à la main et composé majoritairement de laine.","awinId":"27331-22-25"}]},"rituel-dimanche.html":{"intro":"Quelques objets simples pour créer un moment calme autour d’une lumière douce et d’un textile confortable.","products":[{"file":"produit-plaid-ocevara.html","title":"Plaid Ocevara","price":"59,95 €","image":"https://www.loberon.fr/media/eb/66/40/1769481751/256290_26680-6-25.jpg?ts=1785896337","description":"Un plaid bleu et crème en pur coton, au motif végétal discret, pour apporter une touche fraîche et douce au canapé.","awinId":"26680-6-25"},{"file":"produit-lampe-elegance.html","title":"Lampe rechargeable Élégance","price":"59,99 €","image":"https://eclairagedeco.com/cdn/shop/files/lampe-rechargeable-couleur-or-rose-fiche-produit-elegance.jpg?v=1777423382&width=1946","description":"La lampe rechargeable Élégance est pensée pour créer une lumière douce et modulable autour d’un fauteuil, sur une table d’appoint ou dans une chambre.","awinId":"48838639517924"},{"file":"produit-chexbres.html","title":"Lanterne LED rechargeable Chexbres","price":"29,95 €","image":"https://www.loberon.fr/media/eb/14/f0/1717235768/196566_23319-5-1.jpg?ts=1786327589","description":"Une lanterne inspirée des anciennes lampes à huile, revisitée avec une ampoule LED rechargeable.","awinId":"23319-2-1"}]},"romans-automne.html":{"intro":"Une lumière de lecture, un plaid chaud et une assise enveloppante pour accompagner les longues soirées de lecture.","products":[{"file":"produit-lampe-lecture-rechargeable.html","title":"Lampe de lecture rechargeable — cuivre","price":"44,99 €","image":"../assets/lampe-lecture-cuivre.png","description":"Une lampe sans fil compacte et chaleureuse, idéale comme éclairage d’appoint près d’un fauteuil, sur une petite table ou dans un coin lecture.","awinId":"48865647624420"},{"file":"produit-plaid-kerenza.html","title":"Plaid Kerenza","price":"54,95 €","image":"https://www.loberon.fr/media/1a/4a/28/1779846463/270175_27331-22-25.jpg?ts=1785896669","description":"Un plaid chaud au motif chevrons crème et marron, tissé à la main et composé majoritairement de laine.","awinId":"27331-22-25"},{"file":"produit-fauteuil-seraluna.html","title":"Fauteuil Seraluna","price":"298,00 €","image":"https://www.loberon.at/media/9c/04/06/1786328954/253721_26295-22-1.jpg?ts=1787018574","description":"Une assise enveloppante pensée pour les moments où l’on ralentit vraiment.","awinId":"26295-22-1"}]},"salon-chaleureux-erreurs.html":{"intro":"Un tapis clair, une lumière d’appoint et des textiles naturels peuvent suffire à réchauffer visuellement la pièce.","products":[{"file":"produit-tapis-solina.html","title":"Tapis Solina — crème","price":"44,15 €","image":"https://www.tapis.fr/thumbnail/66/dc/46/1764144793/019abf3814147202bd1d9fce9f748917_1500.webp","description":"« Sa teinte crème et son aspect moelleux apportent immédiatement de la douceur à un coin lecture ou à une pièce de vie, tout en conservant une ambiance lumineuse et naturelle.","awinId":"019a5d1f9318716eb76eb99bb36c96dd"},{"file":"produit-lampe-elegance.html","title":"Lampe rechargeable Élégance","price":"59,99 €","image":"https://eclairagedeco.com/cdn/shop/files/lampe-rechargeable-couleur-or-rose-fiche-produit-elegance.jpg?v=1777423382&width=1946","description":"La lampe rechargeable Élégance est pensée pour créer une lumière douce et modulable autour d’un fauteuil, sur une table d’appoint ou dans une chambre.","awinId":"48838639517924"},{"file":"produit-floraine.html","title":"Lot de 2 housses de coussins Floraine","price":"22,46 € 44,95 €","image":"https://www.loberon.fr/media/61/b8/2e/1770259176/259060_26832-3-12.jpg?ts=1785896428","description":"Deux housses en pur lin qui associent impression délicate et broderie en coton.","awinId":"26832-3-12"}]}};

  function normalizeArticleText(value = '') {
    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function installArticleProductSelection() {
    const path = window.location.pathname || '';
    if (!path.includes('/articles/')) return;

    const filename = (path.split('/').pop() || '').replace(/\/$/, '') || '';
    const htmlFilename = filename.endsWith('.html') ? filename : `${filename}.html`;
    const selection = ARTICLE_PRODUCT_SELECTIONS[htmlFilename];
    if (!selection) return;

    const main = document.querySelector('main');
    if (!main) return;

    // Évite les doublons en cas de nouvelle exécution du script.
    document.querySelector('#article-product-selection')?.remove();

    // Remplace l'ancienne zone « Pour recréer cette ambiance » lorsqu'elle existe.
    const oldHeading = [...main.querySelectorAll('h2, h3')]
      .find(el => normalizeArticleText(el.textContent).includes('pour recreer cette ambiance'));

    if (oldHeading) {
      const oldSection = oldHeading.closest('section');
      if (
        oldSection &&
        oldSection !== main &&
        oldSection.textContent.length < 6000
      ) {
        oldSection.remove();
      }
    }

    if (!document.getElementById('article-product-selection-style')) {
      const style = document.createElement('style');
      style.id = 'article-product-selection-style';
      style.textContent = `
        .article-product-selection{
          margin:56px auto 12px;
          padding:46px 0 10px;
          border-top:1px solid #eadfd2;
        }
        .article-product-selection-head{
          max-width:760px;
          margin:0 auto 26px;
          text-align:center;
        }
        .article-product-selection-head .kicker{
          margin-bottom:8px;
        }
        .article-product-selection-head h2{
          margin:0 0 12px;
          font-size:clamp(2rem,4vw,3.15rem);
        }
        .article-product-selection-head p:last-child{
          margin:0 auto;
          max-width:680px;
          color:#6e675f;
        }
        .article-product-selection-grid{
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:18px;
          max-width:1040px;
          margin:0 auto;
        }
        .article-product-pick{
          display:flex;
          flex-direction:column;
          overflow:hidden;
          border:1px solid #eadfd2;
          border-radius:18px;
          background:#fffdf9;
          min-width:0;
        }
        .article-product-pick img{
          display:block;
          width:100%;
          aspect-ratio:1/1;
          object-fit:cover;
          background:#f6efe5;
        }
        .article-product-pick-copy{
          display:flex;
          flex:1;
          flex-direction:column;
          padding:17px 17px 18px;
        }
        .article-product-pick h3{
          margin:0 0 9px;
          font-size:1.2rem;
        }
        .article-product-pick-description{
          margin:0 0 14px;
          color:#6e675f;
          font-size:.92rem;
          line-height:1.6;
        }
        .article-product-pick-bottom{
          margin-top:auto;
        }
        .article-product-pick-price{
          margin:0 0 10px;
          color:#b66b16;
          font-weight:700;
        }
        .article-product-pick-link{
          display:inline-flex;
          align-items:center;
          gap:5px;
          font-weight:700;
          color:#6f4f39;
        }
        .article-product-pick-link:hover{
          text-decoration:underline;
          text-underline-offset:3px;
        }
        @media (max-width:760px){
          .article-product-selection{
            margin-top:42px;
            padding-top:36px;
          }
          .article-product-selection-grid{
            grid-template-columns:1fr;
            max-width:520px;
          }
        }
      `;
      document.head.appendChild(style);
    }

    const section = document.createElement('section');
    section.id = 'article-product-selection';
    section.className = 'article-product-selection';
    section.setAttribute('aria-labelledby', 'article-product-selection-title');

    section.innerHTML = `
      <div class="article-product-selection-head">
        <p class="kicker">Sélection de la rédaction</p>
        <h2 id="article-product-selection-title">Pour prolonger l’ambiance</h2>
        <p>${selection.intro}</p>
      </div>
      <div class="article-product-selection-grid">
        ${selection.products.map(product => `
          <article class="article-product-pick" data-awin-id="${product.awinId}">
            <a href="../${product.file}" aria-label="Découvrir ${product.title}">
              <img src="${product.image}" alt="${product.title}" loading="lazy">
            </a>
            <div class="article-product-pick-copy">
              <h3>${product.title}</h3>
              <p class="article-product-pick-description">${product.description}</p>
              <div class="article-product-pick-bottom">
                <p class="article-product-pick-price">${product.price}</p>
                <a class="article-product-pick-link" href="../${product.file}">
                  Découvrir <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          </article>
        `).join('')}
      </div>
    `;

    main.appendChild(section);

    // Synchronisation silencieuse des prix via le Worker Awin existant.
    const cards = [...section.querySelectorAll('.article-product-pick[data-awin-id]')];
    const ids = [...new Set(cards.map(card => card.dataset.awinId).filter(Boolean))];
    if (!ids.length) return;

    const worker = 'https://awin-sync.lespagesausoleil.workers.dev/';

    const formatPrice = (value, currency = 'EUR') => {
      const number = Number(String(value ?? '').replace(',', '.'));
      if (!Number.isFinite(number)) return null;

      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currency || 'EUR'
      }).format(number);
    };

    fetch(`${worker}?ids=${encodeURIComponent(ids.join(','))}`, { cache: 'no-store' })
      .then(response => {
        if (!response.ok) throw new Error(`Awin HTTP ${response.status}`);
        return response.json();
      })
      .then(data => {
        const freshProducts = data?.products || {};

        cards.forEach(card => {
          const fresh = freshProducts[card.dataset.awinId];
          if (!fresh) return;

          const freshPrice = formatPrice(fresh.price, fresh.currency);
          const priceEl = card.querySelector('.article-product-pick-price');
          if (freshPrice && priceEl) {
            priceEl.textContent = freshPrice;
          }
        });
      })
      .catch(error => {
        console.warn('Prix sélection article Awin :', error);
        // Le prix HTML intégré au script reste affiché comme secours.
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installArticleProductSelection, { once: true });
  } else {
    installArticleProductSelection();
  }
})();


/* =========================================================
   SEO ARTICLES — Les Pages au Soleil
   Canonical + meta + Open Graph + Article + BreadcrumbList
   ========================================================= */
(() => {
  const ARTICLE_SEO = {"cadeaux-lecteurs.html":{"title":"Des idées cadeaux utiles pour les amoureux des livres","description":"Des cadeaux doux et pratiques pour enrichir le rituel de lecture."},"coin-lecture-cocooning.html":{"title":"Comment créer un coin lecture cocooning chez soi","description":"Fauteuil, lumière, plaid et détails : aménagez un refuge confortable, même dans un petit espace."},"decorer-bibliotheque.html":{"title":"Comment décorer une bibliothèque sans la surcharger","description":"Livres, objets et espaces libres : composez une bibliothèque équilibrée."},"fauteuils-lecture.html":{"title":"Quel fauteuil choisir pour un coin lecture ? 4 modèles confortables à découvrir","description":"Soutien du dos, profondeur, accoudoirs et matière : les critères qui comptent vraiment pour choisir un fauteuil de lecture."},"journee-slow-living.html":{"title":"Une journée slow living à la maison, sans programme compliqué","description":"Une journée apaisante construite autour de gestes simples et accessibles."},"lampes-chaleureuses.html":{"title":"Les lampes qui rendent une pièce instantanément chaleureuse","description":"Température, hauteur et emplacement : les principes simples d’une lumière douce."},"plaids-cocooning.html":{"title":"Comment choisir un plaid vraiment cocooning","description":"Matière, poids, taille et entretien : choisir un plaid beau et agréable."},"rituel-dimanche.html":{"title":"Le rituel du dimanche pour commencer la semaine en douceur","description":"Une parenthèse simple avec thé, lecture et rangement léger."},"romans-automne.html":{"title":"15 romans parfaits pour accompagner les soirées d’automne","description":"Une sélection d’ambiances romanesques pour les journées plus fraîches."},"salon-chaleureux-erreurs.html":{"title":"7 erreurs qui empêchent un salon de paraître chaleureux","description":"Lumière, proportions et matières : les erreurs les plus fréquentes."}};

  function setMeta(selector, attributes) {
    let el = document.head.querySelector(selector);
    if (!el) {
      el = document.createElement('meta');
      document.head.appendChild(el);
    }
    Object.entries(attributes).forEach(([key, value]) => el.setAttribute(key, value));
    return el;
  }

  function setCanonical(url) {
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = url;
  }

  function setJsonLd(id, data) {
    document.getElementById(id)?.remove();
    const script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }

  function installArticleSeo() {
    const path = window.location.pathname || '';
    if (!path.includes('/articles/')) return;

    const rawFilename = (path.split('/').pop() || '').replace(/\/$/, '');
    const filename = rawFilename.endsWith('.html') ? rawFilename : `${rawFilename}.html`;
    const data = ARTICLE_SEO[filename];
    if (!data) return;

    const canonical = `https://lespagesausoleil.fr/articles/${filename}`;
    const fullTitle = `${data.title} | Les Pages au Soleil`;

    document.title = fullTitle;
    setCanonical(canonical);

    setMeta('meta[name="description"]', {
      name: 'description',
      content: data.description
    });

    setMeta('meta[property="og:type"]', {
      property: 'og:type',
      content: 'article'
    });
    setMeta('meta[property="og:site_name"]', {
      property: 'og:site_name',
      content: 'Les Pages au Soleil'
    });
    setMeta('meta[property="og:title"]', {
      property: 'og:title',
      content: fullTitle
    });
    setMeta('meta[property="og:description"]', {
      property: 'og:description',
      content: data.description
    });
    setMeta('meta[property="og:url"]', {
      property: 'og:url',
      content: canonical
    });
    setMeta('meta[name="twitter:card"]', {
      name: 'twitter:card',
      content: 'summary_large_image'
    });

    const imageEl =
      document.querySelector('.article-hero img') ||
      document.querySelector('article img') ||
      document.querySelector('main img');

    let imageUrl = '';
    if (imageEl?.src) {
      imageUrl = new URL(imageEl.src, window.location.href).href;
      setMeta('meta[property="og:image"]', {
        property: 'og:image',
        content: imageUrl
      });
      setMeta('meta[property="og:image:alt"]', {
        property: 'og:image:alt',
        content: imageEl.alt || data.title
      });
    }

    const articleSchema = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: data.title,
      description: data.description,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': canonical
      },
      author: {
        '@type': 'Organization',
        name: 'Les Pages au Soleil'
      },
      publisher: {
        '@type': 'Organization',
        name: 'Les Pages au Soleil',
        url: 'https://lespagesausoleil.fr/'
      }
    };
    if (imageUrl) articleSchema.image = [imageUrl];

    setJsonLd('lps-seo-article-schema', articleSchema);

    setJsonLd('lps-seo-breadcrumb-schema', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Accueil',
          item: 'https://lespagesausoleil.fr/'
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Articles',
          item: 'https://lespagesausoleil.fr/articles.html'
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: data.title,
          item: canonical
        }
      ]
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installArticleSeo, { once: true });
  } else {
    installArticleSeo();
  }
})();


/* =========================================================
   MAILLAGE INTERNE ARTICLES — Les Pages au Soleil
   2 lectures liées + lien de rubrique
   ========================================================= */
(() => {
  const ARTICLE_RELATED_LINKS = {"cadeaux-lecteurs.html":{"rubrique":{"label":"Lecture","url":"../rubrique-lecture.html"},"links":[{"title":"15 romans parfaits pour accompagner les soirées d’automne","url":"romans-automne.html"},{"title":"Comment créer un coin lecture cocooning chez soi","url":"coin-lecture-cocooning.html"}]},"coin-lecture-cocooning.html":{"rubrique":{"label":"Coin lecture","url":"../rubrique-coin-lecture.html"},"links":[{"title":"Quel fauteuil choisir pour un coin lecture ?","url":"fauteuils-lecture.html"},{"title":"Les lampes qui rendent une pièce instantanément chaleureuse","url":"lampes-chaleureuses.html"}]},"decorer-bibliotheque.html":{"rubrique":{"label":"Décoration","url":"../rubrique-decoration.html"},"links":[{"title":"7 erreurs qui empêchent un salon de paraître chaleureux","url":"salon-chaleureux-erreurs.html"},{"title":"Les lampes qui rendent une pièce instantanément chaleureuse","url":"lampes-chaleureuses.html"}]},"fauteuils-lecture.html":{"rubrique":{"label":"Coin lecture","url":"../rubrique-coin-lecture.html"},"links":[{"title":"Comment créer un coin lecture cocooning chez soi","url":"coin-lecture-cocooning.html"},{"title":"Les lampes qui rendent une pièce instantanément chaleureuse","url":"lampes-chaleureuses.html"}]},"journee-slow-living.html":{"rubrique":{"label":"Slow living","url":"../rubrique-slow-living.html"},"links":[{"title":"Le rituel du dimanche pour commencer la semaine en douceur","url":"rituel-dimanche.html"},{"title":"Comment choisir un plaid vraiment cocooning","url":"plaids-cocooning.html"}]},"lampes-chaleureuses.html":{"rubrique":{"label":"Décoration","url":"../rubrique-decoration.html"},"links":[{"title":"Comment créer un coin lecture cocooning chez soi","url":"coin-lecture-cocooning.html"},{"title":"7 erreurs qui empêchent un salon de paraître chaleureux","url":"salon-chaleureux-erreurs.html"}]},"plaids-cocooning.html":{"rubrique":{"label":"Décoration","url":"../rubrique-decoration.html"},"links":[{"title":"Le rituel du dimanche pour commencer la semaine en douceur","url":"rituel-dimanche.html"},{"title":"7 erreurs qui empêchent un salon de paraître chaleureux","url":"salon-chaleureux-erreurs.html"}]},"rituel-dimanche.html":{"rubrique":{"label":"Slow living","url":"../rubrique-slow-living.html"},"links":[{"title":"Une journée slow living à la maison, sans programme compliqué","url":"journee-slow-living.html"},{"title":"15 romans parfaits pour accompagner les soirées d’automne","url":"romans-automne.html"}]},"romans-automne.html":{"rubrique":{"label":"Lecture","url":"../rubrique-lecture.html"},"links":[{"title":"Le rituel du dimanche pour commencer la semaine en douceur","url":"rituel-dimanche.html"},{"title":"Des idées cadeaux utiles pour les amoureux des livres","url":"cadeaux-lecteurs.html"}]},"salon-chaleureux-erreurs.html":{"rubrique":{"label":"Décoration","url":"../rubrique-decoration.html"},"links":[{"title":"Comment décorer une bibliothèque sans la surcharger","url":"decorer-bibliotheque.html"},{"title":"Les lampes qui rendent une pièce instantanément chaleureuse","url":"lampes-chaleureuses.html"}]}};

  function installArticleRelatedLinks() {
    const path = window.location.pathname || '';
    if (!path.includes('/articles/')) return;

    const raw = (path.split('/').pop() || '').replace(/\/$/, '');
    const filename = raw.endsWith('.html') ? raw : `${raw}.html`;
    const data = ARTICLE_RELATED_LINKS[filename];
    if (!data) return;

    const main = document.querySelector('main');
    if (!main) return;

    document.getElementById('article-related-reading')?.remove();

    if (!document.getElementById('article-related-reading-style')) {
      const style = document.createElement('style');
      style.id = 'article-related-reading-style';
      style.textContent = `
        .article-related-reading{
          max-width:1040px;
          margin:34px auto 54px;
          padding:30px 0 0;
          border-top:1px solid #eadfd2;
        }
        .article-related-reading-head{
          display:flex;
          justify-content:space-between;
          align-items:end;
          gap:20px;
          margin-bottom:18px;
        }
        .article-related-reading-head h2{
          margin:0;
          font-size:clamp(1.8rem,3vw,2.5rem);
        }
        .article-related-rubrique{
          flex:0 0 auto;
          font-weight:700;
          color:#6f4f39;
        }
        .article-related-rubrique:hover{
          text-decoration:underline;
          text-underline-offset:3px;
        }
        .article-related-reading-grid{
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:16px;
        }
        .article-related-reading-card{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
          min-height:112px;
          padding:20px 22px;
          border:1px solid #eadfd2;
          border-radius:16px;
          background:#fffdf9;
          transition:transform .18s ease, box-shadow .18s ease;
        }
        .article-related-reading-card:hover{
          transform:translateY(-2px);
          box-shadow:0 10px 24px rgba(77,55,36,.08);
        }
        .article-related-reading-card span:first-child{
          font-family:"Playfair Display",serif;
          font-size:1.12rem;
          line-height:1.35;
        }
        .article-related-reading-arrow{
          flex:0 0 auto;
          font-size:1.2rem;
          color:#a76117;
        }
        @media (max-width:760px){
          .article-related-reading{
            margin:28px auto 44px;
          }
          .article-related-reading-head{
            align-items:flex-start;
            flex-direction:column;
            gap:8px;
          }
          .article-related-reading-grid{
            grid-template-columns:1fr;
          }
        }
      `;
      document.head.appendChild(style);
    }

    const section = document.createElement('section');
    section.id = 'article-related-reading';
    section.className = 'article-related-reading';
    section.setAttribute('aria-labelledby', 'article-related-reading-title');

    section.innerHTML = `
      <div class="article-related-reading-head">
        <div>
          <p class="kicker">À lire ensuite</p>
          <h2 id="article-related-reading-title">Dans le même univers</h2>
        </div>
        <a class="article-related-rubrique" href="${data.rubrique.url}">
          Voir la rubrique ${data.rubrique.label} →
        </a>
      </div>
      <div class="article-related-reading-grid">
        ${data.links.map(link => `
          <a class="article-related-reading-card" href="${link.url}">
            <span>${link.title}</span>
            <span class="article-related-reading-arrow" aria-hidden="true">→</span>
          </a>
        `).join('')}
      </div>
    `;

    // On place le maillage après la sélection produits si elle existe,
    // sinon à la fin du contenu principal.
    const productSelection = document.getElementById('article-product-selection');
    if (productSelection) {
      productSelection.insertAdjacentElement('afterend', section);
    } else {
      main.appendChild(section);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installArticleRelatedLinks, { once: true });
  } else {
    installArticleRelatedLinks();
  }
})();
