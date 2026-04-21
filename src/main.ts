import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { buses, lines, stops } from './data/network'
import { ROUTE_GEOMETRIES } from './data/route_geometries'
import { getPredictions, getSearchResults, tickBuses, formatEta, findJourneys, getEtaMinutes, getOccupancyLabel, getTrafficLabel } from './lib/transit'
import { GPS, getLineRoadGeometry, interpolate, getPlannerRoute, getPrebakedRouteInfo, sliceRoad, getDistanceKm } from './lib/routing'
import type { RoadGeometry, DirectionsResult } from './lib/routing'
import './style.css'

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
let plannerOriginQuery = ''
let plannerDestQuery = ''
let userCoords: [number, number] | null = null
let userMarker: any = null
let lastJourneys: any[] = []
let plannerSegmentPolylines: any[] = []
let viewingItinerary = false
let trackingTargetStopId: string | null = null
let isLoggedIn = false
let userProfile = { name: 'Invité', email: '' }

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
const ICON_NETWORK = `<svg viewBox="0 0 24 24" width="24" height="24"><path d="M18,11H6V5H18M16.5,17A1.5,1.5 0 0,1 15,15.5A1.5,1.5 0 0,1 16.5,14A1.5,1.5 0 0,1 18,15.5A1.5,1.5 0 0,1 16.5,14A1.5,1.5 0 0,1 18,15.5A1.5,1.5 0 0,1 16.5,17M7.5,17A1.5,1.5 0 0,1 6,15.5A1.5,1.5 0 0,1 7.5,14A1.5,1.5 0 0,1 9,15.5A1.5,1.5 0 0,1 7.5,17M4,16c0,0.88,0.39,1.67,1,2.22V20a1,1,0,0,0,1,1h1a1,1,0,0,0,1-1V19h8v1a1,1,0,0,0,1,1h1a1,1,0,0,0,1-1V18.22c0.61-0.55,1-1.34,1-2.22V6c0-3.5-3.58-4-8-4s-8,0.5-8,4V16Z" fill="currentColor"/></svg>`
const ICON_QR = `<svg viewBox="0 0 24 24" width="24" height="24"><path d="M4,4H10V10H4V4M14,4H20V10H14V4M4,14H10V20H4V14M14,14H17V17H14V14M17,17H20V20H17V17M14,17H11V14H14V17M11,11H13V13H11V11M8,8H6V6H8V8M18,8H16V6H18V8M8,18H6V16H8V18M13,11V13H11V11H13M14,11V13H16V11H14M18,14H20V16H18V14M16,16H18V18H16V16M14,19H16V21H14V19M18,19H20V21H18V19M16,14V16H14V14H16M11,14V16H13V14H11Z" fill="currentColor"/></svg>`

const BUS_SVG_PATH = `<path d="M18,11H6V5H18M16.5,17A1.5,1.5 0 0,1 15,15.5A1.5,1.5 0 0,1 16.5,14A1.5,1.5 0 0,1 18,15.5A1.5,1.5 0 0,1 16.5,14A1.5,1.5 0 0,1 18,15.5A1.5,1.5 0 0,1 16.5,17M7.5,17A1.5,1.5 0 0,1 6,15.5A1.5,1.5 0 0,1 7.5,14A1.5,1.5 0 0,1 9,15.5A1.5,1.5 0 0,1 7.5,17M4,16c0,0.88,0.39,1.67,1,2.22V20a1,1,0,0,0,1,1h1a1,1,0,0,0,1-1V19h8v1a1,1,0,0,0,1,1h1a1,1,0,0,0,1-1V18.22c0.61-0.55,1-1.34,1-2.22V6c0-3.5-3.58-4-8-4s-8,0.5-8,4V16Z"/>`
const GARE_SVG = `<svg viewBox="0 0 24 24" width="24" height="24" fill="#1565c0"><path d="M12,2L4,11V21H20V11L12,2M12,4.42L18,11.16V19H14V13H10V19H6V11.16L12,4.42M11,11V12H13V11H11Z" /></svg>`

const GARES = ['palais', 'petersen', 'colobane', 'aeroport', 'pikine', 'rufisque', 'diamniadio']

// ── Compteur de lignes pré-baked ──────────────────────────────────────────
const prebakedCount = Object.keys(ROUTE_GEOMETRIES).length

