import { useEffect, useRef, useState } from 'react';
import { roleById, useStore } from '../store';

export function TopBar() {
  const saveState = useStore(s => s.saveState);
  const claude = useStore(s => s.claude);
  const loading = useStore(s => s.claudeLoading);
  const company = useStore(s => s.ws.company.name);
  const drawerOpen = useStore(s => s.drawerOpen);
  const setDrawer = useStore(s => s.setDrawer);
  const running = useStore(s => s.running);
  const connected = claude?.installed && claude.loggedIn;
  const label = loading && !claude ? 'Memeriksa Claude…'
    : !claude?.installed ? 'Claude belum terpasang'
    : claude.loggedIn ? `Claude tersambung${claude.plan ? `, ${claude.plan}` : ''}`
    : 'Claude belum login';
  const save = { idle: '', saving: 'Menyimpan…', saved: 'Tersimpan', error: 'Gagal menyimpan' }[saveState];
  return (
    <header className="topbar">
      <div className="topbar__brand pill">
        <span className="wordmark">Kantor Agen</span>
        <span className="topbar__company">{company}</span>
      </div>
      <div className="topbar__right pill">
        {running && <span className="chip chip--warn" role="status">Pekerjaan berjalan</span>}
        {save && <span className={`measured save save--${saveState}`} role="status">{save}</span>}
        <a className={`chip ${connected ? 'chip--cool' : 'chip--warn'}`} href="#pengaturan" onClick={() => setDrawer(true)}>{label}</a>
        <button type="button" className={`btn btn--small ${drawerOpen ? 'btn--on' : ''}`} aria-expanded={drawerOpen} onClick={() => setDrawer(!drawerOpen)}>Panel</button>
      </div>
    </header>
  );
}

/** Pilih lantai, pusatkan kamera, layar penuh, bantuan. */
export function Tools() {
  const ws = useStore(s => s.ws);
  const viewFloor = useStore(s => s.viewFloor);
  const setViewFloor = useStore(s => s.setViewFloor);
  const [help, setHelp] = useState(false);
  const [full, setFull] = useState(false);
  const floors = Math.max(1, ...ws.rooms.map(r => r.floor + 1));
  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  const toggleFull = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen().catch(() => {}); };
  return (
    <>
      <div className="tools pill" role="toolbar" aria-label="Kamera dan lantai">
        {Array.from({ length: floors }, (_, i) => floors - 1 - i).map(f => (
          <button key={f} type="button" className={`btn ${viewFloor === f ? 'btn--on' : ''}`} aria-pressed={viewFloor === f} aria-label={`Lantai ${f + 1}`} onClick={() => setViewFloor(f)}>L{f + 1}</button>
        ))}
        {floors > 1 && <div className="tools__sep" />}
        <button type="button" className="btn" aria-label="Pusatkan kamera" title="Pusatkan kamera (R)" onClick={() => window.dispatchEvent(new Event('office:resetcam'))}>Pusat</button>
        <button type="button" className={`btn ${full ? 'btn--on' : ''}`} aria-pressed={full} aria-label="Layar penuh" title="Layar penuh" onClick={toggleFull}>Penuh</button>
        <button type="button" className={`btn ${help ? 'btn--on' : ''}`} aria-pressed={help} aria-label="Bantuan kontrol" onClick={() => setHelp(!help)}>?</button>
      </div>
      {help && (
        <div className="help pill" role="note">
          <h2>Kontrol kamera</h2>
          <dl>
            <dt>Seret</dt><dd>geser pandangan</dd>
            <dt>Klik kanan, seret</dt><dd>putar</dd>
            <dt>Roda</dt><dd>zoom ke kursor</dd>
            <dt>W A S D</dt><dd>berjalan, Shift lebih cepat</dd>
            <dt>Q E</dt><dd>putar kiri dan kanan</dd>
            <dt>R</dt><dd>kembali ke tengah</dd>
            <dt>L1 L2 L3</dt><dd>pilih lantai yang tampak</dd>
          </dl>
        </div>
      )}
    </>
  );
}

