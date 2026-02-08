document.addEventListener("DOMContentLoaded", () => {
  loadStats();
});

async function loadStats() {
  try {
    const response = await fetch("data/data.csv");
    if (!response.ok) {
      throw new Error("Impossible de charger le fichier CSV");
    }

    const text = await response.text();
    const rows = parseCSV(text);

    if (rows.length === 0) return;

    // === STAT 1 : nombre total de cas ===
    const totalCases = rows.length;

    // === STAT 2 : diocèses distincts ===
    const dioceses = new Set(
      rows
        .map(row => row.diocese_origine_fr?.trim())
        .filter(val => val && val !== "Non documenté")
    );

    // === STAT 3 : période (exclut 169?, etc.) ===
    const years = rows
      .map(row => row.annee.trim())
      .filter(y => /^\d{4}$/.test(y))   // garde uniquement les années propres
      .map(y => parseInt(y, 10));

    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    // === Injection dans le DOM ===
    document.getElementById("total-cases").textContent = totalCases;
    document.getElementById("total-dioceses").textContent = dioceses.size;
    document.getElementById("total-years").textContent =
      years.length ? `${minYear}–${maxYear}` : "—";

  } catch (error) {
    console.error("Erreur lors du chargement des statistiques :", error);
  }
}

function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(";").map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = line.split(";");
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index]?.trim() || "";
    });
    return obj;
  });
}