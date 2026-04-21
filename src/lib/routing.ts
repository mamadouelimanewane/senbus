/**
 * Moteur de Routage SunuBus v4.1 — Tracés Pré-baked + LocationIQ Planner
 * ═══════════════════════════════════════════════════════════════════════
 * - Tracés de lignes : chargés depuis route_geometries.ts
 * - Découpage dynamique : sliceRoad n'affiche que les segments utilisés
 * - Planificateur voyageur : LocationIQ Directions API (à la demande)
 */

import { ROUTE_GEOMETRIES, STOP_COORDINATES } from '../data/route_geometries'
import { stops } from '../data/network'
import type { PrebakedRoute } from '../data/route_geometries'
import { LOCATIONIQ_KEY, LOCATIONIQ_DIRECTIONS_URL, API_THROTTLE_MS } from './config'

// ── Coordonnées GPS ──
export const GPS: Record<string, [number, number]> = { ...STOP_COORDINATES }

// ── Types ──────────────────────────────────────────────────────────────────
export type RoadGeometry = {
  coords: [number, number][]
  distances: number[]
  orderedStopIndices: number[] // Index dans coords correspondant à chaque stopIds
  total: number
  source: 'prebaked' | 'iron-track'
}

export type DirectionsResult = {
  distanceM: number
  durationSec: number
  geometry: [number, number][]
}

// ── Cache mémoire ──────────────────────────────────────────────────────────
export const roadCache = new Map<string, RoadGeometry>()

// ── Utilitaires ────────────────────────────────────────────────────────────
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function sanitizeCoords(coords: [number, number][]): [number, number][] {
  if (coords.length < 2) return coords
  const result: [number, number][] = [coords[0]]
  for (let i = 1; i < coords.length; i++) {
    const [lat, lon] = coords[i]
    
    // 1. Dakar Bounding Box check (Zéro-Mer strict)
    if (lat < 14.65 || lat > 14.85 || lon < -17.55 || lon > -17.25) continue

    // 2. Éviter le saut dans le Port/Mer ( sauf si c'est vraiment proche d'un arrêt )
    const isDeepInPort = lat < 14.71 && lon > -17.428
    if (isDeepInPort) {
      // Exception pour les arrêts portuaires légitimes (Cyrnos, Port, etc)
      const nearStop = stops.some(s => {
        const sc = GPS[s.id]; return sc && getDistanceKm(lat, lon, sc[0], sc[1]) < 0.4
      })
      if (!nearStop) continue
    }
    
    // 3. Jump check (max 2.5km entre deux points consécutifs)
    const prev = result[result.length - 1]
    const dist = getDistanceKm(prev[0], prev[1], lat, lon)
    if (dist > 2.5) continue 
    
    result.push(coords[i])
  }
  return result
}

function buildRoadGeometry(rawCoords: [number, number][], source: 'prebaked' | 'iron-track', stopIds?: string[]): RoadGeometry {
  const coords = sanitizeCoords(rawCoords)
  const distances: number[] = [0]
  let total = 0
  for (let i = 0; i < coords.length - 1; i++) {
    const d = getDistanceKm(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1])
    total += d
    distances.push(total)
  }
  
  const orderedStopIndices: number[] = []
  if (stopIds) {
    let lastFoundIdx = 0
    stopIds.forEach(sid => {
      const stopCoord = GPS[sid]
      if (!stopCoord) {
        orderedStopIndices.push(lastFoundIdx)
        return
      }
      
      let minDist = Infinity
      let bestIdxForThisStop = lastFoundIdx
      
      // On cherche de façon progressive.
      // Limitation: on n'accepte pas un point qui est à plus de 1km de l'arrêt 
      // pour éviter de "sauter" sur une branche parallèle ou retour de la ligne.
      for (let i = lastFoundIdx; i < coords.length; i++) {
        const d = getDistanceKm(stopCoord[0], stopCoord[1], coords[i][0], coords[i][1])
        if (d < minDist) {
          minDist = d
          bestIdxForThisStop = i
        }
      }
      
      // Si la distance trouvée est raisonnable (< 800m), on avance. 
      // Sinon on reste sur le dernier index pour éviter un saut incohérent.
      if (minDist < 0.8) {
        lastFoundIdx = bestIdxForThisStop
      }
      orderedStopIndices.push(lastFoundIdx)
    })
  }

  return { coords, distances, orderedStopIndices, total, source }
}

// ── Iron-Track Flow (Zéro-Mer Certifié) ───────────────────────────────
function ironTrackFallback(stopIds: string[]): [number, number][] {
  const result: [number, number][] = []
  for (let i = 0; i < stopIds.length - 1; i++) {
    const c1 = GPS[stopIds[i]], c2 = GPS[stopIds[i + 1]]
    if (!c1 || !c2) continue
    if (i === 0) result.push(c1)
    const isEast = (c: [number, number]) => c[1] > -17.405
    const isWest = (c: [number, number]) => c[1] < -17.425
    if ((isEast(c1) && isWest(c2)) || (isWest(c1) && isEast(c2))) {
      if (isEast(c1)) {
        result.push([14.7229, -17.4481], [14.7050, -17.4320], [14.6850, -17.4290])
      } else {
        result.push([14.6850, -17.4290], [14.7050, -17.4320], [14.7229, -17.4481])
      }
    }
    result.push(c2)
  }
  return result.filter((c, i) => i === 0 || (c[0] !== result[i - 1][0] || c[1] !== result[i - 1][1]))
}

