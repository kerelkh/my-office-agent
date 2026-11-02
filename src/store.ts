import { create } from 'zustand';
import { api } from './api';
import { computeLayout, floorOf, homePt, pathBack, pathBetween, route, type Pt } from './layout';
import { startLife } from './life';
import { normalizeWorkspace } from './normalize';
import { positions } from './positions';
import { defaultWorkspace } from './templates';
import type { ClaudeStatus, Job, JobMode, LogEntry, Role, RoleRuntime, ServerEvent, TrailEntry, Workspace } from './types';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
interface Walk { pts: Pt[]; resolve: () => void; speed: number }
interface Composer { task: string; mode: JobMode; target: string; projectId: string }

interface Store {
  ws: Workspace;
  loaded: boolean;
  loadError: string | null;
  saveState: SaveState;
  serverUp: boolean;

  claude: ClaudeStatus | null;
  claudeLoading: boolean;
  claudeNote: string | null;
  skills: string[];
  skillsLoading: boolean;
  skillsError: string | null;
  defaultWorkdir: string;

  jobs: Job[];
  selectedJobId: string | null;
  /** log tiap sesi, seperti keluaran terminal */
  logs: Record<string, LogEntry[]>;
  /** pengaturan yang diubah lewat perintah (/mode) dan berlaku di pesan berikutnya */
  pending: Record<string, { mode?: JobMode; target?: string; model?: string; maxCalls?: number }>;
  composer: Composer;
  composerError: string | null;
  running: boolean;

  speed: number;
  lifeOn: boolean;
  viewFloor: number;
  cameraFocus: { x: number; y: number; z: number; seq: number } | null;
  drawerOpen: boolean;
  trailOpen: boolean;
  rt: Record<string, RoleRuntime>;
  trail: TrailEntry[];
  visited: string[];
  currentRole: string | null;
  confetti: number;
  walks: Record<string, Walk | undefined>;

  init: () => Promise<void>;
  update: (fn: (w: Workspace) => Workspace) => void;
  replaceWorkspace: (w: Workspace) => void;
  removeRole: (id: string) => void;
  setComposer: (p: Partial<Composer>) => void;
  submitJob: () => Promise<void>;
  cancelJob: (id: string) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  deleteJobs: (ids: string[]) => Promise<void>;
  loadLog: (id: string) => Promise<void>;
  sendMessage: (id: string, text: string) => Promise<void>;
  selectJob: (id: string | null) => void;
  setSpeed: (s: number) => void;
  setLife: (on: boolean) => void;
  setViewFloor: (f: number) => void;
  focusRole: (id: string) => void;
  focusRoom: (id: string) => void;
  setDrawer: (open: boolean) => void;
  setTrail: (open: boolean) => void;
  refreshClaude: () => Promise<void>;
  loadSkills: () => Promise<void>;
  loginClaude: () => Promise<void>;
  testClaude: () => Promise<void>;
  requestWalk: (id: string, pts: Pt[], speed?: number) => Promise<void>;
}

const idle = (): RoleRuntime => ({ status: 'Siaga', working: false, bubble: null, carrying: false, activity: null, pose: 'none', faceTo: null, sit: false, heading: null });
const freshRuntime = (ws: Workspace) => Object.fromEntries(ws.roles.map(r => [r.id, idle()]));
let trailId = 0;
const now = () => new Date().toLocaleTimeString('id-ID', { hour12: false });
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let queue: Promise<void> = Promise.resolve();
let started = false;
let life: ReturnType<typeof startLife> | null = null;

