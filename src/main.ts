import { buses, lines, stops } from './data/network'
import { getPredictions, getSearchResults, tickBuses, formatEta, escapeHtml, findJourneys, getEtaMinutes } from './lib/transit'
import './style.css'

declare const L: any

// ── State ──────────────────────────────────────────────────────────────────
type Tab = 'map' | 'search' | 'lines' | 'profile' | 'planner'
let activeTab: Tab = 'map'
let searchQuery = ''
let selectedStopId: string | null = null
let trackedBusId: string | null = null
let notifiedLines: { lineId: string, stopId: string }[] = []
let plannerOrigin: string | null = null
let plannerDestination: string | null = null
let plannerPicking: 'origin' | 'destination' | null = null
// let favorites: { type: 'line' | 'stop'; id: string }[] = []
// let searchHistory: string[] = ['Pikine', 'Grand Yoff', 'Colobane', 'Sandaga']
let lineFilter: 'all' | 'DDD' | 'AFTU-TATA' = 'all'
let mapOperatorFilter: 'all' | 'DDD' | 'AFTU-TATA' = 'all'
let showIncident = false
let leafletMap: any = null
let canvasRenderer: any = null
let busCircles: Map<string, any> = new Map()

// ... Coordinates and Corridors (unchanged)
const GPS: Record<string, [number, number]> = {
  'palais': [14.6681, -17.4420], 'independance': [14.6698, -17.4388], 'sandaga': [14.6720, -17.4359], 'petersen': [14.6728, -17.4326], 'kermel': [14.6650, -17.4410], 'rebeuss': [14.6590, -17.4352], 'republique': [14.6690, -17.4401], 'dakar-ponty': [14.6740, -17.4430],
  'medina': [14.6837, -17.4507], 'fass': [14.6910, -17.4465], 'tilene': [14.6890, -17.4390], 'biscuiterie': [14.6970, -17.4380], 'gueule-tapee': [14.6860, -17.4430],
  'colobane': [14.6930, -17.4440], 'hlm': [14.7011, -17.4438], 'castors': [14.7055, -17.4465], 'dieuppeul': [14.7035, -17.4570],
  'liberte6': [14.7147, -17.4585], 'sacrecoeur': [14.7088, -17.4518], 'grand-yoff': [14.7226, -17.4555], 'patte-oie': [14.7229, -17.4481], 'foire': [14.7560, -17.4430], 'nord-foire': [14.7565, -17.4380],
  'fann': [14.6877, -17.4635], 'point-e': [14.6980, -17.4590], 'stele-mermoz': [14.7175, -17.4730], 'mermoz': [14.7120, -17.4720], 'virage': [14.7200, -17.4720], 'cite-etudiants': [14.7050, -17.4600], 'ouakam': [14.7340, -17.4900], 'almadies': [14.7460, -17.5220], 'ngor': [14.7470, -17.5130], 'yoff': [14.7530, -17.4740], 'aeroport': [14.7425, -17.4902],
  'pikine': [14.7473, -17.3867], 'bounkheling': [14.7450, -17.3820], 'golf-sud': [14.7390, -17.4220], 'camp-penal': [14.7296, -17.4100], 'wakam': [14.7200, -17.3950], 'diamaguene': [14.7520, -17.3800], 'cite-sotrac': [14.7450, -17.3950], 'thiaroye-azur': [14.7342, -17.3700], 'thiaroye-gare': [14.7298, -17.3740],
  'parcelles': [14.7853, -17.4277], 'cambrene': [14.7912, -17.4232], 'guediawaye': [14.7783, -17.4020], 'hamo4': [14.7630, -17.4050], 'cite-comico': [14.7700, -17.4150], 'sipres': [14.7680, -17.3880], 'dakar-eaux-forets': [14.7500, -17.4100],
  'yeumbeul': [14.7622, -17.3527], 'malika': [14.7756, -17.3176], 'mbao': [14.7191, -17.3480], 'keur-mbaye-fall': [14.7170, -17.3440], 'keur-massar': [14.7090, -17.3364], 'zac-mbao': [14.7200, -17.3400], 'route-nationale': [14.7400, -17.3600],
  'rufisque': [14.7165, -17.2718], 'bargny': [14.7050, -17.2280], 'diamniadio': [14.7180, -17.1830], 'sebikotane': [14.7280, -17.1320],
}

