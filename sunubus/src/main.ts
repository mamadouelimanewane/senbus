// ============================================================
// SunuBus — main.ts  v5.0
// Application Voyageur — point d'entrée principal
// ============================================================

import L from 'leaflet';
import {
  LINES, LINE_BY_ID, ALL_STOPS, STOPS,
  generateBusPositions, searchNetwork, findRoutes,
  nearbyStops, haversine,
  formatDuration, formatTime, formatDist,
  type BusLine, type Stop, type BusPosition, type Route, type RouteStep,
} from './data';
import {
  getState, toggleFavoriteLine, toggleFavoriteStop,
  isFavoriteLine, isFavoriteStop, pushSearch, setPreference,
  setUserPosition, clearAll,
} from './store';

// ============================================================
// 1. NAVIGATION ENTRE VUES
// ============================================================
type ViewName = 'carte' | 'trajet' | 'lignes' | 'chercher' | 'profil';
let currentView: ViewName = 'carte';

function switchView(name: ViewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${name}`)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b => {
    b.classList.toggle('active', (b as HTMLElement).dataset.target === name);
  });
  currentView = name;

  // Fermer le panneau de ligne si ouvert
  document.getElementById('line-panel')?.classList.add('hidden');

  // Lazy load
  if (name === 'lignes')   renderLines();
  if (name === 'chercher') renderNearby();
  if (name === 'profil')   renderProfile();

  // Garder la carte active en arrière-plan
  if (name === 'carte') setTimeout(() => map?.invalidateSize(), 200);
}
(window as any).switchView = switchView;

// ============================================================
// 2. CARTE LEAFLET
// ============================================================
let map: L.Map;
let userMarker: L.Marker | null = null;
let busMarkers: L.Marker[] = [];
const polylineGroup = L.layerGroup();
let currentFilter: 'all' | 'ddd' | 'tata' = 'all';
let highlightLine: BusLine | null = null;
let highlightLayer: L.Polyline | null = null;
let pickMode: 'depart' | 'dest' | null = null;

function initMap() {
  map = L.map('map', {
    zoomControl: false,
    attributionControl: false,
  }).setView([14.7, -17.45], 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OSM',
  }).addTo(map);

  L.control.attribution({ prefix: false, position: 'bottomleft' })
    .addAttribution('© OSM | SunuBus').addTo(map);

  polylineGroup.addTo(map);

  // Click sur carte = sélection si pickMode actif
  map.on('click', (e: L.LeafletMouseEvent) => {
    if (pickMode) {
      const { lat, lng } = e.latlng;
      const closest = ALL_STOPS
        .map(s => ({ ...s, d: haversine(lat, lng, s.lat, s.lng) }))
        .sort((a, b) => a.d - b.d)[0];
      const input = document.getElementById(
        pickMode === 'depart' ? 'input-depart' : 'input-dest'
      ) as HTMLInputElement;
      if (input) input.value = closest.name;
      pickMode = null;
      switchView('trajet');
      showToast(`📍 ${closest.name} sélectionné`);
    }
  });

  drawNetwork();
  startBusSimulation();
  setBadge('Réseau actif · simulation');
}

function drawNetwork() {
  polylineGroup.clearLayers();

  const filtered = LINES.filter(l => currentFilter === 'all' || l.operator === currentFilter);

  // Tracés des lignes
  for (const line of filtered) {
    const points: [number, number][] = line.stops.map(s => [s.lat, s.lng]);
    const isHighlight = highlightLine?.id === line.id;
    const poly = L.polyline(points, {
      color: line.color,
      weight: isHighlight ? 5 : 3,
      opacity: highlightLine && !isHighlight ? 0.25 : 0.7,
      dashArray: line.operator === 'tata' ? '6,4' : undefined,
    });
    poly.on('click', () => selectLine(line));
    poly.bindTooltip(`<strong>Ligne ${line.number}</strong><br>${line.name}`, {
      sticky: true, direction: 'top'
    });
    polylineGroup.addLayer(poly);
  }

  // Arrêts
  const drawnStops = new Set<string>();
  for (const line of filtered) {
    for (const stop of line.stops) {
      if (drawnStops.has(stop.id)) continue;
      drawnStops.add(stop.id);
      const m = L.circleMarker([stop.lat, stop.lng], {
        radius: 4,
        fillColor: '#fff',
        color: '#0F6E56',
        weight: 2,
        fillOpacity: 1,
      });
      m.bindPopup(`
        <strong>${stop.name}</strong><br>
        <span style="font-size:12px;color:#666">
          ${stop.lines.length} ligne${stop.lines.length > 1 ? 's' : ''} : ${stop.lines.join(', ')}
        </span>
      `);
      polylineGroup.addLayer(m);
    }
  }
}

function selectLine(line: BusLine) {
  highlightLine = line;
  drawNetwork();
  showLinePanel(line);

  // Zoom sur la ligne
  const bounds = L.latLngBounds(line.stops.map(s => [s.lat, s.lng] as [number, number]));
  map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
}

function showLinePanel(line: BusLine) {
  const panel   = document.getElementById('line-panel')!;
  const content = document.getElementById('line-panel-content')!;
  const fav     = isFavoriteLine(line.id);

  content.innerHTML = `
    <div class="lp-header">
      <div class="lp-badge ${line.operator}">${line.number}</div>
      <div style="flex:1;min-width:0;">
        <div class="lp-title">${line.name}</div>
        <div class="lp-subtitle">${line.operator.toUpperCase()} · ${line.stops.length} arrêts · toutes les ${line.frequency_min} min · ${line.tarif_fcfa} FCFA</div>
      </div>
      <button class="fav-btn ${fav ? 'starred' : ''}" id="lp-fav">★</button>
    </div>
    <div class="lp-actions">
      <button class="lp-btn" id="lp-trajet">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 22l10-3 10 3L12 2z"/></svg>
        Trajet
      </button>
      <button class="lp-btn" id="lp-share">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        Partager
      </button>
      <button class="lp-btn" id="lp-close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        Fermer
      </button>
    </div>
    <div class="lp-stops-title">${line.stops.length} arrêts — terminus à terminus</div>
    <div class="lp-stops">
      ${line.stops.map((s, i) => `
        <div class="lp-stop-row">
          <div class="stop-circle ${i === 0 ? 'first' : ''} ${i === line.stops.length - 1 ? 'last' : ''}"></div>
          <span>${s.name}</span>
        </div>
      `).join('')}
    </div>
  `;

  panel.classList.remove('hidden');

  document.getElementById('lp-fav')?.addEventListener('click', e => {
    e.stopPropagation();
    const isFav = toggleFavoriteLine(line.id);
    (e.currentTarget as HTMLElement).classList.toggle('starred', isFav);
    showToast(isFav ? '⭐ Ajouté aux favoris' : 'Retiré des favoris');
  });

  document.getElementById('lp-trajet')?.addEventListener('click', () => {
    const input = document.getElementById('input-dest') as HTMLInputElement;
    if (input) input.value = line.terminus_b;
    panel.classList.add('hidden');
    switchView('trajet');
  });

  document.getElementById('lp-share')?.addEventListener('click', () => {
    const text = `Ligne ${line.number} — ${line.name} (SunuBus)`;
    if ((navigator as any).share) (navigator as any).share({ title: 'SunuBus', text });
    else { navigator.clipboard?.writeText(text); showToast('🔗 Copié dans le presse-papier'); }
  });

  document.getElementById('lp-close')?.addEventListener('click', () => {
    panel.classList.add('hidden');
    highlightLine = null;
    drawNetwork();
  });
}

// ============================================================
// 3. SIMULATION POSITIONS BUS
// ============================================================
let busSimTimer: number | null = null;
let positions: BusPosition[] = [];

function startBusSimulation() {
  positions = generateBusPositions();
  refreshBusMarkers();
  busSimTimer = window.setInterval(() => {
    positions = positions.map(p => ({
      ...p,
      lat: p.lat + (Math.random() - 0.5) * 0.0008,
      lng: p.lng + (Math.random() - 0.5) * 0.0008,
      updated: new Date(),
    }));
    refreshBusMarkers();
  }, 4000);
}

function refreshBusMarkers() {
  busMarkers.forEach(m => map.removeLayer(m));
  busMarkers = [];

  const filtered = positions.filter(p =>
    currentFilter === 'all' || p.operator === currentFilter
  );

  for (const p of filtered) {
    const icon = L.divIcon({
      className: `bus-marker-icon ${p.operator}`,
      iconSize: [14, 14],
    });
    const marker = L.marker([p.lat, p.lng], { icon });
    marker.bindPopup(`
      <strong>${p.busId}</strong><br>
      Ligne ${LINE_BY_ID[p.lineId]?.number ?? '?'}<br>
      <span style="font-size:12px;color:#666">
        Prochain : ${p.nextStop}<br>
        ${Math.round(p.speed_kmh)} km/h
      </span>
    `);
    marker.addTo(map);
    busMarkers.push(marker);
  }
}

// ============================================================
// 4. GÉOLOCALISATION
// ============================================================
async function locateUser(): Promise<void> {
  return new Promise(resolve => {
    if (!navigator.geolocation) { setBadge('Géoloc indisponible'); return resolve(); }
    setBadge('📍 Localisation…');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        setUserPosition(latitude, longitude);
        showUserOnMap(latitude, longitude);
        setBadge('📍 Position détectée');
        resolve();
      },
      _err => {
        // Fallback : Plateau Dakar
        setUserPosition(14.6928, -17.4467);
        showUserOnMap(14.6928, -17.4467);
        setBadge('📍 Position par défaut (Plateau)');
        resolve();
      },
      { timeout: 8000, maximumAge: 30000, enableHighAccuracy: true }
    );
  });
}

function showUserOnMap(lat: number, lng: number) {
  if (userMarker) map.removeLayer(userMarker);
  const icon = L.divIcon({
    className: '',
    html: `<div style="
      width:18px;height:18px;background:#185FA5;
      border:3px solid white;border-radius:50%;
      box-shadow:0 0 0 6px rgba(24,95,165,.25);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
  userMarker = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(map);
}

