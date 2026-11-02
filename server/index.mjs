// Backend lokal: menyimpan perusahaan dan riwayat pekerjaan, menjalankan antrean pekerjaan
// lewat Claude Code CLI (`claude -p`, memakai login subscription), dan menyiarkan kejadian lewat SSE.
//
// Tiga cara menugaskan pekerjaan:
//   auto     : koordinator memecah dan membagi pekerjaan ke karyawan, lalu menyusun hasil akhir
//   direct   : satu karyawan yang ditunjuk mengerjakan langsung
//   playbook : alur tetap "setelah ini ke" dari karyawan awal (reviewer bisa meminta revisi)
//
// Semua karyawan bisa membaca dan menulis berkas di folder proyek, mencari di web, dan memakai shell; izin web
// dan shell mengikuti permission Claude Code milik pengguna (settings.json). Pembedanya hanya skill.
// MCP (Gmail, Drive, Calendar, dll.) selalu ditutup (--strict-mcp-config).
//
// Pekerjaan adalah sesi percakapan: tiap pesan CEO adalah satu giliran, karyawan bekerja sebagai sub-agen
// (boleh paralel), dan semua langkah tercatat di log sesi seperti terminal Claude Code.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.mjs';
import { CATALOG, FIELDS, LEVELS, fieldOf, fullRole, levelOf, randomName } from '../src/catalogData.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.join(HERE, '..');
const DIST = path.join(APP, 'dist');
const DATA_DIR = path.join(APP, 'data');
// Semua data tersimpan di satu berkas SQLite (lihat db.mjs). JSON versi lama diimpor sekali saat pertama berjalan.
const db = openDb(DATA_DIR);
const imported = db.importLegacy();
if (imported) console.log(`Impor dari JSON lama: perusahaan ${imported.workspace ? 'ya' : 'tidak'}, ${imported.jobs} sesi, ${imported.log} baris log.`);
const DEFAULT_WORKDIR = path.join(APP, 'workdir');
const PORT = Number(process.env.PORT) || 3737;
const MODELS = ['haiku', 'sonnet', 'opus'];
const MAX_STEPS = 14;
const MAX_REVISIONS = 2;
const MAX_ROUNDS = 5;
const MAX_ASSIGN = 4;
const MAX_RECRUIT = 4;
const MAX_PARALLEL = 3;     // sesi yang boleh berjalan bersamaan
const TOOL_TIMEOUT = 900000;

const clients = new Set();
const emit = ev => { const s = `data: ${JSON.stringify(ev)}\n\n`; clients.forEach(c => c.write(s)); };

/* ---------- Proses Claude ---------- */
// Tiap sesi yang berjalan punya `run` sendiri: { aborted, children }, supaya beberapa sesi dan sub-agen bisa paralel.
const runs = new Map();     // jobId -> run
const newRun = () => ({ aborted: false, children: new Set() });

function killTree(child) {
  if (!child || child.killed) return;
  if (process.platform === 'win32' && child.pid) spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
  else child.kill();
}

function runClaude(args, { input, timeoutMs = 60000 } = {}) {
  return new Promise((resolve, reject) => {
    let child;
    try { child = spawn('claude', args, { cwd: APP, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true }); }
    catch (e) { return reject(e); }
    let out = '', err = '';
    const timer = setTimeout(() => { killTree(child); reject(new Error('Claude tidak merespons (timeout).')); }, timeoutMs);
    child.stdout.on('data', d => out += d);
    child.stderr.on('data', d => err += d);
    child.on('error', e => { clearTimeout(timer); reject(e.code === 'ENOENT' ? new Error('Claude Code belum terpasang (perintah `claude` tidak ditemukan).') : e); });
    child.on('close', code => {
      clearTimeout(timer);
      code === 0 ? resolve(out.trim()) : reject(new Error(err.trim() || out.trim() || `claude keluar dengan kode ${code}`));
    });
    child.stdin.end(input ?? '');
  });
}

async function claudeStatus() {
  try {
    const version = (await runClaude(['--version'], { timeoutMs: 15000 })).split('\n')[0];
    try {
      const j = JSON.parse(await runClaude(['auth', 'status'], { timeoutMs: 20000 }));
      return { installed: true, version, loggedIn: !!j.loggedIn, email: j.email ?? null, plan: j.subscriptionType ?? null, method: j.authMethod ?? null };
    } catch { return { installed: true, version, loggedIn: false }; }
  } catch (e) { return { installed: false, error: String(e.message || e) }; }
}

/* ---------- Daftar skill terdaftar ---------- */
// Event init dari Claude CLI memuat semua skill yang terdaftar. Proses dihentikan
// begitu baris init terbaca, sebelum permintaan ke model berjalan.
let skillCache = null;
function listSkills() {
  if (skillCache && Date.now() - skillCache.at < 300000) return Promise.resolve(skillCache.skills);
  fs.mkdirSync(DEFAULT_WORKDIR, { recursive: true });
  return new Promise((resolve, reject) => {
    const child = spawn('claude', ['-p', 'x', '--output-format', 'stream-json', '--verbose', '--no-session-persistence', '--strict-mcp-config', '--model', 'haiku'],
      { cwd: DEFAULT_WORKDIR, stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true });
    let buf = '', done = false;
    const finish = (err, skills) => { if (done) return; done = true; clearTimeout(timer); killTree(child); err ? reject(err) : resolve(skills); };
    const timer = setTimeout(() => finish(new Error('Gagal membaca daftar skill (timeout).')), 25000);
    child.on('error', e => finish(e));
    child.stdout.on('data', d => {
      buf += d;
      const nl = buf.indexOf('\n');
      if (nl < 0) return;
      try {
        const j = JSON.parse(buf.slice(0, nl));
        if (j.type === 'system' && Array.isArray(j.skills)) { skillCache = { at: Date.now(), skills: j.skills }; finish(null, j.skills); }
      } catch { /* baris bukan init */ }
    });
  });
}

