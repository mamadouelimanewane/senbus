import { buses, lines, stops } from './data/network'
import { ROUTE_GEOMETRIES } from './data/route_geometries'
import { getPredictions, getSearchResults, tickBuses, formatEta, findJourneys } from './lib/transit'
import { GPS, getLineRoadGeometry, interpolate, getPlannerRoute, getPrebakedRouteInfo } from './lib/routing'
import type { RoadGeometry, DirectionsResult } from './lib/routing'
import './style.css'

declare const L: any

// ── State ──────────────────────────────────────────────────────────────────
type Tab = 'map' | 'search' | 'lines' | 'profile' | 'planner' | 'scan'
let activeTab: Tab = 'map'
let scanState: 'idle' | 'scanning' | 'success' = 'idle'
let searchQuery = ''
let lineFilter = 'all'
let mapOperatorFilter = 'all'
let selectedStopId: string | null = null
let trackedBusId: string | null = null
let plannerPicking: 'origin' | 'destination' | null = null
let plannerOrigin: string | null = null
let plannerDestination: string | null = null
let plannerRouteData: DirectionsResult | null = null
let plannerRoutePolyline: any = null
let plannerLoading = false
let plannerMarkers: any[] = []

// ── Layers ──────────────────────────────────────────────────────────────────
let leafletMap: any
let stopsLayer: any
let busCircles = new Map<string, any>()
let routePolyline: any
let routeDecorators: any
let canvasRenderer: any

// ── SVG Icons ────────────────────────────────────────────────────────────────
const ICON_MAP = `<svg viewBox="0 0 24 24" width="24" height="24"><path d="M15,19L9,16.89V5L15,7.11M20.5,3C20.34,3 20.19,3.03 20.06,3.09L15,5.1L9,3L3.36,4.9C3.15,4.97 3,5.15 3,5.38V20.5A0.5,0.5 0 0,0 3.5,21C3.55,21 3.61,20.97 3.66,20.95L9,18.9L15,21L20.64,19.1C20.85,19.03 21,18.85 21,18.62V3.5A0.5,0.5 0 0,0 20.5,3Z" fill="currentColor"/></svg>`
const ICON_PLANNER = `<svg viewBox="0 0 24 24" width="24" height="24"><path d="M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2Z" fill="currentColor"/></svg>`
const ICON_SEARCH = `<svg viewBox="0 0 24 24" width="24" height="24"><path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" fill="currentColor"/></svg>`
const ICON_NETWORK = `<svg viewBox="0 0 24 24" width="24" height="24"><path d="M18,11H6V5H18M16.5,17A1.5,1.5 0 0,1 15,15.5A1.5,1.5 0 0,1 16.5,14A1.5,1.5 0 0,1 18,15.5A1.5,1.5 0 0,1 16.5,17M7.5,17A1.5,1.5 0 0,1 6,15.5A1.5,1.5 0 0,1 7.5,14A1.5,1.5 0 0,1 9,15.5A1.5,1.5 0 0,1 7.5,17M4,16c0,0.88,0.39,1.67,1,2.22V20a1,1,0,0,0,1,1h1a1,1,0,0,0,1-1V19h8v1a1,1,0,0,0,1,1h1a1,1,0,0,0,1-1V18.22c0.61-0.55,1-1.34,1-2.22V6c0-3.5-3.58-4-8-4s-8,0.5-8,4V16Z" fill="currentColor"/></svg>`
const ICON_QR = `<svg viewBox="0 0 24 24" width="24" height="24"><path d="M4,4H10V10H4V4M14,4H20V10H14V4M4,14H10V20H4V14M14,14H17V17H14V14M17,17H20V20H17V17M14,17H11V14H14V17M11,11H13V13H11V11M8,8H6V6H8V8M18,8H16V6H18V8M8,18H6V16H8V18M13,11V13H11V11H13M14,11V13H16V11H14M18,14H20V16H18V14M16,16H18V18H16V16M14,19H16V21H14V19M18,19H20V21H18V19M16,14V16H14V14H16M11,14V16H13V14H11Z" fill="currentColor"/></svg>`

