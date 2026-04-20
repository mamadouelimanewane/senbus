/**
 * Service de Routage Haute-Fidélité (Zéro Mer + Snap-to-Road local)
 */

export const GPS: Record<string, [number, number]> = {
  // PLATEAU / CENTRE
  'palais': [14.6681, -17.4420], 'independance': [14.6698, -17.4388], 'sandaga': [14.6720, -17.4359], 'petersen': [14.6728, -17.4326], 'kermel': [14.6650, -17.4410], 'republique': [14.6690, -17.4401],
  'cyrnos': [14.6850, -17.4300], 'port': [14.6800, -17.4280], 'bel-air': [14.6950, -17.4250],
  
  // MEDINA / FANN / CORNICHE
  'medina': [14.6837, -17.4507], 'fass': [14.6910, -17.4465], 'tilene': [14.6890, -17.4390], 'fann': [14.6877, -17.4635], 'point-e': [14.6980, -17.4590],
  'magic-land': [14.6750, -17.4610], 'univ-dakar': [14.6820, -17.4650], 'mosquee-divinite': [14.7150, -17.4880], 'mermoz': [14.7120, -17.4720], 'ouakam': [14.7340, -17.4900],
  'ngor': [14.7470, -17.5130], 'almadies': [14.7460, -17.5220], 'virage': [14.7440, -17.5000], 'yoff': [14.7530, -17.4740], 'aeroport': [14.7425, -17.4902],
  
  // AXE CENTRAL / VDN / AUTOROUTE
  'colobane': [14.6930, -17.4440], 'hlm': [14.7011, -17.4438], 'castors': [14.7055, -17.4465], 'dieuppeul': [14.7035, -17.4570], 'sacrecoeur': [14.7088, -17.4518],
  'liberte6': [14.7147, -17.4585], 'vdn-keur-gorgui': [14.7100, -17.4550], 'grand-yoff': [14.7226, -17.4555], 'foire': [14.7560, -17.4430],
  'autoroute-hann': [14.7050, -17.4320], 'patte-oie': [14.7229, -17.4481], 'nord-foire': [14.7565, -17.4380],
  
  // BANLIEUE EST / PIKINE / GUEDIAWAYE
  'pikine': [14.7473, -17.3867], 'bounkheling': [14.7450, -17.3820], 'golf-sud': [14.7390, -17.4220], 'camp-penal': [14.7296, -17.4100], 'diamaguene': [14.7520, -17.3800],
  'thiaroye-gare': [14.7298, -17.3740], 'thiaroye-azur': [14.7342, -17.3700], 'mbao': [14.7191, -17.3480], 'zac-mbao': [14.7200, -17.3400],
  'parcelles': [14.7853, -17.4277], 'cambrene': [14.7912, -17.4232], 'guediawaye': [14.7783, -17.4020], 'hamo4': [14.7630, -17.4050],
  
  // EXTENSION RUFISQUE / DIAMNIADIO
  'rufisque': [14.7165, -17.2718], 'bargny': [14.7050, -17.2280], 'diamniadio': [14.7180, -17.1830], 'sebikotane': [14.7280, -17.1320],
}

export type RoadGeometry = { coords: [number, number][], distances: number[], total: number }
export const roadCache = new Map<string, RoadGeometry>()

/**
 * Injection Dynamique de Points de Passage (Densification Routière)
 * Transforme les lignes brisées en courbes épousant les axes majeurs de Dakar.
 */
function solveRoadPath(stopIds: string[]): [number, number][] {
  const expanded: [number, number][] = []
  
  for (let i = 0; i < stopIds.length - 1; i++) {
    const s1 = stopIds[i], s2 = stopIds[i+1]
    const c1 = GPS[s1], c2 = GPS[s2]
    if (!c1 || !c2) continue
    
    if (expanded.length === 0) expanded.push(c1)

    // AXE 1: Corniche Ouest (Ouakam <-> Plateau)
    const isCorniche = (id: string) => ['ouakam', 'mermoz', 'fann', 'medina', 'palais', 'sandaga'].includes(id)
    if (isCorniche(s1) && isCorniche(s2)) {
      if (s1 === 'ouakam' && (s2 === 'palais' || s2 === 'medina')) expanded.push(GPS['mosquee-divinite'], GPS['fann'])
      if (s1 === 'yoff' && s2 === 'ouakam') expanded.push(GPS['virage'])
    }

    // AXE 2: Autoroute / Spine (Est <-> Plateau)
    const isBanlieue = (c: [number, number]) => c[1] > -17.41
    const isPlateau = (c: [number, number]) => c[1] < -17.43
    if ((isBanlieue(c1) && isPlateau(c2)) || (isPlateau(c1) && isBanlieue(c2))) {
      if (isBanlieue(c1)) {
        expanded.push(GPS['patte-oie'], GPS['autoroute-hann'], GPS['colobane'], GPS['cyrnos'])
      } else {
        expanded.push(GPS['cyrnos'], GPS['colobane'], GPS['autoroute-hann'], GPS['patte-oie'])
      }
    }

    // AXE 3: VDN (Foire <-> Mermoz/Dieuppeul)
    if ((['foire', 'nord-foire'].includes(s1) && ['mermoz', 'sacrecoeur'].includes(s2))) {
      expanded.push(GPS['grand-yoff'], GPS['vdn-keur-gorgui'])
    }

    expanded.push(c2)
  }
  
  return expanded.filter((c, i) => {
    if (i === 0) return true
    const prev = expanded[i-1]
    return Math.abs(c[0] - prev[0]) > 0.0001 || Math.abs(c[1] - prev[1]) > 0.0001
  })
}

export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; const dLat = (lat2-lat1)*(Math.PI/180); const dLon = (lon2-lon1)*(Math.PI/180)
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export function getFullRoadPathSync(stopIds: string[]): RoadGeometry {
  const key = stopIds.join('|')
  if (roadCache.has(key)) return roadCache.get(key)!

  const coords = solveRoadPath(stopIds)
  const distances: number[] = [0]
  let total = 0
  for (let i = 0; i < coords.length - 1; i++) {
    const d = getDistanceKm(coords[i][0], coords[i][1], coords[i+1][0], coords[i+1][1])
    total += d; distances.push(total)
  }
  const result = { coords, distances, total }
  roadCache.set(key, result)
  return result
}

export async function getFullRoadPath(stopIds: string[]): Promise<RoadGeometry> {
  return getFullRoadPathSync(stopIds)
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
