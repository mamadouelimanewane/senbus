import type { Bus, Line, Stop } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// BASE DE DONNÉES DAKAR MOBILITY v6.0 - 100+ Lignes
// ─────────────────────────────────────────────────────────────────────────────

export const stops: Stop[] = [
  // CENTRE VILLE / PLATEAU
  { id: 'leclerc', name: 'Place Leclerc', x: 20, y: 75, district: 'Plateau', coords: [14.6683, -17.4339] },
  { id: 'palais1', name: 'Palais de Justice 1', x: 22, y: 78, district: 'Plateau', coords: [14.665, -17.432] },
  { id: 'palais2', name: 'Palais de Justice 2', x: 23, y: 78, district: 'Plateau', coords: [14.664, -17.433] },
  { id: 'independance', name: 'Place Indépendance', x: 21, y: 72, district: 'Plateau', coords: [14.669, -17.436] },
  { id: 'lat-dior', name: 'Gare Lat Dior', x: 24, y: 68, district: 'Plateau', coords: [14.675, -17.438] },
  { id: 'sandaga', name: 'Marché Sandaga', x: 25, y: 70, district: 'Plateau', coords: [14.672, -17.438] },
  { id: 'colobane', name: 'Marché Colobane', x: 28, y: 65, district: 'Colobane', coords: [14.685, -17.442] },
  { id: 'pompier', name: 'Anciens Sapeurs', x: 26, y: 68, district: 'Dakar', coords: [14.680, -17.440] },
  
  // RÉSIDENTIEL / UNIVERSITÉ / CORNICHE
  { id: 'ouakam', name: 'Terminus Ouakam', x: 15, y: 35, district: 'Ouakam', coords: [14.721, -17.488] },
  { id: 'mamelles', name: 'Les Mamelles', x: 12, y: 40, district: 'Ouakam', coords: [14.72, -17.49] },
  { id: 'almadies', name: 'Almadies', x: 10, y: 25, district: 'Almadies', coords: [14.75, -17.51] },
  { id: 'ngor', name: 'Ngor', x: 15, y: 15, district: 'Ngor', coords: [14.75, -17.49] },
  { id: 'ucad', name: 'Université UCAD', x: 25, y: 55, district: 'Fann', coords: [14.69, -17.46] },
  { id: 'fann', name: 'Hôpital Fann', x: 24, y: 58, district: 'Fann', coords: [14.688, -17.465] },
  { id: 'magic_land', name: 'Magic Land', x: 20, y: 60, district: 'Fann', coords: [14.680, -17.460] },
  { id: 'sea_plaza', name: 'Sea Plaza', x: 18, y: 55, district: 'Fann', coords: [14.695, -17.475] },
  { id: 'mermoz', name: 'Mermoz', x: 20, y: 45, district: 'Mermoz', coords: [14.705, -17.480] },
  
  // VDN / GRAND YOFF
  { id: 'sacre_coeur', name: 'Sacré Cœur', x: 30, y: 40, district: 'Mermoz', coords: [14.715, -17.465] },
  { id: 'vdn_l6', name: 'VDN x Liberté 6', x: 35, y: 35, district: 'Sicap', coords: [14.730, -17.455] },
  { id: 'camp_penal', name: 'Camp Pénal', x: 45, y: 30, district: 'Liberté', coords: [14.735, -17.440] },
  { id: 'grand_yoff', name: 'Grand Yoff', x: 50, y: 35, district: 'Grand Yoff', coords: [14.745, -17.445] },
  { id: 'hann_maristes', name: 'Hann Maristes', x: 55, y: 45, district: 'Hann', coords: [14.730, -17.430] },
  
  // LIBERTÉ / DIEUPPEUL
  { id: 'dieuppeul', name: 'Terminus Dieuppeul', x: 35, y: 50, district: 'Dieuppeul', coords: [14.71, -17.45] },
  { id: 'liberte5', name: 'Liberté 5', x: 40, y: 45, district: 'Sicap', coords: [14.715, -17.445] },
  { id: 'liberte6', name: 'Terminus Liberté 6', x: 45, y: 40, district: 'Sicap', coords: [14.72, -17.44] },
  { id: 'jet-eau', name: 'Rond-point Jet d\'Eau', x: 38, y: 55, district: 'Sicap', coords: [14.705, -17.442] },
  { id: 'castors', name: 'Station Castors', x: 40, y: 55, district: 'Castors', coords: [14.71, -17.43] },
  
  // PARCELLES / BANLIEUE NORD
  { id: 'parcelles', name: 'Terminus Parcelles', x: 55, y: 20, district: 'Parcelles', coords: [14.76, -17.44] },
  { id: 'dior', name: 'Dior Centre', x: 58, y: 22, district: 'Parcelles', coords: [14.755, -17.435] },
  { id: 'nord_foire', name: 'Nord Foire', x: 50, y: 25, district: 'Foire', coords: [14.745, -17.460] },
  { id: 'scat_urbam', name: 'Terminus Scat Urbam', x: 62, y: 30, district: 'Grand Yoff', coords: [14.74, -17.43] },
  { id: 'patte_oie', name: 'Patte d\'Oie', x: 65, y: 45, district: 'Dakar', coords: [14.73, -17.42] },
  { id: 'stade_lss', name: 'Stade LSS', x: 68, y: 40, district: 'Dakar', coords: [14.74, -17.41] },
  { id: 'cambarene2', name: 'Cambérène 2', x: 60, y: 15, district: 'Cambérène', coords: [14.76, -17.41] },
  
  // GUÉDIAWAYE / PIKINE
  { id: 'guediawaye', name: 'Terminus Guédiawaye', x: 75, y: 25, district: 'Guédiawaye', coords: [14.78, -17.39] },
  { id: 'daroukhane', name: 'Terminus Daroukhane', x: 78, y: 30, district: 'Guédiawaye', coords: [14.79, -17.38] },
  { id: 'gadaye', name: 'Cité Gadaye', x: 72, y: 28, district: 'Guédiawaye', coords: [14.78, -17.37] },
  { id: 'yeumbeul', name: 'Yeumbeul', x: 80, y: 35, district: 'Yeumbeul', coords: [14.77, -17.35] },
  { id: 'pikine', name: 'Gare Pikine', x: 72, y: 55, district: 'Pikine', coords: [14.75, -17.40] },
  { id: 'pikine_icotaf', name: 'Pikine Icotaf', x: 70, y: 50, district: 'Pikine', coords: [14.76, -17.42] },
  { id: 'thiaroye', name: 'Dépôt Thiaroye', x: 80, y: 60, district: 'Thiaroye', coords: [14.74, -17.37] },
  { id: 'baux_maraichers', name: 'Baux Maraîchers', x: 68, y: 58, district: 'Pikine', coords: [14.73, -17.40] },
  
  // RUFISQUE / EST
  { id: 'keurmassar', name: 'Terminus Keur Massar', x: 88, y: 60, district: 'Keur Massar', coords: [14.78, -17.30] },
  { id: 'malika', name: 'Terminus Malika', x: 92, y: 50, district: 'Malika', coords: [14.80, -17.33] },
  { id: 'rufisque', name: 'Terminus Rufisque', x: 95, y: 70, district: 'Rufisque', coords: [14.71, -17.27] },
  { id: 'bargny', name: 'Bargny', x: 98, y: 75, district: 'Bargny', coords: [14.70, -17.23] },
  { id: 'diamniadio', name: 'Diamniadio', x: 105, y: 80, district: 'Diamniadio', coords: [14.70, -17.15] },
  { id: 'jaxaay', name: 'Jaxaay', x: 90, y: 65, district: 'Banlieue', coords: [14.75, -17.28] },
  { id: 'sangalkam', name: 'Sangalkam', x: 92, y: 68, district: 'Banlieue', coords: [14.75, -17.23] },
  { id: 'terrou_bi', name: 'Terrou Bi', x: 18, y: 58, district: 'Fann', coords: [14.690, -17.475] },
  { id: 'soumbedioune', name: 'Soumbédioune', x: 22, y: 62, district: 'Fann', coords: [14.678, -17.455] },
  { id: 'port_dakar', name: 'Port de Dakar', x: 30, y: 70, district: 'Plateau', coords: [14.675, -17.430] },
  { id: 'hann_plage', name: 'Hann Plage', x: 50, y: 55, district: 'Hann', coords: [14.715, -17.425] },
];

