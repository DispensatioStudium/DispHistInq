// Variables globales
let allData = [];
let filteredData = [];
let map = null;
let coordinates = {};
let markers = [];

const headerLabels = {
    'cas-id': 'ID',
    'source': 'Source',
    'folio': 'Folio',
    'nom_requerant.e': 'Requérant·e',
    'identite_eccl': 'Identité ecclésiastique',
    'genre': 'Genre',
    'ordre_religieux': 'Ordre religieux',
    'diocese_origine_fr': "Diocèse d'origine",
    'pays': 'Pays',
    'annee': 'Année',
    'durée_cause_mois': 'Durée (mois)',
    'type_de_dispense_harmonise': 'Type de dispense',
    'resultat_dispense': 'Résultat',
    'cause_de_demande': 'Cause de la demande',
    'justification_demande_SO': 'Justification (Saint-Office)',
    'Liens_autres_congregations': 'Liens autres congrégations',
    'heresie': 'Hérésie',
    'nombre_acteurs_ext': 'Nb acteurs',
    'nom_acteur_1_statut': 'Acteur 1 – Statut',
    'nom_acteur_2_statut': 'Acteur 2 – Statut',
    'nom_acteur_3_statut': 'Acteur 3 – Statut',
    'nom_acteur_4_statut': 'Acteur 4 – Statut',
    'nom_acteur_5_statut': 'Acteur 5 – Statut',
    'nom_acteur_6_statut': 'Acteur 6 – Statut',
    'nom_acteur_7_statut': 'Acteur 7 – Statut',
    'nom_acteur_8_statut': 'Acteur 8 – Statut',
    'nom_acteur_9_statut': 'Acteur 9 – Statut',
    'nom_acteur_10_statut': 'Acteur 10 – Statut',
    'nom_acteur_11_statut': 'Acteur 11 – Statut',
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

function renderFullDetails(row) {
    return Object.entries(headerLabels)
        .filter(([key]) => row[key] && row[key].toString().trim() !== '')
        .map(([key, label]) => `
            <div class="detail-item">
                <span class="detail-label">${escapeHtml(label)}</span>
                <span class="detail-value">${escapeHtml(row[key])}</span>
            </div>
        `).join('');
}

document.addEventListener("DOMContentLoaded", async () => {
    await initData();
    initMap();
    populateFilters();
    updateMapStats();

    // Event listeners pour les filtres
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.addEventListener('input', filterAndUpdateMap);

    const filterHeresy = document.getElementById('filter-heresy');
    if (filterHeresy) filterHeresy.addEventListener('change', filterAndUpdateMap);

    const filterYear = document.getElementById('filter-year');
    if (filterYear) filterYear.addEventListener('change', filterAndUpdateMap);

    const filterResult = document.getElementById('filter-result');
    if (filterResult) filterResult.addEventListener('change', filterAndUpdateMap);
});

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
        if (row.Lieu && row.Latitude && row.Longitude) {
            const lat = parseFloat(row.Latitude);
            const lng = parseFloat(row.Longitude);
            
            if (!isNaN(lat) && !isNaN(lng)) {
                coordinates[row.Lieu.trim()] = {
                    lat: lat,
                    lng: lng
                };
            }
        }
    });

    console.log('Données chargées:', allData.length, 'cas');
    console.log('Coordonnées chargées:', Object.keys(coordinates).length, 'lieux');
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

    // Peupler hérésies
    const heresies = [...new Set(allData.map(d => d[heresyColumn]).filter(Boolean))].sort();
    heresies.forEach(v => {
        const option = document.createElement('option');
        option.value = v;
        option.textContent = v;
        heresySelect.appendChild(option);
    });

    // Peupler années
    const years = [...new Set(allData.map(d => d[yearColumn]).filter(Boolean))].sort();
    years.forEach(v => {
        const option = document.createElement('option');
        option.value = v;
        option.textContent = v;
        yearSelect.appendChild(option);
    });

    // Peupler résultats
    const results = [...new Set(allData.map(d => d[resultColumn]).filter(Boolean))].sort();
    results.forEach(v => {
        const option = document.createElement('option');
        option.value = v;
        option.textContent = v;
        resultSelect.appendChild(option);
    });
}

function filterAndUpdateMap() {
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
        const matchSearch = !search || Object.values(row).some(
            v => String(v).toLowerCase().includes(search)
        );
        return (
            matchSearch &&
            (!heresy || row[heresyColumn] === heresy) &&
            (!year || row[yearColumn] === year) &&
            (!result || row[resultColumn] === result)
        );
    });

    updateMap();
    updateMapStats();
}

