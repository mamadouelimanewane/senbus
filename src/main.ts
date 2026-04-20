import { buses, lines, stops } from './data/network'
import { getPredictions, getSearchResults, tickBuses, formatEta, escapeHtml, findJourneys } from './lib/transit'
import { GPS, getFullRoadPathSync, interpolate } from './lib/routing'
import './style.css'

declare const L: any

// ── State ──────────────────────────────────────────────────────────────────
type Tab = 'map' | 'search' | 'lines' | 'profile' | 'planner'
let activeTab: Tab = 'map'
let searchQuery = ''
let selectedStopId: string | null = null
let trackedBusId: string | null = null
// let notifiedLines: { lineId: string, stopId: string }[] = []
let plannerOrigin: string | null = null
let plannerDestination: string | null = null
let plannerPicking: 'origin' | 'destination' | null = null
let lineFilter: 'all' | 'DDD' | 'AFTU-TATA' = 'all'
let mapOperatorFilter: 'all' | 'DDD' | 'AFTU-TATA' = 'all'
let showIncident = false
let isDarkMode = false
let showStats = false
let leafletMap: any = null
const stopById = new Map(stops.map(s => [s.id, s]))
let canvasRenderer: any = null
let busCircles: Map<string, any> = new Map()
let routePolyline: any = null
let routeDecorators: any = null
let stopsLayer: any = null

const CORRIDORS_RAW = [['palais','sandaga','petersen','medina','gueule-tapee','colobane','pikine','thiaroye-gare','rufisque','bargny','diamniadio','sebikotane'], ['palais','dakar-ponty','tilene','biscuiterie','hlm','dieuppeul','castors','liberte6','sacrecoeur','grand-yoff','patte-oie','nord-foire','parcelles','cambrene','guediawaye'], ['palais','fann','stele-mermoz','mermoz','ouakam','almadies','ngor','yoff']]

// ── DOM Setup ──────────────────────────────────────────────────────────────
const appEl = document.querySelector<HTMLDivElement>('#app')!
const mapLayer = document.createElement('div'); mapLayer.id = 'map-layer'; mapLayer.style.cssText = 'position:absolute;inset:0;z-index:0;'; appEl.appendChild(mapLayer)
const uiLayer = document.createElement('div'); uiLayer.id = 'ui-layer'; uiLayer.style.cssText = 'position:absolute;inset:0;z-index:10;display:flex;flex-direction:column;pointer-events:none;'; appEl.appendChild(uiLayer)

