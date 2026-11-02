import { useEffect, useState } from 'react';
import { api } from '../api';
import { useStore } from '../store';
import { TEMPLATES } from '../templates';
import { ClaudePanel } from './ClaudePanel';
import { Chip, Confirm, Group, uid } from './kit';

type Files = { name: string; dir: boolean; size: number }[];
const fmt = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`);

/** Isi sebuah folder proyek, supaya terlihat berkas apa yang bisa dibaca agen. */
export function FolderPreview({ path, onResolved }: { path: string; onResolved?: (p: string) => void }) {
  const [state, setState] = useState<{ path: string; files: Files; error?: string } | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setState(null);
    api.folder(path).then(r => { if (live) { setState(r); if (r.path) onResolved?.(r.path); } }).catch(e => live && setState({ path: '', files: [], error: String(e.message) }));
    return () => { live = false; };
  }, [path, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return <p className="hint">Membaca folder…</p>;
  if (state.error) return <p className="banner banner--bad" role="alert">{state.error}</p>;
  return (
    <div className="folder">
      <div className="row row--between">
        <span className="measured folder__path" title={state.path}>{state.path}</span>
        <span className="row row--tight">
          <button type="button" className="btn btn--small" onClick={() => setTick(t => t + 1)}>Muat ulang</button>
          <button type="button" className="btn btn--small" onClick={() => api.openFolder(path).catch(() => {})}>Buka folder</button>
        </span>
      </div>
      {state.files.length ? (
        <ul className="folder__list">
          {state.files.slice(0, 40).map(f => <li key={f.name}><span>{f.name}{f.dir ? '/' : ''}</span>{!f.dir && <span className="measured">{fmt(f.size)}</span>}</li>)}
          {state.files.length > 40 && <li className="hint">dan {state.files.length - 40} lainnya</li>}
        </ul>
      ) : <p className="hint">Folder masih kosong. Taruh berkas di sini, lalu agen dengan akses Skill atau Kerja bisa membacanya.</p>}
    </div>
  );
}

function ProjectManager() {
  const { ws, update, running } = useStore();
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const add = () => {
    if (!name.trim()) return;
    const p = { id: uid('proyek'), name: name.trim(), path: path.trim() };
    update(w => ({ ...w, projects: [...w.projects, p] }));
    setName(''); setPath(''); setOpen(p.id);
  };
  const set = (id: string, patch: Partial<{ name: string; path: string }>) => update(w => ({ ...w, projects: w.projects.map(p => p.id === id ? { ...p, ...patch } : p) }));
  return (
    <div className="stack">
      <p className="lead-s">Folder proyek adalah tempat Anda menaruh berkas untuk agen. Pilih salah satunya saat melempar pekerjaan. Kosongkan path untuk memakai folder bawaan aplikasi.</p>
      <ul className="rows">
        {ws.projects.map(p => (
          <li key={p.id} className="projectitem">
            <div className="rowitem">
              <button type="button" className="rowitem__main" aria-expanded={open === p.id} onClick={() => setOpen(open === p.id ? null : p.id)}>
                <span className="rowitem__name">{p.name}{ws.defaultProjectId === p.id && <Chip tone="accent">Bawaan</Chip>}</span>
                <span className="rowitem__sub measured">{p.path || 'folder bawaan aplikasi'}</span>
              </button>
            </div>
            {open === p.id && (
              <div className="stack projectitem__body">
                <div className="grid2">
                  <div className="field"><label htmlFor={`pn-${p.id}`}>Nama</label><input id={`pn-${p.id}`} value={p.name} onChange={e => set(p.id, { name: e.target.value })} /></div>
                  <div className="field"><label htmlFor={`pp-${p.id}`}>Path folder</label><input id={`pp-${p.id}`} value={p.path} placeholder="mis. D:\\Proyek\\Laporan" onChange={e => set(p.id, { path: e.target.value })} /></div>
                </div>
                <FolderPreview path={p.path} />
                <div className="row">
                  {ws.defaultProjectId !== p.id && <button type="button" className="btn btn--small" onClick={() => update(w => ({ ...w, defaultProjectId: p.id }))}>Jadikan bawaan</button>}
                  {ws.projects.length > 1 && <Confirm label="Hapus" confirmLabel="Ya, hapus" disabled={running}
                    onConfirm={() => update(w => { const projects = w.projects.filter(x => x.id !== p.id); return { ...w, projects, defaultProjectId: w.defaultProjectId === p.id ? projects[0].id : w.defaultProjectId }; })} />}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="composer">
        <div className="grid2">
          <div className="field"><label htmlFor="pn-new">Nama proyek baru</label><input id="pn-new" value={name} onChange={e => setName(e.target.value)} placeholder="mis. Laporan bulanan" /></div>
          <div className="field"><label htmlFor="pp-new">Path folder</label><input id="pp-new" value={path} onChange={e => setPath(e.target.value)} placeholder="mis. D:\Proyek\Laporan" /></div>
        </div>
        <div className="row"><button type="button" className="btn" onClick={add} disabled={!name.trim()}>Tambah proyek</button></div>
        <p className="hint">Gunakan path absolut. Akar drive, folder sistem, dan folder home tidak diizinkan. Folder dibuat bila belum ada.</p>
      </div>
    </div>
  );
}

/** Pengaturan perusahaan dan koneksi, dikelompokkan supaya tidak satu gulungan panjang. */
export function SettingsPanel() {
  const { ws, update, replaceWorkspace, running, lifeOn, setLife, claude } = useStore();
  const connected = !!(claude?.installed && claude.loggedIn);
  return (
    <div className="stack">
      <Group title="Perusahaan">
        <div className="stack">
          <div className="field">
            <label htmlFor="company">Nama perusahaan</label>
            <input id="company" value={ws.company.name} onChange={e => update(w => ({ ...w, company: { name: e.target.value } }))} />
          </div>
          <label className="check"><input type="checkbox" checked={ws.releaseTemps} onChange={e => update(w => ({ ...w, releaseTemps: e.target.checked }))} />
            <span>Lepas karyawan kontrak setelah pekerjaan selesai. Karyawan kontrak direkrut sekretaris untuk satu pekerjaan, lalu pulang lewat pintu depan.</span></label>
        </div>
      </Group>

      <Group title="Folder proyek" count={ws.projects.length}>
        <ProjectManager />
      </Group>

      <Group title="Suasana kantor" defaultOpen={false}>
        <div className="stack">
          <div className="field">
            <label htmlFor="npc">Keramaian: <span className="measured">{ws.npcCount}</span> NPC</label>
            <input id="npc" type="range" min={0} max={12} value={ws.npcCount} onChange={e => update(w => ({ ...w, npcCount: Number(e.target.value) }))} />
            <span className="hint">Pengunjung dan staf lain yang berkeliaran. Hanya animasi, tidak memakai kuota.</span>
          </div>
          <label className="check"><input type="checkbox" checked={lifeOn} onChange={e => setLife(e.target.checked)} />
            <span>Kehidupan kantor: karyawan yang menganggur berkeliling, duduk, dan ngobrol. Hanya animasi.</span></label>
        </div>
      </Group>

      <Group title="Koneksi Claude dan skill" defaultOpen={!connected}>
        <ClaudePanel />
      </Group>

      <Group title="Mulai dari contoh" defaultOpen={false} count={TEMPLATES.length}>
        <ul className="templates">
          {TEMPLATES.map(t => (
            <li key={t.id}>
              <div><b>{t.name}</b><p className="hint">{t.description}</p></div>
              <Confirm label="Pakai" confirmLabel="Ganti semua" disabled={running} onConfirm={() => replaceWorkspace(t.make())} />
            </li>
          ))}
        </ul>
        <p className="hint">Memakai contoh mengganti semua ruangan dan karyawan Anda. Folder proyek tetap.</p>
      </Group>
    </div>
  );
}
