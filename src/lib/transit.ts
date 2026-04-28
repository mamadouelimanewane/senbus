import { stops, lines, buses } from '../data/network'
import { DAKAR_LANDMARKS } from '../data/landmarks'
import type { ApiNetwork, ApiSnapshot, Bus, Line, PlannerJourney, Prediction, RouteMetrics, SearchResult, Stop } from '../types'
import { roadCache } from './routing'

export const stopById = new Map(stops.map((stop) => [stop.id, stop]))
export const lineById = new Map(lines.map((line) => [line.id, line]))
const routeCache = new Map<string, RouteMetrics>()

function replaceItems<T>(target: T[], source: T[]): void {
  target.splice(0, target.length, ...source)
}

export function hydrateNetworkData(network: ApiNetwork): void {
  replaceItems(stops, network.stops)
  replaceItems(lines, network.lines)
  replaceItems(buses, network.buses)
  stopById.clear()
  lineById.clear()
  routeCache.clear()
  stops.forEach((stop) => stopById.set(stop.id, stop))
  lines.forEach((line) => lineById.set(line.id, line))
}

export function hydrateSnapshot(snapshot: ApiSnapshot): void {
  replaceItems(buses, snapshot.buses)
}

function getStop(stopId: string): Stop | null {
  return stopById.get(stopId) ?? null
}

function getLine(lineId: string): Line | null {
  return lineById.get(lineId) ?? null
}

export function getRouteMetrics(line: Line): RouteMetrics {
  const cached = routeCache.get(line.id)
  if (cached) return cached

  // On essaie d'utiliser le tracé routier réel s'il est déjà en cache mémoire
  const road = roadCache.get(`liq_${line.stopIds.join('|')}`)
  
  if (road) {
    const stopRatios: Record<string, number> = {}
    line.stopIds.forEach((id, index) => {
      stopRatios[id] = index / (line.stopIds.length - 1) 
    })
    
    const metrics = { 
      points: line.stopIds.map(id => stopById.get(id)!).filter(Boolean), 
      segments: road.distances, 
      totalLength: road.total, 
      stopRatios 
    }
    routeCache.set(line.id, metrics)
    return metrics
  }

  // Fallback: estimation basée sur la vitesse moyenne (~21 km/h = 350m/min)
  const estimatedLength = line.baseMinutes * 350
  const stopRatios: Record<string, number> = {}
  line.stopIds.forEach((id, index) => {
    stopRatios[id] = index / (line.stopIds.length - 1)
  })

  const metrics = {
    points: line.stopIds.map(id => stopById.get(id)!).filter(Boolean),
    segments: line.stopIds.map(() => estimatedLength / (line.stopIds.length - 1)),
    totalLength: estimatedLength,
    stopRatios
  }
  routeCache.set(line.id, metrics)
  return metrics
}


export function getPointAlongLine(line: Line, progress: number): { x: number; y: number } {
  // Cette fonction est devenue secondaire car main.ts utilise interpolate() de routing.ts
  // On garde un fallback simplifié pour la compatibilité
  const stopIndex = Math.floor(progress * (line.stopIds.length - 1))
  const stop = stopById.get(line.stopIds[stopIndex]) || stops[0]
  return { x: stop.x, y: stop.y }
}

export function getOccupancyLabel(bus: Bus): string {
  const ratio = bus.passengers / bus.capacity
  if (ratio < 0.45) {
    return 'Faible'
  }
  if (ratio < 0.8) {
    return 'Moyenne'
  }
  return 'Chargee'
}

export function getTrafficLabel(bus: Bus): string {
  if (bus.speedFactor >= 1.04) {
    return 'Fluide'
  }
  if (bus.speedFactor >= 0.95) {
    return 'Regulier'
  }
  return 'Dense'
}

export function formatEta(etaMin: number): string {
  if (etaMin < 1) {
    return 'Immediat'
  }
  if (etaMin < 60) {
    return `${Math.max(1, Math.round(etaMin))} min`
  }
  const hours = Math.floor(etaMin / 60)
  const minutes = Math.round(etaMin % 60)
  return `${hours} h ${minutes.toString().padStart(2, '0')}`
}

