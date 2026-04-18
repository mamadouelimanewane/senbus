export interface Stop {
  id: string;
  name: string;
  geom: { x: number; y: number };
  district: string;
  photoUrl?: string;
}

export interface Line {
  id: string;
  operatorId: 'DDD' | 'AFTU';
  code: string;
  name: string;
  headsign: string;
  color: string;
  stopIds: string[];
  baseMinutes: number;
}

export interface Vehicle {
  id: string;
  plate: string;
  operatorId: 'DDD' | 'AFTU';
  lineId: string;
  progress: number; // 0 to 1
  capacity: number;
  passengers: number;
  status: 'active' | 'inactive' | 'maintenance';
}

export const stops: Stop[] = [
  { id: 'petersen', name: 'Gare Petersen', geom: { x: 25, y: 65 }, district: 'Plateau' },
  { id: 'sandaga', name: 'Marché Sandaga', geom: { x: 24, y: 65 }, district: 'Plateau' },
  { id: 'colobane', name: 'Colobane', geom: { x: 38, y: 58 }, district: 'Gare routière' },
  { id: 'guediawaye', name: 'Guédiawaye', geom: { x: 85, y: 15 }, district: 'Banlieue' },
  { id: 'parcelles', name: 'Parcelles Assainies', geom: { x: 70, y: 10 }, district: 'Parcelles' },
  { id: 'leclerc', name: 'Palais de Justice (Leclerc)', geom: { x: 18, y: 75 }, district: 'Plateau' },
  { id: 'palais', name: 'Gare Palais', geom: { x: 20, y: 70 }, district: 'Plateau' },
  { id: 'ouakam', name: 'Ouakam', geom: { x: 35, y: 40 }, district: 'Ouakam' },
  { id: 'mermoz', name: 'Mermoz', geom: { x: 38, y: 45 }, district: 'Mermoz' },
  { id: 'pikine', name: 'Pikine', geom: { x: 75, y: 35 }, district: 'Pikine' },
  { id: 'grand-yoff', name: 'HLM Grand Yoff', geom: { x: 55, y: 32 }, district: 'Grand Yoff' },
  { id: 'dieuppeul', name: 'Dieuppeul', geom: { x: 45, y: 48 }, district: 'Dieuppeul' },
  { id: 'camberene', name: 'Camberène', geom: { x: 78, y: 20 }, district: 'Camberène' },
  { id: 'fass', name: 'Fass Paillote', geom: { x: 28, y: 58 }, district: 'Fass' },
  { id: 'rufisque', name: 'Rufisque', geom: { x: 110, y: 60 }, district: 'Rufisque' },
  { id: 'fann', name: 'Terminus Fann / UCAD', geom: { x: 26, y: 52 }, district: 'Fann' },
  { id: 'castors', name: 'Marché Castors', geom: { x: 48, y: 44 }, district: 'Castors' },
  { id: 'yeumbeul', name: 'Yeumbeul', geom: { x: 92, y: 42 }, district: 'Yeumbeul' },
  { id: 'keur-massar', name: 'Keur Massar', geom: { x: 100, y: 48 }, district: 'Keur Massar' },
  { id: 'malika', name: 'Malika', geom: { x: 98, y: 35 }, district: 'Malika' },
  { id: 'thiaroye', name: 'Gare Thiaroye', geom: { x: 82, y: 46 }, district: 'Thiaroye' },
  { id: 'patte-oie', name: 'Patte d\'Oie', geom: { x: 58, y: 30 }, district: 'Patte d\'Oie' },
];

