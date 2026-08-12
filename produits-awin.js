async function synchroniserPrixBoutique() {
  const cartes = document.querySelectorAll(".shop-card");

  for (const carte of cartes) {
    try {
      const lienFiche = carte.querySelector('a[href^="produit-"]');
      const prixCarte = carte.querySelector(".compact-product-price");

      if (!lienFiche || !prixCarte) continue;

      const response = await fetch(lienFiche.getAttribute("href"));

      if (!response.ok) continue;

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const prixFiche = doc.querySelector(".product-detail-price");

      if (prixFiche && prixFiche.textContent.trim()) {
        prixCarte.textContent = prixFiche.textContent.trim();
      }
    } catch (error) {
      console.error("Erreur synchronisation prix :", error);
    }
  }
}

document.addEventListener("DOMContentLoaded", synchroniserPrixBoutique);