const BUS_SVG_PATH = `<path d="M18,11H6V5H18M16.5,17A1.5,1.5 0 0,1 15,15.5A1.5,1.5 0 0,1 16.5,14A1.5,1.5 0 0,1 18,15.5A1.5,1.5 0 0,1 16.5,17M7.5,17A1.5,1.5 0 0,1 6,15.5A1.5,1.5 0 0,1 7.5,14A1.5,1.5 0 0,1 9,15.5A1.5,1.5 0 0,1 7.5,17M4,16c0,0.88,0.39,1.67,1,2.22V20a1,1,0,0,0,1,1h1a1,1,0,0,0,1-1V19h8v1a1,1,0,0,0,1,1h1a1,1,0,0,0,1-1V18.22c0.61-0.55,1-1.34,1-2.22V6c0-3.5-3.58-4-8-4s-8,0.5-8,4V16Z"/>`
const GARE_SVG = `<svg viewBox="0 0 24 24" width="24" height="24" fill="#1565c0"><path d="M12,2L4,11V21H20V11L12,2M12,4.42L18,11.16V19H14V13H10V19H6V11.16L12,4.42M11,11V12H13V11H11Z" /></svg>`

const GARES = ['palais', 'petersen', 'colobane', 'aeroport', 'pikine', 'rufisque', 'diamniadio']

// ── Compteur de lignes pré-baked ──────────────────────────────────────────
const prebakedCount = Object.keys(ROUTE_GEOMETRIES).length

// ── Carte Google Maps (via Leaflet + tuiles Google) ───────────────────────
async function initMap() {
  if (leafletMap) { leafletMap.invalidateSize(); return }
  if (typeof L === 'undefined') return

  canvasRenderer = L.canvas({ padding: 0.5 })
  leafletMap = L.map('map-layer', { zoomControl: false, minZoom: 11, maxZoom: 18 })
    .setView([14.7137, -17.4300], 12)

  L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    attribution: '© Google Maps',
    maxZoom: 20,
  }).addTo(leafletMap)

  stopsLayer = L.layerGroup().addTo(leafletMap)
  routeDecorators = L.layerGroup().addTo(leafletMap)

  // Marqueur position utilisateur
  const userIcon = L.divIcon({
    className: '',
    html: '<div class="user-dot-marker"></div>',
    iconSize: [20, 20], iconAnchor: [10, 10]
  })
  L.marker([14.7137, -17.4300], { icon: userIcon, zIndexOffset: 2000 }).addTo(leafletMap)

  // Arrêts sur la carte
  stops.forEach(stop => {
    const c = GPS[stop.id]; if (!c) return
    const isGare = GARES.includes(stop.id)
    const icon = L.divIcon({
      className: '',
      html: isGare
        ? `<div class="gare-marker">${GARE_SVG}</div>`
        : `<div class="stop-dot-marker"></div>`,
      iconSize: isGare ? [32, 32] : [8, 8],
      iconAnchor: isGare ? [16, 16] : [4, 4],
    })
    const m = L.marker(c, { icon, renderer: canvasRenderer }).addTo(stopsLayer)
    m.on('click', () => {
      if (plannerPicking) {
        if (plannerPicking === 'origin') plannerOrigin = stop.id
        else plannerDestination = stop.id
        plannerPicking = null
        activeTab = 'planner'
        if (plannerOrigin && plannerDestination) triggerPlannerRoute()
      } else {
        selectedStopId = stop.id
      }
      render()
    })
  })
}