export const lines: Line[] = [
  {
    id: 'DDD-1A',
    operatorId: 'DDD',
    code: '1A',
    name: 'DDD 1A: Parcelles - Leclerc',
    headsign: 'Palais de Justice',
    color: '#2980b9',
    stopIds: ['parcelles', 'camberene', 'pikine', 'colobane', 'petersen', 'leclerc'],
    baseMinutes: 65
  },
  {
    id: 'DDD-2',
    operatorId: 'DDD',
    code: '2',
    name: 'DDD 2: Dieuppeul - Palais',
    headsign: 'Gare Palais',
    color: '#3498db',
    stopIds: ['dieuppeul', 'fass', 'petersen', 'palais'],
    baseMinutes: 35
  },
  {
    id: 'DDD-121',
    operatorId: 'DDD',
    code: '121',
    name: 'DDD 121: Grand Yoff - Leclerc',
    headsign: 'Palais de Justice',
    color: '#2980b9',
    stopIds: ['grand-yoff', 'mermoz', 'petersen', 'leclerc'],
    baseMinutes: 45
  },
  {
    id: 'DDD-15',
    operatorId: 'DDD',
    code: '15',
    name: 'DDD 15: Rufisque - Palais',
    headsign: 'Gare Palais',
    color: '#1a5276',
    stopIds: ['rufisque', 'pikine', 'colobane', 'petersen', 'palais'],
    baseMinutes: 80
  },
  {
    id: 'DDD-6',
    operatorId: 'DDD',
    code: '6',
    name: 'DDD 6: Camberène - Palais',
    headsign: 'Gare Palais',
    color: '#3498db',
    stopIds: ['camberene', 'pikine', 'fass', 'palais'],
    baseMinutes: 50
  },
  {
    id: 'DDD-7',
    operatorId: 'DDD',
    code: '7',
    name: 'DDD 7: Ouakam - Palais',
    headsign: 'Gare Palais',
    color: '#2980b9',
    stopIds: ['ouakam', 'fass', 'palais'],
    baseMinutes: 30
  },
  {
    id: 'AFTU-5',
    operatorId: 'AFTU',
    code: '5',
    name: 'AFTU 5: Guédiawaye - Palais',
    headsign: 'Gare Palais',
    color: '#10b981',
    stopIds: ['guediawaye', 'pikine', 'colobane', 'petersen', 'palais'],
    baseMinutes: 60
  },
  {
    id: 'AFTU-24',
    operatorId: 'AFTU',
    code: '24',
    name: 'AFTU 24: Guediawaye - Fann',
    headsign: 'Terminus Fann',
    color: '#10b981',
    stopIds: ['guediawaye', 'patte-oie', 'grand-yoff', 'castors', 'fann'],
    baseMinutes: 70
  },
  {
    id: 'AFTU-40',
    operatorId: 'AFTU',
    code: '40',
    name: 'AFTU 40: Ouakam - Petersen',
    headsign: 'Gare Petersen',
    color: '#10b981',
    stopIds: ['ouakam', 'mermoz', 'fass', 'petersen'],
    baseMinutes: 40
  },
  {
    id: 'AFTU-42',
    operatorId: 'AFTU',
    code: '42',
    name: 'AFTU 42: Parcelles - Petersen',
    headsign: 'Gare Petersen',
    color: '#10b981',
    stopIds: ['parcelles', 'patte-oie', 'grand-yoff', 'castors', 'colobane', 'petersen'],
    baseMinutes: 55
  },
  {
    id: 'AFTU-65',
    operatorId: 'AFTU',
    code: '65',
    name: 'AFTU 65: Yeumbeul - Leclerc',
    headsign: 'Palais de Justice',
    color: '#10b981',
    stopIds: ['yeumbeul', 'thiaroye', 'pikine', 'colobane', 'leclerc'],
    baseMinutes: 75
  },
  {
    id: 'AFTU-69',
    operatorId: 'AFTU',
    code: '69',
    name: 'AFTU 69: Keur Massar - Petersen',
    headsign: 'Gare Petersen',
    color: '#10b981',
    stopIds: ['keur-massar', 'malika', 'yeumbeul', 'thiaroye', 'pikine', 'colobane', 'petersen'],
    baseMinutes: 90
  }
];

export const vehicles: Vehicle[] = [
  { id: 'BUS-01', plate: 'DK-123-AA', operatorId: 'AFTU', lineId: 'AFTU-5', progress: 0.2, capacity: 45, passengers: 20, status: 'active' },
  { id: 'BUS-02', plate: 'DK-456-BB', operatorId: 'DDD', lineId: 'DDD-121', progress: 0.6, capacity: 65, passengers: 30, status: 'active' },
];
