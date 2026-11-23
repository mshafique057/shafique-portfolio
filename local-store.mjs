import { DatabaseSync } from 'node:sqlite';

export function createLocalStore(path) {
  const db = new DatabaseSync(path);
  db.exec('CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, content TEXT NOT NULL)');
  const list = db.prepare('SELECT id, content FROM projects ORDER BY rowid');
  const save = db.prepare('INSERT INTO projects VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET content = excluded.content');
  const temporary = new Map();

  return (command, key, ...args) => {
    const now = Date.now();
    for (const [entryKey, entry] of temporary) {
      if (entry.expires <= now) temporary.delete(entryKey);
    }
    switch (command) {
      case 'HGETALL':
        return list.all().flatMap(({ id, content }) => [id, content]);
      case 'HSET':
        return save.run(args[0], args[1]).changes;
      case 'GET':
        return temporary.get(key)?.value ?? null;
      case 'SET':
        temporary.set(key, { value: args[0], expires: now + args[2] * 1000 });
        return 'OK';
      case 'DEL':
        return Number(temporary.delete(key));
      case 'EVAL': {
        const attemptKey = args[1];
        const entry = temporary.get(attemptKey) ?? { value: 0, expires: now + 600_000 };
        entry.value++;
        temporary.set(attemptKey, entry);
        return entry.value;
      }
      default:
        throw new Error('Unsupported storage command');
    }
  };
}