// ============================================================
// 5. VUE LIGNES
// ============================================================
let linesFilter: 'all' | 'ddd' | 'tata' = 'all';

function renderLines() {
  const list  = document.getElementById('lines-list')!;
  const badge = document.getElementById('lines-count-badge')!;

  const filtered = LINES.filter(l => linesFilter === 'all' || l.operator === linesFilter);
  badge.textContent = `${filtered.length} ligne${filtered.length > 1 ? 's' : ''}`;

  list.innerHTML = filtered.map(l => {
    const fav = isFavoriteLine(l.id);
    return `
      <div class="line-item" data-line-id="${l.id}">
        <div class="line-badge ${l.operator}">${l.number}</div>
        <div class="line-info">
          <div class="line-name">${l.name}</div>
          <div class="line-route">${l.terminus_a} → ${l.terminus_b}</div>
          <div class="line-stops">${l.stops.length} arrêts · ${l.frequency_min}' · ${l.tarif_fcfa} FCFA</div>
        </div>
        <button class="fav-btn ${fav ? 'starred' : ''}" data-fav-line="${l.id}">★</button>
      </div>
    `;
  }).join('');

  list.querySelectorAll<HTMLElement>('.line-item').forEach(el => {
    el.addEventListener('click', e => {
      const target = e.target as HTMLElement;
      if (target.dataset.favLine) return;
      const id = el.dataset.lineId!;
      const line = LINE_BY_ID[id];
      switchView('carte');
      setTimeout(() => selectLine(line), 200);
    });
  });

  list.querySelectorAll<HTMLElement>('[data-fav-line]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.dataset.favLine!;
      const isFav = toggleFavoriteLine(id);
      btn.classList.toggle('starred', isFav);
      showToast(isFav ? '⭐ Ajouté aux favoris' : 'Retiré');
    });
  });
}

