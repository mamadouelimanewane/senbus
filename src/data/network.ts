/**
 * SunuBus – Réseau de transport de Dakar
 * DakarDemDikk (DDD) : 150 lignes urbaines
 * AFTU-TATA         : 200 lignes banlieue / car rapide
 * Véhicules simulés : 350 (un par ligne)
 */
import type { Bus, Line, Stop } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// 61 ARRÊTS  (x: ouest→est  /  y: nord→sud, échelle SVG 0-100)
// ─────────────────────────────────────────────────────────────────────────────
export const stops: Stop[] = [
  // PLATEAU / CENTRE
  { id:'palais',          name:'Gare Palais',           x:20, y:70, district:'Plateau' },
  { id:'independance',    name:"Place Indépendance",    x:22, y:68, district:'Plateau' },
  { id:'sandaga',         name:'Marché Sandaga',        x:24, y:65, district:'Plateau' },
  { id:'petersen',        name:'Gare Petersen',         x:25, y:65, district:'Plateau' },
  { id:'kermel',          name:'Marché Kermel',         x:19, y:72, district:'Plateau' },
  { id:'rebeuss',         name:'Rebeuss',               x:22, y:75, district:'Dakar'   },
  { id:'republique',      name:'Rue République',        x:21, y:68, district:'Plateau' },
  { id:'dakar-ponty',     name:'Dakar Ponty',           x:21, y:67, district:'Plateau' },
  // MÉDINA / FASS
  { id:'medina',          name:'Médina',                x:28, y:60, district:'Médina'  },
  { id:'fass',            name:'Fass',                  x:26, y:56, district:'Fass-Colobane' },
  { id:'tilene',          name:'Tilène',                x:30, y:63, district:'Médina'  },
  { id:'biscuiterie',     name:'Biscuiterie',           x:34, y:57, district:'Médina'  },
  { id:'gueule-tapee',    name:'Gueule Tapée',          x:27, y:62, district:'Médina'  },
  // COLOBANE / HLM
  { id:'colobane',        name:'Colobane',              x:38, y:58, district:'Gare Routière' },
  { id:'hlm',             name:'HLM',                   x:42, y:52, district:'HLM'     },
  { id:'castors',         name:'Castors',               x:45, y:48, district:'Dieuppeul' },
  { id:'dieuppeul',       name:'Dieuppeul',             x:40, y:53, district:'Dieuppeul' },
  // VDN / SICAP
  { id:'liberte6',        name:'Liberté 6',             x:55, y:40, district:'VDN'     },
  { id:'sacrecoeur',      name:'Sacré-Cœur',            x:48, y:45, district:'SICAP'   },
  { id:'grand-yoff',      name:'Grand Yoff',            x:50, y:42, district:'Dakar'   },
  { id:'patte-oie',       name:"Patte d'Oie",           x:60, y:45, district:"Patte d'Oie" },
  { id:'foire',           name:'Foire Dakar',           x:62, y:40, district:'Foire'   },
  { id:'nord-foire',      name:'Nord Foire',            x:63, y:38, district:'Nord Foire' },
  // CORNICHE / ALMADIES
  { id:'fann',            name:'Fann',                  x:15, y:55, district:'Corniche Ouest' },
  { id:'point-e',         name:'Point E',               x:25, y:50, district:'Point E'  },
  { id:'stele-mermoz',    name:'Stèle Mermoz',          x:15, y:43, district:'Mermoz'  },
  { id:'mermoz',          name:'Mermoz',                x:16, y:40, district:'Mermoz'  },
  { id:'virage',          name:'Virage',                x:24, y:48, district:'Liberté' },
  { id:'cite-etudiants',  name:'Cité Étudiants',        x:26, y:46, district:'Liberté' },
  { id:'ouakam',          name:'Ouakam',                x:18, y:30, district:'Mamelles' },
  { id:'almadies',        name:'Almadies',              x:12, y:22, district:'Almadies' },
  { id:'ngor',            name:'Ngor',                  x:10, y:15, district:'Almadies' },
  { id:'yoff',            name:'Yoff',                  x:25, y:10, district:'Aéroport' },
  { id:'aeroport',        name:'Aéroport LSS',          x:23, y:18, district:'Yoff'    },
  // PIKINE / THIAROYE
  { id:'pikine',          name:'Pikine',                x:70, y:60, district:'Marché Pikine' },
  { id:'bounkheling',     name:'Bounkheling',           x:72, y:62, district:'Pikine'  },
  { id:'golf-sud',        name:'Golf Sud',              x:64, y:56, district:'Pikine'  },
  { id:'camp-penal',      name:'Camp Pénal',            x:58, y:55, district:'Pikine'  },
  { id:'wakam',           name:'Wakam',                 x:55, y:57, district:'Pikine'  },
  { id:'diamaguene',      name:'Diamaguène',            x:73, y:57, district:'Pikine'  },
  { id:'cite-sotrac',     name:'Cité Sotrac',           x:68, y:55, district:'Pikine'  },
  { id:'thiaroye-azur',   name:'Thiaroye Azur',         x:80, y:65, district:'Banlieue' },
  { id:'thiaroye-gare',   name:'Thiaroye Gare',         x:78, y:68, district:'Banlieue' },
  { id:'autoroute-hann',  name:'Autoroute (Hann)',      x:60, y:65, district:'Maritime' },
  { id:'cyrnos',          name:'Cyrnos',                x:40, y:70, district:'Port'     },
  // BANLIEUE NORD
  { id:'parcelles',       name:'Parcelles Assainies',   x:75, y:25, district:'Unité 15' },
  { id:'cambrene',        name:'Cambérène',             x:78, y:20, district:'Cambérène' },
  { id:'guediawaye',      name:'Guédiawaye',            x:85, y:35, district:'Banlieue' },
  { id:'hamo4',           name:'HLM Hamo 4',            x:80, y:33, district:'Guédiawaye' },
  { id:'cite-comico',     name:'Cité Comico',           x:80, y:28, district:'Guédiawaye' },
  { id:'sipres',          name:'Sipres',                x:82, y:38, district:'Guédiawaye' },
  { id:'dakar-eaux-forets',name:'Dakar Eaux-Forêts',   x:72, y:38, district:'Pikine'  },
  // BANLIEUE EST
  { id:'yeumbeul',        name:'Yeumbeul',              x:82, y:50, district:'Banlieue' },
  { id:'malika',          name:'Malika',                x:90, y:45, district:'Littoral' },
  { id:'mbao',            name:'Mbao',                  x:85, y:68, district:'Banlieue' },
  { id:'keur-mbaye-fall', name:'Keur Mbaye Fall',       x:86, y:69, district:'Banlieue' },
  { id:'keur-massar',     name:'Keur Massar',           x:88, y:70, district:'Vilon'   },
  { id:'zac-mbao',        name:'ZAC Mbao',              x:84, y:67, district:'Mbao'    },
  { id:'route-nationale', name:'Route Nationale',       x:80, y:62, district:'Banlieue' },
  // PÉRIPHÉRIE LOINTAINE
  { id:'rufisque',        name:'Rufisque',              x:95, y:80, district:'Banlieue' },
  { id:'bargny',          name:'Bargny',                x:96, y:85, district:'Banlieue' },
  { id:'diamniadio',      name:'Diamniadio',            x:98, y:90, district:'Nouvelle Ville' },
  { id:'sebikotane',      name:'Sébikotane',            x:99, y:95, district:'Périphérie' },
]