// ── Calcul de l'itinéraire voyageur via LocationIQ ────────────────────────
async function triggerPlannerRoute() {
  if (!plannerOrigin || !plannerDestination) return
  const oCoord = GPS[plannerOrigin], dCoord = GPS[plannerDestination]
  if (!oCoord || !dCoord) return

  plannerLoading = true
  plannerRouteData = null
  render()

  plannerRouteData = await getPlannerRoute(oCoord, dCoord)
  plannerLoading = false
  render()
}

// ── Affichage de l'itinéraire planificateur sur la carte ──────────────────
function showPlannerOnMap() {
  if (!plannerRouteData || !leafletMap) return
  clearPlannerFromMap()

  plannerRoutePolyline = L.polyline(plannerRouteData.geometry, {
    color: '#2196F3', weight: 7, opacity: 0.9,
    dashArray: '12, 6', lineCap: 'round',
  }).addTo(leafletMap)

  if (plannerOrigin) {
    const oCoord = GPS[plannerOrigin]
    if (oCoord) {
      plannerMarkers.push(L.marker(oCoord, {
        icon: L.divIcon({ className: '', html: '<div class="planner-pin origin-pin">A</div>', iconSize: [28, 28], iconAnchor: [14, 28] })
      }).addTo(leafletMap))
    }
  }
  if (plannerDestination) {
    const dCoord = GPS[plannerDestination]
    if (dCoord) {
      plannerMarkers.push(L.marker(dCoord, {
        icon: L.divIcon({ className: '', html: '<div class="planner-pin dest-pin">B</div>', iconSize: [28, 28], iconAnchor: [14, 28] })
      }).addTo(leafletMap))
    }
  }

  leafletMap.fitBounds(plannerRoutePolyline.getBounds(), { padding: [60, 60] })
  activeTab = 'map'
  render()
}

function clearPlannerFromMap() {
  if (plannerRoutePolyline) { leafletMap.removeLayer(plannerRoutePolyline); plannerRoutePolyline = null }
  plannerMarkers.forEach(m => leafletMap.removeLayer(m))
  plannerMarkers = []
}

// ── Mise à jour des bus sur la carte ──────────────────────────────────────
function updateBusMarkers() {
  if (!leafletMap) return
  if (routePolyline) { leafletMap.removeLayer(routePolyline); routePolyline = null }
  routeDecorators.clearLayers()

  if (activeTab === 'map' && !leafletMap.hasLayer(stopsLayer)) stopsLayer.addTo(leafletMap)

  for (const bus of buses) {
    const line = lines.find(l => l.id === bus.lineId); if (!line) continue
    const isT = bus.id === trackedBusId

    if (trackedBusId && !isT) {
      const ex = busCircles.get(bus.id); if (ex) ex.remove(); continue
    }
    if (!trackedBusId && mapOperatorFilter !== 'all' && line.operatorId !== mapOperatorFilter) {
      const ex = busCircles.get(bus.id); if (ex) ex.remove(); continue
    }

    // ★ Utilise les tracés pré-baked (instantané, pas d'API)
    const road = getLineRoadGeometry(line.id, line.stopIds)
    if (road.coords.length < 2) continue

    if (isT) {
      routePolyline = L.polyline(road.coords, {
        color: line.color, weight: 6, opacity: 0.85,
      }).addTo(leafletMap)
      decorateRoute(road, line.color)

      // Badge source
      const el = document.getElementById('route-source-indicator')
      if (el) {
        const info = getPrebakedRouteInfo(line.id)
        if (info) {
          const distKm = (info.distance / 1000).toFixed(1)
          const durMin = Math.round(info.duration / 60)
          el.innerHTML = `<div class="route-source-badge liq">📍 ${distKm} km — ${durMin} min</div>`
        } else {
          el.innerHTML = `<div class="route-source-badge it">🛡️ Iron-Track</div>`
        }
      }
    }

    const [lat, lng] = interpolate(road, bus.progress)
    let marker = busCircles.get(bus.id)
    if (marker) {
      marker.setLatLng([lat, lng])
      if (isT && !(marker instanceof L.Marker)) { marker.remove(); marker = null }
      else if (!isT && marker instanceof L.Marker) { marker.remove(); marker = null }
    }

    if (!marker) {
      if (isT) {
        const busIcon = L.divIcon({
          className: 'bus-figure-container',
          html: `<div class="bus-plate-badge">${bus.plate}</div><div class="bus-figure" style="background:${line.color};"><svg viewBox="0 0 24 24">${BUS_SVG_PATH}</svg></div>`,
          iconSize: [80, 60], iconAnchor: [40, 50]
        })
        marker = L.marker([lat, lng], { icon: busIcon, zIndexOffset: 3000 }).addTo(leafletMap)
      } else {
        marker = L.circleMarker([lat, lng], {
          radius: 8, fillColor: line.color, fillOpacity: 1,
          color: '#fff', weight: 2, renderer: canvasRenderer
        }).addTo(leafletMap)
      }
      marker.on('click', () => { trackedBusId = bus.id; render() })
      busCircles.set(bus.id, marker)
    }
  }
}

