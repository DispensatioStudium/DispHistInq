
/* ════════════════════════════════════════════════════════════════════
   DispHistInq — Carte temporelle avec plage de dates
   ════════════════════════════════════════════════════════════════════ */

const MIN_YEAR = 1600, MAX_YEAR = 1750;

/* ── MAP ─────────────────────────────────────────────────────── */
const map = L.map('map', { zoomControl: false }).setView([46.5, 4.5], 7);
L.control.zoom({ position: 'topright' }).addTo(map);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors', opacity: 0.75
}).addTo(map);

/* ── LÉGENDE ─────────────────────────────────────────────────── */
const legendCtrl = L.control({ position: 'bottomright' });
legendCtrl.onAdd = () => {
  const d = L.DomUtil.create('div', 'map-legend'); d.id = 'map-legend'; return d;
};
legendCtrl.addTo(map);

/* ── ÉTAT GLOBAL ─────────────────────────────────────────────── */
let geojsonData = null;
let casData     = [];
let casesByDio  = {};
let geoLayer    = L.layerGroup().addTo(map);

// Mode de navigation temporelle : 'precise' | 'step5' | 'decade' | 'range'
let tlMode      = 'precise';
let currentYear = MAX_YEAR;   // ouverture sur 1750
let rangeStart  = 1620;
let rangeEnd    = 1680;

let displayMode  = 'cas';
let playing      = false;
let playTimer    = null;
let selectedDio  = null;
let detailFilter = 'all';

/* ── NORMALISATION ───────────────────────────────────────────── */
function normDio(s) {
  if (!s) return '';
  return s.replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase();
}

/* ── PARSING CSV ─────────────────────────────────────────────── */
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(';').map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = line.split(';');
    const obj  = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] ?? '').trim(); });
    return obj;
  });
}

/* ── PALETTES ────────────────────────────────────────────────── */
const CAS_PALETTE = [
  { min: 0,  fill: '#c8e0b8', stroke: '#4a6830' },
  { min: 1,  fill: '#8ab85e', stroke: '#3a5828' },
  { min: 10,  fill: '#5d8a3c', stroke: '#2a4818' },
  { min: 20,  fill: '#3a6622', stroke: '#1a3810' },
  { min: 40, fill: '#1f4a0f', stroke: '#0a2006' },
];
const CAS_PALETTE_DEFAULT = CAS_PALETTE.map(p => ({ ...p }));

function casFill(n) {
  let c = CAS_PALETTE[0];
  for (const p of CAS_PALETTE) { if (n >= p.min) c = p; }
  return c;
}

const provColors = {};
function getProvColor(prov) {
  if (!provColors[prov]) {
    const hash = prov.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const hue  = (hash * 47) % 360;
    provColors[prov] = { stroke: `hsl(${hue},55%,35%)`, fill: `hsl(${hue},50%,65%)` };
  }
  return provColors[prov];
}

/* ── RÉSULTAT → CSS ──────────────────────────────────────────── */
function resultClass(r) {
  if (!r) return 'result-nd';
  const l = r.toLowerCase();
  if (l.includes('accord'))   return 'result-ok';
  if (l.includes('refus'))    return 'result-no';
  if (l.includes('commission') || l.includes('ordinaire')) return 'result-comm';
  return 'result-nd';
}
function resultLabel(r) {
  if (!r || r.toLowerCase().includes('non doc')) return 'Non documenté';
  return r;
}

/* ── HELPERS TEMPORELS ───────────────────────────────────────── */
// Diocèse actif pour un instant
function isActive(feature, year) {
  const s = feature.properties.start, e = feature.properties.end;
  return s != null && e != null && s <= year && year < e;
}
// Diocèse actif sur une plage (overlap)
function isActiveInRange(feature, a, b) {
  const s = feature.properties.start, e = feature.properties.end;
  return s != null && e != null && s <= b && e > a;
}

// Cas cumulatifs jusqu'à currentYear
function casForDio(normName) {
  const cases = casesByDio[normName] || [];
  // En mode 5 ans ou décennie, afficher uniquement les cas dans la fenêtre
  if (tlMode === 'step5' || tlMode === 'decade') {
    const wEnd = windowEnd();
    return cases.filter(c => {
      const y = parseInt(c.annee);
      return !isNaN(y) && y >= currentYear && y < wEnd;
    });
  }
  // Mode précis : afficher tous les cas jusqu'à l'année courante
  return cases.filter(c => {
    const y = parseInt(c.annee);
    return isNaN(y) || y <= currentYear;
  });
}
// Cas dans une plage
function casForDioInRange(normName) {
  return (casesByDio[normName] || []).filter(c => {
    const y = parseInt(c.annee);
    return !isNaN(y) && y >= rangeStart && y <= rangeEnd;
  });
}

