import { buses, lines, stops } from './data/network'
import { getPredictions, getSearchResults, tickBuses, formatEta, escapeHtml } from './lib/transit'
import './style.css'

declare const L: any

// ── State ──────────────────────────────────────────────────────────────────
type Tab = 'map' | 'search' | 'lines' | 'profile'
let activeTab: Tab = 'map'
let searchQuery = ''
let selectedStopId: string | null = null
let notifiedStops: string[] = []
let favorites: { type: 'line' | 'stop'; id: string }[] = []
let searchHistory: string[] = ['Pikine', 'Grand Yoff', 'Colobane', 'Sandaga']
let lineFilter: 'all' | 'DDD' | 'AFTU' = 'all'
let showIncident = false
let leafletMap: any = null
let busMarkers: any[] = []
let stopMarkersMap: Map<string, any> = new Map()

// ── Real GPS Coordinates for Dakar stops ──────────────────────────────────
const GPS: Record<string, [number, number]> = {
  'palais':          [14.6681, -17.4420],
  'independance':    [14.6698, -17.4388],
  'republique':      [14.6690, -17.4401],
  'rebeuss':         [14.6590, -17.4352],
  'sandaga':         [14.6720, -17.4359],
  'petersen':        [14.6728, -17.4326],
  'medina':          [14.6837, -17.4507],
  'fass':            [14.6910, -17.4465],
  'colobane':        [14.6930, -17.4440],
  'hlm':             [14.7011, -17.4438],
  'castors':         [14.7055, -17.4465],
  'liberte6':        [14.7147, -17.4585],
  'sacrecoeur':      [14.7088, -17.4518],
  'point-e':         [14.6980, -17.4590],
  'fann':            [14.6877, -17.4635],
  'mermoz':          [14.7120, -17.4720],
  'ouakam':          [14.7340, -17.4900],
  'ngor':            [14.7470, -17.5130],
  'yoff':            [14.7530, -17.4740],
  'grand-yoff':      [14.7226, -17.4555],
  'patte-oie':       [14.7229, -17.4481],
  'parcelles':       [14.7853, -17.4277],
  'cambrene':        [14.7912, -17.4232],
  'guediawaye':      [14.7783, -17.4020],
  'pikine':          [14.7473, -17.3867],
  'bounkheling':     [14.7450, -17.3820],
  'yeumbeul':        [14.7622, -17.3527],
  'malika':          [14.7756, -17.3176],
  'thiaroye-azur':   [14.7342, -17.3700],
  'thiaroye-gare':   [14.7298, -17.3740],
  'mbao':            [14.7191, -17.3480],
  'keur-mbaye-fall': [14.7170, -17.3440],
  'keur-massar':     [14.7090, -17.3364],
  'rufisque':        [14.7165, -17.2718],
  'bargny':          [14.7050, -17.2280],
  'diamniadio':      [14.7180, -17.1830],
  'sebikotane':      [14.7280, -17.1320],
}

// ── Persistent DOM structure ───────────────────────────────────────────────
const appEl = document.querySelector<HTMLDivElement>('#app')!

// Layer 1: Leaflet map (always in DOM)
const mapLayer = document.createElement('div')
mapLayer.id = 'map-layer'
mapLayer.style.cssText = 'position:absolute;inset:0;z-index:0;'
appEl.appendChild(mapLayer)

// Layer 2: UI overlay
const uiLayer = document.createElement('div')
uiLayer.id = 'ui-layer'
uiLayer.style.cssText = 'position:absolute;inset:0;z-index:10;display:flex;flex-direction:column;'
appEl.appendChild(uiLayer)

