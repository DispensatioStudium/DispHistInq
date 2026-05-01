document.addEventListener("DOMContentLoaded", () => {

  fetch("../data/disphistinq.csv")
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    })
    .then(csv => {
      const lignes  = csv.trim().split(/\r?\n/);
      const headers = lignes[0].split(";");

      const indexAnnee   = headers.indexOf("annee");
      const indexHeresie = headers.indexOf("heresie");

      if (indexAnnee === -1 || indexHeresie === -1) {
        console.error("Champ 'annee' ou 'heresie' introuvable dans le CSV");
        return;
      }

      const compteParAnnee   = {};
      const compteSansHeresie = {};

      lignes.slice(1).forEach(ligne => {
        const cols   = ligne.split(";");
        const annee  = (cols[indexAnnee]   || '').trim();
        const heresie = (cols[indexHeresie] || '').trim();

        if (!annee.match(/^\d{4}$/)) return;

        compteParAnnee[annee] = (compteParAnnee[annee] || 0) + 1;

        if (heresie === "Non concerné" || heresie === "Non documenté") {
          compteSansHeresie[annee] = (compteSansHeresie[annee] || 0) + 1;
        }
      });

      const annees          = Object.keys(compteParAnnee).sort();
      const valeursTotal    = annees.map(a => compteParAnnee[a]);
      const valeursSansHer  = annees.map(a => compteSansHeresie[a] || 0);

      // Mettre à jour le badge
      const total = valeursTotal.reduce((s, v) => s + v, 0);
      const badge = document.getElementById('badge-label');
      if (badge) badge.textContent = total + ' cas chargés';

      afficherGraphique(annees, valeursTotal, valeursSansHer);
    })
    .catch(err => {
      console.error("Erreur chargement CSV :", err);
      const badge = document.getElementById('badge-label');
      if (badge) { badge.textContent = 'Erreur CSV'; badge.style.color = '#e08060'; }
    });
});

/* ── Rendu Chart.js ──────────────────────────────────────────── */
function afficherGraphique(labels, total, sansHeresie) {
  const ctx = document.getElementById("chartChrono");
  if (!ctx) return;

  // Palette issue du style DispHistInq
  const colorAccent  = "#8b2e12";   // var(--accent)
  const colorGold    = "#c8b88a";   // var(--rule)

  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Nombre total de cas",
          data: total,
          backgroundColor: colorAccent + "cc",
          borderColor: colorAccent,
          borderWidth: 1,
          borderRadius: 2,
        },
        {
          label: "Dont sans rapport avec l'hérésie (ou non documenté)",
          data: sansHeresie,
          backgroundColor: colorGold + "bb",
          borderColor: colorGold,
          borderWidth: 1,
          borderRadius: 2,
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            font: { family: "'IM Fell English', serif", size: 13 },
            color: "#2b1e0e"
          }
        },
        tooltip: {
          titleFont: { family: "'IM Fell English SC', serif" },
          bodyFont:  { family: "'Lato', sans-serif", size: 12 },
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Année",
            font: { family: "'IM Fell English SC', serif", size: 11 },
            color: "#9a8060"
          },
          ticks: {
            font: { family: "'Lato', sans-serif", size: 10 },
            color: "#5a4232",
            maxTicksLimit: 30
          },
          grid: { color: "rgba(200,184,138,.25)" }
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Nombre de cas",
            font: { family: "'IM Fell English SC', serif", size: 11 },
            color: "#9a8060"
          },
          ticks: {
            precision: 0,
            font: { family: "'Lato', sans-serif", size: 10 },
            color: "#5a4232"
          },
          grid: { color: "rgba(200,184,138,.25)" }
        }
      }
    }
  });
}