// Sélecteur unifié selon le mode
function getCas(normName) {
  return tlMode === 'range' ? casForDioInRange(normName) : casForDio(normName);
}
function getActiveFeatures() {
  if (!geojsonData) return [];
  if (tlMode === 'range')
    return geojsonData.features.filter(f => isActiveInRange(f, rangeStart, rangeEnd));
  return geojsonData.features.filter(f => isActive(f, currentYear));
}

/* ─────────────────────────────────────────────────────────────
   ONGLETS DE MODE
   ───────────────────────────────────────────────────────────── */
document.querySelectorAll('.mode-tab').forEach(tab => {
  tab.onclick = () => {
    tlMode = tab.dataset.mode;
    document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const isRange = tlMode === 'range';
    document.getElementById('single-year-block').style.display = isRange ? 'none'  : 'block';
    document.getElementById('range-block').style.display       = isRange ? 'block' : 'none';

    // Adapter step du slider
    const step = tlMode === 'decade' ? 10 : tlMode === 'step5' ? 5 : 1;
    slider.step = step;
    // Snap currentYear au step
    currentYear = Math.round(currentYear / step) * step;
    currentYear = Math.min(MAX_YEAR, Math.max(MIN_YEAR, currentYear));
    slider.value = currentYear;
    yearDisplay.textContent = currentYear;
    updateSliderTrack();

    // En mode plage : restreindre les options d'affichage à diocèse/province
    updateDisplayModeOptions();

    if (playing) stopPlay();
    updateLegend();
    renderMap();
    if (selectedDio) refreshDetail();
  };
});

function updateDisplayModeOptions() {
  const sel = document.getElementById('display-mode');
  const isRange = tlMode === 'range';
  // Montrer/cacher l'option "couleur unique" en mode plage
  [...sel.options].forEach(opt => {
    if (opt.value === 'diocese') opt.style.display = isRange ? 'none' : '';
  });
  // Si on était sur 'diocese' en mode range, basculer vers 'cas'
  if (isRange && displayMode === 'diocese') {
    displayMode = 'cas';
    sel.value   = 'cas';
  }
}

/* ── HELPERS FENÊTRE ─────────────────────────────────────────── */
function windowSize() {
  return tlMode === 'decade' ? 10 : tlMode === 'step5' ? 5 : 0;
}
function windowEnd() {
  return tlMode === 'step5' || tlMode === 'decade'
    ? Math.min(currentYear + windowSize(), MAX_YEAR)
    : currentYear;
}

/* ── SLIDER UNIQUE ───────────────────────────────────────────── */
const slider      = document.getElementById('year-slider');
const yearDisplay = document.getElementById('year-display');
const yearLabel   = document.getElementById('year-label');

function updateSliderTrack() {
  const total = MAX_YEAR - MIN_YEAR;
  if (tlMode === 'step5' || tlMode === 'decade') {
    // Mettre en surbrillance la fenêtre de N ans
    const winEnd   = windowEnd();
    const startPct = ((currentYear - MIN_YEAR) / total) * 100;
    const endPct   = ((winEnd      - MIN_YEAR) / total) * 100;
    slider.style.background =
      `linear-gradient(to right,var(--rule) ${startPct}%,var(--accent) ${startPct}%,var(--accent) ${endPct}%,var(--rule) ${endPct}%)`;
  } else {
    const pct = ((currentYear - MIN_YEAR) / total) * 100;
    slider.style.background =
      `linear-gradient(to right,var(--accent) ${pct}%,var(--rule) ${pct}%)`;
  }
}

function updateWindowReadout() {
  const isWin = tlMode === 'step5' || tlMode === 'decade';
  const wr    = document.getElementById('window-readout');
  wr.style.display = isWin ? 'block' : 'none';
  if (isWin) {
    const wEnd = windowEnd();
    document.getElementById('win-start-val').textContent = currentYear;
    document.getElementById('win-end-val').textContent   = wEnd;
    document.getElementById('win-dur-badge').textContent =
      tlMode === 'decade' ? '10 ans' : '5 ans';
  }
  yearLabel.textContent = isWin ? 'Début de fenêtre' : 'Année';
  yearDisplay.textContent = currentYear;
}

slider.value = MAX_YEAR;
updateSliderTrack();
updateWindowReadout();

slider.oninput = () => {
  const step = parseInt(slider.step) || 1;
  currentYear = Math.round(Number(slider.value) / step) * step;
  currentYear = Math.min(MAX_YEAR - (windowSize() || 0), Math.max(MIN_YEAR, currentYear));
  slider.value = currentYear;
  updateSliderTrack();
  updateWindowReadout();
  renderMap();
  if (selectedDio) refreshDetail();
};

