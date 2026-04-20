import { buses, lines, stops } from './data/network'
import { getPredictions, getSearchResults, tickBuses, formatEta, findJourneys } from './lib/transit'
import { GPS, getFullRoadPathSync, interpolate } from './lib/routing'
import type { RoadGeometry } from './lib/routing'
import './style.css'

declare const L: any

// ── State ──────────────────────────────────────────────────────────────────
type Tab = 'map' | 'search' | 'lines' | 'profile' | 'planner'
let activeTab: Tab = 'map'
let searchQuery = ''
let lineFilter = 'all'
let mapOperatorFilter = 'all'
let selectedStopId: string | null = null
let trackedBusId: string | null = null
let isDarkMode = false
let showStats = false
let plannerPicking: 'origin' | 'destination' | null = null
let plannerOrigin: string | null = null
let plannerDestination: string | null = null

// ── Layers ──────────────────────────────────────────────────────────────────
let leafletMap: any
let stopsLayer: any
let busCircles = new Map<string, any>()
let routePolyline: any
let routeDecorators: any
let canvasRenderer: any

const BUS_SVG = `<svg viewBox="0 0 24 24"><path d="M18,11H6V5H18M16.5,17A1.5,1.5 0 0,1 15,15.5A1.5,1.5 0 0,1 16.5,14A1.5,1.5 0 0,1 18,15.5A1.5,1.5 0 0,1 16.5,17M7.5,17A1.5,1.5 0 0,1 6,15.5A1.5,1.5 0 0,1 7.5,14A1.5,1.5 0 0,1 9,15.5A1.5,1.5 0 0,1 7.5,17M4,16c0,0.88,0.39,1.67,1,2.22V20a1,1,0,0,0,1,1h1a1,1,0,0,0,1-1V19h8v1a1,1,0,0,0,1,1h1a1,1,0,0,0,1-1V18.22c0.61-0.55,1-1.34,1-2.22V6c0-3.5-3.58-4-8-4s-8,0.5-8,4V16Z"/></svg>`
const GARE_SVG = `<svg viewBox="0 0 24 24" width="24" height="24" fill="#1565c0"><path d="M12,2L4,11V21H20V11L12,2M12,4.42L18,11.16V19H14V13H10V19H6V11.16L12,4.42M11,11V12H13V11H11Z" /></svg>`

const GARES = ['palais', 'petersen', 'colobane', 'aeroport', 'pikine', 'rufisque', 'diamniadio']

// Corridors de fond de carte (Axes majeurs de Dakar)
const CORRIDORS_RAW = [
  ['palais', 'medina', 'fann', 'mermoz', 'ouakam', 'ngor'], // Corniche
  ['colobane', 'hlm', 'castors', 'liberte6', 'grand-yoff', 'patte-oie'], // Front de Terre
  ['petersen', 'fass', 'hlm', 'patte-oie', 'pikine'], // Autoroute Spine
]

async function initMap() {
  if (leafletMap) { leafletMap.invalidateSize(); return }
  if (typeof L === 'undefined') return
  canvasRenderer = L.canvas({ padding: 0.5 })
  leafletMap = L.map('map-layer', { zoomControl: false, minZoom: 11, maxZoom: 18 }).setView([14.7137, -17.4300], 12)
  
  L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    attribution: 'Google Maps'
  }).addTo(leafletMap)
  
  stopsLayer = L.layerGroup().addTo(leafletMap)
  routeDecorators = L.layerGroup().addTo(leafletMap)

  const userIcon = L.divIcon({ className:'', html:'<div class="user-dot-marker" style="background:#fff; border:3px solid #1a73e8; box-shadow:0 0 10px rgba(0,0,0,0.5)"></div>', iconSize:[20,20], iconAnchor:[10,10]})
  L.marker([14.7137, -17.4300], { icon: userIcon, zIndexOffset: 2000 }).addTo(leafletMap)

  // Tracer les corridors de fond avec le routage Iron-Track
  for (const cor of CORRIDORS_RAW) {
     const road = getFullRoadPathSync(cor)
     L.polyline(road.coords, { color:'#fff', weight:2, opacity:0.5 }).addTo(leafletMap)
  }

  // WARM UP CACHE for all lines in background
  lines.forEach((line) => getFullRoadPathSync(line.stopIds))

  stops.forEach(stop => {
    const c = GPS[stop.id]; if(!c) return
    const isGare = GARES.includes(stop.id)
    
    const icon = L.divIcon({ 
      className: '', 
      html: isGare 
        ? `<div class="gare-marker">${GARE_SVG}</div>` 
        : `<div class="stop-dot-marker"></div>`,
      iconSize: isGare ? [32, 32] : [8, 8],
      iconAnchor: isGare ? [16, 16] : [4, 4]
    })
    
    const m = L.marker(c, { icon, renderer: canvasRenderer }).addTo(stopsLayer)
    m.on('click', () => { 
        if (plannerPicking) {
            if (plannerPicking === 'origin') plannerOrigin = stop.id
            else plannerDestination = stop.id
            plannerPicking = null
            activeTab = 'planner'
        } else {
            selectedStopId = stop.id 
        }
        render() 
    })
  })
}

