let modalMap = null;
let modalMarkers = [];
let coordIndex = {};

// =====================
// DICTIONNAIRE D'EN-TÊTES
// =====================
const headerLabels = {
    'cas.id': 'ID',
    'source': 'Source',
    'folio': 'Folio',
    'nom_requerant.e': 'Requérant·e',
    'identite_eccl': 'Identité ecclésiastique',
    'genre': 'Genre',
    'ordre_religieux': 'Ordre religieux',
    'diocese_origine_2': 'Diocèse d\'origine',
    'diocese_origine_fr_2': 'Diocèse d\'origine (FR)',
    'diocese_origine_lat_2': 'Diocèse d\'origine (Lat)',
    'pays': 'Pays',
    'annee': 'Année',
    'durée_cause_mois': 'Durée (mois)',
    'type_de_dispense_harmonise': 'Type de dispense',
    'resultat_dispense': 'Résultat',
    'cause_de_demande': 'Cause de la demande',
    'justification_demande_SO': 'Justification de la demande au Saint-Office',
    'Liens_autres_congregations': 'Liens autres congrégations',
    'heresie': 'Hérésie',
    'nombre_acteurs_ext': 'Nb acteurs',
    'nom_acteur_1_statut': 'Acteur 1 - Statut',
    'nom_acteur_2_statut': 'Acteur 2 - Statut',
    'nom_acteur_3_statut': 'Acteur 3 - Statut',
    'nom_acteur_4_statut': 'Acteur 4 - Statut',
    'nom_acteur_5_statut': 'Acteur 5 - Statut',
    'nom_acteur_6_statut': 'Acteur 6 - Statut',
    'nom_acteur_7_statut': 'Acteur 7 - Statut',
    'nom_acteur_8_statut': 'Acteur 8 - Statut',
    'nom_acteur_9_statut': 'Acteur 9 - Statut',
    'nom_acteur_10_statut': 'Acteur 10 - Statut',
    'nom_acteur_11_statut': 'Acteur 11 - Statut',
    'documents_annexes': 'Documents annexes',
    'Nature_doc_1': 'Nature doc. 1',
    'Nature_doc_2': 'Nature doc. 2',
    'Nature_doc_3': 'Nature doc. 3',
    'Nature_doc_4': 'Nature doc. 4',
    'Nature_doc_5': 'Nature doc. 5',
    'Nature_doc_6': 'Nature doc. 6',
    'Nature_doc_7': 'Nature doc. 7',
    'demandes_multiples': 'Demandes multiples'
};

function getHeaderLabel(key) {
    return headerLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

document.addEventListener("DOMContentLoaded", async () => {
    await initData();
    renderTable();
    populateFilters();

    // Filtres
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.addEventListener('input', filterData);

    const filterHeresy = document.getElementById('filter-heresy');
    if (filterHeresy) filterHeresy.addEventListener('change', filterData);

    const filterYear = document.getElementById('filter-year');
    if (filterYear) filterYear.addEventListener('change', filterData);

    const filterResult = document.getElementById('filter-result');
    if (filterResult) filterResult.addEventListener('change', filterData);

    // Pagination
    const prevPageBtn = document.getElementById('prev-page');
    if (prevPageBtn) prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });

    const nextPageBtn = document.getElementById('next-page');
    if (nextPageBtn) nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredData.length / rowsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    });
});

// =====================
// Variables globales
// =====================
let allData = [];
let filteredData = [];
let currentPage = 1;
const rowsPerPage = 20;
let sortColumn = null;
let sortDirection = 'asc';

// Colonnes exclues du tableau principal
const excludeColumns = [
    'diocese_origine_2',
    'diocese_origine_lat_2',
    'diocese_origine_lon',
    'nom_acteur_1_statut',
    'nom_acteur_2_statut',
    'nom_acteur_3_statut',
    'nom_acteur_4_statut',
    'nom_acteur_5_statut',
    'nom_acteur_6_statut',
    'nom_acteur_7_statut',
    'nom_acteur_8_statut',
    'nom_acteur_9_statut',
    'nom_acteur_10_statut',
    'nom_acteur_11_statut',
    'documents_annexes',
    'Nature_doc_1',
    'Nature_doc_2',
    'Nature_doc_3',
    'Nature_doc_4',
    'Nature_doc_5',
    'Nature_doc_6',
    'Nature_doc_7'
];

// Colonnes exclues du popup modal
const excludeModalColumns = [
    'diocese_origine_2',
    'diocese_origine_lat_2'
];


// =====================
// Chargement CSV
// =====================
async function loadCSV(filename) {
    try {
        const response = await fetch(filename);
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        const text = await response.text();
        return parseCSV(text);
    } catch (error) {
        console.error('Erreur de chargement du CSV:', error);
        alert('Erreur lors du chargement des données. Vérifiez le chemin du fichier CSV.');
        return [];
    }
}

