/**
 * Server HTTP statico + proxy CORS per l'API Allerta Meteo Emilia-Romagna (Zero dipendenze).
 *
 * Motivazione architetturale:
 * L'endpoint ufficiale ARPAE è dietro una cache Varnish (X-Varnish, X-Cache-TTL: 120s)
 * che espone `Vary: Accept-Encoding` ma NON `Vary: Origin`. Di conseguenza, se una
 * richiesta senza header `Origin` (o con un `Origin` differente) viene messa in cache da
 * Varnish, i client browser successivi possono ricevere un header `Access-Control-Allow-Origin`
 * assente o non corrispondente alla propria origine.
 *
 * Questo server Node.js (avviabile con `npm start`):
 * 1. Serve i file statici compilati in `/dist`
 * 2. Espone `/api/sensori` inoltrando i parametri `variabile` e `time` all'endpoint configurato
 *    e aggiungendo header CORS coerenti (`Access-Control-Allow-Origin: *`).
 */

import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT ?? 3000);
const TARGET_BASE_URL =
  process.env.ARPAE_API_URL ??
  'https://allertameteo.regione.emilia-romagna.it/o/api/allerta/get-sensor-values-no-time';
const DEFAULT_VARIABILE = '254,0,0/1,-,-,-/B13215';
const DIST_DIR = path.resolve(__dirname, '../dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function proxySensori(req, res, requestUrl) {
  const variabile = requestUrl.searchParams.get('variabile') ?? DEFAULT_VARIABILE;
  const time =
    requestUrl.searchParams.get('time') ??
    String(Math.floor(Date.now() / 3_600_000) * 3_600_000 + 3_600_000);

  const upstreamUrl = new URL(TARGET_BASE_URL);
  upstreamUrl.searchParams.set('variabile', variabile);
  upstreamUrl.searchParams.set('time', time);

  const client = upstreamUrl.protocol === 'https:' ? https : http;

  const proxyReq = client.get(
    upstreamUrl,
    {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'MonitoraggioIdraulicoER-Proxy/1.0',
      },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 502, {
        'Content-Type': proxyRes.headers['content-type'] ?? 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
        'Cache-Control': 'no-cache',
      });
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', (err) => {
    res.writeHead(502, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(
      JSON.stringify({
        error: 'Errore di connessione verso API ARPAE',
        details: err.message,
      })
    );
  });
}

function serveStaticFile(req, res, pathname) {
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const resolvedPath = path.resolve(DIST_DIR, '.' + safePath);

  if (!resolvedPath.startsWith(DIST_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Accesso negato');
    return;
  }

  fs.stat(resolvedPath, (err, stats) => {
    const targetFile = !err && stats.isFile() ? resolvedPath : path.join(DIST_DIR, 'index.html');
    fs.readFile(targetFile, (readErr, content) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('File non trovato. Esegui prima "npm run build".');
        return;
      }
      const ext = path.extname(targetFile).toLowerCase();
      const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
}

export function createServer() {
  return http.createServer((req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
      });
      res.end();
      return;
    }

    const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    if (requestUrl.pathname === '/api/sensori') {
      proxySensori(req, res, requestUrl);
      return;
    }

    serveStaticFile(req, res, requestUrl.pathname);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const server = createServer();
  server.listen(PORT, () => {
    console.log(
      `[Proxy Monitoraggio Idraulico ER] In ascolto su http://localhost:${PORT} (upstream: ${TARGET_BASE_URL})`
    );
  });
}

