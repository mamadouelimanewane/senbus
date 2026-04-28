import L from 'leaflet';
import { lines, stops, buses } from './data/network';
import { DAKAR_LANDMARKS } from './data/landmarks';
import type { Stop, Line, Bus } from './types';

// --- State ---
let map: L.Map | null = null;
let currentView = 'accueil';
let viewHistory: string[] = ['accueil'];
let departCoords: [number, number] | null = null;
let destCoords: [number, number] | null = null;
let pickingMode: 'depart' | 'dest' | null = null;
let markersLayer = L.layerGroup();
let routesLayer = L.layerGroup();
let liveBusesLayer = L.layerGroup();
let activeLineId: string | null = null;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // Nav Navigation
    (window as any).switchView = (viewId: string, pushToHistory: boolean = true) => {
        if (viewId === currentView) return;
        
        if (pushToHistory) {
            viewHistory.push(currentView);
        }

        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(`view-${viewId}`)?.classList.add('active');
        
        document.querySelectorAll('.nav-item').forEach(v => v.classList.remove('active'));
        document.querySelector(`.nav-item[data-target="${viewId}"]`)?.classList.add('active');

        currentView = viewId;
        if (viewId !== 'carte') {
            activeLineId = null;
            routesLayer.clearLayers();
        }

        if (viewId === 'carte') {
            setTimeout(() => {
                if (!map) initMap();
                else map.invalidateSize();
            }, 100);
        }
        
        if (viewId === 'accueil') renderStatusBoard();
    };

    (window as any).goBack = () => {
        if (viewHistory.length > 0) {
            const prev = viewHistory.pop()!;
            (window as any).switchView(prev, false);
        } else {
            (window as any).switchView('accueil', false);
        }
    };

    // Status board filters
    document.querySelectorAll('#status-filters .op-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('#status-filters .op-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            renderStatusBoard(pill.getAttribute('data-op') || 'all');
        });
    });

    renderStatusBoard();
    setupItineraryPlanner();
    setupLiveUpdates();
    setupPredictiveSearch();
    
    // GPS Auto-locate
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            departCoords = [pos.coords.latitude, pos.coords.longitude];
            const input = document.getElementById('input-depart') as HTMLInputElement;
            if (input) input.value = "Ma position actuelle";
        });
    }
}

function setupPredictiveSearch() {
    const inputDepart = document.getElementById('input-depart') as HTMLInputElement;
    const inputDest = document.getElementById('input-dest') as HTMLInputElement;
    const suggDepart = document.getElementById('suggestions-depart')!;
    const suggDest = document.getElementById('suggestions-dest')!;

    const handleInput = (input: HTMLInputElement, container: HTMLElement, type: 'depart' | 'dest') => {
        const value = input.value.toLowerCase();
        container.innerHTML = '';
        if (value.length < 2) return;

        const filtered = [
            ...stops.map(s => ({ name: s.name, coords: s.coords, type: 'Arrêt' })),
            ...DAKAR_LANDMARKS.map(l => ({ name: l.name, coords: l.coords, type: l.type }))
        ].filter(item => item.name.toLowerCase().includes(value)).slice(0, 5);

        filtered.forEach(item => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.innerHTML = `<strong>${item.name}</strong> <small>(${item.type})</small>`;
            div.onclick = () => {
                input.value = item.name;
                container.innerHTML = '';
                if (type === 'depart') {
                    departCoords = item.coords as [number, number] || null;
                } else {
                    destCoords = item.coords as [number, number] || null;
                }
            };
            container.appendChild(div);
        });
    };

    inputDepart?.addEventListener('input', () => handleInput(inputDepart, suggDepart, 'depart'));
    inputDest?.addEventListener('input', () => handleInput(inputDest, suggDest, 'dest'));

    document.addEventListener('click', (e) => {
        if (!(e.target as HTMLElement).closest('.input-field')) {
            suggDepart.innerHTML = '';
            suggDest.innerHTML = '';
        }
    });
}

function resolveCoords(val: string): [number, number] | null {
    const clean = val.trim().toLowerCase();
    const found = stops.find(s => s.name.toLowerCase() === clean) || 
                  DAKAR_LANDMARKS.find(l => l.name.toLowerCase() === clean);
    if (found && found.coords) return found.coords as [number, number];
    
    const partial = stops.find(s => s.name.toLowerCase().includes(clean)) || 
                    DAKAR_LANDMARKS.find(l => l.name.toLowerCase().includes(clean));
    if (partial && partial.coords) return partial.coords as [number, number];
    
    return null;
}

