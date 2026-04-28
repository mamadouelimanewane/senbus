/**
 * SunuBus — AI Intelligence Layer
 * Fournit une couche de compréhension en langage naturel pour le moteur de transport.
 */
import { stops } from '../data/network'
import { findJourneys, calculateFare } from './transit'
import type { Stop, PlannerJourney } from '../types'

export interface AISearchResult {
  origin?: Stop;
  destination?: Stop;
  intent: 'routing' | 'info' | 'complaint' | 'price' | 'unknown';
  message?: string;
  suggestedJourneys?: PlannerJourney[];
}

/**
 * Moteur d'IA Sémantique pour la recherche d'itinéraires.
 * Traduit "Je veux aller au marché depuis l'UCAD" en IDs exploitables.
 */
export async function processNaturalLanguage(query: string): Promise<AISearchResult> {
  const q = query.toLowerCase()
  let intent: AISearchResult['intent'] = 'unknown'
  let origin: Stop | undefined
  let destination: Stop | undefined
  let suggestedJourneys: PlannerJourney[] | undefined
  let message = ""

  // 1. Détection d'intention
  if (q.includes('tarif') || q.includes('prix') || q.includes('coût') || q.includes('combien') || q.includes('payer')) {
    intent = 'price'
  } else if (q.includes('aller') || q.includes('va') || q.includes('route') || q.includes('trajet') || q.includes('depuis') || q.includes('vers')) {
    intent = 'routing'
  }

  // 2. Mapping Sémantique (Vocabulaire Enrichi Dakarois)
  const stopMatches = stops.map(s => {
    let score = 0
    const name = s.name.toLowerCase()
    const id = s.id.toLowerCase()
    
    if (q.includes(name) || q.includes(id)) score += 10
    
    // --- DICTIONNAIRE SÉMANTIQUE ÉLARGI ---
    const mappings: Record<string, string[]> = {
      'ucad': ['université', 'fac', 'campus', 'faculté', 'cheikh anta diop', 'pavillon'],
      'sandaga': ['marché', 'centre-ville', 'avenue lamine gueye', 'pompiers', 'pont de fer'],
      'palais1': ['plateau', 'justice', 'republique', 'administration', 'cathedrale'],
      'palais2': ['plateau', 'justice', 'republique', 'rebeuss'],
      'leclerc': ['port', 'embarcadère', 'goree', 'chaloupe', 'douanes'],
      'aeroport': ['yoff', 'avion', 'terminal', 'piste', 'mermoz', 'vdn'],
      'stade_lss': ['stade', 'senghor', 'grand yoff', 'ecole normale', 'ecogare'],
      'colobane': ['parc', 'marché colobane', 'autoroute', 'pont de colobane'],
      'fann': ['hôpital', 'medecine', 'corniche', 'universitaire'],
      'ouakam': ['monument', 'renaissance', 'mamelles', 'mosquée de la divinité'],
      'almadies': ['pointe', 'hotels', 'ngor virage', 'ocean'],
      'pikine': ['banlieue', 'tally bou bess', 'thiaroye', 'icinac', 'gare routière'],
      'guediawaye': ['littoral', 'cité fadia', 'golf sud', 'noplay'],
      'parcelles': ['unité', 'dior', 'cambérène', 'nord foire'],
      'rufisque': ['vieille ville', 'bargny', 'sococim', 'pout', 'diamniadio'],
      'keurmassar': ['malika', 'yeumbeul', 'forêt classée', 'jiddah'],
      'jet-eau': ['hlm', 'sicap', 'dieuppeul', 'avenue bourguiba'],
      'liberte6': ['villas', 'vaca', 'grand dakar'],
      'baux_maraichers': ['gare routière', 'petersen', 'voyageurs', 'inter-urbain'],
      'sangalkam': ['zone verte', 'lac rose', 'niayes', 'jardin'],
      'diamniadio': ['pôle urbain', 'sphères', 'cicad', 'stade abdoulaye wade'],
      'yenne': ['plage', 'toubab dialaw', 'pêcheurs', 'sud-est']
    }

    if (mappings[s.id]) {
      for (const synonym of mappings[s.id]) {
        if (q.includes(synonym)) score += 10
      }
    }
    
    return { stop: s, score }
  }).filter(m => m.score > 0).sort((a, b) => b.score - a.score)

  // 3. Extraction Logique
  if (intent === 'routing') {
    const toKeywords = ['vers', 'à ', 'au ', 'pour ', 'jusqu\'à']
    const fromKeywords = ['depuis', 'de ', 'partant de', 'quittant']
    
    let toIndex = -1
    for (const k of toKeywords) { const i = q.indexOf(k); if (i !== -1) { toIndex = i; break } }
    let fromIndex = -1
    for (const k of fromKeywords) { const i = q.indexOf(k); if (i !== -1) { fromIndex = i; break } }

    if (stopMatches.length >= 2) {
      // Calculer un score de direction pour chaque arrêt détecté
      const scoredMatches = stopMatches.map(m => {
        const pos = q.indexOf(m.stop.name.toLowerCase())
        const dTo = toIndex !== -1 ? Math.abs(pos - toIndex) : 999
        const dFrom = fromIndex !== -1 ? Math.abs(pos - fromIndex) : 999
        // Plus le score est négatif, plus c'est probablement l'origine
        const dirScore = dTo - dFrom
        return { ...m, dirScore }
      })

      const sortedByDir = [...scoredMatches].sort((a, b) => a.dirScore - b.dirScore)
      origin = sortedByDir[0].stop
      destination = sortedByDir[sortedByDir.length - 1].stop
    } else if (stopMatches.length === 1) {
      destination = stopMatches[0].stop
      message = `Où êtes-vous actuellement ? Je peux vous proposer des trajets vers **${destination.name}**.`
    }
  }

  if (origin && destination) {
    suggestedJourneys = findJourneys(origin.id, destination.id)
    if (suggestedJourneys.length > 0) {
      const fare = calculateFare(suggestedJourneys[0].totalDistanceMeters || 0)
      message = `D'accord, j'ai trouvé **${suggestedJourneys.length}** options de trajet de **${origin.name}** vers **${destination.name}**. Le tarif estimé est de **${fare} FCFA**.`
    } else {
      message = `Je suis désolé, je n'ai pas trouvé de trajet direct ou avec correspondance entre **${origin.name}** et **${destination.name}**.`
    }
  } else if (intent === 'price' && !destination) {
    message = "Les tarifs SunuBus varient de **150 FCFA** (trajets courts) à **500 FCFA** (longues distances). Pour quel trajet souhaitez-vous connaître le prix ?"
  } else if (intent === 'routing' && !destination) {
    message = "Je n'ai pas trouvé de destination précise dans votre demande. Où souhaitez-vous aller ?"
  } else if (intent === 'unknown') {
    message = "Bonjour ! Je suis l'assistant SunuBus. Je peux vous aider à trouver un itinéraire ou vous renseigner sur les lignes."
  }

  return { origin, destination, intent, message, suggestedJourneys }
}

/**
 * Diagnostic IA : Vérifie si un itinéraire est "professionnel" (Topologie & Logique)
 */
export function diagnoseJourneyIA(journey: PlannerJourney): { score: number; feedback: string } {
  const transitLegs = journey.segments.filter(s => s.kind === 'direct' || s.kind === 'transfer')
  
  if (transitLegs.length === 0) return { score: 0, feedback: "Trajet vide" }
  
  let score = 100
  let feedback = "Itinéraire excellent"

  // 1. Trop de changements ?
  if (transitLegs.length > 2) {
    score -= 30
    feedback = "Trajet complexe avec plusieurs correspondances."
  }

  // 2. Temps de marche excessif ?
  const walkTime = journey.segments.filter(s => s.kind === 'walk').reduce((acc, s) => acc + (s.durationMin || 0), 0)
  if (walkTime > 20) {
    score -= 20
    feedback += " Attention: nécessite beaucoup de marche."
  }

  return { score, feedback }
}