/* ---------- Folder kerja dan skill ---------- */
const BLOCKED = [/^[a-z]:\\windows(\\|$)/i, /^[a-z]:\\program files/i, /^[a-z]:\\programdata(\\|$)/i];
function resolveWorkdir(w) {
  const raw = String(w || '').trim();
  const dir = raw ? path.resolve(raw) : DEFAULT_WORKDIR;
  if (raw && !path.isAbsolute(raw)) throw new Error('Folder kerja harus berupa path absolut.');
  if (path.parse(dir).root === dir) throw new Error('Folder kerja tidak boleh akar drive.');
  if (BLOCKED.some(r => r.test(dir))) throw new Error('Folder kerja tidak boleh berada di folder sistem.');
  if (dir.toLowerCase() === os.homedir().toLowerCase()) throw new Error('Pilih sub-folder, bukan folder home.');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
const skillDirs = () => ['skills', 'plugins'].map(d => path.join(os.homedir(), '.claude', d)).filter(d => fs.existsSync(d));
const SKILL_NAME = /^[\w:.-]{1,80}$/;

/* ---------- Menjalankan satu panggilan karyawan ---------- */
const REVIEW_RULE = '\n\nFormat jawaban WAJIB diawali persis "SETUJU:" (lalu versi final yang layak dipakai) atau "REVISI:" (lalu catatan perbaikan singkat, maksimal 5 poin).';

function toolLabel(name, i = {}) {
  const base = p => String(p ?? '').split(/[\\/]/).pop();
  switch (name) {
    case 'Skill': return `skill ${i.skill ?? ''}`.trim();
    case 'Read': case 'Write': case 'Edit': return `${name.toLowerCase()} ${base(i.file_path)}`;
    case 'Glob': case 'Grep': return `${name.toLowerCase()} ${i.pattern ?? ''}`;
    case 'WebSearch': return `cari web: ${i.query ?? ''}`;
    case 'WebFetch': return `buka ${i.url ?? ''}`;
    case 'Bash': return `shell: ${String(i.command ?? '').slice(0, 120)}`;
    default: return name;
  }
}

// Semua karyawan sama: membaca dan menulis berkas di folder proyek, mencari di web, dan memakai shell.
// Izin web dan shell tidak diatur dari sini (tidak masuk --allowedTools maupun --disallowedTools), jadi
// permission Claude Code milik pengguna yang menentukan; yang belum diizinkan ditolak dan muncul di log sesi.
// Satu-satunya pembeda antarkaryawan adalah skill: akses "text" berarti tanpa skill, selain itu memakai skill.
const OPEN_TOOLS = ['WebSearch', 'WebFetch', 'Bash'];

function buildInvocation(role, system, workdir, modelOverride) {
  const model = MODELS.includes(modelOverride) ? modelOverride : MODELS.includes(role.model) ? role.model : 'sonnet';
  const withSkills = role.access === 'skills' || role.access === 'work';
  const args = ['-p', '--model', model, '--no-session-persistence', '--output-format', 'stream-json', '--verbose', '--strict-mcp-config', '--permission-mode', 'acceptEdits'];

  const tools = ['Read', 'Glob', 'Grep', 'Write', 'Edit', ...OPEN_TOOLS];
  const allow = ['Read', 'Glob', 'Grep', 'Write', 'Edit'];
  const pick = role.skillMode === 'pick' && Array.isArray(role.skills) ? role.skills.filter(s => SKILL_NAME.test(s)) : [];
  if (withSkills) {
    tools.unshift('Skill');
    if (role.skillMode === 'pick') allow.push(...pick.map(s => `Skill(${s})`)); else allow.push('Skill');
  } else args.push('--disable-slash-commands');

  const rules = [
    `Folder proyek (folder kerjamu): ${workdir}. CEO menaruh berkas untukmu di sana, jadi baca bila relevan. Buat dan ubah berkas langsung di sana dengan tool Write dan Edit, dan jangan menulis di luar folder itu.`,
    !withSkills ? 'Kamu tidak memakai skill; kerjakan dengan kemampuanmu sendiri.'
      : role.skillMode === 'pick' && pick.length ? `Skill yang boleh kamu pakai: ${pick.join(', ')}.` : 'Kamu boleh memakai skill yang terdaftar lewat tool Skill bila relevan.',
    'Jangan minta izin; bila sebuah alat ditolak, lanjutkan dengan cara lain dan sebut kendalanya. Tulis jawaban dalam Markdown. Setelah selesai, jawab dengan ringkasan hasil dan daftar berkas yang dibuat atau diubah (path lengkap).',
  ].join('\n');

  args.push('--tools', tools.join(','), '--allowedTools', allow.join(','), '--append-system-prompt', system + '\n\n' + rules);
  // Sub-agen `Task` ditutup karena aplikasi ini sendiri yang mengatur tim; folder konfigurasi Claude tidak boleh diubah.
  args.push('--disallowedTools', ['Edit(~/.claude/**)', 'Write(~/.claude/**)', 'Task'].join(','));
  const dirs = withSkills ? skillDirs() : [];
  if (dirs.length) args.push('--add-dir', ...dirs);
  return { args, cwd: workdir, timeoutMs: TOOL_TIMEOUT };
}

function runRole({ role, system, prompt, workdir, roleId, run, model, onTool, onDenied }) {
  return new Promise((resolve, reject) => {
    let inv;
    try { inv = buildInvocation(role, system, workdir, model); } catch (e) { return reject(e); }
    let child;
    try { child = spawn('claude', inv.args, { cwd: inv.cwd, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true }); }
    catch (e) { return reject(e); }
    run?.children.add(child);

    let buf = '', err = '', final = null;
    const texts = [], seen = new Set();
    const timer = setTimeout(() => { killTree(child); reject(new Error('Claude tidak merespons (timeout).')); }, inv.timeoutMs);
    child.on('exit', () => run?.children.delete(child));

    const onLine = line => {
      let j; try { j = JSON.parse(line); } catch { return; }
      if (j.type === 'assistant') {
        for (const b of j.message?.content ?? []) {
          if (b.type === 'text') texts.push(b.text);
          else if (b.type === 'tool_use' && !seen.has(b.id)) {
            seen.add(b.id);
            onTool?.(b.name, toolLabel(b.name, b.input), b.input);
          }
        }
      } else if (j.type === 'result') final = j;
    };
    child.stdout.on('data', d => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (l) onLine(l); }
    });
    child.stderr.on('data', d => err += d);
    child.on('error', e => { clearTimeout(timer); reject(e.code === 'ENOENT' ? new Error('Claude Code belum terpasang.') : e); });
    child.on('close', code => {
      clearTimeout(timer);
      run?.children.delete(child);
      if (buf.trim()) onLine(buf.trim());
      if (run?.aborted) return reject(new Error('Dihentikan.'));
      if (final && !final.is_error) {
        for (const d of final.permission_denials ?? []) onDenied?.(d.tool_name, toolLabel(d.tool_name, d.tool_input));
        return resolve((final.result || texts.join('\n')).trim());
      }
      reject(new Error((final?.result || err || `claude keluar dengan kode ${code}`).toString().trim()));
    });
    child.stdin.end(prompt);
  });
}

