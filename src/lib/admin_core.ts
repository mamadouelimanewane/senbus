import { fetchNetwork } from './api'
import type { Bus, Line, Stop } from '../types'
import { buses as staticBuses, lines as staticLines, stops as staticStops } from '../data/network'

export type AdminView = 'dashboard' | 'fleet' | 'lines' | 'command' | 'alerts' | 'geofencing'

export class AdminCore {
  private currentView: AdminView = 'dashboard'
  private buses: Bus[] = []
  private lines: Line[] = []
  private operatorId: string
  private root: HTMLElement | null
  private map: any = null
  private busMarkers: Map<string, any> = new Map()

  constructor(operatorId: string, rootId: string) {
    this.operatorId = operatorId
    this.root = document.getElementById(rootId)
    this.init()
  }

  private async init() {
    await this.loadData()
    this.render()
    setInterval(() => this.tick(), 1000)
  }

  private checkIncidents() {
    return JSON.parse(localStorage.getItem('sunubus_incidents') || '[]').filter((inc:any) => !inc.resolved)
  }

  private checkGeofence() {
    return JSON.parse(localStorage.getItem('sunubus_geofence') || '[]')
  }

  private async loadData() {
    try {
      const network = await fetchNetwork()
      this.buses = network.buses.filter(b => {
        const line = network.lines.find(l => l.id === b.lineId)
        return line?.operatorId === this.operatorId
      })
      this.lines = network.lines.filter(l => l.operatorId === this.operatorId)
    } catch (err) {
      this.buses = staticBuses.filter(b => {
        const line = staticLines.find(l => l.id === b.lineId)
        return line?.operatorId === this.operatorId
      })
      this.lines = staticLines.filter(l => l.operatorId === this.operatorId)
    }
  }

  private tick() {
    const activeIncidents = this.checkIncidents()

    this.buses.forEach(bus => {
      const isBroken = activeIncidents.some((inc:any) => inc.busId === bus.id)
      if (!isBroken) {
        bus.progress += 0.001
        if (bus.progress > 1) bus.progress = 0
      }
    })
    
    if (this.currentView === 'command' && this.map) {
      this.updateMapMarkers()
    } else if (this.currentView === 'dashboard' || this.currentView === 'fleet' || this.currentView === 'geofencing') {
      this.render()
    }
  }

  private updateMapMarkers() {
    const activeIncidents = this.checkIncidents()
    const geofenceBreaches = this.checkGeofence()
    
    this.buses.forEach(bus => {
      const line = this.lines.find(l => l.id === bus.lineId)
      if (!line) return
      
      const s1 = staticStops.find((s:Stop) => s.id === line.stopIds[0])
      const s2 = staticStops.find((s:Stop) => s.id === line.stopIds[line.stopIds.length-1])
      if (!s1 || !s2) return

      const isBroken = activeIncidents.some((inc:any) => inc.busId === bus.id)
      const isOffRoute = geofenceBreaches.some((b:any) => b.busId === bus.id)
      
      // Using y for latitude, x for longitude
      const lat = s1.y + (s2.y - s1.y) * bus.progress + (isOffRoute ? 0.005 : 0)
      const lng = s1.x + (s2.x - s1.x) * bus.progress + (isOffRoute ? 0.005 : 0)

      let marker = this.busMarkers.get(bus.id)
      const color = isBroken ? '#ef4444' : (isOffRoute ? '#eab308' : line.color)
      
      if (!marker) {
        marker = (window as any).L.circleMarker([lat, lng], {
          radius: (isBroken || isOffRoute) ? 12 : 8,
          fillColor: color,
          fillOpacity: 1,
          color: '#fff',
          weight: (isBroken || isOffRoute) ? 4 : 2,
          className: isBroken ? 'blinking-bus' : ''
        }).addTo(this.map)
        marker.bindPopup(`<strong>Bus ${bus.plate}</strong><br>${isBroken?'⚠️ PANNE':(isOffRoute?'🚨 HORS TRAJET':'Ligne '+line.code)}`)
        this.busMarkers.set(bus.id, marker)
      } else {
        marker.setLatLng([lat, lng])
        marker.setStyle({ fillColor: color, radius: (isBroken || isOffRoute) ? 12 : 8, weight: (isBroken || isOffRoute) ? 4 : 2 })
      }
    })
  }

