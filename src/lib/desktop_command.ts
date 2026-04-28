import { lines, buses } from '../data/network'
import { getLineRoadGeometry, interpolate, cleanAllGeometries } from './routing'

export class DesktopCommandCenter {
  private map: any = null
  private root: HTMLElement
  private busMarkers: Map<string, any> = new Map()
  private linePolylines: Map<string, any> = new Map()
  private simulationSpeed: number = 1.0

  constructor(containerId: string) {
    this.root = document.getElementById(containerId)!
    this.init()
  }

  private init() {
    cleanAllGeometries()
    this.renderLayout()
    setTimeout(() => this.initMap(), 100)
    setInterval(() => this.updateBuses(), 1000)
  }

  private initMap() {
    // @ts-ignore
    this.map = L.map('pc-map', { zoomControl: false }).setView([14.7167, -17.4677], 12)
    
    // Theme Dark Cartographie
    // @ts-ignore
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors © CARTO'
    }).addTo(this.map)

    // @ts-ignore
    L.control.zoom({ position: 'topright' }).addTo(this.map)

    this.drawAllLines()
  }

  private drawAllLines() {
    lines.forEach(line => {
      const road = getLineRoadGeometry(line.id, line.stopIds)
      if (road.coords.length > 1) {
        // @ts-ignore
        const poly = L.polyline(road.coords, {
          color: line.color,
          weight: 3,
          opacity: 0.3,
          smoothFactor: 1
        }).addTo(this.map)
        
        poly.bindTooltip(`Ligne ${line.code}: ${line.name}`, { sticky: true })
        this.linePolylines.set(line.id, poly)
      }
    })
  }

  private updateBuses() {
    if (!this.map) return

    buses.forEach(bus => {
      const line = lines.find(l => l.id === bus.lineId)
      if (!line) return

      const road = getLineRoadGeometry(line.id, line.stopIds)
      if (road.coords.length < 2) return

      // Simulation de mouvement
      bus.progress += 0.0005 * bus.speedFactor * this.simulationSpeed
      if (bus.progress > 1) bus.progress = 0

      const [lat, lng] = interpolate(road, bus.progress)
      
      let marker = this.busMarkers.get(bus.id)
      if (!marker) {
        // @ts-ignore
        const icon = L.divIcon({
          className: 'pc-bus-icon',
          html: `<div class="bus-dot" style="background:${line.color}"></div>`,
          iconSize: [12, 12]
        })
        // @ts-ignore
        marker = L.marker([lat, lng], { icon }).addTo(this.map)
        marker.bindPopup(`<strong>BUS ${bus.plate}</strong><br>Ligne ${line.code}<br>${Math.round(bus.progress * 100)}% du trajet`)
        this.busMarkers.set(bus.id, marker)
      } else {
        marker.setLatLng([lat, lng])
      }
    })

    this.updateStats()
  }

  private updateStats() {
    const activeCount = buses.length
    const totalCap = buses.reduce((a, b) => a + b.capacity, 0)
    const totalPass = buses.reduce((a, b) => a + b.passengers, 0)
    const loadFactor = Math.round((totalPass / totalCap) * 100)

    const statsEl = document.getElementById('pc-stats')
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="pc-stat-item">
          <span class="label">BUS EN SERVICE</span>
          <span class="value">${activeCount}</span>
        </div>
        <div class="pc-stat-item">
          <span class="label">TAUX D'OCCUPATION</span>
          <span class="value">${loadFactor}%</span>
        </div>
        <div class="pc-stat-item">
          <span class="label">LIGNES ACTIVES</span>
          <span class="value">${lines.length}</span>
        </div>
      `
    }
  }

  private renderLayout() {
    this.root.innerHTML = `
      <div class="pc-container">
        <header class="pc-header">
          <div class="pc-brand">
            <span class="pc-logo">🚌</span>
            <div class="pc-title">
              <h1>PC DE COMMANDEMENT</h1>
              <p>SYSTÈME DE SURVEILLANCE DAKAR DEM DIKK</p>
            </div>
          </div>
          <div id="pc-stats" class="pc-stats-row"></div>
          
          <div class="pc-control-group">
            <span class="label">VITESSE SIMULATION</span>
            <input type="range" id="speed-slider" min="0" max="50" step="1" value="${this.simulationSpeed * 10}">
            <span class="value" id="speed-value">x${this.simulationSpeed}</span>
          </div>

          <div class="pc-clock" id="pc-clock">--:--:--</div>
        </header>

        <main class="pc-main">
          <div class="pc-sidebar">
            <div class="pc-sidebar-header">
                <h2>Réseau Urbain</h2>
                <input type="text" placeholder="Rechercher une ligne..." class="pc-search">
            </div>
            <div class="pc-line-list" id="pc-line-list">
              ${this.renderLineList(lines)}
            </div>
          </div>
          <div class="pc-map-wrapper">
            <div id="pc-map"></div>
          </div>
          <div class="pc-event-log">
             <div class="log-header">LOGS TEMPS RÉEL</div>
             <div id="pc-log-content" class="log-entries">
                <div class="log-entry">[SYSTEM] Initialisation de la cartographie complète...</div>
                <div class="log-entry">[NETWORK] Raccordement des 30 lignes DDD terminé.</div>
                <div class="log-entry">[FLEET] 350 bus identifiés et suivis.</div>
             </div>
          </div>
        </main>
      </div>
    `

    // Update Clock
    setInterval(() => {
        const el = document.getElementById('pc-clock')
        if (el) el.innerText = new Date().toLocaleTimeString()
    }, 1000)
    
    // Add interactions
    this.setupListListeners()

    const searchInput = this.root.querySelector('.pc-search') as HTMLInputElement
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase()
            const filtered = lines.filter(l => l.code.toLowerCase().includes(query) || l.name.toLowerCase().includes(query))
            const listEl = document.getElementById('pc-line-list')
            if (listEl) {
                listEl.innerHTML = this.renderLineList(filtered)
                this.setupListListeners()
            }
        })
    }

    const slider = document.getElementById('speed-slider') as HTMLInputElement
    const speedVal = document.getElementById('speed-value')
    if (slider && speedVal) {
        slider.addEventListener('input', () => {
            this.simulationSpeed = parseInt(slider.value) / 10
            speedVal.innerText = `x${this.simulationSpeed.toFixed(1)}`
        })
    }
  }

  private focusLine(lineId: string) {
    const line = lines.find(l => l.id === lineId)
    if (!line) return

    const poly = this.linePolylines.get(lineId)
    if (poly) {
        // Reset others
        this.linePolylines.forEach(p => p.setStyle({ opacity: 0.1, weight: 2 }))
        // Highlight this
        poly.setStyle({ opacity: 1, weight: 6 })
        this.map.fitBounds(poly.getBounds(), { padding: [50, 50] })
    }
    
    const log = document.getElementById('pc-log-content')
    if (log) {
        const entry = document.createElement('div')
        entry.className = 'log-entry highlight'
        entry.innerText = `[CMD] Focus : Ligne ${line.code} (${line.name})`
        log.prepend(entry)
    }
  }

  private renderLineList(linesToRender: any[]): string {
    return linesToRender.map(l => `
      <div class="pc-line-item" data-line-id="${l.id}">
        <span class="line-badge" style="background:${l.color}">${l.code}</span>
        <div class="line-info">
          <span class="line-name">${l.name}</span>
          <span class="line-status">EN OPÉRATION</span>
        </div>
      </div>
    `).join('')
  }

  private setupListListeners() {
    this.root.querySelectorAll('.pc-line-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = (item as HTMLElement).dataset.lineId!
            this.focusLine(id)
        })
    })
  }
}