const plain = (t: string, n = 240) => {
  const x = t.replace(/```[\s\S]*?```/g, ' (kode) ').replace(/[*_`#>|]/g, '').replace(/\s+/g, ' ').trim();
  return x.length > n ? x.slice(0, n) + '…' : x;
};

/** Kotak obrolan di pojok kiri bawah seperti chat game: aliran kejadian sesi yang aktif, kemajuan di kepala, dan satu baris untuk mengetik. */
export function ChatBox() {
  const jobs = useStore(s => s.jobs);
  const logs = useStore(s => s.logs);
  const ws = useStore(s => s.ws);
  const selectedJobId = useStore(s => s.selectedJobId);
  const selectJob = useStore(s => s.selectJob);
  const loadLog = useStore(s => s.loadLog);
  const sendMessage = useStore(s => s.sendMessage);
  const setDrawer = useStore(s => s.setDrawer);
  const [open, setOpen] = useState(true);
  const [text, setText] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  const live = jobs.filter(j => j.status === 'running' || j.status === 'queued');
  const job = jobs.find(j => j.id === selectedJobId) ?? live[live.length - 1] ?? jobs[jobs.length - 1];
  const lines = ((job && logs[job.id]) ?? []).filter(e => e.kind !== 'files' || e.files?.length).slice(-60);
  useEffect(() => { if (job && !logs[job.id]) void loadLog(job.id); }, [job?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (stick.current) end.current?.scrollIntoView({ block: 'end' }); }, [lines.length, open, job?.id]);

  if (!jobs.length) return null;
  const budget = job.budget ?? ws.maxCalls;
  const pct = job.status === 'running' ? Math.min(0.94, Math.max(0.06, job.calls / Math.max(1, budget))) : job.status === 'queued' ? 0 : 1;
  const who = (e: (typeof lines)[number]) => (e.role ? roleById(ws, e.role)?.name ?? e.name ?? '' : e.name ?? '');
  const tabs = [...live, ...jobs.filter(j => !live.includes(j)).slice(-3).reverse()].slice(0, 5);
  const send = () => { const t = text.trim(); if (!t) return; setText(''); stick.current = true; void sendMessage(job.id, t); };

  return (
    <section className="chat pill" data-open={open} aria-label="Obrolan sesi pekerjaan">
      <header className="chat__head">
        <div className="chat__tabs" role="tablist" aria-label="Sesi">
          {tabs.map(j => (
            <button key={j.id} type="button" role="tab" aria-selected={j.id === job.id} className={`chat__tab chat__tab--${j.status}`} onClick={() => { selectJob(j.id); setOpen(true); }} title={j.task}>
              {j.task}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn--small" onClick={() => { selectJob(job.id); location.hash = '#jejak'; setDrawer(true); }}>Jejak</button>
        <button type="button" className="btn btn--small" aria-expanded={open} aria-label={open ? 'Ciutkan obrolan' : 'Buka obrolan'} onClick={() => setOpen(!open)}>{open ? 'Ciutkan' : 'Buka'}</button>
      </header>
      <div className="chat__bar" role="progressbar" aria-label="Kemajuan sesi" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct * 100)}><i style={{ transform: `scaleX(${pct})` }} /></div>
      {open && (
        <>
          <div className="chat__feed" onScroll={e => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40; }}>
            {lines.map(e => {
              if (e.kind === 'user') return <p key={e.id} className="chat__line chat__line--user"><b>Anda</b> {plain(e.text)}</p>;
              if (e.kind === 'result') return <p key={e.id} className="chat__line"><b>{who(e)}</b> {plain(e.text)}</p>;
              if (e.kind === 'tool') return <p key={e.id} className="chat__line chat__line--tool">{who(e)} {plain(e.text, 120)}</p>;
              if (e.kind === 'denied') return <p key={e.id} className="chat__line chat__line--denied">{who(e)} ditolak: {plain(e.text.split('. ')[0], 120)}</p>;
              if (e.kind === 'error') return <p key={e.id} className="chat__line chat__line--error">{plain(e.text, 200)}</p>;
              if (e.kind === 'files') return <p key={e.id} className="chat__line chat__line--sys">{e.text}. Buka Jejak untuk melihatnya.</p>;
              return <p key={e.id} className="chat__line chat__line--sys">{plain(e.text, 200)}</p>;
            })}
            {(job.status === 'running' || job.status === 'queued') && <p className="chat__line chat__line--sys">{job.status === 'queued' ? 'Menunggu giliran…' : 'Bekerja…'}</p>}
            <div ref={end} />
          </div>
          <div className="chat__input">
            <label htmlFor="chat-in" className="sr-only">Pesan untuk sesi ini</label>
            <input id="chat-in" type="text" value={text} autoComplete="off" placeholder="Ketik pesan lanjutan, /help untuk perintah"
              onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) send(); }} />
          </div>
        </>
      )}
    </section>
  );
}

/** Kejadian terakhir; klik untuk membuka jejak lengkap. */
export function Toast() {
  const last = useStore(s => s.trail[s.trail.length - 1]);
  const ws = useStore(s => s.ws);
  const setDrawer = useStore(s => s.setDrawer);
  if (!last) return null;
  return (
    <button type="button" className="toast pill" onClick={() => { location.hash = '#jejak'; setDrawer(true); }} aria-label="Buka jejak aktivitas">
      <span className="toast__who">{last.roleId ? roleById(ws, last.roleId)?.name ?? last.roleId : last.kind === 'error' ? 'Galat' : 'Sistem'}</span>
      <span className="toast__text">{last.text}</span>
    </button>
  );
}
