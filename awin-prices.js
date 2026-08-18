(() => {
  const WORKER_URL = "https://awin-sync.lespagesausoleil.workers.dev/";
  const cache = new Map();

  function formatPrice(value, currency = "EUR") {
    const number = Number(String(value || "").replace(",", "."));
    if (!Number.isFinite(number)) return null;

    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency || "EUR"
    }).format(number);
  }

  async function loadProduct(productId) {
    if (!productId) return null;
    if (cache.has(productId)) return cache.get(productId);

    const promise = fetch(
      `${WORKER_URL}?id=${encodeURIComponent(productId)}`
    )
      .then(response => {
        if (!response.ok) {
          throw new Error(`Awin HTTP ${response.status}`);
        }
        return response.json();
      })
      .then(product => (product && product.ok ? product : null))
      .catch(error => {
        console.error("Synchronisation Awin :", error);
        return null;
      });

    cache.set(productId, promise);
    return promise;
  }

  async function synchroniseElement(root) {
    const productId = root.dataset.awinProductId;
    if (!productId) return;

    const product = await loadProduct(productId);
    if (!product) return;

    const formattedPrice = formatPrice(
      product.price,
      product.currency
    );

    if (formattedPrice) {
      root.querySelectorAll(
        "[data-awin-price], .compact-product-price, .product-detail-price"
      ).forEach(element => {
        element.textContent = formattedPrice;
      });
    }

    if (product.affiliateUrl) {
      root.querySelectorAll(
        "[data-awin-affiliate], .product-affiliate-button"
      ).forEach(link => {
        if (link.tagName === "A") {
          link.href = product.affiliateUrl;
        }
      });
    }

    if (product.image) {
      root.querySelectorAll("[data-awin-image]").forEach(image => {
        if (image.tagName === "IMG") {
          image.src = product.image;
        }
      });
    }
  }

  async function synchroniseAwin() {
    const roots = document.querySelectorAll(
      "[data-awin-product-id]"
    );

    await Promise.all(
      [...roots].map(synchroniseElement)
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      synchroniseAwin
    );
  } else {
    synchroniseAwin();
  }
})();
