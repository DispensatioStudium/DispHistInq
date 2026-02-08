document.addEventListener("DOMContentLoaded", () => {
  fetch("../data/data.csv")
    .then(response => response.text())
    .then(csv => {
      const lignes = csv.trim().split("\n");
      const headers = lignes[0].split(";");

      const indexAnnee = headers.indexOf("annee");
      const indexHeresie = headers.indexOf("heresie");

      if (indexAnnee === -1 || indexHeresie === -1) {
        console.error("Champ 'annee' ou 'heresie' introuvable");
        return;
      }

      const compteParAnnee = {};
      const compteSansHeresie = {};

      lignes.slice(1).forEach(ligne => {
        const cols = ligne.split(";");
        const annee = cols[indexAnnee];
        const heresie = cols[indexHeresie]?.trim();

        if (annee && annee.match(/^\d{4}$/)) {
          // Total cas par année
          compteParAnnee[annee] = (compteParAnnee[annee] || 0) + 1;

          // Cas "Non concerné" ou "Non documenté"
          if (heresie === "Non concerné" || heresie === "Non documenté") {
            compteSansHeresie[annee] = (compteSansHeresie[annee] || 0) + 1;
          }
        }
      });

      const annees = Object.keys(compteParAnnee).sort();
      const valeursTotal = annees.map(a => compteParAnnee[a]);
      const valeursSansHeresie = annees.map(a => compteSansHeresie[a] || 0);

      afficherGraphique(annees, valeursTotal, valeursSansHeresie);
    });
});

function afficherGraphique(labels, total, sansHeresie) {
  const ctx = document.getElementById("chartChrono").getContext("2d");

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Nombre de cas",
          data: total,
          backgroundColor: "#6b2737"
        },
        {
          label: "Dont sans rapport avec l'hérésie, ou lien non documenté",
          data: sansHeresie,
          backgroundColor: "#c9a961"
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          title: {
            display: true,
            text: "Année"
          },
          stacked: false
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Nombre de cas"
          },
          ticks: {
            precision: 0
          },
          stacked: false
        }
      }
    }
  });
}