/* ---------- Perusahaan: identitas, anggaran, hasil ---------- */
const short = t => t.replace(/\s+/g, ' ').slice(0, 160) + (t.length > 160 ? '…' : '');
const clip = (t, n) => (t.length > n ? t.slice(0, n) + '\n…(dipotong)' : t);
const stripVerdict = t => t.replace(/^\s*(SETUJU|REVISI):?\s*/i, '');

function parseJson(text) {
  const m = String(text).match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

const identity = (role, ws) => [
  `Kamu ${role.name}${role.title ? `, ${role.title}` : ''} di perusahaan "${ws.company?.name || 'Perusahaan'}" milik CEO (pengguna yang memberi pekerjaan).`,
  role.prompt,
  role.memory?.trim() ? `Catatan tetap dari CEO untuk kamu:\n${role.memory.trim()}` : '',
].filter(Boolean).join('\n\n') + (role.reviewer ? REVIEW_RULE : '');

const rosterLine = r => `- ${r.id} | ${r.name}${r.title ? ` (${r.title})` : ''} | keahlian: ${(r.tags ?? []).join(', ') || '-'} | akses: ${r.access}${r.reviewer ? ' | reviewer (membalas SETUJU/REVISI)' : ''}`;

async function callRole(ctx, role, system, user) {
  const max = ctx.budget;
  if (ctx.run.aborted) throw new Error('Dihentikan.');
  if (ctx.calls >= max) throw new Error(`Anggaran ${max} panggilan untuk giliran ini sudah habis. Kirim pesan lanjutan atau naikkan anggaran dengan /budget.`);
  ctx.calls++;
  ctx.job.calls = ctx.base + ctx.calls;
  touch(ctx.job);
  const job = ctx.job.id;
  return runRole({
    role, system, prompt: user, workdir: ctx.workdir, roleId: role.id, run: ctx.run, model: ctx.model,
    onTool: (tool, label) => { emit({ type: 'tool', job, role: role.id, tool, label }); addLog(ctx.job, { kind: 'tool', role: role.id, name: role.name, tool, text: label }); },
    onDenied: (tool, label) => {
      emit({ type: 'denied', job, role: role.id, tool, label });
      addLog(ctx.job, { kind: 'denied', role: role.id, name: role.name, tool, text: `${label}. Belum diizinkan di permission Claude Code Anda; tambahkan aturan izinnya di settings.json bila ingin dibolehkan.` });
    },
  });
}

/** Catatan sesi seperti keluaran terminal Claude Code: pesan CEO, langkah karyawan, pemakaian alat, hasil. */
function addLog(job, e) {
  job._seq = (job._seq ?? db.maxLogId(job.id)) + 1;
  const entry = { id: job._seq, t: Date.now(), ...e, text: String(e.text ?? '').slice(0, 8000) };
  if (!job._deleted) {
    persist(job);   // baris log butuh baris sesinya sudah ada
    db.addLog(job.id, entry);
  }
  emit({ type: 'log', job: job.id, entry });
  return entry;
}

/** Ringkasan giliran sebelumnya, supaya pesan lanjutan nyambung seperti percakapan. */
function historyBlock(job) {
  const prev = (job.turns ?? []).slice(0, -1).slice(-6);
  if (!prev.length) return '';
  return 'Percakapan ini berlanjut. Riwayat sebelumnya dengan CEO (jangan mengulang yang sudah selesai):\n'
    + prev.map(t => `CEO: ${clip(t.text, 800)}\nHasil: ${clip(t.final ?? '(tidak selesai)', 1500)}`).join('\n\n') + '\n\n';
}

/** Berkas di folder proyek beserta waktu ubahnya (kedalaman terbatas), untuk mengetahui berkas apa yang dibuat sebuah giliran. */
function snapshot(dir) {
  const out = new Map();
  const walk = (d, depth) => {
    if (out.size > 3000) return;
    let items; try { items = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of items) {
      if (e.name.startsWith('.') || e.name === 'node_modules') continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) { if (depth < 4) walk(full, depth + 1); }
      else if (e.isFile()) { try { const st = fs.statSync(full); out.set(path.relative(dir, full).split(path.sep).join('/'), { m: st.mtimeMs, size: st.size }); } catch { /* abaikan */ } }
    }
  };
  walk(dir, 0);
  return out;
}

