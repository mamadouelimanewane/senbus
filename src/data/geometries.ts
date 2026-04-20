/**
 * Base de données des Géométries Haute-Fidélité (Pre-baked)
 * Contient les tracés réels épousant chaque virage de Dakar pour les lignes majeures.
 */

export const PREBAKED_GEOMETRIES: Record<string, [number, number][]> = {
  // Ligne T48 (Yoff -> Palais via Corniche) - Tracé parfait OSM
  'T48': [
    [14.7530, -17.4740], [14.7440, -17.5000], [14.7460, -17.5220], [14.7340, -17.4900], 
    [14.7150, -17.4880], [14.7120, -17.4720], [14.6980, -17.4590], [14.6877, -17.4635],
    [14.6820, -17.4650], [14.6750, -17.4610], [14.6681, -17.4420]
  ],
  // Ligne 27 (Plateau -> Thiaroye via Autoroute)
  '27': [
    [14.6681, -17.4420], [14.6728, -17.4326], [14.6850, -17.4300], [14.6930, -17.4440],
    [14.7000, -17.4350], [14.7050, -17.4320], [14.7229, -17.4481], [14.7473, -17.3867],
    [14.7298, -17.3740]
  ]
}