const BUS_SVG = `<svg viewBox="0 0 24 24" width="32" height="32" fill="white"><path d="M18,11H6V6H18M16.5,17A1.5,1.5 0 0,1 15,15.5A1.5,1.5 0 0,1 16.5,14A1.5,1.5 0 0,1 18,15.5A1.5,1.5 0 0,1 16.5,17M7.5,17A1.5,1.5 0 0,1 6,15.5A1.5,1.5 0 0,1 7.5,14A1.5,1.5 0 0,1 9,15.5A1.5,1.5 0 0,1 7.5,17M4,16c0,0.88 0.39,1.67 1,2.22V20a1,1 0 0,0 1,1h1a1,1 0 0,0 1-1v-1h8v1a1,1 0 0,0 1,1h1a1,1 0 0,0 1-1v-1.78c0.61,-0.55 1,-1.34 1,-2.22V6c0,-3.5 -3.58,-4 -8,-4c-4.42,0 -8,0.5 -8,4V16Z" /></svg>`
const ARROW_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" fill="white" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5))"><path d="M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2Z" /></svg>`
const GARE_SVG = `<svg viewBox="0 0 24 24" width="24" height="24" fill="#1565c0"><path d="M12,2L4,11V21H20V11L12,2M12,4.42L18,11.16V19H14V13H10V19H6V11.16L12,4.42M11,11V12H13V11H11Z" /></svg>`

const GARES = ['palais', 'petersen', 'colobane', 'aeroport', 'pikine', 'rufisque', 'diamniadio']

async function initMap() {
  if (leafletMap) { leafletMap.invalidateSize(); return }
  if (typeof L === 'undefined') return
  canvasRenderer = L.canvas({ padding: 0.5 })
  leafletMap = L.map('map-layer', { zoomControl: false, minZoom: 11, maxZoom: 18 }).setView([14.7137, -17.4300], 12)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(leafletMap)
  
  stopsLayer = L.layerGroup().addTo(leafletMap)
  routeDecorators = L.layerGroup().addTo(leafletMap)

  const userIcon = L.divIcon({ className:'', html:'<div class="user-dot-marker"></div>', iconSize:[20,20], iconAnchor:[10,10]})
  L.marker([14.7137, -17.4300], { icon: userIcon, zIndexOffset: 2000 }).addTo(leafletMap)

  // Tracer les corridors principaux avec le routage réel
  for (const cor of CORRIDORS_RAW) {
    const road = getFullRoadPathSync(cor)
    L.polyline(road.coords, { color:'#9ca3af', weight:2, opacity:0.3 }).addTo(leafletMap)
  }

  // WARM UP CACHE for all lines in background
  lines.forEach((line) => getFullRoadPathSync(line.stopIds, line.code))

  stops.forEach(stop => {
    const c = GPS[stop.id]; if(!c) return
    const isGare = GARES.includes(stop.id)
    
    const icon = L.divIcon({ 
      className: '', 
      html: isGare 
        ? `<div class="gare-marker">${GARE_SVG}</div>` 
        : '<div class="stop-marker"></div>', 
      iconSize: isGare ? [30, 30] : [9, 9], 
      iconAnchor: isGare ? [15, 15] : [4.5, 4.5] 
    })

    L.marker(c, { icon, zIndexOffset: isGare ? 1000 : 500 }).on('click', () => {
      if (plannerPicking==='origin') { plannerOrigin=stop.id; plannerPicking=null; activeTab='planner' }
      else if (plannerPicking==='destination') { plannerDestination=stop.id; plannerPicking=null; activeTab='planner' }
      else { selectedStopId=stop.id; trackedBusId=null }
      render()
    }).addTo(stopsLayer)
  })
}

/**
 * Ajoute des flèches directionnelles sur une polyline
 */
function decorateRoute(road: any, color: string) {
  if (routeDecorators) routeDecorators.clearLayers()
  const coords = road.coords
  const step = Math.max(5, Math.floor(coords.length / 10)) // ~10 flèches par tracé
  
  for (let i = 0; i < coords.length - 1; i += step) {
    if (i + 1 >= coords.length) break
    const p1 = coords[i], p2 = coords[i+1]
    const angle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * (180 / Math.PI)
    
    const icon = L.divIcon({
      className: '',
      html: `<div style="transform: rotate(${angle + 90}deg); opacity:0.9;">${ARROW_SVG.replace('white', color)}</div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    })
    L.marker(p1, { icon, interactive: false }).addTo(routeDecorators)
  }
}