/** Daftar berkas tingkat atas di folder proyek, untuk dibawa ke prompt dan ke antarmuka. */
function listFiles(dir, limit = 60) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter(e => !e.name.startsWith('.')).slice(0, limit).map(e => {
      let size = 0;
      if (e.isFile()) { try { size = fs.statSync(path.join(dir, e.name)).size; } catch { /* abaikan */ } }
      return { name: e.name, dir: e.isDirectory(), size };
    });
  } catch { return []; }
}
const fmtSize = n => (n < 1024 ? `${n} B` : n < 1048576 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`);
const projectNote = ctx => {
  const files = listFiles(ctx.workdir);
  return `Folder proyek: ${ctx.workdir}\nBerkas di sana: ${files.length ? files.map(f => `${f.name}${f.dir ? '/' : ` (${fmtSize(f.size)})`}`).join(', ') : '(kosong)'}`;
};

function emitResult(ctx, role, text) {
  emit({ type: 'result', job: ctx.job.id, role: role.id, text: short(text), full: text });
  ctx.job.steps.push({ role: role.id, name: role.name, text: clip(text, 4000) });
  addLog(ctx.job, { kind: 'result', role: role.id, name: role.name, text: stripVerdict(text) });
  touch(ctx.job);
}

function finish(ctx, text) {
  ctx.job.final = stripVerdict(text).trim();
  emit({ type: 'done', job: ctx.job.id, text: ctx.job.final });
}

const resultsText = results => results.length
  ? results.map(r => `### ${r.name} (${r.id})\nTugas: ${r.brief}\nHasil:\n${clip(r.text, 2500)}`).join('\n\n')
  : '(belum ada)';

/* Satu karyawan mengerjakan satu permintaan; boleh meminta bantuan satu rekan bila diizinkan. */
async function workRole(ctx, roleId, brief, results, depth, fromName) {
  const { ws, job } = ctx;
  const role = ws.roles.find(r => r.id === roleId);
  if (!role) throw new Error(`Karyawan "${roleId}" tidak ditemukan.`);
  const others = ws.roles.filter(r => r.id !== role.id);
  const canAsk = !!role.canDelegate && depth < 1 && others.length > 0;

  emit({ type: 'work', job: job.id, role: role.id, status: role.reviewer ? 'Mereview…' : 'Mengerjakan…' });
  let user = `${ctx.history}Pekerjaan dari CEO: ${ctx.msg}\n\n${projectNote(ctx)}\n\nPermintaan dari ${fromName}:\n${brief}`;
  if (results.length) user += `\n\nHasil rekan sejauh ini:\n${resultsText(results)}`;
  const base = identity(role, ws);
  const askRule = `\n\nBila kamu BENAR-BENAR butuh bantuan rekan sebelum bisa menjawab, balas HANYA dengan JSON: {"action":"ask","to":"<id>","brief":"permintaan lengkap"}. Rekan:\n${others.map(rosterLine).join('\n')}\nBila tidak butuh, langsung kerjakan dan jawab seperti biasa.`;

  let text = await callRole(ctx, role, base + (canAsk ? askRule : ''), user);
  const ask = canAsk ? parseJson(text) : null;
  if (ask?.action === 'ask' && others.some(o => o.id === ask.to) && ask.brief) {
    const helper = others.find(o => o.id === ask.to);
    emit({ type: 'handover', job: job.id, from: role.id, to: helper.id, revise: false });
    const sub = await workRole(ctx, helper.id, String(ask.brief), results, depth + 1, role.name);
    emit({ type: 'handover', job: job.id, from: helper.id, to: role.id, revise: false });
    emit({ type: 'work', job: job.id, role: role.id, status: 'Melanjutkan…' });
    text = await callRole(ctx, role, base, `${user}\n\nHasil dari ${helper.name}:\n${clip(sub, 3000)}\n\nLanjutkan dan selesaikan tugasmu.`);
  }
  emitResult(ctx, role, text);
  return text;
}

/* ---------- Mode auto: koordinator membagi pekerjaan ---------- */
async function runAuto(ctx) {
  const { ws, job } = ctx;
  const coord = ws.roles.find(r => r.id === ws.coordinatorId);
  if (!coord) throw new Error('Belum ada koordinator. Pilih satu karyawan sebagai koordinator di tab Karyawan.');
  const team = () => ws.roles.filter(r => r.id !== coord.id);
  const max = ctx.budget;
  job.team ??= [];

  // katalog ringkas: bidang dan judul peran, supaya sekretaris bisa merekrut yang tepat
  const catalogDigest = FIELDS.map(f => `${f.label}: ${CATALOG.filter(s => s.field === f.id).map(s => s.title).join('; ')}`).join('\n');
  const levelDigest = LEVELS.map(l => `${l.id} (${l.hint})`).join('; ');
  const system = () => identity(coord, ws) + `

Kamu koordinator. Tugasmu: memahami maksud CEO, membentuk tim yang paling optimal untuk pekerjaan ini, membagi pekerjaan, memeriksa hasil, lalu menyampaikan hasil akhir.

${projectNote(ctx)}

KARYAWAN YANG SUDAH ADA (bisa langsung ditugaskan):
${team().length ? team().map(rosterLine).join('\n') : '(tidak ada)'}

KATALOG PERAN (bisa direkrut sebagai karyawan kontrak untuk pekerjaan ini):
${catalogDigest}
Tingkat: ${levelDigest}.

Balas HANYA dengan satu objek JSON, tanpa teks lain:
{"action":"assign","note":"susunan tim dan alasannya, singkat","assignments":[{"to":"<id karyawan yang ada>","brief":"instruksi lengkap dan mandiri"},{"recruit":{"role":"<judul peran PERSIS dari katalog>","level":"<id tingkat>","why":"alasan merekrut"},"brief":"instruksi lengkap dan mandiri"}]}
atau
{"action":"finish","summary":"hasil akhir untuk CEO, lengkap dan siap pakai"}

Cara membentuk tim:
- Pakai karyawan yang sudah ada bila keahliannya cocok. Rekrut dari katalog hanya bila ada keahlian yang kurang, maksimal ${MAX_RECRUIT} rekrutan untuk satu pekerjaan.
- Pilih tingkat serendah yang masih memadai: magang atau junior untuk tugas sederhana dan terarah, madya atau senior untuk pekerjaan yang butuh keputusan, lead atau manajer hanya bila perlu mengoordinasikan banyak orang, direktur hanya untuk keputusan strategis.
- Tambahkan satu reviewer (peran yang bisa membalas SETUJU atau REVISI) bila mutu hasil penting.
- Hemat kuota: anggaran ${max} panggilan untuk giliran ini, termasuk panggilanmu. Pekerjaan sederhana cukup satu orang, atau langsung "finish" bila kamu bisa menjawab sendiri.
- Orang yang kamu tugaskan dalam satu putaran bekerja PARALEL, jadi bagi pekerjaan menjadi bagian yang tidak saling bergantung; hasilnya kembali padamu bersamaan. Bila ada REVISI, tugaskan ulang pembuatnya dengan catatan itu.
- Berkas di folder proyek bisa dibaca karyawan yang aksesnya Skill atau Kerja. Bila hasil berupa berkas, sebut path berkasnya di ringkasan akhir.`;

  // merekrut karyawan kontrak dari katalog; mengembalikan karyawan baru atau null
  let recruited = 0;
  const recruit = r => {
    if (!r || recruited >= MAX_RECRUIT || ws.roles.length >= 60) return null;
    const want = String(r.role ?? '').trim().toLowerCase();
    const spec = CATALOG.find(s => s.title.toLowerCase() === want || s.key === want);
    if (!spec) return null;
    const levelId = LEVELS.some(l => l.id === r.level) ? r.level : 'madya';
    const works = ws.rooms.filter(x => x.kind === 'kerja');
    const staff = id => ws.roles.filter(x => x.roomId === id).length;
    const room = works.sort((a, b) => staff(a.id) - staff(b.id))[0]?.id ?? coord.roomId;
    const name = randomName(new Set(ws.roles.map(x => x.name)));
    const role = fullRole(spec, levelId, { id: `kontrak-${Date.now().toString(36)}-${recruited}`, name, roomId: room, temp: true });
    // berkas proyek harus bisa dibaca: naikkan akses teks menjadi baca
    if (role.access === 'text' && listFiles(ctx.workdir).length) role.access = 'skills';
    ws.roles.push(role);
    recruited++;
    job.team.push({ id: role.id, name: role.name, title: role.title, temp: true, why: String(r.why ?? '') });
    emit({ type: 'recruit', job: job.id, role, why: String(r.why ?? '') });
    touch(job);
    return role;
  };

  const results = [];
  emit({ type: 'start', job: job.id, task: ctx.msg, role: coord.id });
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    emit({ type: 'work', job: job.id, role: coord.id, status: round === 1 ? 'Membentuk tim…' : 'Memeriksa hasil…' });
    const user = `${ctx.history}Pekerjaan dari CEO: ${ctx.msg}\n\nHasil karyawan sejauh ini:\n${resultsText(results)}\n\n${round === MAX_ROUNDS ? 'Ini putaran terakhir: kamu WAJIB "finish" sekarang.' : round === 1 ? 'Bentuk tim dan bagikan pekerjaan.' : 'Tentukan langkah berikutnya.'}`;
    const raw = await callRole(ctx, coord, system(), user);
    const plan = parseJson(raw);
    const items = plan?.action === 'assign' && Array.isArray(plan.assignments) ? plan.assignments.filter(a => a && a.brief).slice(0, MAX_ASSIGN) : [];

    // tentukan pelaksana: karyawan yang ada, atau rekrut dari katalog
    const valid = [];
    for (const a of items) {
      const existing = team().find(t => t.id === a.to);
      const worker = existing ?? (a.recruit ? recruit(a.recruit) : null);
      if (worker) valid.push({ worker, brief: String(a.brief), fresh: !existing });
    }

    if (!valid.length) {
      const summary = String(plan?.summary ?? plan?.note ?? raw).trim() || raw;
      emitResult(ctx, coord, summary);
      return finish(ctx, summary);
    }
    const hired = valid.filter(v => v.fresh);
    const teamLine = hired.length ? ` Merekrut ${hired.map(v => `${v.worker.name} (${v.worker.title})`).join(', ')}.` : '';
    emitResult(ctx, coord, (plan.note ? String(plan.note) : `Menugaskan ${valid.map(v => v.worker.name).join(', ')}.`) + teamLine);
    const snap = results.slice();
    const settled = await Promise.allSettled(valid.map(async ({ worker, brief }) => {
      emit({ type: 'handover', job: job.id, from: coord.id, to: worker.id, revise: false });
      const text = await workRole(ctx, worker.id, brief, snap, 0, coord.name);
      emit({ type: 'handover', job: job.id, from: worker.id, to: coord.id, revise: false });
      return { id: worker.id, name: worker.name, brief, text };
    }));
    if (ctx.run.aborted) throw new Error('Dihentikan.');
    settled.forEach((r, i) => {
      if (r.status === 'fulfilled') results.push(r.value);
      else {
        const w = valid[i].worker, msg = String(r.reason?.message ?? r.reason);
        addLog(job, { kind: 'error', role: w.id, name: w.name, text: `${w.name} gagal: ${msg}` });
        results.push({ id: w.id, name: w.name, brief: valid[i].brief, text: `(gagal: ${msg})` });
      }
    });
    if (settled.every(r => r.status === 'rejected')) throw settled[0].reason;
  }
  finish(ctx, resultsText(results));
}

