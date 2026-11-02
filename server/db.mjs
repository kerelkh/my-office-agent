// Penyimpanan lokal dengan SQLite bawaan Node (`node:sqlite`, tanpa paket tambahan).
// Satu berkas: data/kantor.db. Berisi perusahaan, sesi pekerjaan, dan log tiap sesi.
// Berkas hasil kerja agen tidak masuk sini; itu tetap berkas biasa di folder proyek.
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS workspace (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  status TEXT NOT NULL,
  task TEXT NOT NULL,
  data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS jobs_created ON jobs (created_at);
CREATE TABLE IF NOT EXISTS log (
  job_id TEXT NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
  id INTEGER NOT NULL,
  t INTEGER NOT NULL,
  kind TEXT NOT NULL,
  role TEXT,
  name TEXT,
  tool TEXT,
  text TEXT NOT NULL DEFAULT '',
  files TEXT,
  PRIMARY KEY (job_id, id)
);
`;

const readJson = file => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } };

export function openDb(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, 'kantor.db');
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA synchronous = NORMAL;');
  db.exec(SCHEMA);

  const q = {
    getWs: db.prepare('SELECT data FROM workspace WHERE id = 1'),
    setWs: db.prepare('INSERT INTO workspace (id, data, updated_at) VALUES (1, ?, ?) ON CONFLICT (id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at'),
    jobs: db.prepare('SELECT data FROM jobs ORDER BY created_at ASC'),
    upJob: db.prepare('INSERT INTO jobs (id, created_at, updated_at, status, task, data) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET updated_at = excluded.updated_at, status = excluded.status, task = excluded.task, data = excluded.data'),
    delJob: db.prepare('DELETE FROM jobs WHERE id = ?'),
    addLog: db.prepare('INSERT OR REPLACE INTO log (job_id, id, t, kind, role, name, tool, text, files) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'),
    log: db.prepare('SELECT * FROM (SELECT * FROM log WHERE job_id = ? ORDER BY id DESC LIMIT ?) ORDER BY id ASC'),
    maxLog: db.prepare('SELECT COALESCE(MAX(id), 0) AS m FROM log WHERE job_id = ?'),
    getMeta: db.prepare('SELECT value FROM meta WHERE key = ?'),
    setMeta: db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)'),
  };
  const tx = fn => { db.exec('BEGIN'); try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; } };

  const api = {
    file,
    getWorkspace: () => { const r = q.getWs.get(); return r ? JSON.parse(r.data) : null; },
    setWorkspace: w => { q.setWs.run(JSON.stringify(w), Date.now()); },
    loadJobs: () => q.jobs.all().map(r => JSON.parse(r.data)),
    saveJob: j => { q.upJob.run(j.id, j.createdAt, j.updatedAt ?? j.createdAt, j.status, j.task, JSON.stringify(j)); },
    saveJobs: list => tx(() => list.forEach(api.saveJob)),
    deleteJob: id => { q.delJob.run(id); },
    addLog: (jobId, e) => { q.addLog.run(jobId, e.id, e.t, e.kind, e.role ?? null, e.name ?? null, e.tool ?? null, e.text ?? '', e.files ? JSON.stringify(e.files) : null); },
    maxLogId: jobId => q.maxLog.get(jobId).m,
    getLog: (jobId, limit = 3000) => q.log.all(jobId, limit).map(r => ({
      id: r.id, t: r.t, kind: r.kind, ...(r.role ? { role: r.role } : {}), ...(r.name ? { name: r.name } : {}), ...(r.tool ? { tool: r.tool } : {}),
      text: r.text, ...(r.files ? { files: JSON.parse(r.files) } : {}),
    })),
    close: () => db.close(),
  };

  /** Impor sekali dari berkas JSON versi lama. Berkas aslinya tidak diubah atau dihapus. */
  function importLegacy() {
    if (q.getMeta.get('imported_json')) return null;
    const ws = readJson(path.join(dataDir, 'workspace.json'));
    const jobs = readJson(path.join(dataDir, 'jobs.json'));
    const out = { workspace: false, jobs: 0, log: 0 };
    tx(() => {
      if (ws && !api.getWorkspace()) { api.setWorkspace(ws); out.workspace = true; }
      for (const j of Array.isArray(jobs) ? jobs : []) {
        if (!j?.id) continue;
        const { log = [], ...pub } = j;
        api.saveJob(pub); out.jobs++;
        for (const e of log) { if (Number.isFinite(e.id)) { api.addLog(j.id, e); out.log++; } }
      }
      q.setMeta.run('imported_json', new Date().toISOString());
    });
    return out;
  }

  return { ...api, importLegacy };
}
