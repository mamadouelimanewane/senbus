/**
 * Configuration globale — SunuBus
 * Clés API et constantes de l'application
 */

export const LOCATIONIQ_KEY = 'pk.ef8f3d80db02a286ae4b6fae736af632'

// Endpoint Directions (OSRM-compatible, no CORS issues)
export const LOCATIONIQ_DIRECTIONS_URL = 'https://us1.locationiq.com/v1/directions/driving'

// Endpoint Geocoding (pour futures recherches d'adresses)
export const LOCATIONIQ_GEOCODING_URL = 'https://us1.locationiq.com/v1/search'

// Délai entre appels API en ms (évite rate-limiting)
export const API_THROTTLE_MS = 200

// Nombre max de waypoints par requête LocationIQ
export const MAX_WAYPOINTS_PER_REQUEST = 25