const CORRIDORS = [['palais','sandaga','petersen','medina','gueule-tapee','colobane','pikine','thiaroye-gare','rufisque','bargny','diamniadio','sebikotane'], ['palais','dakar-ponty','tilene','biscuiterie','hlm','dieuppeul','castors','liberte6','sacrecoeur','grand-yoff','patte-oie','nord-foire','parcelles','cambrene','guediawaye'], ['palais','fann','stele-mermoz','mermoz','ouakam','almadies','ngor','yoff'], ['fann','point-e','virage','cite-etudiants','liberte6','grand-yoff'], ['pikine','cite-sotrac','guediawaye','hamo4','sipres','cambrene'], ['pikine','bounkheling','diamaguene','thiaroye-azur','route-nationale','yeumbeul','malika'], ['pikine','zac-mbao','mbao','keur-mbaye-fall','keur-massar'], ['ouakam','aeroport','yoff'], ['parcelles','nord-foire','foire','patte-oie','golf-sud','camp-penal','pikine'], ['guediawaye','sipres','hamo4','dakar-eaux-forets','pikine'], ['medina','fass','colobane','biscuiterie','hlm','castors'], ['thiaroye-gare','mbao','rufisque','bargny','diamniadio']]

const appEl = document.querySelector<HTMLDivElement>('#app')!
const mapLayer = document.createElement('div'); mapLayer.id = 'map-layer'; mapLayer.style.cssText = 'position:absolute;inset:0;z-index:0;'; appEl.appendChild(mapLayer)
const uiLayer = document.createElement('div'); uiLayer.id = 'ui-layer'; uiLayer.style.cssText = 'position:absolute;inset:0;z-index:10;display:flex;flex-direction:column;'; appEl.appendChild(uiLayer)

function initMap() {
  if (leafletMap) { leafletMap.invalidateSize(); return }
  if (typeof L === 'undefined') return
  canvasRenderer = L.canvas({ padding: 0.5 })
  leafletMap = L.map('map-layer', { zoomControl: false, minZoom: 11, maxZoom: 18 }).setView([14.7137, -17.4300], 12)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(leafletMap)
  const userIcon = L.divIcon({ className: '', html: '<div class="user-dot-marker"></div>', iconSize: [20,20], iconAnchor: [10,10] })
  L.marker([14.7137, -17.4300], { icon: userIcon, zIndexOffset: 2000 }).addTo(leafletMap)
  CORRIDORS.forEach(cor => {
    const coords = cor.map(id => GPS[id]).filter(Boolean) as [number,number][]
    if (coords.length >= 2) L.polyline(coords, { color: '#9ca3af', weight: 2, opacity: 0.4 }).addTo(leafletMap)
  })
  stops.forEach(stop => {
    const coords = GPS[stop.id]; if (!coords) return
    const icon = L.divIcon({ className:'', html:'<div class="stop-marker"></div>', iconSize:[9,9], iconAnchor:[4.5,4.5] })
    L.marker(coords, { icon, zIndexOffset: 500 }).on('click', () => {
      if (plannerPicking === 'origin') {
        plannerOrigin = stop.id; plannerPicking = null; activeTab = 'planner'
      } else if (plannerPicking === 'destination') {
        plannerDestination = stop.id; plannerPicking = null; activeTab = 'planner'
      } else {
        selectedStopId = stop.id; trackedBusId = null
      }
      render()
    }).addTo(leafletMap)
  })
}

