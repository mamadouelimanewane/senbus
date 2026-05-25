export interface Stop {
  name: string;
  coords: [number, number];
}

export interface BusLine {
  id: string;
  name: string;
  itinerary: Stop[];
  color: string;
  frequency: number; // minutes
}

export const STOPS: Record<string, Stop> = {
  PARCELLES: { name: "Parcelles Assainies", coords: [14.7569, -17.4347] },
  LECLERC: { name: "Place Leclerc", coords: [14.6680, -17.4330] },
  OUAKAM: { name: "Ouakam", coords: [14.7239, -17.4892] },
  AEROPORT: { name: "Aéroport LSS", coords: [14.7394, -17.4900] },
  GUEDIAWAYE: { name: "Guédiawaye", coords: [14.7833, -17.4000] },
  KEUR_MASSAR: { name: "Keur Massar", coords: [14.7864, -17.3119] },
  RUFISQUE: { name: "Rufisque", coords: [14.7167, -17.2667] },
  MALIKA: { name: "Malika", coords: [14.7939, -17.3378] },
  JAXAAY: { name: "Jaxaay", coords: [14.7644, -17.2857] },
  BAUX_MARAICHERS: { name: "Baux Maraîchers", coords: [14.7411, -17.4022] },
  LIBERTE_6: { name: "Liberté 6", coords: [14.7130, -17.4470] },
  LIBERTE_5: { name: "Liberté 5", coords: [14.7110, -17.4520] },
  DIEUPPEUL: { name: "Dieuppeul", coords: [14.7060, -17.4560] },
  PALAIS: { name: "Palais de Justice", coords: [14.6600, -17.4380] },
  THIAROYE: { name: "Thiaroye", coords: [14.7550, -17.3600] },
  COLOBANE: { name: "Colobane", coords: [14.6930, -17.4410] },
  CASTORS: { name: "Castors", coords: [14.7110, -17.4380] },
  VDN: { name: "VDN", coords: [14.7380, -17.4600] },
  RELAIS: { name: "Relais", coords: [14.6980, -17.4540] },
  FANN: { name: "Hôpital Fann", coords: [14.6900, -17.4650] },
  SCAT_URBAM: { name: "Scat Urbam", coords: [14.7370, -17.4340] },
  PIKINE: { name: "Pikine", coords: [14.7600, -17.3900] },
  POINT_E: { name: "Point E", coords: [14.6950, -17.4520] },
  LAT_DIOR: { name: "Lat Dior", coords: [14.6730, -17.4420] },
  ALMADIES: { name: "Almadies", coords: [14.7380, -17.5020] },
  MBAO: { name: "Mbao", coords: [14.7480, -17.3200] },
  CAMBERENE: { name: "Cambérène", coords: [14.7600, -17.4100] },
  SANGALKAM: { name: "Sangalkam", coords: [14.7800, -17.2200] },
  BARGNY: { name: "Bargny", coords: [14.7000, -17.2300] },
  YENNE: { name: "Yenne", coords: [14.6500, -17.2000] },
  DIAMNIADIO: { name: "Diamniadio", coords: [14.7100, -17.1800] },
  YEUMBEUL: { name: "Yeumbeul", coords: [14.7700, -17.3500] },
  GRAND_YOFF: { name: "Grand Yoff", coords: [14.7300, -17.4400] },
  NGOR: { name: "Ngor", coords: [14.7460, -17.4980] }
};

export const BUS_LINES: BusLine[] = [
  {
    id: "1",
    name: "Parcelles ↔ Leclerc",
    color: "#e63946",
    frequency: 10,
    itinerary: [STOPS.PARCELLES, STOPS.VDN, STOPS.RELAIS, STOPS.COLOBANE, STOPS.LECLERC]
  },
  {
    id: "4",
    name: "Liberté 5 ↔ Leclerc",
    color: "#38bdf8",
    frequency: 12,
    itinerary: [STOPS.LIBERTE_5, STOPS.DIEUPPEUL, STOPS.POINT_E, STOPS.COLOBANE, STOPS.LECLERC]
  },
  {
    id: "7",
    name: "Ouakam ↔ Palais 2",
    color: "#10b981",
    frequency: 15,
    itinerary: [STOPS.OUAKAM, STOPS.FANN, STOPS.POINT_E, STOPS.LAT_DIOR, STOPS.PALAIS]
  },
  {
    id: "8",
    name: "Aéroport ↔ Palais 2",
    color: "#f59e0b",
    frequency: 15,
    itinerary: [STOPS.AEROPORT, STOPS.PIKINE, STOPS.BAUX_MARAICHERS, STOPS.COLOBANE, STOPS.PALAIS]
  },
  {
    id: "11",
    name: "Keur Massar ↔ Lat Dior",
    color: "#8b5cf6",
    frequency: 20,
    itinerary: [STOPS.KEUR_MASSAR, STOPS.MBAO, STOPS.THIAROYE, STOPS.PIKINE, STOPS.LAT_DIOR]
  },
  {
    id: "2",
    name: "Daroukhane ↔ Leclerc",
    color: "#ec4899",
    frequency: 15,
    itinerary: [STOPS.GUEDIAWAYE, STOPS.PIKINE, STOPS.COLOBANE, STOPS.LECLERC]
  },
  {
    id: "5",
    name: "Guédiawaye ↔ Palais 1",
    color: "#f97316",
    frequency: 15,
    itinerary: [STOPS.GUEDIAWAYE, STOPS.PIKINE, STOPS.COLOBANE, STOPS.PALAIS]
  },
  {
    id: "15",
    name: "Rufisque ↔ Palais 1",
    color: "#06b6d4",
    frequency: 25,
    itinerary: [STOPS.RUFISQUE, STOPS.MBAO, STOPS.THIAROYE, STOPS.COLOBANE, STOPS.PALAIS]
  },
  {
    id: "16A",
    name: "Malika ↔ Palais 1",
    color: "#10b981",
    frequency: 20,
    itinerary: [STOPS.MALIKA, STOPS.YEUMBEUL, STOPS.PIKINE, STOPS.COLOBANE, STOPS.PALAIS]
  },
  {
    id: "221",
    name: "Gadaye ↔ Almadies",
    color: "#fbbf24",
    frequency: 20,
    itinerary: [STOPS.GUEDIAWAYE, STOPS.SCAT_URBAM, STOPS.NGOR, STOPS.ALMADIES]
  },
  {
    id: "228",
    name: "Rufisque ↔ Yenne",
    color: "#f43f5e",
    frequency: 30,
    itinerary: [STOPS.RUFISQUE, STOPS.BARGNY, STOPS.DIAMNIADIO, STOPS.YENNE]
  }
];