function decorateRoute(road: RoadGeometry, color: string) {
  const interval = 2
  for (let d = interval; d < road.total; d += interval) {
    const p1 = interpolate(road, (d - 0.05) / road.total)
    const p2 = interpolate(road, d / road.total)
    const angle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180 / Math.PI
    L.marker(p2, {
      icon: L.divIcon({
        className: 'route-arrow',
        html: `<div style="transform: rotate(${angle + 90}deg); color:${color}">▼</div>`,
        iconSize: [20, 20], iconAnchor: [10, 10]
      })
    }).addTo(routeDecorators)
  }
}

// ── Rendu principal ────────────────────────────────────────────────────────
function render() {
  const root = document.getElementById('app'); if (!root) return
  let content = ''

  if (activeTab === 'map') {
    content = `
      <div id="map-layer"></div>
      ${renderMapUI()}
      ${selectedStopId ? renderStopSheet() : ''}
      ${trackedBusId ? renderBusSheet() : ''}
      ${plannerPicking ? `
        <div id="picking-overlay">
          <span>📍 Sélectionnez un arrêt sur la carte</span>
          <button id="cancel-picking">✕</button>
        </div>` : ''}
    `
  } else if (activeTab === 'search') {
    content = renderSearch()
  } else if (activeTab === 'lines') {
    content = renderNetwork()
  } else if (activeTab === 'planner') {
    content = renderPlanner()
  } else if (activeTab === 'scan') {
    content = renderScan()
  }

  root.innerHTML = `
    <div id="splash" class="splash-screen">
      <div class="splash-logo">🚌</div>
      <div class="splash-title">SunuBus Dakar</div>
      <div class="splash-loader"></div>
    </div>
    <div class="mobile-container" style="opacity: 0; transition: opacity 0.5s ease;">
      ${content}
      ${renderTabBar()}
    </div>
  `

  if (activeTab === 'map') initMap()
  
  // Fade in content
  setTimeout(() => {
    const container = root.querySelector('.mobile-container') as HTMLElement
    const splash = root.querySelector('#splash') as HTMLElement
    if (container && splash) {
      container.style.opacity = '1'
      splash.style.opacity = '0'
      setTimeout(() => splash.remove(), 500)
    }
  }, 800)

  attachListeners()
}

function renderMapUI() {
  return `
    <div class="map-controls">
      <div class="op-filters">
        <button class="op-filter-btn ${mapOperatorFilter === 'all' ? 'active' : ''}" data-op="all">Tous</button>
        <button class="op-filter-btn ${mapOperatorFilter === 'DDD' ? 'active' : ''}" data-op="DDD">DDD</button>
        <button class="op-filter-btn ${mapOperatorFilter === 'AFTU-TATA' ? 'active' : ''}" data-op="AFTU-TATA">TATA</button>
      </div>
      <div class="data-status liq">📡 ${prebakedCount} lignes — tracés LocationIQ</div>
      ${!trackedBusId ? `
        <div class="main-fab-container">
          <button class="fab-btn secondary-fab" id="go-planner"><span>Itinéraire</span></button>
          <button class="fab-btn primary-fab" id="go-search"><span>Où allez-vous ?</span></button>
        </div>` : `<div id="route-source-indicator"></div>`}
    </div>
  `
}