export function formatClock(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/**
 * Calcul du tarif basé sur la distance (Dakar Standard: 150 - 500 FCFA)
 */
export function calculateFare(distanceMeters: number): number {
  const km = distanceMeters / 1000
  if (km < 3) return 150
  if (km < 7) return 200
  if (km < 12) return 250
  if (km < 18) return 300
  if (km < 25) return 400
  return 500
}

export function getEtaMinutes(bus: Bus, stopId: string): number | null {
  const line = getLine(bus.lineId)
  if (!line || !line.stopIds.includes(stopId)) {
    return null
  }

  const { stopRatios } = getRouteMetrics(line)
  const stopRatio = stopRatios[stopId]
  const current = ((bus.progress % 1) + 1) % 1
  const distanceRatio = stopRatio >= current ? stopRatio - current : 1 - current + stopRatio
  if (distanceRatio < 0.008) {
    return 0
  }
  return distanceRatio * (line.baseMinutes / bus.speedFactor)
}

export function getPredictions(stopId: string): Prediction[] {
  return buses
    .map((bus) => {
      const line = getLine(bus.lineId)
      const etaMin = getEtaMinutes(bus, stopId)
      if (!line || etaMin === null) {
        return null
      }
      return { etaMin, bus, line }
    })
    .filter((prediction): prediction is Prediction => Boolean(prediction))
    .sort((left, right) => left.etaMin - right.etaMin)
}

export function getJourneyIdeas(stopId: string): Array<{ line: Line; durationMin: number; terminus: string }> {
  return lines
    .filter((line) => line.stopIds.includes(stopId))
    .map((line) => {
      const { stopRatios } = getRouteMetrics(line)
      const ratio = stopRatios[stopId] ?? 0
      const durationMin = Math.max(4, Math.round((1 - ratio) * line.baseMinutes))
      const terminusId = line.stopIds.at(-1) ?? line.stopIds[0]
      const terminus = getStop(terminusId)?.name ?? 'Terminus'
      return { line, durationMin, terminus }
    })
    .sort((left, right) => left.durationMin - right.durationMin)
}

export function getServingLines(stopId: string): Line[] {
  return lines.filter((line) => line.stopIds.includes(stopId))
}

export function getStopBusyness(stopId: string): string {
  const predictions = getPredictions(stopId)
  if (predictions.length >= 5) {
    return 'Tres frequent'
  }
  if (predictions.length >= 3) {
    return 'Bon passage'
  }
  return 'Passage limite'
}

function normalizeString(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase()
}

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost)
    }
  }
  return matrix[a.length][b.length]
}

export function getSearchResults(query: string, filter: 'all' | 'DDD' | 'AFTU' = 'all'): SearchResult[] {
  let normalized = normalizeString(query).trim()
  if (!normalized) {
    return []
  }

  // NLP Engine: Stop-words filtering + typo tolerance
  const stopWords = ['je', 'vais', 'a', 'au', 'aux', 'vers', 'le', 'la', 'les', 'de', 'des', 'mon', 'ma', 'mes', 'cherche', 'comment', 'aller', 'vouloir', 'veux', 'svp', 'ligne', 'bus']
  const rawTerms = normalized.split(/\s+/)
  const significantTerms = rawTerms.filter(t => !stopWords.includes(t))
  const terms = significantTerms.length > 0 ? significantTerms : rawTerms

  const isFuzzyMatch = (target: string, term: string) => {
    if (target.includes(term)) return true
    if (term.length > 4) {
      const targetWords = target.split(/\s+/)
      return targetWords.some(tw => Math.abs(tw.length - term.length) <= 2 && levenshtein(tw, term) <= 2)
    }
    return false
  }

  const matchedStops: SearchResult[] = stops
    .filter((stop) => {
      const agg = normalizeString(`${stop.name} ${stop.district}`)
      return terms.every((term) => isFuzzyMatch(agg, term))
    })
    .slice(0, 6)
    .map((stop) => ({ type: 'stop', stop }))

  const matchedLines: SearchResult[] = lines
    .filter((line) => {
      const agg = normalizeString(`${line.code} ${line.name} ${line.headsign}`)
      const match = terms.every((term) => isFuzzyMatch(agg, term))
      if (!match) return false
      if (filter === 'DDD' && line.operatorId !== 'DDD') return false
      if (filter === 'AFTU' && line.operatorId !== 'AFTU-TATA') return false
      return true
    })
    .slice(0, 4)
    .map((line) => ({ type: 'line', line }))

  const matchedLandmarks: SearchResult[] = DAKAR_LANDMARKS
    .filter(l => {
      const agg = normalizeString(`${l.name} ${l.district} ${l.type}`)
      return terms.every(term => isFuzzyMatch(agg, term))
    })
    .slice(0, 4)
    .map(landmark => ({ type: 'other', id: landmark.name, icon: '📍', label: landmark.name, subLabel: `${landmark.district} (${landmark.type})` }))

  return [...matchedStops, ...matchedLines, ...matchedLandmarks]
}