/* ─────────────────────────────────────────────────────────────
   PLAY / PAUSE
   ───────────────────────────────────────────────────────────── */
const playBtn   = document.getElementById('play-btn');
const playIcon  = document.getElementById('play-icon');
const playLabel = document.getElementById('play-label');
const speedSel  = document.getElementById('speed-select');
const PAUSE_SVG = `<rect x="0" y="0" width="4" height="10"/><rect x="6" y="0" width="4" height="10"/>`;
const PLAY_SVG  = `<polygon points="0,0 10,5 0,10"/>`;

function stopPlay() {
  playing = false;
  clearTimeout(playTimer);
  playIcon.innerHTML = PLAY_SVG;
  playLabel.textContent = 'Animer';
}

playBtn.onclick = () => {
  playing = !playing;
  if (playing) {
    playIcon.innerHTML = PAUSE_SVG; playLabel.textContent = 'Pause'; tick();
  } else { stopPlay(); }
};

function tick() {
  if (!playing) return;
  const step   = parseInt(slider.step) || 1;
  const maxVal = MAX_YEAR - (windowSize() || 0);
  currentYear  = currentYear >= maxVal ? MIN_YEAR : currentYear + step;
  slider.value = currentYear;
  updateSliderTrack();
  updateWindowReadout();
  renderMap();
  if (selectedDio) refreshDetail();
  playTimer = setTimeout(tick, Number(speedSel.value));
}

/* ─────────────────────────────────────────────────────────────
   DOUBLE SLIDER (plage)
   ───────────────────────────────────────────────────────────── */
const rsStart   = document.getElementById('range-start-slider');
const rsEnd     = document.getElementById('range-end-slider');
const rsdStart  = document.getElementById('range-start-display');
const rsdEnd    = document.getElementById('range-end-display');
const durLabel  = document.getElementById('range-dur-label');
const dualFill  = document.getElementById('dual-fill');

function updateDualFill() {
  const totalW   = MAX_YEAR - MIN_YEAR;
  const leftPct  = ((rangeStart - MIN_YEAR) / totalW) * 100;
  const rightPct = ((rangeEnd   - MIN_YEAR) / totalW) * 100;
  dualFill.style.left  = leftPct  + '%';
  dualFill.style.width = (rightPct - leftPct) + '%';
}

function updateRangeDisplay() {
  rsdStart.textContent = rangeStart;
  rsdEnd.textContent   = rangeEnd;
  const dur = rangeEnd - rangeStart;
  durLabel.textContent = dur === 0
    ? `1 an · tous les cas`
    : `${dur + 1} ans · tous les cas`;
  updateDualFill();
}

rsStart.addEventListener('input', () => {
  rangeStart = Math.min(Number(rsStart.value), rangeEnd - 1);
  rsStart.value = rangeStart;
  updateRangeDisplay();
  renderMap();
  if (selectedDio) refreshDetail();
});

rsEnd.addEventListener('input', () => {
  rangeEnd = Math.max(Number(rsEnd.value), rangeStart + 1);
  rsEnd.value = rangeEnd;
  updateRangeDisplay();
  renderMap();
  if (selectedDio) refreshDetail();
});

// Gestion du z-index des pouces selon la proximité
function updateThumbZ() {
  const totalW = MAX_YEAR - MIN_YEAR;
  const sp = (rangeStart - MIN_YEAR) / totalW;
  const ep = (rangeEnd   - MIN_YEAR) / totalW;
  // Si les deux très proches, mettre end au dessus
  if (ep - sp < 0.05) {
    rsEnd.style.zIndex = '3'; rsStart.style.zIndex = '2';
  } else {
    rsStart.style.zIndex = '2'; rsEnd.style.zIndex = '2';
  }
}

rsStart.addEventListener('input', updateThumbZ);
rsEnd.addEventListener('input', updateThumbZ);

updateRangeDisplay();
updateThumbZ();

/* ─────────────────────────────────────────────────────────────
   MODE COULEUR
   ───────────────────────────────────────────────────────────── */
document.getElementById('display-mode').addEventListener('change', e => {
  displayMode = e.target.value;
  updateLegend();
  renderMap();
});

/* ─────────────────────────────────────────────────────────────
   LÉGENDE
   ───────────────────────────────────────────────────────────── */