/* ---------- Mode direct ---------- */
async function runDirect(ctx) {
  const { ws, job } = ctx;
  const role = ws.roles.find(r => r.id === job.target);
  if (!role) throw new Error('Karyawan yang ditunjuk tidak ditemukan.');
  emit({ type: 'start', job: job.id, task: ctx.msg, role: role.id });
  finish(ctx, await workRole(ctx, role.id, ctx.msg, [], 0, 'CEO'));
}

/* ---------- Mode playbook: alur tetap ---------- */
async function runPlaybook(ctx) {
  const { ws, job } = ctx;
  const roles = new Map(ws.roles.map(r => [r.id, r]));
  const names = id => roles.get(id)?.name ?? id;
  let cur = roles.has(job.target) ? job.target : '';
  if (!cur) throw new Error('Pilih karyawan awal untuk playbook.');
  let carried = null, lastText = '';
  const outputs = {}, revisions = {};

  emit({ type: 'start', job: job.id, task: ctx.msg, role: cur });
  for (let step = 1; cur && cur !== 'END'; step++) {
    if (step > MAX_STEPS) throw new Error(`Alur melebihi ${MAX_STEPS} langkah (kemungkinan berputar tanpa akhir). Periksa tujuan "setelah ini".`);
    const role = roles.get(cur);
    if (!role) throw new Error(`Karyawan "${cur}" tidak ditemukan.`);

    emit({ type: 'work', job: job.id, role: cur, status: role.reviewer ? 'Mereview…' : 'Mengerjakan…' });
    let user = `${ctx.history}Pekerjaan dari CEO: ${ctx.msg}\n\n`;
    if (!carried) user += 'Kamu pemegang langkah pertama. Mulai kerjakan.';
    else if (carried.revise) user += `Hasil kerjamu sebelumnya:\n${outputs[cur] ?? '(kosong)'}\n\nCatatan revisi dari ${names(carried.fromId)}:\n${carried.text}\n\nPerbaiki sesuai catatan.`;
    else user += `Masukan dari ${names(carried.fromId)}:\n${carried.text}`;

    const text = await callRole(ctx, role, identity(role, ws), user);
    outputs[cur] = text; lastText = text;
    emitResult(ctx, role, text);

    let next = role.next || 'END', revise = false;
    if (role.reviewer && /^\s*REVISI/i.test(text) && role.rejectTo && roles.has(role.rejectTo)) {
      revisions[cur] = (revisions[cur] ?? 0) + 1;
      if (revisions[cur] <= MAX_REVISIONS) { next = role.rejectTo; revise = true; }
    }
    if (next !== 'END' && !roles.has(next)) next = 'END';
    if (next !== 'END') emit({ type: 'handover', job: job.id, from: cur, to: next, revise });
    carried = { fromId: cur, text: role.reviewer && !revise ? stripVerdict(text) : text, revise };
    cur = next;
  }
  finish(ctx, lastText);
}

