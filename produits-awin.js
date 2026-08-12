async function synchroniserPrixBoutique() {
  try {
    const response = await fetch(
      "https://misty-paper-79b5.lespagesausoleil.workers.dev/produits"
    );

    if (!response.ok) return;

    const csv = await response.text();
    const lignes = csv.trim().split(/\r?\n/);
    const entetes = lignes.shift().split(",");

    const indexLien = entetes.indexOf("aw_deep_link");
    const indexPrix = entetes.indexOf("search_price");
    const indexAncienPrix = entetes.indexOf("rrp_price");

    const produits = lignes.map(ligne => {
      const colonnes = ligne.split(",");

      return {
        lien: colonnes[indexLien] || "",
        prix: colonnes[indexPrix] || "",
        ancienPrix: indexAncienPrix >= 0 ? colonnes[indexAncienPrix] || "" : ""
      };
    });

    document.querySelectorAll(".shop-card").forEach(carte => {
      const lienFiche = carte.querySelector('a[href^="produit-"]');
      const prixCarte = carte.querySelector(".compact-product-price");

      if (!lienFiche || !prixCarte) return;

      const nomFichier = lienFiche.getAttribute("href")
        .replace("produit-", "")
        .replace(".html", "")
        .replace(/-/g, " ")
        .toLowerCase();

      const produit = produits.find(p =>
        decodeURIComponent(p.lien).toLowerCase().includes(
          nomFichier.replace(/\s+/g, "-")
        )
      );

      if (!produit || !produit.prix) return;

      const prixActuel = produit.prix.replace(".", ",") + " €";

      if (
        produit.ancienPrix &&
        produit.ancienPrix !== "0" &&
        produit.ancienPrix !== produit.prix
      ) {
        const ancienPrix = produit.ancienPrix.replace(".", ",") + " €";

        prixCarte.innerHTML =
          `<span>${prixActuel}</span> <del>${ancienPrix}</del>`;
      } else {
        prixCarte.textContent = prixActuel;
      }
    });

  } catch (error) {
    console.error("Erreur synchronisation Awin :", error);
  }
}

document.addEventListener("DOMContentLoaded", synchroniserPrixBoutique);