// ============================================================
// 6. RECHERCHE & ARRÊTS PROCHES
// ============================================================
function renderNearby() {
  const container = document.getElementById('nearby-stops')!;
  const pos = getState().user_position;

  if (!pos) {
    container.innerHTML = `<div class="loading-row">Détection de la position…</div>`;
    locateUser().then(() => renderNearby());
    return;
  }

  const stops = nearbyStops(pos.lat, pos.lng, 2000);
  if (stops.length === 0) {
    container.innerHTML = `<div class="empty-state">Aucun arrêt à proximité.</div>`;
    return;
  }

  container.innerHTML = stops.map(s => `
    <div class="stop-item" data-stop-id="${s.id}">
      <div class="stop-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
      <div style="flex:1;min-width:0">
        <div class="stop-name">${s.name}</div>
        <div class="stop-meta">${s.lines.length} ligne${s.lines.length>1?'s':''} : ${s.lines.slice(0,3).join(', ')}</div>
      </div>
      <span class="stop-dist">${formatDist(s.dist)}</span>
    </div>
  `).join('');

  container.querySelectorAll<HTMLElement>('.stop-item').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.stopId!;
      const stop = STOPS[id];
      if (stop) {
        switchView('carte');
        setTimeout(() => map.flyTo([stop.lat, stop.lng], 16), 200);
      }
    });
  });

  renderFavorites();
}