function renderStopSheet() {
  const stop = stops.find(s => s.id === selectedStopId); if (!stop) return ''
  const preds = getPredictions(stop.id)
  return `
    <div class="bottom-sheet">
      <div class="sheet-handle" id="close-sheet"></div>
      <div class="sheet-header">
        <div class="stop-icon">🚏</div>
        <div>
          <h3>${stop.name}</h3>
          <p class="text-muted">Réseau SunuBus Dakar</p>
        </div>
      </div>
      <div class="predictions-list">
        ${preds.map(p => `
          <div class="prediction-item btn-view-on-map" data-track-line="${p.line.id}">
            <div class="line-badge" style="background:${p.line.color}">${p.line.code}</div>
            <div class="line-info">
              <strong>Vers ${p.line.headsign}</strong><br>
              <span class="text-muted">Prochain bus</span>
            </div>
            <div class="arrival-time">${formatEta(p.etaMin)}</div>
          </div>`).join('')}
      </div>
    </div>
  `
}

function renderBusSheet() {
  const bus = buses.find(b => b.id === trackedBusId); if (!bus) return ''
  const line = lines.find(l => l.id === bus.lineId); if (!line) return ''
  const info = getPrebakedRouteInfo(line.id)
  const distKm = info ? (info.distance / 1000).toFixed(1) : '—'
  const durMin = info ? Math.round(info.duration / 60) : '—'

  return `
    <div class="bottom-sheet">
      <div class="sheet-handle" id="close-sheet"></div>
      <div class="sheet-header">
        <div class="line-badge" style="background:${line.color}">${line.code}</div>
        <div>
          <h3>Ligne ${line.code} — ${line.name}</h3>
          <p class="text-muted">Immat. ${bus.plate}</p>
        </div>
      </div>
      <div class="route-info-bar">
        <div class="route-info-item"><span class="route-info-val">${distKm} km</span><span class="route-info-lbl">Distance</span></div>
        <div class="route-info-item"><span class="route-info-val">${durMin} min</span><span class="route-info-lbl">Durée</span></div>
        <div class="route-info-item"><span class="route-info-val">${line.stopIds.length}</span><span class="route-info-lbl">Arrêts</span></div>
      </div>
      <div class="action-row">
        <button class="btn btn-danger-ghost" id="untrack-btn">Quitter le suivi</button>
      </div>
    </div>
  `
}

function renderSearch() {
  return `
    <div class="page-container">
      <header class="app-header"><h1>Explorer le réseau</h1></header>
      <div class="search-box-container">
        <input type="text" id="search-input" placeholder="Ligne, arrêt, quartier..." value="${searchQuery}" autofocus>
      </div>
      <div class="results-list" id="search-results-body">${renderSearchBody()}</div>
    </div>
  `
}

function renderSearchBody() {
  const r = getSearchResults(searchQuery)
  if (r.length === 0) return '<div class="empty-state"><p>Aucun résultat trouvé.</p></div>'
  return r.map(res => {
    const isStop = res.type === 'stop'
    return `
      <div class="result-item" data-type="${res.type}" ${isStop ? `data-stop-id="${res.stop.id}"` : `data-line-id="${res.line.id}"`}>
        <div class="res-icon">${isStop ? '🚏' : '🚌'}</div>
        <div class="res-body">
          <strong>${isStop ? res.stop.name : `Ligne ${res.line.code}`}</strong><br>
          <span class="text-muted">${isStop ? 'Point de ramassage' : res.line.name}</span>
        </div>
      </div>`
  }).join('')
}

