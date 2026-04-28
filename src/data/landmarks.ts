/**
 * SunuBus – Glossaire Complet de la Région de Dakar (v5.0)
 * ═════════════════════════════════════════════════════════
 * Base de données exhaustive incluant les départements de Dakar,
 * Pikine, Guédiawaye, Keur Massar et Rufisque.
 * Mise à jour v5.0 : +80 nouveaux lieux extraits de Google Maps.
 */

export interface Landmark {
  name: string
  district: string
  type: 'quartier' | 'rue' | 'monument' | 'hopital' | 'marche' | 'gare' | 'ecole' | 'sport' | 'hotel' | 'musee' | 'plage' | 'cite'
  coords?: [number, number]
}

export const DAKAR_LANDMARKS: Landmark[] = [

  // ─────────────────────────────────────────────────────────────────────────────
  // DÉPARTEMENT DE DAKAR — PLATEAU & CENTRE-VILLE
  // ─────────────────────────────────────────────────────────────────────────────
  { name: 'Dakar-Plateau', district: 'Dakar', type: 'quartier', coords: [14.671, -17.437] },
  { name: 'Place de l\'Indépendance', district: 'Plateau', type: 'monument', coords: [14.669, -17.436] },
  { name: 'Place Leclerc', district: 'Plateau', type: 'gare', coords: [14.6683, -17.4339] },
  { name: 'Boulevard de la République', district: 'Plateau', type: 'rue', coords: [14.6653, -17.4354] },
  { name: 'Avenue Cheikh Anta Diop', district: 'Dakar', type: 'rue', coords: [14.6965, -17.4660] },
  { name: 'Rue Moussé Diop', district: 'Plateau', type: 'rue', coords: [14.6731, -17.4353] },
  { name: 'Corniche Ouest', district: 'Dakar', type: 'rue', coords: [14.700, -17.475] },
  { name: 'Corniche Est', district: 'Plateau', type: 'rue', coords: [14.670, -17.422] },
  { name: 'Marché Sandaga', district: 'Plateau', type: 'marche', coords: [14.672, -17.438] },
  { name: 'Marché Kermel', district: 'Plateau', type: 'marche', coords: [14.668, -17.434] },
  { name: 'Port Autonome de Dakar', district: 'Plateau', type: 'monument', coords: [14.670, -17.425] },
  { name: 'Cathédrale du Souvenir Africain', district: 'Plateau', type: 'monument', coords: [14.668, -17.435] },
  { name: 'Grande Mosquée de Dakar', district: 'Plateau', type: 'monument', coords: [14.671, -17.440] },
  { name: 'Musée des Civilisations Noires', district: 'Plateau', type: 'musee', coords: [14.675, -17.437] },
  { name: 'Musée IFAN', district: 'Plateau', type: 'musee', coords: [14.669, -17.437] },
  { name: 'Hôpital Principal de Dakar', district: 'Plateau', type: 'hopital', coords: [14.671, -17.434] },
  { name: 'Palais de la République', district: 'Plateau', type: 'monument', coords: [14.667, -17.436] },
  { name: 'Assemblée Nationale', district: 'Plateau', type: 'monument', coords: [14.668, -17.436] },
  { name: 'Gare Centrale (Lat Dior)', district: 'Plateau', type: 'gare', coords: [14.675, -17.438] },

  // ─────────────────────────────────────────────────────────────────────────────
  // MÉDINA, COLOBANE, GUEULE TAPÉE
  // ─────────────────────────────────────────────────────────────────────────────
  { name: 'Médina', district: 'Médina', type: 'quartier', coords: [14.685, -17.449] },
  { name: 'Colobane', district: 'Médina', type: 'quartier', coords: [14.6847, -17.4518] },
  { name: 'Gueule Tapée', district: 'Médina', type: 'quartier', coords: [14.682, -17.447] },
  { name: 'Marché Tilène', district: 'Médina', type: 'marche', coords: [14.684, -17.452] },
  { name: 'Marché Colobane', district: 'Médina', type: 'marche', coords: [14.683, -17.450] },

  // ─────────────────────────────────────────────────────────────────────────────
  // FANN, POINT E, AMITIÉ, UNIVERSITÉ
  // ─────────────────────────────────────────────────────────────────────────────
  { name: 'Fann Résidence', district: 'Fann', type: 'quartier', coords: [14.685, -17.465] },
  { name: 'Point E', district: 'Fann', type: 'quartier', coords: [14.688, -17.460] },
  { name: 'Amitié', district: 'Fann', type: 'quartier', coords: [14.690, -17.458] },
  { name: 'Hôpital Fann (Neurologie)', district: 'Fann', type: 'hopital', coords: [14.688, -17.465] },
  { name: 'Hôpital Le Dantec', district: 'Fann', type: 'hopital', coords: [14.683, -17.456] },
  { name: 'Université Cheikh Anta Diop (UCAD)', district: 'Fann', type: 'ecole', coords: [14.690, -17.460] },
  { name: 'CESAG', district: 'Fann', type: 'ecole', coords: [14.692, -17.461] },

  // ─────────────────────────────────────────────────────────────────────────────
  // HLM, DIEUPPEUL, LIBERTÉ, SICAP
  // ─────────────────────────────────────────────────────────────────────────────
  { name: 'HLM (Ensemble)', district: 'HLM', type: 'quartier', coords: [14.7183, -17.4444] },
  { name: 'Marché HLM', district: 'HLM', type: 'marche', coords: [14.718, -17.446] },
  { name: 'Dieuppeul', district: 'Dieuppeul', type: 'quartier', coords: [14.7168, -17.4500] },
  { name: 'Liberté 1', district: 'Sicap', type: 'quartier', coords: [14.703, -17.462] },
  { name: 'Liberté 2', district: 'Sicap', type: 'quartier', coords: [14.706, -17.462] },
  { name: 'Liberté 3', district: 'Sicap', type: 'quartier', coords: [14.708, -17.465] },
  { name: 'Liberté 4', district: 'Sicap', type: 'quartier', coords: [14.710, -17.468] },
  { name: 'Liberté 5', district: 'Sicap', type: 'quartier', coords: [14.715, -17.445] },
  { name: 'Liberté 6', district: 'Sicap', type: 'quartier', coords: [14.720, -17.440] },
  { name: 'Sicap Baobab', district: 'Sicap', type: 'quartier', coords: [14.712, -17.455] },
  { name: 'Sicap Mbao', district: 'Sicap', type: 'quartier', coords: [14.714, -17.450] },
  { name: 'Sacré-Cœur', district: 'Sicap', type: 'quartier', coords: [14.7183, -17.4628] },
  { name: 'Rond-Point Jet d\'Eau', district: 'Sicap', type: 'monument', coords: [14.705, -17.442] },

  // ─────────────────────────────────────────────────────────────────────────────
  // OUAKAM, ALMADIES, NGOR, YOFF
  // ─────────────────────────────────────────────────────────────────────────────
  { name: 'Ouakam', district: 'Ouakam', type: 'quartier', coords: [14.721, -17.488] },
  { name: 'Les Mamelles', district: 'Ouakam', type: 'monument', coords: [14.72, -17.49] },
  { name: 'Monument de la Renaissance', district: 'Ouakam', type: 'monument', coords: [14.724, -17.493] },
  { name: 'Almadies', district: 'Almadies', type: 'quartier', coords: [14.75, -17.51] },
  { name: 'Ngor', district: 'Ngor', type: 'quartier', coords: [14.75, -17.49] },
  { name: 'Île de Ngor', district: 'Ngor', type: 'plage', coords: [14.754, -17.490] },
  { name: 'Plage de N\'Gor', district: 'Ngor', type: 'plage', coords: [14.752, -17.491] },
  { name: 'Plage des Almadies', district: 'Almadies', type: 'plage', coords: [14.748, -17.516] },
  { name: 'Yoff', district: 'Yoff', type: 'quartier', coords: [14.755, -17.470] },
  { name: 'Aéroport LSS (Léopold Sédar Senghor)', district: 'Ngor', type: 'gare', coords: [14.74, -17.48] },

  // ─────────────────────────────────────────────────────────────────────────────
  // GRAND YOFF, PARCELLES, CAMBERENE, NORD FOIRE
  // ─────────────────────────────────────────────────────────────────────────────
  { name: 'Grand Yoff', district: 'Grand Yoff', type: 'quartier', coords: [14.74, -17.43] },
  { name: 'Parcelles Assainies (Units 1-26)', district: 'Parcelles', type: 'quartier', coords: [14.76, -17.44] },
  { name: 'Cambérène', district: 'Cambérène', type: 'quartier', coords: [14.758, -17.415] },
  { name: 'Nord Foire', district: 'Parcelles', type: 'quartier', coords: [14.7528, -17.4595] },
  { name: 'Patte d\'Oie', district: 'Dakar', type: 'quartier', coords: [14.73, -17.42] },
  { name: 'Hann Maristes', district: 'Hann', type: 'quartier', coords: [14.7320, -17.4450] },
  { name: 'Hann Bel-Air', district: 'Hann', type: 'quartier', coords: [14.7103, -17.4350] },
  { name: 'Parc de Hann', district: 'Hann', type: 'sport', coords: [14.727, -17.436] },
  { name: 'Castors', district: 'Dakar', type: 'quartier', coords: [14.71, -17.43] },
  { name: 'Stade Léopold Sédar Senghor', district: 'Dakar', type: 'sport', coords: [14.74, -17.41] },

  // ─────────────────────────────────────────────────────────────────────────────
  // DÉPARTEMENT DE PIKINE
  // ─────────────────────────────────────────────────────────────────────────────
  { name: 'Pikine Ouest', district: 'Pikine', type: 'quartier', coords: [14.748, -17.405] },
  { name: 'Pikine Nord', district: 'Pikine', type: 'quartier', coords: [14.753, -17.400] },
  { name: 'Pikine Est', district: 'Pikine', type: 'quartier', coords: [14.746, -17.395] },
  { name: 'Gare Pikine', district: 'Pikine', type: 'gare', coords: [14.75, -17.40] },
  { name: 'Dalifort', district: 'Pikine', type: 'quartier', coords: [14.738, -17.407] },
  { name: 'Djiddah Thiaroye Kao', district: 'Pikine', type: 'quartier', coords: [14.742, -17.390] },
  { name: 'Guinaw Rail Nord', district: 'Pikine', type: 'quartier', coords: [14.751, -17.390] },
  { name: 'Guinaw Rail Sud', district: 'Pikine', type: 'quartier', coords: [14.748, -17.390] },
  { name: 'Tivaouane Diacksao', district: 'Pikine', type: 'quartier', coords: [14.75, -17.37] },
  { name: 'Diamaguène Sicap Mbao', district: 'Pikine', type: 'quartier', coords: [14.755, -17.36] },
  { name: 'Mbao', district: 'Pikine', type: 'quartier', coords: [14.745, -17.34] },
  { name: 'Thiaroye sur Mer', district: 'Pikine', type: 'quartier', coords: [14.738, -17.375] },
  { name: 'Thiaroye Gare', district: 'Pikine', type: 'gare', coords: [14.742, -17.370] },
  { name: 'Technopole de Dakar', district: 'Pikine', type: 'monument', coords: [14.734, -17.405] },
  { name: 'Arène Nationale', district: 'Pikine', type: 'sport', coords: [14.755, -17.395] },
  { name: 'Marché Central au Poisson (Pikine)', district: 'Pikine', type: 'marche', coords: [14.748, -17.400] },
  { name: 'Baux Maraîchers', district: 'Pikine', type: 'quartier', coords: [14.73, -17.40] },

  // ─────────────────────────────────────────────────────────────────────────────
  // DÉPARTEMENT DE GUÉDIAWAYE
  // ─────────────────────────────────────────────────────────────────────────────
  { name: 'Guédiawaye Centre', district: 'Guédiawaye', type: 'quartier', coords: [14.78, -17.39] },
  { name: 'Golf Sud', district: 'Guédiawaye', type: 'quartier', coords: [14.778, -17.402] },
  { name: 'Sam Notaire', district: 'Guédiawaye', type: 'quartier', coords: [14.785, -17.385] },
  { name: 'Ndiarème Limamoulaye', district: 'Guédiawaye', type: 'quartier', coords: [14.782, -17.378] },
  { name: 'Wakhinane Nimzatt', district: 'Guédiawaye', type: 'quartier', coords: [14.789, -17.388] },
  { name: 'Cité Gadaye', district: 'Guédiawaye', type: 'cite', coords: [14.78, -17.37] },
  { name: 'Stade Amadou Barry', district: 'Guédiawaye', type: 'sport', coords: [14.780, -17.393] },
  { name: 'Daroukhane', district: 'Guédiawaye', type: 'quartier', coords: [14.79, -17.38] },

  // ─────────────────────────────────────────────────────────────────────────────
  // DÉPARTEMENT DE KEUR MASSAR
  // ─────────────────────────────────────────────────────────────────────────────
  { name: 'Keur Massar Nord', district: 'Keur Massar', type: 'quartier', coords: [14.790, -17.310] },
  { name: 'Keur Massar Sud', district: 'Keur Massar', type: 'quartier', coords: [14.783, -17.305] },
  { name: 'Yeumbeul Nord', district: 'Keur Massar', type: 'quartier', coords: [14.780, -17.315] },
  { name: 'Yeumbeul Sud', district: 'Keur Massar', type: 'quartier', coords: [14.775, -17.315] },
  { name: 'Malika', district: 'Keur Massar', type: 'quartier', coords: [14.80, -17.33] },
  { name: 'Jaxaay-Parcelles-Niakoul Rab', district: 'Keur Massar', type: 'quartier', coords: [14.775, -17.280] },

  // ─────────────────────────────────────────────────────────────────────────────
  // DÉPARTEMENT DE RUFISQUE
  // ─────────────────────────────────────────────────────────────────────────────
  { name: 'Rufisque Est', district: 'Rufisque', type: 'quartier', coords: [14.715, -17.265] },
  { name: 'Rufisque Ouest', district: 'Rufisque', type: 'quartier', coords: [14.712, -17.278] },
  { name: 'Rufisque Nord', district: 'Rufisque', type: 'quartier', coords: [14.720, -17.272] },
  { name: 'Grand Marché de Rufisque', district: 'Rufisque', type: 'marche', coords: [14.714, -17.272] },
  { name: 'Diokoul', district: 'Rufisque', type: 'quartier', coords: [14.712, -17.268] },
  { name: 'Dangou', district: 'Rufisque', type: 'quartier', coords: [14.710, -17.270] },
  { name: 'Bargny', district: 'Rufisque', type: 'quartier', coords: [14.70, -17.23] },
  { name: 'Diamniadio (Pôle Urbain)', district: 'Rufisque', type: 'quartier', coords: [14.70, -17.15] },
  { name: 'Dakar Arena', district: 'Rufisque', type: 'sport', coords: [14.703, -17.151] },
  { name: 'Stade Me Abdoulaye Wade', district: 'Rufisque', type: 'sport', coords: [14.705, -17.150] },
  { name: 'CICAD (Centre Int. Commerce Diamniadio)', district: 'Rufisque', type: 'monument', coords: [14.701, -17.148] },
  { name: 'Sangalkam', district: 'Rufisque', type: 'quartier', coords: [14.75, -17.23] },
  { name: 'Bambylor', district: 'Rufisque', type: 'quartier', coords: [14.760, -17.200] },
  { name: 'Sébikotane', district: 'Rufisque', type: 'quartier', coords: [14.730, -17.140] },
  { name: 'Sendou', district: 'Rufisque', type: 'quartier', coords: [14.685, -17.178] },
  { name: 'Yène', district: 'Rufisque', type: 'quartier', coords: [14.65, -17.15] },
  { name: 'Tivaouane Peulh-Niaga', district: 'Rufisque', type: 'quartier', coords: [14.760, -17.255] },
  { name: 'Jaxaay', district: 'Rufisque', type: 'quartier', coords: [14.75, -17.28] },
]
