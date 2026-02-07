document.addEventListener("DOMContentLoaded", async () => {
    const mapDiv = document.getElementById('map');
    const tableBody = document.getElementById('table-body');
    const statsDiv = document.getElementById('stats');

    // Charger les données
    await initData();

    // Mettre à jour selon la page
    if (statsDiv) updateStats();
    if (tableBody) renderTable();
    if (mapDiv) initMap();

    // Event listeners filtrage et pagination
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.addEventListener('input', filterData);

    const filterDiocese = document.getElementById('filter-diocese');
    if (filterDiocese) filterDiocese.addEventListener('change', filterData);

    const filterYear = document.getElementById('filter-year');
    if (filterYear) filterYear.addEventListener('change', filterData);

    const filterResult = document.getElementById('filter-result');
    if (filterResult) filterResult.addEventListener('change', filterData);

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

// Variables globales
let allData = [];
let filteredData = [];
let currentPage = 1;
const rowsPerPage = 20;
let map = null;
let coordinates = {};

// Gestion des onglets (sécurisé si dataset.tab absent)
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        const tabName = button.dataset.tab;
        if (!tabName) return;

        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        button.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        const tabContent = document.getElementById(tabName);
        if (tabContent) tabContent.classList.add('active');

        if (tabName === 'carte' && !map) initMap();
    });
});

// Charger les données CSV
async function loadCSV(filename) {
    try {
        const response = await fetch(filename);
        const text = await response.text();
        return parseCSV(text);
    } catch (error) {
        console.error(`Erreur lors du chargement de ${filename}:`, error);
        return [];
    }
}

// Parser CSV robuste
function parseCSV(text) {
    const lines = [];
    let currentLine = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentLine += '"';
                i++;
            } else inQuotes = !inQuotes;
        } else if (char === '\n' && !inQuotes) {
            if (currentLine.trim()) lines.push(currentLine);
            currentLine = '';
        } else if (char !== '\r') {
            currentLine += char;
        }
    }
    if (currentLine.trim()) lines.push(currentLine);
    if (!lines.length) return [];

    const headers = parseLine(lines[0]);
    return lines.slice(1).map(line => {
        const values = parseLine(line);
        const row = {};
        headers.forEach((h, i) => row[h] = values[i] || '');
        return row;
    });
}

// Parser une ligne CSV
function parseLine(line) {
    const values = [];
    let currentValue = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentValue += '"';
                i++;
            } else inQuotes = !inQuotes;
        } else if (char === ';' && !inQuotes) {
            values.push(currentValue.trim());
            currentValue = '';
        } else currentValue += char;
    }
    values.push(currentValue.trim());
    return values;
}

// Initialiser les données
async function initData() {
    allData = await loadCSV('../data/data.csv');
    filteredData = [...allData];

    const coordData = await loadCSV('../data/coordonnees.csv');
    coordData.forEach(row => {
        if (row.Lieu && row.Latitude && row.Longitude) {
            coordinates[row.Lieu] = {
                lat: parseFloat(row.Latitude),
                lng: parseFloat(row.Longitude)
            };
        }
    });

    populateFilters();
}

// Remplir les filtres
function populateFilters() {
    const dioceseSelect = document.getElementById('filter-diocese');
    if (dioceseSelect) {
        const dioceses = [...new Set(allData.map(d => d.diocese_origine_fr).filter(Boolean))].sort();
        dioceses.forEach(d => {
            const option = document.createElement('option');
            option.value = d;
            option.textContent = d;
            dioceseSelect.appendChild(option);
        });
    }

    const yearSelect = document.getElementById('filter-year');
    if (yearSelect) {
        const years = [...new Set(allData.map(d => d.annee).filter(Boolean))].sort();
        years.forEach(y => {
            const option = document.createElement('option');
            option.value = y;
            option.textContent = y;
            yearSelect.appendChild(option);
        });
    }

    const resultSelect = document.getElementById('filter-result');
    if (resultSelect) {
        const results = [...new Set(allData.map(d => d.resultat_dispense).filter(Boolean))].sort();
        results.forEach(r => {
            const option = document.createElement('option');
            option.value = r;
            option.textContent = r;
            resultSelect.appendChild(option);
        });
    }
}

// Mettre à jour les stats
function updateStats() {
    const totalCasesEl = document.getElementById('total-cases');
    const totalDiocesesEl = document.getElementById('total-dioceses');
    const totalYearsEl = document.getElementById('total-years');

    if (totalCasesEl) totalCasesEl.textContent = allData.length;
    if (totalDiocesesEl) totalDiocesesEl.textContent = new Set(allData.map(d => d.diocese_origine_fr).filter(Boolean)).size;

    if (totalYearsEl) {
        const years = allData.map(d => {
            const match = String(d.annee).match(/^(\d{3,4})/);
            return match ? parseInt(match[1]) : NaN;
        }).filter(y => !isNaN(y) && y >= 1000 && y <= 2026);

        if (years.length) {
            const minYear = Math.min(...years);
            const maxYear = Math.max(...years);
            totalYearsEl.textContent = `${minYear}-${maxYear}`;
        }
    }
}






// Carte
function initMap() {
    const mapDiv = document.getElementById('map');
    if (!mapDiv) return;

    map = L.map('map').setView([46.5, 2.5], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const dioceseCounts = {};
    allData.forEach(row => {
        const d = row.diocese_origine_fr;
        if (d) dioceseCounts[d] = (dioceseCounts[d] || 0) + 1;
    });

    Object.entries(dioceseCounts).forEach(([diocese, count]) => {
        const coord = coordinates[diocese];
        if (coord) {
            L.circleMarker([coord.lat, coord.lng], {
                radius: Math.min(5 + Math.sqrt(count) * 2, 20),
                fillColor: '#6b2737',
                color: '#c9a961',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.7
            }).addTo(map).bindPopup(`<b>${diocese}</b><br>${count} cas`);
        }
    });
}