function renderNetwork() {
  const filtered = lines.filter(l => lineFilter === 'all' || l.operatorId === lineFilter)
  return `
    <div class="page-container">
      <header class="app-header"><h1>Lignes de bus</h1></header>
      <div class="filter-row">
        <button class="filter-chip ${lineFilter === 'all' ? 'active' : ''}" data-filter="all">Toutes</button>
        <button class="filter-chip ${lineFilter === 'DDD' ? 'active' : ''}" data-filter="DDD">DDD</button>
        <button class="filter-chip ${lineFilter === 'AFTU-TATA' ? 'active' : ''}" data-filter="AFTU-TATA">TATA</button>
      </div>
      <div class="line-grid">
        ${filtered.map(l => {
          const info = getPrebakedRouteInfo(l.id)
          const dist = info ? `${(info.distance / 1000).toFixed(1)} km` : ''
          const dur = info ? `${Math.round(info.duration / 60)} min` : ''
          return `
            <div class="line-card" data-line-id="${l.id}">
              <div class="line-card-header">
                <div class="line-badge" style="background:${l.color}">${l.code}</div>
                <div style="font-weight:700">${l.operatorId}</div>
              </div>
              <div class="line-card-name">${l.name}</div>
              <div class="line-card-meta">${l.stopIds.length} arrêts ${dist ? `· ${dist} · ${dur}` : ''}</div>
            </div>`
        }).join('')}
      </div>
    </div>
  `
}

function renderPlanner() {
  const o = stops.find(s => s.id === plannerOrigin)
  const d = stops.find(s => s.id === plannerDestination)
  const journeys = (o && d) ? findJourneys(o.id, d.id) : []

  let routeInfoHtml = ''
  if (plannerLoading) {
    routeInfoHtml = `
      <div class="liq-route-loading">
        <div class="spinner"></div>
        <span>Calcul de l'itinéraire...</span>
      </div>`
  } else if (plannerRouteData) {
    const distKm = (plannerRouteData.distanceM / 1000).toFixed(1)
    const durMin = Math.round(plannerRouteData.durationSec / 60)
    routeInfoHtml = `
      <div class="liq-route-info">
        <div class="liq-badge">📍 LocationIQ Directions</div>
        <div class="liq-stats">
          <div class="liq-stat"><span class="liq-stat-val">${distKm} km</span><span class="liq-stat-lbl">Distance réelle</span></div>
          <div class="liq-stat"><span class="liq-stat-val">${durMin} min</span><span class="liq-stat-lbl">Durée estimée</span></div>
        </div>
        <button class="btn-show-on-map" id="btn-show-route-map">🗺️ Voir sur la carte</button>
      </div>`
  }

  return `
    <div class="page-container">
      <header class="app-header"><h1>Itinéraire</h1></header>
      <div class="planner-box">
        <div class="planner-row">
          <div class="dot green"></div>
          <input type="text" placeholder="Départ" value="${o ? o.name : ''}" readonly>
          <button id="btn-pick-origin" class="btn-pick">🗺️</button>
        </div>
        <div class="planner-row">
          <div class="dot red"></div>
          <input type="text" placeholder="Arrivée" value="${d ? d.name : ''}" readonly>
          <button id="btn-pick-dest" class="btn-pick">🗺️</button>
        </div>
        ${o && d ? `<button class="btn-calc-route" id="btn-calc-route">🔄 Recalculer</button>` : ''}
      </div>
      ${routeInfoHtml}
      ${o && d ? `
        <div class="planner-results">
          ${journeys.length > 0 ? journeys.slice(0, 4).map(j => `
            <div class="journey-card">
              <div class="journey-header">
                <div class="journey-time">${j.totalDurationMin} min</div>
                <div class="journey-meta">${j.segments.length > 1 ? `${j.segments.length - 1} correspondance(s)` : 'Trajet direct'}</div>
              </div>
              <div class="timeline">
                ${j.segments.map((s) => `
                  <div class="timeline-step active">
                    <div class="timeline-dot"></div>
                    <div class="step-info">
                      <div class="line-badge" style="background:${s.line.color}; width:32px; height:32px; font-size:12px">${s.line.code}</div>
                      <div>
                        <div class="step-line">${s.line.name}</div>
                        <div class="step-detail">De ${s.fromStop.name} vers ${s.toStop.name} (${s.durationMin} min)</div>
                      </div>
                    </div>
                  </div>
                `).join('')}
                <div class="timeline-step">
                  <div class="timeline-dot"></div>
                  <div class="step-info">
                    <div class="step-line">Arrivée à ${d.name}</div>
                  </div>
                </div>
              </div>
              ${j.segments.length > 1 ? `<div class="transfer-badge">Connexion optimisée</div>` : ''}
            </div>`).join('') : '<div class="empty-state">Aucun itinéraire trouvé pour ce trajet.</div>'}
        </div>` : ''}
    </div>
  `
}

