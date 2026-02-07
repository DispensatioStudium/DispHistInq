// Variables globales
let allData = [];
let filteredData = [];
let map = null;
let coordinates = {};
let markers = [];

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
                fillColor: '#6b2737',
                color: '#c9a961',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.7
            }).addTo(map);

            marker.bindPopup(`<b>${diocese}</b><br>${count} cas`);
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