let modalMap = null;
let modalMarkers = [];
let coordIndex = {};

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

// Colonnes exclues du tableau principal
const excludeColumns = [
    'diocese_origine',
    'diocese_origine_lat',
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
    allData = await loadCSV('../data/data.csv');
    filteredData = [...allData];

    const coordData = await loadCSV('../data/coordonnees.csv');

    coordData.forEach(row => {
        // Utiliser les noms de colonnes avec majuscules
        if (row.Lieu && row.Latitude && row.Longitude) {
            const lat = parseFloat(row.Latitude);
            const lon = parseFloat(row.Longitude);
            
            // Vérifier que les coordonnées sont valides
            if (!isNaN(lat) && !isNaN(lon)) {
                const key = row.Lieu.trim().toLowerCase();
                coordIndex[key] = {
                    lat: lat,
                    lon: lon
                };
                console.log(`✓ Coordonnées chargées: "${row.Lieu}" -> ${lat}, ${lon}`);
            }
        }
    });

    console.log('Index des coordonnées chargé:', Object.keys(coordIndex).length, 'villes');
}

// =====================
// Filtres
// =====================
function populateFilters() {
    const heresySelect = document.getElementById('filter-heresy');
    const yearSelect = document.getElementById('filter-year');
    const resultSelect = document.getElementById('filter-result');

    if (!heresySelect || !yearSelect || !resultSelect) return;
    if (!allData.length) return; // Protection si pas de données

    // Détection automatique des colonnes
    const heresyColumn = Object.keys(allData[0]).find(k => 
        k.toLowerCase().includes('heres') || k.toLowerCase().includes('heresy')
    ) || 'heresie';
    
    const yearColumn = Object.keys(allData[0]).find(k => 
        k.toLowerCase().includes('annee') || k.toLowerCase().includes('year')
    ) || 'annee';
    
    const resultColumn = Object.keys(allData[0]).find(k => 
        k.toLowerCase().includes('resultat') || k.toLowerCase().includes('result')
    ) || 'resultat_dispense';

    // Stocker les noms de colonnes
    window.filterColumns = { heresyColumn, yearColumn, resultColumn };

    // Peupler les sélecteurs
    const heresies = [...new Set(allData.map(d => d[heresyColumn]).filter(Boolean))].sort();
    heresies.forEach(v => {
        const option = document.createElement('option');
        option.value = v;
        option.textContent = v;
        heresySelect.appendChild(option);
    });

    const years = [...new Set(allData.map(d => d[yearColumn]).filter(Boolean))].sort();
    years.forEach(v => {
        const option = document.createElement('option');
        option.value = v;
        option.textContent = v;
        yearSelect.appendChild(option);
    });

    const results = [...new Set(allData.map(d => d[resultColumn]).filter(Boolean))].sort();
    results.forEach(v => {
        const option = document.createElement('option');
        option.value = v;
        option.textContent = v;
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

    headerRow.innerHTML = headers.map(h =>
        (h === 'source' || h === 'cause_de_demande')
            ? `<th class="wide-col">${escapeHtml(h)}</th>`
            : `<th>${escapeHtml(h)}</th>`
    ).join('');

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
                const wide = (h === 'source' || h === 'cause_de_demande') ? 'class="wide-col"' : '';
                return `<td ${wide}>${escapeHtml(row[h] || '')}</td>`;
            }).join('')}
        </tr>
    `).join('');

    updatePagination();
}

// Fonction utilitaire pour échapper le HTML
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

    const index = parseInt(row.dataset.index);
    const data = filteredData[index];
    
    if (data) {
        openCaseModal(data);
    }
});

function openCaseModal(row) {
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
        // Nettoyer la carte existante avant de supprimer
        if (modalMap) {
            modalMap.remove();
            modalMap = null;
            modalMarkers = [];
        }
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    const mapId = 'modal-map-' + Date.now();

    const infoHTML = Object.entries(row)
        .filter(([k, v]) => v && v.toString().trim() !== '')
        .map(([k, v]) => `
            <div class="info-row">
                <div class="info-key">${escapeHtml(k)}</div>
                <div class="info-value">${escapeHtml(String(v))}</div>
            </div>
        `).join('');

    modal.innerHTML = `
        <div class="modal-box">
            <button class="modal-close" aria-label="Fermer">✕</button>
            <div class="modal-content">
                <div class="modal-info">${infoHTML}</div>
                <div class="modal-map">
                    <div id="${mapId}" style="height: 100%; width: 100%;"></div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => {
        if (modalMap) {
            modalMap.remove();
            modalMap = null;
            modalMarkers = [];
        }
        modal.remove();
    };

    modal.querySelector('.modal-close').onclick = closeModal;
    
    // Fermer en cliquant sur l'overlay
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Fermer avec la touche Échap
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);

    setTimeout(() => initModalMap(row, mapId), 150);
}

async function resolvePlace(place) {
    const key = place.toLowerCase().trim();

    // 1️⃣ CSV local
    if (coordIndex[key]) {
        return {
            lat: coordIndex[key].lat,
            lon: coordIndex[key].lon,
            label: place
        };
    }

    // 2️⃣ Fallback Nominatim avec gestion d'erreur
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(place)}`,
            {
                headers: {
                    'User-Agent': 'HistoricalDataApp/1.0' // Nominatim requiert un User-Agent
                }
            }
        ).then(r => r.json());

        if (!res || !res.length) return null;

        return {
            lat: parseFloat(res[0].lat),
            lon: parseFloat(res[0].lon),
            label: res[0].display_name
        };
    } catch (error) {
        console.error(`Erreur lors de la résolution de "${place}":`, error);
        return null;
    }
}

async function initModalMap(row, mapId) {
    // Vérifier que Leaflet est chargé
    if (typeof L === 'undefined') {
        console.error('Leaflet n\'est pas chargé');
        return;
    }

    const mapElement = document.getElementById(mapId);
    if (!mapElement) {
        console.error(`Élément de carte ${mapId} introuvable`);
        return;
    }

    modalMap = L.map(mapId).setView([46.5, 2.5], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(modalMap);

    const placeRaw =
        row.diocese_origine_fr ||
        row.diocese_origine ||
        row.pays;

    if (!placeRaw || placeRaw.trim() === '') {
        console.log('Aucun lieu à afficher');
        return;
    }

    const places = placeRaw
        .split(',')
        .map(p => p.trim())
        .filter(Boolean);

    const bounds = [];

    for (const place of places) {
        const result = await resolvePlace(place);
        if (!result) {
            console.log(`Impossible de résoudre: ${place}`);
            continue;
        }

        const coords = [result.lat, result.lon];

        const marker = L.marker(coords)
            .addTo(modalMap)
            .bindPopup(escapeHtml(result.label));

        modalMarkers.push(marker);
        bounds.push(coords);
    }

    if (bounds.length > 0) {
        if (bounds.length === 1) {
            // Un seul marqueur - centrer avec un zoom approprié
            modalMap.setView(bounds[0], 10);
        } else {
            // Plusieurs marqueurs - ajuster les limites
            modalMap.fitBounds(bounds, { padding: [40, 40] });
        }
    }

    // Forcer le redimensionnement de la carte
    setTimeout(() => {
        if (modalMap) {
            modalMap.invalidateSize();
        }
    }, 200);
}