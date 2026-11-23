import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import api from './api/projects.js';

const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.pdf': 'application/pdf' };
const port = Number(process.env.PORT || 3000);
const origin = `http://localhost:${port}`;
http.createServer(async (request, response) => {
  const url = new URL(request.url, origin);
  try {
    if (url.pathname === '/api/projects') {
      const body = request.method === 'POST' ? request : undefined;
      const result = await api.fetch(new Request(url, {
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