/* ---------- Sesi pekerjaan ---------- */
// Sebuah pekerjaan adalah sesi percakapan: `turns` berisi pesan CEO beserta hasilnya, `log` berisi semua langkah.
const jobs = db.loadJobs();
for (const j of jobs) {
  j.files ??= [];
  j.turns ??= [{ text: j.task, at: j.createdAt, final: j.final }];
  j._saved = true;
  if (j.status === 'running' || j.status === 'queued') { j.status = 'error'; j.error = 'Server dimulai ulang sebelum pekerjaan selesai.'; }
}
const queue = [];

const pubJob = j => ({
  id: j.id, task: j.task, mode: j.mode, project: j.project, team: j.team, target: j.target, status: j.status,
  createdAt: j.createdAt, startedAt: j.startedAt, endedAt: j.endedAt, updatedAt: j.updatedAt ?? j.createdAt,
  calls: j.calls ?? 0, budget: j.budget, opts: j.opts, steps: j.steps ?? [], final: j.final, error: j.error,
  files: j.files ?? [], turns: (j.turns ?? []).map(t => ({ text: t.text, at: t.at, final: t.final })),
});
/** Menulis sesi ke SQLite sekarang juga (dipakai sebelum menambah log pertama). */
function persist(job) {
  if (job._deleted) return;
  try { db.saveJob(pubJob(job)); job._saved = true; dirty.delete(job); } catch (e) { console.error('Gagal menyimpan sesi:', e.message); }
}
const dirty = new Set();
let flushTimer;
function flush() {
  clearTimeout(flushTimer); flushTimer = undefined;
  for (const j of dirty) persist(j);
  dirty.clear();
}
function touch(job) {
  job.updatedAt = Date.now();
  emit({ type: 'job', job: pubJob(job) });
  if (job._deleted) return;
  dirty.add(job);
  flushTimer ??= setTimeout(flush, 300);
}
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { flush(); db.close(); process.exit(0); });
jobs.forEach(persist);

async function runTurn(job) {
  const run = newRun();
  runs.set(job.id, run);
  job.status = 'running'; job.startedAt = Date.now(); job.endedAt = undefined; job.error = undefined;
  const turn = job.turns[job.turns.length - 1];
  const before = snapshot(job._workdir);
  const budget = job.opts?.maxCalls || job._ws.maxCalls || 12;
  job.budget = budget;
  const ctx = {
    job, ws: job._ws, calls: 0, base: job.calls ?? 0, run, workdir: job._workdir, budget,
    model: job.opts?.model, msg: turn.text, history: historyBlock(job),
  };
  touch(job);
  try {
    if (job.mode === 'direct') await runDirect(ctx);
    else if (job.mode === 'playbook') await runPlaybook(ctx);
    else await runAuto(ctx);
    job.status = 'done';
    turn.final = job.final;
  } catch (e) {
    if (run.aborted) { job.status = 'stopped'; emit({ type: 'stopped', job: job.id, message: 'Pekerjaan dihentikan.' }); addLog(job, { kind: 'info', text: 'Dihentikan oleh Anda.' }); }
    else { job.status = 'error'; job.error = String(e.message || e); emit({ type: 'error', job: job.id, message: job.error }); addLog(job, { kind: 'error', text: job.error }); }
  } finally {
    // berkas baru atau berubah selama giliran ini
    const after = snapshot(job._workdir);
    const changed = [];
    for (const [rel, v] of after) { const o = before.get(rel); if (!o || o.m !== v.m || o.size !== v.size) changed.push({ path: rel, size: v.size, new: !o }); }
    if (changed.length) {
      const known = new Map((job.files ?? []).map(f => [f.path, f]));
      for (const f of changed) known.set(f.path, f);
      job.files = [...known.values()].slice(-200);
      addLog(job, { kind: 'files', text: `${changed.length} berkas ${changed.some(f => f.new) ? 'dibuat atau diubah' : 'diubah'}`, files: changed.slice(0, 60) });
    }
    job.endedAt = Date.now(); job.calls = ctx.base + ctx.calls;
    addLog(job, { kind: 'status', text: `${job.status === 'done' ? 'Selesai' : job.status === 'stopped' ? 'Dihentikan' : 'Gagal'} dalam ${Math.round((job.endedAt - job.startedAt) / 1000)} detik, ${ctx.calls} panggilan.` });
    runs.delete(job.id);
    touch(job);
    setImmediate(pump);
  }
}

function pump() {
  while (runs.size < MAX_PARALLEL && queue.length) {
    const job = queue.shift();
    if (job.status !== 'queued') continue;
    void runTurn(job);
  }
}

function cancelJob(id) {
  const run = runs.get(id);
  if (run) { run.aborted = true; run.children.forEach(killTree); return true; }
  const i = queue.findIndex(j => j.id === id);
  if (i < 0) return false;
  const [job] = queue.splice(i, 1);
  job.status = 'stopped'; job.endedAt = Date.now(); addLog(job, { kind: 'info', text: 'Dibatalkan sebelum berjalan.' }); touch(job);
  return true;
}

