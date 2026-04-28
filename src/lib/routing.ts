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
// On enrichit avec les coordonnées définies directement dans network.ts
stops.forEach(s => { if (s.coords) GPS[s.id] = s.coords })

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

function isWaterPoint(lat: number, lon: number): boolean {
  // Bbox large couvrant TOUT le réseau DDD (Almadies → Sébikotane, Yenne → banlieue nord)
  // lat : 14.55 (Yenne) → 14.93 (cambrene/nord)
  // lon : -17.58 (Almadies) → -17.10 (Sébikotane/Diamniadio)
  if (lat < 14.55 || lat > 14.93 || lon < -17.58 || lon > -17.10) return true

  // Mer au large du Cap-Vert (triangle de mer à l'ouest du réseau routier)
  // Seulement les zones clairement en mer, pas les zones ambiguës
  const isOpenSea = lon < -17.56 && lat > 14.72  // mer ouverte nord-ouest
  const isDeepSouth = lat < 14.62 && lon < -17.50 // mer sud-ouest (pas de routes là)

  if (isOpenSea || isDeepSouth) return true
  return false
}

/**
 * Nettoyage global de la base de données de géométries au démarrage
 */
export function cleanAllGeometries() {
  for (const lineId in ROUTE_GEOMETRIES) {
    const g = ROUTE_GEOMETRIES[lineId as keyof typeof ROUTE_GEOMETRIES]
    if (g && g.geometry) {
      g.geometry = sanitizeCoords(g.geometry as [number, number][])
    }
  }
}

function sanitizeCoords(coords: [number, number][]): [number, number][] {
  if (coords.length < 2) return coords
  const result: [number, number][] = [coords[0]]
  for (let i = 1; i < coords.length; i++) {
    const [lat, lon] = coords[i]
    if (isWaterPoint(lat, lon)) continue
    // Jump check élargi (max 5km pour couvrir les longues lignes péri-urbaines)
    const prev = result[result.length - 1]
    if (prev && getDistanceKm(lat, lon, prev[0], prev[1]) > 5.0) continue
    result.push([lat, lon])
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
// Nœuds routiers clés de Dakar pour éviter les trajets en mer
const ROAD_WAYPOINTS: Record<string, [number, number]> = {
  autoroute_patte_oie:   [14.7229, -17.4481],
  centre_ville_ucad:     [14.6980, -17.4320],
  sandaga:               [14.6727, -17.4327],
  medina_tilene:         [14.6850, -17.4490],
  colobane:              [14.6847, -17.4518],
  hann_maristes:         [14.7103, -17.4350],
  pikine_carrefour:      [14.7473, -17.3867],
  guediawaye_carrefour:  [14.7733, -17.4233],
  thiaroye:              [14.7429, -17.3867],
}

function routeSegmentViaRoads(c1: [number, number], c2: [number, number]): [number, number][] {
  const points: [number, number][] = [c1]
  // Détection mer : si départ à l'ouest (Almadies/Ouakam) et arrivée banlieue
  const isWestCoast = (c: [number, number]) => c[1] < -17.46
  const isBanlieue  = (c: [number, number]) => c[1] > -17.40
  const isFarEast   = (c: [number, number]) => c[1] > -17.35
  const isSouth     = (c: [number, number]) => c[0] < 14.67

  // Éviter la mer : Ouakam/Almadies → centre → banlieue
  if (isWestCoast(c1) && (isBanlieue(c2) || isFarEast(c2))) {
    points.push(ROAD_WAYPOINTS.centre_ville_ucad, ROAD_WAYPOINTS.autoroute_patte_oie)
  } else if (isBanlieue(c1) && isWestCoast(c2)) {
    points.push(ROAD_WAYPOINTS.autoroute_patte_oie, ROAD_WAYPOINTS.centre_ville_ucad)
  }
  // Éviter la mer en bas (Plateau/mer) → passer par Medina
  if (isSouth(c1) || isSouth(c2)) {
    points.push(ROAD_WAYPOINTS.sandaga)
  }
  // Transit Est-Ouest via autoroute
  const isEastSide = (c: [number, number]) => c[1] > -17.42
  const isWestSide = (c: [number, number]) => c[1] < -17.44
  if ((isEastSide(c1) && isWestSide(c2)) || (isWestSide(c1) && isEastSide(c2))) {
    if (isEastSide(c1)) {
      points.push(ROAD_WAYPOINTS.autoroute_patte_oie, ROAD_WAYPOINTS.centre_ville_ucad)
    } else {
      points.push(ROAD_WAYPOINTS.centre_ville_ucad, ROAD_WAYPOINTS.autoroute_patte_oie)
    }
  }
  points.push(c2)
  return points
}

function ironTrackFallback(stopIds: string[]): [number, number][] {
  const result: [number, number][] = []
  for (let i = 0; i < stopIds.length - 1; i++) {
    const c1 = GPS[stopIds[i]], c2 = GPS[stopIds[i + 1]]
    if (!c1 || !c2) continue
    const segment = routeSegmentViaRoads(c1, c2)
    if (i === 0) result.push(...segment)
    else result.push(...segment.slice(1))
  }
  return result.filter((c, i) => i === 0 || (c[0] !== result[i - 1][0] || c[1] !== result[i - 1][1]))
}

// ── API principale ────────────────────────────────────────────────────────

/**
 * Normalise un ID de ligne pour correspondre aux clés de ROUTE_GEOMETRIES.
 * Exemples : 'ddd-1' → 'DDD-1', 'aftu-tata-5' → 'AFTU-TATA-5'
 */
function normalizeLineKey(lineId: string): string {
  // Format ddd-N → DDD-N
  const dddMatch = lineId.match(/^ddd-(.+)$/i)
  if (dddMatch) return `DDD-${dddMatch[1].toUpperCase()}`
  // Format aftu-tata-N → AFTU-TATA-N
  const aftuMatch = lineId.match(/^aftu-tata-(.+)$/i)
  if (aftuMatch) return `AFTU-TATA-${aftuMatch[1].toUpperCase()}`
  // Fallback: uppercase
  return lineId.toUpperCase()
}

export function getLineRoadGeometry(lineId: string, stopIds: string[]): RoadGeometry {
  const cacheKey = `line_${lineId}`
  if (roadCache.has(cacheKey)) return roadCache.get(cacheKey)!

  // Cherche avec la clé normalisée puis avec la clé brute
  const normalizedKey = normalizeLineKey(lineId)
  const prebaked = ROUTE_GEOMETRIES[normalizedKey] ?? ROUTE_GEOMETRIES[lineId]

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