function updateLegend() {
  const el = document.getElementById('map-legend');
  if (!el) return;

  // ── Bloquer la propagation des clics vers la carte ──────────
  L.DomEvent.disableClickPropagation(el);
  L.DomEvent.disableScrollPropagation(el);

  const isRange = tlMode === 'range';

  if (displayMode === 'cas') {
    const title = isRange ? 'Cas (plage)' : 'Cas (cumulatifs)';
    el.innerHTML = `<h4>${title}</h4>`;

    CAS_PALETTE.forEach((p, i) => {
      const next = CAS_PALETTE[i + 1];

      const row = document.createElement('div');
      row.className = 'l-row';

      const swatch = document.createElement('div');
      swatch.className = 'l-swatch';
      swatch.style.cssText = `background:${p.fill};border-color:${p.stroke}`;
      row.appendChild(swatch);

      if (i === 0) {
        // Ligne fixe "Aucun cas"
        const span = document.createElement('span');
        span.className   = 'l-label-fixed';
        span.textContent = 'Aucun cas';
        row.appendChild(span);
      } else {
        // Ligne éditable : "≥ [input]"
        const prefix = document.createElement('span');
        prefix.className   = 'l-thresh-prefix';
        prefix.textContent = '≥';

        const input = document.createElement('input');
        input.type      = 'number';
        input.value     = p.min;
        input.min       = 1;
        input.className = 'l-thresh-input';
        input.title     = 'Modifier le seuil';

        // Empêcher scroll/clic de remonter à Leaflet
        L.DomEvent.disableClickPropagation(input);
        L.DomEvent.disableScrollPropagation(input);

        input.addEventListener('change', () => {
          let val = parseInt(input.value);
          if (isNaN(val) || val < 1) val = 1;
          if (val <= CAS_PALETTE[i - 1].min) val = CAS_PALETTE[i - 1].min + 1;
          if (next && val >= next.min)        val = next.min - 1;
          input.value        = val;
          CAS_PALETTE[i].min = val;
          updateLegend();
          renderMap();
        });

        row.appendChild(prefix);
        row.appendChild(input);
      }

      el.appendChild(row);
    });

    // Reset
    const reset = document.createElement('div');
    reset.className   = 'l-reset';
    reset.textContent = '↺ réinitialiser';
    reset.onclick = (e) => {
      L.DomEvent.stop(e);
      // Restaurer chaque valeur min sans remplacer le tableau
      CAS_PALETTE_DEFAULT.forEach((def, i) => { CAS_PALETTE[i].min = def.min; });
      updateLegend();
      renderMap();
    };
    el.appendChild(reset);
  } else if (displayMode === 'province') {
    const provs = [...new Set(
      geojsonData ? geojsonData.features.map(f => f.properties.province).filter(Boolean) : []
    )].sort();
    el.innerHTML = '<h4>Provinces</h4>' +
      provs.map(p => {
        const c = getProvColor(p);
        return `<div class="l-row"><div class="l-swatch" style="background:${c.fill}"></div>${p}</div>`;
      }).join('');
  } else {
    el.innerHTML = `<h4>Légende</h4>
      <div class="l-row"><div class="l-swatch" style="background:#8ab85e"></div>Diocèse actif</div>`;
  }
}

/* ─────────────────────────────────────────────────────────────
   RENDU CARTE
   ───────────────────────────────────────────────────────────── */
function renderMap() {
  geoLayer.clearLayers();
  const active = getActiveFeatures();

  L.geoJSON({ type: 'FeatureCollection', features: active }, {
    style: feature => {
      const norm = normDio(feature.properties.diocese || '');
      if (displayMode === 'cas') {
        const c = casFill(getCas(norm).length);
        return { color: c.stroke, weight: 1.4, fillColor: c.fill, fillOpacity: 0.65 };
      }
      if (displayMode === 'province') {
        const c = getProvColor(feature.properties.province || '?');
        return { color: c.stroke, weight: 1.3, fillColor: c.fill, fillOpacity: 0.58 };
      }
      return { color: '#3a2810', weight: 1.5, fillColor: '#8ab85e', fillOpacity: 0.58 };
    },
    onEachFeature: (feature, layer) => {
      const dio  = feature.properties.diocese  || '—';
      const prov = feature.properties.province || '—';
      const norm = normDio(dio);
      const cas  = getCas(norm);

      let casInfoHtml = '';
      if (cas.length > 0) {
        const years = cas.map(c => parseInt(c.annee)).filter(y => !isNaN(y)).sort((a, b) => a - b);
        casInfoHtml = `<div class="popup-separator"></div>` + `<div class="popup-cas-count">Nombre de cas trouvé${cas.length > 1 ? 's' : ''} : ${cas.length}</div>`;
        if (years.length > 0) {
          if (years.length === 1) {
            casInfoHtml += `<div class="popup-cas-dates">Date du cas ${years[0]}</div>`;
          } else {
            casInfoHtml += `<div class="popup-cas-dates">
              <span>Premier cas : ${years[0]}</span>
              <span class="date-arrow">· <br> </span>
              <span>Dernier : ${years[years.length - 1]}</span>
            </div>`;
          }
        }
      }

      const detailBtn = cas.length > 0
        ? `<button class="popup-open-detail" onclick="openDetail('${dio.replace(/'/g,"\\'")}')">Voir les cas →</button>` : '';

      layer.bindPopup(`
        <strong>${dio}</strong>
        <div class="popup-sub">Province de ${prov}</div>
        ${casInfoHtml}${detailBtn}`);
      // ── FIN MODIFICATION 1 ─────────────────────────────────────

      const restoreStyle = () => {
        const n = getCas(normDio(feature.properties.diocese || '')).length;
        if (displayMode === 'cas')      { const c = casFill(n); layer.setStyle({ fillOpacity: 0.65, weight: 1.4, color: c.stroke }); }
        else if (displayMode === 'province') layer.setStyle({ fillOpacity: 0.58, weight: 1.3 });
        else                                 layer.setStyle({ fillOpacity: 0.58, weight: 1.5 });
      };
      layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.88, weight: 2.2 }));
      layer.on('mouseout',  restoreStyle);
    }
  }).addTo(geoLayer);

  renderDioceseList(active);
}