// ── API principale ────────────────────────────────────────────────────────

export function getLineRoadGeometry(lineId: string, stopIds: string[]): RoadGeometry {
  const cacheKey = `line_${lineId}`
  if (roadCache.has(cacheKey)) return roadCache.get(cacheKey)!
  const prebaked = ROUTE_GEOMETRIES[lineId]
  let coords: [number, number][]
  let source: 'prebaked' | 'iron-track'
  if (prebaked && prebaked.geometry.length > 0) {
    coords = prebaked.geometry; source = 'prebaked'
  } else {
    coords = ironTrackFallback(stopIds); source = 'iron-track'
  }
  const result = buildRoadGeometry(coords, source, stopIds)
  roadCache.set(cacheKey, result)
  return result
}

export function getPrebakedRouteInfo(lineId: string): PrebakedRoute | null {
  return ROUTE_GEOMETRIES[lineId] ?? null
}

// --- Compatibilité Admin / Core ---
export function getFullRoadPathSync(stopIds: string[]): RoadGeometry {
  const coords = ironTrackFallback(stopIds)
  return buildRoadGeometry(coords, 'iron-track', stopIds)
}

export async function getFullRoadPath(stopIds: string[]): Promise<RoadGeometry> {
  return getFullRoadPathSync(stopIds)
}

// ── Interpolation / Découpage ──────────────────────────────────────────────

export function interpolate(road: RoadGeometry, progress: number): [number, number] {
  if (road.coords.length < 2) return road.coords[0] || [14.6928, -17.4467]
  const target = (progress % 1) * road.total
  let low = 0, high = road.distances.length - 1
  while (low < high) {
    const mid = (low + high) >> 1
    if (road.distances[mid] < target) low = mid + 1; else high = mid
  }
  const i = Math.max(1, low)
  const dStart = road.distances[i - 1], dEnd = road.distances[i]
  const segProgress = dEnd === dStart ? 0 : (target - dStart) / (dEnd - dStart)
  const p1 = road.coords[i - 1], p2 = road.coords[i]
  return [p1[0] + (p2[0] - p1[0]) * segProgress, p1[1] + (p2[1] - p1[1]) * segProgress]
}

/**
 * Découpe une géométrie de route pour n'en garder que le segment entre deux arrêts.
 */
export function sliceRoad(road: RoadGeometry, lineStopIds: string[], fromStopId: string, toStopId: string): RoadGeometry {
  // Trouver les indices d'entrée et sortie dans la SEQUENCE de la ligne
  const fromIdxInLine = lineStopIds.indexOf(fromStopId)
  const toIdxInLine = lineStopIds.indexOf(toStopId, fromIdxInLine)

  if (fromIdxInLine === -1 || toIdxInLine === -1) {
    return road 
  }

  const gIdx1 = road.orderedStopIndices[fromIdxInLine] ?? 0
  const gIdx2 = road.orderedStopIndices[toIdxInLine] ?? road.coords.length - 1
  
  // Extraire les points entre ces deux indices
  const newCoords = road.coords.slice(gIdx1, gIdx2 + 1)
  
  if (newCoords.length < 2) {
    // Sécurité: au moins 2 points
    const start = road.coords[gIdx1]
    const end = road.coords[Math.min(gIdx1 + 1, road.coords.length - 1)]
    return buildRoadGeometry([start, end], road.source)
  }
  
  return buildRoadGeometry(newCoords, road.source)
}

// ── LocationIQ API ────────────────────────────────────────────────────────

let lastCallTime = 0
async function throttle(): Promise<void> {
  const now = Date.now(); const elapsed = now - lastCallTime
  if (elapsed < API_THROTTLE_MS) await new Promise(r => setTimeout(r, API_THROTTLE_MS - elapsed))
  lastCallTime = Date.now()
}

export async function fetchLocationIQDirections(waypoints: [number, number][]): Promise<DirectionsResult | null> {
  if (waypoints.length < 2) return null
  const coords = waypoints.slice(0, 25).map(([lat, lon]) => `${lon},${lat}`).join(';')
  const url = `${LOCATIONIQ_DIRECTIONS_URL}/${coords}?key=${LOCATIONIQ_KEY}&steps=false&geometries=geojson&overview=full`
  try {
    await throttle()
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    if (!data.routes || data.routes.length === 0) return null
    const route = data.routes[0]
    const geometry: [number, number][] = route.geometry.coordinates.map(([lon, lat]: [number, number]) => [lat, lon] as [number, number])
    return { distanceM: route.distance, durationSec: route.duration, geometry }
  } catch { return null }
}

export async function getPlannerRoute(origin: [number, number], destination: [number, number], viaStops?: [number, number][]): Promise<DirectionsResult | null> {
  const waypoints: [number, number][] = [origin, ...(viaStops || []), destination]
  return fetchLocationIQDirections(waypoints)
}