// =====================
// Carte
// =====================
function initMap() {
    const mapDiv = document.getElementById('map');
    if (!mapDiv) return;

    map = L.map('map').setView([46.5, 2.5], 6);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    updateMap();
}

function updateMap() {
    if (!map) return;

    // Supprimer les anciens marqueurs
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    // Compter les cas par diocèse
    const dioceseCounts = {};
    filteredData.forEach(row => {
        const diocese = row.diocese_origine_fr;
        if (diocese) {
            dioceseCounts[diocese] = (dioceseCounts[diocese] || 0) + 1;
        }
    });

    // Ajouter les marqueurs
    Object.entries(dioceseCounts).forEach(([diocese, count]) => {
        const coord = coordinates[diocese];
        if (coord && !isNaN(coord.lat) && !isNaN(coord.lng)) {
            const marker = L.circleMarker([coord.lat, coord.lng], {
                radius: Math.min(5 + Math.sqrt(count) * 2, 20),
                fillColor: '#0284c7',
                color: '#06b6d4',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.7
            }).addTo(map);

            marker.bindTooltip(
                `<strong>${escapeHtml(diocese)}</strong><br>${count} cas`,
                {
                    direction: 'top',
                    offset: [0, -5],
                    opacity: 0.95,
                    sticky: true
                }
            );

            marker.on('click', () => {
                const casesForDiocese = filteredData.filter(
                    row => row.diocese_origine_fr === diocese
                );
                openCasesModal(diocese, casesForDiocese);
            });

            markers.push(marker);
        }
    });
}

function updateMapStats() {
    const casesCountEl = document.getElementById('map-cases-count');
    const diocesesCountEl = document.getElementById('map-dioceses-count');

    if (casesCountEl) {
        casesCountEl.textContent = filteredData.length;
    }

    if (diocesesCountEl) {
        const uniqueDioceses = new Set(
            filteredData.map(d => d.diocese_origine_fr).filter(Boolean)
        );
        diocesesCountEl.textContent = uniqueDioceses.size;
    }
}

function openCasesModal(diocese, cases) {
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    const casesHTML = cases.map((row, index) => {
        return `
            <div class="case-block">
                <h3 class="case-title case-name">
                    ${escapeHtml(row['nom_requerant.e'] || 'Sans nom')}
                    ${row['annee'] ? ` (${row['annee']})` : ''}
                </h3>

                <div class="case-grid">
                    ${renderField(row, 'identite_eccl', 'Identité ecclésiastique')}
                    ${renderField(row, 'genre', 'Genre')}
                    ${renderField(row, 'ordre_religieux', 'Ordre religieux')}
                    ${renderField(row, 'heresie', 'Hérésie', true)}
                    ${renderField(row, 'type_de_dispense_harmonise', 'Type de dispense')}
                    ${renderField(row, 'resultat_dispense', 'Résultat')}
                    ${renderField(row, 'cause_de_demande', 'Cause de la demande')}

                </div>

                <button class="case-toggle">Voir les détails du cas</button>

                <div class="case-details-full" hidden>
                    <div class="details-grid">
                        ${renderFullDetails(row)}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    modal.innerHTML = `
        <div class="modal-overlay-bg"></div>
        <div class="modal-container modal-large">
            <div class="modal-header">
                <h2 class="modal-title">
                    ${escapeHtml(diocese)} — ${cases.length} cas
                </h2>
                <button class="modal-close">✕</button>
            </div>

            <div class="modal-body modal-scroll">
                ${casesHTML || '<p>Aucun cas disponible.</p>'}
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => modal.remove();
    modal.querySelector('.modal-close').onclick = closeModal;
    modal.querySelector('.modal-overlay-bg').onclick = closeModal;

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeModal();
    }, { once: true });
}

function renderField(row, key, label, isLong = false) {
    if (!row[key] || row[key].trim() === '') return '';
    return `
        <div class="detail-item ${isLong ? 'detail-item-long' : ''}">
            <span class="detail-label">${escapeHtml(label)}</span>
            <span class="detail-value">${escapeHtml(row[key])}</span>
        </div>
    `;
}


function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

document.addEventListener('click', e => {
    const btn = e.target.closest('.case-toggle');
    if (!btn) return;

    const details = btn.nextElementSibling;
    const isOpen = !details.hasAttribute('hidden');

    details.toggleAttribute('hidden');
    btn.textContent = isOpen
        ? 'Voir les détails du cas'
        : 'Masquer les détails';
});