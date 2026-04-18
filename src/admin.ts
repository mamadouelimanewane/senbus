import './admin.css'
import { fetchNetwork, API_BASE } from './lib/api'
import type { Bus, Line, Stop } from './types'

type AdminView = 'dashboard' | 'fleet' | 'lines' | 'stops' | 'users' | 'security' | 'map' | 'ads' | 'ai' | 'alerts' | 'geofencing'

import { buses as staticBuses, lines as staticLines, stops as staticStops } from './data/network'

// State
let currentView: AdminView = 'dashboard'
let buses: Bus[] = staticBuses
let lines: Line[] = staticLines
let stops: Stop[] = staticStops
let isModalOpen = false

const root = document.querySelector('#admin-root')

async function loadData() {
  try {
    const network = await fetchNetwork()
    buses = network.buses
    lines = network.lines
    stops = network.stops
  } catch (err) {
    console.warn('API unreachable, using static fallback context')
    buses = staticBuses
    lines = staticLines
    stops = staticStops
  } finally {
    render()
  }
}

// Actions
async function apiCall(endpoint: string, method: string, body?: any) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    })
    if (res.ok) {
      isModalOpen = false
      await loadData()
    }
  } catch (err) {
    alert(`Error: ${method} ${endpoint} failed`)
  }
}

function handleNav(view: AdminView) {
  currentView = view
  render()
}

