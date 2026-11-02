import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { validateCompany, validatePlaybook } from '../validate';
import type { Job, JobMode, JobStatus } from '../types';
import { Chip, Confirm, EmptyState, SearchBox, Seg } from './kit';
import { FolderPreview } from './Settings';

const MODES: { v: JobMode; label: string }[] = [
  { v: 'auto', label: 'Otomatis' }, { v: 'direct', label: 'Pilih karyawan' }, { v: 'playbook', label: 'Playbook' },
];
const STATUS: Record<JobStatus, string> = { queued: 'Antre', running: 'Berjalan', done: 'Selesai', error: 'Gagal', stopped: 'Dihentikan' };
const TONE: Record<JobStatus, 'accent' | 'cool' | 'bad' | undefined> = { queued: undefined, running: 'accent', done: 'cool', error: 'bad', stopped: undefined };

const clock = (t?: number) => (t ? new Date(t).toLocaleTimeString('id-ID', { hour12: false }) : '');

function JobRow({ job, selected, onOpen }: { job: Job; selected: boolean; onOpen: () => void }) {
  const cancelJob = useStore(s => s.cancelJob);
  const deleteJob = useStore(s => s.deleteJob);
  const live = job.status === 'queued' || job.status === 'running';
  const turns = job.turns?.length ?? 1;
  return (
    <li className={`rowitem ${selected ? 'rowitem--on' : ''}`}>
      <button type="button" className="rowitem__main" onClick={onOpen} aria-pressed={selected}>
        <span className="rowitem__name job__task">{job.task}</span>
        <span className="rowitem__chips">
          <Chip tone={TONE[job.status]}>{STATUS[job.status]}</Chip>
          <span className="measured">{clock(job.updatedAt ?? job.createdAt)}</span>
          {turns > 1 && <span className="measured">{turns} pesan</span>}
          {job.calls > 0 && <span className="measured">{job.calls} panggilan</span>}
          {!!job.files?.length && <span className="measured">{job.files.length} berkas</span>}
        </span>
      </button>
      {live && <button type="button" className="btn btn--small" onClick={() => cancelJob(job.id)}>{job.status === 'running' ? 'Hentikan' : 'Batalkan'}</button>}
      <Confirm label="Hapus" confirmLabel="Ya, hapus" onConfirm={() => deleteJob(job.id)} />
    </li>
  );
}

type View = 'antrean' | 'riwayat';