function getSegmentDistance(line: Line, fromStopId: string, toStopId: string): number {
  const { totalLength, stopRatios } = getRouteMetrics(line)
  const fromRatio = stopRatios[fromStopId] ?? (line.stopIds.indexOf(fromStopId) / (line.stopIds.length - 1))
  const toRatio = stopRatios[toStopId] ?? (line.stopIds.indexOf(toStopId) / (line.stopIds.length - 1))
  return Math.abs(toRatio - fromRatio) * totalLength
}

function getSegmentDuration(line: Line, fromStopId: string, toStopId: string): number | null {
  const fromIndex = line.stopIds.indexOf(fromStopId)
  const toIndex = line.stopIds.indexOf(toStopId)
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return null
  }

  const { stopRatios } = getRouteMetrics(line)
  const fromRatio = stopRatios[fromStopId] ?? (fromIndex / (line.stopIds.length - 1))
  const toRatio = stopRatios[toStopId] ?? (toIndex / (line.stopIds.length - 1))
  
  const ratioDiff = Math.abs(toRatio - fromRatio)
  
  return Math.max(4, Math.round(ratioDiff * line.baseMinutes))
}

export function getNearestStop(x: number, y: number): Stop {
  let bestStop = stops[0]
  let minDist = Infinity
  for (const stop of stops) {
    const d = Math.sqrt(Math.pow(stop.x - x, 2) + Math.pow(stop.y - y, 2))
    if (d < minDist) {
      minDist = d
      bestStop = stop
    }
  }
  return bestStop
}

export function getNearbyStops(stopId: string, radius: number = 8): Stop[] {
  const target = stopById.get(stopId)
  if (!target) return []
  return stops.filter(s => {
    const d = Math.sqrt(Math.pow(s.x - target.x, 2) + Math.pow(s.y - target.y, 2))
    return d <= radius
  })
}

