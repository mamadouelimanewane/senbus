
import { stops, lines, buses } from '../src/data/network';
import { findJourneys, getSearchResults } from '../src/lib/transit';
import { getLineRoadGeometry, getDistanceKm } from '../src/lib/routing';

async function runTests() {
  console.log('--- DEBUT DES TESTS SUNUBUS v4.2 ---');

  // 1. Test Recherche
  console.log('\n[1] Test Recherche:');
  const search1 = getSearchResults('Plateau');
  console.log(`Besoins Plateau: Found ${search1.length} results.`);
  const search2 = getSearchResults('Pikine');
  console.log(`Besoins Pikine: Found ${search2.length} results.`);
  
  // 2. Test Routage (Sanitisation & Mer)
  console.log('\n[2] Test Géométrie:');
  const ddd1 = lines.find(l => l.id === 'DDD-1');
  if (ddd1) {
    const road = getLineRoadGeometry(ddd1.id, ddd1.stopIds);
    const seaPoints = road.coords.filter(c => c[0] < 14.65 || c[1] > -17.41 && c[0] < 14.70);
    console.log(`DDD-1: Total points=${road.coords.length}. Sea points detected=${seaPoints.length}`);
  }

  // 3. Test Planificateur (Origin -> Dest)
  console.log('\n[3] Test Planificateur:');
  const start = 'palais'; // Plateau
  const end = 'rufisque'; // Rufisque
  const journeys = findJourneys(start, end);
  console.log(`Palais -> Rufisque: Found ${journeys.length} alternatives.`);
  if (journeys.length > 0) {
    console.log(`Shortest duration: ${journeys[0].totalDurationMin} min`);
    console.log(`First segment: ${journeys[0].segments[0].kind} via ${journeys[0].segments[0].line?.code ?? 'N/A'}`);
  }

  const complexPath = findJourneys('parcelles', 'almadies');
  console.log(`Parcelles -> Almadies: Found ${complexPath.length} alternatives.`);

  console.log('\n--- FIN DES TESTS ---');
}

runTests().catch(e => console.error(e));
