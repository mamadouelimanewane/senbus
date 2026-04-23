import L from 'leaflet';
import { lines, stops } from './data/network';

// State
let map: L.Map | null = null;
let currentFilter: 'Tous' | 'DDD' | 'TATA' = 'Tous';
const markersLayer = L.layerGroup();
const routesLayer = L.layerGroup();

// DOM Setup
document.addEventListener('DOMContentLoaded', () => {
    (window as any).switchView = (viewId: string) => {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(`view-${viewId}`)?.classList.add('active');
        
        document.querySelectorAll('.nav-item').forEach(v => v.classList.remove('active'));
        document.querySelector(`.nav-item[data-target="${viewId}"]`)?.classList.add('active');

        if (viewId === 'carte') {
            setTimeout(() => {
                if (!map) initMap();
                else map.invalidateSize();
            }, 100);
        }
    };

    // Filter Buttons
    document.querySelectorAll('.filter-group button, .filter-group-alt button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const el = e.target as HTMLElement;
            el.parentElement?.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            el.classList.add('active');
            currentFilter = el.innerText as any;
            if (el.closest('.filter-group')) {
                // Also update the other filter group to match
                document.querySelectorAll('.filter-group-alt button').forEach(b => {
                    b.classList.toggle('active', b.innerHTML === currentFilter);
                });
            } else {
                 document.querySelectorAll('.filter-group button').forEach(b => {
                    b.classList.toggle('active', b.innerHTML === currentFilter);
                });
            }
            renderMap();
            renderLines();
        });
    });

    renderLines();
    setupSearch();
    
    // Simulate Route Search
    document.getElementById('btn-search-route')?.addEventListener('click', () => {
        const dest = (document.getElementById('input-dest') as HTMLInputElement).value;
        if (dest) {
            document.getElementById('route-result')!.style.display = 'block';
        } else {
            alert('Veuillez entrer une destination.');
        }
    });

    (window as any).startNav = () => {
        alert("Démarrage du GPS vers " + (document.getElementById('input-dest') as HTMLInputElement).value);
    };

    // Init first view
    (window as any).switchView('carte');
});

function initMap() {
    map = L.map('map', { zoomControl: false }).setView([14.7167, -17.4677], 12);
    L.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png').addTo(map);
    markersLayer.addTo(map);
    routesLayer.addTo(map);
    renderMap();
}

function renderMap() {
    if (!map) return;
    markersLayer.clearLayers();
    routesLayer.clearLayers();

    // Show stops
    const pinIcon = L.divIcon({
        className: '',
        html: `<svg width="20" height="20" viewBox="0 0 24 24" fill="var(--primary)" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`,
        iconSize: [20, 20], iconAnchor: [10, 10]
    });

    stops.forEach(stop => {
        if (stop.coords) {
            L.marker(stop.coords as [number, number], { icon: pinIcon })
                .bindPopup(`<b>${stop.name}</b><br>${stop.district}`)
                .addTo(markersLayer);
        }
    });

    // Optionally show a line trajectory if a specific DDD filter is active?
    // For now, this is a clean map of stops as requested by screenshots.
}

function renderLines(searchTerm: string = '') {
    const listDiv = document.getElementById('lines-list');
    const searchDiv = document.getElementById('search-results');
    
    let filtered = lines.filter(l => currentFilter === 'Tous' || l.operatorId === currentFilter);
    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        filtered = lines.filter(l => 
            l.name.toLowerCase().includes(lower) || 
            l.code.toLowerCase().includes(lower) ||
            l.stopIds.some(sid => sid.toLowerCase().includes(lower))
        );
    }

    const html = filtered.map(l => {
        const color = l.operatorId === 'DDD' ? 'var(--primary)' : 'var(--tata-color)';
        // TATA is not in network.ts yet but styling supports it
        return `
            <div class="line-card" onclick="window.switchView('trajet')">
                <div class="line-badge" style="background: ${l.color || color}">${l.code}</div>
                <div class="line-info">
                    <div class="line-name">${l.name}</div>
                    <div class="line-stops">${l.stopIds.length} arrêts</div>
                </div>
                <div class="line-op" style="color: ${color}">${l.operatorId}</div>
            </div>
        `;
    }).join('');

    if (searchTerm && searchDiv) {
        searchDiv.innerHTML = html;
    } else if (listDiv) {
        listDiv.innerHTML = html;
    }
}

function setupSearch() {
    const input = document.getElementById('search-input') as HTMLInputElement;
    if (input) {
        input.addEventListener('input', (e) => {
            renderLines((e.target as HTMLInputElement).value);
        });
    }
}
