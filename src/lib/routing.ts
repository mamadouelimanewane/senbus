/**
 * Moteur de Routage SunuBus v4.0 — Tracés Pré-baked + LocationIQ Planner
 * ═══════════════════════════════════════════════════════════════════════
 * - Tracés de lignes : chargés depuis route_geometries.ts (pré-générés, 0 API au runtime)
 * - Planificateur voyageur : LocationIQ Directions API (à la demande)
 * - Fallback Iron-Track si une ligne n'est pas dans les pré-baked
 */

import { ROUTE_GEOMETRIES, STOP_COORDINATES } from '../data/route_geometries'
import type { PrebakedRoute } from '../data/route_geometries'
import { LOCATIONIQ_KEY, LOCATIONIQ_DIRECTIONS_URL, API_THROTTLE_MS } from './config'

// ── Coordonnées GPS — on utilise les STOP_COORDINATES pré-baked comme source de vérité ──
export const GPS: Record<string, [number, number]> = { ...STOP_COORDINATES }

// ── Types ──────────────────────────────────────────────────────────────────
export type RoadGeometry = {
  coords: [number, number][]
  distances: number[]
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

function buildRoadGeometry(coords: [number, number][], source: 'prebaked' | 'iron-track'): RoadGeometry {
  const distances: number[] = [0]
  let total = 0
  for (let i = 0; i < coords.length - 1; i++) {
    const d = getDistanceKm(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1])
    total += d
    distances.push(total)
  }
  return { coords, distances, total, source }
}

// ── Chargement des tracés pré-baked ───────────────────────────────────────
/**
 * Retourne la géométrie pré-baked pour une ligne, ou null si non disponible.
 */
export function getPrebakedGeometry(lineId: string): RoadGeometry | null {
  const cacheKey = `prebaked_${lineId}`
  if (roadCache.has(cacheKey)) return roadCache.get(cacheKey)!

  const prebaked = ROUTE_GEOMETRIES[lineId]
  if (!prebaked) return null

  const result = buildRoadGeometry(prebaked.geometry, 'prebaked')
  roadCache.set(cacheKey, result)
  return result
}

/**
 * Retourne les métadonnées distance/durée d'une ligne pré-baked.
 */
export function getPrebakedRouteInfo(lineId: string): PrebakedRoute | null {
  return ROUTE_GEOMETRIES[lineId] ?? null
}

// ── Iron-Track Fallback (Zéro-Mer Certifié) ───────────────────────────────
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
        result.push([14.7229, -17.4481])
        result.push([14.7050, -17.4320])
        result.push([14.6850, -17.4290])
      } else {
        result.push([14.6850, -17.4290])
        result.push([14.7050, -17.4320])
        result.push([14.7229, -17.4481])
      }
    }
    result.push(c2)
  }
  return result.filter((c, i) => i === 0 || (c[0] !== result[i - 1][0] || c[1] !== result[i - 1][1]))
}

// ── API principale ────────────────────────────────────────────────────────
/**
 * Retourne la géométrie pour une ligne de bus.
 * 1. Essaie d'abord la géométrie pré-baked (instantané)
 * 2. Sinon, utilise Iron-Track comme fallback
 */
export function getLineRoadGeometry(lineId: string, stopIds: string[]): RoadGeometry {
  // Pré-baked LocationIQ (source de vérité)
  const prebaked = getPrebakedGeometry(lineId)
  if (prebaked) return prebaked

  // Fallback Iron-Track
  const key = `it_${stopIds.join('|')}`
  if (roadCache.has(key)) return roadCache.get(key)!
  const coords = ironTrackFallback(stopIds)
  const result = buildRoadGeometry(coords, 'iron-track')
  roadCache.set(key, result)
  return result
}

/**
 * Version synchrone pour compatibilité — utilise getLineRoadGeometry.
 */
export function getFullRoadPathSync(stopIds: string[]): RoadGeometry {
  const coords = ironTrackFallback(stopIds)
  return buildRoadGeometry(coords, 'iron-track')
}

/**
 * Version async pour compatibilité.
 */
export async function getFullRoadPath(stopIds: string[]): Promise<RoadGeometry> {
  return getFullRoadPathSync(stopIds)
}

// ── Interpolation d'une position sur la géométrie ─────────────────────────
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

// ── LocationIQ Directions (planificateur voyageur uniquement) ─────────────
let lastCallTime = 0
async function throttle(): Promise<void> {
  const now = Date.now()
  const elapsed = now - lastCallTime
  if (elapsed < API_THROTTLE_MS) {
    await new Promise(r => setTimeout(r, API_THROTTLE_MS - elapsed))
  }
  lastCallTime = Date.now()
}

export async function fetchLocationIQDirections(waypoints: [number, number][]): Promise<DirectionsResult | null> {
  if (waypoints.length < 2) return null
  const coords = waypoints
    .slice(0, 25)
    .map(([lat, lon]) => `${lon},${lat}`)
    .join(';')

  const url = `${LOCATIONIQ_DIRECTIONS_URL}/${coords}?key=${LOCATIONIQ_KEY}&steps=false&geometries=geojson&overview=full`
  try {
    await throttle()
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    if (!data.routes || data.routes.length === 0) return null
    const route = data.routes[0]
    const geometry: [number, number][] = route.geometry.coordinates.map(
      ([lon, lat]: [number, number]) => [lat, lon] as [number, number]
    )
    return { distanceM: route.distance, durationSec: route.duration, geometry }
  } catch {
    return null
  }
}

/**
 * Calcule un itinéraire voyageur via LocationIQ (appel API à la demande).
 */
export async function getPlannerRoute(
  origin: [number, number],
  destination: [number, number],
  viaStops?: [number, number][]
): Promise<DirectionsResult | null> {
  const waypoints: [number, number][] = [origin, ...(viaStops || []), destination]
  return fetchLocationIQDirections(waypoints)
}