/* ─────────────────────────────────────────────────────────────
   LISTE SIDEBAR
   ───────────────────────────────────────────────────────────── */
function renderDioceseList(active) {
  // ── Dédupliquer par nom de diocèse ──────────────────────────────
  const dioMap = new Map();
  active.forEach(f => {
    const dio  = f.properties.diocese  || '—';
    const prov = f.properties.province || '—';
    if (!dioMap.has(dio)) dioMap.set(dio, { dio, prov, feature: f });
  });
  const unique = [...dioMap.values()];

  const nb = unique.length;
  document.getElementById('count-label').textContent = `Diocèses actifs — ${nb}`;

  let totalCas = 0;
  unique.forEach(({ dio }) => { totalCas += getCas(normDio(dio)).length; });
  document.getElementById('total-cas-label').textContent = totalCas > 0 ? `${totalCas} cas` : '';

  const list = document.getElementById('diocese-list');
  list.innerHTML = '';

  if (unique.length === 0) {
    list.innerHTML = '<p style="font-size:.8rem;color:var(--ink-faint);padding:10px 6px;font-style:italic">Aucun diocèse actif à cette date.</p>';
    return;
  }

  const sorted = [...unique].sort((a, b) => {
    const ca = getCas(normDio(a.dio)).length;
    const cb = getCas(normDio(b.dio)).length;
    return cb - ca || a.dio.localeCompare(b.dio);
  });

  sorted.forEach(({ dio, prov }) => {
    const n = getCas(normDio(dio)).length;

    let swatch;
    if (displayMode === 'province') swatch = getProvColor(prov).fill;
    else if (displayMode === 'cas') swatch = casFill(n).fill;
    else                            swatch = '#8ab85e';

    const row = document.createElement('div');
    row.className = 'diocese-row' + (selectedDio === dio ? ' highlighted' : '');
    row.innerHTML = `
      <div class="d-swatch" style="background:${swatch}"></div>
      <div class="d-name">${dio}</div>
      <div class="d-prov">${prov}</div>
      <div class="d-cas-badge ${n > 0 ? 'show' : ''}">${n}</div>`;

    row.onclick = () => {
      geoLayer.eachLayer(layer => {
        if (layer.feature && layer.feature.properties.diocese === dio) {
          map.fitBounds(layer.getBounds(), { maxZoom: 10, padding: [40, 40] });
          layer.openPopup();
        }
      });
      if (n > 0) openDetail(dio);
      else {
        document.querySelectorAll('.diocese-row').forEach(r => r.classList.remove('highlighted'));
        row.classList.add('highlighted');
      }
    };
    list.appendChild(row);
  });
}

/* ─────────────────────────────────────────────────────────────
   PANNEAU DE DÉTAIL
   ───────────────────────────────────────────────────────────── */
function openDetail(dioRaw) {
  selectedDio  = dioRaw;
  detailFilter = 'all';
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.toggle('active', p.dataset.filter === 'all'));
  document.getElementById('list-view').style.display = 'none';
  document.getElementById('detail-panel').classList.add('open');
  refreshDetail();
}

function refreshDetail() {
  if (!selectedDio) return;
  const tous = getCas(normDio(selectedDio));
  document.getElementById('detail-diocese-name').textContent = selectedDio;

  const ctxLabel = tlMode === 'range'
    ? `${rangeStart} – ${rangeEnd}`
    : `jusqu'en ${currentYear}`;
  document.getElementById('detail-meta').textContent =
    `${tous.length} cas · ${ctxLabel}`;
  renderCases(tous);
}

function closeDetail() {
  selectedDio = null;
  document.getElementById('detail-panel').classList.remove('open');
  document.getElementById('list-view').style.display = 'flex';
  document.querySelectorAll('.diocese-row').forEach(r => r.classList.remove('highlighted'));
}