function deleteJob(id) {
  cancelJob(id);
  const i = jobs.findIndex(j => j.id === id);
  if (i < 0) return false;
  const [gone] = jobs.splice(i, 1);
  gone._deleted = true; dirty.delete(gone);
  db.deleteJob(id);    // log ikut terhapus (ON DELETE CASCADE)
  emit({ type: 'jobdeleted', job: id });
  return true;
}

/** Menyiapkan giliran baru: dari pekerjaan pertama atau pesan lanjutan. */
function enqueueTurn(job, text, { ws, mode, target, opts }) {
  job.turns.push({ text, at: Date.now() });
  job.mode = mode; job.target = mode === 'auto' ? undefined : target;
  job.opts = { ...(job.opts ?? {}), ...(opts ?? {}) };
  job.status = 'queued'; job.final = undefined; job.error = undefined;
  job._ws = ws;
  addLog(job, { kind: 'user', text });
  queue.push(job); touch(job);
  pump();
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.csv': 'text/plain; charset=utf-8',
  '.xml': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.pdf': 'application/pdf', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.wav': 'audio/wav',
};

/** Menyajikan berkas hasil dari folder proyek sebuah sesi. Hanya berkas di dalam folder itu; halaman dijalankan dalam sandbox. */
function serveJobFile(res, job, rel) {
  const root = fs.realpathSync(job.project?.path || DEFAULT_WORKDIR);
  const full = path.resolve(root, rel);
  let real;
  try { real = fs.realpathSync(full); } catch { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Berkas tidak ditemukan.'); }
  if (real !== root && !real.startsWith(root + path.sep)) { res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Di luar folder proyek.'); }
  if (!fs.statSync(real).isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Bukan berkas.'); }
  const type = MIME[path.extname(real).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store',
    // skrip di halaman hasil berjalan tanpa asal (origin) sendiri, jadi tidak bisa memanggil API aplikasi ini
    'Content-Security-Policy': 'sandbox allow-scripts allow-forms allow-popups allow-modals',
  });
  fs.createReadStream(real).pipe(res);
}

/* ---------- HTTP ---------- */
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
const originOk = o => !o || LOCAL.test(o.replace(/^https?:\/\//, ''));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.png': 'image/png' };

const readBody = req => new Promise((resolve, reject) => {
  let b = '';
  req.on('data', d => { b += d; if (b.length > 600000) { reject(new Error('terlalu besar')); req.destroy(); } });
  req.on('end', () => resolve(b));
});
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };

function validWorkspace(w) {
  return w && Array.isArray(w.rooms) && Array.isArray(w.roles) && w.roles.length <= 60 && w.rooms.length <= 24
    && w.roles.every(r => typeof r.id === 'string' && typeof r.name === 'string' && typeof r.prompt === 'string');
}

http.createServer(async (req, res) => {
  try {
    if (!LOCAL.test(req.headers.host || '') || !originOk(req.headers.origin)) { res.writeHead(403); return res.end('Ditolak'); }
    const url = req.url.split('?')[0];

    if (req.method === 'GET' && url === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(': ok\n\n'); clients.add(res);
      const hb = setInterval(() => res.write(': hb\n\n'), 20000);
      req.on('close', () => { clearInterval(hb); clients.delete(res); });
      return;
    }
    if (req.method === 'GET' && url === '/api/config') return json(res, 200, { defaultWorkdir: DEFAULT_WORKDIR });

    // isi folder proyek, supaya Anda tahu berkas apa yang bisa dilihat agen
    if (req.method === 'GET' && url === '/api/folder') {
      try {
        const q = new URL(req.url, 'http://localhost').searchParams.get('path') ?? '';
        const dir = resolveWorkdir(q);
        return json(res, 200, { path: dir, files: listFiles(dir) });
      } catch (e) { return json(res, 200, { path: '', files: [], error: String(e.message || e) }); }
    }
    if (req.method === 'POST' && url === '/api/folder/open') {
      try {
        const dir = resolveWorkdir(JSON.parse(await readBody(req)).path ?? '');
        const cmd = process.platform === 'win32' ? ['explorer.exe', [dir]] : process.platform === 'darwin' ? ['open', [dir]] : ['xdg-open', [dir]];
        spawn(cmd[0], cmd[1], { detached: true, stdio: 'ignore' }).on('error', () => {}).unref();
        return json(res, 200, { ok: true });
      } catch (e) { return json(res, 400, { error: String(e.message || e) }); }
    }
    if (req.method === 'GET' && url === '/api/jobs') return json(res, 200, { jobs: jobs.map(pubJob) });

    if (req.method === 'GET' && url === '/api/skills') {
      try { return json(res, 200, { skills: await listSkills() }); }
      catch (e) { return json(res, 200, { skills: [], error: String(e.message || e) }); }
    }

    if (url === '/api/workspace') {
      if (req.method === 'GET') {
        return json(res, 200, db.getWorkspace());
      }
      if (req.method === 'PUT') {
        const w = JSON.parse(await readBody(req));
        if (!validWorkspace(w)) return json(res, 400, { error: 'Data perusahaan tidak valid.' });
        db.setWorkspace(w);
        return json(res, 200, { ok: true });
      }
    }

    if (req.method === 'GET' && url === '/api/claude/status') return json(res, 200, await claudeStatus());

    if (req.method === 'POST' && url === '/api/claude/login') {
      // Membuka alur login resmi Claude Code (browser). Tidak ada kode atau token yang lewat sini.
      const child = spawn('claude', ['auth', 'login'], { cwd: APP, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: false });
      let out = '';
      child.stdout.on('data', d => out += d); child.stderr.on('data', d => out += d);
      child.on('error', () => {});
      setTimeout(() => json(res, 202, { started: true, output: out.slice(0, 600) }), 2500);
      return;
    }

    if (req.method === 'POST' && url === '/api/claude/test') {
      const t0 = Date.now();
      try {
        const out = await runRole({ role: { model: 'haiku', access: 'text' }, system: 'Balas hanya dengan satu kata: OK', prompt: 'Tes koneksi.', workdir: DEFAULT_WORKDIR, roleId: 'test', run: newRun() });
        return json(res, 200, { ok: true, ms: Date.now() - t0, reply: out.slice(0, 40) });
      } catch (e) { return json(res, 200, { ok: false, error: String(e.message || e) }); }
    }

    if (req.method === 'POST' && url === '/api/jobs') {
      const j = JSON.parse(await readBody(req));
      if (!validWorkspace(j.workspace)) return json(res, 400, { error: 'Data perusahaan tidak valid.' });
      const task = String(j.task || '').trim().slice(0, 6000);
      if (!task) return json(res, 400, { error: 'Pekerjaan kosong.' });
      const mode = ['auto', 'direct', 'playbook'].includes(j.mode) ? j.mode : 'auto';
      const ws = j.workspace;
      if (mode === 'auto' && !ws.roles.some(r => r.id === ws.coordinatorId)) return json(res, 400, { error: 'Belum ada koordinator. Pilih satu di tab Karyawan, atau tunjuk karyawan langsung.' });
      if (mode !== 'auto' && !ws.roles.some(r => r.id === j.target)) return json(res, 400, { error: 'Pilih karyawan terlebih dahulu.' });
      // folder proyek yang dipilih untuk pekerjaan ini; kosong berarti folder bawaan aplikasi
      const proj = (ws.projects ?? []).find(p => p.id === j.projectId) ?? (ws.projects ?? [])[0] ?? { id: 'proyek-utama', name: 'Proyek utama', path: '' };
      let workdir;
      try { workdir = resolveWorkdir(proj.path); }
      catch (e) { return json(res, 400, { error: `Folder proyek "${proj.name}": ${String(e.message)}` }); }
      if (queue.length >= 10) return json(res, 429, { error: 'Antrean penuh (maksimal 10).' });

      const job = {
        id: `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`, task: task.split('\n')[0].slice(0, 160), mode, status: 'queued', createdAt: Date.now(),
        calls: 0, steps: [], team: [], files: [], turns: [], opts: {}, project: { id: proj.id, name: proj.name, path: workdir }, _workdir: workdir,
      };
      jobs.push(job); persist(job);
      enqueueTurn(job, task, { ws, mode, target: String(j.target ?? ''), opts: {} });
      return json(res, 202, { job: pubJob(job) });
    }

    // pesan lanjutan pada sesi yang sudah ada
    let m;
    if (req.method === 'POST' && (m = url.match(/^\/api\/jobs\/([\w-]+)\/message$/))) {
      const job = jobs.find(x => x.id === m[1]);
      if (!job) return json(res, 404, { error: 'Sesi tidak ditemukan.' });
      if (job.status === 'queued' || job.status === 'running') return json(res, 409, { error: 'Sesi masih bekerja. Tunggu selesai atau hentikan dulu dengan /stop.' });
      const j = JSON.parse(await readBody(req));
      if (!validWorkspace(j.workspace)) return json(res, 400, { error: 'Data perusahaan tidak valid.' });
      const text = String(j.text || '').trim().slice(0, 6000);
      if (!text) return json(res, 400, { error: 'Pesan kosong.' });
      const ws = j.workspace;
      const mode = ['auto', 'direct', 'playbook'].includes(j.mode) ? j.mode : job.mode;
      if (mode === 'auto' && !ws.roles.some(r => r.id === ws.coordinatorId)) return json(res, 400, { error: 'Belum ada koordinator.' });
      if (mode !== 'auto' && !ws.roles.some(r => r.id === j.target)) return json(res, 400, { error: 'Karyawan yang dituju tidak ditemukan.' });
      if (queue.length >= 10) return json(res, 429, { error: 'Antrean penuh (maksimal 10).' });
      let workdir;
      try { workdir = resolveWorkdir(job.project?.path ?? ''); } catch (e) { return json(res, 400, { error: String(e.message) }); }
      job._workdir = workdir;
      const opts = {};
      if (MODELS.includes(j.opts?.model)) opts.model = j.opts.model;
      if (j.opts?.model === 'default') opts.model = undefined;
      if (Number.isFinite(j.opts?.maxCalls)) opts.maxCalls = Math.min(60, Math.max(1, Math.round(j.opts.maxCalls)));
      enqueueTurn(job, text, { ws, mode, target: String(j.target ?? ''), opts });
      return json(res, 202, { job: pubJob(job) });
    }

    if (req.method === 'GET' && (m = url.match(/^\/api\/jobs\/([\w-]+)$/))) {
      const job = jobs.find(x => x.id === m[1]);
      return job ? json(res, 200, { job: pubJob(job), log: db.getLog(job.id) }) : json(res, 404, { error: 'Sesi tidak ditemukan.' });
    }

    // berkas hasil sesi: dibuka langsung di tab browser
    if (req.method === 'GET' && (m = url.match(/^\/api\/jobs\/([\w-]+)\/file\/(.+)$/))) {
      const job = jobs.find(x => x.id === m[1]);
      if (!job) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Sesi tidak ditemukan.'); }
      let rel; try { rel = decodeURIComponent(m[2]); } catch { rel = ''; }
      return serveJobFile(res, job, rel);
    }

    if (req.method === 'POST' && url === '/api/jobs/delete') {
      const j = JSON.parse(await readBody(req));
      return json(res, 200, { ok: deleteJob(String(j.id)) });
    }

    if (req.method === 'POST' && url === '/api/jobs/cancel') {
      const j = JSON.parse(await readBody(req));
      return json(res, 200, { ok: cancelJob(String(j.id)) });
    }

    // statis (build produksi)
    if (req.method === 'GET') {
      const rel = url === '/' ? '/index.html' : decodeURIComponent(url);
      const full = path.join(DIST, path.normalize(rel));
      if (full.startsWith(DIST) && fs.existsSync(full) && fs.statSync(full).isFile()) {
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(full)] || 'application/octet-stream' });
        return fs.createReadStream(full).pipe(res);
      }
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Belum ada build. Jalankan `npm run dev` (pengembangan) atau `npm run build` lalu `npm start`.');
    }
    res.writeHead(404); res.end();
  } catch (e) {
    json(res, 500, { error: String(e.message || e) });
  }
}).listen(PORT, '127.0.0.1', () => console.log(`Server Kantor Agen: http://localhost:${PORT}`));
