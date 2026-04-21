/**
 * SunuBus — Générateur de Tracés Routiers via LocationIQ
 * ═══════════════════════════════════════════════════════
 * Appelle l'API LocationIQ Directions pour CHAQUE ligne de bus,
 * et sauvegarde les géométries dans src/data/route_geometries.ts
 * 
 * Usage : node generate_routes.js
 */

const fs = require('fs')
const path = require('path')

const LOCATIONIQ_KEY = 'pk.ef8f3d80db02a286ae4b6fae736af632'
const DIRECTIONS_URL = 'https://us1.locationiq.com/v1/directions/driving'
const THROTTLE_MS = 1100  // 1 req/sec pour éviter le rate limit (plan gratuit)

// ═══════════════════════════════════════════════════════════════════════════
// COORDONNÉES GPS COMPLÈTES — TOUS LES 61 ARRÊTS DU RÉSEAU
// ═══════════════════════════════════════════════════════════════════════════
const GPS = {
  // PLATEAU / CENTRE
  'palais':           [14.6681, -17.4420],
  'independance':     [14.6700, -17.4400],
  'sandaga':          [14.6720, -17.4359],
  'petersen':         [14.6728, -17.4326],
  'kermel':           [14.6660, -17.4440],
  'rebeuss':          [14.6740, -17.4470],
  'republique':       [14.6695, -17.4395],
  'dakar-ponty':      [14.6705, -17.4380],
  // MÉDINA / FASS
  'medina':           [14.6837, -17.4507],
  'fass':             [14.6910, -17.4465],
  'tilene':           [14.6890, -17.4390],
  'biscuiterie':      [14.6950, -17.4380],
  'gueule-tapee':     [14.6820, -17.4480],
  // COLOBANE / HLM
  'colobane':         [14.6930, -17.4440],
  'hlm':              [14.7011, -17.4438],
  'castors':          [14.7055, -17.4465],
  'dieuppeul':        [14.6980, -17.4470],
  // VDN / SICAP
  'liberte6':         [14.7147, -17.4585],
  'sacrecoeur':       [14.7100, -17.4530],
  'grand-yoff':       [14.7226, -17.4555],
  'patte-oie':        [14.7229, -17.4481],
  'foire':            [14.7280, -17.4450],
  'nord-foire':       [14.7310, -17.4430],
  // CORNICHE / ALMADIES
  'fann':             [14.6877, -17.4635],
  'point-e':          [14.6950, -17.4570],
  'stele-mermoz':     [14.7050, -17.4680],
  'mermoz':           [14.7120, -17.4720],
  'virage':           [14.6960, -17.4540],
  'cite-etudiants':   [14.7040, -17.4550],
  'ouakam':           [14.7340, -17.4900],
  'almadies':         [14.7485, -17.5150],
  'ngor':             [14.7470, -17.5130],
  'yoff':             [14.7530, -17.4740],
  'aeroport':         [14.7425, -17.4902],
  // PIKINE / THIAROYE
  'pikine':           [14.7473, -17.3867],
  'bounkheling':      [14.7510, -17.3830],
  'golf-sud':         [14.7380, -17.4100],
  'camp-penal':       [14.7320, -17.4200],
  'wakam':            [14.7280, -17.4250],
  'diamaguene':       [14.7520, -17.3900],
  'cite-sotrac':      [14.7560, -17.3950],
  'thiaroye-azur':    [14.7380, -17.3700],
  'thiaroye-gare':    [14.7298, -17.3740],
  'autoroute-hann':   [14.7050, -17.4320],
  'cyrnos':           [14.6850, -17.4300],
  // BANLIEUE NORD
  'parcelles':        [14.7853, -17.4277],
  'cambrene':         [14.7900, -17.4200],
  'guediawaye':       [14.7820, -17.3940],
  'hamo4':            [14.7780, -17.3980],
  'cite-comico':      [14.7850, -17.4050],
  'sipres':           [14.7800, -17.3960],
  'dakar-eaux-forets':[14.7600, -17.4100],
  // BANLIEUE EST
  'yeumbeul':         [14.7550, -17.3600],
  'malika':           [14.7700, -17.3400],
  'mbao':             [14.7250, -17.3300],
  'keur-mbaye-fall':  [14.7200, -17.3200],
  'keur-massar':      [14.7150, -17.3100],
  'zac-mbao':         [14.7300, -17.3350],
  'route-nationale':  [14.7350, -17.3500],
  // PÉRIPHÉRIE
  'rufisque':         [14.7165, -17.2718],
  'bargny':           [14.7000, -17.2350],
  'diamniadio':       [14.7180, -17.1830],
  'sebikotane':       [14.7250, -17.1400],
  'soumbedioune':     [14.6810, -17.4550],
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES DE BASE — identiques à network.ts
// ═══════════════════════════════════════════════════════════════════════════
function sname(id) { return id }

function v5(base) {
  const fwd = [...base]
  const rev = [...base].reverse()
  const expIdx = base.map((_, i) => i).filter(i => i === 0 || i === base.length - 1 || i % 2 === 0)
  const exp = expIdx.map(i => base[i])
  const expressOk = exp.length >= 3 && exp.length < base.length
  const brA = base.slice(1)
  const brB = base.slice(0, -1)
  return [
    fwd,
    rev,
    expressOk ? exp : fwd,
    brA.length >= 3 ? brA : rev,
    brB.length >= 3 ? brB : fwd,
  ]
}

const DDD_BASE = [
  ['palais','sandaga','petersen','cyrnos','autoroute-hann','colobane','pikine'],
  ['palais','dakar-ponty','tilene','biscuiterie','hlm','dieuppeul','castors','liberte6','sacrecoeur','grand-yoff'],
  ['palais','sandaga','petersen','tilene','fass','hlm','castors','liberte6','sacrecoeur','grand-yoff','patte-oie','parcelles'],
  ['palais','sandaga','fann','stele-mermoz','mermoz','ouakam'],
  ['palais','fann','stele-mermoz','mermoz','ouakam','almadies','ngor','yoff'],
  ['palais','cyrnos','autoroute-hann','colobane','pikine','thiaroye-azur','thiaroye-gare'],
  ['palais','cyrnos','autoroute-hann','colobane','pikine','thiaroye-gare','mbao','rufisque'],
  ['palais','sandaga','petersen','fass','hlm','castors','liberte6','sacrecoeur','grand-yoff','patte-oie'],
  ['colobane','camp-penal','golf-sud','pikine','cite-sotrac','hamo4','guediawaye'],
  ['colobane','biscuiterie','hlm','dieuppeul','castors','liberte6','sacrecoeur','grand-yoff'],
  ['cyrnos','autoroute-hann','colobane','pikine','thiaroye-azur','thiaroye-gare','yeumbeul'],
  ['pikine','thiaroye-azur','thiaroye-gare','route-nationale','rufisque','bargny'],
  ['pikine','cite-sotrac','dakar-eaux-forets','guediawaye','hamo4','sipres','cambrene'],
  ['fann','point-e','virage','cite-etudiants','liberte6','grand-yoff','patte-oie','nord-foire','parcelles'],
  ['ouakam','mermoz','stele-mermoz','fann','medina','petersen','sandaga','palais'],
  ['guediawaye','sipres','hamo4','cite-sotrac','pikine','golf-sud','colobane','medina'],
  ['grand-yoff','patte-oie','nord-foire','foire','parcelles','cambrene'],
  ['liberte6','dieuppeul','castors','hlm','biscuiterie','colobane','petersen','sandaga','palais'],
  ['thiaroye-gare','route-nationale','yeumbeul','malika','mbao','keur-mbaye-fall','keur-massar'],
  ['rufisque','bargny','diamniadio','sebikotane','diamniadio','bargny'],
  ['palais','kermel','rebeuss','gueule-tapee','medina','fass','colobane'],
  ['yoff','aeroport','ouakam','mermoz','fann','medina','sandaga','palais'],
  ['ngor','almadies','ouakam','aeroport','yoff','cambrene'],
  ['parcelles','cambrene','guediawaye','sipres','hamo4','cite-sotrac','diamaguene','pikine'],
  ['mbao','zac-mbao','pikine','camp-penal','colobane','medina','sandaga','palais'],
  ['keur-massar','keur-mbaye-fall','zac-mbao','thiaroye-gare','pikine','colobane','petersen','palais'],
  ['liberte6','cite-etudiants','virage','point-e','fann','stele-mermoz'],
  ['colobane','medina','tilene','dakar-ponty','palais','kermel','fann'],
  ['pikine','camp-penal','wakam','golf-sud','biscuiterie','hlm'],
  ['guediawaye','cite-comico','cambrene','parcelles','patte-oie','grand-yoff','sacrecoeur'],
]

const AFTU_BASE = [
  ['palais','cyrnos','autoroute-hann','colobane','pikine','thiaroye-gare','yeumbeul','malika'],
  ['palais','cyrnos','autoroute-hann','colobane','pikine','thiaroye-gare','mbao','rufisque','bargny'],
  ['palais','cyrnos','autoroute-hann','colobane','pikine','diamaguene','cite-sotrac','guediawaye','sipres','cambrene'],
  ['autoroute-hann','colobane','pikine','thiaroye-azur','thiaroye-gare','route-nationale','yeumbeul','malika'],
  ['pikine','zac-mbao','mbao','keur-mbaye-fall','keur-massar','rufisque'],
  ['thiaroye-gare','route-nationale','rufisque','bargny','diamniadio','sebikotane'],
  ['guediawaye','cite-comico','sipres','cambrene','parcelles','nord-foire','foire','patte-oie','grand-yoff'],
  ['pikine','camp-penal','colobane','tilene','medina','fann','stele-mermoz','mermoz','ouakam','ngor'],
  ['yoff','aeroport','ouakam','mermoz','stele-mermoz','fann','fass','colobane','pikine'],
  ['yoff','ngor','almadies','ouakam','mermoz','stele-mermoz','fann','medina','petersen','palais'],
  ['diamniadio','bargny','rufisque','mbao','keur-massar','thiaroye-gare','pikine','colobane','medina'],
  ['sebikotane','diamniadio','bargny','rufisque','thiaroye-gare','pikine'],
  ['malika','yeumbeul','bounkheling','diamaguene','cite-sotrac','guediawaye','sipres'],
  ['keur-massar','keur-mbaye-fall','zac-mbao','mbao','thiaroye-gare','pikine','colobane'],
  ['parcelles','cambrene','cite-comico','guediawaye','sipres','hamo4'],
  ['grand-yoff','patte-oie','nord-foire','foire','parcelles','cambrene','guediawaye','sipres'],
  ['liberte6','grand-yoff','patte-oie','golf-sud','camp-penal','pikine','bounkheling','thiaroye-gare'],
  ['palais','fann','mermoz','ouakam','almadies','ngor','yoff','aeroport'],
  ['sandaga','dakar-ponty','tilene','biscuiterie','hlm','dieuppeul','liberte6','grand-yoff','patte-oie','parcelles','cambrene'],
  ['palais','kermel','rebeuss','medina','fass','colobane','wakam','pikine','bounkheling','yeumbeul','malika'],
  ['fann','point-e','virage','cite-etudiants','liberte6','sacrecoeur','grand-yoff','patte-oie','pikine'],
  ['medina','colobane','hlm','castors','sacrecoeur','grand-yoff','patte-oie','nord-foire','parcelles'],
  ['guediawaye','hamo4','sipres','dakar-eaux-forets','parcelles'],
  ['pikine','golf-sud','biscuiterie','hlm','castors','dieuppeul','liberte6','point-e','fann'],
  ['cambrene','parcelles','nord-foire','foire','patte-oie','grand-yoff','sacrecoeur','liberte6','cite-etudiants','virage'],
  ['malika','mbao','zac-mbao','pikine','camp-penal','colobane','medina','fann','mermoz','ouakam'],
  ['rufisque','thiaroye-gare','yeumbeul','bounkheling','pikine','colobane','medina','petersen','sandaga','palais'],
  ['diamniadio','rufisque','mbao','thiaroye-gare','pikine','colobane','biscuiterie','hlm','liberte6','grand-yoff'],
  ['sebikotane','diamniadio','bargny','rufisque','mbao','zac-mbao','keur-massar','keur-mbaye-fall'],
  ['sipres','guediawaye','cite-sotrac','diamaguene','pikine','thiaroye-azur','thiaroye-gare','yeumbeul'],
  ['parcelles','nord-foire','foire','patte-oie','golf-sud','camp-penal','pikine','bounkheling'],
  ['liberte6','castors','hlm','biscuiterie','colobane','gueule-tapee','rebeuss','palais'],
  ['yoff','ngor','almadies','ouakam','aeroport','grand-yoff','patte-oie','golf-sud','pikine'],
  ['mermoz','ouakam','camp-penal','biscuiterie','hlm','castors','liberte6','sacrecoeur','grand-yoff'],
  ['medina','tilene','dakar-ponty','sandaga','palais','fann','stele-mermoz','mermoz'],
  ['pikine','golf-sud','camp-penal','colobane','gueule-tapee','rebeuss','kermel','palais','fann'],
  ['keur-massar','keur-mbaye-fall','mbao','zac-mbao','thiaroye-gare','yeumbeul','malika'],
  ['guediawaye','hamo4','cite-sotrac','diamaguene','bounkheling','pikine','thiaroye-gare','rufisque'],
  ['cambrene','parcelles','patte-oie','grand-yoff','sacrecoeur','castors','hlm','medina','petersen','palais'],
  ['ngor','almadies','ouakam','aeroport','yoff','cambrene','parcelles','nord-foire','patte-oie'],
]

// ═══════════════════════════════════════════════════════════════════════════
// Générer toutes les lignes (identique à network.ts)
// ═══════════════════════════════════════════════════════════════════════════
function generateAllLines() {
  const allLines = []
  let dn = 1
  for (const base of DDD_BASE) {
    for (const v of v5(base)) {
      if (dn > 50) break
      allLines.push({ id: `DDD-${dn}`, stopIds: v })
      dn++
    }
    if (dn > 50) break
  }
  let an = 1
  for (const base of AFTU_BASE) {
    for (const v of v5(base)) {
      if (an > 50) break
      allLines.push({ id: `AFTU-TATA-${an}`, stopIds: v })
      an++
    }
    if (an > 50) break
  }
  return allLines
}

// ═══════════════════════════════════════════════════════════════════════════
// Appel LocationIQ
// ═══════════════════════════════════════════════════════════════════════════
async function fetchDirections(waypoints) {
  // LocationIQ attend lon,lat (pas lat,lon)
  const coords = waypoints.map(([lat, lon]) => `${lon},${lat}`).join(';')
  const url = `${DIRECTIONS_URL}/${coords}?key=${LOCATIONIQ_KEY}&steps=false&geometries=geojson&overview=full`

  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HTTP ${res.status}: ${body}`)
  }
  const data = await res.json()
  if (!data.routes || data.routes.length === 0) throw new Error('No routes')

  const route = data.routes[0]
  // Convertir [lon,lat] → [lat,lon]
  const geometry = route.geometry.coordinates.map(([lon, lat]) => [lat, lon])
  return {
    distance: route.distance,    // mètres
    duration: route.duration,    // secondes
    geometry                     // [lat,lon][]
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ═══════════════════════════════════════════════════════════════════════════
// Déduplique les routes (même séquence de stops → même géométrie)
// ═══════════════════════════════════════════════════════════════════════════
function deduplicateLines(allLines) {
  const seen = new Map()
  const unique = []
  for (const line of allLines) {
    const key = line.stopIds.join('|')
    if (!seen.has(key)) {
      seen.set(key, line.id)
      unique.push(line)
    }
  }
  return { unique, seen }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('╔═══════════════════════════════════════════════════╗')
  console.log('║  SunuBus — Générateur de Tracés LocationIQ       ║')
  console.log('╚═══════════════════════════════════════════════════╝')

  const allLines = generateAllLines()
  console.log(`\n📊 ${allLines.length} lignes générées au total`)

  const { unique, seen } = deduplicateLines(allLines)
  console.log(`🔍 ${unique.length} routes uniques après déduplication\n`)

  const results = {}
  let successCount = 0
  let failCount = 0

  for (let i = 0; i < unique.length; i++) {
    const line = unique[i]
    const validStops = line.stopIds.filter(id => GPS[id])
    if (validStops.length < 2) {
      console.log(`⚠️  [${i+1}/${unique.length}] ${line.id} — pas assez de coordonnées (${validStops.length} stops)`)
      failCount++
      continue
    }

    const waypoints = validStops.map(id => GPS[id])
    const key = line.stopIds.join('|')

    try {
      console.log(`🚌 [${i+1}/${unique.length}] ${line.id} (${validStops.length} stops)...`)
      const result = await fetchDirections(waypoints)

      // Simplifier la géométrie: garder max 80 points par route
      let geometry = result.geometry
      if (geometry.length > 80) {
        const step = geometry.length / 80
        const simplified = [geometry[0]]
        for (let j = 1; j < 79; j++) {
          simplified.push(geometry[Math.round(j * step)])
        }
        simplified.push(geometry[geometry.length - 1])
        geometry = simplified
      }

      // Arrondir à 4 décimales pour réduire la taille du fichier
      geometry = geometry.map(([lat, lon]) => [
        Math.round(lat * 10000) / 10000,
        Math.round(lon * 10000) / 10000
      ])

      results[key] = {
        lineId: line.id,
        distance: Math.round(result.distance),
        duration: Math.round(result.duration),
        geometry
      }

      const distKm = (result.distance / 1000).toFixed(1)
      const durMin = Math.round(result.duration / 60)
      console.log(`   ✅ ${distKm} km, ${durMin} min, ${geometry.length} pts`)
      successCount++
    } catch (err) {
      console.log(`   ❌ Erreur: ${err.message}`)
      failCount++
    }

    await sleep(THROTTLE_MS)
  }

  console.log(`\n════════════════════════════════════════`)
  console.log(`✅ Succès: ${successCount} | ❌ Échecs: ${failCount}`)
  console.log(`════════════════════════════════════════\n`)

  // ═══════════════════════════════════════════════════════════════════════
  // Générer le fichier TypeScript
  // ═══════════════════════════════════════════════════════════════════════
  // Construire la map lineId → geometry
  const lineGeometryMap = {}
  for (const line of allLines) {
    const key = line.stopIds.join('|')
    if (results[key]) {
      lineGeometryMap[line.id] = results[key]
    }
  }

  let tsCode = `/**
 * SunuBus — Tracés Routiers Pré-générés via LocationIQ Directions API
 * ════════════════════════════════════════════════════════════════════
 * Fichier AUTO-GÉNÉRÉ le ${new Date().toISOString().slice(0,10)}
 * Ne pas modifier manuellement — relancer "node generate_routes.js"
 * 
 * ${Object.keys(lineGeometryMap).length} lignes avec tracés réels
 */

export type PrebakedRoute = {
  /** Distance en mètres */
  distance: number
  /** Durée en secondes */
  duration: number
  /** Géométrie [lat, lon][] */
  geometry: [number, number][]
}

/**
 * Tracés pré-générés pour chaque ligne de bus.
 * Clé = ID de la ligne (ex: "DDD-1", "AFTU-TATA-12")
 */
export const ROUTE_GEOMETRIES: Record<string, PrebakedRoute> = {\n`

  for (const [lineId, data] of Object.entries(lineGeometryMap)) {
    const geo = data.geometry.map(([lat, lon]) => `[${lat},${lon}]`).join(',')
    tsCode += `  '${lineId}': {\n`
    tsCode += `    distance: ${data.distance},\n`
    tsCode += `    duration: ${data.duration},\n`
    tsCode += `    geometry: [${geo}],\n`
    tsCode += `  },\n`
  }

  tsCode += `}\n\n`

  // Ajouter aussi les coordonnées GPS complètes
  tsCode += `/**\n * Coordonnées GPS complètes de tous les arrêts du réseau\n */\n`
  tsCode += `export const STOP_COORDINATES: Record<string, [number, number]> = {\n`
  for (const [id, [lat, lon]] of Object.entries(GPS)) {
    tsCode += `  '${id}': [${lat}, ${lon}],\n`
  }
  tsCode += `}\n`

  const outPath = path.join(__dirname, 'src', 'data', 'route_geometries.ts')
  fs.writeFileSync(outPath, tsCode, 'utf-8')

  const sizeKB = (Buffer.byteLength(tsCode) / 1024).toFixed(1)
  console.log(`📁 Fichier généré : ${outPath}`)
  console.log(`📏 Taille : ${sizeKB} KB`)
  console.log(`🚌 ${Object.keys(lineGeometryMap).length} lignes avec tracés réels`)
  console.log('\n🎉 Terminé ! Les tracés sont maintenant intégrés dans le code.')
}

main().catch(err => {
  console.error('💥 Erreur fatale:', err)
  process.exit(1)
})