async function updateBusMarkers() {
  if (!leafletMap) return
  if (routePolyline) { leafletMap.removeLayer(routePolyline); routePolyline = null }
  if (routeDecorators) routeDecorators.clearLayers()

  // Masquer ou afficher les arrêts selon si on suit un bus
  if (trackedBusId) {
    if (leafletMap.hasLayer(stopsLayer)) leafletMap.removeLayer(stopsLayer)
  } else {
    if (!leafletMap.hasLayer(stopsLayer)) stopsLayer.addTo(leafletMap)
  }

  for (const bus of buses) {
    const line = lines.find(l => l.id === bus.lineId); if (!line) continue
    const isT = bus.id === trackedBusId
    
    // Filtres
    if (trackedBusId && !isT) { const ex=busCircles.get(bus.id); if(ex) ex.remove(); continue }
    if (!trackedBusId && mapOperatorFilter!=='all' && line.operatorId!==mapOperatorFilter) { const ex=busCircles.get(bus.id); if(ex) ex.remove(); continue }

    const road = getFullRoadPathSync(line.stopIds, line.code)
    if (road.coords.length < 2) continue

    if (isT) {
      routePolyline = L.polyline(road.coords, { color:line.color, weight:6, opacity:0.8, dashArray:'10,10' }).addTo(leafletMap)
      decorateRoute(road, line.color)
    }
    
    const [lat, lng] = interpolate(road, bus.progress)
    
    if(busCircles.has(bus.id)) {
      const marker = busCircles.get(bus.id)
      
      if (isT) {
        // Si c'est le bus suivi et qu'il n'est pas encore une figure de bus
        if (!(marker instanceof L.Marker)) {
          marker.remove()
          const busIcon = L.divIcon({ 
            className: 'bus-figure-container',
            html: `
              <div class="bus-plate-badge">${bus.plate}</div>
              <div class="bus-figure" style="background:${line.color};">${BUS_SVG}</div>
            `,
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
        // Bus normaux (points)
        if (marker instanceof L.Marker) {
           marker.remove()
           busCircles.delete(bus.id)
        } else {
           const rad = line.operatorId==='DDD'?6:4, col = line.color
           marker.setLatLng([lat,lng]).setStyle({radius:rad,fillColor:col,color:'#fff',weight:1.5,opacity:1,fillOpacity:1})
        }
      }
    } else { 
      // Création initiale
      if (isT) {
        const busIcon = L.divIcon({ 
          className: 'bus-figure-container',
          html: `
            <div class="bus-plate-badge">${bus.plate}</div>
            <div class="bus-figure" style="background:${line.color};">${BUS_SVG}</div>
          `,
          iconSize: [80, 60],
          iconAnchor: [40, 50]
        })
        const m = L.marker([lat, lng], { icon: busIcon, zIndexOffset: 3000 }).addTo(leafletMap)
        m.on('click', () => { trackedBusId = bus.id; render() })
        busCircles.set(bus.id, m)
      } else {
        const rad = line.operatorId==='DDD'?6:4, col = line.color
        const c = L.circleMarker([lat,lng], {renderer:canvasRenderer,radius:rad,fillColor:col,fillOpacity:1,color:'#fff',weight:1.5}); 
        c.on('click',()=>{trackedBusId=bus.id;selectedStopId=null;render()}); 
        c.addTo(leafletMap); 
        busCircles.set(bus.id,c) 
      }
    }
    
    if (isT && (window as any)._lastTrackedPos !== `${lat},${lng}`) { 
      leafletMap.panTo([lat,lng],{animate:true,duration:1}); 
      (window as any)._lastTrackedPos = `${lat},${lng}` 
    }
  }
}


function render() {
  if (isDarkMode) document.body.classList.add('dark')
  else document.body.classList.remove('dark')

  const isMapTab = activeTab === 'map'
  mapLayer.style.display = 'block'
  if (isMapTab) {
    uiLayer.innerHTML = renderMapOverlay()
    setTimeout(() => {
      if (isDarkMode) document.getElementById('map-layer')?.classList.add('dark-map')
      else document.getElementById('map-layer')?.classList.remove('dark-map')
    }, 10)
  } else {
    uiLayer.innerHTML = `<div class="page" style="flex:1;overflow:hidden;display:flex;flex-direction:column;pointer-events:auto;">${renderPage()}</div><div style="pointer-events:auto;">${renderTabBar()}</div>`
  }
  if (showIncident && selectedStopId) uiLayer.innerHTML += renderIncidentModal()
  attachListeners()
  if (isMapTab) setTimeout(() => { initMap(); updateBusMarkers() }, 50)
}

function renderMapOverlay() {
  const stop = selectedStopId ? stops.find(s => s.id === selectedStopId) : null
  const tracked = trackedBusId ? buses.find(b => b.id === trackedBusId) : null
  const dddCount = buses.filter(b => lines.find(l=>l.id===b.lineId)?.operatorId==='DDD').length
  const aftuCount = buses.length - dddCount

  return `
    <div class="map-overlay" style="flex:1;display:flex;flex-direction:column;pointer-events:none;">
      ${plannerPicking ? `<div style="height:100px;background:var(--green);color:#fff;display:flex;align-items:center;justify-content:center;padding-top:40px;pointer-events:auto;box-shadow:var(--shadow);"><strong>Sélectionnez l'arrêt ${plannerPicking==='origin'?'de départ':'de destination'}</strong><button id="cancel-picking" style="margin-left:10px;background:rgba(0,0,0,0.2);border:none;color:#fff;padding:4px 8px;border-radius:4px;">Annuler</button></div>` : `
      <div style="padding:44px 12px 0;display:flex;gap:8px;align-items:flex-start;pointer-events:none;">
        <div style="display:flex;gap:6px;pointer-events:auto;">
          ${['all','DDD','AFTU-TATA'].map(f => `<button class="op-filter-btn ${mapOperatorFilter===f?'active':''}" data-op="${f}" style="padding:6px 12px;border-radius:20px;border:none;font-size:12px;font-weight:700;background:${mapOperatorFilter===f?(f==='DDD'?'#1565c0':f==='AFTU-TATA'?'#e65100':'#3aaa60'):'var(--white)'};color:${mapOperatorFilter===f?'#fff':'var(--text)'};box-shadow:var(--shadow);">${f==='all'?'Tous':f}</button>`).join('')}
          <button id="toggle-dark" style="padding:6px 12px;border-radius:20px;border:none;background:var(--white);box-shadow:var(--shadow);pointer-events:auto;">${isDarkMode?'🌞':'🌙'}</button>
        </div>
        <div style="pointer-events:auto;margin-left:auto;display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
          <button id="toggle-stats" style="padding:6px 14px;border-radius:20px;background:var(--white);border:none;box-shadow:var(--shadow);font-size:12px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:6px;">📊 Stats ${showStats?'▲':'▼'}</button>
          ${showStats ? `
            <div style="background:var(--white);padding:12px;border-radius:14px;box-shadow:var(--shadow-lg);min-width:140px;border:1px solid var(--border);">
              <div style="font-size:10px;text-transform:uppercase;color:var(--muted);margin-bottom:8px;">Live Dakar</div>
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="font-size:12px;color:var(--muted)">Connectés</span><span style="font-weight:700;">${buses.length}</span></div>
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="font-size:12px;color:var(--muted)">DDD</span><span style="font-weight:700;color:#1565c0">${dddCount}</span></div>
              <div style="display:flex;justify-content:space-between;"><span style="font-size:12px;color:var(--muted)">AFTU</span><span style="font-weight:700;color:#e65100">${aftuCount}</span></div>
            </div>
          ` : ''}
        </div>
      </div>`}
      <div style="flex:1;"></div>
      ${plannerPicking ? '' : (tracked ? renderBusTrackingSheet(tracked) : stop ? renderStopSheet(stop) : renderMapBottomBar())}
    </div>
    <div style="pointer-events:auto;">${renderTabBar()}</div>`
}

function renderMapBottomBar() {
  return `<div class="map-bottom-bar" style="pointer-events:auto;display:flex;gap:10px;"><button class="search-pill" id="go-search" style="flex:1;"><div class="search-pill-left"><span>Où allez-vous ?</span></div></button><button class="search-pill" id="go-planner" style="flex:1;background:#fff;box-shadow:var(--shadow);"><div class="search-pill-left"><span style="color:#333;">Itinéraire</span></div></button></div>`
}

function renderBusTrackingSheet(bus: any) {
  const line = lines.find(l => l.id === bus.lineId)!
  const progressPerc = Math.round(bus.progress * 100)
  const nextIdx = Math.floor(bus.progress * (line.stopIds.length - 1)) + 1
  const nextStopName = stopById.get(line.stopIds[nextIdx])?.name || 'Terminus'

  return `
    <div class="stop-sheet" style="pointer-events:auto;">
      <div class="sheet-handle"></div>
      <button class="sheet-close" id="close-sheet">✕</button>
      
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <div style="background:${line.color};color:#fff;padding:8px 16px;border-radius:12px;font-weight:900;font-size:20px;box-shadow:0 4px 12px ${line.color}44;">${line.code}</div>
        <div style="flex:1">
          <div style="font-size:16px;font-weight:700;color:var(--text)">${line.name}</div>
          <div style="font-size:12px;color:var(--muted)">Immat. <span style="font-family:monospace;font-weight:700;color:var(--text)">${bus.plate}</span></div>
        </div>
      </div>

      <div style="background:var(--bg);padding:14px;border-radius:14px;margin-bottom:16px;border:1px solid var(--border);">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-bottom:8px;text-transform:uppercase;font-weight:700;">
          <span>Progression Live</span>
          <span>${progressPerc}%</span>
        </div>
        <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden;position:relative;">
          <div style="position:absolute;height:100%;background:${line.color};width:${progressPerc}%;transition:width 0.4s ease-out;"></div>
        </div>
        <div style="margin-top:12px;font-size:13px;color:var(--text);display:flex;align-items:center;gap:6px;">
          ⏱️ Prochain arrêt : <strong>${nextStopName}</strong>
        </div>
      </div>

      <div class="sheet-actions">
        <button class="btn-danger" id="untrack-btn">Quitter le suivi</button>
        <button class="btn-outline" onclick="alert('Signalement envoyé pour ${bus.plate}')">⚠️ Signaler</button>
      </div>
    </div>`
}

function renderStopSheet(stop: any) {
  const preds = getPredictions(stop.id).slice(0, 3)
  return `<div class="stop-sheet" style="pointer-events:auto;"><div class="sheet-handle"></div><button class="sheet-close" id="close-sheet">✕</button><div class="stop-sheet-title">${escapeHtml(stop.name)}</div><div class="stop-sheet-sub">${stop.district}</div><div class="pred-list">${preds.map(p => `<div class="pred-row"><span class="pred-line-badge" style="background:${p.line.color};">${p.line.code}</span><div class="pred-info">${escapeHtml(p.line.headsign)}</div><div class="pred-eta">${formatEta(p.etaMin)}</div></div>`).join('')}</div></div>`
}

function renderPage() {
  if (activeTab === 'search') return renderSearch()
  if (activeTab === 'planner') return renderPlanner()
  if (activeTab === 'lines') return renderLines()
  if (activeTab === 'profile') return renderProfile()
  return ''
}

function renderPlanner() {
  const originName = plannerOrigin ? (stops.find(s => s.id === plannerOrigin)?.name || plannerOrigin) : "Ma position"
  const destName = plannerDestination ? (stops.find(s => s.id === plannerDestination)?.name || plannerDestination) : "Saisir destination"
  const journeys = (plannerOrigin && plannerDestination) ? findJourneys(plannerOrigin, plannerDestination) : []
  return `<div class="search-header" style="padding-bottom:20px;"><div style="display:flex;flex-direction:column;gap:12px;"><div class="search-input-row" style="height:48px;background:#fff;border-radius:12px;display:flex;align-items:center;padding:0 12px;"><input type="text" id="planner-origin-input" placeholder="Départ..." value="${originName==='Ma position'?'':escapeHtml(originName)}" style="flex:1;border:none;outline:none;font-size:15px;color:#333;" /><button id="btn-pick-origin">📍</button></div><div class="search-input-row" style="height:48px;background:#fff;border-radius:12px;display:flex;align-items:center;padding:0 12px;"><input type="text" id="planner-dest-input" placeholder="Destination..." value="${destName==='Saisir destination'?'':escapeHtml(destName)}" style="flex:1;border:none;outline:none;font-size:15px;color:#333;" /><button id="btn-pick-dest">📍</button></div></div><div id="planner-suggestions"></div></div><div class="search-body">${!plannerOrigin || !plannerDestination ? `<div style="text-align:center;padding:40px;color:var(--muted);">Entrez votre trajet ou utilisez 📍</div>` : `<div class="section-title">Itinéraires suggérés</div>${journeys.map(j => `<div class="journey-card" style="background:#fff;border-radius:16px;padding:16px;margin-bottom:12px;"><div style="display:flex;justify-content:space-between;margin-bottom:8px;"><div style="display:flex;gap:4px;">${j.segments.map(s=>`<span class="line-badge" style="background:${s.line.color};">${s.line.code}</span>`).join('→')}</div><div style="font-size:18px;font-weight:800;color:var(--green);">${j.totalDurationMin} min</div></div><div style="display:flex;gap:8px;"><button class="btn-green-sm" data-line-id="${j.segments[0].line.id}" data-stop-id="${plannerOrigin}" style="flex:1;">🔔 Alerte</button><button class="btn-outline-sm btn-view-on-map" data-track-line="${j.segments[0].line.id}" style="flex:1;">Tracer</button></div></div>`).join('')}`}</div>`
}

function renderSearch() {
  return `<div class="search-header"><div class="search-input-row"><input id="search-input" type="text" placeholder="Rechercher..." value="${escapeHtml(searchQuery)}"/><button id="clear-search">✕</button></div></div><div class="search-body" id="search-results-body">${renderSearchBody()}</div>`
}

function renderSearchBody() {
  const r = searchQuery.length > 1 ? getSearchResults(searchQuery) : []
  return r.map(res => `<div class="result-item" data-stop-id="${res.type==='stop'?res.stop.id:''}" data-line-id="${res.type==='line'?res.line.id:''}"><div class="result-icon" style="background:${res.type==='stop'?'#4a90d9':res.line.color}">${res.type==='stop'?'📍':res.line.code}</div><div class="result-name">${res.type==='stop'?res.stop.name:res.line.name}</div></div>`).join('')
}

function renderLines() {
  const f = lines.filter(l => lineFilter==='all' || l.operatorId===lineFilter)
  return `<div class="page-header"><h2>Lignes Dakar</h2></div><div class="filter-row">${['all','DDD','AFTU-TATA'].map(fl=>`<button class="filter-chip ${lineFilter===fl?'active':''}" data-filter="${fl}">${fl}</button>`).join('')}</div><div class="lines-list">${f.slice(0,50).map(l=>`<div class="line-card" data-line-id="${l.id}"><div class="line-number" style="background:${l.color}">${l.code}</div><div class="line-info">${l.name}</div></div>`).join('')}</div>`
}

function renderProfile() { 
  return `
    <div style="background:var(--green);padding:48px 16px 24px;color:#fff;">
      <h2 style="font-size:24px;font-weight:800;">Administration</h2>
      <p style="opacity:0.8;font-size:14px;">Accès sécurisé opérateurs</p>
    </div>
    <div class="profile-scroll-fix">
      <div class="action-cards" style="margin-top:20px;">
        <a href="admin_ddd.html" class="action-card" style="text-decoration:none;">
          <div class="action-icon" style="background:#1565c022;color:#1565c0">D</div>
          <div class="action-label">Backoffice DDD</div>
          <div class="action-chevron">→</div>
        </a>
        <a href="admin_aftu.html" class="action-card" style="text-decoration:none;">
          <div class="action-icon" style="background:#e6510022;color:#e65100">A</div>
          <div class="action-label">Backoffice AFTU</div>
          <div class="action-chevron">→</div>
        </a>
      </div>
      <div style="text-align:center;padding:20px;color:var(--muted);font-size:12px;">SunuBus v2.8 • Command Center Engine</div>
    </div>
  ` 
}

function renderTabBar() {
  return `<div class="bottom-tab-bar">${[{id:'map',l:'Carte'},{id:'planner',l:'Trajet'},{id:'search',l:'Lignes'},{id:'lines',l:'Réseau'}].map(t=>`<button class="tab-btn ${activeTab===t.id?'active':''}" data-tab="${t.id}">${t.l}</button>`).join('')}</div>`
}

function attachListeners() {
  uiLayer.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', (e) => { activeTab = (e.currentTarget as any).dataset.tab; plannerPicking = null; render() }))
  uiLayer.querySelectorAll('.op-filter-btn').forEach(b => b.addEventListener('click', (e) => { mapOperatorFilter = (e.currentTarget as any).dataset.op; render() }))
  uiLayer.querySelector('#toggle-dark')?.addEventListener('click', () => { isDarkMode = !isDarkMode; render() })
  uiLayer.querySelector('#toggle-stats')?.addEventListener('click', () => { showStats = !showStats; render() })
  uiLayer.querySelector('#cancel-picking')?.addEventListener('click', () => { plannerPicking = null; render() })
  uiLayer.querySelector('#untrack-btn')?.addEventListener('click', () => { trackedBusId = null; render() })
  uiLayer.querySelector('#close-sheet')?.addEventListener('click', () => { selectedStopId = null; trackedBusId = null; render() })
  uiLayer.querySelector('#go-search')?.addEventListener('click', () => { activeTab = 'search'; render() })
  uiLayer.querySelector('#go-planner')?.addEventListener('click', () => { activeTab = 'planner'; render() })
  uiLayer.querySelector('#untrack-btn')?.addEventListener('click', () => { if (routePolyline) leafletMap.removeLayer(routePolyline); routePolyline = null; trackedBusId = null; render() })
  uiLayer.querySelector('#cancel-picking')?.addEventListener('click', () => { plannerPicking = null; render() })
  if (activeTab==='planner') {
    uiLayer.querySelector('#btn-pick-origin')?.addEventListener('click', () => { plannerPicking = 'origin'; activeTab='map'; render() })
    uiLayer.querySelector('#btn-pick-dest')?.addEventListener('click', () => { plannerPicking = 'destination'; activeTab='map'; render() })
    const o = uiLayer.querySelector<HTMLInputElement>('#planner-origin-input'), d = uiLayer.querySelector<HTMLInputElement>('#planner-dest-input')
    if(o) o.addEventListener('input', () => handlePlannerInput(o.value, 'origin'))
    if(d) d.addEventListener('input', () => handlePlannerInput(d.value, 'destination'))
  }
  uiLayer.querySelectorAll('.btn-view-on-map').forEach(b => b.addEventListener('click', (e) => { const lId = (e.currentTarget as any).dataset.trackLine; const bus = buses.find(x=>x.lineId===lId); if(bus){trackedBusId=bus.id;activeTab='map';render()} }))
  const sIn = uiLayer.querySelector<HTMLInputElement>('#search-input')
  if (sIn) sIn.addEventListener('input', (e:any) => { searchQuery = e.target.value; const b = document.getElementById('search-results-body'); if(b){b.innerHTML=renderSearchBody();attachSearchBodyListeners()} })
  uiLayer.querySelectorAll('.filter-chip').forEach(b => b.addEventListener('click', (e:any) => { lineFilter = e.currentTarget.dataset.filter; render() }))
  uiLayer.querySelectorAll('.line-card').forEach(b => b.addEventListener('click', (e:any) => { 
    const lId = e.currentTarget.dataset.lineId
    const bus = buses.find(x => x.lineId === lId)
    if (bus) {
      trackedBusId = bus.id
      selectedStopId = null
      activeTab = 'map'
      render()
    }
  }))
  attachSearchBodyListeners()
}

function attachSearchBodyListeners() {
  uiLayer.querySelectorAll('.result-item').forEach(b => b.addEventListener('click', (e:any) => { 
    const sId = e.currentTarget.dataset.stopId
    const lId = e.currentTarget.dataset.lineId
    if (sId) { selectedStopId = sId; activeTab='map'; render() }
    else if (lId) {
      const bus = buses.find(x => x.lineId === lId)
      if (bus) { trackedBusId = bus.id; selectedStopId = null; activeTab = 'map'; render() }
    }
  }))
}

function handlePlannerInput(query: string, type: 'origin' | 'destination') {
  const sugg = uiLayer.querySelector('#planner-suggestions'); if(!sugg) return
  if(query.length<2){sugg.innerHTML=''; return}
  const r = getSearchResults(query).filter(x=>x.type==='stop')
  sugg.innerHTML = `<div style="background:#fff;border-radius:12px;box-shadow:var(--shadow);overflow:hidden;">${r.map((res:any)=>`<div class="planner-sug-item" data-id="${res.stop.id}" style="padding:12px;border-bottom:1px solid var(--border);cursor:pointer;">📍 ${escapeHtml(res.stop.name)}</div>`).join('')}</div>`
  sugg.querySelectorAll('.planner-sug-item').forEach((it: any) => it.addEventListener('click', () => { if(type==='origin') plannerOrigin=it.dataset.id; else plannerDestination=it.dataset.id; render() }))
}

function renderIncidentModal() {
  return `<div class="incident-modal" id="incident-modal"><div class="incident-panel"><h3>Signaler Incident</h3><button id="cancel-incident">Annuler</button></div></div>`
}

window.setInterval(() => { tickBuses(); if(activeTab==='map') updateBusMarkers() }, 1500)
render(); setTimeout(initMap, 100)