// ── Leaflet Map Initialization ─────────────────────────────────────────────
function initMap() {
  if (leafletMap) {
    leafletMap.invalidateSize()
    return
  }
  if (typeof L === 'undefined') return

  leafletMap = L.map('map-layer', {
    zoomControl: false,
    minZoom: 11,
    maxZoom: 18,
  }).setView([14.7137, -17.4300], 12)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(leafletMap)

  // User position blue dot
  const userIcon = L.divIcon({
    className: '',
    html: '<div class="user-dot-marker"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
  L.marker([14.7137, -17.4300], { icon: userIcon, zIndexOffset: 1000 }).addTo(leafletMap)

  // Draw bus line polylines
  lines.forEach(line => {
    const coords = line.stopIds.map(id => GPS[id]).filter(Boolean)
    if (coords.length >= 2) {
      L.polyline(coords, { color: line.color, weight: 4, opacity: 0.75 }).addTo(leafletMap)
    }
  })

  // Draw stop markers
  stops.forEach(stop => {
    const coords = GPS[stop.id]
    if (!coords) return
    const icon = L.divIcon({
      className: '',
      html: `<div class="stop-marker"></div>`,
      iconSize: [9, 9],
      iconAnchor: [4.5, 4.5],
    })
    const marker = L.marker(coords, { icon, zIndexOffset: 500 })
    marker.on('click', () => {
      selectedStopId = stop.id
      render()
    })
    marker.addTo(leafletMap)
    stopMarkersMap.set(stop.id, marker)
  })
}

function updateBusMarkers() {
  if (!leafletMap) return
  busMarkers.forEach(m => m.remove())
  busMarkers = []

  buses.forEach(bus => {
    const line = lines.find(l => l.id === bus.lineId)
    if (!line) return
    const coords = line.stopIds.map(id => GPS[id]).filter(Boolean) as [number, number][]
    if (coords.length < 2) return

    const totalSegs = coords.length - 1
    const scaled = bus.progress * totalSegs
    const seg = Math.min(Math.floor(scaled), totalSegs - 1)
    const t = scaled - seg
    const from = coords[seg]
    const to = coords[Math.min(seg + 1, coords.length - 1)]
    const lat = from[0] + (to[0] - from[0]) * t
    const lng = from[1] + (to[1] - from[1]) * t

    const busIcon = L.divIcon({
      className: '',
      html: `<div class="bus-marker" style="background:${line.color}">🚌</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    })
    busMarkers.push(L.marker([lat, lng], { icon: busIcon, zIndexOffset: 800 }).addTo(leafletMap))
  })
}

// ── RENDER ─────────────────────────────────────────────────────────────────
function render() {
  const isMapTab = activeTab === 'map'
  mapLayer.style.display = 'block'

  if (isMapTab) {
    // Show map, render transparent overlay on top
    uiLayer.innerHTML = renderMapOverlay()
  } else {
    // Show full-screen page
    uiLayer.innerHTML = `
      <div class="page" style="flex:1; overflow:hidden; display:flex; flex-direction:column;">
        ${renderPage()}
      </div>
      ${renderTabBar()}
    `
  }

  // Incident modal
  if (showIncident && selectedStopId) {
    uiLayer.innerHTML += renderIncidentModal()
  }

  attachListeners()

  // Init or refresh map
  if (isMapTab) {
    setTimeout(() => { initMap(); updateBusMarkers() }, 50)
  }
}

// ── Map Overlay ────────────────────────────────────────────────────────────
function renderMapOverlay() {
  const stop = selectedStopId ? stops.find(s => s.id === selectedStopId) : null

  return `
    <div class="map-overlay" style="flex:1; display:flex; flex-direction:column; pointer-events:none;">
      <!-- Settings button -->
      <div class="map-top-bar" style="pointer-events:none;">
        <button class="map-settings-btn" id="settings-btn" style="pointer-events:auto;" title="Paramètres">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>

      <!-- Stop Info Sheet OR Search Bar -->
      <div style="flex:1;"></div>

      ${stop ? renderStopSheet(stop) : renderMapBottomBar()}
    </div>

    ${renderTabBar()}
  `
}

function renderMapBottomBar() {
  return `
    <div class="map-bottom-bar" style="pointer-events:auto;">
      <button class="search-pill" id="go-search">
        <div class="search-pill-left">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <span>On va où ?</span>
        </div>
        <div class="search-pill-right">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
      </button>
    </div>
  `
}

function renderStopSheet(stop: { id: string; name: string; district: string }) {
  const preds = getPredictions(stop.id).slice(0, 4)
  const isFav = favorites.some(f => f.id === stop.id)
  return `
    <div class="stop-sheet" style="pointer-events:auto; position:relative;">
      <div class="sheet-handle"></div>
      <button class="sheet-close" id="close-sheet">✕</button>
      <div class="stop-sheet-header">
        <div class="stop-sheet-title">${escapeHtml(stop.name)}</div>
        <button class="fav-btn-sm" id="fav-stop" data-id="${stop.id}">${isFav ? '⭐' : '☆'}</button>
      </div>
      <div class="stop-sheet-sub">${stop.district} · Dakar</div>

      <div class="pred-list">
        ${preds.length > 0 ? preds.map(p => `
          <div class="pred-row">
            <span class="pred-line-badge" style="background:${p.line.color}">${p.line.code}</span>
            <div class="pred-info">
              <div class="pred-name">${escapeHtml(p.line.headsign)}</div>
              <div class="pred-dir">${escapeHtml(p.line.name)}</div>
            </div>
            <div class="pred-eta ${p.etaMin <= 2 ? 'urgent' : ''}">${formatEta(p.etaMin)}</div>
          </div>
        `).join('') : '<p class="empty-msg">Aucun bus en approche</p>'}
      </div>

      <div class="sheet-actions">
        <button class="btn-green" id="toggle-notif">
          ${notifiedStops.includes(stop.id) ? '🔔 Actif' : '🔕 M\'avertir'}
        </button>
        <button class="btn-danger" id="btn-incident">⚠️ Signaler</button>
      </div>
    </div>
  `
}

// ── Page Renders ───────────────────────────────────────────────────────────
function renderPage() {
  if (activeTab === 'search') return renderSearch()
  if (activeTab === 'lines')  return renderLines()
  if (activeTab === 'profile') return renderProfile()
  return ''
}

function renderSearch() {
  const results = searchQuery.length > 1 ? getSearchResults(searchQuery) : []
  return `
    <div class="search-header">
      <div class="search-input-row">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input id="search-input" type="text" placeholder="Ligne ou destination"
          value="${escapeHtml(searchQuery)}" autocomplete="off" autocorrect="off" />
        <button class="swap-btn" title="Inverser">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M7 16V4m0 0L3 8m4-4 4 4"/><path d="M17 8v12m0 0 4-4m-4 4-4-4"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="search-body">
      ${searchQuery.length === 0 ? `
        <!-- Action cards (Transit style) -->
        <div class="action-cards">
          <button class="action-card" id="pick-on-map">
            <div class="action-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <span class="action-label">Choisir sur la carte</span>
            <span class="action-chevron">›</span>
          </button>
          <button class="action-card" id="set-home">
            <div class="action-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <span class="action-label">Définir un domicile</span>
            <span class="action-chevron">›</span>
          </button>
          <button class="action-card" id="set-work">
            <div class="action-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
            </div>
            <span class="action-label">Définir un lieu de travail</span>
            <span class="action-chevron">›</span>
          </button>
          <button class="action-card" id="show-events">
            <div class="action-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                <path d="m9 16 2 2 4-4"/>
              </svg>
            </div>
            <span class="action-label">Afficher événements</span>
            <span class="action-chevron">›</span>
          </button>
        </div>

        <!-- Recent searches -->
        ${searchHistory.length > 0 ? `
          <div class="section-title">Recherches récentes</div>
          <div class="recent-list">
            ${searchHistory.map(h => `
              <div class="recent-item" data-search="${escapeHtml(h)}">
                <div class="recent-pin">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div class="recent-text">
                  <div class="recent-name">${escapeHtml(h)}</div>
                  <div class="recent-sub">${h}, Dakar, Sénégal</div>
                </div>
                <button class="recent-more">⋮</button>
              </div>
            `).join('')}
          </div>
        ` : ''}
      ` : `
        <!-- Search results -->
        ${results.length > 0 ? `
          <div class="results-list">
            ${results.map(r => {
              if (r.type === 'stop') {
                return `
                  <div class="result-item" data-stop-id="${r.stop.id}">
                    <div class="result-icon" style="background:#4a90d9;">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                    </div>
                    <div class="result-text">
                      <div class="result-name">${escapeHtml(r.stop.name)}</div>
                      <div class="result-sub">${r.stop.district} · Dakar, Sénégal</div>
                    </div>
                  </div>
                `
              } else {
                return `
                  <div class="result-item" data-line-id="${r.line.id}">
                    <div class="result-icon" style="background:${r.line.color};">${r.line.code}</div>
                    <div class="result-text">
                      <div class="result-name">${escapeHtml(r.line.name)}</div>
                      <div class="result-sub">→ ${escapeHtml(r.line.headsign)} · ${r.line.frequencyMin} min</div>
                    </div>
                  </div>
                `
              }
            }).join('')}
          </div>
        ` : `
          <div style="text-align:center; padding: 40px 20px; color: var(--muted);">
            <div style="font-size:40px; margin-bottom:12px;">🔍</div>
            <div style="font-size:15px;">Aucun résultat pour « ${escapeHtml(searchQuery)} »</div>
          </div>
        `}
      `}
    </div>
  `
}

function renderLines() {
  const filtered = lines.filter(l => {
    if (lineFilter === 'DDD') return l.id.startsWith('DDD')
    if (lineFilter === 'AFTU') return l.id.startsWith('AFTU')
    return true
  })
  return `
    <div class="page-header">
      <h2>Lignes</h2>
      <p>Réseau de transport de Dakar</p>
    </div>
    <div class="filter-row">
      <button class="filter-chip ${lineFilter === 'all' ? 'active' : ''}" data-filter="all">Tous</button>
      <button class="filter-chip ${lineFilter === 'DDD' ? 'active' : ''}" data-filter="DDD">🔵 DDD</button>
      <button class="filter-chip ${lineFilter === 'AFTU' ? 'active' : ''}" data-filter="AFTU">🟡 AFTU</button>
    </div>
    <div class="lines-list">
      ${filtered.map(l => `
        <button class="line-card" data-line-id="${l.id}">
          <div class="line-number" style="background:${l.color}">${l.code}</div>
          <div class="line-info">
            <div class="line-name">${escapeHtml(l.name)}</div>
            <div class="line-detail">→ ${escapeHtml(l.headsign)} · toutes les ${l.frequencyMin} min</div>
          </div>
          <span class="line-badge">${l.id.startsWith('DDD') ? 'DDD' : 'AFTU'}</span>
        </button>
      `).join('')}
    </div>
  `
}

function renderProfile() {
  return `
    <div class="page-header" style="background: var(--green); padding-top: 48px; padding-bottom: 0; border: none;">
      <div class="profile-user">
        <div class="profile-avatar" style="background: rgba(255,255,255,0.2); color:#fff;">U</div>
        <div>
          <div class="profile-name" style="color:#fff;">Utilisateur SunuBus</div>
          <div class="profile-sub" style="color:rgba(255,255,255,0.8);">Dakar, Sénégal</div>
        </div>
      </div>
    </div>
    <div class="profile-scroll">
      <div class="profile-card">
        <div class="profile-card-title">⭐ Favoris</div>
        ${favorites.length > 0 ? `
          <div class="fav-chips">
            ${favorites.map(f => {
              const item = f.type === 'line'
                ? lines.find(l => l.id === f.id)
                : stops.find(s => s.id === f.id)
              return `<div class="fav-chip">${f.type === 'line' ? '🚌' : '📍'} ${item?.name ?? f.id}</div>`
            }).join('')}
          </div>
        ` : '<p class="empty-msg">Aucun favori enregistré</p>'}
      </div>

      <div class="profile-card">
        <div class="profile-card-title">🕒 Recherches récentes</div>
        ${searchHistory.map(h => `
          <div class="history-item">
            <span>🔍</span><span>${escapeHtml(h)}</span>
          </div>
        `).join('')}
      </div>

      <div class="profile-card">
        <div class="profile-card-title">📡 Arrêts surveillés</div>
        ${notifiedStops.length > 0
          ? notifiedStops.map(id => {
              const s = stops.find(st => st.id === id)
              return `<div class="history-item"><span>🔔</span><span>${s?.name ?? id}</span></div>`
            }).join('')
          : '<p class="empty-msg">Aucune surveillance active</p>'
        }
      </div>
    </div>
  `
}

function renderTabBar() {
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'map',     label: 'Carte',     icon: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z' },
    { id: 'search',  label: 'Recherche', icon: 'M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z' },
    { id: 'lines',   label: 'Lignes',    icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' },
    { id: 'profile', label: 'Profil',    icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
  ]
  return `
    <div class="bottom-tab-bar">
      ${tabs.map(t => `
        <button class="tab-btn ${activeTab === t.id ? 'active' : ''}" data-tab="${t.id}">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="${t.icon}"/>
          </svg>
          ${t.label}
        </button>
      `).join('')}
    </div>
  `
}

function renderIncidentModal() {
  return `
    <div class="incident-modal" id="incident-modal">
      <div class="incident-panel">
        <div class="sheet-handle" style="width:40px;height:4px;background:#e2e6ea;border-radius:2px;margin:0 auto 20px;"></div>
        <h3>Signalement d'incident</h3>
        <p>Aidez-nous à améliorer le réseau dakarois.</p>
        <div class="incident-grid">
          <button class="incident-opt" data-type="crowded">
            <span class="inc-icon">👥</span>
            <strong>Bus bondé</strong>
            <small>Plus de place assise</small>
          </button>
          <button class="incident-opt" data-type="delay">
            <span class="inc-icon">⏳</span>
            <strong>Retard majeur</strong>
            <small>Plus de 15 min d'attente</small>
          </button>
          <button class="incident-opt" data-type="dangerous">
            <span class="inc-icon">⚠️</span>
            <strong>Sécurité</strong>
            <small>Conduite ou incident</small>
          </button>
          <button class="incident-opt" data-type="other">
            <span class="inc-icon">💬</span>
            <strong>Autre</strong>
            <small>Préciser par message</small>
          </button>
        </div>
        <button class="btn-cancel" id="cancel-incident">Fermer</button>
      </div>
    </div>
  `
}

// ── Event Listeners ────────────────────────────────────────────────────────
function attachListeners() {
  // Tab navigation
  uiLayer.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab as Tab
      if (activeTab !== 'map') selectedStopId = null
      render()
    })
  })

  // Map: "On va où ?" → search tab
  uiLayer.querySelector('#go-search')?.addEventListener('click', () => {
    activeTab = 'search'
    render()
    setTimeout(() => (uiLayer.querySelector<HTMLInputElement>('#search-input'))?.focus(), 100)
  })

  // Close stop sheet
  uiLayer.querySelector('#close-sheet')?.addEventListener('click', () => {
    selectedStopId = null
    render()
  })

  // Favorite stop
  uiLayer.querySelector('#fav-stop')?.addEventListener('click', (e) => {
    const id = (e.currentTarget as HTMLElement).dataset.id!
    const idx = favorites.findIndex(f => f.id === id)
    if (idx === -1) favorites.push({ type: 'stop', id })
    else favorites.splice(idx, 1)
    render()
  })

  // Toggle notification
  uiLayer.querySelector('#toggle-notif')?.addEventListener('click', () => {
    if (!selectedStopId) return
    if (notifiedStops.includes(selectedStopId)) {
      notifiedStops = notifiedStops.filter(s => s !== selectedStopId)
    } else {
      notifiedStops.push(selectedStopId)
      const stop = stops.find(s => s.id === selectedStopId)
      alert(`✅ Vous serez averti quand le bus approche de ${stop?.name}`)
    }
    render()
  })

  // Report incident button
  uiLayer.querySelector('#btn-incident')?.addEventListener('click', () => {
    showIncident = true
    render()
  })

  // Incident options
  uiLayer.querySelectorAll<HTMLElement>('.incident-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      showIncident = false
      alert('✅ Signalement envoyé. Merci pour votre contribution !')
      render()
    })
  })

  uiLayer.querySelector('#cancel-incident')?.addEventListener('click', () => {
    showIncident = false
    render()
  })

  // Search input
  const searchInput = uiLayer.querySelector<HTMLInputElement>('#search-input')
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      searchQuery = (e.target as HTMLInputElement).value
      render()
    })
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && searchQuery) {
        const trimmed = searchQuery.trim()
        searchHistory = [trimmed, ...searchHistory.filter(h => h !== trimmed)].slice(0, 5)
        render()
      }
    })
    // Re-focus after render
    setTimeout(() => searchInput.focus(), 50)
  }

  // Action cards
  uiLayer.querySelector('#pick-on-map')?.addEventListener('click', () => {
    activeTab = 'map'
    render()
  })
  uiLayer.querySelector('#set-home')?.addEventListener('click', () => alert('Fonctionnalité domicile à venir'))
  uiLayer.querySelector('#set-work')?.addEventListener('click', () => alert('Fonctionnalité travail à venir'))
  uiLayer.querySelector('#show-events')?.addEventListener('click', () => alert('Aucun événement en cours à Dakar'))

  // Recent search click
  uiLayer.querySelectorAll<HTMLElement>('.recent-item').forEach(item => {
    item.addEventListener('click', () => {
      searchQuery = item.dataset.search || ''
      render()
    })
  })

  // Search result: stop
  uiLayer.querySelectorAll<HTMLElement>('.result-item[data-stop-id]').forEach(item => {
    item.addEventListener('click', () => {
      const stopId = item.dataset.stopId!
      selectedStopId = stopId
      activeTab = 'map'
      searchQuery = ''
      const stop = stops.find(s => s.id === stopId)
      if (stop && GPS[stopId] && leafletMap) {
        leafletMap.setView(GPS[stopId], 15)
      }
      render()
    })
  })

  // Line filter chips
  uiLayer.querySelectorAll<HTMLElement>('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      lineFilter = chip.dataset.filter as any
      render()
    })
  })
}

// ── Tick loop ──────────────────────────────────────────────────────────────
window.setInterval(() => {
  tickBuses()
  if (activeTab === 'map') {
    updateBusMarkers()
    // Refresh prediction panel if stop is selected
    if (selectedStopId) render()
  }
}, 2000)

// ── Boot ───────────────────────────────────────────────────────────────────
render()
setTimeout(initMap, 100)