function renderScan() {
  if (scanState === 'success') {
    return `
      <div class="page-container flex-center">
        <div class="success-ticket-animation">
          <div class="success-icon">✅</div>
          <h2>Ticket Validé !</h2>
          <p>Bienvenue à bord du réseau SunuBus.</p>
          <div class="ticket-details">
            <div class="ticket-row"><span>Ligne</span><strong>${trackedBusId ? lines.find(l => l.id === buses.find(b => b.id === trackedBusId)?.lineId)?.code : 'N/A'}</strong></div>
            <div class="ticket-row"><span>Prix</span><strong>250 FCFA</strong></div>
            <div class="ticket-row"><span>Date</span><strong>${new Date().toLocaleTimeString()}</strong></div>
          </div>
          <button class="btn btn-primary" id="reset-scan" style="margin-top:20px; width:100%">Terminer</button>
        </div>
      </div>`
  }

  return `
    <div class="page-container scanner-page">
      <header class="app-header">
        <h1>Validation QR</h1>
        <p class="text-muted">Scannez le code QR à l'entrée du bus</p>
      </header>
      
      <div class="scanner-viewport">
        <div class="scanner-frame">
          <div class="scanner-line"></div>
          <div class="corner top-left"></div><div class="corner top-right"></div>
          <div class="corner bottom-left"></div><div class="corner bottom-right"></div>
        </div>
        ${scanState === 'scanning' ? '<div class="scanning-status">Analyse en cours...</div>' : ''}
      </div>

      <div class="scanner-footer">
        <button class="btn-scan-trigger" id="trigger-scan">
          ${scanState === 'scanning' ? '<div class="spinner-small"></div>' : 'Simuler un scan'}
        </button>
        <p class="hint">Placez le code QR dans le rectangle pour valider votre montée.</p>
      </div>
    </div>
  `
}

function renderTabBar() {
  const tabs = [
    { id: 'map', l: 'Carte', i: ICON_MAP },
    { id: 'planner', l: 'Trajet', i: ICON_PLANNER },
    { id: 'scan', l: 'Scanner', i: ICON_QR },
    { id: 'search', l: 'Lignes', i: ICON_SEARCH },
    { id: 'lines', l: 'Réseau', i: ICON_NETWORK },
  ]
  return `
    <div class="bottom-tab-bar">
      ${tabs.map(t => `
        <button class="tab-btn ${activeTab === t.id ? 'active' : ''}" data-tab="${t.id}">
          ${t.i}<span>${t.l}</span>
        </button>`).join('')}
    </div>
  `
}

