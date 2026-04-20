/**
 * Service de Routage Partagé (LocationIQ/OSRM)
 */

export const GPS: Record<string, [number, number]> = {
  'palais': [14.6681, -17.4420], 'independance': [14.6698, -17.4388], 'sandaga': [14.6720, -17.4359], 'petersen': [14.6728, -17.4326], 'kermel': [14.6650, -17.4410], 'rebeuss': [14.6590, -17.4352], 'republique': [14.6690, -17.4401], 'dakar-ponty': [14.6740, -17.4430],
  'medina': [14.6837, -17.4507], 'fass': [14.6910, -17.4465], 'tilene': [14.6890, -17.4390], 'biscuiterie': [14.6970, -17.4380], 'gueule-tapee': [14.6860, -17.4430],
  'colobane': [14.6930, -17.4440], 'hlm': [14.7011, -17.4438], 'castors': [14.7055, -17.4465], 'dieuppeul': [14.7035, -17.4570],
  'liberte6': [14.7147, -17.4585], 'sacrecoeur': [14.7088, -17.4518], 'grand-yoff': [14.7226, -17.4555], 'patte-oie': [14.7229, -17.4481], 'foire': [14.7560, -17.4430], 'nord-foire': [14.7565, -17.4380],
  'fann': [14.6877, -17.4635], 'point-e': [14.6980, -17.4590], 'stele-mermoz': [14.7175, -17.4730], 'mermoz': [14.7120, -17.4720], 'virage': [14.7200, -17.4720], 'cite-etudiants': [14.7050, -17.4600], 'ouakam': [14.7340, -17.4900], 'almadies': [14.7460, -17.5220], 'ngor': [14.7470, -17.5130], 'yoff': [14.7530, -17.4740], 'aeroport': [14.7425, -17.4902],
  'pikine': [14.7473, -17.3867], 'bounkheling': [14.7450, -17.3820], 'golf-sud': [14.7390, -17.4220], 'camp-penal': [14.7296, -17.4100], 'wakam': [14.7200, -17.3950], 'diamaguene': [14.7520, -17.3800], 'cite-sotrac': [14.7450, -17.3950], 'thiaroye-azur': [14.7342, -17.3700], 'thiaroye-gare': [14.7298, -17.3740],
  'parcelles': [14.7853, -17.4277], 'cambrene': [14.7912, -17.4232], 'guediawaye': [14.7783, -17.4020], 'hamo4': [14.7630, -17.4050], 'cite-comico': [14.7700, -17.4150], 'sipres': [14.7680, -17.3880], 'dakar-eaux-forets': [14.7500, -17.4100],
  'yeumbeul': [14.7622, -17.3527], 'malika': [14.7756, -17.3176], 'mbao': [14.7191, -17.3480], 'keur-mbaye-fall': [14.7170, -17.3440], 'keur-massar': [14.7090, -17.3364], 'zac-mbao': [14.7200, -17.3400], 'route-nationale': [14.7400, -17.3600],
  'rufisque': [14.7165, -17.2718], 'bargny': [14.7050, -17.2280], 'diamniadio': [14.7180, -17.1830], 'sebikotane': [14.7280, -17.1320],
}

const LOCATIONIQ_KEY = 'pk.ef8f3d80db02a286ae4b6fae736af632'

export type RoadGeometry = { coords: [number, number][], distances: number[], total: number }
export const roadCache = new Map<string, RoadGeometry>()

/**
 * Calcul de la distance Haversine entre deux points (lat/lon)
 */
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Récupère le tracé réel via LocationIQ
 */
export async function getFullRoadPath(stopIds: string[]): Promise<RoadGeometry> {
  const cacheKey = `liq_${stopIds.join('|')}`
  if (roadCache.has(cacheKey)) return roadCache.get(cacheKey)!

  const stopsCoords = stopIds.map(id => GPS[id]).filter(Boolean)
  let finalCoords: [number, number][] = stopsCoords

  if (stopsCoords.length >= 2) {
    try {
      const query = stopsCoords.map(c => `${c[1]},${c[0]}`).join(';')
      const url = `https://us1.locationiq.com/v1/directions/driving/${query}?key=${LOCATIONIQ_KEY}&overview=full&geometries=geojson`
      const res = await fetch(url)
      const data = await res.json()
      if (data.routes && data.routes[0]) {
        finalCoords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]])
      }
    } catch (e) {
      console.warn("LocationIQ Fallback", e)
    }
  }

  const distances: number[] = [0]
  let total = 0
  for (let i = 0; i < finalCoords.length - 1; i++) {
    // On utilise la distance réelle en km pour les ETAs
    const d = getDistanceKm(finalCoords[i][0], finalCoords[i][1], finalCoords[i+1][0], finalCoords[i+1][1])
    total += d
    distances.push(total)
  }

  const result = { coords: finalCoords, distances, total }
  roadCache.set(cacheKey, result)
  return result
}

/**
 * Interpolation précise le long d'une polyline en fonction de la distance
 */
export function interpolate(road: RoadGeometry, progress: number): [number, number] {
  if (road.coords.length < 2) return road.coords[0] || [0, 0]
  const target = (progress % 1) * road.total
  let low = 0, high = road.distances.length - 1
  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    if (road.distances[mid] < target) low = mid + 1
    else high = mid
  }
  const i = Math.max(1, low)
  const dStart = road.distances[i-1], dEnd = road.distances[i]
  const segProgress = dEnd === dStart ? 0 : (target - dStart) / (dEnd - dStart)
  const p1 = road.coords[i-1], p2 = road.coords[i]
  return [
    p1[0] + (p2[0] - p1[0]) * segProgress,
    p1[1] + (p2[1] - p1[1]) * segProgress
  ]
}
