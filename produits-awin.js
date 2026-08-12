async function chargerProduitsAwin() {
  try {
    const response = await fetch(
      "https://misty-paper-79b5.lespagesausoleil.workers.dev/produits"
    );

    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}`);
    }

    const csv = await response.text();

    console.log(csv);

  } catch (error) {
    console.error("Erreur chargement Awin :", error);
  }
}

chargerProduitsAwin();