// ── Event Listeners ────────────────────────────────────────────────────────
function attachListeners() {
  const ui = document.body
  ui.querySelectorAll('.tab-btn').forEach(b =>
    b.addEventListener('click', (e: any) => { activeTab = e.currentTarget.dataset.tab; clearPlannerFromMap(); render() })
  )
  ui.querySelectorAll('.op-filter-btn').forEach(b =>
    b.addEventListener('click', (e: any) => { mapOperatorFilter = e.currentTarget.dataset.op; render() })
  )
  ui.querySelector('#untrack-btn')?.addEventListener('click', () => { trackedBusId = null; render() })
  ui.querySelector('#close-sheet')?.addEventListener('click', () => { selectedStopId = null; trackedBusId = null; render() })
  ui.querySelector('#go-search')?.addEventListener('click', () => { activeTab = 'search'; render() })
  ui.querySelector('#go-planner')?.addEventListener('click', () => { activeTab = 'planner'; render() })
  ui.querySelector('#cancel-picking')?.addEventListener('click', () => { plannerPicking = null; render() })

  if (activeTab === 'planner') {
    ui.querySelector('#btn-pick-origin')?.addEventListener('click', () => { plannerPicking = 'origin'; activeTab = 'map'; render() })
    ui.querySelector('#btn-pick-dest')?.addEventListener('click', () => { plannerPicking = 'destination'; activeTab = 'map'; render() })
    ui.querySelector('#btn-calc-route')?.addEventListener('click', () => { plannerRouteData = null; triggerPlannerRoute() })
    ui.querySelector('#btn-show-route-map')?.addEventListener('click', () => { showPlannerOnMap() })
  }

  if (activeTab === 'scan') {
    ui.querySelector('#trigger-scan')?.addEventListener('click', () => {
      if (scanState !== 'idle') return
      scanState = 'scanning'
      render()
      setTimeout(() => {
        scanState = 'success'
        render()
      }, 2000)
    })
    ui.querySelector('#reset-scan')?.addEventListener('click', () => {
      scanState = 'idle'
      activeTab = 'map'
      render()
    })
  }

  ui.querySelectorAll('.filter-chip').forEach(b =>
    b.addEventListener('click', (e: any) => { lineFilter = e.currentTarget.dataset.filter; render() })
  )
  ui.querySelectorAll('.line-card').forEach(b =>
    b.addEventListener('click', (e: any) => {
      const lId = (e.currentTarget as any).dataset.lineId
      const bus = buses.find(x => x.lineId === lId)
      if (bus) { trackedBusId = bus.id; selectedStopId = null; activeTab = 'map'; render() }
    })
  )
  ui.querySelectorAll('.btn-view-on-map').forEach(b =>
    b.addEventListener('click', (e: any) => {
      const lId = e.currentTarget.dataset.trackLine
      const bus = buses.find(x => x.lineId === lId)
      if (bus) { trackedBusId = bus.id; activeTab = 'map'; render() }
    })
  )

  // Search live
  ui.querySelector('#search-input')?.addEventListener('input', (e: any) => {
    searchQuery = e.target.value
    const body = ui.querySelector('#search-results-body')
    if (body) body.innerHTML = renderSearchBody()
    attachSearchResultListeners()
  })
  attachSearchResultListeners()
}

function attachSearchResultListeners() {
  document.querySelectorAll('.result-item').forEach(el =>
    el.addEventListener('click', (ev: any) => {
      const type = ev.currentTarget.dataset.type
      if (type === 'stop') {
        selectedStopId = ev.currentTarget.dataset.stopId; activeTab = 'map'; render()
      } else {
        const bus = buses.find(x => x.lineId === ev.currentTarget.dataset.lineId)
        if (bus) { trackedBusId = bus.id; activeTab = 'map'; render() }
      }
    })
  )
}

// ── Boucle principale ──────────────────────────────────────────────────────
window.setInterval(() => {
  tickBuses()
  if (activeTab === 'map') updateBusMarkers()
}, 1500)

render()
setTimeout(initMap, 100)