function renderFavorites() {
  const list = document.getElementById('favorites-list')!;
  const { favorites_lines, favorites_stops } = getState();

  if (favorites_lines.length === 0 && favorites_stops.length === 0) {
    list.innerHTML = `<div class="empty-state">Aucun favori pour l'instant.<br>Étoilez une ligne ou un arrêt.</div>`;
    return;
  }

  let html = '';
  for (const id of favorites_lines) {
    const l = LINE_BY_ID[id];
    if (!l) continue;
    html += `
      <div class="stop-item" data-fav-line-click="${l.id}">
        <div class="line-badge ${l.operator}" style="min-width:36px;height:36px;font-size:11px">${l.number}</div>
        <div style="flex:1;min-width:0">
          <div class="stop-name">${l.name}</div>
          <div class="stop-meta">Ligne · ${l.terminus_a} → ${l.terminus_b}</div>
        </div>
      </div>
    `;
  }
  for (const id of favorites_stops) {
    const s = STOPS[id];
    if (!s) continue;
    html += `
      <div class="stop-item" data-fav-stop-click="${s.id}">
        <div class="stop-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <div style="flex:1;min-width:0">
          <div class="stop-name">${s.name}</div>
          <div class="stop-meta">Arrêt · ${s.lines.length} lignes</div>
        </div>
      </div>
    `;
  }
  list.innerHTML = html;

  list.querySelectorAll<HTMLElement>('[data-fav-line-click]').forEach(el => {
    el.addEventListener('click', () => {
      const line = LINE_BY_ID[el.dataset.favLineClick!];
      switchView('carte');
      setTimeout(() => selectLine(line), 200);
    });
  });
  list.querySelectorAll<HTMLElement>('[data-fav-stop-click]').forEach(el => {
    el.addEventListener('click', () => {
      const stop = STOPS[el.dataset.favStopClick!];
      if (stop) { switchView('carte'); setTimeout(() => map.flyTo([stop.lat, stop.lng], 16), 200); }
    });
  });
}

function performSearch(q: string) {
  const results = searchNetwork(q);
  const section = document.getElementById('search-results')!;
  const nearby  = document.getElementById('nearby-section')!;
  const fav     = document.getElementById('favorites-section')!;
  const list    = document.getElementById('search-list')!;
  const title   = document.getElementById('search-results-title')!;

  if (!q.trim()) {
    section.classList.add('hidden');
    nearby.classList.remove('hidden');
    fav.classList.remove('hidden');
    return;
  }

  pushSearch(q);
  nearby.classList.add('hidden');
  fav.classList.add('hidden');
  section.classList.remove('hidden');

  const total = results.lines.length + results.stops.length;
  title.textContent = `${total} résultat${total > 1 ? 's' : ''}`;

  if (total === 0) {
    list.innerHTML = `<div class="empty-state">Aucun résultat pour "${q}".</div>`;
    return;
  }

  let html = '';
  for (const l of results.lines) {
    html += `
      <div class="line-item" data-search-line="${l.id}">
        <div class="line-badge ${l.operator}">${l.number}</div>
        <div class="line-info">
          <div class="line-name">${l.name}</div>
          <div class="line-route">${l.terminus_a} → ${l.terminus_b}</div>
        </div>
      </div>
    `;
  }
  for (const s of results.stops) {
    html += `
      <div class="line-item" data-search-stop="${s.id}">
        <div class="stop-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <div class="line-info">
          <div class="line-name">${s.name}</div>
          <div class="line-route">Arrêt · ${s.lines.join(', ')}</div>
        </div>
      </div>
    `;
  }
  list.innerHTML = html;

  list.querySelectorAll<HTMLElement>('[data-search-line]').forEach(el => {
    el.addEventListener('click', () => {
      const l = LINE_BY_ID[el.dataset.searchLine!];
      switchView('carte');
      setTimeout(() => selectLine(l), 200);
    });
  });
  list.querySelectorAll<HTMLElement>('[data-search-stop]').forEach(el => {
    el.addEventListener('click', () => {
      const s = STOPS[el.dataset.searchStop!];
      if (s) { switchView('carte'); setTimeout(() => map.flyTo([s.lat, s.lng], 16), 200); }
    });
  });
}