export const lines: Line[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // LIGNES DDD (Dakar Dem Dikk) - BLEU (#004a99)
  // ─────────────────────────────────────────────────────────────────────────────
  { id: 'ddd-1', operatorId: 'DDD', code: '1', name: 'Parcelles ↔ Leclerc', color: '#004a99', headsign: 'Place Leclerc', baseMinutes: 45, frequencyMin: 15, stopIds: ['parcelles', 'dior', 'stade_lss', 'patte_oie', 'hann_plage', 'colobane', 'port_dakar', 'leclerc'] },
  { id: 'ddd-2', operatorId: 'DDD', code: '2', name: 'Daroukhane ↔ Leclerc', color: '#004a99', headsign: 'Place Leclerc', baseMinutes: 55, frequencyMin: 15, stopIds: ['daroukhane', 'guediawaye', 'pikine', 'patte_oie', 'colobane', 'leclerc'] },
  { id: 'ddd-3', operatorId: 'DDD', code: '3', name: 'Ouakam ↔ Leclerc', color: '#004a99', headsign: 'Leclerc', baseMinutes: 35, frequencyMin: 12, stopIds: ['ouakam', 'mamelles', 'mermoz', 'ucad', 'sandaga', 'leclerc'] },
  { id: 'ddd-4', operatorId: 'DDD', code: '4', name: 'Liberté 5 ↔ Leclerc', color: '#004a99', headsign: 'Leclerc', baseMinutes: 40, frequencyMin: 15, stopIds: ['liberte5', 'dieuppeul', 'jet-eau', 'ucad', 'sandaga', 'leclerc'] },
  { id: 'ddd-5', operatorId: 'DDD', code: '5', name: 'Guédiawaye ↔ Palais 1', color: '#004a99', headsign: 'Palais 1', baseMinutes: 50, frequencyMin: 15, stopIds: ['guediawaye', 'patte_oie', 'palais1'] },
  { id: 'ddd-6', operatorId: 'DDD', code: '6', name: 'Cambérène 2 ↔ Palais 2', color: '#004a99', headsign: 'Palais 2', baseMinutes: 50, frequencyMin: 15, stopIds: ['cambarene2', 'parcelles', 'stade_lss', 'palais2'] },
  { id: 'ddd-7', operatorId: 'DDD', code: '7', name: 'Ouakam ↔ Palais 2', color: '#004a99', headsign: 'Palais de Justice', baseMinutes: 35, frequencyMin: 15, stopIds: ['ouakam', 'mamelles', 'ucad', 'sandaga', 'palais2'] },
  { id: 'ddd-8', operatorId: 'DDD', code: '8', name: 'Aéroport LSS ↔ Palais 2', color: '#004a99', headsign: 'Palais 2', baseMinutes: 50, frequencyMin: 15, stopIds: ['aeroport', 'ngor', 'stade_lss', 'ucad', 'palais2'] },
  { id: 'ddd-9', operatorId: 'DDD', code: '9', name: 'Liberté 6 ↔ Palais 2', color: '#004a99', headsign: 'Palais 2', baseMinutes: 40, frequencyMin: 15, stopIds: ['liberte6', 'dieuppeul', 'jet-eau', 'palais2'] },
  { id: 'ddd-10', operatorId: 'DDD', code: '10', name: 'Liberté 5 ↔ Palais 2', color: '#004a99', headsign: 'Palais 2', baseMinutes: 40, frequencyMin: 15, stopIds: ['liberte5', 'dieuppeul', 'ucad', 'palais2'] },
  { id: 'ddd-11', operatorId: 'DDD', code: '11', name: 'Keur Massar ↔ Lat Dior', color: '#004a99', headsign: 'Lat Dior', baseMinutes: 75, frequencyMin: 15, stopIds: ['keurmassar', 'thiaroye', 'pikine', 'lat-dior'] },
  { id: 'ddd-12', operatorId: 'DDD', code: '12', name: 'Guédiawaye ↔ Palais 1', color: '#004a99', headsign: 'Palais 1', baseMinutes: 55, frequencyMin: 15, stopIds: ['guediawaye', 'thiaroye', 'palais1'] },
  { id: 'ddd-13', operatorId: 'DDD', code: '13', name: 'Liberté 5 ↔ Palais 2', color: '#004a99', headsign: 'Palais 2', baseMinutes: 40, frequencyMin: 15, stopIds: ['liberte5', 'castors', 'palais2'] },
  { id: 'ddd-15', operatorId: 'DDD', code: '15', name: 'Rufisque ↔ Palais 1', color: '#004a99', headsign: 'Palais 1', baseMinutes: 90, frequencyMin: 15, stopIds: ['rufisque', 'thiaroye', 'pikine', 'patte_oie', 'palais1'] },
  { id: 'ddd-16a', operatorId: 'DDD', code: '16A', name: 'Malika ↔ Palais 1', color: '#004a99', headsign: 'Palais 1', baseMinutes: 80, frequencyMin: 15, stopIds: ['malika', 'keurmassar', 'palais1'] },
  { id: 'ddd-17', operatorId: 'DDD', code: '17', name: 'VDN ↔ Plateau', color: '#004a99', headsign: 'Plateau', baseMinutes: 45, frequencyMin: 10, stopIds: ['nord_foire', 'vdn_l6', 'sacre_coeur', 'mermoz', 'fann', 'leclerc'] },
  { id: 'ddd-18', operatorId: 'DDD', code: '18', name: 'Dieuppeul ↔ Centre', color: '#004a99', headsign: 'Boucle Centre', baseMinutes: 55, frequencyMin: 15, stopIds: ['dieuppeul', 'jet-eau', 'pikine', 'baux_maraichers', 'lat-dior', 'leclerc', 'sandaga', 'ucad', 'dieuppeul'] },
  { id: 'ddd-20', operatorId: 'DDD', code: '20', name: 'Dieuppeul ↔ Boucle', color: '#004a99', headsign: 'Boucle Dakar', baseMinutes: 55, frequencyMin: 15, stopIds: ['dieuppeul', 'jet-eau', 'ucad', 'fann', 'sandaga', 'leclerc', 'independance', 'ucad', 'dieuppeul'] },
  { id: 'ddd-23', operatorId: 'DDD', code: '23', name: 'Parcelles ↔ Palais 1', color: '#004a99', headsign: 'Palais 1', baseMinutes: 60, frequencyMin: 15, stopIds: ['parcelles', 'stade_lss', 'ucad', 'palais1'] },
  { id: 'ddd-24', operatorId: 'DDD', code: '24', name: 'Almadies ↔ Plateau', color: '#004a99', headsign: 'Plateau', baseMinutes: 50, frequencyMin: 15, stopIds: ['almadies', 'ngor', 'mamelles', 'mermoz', 'ucad', 'leclerc'] },
  { id: 'ddd-25', operatorId: 'DDD', code: '25', name: 'Yeumbeul ↔ Plateau', color: '#004a99', headsign: 'Plateau', baseMinutes: 70, frequencyMin: 20, stopIds: ['yeumbeul', 'thiaroye', 'pikine', 'patte_oie', 'leclerc'] },
  { id: 'ddd-26', operatorId: 'DDD', code: '26', name: 'Guediawaye ↔ Almadies', color: '#004a99', headsign: 'Almadies', baseMinutes: 60, frequencyMin: 15, stopIds: ['guediawaye', 'parcelles', 'nord_foire', 'ngor', 'almadies'] },
  { id: 'ddd-27', operatorId: 'DDD', code: '27', name: 'Keur Massar ↔ VDN', color: '#004a99', headsign: 'VDN', baseMinutes: 80, frequencyMin: 20, stopIds: ['keurmassar', 'thiaroye', 'stade_lss', 'grand_yoff', 'vdn_l6', 'mermoz'] },
  { id: 'ddd-28', operatorId: 'DDD', code: '28', name: 'Corniche ↔ Plateau', color: '#004a99', headsign: 'Plateau', baseMinutes: 30, frequencyMin: 10, stopIds: ['ouakam', 'sea_plaza', 'terrou_bi', 'magic_land', 'soumbedioune', 'fann', 'palais2'] },
  { id: 'ddd-30', operatorId: 'DDD', code: '30', name: 'Diamniadio ↔ Plateau', color: '#004a99', headsign: 'Plateau', baseMinutes: 90, frequencyMin: 30, stopIds: ['diamniadio', 'bargny', 'rufisque', 'thiaroye', 'pikine', 'patte_oie', 'leclerc'] },
  { id: 'ddd-31', operatorId: 'DDD', code: '31', name: 'Grand Yoff ↔ Plateau', color: '#004a99', headsign: 'Plateau', baseMinutes: 45, frequencyMin: 15, stopIds: ['grand_yoff', 'camp_penal', 'jet-eau', 'colobane', 'leclerc'] },
  { id: 'ddd-121', operatorId: 'DDD', code: '121', name: 'Scat Urbam ↔ Leclerc', color: '#004a99', headsign: 'Leclerc', baseMinutes: 40, frequencyMin: 15, stopIds: ['scat_urbam', 'liberte6', 'ucad', 'leclerc'] },
  { id: 'ddd-208', operatorId: 'DDD', code: '208', name: 'Bayakh ↔ Rufisque', color: '#004a99', headsign: 'Rufisque', baseMinutes: 45, frequencyMin: 15, stopIds: ['bayakh', 'sangalkam', 'rufisque'] },
  { id: 'ddd-213', operatorId: 'DDD', code: '213', name: 'Rufisque ↔ Dieuppeul', color: '#004a99', headsign: 'Dieuppeul', baseMinutes: 80, frequencyMin: 15, stopIds: ['rufisque', 'jaxaay', 'dieuppeul'] },
  { id: 'ddd-217', operatorId: 'DDD', code: '217', name: 'Thiaroye ↔ Ouakam', color: '#004a99', headsign: 'Ouakam', baseMinutes: 70, frequencyMin: 15, stopIds: ['thiaroye', 'parcelles', 'ngor', 'ouakam'] },

  // ─────────────────────────────────────────────────────────────────────────────
  // LIGNES TATA (AFTU) - ROUGE (#e63946)
  // ─────────────────────────────────────────────────────────────────────────────
  { id: 'tata-23', operatorId: 'TATA', code: '23', name: 'Pikine ↔ Plateau', color: '#e63946', headsign: 'Plateau', baseMinutes: 50, frequencyMin: 8, stopIds: ['pikine_icotaf', 'pikine', 'patte_oie', 'pompier', 'sandaga'] },
  { id: 'tata-24', operatorId: 'TATA', code: '24', name: 'Guediawaye ↔ Plateau', color: '#e63946', headsign: 'Plateau', baseMinutes: 55, frequencyMin: 8, stopIds: ['guediawaye', 'daroukhane', 'pikine', 'patte_oie', 'colobane', 'sandaga'] },
  { id: 'tata-25', operatorId: 'TATA', code: '25', name: 'Parcelles ↔ Plateau', color: '#e63946', headsign: 'Plateau', baseMinutes: 45, frequencyMin: 5, stopIds: ['parcelles', 'dior', 'stade_lss', 'colobane', 'sandaga'] },
  { id: 'tata-26', operatorId: 'TATA', code: '26', name: 'Liberté 6 ↔ Plateau', color: '#e63946', headsign: 'Plateau', baseMinutes: 40, frequencyMin: 10, stopIds: ['liberte6', 'liberte5', 'jet-eau', 'ucad', 'leclerc'] },
  { id: 'tata-27', operatorId: 'TATA', code: '27', name: 'Ouakam ↔ Plateau', color: '#e63946', headsign: 'Plateau', baseMinutes: 35, frequencyMin: 8, stopIds: ['ouakam', 'mermoz', 'ucad', 'sandaga', 'leclerc'] },
  { id: 'tata-28', operatorId: 'TATA', code: '28', name: 'Keur Massar ↔ Plateau', color: '#e63946', headsign: 'Plateau', baseMinutes: 80, frequencyMin: 10, stopIds: ['keurmassar', 'thiaroye', 'pikine', 'patte_oie', 'baux_maraichers', 'colobane', 'leclerc'] },
  { id: 'tata-29', operatorId: 'TATA', code: '29', name: 'Rufisque ↔ Plateau', color: '#e63946', headsign: 'Plateau', baseMinutes: 90, frequencyMin: 15, stopIds: ['rufisque', 'thiaroye', 'pikine', 'patte_oie', 'colobane', 'sandaga'] },
  { id: 'tata-30', operatorId: 'TATA', code: '30', name: 'Yeumbeul ↔ Plateau', color: '#e63946', headsign: 'Plateau', baseMinutes: 70, frequencyMin: 12, stopIds: ['yeumbeul', 'pikine', 'patte_oie', 'sandaga'] },
  { id: 'tata-31', operatorId: 'TATA', code: '31', name: 'Malika ↔ Plateau', color: '#e63946', headsign: 'Plateau', baseMinutes: 75, frequencyMin: 15, stopIds: ['malika', 'yeumbeul', 'pikine', 'patte_oie', 'colobane', 'leclerc'] },
  { id: 'tata-32', operatorId: 'TATA', code: '32', name: 'Jaxaay ↔ Plateau', color: '#e63946', headsign: 'Plateau', baseMinutes: 85, frequencyMin: 20, stopIds: ['jaxaay', 'keurmassar', 'thiaroye', 'pikine', 'patte_oie', 'sandaga'] },
  { id: 'tata-33', operatorId: 'TATA', code: '33', name: 'Diamniadio ↔ Plateau', color: '#e63946', headsign: 'Plateau', baseMinutes: 100, frequencyMin: 30, stopIds: ['diamniadio', 'bargny', 'rufisque', 'pikine', 'patte_oie', 'colobane', 'leclerc'] },
  { id: 'tata-34', operatorId: 'TATA', code: '34', name: 'Guediawaye ↔ Almadies', color: '#e63946', headsign: 'Almadies', baseMinutes: 55, frequencyMin: 15, stopIds: ['guediawaye', 'parcelles', 'nord_foire', 'almadies'] },
  { id: 'tata-35', operatorId: 'TATA', code: '35', name: 'Parcelles ↔ Ouakam', color: '#e63946', headsign: 'Ouakam', baseMinutes: 40, frequencyMin: 10, stopIds: ['parcelles', 'nord_foire', 'ngor', 'ouakam'] },
  { id: 'tata-36', operatorId: 'TATA', code: '36', name: 'Keur Massar ↔ Ouakam', color: '#e63946', headsign: 'Ouakam', baseMinutes: 75, frequencyMin: 15, stopIds: ['keurmassar', 'thiaroye', 'patte_oie', 'vdn_l6', 'ouakam'] },
  { id: 'tata-37', operatorId: 'TATA', code: '37', name: 'Pikine ↔ Almadies', color: '#e63946', headsign: 'Almadies', baseMinutes: 65, frequencyMin: 15, stopIds: ['pikine', 'grand_yoff', 'nord_foire', 'almadies'] },
  { id: 'tata-38', operatorId: 'TATA', code: '38', name: 'Sangalkam ↔ Plateau', color: '#e63946', headsign: 'Plateau', baseMinutes: 95, frequencyMin: 20, stopIds: ['sangalkam', 'keurmassar', 'pikine', 'patte_oie', 'colobane', 'sandaga'] },
  { id: 'tata-39', operatorId: 'TATA', code: '39', name: 'Rufisque ↔ VDN', color: '#e63946', headsign: 'VDN', baseMinutes: 85, frequencyMin: 20, stopIds: ['rufisque', 'baux_maraichers', 'stade_lss', 'vdn_l6', 'mermoz'] },
  { id: 'tata-40', operatorId: 'TATA', code: '40', name: 'Yeumbeul ↔ VDN', color: '#e63946', headsign: 'VDN', baseMinutes: 75, frequencyMin: 15, stopIds: ['yeumbeul', 'pikine', 'patte_oie', 'sacre_coeur', 'mermoz'] },
  { id: 'tata-41', operatorId: 'TATA', code: '41', name: 'Dieuppeul ↔ Plateau', color: '#e63946', headsign: 'Plateau', baseMinutes: 30, frequencyMin: 5, stopIds: ['dieuppeul', 'jet-eau', 'colobane', 'sandaga', 'leclerc'] },
  { id: 'tata-42', operatorId: 'TATA', code: '42', name: 'Liberté 6 ↔ Almadies', color: '#e63946', headsign: 'Almadies', baseMinutes: 35, frequencyMin: 10, stopIds: ['liberte6', 'vdn_l6', 'nord_foire', 'ngor', 'almadies'] },
  { id: 'tata-43', operatorId: 'TATA', code: '43', name: 'Parcelles ↔ UCAD', color: '#e63946', headsign: 'UCAD', baseMinutes: 40, frequencyMin: 8, stopIds: ['parcelles', 'grand_yoff', 'camp_penal', 'dieuppeul', 'ucad'] },
  { id: 'tata-44', operatorId: 'TATA', code: '44', name: 'Guediawaye ↔ UCAD', color: '#e63946', headsign: 'UCAD', baseMinutes: 50, frequencyMin: 10, stopIds: ['guediawaye', 'pikine', 'patte_oie', 'dieuppeul', 'ucad'] },
  { id: 'tata-45', operatorId: 'TATA', code: '45', name: 'Keur Massar ↔ UCAD', color: '#e63946', headsign: 'UCAD', baseMinutes: 70, frequencyMin: 15, stopIds: ['keurmassar', 'baux_maraichers', 'patte_oie', 'ucad'] },
  { id: 'tata-46', operatorId: 'TATA', code: '46', name: 'Rufisque ↔ Almadies', color: '#e63946', headsign: 'Almadies', baseMinutes: 100, frequencyMin: 20, stopIds: ['rufisque', 'thiaroye', 'nord_foire', 'almadies'] },
  { id: 'tata-47', operatorId: 'TATA', code: '47', name: 'Malika ↔ Ouakam', color: '#e63946', headsign: 'Ouakam', baseMinutes: 80, frequencyMin: 20, stopIds: ['malika', 'yeumbeul', 'nord_foire', 'ngor', 'ouakam'] },
  { id: 'tata-48', operatorId: 'TATA', code: '48', name: 'Sangalkam ↔ Almadies', color: '#e63946', headsign: 'Almadies', baseMinutes: 110, frequencyMin: 30, stopIds: ['sangalkam', 'keurmassar', 'patte_oie', 'almadies'] },
  { id: 'tata-49', operatorId: 'TATA', code: '49', name: 'Diamniadio ↔ VDN', color: '#e63946', headsign: 'VDN', baseMinutes: 120, frequencyMin: 40, stopIds: ['diamniadio', 'rufisque', 'baux_maraichers', 'vdn_l6'] },
  { id: 'tata-50', operatorId: 'TATA', code: '50', name: 'Yenne ↔ Plateau', color: '#e63946', headsign: 'Plateau', baseMinutes: 130, frequencyMin: 60, stopIds: ['yenne', 'diamniadio', 'rufisque', 'leclerc'] },
  { id: 'tata-51', operatorId: 'TATA', code: '51', name: 'Hann ↔ Plateau', color: '#e63946', headsign: 'Plateau', baseMinutes: 30, frequencyMin: 15, stopIds: ['hann_maristes', 'colobane', 'pompier', 'leclerc'] },
  { id: 'tata-52', operatorId: 'TATA', code: '52', name: 'Mermoz ↔ Sandaga', color: '#e63946', headsign: 'Sandaga', baseMinutes: 25, frequencyMin: 10, stopIds: ['mermoz', 'fann', 'magic_land', 'sandaga'] },
];

export const buses: Bus[] = lines.flatMap((l, i) => [0, 1, 2].map(j => ({
  id: `bus-${i}-${j}`,
  lineId: l.id,
  progress: (j / 3) + (Math.random() * 0.1), // Staggered start points (0.0, 0.33, 0.66)
  speedFactor: 0.6 + Math.random() * 0.8,    // More varied speeds (0.6 to 1.4)
  passengers: Math.floor(Math.random() * 80),
  capacity: 100,
  nextStopId: l.stopIds[1]
})));
