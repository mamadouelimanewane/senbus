import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BUS_LINES } from './data';
import type { BusLine } from './data';
import { initPushNotifications } from './lib/push';

initPushNotifications();

// Map state
let map: L.Map;
let activeBuses: Bus[] = [];
let linePolylines: Record<string, L.Polyline> = {};
let isSimulating = true;

class Bus {
  id: string;
  line: BusLine;
  marker: L.Marker;
  currentStopIndex: number = 0;
  progress: number = 0;
  speed: number = 0.005;
  direction: 1 | -1 = 1;

  constructor(line: BusLine, startStopIndex: number, direction: 1 | -1 = 1) {
    this.id = `bus-${line.id}-${Math.floor(Math.random() * 10000)}`;
    this.line = line;
    this.currentStopIndex = startStopIndex;
    this.direction = direction;
    
    const startCoords = line.itinerary[startStopIndex].coords;
    const icon = L.divIcon({
      className: 'bus-marker-container',
      html: `<div class="bus-marker" style="background-color: ${line.color}">${line.id}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    this.marker = L.marker(startCoords as L.LatLngExpression, { icon }).addTo(map);
    this.marker.bindPopup(`<b>Ligne ${line.id}</b><br>${line.name}`);
  }

  update() {
    if (!isSimulating) return;
    this.progress += this.speed;

    if (this.progress >= 1) {
      this.progress = 0;
      this.currentStopIndex += this.direction;

      if (this.currentStopIndex >= this.line.itinerary.length - 1 && this.direction === 1) {
        this.direction = -1;
      } else if (this.currentStopIndex <= 0 && this.direction === -1) {
        this.direction = 1;
      }
    }

    const currentStop = this.line.itinerary[this.currentStopIndex];
    const nextStop = this.line.itinerary[this.currentStopIndex + this.direction];

    if (currentStop && nextStop) {
      const lat = currentStop.coords[0] + (nextStop.coords[0] - currentStop.coords[0]) * this.progress;
      const lng = currentStop.coords[1] + (nextStop.coords[1] - currentStop.coords[1]) * this.progress;
      this.marker.setLatLng([lat, lng]);
    }
  }
}

async function bootstrap() {
  console.log('--- BOOTSTRAP START ---');
  
  const mapElement = document.getElementById('map');
  if (!mapElement) {
    console.error('Fatal: #map element not found');
    return;
  }

  try {
    console.log('Initializing Leaflet Map...');
    map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([14.73, -17.40], 12);

    console.log('Adding Tile Layer...');
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    console.log('Drawing Routes...');
    BUS_LINES.forEach(line => {
      const coords = line.itinerary.map(s => s.coords as L.LatLngExpression);
      const poly = L.polyline(coords, {
        color: line.color,
        weight: 3,
        opacity: 0.4,
        lineJoin: 'round'
      }).addTo(map);
      linePolylines[line.id] = poly;
    });

    console.log('Spawning Buses...');
    BUS_LINES.forEach(line => {
      activeBuses.push(new Bus(line, 0, 1));
      activeBuses.push(new Bus(line, line.itinerary.length - 1, -1));
    });

    console.log('Rendering Sidebar...');
    updateStats();
    renderLineList();
    
    console.log('Starting Animation loop...');
    animate();

    // Ensure map takes full height
    setTimeout(() => {
      map.invalidateSize();
      console.log('Map size invalidated and updated');
    }, 1000);

  } catch (err) {
    console.error('Bootstrap CRASHED:', err);
  }
}

function updateStats() {
  const countEl = document.getElementById('active-bus-count');
  if (countEl) countEl.innerText = activeBuses.length.toString();
  
  const linesEl = document.getElementById('active-lines-count');
  if (linesEl) linesEl.innerText = BUS_LINES.length.toString();
}

function renderLineList(filteredLines = BUS_LINES) {
  const list = document.getElementById('line-list');
  if (!list) return;

  list.innerHTML = filteredLines.map(line => {
    const busCount = activeBuses.filter(b => b.line.id === line.id).length;
    return `
      <div class="line-item" data-id="${line.id}">
        <div class="line-info">
          <span class="line-number" style="color: ${line.color}">L${line.id}</span>
          <span class="line-name">${line.name}</span>
        </div>
        <div class="bus-indicator">
          <div class="pulse"></div>
          <span>${busCount > 0 ? busCount : 2} Bus</span>
        </div>
      </div>
    `;
  }).join('');

  attachListeners();
}

function attachListeners() {
  document.querySelectorAll('.line-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.getAttribute('data-id');
      const line = BUS_LINES.find(l => l.id === id);
      const poly = linePolylines[id!];

      Object.values(linePolylines).forEach(p => p.setStyle({ opacity: 0.1, weight: 3 }));
      document.querySelectorAll('.line-item').forEach(li => li.classList.remove('active'));

      if (line && poly) {
        item.classList.add('active');
        poly.setStyle({ opacity: 1, weight: 6 });
        map.fitBounds(poly.getBounds(), { padding: [100, 100] });
        
        // Show stop list
        const stopList = document.getElementById('stop-list');
        const stopContent = document.getElementById('stop-list-content');
        if (stopList && stopContent) {
          stopList.classList.add('active');
          stopContent.innerHTML = line.itinerary.map(s => `
            <div class="stop-item">
              <div class="stop-dot" style="background: ${line.color}"></div>
              <span>${s.name}</span>
            </div>
          `).join('');
        }
      }
    });
  });

  document.getElementById('line-search')?.addEventListener('input', (e) => {
    const q = (e.target as HTMLInputElement).value.toLowerCase();
    const filtered = BUS_LINES.filter(l => 
      l.id.toLowerCase().includes(q) || 
      l.name.toLowerCase().includes(q) ||
      l.itinerary.some(s => s.name.toLowerCase().includes(q))
    );
    renderLineList(filtered);
  });
}

function animate() {
  activeBuses.forEach(b => b.update());
  requestAnimationFrame(animate);
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

// Global controls
document.getElementById('center-map')?.addEventListener('click', () => {
  map.setView([14.73, -17.40], 12);
});

document.getElementById('toggle-sim')?.addEventListener('click', () => {
  isSimulating = !isSimulating;
  console.log('Simulation toggled:', isSimulating);
});