export const useStore = create<Store>((set, get) => {
  const patchRole = (id: string, p: Partial<RoleRuntime>) =>
    set(s => ({ rt: { ...s.rt, [id]: { ...(s.rt[id] ?? idle()), ...p } } }));
  const log = (kind: TrailEntry['kind'], text: string, roleId?: string) =>
    set(s => ({ trail: [...s.trail.slice(-300), { id: ++trailId, time: now(), roleId, kind, text }] }));
  const say = (id: string, text: string, ms = 1500) => {
    patchRole(id, { bubble: text });
    setTimeout(() => { if (get().rt[id]?.bubble === text) patchRole(id, { bubble: null }); }, ms / get().speed);
  };
  const pause = (ms: number) => new Promise<void>(r => setTimeout(r, ms / get().speed));
  const settle = () => set(s => ({
    rt: Object.fromEntries(Object.entries(s.rt).map(([k, v]) => [k, { ...v, working: false, carrying: false, bubble: null, status: 'Siaga' }])),
  }));
  /** Karyawan kontrak pulang lewat pintu depan setelah pekerjaan selesai, lalu dihapus dari daftar. */
  async function releaseTemps(exceptJob?: string) {
    const { ws, jobs } = get();
    if (!ws.releaseTemps || jobs.some(j => j.id !== exceptJob && (j.status === 'queued' || j.status === 'running'))) return;
    const temps = ws.roles.filter(r => r.temp);
    if (!temps.length) return;
    const layout = computeLayout(ws);
    await Promise.all(temps.map(async r => {
      const d = layout.desks[r.id];
      if (!d) return;
      life?.cancel(r.id);
      patchRole(r.id, { status: 'Kontrak selesai', activity: null, sit: false, heading: null, pose: 'none', faceTo: null });
      log('info', `${r.name} (${r.title}) menyelesaikan kontrak dan pulang.`, r.id);
      const out = layout.outdoor.spawn;
      await get().requestWalk(r.id, route(layout, homePt(d), [out.x, out.z, 0]), 0.9);
    }));
    set(s => ({ ws: { ...s.ws, roles: s.ws.roles.filter(r => !r.temp) } }));
  }
  let localId = 0;
  const localLog = (jobId: string, kind: LogEntry['kind'], text: string) =>
    set(s => ({ logs: { ...s.logs, [jobId]: [...(s.logs[jobId] ?? []), { id: --localId, t: Date.now(), kind, text }] } }));
  const othersBusy = (jobId: string) => get().jobs.some(j => j.id !== jobId && j.status === 'running');
  const upsertJob = (job: Job) => set(s => {
    const i = s.jobs.findIndex(j => j.id === job.id);
    const jobs = i < 0 ? [...s.jobs, job] : s.jobs.map(j => j.id === job.id ? job : j);
    return { jobs, running: jobs.some(j => j.status === 'running') };
  });

  async function handle(ev: ServerEvent) {
    const { ws } = get();
    switch (ev.type) {
      case 'start':
        set(s => ({ visited: othersBusy(ev.job) ? [...s.visited, ev.role] : [ev.role], currentRole: ev.role }));
        log('info', `Pekerjaan: ${ev.task}`);
        break;
      case 'recruit':
        // karyawan kontrak: ditambahkan ke tampilan tanpa disimpan ke perusahaan
        set(s => ({ ws: { ...s.ws, roles: s.ws.roles.some(r => r.id === ev.role.id) ? s.ws.roles : [...s.ws.roles, ev.role] }, rt: { ...s.rt, [ev.role.id]: idle() } }));
        log('info', `Sekretaris merekrut ${ev.role.name}, ${ev.role.title}${ev.why ? `: ${ev.why}` : ''}.`);
        break;
      case 'work':
        life?.cancel(ev.role);
        set(s => ({ currentRole: ev.role, visited: s.visited.includes(ev.role) ? s.visited : [...s.visited, ev.role] }));
        patchRole(ev.role, { working: true, status: ev.status, activity: null, pose: 'none', faceTo: null, sit: false, heading: null });
        break;
      case 'tool':
        log('tool', ev.label, ev.role);
        patchRole(ev.role, { status: ev.label.slice(0, 28) });
        say(ev.role, ev.tool === 'Skill' ? ev.label : ev.tool, 1600);
        break;
      case 'denied':
        log('denied', `Ditolak oleh permission Claude Code: ${ev.label}`, ev.role);
        break;
      case 'result':
        patchRole(ev.role, { working: false, status: 'Selesai' });
        log('result', ev.text, ev.role);
        say(ev.role, 'Beres!', 1200);
        break;
      case 'handover': {
        const layout = computeLayout(ws);
        const a = layout.desks[ev.from], b = layout.desks[ev.to];
        const from = ws.roles.find(r => r.id === ev.from)?.name ?? ev.from;
        const to = ws.roles.find(r => r.id === ev.to)?.name ?? ev.to;
        log('info', ev.revise ? `${from} meminta revisi dari ${to}.` : `${from} menyerahkan hasil ke ${to}.`);
        if (!a || !b) break;
        life?.cancel(ev.to); life?.cancel(ev.from);
        patchRole(ev.from, { status: ev.revise ? 'Mengirim revisi' : 'Menyerahkan', carrying: true, activity: null, pose: 'none', sit: false, heading: null });
        await get().requestWalk(ev.from, pathBetween(layout, a, b));
        patchRole(ev.from, { faceTo: ev.to }); patchRole(ev.to, { faceTo: ev.from, bubble: '!' });
        await pause(900);
        patchRole(ev.to, { bubble: null, faceTo: null });
        patchRole(ev.from, { carrying: false, faceTo: null });
        await get().requestWalk(ev.from, pathBack(layout, a, b));
        patchRole(ev.from, { status: 'Siaga' });
        break;
      }
      case 'done': {
        const last = get().currentRole;
        log('final', `Hasil akhir siap (${ev.text.length.toLocaleString('id-ID')} karakter). Lihat di tab Pekerjaan.`);
        set(s => ({ confetti: s.confetti + 1, selectedJobId: s.selectedJobId ?? ev.job }));
        if (last) say(last, 'Selesai!', 2200);
        await pause(1800);
        if (!othersBusy(ev.job)) settle();
        await releaseTemps(ev.job);
        break;
      }
      case 'error':
        log('error', ev.message); if (!othersBusy(ev.job)) settle(); await releaseTemps(ev.job); break;
      case 'stopped':
        log('info', ev.message); if (!othersBusy(ev.job)) settle(); await releaseTemps(ev.job); break;
    }
  }

  return {
    ws: defaultWorkspace(), loaded: false, loadError: null, saveState: 'idle', serverUp: false,
    claude: null, claudeLoading: false, claudeNote: null,
    skills: [], skillsLoading: false, skillsError: null, defaultWorkdir: '',
    jobs: [], selectedJobId: null, logs: {}, pending: {}, composer: { task: '', mode: 'auto', target: '', projectId: '' }, composerError: null, running: false,
    speed: 1, lifeOn: true, viewFloor: 0, cameraFocus: null, drawerOpen: true, trailOpen: false,
    rt: {}, trail: [], visited: [], currentRole: null, confetti: 0, walks: {},

    async init() {
      if (started) return;
      started = true;
      api.events(ev => {
        if (ev.type === 'job') { upsertJob(ev.job); return; }
        if (ev.type === 'log') { set(s => ({ logs: { ...s.logs, [ev.job]: [...(s.logs[ev.job] ?? []).filter(e => e.id !== ev.entry.id), ev.entry].slice(-600) } })); return; }
        if (ev.type === 'jobdeleted') {
          set(s => { const { [ev.job]: _l, ...logs } = s.logs; const jobs = s.jobs.filter(j => j.id !== ev.job); return { jobs, logs, running: jobs.some(j => j.status === 'running'), selectedJobId: s.selectedJobId === ev.job ? null : s.selectedJobId }; });
          return;
        }
        queue = queue.then(() => handle(ev)).catch(console.error);
      }, up => set({ serverUp: up }));

      try {
        const saved = await api.getWorkspace();
        const ws = saved ? normalizeWorkspace(saved) : defaultWorkspace();
        set({ ws, loaded: true, rt: freshRuntime(ws) });
        if (!saved) await api.saveWorkspace(ws);
        api.config().then(c => set({ defaultWorkdir: c.defaultWorkdir })).catch(() => {});
        api.jobs().then(r => {
          const jobs = r.jobs;
          set({ jobs, running: jobs.some(j => j.status === 'running'), selectedJobId: [...jobs].reverse()[0]?.id ?? null });
        }).catch(() => {});
      } catch {
        set({ loaded: true, loadError: 'Server tidak terjangkau. Jalankan `npm run dev` di folder app.', rt: freshRuntime(get().ws) });
      }

      life = startLife({
        roles: () => get().ws.roles,
        layout: () => computeLayout(get().ws),
        speed: () => get().speed,
        enabled: () => get().lifeOn && document.visibilityState === 'visible',
        isFree: id => { const r = get().rt[id]; return !!r && !r.working && !r.carrying && !r.activity && !get().walks[id]; },
        patch: (id, p) => patchRole(id, p),
        say: (id, t, ms) => say(id, t, ms),
        walk: (id, pts, sp) => get().requestWalk(id, pts, sp),
        cancelWalk: id => { get().walks[id]?.resolve(); },
      });
      get().refreshClaude();
      get().loadSkills();
    },

    update(fn) {
      const ws = fn(get().ws);
      set(s => ({ ws, saveState: 'saving', rt: { ...freshRuntime(ws), ...Object.fromEntries(Object.entries(s.rt).filter(([k]) => ws.roles.some(r => r.id === k))) } }));
      clearTimeout(saveTimer);
      saveTimer = setTimeout(async () => {
        try { await api.saveWorkspace(get().ws); set({ saveState: 'saved' }); }
        catch { set({ saveState: 'error' }); }
      }, 500);
    },
    // mengganti perusahaan, tetapi folder proyek tetap milik Anda
    replaceWorkspace(w) { get().update(cur => ({ ...w, projects: cur.projects, defaultProjectId: cur.defaultProjectId, releaseTemps: cur.releaseTemps })); },

    removeRole(id) {
      get().update(w => {
        const roles = w.roles.filter(r => r.id !== id).map(r => ({
          ...r, next: r.next === id ? 'END' : r.next, rejectTo: r.rejectTo === id ? '' : r.rejectTo,
        }));
        return { ...w, roles, coordinatorId: w.coordinatorId === id ? '' : w.coordinatorId };
      });
    },

    setComposer: p => set(s => ({ composer: { ...s.composer, ...p }, composerError: null })),
    async submitJob() {
      const { ws, composer } = get();
      if (!composer.task.trim()) return;
      try {
        const projectId = ws.projects.some(p => p.id === composer.projectId) ? composer.projectId : ws.defaultProjectId;
        const at = addressed(ws, composer.task.trim());
        const { job } = await api.submitJob(ws, at.text, at.role ? 'direct' : composer.mode, at.role?.id ?? composer.target, projectId);
        upsertJob(job);
        set(s => ({ composer: { ...s.composer, task: '' }, composerError: null, selectedJobId: job.id }));
        location.hash = '#jejak';
      } catch (e) { set({ composerError: String((e as Error).message) }); }
    },
    async cancelJob(id) { await api.cancelJob(id).catch(() => {}); },
    async deleteJob(id) { await api.deleteJob(id).catch(() => {}); },
    async deleteJobs(ids) { await Promise.all(ids.map(id => api.deleteJob(id).catch(() => {}))); },
    async loadLog(id) {
      try {
        const r = await api.job(id);
        // gabungkan dengan baris yang sudah datang lewat SSE dan catatan lokal
        set(s => {
          const have = new Set(r.log.map(e => e.id));
          const extra = (s.logs[id] ?? []).filter(e => e.id < 0 || (!have.has(e.id) && e.id > (r.log[r.log.length - 1]?.id ?? 0)));
          return { logs: { ...s.logs, [id]: [...r.log, ...extra] } };
        });
        upsertJob(r.job);
      } catch { /* sesi sudah dihapus */ }
    },
    /** Pesan lanjutan atau perintah slash di sebuah sesi, seperti mengetik di terminal Claude Code. */
    async sendMessage(id, raw) {
      const text = raw.trim();
      if (!text) return;
      const { ws, jobs, pending } = get();
      const job = jobs.find(j => j.id === id);
      if (!job) return;
      const live = job.status === 'queued' || job.status === 'running';
      const say = (t: string) => localLog(id, 'local', t);
      const pend = pending[id] ?? {};
      const setPend = (p: object) => set(s => ({ pending: { ...s.pending, [id]: { ...s.pending[id], ...p } } }));

      if (text.startsWith('/')) {
        const [cmd, ...rest] = text.slice(1).split(/\s+/);
        const arg = rest.join(' ').trim();
        switch (cmd.toLowerCase()) {
          case 'help': case '?':
            say(HELP); return;
          case 'stop':
            if (live) { await api.cancelJob(id).catch(() => {}); } else say('Tidak ada yang sedang berjalan.');
            return;
          case 'delete': case 'clear': case 'hapus':
            await api.deleteJob(id).catch(() => {}); return;
          case 'files': case 'berkas':
            say(job.files?.length ? `Berkas hasil di **${job.project?.name ?? 'proyek'}**:\n\n${job.files.map(f => `- \`${f.path}\``).join('\n')}` : 'Belum ada berkas hasil di sesi ini.');
            return;
          case 'team': case 'tim': {
            const names = job.team?.length ? job.team.map(m => `- ${m.name}, ${m.title}${m.why ? `: ${m.why}` : ''}`).join('\n') : 'Belum ada karyawan kontrak yang direkrut. Tim tetap: ' + ws.roles.filter(r => !r.temp).map(r => r.name).join(', ') + '.';
            say(`Tim sesi ini:\n\n${names}`); return;
          }
          case 'model': {
            if (!arg) { say(`Model sesi: ${job.opts?.model ?? pend.model ?? 'sesuai tiap karyawan'}. Pilihan: haiku, sonnet, opus, default.`); return; }
            if (!['haiku', 'sonnet', 'opus', 'default'].includes(arg)) { say('Pilihan model: haiku, sonnet, opus, atau default.'); return; }
            setPend({ model: arg }); say(`Model untuk pesan berikutnya: ${arg === 'default' ? 'sesuai tiap karyawan' : arg}.`); return;
          }
          case 'budget': {
            const n = Number(arg);
            if (!Number.isFinite(n) || n < 1 || n > 60) { say(`Anggaran panggilan per giliran: ${job.budget ?? ws.maxCalls}. Contoh: /budget 20 (1 sampai 60).`); return; }
            setPend({ maxCalls: Math.round(n) }); say(`Anggaran untuk pesan berikutnya: ${Math.round(n)} panggilan.`); return;
          }
          case 'mode': {
            const [m, ...who] = arg.split(/\s+/);
            if (!['auto', 'direct', 'playbook'].includes(m)) { say(`Mode sekarang: ${pend.mode ?? job.mode}. Pilihan: /mode auto, /mode direct <nama karyawan>, /mode playbook <nama karyawan>.`); return; }
            if (m === 'auto') { setPend({ mode: 'auto', target: '' }); say('Pesan berikutnya ditangani sekretaris dan tim yang dibentuknya.'); return; }
            const r = findRole(ws, who.join(' '));
            if (!r) { say('Sebutkan nama karyawannya, mis. /mode direct Nala.'); return; }
            setPend({ mode: m as JobMode, target: r.id }); say(`Pesan berikutnya ${m === 'direct' ? 'dikerjakan langsung oleh' : 'memulai alur dari'} ${r.name}.`); return;
          }
          default: {
            // /nama-skill argumen: minta karyawan memakai skill itu
            const skill = get().skills.find(k => k === cmd || k.endsWith(`:${cmd}`));
            if (!skill) { say(`Perintah /${cmd} tidak dikenal. Ketik /help untuk daftar perintah.`); return; }
            return get().sendMessage(id, `Gunakan skill "${skill}"${arg ? ` untuk ini: ${arg}` : ''}.`);
          }
        }
      }

      if (live) { say('Sesi masih bekerja. Tunggu selesai atau ketik /stop.'); return; }
      const at = addressed(ws, text);
      const mode: JobMode = at.role ? 'direct' : pend.mode ?? job.mode;
      const target = at.role?.id ?? pend.target ?? job.target ?? '';
      try {
        const { job: j } = await api.sendMessage(id, ws, at.text, mode, target, { model: pend.model, maxCalls: pend.maxCalls });
        upsertJob(j);
        set(s => { const { [id]: _p, ...pending } = s.pending; return { pending }; });
      } catch (e) { localLog(id, 'error', String((e as Error).message)); }
    },
    selectJob: id => set({ selectedJobId: id }),
    setSpeed: speed => set({ speed }),
    setLife(on) {
      set({ lifeOn: on });
      if (!on) get().ws.roles.forEach(r => life?.cancel(r.id));
    },

    setViewFloor: f => set({ viewFloor: Math.max(0, f) }),
    setDrawer: open => set({ drawerOpen: open }),
    focusRoom(id) {
      const r = computeLayout(get().ws).rooms.find(x => x.id === id);
      if (!r) return;
      set(s => ({ viewFloor: r.floor, cameraFocus: { x: r.cx, y: r.y, z: r.cz, seq: (s.cameraFocus?.seq ?? 0) + 1 } }));
    },
    setTrail: open => set({ trailOpen: open }),
    focusRole(id) {
      const p = positions[id];
      if (!p) return;
      set(s => ({ viewFloor: Math.max(s.viewFloor, floorOf(p.y)), cameraFocus: { x: p.x, y: p.y, z: p.z, seq: (s.cameraFocus?.seq ?? 0) + 1 } }));
    },

    async refreshClaude() {
      set({ claudeLoading: true });
      try { set({ claude: await api.claudeStatus(), claudeLoading: false }); }
      catch (e) { set({ claude: { installed: false, error: String((e as Error).message) }, claudeLoading: false }); }
    },
    async loadSkills() {
      set({ skillsLoading: true, skillsError: null });
      try {
        const r = await api.skills();
        set({ skills: r.skills, skillsLoading: false, skillsError: r.error ?? null });
      } catch (e) { set({ skillsLoading: false, skillsError: String((e as Error).message) }); }
    },
    async loginClaude() {
      set({ claudeNote: 'Membuka halaman login Claude di browser…' });
      try {
        await api.claudeLogin();
        set({ claudeNote: 'Selesaikan login di browser, lalu tekan "Periksa status".' });
      } catch (e) { set({ claudeNote: String((e as Error).message) }); }
    },
    async testClaude() {
      set({ claudeNote: 'Menguji dengan satu permintaan kecil (Haiku)…' });
      const r: { ok: boolean; ms?: number; error?: string } = await api.claudeTest().catch(e => ({ ok: false, error: String(e.message) }));
      set({ claudeNote: r.ok ? `Tersambung. Balasan dalam ${((r.ms ?? 0) / 1000).toFixed(1)} detik.` : `Gagal: ${r.error}` });
    },

    requestWalk(id, pts, speed = 1) {
      return new Promise<void>(resolve => {
        get().walks[id]?.resolve();           // jalan yang lama dilepas agar pemanggilnya tidak menggantung
        const t = setTimeout(done, 25000);
        function done() { clearTimeout(t); set(s => (s.walks[id]?.resolve === done ? { walks: { ...s.walks, [id]: undefined } } : s)); resolve(); }
        set(s => ({ walks: { ...s.walks, [id]: { pts, resolve: done, speed } } }));
      });
    },
  };
});

if (import.meta.env.DEV) Object.assign(window, { __store: useStore, __pos: positions, __default: defaultWorkspace });

export const roleById =(ws: Workspace, id: string): Role | undefined => ws.roles.find(r => r.id === id);

const HELP = [
  '**Perintah sesi**',
  '',
  '- `/stop` hentikan yang sedang berjalan',
  '- `/delete` hapus sesi ini (berkas hasil di folder proyek tetap ada)',
  '- `/files` daftar berkas hasil, bisa diklik',
  '- `/team` siapa saja yang bekerja di sesi ini',
  '- `/model haiku|sonnet|opus|default` ganti model untuk pesan berikutnya',
  '- `/budget 20` batas panggilan per giliran',
  '- `/mode auto` atau `/mode direct Nala` ganti cara penugasan',
  '- `/nama-skill teks` minta karyawan memakai sebuah skill',
  '- `@Nala teks` kirim pesan langsung ke satu karyawan',
  '',
  'Pesan biasa melanjutkan percakapan: sekretaris membaca hasil sebelumnya dan membagi pekerjaan lagi.',
].join('\n');

/** Cari karyawan dari nama (awalan atau mengandung, tanpa peduli huruf besar). */
function findRole(ws: Workspace, q: string): Role | undefined {
  const n = q.trim().toLowerCase();
  if (!n) return undefined;
  return ws.roles.find(r => r.name.toLowerCase() === n) ?? ws.roles.find(r => r.name.toLowerCase().startsWith(n)) ?? ws.roles.find(r => r.name.toLowerCase().includes(n));
}

/** "@Nala tulis laporan": pesan untuk satu karyawan. Nama boleh lebih dari satu kata; yang terpanjang yang cocok dipakai. */
function addressed(ws: Workspace, text: string): { role?: Role; text: string } {
  if (!text.startsWith('@')) return { text };
  const body = text.slice(1);
  const hit = [...ws.roles].sort((a, b) => b.name.length - a.name.length).find(r => body.toLowerCase().startsWith(r.name.toLowerCase()));
  if (!hit) return { text };
  return { role: hit, text: body.slice(hit.name.length).trim() || text };
}