// ── Localisation Utilisateur ────────────────────────────────────────────────
function requestUserLocation() {
  if (!navigator.geolocation) return
  navigator.geolocation.getCurrentPosition((pos) => {
    userCoords = [pos.coords.latitude, pos.coords.longitude]
    if (leafletMap) {
      if (userMarker) userMarker.setLatLng(userCoords)
      else {
        const userIcon = L.divIcon({
          className: '',
          html: '<div class="user-dot-marker"></div>',
          iconSize: [20, 20], iconAnchor: [10, 10]
        })
        userMarker = L.marker(userCoords, { icon: userIcon, zIndexOffset: 2000 }).addTo(leafletMap)
      }
      leafletMap.setView(userCoords, 15)
    }
    render()
  }, (err) => console.warn('Géolocalisation refusée', err), { enableHighAccuracy: true })
}

// ── Carte SunuBus ──────────────────────────────────────────────────────────
async function initMap() {
  if (leafletMap) { 
    setTimeout(() => leafletMap.invalidateSize(), 100);
    return 
  }

  canvasRenderer = L.canvas({ padding: 0.5 })
  leafletMap = L.map('map-layer', { 
    preferCanvas: true,
    zoomControl: false, 
    minZoom: 11, 
    maxZoom: 18 
  }).setView([14.7137, -17.4300], 12)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(leafletMap)

  stopsLayer = L.layerGroup().addTo(leafletMap)
  routeDecorators = L.layerGroup().addTo(leafletMap)

  requestUserLocation()

  if (userCoords) {
    const userIcon = L.divIcon({
      className: '',
      html: '<div class="user-dot-marker"></div>',
      iconSize: [20, 20], iconAnchor: [10, 10]
    })
    userMarker = L.marker(userCoords, { icon: userIcon, zIndexOffset: 2000 }).addTo(leafletMap)
  }

  stops.forEach(stop => {
    const c = GPS[stop.id]; if (!c) return
    
    // FILTRE RÉALITÉ : On ignore les arrêts qui sont dans la mer ou hors de Dakar
    const [lat, lon] = c
    if (lat < 14.65 || lat > 14.85 || lon < -17.55 || lon > -17.25) return
    if (lat < 14.70 && lon > -17.41) return // Bordure Port/Mer
    const isGare = GARES.includes(stop.id)
    const icon = L.divIcon({
      className: '',
      html: isGare
        ? `<div class="gare-marker">${GARE_SVG}</div>`
        : `<div class="stop-dot-marker"></div>`,
      iconSize: isGare ? [36, 36] : [28, 28],
      iconAnchor: isGare ? [18, 18] : [14, 14],
    })
    const m = L.marker(c, { icon }).addTo(stopsLayer)
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

function showPlannerOnMap() {
  if (!plannerRouteData || !leafletMap) return
  clearPlannerFromMap()

  plannerRoutePolyline = L.polyline(plannerRouteData.geometry, {
    color: '#1a73e8', weight: 8, opacity: 0.9,
    lineCap: 'round', lineJoin: 'round'
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
  viewingItinerary = true
  activeTab = 'map'
  render()
}

function clearPlannerFromMap() {
  if (plannerRoutePolyline) { leafletMap.removeLayer(plannerRoutePolyline); plannerRoutePolyline = null }
  plannerMarkers.forEach(m => leafletMap.removeLayer(m))
  plannerMarkers = []
  plannerSegmentPolylines.forEach(p => leafletMap.removeLayer(p))
  plannerSegmentPolylines = []
  viewingItinerary = false
}

function showJourneyOnMap(idx: number) {
  const j = lastJourneys[idx]
  if (!j || !leafletMap) return
  clearPlannerFromMap()

  const bounds = L.latLngBounds([])

  j.segments.forEach((s: any) => {
    const c1 = GPS[s.fromStop.id], c2 = GPS[s.toStop.id]
    if (!c1 || !c2) return
    bounds.extend(c1); bounds.extend(c2)

    if (s.kind === 'walk') {
      const p = L.polyline([c1, c2], { color: '#999', weight: 4, dashArray: '8, 8', opacity: 0.6 }).addTo(leafletMap)
      plannerSegmentPolylines.push(p)
    } else {
      const fullRoad = getLineRoadGeometry(s.line.id, s.line.stopIds)
      const sliced = sliceRoad(fullRoad, s.line.stopIds, s.fromStop.id, s.toStop.id)
      const p = L.polyline(sliced.coords, { color: s.line.color, weight: 6, opacity: 0.8 }).addTo(leafletMap)
      plannerSegmentPolylines.push(p)
      plannerMarkers.push(L.circleMarker(c1, { radius: 6, color: '#fff', fillColor: s.line.color, fillOpacity: 1, weight: 2 }).addTo(leafletMap))
    }
  })

  leafletMap.fitBounds(bounds, { padding: [80, 80] })
  viewingItinerary = true
  activeTab = 'map'
  render()
}

function showFullNetworkOnMap() {
  if (!leafletMap) return
  clearPlannerFromMap()
  
  // Groupe pour tous les tracés
  const networkGroup = L.layerGroup()
  
  lines.forEach(line => {
    const road = getLineRoadGeometry(line.id, line.stopIds)
    if (road.coords.length > 1) {
      L.polyline(road.coords, { 
        color: line.color, weight: 2, opacity: 0.4, 
        interactive: false,
        renderer: canvasRenderer 
      }).addTo(networkGroup)
    }
  })
  
  networkGroup.addTo(leafletMap)
  plannerSegmentPolylines.push(networkGroup) // Pour nettoyage facile
  
  viewingItinerary = true
  activeTab = 'map'
  render()
}
function updateBusMarkers() {
  if (!leafletMap) return
  if (routePolyline) { leafletMap.removeLayer(routePolyline); routePolyline = null }
  routeDecorators.clearLayers()

  // On cache tout si on suit un bus, si on voit un itinéraire, ou si on est en train de CHOISIR un arrêt
  const isFocus = trackedBusId || viewingItinerary || !!plannerPicking;

  // 1. Visibilité du réseau global des arrêts
  if (isFocus) {
    if (leafletMap.hasLayer(stopsLayer)) leafletMap.removeLayer(stopsLayer)
  } else {
    if (activeTab === 'map' && !leafletMap.hasLayer(stopsLayer)) stopsLayer.addTo(leafletMap)
  }

  for (const bus of buses) {
    const isT = bus.id === trackedBusId
    const line = lines.find(l => l.id === bus.lineId); if (!line) continue

    // Nettoyage immédiat si le bus doit être masqué
    const shouldHide = viewingItinerary || (trackedBusId && !isT);
    if (shouldHide) {
      const ex = busCircles.get(bus.id); if (ex) { ex.remove(); busCircles.delete(bus.id) }
      continue
    }

    if (!trackedBusId && mapOperatorFilter !== 'all' && line.operatorId !== mapOperatorFilter) {
      const ex = busCircles.get(bus.id); if (ex) { ex.remove(); busCircles.delete(bus.id) }
      continue
    }

    const road = getLineRoadGeometry(line.id, line.stopIds)
    if (road.coords.length < 2) continue

    if (isT) {
      routePolyline = L.polyline(road.coords, {
        color: line.color, weight: 8, opacity: 0.9,
      }).addTo(leafletMap)
      decorateRoute(road, line.color)

      // Ajouter les points (arrêts) de la ligne spécifiquement
      line.stopIds.forEach(sid => {
        const c = GPS[sid]
        if (c) {
          const [lat, lon] = c
          // Dakar Bounding Box check (Zéro-Mer strict)
          if (lat < 14.65 || lat > 14.85 || lon < -17.55 || lon > -17.25) return
          
          // Éviter le Port Autonome (sauf lignes spécifiques, mais par défaut on filtre les sauts mer)
          const isInPort = lat < 14.70 && lat > 14.67 && lon > -17.425
          if (isInPort) {
             // On ne garde que si c'est vraiment proche d'un arrêt connu (Cyrnos etc)
             // Sinon on suspecte un saut de géométrie
             const nearStop = stops.some(s => {
               const sc = GPS[s.id]; return sc && getDistanceKm(lat, lon, sc[0], sc[1]) < 0.3
             })
             if (!nearStop) return
          }
          L.circleMarker(c, {
            radius: 5, color: '#fff', fillColor: line.color, fillOpacity: 1, weight: 2
          }).addTo(routeDecorators)
        }
      })

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

function render() {
  const root = document.getElementById('app'); if (!root) return
  if (!root.querySelector('.mobile-container')) {
    root.innerHTML = `
      <div id="splash" class="splash-screen">
        <div class="splash-logo">🚌</div>
        <div class="splash-title">SunuBus Dakar</div>
        <div class="splash-loader"></div>
      </div>
      <div class="mobile-container">
        <div id="map-layer" style="display: none;"></div>
        <div id="page-content"></div>
        <div id="tab-bar-content"></div>
      </div>
    `
    setTimeout(() => {
      const splash = root.querySelector('#splash') as HTMLElement
      if (splash) {
        splash.style.opacity = '0'
        setTimeout(() => splash.remove(), 500)
      }
    }, 1000)
  }

  const mapLayer = root.querySelector('#map-layer') as HTMLElement
  const pageContent = root.querySelector('#page-content') as HTMLElement
  const tabBarContent = root.querySelector('#tab-bar-content') as HTMLElement

  if (activeTab === 'map') {
    mapLayer.style.display = 'block'
    pageContent.classList.remove('opaque-page')
    
    if (plannerPicking) document.body.classList.add('is-picking')
    else document.body.classList.remove('is-picking')

    updateBusMarkers() // Mise à jour immédiate des couches (bruit vs focus)

    pageContent.innerHTML = `
      ${renderMapUI()}
      ${!plannerPicking && selectedStopId ? renderStopSheet() : ''}
      ${!plannerPicking && trackedBusId ? renderBusSheet() : ''}
      ${plannerPicking ? `
        <div id="picking-overlay">
          <button id="cancel-picking" class="btn-back-picking">⬅️ Retour </button>
          <div class="picking-content">
            <span class="picking-pulse">📍</span>
            <span>Sélectionnez l'arrêt sur la carte</span>
          </div>
        </div>` : ''}
    `
    initMap()
  } else {
    mapLayer.style.display = 'none'
    pageContent.classList.add('opaque-page')
    if (activeTab === 'search') pageContent.innerHTML = renderSearch()
    else if (activeTab === 'lines') pageContent.innerHTML = renderNetwork()
    else if (activeTab === 'planner') pageContent.innerHTML = renderPlanner()
    else if (activeTab === 'scan') pageContent.innerHTML = renderScan()
    else if (activeTab === 'profile') pageContent.innerHTML = renderProfile()
  }

  tabBarContent.innerHTML = renderTabBar()
  attachListeners()
}

function renderMapUI() {
  const isFocus = trackedBusId || viewingItinerary || plannerPicking;
  
  if (isFocus) {
    return `
      <div id="route-focus-overlay">
        <button id="close-focus" class="btn-circular">✕</button>
        <div id="route-source-indicator"></div>
      </div>
    `
  }

  return `
    <div class="map-controls">
      <div class="op-filters">
        <button class="op-filter-btn ${mapOperatorFilter === 'all' ? 'active' : ''}" data-op="all">Tous</button>
        <button class="op-filter-btn ${mapOperatorFilter === 'DDD' ? 'active' : ''}" data-op="DDD">DDD</button>
        <button class="op-filter-btn ${mapOperatorFilter === 'AFTU-TATA' ? 'active' : ''}" data-op="AFTU-TATA">TATA</button>
      </div>
      <div class="data-status liq">📡 ${prebakedCount} lignes — tracés LocationIQ</div>
      <div class="main-fab-container">
        <button class="fab-btn secondary-fab" id="go-planner"><span>Itinéraire</span></button>
        <button class="fab-btn primary-fab" id="go-search"><span>Où allez-vous ?</span></button>
      </div>
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
        ${preds.length > 0 ? preds.map(p => `
          <div class="prediction-item btn-track-this-bus" data-bus-id="${p.bus.id}" data-stop-id="${stop.id}">
            <div class="line-badge" style="background:${p.line.color}">${p.line.code}</div>
            <div class="line-info">
              <strong>${p.line.code} — Vers ${p.line.headsign}</strong><br>
              <span class="text-muted">Arrivée estimée</span>
            </div>
            <div class="arrival-time-premium">
              <div class="eta-val">${formatEta(p.etaMin)}</div>
              <div class="suivre-label">Suivre ❯</div>
            </div>
          </div>`).join('') : '<div class="empty-state">Aucun bus en approche.</div>'}
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

  const stop = trackingTargetStopId ? stops.find(s => s.id === trackingTargetStopId) : null
  const etaMin = stop ? getEtaMinutes(bus, stop.id) : null

  return `
    <div class="bottom-sheet tracking-sheet">
      <div class="sheet-handle" id="close-sheet"></div>
      <div class="sheet-header">
        <div class="line-badge" style="background:${line.color}">${line.code}</div>
        <div>
          <h3>Ligne ${line.code} — ${line.name}</h3>
          <p class="text-muted">Immatriculation: <strong>${bus.plate}</strong></p>
        </div>
      </div>
      
      ${stop ? `
        <div class="eta-dashboard">
          <div class="eta-main">
            <div class="eta-label">Arrivée à ${stop.name} dans</div>
            <div class="eta-countdown">${formatEta(etaMin ?? 0)}</div>
          </div>
          <div class="eta-details">
            <div class="eta-pill occupancy">👥 ${getOccupancyLabel(bus)}</div>
            <div class="eta-pill traffic">🚦 ${getTrafficLabel(bus)}</div>
          </div>
        </div>
      ` : `
        <div class="route-info-bar">
          <div class="route-info-item"><span class="route-info-val">${distKm} km</span><span class="route-info-lbl">Distance</span></div>
          <div class="route-info-item"><span class="route-info-val">${durMin} min</span><span class="route-info-lbl">Durée</span></div>
          <div class="route-info-item"><span class="route-info-val">${line.stopIds.length}</span><span class="route-info-lbl">Arrêts</span></div>
        </div>
      `}
      
      <div class="action-row">
        <button class="btn btn-primary" id="go-to-stop" style="display:${stop?'block':'none'}" data-stop-id="${stop?.id}">Voir l'arrêt</button>
        <button class="btn btn-danger-ghost" id="untrack-btn">${stop ? 'Arrêter le suivi' : 'Quitter le suivi'}</button>
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
  const r: any[] = searchQuery.trim() ? getSearchResults(searchQuery) : lines.filter(l => l.id.includes('-1')).slice(0, 10).map(l => ({ type: 'line', line: l }))
  if (r.length === 0) return '<div class="empty-state"><p>Oups ! Nous n\'avons pas trouvé ce trajet. Essayez un autre quartier ?</p></div>'
  return r.map(res => {
    const isStop = res.type === 'stop'
    const name = isStop ? res.stop.name : `Ligne ${res.line.code}`
    const meta = isStop ? 'Point de ramassage' : res.line.name
    const idAttr = isStop ? `data-stop-id="${res.stop.id}"` : `data-line-id="${res.line.id}"`
    
    return `
      <div class="result-item" data-type="${res.type}" ${idAttr}>
        <div class="res-icon">${isStop ? '🚏' : '🚌'}</div>
        <div class="res-body">
          <strong>${name}</strong><br>
          <span class="text-muted">${meta}</span>
        </div>
      </div>`
  }).join('')
}

function renderNetwork() {
  const filteredLines = lineFilter === 'all' ? lines : lines.filter(l => l.operatorId === lineFilter)
  
  return `
    <div class="network-page">
      <div class="network-header">
        <h1>Réseau de Transport</h1>
        <p>${lines.length} lignes actives à Dakar</p>
        <button id="btn-show-full-network" class="btn-primary" style="margin-top:10px; width:100%">🛰️ Voir tout le réseau sur carte</button>
      </div>

      <div class="filter-bar">
        <button class="filter-chip ${lineFilter === 'all' ? 'active' : ''}" data-filter="all">Toutes</button>
        <button class="filter-chip ${lineFilter === 'DDD' ? 'active' : ''}" data-filter="DDD">DDD</button>
        <button class="filter-chip ${lineFilter === 'AFTU-TATA' ? 'active' : ''}" data-filter="AFTU-TATA">TATA</button>
      </div>
      <div class="line-grid">
        ${filteredLines.map(l => {
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

function renderPlannerPredictions(type: 'origin' | 'dest') {
  const query = type === 'origin' ? plannerOriginQuery : plannerDestQuery
  if (query.length < 2) return ''
  const matches = stops.filter(s => s.name.toLowerCase().includes(query.toLowerCase())).slice(0, 5)
  if (matches.length === 0) return ''
  return `
    <div class="prediction-dropdown">
      ${matches.map(m => `<div class="prediction-item" data-id="${m.id}" data-for="${type}">${m.name} <small>${m.district}</small></div>`).join('')}
    </div>`
}

function attachPlannerPredictionListeners() {
  document.querySelectorAll('.prediction-item[data-for]').forEach(el => {
    el.addEventListener('click', (e: any) => {
      const id = e.currentTarget.dataset.id
      const type = e.currentTarget.dataset.for
      if (type === 'origin') {
        plannerOrigin = id; plannerOriginQuery = ''
      } else {
        plannerDestination = id; plannerDestQuery = ''
      }
      render()
      if (plannerOrigin && plannerDestination) triggerPlannerRoute()
    })
  })
}

function renderPlanner() {
  const o = stops.find(s => s.id === plannerOrigin)
  const d = stops.find(s => s.id === plannerDestination)
  const journeys = (o && d) ? findJourneys(o.id, d.id) : []

  lastJourneys = journeys
  return `
    <div class="page-container">
      <header class="app-header"><h1>Calculer un trajet</h1></header>
      <div class="planner-box">
        <div class="planner-row">
          <div class="step-label">Départ</div>
          <div class="planner-input-wrapper">
            <div class="dot green"></div>
            <input type="text" placeholder="Entrez le lieu de départ..." value="${plannerOriginQuery || (o?o.name:'')}" id="input-origin" autocomplete="off">
            <button id="btn-pick-origin" class="btn-pick">🗺️</button>
            <div class="prediction-dropdown-container">${renderPlannerPredictions('origin')}</div>
          </div>
        </div>
        <div class="planner-row">
          <div class="step-label">Arrivée</div>
          <div class="planner-input-wrapper">
            <div class="dot red"></div>
            <input type="text" placeholder="Où allez-vous ?" value="${plannerDestQuery || (d?d.name:'')}" id="input-destination" autocomplete="off">
            <button id="btn-pick-dest" class="btn-pick">🗺️</button>
            <div class="prediction-dropdown-container">${renderPlannerPredictions('dest')}</div>
          </div>
        </div>
        <button class="btn btn-primary-premium" id="btn-calc-route" style="margin-top:20px;">
          🚀 Trouver des itinéraires
        </button>
      </div>

      ${plannerLoading ? `
        <div class="liq-route-loading">
          <div class="spinner"></div>
          <span>Analyse des lignes SunuBus...</span>
        </div>` : ''}

      ${plannerRouteData ? `
        <div class="liq-route-info-row">
           <span>📏 ${(plannerRouteData.distanceM/1000).toFixed(1)} km</span>
           <span>⏱️ ${Math.round(plannerRouteData.durationSec/60)} min</span>
           <button class="btn-show-map-tiny" onclick="showPlannerOnMap()">Voir Tracé 🗺️</button>
        </div>
      ` : ''}

      ${o && d ? `
        <div class="planner-results">
          <h3 class="results-title">Itinéraires suggérés</h3>
          ${journeys.length > 0 ? journeys.slice(0, 5).map((j, idx) => `
            <div class="journey-card clickable-journey" data-idx="${idx}">
              <div class="journey-header">
                <div class="journey-time">⏱️ ${j.totalDurationMin} min</div>
                <div class="journey-meta">${j.segments.filter(s => s.kind !== 'walk').length > 1 ? `${j.segments.filter(s => s.kind !== 'walk').length - 1} correspondance(s)` : 'Direct'}</div>
              </div>
              <div class="timeline">
                ${j.segments.map((s) => `
                  <div class="timeline-step active">
                    <div class="timeline-dot" style="${s.kind === 'walk' ? 'background:#ccc' : ''}"></div>
                    <div class="step-info">
                      ${s.kind === 'walk' 
                        ? `<div class="walk-icon">🚶</div>`
                        : `<div class="line-badge" style="background:${s.line?.color ?? '#999'}">${s.line?.code ?? '?'}</div>`
                      }
                      <div class="step-text">
                        <div class="step-line">${s.kind === 'walk' ? 'Marche' : `Ligne ${s.line?.code}`}</div>
                        <div class="step-detail">De <strong>${s.fromStop.name}</strong> à <strong>${s.toStop.name}</strong></div>
                      </div>
                    </div>
                  </div>
                `).join('')}
                <div class="timeline-step end"><div class="timeline-dot"></div><div class="step-info"><div class="step-line">Arrivée — ${d.name}</div></div></div>
              </div>
            </div>`).join('') : `
            <div class="empty-state">
              <p>Aucun itinéraire direct trouvé.</p>
              <button class="btn btn-primary-ghost" onclick="activeTab='search';render()">Voir toutes les lignes</button>
            </div>`}
        </div>` : (!plannerOriginQuery && !plannerDestQuery ? '' : `
          <div class="instruction-box">
             <p>💡 Veuillez bien sélectionner vos arrêts dans la liste proposée ou sur la carte pour lancer le calcul.</p>
          </div>
        `)}
    </div>
  `
}

function renderScan() {
  if (scanState === 'success') {
    return `
      <div class="page-container flex-center" style="background:#f0f2f5;">
        <div class="success-ticket-animation">
          <div class="success-icon">✨</div>
          <h2 style="color:#1e8e3e; font-weight:900;">TICKET VALIDÉ</h2>
          <p style="margin-bottom:20px; font-size:14px;">Bon voyage sur le réseau SunuBus !</p>
          <div class="virtual-ticket">
            <div class="ticket-top">
              <div class="sunu-logo-mini">🇸🇳 SunuBus</div>
              <div class="ticket-type">Pass Urbain</div>
            </div>
            <div class="ticket-body">
              <div class="t-col"><span>Ligne</span><strong>${trackedBusId ? lines.find(l => l.id === buses.find(b => b.id === trackedBusId)?.lineId)?.code : 'Ligne 12'}</strong></div>
              <div class="t-col"><span>Prix</span><strong>250 F</strong></div>
              <div class="t-col"><span>Validité</span><strong>1 Heure</strong></div>
            </div>
            <div class="ticket-qr-sim">
               <svg viewBox="0 0 100 100" width="80" height="80">${ICON_QR}</svg>
            </div>
            <div class="ticket-footer">Validé à ${new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}</div>
          </div>
          <button class="btn-scan-trigger" id="reset-scan" style="margin-top:20px; background:#1e8e3e;">Terminer</button>
        </div>
      </div>`
  }

  return `
    <div class="page-container scanner-page">
      <header class="app-header" style="text-align:center;">
        <h1 style="color:#fff;">Billetterie Mobile</h1>
        <p style="color:#888;">Présentez votre QR Code ou scannez celui du bus</p>
      </header>
      <div class="scanner-viewport">
        <div class="scanner-frame">
          <div class="scanner-line"></div>
          <div class="corner top-left"></div><div class="corner top-right"></div>
          <div class="corner bottom-left"></div><div class="corner bottom-right"></div>
        </div>
        ${scanState === 'scanning' ? '<div class="scanning-status">ANALYSE EN COURS...</div>' : ''}
      </div>
      <div class="scanner-footer">
        <button class="btn-scan-trigger" id="trigger-scan">
          ${scanState === 'scanning' ? '<div class="spinner-small"></div>' : '📡 Valider avec un QR Code'}
        </button>
        <p class="hint" style="color:#666;">Simulation de paiement NFC/QR sécurisé par SunuBus Pay.</p>
      </div>
    </div>
  `
}

function renderProfile() {
  return `
    <div class="page-container">
      <header class="app-header"><h1>Mon Profil</h1></header>
      <div class="profile-card">
        <div class="profile-avatar">${userProfile.name[0]}</div>
        <div class="profile-info">
          <h3>${userProfile.name}</h3>
          <p class="text-muted">${userProfile.email || (isLoggedIn ? 'Utilisateur Connecté' : 'Utilisateur invité')}</p>
        </div>
      </div>
      <button class="btn btn-primary-ghost" style="margin-top: 20px; width: 100%">${isLoggedIn ? 'Déconnexion' : 'Se connecter'}</button>
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
  ui.querySelector('#close-focus')?.addEventListener('click', () => { clearPlannerFromMap(); trackedBusId = null; render() })

  if (activeTab === 'planner') {
    ui.querySelector('#btn-pick-origin')?.addEventListener('click', () => { 
      plannerPicking = 'origin'; activeTab = 'map'; trackedBusId = null; selectedStopId = null; render() 
    })
    ui.querySelector('#btn-pick-dest')?.addEventListener('click', () => { 
      plannerPicking = 'destination'; activeTab = 'map'; trackedBusId = null; selectedStopId = null; render() 
    })
    ui.querySelector('#input-origin')?.addEventListener('input', (e: any) => { 
      plannerOriginQuery = e.target.value; 
      const dropdown = ui.querySelector('.planner-input-wrapper:nth-child(1) .prediction-dropdown-container');
      if (dropdown) dropdown.innerHTML = renderPlannerPredictions('origin');
      attachPlannerPredictionListeners();
    })
    ui.querySelector('#input-destination')?.addEventListener('input', (e: any) => { 
      plannerDestQuery = e.target.value; 
      const dropdown = ui.querySelector('.planner-input-wrapper:nth-child(2) .prediction-dropdown-container');
      if (dropdown) dropdown.innerHTML = renderPlannerPredictions('dest');
      attachPlannerPredictionListeners();
    })

    attachPlannerPredictionListeners();

    ui.querySelector('#btn-calc-route')?.addEventListener('click', () => { 
      // Si les IDs sont nuls, on essaie de matcher le texte tapé
      if (!plannerOrigin && plannerOriginQuery) {
        const match = stops.find(s => s.name.toLowerCase().includes(plannerOriginQuery.toLowerCase()))
        if (match) plannerOrigin = match.id
      }
      if (!plannerDestination && plannerDestQuery) {
        const match = stops.find(s => s.name.toLowerCase().includes(plannerDestQuery.toLowerCase()))
        if (match) plannerDestination = match.id
      }

      if (!plannerOrigin || !plannerDestination) {
        alert("Veuillez sélectionner un point de départ et d'arrivée dans la liste ou sur la carte.")
        return
      }
      triggerPlannerRoute() 
    })
    ui.querySelectorAll('.clickable-journey').forEach(el => {
       el.addEventListener('click', (e: any) => {
         const idx = parseInt(e.currentTarget.dataset.idx)
         showJourneyOnMap(idx)
       })
    })
  }

  if (activeTab === 'scan') {
    ui.querySelector('#trigger-scan')?.addEventListener('click', () => {
      if (scanState !== 'idle') return
      scanState = 'scanning'; render()
      setTimeout(() => { scanState = 'success'; render() }, 2000)
    })
    ui.querySelector('#reset-scan')?.addEventListener('click', () => { scanState = 'idle'; activeTab = 'map'; render() })
  }

  ui.querySelectorAll('.filter-chip').forEach(b =>
    b.addEventListener('click', (e: any) => { lineFilter = e.currentTarget.dataset.filter; render() })
  )
  ui.querySelectorAll('.line-card').forEach(b =>
    b.addEventListener('click', (e: any) => {
      const lId = (e.currentTarget as any).dataset.lineId
      const bus = buses.find(x => x.lineId === lId)
      if (bus) { trackedBusId = bus.id; selectedStopId = null; activeTab = 'map'; render() }
      else {
        // Fallback: tracer juste la ligne
        const line = lines.find(l => l.id === lId)
        if (line) {
          clearPlannerFromMap()
          const road = getLineRoadGeometry(line.id, line.stopIds)
          routePolyline = L.polyline(road.coords, { color: line.color, weight: 5, opacity: 0.7 }).addTo(leafletMap)
          leafletMap.fitBounds(routePolyline.getBounds())
          activeTab = 'map'
          render()
        }
      }
    })
  )
  ui.querySelector('#btn-show-full-network')?.addEventListener('click', () => {
    showFullNetworkOnMap()
  })
  ui.querySelectorAll('.btn-view-on-map').forEach(b =>
    b.addEventListener('click', (e: any) => {
      const lId = e.currentTarget.dataset.trackLine
      const bus = buses.find(x => x.lineId === lId)
      if (bus) { trackedBusId = bus.id; activeTab = 'map'; render() }
    })
  )

  ui.querySelector('#search-input')?.addEventListener('input', (e: any) => {
    searchQuery = e.target.value
    const body = ui.querySelector('#search-results-body')
    if (body) body.innerHTML = renderSearchBody(); attachSearchResultListeners()
  })
  attachSearchResultListeners()

  ui.querySelector('#go-to-stop')?.addEventListener('click', (e: any) => {
    selectedStopId = e.currentTarget.dataset.stopId; trackedBusId = null; render()
  })
  ui.querySelectorAll('.btn-track-this-bus').forEach(b =>
    b.addEventListener('click', (e: any) => {
      trackedBusId = e.currentTarget.dataset.busId; trackingTargetStopId = e.currentTarget.dataset.stopId
      selectedStopId = null; activeTab = 'map'; render()
    })
  )
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

window.setInterval(() => {
  tickBuses()
  if (activeTab === 'map') updateBusMarkers()
}, 1500)

render()
;(window as any).showPlannerOnMap = showPlannerOnMap
setTimeout(initMap, 500)