// ─────────────────────────────────────────────────────────────────────────────
// COULEURS opérateurs
// ─────────────────────────────────────────────────────────────────────────────
const DDD_COLORS = ['#0d47a1','#1565c0','#1976d2','#1e88e5','#2196f3','#42a5f5','#0288d1','#0097a7']
const AFTU_COLORS = ['#e65100','#f57c00','#fb8c00','#ff9800','#ffa726','#ef6c00','#bf360c','#d84315']

// ─────────────────────────────────────────────────────────────────────────────
// Nom d'un arrêt
// ─────────────────────────────────────────────────────────────────────────────
function sname(id: string): string { return stops.find(s => s.id === id)?.name ?? id }

// ─────────────────────────────────────────────────────────────────────────────
// Génère 5 variantes d'une route de base
// ─────────────────────────────────────────────────────────────────────────────
function v5(base: string[]): string[][] {
  const fwd = [...base]
  const rev = [...base].reverse()
  // Express : indices 0, 2, 4, ..., N-1
  const expIdx = base.map((_, i) => i).filter(i => i === 0 || i === base.length - 1 || i % 2 === 0)
  const exp = expIdx.map(i => base[i])
  const expressOk = exp.length >= 3 && exp.length < base.length
  // Branch A : à partir du 2e arrêt
  const brA = base.slice(1)
  // Branch B : jusqu'à l'avant-dernier arrêt
  const brB = base.slice(0, -1)
  return [
    fwd,
    rev,
    expressOk ? exp : fwd,
    brA.length >= 3 ? brA : rev,
    brB.length >= 3 ? brB : fwd,
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// 30 ROUTES DE BASE DDD (bus urbains DakarDemDikk)
// ─────────────────────────────────────────────────────────────────────────────
const DDD_BASE: string[][] = [
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

// ─────────────────────────────────────────────────────────────────────────────
// 40 ROUTES DE BASE AFTU-TATA (car rapides / minibus banlieue)
// ─────────────────────────────────────────────────────────────────────────────
const AFTU_BASE: string[][] = [
  ['palais','cyrnos','autoroute-hann','colobane','pikine','thiaroye-gare','yeumbeul', 'malika'],
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

// ─────────────────────────────────────────────────────────────────────────────
// Fabrique une Line DDD
// ─────────────────────────────────────────────────────────────────────────────
function mkDDD(n: number, ids: string[]): Line {
  const toName = sname(ids[ids.length - 1])
  const fromName = sname(ids[0])
  return {
    id: `DDD-${n}`,
    code: `${n}`,
    operatorId: 'DDD',
    name: `DDD Ligne ${n} — ${fromName} → ${toName}`,
    headsign: toName,
    color: DDD_COLORS[n % DDD_COLORS.length],
    stopIds: ids,
    baseMinutes: ids.length * 7 + 5,
    frequencyMin: 5 + (n % 10),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fabrique une Line AFTU-TATA
// ─────────────────────────────────────────────────────────────────────────────
function mkAFTU(n: number, ids: string[]): Line {
  const toName = sname(ids[ids.length - 1])
  const fromName = sname(ids[0])
  return {
    id: `AFTU-TATA-${n}`,
    code: `T${n}`,
    operatorId: 'AFTU-TATA',
    name: `AFTU-TATA T${n} — ${fromName} → ${toName}`,
    headsign: toName,
    color: AFTU_COLORS[n % AFTU_COLORS.length],
    stopIds: ids,
    baseMinutes: ids.length * 9 + 10,
    frequencyMin: 12 + (n % 18),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GÉNÉRATION DES 50 LIGNES DDD
// ─────────────────────────────────────────────────────────────────────────────
const dddLines: Line[] = []
let dn = 1
for (const base of DDD_BASE) {
  for (const v of v5(base)) {
    if (dn > 50) break
    dddLines.push(mkDDD(dn++, v))
  }
  if (dn > 50) break
}

// ─────────────────────────────────────────────────────────────────────────────
// GÉNÉRATION DES 50 LIGNES AFTU-TATA
// ─────────────────────────────────────────────────────────────────────────────
const aftuLines: Line[] = []
let an = 1
for (const base of AFTU_BASE) {
  for (const v of v5(base)) {
    if (an > 50) break
    aftuLines.push(mkAFTU(an++, v))
  }
  if (an > 50) break
}

export const lines: Line[] = [...dddLines, ...aftuLines]

// ─────────────────────────────────────────────────────────────────────────────
// 350 BUS SIMULÉS (1 par ligne)
// DDD = grand bus bleu (60-75 passagers)
// AFTU-TATA = car rapide / minibus orange (25-40 passagers)
// ─────────────────────────────────────────────────────────────────────────────
export const buses: Bus[] = lines.map((line, i) => {
  const isDDD = line.operatorId === 'DDD'
  const capacity = isDDD ? 60 + (i % 4) * 5 : 25 + (i % 4) * 5   // 60-75 | 25-40
  const occupancy = 0.25 + (i % 8) * 0.09                           // 25%–88%
  return {
    id: isDDD
      ? `DDD-${String(i + 1).padStart(3, '0')}`
      : `AT-${String(i - 149).padStart(3, '0')}`,
    lineId: line.id,
    progress: ((i * 0.137) % 0.98) + 0.01,   // répartis sur toute la route
    speedFactor: 0.80 + (i % 7) * 0.06,       // 0.80 – 1.16
    capacity,
    passengers: Math.round(capacity * occupancy),
    plate: isDDD
      ? `DK-${String(100 + (i * 7) % 900).padStart(3, '0')}-DD`
      : `DK-${String(100 + (i * 11) % 900).padStart(3, '0')}-AT`,
  }
})
