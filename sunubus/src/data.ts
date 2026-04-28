// ============================================================
// SunuBus — data.ts  v5.0
// Données réseau Dakar : lignes DDD + TATA (simulation GTFS)
// ============================================================

export type Operator = 'ddd' | 'tata';

export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lines: string[];
}

export interface BusLine {
  id: string;
  number: string;
  name: string;
  operator: Operator;
  color: string;
  terminus_a: string;
  terminus_b: string;
  stops: Stop[];
  frequency_min: number; // fréquence en minutes
  tarif_fcfa: number;
}

// -------------------------------------------------------
// Arrêts principaux de Dakar (coordonnées réelles)
// -------------------------------------------------------
export const STOPS: Record<string, Stop> = {
  // Centre-ville / Plateau
  plateau:        { id: 'plateau',        name: 'Plateau',               lat: 14.6928, lng: -17.4467, lines: ['C1','C6','10','54'] },
  sandaga:        { id: 'sandaga',        name: 'Sandaga',               lat: 14.6888, lng: -17.4428, lines: ['C1','10','15','54'] },
  tilene:         { id: 'tilene',         name: 'Tilène',                lat: 14.6863, lng: -17.4514, lines: ['C2','7','15'] },
  colobane:       { id: 'colobane',       name: 'Colobane',              lat: 14.6893, lng: -17.4501, lines: ['C2','7','27','54'] },
  medina:         { id: 'medina',         name: 'Médina',                lat: 14.6921, lng: -17.4547, lines: ['C2','7','15'] },
  // Nord / Parcelles
  parcelles:      { id: 'parcelles',      name: 'Parcelles Assainies',   lat: 14.7640, lng: -17.4387, lines: ['C1','Tata-3'] },
  guediawaye:     { id: 'guediawaye',     name: 'Guédiawaye',            lat: 14.7748, lng: -17.3990, lines: ['C1','Tata-3','Tata-5'] },
  pikine:         { id: 'pikine',         name: 'Pikine',                lat: 14.7542, lng: -17.3905, lines: ['C6','Tata-5','Tata-8'] },
  thiaroye:       { id: 'thiaroye',       name: 'Thiaroye',              lat: 14.7416, lng: -17.3680, lines: ['C6','Tata-8'] },
  // Ouest / VDN
  vdn:            { id: 'vdn',            name: 'VDN (Ouakam)',          lat: 14.7168, lng: -17.4898, lines: ['C2','27','Tata-1'] },
  almadies:       { id: 'almadies',       name: 'Almadies',              lat: 14.7332, lng: -17.5162, lines: ['Tata-1'] },
  ngor:           { id: 'ngor',           name: 'Ngor',                  lat: 14.7436, lng: -17.5111, lines: ['Tata-1'] },
  yoff:           { id: 'yoff',           name: 'Yoff',                  lat: 14.7497, lng: -17.4921, lines: ['27','Tata-1'] },
  // Aéroport / AIBD
  aibd:           { id: 'aibd',           name: 'AIBD (Aéroport)',       lat: 14.6739, lng: -17.0733, lines: ['C6'] },
  // Sud / Hann
  hann:           { id: 'hann',           name: 'Hann',                  lat: 14.7063, lng: -17.4041, lines: ['10','54'] },
  sodida:         { id: 'sodida',         name: 'Sodida',                lat: 14.7139, lng: -17.3920, lines: ['10','54'] },
  // Centre / Université
  ucad:           { id: 'ucad',           name: 'UCAD / Université',     lat: 14.6917, lng: -17.4672, lines: ['C2','15','Tata-2'] },
  fann:           { id: 'fann',           name: 'Fann Résidence',        lat: 14.6959, lng: -17.4738, lines: ['15','Tata-2'] },
  // Rufisque
  rufisque:       { id: 'rufisque',       name: 'Rufisque',              lat: 14.7155, lng: -17.2730, lines: ['C6','Tata-8'] },
  // Bargny
  bargny:         { id: 'bargny',         name: 'Bargny',                lat: 14.7000, lng: -17.2249, lines: ['C6'] },
  // Gare Routière
  gare_pompiers:  { id: 'gare_pompiers',  name: 'Gare des Pompiers',     lat: 14.6836, lng: -17.4455, lines: ['C1','C2','10','54'] },
  petersen:       { id: 'petersen',       name: 'Petersen',              lat: 14.6910, lng: -17.4395, lines: ['C1','10'] },
  // Mbao / Diamaguène
  mbao:           { id: 'mbao',           name: 'Mbao',                  lat: 14.7441, lng: -17.3348, lines: ['C6','Tata-8'] },
  diamaguene:     { id: 'diamaguene',     name: 'Diamaguène',            lat: 14.7350, lng: -17.3700, lines: ['Tata-5','Tata-8'] },
  // Ouakam / Ouest
  ouakam:         { id: 'ouakam',         name: 'Ouakam',                lat: 14.7222, lng: -17.5001, lines: ['27','Tata-1'] },
  mamelles:       { id: 'mamelles',       name: 'Mamelles',              lat: 14.7285, lng: -17.5046, lines: ['27'] },
};