// Render Functions
function renderSidebar() {
  const links: { view: AdminView; label: string; icon: string }[] = [
    { view: 'dashboard', label: 'Tableau de bord', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
    { view: 'fleet', label: 'Gestion Flotte', icon: 'M18 11H6V5h12m0 12H6v-3h12M17 2H7c-1.1 0-2 .9-2 2v15c0 1.1.9 2 2 2v2h1v-2h8v2h1v-2c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z' },
    { view: 'lines', label: 'Lignes & Trajets', icon: 'M20 7V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2z' },
    { view: 'map', label: 'Cartographie', icon: 'M15,19L9,16.89V5L15,7.11M20.5,3L20.44,3.03L15,5.1L9,3L3.36,4.9L3,5V19L3.06,18.97L8.5,16.9L14.5,19L20.14,17.1L20.5,17V3Z' },
    { view: 'users', label: 'Utilisateurs', icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' },
    { view: 'security', label: 'Sécurité', icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z' },
    { view: 'ads', label: 'Publicité', icon: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z' },
    { view: 'ai', label: 'IA & Analytique', icon: 'M21,16.5C21,16.88 20.79,17.21 20.47,17.38L12.57,21.82C12.41,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L3.53,17.38C3.21,17.21 3,16.88 3,16.5V7.5C3,7.12 3.21,6.79 3.53,6.62L11.43,2.18C11.59,2.06 11.79,2 12,2C12.21,2 12.41,2.06 12.57,2.18L20.47,6.62C20.79,6.79 21,7.12 21,7.5V16.5Z' },
    { view: 'alerts', label: 'Signalements', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z' },
    { view: 'geofencing', label: 'Géofencing', icon: 'M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z' }
  ]

  return `
    <aside class="admin-sidebar">
      <div class="admin-logo">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M18 11H6V5h12m0 12H6v-3h12M17 2H7c-1.1 0-2 .9-2 2v15c0 1.1.9 2 2 2v2h1v-2h8v2h1v-2c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
        <h1>SunuBus Admin</h1>
      </div>
      <nav class="admin-nav">
        ${links.map(l => `
          <button class="nav-link ${currentView === l.view ? 'nav-link-active' : ''}" data-view="${l.view}">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="${l.icon}"/></svg>
            ${l.label}
          </button>
        `).join('')}
      </nav>
      <div class="sidebar-footer">
        <a href="index.html" class="nav-link">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
          Retour au site
        </a>
      </div>
    </aside>
  `
}

function renderUsers() {
  return `
    <div class="header-title">
      <h2>Gestion des Utilisateurs</h2>
      <p>Administration des comptes et accès à la plateforme.</p>
    </div>
    <div class="table-container" style="margin-top: 24px">
      <table class="data-table">
        <thead>
          <tr>
            <th>Utilisateur</th>
            <th>Type</th>
            <th>Dernière Connexion</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Mamadou Wane</strong> (mamadou@sunubus.sn)</td>
            <td><span class="badge badge-blue">Super Admin</span></td>
            <td>Aujourd'hui, 17:45</td>
            <td><span class="badge badge-green">Actif</span></td>
            <td><button class="btn btn-ghost">Éditer</button></td>
          </tr>
          <tr>
            <td><strong>Agent Dakar Plateau</strong> (agent.p@ddd.sn)</td>
            <td><span class="badge" style="background:rgba(255,255,255,0.1)">Agent Régulateur</span></td>
            <td>Hier, 22:10</td>
            <td><span class="badge badge-green">Actif</span></td>
            <td><button class="btn btn-ghost">Éditer</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  `
}

function renderSecurity() {
  return `
    <div class="header-title">
      <h2>Sécurité & Pare-feu</h2>
      <p>Protection contre les accès non autorisés et logs d'audit.</p>
    </div>
    <div class="stats-grid" style="margin-top: 24px">
      <article class="stat-card">
        <div class="stat-label">Statut Pare-feu</div>
        <div class="stat-value" style="color:#3fb950">ACTIF</div>
        <p style="font-size:0.8rem; color:var(--admin-muted)">48 tentatives bloquées / 24h</p>
      </article>
      <article class="stat-card">
        <div class="stat-label">Chiffrement</div>
        <div class="stat-value">AES-256</div>
        <p style="font-size:0.8rem; color:var(--admin-muted)">Protocol TLS 1.3 actif</p>
      </article>
    </div>
    <div class="table-container">
       <div class="table-header"><h3>Logs d'accès récents</h3></div>
       <table class="data-table">
         <thead>
           <tr><th>IP</th><th>Action</th><th>Localisation</th><th>Heure</th></tr>
         </thead>
         <tbody>
           <tr><td>196.1.182.45</td><td>Connexion Admin</td><td>Dakar, SN</td><td>18:02</td></tr>
           <tr><td>45.12.89.210</td><td>Requête Bloquée</td><td>Kyiv, UA</td><td>17:58</td></tr>
         </tbody>
       </table>
    </div>
  `
}

function renderAI() {
  return `
    <div class="header-title">
      <h2>IA & Analytique Prédictive</h2>
      <p>Moteur neural d'optimisation du trafic et flux passagers.</p>
    </div>
    <div class="asset-card" style="margin-top: 24px; border-left: 4px solid #58a6ff">
      <h3 style="margin-top: 0">Analyse de la Demande (Neural Core)</h3>
      <p>Prédiction de surcharge sur la <strong>Ligne 5</strong> vers 18h30. Suggestion : déployer 2 bus supplémentaires.</p>
      <div style="background: rgba(88,166,255,0.1); padding: 16px; border-radius: 8px; margin-top: 16px">
         <div style="display: flex; justify-content: space-between; margin-bottom: 8px">
            <span>Confiance Prédiction</span>
            <strong>92%</strong>
         </div>
         <div style="height: 6px; background: #30363d; border-radius: 3px; overflow: hidden">
            <div style="width: 92%; height: 100%; background: #58a6ff"></div>
         </div>
      </div>
    </div>
    
    <div class="stats-grid" style="margin-top: 24px">
       <article class="stat-card">
          <div class="stat-label">Optimisation Carburant</div>
          <div class="stat-value">+14%</div>
          <p style="font-size:0.8rem; color:var(--admin-muted)">Via moteur d'itinéraires IA</p>
       </article>
       <article class="stat-card">
          <div class="stat-label">Réduction Attente</div>
          <div class="stat-value">-8 min</div>
          <p style="font-size:0.8rem; color:var(--admin-muted)">Moyenne par usager</p>
       </article>
    </div>
  `
}

function renderAds() {
  return `
    <div class="header-title">
      <h2>Gestion Publicitaire</h2>
      <p>Campagnes sponsorisées sur l'application mobile.</p>
    </div>
    <div class="grid-cards" style="margin-top: 24px">
      <article class="asset-card">
        <div style="background: #ff660022; padding: 12px; border-radius: 6px; margin-bottom: 12px; color: #ff6600">Orange Max</div>
        <h3>Campagne Forfaits Illimités</h3>
        <p style="color:var(--admin-muted)">Cible : Tous les usagers de Dakar</p>
        <div style="margin-top: 16px; display: flex; justify-content: space-between">
           <span>Vues : 4.5k</span>
           <span class="badge badge-green">Active</span>
        </div>
      </article>
      <article class="asset-card">
        <div style="background: #e4002b22; padding: 12px; border-radius: 6px; margin-bottom: 12px; color: #e4002b">Nescafé</div>
        <h3>Réveil Tonique</h3>
        <p style="color:var(--admin-muted)">Cible : Matinée (6h - 10h)</p>
        <div style="margin-top: 16px; display: flex; justify-content: space-between">
           <span>Vues : 2.1k</span>
           <span class="badge badge-green">Active</span>
        </div>
      </article>
    </div>
  `
}

function renderAlerts() {
  const mockAlerts = [
    { id: 'AL-102', type: 'Car Bondé', vehicle: 'DK-123-AA', stop: 'Palais de Justice', status: 'Nouveau', time: '18:42', priority: 'Haut' },
    { id: 'AL-101', type: 'Retard > 20min', vehicle: 'Ligne 34 (AFTU)', stop: 'Ouakam', status: 'En cours', time: '18:35', priority: 'Moyen' },
    { id: 'AL-098', type: 'Déviation d\'itinéraire', vehicle: 'DK-772-BB', stop: 'Sacre Coeur', status: 'Résolu', time: '17:20', priority: 'Critique' },
  ]
  return `
    <div class="header-title">
      <h2>Signalements & Alertes Usagers</h2>
      <p>Centre de réponse aux incidents signalés via l'application mobile.</p>
    </div>
    <div class="table-container" style="margin-top: 24px">
      <table class="data-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Véhicule / Zone</th>
            <th>Niveau</th>
            <th>Heure</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${mockAlerts.map(a => `
            <tr>
              <td><span class="badge ${a.type === 'Car Bondé' ? 'badge-orange' : 'badge-blue'}">${a.type}</span></td>
              <td><strong>${a.vehicle}</strong> <br/><small>${a.stop}</small></td>
              <td><span class="badge ${a.priority === 'Critique' ? 'badge-red' : (a.priority === 'Haut' ? 'badge-orange' : 'badge-blue')}">${a.priority}</span></td>
              <td>${a.time}</td>
              <td style="opacity:0.8">${a.status}</td>
              <td>
                <div style="display:flex; gap:8px">
                  <button class="btn btn-ghost" onclick="alert('Ouverture du canal opérateur...')">Investiguer</button>
                  <button class="btn btn-ghost btn-green" onclick="alert('Incident marqué comme résolu.')">Résoudre</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `
}

function renderMap() {
  return `
    <div class="header-title">
      <h2>Cartographie Interactive</h2>
      <p>Vue globale du réseau en temps réel.</p>
    </div>
    <div style="background: var(--admin-bg); border: 1px solid var(--admin-border); border-radius: 12px; height: 60vh; margin-top: 24px; position: relative; overflow: hidden">
      <div style="position: absolute; inset: 0; opacity: 0.1; background-image: radial-gradient(#58a6ff 1px, transparent 1px); background-size: 20px 20px;"></div>
      <div style="display: flex; align-items: center; justify-content: center; height: 100%; flex-direction: column">
         <svg viewBox="0 0 24 24" width="60" height="60" fill="var(--admin-primary)" style="opacity:0.3"><path d="M15,19L9,16.89V5L15,7.11M20.5,3L20.44,3.03L15,5.1L9,3L3.36,4.9L3,5V19L3.06,18.97L8.5,16.9L14.5,19L20.14,17.1L20.5,17V3Z"/></svg>
         <p style="color:var(--admin-muted); margin-top: 16px">Moteur cartographique haute résolution chargé.</p>
         <span class="badge badge-blue">Visualisation de ${buses.length} bus actifs</span>
      </div>
    </div>
  `
}

// ... the rest of existing dashboard, fleet, lines, stops rendering ...
function renderGeofencing() {
  return `
    <div class="header-title">
      <h2>Géofencing & Surveillance Corridors</h2>
      <p>Contrôle automatique du respect des itinéraires et zones de service.</p>
    </div>
    <div class="stats-grid" style="margin-top: 24px">
      <article class="stat-card">
        <div class="stat-label">Corridors Actifs</div>
        <div class="stat-value">42</div>
        <p style="font-size:0.8rem; color:var(--admin-muted)">Précision GPS: +/- 5m</p>
      </article>
      <article class="stat-card">
        <div class="stat-label">Déviations (24h)</div>
        <div class="stat-value" style="color:#f85149">3</div>
        <p style="font-size:0.8rem; color:var(--admin-muted)">Taux d'infraction: 0.8%</p>
      </article>
    </div>
    
    <div class="table-container">
      <div class="table-header"><h3>Alertes de Zone Récentes</h3></div>
      <table class="data-table">
        <thead>
          <tr><th>Bus</th><th>Ligne</th><th>Alerte</th><th>Lieu</th><th>Impact</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>DK-901-ZZ</strong></td>
            <td>DDD 121</td>
            <td><span class="badge badge-red">SORTIE CORRIDOR</span></td>
            <td>Tunnel Soumbedioune</td>
            <td>Itinéraire alternatif non autorisé</td>
          </tr>
          <tr>
            <td><strong>DK-455-TT</strong></td>
            <td>AFTU 24</td>
            <td><span class="badge badge-orange">ZONE RESTREINTE</span></td>
            <td>Corniche Ouest</td>
            <td>Zone interdite aux poids lourds</td>
          </tr>
        </tbody>
      </table>
    </div>
  `
}

function renderDashboard() {
  const totalPassengers = buses.reduce((acc, b) => acc + b.passengers, 0)
  const totalCapacity = buses.reduce((acc, b) => acc + b.capacity, 1)
  const avgOccupancy = Math.round((totalPassengers / totalCapacity) * 100)
  
  return `
    <div class="header-title">
      <h2>Vue d'ensemble</h2>
      <p>Indicateurs de performance du réseau en temps réel.</p>
    </div>

    <div class="stats-grid" style="margin-top: 24px">
      <article class="stat-card">
        <div class="stat-label">Passagers actifs</div>
        <div class="stat-value">${totalPassengers}</div>
        <div class="stat-trend trend-up">↑ 12% vs hier</div>
      </article>
      <article class="stat-card">
        <div class="stat-label">Taux d'occupation</div>
        <div class="stat-value">${avgOccupancy}%</div>
        <div class="stat-trend ${avgOccupancy > 80 ? 'trend-down' : 'trend-up'}">${avgOccupancy > 80 ? 'Critique' : 'Fluide'}</div>
      </article>
      <article class="stat-card">
        <div class="stat-label">Flotte en service</div>
        <div class="stat-value">${buses.length}</div>
        <div class="stat-trend" style="color:#58a6ff">Bus géolocalisés</div>
      </article>
      <article class="stat-card">
        <div class="stat-label">Statut Serveur</div>
        <div class="stat-value" style="color: #3fb950; font-size: 1.2rem"><span class="pulse-live"></span>OPÉRATIONNEL</div>
      </article>
    </div>

    <div class="table-container">
      <div class="table-header"><h3>Incidents & Alertes</h3></div>
      <table class="data-table">
        <thead>
          <tr><th>Type</th><th>Détails</th><th>Niveau</th><th>Heure</th></tr>
        </thead>
        <tbody>
          <tr><td><span class="badge badge-orange">Trafic</span></td><td>Congestion sur axe Tunnel Soumbedioune</td><td>Haut</td><td>18:12</td></tr>
          <tr><td><span class="badge badge-blue">Info</span></td><td>Ligne 24 : reprise du trafic normal</td><td>Normal</td><td>17:55</td></tr>
        </tbody>
      </table>
    </div>
  `
}

function renderFleet() {
  return `
    <div class="admin-header">
      <div class="header-title">
        <h2>Gestion de la flotte</h2>
        <p>${buses.length} véhicules connectés au jumeau numérique.</p>
      </div>
      <button class="btn btn-primary" id="open-add-bus">Nouveau véhicule</button>
    </div>
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr><th>ID Bus</th><th>Matricule</th><th>Ligne</th><th>Charge</th><th>Actions</th></tr>
        </thead>
        <tbody>
          ${buses.map(bus => `
            <tr>
              <td><strong>${bus.id}</strong></td>
              <td><code>${bus.plate}</code></td>
              <td><span class="badge badge-blue">${bus.lineId}</span></td>
              <td><span class="badge ${bus.passengers/bus.capacity > 0.8 ? 'badge-orange' : 'badge-green'}">${Math.round((bus.passengers/bus.capacity)*100)}%</span></td>
              <td><button class="btn btn-ghost btn-danger" data-delete-bus="${bus.id}">Retirer</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `
}

function renderLines() {
  return `
    <div class="admin-header">
      <div class="header-title">
        <h2>Lignes & Trajets</h2>
        <p>Configuration des itinéraires officiels.</p>
      </div>
    </div>
    <div class="grid-cards">
      ${lines.map(line => `
        <article class="asset-card">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px">
            <span class="badge" style="background: ${line.color}33; color: ${line.color}">${line.code}</span>
            <span style="font-size: 0.8rem; color:var(--admin-muted)">${line.frequencyMin} min</span>
          </div>
          <h3>${line.name}</h3>
          <p style="font-size: 0.85rem; color:var(--admin-muted)">Terminus: ${line.headsign}</p>
        </article>
      `).join('')}
    </div>
  `
}

function renderStops() {
  return `
    <div class="header-title">
      <h2>Points d'Arrêt</h2>
      <p>Cartographie des arrêts du réseau.</p>
    </div>
    <div class="table-container" style="margin-top: 24px">
      <table class="data-table">
        <thead>
          <tr><th>Nom</th><th>District</th><th>Lignes</th></tr>
        </thead>
        <tbody>
          ${stops.map(stop => `
            <tr>
              <td><strong>${stop.name}</strong></td>
              <td>${stop.district}</td>
              <td><span class="badge badge-blue">Lignes connectées</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `
}

function renderModal() {
  if (!isModalOpen) return ''
  return `
    <div class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header"><h3>Nouveau Bus</h3></div>
        <form id="modal-form">
          <div class="modal-body">
            <div class="field-group"><label>Plaque</label><input type="text" name="plate" class="input-field" required /></div>
            <div class="field-group"><label>Ligne</label><select name="lineId" class="input-field">${lines.map(l => `<option value="${l.id}">${l.code} - ${l.name}</option>`).join('')}</select></div>
            <div class="field-group"><label>Capacité</label><input type="number" name="capacity" class="input-field" value="60" required /></div>
          </div>
          <div class="modal-footer"><button type="button" class="btn btn-ghost" id="close-modal">Annuler</button><button type="submit" class="btn btn-primary">Enregistrer</button></div>
        </form>
      </div>
    </div>
  `
}

function render() {
  if (!root) return
  let content = ''
  switch(currentView) {
    case 'dashboard': content = renderDashboard(); break
    case 'fleet': content = renderFleet(); break
    case 'lines': content = renderLines(); break
    case 'stops': content = renderStops(); break
    case 'users': content = renderUsers(); break
    case 'security': content = renderSecurity(); break
    case 'map': content = renderMap(); break
    case 'ads': content = renderAds(); break
    case 'ai': content = renderAI(); break
    case 'alerts': content = renderAlerts(); break
    case 'geofencing': content = renderGeofencing(); break
  }

  root.innerHTML = `<div class="admin-layout">${renderSidebar()}<main class="admin-main">${content}</main>${renderModal()}</div>`

  // Listeners
  root.querySelectorAll('.nav-link[data-view]').forEach(btn => {
    btn.addEventListener('click', () => handleNav((btn as HTMLElement).dataset.view as AdminView))
  })
  root.querySelector('#open-add-bus')?.addEventListener('click', () => { isModalOpen = true; render(); })
  root.querySelector('#close-modal')?.addEventListener('click', () => { isModalOpen = false; render(); })
  root.querySelector('#modal-form')?.addEventListener('submit', async (e) => {
    e.preventDefault(); const fd = new FormData(e.target as HTMLFormElement)
    await apiCall('/api/buses', 'POST', { lineId: fd.get('lineId'), plate: fd.get('plate'), capacity: Number(fd.get('capacity')) })
  })
  root.querySelectorAll('[data-delete-bus]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.deleteBus
      if (id && confirm('Confirmer le retrait ?')) apiCall(`/api/buses/${id}`, 'DELETE')
    })
  })
}

loadData()
setInterval(loadData, 5000)