function updateBusMarkers() {
  if (!leafletMap) return
  buses.forEach(bus => {
    const line = lines.find(l => l.id === bus.lineId); if (!line) return
    if (mapOperatorFilter !== 'all' && line.operatorId !== mapOperatorFilter) {
      const ex = busCircles.get(bus.id); if (ex) ex.setStyle({ opacity:0, fillOpacity:0 }); return
    }
    const coords = line.stopIds.map(id => GPS[id]).filter(Boolean) as [number,number][]
    if (coords.length < 2) return
    const ts = coords.length - 1; const sc = bus.progress * ts; const seg = Math.min(Math.floor(sc), ts - 1); const t = sc - seg
    const from = coords[seg], to = coords[seg + 1]
    const lat = from[0] + (to[0] - from[0]) * t, lng = from[1] + (to[1] - from[1]) * t
    const isT = bus.id === trackedBusId; const rad = line.operatorId === 'DDD' ? (isT ? 9 : 6) : (isT ? 7 : 4); const col = isT ? '#fbbf24' : line.color
    if (busCircles.has(bus.id)) {
      busCircles.get(bus.id)!.setLatLng([lat, lng]).setStyle({ radius: rad, fillColor: col, color: isT ? '#f59e0b' : '#fff', weight: isT ? 3 : 1.5, opacity: 1, fillOpacity: 1 })
    } else {
      const c = L.circleMarker([lat, lng], { renderer: canvasRenderer, radius: rad, fillColor: col, fillOpacity: 1, color: isT ? '#f59e0b' : '#fff', weight: isT ? 3 : 1.5 })
      c.on('click', () => { trackedBusId = bus.id; selectedStopId = null; if (leafletMap) leafletMap.panTo([lat, lng], { animate: true }); render() })
      c.addTo(leafletMap); busCircles.set(bus.id, c)
    }
  })
}