function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length === 0) return [];

    const headers = parseLine(lines[0]);

    return lines.slice(1).map(line => {
        const values = parseLine(line);
        const row = {};
        headers.forEach((h, i) => {
            row[h.trim()] = values[i] ? values[i].trim() : '';
        });
        return row;
    });
}

function parseLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const next = line[i + 1];

        if (char === '"') {
            if (inQuotes && next === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ';' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current);
    return values;
}

// =====================
// Initialisation
// =====================
async function initData() {
    allData = await loadCSV('../data/disphistinq.csv');
    filteredData = [...allData];

    try {
        const geo = await fetch('../data/carte_lat.geojson').then(r => r.json());
        geo.features.forEach(f => {
            const name = f.properties.diocese || f.properties.nom || '';
            if (!name) return;
            // Centroïde depuis la géométrie (Point ou Polygon)
            let lat, lon;
            if (f.geometry.type === 'Point') {
                [lon, lat] = f.geometry.coordinates;
            } else if (f.geometry.type === 'Polygon') {
                [lon, lat] = f.geometry.coordinates[0][0];
            } else if (f.geometry.type === 'MultiPolygon') {
                [lon, lat] = f.geometry.coordinates[0][0][0];
            }
            if (lat != null && lon != null) {
                coordIndex[name.trim().toLowerCase()] = { lat, lon };
            }
        });
        console.log('Coordonnées chargées depuis GeoJSON :', Object.keys(coordIndex).length);
    } catch (e) {
        console.warn('Impossible de charger carte_lat.geojson :', e.message);
    }
}

// =====================
// Filtres
// =====================
function populateFilters() {
    const heresySelect = document.getElementById('filter-heresy');
    const yearSelect = document.getElementById('filter-year');
    const resultSelect = document.getElementById('filter-result');

    if (!heresySelect || !yearSelect || !resultSelect) return;
    if (!allData.length) return;

    const heresyColumn = Object.keys(allData[0]).find(k =>
        k.toLowerCase().includes('heres') || k.toLowerCase().includes('heresy')
    ) || 'heresie';

    const yearColumn = Object.keys(allData[0]).find(k =>
        k.toLowerCase().includes('annee') || k.toLowerCase().includes('year')
    ) || 'annee';

    const resultColumn = Object.keys(allData[0]).find(k =>
        k.toLowerCase().includes('resultat') || k.toLowerCase().includes('result')
    ) || 'resultat_dispense';

    window.filterColumns = { heresyColumn, yearColumn, resultColumn };

    const heresies = [...new Set(allData.map(d => d[heresyColumn]).filter(Boolean))].sort();
    heresies.forEach(v => {
        const option = document.createElement('option');
        option.value = v; option.textContent = v;
        heresySelect.appendChild(option);
    });

    const years = [...new Set(allData.map(d => d[yearColumn]).filter(Boolean))].sort();
    years.forEach(v => {
        const option = document.createElement('option');
        option.value = v; option.textContent = v;
        yearSelect.appendChild(option);
    });

    const results = [...new Set(allData.map(d => d[resultColumn]).filter(Boolean))].sort();
    results.forEach(v => {
        const option = document.createElement('option');
        option.value = v; option.textContent = v;
        resultSelect.appendChild(option);
    });
}

function filterData() {
    const searchInput = document.getElementById('search-input');
    const filterHeresy = document.getElementById('filter-heresy');
    const filterYear = document.getElementById('filter-year');
    const filterResult = document.getElementById('filter-result');

    const search = searchInput ? searchInput.value.toLowerCase() : '';
    const heresy = filterHeresy ? filterHeresy.value : '';
    const year = filterYear ? filterYear.value : '';
    const result = filterResult ? filterResult.value : '';

    const { heresyColumn, yearColumn, resultColumn } = window.filterColumns || {
        heresyColumn: 'heresie',
        yearColumn: 'annee',
        resultColumn: 'resultat_dispense'
    };

    filteredData = allData.filter(row => {
        const matchSearch = !search || Object.entries(row).some(
            ([k, v]) => !excludeColumns.includes(k) && String(v).toLowerCase().includes(search)
        );
        return (
            matchSearch &&
            (!heresy || row[heresyColumn] === heresy) &&
            (!year || row[yearColumn] === year) &&
            (!result || row[resultColumn] === result)
        );
    });

    currentPage = 1;
    renderTable();
}

// =====================
// Tableau
// =====================
function sortData(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }

    filteredData.sort((a, b) => {
        let valA = a[column] || '';
        let valB = b[column] || '';

        const numA = parseFloat(valA);
        const numB = parseFloat(valB);

        if (!isNaN(numA) && !isNaN(numB)) {
            return sortDirection === 'asc' ? numA - numB : numB - numA;
        } else {
            valA = String(valA).toLowerCase();
            valB = String(valB).toLowerCase();
            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        }
    });

    currentPage = 1;
    renderTable();
}

