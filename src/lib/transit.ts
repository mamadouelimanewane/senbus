import { stops, lines, buses } from '../data/network'
import type { ApiNetwork, ApiSnapshot, Bus, Line, PlannerJourney, Prediction, RouteMetrics, SearchResult, Stop } from '../types'
import { GPS, getDistanceKm, roadCache } from './routing'

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
      // Trouver l'indice du stop dans la polyline (approximation par l'id du stop)
      // On simplifie en utilisant l'index relatif des stops originaux sur la distance totale
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

  const points = line.stopIds
    .map((stopId) => stopById.get(stopId))
    .filter((stop): stop is Stop => Boolean(stop))

  const segments: number[] = []
  let totalLength = 0

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index]
    const next = points[index + 1]
    const c1 = GPS[current.id], c2 = GPS[next.id]
    const length = (c1 && c2) ? getDistanceKm(c1[0], c1[1], c2[0], c2[1]) : Math.hypot(next.x - current.x, next.y - current.y)
    segments.push(length)
    totalLength += length
  }

  const stopRatios: Record<string, number> = {}
  let traveled = 0
  points.forEach((point, index) => {
    stopRatios[point.id] = totalLength === 0 ? 0 : traveled / totalLength
    traveled += segments[index] ?? 0
  })

  const metrics = { points, segments, totalLength, stopRatios }
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

  return [...matchedStops, ...matchedLines]
}

function getSegmentDuration(line: Line, fromStopId: string, toStopId: string): number | null {
  const fromIndex = line.stopIds.indexOf(fromStopId)
  const toIndex = line.stopIds.indexOf(toStopId)
  if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) {
    return null
  }

  const { stopRatios } = getRouteMetrics(line)
  const fromRatio = stopRatios[fromStopId] ?? (fromIndex / (line.stopIds.length - 1))
  const toRatio = stopRatios[toStopId] ?? (toIndex / (line.stopIds.length - 1))
  
  const ratioDiff = toRatio - fromRatio
  if (ratioDiff <= 0) return null
  
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

export function findJourneys(originId: string, destinationId: string): PlannerJourney[] {
  if (originId === destinationId) return []

  const origin = getStop(originId)
  const destination = getStop(destinationId)
  if (!origin || !destination) return []

  const directJourneys: PlannerJourney[] = lines
    .map<PlannerJourney | null>((line) => {
      const durationMin = getSegmentDuration(line, originId, destinationId)
      if (durationMin === null) return null
      return {
        totalDurationMin: durationMin,
        segments: [
          {
            kind: 'direct' as const,
            line,
            fromStop: origin,
            toStop: destination,
            durationMin,
          },
        ],
      }
    })
    .filter((j): j is PlannerJourney => j !== null)

  const transfers: PlannerJourney[] = []
  const originLines = getServingLines(originId)
  const destinationLines = getServingLines(destinationId)

  originLines.forEach((firstLine) => {
    destinationLines.forEach((secondLine) => {
      if (firstLine.id === secondLine.id) return
      firstLine.stopIds.forEach((tId) => {
        if (!secondLine.stopIds.includes(tId) || tId === originId || tId === destinationId) return
        const d1 = getSegmentDuration(firstLine, originId, tId)
        const d2 = getSegmentDuration(secondLine, tId, destinationId)
        const tStop = getStop(tId)
        if (d1 === null || d2 === null || !tStop) return

        transfers.push({
          totalDurationMin: d1 + d2 + 8, // 8 min transfer time
          transferStop: tStop,
          segments: [
            { kind: 'transfer', line: firstLine, fromStop: origin, toStop: tStop, durationMin: d1 },
            { kind: 'transfer', line: secondLine, fromStop: tStop, toStop: destination, durationMin: d2 },
          ],
        })
      })
    })
  })

  return [...directJourneys, ...transfers].sort((a,b) => a.totalDurationMin - b.totalDurationMin)
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