// --- Status Board (TfL Style) ---
function renderStatusBoard(filter: string = 'all') {
    const board = document.getElementById('status-board');
    if (!board) return;

    const statuses = [
        { label: 'Service normal', class: 'status-normal' },
        { label: 'Légers retards', class: 'status-delay-light' },
        { label: 'Retards importants', class: 'status-delay-severe' }
    ];

    const filteredLines = filter === 'all' ? lines : lines.filter(l => l.operatorId === filter);

    board.innerHTML = filteredLines.slice(0, 20).map((line, idx) => {
        const status = idx === 1 ? statuses[1] : (idx === 5 ? statuses[2] : statuses[0]);
        return `
            <div class="status-card" onclick="window.showLineOnMap('${line.id}')">
                <div class="line-badge-lg" style="background: ${line.color}">${line.code}</div>
                <div class="status-info">
                    <div class="line-name" style="font-size:12px;">${line.name}</div>
                    <div class="status-label ${status.class}">
                        <div class="status-dot"></div>
                        ${status.label}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// --- Map Logic ---
function initMap() {
    map = L.map('map', { zoomControl: false }).setView([14.7167, -17.4677], 12);
    L.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    markersLayer.addTo(map);
    routesLayer.addTo(map);
    liveBusesLayer.addTo(map);

    renderStopsOnMap();
    
    map.on('click', (e: L.LeafletMouseEvent) => {
        if (pickingMode) {
            const { lat, lng } = e.latlng;
            const markerColor = pickingMode === 'depart' ? '#34c759' : '#ff3b30';
            const markerLabel = pickingMode === 'depart' ? '📍 Départ' : '🏁 Arrivée';

            // Add feedback marker
            L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'pick-marker',
                    html: `<div style="background:${markerColor}; color:white; padding:5px 10px; border-radius:20px; font-weight:800; font-size:12px; white-space:nowrap; border:2px solid white; box-shadow:0 4px 10px rgba(0,0,0,0.3);">${markerLabel}</div>`,
                    iconAnchor: [30, 0]
                })
            }).addTo(routesLayer);

            if (pickingMode === 'depart') {
                departCoords = [lat, lng];
                (document.getElementById('input-depart') as HTMLInputElement).value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            } else {
                destCoords = [lat, lng];
                (document.getElementById('input-dest') as HTMLInputElement).value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            }
            pickingMode = null;
            
            // Auto-switch back to planner after a short delay to see the point
            setTimeout(() => {
                (window as any).switchView('trajet');
            }, 800);
        }
    });
}

function renderStopsOnMap() {
    markersLayer.clearLayers();
    
    // Custom "Pointe surmontée d'une boule rouge" icon
    const stopIcon = L.divIcon({
        className: 'stop-marker-custom',
        html: `
            <div class="pin-container">
                <div class="pin-ball"></div>
                <div class="pin-stalk"></div>
            </div>
        `,
        iconSize: [20, 30],
        iconAnchor: [10, 30]
    });

    stops.forEach(stop => {
        const marker = L.marker(stop.coords as [number, number], { icon: stopIcon })
            .bindPopup(`<strong>${stop.name}</strong><br>${stop.district}`)
            .addTo(markersLayer);
            
        marker.on('click', () => {
            if (pickingMode) return; // Let map click handle picking
            (window as any).showStationInfo(stop.id);
        });
    });
}

function showStationInfo(stopId: string) {
    const stop = stops.find(s => s.id === stopId);
    if (!stop) return;

    const sheet = document.getElementById('station-info-sheet');
    if (!sheet) return;

    // Find upcoming buses for this stop
    const arrivals = buses.filter(b => {
        const line = lines.find(l => l.id === b.lineId);
        return line && line.stopIds.includes(stop.id);
    }).map(b => {
        const line = lines.find(l => l.id === b.lineId)!;
        const stopIdx = line.stopIds.indexOf(stop.id);
        const busIdx = Math.floor(b.progress * (line.stopIds.length - 1));
        
        let diff = stopIdx - busIdx;
        if (diff < 0) diff += line.stopIds.length; // Approximate for loop/return
        
        const minutes = Math.max(1, Math.round(diff * 4 / b.speedFactor));
        return { line, minutes, b };
    }).sort((a, b) => a.minutes - b.minutes).slice(0, 5);

    sheet.style.display = 'block';
    sheet.innerHTML = `
                <p style="font-size:13px; color:#8e8e93;">${stop.district} • Dakar</p>
            </div>
            <button onclick="this.parentElement.parentElement.style.display='none'" style="background:none; border:none; font-size:20px;">✕</button>
        </div>
        
        <div class="countdown-list">
            ${passages.map(p => `
                <div class="countdown-item">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div class="line-badge-lg" style="background:${p.color}; width:36px; height:36px; font-size:14px; border-radius:8px;">${p.code}</div>
                        <div style="font-weight:700;">Direction ...</div>
                    </div>
                    <div class="countdown-time ${p.time <= 2 ? 'imminent' : ''}">
                        ${p.time === 0 ? 'À quai' : p.time + ' min'}
                    </div>
                </div>
            `).join('')}
        </div>
        
        <button class="btn-action" style="margin-top:20px; padding:12px;" onclick="window.startNavFromStop('${stop.id}')">Itinéraire d'ici</button>
    `;
}

// --- Itinerary Logic ---
function setupItineraryPlanner() {
    const btn = document.getElementById('btn-search-route');
    btn?.addEventListener('click', () => {
        calculateItinerary();
    });

    // Preferences
    document.querySelectorAll('.preference-pills .pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
            const el = e.target as HTMLElement;
            el.parentElement?.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            el.classList.add('active');
        });
    });
}

function getDistance(c1: [number, number], c2: [number, number]) {
    const R = 6371;
    const dLat = (c2[0] - c1[0]) * Math.PI / 180;
    const dLon = (c2[1] - c1[1]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(c1[0] * Math.PI / 180) * Math.cos(c2[0] * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function calculateFare(dist: number, isTransfer: boolean): number {
    if (isTransfer) return 500;
    if (dist < 5) return 150;
    if (dist < 15) return 300;
    return 500;
}

function calculateItinerary() {
    const inputDepart = document.getElementById('input-depart') as HTMLInputElement;
    const inputDest = document.getElementById('input-dest') as HTMLInputElement;

    if (!departCoords) departCoords = resolveCoords(inputDepart.value);
    if (!destCoords) destCoords = resolveCoords(inputDest.value);

    if (!departCoords || !destCoords) {
        alert("Emplacement non reconnu. Sélectionnez une suggestion ou utilisez la carte 🗺️.");
        return;
    }

    // Find nearest stops
    const startStop = stops.reduce((prev, curr) => getDistance(departCoords!, curr.coords as [number, number]) < getDistance(departCoords!, prev.coords as [number, number]) ? curr : prev);
    const endStop = stops.reduce((prev, curr) => getDistance(destCoords!, curr.coords as [number, number]) < getDistance(destCoords!, prev.coords as [number, number]) ? curr : prev);

    const resultDiv = document.getElementById('route-result')!;
    const container = document.getElementById('route-suggestions-container')!;
    resultDiv.style.display = 'block';
    container.innerHTML = '';

    // 1. Search for direct lines
    const directLines = lines.filter(l => {
        const startIdx = l.stopIds.indexOf(startStop.id);
        const endIdx = l.stopIds.indexOf(endStop.id);
        return startIdx !== -1 && endIdx !== -1 && startIdx < endIdx;
    });

    let resultsHtml = '';

    if (directLines.length > 0) {
        resultsHtml = directLines.map(line => {
            const dist = getDistance(startStop.coords as [number, number], endStop.coords as [number, number]);
            const duration = Math.round(dist * 4 + 10);
            const fare = calculateFare(dist, false);
            return `
                <div class="result-card">
                    <div class="result-header">
                        <div class="time-info">${duration} min <span style="font-size:12px; color:#8e8e93; font-weight:600;">(Est. ${dist.toFixed(1)} km)</span></div>
                        <div class="dist-info" style="color:var(--success); font-weight:800;">${fare} FCFA</div>
                    </div>
                    <div class="dist-info">Ligne ${line.code} • Direct</div>
                    <div class="route-segments">
                        <div class="segment segment-walk">🚶 ${Math.round(getDistance(departCoords!, startStop.coords as [number, number]) * 15)} min</div>
                        <div class="segment" style="background:${line.color || 'var(--primary)'}">🚌 ${line.code}</div>
                        <div class="segment segment-walk">🚶 ${Math.round(getDistance(destCoords!, endStop.coords as [number, number]) * 15)} min</div>
                    </div>
                    <button class="btn-action" style="padding:10px; font-size:14px;" onclick="window.startLiveNavigation('${line.code}', '${startStop.id}', '${endStop.id}')">Démarrer</button>
                </div>
            `;
        }).join('');
    } else {
        // 2. Search for 1 Transfer (L1 -> Stop X -> L2)
        const startLines = lines.filter(l => l.stopIds.includes(startStop.id));
        const endLines = lines.filter(l => l.stopIds.includes(endStop.id));
        
        const transferOptions: any[] = [];
        
        for (const l1 of startLines) {
            for (const l2 of endLines) {
                if (l1.id === l2.id) continue;
                
                // Find potential transfer points (common stops or nearby stops)
                for (const sid1 of l1.stopIds) {
                    const idx1 = l1.stopIds.indexOf(startStop.id);
                    const idxCommon1 = l1.stopIds.indexOf(sid1);
                    if (idxCommon1 <= idx1) continue;

                    const s1 = stops.find(s => s.id === sid1)!;

                    for (const sid2 of l2.stopIds) {
                        const idx2 = l2.stopIds.indexOf(endStop.id);
                        const idxCommon2 = l2.stopIds.indexOf(sid2);
                        if (idxCommon2 >= idx2) continue;

                        const s2 = stops.find(s => s.id === sid2)!;
                        
                        // If same stop OR stops within 300m (Hub logic)
                        const distBetween = getDistance(s1.coords as [number, number], s2.coords as [number, number]);
                        if (sid1 === sid2 || distBetween < 0.3) {
                            const dist1 = getDistance(startStop.coords as [number, number], s1.coords as [number, number]);
                            const dist2 = getDistance(s2.coords as [number, number], endStop.coords as [number, number]);
                            
                            transferOptions.push({ 
                                l1, l2, 
                                s1, s2,
                                totalDist: dist1 + dist2 + distBetween,
                                isWalk: distBetween > 0.05
                            });
                        }
                    }
                }
            }
        }

        // Sort by total distance and take top 3
        const sortedTransfers = transferOptions.sort((a, b) => a.totalDist - b.totalDist).slice(0, 3);

        if (sortedTransfers.length > 0) {
            resultsHtml = sortedTransfers.map(opt => {
                const duration = Math.round(opt.totalDist * 4 + (opt.isWalk ? 25 : 15));
                const fare = calculateFare(opt.totalDist, true);
                
                return `
                    <div class="result-card" style="border-left-color: var(--secondary)">
                        <div class="result-header">
                            <div class="time-info">${duration} min <span style="font-size:12px; color:#8e8e93; font-weight:600;">(Via ${opt.s1.name})</span></div>
                            <div class="dist-info" style="color:var(--success); font-weight:800;">${fare} FCFA</div>
                        </div>
                        <div class="dist-info">Lignes ${opt.l1.code} + ${opt.l2.code}</div>
                        <div class="route-segments">
                            <div class="segment" style="background:${opt.l1.color}">🚌 ${opt.l1.code}</div>
                            <div style="font-size:12px; font-weight:800; color:#8e8e93;">${opt.isWalk ? '🚶' : '🔄'}</div>
                            <div class="segment" style="background:${opt.l2.color}">🚌 ${opt.l2.code}</div>
                        </div>
                        <button class="btn-action" style="background:var(--secondary); padding:10px; font-size:14px;" 
                                onclick="window.startTransferNav('${opt.l1.id}', '${startStop.id}', '${opt.s1.id}', '${opt.l2.id}', '${opt.s2.id}', '${endStop.id}')">
                            Démarrer (${opt.isWalk ? 'Transfert à pied' : 'Correspondance'})
                        </button>
                    </div>
                `;
            }).join('');
        } else {
            resultsHtml = `<div class="result-card" style="border-left-color:var(--danger)">Aucun itinéraire trouvé. Essayez de choisir des points plus proches des axes principaux.</div>`;
        }
    }

    container.innerHTML = resultsHtml;
}

// --- Live Updates & Navigation ---
function setupLiveUpdates() {
    setInterval(() => {
        if (currentView === 'carte' && map) {
            updateLiveBuses();
        }
    }, 3000);
}

function updateLiveBuses() {
    liveBusesLayer.clearLayers();
    const busIcon = L.divIcon({
        className: 'bus-marker',
        html: `<div style="background:var(--primary); color:white; padding:4px 8px; border-radius:6px; font-weight:800; font-size:10px; box-shadow:0 4px 10px rgba(0,0,0,0.2); border:2px solid white;">🚌</div>`,
        iconAnchor: [15, 15]
    });

    // Filter buses if in active navigation
    const busesToShow = activeLineId ? buses.filter(b => b.lineId === activeLineId) : buses;

    // Animate buses
    busesToShow.forEach(bus => {
        bus.progress += 0.01 * bus.speedFactor;
        if (bus.progress > 1) bus.progress = 0;
        
        const line = lines.find(l => l.id === bus.lineId);
        if (!line) return;
        
        const stopCoords = line.stopIds.map(sid => stops.find(s => s.id === sid)?.coords).filter(c => c) as [number, number][];
        if (stopCoords.length < 2) return;
        
        // Linear interpolation for demo
        const idx = Math.floor(bus.progress * (stopCoords.length - 1));
        const subProgress = (bus.progress * (stopCoords.length - 1)) - idx;
        const p1 = stopCoords[idx];
        const p2 = stopCoords[idx + 1];
        
        let lat = p1[0] + (p2[0] - p1[0]) * subProgress;
        let lng = p1[1] + (p2[1] - p1[1]) * subProgress;
        
        // --- DEFINITIVE DAKAR LAND MASK (PARANOID MODE) ---
        // 1. Baie de Hann & South Plateau (East & South)
        // Everything east of the main Plateau/Highway line between Lat 14.60 and 14.75 is water
        if (lat < 14.750 && lng > -17.435 && lng < -17.320) {
            lng = -17.442; // Force onto land (Highway/Plateau)
        }

        // 2. Deep South (Below the island)
        if (lat < 14.655) {
            lat = 14.665; // Push back up into the Plateau
        }

        // 3. Corniche Ouest (West)
        if (lat < 14.730 && lng < -17.468) {
            lng = -17.465; 
        }

        // 4. Almadies/Ngor (North-West)
        if (lat > 14.745 && lng < -17.515) {
            lng = -17.510;
        }

        L.marker([lat, lng], { icon: busIcon }).addTo(liveBusesLayer);
    });
}

// --- Global Actions ---
(window as any).startLiveNavigation = (lineCode: string, startStopId?: string, endStopId?: string) => {
    // Find line by code
    const line = lines.find(l => l.code === lineCode);
    if (line) {
        activeLineId = line.id;
        (window as any).showLineOnMap(line.id, startStopId, endStopId);
    }

    (window as any).switchView('carte');
    // Simulate real-time toast
    setTimeout(() => {
        const toast = document.createElement('div');
        toast.style.cssText = "position:fixed; top:30px; left:20px; right:20px; background:white; padding:20px; border-radius:16px; box-shadow:var(--shadow-lg); z-index:10000; border-left:6px solid var(--success); display:flex; align-items:center; gap:15px; animation:fadeIn 0.5s ease-out;";
        toast.innerHTML = `
            <div style="font-size:30px;">🚌</div>
            <div>
                <div style="font-weight:800;">Ligne ${lineCode} arrive dans 3 min</div>
                <div style="font-size:12px; color:#8e8e93;">Dépêchez-vous ! 400m de marche (5 min)</div>
            </div>
        `;
        document.body.appendChild(toast);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        setTimeout(() => toast.remove(), 5000);
    }, 1000);
};

(window as any).showLineOnMap = async (lineId: string, startStopId?: string, endStopId?: string) => {
    const line = lines.find(l => l.id === lineId);
    if (!line) return;
    activeLineId = lineId;
    (window as any).switchView('carte');
    
    routesLayer.clearLayers();
    
    // Extract segment if specified
    let stopIds = [...line.stopIds];
    if (startStopId && endStopId) {
        let sIdx = stopIds.indexOf(startStopId);
        let eIdx = stopIds.indexOf(endStopId, sIdx); // Search end after start
        
        if (sIdx !== -1 && eIdx !== -1 && eIdx >= sIdx) {
            stopIds = stopIds.slice(sIdx, eIdx + 1);
        }
    }

    const lineStops = stopIds.map(id => stops.find(s => s.id === id)).filter(s => s && s.coords) as Stop[];
    const coords = lineStops.map(s => s.coords as [number, number]);

    if (coords.length < 2) return;

    // Direct line as instant placeholder
    const polyline = L.polyline(coords, { color: line.color || 'var(--primary)', weight: 8, opacity: 0.5, dashArray: '10, 10' }).addTo(routesLayer);
    map?.fitBounds(polyline.getBounds(), { padding: [50, 50] });

    // Fetch real road geometry from OSRM
    try {
        const waypoints = lineStops.map(s => `${s.coords![1]},${s.coords![0]}`).join(';');
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson&continue_straight=true`;
        
        const res = await fetch(osrmUrl);
        const data = await res.json();
        
        if (data.routes && data.routes[0]) {
            routesLayer.clearLayers();
            const roadCoords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
            L.polyline(roadCoords, { 
                color: line.color || 'var(--primary)', 
                weight: 8, 
                opacity: 0.9,
                lineJoin: 'round'
            }).addTo(routesLayer);
        }
    } catch (e) {
        console.error("OSRM Routing Error:", e);
        // Fallback to solid direct lines if OSRM fails
        polyline.setStyle({ opacity: 0.9, dashArray: '' });
    }
};

(window as any).startPicking = (mode: 'depart' | 'dest') => {
    pickingMode = mode;
    (window as any).switchView('carte');
    // Show a small hint
    const hint = document.createElement('div');
    hint.style.cssText = "position:absolute; bottom:120px; left:50%; transform:translateX(-50%); background:var(--dark); color:white; padding:12px 24px; border-radius:var(--radius-full); z-index:2000; font-weight:700; font-size:14px;";
    hint.innerText = `Cliquez sur la carte pour définir le ${mode === 'depart' ? 'départ' : 'point d\'arrivée'}`;
    document.getElementById('view-carte')?.appendChild(hint);
    setTimeout(() => hint.remove(), 4000);
};

(window as any).recenterMap = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            map?.setView([pos.coords.latitude, pos.coords.longitude], 15);
        });
    } else {
        map?.setView([14.7167, -17.4677], 12);
    }
};