function updateBusMarkers() {
  if (!leafletMap) return
  if (routePolyline) { leafletMap.removeLayer(routePolyline); routePolyline = null }
  routeDecorators.clearLayers()

  if (activeTab === 'map') {
    if (!leafletMap.hasLayer(stopsLayer)) stopsLayer.addTo(leafletMap)
  }

  for (const bus of buses) {
    const line = lines.find(l => l.id === bus.lineId); if (!line) continue
    const isT = bus.id === trackedBusId
    
    if (trackedBusId && !isT) { const ex=busCircles.get(bus.id); if(ex) ex.remove(); continue }
    if (!trackedBusId && mapOperatorFilter!=='all' && line.operatorId!==mapOperatorFilter) { const ex=busCircles.get(bus.id); if(ex) ex.remove(); continue }

    const road = getFullRoadPathSync(line.stopIds)
    if (road.coords.length < 2) continue

    if (isT) {
      routePolyline = L.polyline(road.coords, { color:line.color, weight:6, opacity:0.8, dashArray:'10,10' }).addTo(leafletMap)
      decorateRoute(road, line.color)
    }
    
    const [lat, lng] = interpolate(road, bus.progress)
    
    let marker = busCircles.get(bus.id)
    if(marker) {
      if (isT) {
        if (!(marker instanceof L.Marker)) {
          marker.remove()
          const busIcon = L.divIcon({ 
            className: 'bus-figure-container',
            html: `<div class="bus-plate-badge">${bus.plate}</div><div class="bus-figure" style="background:${line.color};">${BUS_SVG}</div>`,
            iconSize: [80, 60],
            iconAnchor: [40, 50]
          })
          const newMarker = L.marker([lat, lng], { icon: busIcon, zIndexOffset: 3000 }).addTo(leafletMap)
          newMarker.on('click', () => { trackedBusId = bus.id; render() })
          busCircles.set(bus.id, newMarker)
        } else {
          marker.setLatLng([lat, lng])
        }
      } else {
        if (marker instanceof L.Marker) {
          marker.remove()
          marker = L.circleMarker([lat, lng], { radius:8, fillColor:line.color, fillOpacity:1, color:'#fff', weight:2, renderer:canvasRenderer }).addTo(leafletMap)
          marker.on('click', () => { trackedBusId = bus.id; render() })
          busCircles.set(bus.id, marker)
        } else {
          marker.setLatLng([lat, lng])
        }
      }
    } else {
      if (isT) {
          const busIcon = L.divIcon({ 
            className: 'bus-figure-container',
            html: `<div class="bus-plate-badge">${bus.plate}</div><div class="bus-figure" style="background:${line.color};">${BUS_SVG}</div>`,
            iconSize: [80, 60],
            iconAnchor: [40, 50]
          })
          const newMarker = L.marker([lat, lng], { icon: busIcon, zIndexOffset: 3000 }).addTo(leafletMap)
          newMarker.on('click', () => { trackedBusId=bus.id; render() })
          busCircles.set(bus.id, newMarker)
      } else {
        const cMarker = L.circleMarker([lat, lng], { radius:8, fillColor:line.color, fillOpacity:1, color:'#fff', weight:2, renderer:canvasRenderer }).addTo(leafletMap)
        cMarker.on('click', () => { trackedBusId = bus.id; render() })
        busCircles.set(bus.id, cMarker)
      }
    }
  }
}

