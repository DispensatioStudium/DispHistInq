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
    // CORRECTION: Chemin relatif correct depuis pages/donnees.html
    allData = await loadCSV('../data/data.csv');
    filteredData = [...allData];
    
    // Debug: afficher les colonnes disponibles
    if (allData.length > 0) {
        console.log('Colonnes disponibles:', Object.keys(allData[0]));
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

    // CORRECTION: Vérifier les noms exacts des colonnes dans vos données
    const heresyColumn = Object.keys(allData[0] || {}).find(k => 
        k.toLowerCase().includes('heres') || k.toLowerCase().includes('heresy')
    ) || 'heresie';
    
    const yearColumn = Object.keys(allData[0] || {}).find(k => 
        k.toLowerCase().includes('annee') || k.toLowerCase().includes('year')
    ) || 'annee';
    
    const resultColumn = Object.keys(allData[0] || {}).find(k => 
        k.toLowerCase().includes('resultat') || k.toLowerCase().includes('result')
    ) || 'resultat_dispense';

    // Stocker les noms de colonnes pour utilisation ultérieure
    window.filterColumns = { heresyColumn, yearColumn, resultColumn };

    [...new Set(allData.map(d => d[heresyColumn]).filter(Boolean))]
        .sort()
        .forEach(v => heresySelect.append(new Option(v, v)));

    [...new Set(allData.map(d => d[yearColumn]).filter(Boolean))]
        .sort()
        .forEach(v => yearSelect.append(new Option(v, v)));

    [...new Set(allData.map(d => d[resultColumn]).filter(Boolean))]
        .sort()
        .forEach(v => resultSelect.append(new Option(v, v)));
}

function filterData() {
    const search = document.getElementById('search-input').value.toLowerCase();
    const heresy = document.getElementById('filter-heresy').value;
    const year = document.getElementById('filter-year').value;
    const result = document.getElementById('filter-result').value;

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

    if (!allData.length) {
        tbody.innerHTML = '<tr><td colspan="100">Aucune donnée disponible</td></tr>';
        return;
    }

    const headers = Object.keys(allData[0]).filter(h => !excludeColumns.includes(h));

    headerRow.innerHTML = headers.map(h =>
        (h === 'source' || h === 'cause_de_demande')
            ? `<th class="wide-col">${h}</th>`
            : `<th>${h}</th>`
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
                return `<td ${wide}>${row[h] || ''}</td>`;
            }).join('')}
        </tr>
    `).join('');

    updatePagination();
}

// =====================
// Pagination
// =====================
function updatePagination() {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;
    document.getElementById('page-info').textContent =
        `Page ${currentPage} sur ${totalPages}`;
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage >= totalPages;
}

// =====================
// CLIC → MODAL
// =====================
document.addEventListener('click', e => {
    const row = e.target.closest('.clickable-row');
    if (!row) return;

    const data = filteredData[row.dataset.index];
    if (data) {
        openCaseModal(data);
    }
});

function openCaseModal(row) {
    // Supprimer toute modale existante
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    // Générer un ID unique pour la carte
    const mapId = 'modal-map-' + Date.now();

    const infoHTML = Object.entries(row)
        .filter(([k, v]) => v)
        .map(([k, v]) => `
            <div class="info-row">
                <div class="info-key">${k}</div>
                <div class="info-value">${v}</div>
            </div>
        `).join('');

    modal.innerHTML = `
        <div class="modal-box">
            <button class="modal-close">✕</button>
            <div class="modal-content">
                <div class="modal-info">${infoHTML}</div>
                <div class="modal-map"><div id="${mapId}"></div></div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => {
        // Nettoyer la carte Leaflet avant de supprimer le modal
        if (window.currentModalMap) {
            window.currentModalMap.remove();
            window.currentModalMap = null;
        }
        modal.remove();
    };

    modal.querySelector('.modal-close').onclick = closeModal;
    modal.onclick = e => { if (e.target === modal) closeModal(); };

    // Simple timeout comme dans l'exemple qui fonctionne
    setTimeout(() => initModalMap(row, mapId), 100);
}

// =====================
// Carte Leaflet du modal
// =====================
function initModalMap(row, mapId) {
    const mapElement = document.getElementById(mapId);
    if (!mapElement) {
        console.error('Element', mapId, 'introuvable');
        return;
    }

    // Vérifier si Leaflet est chargé
    if (typeof L === 'undefined') {
        console.error('Leaflet n\'est pas chargé');
        return;
    }

    // Supprimer l'ancienne carte si elle existe
    if (window.currentModalMap) {
        window.currentModalMap.remove();
        window.currentModalMap = null;
    }

    // Nettoyer toute instance Leaflet précédente
    if (mapElement._leaflet_id) {
        delete mapElement._leaflet_id;
    }

    // Créer la carte très simplement
    const map = L.map(mapId).setView([46.5, 2.5], 5);
    window.currentModalMap = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);

    // Invalider la taille après création
    map.invalidateSize();

    // Trouver le lieu à géolocaliser
    const place = row.diocese_origine_fr || row.diocese_origine || row.pays;
    if (!place) {
        console.log('Aucun lieu à géolocaliser');
        return;
    }

    // Géolocalisation avec Nominatim
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`)
        .then(r => r.json())
        .then(res => {
            if (!res || !res.length) {
                console.log('Lieu non trouvé:', place);
                return;
            }
            const { lat, lon } = res[0];
            map.setView([lat, lon], 7);
            L.marker([lat, lon])
                .addTo(map)
                .bindPopup(`<strong>${place}</strong>`)
                .openPopup();
        })
        .catch(err => console.error('Erreur géolocalisation:', err));
}