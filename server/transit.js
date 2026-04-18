import { buses, lines, stops } from './data.js'

const stopById = new Map(stops.map((stop) => [stop.id, stop]))
const lineById = new Map(lines.map((line) => [line.id, line]))
const routeCache = new Map()

function getRouteMetrics(line) {
  const cached = routeCache.get(line.id)
  if (cached) {
    return cached
  }

  const points = line.stopIds.map((stopId) => stopById.get(stopId)).filter(Boolean)
  const segments = []
  let totalLength = 0

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index]
    const next = points[index + 1]
    const length = Math.hypot(next.x - current.x, next.y - current.y)
    segments.push(length)
    totalLength += length
  }

  const stopRatios = {}
  let traveled = 0
  points.forEach((point, index) => {
    stopRatios[point.id] = totalLength === 0 ? 0 : traveled / totalLength
    traveled += segments[index] ?? 0
  })

  const metrics = { points, segments, totalLength, stopRatios }
  routeCache.set(line.id, metrics)
  return metrics
}

export function tickBuses() {
  buses.forEach((bus) => {
    const line = lineById.get(bus.lineId)
    if (!line) {
      return
    }

    const delta = (1 / (line.baseMinutes * 60)) * bus.speedFactor
    bus.progress = (bus.progress + delta) % 1
  })
}

export function getSnapshot() {
  return {
    buses,
    updatedAt: new Date().toISOString(),
  }
}

export function getNetwork() {
  return { stops, lines, buses }
}

export function getPredictions(stopId) {
  return buses
    .map((bus) => {
      const line = lineById.get(bus.lineId)
      if (!line || !line.stopIds.includes(stopId)) {
        return null
      }

      const { stopRatios } = getRouteMetrics(line)
      const stopRatio = stopRatios[stopId]
      const current = ((bus.progress % 1) + 1) % 1
      const distanceRatio = stopRatio >= current ? stopRatio - current : 1 - current + stopRatio
      const etaMin = distanceRatio < 0.008 ? 0 : distanceRatio * (line.baseMinutes / bus.speedFactor)

      return {
        etaMin,
        bus,
        line,
      }
    })
    .filter(Boolean)
    .sort((left, right) => left.etaMin - right.etaMin)
}