  private renderDashboard() {
    const activeIncidents = this.checkIncidents()
    const geofenceBreaches = this.checkGeofence()
    const totalCap = this.buses.reduce((a,b)=>a+b.capacity, 0)
    const totalPass = this.buses.reduce((a,b)=>a+b.passengers, 0)
    const load = Math.round((totalPass/totalCap)*100) || 0

    return `
      <div class="header-title"><h2>Surveillance Live</h2><p>État du réseau ${this.operatorId}.</p></div>
      <div class="stats-grid" style="margin-top:24px;">
        <div class="stat-card"><div class="stat-label">Bus en service</div><div class="stat-value">${this.buses.length}</div></div>
        <div class="stat-card" style="${activeIncidents.length > 0 ? 'border-color:#ef4444' : ''}"><div class="stat-label">Incidents</div><div class="stat-value" style="color:${activeIncidents.length > 0 ? '#ef4444' : 'inherit'}">${activeIncidents.length}</div></div>
        <div class="stat-card" style="${geofenceBreaches.length > 0 ? 'border-color:#eab308' : ''}"><div class="stat-label">Hors Trajet</div><div class="stat-value" style="color:${geofenceBreaches.length > 0 ? '#eab308' : 'inherit'}">${geofenceBreaches.length}</div></div>
        <div class="stat-card"><div class="stat-label">Charge Flotte</div><div class="stat-value">${load}%</div></div>
      </div>

      ${geofenceBreaches.length > 0 ? `
        <div class="table-container" style="border-color:#eab308">
          <div class="table-header" style="background:rgba(234,179,8,0.1)">
            <h3 style="color:#856404">🚨 Déviations d'itinéraire détectées</h3>
          </div>
          <table class="data-table">
            <thead><tr><th>Véhicule</th><th>Alerte</th><th>Heure</th><th>Action</th></tr></thead>
            <tbody>
              ${geofenceBreaches.map((b:any) => `<tr><td><strong>${b.busId}</strong></td><td><span class="badge" style="background:#fef3c7; color:#856404">SORTIE CORRIDOR</span></td><td>${new Date(b.timestamp).toLocaleTimeString()}</td><td><button class="btn btn-ghost btn-message" data-bus-id="${b.busId}">Rappeler à l'ordre</button></td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
    `
  }

  private renderGeofencing() {
    const breaches = this.checkGeofence()
    return `
      <div class="header-title"><h2>Géofencing & Corridors</h2><p>Surveillance automatique des trajectoires.</p></div>
      <div class="stats-grid" style="margin-top:24px;">
        <div class="stat-card"><div class="stat-label">Corridors Actifs</div><div class="stat-value">${this.lines.length * 2}</div></div>
        <div class="stat-card"><div class="stat-label">Tolérance</div><div class="stat-value">100m</div></div>
      </div>
      <div class="empty-state">
        ${breaches.length === 0 ? '<p>Aucune infraction de zone détectée pour le moment.</p>' : `Détection active pour ${this.operatorId}.`}
      </div>
    `
  }

  private renderCommand() {
    return `<div class="command-map-container"><div id="command-map"></div><div class="map-overlay-card"><div class="map-title"><span class="pulse-live"></span><h3>Commandement</h3></div><div class="fleet-stat-row"><span>Bus Actifs</span><strong>${this.buses.length}</strong></div><div class="fleet-stat-row" style="color:#ef4444"><span>Pannes</span><strong>${this.checkIncidents().length}</strong></div><div class="fleet-stat-row" style="color:#eab308"><span>Hors Trajet</span><strong>${this.checkGeofence().length}</strong></div></div></div>`
  }

  private sendMessageToBus(busId: string) {
    const msg = prompt(`Message pour ${busId}:`)
    if (msg) {
      const messages = JSON.parse(localStorage.getItem('sunubus_messages') || '[]')
      messages.push({ id: Date.now(), to: busId, from: `Admin ${this.operatorId}`, text: msg, timestamp: new Date().toISOString(), read: false })
      localStorage.setItem('sunubus_messages', JSON.stringify(messages))
    }
  }

  private renderFleet() {
    const incidents = this.checkIncidents(); const breaches = this.checkGeofence()
    return `<div class="admin-header"><h2>Ma Flotte</h2></div><div class="table-container"><table class="data-table"><thead><tr><th>Bus</th><th>Statut</th><th>Trajet</th><th>Actions</th></tr></thead><tbody>${this.buses.map(b => {
      const isBroken = incidents.some((inc:any)=>inc.busId===b.id); const isOff = breaches.some((br:any)=>br.brId===b.id) // Adjusted to use busId since br is from geofence breaches
      return `<tr><td><strong>${b.plate}</strong></td><td><span class="badge ${isBroken?'badge-red':(isOff?'badge-orange':'badge-green')}">${isBroken?'PANNE':(isOff?'HORS-TRAJET':'OK')}</span></td><td>${Math.round(b.progress*100)}%</td><td><button class="btn btn-ghost btn-message" data-bus-id="${b.id}">💬</button></td></tr>`
    }).join('')}</tbody></table></div>`
  }

  public setView(view: AdminView) { this.currentView = view; this.render(); if (view==='command') setTimeout(()=>this.initMap(),100) }
  private initMap() { const el = document.getElementById('command-map'); if(!el || (window as any).L===undefined) return; this.map = (window as any).L.map('command-map').setView([14.7167, -17.4677], 13); (window as any).L.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png').addTo(this.map); this.updateMapMarkers() }
  private renderSidebar() {
    const links: { view: AdminView; label: string; icon: string }[] = [
      { view: 'dashboard', label: 'Surveillance', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
      { view: 'command', label: 'Commandement', icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z' },
      { view: 'geofencing', label: 'Géofencing', icon: 'M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z' },
      { view: 'fleet', label: 'Ma Flotte', icon: 'M18 11H6V5h12m0 12H6v-3h12M17 2H7c-1.1 0-2 .9-2 2v15c0 1.1.9 2 2 2v2h1v-2h8v2h1v-2c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z' }
    ]
    return `<aside class="admin-sidebar"><div class="admin-logo"><h1>${this.operatorId}</h1></div><nav class="admin-nav">${links.map(l=>`<button class="nav-link ${this.currentView===l.view?'nav-link-active':''}" data-view="${l.view}"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="${l.icon}"/></svg>${l.label}</button>`).join('')}</nav></aside>`
  }

  public render() {
    if(!this.root) return; let content = ''
    switch(this.currentView){case 'dashboard':content=this.renderDashboard();break;case 'command':content=this.renderCommand();break;case 'fleet':content=this.renderFleet();break;case 'geofencing':content=this.renderGeofencing();break;}
    this.root.innerHTML = `<div class="admin-layout ${this.currentView==='command'?'command-center':''}">${this.renderSidebar()}<main class="admin-main">${content}</main></div>`
    this.root.querySelectorAll('.nav-link[data-view]').forEach(btn=>btn.addEventListener('click',()=>this.setView((btn as HTMLElement).dataset.view as AdminView)))
    this.root.querySelectorAll('.btn-message').forEach(btn => btn.addEventListener('click', (e) => { const id = (e.currentTarget as HTMLElement).dataset.busId; if (id) this.sendMessageToBus(id) }))
  }
}