export function findJourneys(originId: string, destinationId: string, depth: number = 0): PlannerJourney[] {
  if (originId === destinationId || depth > 1) return []

  const origin = getStop(originId)
  const destination = getStop(destinationId)
  if (!origin || !destination) return []

  const journeys: PlannerJourney[] = []
  
  // 1. Cluster hubs: find stops near origin and destination
  const origins = getNearbyStops(originId, 8)
  const destinations = getNearbyStops(destinationId, 8)

  // 2. Search for direct lines between any origin-cluster stop and any destination-cluster stop
  origins.forEach(o => {
    destinations.forEach(d => {
      lines.forEach(line => {
        const durationMin = getSegmentDuration(line, o.id, d.id)
        if (durationMin !== null) {
          const dist = getSegmentDistance(line, o.id, d.id)
          const segments = []
          if (o.id !== originId) segments.push({ kind: 'walk' as any, fromStop: origin, toStop: o, durationMin: 5 })
          segments.push({ kind: 'direct' as any, line, fromStop: o, toStop: d, durationMin })
          if (d.id !== destinationId) segments.push({ kind: 'walk' as any, fromStop: d, toStop: destination, durationMin: 5 })
          
          journeys.push({
            totalDurationMin: durationMin + (o.id !== originId ? 5 : 0) + (d.id !== destinationId ? 5 : 0),
            totalDistanceMeters: dist + (o.id !== originId ? 400 : 0) + (d.id !== destinationId ? 400 : 0),
            segments
          })
        }
      })
    })
  })

  // 3. Search for 1-transfer journeys (Shared stops or Walking transfers)
  origins.forEach(o => {
    const oLines = getServingLines(o.id)
    destinations.forEach(d => {
      const dLines = getServingLines(d.id)
      
      oLines.forEach(l1 => {
        dLines.forEach(l2 => {
          if (l1.id === l2.id) return
          
          // Option A: Shared stops
          const shared = l1.stopIds.filter(id => l2.stopIds.includes(id))
          shared.forEach(tId => {
            if (tId === o.id || tId === d.id) return
            const d1 = getSegmentDuration(l1, o.id, tId)
            const d2 = getSegmentDuration(l2, tId, d.id)
            const tStop = getStop(tId)
            if (d1 !== null && d2 !== null && tStop) {
              const dist1 = getSegmentDistance(l1, o.id, tId)
              const dist2 = getSegmentDistance(l2, tId, d.id)
              const segments = []
              if (o.id !== originId) segments.push({ kind: 'walk' as any, fromStop: origin, toStop: o, durationMin: 5 })
              segments.push({ kind: 'transfer' as any, line: l1, fromStop: o, toStop: tStop, durationMin: d1 })
              segments.push({ kind: 'transfer' as any, line: l2, fromStop: tStop, toStop: d, durationMin: d2 })
              if (d.id !== destinationId) segments.push({ kind: 'walk' as any, fromStop: d, toStop: destination, durationMin: 5 })
              
              journeys.push({ 
                totalDurationMin: d1 + d2 + 40, 
                totalDistanceMeters: dist1 + dist2 + (o.id !== originId ? 400 : 0) + (d.id !== destinationId ? 400 : 0),
                segments 
              })
            }
          })

          // Option B: Walking transfers (stops within 6 units)
          if (shared.length === 0) {
            l1.stopIds.forEach(sId1 => {
              const s1 = getStop(sId1)!
              l2.stopIds.forEach(sId2 => {
                const s2 = getStop(sId2)!
                const dist = Math.sqrt(Math.pow(s1.x - s2.x, 2) + Math.pow(s1.y - s2.y, 2))
                if (dist <= 6 && sId1 !== o.id && sId2 !== d.id) {
                    const d1 = getSegmentDuration(l1, o.id, sId1)
                    const d2 = getSegmentDuration(l2, sId2, d.id)
                    if (d1 !== null && d2 !== null) {
                        const dist1 = getSegmentDistance(l1, o.id, sId1)
                        const dist2 = getSegmentDistance(l2, sId2, d.id)
                        const segments = []
                        if (o.id !== originId) segments.push({ kind: 'walk' as any, fromStop: origin, toStop: o, durationMin: 5 })
                        segments.push({ kind: 'transfer' as any, line: l1, fromStop: o, toStop: s1, durationMin: d1 })
                        segments.push({ kind: 'walk' as any, fromStop: s1, toStop: s2, durationMin: Math.round(dist * 2) })
                        segments.push({ kind: 'transfer' as any, line: l2, fromStop: s2, toStop: d, durationMin: d2 })
                        if (d.id !== destinationId) segments.push({ kind: 'walk' as any, fromStop: d, toStop: destination, durationMin: 5 })
                        journeys.push({ 
                            totalDurationMin: d1 + d2 + 45 + Math.round(dist * 2), 
                            totalDistanceMeters: dist1 + dist2 + (dist * 1000) + (o.id !== originId ? 400 : 0) + (d.id !== destinationId ? 400 : 0),
                            segments 
                        })
                    }
                }
              })
            })
          }
        })
      })
    })
  })

  // 4. Fallback: if still nothing, try 1-transfer between ANY line from origin cluster and ANY line from destination cluster via a hub
  if (journeys.length === 0) {
    const hubs = ['palais1', 'palais2', 'petersen', 'colobane', 'pikine', 'sandaga', 'ucad', 'patte_oie']
    hubs.forEach(hId => {
       if (hId === originId || hId === destinationId) return
       const toHub = findJourneys(originId, hId, depth + 1)[0]
       const fromHub = findJourneys(hId, destinationId, depth + 1)[0]
       if (toHub && fromHub) {
         journeys.push({
           totalDurationMin: toHub.totalDurationMin + fromHub.totalDurationMin,
           totalDistanceMeters: (toHub.totalDistanceMeters || 0) + (fromHub.totalDistanceMeters || 0),
           segments: [...toHub.segments, ...fromHub.segments]
         })
       }
    })
  }

  return journeys
    .filter((v, i, a) => a.findIndex(t => t.totalDurationMin === v.totalDurationMin && t.segments.length === v.segments.length) === i)
    .sort((a, b) => {
      const aLegs = a.segments.filter(s => s.kind === 'direct' || s.kind === 'transfer').length
      const bLegs = b.segments.filter(s => s.kind === 'direct' || s.kind === 'transfer').length
      if (aLegs !== bLegs) return aLegs - bLegs
      return a.totalDurationMin - b.totalDurationMin
    })
    .slice(0, 8)
}


export function tickBuses(): void {
  buses.forEach((bus) => {
    const line = getLine(bus.lineId)
    if (!line) {
      return
    }

    const delta = (1 / (line.baseMinutes * 60)) * bus.speedFactor
    bus.progress = (bus.progress + delta) % 1
  })
}