export function JobsPanel() {
  const { ws, composer, setComposer, submitJob, composerError, jobs, selectedJobId, selectJob, claude, update, deleteJobs } = useStore();
  const [view, setView] = useState<View>('antrean');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | JobStatus>('all');

  const connected = !!(claude?.installed && claude.loggedIn);
  const coordinator = ws.roles.find(r => r.id === ws.coordinatorId);
  const target = ws.roles.some(r => r.id === composer.target) ? composer.target : '';
  const projectId = ws.projects.some(p => p.id === composer.projectId) ? composer.projectId : ws.defaultProjectId;
  const project = ws.projects.find(p => p.id === projectId) ?? ws.projects[0];
  const issues = [
    ...validateCompany(ws),
    ...(composer.mode === 'auto' && !coordinator ? [{ level: 'error' as const, text: 'Belum ada koordinator. Pilih satu di tab Karyawan, atau tunjuk karyawan langsung.' }] : []),
    ...(composer.mode === 'direct' && !target && !composer.task.trim().startsWith('@') ? [{ level: 'error' as const, text: 'Pilih karyawan yang akan mengerjakan, atau awali pekerjaan dengan @nama.' }] : []),
    ...(composer.mode === 'playbook' ? validatePlaybook(ws, target) : []),
  ];
  const blocked = issues.some(i => i.level === 'error') || !composer.task.trim() || !connected;

  const live = jobs.filter(j => j.status === 'queued' || j.status === 'running');
  const past = useMemo(() => [...jobs].filter(j => j.status !== 'queued' && j.status !== 'running').reverse(), [jobs]);
  const filtered = past.filter(j => (status === 'all' || j.status === status) && j.task.toLowerCase().includes(q.trim().toLowerCase()));

  const open = (id: string) => { selectJob(id); location.hash = '#jejak'; };

  return (
    <div className="stack">
      <section className="composer" aria-label="Pekerjaan baru">
        <div className="field">
          <label htmlFor="task">Sesi pekerjaan baru</label>
          <textarea id="task" rows={3} value={composer.task} placeholder="Tulis pekerjaan dengan bahasa Anda sendiri. Awali dengan @nama untuk satu karyawan. Ctrl+Enter untuk melempar."
            onChange={e => setComposer({ task: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !blocked) submitJob(); }} />
        </div>
        <div className="field">
          <label htmlFor="project">Folder proyek untuk pekerjaan ini</label>
          <select id="project" value={projectId} onChange={e => setComposer({ projectId: e.target.value })}>
            {ws.projects.map(p => <option key={p.id} value={p.id}>{p.name}{ws.defaultProjectId === p.id ? ' (bawaan)' : ''}</option>)}
          </select>
          <details className="folder__details">
            <summary>Isi folder dan tempat menaruh berkas</summary>
            {project && <FolderPreview path={project.path} />}
            <p className="hint">Taruh berkas yang perlu dibaca agen di folder ini. Agen dengan akses Skill atau Kerja bisa membukanya, dan hasil kerja disimpan di sini. Kelola folder di <a href="#pengaturan">Pengaturan</a>.</p>
          </details>
        </div>
        <Seg label="Penugasan" value={composer.mode} onChange={v => setComposer({ mode: v })} options={MODES} />
        <p className="hint">
          {composer.mode === 'auto' && (coordinator ? `${coordinator.name} membentuk tim dari karyawan yang ada dan merekrut peran serta tingkat yang tepat dari katalog bila perlu. Anggota tim bekerja bersamaan.` : 'Koordinator membentuk tim dan membagi pekerjaan.')}
          {composer.mode === 'direct' && 'Satu karyawan yang Anda pilih mengerjakan langsung. Sekitar 1 panggilan.'}
          {composer.mode === 'playbook' && 'Mengikuti alur "setelah ini" dari karyawan yang Anda pilih.'}
          {' '}Setelah selesai, Anda bisa melanjutkan percakapannya di tab Jejak.
        </p>
        <div className="row row--between composer__bar">
          {composer.mode !== 'auto' && (
            <div className="field field--inline">
              <label htmlFor="target">{composer.mode === 'direct' ? 'Karyawan' : 'Mulai dari'}</label>
              <select id="target" value={target} onChange={e => setComposer({ target: e.target.value })}>
                <option value="">Pilih karyawan</option>
                {ws.roles.map(r => <option key={r.id} value={r.id}>{r.name}{r.title ? `, ${r.title}` : ''}</option>)}
              </select>
            </div>
          )}
          <div className="field field--inline">
            <label htmlFor="budget">Anggaran panggilan per giliran</label>
            <select id="budget" value={ws.maxCalls} onChange={e => update(w => ({ ...w, maxCalls: Number(e.target.value) }))}>
              <option value={6}>6, hemat</option><option value={12}>12</option><option value={24}>24, longgar</option><option value={40}>40</option>
            </select>
          </div>
          <button type="button" className="btn btn--primary" onClick={submitJob} disabled={blocked}>Mulai sesi</button>
        </div>
        {!connected && <p className="note">Hubungkan Claude dulu di <a href="#pengaturan">Pengaturan</a> supaya karyawan bisa bekerja.</p>}
        {composerError && <p className="banner banner--bad" role="alert">{composerError}</p>}
        {issues.length > 0 && composer.task.trim() && (
          <ul className="issues" aria-label="Masalah">{issues.map((i, k) => <li key={k} className={`issue issue--${i.level}`}>{i.text}</li>)}</ul>
        )}
      </section>

      <Seg label="Daftar sesi" value={view} onChange={setView} options={[{ v: 'antrean', label: `Berjalan ${live.length}` }, { v: 'riwayat', label: `Riwayat ${past.length}` }]} />

      {view === 'antrean' && (
        live.length ? <ul className="rows">{live.map(j => <JobRow key={j.id} job={j} selected={j.id === selectedJobId} onOpen={() => open(j.id)} />)}</ul>
          : <EmptyState title="Tidak ada sesi berjalan" text="Mulai satu sesi, atau buka sesi lama dari Riwayat untuk melanjutkannya." />
      )}

      {view === 'riwayat' && (
        <div className="stack">
          <div className="toolbar">
            <SearchBox value={q} onChange={setQ} label="Cari riwayat" placeholder="Cari isi pekerjaan" />
            <Seg small label="Filter status" value={status} onChange={setStatus} options={[{ v: 'all', label: 'Semua' }, { v: 'done', label: 'Selesai' }, { v: 'error', label: 'Gagal' }, { v: 'stopped', label: 'Dihentikan' }]} />
          </div>
          {!past.length ? <EmptyState title="Riwayat masih kosong" text="Setiap sesi yang selesai, gagal, atau dihentikan tersimpan di sini dan bisa dilanjutkan." />
            : !filtered.length ? <EmptyState title="Tidak ada yang cocok" text="Tidak ada sesi yang cocok dengan pencarian ini."><button type="button" className="btn" onClick={() => { setQ(''); setStatus('all'); }}>Hapus filter</button></EmptyState>
            : (
              <>
                <ul className="rows">{filtered.map(j => <JobRow key={j.id} job={j} selected={j.id === selectedJobId} onOpen={() => open(j.id)} />)}</ul>
                <div className="row"><Confirm label={`Hapus ${filtered.length} sesi di daftar ini`} confirmLabel="Ya, hapus semuanya" onConfirm={() => deleteJobs(filtered.map(j => j.id))} /></div>
              </>
            )}
        </div>
      )}
    </div>
  );
}
