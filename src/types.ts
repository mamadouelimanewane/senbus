export type Stop = {
  id: string
  name: string
  x: number
  y: number
  district: string
  coords?: [number, number]
}

export type Line = {
  id: string
  code: string
  name: string
  operatorId: 'DDD' | 'TATA' | 'AFTU-TATA'
  headsign: string
  color: string
  stopIds: string[]
  baseMinutes: number
  frequencyMin: number
}

export type Bus = {
  id: string
  lineId: string
  progress: number
  speedFactor: number
  capacity: number
  passengers: number
  plate?: string
  nextStopId?: string
}

export type RouteMetrics = {
  points: Stop[]
  segments: number[]
  totalLength: number
  stopRatios: Record<string, number>
}

export type Prediction = {
  etaMin: number
  bus: Bus
  line: Line
}

export type SearchResult =
  | {
      type: 'stop'
      stop: Stop
    }
  | {
      type: 'line'
      line: Line
    }
  | {
      type: 'other'
      id: string
      icon: string
      label: string
      subLabel: string
    }

export type PlannerSegment = {
  kind: 'direct' | 'transfer' | 'walk'
  line?: Line
  fromStop: Stop
  toStop: Stop
  durationMin: number
}

export type PlannerJourney = {
  totalDurationMin: number
  totalDistanceMeters?: number
  transferStop?: Stop
  segments: PlannerSegment[]
}

export type ApiNetwork = {
  stops: Stop[]
  lines: Line[]
  buses: Bus[]
}

export type ApiSnapshot = {
  buses: Bus[]
  updatedAt: string
}

export type UserLocation = {
  x: number
  y: number
  isReal: boolean
}