// ============================================================
// 7. PLANIFICATEUR DE TRAJET
// ============================================================
let activeRoute: Route | null = null;

function searchRoutes() {
  const dep  = (document.getElementById('input-depart') as HTMLInputElement).value.trim();
  const dest = (document.getElementById('input-dest')   as HTMLInputElement).value.trim();
  if (!dep || !dest) { showToast('Renseignez départ et destination'); return; }

  const pref = getState().preferences.trajet;
  const routes = findRoutes(dep, dest, pref);

  const container = document.getElementById('route-results')!;
  const cards     = document.getElementById('route-cards')!;

  if (routes.length === 0) {
    cards.innerHTML = `<div class="empty-state">Aucun itinéraire trouvé.<br>Essayez d'autres arrêts (Plateau, Sandaga, Parcelles, Yoff…).</div>`;
    container.classList.remove('hidden');
    return;
  }

  cards.innerHTML = routes.map((r, i) => `
    <div class="route-card ${i === 0 ? 'selected' : ''}" data-route-idx="${i}">
      <div class="route-header">
        <div class="route-duration">${formatDuration(r.total_min)}</div>
        <div class="route-arrival">arrivée ${formatTime(r.arrival)}</div>
      </div>
      <div class="route-steps">
        ${r.steps.map(s => stepChip(s)).join('')}
      </div>
      <div class="route-details">
        <span>🚶 ${r.walk_min} min</span>
        <span>🔄 ${r.transfers} corres.</span>
        <span>💵 ${r.tarif_fcfa} FCFA</span>
      </div>
    </div>
  `).join('');

  container.classList.remove('hidden');

  cards.querySelectorAll<HTMLElement>('.route-card').forEach(card => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.dataset.routeIdx!);
      cards.querySelectorAll('.route-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      startNavigation(routes[idx]);
    });
  });

  // Auto-démarrer la première
  startNavigation(routes[0]);
}

function stepChip(step: RouteStep): string {
  if (step.type === 'walk')
    return `<span class="step-chip walk">🚶 ${step.duration_min}min</span>`;
  if (step.type === 'transfer')
    return `<span class="step-chip transfer">🔄 corres.</span>`;
  const line = LINE_BY_ID[step.lineId ?? ''];
  return `<span class="step-chip">🚌 ${line?.number ?? ''}</span>`;
}

function startNavigation(route: Route) {
  activeRoute = route;
  const panel    = document.getElementById('nav-active')!;
  const duration = document.getElementById('nav-duration')!;
  const arrival  = document.getElementById('nav-arrival')!;
  const stepsEl  = document.getElementById('nav-steps')!;

  duration.textContent = formatDuration(route.total_min);
  arrival.textContent  = `arrivée prévue ${formatTime(route.arrival)}`;

  stepsEl.innerHTML = route.steps.map(step => {
    let icon = '🚶', text = step.description;
    if (step.type === 'bus') {
      const l = LINE_BY_ID[step.lineId ?? ''];
      icon = '🚌';
      text = `Ligne ${l?.number ?? ''} — ${step.description}`;
    }
    if (step.type === 'transfer') icon = '🔄';
    return `
      <div class="nav-step">
        <div class="step-icon">${icon}</div>
        <div style="flex:1">
          <div class="step-text">${text}</div>
          <div class="step-sub">${step.sub}</div>
        </div>
      </div>
    `;
  }).join('');

  panel.classList.remove('hidden');
}

