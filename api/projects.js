import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import seed from '../projects.json' with { type: 'json' };

const projectKey = 'shafique:projects:v1';
const sessionPrefix = 'shafique:session:';
const sessionAge = 8 * 60 * 60;

const digest = value => createHash('sha256').update(value).digest();
const json = (body, status = 200, headers = {}) => Response.json(body, {
  status, headers: { 'Cache-Control': 'no-store', ...headers }
});
const error = (message, status) => json({ error: message }, status);

class StorageError extends Error {}

function redisConnection() {
  const pairs = [
    [process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN],
    [process.env.KV_REST_API_URL, process.env.KV_REST_API_TOKEN]
  ].map(pair => pair.map(value => value?.trim()));
  const [endpoint, token] = pairs.find(pair => pair.every(Boolean)) ?? [];
  if (!endpoint) {
    if (pairs.some(pair => pair.some(Boolean))) throw new StorageError('Set both Redis REST credentials in the same Vercel environment, then redeploy.');
    return null;
  }
  const url = URL.parse(endpoint);
  if (!url || url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new StorageError('Use the HTTPS Redis REST URL from Upstash, then redeploy.');
  }
  return async (...command) => {
    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(command),
        signal: AbortSignal.timeout(8000)
      });
    } catch {
      throw new StorageError('Redis could not be reached. Check the REST URL and database status, then try again.');
    }
    if (response.status === 401 || response.status === 403) {
      throw new StorageError('Redis rejected the credentials. Use the REST token with write access from the same Upstash database, then redeploy.');
    }
    if (response.status === 429) throw new StorageError('Redis is rate limited. Check your Upstash usage and try again.');
    const data = await response.json().catch(() => null);
    if (typeof data?.error === 'string' && /read.?only|permission|unauthorized|wrongpass|invalid token|denied/i.test(data.error)) {
      throw new StorageError('Redis rejected this operation. Check that the REST token has write access and belongs to the configured database.');
    }
    if (!response.ok || !data || !Object.hasOwn(data, 'result') || data.error) {
      throw new StorageError('Redis could not complete the request. Check the Upstash database status and Vercel function logs.');
    }
    return data.result;
  };
}

async function listProjects(redis) {
  if (!redis) return seed;
  const entries = await redis('HGETALL', projectKey);
  const projects = new Map(seed.map(project => [project.id, project]));
  for (let index = 1; index < (entries?.length ?? 0); index += 2) {
    const project = JSON.parse(entries[index]);
    projects.set(project.id, project);
  }
  return [...projects.values()].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

function text(value, max) {
  if (typeof value !== 'string' || value.length > max) throw new TypeError('Check the project field lengths.');
  return value.trim();
}

function httpsUrl(value, required = true) {
  const input = text(value, 1200);
  if (!input && !required) return '';
  const url = URL.parse(input);
  if (!url || url.protocol !== 'https:' || url.username || url.password) {
    throw new TypeError('Enter a valid HTTPS URL.');
  }
  return url.href;
}

function projectFields(body) {
  const name = text(body.name, 100);
  const category = text(body.category, 50);
  if (!name || !category) throw new TypeError('Enter a project name and category.');
  return {
    name, category, url: httpsUrl(body.url), image: httpsUrl(body.image, false),
    description: text(body.description, 600),
    tags: text(body.tags, 250).split(',').map(tag => tag.trim()).filter(Boolean).slice(0, 8),
    hidden: body.hidden === true
  };
}

async function handle(request, redis, password, minimumPasswordLength) {
  const url = new URL(request.url);
  const admin = url.searchParams.get('view') === 'admin';
  if (request.method === 'GET' && !admin) {
    return json((await listProjects(redis)).filter(project => !project.hidden));
  }
  if (!redis) {
    return error('Connect Upstash Redis in Vercel using the REST URL and write token, then redeploy.', 503);
  }
  if ((password?.length ?? 0) < minimumPasswordLength) {
    return error(`Set ADMIN_PASSWORD to at least ${minimumPasswordLength} characters in the deployment environment.`, 503);
  }
  const authVersion = digest(password).toString('hex');
  const session = request.headers.get('cookie')?.match(/(?:^|;\s*)portfolio_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  const cookie = (value, maxAge) => `portfolio_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${url.protocol === 'https:' ? '; Secure' : ''}`;
  const signedIn = async () => session && await redis('GET', sessionPrefix + session) === authVersion;

  if (request.method === 'GET') {
    return await signedIn() ? json(await listProjects(redis)) : error('Sign in to manage projects.', 401);
  }
  if (request.method !== 'POST') return error('Method not allowed.', 405);
  if (request.headers.get('origin') !== url.origin) return error('Invalid request origin.', 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return error('Expected JSON.', 415);
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 8000) return error('Request is too large.', 413);
    body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
  } catch {
    return error('Invalid request.', 400);
  }

  if (body.action === 'login') {
    const ip = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || 'local';
    const key = 'shafique:attempt:' + digest(ip).toString('hex');
    const attempts = await redis('EVAL', "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],600) end; return n", 1, key);
    if (attempts > 12) return error('Too many sign-in attempts. Try again in 10 minutes.', 429);
    if (typeof body.password !== 'string' || !timingSafeEqual(digest(body.password), digest(password))) {
      return error('Incorrect password.', 401);
    }
    const token = randomBytes(32).toString('hex');
    await redis('SET', sessionPrefix + token, authVersion, 'EX', sessionAge);
    if (session) await redis('DEL', sessionPrefix + session);
    await redis('DEL', key);
    return json({ ok: true }, 200, { 'Set-Cookie': cookie(token, sessionAge) });
  }
  if (!await signedIn()) return error('Sign in to manage projects.', 401);
  if (body.action === 'logout') {
    await redis('DEL', sessionPrefix + session);
    return json({ ok: true }, 200, { 'Set-Cookie': cookie('', 0) });
  }
  if (body.action !== 'save') return error('Unknown action.', 400);

  let fields;
  try {
    fields = projectFields(body);
  } catch (issue) {
    return error(issue.message, 400);
  }
  const existing = body.id ? (await listProjects(redis)).find(project => project.id === body.id) : null;
  if (body.id && !existing) return error('Project no longer exists.', 404);
  const project = { ...fields, id: existing?.id ?? randomUUID(), createdAt: existing ? (existing.createdAt ?? 0) : Date.now() };
  await redis('HSET', projectKey, project.id, JSON.stringify(project));
  return json(project);
}

export function localHandler(redis, password) {
  return request => respond(request, () => redis, password, 7);
}

async function respond(request, connect, password, minimumPasswordLength) {
  try {
    return await handle(request, connect(), password, minimumPasswordLength);
  } catch (issue) {
    if (issue instanceof StorageError) return error(issue.message, 503);
    console.error('Portfolio request failed:', issue.name);
    return error('Project storage is temporarily unavailable. Please try again.', 503);
  }
}

export default {
  fetch(request) {
    return respond(request, redisConnection, process.env.ADMIN_PASSWORD, 16);
  }
};
