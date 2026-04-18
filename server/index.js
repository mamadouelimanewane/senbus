import { createServer } from 'node:http'
import { existsSync, createReadStream, readFileSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { getNetwork, getPredictions, getSnapshot, tickBuses } from './transit.js'
import { buses, lines, stops } from './data.js'

const PORT = 8787
const DIST_DIR = resolve(process.cwd(), 'dist')

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(payload))
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = ''
    request.on('data', (chunk) => (body += chunk.toString()))
    request.on('end', () => {
      try {
        resolve(JSON.parse(body))
      } catch (e) {
        reject(e)
      }
    })
  })
}

function serveStatic(requestPath, response) {
  const filePath = requestPath === '/' ? join(DIST_DIR, 'index.html') : join(DIST_DIR, requestPath)
  const safePath = resolve(filePath)
  if (!safePath.startsWith(DIST_DIR) || !existsSync(safePath)) {
    return false
  }

  response.writeHead(200, {
    'Content-Type': mimeTypes[extname(safePath)] ?? 'application/octet-stream',
  })
  createReadStream(safePath).pipe(response)
  return true
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host}`)

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    response.end()
    return
  }

  // --- API ROUTES ---

  if (url.pathname === '/api/health') {
    sendJson(response, 200, { ok: true, service: 'sunu-bus-api' })
    return
  }

  if (url.pathname === '/api/network' && request.method === 'GET') {
    sendJson(response, 200, getNetwork())
    return
  }

  if (url.pathname === '/api/snapshot' && request.method === 'GET') {
    sendJson(response, 200, getSnapshot())
    return
  }

  if (url.pathname.startsWith('/api/stops/') && url.pathname.endsWith('/predictions')) {
    const stopId = url.pathname.split('/')[3]
    sendJson(response, 200, { stopId, predictions: getPredictions(stopId) })
    return
  }

  // BUSES CRUD
  if (url.pathname === '/api/buses' && request.method === 'POST') {
    readRequestBody(request).then(data => {
      const newBus = {
        id: `BUS-${Math.floor(Math.random() * 900) + 100}`,
        progress: 0,
        speedFactor: 0.9 + Math.random() * 0.2,
        capacity: data.capacity || 60,
        passengers: 0,
        plate: data.plate || 'DK-TEMP',
        lineId: data.lineId || 'A1'
      }
      buses.push(newBus)
      sendJson(response, 201, newBus)
    }).catch(err => sendJson(response, 400, { error: 'Invalid data' }))
    return
  }

  if (url.pathname.startsWith('/api/buses/') && request.method === 'DELETE') {
    const busId = url.pathname.split('/')[3]
    const index = buses.findIndex(b => b.id === busId)
    if (index !== -1) {
      buses.splice(index, 1)
      sendJson(response, 200, { ok: true, deleted: busId })
    } else {
      sendJson(response, 404, { error: 'Bus not found' })
    }
    return
  }

  // LINES CRUD (Simulated persistence in memory)
  if (url.pathname === '/api/lines' && request.method === 'POST') {
    readRequestBody(request).then(data => {
      const newLine = {
        id: data.id || `L-${Math.random().toString(36).substr(2, 5)}`,
        code: data.code,
        name: data.name,
        headsign: data.headsign,
        color: data.color || '#58a6ff',
        stopIds: data.stopIds || [],
        baseMinutes: data.baseMinutes || 30,
        frequencyMin: data.frequencyMin || 10
      }
      lines.push(newLine)
      sendJson(response, 201, newLine)
    }).catch(() => sendJson(response, 400, { error: 'Invalid data' }))
    return
  }

  // --- STATIC FILES ---

  if (existsSync(join(DIST_DIR, 'index.html'))) {
    if (serveStatic(url.pathname, response)) {
      return
    }
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    response.end(readFileSync(join(DIST_DIR, 'index.html')))
    return
  }

  sendJson(response, 404, { error: 'Not found' })
})

setInterval(() => {
  tickBuses()
}, 1000)

server.listen(PORT, () => {
  console.log(`SunuBus API disponible sur http://localhost:${PORT}`)
})