function decorateRoute(road: RoadGeometry, color: string) {
  const interval = 2
  for (let d = interval; d < road.total; d += interval) {
    const p1 = interpolate(road, (d-0.05)/road.total)
    const p2 = interpolate(road, d/road.total)
    const angle = Math.atan2(p2[1]-p1[1], p2[0]-p1[0]) * 180 / Math.PI
    L.marker(p2, {
      icon: L.divIcon({
        className: 'route-arrow',
        html: `<div style="transform: rotate(${angle+90}deg); color:${color}">▼</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })
    }).addTo(routeDecorators)
  }
}

// ── Rendering & Logic ──────────────────────────────────────────────────────
function render() {
  const root = document.getElementById('app')
  if (!root) return
  
  let content = ''
  if (activeTab === 'map') {
      content = `
        <div id="map-layer" style="width:100%; height:calc(100vh - 70px);"></div>
        ${renderMapUI()}
        ${selectedStopId ? renderStopSheet() : ''}
        ${trackedBusId ? renderBusSheet() : ''}
        ${plannerPicking ? `<div id="picking-overlay" style="position:fixed;top:80px;left:50%;transform:translateX(-50%);background:var(--admin-secondary);color:#fff;padding:12px 24px;border-radius:30px;z-index:3000;box-shadow:var(--shadow);">📍 Sélectionnez un arrêt sur la carte <button id="cancel-picking" style="margin-left:10px;background:none;border:none;color:#fff;font-weight:bold;cursor:pointer;">X</button></div>` : ''}
      `
  } else if (activeTab === 'search') {
      content = renderSearch()
  } else if (activeTab === 'lines') {
      content = renderNetwork()
  } else if (activeTab === 'planner') {
      content = renderPlanner()
  }

  root.innerHTML = `<div class="mobile-container ${isDarkMode?'dark':''}">${content}${renderTabBar()}</div>`
  
  if (activeTab === 'map') initMap()
  attachListeners()
}

function renderMapUI() {
  return `
    <div class="map-controls">
      <div class="op-filters">
        <button class="op-filter-btn ${mapOperatorFilter==='all'?'active':''}" data-op="all">Tous</button>
        <button class="op-filter-btn ${mapOperatorFilter==='DDD'?'active':''}" data-op="DDD">DDD</button>
        <button class="op-filter-btn ${mapOperatorFilter==='AFTU'?'active':''}" data-op="AFTU">AFTU-TATA</button>
      </div>
      <button id="toggle-dark" class="control-btn">${isDarkMode?'☀️':'🌙'}</button>
      <div class="stats-panel-toggle">
        <button id="toggle-stats" class="control-btn"><svg viewBox="0 0 24 24" width="20" height="20"><path d="M5,19V8H8v11H5M10,19V3h3v16H10M15,19V11h3v8H15Z" fill="currentColor"/></svg> Stats <span style="font-size:10px;opacity:0.7">▼</span></button>
      </div>
    </div>
    ${showStats ? renderStatsOverlay() : ''}
    ${!trackedBusId ? `
      <div class="main-fab-container">
        <button class="fab-btn secondary-fab" id="go-planner"><span>Itinéraire</span></button>
        <button class="fab-btn primary-fab" id="go-search"><span>Où allez-vous ?</span></button>
      </div>
    ` : ''}
  `
}

function renderStatsOverlay() {
  const dddCount = buses.filter(b => lines.find(l=>l.id===b.lineId)?.operatorId==='DDD').length
  const aftuCount = buses.filter(b => lines.find(l=>l.id===b.lineId)?.operatorId==='AFTU-TATA').length
  return `<div class="stats-overlay"><div class="stat-item"><span class="stat-label">Bus DDD</span><span class="stat-count">${dddCount}</span></div><div class="stat-item"><span class="stat-label">AFTU TATA</span><span class="stat-count">${aftuCount}</span></div></div>`
}

function renderStopSheet() {
  const stop = stops.find(s => s.id === selectedStopId); if(!stop) return ''
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
            <div class="line-info"><strong>Vers ${p.line.headsign}</strong><br><span class="text-muted">Prochain bus</span></div>
            <div class="arrival-time">${formatEta(p.etaMin)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `
}

function renderBusSheet() {
  const bus = buses.find(b => b.id === trackedBusId); if(!bus) return ''
  const line = lines.find(l => l.id === bus.lineId); if(!line) return ''
  return `
    <div class="bottom-sheet bus-sheet">
      <div class="sheet-handle" id="close-sheet"></div>
      <div class="bus-header">
        <div class="line-circle" style="background:${line.color}">${line.code}</div>
        <div class="bus-info">
          <h3>${line.operatorId} Ligne ${line.code} — ${line.name}</h3>
          <p class="text-muted">Immat. ${bus.plate}</p>
        </div>
      </div>
      <div class="bus-status-grid">
        <div class="status-card">
          <div class="status-label">PROGRESSION LIVE</div>
          <div class="progress-bar-container"><div class="progress-bar-fill" style="width:${Math.round(bus.progress*100)}%"></div></div>
          <div class="status-value">${Math.round(bus.progress*100)}%</div>
          <div class="status-sub"><svg viewBox="0 0 24 24" width="12" height="12"><path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.53 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" fill="currentColor"/></svg> Prochain arrêt : <strong>${stops.find(s=>s.id===line.stopIds[Math.min(line.stopIds.length-1, Math.floor(bus.progress*line.stopIds.length)+1)])?.name}</strong></div>
        </div>
      </div>
      <div class="action-row">
        <button class="btn btn-danger-ghost" id="untrack-btn">Quitter le suivi</button>
        <button class="btn btn-warning" onclick="alert('Signalement envoyé au PC de commandement')">⚠️ Signaler</button>
      </div>
    </div>
  `
}

function renderSearch() {
  return `<div class="page-container"><header class="app-header"><h1>Explorer le réseau</h1></header><div class="search-box-container"><input type="text" id="search-input" placeholder="Ligne, arrêt, quartier..." value="${searchQuery}" autofocus></div><div class="results-list" id="search-results-body">${renderSearchBody()}</div></div>`
}

function renderSearchBody() {
  const r = getSearchResults(searchQuery)
  if (r.length===0) return '<div class="empty-state"><p>Aucun résultat trouvé.<br>Essayez "Ligne 27" ou "Plateau".</p></div>'
  return r.map(res => {
    const isStop = res.type === 'stop'
    return `
      <div class="result-item" data-type="${res.type}" ${isStop ? `data-stop-id="${res.stop.id}"` : `data-line-id="${res.line.id}"`}>
        <div class="res-icon">${isStop ? '🚏' : '🚌'}</div>
        <div class="res-body"><strong>${isStop ? res.stop.name : `Ligne ${res.line.code}`}</strong><br><span class="text-muted">${isStop ? 'Point de ramassage' : res.line.name}</span></div>
        <div class="res-arrow">›</div>
      </div>
    `
  }).join('')
}

function renderNetwork() {
  const filtered = lines.filter(l => lineFilter==='all' || l.operatorId===lineFilter)
  return `
    <div class="page-container">
      <header class="app-header"><h1>Lignes de bus</h1></header>
      <div class="filter-row">
        <button class="filter-chip ${lineFilter==='all'?'active':''}" data-filter="all">Toutes</button>
        <button class="filter-chip ${lineFilter==='DDD'?'active':''}" data-filter="DDD">DDD</button>
        <button class="filter-chip ${lineFilter==='AFTU'?'active':''}" data-filter="AFTU">TATA</button>
      </div>
      <div class="line-grid">
        ${filtered.map(l => `<div class="line-card" data-line-id="${l.id}"><div class="line-card-header"><div class="line-badge" style="background:${l.color}">${l.code}</div><div style="font-weight:700">${l.operatorId}</div></div><div class="line-card-name">${l.name}</div><div class="line-card-meta">${l.stopIds.length} arrêts • 15 min</div></div>`).join('')}
      </div>
    </div>
  `
}

function renderPlanner() {
  const o = stops.find(s=>s.id===plannerOrigin), d = stops.find(s=>s.id===plannerDestination)
  const journeys = (o && d) ? findJourneys(o.id, d.id) : []
  return `
    <div class="page-container">
      <header class="app-header"><h1>Itinéraire</h1></header>
      <div class="planner-box">
        <div class="planner-row"><div class="dot green"></div><input type="text" id="planner-origin-input" placeholder="Point de départ" value="${o?o.name:''}" readonly><button id="btn-pick-origin" class="btn-pick">🗺️</button></div>
        <div class="planner-divider"></div>
        <div class="planner-row"><div class="dot red"></div><input type="text" id="planner-dest-input" placeholder="Point d'arrivée" value="${d?d.name:''}" readonly><button id="btn-pick-dest" class="btn-pick">🗺️</button></div>
        <div id="planner-suggestions"></div>
      </div>
      ${o && d ? `<div class="planner-results">${journeys.length>0 ? journeys.map(j => `<div class="journey-card"><div class="journey-time">${j.totalDurationMin} min</div><div class="journey-steps">${j.segments.map(s => `<div class="step"><div class="line-circle" style="background:${s.line.color}; width:20px; height:20px; font-size:10px">${s.line.code}</div><span>${s.line.name}</span></div>`).join('')}</div></div>`).join('') : '<p class="text-muted" style="text-align:center;padding:20px">Aucun trajet direct trouvé. Recherche multi-correspondance bientôt...</p>'}</div>` : '<div class="empty-state"><img src="https://img.icons8.com/color/96/000000/map-marker.png" style="opacity:0.3; margin-bottom:10px"><p>Choisissez un point de départ et d\'arrivée pour voir les trajets disponibles.</p></div>'}
    </div>
  `
}

function renderTabBar() {
  return `<div class="bottom-tab-bar">${[{id:'map',l:'Carte'},{id:'planner',l:'Trajet'},{id:'search',l:'Lignes'},{id:'lines',l:'Réseau'}].map(t=>`<button class="tab-btn ${activeTab===t.id?'active':''}" data-tab="${t.id}">${t.l}</button>`).join('')}</div>`
}

function attachListeners() {
  uiLayer.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', (e:any) => { activeTab = e.currentTarget.dataset.tab; plannerPicking = null; render() }))
  uiLayer.querySelectorAll('.op-filter-btn').forEach(b => b.addEventListener('click', (e:any) => { mapOperatorFilter = e.currentTarget.dataset.op; render() }))
  uiLayer.querySelector('#toggle-dark')?.addEventListener('click', () => { isDarkMode = !isDarkMode; render() })
  uiLayer.querySelector('#toggle-stats')?.addEventListener('click', () => { showStats = !showStats; render() })
  uiLayer.querySelector('#cancel-picking')?.addEventListener('click', () => { plannerPicking = null; render() })
  uiLayer.querySelector('#untrack-btn')?.addEventListener('click', () => { trackedBusId = null; if(routePolyline) leafletMap.removeLayer(routePolyline); render() })
  uiLayer.querySelector('#close-sheet')?.addEventListener('click', () => { selectedStopId = null; trackedBusId = null; render() })
  uiLayer.querySelector('#go-search')?.addEventListener('click', () => { activeTab = 'search'; render() })
  uiLayer.querySelector('#go-planner')?.addEventListener('click', () => { activeTab = 'planner'; render() })
  if (activeTab==='planner') {
    uiLayer.querySelector('#btn-pick-origin')?.addEventListener('click', () => { plannerPicking = 'origin'; activeTab='map'; render() })
    uiLayer.querySelector('#btn-pick-dest')?.addEventListener('click', () => { plannerPicking = 'destination'; activeTab='map'; render() })
  }
  uiLayer.querySelectorAll('.btn-view-on-map').forEach(b => b.addEventListener('click', (e:any) => { const lId = e.currentTarget.dataset.trackLine; const bus = buses.find(x=>x.lineId===lId); if(bus){trackedBusId=bus.id;activeTab='map';render()} }))
  const sIn = uiLayer.querySelector<HTMLInputElement>('#search-input')
  if (sIn) sIn.addEventListener('input', (e:any) => { searchQuery = e.target.value; const b = document.getElementById('search-results-body'); if(b){b.innerHTML=renderSearchBody();attachSearchBodyListeners()} })
  uiLayer.querySelectorAll('.filter-chip').forEach(b => b.addEventListener('click', (e:any) => { lineFilter = e.currentTarget.dataset.filter; render() }))
  uiLayer.querySelectorAll('.line-card').forEach(b => b.addEventListener('click', (e:any) => { 
    const lId = (e.currentTarget as any).dataset.lineId; const bus = buses.find(x => x.lineId === lId)
    if (bus) { trackedBusId = bus.id; selectedStopId = null; activeTab = 'map'; render() }
  }))
  attachSearchBodyListeners()
}

function attachSearchBodyListeners() {
  uiLayer.querySelectorAll('.result-item').forEach(b => b.addEventListener('click', (e:any) => { 
    const sId = e.currentTarget.dataset.stopId; const lId = e.currentTarget.dataset.lineId
    if (sId) { selectedStopId = sId; activeTab='map'; render() }
    else if (lId) { const bus = buses.find(x => x.lineId === lId); if (bus) { trackedBusId = bus.id; selectedStopId = null; activeTab = 'map'; render() } }
  }))
}

const uiLayer = document.body
window.setInterval(() => { tickBuses(); if(activeTab==='map') updateBusMarkers() }, 1500)
render(); setTimeout(initMap, 100)
