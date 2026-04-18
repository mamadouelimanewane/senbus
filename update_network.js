const fs = require('fs');

const dakarStops = [
  { id: 'palais', name: 'Gare Palais', x: 20, y: 70, district: 'Plateau' },
  { id: 'independance', name: 'Place de l\\'Indépendance', x: 22, y: 68, district: 'Plateau' },
  { id: 'sandaga', name: 'Marché Sandaga', x: 24, y: 65, district: 'Plateau' },
  { id: 'petersen', name: 'Gare Petersen', x: 25, y: 65, district: 'Terminus center' },
  { id: 'medina', name: 'Médina', x: 28, y: 60, district: 'Médina' },
  { id: 'fass', name: 'Fass', x: 26, y: 56, district: 'Fass-Colobane' },
  { id: 'colobane', name: 'Colobane', x: 38, y: 58, district: 'Gare routiere' },
  { id: 'hlm', name: 'HLM', x: 42, y: 52, district: 'HLM' },
  { id: 'castors', name: 'Castors', x: 45, y: 48, district: 'Dieuppeul' },
  { id: 'liberte6', name: 'Liberté 6', x: 55, y: 40, district: 'VDN' },
  { id: 'sacrecoeur', name: 'Sacré-Cœur', x: 48, y: 45, district: 'SICAP' },
  { id: 'point-e', name: 'Point E', x: 25, y: 50, district: 'Point E' },
  { id: 'fann', name: 'Fann', x: 15, y: 55, district: 'Corniche' },
  { id: 'mermoz', name: 'Mermoz', x: 16, y: 40, district: 'Mermoz-Sacré-Cœur' },
  { id: 'ouakam', name: 'Ouakam', x: 18, y: 30, district: 'Mamelles' },
  { id: 'ngor', name: 'Ngor', x: 10, y: 15, district: 'Almadies' },
  { id: 'yoff', name: 'Yoff', x: 25, y: 10, district: 'Aéroport' },
  { id: 'grand-yoff', name: 'Grand Yoff', x: 50, y: 42, district: 'Dakar' },
  { id: 'patte-oie', name: 'Patte d\\'Oie', x: 60, y: 45, district: 'Patte d\\'Oie' },
  { id: 'parcelles', name: 'Parcelles Assainies', x: 75, y: 25, district: 'Unité 15' },
  { id: 'cambrene', name: 'Cambérène', x: 78, y: 20, district: 'Cambérène' },
  { id: 'guediawaye', name: 'Guédiawaye', x: 85, y: 35, district: 'Banlieue' },
  { id: 'pikine', name: 'Pikine', x: 70, y: 60, district: 'Marché' },
  { id: 'bounkheling', name: 'Bounkheling Pikine', x: 72, y: 62, district: 'Pikine' },
  { id: 'yeumbeul', name: 'Yeumbeul', x: 82, y: 50, district: 'Banlieue' },
  { id: 'malika', name: 'Malika', x: 90, y: 45, district: 'Littoral' },
  { id: 'thiaroye-azur', name: 'Thiaroye Azur', x: 80, y: 65, district: 'Banlieue' },
  { id: 'thiaroye-gare', name: 'Thiaroye Gare', x: 78, y: 68, district: 'Banlieue' },
  { id: 'mbao', name: 'Mbao', x: 85, y: 68, district: 'Banlieue' },
  { id: 'keur-mbaye-fall', name: 'Keur Mbaye Fall', x: 86, y: 69, district: 'Banlieue' },
  { id: 'keur-massar', name: 'Keur Massar', x: 88, y: 70, district: 'Vilon' },
  { id: 'rufisque', name: 'Rufisque', x: 95, y: 80, district: 'Banlieue' },
  { id: 'bargny', name: 'Bargny', x: 96, y: 85, district: 'Banlieue' },
  { id: 'diamniadio', name: 'Diamniadio', x: 98, y: 90, district: 'Nouvelle Ville' },
  { id: 'sebikotane', name: 'Sébikotane', x: 99, y: 95, district: 'Périphérie' }
];

let networkContent = fs.readFileSync('src/data/network.ts', 'utf8');

const stopsPattern = /export const stops: Stop\[\] = \[([\s\S]*?)\];/;
const newStopsStr = "export const stops: Stop[] = [\n" + dakarStops.map(s => `  { id: '${s.id}', name: '${s.name.replace(/'/g, "\\'")}', x: ${s.x}, y: ${s.y}, district: '${s.district.replace(/'/g, "\\'")}' },`).join("\n") + "\n];";

networkContent = networkContent.replace(stopsPattern, newStopsStr);
fs.writeFileSync('src/data/network.ts', networkContent);
console.log("Updated stops.");
