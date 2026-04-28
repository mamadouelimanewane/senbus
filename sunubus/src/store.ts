// ============================================================
// SunuBus — store.ts  v5.0
// Gestion d'état (favoris, préférences, historique)
// ============================================================

const STORAGE_KEY = 'sunubus.state.v1';

export interface AppState {
  favorites_lines: string[];   // line ids
  favorites_stops: string[];   // stop ids
  history_searches: string[];  // last 10 queries
  preferences: {
    trajet: 'rapide' | 'marche' | 'correspondances';
    notif_retards: boolean;
    notif_descente: boolean;
    lang: 'fr' | 'wo';
  };
  user_position: { lat: number; lng: number } | null;
}

const DEFAULT_STATE: AppState = {
  favorites_lines: [],
  favorites_stops: [],
  history_searches: [],
  preferences: {
    trajet: 'rapide',
    notif_retards: true,
    notif_descente: true,
    lang: 'fr',
  },
  user_position: null,
};

let state: AppState = loadState();

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

export function getState(): AppState { return state; }

export function toggleFavoriteLine(id: string): boolean {
  const idx = state.favorites_lines.indexOf(id);
  if (idx === -1) state.favorites_lines.push(id);
  else            state.favorites_lines.splice(idx, 1);
  saveState();
  return idx === -1;
}

export function toggleFavoriteStop(id: string): boolean {
  const idx = state.favorites_stops.indexOf(id);
  if (idx === -1) state.favorites_stops.push(id);
  else            state.favorites_stops.splice(idx, 1);
  saveState();
  return idx === -1;
}

export function isFavoriteLine(id: string): boolean {
  return state.favorites_lines.includes(id);
}

export function isFavoriteStop(id: string): boolean {
  return state.favorites_stops.includes(id);
}

export function pushSearch(q: string) {
  if (!q || q.length < 2) return;
  state.history_searches = [q, ...state.history_searches.filter(s => s !== q)].slice(0, 10);
  saveState();
}

export function setPreference<K extends keyof AppState['preferences']>(
  key: K, value: AppState['preferences'][K]
) {
  state.preferences[key] = value;
  saveState();
}

export function setUserPosition(lat: number, lng: number) {
  state.user_position = { lat, lng };
  saveState();
}

export function clearAll() {
  state = { ...DEFAULT_STATE };
  localStorage.removeItem(STORAGE_KEY);
}