(window as any).startNavFromStop = (stopId: string) => {
    const stop = stops.find(s => s.id === stopId);
    if (stop) {
        departCoords = stop.coords as [number, number];
        (document.getElementById('input-depart') as HTMLInputElement).value = stop.name;
        (window as any).switchView('trajet');
    }
};

(window as any).startTransferNav = async (l1Id: string, s1Id: string, e1Id: string, l2Id: string, s2Id: string, e2Id: string) => {
    (window as any).switchView('carte');
    routesLayer.clearLayers();
    
    // Draw first segment
    await (window as any).drawRouteSegment(l1Id, s1Id, e1Id, true);
    // Draw second segment
    await (window as any).drawRouteSegment(l2Id, s2Id, e2Id, false);
    
    activeLineId = l1Id; // For live bus focus (start with first line)
};

(window as any).drawRouteSegment = async (lineId: string, startStopId: string, endStopId: string, clear: boolean) => {
    const line = lines.find(l => l.id === lineId);
    if (!line) return;
    
    if (clear) routesLayer.clearLayers();
    
    const stopIds = line.stopIds;
    const sIdx = stopIds.indexOf(startStopId);
    const eIdx = stopIds.indexOf(endStopId);
    const segmentStopIds = stopIds.slice(sIdx, eIdx + 1);

    const lineStops = segmentStopIds.map(id => stops.find(s => s.id === id)).filter(s => s && s.coords) as Stop[];
    const coords = lineStops.map(s => s.coords as [number, number]);

    if (coords.length < 2) return;

    try {
        const waypoints = lineStops.map(s => `${s.coords![1]},${s.coords![0]}`).join(';');
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`;
        const res = await fetch(osrmUrl);
        const data = await res.json();
        
        if (data.routes && data.routes[0]) {
            const roadCoords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
            L.polyline(roadCoords, { 
                color: line.color || (clear ? 'var(--primary)' : 'var(--secondary)'), 
                weight: 8, 
                opacity: 0.9,
                lineJoin: 'round'
            }).addTo(routesLayer);
            
            if (clear) map?.fitBounds(L.polyline(roadCoords).getBounds(), { padding: [50, 50] });
        }
    } catch (e) {
        L.polyline(coords, { color: line.color || 'var(--primary)', weight: 8 }).addTo(routesLayer);
    }
};

(window as any).simulateTrajet = (type: 'DDD' | 'TATA') => {
    const inputDepart = document.getElementById('input-depart') as HTMLInputElement;
    const inputDest = document.getElementById('input-dest') as HTMLInputElement;
    
    if (type === 'DDD') {
        inputDepart.value = "Ouakam";
        inputDest.value = "Place Leclerc";
    } else {
        inputDepart.value = "Pikine Icotaf";
        inputDest.value = "Marché Sandaga";
    }
    
    // Trigger resolution
    departCoords = resolveCoords(inputDepart.value);
    destCoords = resolveCoords(inputDest.value);
    
    calculateItinerary();
};