function stopNavigation() {
  activeRoute = null;
  document.getElementById('nav-active')!.classList.add('hidden');
  showToast('Navigation arrêtée');
}

// ============================================================
// 8. PROFIL
// ============================================================
function renderProfile() {
  const prefs = getState().preferences;
  document.querySelectorAll<HTMLInputElement>('input[name="pref-trajet"]').forEach(r => {
    r.checked = r.value === prefs.trajet;
  });
  document.querySelectorAll<HTMLInputElement>('input[name="lang"]').forEach(r => {
    r.checked = r.value === prefs.lang;
  });
  (document.getElementById('notif-retards')  as HTMLInputElement).checked = prefs.notif_retards;
  (document.getElementById('notif-descente') as HTMLInputElement).checked = prefs.notif_descente;
}

// ============================================================
// 9. UTILITAIRES UI
// ============================================================
function setBadge(text: string) {
  const el = document.getElementById('badge-text');
  if (el) el.textContent = text;
}

let toastTimer: number | null = null;
function showToast(text: string) {
  const t = document.getElementById('toast')!;
  t.textContent = text;
  t.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.classList.add('hidden'), 2500);
}

// ============================================================
// 10. EVENT BINDINGS
// ============================================================
function bindEvents() {

  // Filtres carte
  document.querySelectorAll<HTMLElement>('.map-filters .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.map-filters .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter as any;
      drawNetwork();
      refreshBusMarkers();
    });
  });

  // Filtres lignes view
  document.querySelectorAll<HTMLElement>('[data-lines-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-lines-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      linesFilter = btn.dataset.linesFilter as any;
      renderLines();
    });
  });

  // Localisation
  document.getElementById('btn-locate')?.addEventListener('click', async () => {
    await locateUser();
    const pos = getState().user_position;
    if (pos) map.flyTo([pos.lat, pos.lng], 14);
  });

  // Recherche
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  const clearBtn    = document.getElementById('btn-clear-search')!;
  let searchTimer: number | null = null;
  searchInput?.addEventListener('input', () => {
    clearBtn.classList.toggle('hidden', !searchInput.value);
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => performSearch(searchInput.value), 200);
  });
  clearBtn?.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.classList.add('hidden');
    performSearch('');
  });

  // Trajet
  document.getElementById('btn-search-route')?.addEventListener('click', searchRoutes);
  document.getElementById('btn-stop-nav')?.addEventListener('click', stopNavigation);

  document.querySelectorAll<HTMLElement>('.map-pick-btn').forEach(b => {
    b.addEventListener('click', () => {
      pickMode = b.dataset.target as any;
      switchView('carte');
      showToast('📍 Tapez sur la carte pour sélectionner');
    });
  });

  // Préférences
  document.querySelectorAll<HTMLInputElement>('input[name="pref-trajet"]').forEach(r => {
    r.addEventListener('change', () => {
      if (r.checked) setPreference('trajet', r.value as any);
    });
  });
  document.querySelectorAll<HTMLInputElement>('input[name="lang"]').forEach(r => {
    r.addEventListener('change', () => {
      if (r.checked) {
        setPreference('lang', r.value as any);
        if (r.value === 'wo') showToast('Wolof bientôt disponible');
      }
    });
  });
  document.getElementById('notif-retards')?.addEventListener('change', (e) => {
    setPreference('notif_retards', (e.target as HTMLInputElement).checked);
  });
  document.getElementById('notif-descente')?.addEventListener('change', (e) => {
    setPreference('notif_descente', (e.target as HTMLInputElement).checked);
  });

  document.getElementById('btn-clear-cache')?.addEventListener('click', () => {
    clearAll();
    showToast('🧹 Cache vidé');
    setTimeout(() => location.reload(), 1000);
  });

  document.getElementById('btn-menu')?.addEventListener('click', () => switchView('profil'));
}

// ============================================================
// 11. BOOTSTRAP
// ============================================================
async function bootstrap() {
  bindEvents();
  initMap();

  // Cache splash après 1.4s
  setTimeout(() => {
    document.getElementById('splash')?.classList.add('hidden');
  }, 1400);

  // Tente la géoloc en arrière-plan
  await locateUser();
  const pos = getState().user_position;
  if (pos) map.flyTo([pos.lat, pos.lng], 13, { duration: 1.5 });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
