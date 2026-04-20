import { PREBAKED_GEOMETRIES } from '../data/geometries'

/**
 * Service de Routage Hybride (Statique + Pre-baked High Fidelity)
 */

export const GPS: Record<string, [number, number]> = {
  'palais': [14.6681, -17.4420], 'independance': [14.6698, -17.4388], 'sandaga': [14.6720, -17.4359], 'petersen': [14.6728, -17.4326], 'kermel': [14.6650, -17.4410],
  'medina': [14.6837, -17.4507], 'fass': [14.6910, -17.4465], 'tilene': [14.6890, -17.4390],
  'colobane': [14.6930, -17.4440], 'hlm': [14.7011, -17.4438], 'autoroute-hann': [14.7050, -17.4320], 'cyrnos': [14.6850, -17.4300],
  'liberte6': [14.7147, -17.4585], 'sacrecoeur': [14.7088, -17.4518], 'grand-yoff': [14.7226, -17.4555], 'patte-oie': [14.7229, -17.4481],
  'ouakam': [14.7340, -17.4900], 'ngor': [14.7470, -17.5130], 'yoff': [14.7530, -17.4740], 'aeroport': [14.7425, -17.4902],
  'pikine': [14.7473, -17.3867], 'thiaroye-gare': [14.7298, -17.3740], 'parcelles': [14.7853, -17.4277],
  'rufisque': [14.7165, -17.2718], 'diamniadio': [14.7180, -17.1830],
}

export type RoadGeometry = { coords: [number, number][], distances: number[], total: number }
export const roadCache = new Map<string, RoadGeometry>()

/**
 * Moteur de Routage "Perfect Path" (Pre-baked > Static > Fallback)
 */
function solveRoadPath(stopIds: string[], lineCode?: string): [number, number][] {
  // 1. Priorité aux tracés pré-enregistrés haute-fidélité
  if (lineCode && PREBAKED_GEOMETRIES[lineCode]) return PREBAKED_GEOMETRIES[lineCode]

  const expanded: [number, number][] = []
  for (let i = 0; i < stopIds.length - 1; i++) {
    const s1 = stopIds[i], s2 = stopIds[i+1]; const c1 = GPS[s1], c2 = GPS[s2]
    if (!c1 || !c2) continue; if (expanded.length === 0) expanded.push(c1)

    // Logique de Bitume Mandatory (Baie de Dakar)
    const isEast = (c: [number, number]) => c[1] > -17.41
    const isWest = (c: [number, number]) => c[1] < -17.43
    if ((isEast(c1) && isWest(c2)) || (isWest(c1) && isEast(c2))) {
      if (isEast(c1)) expanded.push(GPS['patte-oie'], GPS['autoroute-hann'], GPS['colobane'], GPS['cyrnos'])
      else expanded.push(GPS['cyrnos'], GPS['colobane'], GPS['autoroute-hann'], GPS['patte-oie'])
    }
    expanded.push(c2)
  }
  return expanded.filter((c, i) => i === 0 || (c[0] !== expanded[i-1][0] || c[1] !== expanded[i-1][1]))
}

export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; const dLat = (lat2-lat1)*(Math.PI/180); const dLon = (lon2-lon1)*(Math.PI/180)
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export function getFullRoadPathSync(stopIds: string[], lineCode?: string): RoadGeometry {
  const key = `${lineCode || ''}:${stopIds.join('|')}`
  if (roadCache.has(key)) return roadCache.get(key)!

  const coords = solveRoadPath(stopIds, lineCode)
  const distances: number[] = [0]; let total = 0
  for (let i = 0; i < coords.length - 1; i++) {
    const d = getDistanceKm(coords[i][0], coords[i][1], coords[i+1][0], coords[i+1][1])
    total += d; distances.push(total)
  }
  const result = { coords, distances, total }
  roadCache.set(key, result)
  return result
}

export async function getFullRoadPath(stopIds: string[], lineCode?: string): Promise<RoadGeometry> {
  return getFullRoadPathSync(stopIds, lineCode)
}

export function interpolate(road: RoadGeometry, progress: number): [number, number] {
  if (road.coords.length < 2) return road.coords[0] || [0, 0]
  const target = (progress % 1) * road.total
  let low = 0, high = road.distances.length - 1
  while (low < high) {
    const mid = (low + high) >> 1
    if (road.distances[mid] < target) low = mid + 1; else high = mid
  }
  const i = Math.max(1, low); const dStart = road.distances[i-1], dEnd = road.distances[i]
  const segProgress = dEnd === dStart ? 0 : (target - dStart) / (dEnd - dStart)
  const p1 = road.coords[i-1], p2 = road.coords[i]
  return [ p1[0] + (p2[0]-p1[0])*segProgress, p1[1] + (p2[1]-p1[1])*segProgress ]
}