function render() {
  const isMapTab = activeTab === 'map'
  mapLayer.style.display = 'block'
  if (isMapTab) {
    uiLayer.innerHTML = renderMapOverlay()
  } else {
    uiLayer.innerHTML = `<div class="page" style="flex:1;overflow:hidden;display:flex;flex-direction:column;">${renderPage()}</div>${renderTabBar()}`
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
      ${plannerPicking ? `<div style="height:100px;background:var(--green);color:#fff;display:flex;align-items:center;justify-content:center;padding-top:40px;pointer-events:auto;box-shadow:var(--shadow);"><strong>Selectionnez l'arrêt ${plannerPicking==='origin'?'de départ':'de destination'}</strong><button id="cancel-picking" style="margin-left:10px;background:rgba(0,0,0,0.2);border:none;color:#fff;padding:4px 8px;border-radius:4px;">Annuler</button></div>` : `
      <div style="padding:44px 12px 0;display:flex;gap:8px;align-items:flex-start;pointer-events:none;">
        <div style="display:flex;gap:6px;pointer-events:auto;">
          ${['all','DDD','AFTU-TATA'].map(f => `
            <button class="op-filter-btn ${mapOperatorFilter===f?'active':''}" data-op="${f}"
              style="padding:6px 12px;border-radius:20px;border:none;font-size:12px;font-weight:700;
              background:${mapOperatorFilter===f ? (f==='DDD'?'#1565c0':f==='AFTU-TATA'?'#e65100':'#3aaa60') : 'rgba(255,255,255,0.92)'};
              color:${mapOperatorFilter===f?'#fff':'#333'};">
              ${f==='all'?'Tous':f}
            </button>`).join('')}
        </div>
        <div style="pointer-events:auto;margin-left:auto;display:flex;flex-direction:column;gap:6px;">
          <div class="fleet-pill" style="background:rgba(21,101,192,0.92);"><strong>DDD</strong> · ${dddCount}</div>
          <div class="fleet-pill" style="background:rgba(230,81,0,0.92);"><strong>AFTU</strong> · ${aftuCount}</div>
        </div>
      </div>`}
      <div style="flex:1;"></div>
      ${plannerPicking ? '' : (tracked ? renderBusTrackingSheet(tracked) : stop ? renderStopSheet(stop) : renderMapBottomBar())}
    </div>
    ${renderTabBar()}
  `
}

function renderMapBottomBar() {
  return `
    <div class="map-bottom-bar" style="pointer-events:auto;display:flex;gap:10px;">
      <button class="search-pill" id="go-search" style="flex:1;">
        <div class="search-pill-left"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><span>Où allez-vous ?</span></div>
      </button>
      <button class="search-pill" id="go-planner" style="flex:1;background:var(--white);box-shadow:var(--shadow);">
        <div class="search-pill-left" style="color:var(--text);"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg><span style="color:var(--text);">Itinéraire</span></div>
      </button>
    </div>`
}

function renderBusTrackingSheet(bus: any) {
  const line = lines.find(l => l.id === bus.lineId)!
  return `
    <div class="stop-sheet" style="pointer-events:auto;">
      <div class="sheet-handle"></div><button class="sheet-close" id="close-sheet">✕</button>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <div style="background:${line.color};color:#fff;padding:6px 14px;border-radius:10px;font-weight:800;">${line.code}</div>
        <div><div class="stop-sheet-title">🚌 ${bus.id}</div><div class="stop-sheet-sub">${bus.plate}</div></div>
      </div>
      <div style="background:var(--bg);border-radius:12px;padding:12px;margin-bottom:12px;font-size:14px;">
        <div>📍 ${escapeHtml(stops.find(s=>s.id===line.stopIds[0])?.name || '')}</div>
        <div style="color:var(--green);margin:4px 0;">↓ Progression: ${Math.round(bus.progress*100)}%</div>
        <div>🏁 ${escapeHtml(stops.find(s=>s.id===line.stopIds.at(-1))?.name || '')}</div>
      </div>
      <button class="btn-outline" id="untrack-btn">Arrêter le suivi</button>
    </div>`
}

function renderStopSheet(stop: any) {
  const preds = getPredictions(stop.id).slice(0, 5)
  return `
    <div class="stop-sheet" style="pointer-events:auto;">
      <div class="sheet-handle"></div><button class="sheet-close" id="close-sheet">✕</button>
      <div class="stop-sheet-header"><div class="stop-sheet-title">${escapeHtml(stop.name)}</div></div>
      <div class="stop-sheet-sub">${stop.district}</div>
      <div class="pred-list">${preds.map(p => `
        <div class="pred-row">
          <span class="pred-line-badge" style="background:${p.line.color};">${p.line.code}</span>
          <div class="pred-info"><div class="pred-name">${escapeHtml(p.line.headsign)}</div></div>
          <div class="pred-eta">${formatEta(p.etaMin)}</div>
        </div>`).join('')}</div>
      <div class="sheet-actions">
        <button class="btn-green" id="toggle-notif">🔔 M'avertir</button>
        <button class="btn-danger" id="btn-incident">⚠️ Signaler</button>
      </div>
    </div>`
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

  return `
    <div class="search-header" style="padding-bottom:20px;">
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div class="search-input-row planner-input" id="pick-origin-container" style="height:48px;cursor:pointer;background:#fff;border-radius:12px;">
          <div style="width:8px;height:8px;border-radius:50%;background:#3b82f6;margin-right:12px;"></div>
          <div style="flex:1;color:var(--text);font-size:15px;">${escapeHtml(originName)}</div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <div class="search-input-row planner-input" id="pick-dest-container" style="height:48px;cursor:pointer;background:#fff;border-radius:12px;">
          <div style="width:8px;height:8px;border-radius:50%;background:#ef4444;margin-right:12px;"></div>
          <div style="flex:1;color:var(--text);font-size:15px;">${escapeHtml(destName)}</div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      </div>
    </div>
    <div class="search-body">
      ${!plannerOrigin || !plannerDestination ? `<p style="text-align:center;padding:40px;color:var(--muted);font-size:14px;">Appuyez sur un champ ci-dessus, puis choisissez un arrêt sur la carte.</p>` : `
        <div class="section-title">Itinéraires suggérés</div>
        ${journeys.map(j => `
          <div class="journey-card" style="background:#fff;border-radius:16px;padding:16px;margin-bottom:12px;box-shadow:var(--shadow);">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
               <div style="display:flex;gap:4px;align-items:center;">${j.segments.map(s=>`<span class="line-badge" style="background:${s.line.color};">${s.line.code}</span>`).join('<span style="color:#ccc">→</span>')}</div>
               <div style="font-size:18px;font-weight:800;color:var(--green);">${j.totalDurationMin} min</div>
            </div>
            <div style="font-size:12px;color:var(--muted);margin-bottom:10px;">${j.segments.length>1?'Correspondance':'Direct'}</div>
            <div style="display:flex;gap:8px;">
              <button class="btn-green-sm" data-line-id="${j.segments[0].line.id}" data-stop-id="${plannerOrigin}" style="flex:1;padding:10px;border-radius:10px;">🔔 Alerte approche</button>
              <button class="btn-outline-sm btn-view-on-map" data-track-line="${j.segments[0].line.id}" style="flex:1;padding:10px;border-radius:10px;">Voir trajet</button>
            </div>
          </div>`).join('')}
      `}
    </div>`
}

function renderSearch() {
  return `<div class="search-header"><div class="search-input-row"><input id="search-input" type="text" placeholder="Entrez un arrêt ou une ligne" value="${escapeHtml(searchQuery)}"/><button id="clear-search">✕</button></div></div>
          <div class="search-body" id="search-results-body">${renderSearchBody()}</div>`
}

function renderSearchBody() {
  const results = searchQuery.length > 1 ? getSearchResults(searchQuery) : []
  return results.length ? results.map(r => `
    <div class="result-item" data-stop-id="${r.type==='stop'?r.stop.id:''}" data-line-id="${r.type==='line'?r.line.id:''}">
      <div class="result-icon" style="background:${r.type==='stop'?'#4a90d9':r.line.color}">${r.type==='stop'?'📍':r.line.code}</div>
      <div class="result-text"><div class="result-name">${r.type==='stop'?r.stop.name:r.line.name}</div><div class="result-sub">${r.type==='stop'?r.stop.district:''}</div></div>
    </div>`).join('') : '<p style="text-align:center;color:var(--muted);padding-top:20px;">Aucun résultat</p>'
}

function updateSearchResults() {
  const body = document.getElementById('search-results-body'); if (body) { body.innerHTML = renderSearchBody(); attachSearchBodyListeners() }
}

function renderLines() {
  const filtered = lines.filter(l => lineFilter==='all' || l.operatorId===lineFilter)
  return `<div class="page-header"><h2>Lignes Dakar</h2></div>
          <div class="filter-row" style="background:#fff;padding:10px;margin-bottom:1px;">${['all','DDD','AFTU-TATA'].map(f=>`<button class="filter-chip ${lineFilter===f?'active':''}" data-filter="${f}">${f}</button>`).join('')}</div>
          <div class="lines-list" style="padding:10px;">${filtered.slice(0,50).map(l=>`
            <div class="line-card" data-line-id="${l.id}"><div class="line-number" style="background:${l.color}">${l.code}</div><div class="line-info"><div class="line-name">${l.name}</div></div></div>`).join('')}</div>`
}

function renderProfile() {
  return `<div style="background:var(--green);padding:40px 16px 20px;color:#fff;"><h3>Profil SunuBus</h3></div><div style="padding:16px;"><h4>Historique</h4><p class="empty-msg">Aucun mouvement récent</p></div>`
}

function renderTabBar() {
  const tabs = [{id:'map',l:'Carte'},{id:'planner',l:'Trajet'},{id:'search',l:'Lignes'},{id:'lines',l:'Réseau'},{id:'profile',l:'Profil'}]
  return `<div class="bottom-tab-bar">${tabs.map(t=>`<button class="tab-btn ${activeTab===t.id?'active':''}" data-tab="${t.id}">${t.l}</button>`).join('')}</div>`
}

function renderIncidentModal() {
  return `<div class="incident-modal" id="incident-modal"><div class="incident-panel"><h3>Signaler Incident</h3><button id="cancel-incident">Annuler</button></div></div>`
}

function attachListeners() {
  uiLayer.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', (e) => { 
    const target = (e.currentTarget as HTMLElement); activeTab = target.dataset.tab as any; plannerPicking = null; render() 
  }))
  uiLayer.querySelectorAll('.op-filter-btn').forEach(b => b.addEventListener('click', (e) => { 
    mapOperatorFilter = (e.currentTarget as HTMLElement).dataset.op as any; render() 
  }))
  uiLayer.querySelector('#go-search')?.addEventListener('click', () => { activeTab = 'search'; render() })
  uiLayer.querySelector('#go-planner')?.addEventListener('click', () => { activeTab = 'planner'; render() })
  uiLayer.querySelector('#close-sheet')?.addEventListener('click', () => { selectedStopId = null; trackedBusId = null; render() })
  uiLayer.querySelector('#untrack-btn')?.addEventListener('click', () => { trackedBusId = null; render() })
  uiLayer.querySelector('#cancel-picking')?.addEventListener('click', () => { plannerPicking = null; render() })
  
  // Planner interactions
  uiLayer.querySelector('#pick-origin-container')?.addEventListener('click', () => { plannerPicking = 'origin'; activeTab = 'map'; render() })
  uiLayer.querySelector('#pick-dest-container')?.addEventListener('click', () => { plannerPicking = 'destination'; activeTab = 'map'; render() })
  
  uiLayer.querySelectorAll('.btn-green-sm[data-line-id]').forEach(b => b.addEventListener('click', (e) => {
    const t = (e.currentTarget as HTMLElement).dataset; notifiedLines.push({ lineId: t.lineId!, stopId: t.stopId! }); alert(`Alerte activée pour ligne ${t.lineId}`);
  }))
  uiLayer.querySelectorAll('.btn-view-on-map').forEach(b => b.addEventListener('click', (e) => {
    const lId = (e.currentTarget as HTMLElement).dataset.trackLine; const bus = buses.find(b=>b.lineId===lId);
    if (bus) { trackedBusId = bus.id; activeTab='map'; render() } else { alert("Aucun bus sur cette ligne.") }
  }))
  
  const sIn = uiLayer.querySelector<HTMLInputElement>('#search-input')
  if (sIn) sIn.addEventListener('input', (e:any) => { searchQuery = e.target.value; updateSearchResults() })
  uiLayer.querySelectorAll('.filter-chip').forEach(b => b.addEventListener('click', (e) => { 
    lineFilter = (e.currentTarget as HTMLElement).dataset.filter as any; render() 
  }))
  attachSearchBodyListeners()
}

function attachSearchBodyListeners() {
  uiLayer.querySelectorAll('.result-item').forEach(b => b.addEventListener('click', (e) => {
    const sId = (e.currentTarget as HTMLElement).dataset.stopId; if (sId) { selectedStopId = sId; activeTab = 'map'; render() }
  }))
}

window.setInterval(() => {
  tickBuses(); if (activeTab === 'map') updateBusMarkers()
  notifiedLines.forEach((n, idx) => {
    const b = buses.find(x => x.lineId === n.lineId); if (b) {
      const eta = getEtaMinutes(b, n.stopId); if (eta !== null && eta <= 2 && eta > 0) {
        alert(`Le bus arrive à l'arrêt !`); notifiedLines.splice(idx, 1); render()
      }
    }
  })
}, 1500)

render(); setTimeout(initMap, 100)
