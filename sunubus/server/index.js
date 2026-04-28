// server/index.js — Serveur de développement minimal
// Émet des positions GPS simulées pour les bus

import http from 'node:http';

const PORT = 8788;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') { res.writeHead(200); return res.end(); }

  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', service: 'sunubus-dev' }));
  }

  if (req.url === '/api/positions') {
    // Simulation simple de 30 bus
    const buses = Array.from({ length: 30 }, (_, i) => ({
      busId: `BUS-${i + 1}`,
      operator: i % 3 === 0 ? 'tata' : 'ddd',
      lat: 14.7 + Math.random() * 0.1 - 0.05,
      lng: -17.45 + Math.random() * 0.15 - 0.075,
      heading: Math.random() * 360,
      speed_kmh: 15 + Math.random() * 30,
      updated: new Date().toISOString(),
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(buses));
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`✓ SunuBus dev server running on http://localhost:${PORT}`);
});
