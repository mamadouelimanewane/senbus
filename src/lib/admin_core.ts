import { fetchNetwork } from './api'
import type { Bus, Line } from '../types'
import { buses as staticBuses, lines as staticLines } from '../data/network'
import { getFullRoadPathSync, interpolate } from './routing'

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
    this.buses.forEach(b => {
        if (!this.fleetHealth.has(b.id)) {
            this.fleetHealth.set(b.id, { fuel: 80 + Math.random() * 20, temp: 40 + Math.random() * 20, lastMaintenance: '2026-03-15' })
        }
    })
    this.render()
    setInterval(() => this.tick(), 2000)
  }

  private checkIncidents() { return JSON.parse(localStorage.getItem('sunubus_incidents') || '[]').filter((inc:any) => !inc.resolved) }
  private checkGeofence() { return JSON.parse(localStorage.getItem('sunubus_geofence') || '[]') }

  private async loadData() {
    const localLines = JSON.parse(localStorage.getItem(`sunubus_lines_${this.operatorId}`) || 'null')
    const localBuses = JSON.parse(localStorage.getItem(`sunubus_buses_${this.operatorId}`) || 'null')

    try {
      const network = await fetchNetwork()
      this.buses = localBuses || network.buses.filter(b => {
        const line = network.lines.find(l => l.id === b.lineId)
        return line?.operatorId === this.operatorId
      })
      this.lines = localLines || network.lines.filter(l => l.operatorId === this.operatorId)
    } catch (err) {
      this.buses = localBuses || staticBuses.filter(b => {
        const line = staticLines.find(l => l.id === b.lineId)
        return line?.operatorId === this.operatorId
      })
      this.lines = localLines || staticLines.filter(l => l.operatorId === this.operatorId)
    }
  }

  private saveData() {
    localStorage.setItem(`sunubus_lines_${this.operatorId}`, JSON.stringify(this.lines))
    localStorage.setItem(`sunubus_buses_${this.operatorId}`, JSON.stringify(this.buses))
  }

  private tick() {
    const activeIncidents = this.checkIncidents()
    this.buses.forEach(bus => {
      const isBroken = activeIncidents.some((inc:any) => inc.busId === bus.id); const health = this.fleetHealth.get(bus.id)
      if (health && !isBroken) {
        bus.progress += 0.0015; if (bus.progress > 1) bus.progress = 0
        health.fuel = Math.max(0, health.fuel - 0.05); health.temp = Math.min(110, health.temp + (Math.random() * 0.1))
      } else if (health) health.temp = Math.max(30, health.temp - 0.2)
    })
    if (this.currentView === 'command' && this.map) this.updateMapMarkers()
    else if (['dashboard','fleet','lines'].includes(this.currentView)) this.render()
  }

  private async updateMapMarkers() {
    const activeIncidents = this.checkIncidents(); const geofenceBreaches = this.checkGeofence()
    for (const bus of this.buses) {
      const line = this.lines.find(l => l.id === bus.lineId); if (!line) continue
      
      const road = getFullRoadPathSync(line.stopIds, line.code)
      if (road.coords.length < 2) continue

      const isBroken = activeIncidents.some((inc:any) => inc.busId === bus.id); const isOff = geofenceBreaches.some((b:any) => b.busId === bus.id)
      const [lat, lng] = interpolate(road, bus.progress)
      
      let marker = this.busMarkers.get(bus.id); const color = isBroken ? '#ef4444' : (isOff ? '#eab308' : line.color)
      
      if (!marker) {
        marker = (window as any).L.circleMarker([lat + (isOff?0.005:0), lng + (isOff?0.005:0)], { 
            radius: (isBroken || isOff) ? 12 : 8, 
            fillColor: color, 
            fillOpacity: 1, 
            color: '#fff', 
            weight: (isBroken || isOff) ? 4 : 2, 
            className: isBroken ? 'blinking-bus' : '' 
        }).addTo(this.map)
        marker.bindPopup(`<strong>Bus ${bus.plate}</strong>`); this.busMarkers.set(bus.id, marker)
      } else { 
          marker.setLatLng([lat + (isOff?0.005:0), lng + (isOff?0.005:0)]); 
          marker.setStyle({ fillColor: color, radius: (isBroken || isOff) ? 12 : 8, weight: (isBroken || isOff) ? 4 : 2 }) 
      }
    }
  }

  private addLine() {
    const name = prompt("Nom de la ligne (ex: Liberté 6 - Gare) :")
    const code = prompt("Code de la ligne (ex: 404) :")
    if (name && code) {
      const newLine: Line = { 
        id: `line-${Date.now()}`, 
        code, 
        name, 
        headsign: name.split(' - ')[1] || name,
        operatorId: this.operatorId as any, 
        color: '#'+Math.floor(Math.random()*16777215).toString(16), 
        stopIds: ['palais','sandaga'], 
        baseMinutes: 45, 
        frequencyMin: 15 
      }
      this.lines.push(newLine); this.saveData(); this.render()
    }
  }

  private deleteLine(id: string) {
    if (confirm("Supprimer cette ligne ?")) {
      this.lines = this.lines.filter(l => l.id !== id); this.saveData(); this.render()
    }
  }

  private reassignBus(busId: string) {
    const options = this.lines.map((l, i) => `${i}: Ligne ${l.code} (${l.name})`).join("\n")
    const choice = prompt(`Choisir une nouvelle ligne pour le bus :\n${options}`)
    if (choice !== null) {
      const idx = parseInt(choice); if (this.lines[idx]) {
        const bus = this.buses.find(b => b.id === busId); if (bus) {
          bus.lineId = this.lines[idx].id; this.saveData(); this.render()
        }
      }
    }
  }

  private renderDashboard() {
    const totalCap = this.buses.reduce((a,b)=>a+b.capacity, 0); const totalPass = this.buses.reduce((a,b)=>a+b.passengers, 0); const load = Math.round((totalPass/totalCap)*100) || 0
    const lowFuel = Array.from(this.fleetHealth.values()).filter(h => h.fuel < 20).length; const activeInc = this.checkIncidents()
    return `<div class="admin-header"><h2>Intelligence Flotte</h2><button class="btn btn-primary" id="btn-export">📊 Rapport</button></div><div class="stats-grid"><div class="stat-card" style="${lowFuel>0?'border-color:#f59e0b':''}"><div class="stat-label">Alertes Énergie</div><div class="stat-value">${lowFuel}</div></div><div class="stat-card" style="${activeInc.length>0?'border-color:#ef4444':''}"><div class="stat-label">Pannes</div><div class="stat-value">${activeInc.length}</div></div><div class="stat-card"><div class="stat-label">Lignes Actives</div><div class="stat-value">${this.lines.length}</div></div><div class="stat-card"><div class="stat-label">Charge</div><div class="stat-value">${load}%</div></div></div>`
  }

  private renderLines() {
    return `
      <div class="admin-header"><div><h2>Réseau de Lignes</h2><p>CRUD de configuration des parcours ${this.operatorId}</p></div><button class="btn btn-primary" id="btn-add-line">+ Nouvelle Ligne</button></div>
      <div class="table-container">
        <table class="data-table">
          <thead><tr><th>Code</th><th>Nom</th><th>Stations</th><th>Actions</th></tr></thead>
          <tbody>
            ${this.lines.map(l => `<tr><td><span class="badge" style="background:${l.color}22; color:${l.color}; font-weight:800">${l.code}</span></td><td>${l.name}</td><td>${l.stopIds.length} arrêts</td><td><button class="btn btn-ghost" onclick="alert('Modification avancée bientôt disponible')">✏️</button><button class="btn btn-ghost btn-delete-line" data-id="${l.id}" style="color:var(--admin-danger)">🗑️</button></td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    `
  }

  private renderFleet() {
    return `<div class="admin-header"><h2>Ma Flotte</h2></div><div class="table-container"><table class="data-table"><thead><tr><th>Bus</th><th>Ligne Actuelle</th><th>Énergie</th><th>Actions</th></tr></thead><tbody>${this.buses.map(b => {
      const h = this.fleetHealth.get(b.id)!; const l = this.lines.find(line=>line.id===b.lineId)
      return `<tr><td><strong>${b.plate}</strong></td><td><span class="badge" style="background:var(--admin-accent)22; color:var(--admin-accent)">${l?`Ligne ${l.code}`:'NON AFFECTÉ'}</span></td><td>${Math.round(h.fuel)}%</td><td><button class="btn btn-ghost btn-reassign" data-id="${b.id}" style="color:var(--admin-primary)">🔄 Réaffecter</button><button class="btn btn-ghost" onclick="alert('Plein fait')">⚡</button></td></tr>`
    }).join('')}</tbody></table></div>`
  }

  public setView(view: AdminView) { this.currentView = view; this.render(); if (view==='command') setTimeout(()=>this.initMap(),100) }
  private initMap() { const el = document.getElementById('command-map'); if(!el || (window as any).L===undefined) return; this.map = (window as any).L.map('command-map').setView([14.7167, -17.4677], 13); (window as any).L.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png').addTo(this.map); this.updateMapMarkers() }
  private renderSidebar() {
    const links: { view: AdminView; label: string; icon: string }[] = [
      { view: 'dashboard', label: 'Surveillance', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
      { view: 'command', label: 'Commandement', icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z' },
      { view: 'lines', label: 'Réseau Lignes', icon: 'M20 7V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2z' },
      { view: 'fleet', label: 'Ma Flotte', icon: 'M18 11H6V5h12m0 12H6v-3h12M17 2H7c-1.1 0-2 .9-2 2v15c0 1.1.9 2 2 2v2h1v-2h8v2h1v-2c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z' }
    ]
    return `<aside class="admin-sidebar"><div class="admin-logo"><h1>${this.operatorId}</h1></div><nav class="admin-nav">${links.map(l=>`<button class="nav-link ${this.currentView===l.view?'nav-link-active':''}" data-view="${l.view}"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="${l.icon}"/></svg>${l.label}</button>`).join('')}</nav></aside>`
  }

  public render() {
    if(!this.root) return; let content = ''
    switch(this.currentView){case 'dashboard':content=this.renderDashboard();break;case 'command':content=`<div class="command-map-container"><div id="command-map"></div></div>`;break;case 'fleet':content=this.renderFleet();break;case 'lines':content=this.renderLines();break;}
    this.root.innerHTML = `<div class="admin-layout ${this.currentView==='command'?'command-center':''}">${this.renderSidebar()}<main class="admin-main">${content}</main></div>`
    this.root.querySelectorAll('.nav-link[data-view]').forEach(btn=>btn.addEventListener('click',()=>this.setView((btn as HTMLElement).dataset.view as AdminView)))
    this.root.querySelector('#btn-export')?.addEventListener('click', () => {
        const header = "BusID,Plaque,Ligne,Carburant,Temp\n"
        const rows = this.buses.map(b => `${b.id},${b.plate},${b.lineId},${Math.round(this.fleetHealth.get(b.id)!.fuel)}%,${Math.round(this.fleetHealth.get(b.id)!.temp)}°C`).join("\n")
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([header + rows], { type: 'text/csv' })); a.download = `rapport_${this.operatorId}.csv`; a.click()
    })
    this.root.querySelector('#btn-add-line')?.addEventListener('click', () => this.addLine())
    this.root.querySelectorAll('.btn-delete-line').forEach(btn => btn.addEventListener('click', (e) => this.deleteLine((e.currentTarget as HTMLElement).dataset.id!)))
    this.root.querySelectorAll('.btn-reassign').forEach(btn => btn.addEventListener('click', (e) => this.reassignBus((e.currentTarget as HTMLElement).dataset.id!)))
  }
}