// -------------------------------------------------------
// Lignes principales (DDD + TATA)
// -------------------------------------------------------
export const LINES: BusLine[] = [
  // ========== DDD ==========
  {
    id: 'C1', number: 'C1', operator: 'ddd', color: '#0F6E56',
    name: 'Gare Pompiers — Parcelles Assainies',
    terminus_a: 'Gare des Pompiers', terminus_b: 'Parcelles Assainies',
    frequency_min: 8, tarif_fcfa: 200,
    stops: [STOPS.gare_pompiers, STOPS.petersen, STOPS.plateau, STOPS.sandaga, STOPS.medina,
            STOPS.ucad, STOPS.fann, STOPS.vdn, STOPS.parcelles, STOPS.guediawaye],
  },
  {
    id: 'C2', number: 'C2', operator: 'ddd', color: '#0F6E56',
    name: 'Gare Pompiers — VDN Ouakam',
    terminus_a: 'Gare des Pompiers', terminus_b: 'VDN Ouakam',
    frequency_min: 10, tarif_fcfa: 200,
    stops: [STOPS.gare_pompiers, STOPS.sandaga, STOPS.tilene, STOPS.colobane,
            STOPS.medina, STOPS.ucad, STOPS.fann, STOPS.vdn, STOPS.ouakam],
  },
  {
    id: 'C6', number: 'C6', operator: 'ddd', color: '#0F6E56',
    name: 'Plateau — Rufisque / AIBD',
    terminus_a: 'Plateau', terminus_b: 'AIBD',
    frequency_min: 15, tarif_fcfa: 350,
    stops: [STOPS.plateau, STOPS.gare_pompiers, STOPS.hann, STOPS.sodida,
            STOPS.pikine, STOPS.thiaroye, STOPS.mbao, STOPS.rufisque, STOPS.bargny, STOPS.aibd],
  },
  {
    id: '7', number: '7', operator: 'ddd', color: '#0F6E56',
    name: 'Colobane — Médina',
    terminus_a: 'Colobane', terminus_b: 'Médina',
    frequency_min: 12, tarif_fcfa: 150,
    stops: [STOPS.colobane, STOPS.tilene, STOPS.medina],
  },
  {
    id: '10', number: '10', operator: 'ddd', color: '#0F6E56',
    name: 'Plateau — Hann',
    terminus_a: 'Plateau', terminus_b: 'Hann',
    frequency_min: 12, tarif_fcfa: 200,
    stops: [STOPS.plateau, STOPS.petersen, STOPS.sandaga, STOPS.gare_pompiers, STOPS.hann, STOPS.sodida],
  },
  {
    id: '15', number: '15', operator: 'ddd', color: '#0F6E56',
    name: 'Sandaga — UCAD',
    terminus_a: 'Sandaga', terminus_b: 'UCAD',
    frequency_min: 10, tarif_fcfa: 150,
    stops: [STOPS.sandaga, STOPS.tilene, STOPS.colobane, STOPS.medina, STOPS.ucad, STOPS.fann],
  },
  {
    id: '27', number: '27', operator: 'ddd', color: '#0F6E56',
    name: 'Colobane — Almadies',
    terminus_a: 'Colobane', terminus_b: 'Almadies',
    frequency_min: 14, tarif_fcfa: 200,
    stops: [STOPS.colobane, STOPS.vdn, STOPS.ouakam, STOPS.mamelles, STOPS.yoff, STOPS.ngor, STOPS.almadies],
  },
  {
    id: '54', number: '54', operator: 'ddd', color: '#0F6E56',
    name: 'Plateau — Hann Maristes',
    terminus_a: 'Plateau', terminus_b: 'Hann',
    frequency_min: 15, tarif_fcfa: 200,
    stops: [STOPS.plateau, STOPS.sandaga, STOPS.colobane, STOPS.gare_pompiers, STOPS.hann, STOPS.sodida],
  },

  // ========== TATA / AFTU ==========
  {
    id: 'Tata-1', number: 'T1', operator: 'tata', color: '#BA7517',
    name: 'Colobane — Almadies (TATA)',
    terminus_a: 'Colobane', terminus_b: 'Almadies',
    frequency_min: 10, tarif_fcfa: 200,
    stops: [STOPS.colobane, STOPS.ucad, STOPS.fann, STOPS.vdn, STOPS.ouakam,
            STOPS.yoff, STOPS.ngor, STOPS.almadies],
  },
  {
    id: 'Tata-2', number: 'T2', operator: 'tata', color: '#BA7517',
    name: 'Sandaga — UCAD (TATA)',
    terminus_a: 'Sandaga', terminus_b: 'UCAD',
    frequency_min: 8, tarif_fcfa: 150,
    stops: [STOPS.sandaga, STOPS.medina, STOPS.ucad, STOPS.fann],
  },
  {
    id: 'Tata-3', number: 'T3', operator: 'tata', color: '#BA7517',
    name: 'Parcelles — Guédiawaye (TATA)',
    terminus_a: 'Parcelles Assainies', terminus_b: 'Guédiawaye',
    frequency_min: 6, tarif_fcfa: 150,
    stops: [STOPS.parcelles, STOPS.guediawaye],
  },
  {
    id: 'Tata-5', number: 'T5', operator: 'tata', color: '#BA7517',
    name: 'Guédiawaye — Pikine (TATA)',
    terminus_a: 'Guédiawaye', terminus_b: 'Pikine',
    frequency_min: 8, tarif_fcfa: 150,
    stops: [STOPS.guediawaye, STOPS.pikine, STOPS.diamaguene],
  },
  {
    id: 'Tata-8', number: 'T8', operator: 'tata', color: '#BA7517',
    name: 'Pikine — Rufisque (TATA)',
    terminus_a: 'Pikine', terminus_b: 'Rufisque',
    frequency_min: 12, tarif_fcfa: 250,
    stops: [STOPS.pikine, STOPS.diamaguene, STOPS.thiaroye, STOPS.mbao, STOPS.rufisque],
  },
];

