/**
 * SunuBus – Glossaire Complet de la Région de Dakar (v4.2)
 * ═════════════════════════════════════════════════════════
 * Base de données exhaustive incluant les départements de Dakar,
 * Pikine, Guédiawaye, Keur Massar et Rufisque.
 */

export interface Landmark {
  name: string
  district: string
  type: 'quartier' | 'rue' | 'monument' | 'hopital' | 'marche' | 'gare' | 'ecole' | 'sport' | 'hotel' | 'musee' | 'plage' | 'cite'
  coords?: [number, number]
}

export const DAKAR_LANDMARKS: Landmark[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // DÉPARTEMENT DE DAKAR (PLATEAU, MÉDINA, ALMADIES, ETC.)
  // ─────────────────────────────────────────────────────────────────────────────
  { name: 'Dakar-Plateau', district: 'Dakar', type: 'quartier' },
  { name: 'Place de l\'Indépendance', district: 'Dakar', type: 'monument' },
  { name: 'Musée des Civilisations Noires', district: 'Dakar', type: 'musee' },
  { name: 'Médina', district: 'Dakar', type: 'quartier' },
  { name: 'Gueule Tapée', district: 'Dakar', type: 'quartier' },
  { name: 'Fann Résidence', district: 'Dakar', type: 'quartier' },
  { name: 'Point E', district: 'Dakar', type: 'quartier' },
  { name: 'Almadies', district: 'Dakar', type: 'quartier' },
  { name: 'Ngor', district: 'Dakar', type: 'quartier' },
  { name: 'Ouakam', district: 'Dakar', type: 'quartier' },
  { name: 'Yoff', district: 'Dakar', type: 'quartier' },
  { name: 'Grand Yoff', district: 'Dakar', type: 'quartier' },
  { name: 'Parcelles Assainies (Unit 1-26)', district: 'Dakar', type: 'quartier' },
  { name: 'Monument Renaissance', district: 'Dakar', type: 'monument' },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // DÉPARTEMENT DE PIKINE (BANLIEUE PROCHE)
  // ─────────────────────────────────────────────────────────────────────────────
  { name: 'Pikine Ouest', district: 'Pikine', type: 'quartier' },
  { name: 'Pikine Nord', district: 'Pikine', type: 'quartier' },
  { name: 'Pikine Est', district: 'Pikine', type: 'quartier' },
  { name: 'Dalifort', district: 'Pikine', type: 'quartier' },
  { name: 'Djiddah Thiaroye Kao', district: 'Pikine', type: 'quartier' },
  { name: 'Guinaw Rail Nord', district: 'Pikine', type: 'quartier' },
  { name: 'Guinaw Rail Sud', district: 'Pikine', type: 'quartier' },
  { name: 'Tivaouane Diacksao', district: 'Pikine', type: 'quartier' },
  { name: 'Diamaguène Sicap Mbao', district: 'Pikine', type: 'quartier' },
  { name: 'Mbao', district: 'Pikine', type: 'quartier' },
  { name: 'Thiaroye sur Mer', district: 'Pikine', type: 'quartier' },
  { name: 'Thiaroye Gare', district: 'Pikine', type: 'quartier' },
  { name: 'Technopole', district: 'Pikine', type: 'monument' },
  { name: 'Arène Nationale', district: 'Pikine', type: 'sport' },
  { name: 'Marché Central au Poisson', district: 'Pikine', type: 'marche' },
  { name: 'Bountou Pikine', district: 'Pikine', type: 'monument' },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // DÉPARTEMENT DE GUÉDIAWAYE
  // ─────────────────────────────────────────────────────────────────────────────
  { name: 'Guédiawaye (Centre)', district: 'Guédiawaye', type: 'quartier' },
  { name: 'Golf Sud', district: 'Guédiawaye', type: 'quartier' },
  { name: 'Sam Notaire', district: 'Guédiawaye', type: 'quartier' },
  { name: 'Ndiarème Limamoulaye', district: 'Guédiawaye', type: 'quartier' },
  { name: 'Wakhinane Nimzatt', district: 'Guédiawaye', type: 'quartier' },
  { name: 'Stade Amadou Barry', district: 'Guédiawaye', type: 'sport' },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // DÉPARTEMENT DE KEUR MASSAR (CRÉÉ EN 2021)
  // ─────────────────────────────────────────────────────────────────────────────
  { name: 'Keur Massar Nord', district: 'Keur Massar', type: 'quartier' },
  { name: 'Keur Massar Sud', district: 'Keur Massar', type: 'quartier' },
  { name: 'Yeumbeul Nord', district: 'Keur Massar', type: 'quartier' },
  { name: 'Yeumbeul Sud', district: 'Keur Massar', type: 'quartier' },
  { name: 'Malika', district: 'Keur Massar', type: 'quartier' },
  { name: 'Jaxaay-Parcelles-Niakoul Rab', district: 'Keur Massar', type: 'quartier' },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // DÉPARTEMENT DE RUFISQUE (BANLIEUE EST & PÔLE URBAIN)
  // ─────────────────────────────────────────────────────────────────────────────
  { name: 'Rufisque Est', district: 'Rufisque', type: 'quartier' },
  { name: 'Rufisque Ouest', district: 'Rufisque', type: 'quartier' },
  { name: 'Rufisque Nord', district: 'Rufisque', type: 'quartier' },
  { name: 'Diokoul', district: 'Rufisque', type: 'quartier' },
  { name: 'Dangou', district: 'Rufisque', type: 'quartier' },
  { name: 'Bargny', district: 'Rufisque', type: 'quartier' },
  { name: 'Diamniadio (Pôle Urbain)', district: 'Rufisque', type: 'quartier' },
  { name: 'Sangalkam', district: 'Rufisque', type: 'quartier' },
  { name: 'Bambylor', district: 'Rufisque', type: 'quartier' },
  { name: 'Sébikotane', district: 'Rufisque', type: 'quartier' },
  { name: 'Sendou', district: 'Rufisque', type: 'quartier' },
  { name: 'Yène', district: 'Rufisque', type: 'quartier' },
  { name: 'Tivaouane Peulh-Niaga', district: 'Rufisque', type: 'quartier' },
  { name: 'CICAD (Diamniadio)', district: 'Rufisque', type: 'monument' },
  { name: 'Dakar Arena', district: 'Rufisque', type: 'sport' },
  { name: 'Stade Me Abdoulaye Wade', district: 'Rufisque', type: 'sport' },
  { name: 'Grand Marché de Rufisque', district: 'Rufisque', type: 'marche' },
]
