import { Capacitor } from '@capacitor/core'
import type { ApiNetwork, ApiSnapshot } from '../types'

// Sur mobile (Android/iOS), localhost pointe vers l'appareil lui-mme.
// Pour le developpement, on pourrait utiliser l'IP de la machine.
// En production, on utilisera l'URL de l'API SunuBus.
export const API_BASE = Capacitor.isNativePlatform() 
  ? 'https://api.sunubus.sn' // Placeholder pour la prod
  : 'http://localhost:8787'

async function requestJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`)
  if (!response.ok) {
    throw new Error(`Erreur API ${response.status}`)
  }

  return (await response.json()) as T
}

export function fetchNetwork(): Promise<ApiNetwork> {
  return requestJson<ApiNetwork>('/api/network')
}

export function fetchSnapshot(): Promise<ApiSnapshot> {
  return requestJson<ApiSnapshot>('/api/snapshot')
}