// Accès rapide par id
export const LINE_BY_ID: Record<string, BusLine> =
  Object.fromEntries(LINES.map(l => [l.id, l]));

// Liste de tous les arrêts (uniques)
export const ALL_STOPS: Stop[] = Object.values(STOPS);

// -------------------------------------------------------
// Simulation positions bus (lat/lng aléatoire sur tracé)
// -------------------------------------------------------
export interface BusPosition {
  busId: string;
  lineId: string;
  operator: Operator;
  lat: number;
  lng: number;
  heading: number;
  speed_kmh: number;
  nextStop: string;
  updated: Date;
}

function randBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function interpolate(s1: Stop, s2: Stop, t: number): [number, number] {
  return [
    s1.lat + (s2.lat - s1.lat) * t,
    s1.lng + (s2.lng - s1.lng) * t,
  ];
}

export function generateBusPositions(): BusPosition[] {
  const positions: BusPosition[] = [];
  let busIndex = 0;

  for (const line of LINES) {
    const count = Math.max(2, Math.floor(10 / line.frequency_min) + 1);
    for (let i = 0; i < count; i++) {
      const seg = Math.floor(Math.random() * (line.stops.length - 1));
      const t   = Math.random();
      const s1  = line.stops[seg];
      const s2  = line.stops[seg + 1];
      const [lat, lng] = interpolate(s1, s2, t);
      const dx  = s2.lng - s1.lng;
      const dy  = s2.lat - s1.lat;
      const heading = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;

      positions.push({
        busId:     `BUS-${line.id}-${i + 1}`,
        lineId:    line.id,
        operator:  line.operator,
        lat:       lat + randBetween(-0.001, 0.001),
        lng:       lng + randBetween(-0.001, 0.001),
        heading,
        speed_kmh: randBetween(15, 45),
        nextStop:  s2.name,
        updated:   new Date(),
      });
      busIndex++;
    }
  }
  return positions;
}

