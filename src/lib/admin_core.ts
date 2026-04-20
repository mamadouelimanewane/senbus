import { fetchNetwork } from './api'
import type { Bus, Line, Stop } from '../types'
import { buses as staticBuses, lines as staticLines, stops as staticStops } from '../data/network'

export type AdminView = 'dashboard' | 'fleet' | 'lines' | 'command' | 'alerts' | 'geofencing'

type BusHealth = {
  fuel: number
  temp: number
  lastMaintenance: string
}

export class AdminCore {
  private currentView: AdminView = 'dashboard'
  private buses: Bus[] = []
  private lines: Line[] = []
  private operatorId: string
  private root: HTMLElement | null
  private map: any = null
  private busMarkers: Map<string, any> = new Map()
  private fleetHealth: Map<string, BusHealth> = new Map()

  constructor(operatorId: string, rootId: string) {
    this.operatorId = operatorId
    this.root = document.getElementById(rootId)
    this.init()
  }

  private async init() {
    await this.loadData()
    this.buses.forEach(b => this.fleetHealth.set(b.id, { fuel: 80 + Math.random() * 20, temp: 40 + Math.random() * 20, lastMaintenance: '2026-03-15' }))
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
      const health = this.fleetHealth.get(bus.id)!
      
      if (!isBroken) {
        bus.progress += 0.001
        if (bus.progress > 1) bus.progress = 0
        
        // Simulating fuel consumption and heat
        health.fuel = Math.max(0, health.fuel - 0.05)
        health.temp = Math.min(110, health.temp + (Math.random() * 0.1))
        
        if (health.fuel < 5) {
            // Auto fuel incident if not already reported? 
            // For now just keep it simple
        }
      } else {
          health.temp = Math.max(30, health.temp - 0.2) // Cooling down while stopped
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
        marker.bindPopup(`<strong>Bus ${bus.plate}</strong>`)
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
    const lowFuelCount = Array.from(this.fleetHealth.values()).filter(h => h.fuel < 20).length

    return `
      <div class="header-title"><h2>Intelligence Flotte</h2><p>Analyse prédictive et performance ${this.operatorId}.</p></div>
      <div class="stats-grid" style="margin-top:24px;">
        <div class="stat-card" style="${lowFuelCount > 0 ? 'border-color:#f59e0b' : ''}">
          <div class="stat-label">Alertes Énergie</div>
          <div class="stat-value" style="color:${lowFuelCount > 0 ? '#f59e0b' : 'inherit'}">${lowFuelCount}</div>
        </div>
        <div class="stat-card" style="${activeIncidents.length > 0 ? 'border-color:#ef4444' : ''}">
          <div class="stat-label">Pannes Critiques</div>
          <div class="stat-value" style="color:${activeIncidents.length > 0 ? '#ef4444' : 'inherit'}">${activeIncidents.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Santé Moteur Avg</div>
          <div class="stat-value" style="color:#10b981">Bonne</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Disponibilité</div>
          <div class="stat-value">94%</div>
        </div>
      </div>

      <div class="table-container">
        <div class="table-header"><h3>🛠️ Maintenance Préventive</h3></div>
        <table class="data-table">
          <thead><tr><th>Bus</th><th>Carburant</th><th>Temp.</th><th>État</th></tr></thead>
          <tbody>
            ${this.buses.slice(0,5).map(b => {
              const h = this.fleetHealth.get(b.id)!
              const isWarning = h.fuel < 25 || h.temp > 90
              return `<tr>
                <td><strong>${b.plate}</strong></td>
                <td>
                  <div style="width:100px; height:8px; background:#334155; border-radius:4px; overflow:hidden;">
                    <div style="width:${h.fuel}%; height:100%; background:${h.fuel < 25 ? '#ef4444' : '#10b981'}"></div>
                  </div>
                  <span style="font-size:10px; color:var(--admin-muted)">${Math.round(h.fuel)}%</span>
                </td>
                <td><span style="color:${h.temp > 90 ? '#ef4444' : 'inherit'}">${Math.round(h.temp)}°C</span></td>
                <td><span class="badge ${isWarning ? 'badge-orange' : 'badge-green'}">${isWarning ? 'Vérification' : 'Optimal'}</span></td>
              </tr>`
            }).join('')}
          </tbody>
        </table>
      </div>
    `
  }

  private renderFleet() {
    return `
      <div class="admin-header"><h2>Ma Flotte</h2></div>
      <div class="table-container">
        <table class="data-table">
          <thead><tr><th>Bus</th><th>Énergie</th><th>Plan de Vol</th><th>Actions</th></tr></thead>
          <tbody>
            ${this.buses.map(b => {
              const h = this.fleetHealth.get(b.id)!
              return `<tr>
                <td><strong>${b.plate}</strong></td>
                <td>${Math.round(h.fuel)}%</td>
                <td>Ligne ${this.lines.find(l=>l.id===b.lineId)?.code}</td>
                <td>
                  <button class="btn btn-ghost" onclick="alert('Plein effectué pour ${b.plate}')">⚡ Refaire le plein</button>
                  <button class="btn btn-ghost btn-message" data-bus-id="${b.id}">💬</button>
                </td>
              </tr>`
            }).join('')}
          </tbody>
        </table>
      </div>
    `
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
    switch(this.currentView){case 'dashboard':content=this.renderDashboard();break;case 'command':content=this.renderCommand();break;case 'fleet':content=this.renderFleet();break;case 'geofencing':content=`<h2>Géofencing</h2>`;break;}
    this.root.innerHTML = `<div class="admin-layout ${this.currentView==='command'?'command-center':''}">${this.renderSidebar()}<main class="admin-main">${content}</main></div>`
    this.root.querySelectorAll('.nav-link[data-view]').forEach(btn=>btn.addEventListener('click',()=>this.setView((btn as HTMLElement).dataset.view as AdminView)))
    this.root.querySelectorAll('.btn-message').forEach(btn => btn.addEventListener('click', (e) => { const id = (e.currentTarget as HTMLElement).dataset.busId; if (id) {
        const msg = prompt('Message:'); if(msg) {
            const m = JSON.parse(localStorage.getItem('sunubus_messages')||'[]'); m.push({id:Date.now(),to:id,text:msg,read:false}); localStorage.setItem('sunubus_messages',JSON.stringify(m))
        }
    } }))
  }
}
