import { stops, lines, vehicles, type Stop, type Line } from '../data/transit_data'

export interface Journey {
    type: 'direct' | 'transfer';
    lines: Line[];
    departure: Stop;
    destination: Stop;
    transferStop?: Stop;
}

export function getNearestStop(x: number, y: number): { stop: Stop; distance: number } {
  let nearest = stops[0]
  let minDistance = Infinity

  stops.forEach((stop) => {
    const dist = Math.hypot(stop.geom.x - x, stop.geom.y - y)
    if (dist < minDistance) {
      minDistance = dist
      nearest = stop
    }
  })
  return { stop: nearest, distance: minDistance }
}

export function searchIA(query: string): { departure?: Stop; destination?: Stop; journeys: Journey[] } {
    const normalized = query.toLowerCase()
    const departure = stops.find(s => normalized.includes(s.name.toLowerCase()) || normalized.includes(s.district.toLowerCase()))
    const destination = stops.find(s => normalized.includes(s.name.toLowerCase()) && s.id !== departure?.id)

    if (!departure || !destination) return { departure, destination, journeys: [] }

    const journeys: Journey[] = []

    // 1. Direct Lines
    lines.forEach(l => {
        const depIdx = l.stopIds.indexOf(departure.id)
        const destIdx = l.stopIds.indexOf(destination.id)
        if (depIdx !== -1 && destIdx !== -1 && depIdx < destIdx) {
            journeys.push({ type: 'direct', lines: [l], departure, destination })
        }
    })

    // 2. Transfers (1 stop)
    if (journeys.length === 0) {
        lines.forEach(l1 => {
            if (l1.stopIds.includes(departure.id)) {
                lines.forEach(l2 => {
                    if (l2.stopIds.includes(destination.id) && l1.id !== l2.id) {
                        // Find common stops
                        const commonStopId = l1.stopIds.find(id => l2.stopIds.includes(id) && id !== departure.id && id !== destination.id)
                        if (commonStopId) {
                            const l1DepIdx = l1.stopIds.indexOf(departure.id)
                            const l1TransIdx = l1.stopIds.indexOf(commonStopId)
                            const l2TransIdx = l2.stopIds.indexOf(commonStopId)
                            const l2DestIdx = l2.stopIds.indexOf(destination.id)

                            if (l1DepIdx < l1TransIdx && l2TransIdx < l2DestIdx) {
                                journeys.push({
                                    type: 'transfer',
                                    lines: [l1, l2],
                                    departure,
                                    destination,
                                    transferStop: stops.find(s => s.id === commonStopId)
                                })
                            }
                        }
                    }
                })
            }
        })
    }

    return { departure, destination, journeys: journeys.slice(0, 5) }
}

export function getPredictions(stopId: string) {
    return vehicles
        .filter(v => {
            const line = lines.find(l => l.id === v.lineId)
            return line && line.stopIds.includes(stopId)
        })
        .map(v => {
            const line = lines.find(l => l.id === v.lineId)!
            const stopIdx = line.stopIds.indexOf(stopId)
            const progressAtStop = stopIdx / (line.stopIds.length - 1)
            const diff = progressAtStop - v.progress
            const eta = diff > 0 ? diff * line.baseMinutes : (1 - v.progress + progressAtStop) * line.baseMinutes
            return { vehicle: v, line, eta: Math.round(eta) }
        })
        .sort((a, b) => a.eta - b.eta)
}

export function tickBuses() {
    vehicles.forEach(v => {
        v.progress = (v.progress + 0.001) % 1
    })
}

export function escapeHtml(str: string): string {
    return str.replace(/[&<>"']/g, function(m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m] as string;
    });
}