function renderTable() {
    const headerRow = document.getElementById('table-header');
    const tbody = document.getElementById('table-body');

    if (!headerRow || !tbody) {
        console.error('Éléments table-header ou table-body introuvables');
        return;
    }

    if (!allData.length) {
        tbody.innerHTML = '<tr><td colspan="100">Aucune donnée disponible</td></tr>';
        return;
    }

    const headers = Object.keys(allData[0]).filter(h => !excludeColumns.includes(h));

    const wideKeys = new Set(['source', 'cause_de_demande', 'nom_requerant.e', 'type_de_dispense_harmonise']);

    headerRow.innerHTML = headers.map(h => {
        const label = getHeaderLabel(h);
        const isWide = wideKeys.has(h);
        const classes = ['sortable', isWide ? 'wide-col' : ''].filter(Boolean).join(' ');
        const sortMark = sortColumn === h ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : '';
        return `<th class="${classes}" data-column="${escapeHtml(h)}">${escapeHtml(label)}${sortMark}</th>`;
    }).join('');

    headerRow.querySelectorAll('th.sortable').forEach(th => {
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => sortData(th.dataset.column));
    });

    const start = (currentPage - 1) * rowsPerPage;
    const pageData = filteredData.slice(start, start + rowsPerPage);

    if (!pageData.length) {
        tbody.innerHTML = '<tr><td colspan="100">Aucun résultat</td></tr>';
        updatePagination();
        return;
    }

    tbody.innerHTML = pageData.map((row, i) => `
        <tr class="clickable-row" data-index="${start + i}">
            ${headers.map(h => {
        const isWide = wideKeys.has(h);
        const value = row[h] || '';
        const display = value.length > 100 ? value.substring(0, 97) + '…' : value;
        return `<td ${isWide ? 'class="wide-col"' : ''}>${escapeHtml(display)}</td>`;
    }).join('')}
        </tr>
    `).join('');

    updatePagination();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =====================