document.getElementById('detail-back').onclick = closeDetail;

document.querySelectorAll('.filter-pill').forEach(pill => {
  pill.onclick = () => {
    detailFilter = pill.dataset.filter;
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    if (selectedDio) refreshDetail();
  };
});

function applyFilter(cases) {
  switch (detailFilter) {
    case 'ok':      return cases.filter(c => resultClass(c.resultat_dispense) === 'result-ok');
    case 'no':      return cases.filter(c => resultClass(c.resultat_dispense) === 'result-no');
    case 'heresie': return cases.filter(c => c.heresie && c.heresie !== 'Non concerné' && c.heresie.trim() !== '');
    default:        return cases;
  }
}

/* ── POPUP MODAL — helpers ───────────────────────────────────── */
function popupRow(label, val, opts) {
  opts = opts || {};
  val = (val || '').trim();
  if (!val) return '';
  if (!opts.keepND && val.toLowerCase() === 'non documenté') return '';
  if (!opts.keepNC && val === 'Non concerné') return '';
  return '<tr><th>' + escHtml(label) + '</th><td>' + escHtml(val) + '</td></tr>';
}

function buildPopupHtml(cas) {
  // Acteurs
  var actors = [];
  for (var i = 1; i <= 11; i++) {
    var av = (cas['nom_acteur_' + i + '_statut'] || '').trim();
    if (av) actors.push(av);
  }
  var actorRow = actors.length
    ? '<tr><th>Acteurs (' + actors.length + ')</th><td>' +
      actors.map(function(a, i) { return '<span class="pop-actor">' + (i+1) + '. ' + escHtml(a) + '</span>'; }).join('') +
      '</td></tr>' : '';

  // Documents
  var docs = [];
  for (var j = 1; j <= 7; j++) {
    var dv = (cas['Nature_doc_' + j] || '').trim();
    if (dv) docs.push(dv);
  }
  var docRow = docs.length
    ? '<tr><th>Nature des documents</th><td>' +
      docs.map(function(d, i) { return '<span class="pop-actor">' + (i+1) + '. ' + escHtml(d) + '</span>'; }).join('') +
      '</td></tr>' : '';

  function sec(title, rows) {
    var inner = rows.filter(Boolean).join('');
    if (!inner) return '';
    return '<section class="pop-section"><h3>' + title + '</h3><table class="pop-table">' + inner + '</table></section>';
  }

  return [
    sec('Identité', [
      popupRow('N° de cas',         cas['cas.id']),
      popupRow('Requérant·e',            cas['nom_requerant.e']),
      popupRow('Identité ecclésiastique',cas['identite_eccl']),
      popupRow('Genre',                  cas['genre']),
      popupRow('Ordre religieux',        cas['ordre_religieux']),
      popupRow('Pays',                   cas['pays']),
    ]),
    sec('Localisation', [
      popupRow('Diocèse (latin)',  cas['diocese_origine_lat_2']),
      popupRow('Diocèse (fr.)',    cas['diocese_origine_fr_2']),
    ]),
    sec('Temporalité', [
      popupRow('Année',             cas['annee']),
      popupRow('Durée cause (mois)',cas['durée_cause_mois']),
    ]),
    sec('Dispense', [
      popupRow('Type de dispense',  cas['type_de_dispense_harmonise']),
      popupRow('Résultat',          cas['resultat_dispense']),
      popupRow('Cause de la demande',cas['cause_de_demande']),
      popupRow('Justification SO',  cas['justification_demande_SO']),
    ]),
    sec('Contexte', [
      popupRow('Hérésie',            cas['heresie']),
      popupRow('Liens congrégations',cas['Liens_autres_congregations']),
      popupRow('Demandes multiples', cas['demandes_multiples']),
    ]),
    sec('Acteurs', [
      popupRow("Nombre d'acteurs",  cas['nombre_acteurs_ext']),
      actorRow,
    ]),
    sec('Documents', [
      popupRow('Nb de pièces',       cas['documents_annexes']),
      docRow,
    ]),
    sec('Source', [
      popupRow('Source', cas['source'], { keepND: true }),
      popupRow('Folio',  cas['folio'],  { keepND: true }),
    ]),
  ].filter(Boolean).join('');
}

