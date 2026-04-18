import { stops, lines, vehicles } from './data/transit_data'
import { getNearestStop, searchIA, getPredictions, tickBuses, escapeHtml } from './lib/transit_engine'
import './style.css'

let activeTab: 'map' | 'search' | 'lines' | 'profile' = 'map'
let searchQuery = ''
let selectedStopId: string | null = null
let userPos = { x: 30, y: 55 }
let isNavigating = false
let reportMode = false
let notifiedStops: string[] = []
let favorites: { type: 'line' | 'stop', id: string }[] = []
let searchHistory: string[] = ['Pikine', 'Grand Yoff', 'Sandaga']

const root = document.querySelector<HTMLDivElement>('#app')!

function render() {
    // @ts-ignore
    const nearest = getNearestStop(userPos.x, userPos.y)
    const iaResult = searchQuery.length > 3 ? searchIA(searchQuery) : null

    root.innerHTML = `
        <div class="sunubus-v2">
            <header class="v2-header">
                <div class="search-ia-box">
                    <span class="ia-icon">✨</span>
                    <input type="text" id="ia-search" placeholder="Où voulez-vous aller ?" value="${searchQuery}" autocomplete="off" />
                </div>
                <div class="version-tag">SUNUBUS v2.0</div>
            </header>

            <main class="v2-main">
                ${activeTab === 'map' ? `
                    <div id="v2-map-container" class="full-view">
                        <svg viewBox="0 0 100 100" class="v2-svg-map">
                            ${lines.map(l => {
                                const pts = l.stopIds.map(id => stops.find(s => s.id === id)).filter(Boolean).map(s => `${s!.geom.x},${s!.geom.y}`).join(' ')
                                return `<polyline points="${pts}" stroke="${l.color}" stroke-width="0.3" fill="none" class="map-line" />`
                            }).join('')}
                            ${stops.map(s => `
                                <circle cx="${s.geom.x}" cy="${s.geom.y}" r="1" fill="${s.id === selectedStopId ? '#f1c40f' : '#fff'}" class="map-stop" data-id="${s.id}" />
                            `).join('')}
                            ${vehicles.map(v => {
                                const l = lines.find(line => line.id === v.lineId)!
                                const x = l.id === 'AFTU-5' ? 40 + (v.progress * 30) : 30 + (v.progress * 40)
                                const y = l.id === 'AFTU-5' ? 50 - (v.progress * 20) : 60 - (v.progress * 30)
                                return `<circle cx="${x}" cy="${y}" r="2" fill="${v.operatorId === 'DDD' ? '#3498db' : '#10b981'}" stroke="#fff" stroke-width="0.3" class="map-bus" />`
                            }).join('')}
                            
                            <!-- Walking Path -->
                            ${isNavigating && selectedStopId ? `
                                <line x1="${userPos.x}" y1="${userPos.y}" x2="${stops.find(s => s.id === selectedStopId)!.geom.x}" y2="${stops.find(s => s.id === selectedStopId)!.geom.y}" 
                                      stroke="#f1c40f" stroke-width="0.5" stroke-dasharray="1,1" class="walking-path" />
                            ` : ''}

                            <circle cx="${userPos.x}" cy="${userPos.y}" r="1.5" fill="#e74c3c" stroke="#fff" stroke-width="0.3" class="user-gps" />
                        </svg>
                        
                        <div class="quick-info ${selectedStopId ? 'show' : ''}">
                             ${selectedStopId ? renderStopInfo(selectedStopId) : ''}
                        </div>
                    </div>
                ` : ''}

                ${activeTab === 'search' ? `
                    <div class="ia-results-view">
                        ${iaResult && iaResult.journeys.length > 0 ? `
                            <div class="ia-summary">
                                <h3>Résultats IA</h3>
                                <p>De: <b>${iaResult.departure?.name || 'Ma position'}</b> vers: <b>${iaResult.destination?.name || '...'}</b></p>
                            </div>
                            <div class="journey-options">
                                ${iaResult.journeys.map(j => `
                                     <div class="journey-card ${j.lines[0].operatorId} ${j.type}">
                                         <div class="journey-type-badge">${j.type === 'transfer' ? 'Correspondance' : 'Direct'}</div>
                                         <div class="journey-segments">
                                             ${j.lines.map((l, idx) => `
                                                 <div class="segment">
                                                     <div class="line-pill" style="background:${l.color}">${l.code}</div>
                                                     ${idx < j.lines.length - 1 ? `<div class="transfer-arrow">→</div>` : ''}
                                                 </div>
                                             `).join('')}
                                         </div>
                                         <div class="line-details">
                                             <strong>${j.type === 'direct' ? escapeHtml(j.lines[0].name) : `Via ${j.transferStop?.name}`}</strong>
                                             <p>Dep: ${j.departure.name} • Arr: ${j.destination.name}</p>
                                         </div>
                                         <div class="eta">~${j.type === 'direct' ? 12 : 25} min</div>
                                     </div>
                                 `).join('')}
                             </div>
                        ` : `
                            <div class="search-prompt">
                                <p>Astuce: Tapez "Pikine vers Plateau" ou "Sandaga".</p>
                            </div>
                        `}
                    </div>
                ` : ''}

                ${activeTab === 'lines' ? `
                    <div class="lines-explorer">
                        <h3>Réseaux Dakarois</h3>
                        <div class="lines-grid">
                            ${lines.map(l => `
                                <div class="line-list-item" style="border-left:5px solid ${l.color}">
                                    <span class="l-code">${l.code}</span>
                                    <div class="l-meta">
                                        <strong>${escapeHtml(l.name)}</strong>
                                        <span>${l.operatorId} • Direct</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                ${activeTab === 'profile' ? `
                    <div class="profile-view">
                        <div class="user-info">
                            <div class="avatar">U</div>
                            <h3>Utilisateur SunuBus</h3>
                        </div>
                        
                        <section class="profile-section">
                            <h4>⭐ Favoris</h4>
                            ${favorites.length > 0 ? `
                                <div class="favorites-grid">
                                    ${favorites.map(f => {
                                        const item = f.type === 'line' ? lines.find(l => l.id === f.id) : stops.find(s => s.id === f.id)
                                        return `<div class="fav-chip">${f.type === 'line' ? '🚌' : '📍'} ${item?.name}</div>`
                                    }).join('')}
                                </div>
                            ` : '<p class="empty-msg">Aucun favori enregistré</p>'}
                        </section>

                        <section class="profile-section">
                            <h4>🕒 Historique</h4>
                            <div class="history-list">
                                ${searchHistory.map(h => `<div class="history-item">🔍 ${h}</div>`).join('')}
                            </div>
                        </section>
                    </div>
                ` : ''}
            </main>

            <nav class="v2-nav">
                <button class="${activeTab === 'map' ? 'active' : ''}" data-tab="map">📍 Carte</button>
                <button class="${activeTab === 'search' ? 'active' : ''}" data-tab="search">🔍 Recherche</button>
                <button class="${activeTab === 'lines' ? 'active' : ''}" data-tab="lines">🚌 Lignes</button>
                <button class="${activeTab === 'profile' ? 'active' : ''}" data-tab="profile">👤 Profil</button>
            </nav>
        </div>
    `
    attachListeners()
}

function renderStopInfo(id: string) {
    const stop = stops.find(s => s.id === id)!
    const preds = getPredictions(id)
    return `
        <div class="stop-panel">
            <div class="panel-header">
                <div class="title-with-fav">
                    <h3>${stop.name}</h3>
                    <button class="fav-btn ${favorites.some(f => f.id === id) ? 'active' : ''}" data-type="stop" data-id="${id}">⭐</button>
                </div>
                <span>${stop.district} • Dakar</span>
            </div>
            <div class="predictions-list">
                ${preds.map(p => `
                    <div class="pred-item ${p.eta <= 2 && notifiedStops.includes(id) ? 'notif-trigger' : ''}">
                        <span class="pred-code" style="background:${p.line.color}">${p.line.code}</span>
                        <div class="pred-info">
                            <strong>${p.line.name}</strong>
                            <p>${p.line.headsign}</p>
                        </div>
                        <div class="pred-meta">
                            <span class="pred-time">${p.eta} min</span>
                            ${notifiedStops.includes(id) ? '<span class="bell-active">🔔</span>' : ''}
                        </div>
                    </div>
                `).join('') || '<p class="empty-msg">Aucun bus en approche</p>'}
            </div>

            <div class="panel-actions">
                <button id="toggle-notif" class="btn-ghost ${notifiedStops.includes(id) ? 'active' : ''}">
                    ${notifiedStops.includes(id) ? '🔔 SURVEILLANCE ACTIVE' : '🔕 M\'AVERTIR'}
                </button>
            </div>

            <div class="panel-actions">
                <button id="nav-to-stop" class="btn-primary">${isNavigating ? 'ARRÊTER GUIDAGE' : 'M\'Y RENDRE À PIED'}</button>
                <button id="report-incident" class="btn-warn">SIGNALER INCIDENT</button>
            </div>
            
            ${reportMode ? `
                <div class="report-overlay premium-fade">
                    <div class="report-header">
                        <h4>Signalement d'incident</h4>
                        <p>Aidez-nous à améliorer le réseau.</p>
                    </div>
                    <div class="report-grid">
                        <button class="rep-opt" data-type="crowded">
                            <span class="rep-icon">👥</span>
                            <strong>Bus Bondé</strong>
                            <small>Plus de place assise</small>
                        </button>
                        <button class="rep-opt" data-type="delay">
                            <span class="rep-icon">⏳</span>
                            <strong>Retard majeur</strong>
                            <small>Plus de 15 min d'attente</small>
                        </button>
                        <button class="rep-opt" data-type="dangerous">
                            <span class="rep-icon">⚠️</span>
                            <strong>Sécurité</strong>
                            <small>Conduite ou incident</small>
                        </button>
                         <button class="rep-opt" data-type="other">
                            <span class="rep-icon">💬</span>
                            <strong>Autre</strong>
                            <small>Préciser par message</small>
                        </button>
                    </div>
                    <button id="cancel-report">FERMER</button>
                </div>
            ` : ''}

            <button id="close-panel">FERMER</button>
        </div>
    `
}

function attachListeners() {
    const search = root.querySelector<HTMLInputElement>('#ia-search')
    if (search) {
        search.oninput = (e) => { searchQuery = (e.currentTarget as HTMLInputElement).value; render() }
        search.onfocus = () => { if (activeTab !== 'search') { activeTab = 'search'; render(); search.focus(); } }
        search.onkeypress = (e) => { if (e.key === 'Enter') { searchHistory.unshift(searchQuery); searchHistory = [...new Set(searchHistory)].slice(0,5); render(); } }
    }

    root.querySelectorAll<HTMLElement>('.v2-nav button').forEach(btn => {
        btn.onclick = () => { activeTab = btn.dataset.tab as any; render() }
    })

    root.querySelectorAll<HTMLElement>('.map-stop').forEach(stop => {
        stop.onclick = (e) => { 
            e.stopPropagation();
            selectedStopId = stop.dataset.id!; 
            render(); 
        }
    })
    root.querySelector('#close-panel')?.addEventListener('click', () => { selectedStopId = null; isNavigating = false; reportMode = false; render() })
    
    root.querySelector('#nav-to-stop')?.addEventListener('click', () => { isNavigating = !isNavigating; render() })
    root.querySelector('#report-incident')?.addEventListener('click', () => { reportMode = true; render() })
    root.querySelector('#cancel-report')?.addEventListener('click', () => { reportMode = false; render() })
    root.querySelectorAll<HTMLElement>('.rep-opt').forEach(opt => {
        opt.onclick = () => { alert('Signalement envoyé. Merci !'); reportMode = false; render() }
    })

    root.querySelector('#toggle-notif')?.addEventListener('click', () => {
        if (!selectedStopId) return
        if (notifiedStops.includes(selectedStopId)) {
            notifiedStops = notifiedStops.filter(s => s !== selectedStopId)
        } else {
            notifiedStops.push(selectedStopId)
            alert('Vous recevrez une notification quand le bus sera proche !')
        }
        render()
    })

    root.querySelectorAll<HTMLElement>('.fav-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation()
            const id = btn.dataset.id!
            const type = btn.dataset.type as any
            const idx = favorites.findIndex(f => f.id === id)
            if (idx === -1) favorites.push({ id, type })
            else favorites.splice(idx, 1)
            render()
        }
    })
}

function checkAlerts() {
    stops.forEach(s => {
        if (notifiedStops.includes(s.id)) {
            const preds = getPredictions(s.id)
            preds.forEach(p => {
                if (p.eta <= 1) {
                    // Logic to avoid multiple alerts for the same bus could be here
                    console.log(`ALERTE: Le bus ${p.line.code} arrive à ${s.name} !`)
                }
            })
        }
    })
}

window.setInterval(() => { tickBuses(); checkAlerts(); render(); }, 2000)
render()
