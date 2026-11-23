import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { localHandler } from './api/projects.js';
import { createLocalStore } from './local-store.mjs';

const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.pdf': 'application/pdf' };
const port = Number(process.env.PORT || 3000);
const origin = `http://localhost:${port}`;
const databasePath = fileURLToPath(new URL('./.portfolio-local.sqlite', import.meta.url));
const handle = localHandler(createLocalStore(databasePath), process.env.ADMIN_PASSWORD || '7507115');
http.createServer(async (request, response) => {
  const url = new URL(request.url, origin);
  if (request.headers.host !== `localhost:${port}` || url.origin !== origin) {
    response.writeHead(403).end('Use the localhost URL printed by the server.');
    return;
  }
  try {
    if (url.pathname === '/api/projects') {
      const body = request.method === 'POST' ? request : undefined;
      const result = await handle(new Request(url, {
        method: request.method, headers: request.headers, body, duplex: 'half'
      }));
      response.writeHead(result.status, Object.fromEntries(result.headers));
      response.end(Buffer.from(await result.arrayBuffer()));
      return;
    }
    const path = { '/': '/index.html', '/admin': '/admin.html' }[url.pathname] ?? url.pathname;
    const type = types[extname(path)];
    if (!type || !/^\/[\w.-]+$/.test(path)) {
      response.writeHead(404).end('Not found');
      return;
    }
    const bytes = await readFile(new URL(`./public${path}`, import.meta.url));
    response.writeHead(200, { 'Content-Type': type }).end(bytes);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(port, 'localhost', () => console.log(`Portfolio running at ${origin}`));