// -------------------------------------------------------
// Recherche
// -------------------------------------------------------
function normalize(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function searchNetwork(query: string): { lines: BusLine[]; stops: Stop[] } {
  const q = normalize(query);
  if (!q) return { lines: [], stops: [] };

  const lines = LINES.filter(l =>
    normalize(l.number).includes(q) ||
    normalize(l.name).includes(q) ||
    normalize(l.terminus_a).includes(q) ||
    normalize(l.terminus_b).includes(q)
  );
  const stops = ALL_STOPS.filter(s =>
    normalize(s.name).includes(q)
  );
  return { lines, stops };
}

// -------------------------------------------------------
// Planificateur de trajet (simplifié)
// -------------------------------------------------------
export interface RouteStep {
  type: 'walk' | 'bus' | 'transfer';
  description: string;
  sub: string;
  duration_min: number;
  lineId?: string;
}

export interface Route {
  id: string;
  steps: RouteStep[];
  total_min: number;
  arrival: Date;
  transfers: number;
  walk_min: number;
  tarif_fcfa: number;
}

export function findRoutes(
  fromName: string,
  toName: string,
  pref: 'rapide' | 'marche' | 'correspondances' = 'rapide'
): Route[] {

  const now = new Date();
  const routes: Route[] = [];

  // Cherche arrêt correspondant (fuzzy)
  const findStop = (name: string): Stop | undefined => {
    const n = name.toLowerCase();
    return ALL_STOPS.find(s =>
      s.name.toLowerCase().includes(n) || n.includes(s.name.toLowerCase())
    );
  };

  const fromStop = findStop(fromName);
  const toStop   = findStop(toName);

  // Trouver les lignes qui couvrent les deux arrêts
  const directLines = LINES.filter(l => {
    const ids = l.stops.map(s => s.id);
    return fromStop && toStop &&
      ids.includes(fromStop.id) && ids.includes(toStop.id);
  });

  // Route directe
  for (const line of directLines.slice(0, 2)) {
    const idx1 = line.stops.findIndex(s => s.id === fromStop?.id);
    const idx2 = line.stops.findIndex(s => s.id === toStop?.id);
    const nStops = Math.abs(idx2 - idx1);
    const busDuration = nStops * 4 + Math.floor(Math.random() * 6);
    const walkMin = Math.floor(Math.random() * 5) + 2;
    const total = walkMin + busDuration;
    const arr = new Date(now.getTime() + total * 60000);

    routes.push({
      id: `direct-${line.id}`,
      steps: [
        { type: 'walk',   description: `Marcher vers ${fromStop?.name}`, sub: `${walkMin} min à pied`, duration_min: walkMin },
        { type: 'bus',    description: `Ligne ${line.number} — direction ${line.terminus_b}`, sub: `${nStops} arrêts · ${line.operator.toUpperCase()}`, duration_min: busDuration, lineId: line.id },
        { type: 'walk',   description: `Rejoindre la destination`, sub: '2 min à pied', duration_min: 2 },
      ],
      total_min: total,
      arrival: arr,
      transfers: 0,
      walk_min: walkMin + 2,
      tarif_fcfa: line.tarif_fcfa,
    });
  }

  // Route avec correspondance (si pas assez de directs)
  if (routes.length < 2 && LINES.length >= 2) {
    const walkMin = 3;
    const seg1 = 12 + Math.floor(Math.random() * 8);
    const seg2 = 8  + Math.floor(Math.random() * 6);
    const total = walkMin + seg1 + 4 + seg2 + 2;
    const arr = new Date(now.getTime() + total * 60000);
    const l1  = LINES[0];
    const l2  = LINES[2];

    routes.push({
      id: 'corres-1',
      steps: [
        { type: 'walk',     description: `Marcher vers ${fromStop?.name ?? 'départ'}`, sub: `${walkMin} min`, duration_min: walkMin },
        { type: 'bus',      description: `Ligne ${l1.number} — direction ${l1.terminus_b}`, sub: `${Math.round(seg1/4)} arrêts`, duration_min: seg1, lineId: l1.id },
        { type: 'transfer', description: 'Correspondance', sub: 'Changer de bus — 4 min', duration_min: 4 },
        { type: 'bus',      description: `Ligne ${l2.number} — direction ${l2.terminus_b}`, sub: `${Math.round(seg2/4)} arrêts`, duration_min: seg2, lineId: l2.id },
        { type: 'walk',     description: 'Rejoindre la destination', sub: '2 min', duration_min: 2 },
      ],
      total_min: total,
      arrival: arr,
      transfers: 1,
      walk_min: walkMin + 2,
      tarif_fcfa: l1.tarif_fcfa + l2.tarif_fcfa,
    });
  }

  // Tri selon préférence
  if (pref === 'rapide')         routes.sort((a, b) => a.total_min - b.total_min);
  if (pref === 'marche')         routes.sort((a, b) => a.walk_min  - b.walk_min);
  if (pref === 'correspondances')routes.sort((a, b) => a.transfers - b.transfers);

  return routes.slice(0, 3);
}

// -------------------------------------------------------
// Calcul distance (Haversine)
// -------------------------------------------------------
export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export function nearbyStops(lat: number, lng: number, maxM = 1000): (Stop & { dist: number })[] {
  return ALL_STOPS
    .map(s => ({ ...s, dist: haversine(lat, lng, s.lat, s.lng) }))
    .filter(s => s.dist <= maxM)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 8);
}

// -------------------------------------------------------
// Formatage
// -------------------------------------------------------
export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('fr-SN', { hour: '2-digit', minute: '2-digit' });
}

export function formatDist(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}