function openCasePopup(cas) {
  var overlay = document.getElementById('case-popup-overlay');
  var title   = document.getElementById('case-popup-title');
  var body    = document.getElementById('case-popup-body');
  var rc      = resultClass(cas.resultat_dispense);
  title.innerHTML =
    '<span class="pop-name">' + escHtml(cas['nom_requerant.e'] || '—') + '</span>' +
    '<span class="pop-year">' + (cas.annee || '?') + '</span>' +
    '<span class="c-tag ' + rc + '" style="margin-left:8px">' + escHtml(resultLabel(cas.resultat_dispense)) + '</span>';
  body.innerHTML = buildPopupHtml(cas);
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCasePopup() {
  document.getElementById('case-popup-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* ── RENDER CASES ────────────────────────────────────────────── */
function renderCases(tous) {
  var filtered = applyFilter(tous).sort(function(a, b) { return (parseInt(a.annee)||0) - (parseInt(b.annee)||0); });
  var container = document.getElementById('detail-cases');
  container.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = '<p style="font-size:.8rem;color:var(--ink-faint);padding:10px 6px;font-style:italic">Aucun cas pour ce filtre.</p>';
    return;
  }

  filtered.forEach(function(cas) {
    var rc    = resultClass(cas.resultat_dispense);
    var nom   = cas['nom_requerant.e'] || '—';
    var annee = cas.annee || '?';
    var type  = cas.type_de_dispense_harmonise || '';
    var res   = resultLabel(cas.resultat_dispense);
    var her   = cas.heresie || '';

    var herTag = (her && her !== 'Non concerné' && her.trim() !== '')
      ? '<span class="c-tag heresie">' + escHtml(her) + '</span>' : '';

    var cause      = (cas.cause_de_demande || '').trim();
    var SHORT_LEN  = 160;
    var isTrunc    = cause.length > SHORT_LEN;
    var causeShort = isTrunc ? cause.slice(0, SHORT_LEN) + '…' : cause;
    var causeHtml  = cause
      ? '<div class="c-cause">' +
          '<span class="c-cause-text">' + escHtml(causeShort) + '</span>' +
          (isTrunc ? '<br><span class="c-cause-toggle">Lire la suite</span>' : '') +
        '</div>' : '';

    var card = document.createElement('div');
    card.className = 'case-card ' + rc;
    card.innerHTML =
      '<div class="c-head">' +
        '<div class="c-name">' + escHtml(nom) + '</div>' +
        '<div class="c-year">' + annee + '</div>' +
      '</div>' +
      (type ? '<div class="c-type">' + escHtml(type) + '</div>' : '') +
      '<div class="c-tags">' +
        '<span class="c-tag ' + rc + '">' + escHtml(res) + '</span>' +
        herTag +
      '</div>' +
      causeHtml +
      '<button class="c-more-btn">En savoir plus ›</button>';

    if (isTrunc) {
      var open   = false;
      var toggle = card.querySelector('.c-cause-toggle');
      var textEl = card.querySelector('.c-cause-text');
      toggle.onclick = function(e) {
        e.stopPropagation();
        open = !open;
        textEl.textContent = open ? cause : causeShort;
        toggle.textContent = open ? 'Réduire' : 'Lire la suite';
      };
    }

    card.querySelector('.c-more-btn').onclick = function() { openCasePopup(cas); };
    container.appendChild(card);
  });
}

/* ─────────────────────────────────────────────────────────────
   PANNEAU CAS NON LOCALISÉS — MODIFICATION 2 : groupes par lieu
   ───────────────────────────────────────────────────────────── */
function renderUnlocatedPanel() {
  const cases  = casesByDio['_pays'] || [];
  const panel  = document.getElementById('unloc-panel');
  const badge  = document.getElementById('unloc-count');
  const list   = document.getElementById('unloc-list');

  badge.textContent = cases.length;

  if (cases.length === 0) {
    panel.style.display = 'none';
    return;
  }
  panel.style.display = '';
  list.innerHTML = '';

  // ── Grouper par localisation ────────────────────────────────
  const groups = {};
  cases.forEach(cas => {
    const locFr  = (cas.diocese_origine_fr_2 || '').trim();
    const locLat = (cas.diocese_origine_lat_2 || '').trim();
    const pays   = (cas.pays || '').trim();
    // Clé de groupe : on préfère le diocèse français, sinon latin, sinon pays
    const key = locFr || locLat || pays || '—';
    if (!groups[key]) groups[key] = [];
    groups[key].push(cas);
  });

  // Trier les groupes : d'abord par nombre de cas décroissant, puis alphabétique
  const sortedGroups = Object.entries(groups)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

  sortedGroups.forEach(([loc, groupCases], groupIdx) => {
    // Trier les cas dans le groupe par année croissante
    const sorted = [...groupCases].sort((a, b) => {
      const ya = parseInt(a.annee) || 9999;
      const yb = parseInt(b.annee) || 9999;
      return ya - yb;
    });

    const groupDiv = document.createElement('div');
    groupDiv.className = 'unloc-group';

    // ── En-tête du groupe (cliquable) ───────────────────────────
    const header = document.createElement('div');
    header.className = 'unloc-group-header';
    header.innerHTML =
      `<span class="unloc-group-loc">${escHtml(loc)}</span>` +
      `<span class="unloc-group-count">${groupCases.length}</span>` +
      `<span class="unloc-chevron-small">▾</span>`;

    // ── Corps du groupe ─────────────────────────────────────────
    const body = document.createElement('div');
    // Premier groupe ouvert par défaut, les autres fermés
    body.className = 'unloc-group-body' + (groupIdx === 0 ? ' open' : '');
    if (groupIdx !== 0) header.querySelector('.unloc-chevron-small').textContent = '▸';

    sorted.forEach(cas => {
      const nom   = cas['nom_requerant.e'] || '—';
      const annee = cas.annee || '?';

      const row = document.createElement('div');
      row.className = 'unloc-row';
      row.title = `Cliquer pour voir le détail`;
      row.innerHTML =
        '<span class="unloc-nom">'  + escHtml(nom)   + '</span>' +
        '<span class="unloc-year">' + escHtml(annee) + '</span>';
      row.onclick = () => openCasePopup(cas);
      body.appendChild(row);
    });

    // ── Toggle au clic sur l'en-tête ────────────────────────────
    header.onclick = () => {
      const isOpen = body.classList.toggle('open');
      header.querySelector('.unloc-chevron-small').textContent = isOpen ? '▾' : '▸';
    };

    groupDiv.appendChild(header);
    groupDiv.appendChild(body);
    list.appendChild(groupDiv);
  });
}
/* ── FIN MODIFICATION 2 ───────────────────────────────────────── */

function toggleUnlocPanel() {
  document.getElementById('unloc-panel').classList.toggle('open');
}

/* ── UTILS ───────────────────────────────────────────────────── */
function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
window.openDetail = openDetail;

/* ── ALIAS DE DIOCÈSES ───────────────────────────────────────── */
const DIO_ALIASES = {
  'hollandia':    'ultraiecten',
  'harlemen':     'ultraiecten',   // Harlemen(sis)
  'trajecten':    'ultraiecten',   // Trajecten(sis)
  'middelburgen': 'ultraiecten',
  'groningen':    'ultraiecten',
  'daventrien':   'ultraiecten',   // Daventrien(sis)
  'leowarden':    'ultraiecten',   // Leowarden(sis)
};

/* ─────────────────────────────────────────────────────────────
   CHARGEMENT
   ───────────────────────────────────────────────────────────── */
async function loadData() {
  const geoRes = await fetch('../data/carte_lat.geojson');
  if (!geoRes.ok) throw new Error(`carte_lat.geojson introuvable (HTTP ${geoRes.status})`);
  geojsonData = await geoRes.json();

  try {
    const csvRes = await fetch('../data/disphistinq.csv');
    if (!csvRes.ok) throw new Error('HTTP ' + csvRes.status);
    casData = parseCSV(await csvRes.text());

    // Ensemble des noms de diocèses présents dans le GeoJSON
    const knownDios = new Set(
      geojsonData.features.map(f => normDio(f.properties.diocese || ''))
    );
    knownDios.delete('');

    casesByDio = {};
    casData.forEach(row => {
      const rawDios = (row.diocese_origine_lat_2 || '').split(',');
      let matched = false;
      rawDios.forEach(rawDio => {
        let key = normDio(rawDio);
        if (!key) return;
        // Résoudre l'alias s'il existe
        if (DIO_ALIASES[key]) key = DIO_ALIASES[key];
        if (knownDios.has(key)) {
          if (!casesByDio[key]) casesByDio[key] = [];
          casesByDio[key].push(row);
          matched = true;
        }
      });
      // Aucun diocèse reconnu → panneau non-localisés
      if (!matched) {
        if (!casesByDio['_pays']) casesByDio['_pays'] = [];
        casesByDio['_pays'].push(row);
      }
    });

    renderUnlocatedPanel();

    document.getElementById('csv-status').className = 'ok';
    document.getElementById('csv-label').textContent = `${casData.length} cas chargés`;
  } catch (e) {
    document.getElementById('csv-status').className = 'err';
    document.getElementById('csv-label').textContent = 'cas.csv introuvable';
    console.warn('CSV non chargé :', e.message);
  }

  updateLegend();
  renderMap();

  try { map.fitBounds(L.geoJSON(geojsonData).getBounds(), { padding: [20, 20] }); }
  catch (_) { }
}

loadData()
  .then(() => { document.getElementById('loading-overlay').style.display = 'none'; })
  .catch(err => {
    console.error(err);
    document.getElementById('loading-overlay').style.display = 'none';
    const errEl = document.getElementById('error-msg');
    errEl.style.display = 'block';
    errEl.textContent = `Erreur : ${err.message}`;
  });
