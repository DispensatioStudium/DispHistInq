let modalMap = null;
let modalMarkers = [];
let coordIndex = {};

// =====================
// DICTIONNAIRE D'EN-TÊTES
// =====================
const headerLabels = {
    'cas-id': 'ID',
    'source': 'Source',
    'folio': 'Folio',
    'nom_requerant.e': 'Requérant·e',
    'identite_eccl': 'Identité ecclésiastique',
    'genre': 'Genre',
    'ordre_religieux': 'Ordre religieux',
    'diocese_origine': 'Diocèse d\'origine',
    'diocese_origine_fr': 'Diocèse d\'origine (FR)',
    'diocese_origine_lat': 'Diocèse d\'origine (Lat)',
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
let sortDirection = 'asc'; // 'asc' ou 'desc'

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

// Colonnes exclues du popup modal
const excludeModalColumns = [
    'diocese_origine',
    'diocese_origine_lat'
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
function sortData(column) {
    // Si on clique sur la même colonne, inverser la direction
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }

    filteredData.sort((a, b) => {
        let valA = a[column] || '';
        let valB = b[column] || '';

        // Détecter si c'est un nombre
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        
        if (!isNaN(numA) && !isNaN(numB)) {
            // Tri numérique
            return sortDirection === 'asc' ? numA - numB : numB - numA;
        } else {
            // Tri alphabétique (insensible à la casse)
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

    // Créer les en-têtes avec libellés améliorés et indicateurs de tri
    headerRow.innerHTML = headers.map(h => {
        const label = getHeaderLabel(h);
        const wideClass = (h === 'source' || h === 'cause_de_demande' || h === 'nom_requerant.e' || h === 'type_de_dispense_harmonise') ? 'class="wide-col sortable"' : 'class="sortable"';
        
        // Ajouter un indicateur de tri si cette colonne est triée
        let sortIndicator = '';
        if (sortColumn === h) {
            sortIndicator = sortDirection === 'asc' ? ' ▲' : ' ▼';
        }
        
        return `<th ${wideClass} data-column="${escapeHtml(h)}">${escapeHtml(label)}${sortIndicator}</th>`;
    }).join('');

    // Ajouter les écouteurs d'événements sur les en-têtes
    headerRow.querySelectorAll('th.sortable').forEach(th => {
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => {
            const column = th.dataset.column;
            sortData(column);
        });
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
                const wide = (h === 'source' || h === 'cause_de_demande' || h === 'nom_requerant.e' || h === 'type_de_dispense_harmonise') ? 'class="wide-col"' : '';
                const value = row[h] || '';
                // Tronquer le texte long et ajouter ...
                const displayValue = value.length > 100 ? value.substring(0, 97) + '...' : value;
                return `<td ${wide}>${escapeHtml(displayValue)}</td>`;
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

    // Titre principal : ID - Nom (Date)
    const casId = row['cas-id'] || '';
    const nomRequerant = row['nom_requerant.e'] || '';
    const annee = row['annee'] || '';
    const mainTitle = `${casId}${casId && nomRequerant ? ' — ' : ''}${nomRequerant}${annee ? ` (${annee})` : ''}`;

    // Informations pour la carte
    const dioceseOrigine = row['diocese_origine_fr'] || '';
    const pays = row['pays'] || '';

    // Préparer les groupes d'informations dans l'ordre spécifié
    const detailsInfo = [];
    
    // Ordre spécifique des champs
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

    // Ajouter les champs ordonnés
    orderedFields.forEach(({ key, label, isLong }) => {
        if (row[key] && row[key].toString().trim() !== '') {
            detailsInfo.push({ label, value: row[key], isLong });
        }
    });

    // Ajouter les autres champs (acteurs, documents, etc.)
    const additionalFields = [
        'nombre_acteurs_ext',
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

    additionalFields.forEach(key => {
        if (row[key] && row[key].toString().trim() !== '' && !excludeModalColumns.includes(key)) {
            const label = getHeaderLabel(key);
            detailsInfo.push({ label, value: row[key], isLong: false });
        }
    });

    // Générer le HTML des détails
    const detailsHTML = detailsInfo.map(({ label, value, isLong }) => {
        if (isLong) {
            return `
                <div class="detail-item detail-item-long">
                    <div class="detail-label">${escapeHtml(label)}</div>
                    <div class="detail-value">${escapeHtml(String(value))}</div>
                </div>
            `;
        }
        return `
            <div class="detail-item">
                <span class="detail-label">${escapeHtml(label)}</span>
                <span class="detail-value">${escapeHtml(String(value))}</span>
            </div>
        `;
    }).join('');

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
                    <div class="details-grid">
                        ${detailsHTML}
                    </div>
                </div>
                <div class="modal-right">
                    <div class="section-title">Carte d'origine</div>
                    ${dioceseOrigine ? `<div class="map-info"><span class="map-info-label">Diocèse d'origine :</span> <span class="map-info-value">${escapeHtml(dioceseOrigine)}</span></div>` : ''}
                    ${pays ? `<div class="map-info"><span class="map-info-label">Pays :</span> <span class="map-info-value">${escapeHtml(pays)}</span></div>` : ''}
                    <div class="modal-map-container">
                        <div id="${mapId}" style="height: 100%; width: 100%; border-radius: 8px;"></div>
                    </div>
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
    modal.querySelector('.modal-overlay-bg').addEventListener('click', closeModal);

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
    // Supprimer l'ancienne carte si elle existe
    if (modalMap) {
        modalMap.remove();
        modalMap = null;
        modalMarkers = [];
    }

    modalMap = L.map(mapId);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(modalMap);

    const placeRaw =
        row.diocese_origine_fr ||
        row.diocese_origine ||
        row.pays;

    if (!placeRaw) return;

    const places = placeRaw
        .split(',')
        .map(p => p.trim())
        .filter(Boolean);

    const bounds = [];

    // Parcourir toutes les places avec resolvePlace()
    for (const place of places) {
        const resolved = await resolvePlace(place);
        if (!resolved) return;

        const coords = [resolved.lat, resolved.lon];

        const marker = L.marker(coords)
            .addTo(modalMap)
            .bindPopup(resolved.label);

        modalMarkers.push(marker);
        bounds.push(coords);

        // Définir un zoom par défaut selon le lieu
        let zoom = 7; // zoom normal
        const lowerPlace = place.toLowerCase();
        if (
            lowerPlace.includes("amérique") ||
            lowerPlace.includes("france") ||
            lowerPlace.includes("allemagne") ||
            lowerPlace.includes("angleterre") ||
            lowerPlace.startsWith("province")
        ) {
            zoom = 5; // moins zoomé pour les pays ou régions larges
        }

        if (bounds.length > 1) {
            modalMap.fitBounds(bounds, { padding: [40, 40] });
        } else {
            modalMap.setView(coords, zoom);
        }
    }

    setTimeout(() => modalMap.invalidateSize(), 200);
}