// Pagination
// =====================
function updatePagination() {
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    if (!pageInfo || !prevBtn || !nextBtn) return;

    const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;
    pageInfo.textContent = `Page ${currentPage} sur ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage >= totalPages;
}

// =====================
// CLIC → MODAL
// =====================
document.addEventListener('click', e => {
    const row = e.target.closest('.clickable-row');
    if (!row) return;
    const data = filteredData[parseInt(row.dataset.index)];
    if (data) openCaseModal(data);
});

function openCaseModal(row) {
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
        if (modalMap) { modalMap.remove(); modalMap = null; modalMarkers = []; }
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    const mapId = 'modal-map-' + Date.now();

    // ── Titre ──────────────────────────────────────────────────
    const casId = row['cas.id'] || '';
    const nomRequerant = row['nom_requerant.e'] || '';
    const annee = row['annee'] || '';
    const mainTitle = `${casId}${casId && nomRequerant ? ' — ' : ''}${nomRequerant}${annee ? ` (${annee})` : ''}`;

    // ── Infos carte ────────────────────────────────────────────
    const dioceseOrigine = row['diocese_origine_fr_2'] || '';
    const pays = row['pays'] || '';

    // ── Champs ordonnés ────────────────────────────────────────
    const detailsInfo = [];

    const orderedFields = [
        { key: 'folio', label: 'Folio' },
        { key: 'nom_requerant.e', label: 'Requérant·e' },
        { key: 'genre', label: 'Genre' },
        { key: 'ordre_religieux', label: 'Ordre religieux' },
        { key: 'annee', label: 'Année' },
        { key: 'heresie', label: 'Hérésie', isLong: true },
        { key: 'type_de_dispense_harmonise', label: 'Type de dispense', isLong: true },
        { key: 'resultat_dispense', label: 'Résultat', isLong: true },
        { key: 'cause_de_demande', label: 'Cause de la demande', isLong: true },
        { key: 'justification_demande_SO', label: 'Justification' },
        { key: 'source', label: 'Source' },
        { key: 'Liens_autres_congregations', label: 'Liens autres congrégations' },
        { key: 'demandes_multiples', label: 'Demandes multiples' }
    ];

    orderedFields.forEach(({ key, label, isLong }) => {
        if (row[key] && row[key].toString().trim() !== '') {
            detailsInfo.push({ label, value: row[key], isLong });
        }
    });

    const additionalFields = [
        'nombre_acteurs_ext',
        'nom_acteur_1_statut', 'nom_acteur_2_statut', 'nom_acteur_3_statut',
        'nom_acteur_4_statut', 'nom_acteur_5_statut', 'nom_acteur_6_statut',
        'nom_acteur_7_statut', 'nom_acteur_8_statut', 'nom_acteur_9_statut',
        'nom_acteur_10_statut', 'nom_acteur_11_statut',
        'documents_annexes',
        'Nature_doc_1', 'Nature_doc_2', 'Nature_doc_3', 'Nature_doc_4',
        'Nature_doc_5', 'Nature_doc_6', 'Nature_doc_7'
    ];

    additionalFields.forEach(key => {
        if (row[key] && row[key].toString().trim() !== '' && !excludeModalColumns.includes(key)) {
            detailsInfo.push({ label: getHeaderLabel(key), value: row[key], isLong: false });
        }
    });

    // ── HTML détails ───────────────────────────────────────────
    const detailsHTML = detailsInfo.map(({ label, value, isLong }) => isLong
        ? `<div class="detail-item detail-item-long">
               <div class="detail-label">${escapeHtml(label)}</div>
               <div class="detail-value">${escapeHtml(String(value))}</div>
           </div>`
        : `<div class="detail-item">
               <span class="detail-label">${escapeHtml(label)}</span>
               <span class="detail-value">${escapeHtml(String(value))}</span>
           </div>`
    ).join('');

    modal.innerHTML = `
        <div class="modal-overlay-bg"></div>
        <div class="modal-container">
            <div class="modal-header">
                <h2 class="modal-title">${escapeHtml(mainTitle)}</h2>
                <button class="modal-close" aria-label="Fermer">✕</button>
            </div>
            <div class="modal-body">
                <div class="modal-left">
                    <div class="section-title">Détails</div>
                    <div class="details-grid">${detailsHTML}</div>
                </div>
                <div class="modal-right">
                    <div class="section-title">Carte d'origine</div>
                    ${dioceseOrigine
            ? `<div class="map-info"><span class="map-info-label">Diocèse d'origine :</span> <span class="map-info-value">${escapeHtml(dioceseOrigine)}</span></div>`
            : ''}
                    ${pays
            ? `<div class="map-info"><span class="map-info-label">Pays :</span> <span class="map-info-value">${escapeHtml(pays)}</span></div>`
            : ''}
                    <div class="modal-map-container">
                        <div id="${mapId}" style="height:100%;width:100%;border-radius:8px;"></div>
                    </div>
                </div>
            </div>
        </div>`;

    document.body.appendChild(modal);

    const closeModal = () => {
        if (modalMap) { modalMap.remove(); modalMap = null; modalMarkers = []; }
        modal.remove();
    };

    modal.querySelector('.modal-close').onclick = closeModal;
    modal.querySelector('.modal-overlay-bg').addEventListener('click', closeModal);

    const handleEscape = e => {
        if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', handleEscape); }
    };
    document.addEventListener('keydown', handleEscape);

    setTimeout(() => initModalMap(row, mapId), 150);
}

// =====================
// CARTE MODALE
// =====================
async function resolvePlace(place) {
    const key = place.toLowerCase().trim();

    if (coordIndex[key]) {
        return { lat: coordIndex[key].lat, lon: coordIndex[key].lon, label: place };
    }

    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(place)}`,
            { headers: { 'User-Agent': 'HistoricalDataApp/1.0' } }
        ).then(r => r.json());

        if (!res || !res.length) return null;
        return { lat: parseFloat(res[0].lat), lon: parseFloat(res[0].lon), label: res[0].display_name };
    } catch (error) {
        console.error(`Erreur lors de la résolution de "${place}":`, error);
        return null;
    }
}

async function initModalMap(row, mapId) {
    if (modalMap) { modalMap.remove(); modalMap = null; modalMarkers = []; }

    modalMap = L.map(mapId);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(modalMap);

    // ── Colonne mise à jour : diocese_origine_fr_2 ─────────────
    const placeRaw =
        row.diocese_origine_fr_2 ||
        row.diocese_origine_2 ||
        row.pays;

    if (!placeRaw) return;

    const places = placeRaw.split(',').map(p => p.trim()).filter(Boolean);
    const bounds = [];

    for (const place of places) {
        const resolved = await resolvePlace(place);
        if (!resolved) continue;

        const coords = [resolved.lat, resolved.lon];
        const marker = L.marker(coords).addTo(modalMap).bindPopup(resolved.label);
        modalMarkers.push(marker);
        bounds.push(coords);

        let zoom = 7;
        const lp = place.toLowerCase();
        if (lp.includes('amérique') || lp.includes('france') ||
            lp.includes('allemagne') || lp.includes('angleterre') ||
            lp.startsWith('province')) {
            zoom = 5;
        }

        if (bounds.length > 1) {
            modalMap.fitBounds(bounds, { padding: [40, 40] });
        } else {
            modalMap.setView(coords, zoom);
        }
    }

    setTimeout(() => modalMap.invalidateSize(), 200);
}