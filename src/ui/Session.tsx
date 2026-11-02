import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import { roleById, useStore } from '../store';
import type { Job, JobFile, LogEntry } from '../types';
import { Chip, Confirm, EmptyState } from './kit';
import { Markdown, type FileResolver } from './Markdown';

const COMMANDS = [
  ['/help', 'daftar perintah'], ['/stop', 'hentikan yang berjalan'], ['/files', 'berkas hasil'], ['/team', 'tim sesi ini'],
  ['/model ', 'haiku, sonnet, opus'], ['/budget ', 'batas panggilan'], ['/mode ', 'auto, direct, playbook'], ['/delete', 'hapus sesi'],
] as const;

const STATUS = { queued: 'Antre', running: 'Berjalan', done: 'Selesai', error: 'Gagal', stopped: 'Dihentikan' } as const;
const TONE = { queued: undefined, running: 'accent', done: 'cool', error: 'bad', stopped: undefined } as const;

const fmtSize = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`);
const clock = (t: number) => new Date(t).toLocaleTimeString('id-ID', { hour12: false });

/** Mengubah teks yang menyebut berkas hasil (path relatif, mutlak, atau nama saja) menjadi alamat yang bisa dibuka di browser. */
function useResolver(job: Job | undefined): FileResolver {
  return useMemo(() => {
    if (!job) return () => null;
    const files = (job.files ?? []).map(f => f.path);
    const root = (job.project?.path ?? '').replace(/\\/g, '/').replace(/\/$/, '').toLowerCase();
    const byName = new Map<string, string[]>();
    for (const f of files) { const b = f.split('/').pop()!.toLowerCase(); byName.set(b, [...(byName.get(b) ?? []), f]); }
    return (raw: string) => {
      let t = raw.trim().replace(/\\/g, '/').replace(/^\.\//, '');
      if (root && t.toLowerCase().startsWith(root + '/')) t = t.slice(root.length + 1);
      const exact = files.find(f => f.toLowerCase() === t.toLowerCase());
      const named = byName.get(t.split('/').pop()!.toLowerCase());
      const rel = exact ?? (named?.length === 1 ? named[0] : undefined);
      return rel ? api.fileUrl(job.id, rel) : null;
    };
  }, [job]);
}

function FileList({ jobId, files }: { jobId: string; files: JobFile[] }) {
  return (
    <ul className="files">
      {files.map(f => (
        <li key={f.path}>
          <a href={api.fileUrl(jobId, f.path)} target="_blank" rel="noreferrer noopener">{f.path}</a>
          <span className="measured">{fmtSize(f.size)}{f.new ? ', baru' : ''}</span>
        </li>
      ))}
    </ul>
  );
}

function Entry({ e, job, resolve }: { e: LogEntry; job: Job; resolve: FileResolver }) {
  const ws = useStore(s => s.ws);
  const who = e.role ? roleById(ws, e.role)?.name ?? e.name ?? e.role : e.name ?? '';
  const title = e.role ? roleById(ws, e.role)?.title : '';
  switch (e.kind) {
    case 'user':
      return <li className="sess__row sess__user"><span className="sess__prompt" aria-hidden="true">Anda</span><div><Markdown text={e.text} resolve={resolve} /></div></li>;
    case 'result':
      return (
        <li className="sess__row sess__result">
          <div className="sess__who"><b>{who || 'Karyawan'}</b>{title && <span>{title}</span>}<span className="measured">{clock(e.t)}</span></div>
          <Markdown text={e.text} resolve={resolve} />
        </li>
      );
    case 'tool':
      return <li className="sess__row sess__tool"><span className="measured">{who}</span><span>{e.text}</span></li>;
    case 'denied':
      return <li className="sess__row sess__denied" role="note"><b>{who}</b> {e.text}</li>;
    case 'error':
      return <li className="sess__row sess__error" role="alert">{e.text}</li>;
    case 'files':
      return (
        <li className="sess__row sess__files">
          <p>{e.text}. Klik untuk membuka di browser.</p>
          {e.files && <FileList jobId={job.id} files={e.files} />}
        </li>
      );
    case 'status':
      return <li className="sess__row sess__status"><span className="measured">{clock(e.t)}</span><span>{e.text}</span></li>;
    case 'local':
      return <li className="sess__row sess__local"><Markdown text={e.text} resolve={resolve} /></li>;
    default:
      return <li className="sess__row sess__status"><span className="measured">{clock(e.t)}</span><span>{e.text}</span></li>;
  }
}

/** Jejak: satu sesi pekerjaan seperti terminal Claude Code. Pesan lanjutan, perintah slash, hasil Markdown, berkas yang bisa dibuka. */
export function SessionView() {
  const { jobs, selectedJobId, selectJob, logs, loadLog, sendMessage, cancelJob, deleteJob, pending, ws, rt } = useStore();
  const job = jobs.find(j => j.id === selectedJobId);
  const loaded = !!job && !!logs[job.id];
  // sesi lama dari sebelum ada log: susun tampilan dari pesan dan langkah yang tersimpan
  const legacy = useMemo<LogEntry[]>(() => {
    if (!job) return [];
    const base = job.createdAt;
    return [
      { id: -1, t: base, kind: 'user' as const, text: job.turns?.[0]?.text ?? job.task },
      ...job.steps.map((s, i) => ({ id: -2 - i, t: base, kind: 'result' as const, role: s.role, name: s.name, text: s.text })),
      ...(job.error ? [{ id: -900, t: base, kind: 'error' as const, text: job.error }] : []),
    ];
  }, [job]);
  const log = job ? (loaded && logs[job.id].length ? logs[job.id] : loaded ? legacy : []) : [];
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const resolve = useResolver(job);
  const live = job?.status === 'queued' || job?.status === 'running';

  useEffect(() => { if (job && !logs[job.id]) void loadLog(job.id); }, [job?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (stick.current) box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [log.length, job?.status]);
  useEffect(() => { stick.current = true; setText(''); box.current?.scrollTo({ top: box.current.scrollHeight }); }, [job?.id]);

  if (!jobs.length) return <EmptyState title="Belum ada sesi" text="Lempar pekerjaan di tab Pekerjaan. Setiap pekerjaan menjadi percakapan yang bisa Anda lanjutkan di sini."><a className="btn btn--primary" href="#pekerjaan">Buka Pekerjaan</a></EmptyState>;
  if (!job) return (
    <div className="stack">
      <EmptyState title="Pilih sebuah sesi" text="Pilih salah satu pekerjaan untuk melihat percakapannya." />
      <ul className="rows">{[...jobs].reverse().map(j => <li key={j.id} className="rowitem"><button type="button" className="rowitem__main" onClick={() => selectJob(j.id)}><span className="rowitem__name job__task">{j.task}</span></button></li>)}</ul>
    </div>
  );

  const working = ws.roles.filter(r => rt[r.id]?.working).map(r => r.name);
  const budget = job.budget ?? job.opts?.maxCalls ?? ws.maxCalls;
  const pend = pending[job.id];
  const slash = text.startsWith('/') && !text.includes(' ') ? COMMANDS.filter(c => c[0].startsWith(text.toLowerCase())) : [];
  const mention = /^@(\S*)$/.exec(text);
  const people = mention ? ws.roles.filter(r => r.name.toLowerCase().includes(mention[1].toLowerCase())).slice(0, 5) : [];

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true); stick.current = true;
    setText('');
    try { await sendMessage(job.id, t); } finally { setSending(false); }
  };

  return (
    <section className="sess" aria-label="Sesi pekerjaan">
      <header className="sess__head">
        <div className="sess__title">
          <select aria-label="Pilih sesi" value={job.id} onChange={e => selectJob(e.target.value)}>
            {[...jobs].reverse().map(j => <option key={j.id} value={j.id}>{j.task.slice(0, 60)}</option>)}
          </select>
          <p className="rowitem__chips">
            <Chip tone={TONE[job.status]}>{STATUS[job.status]}</Chip>
            {job.project && <span className="measured" title={job.project.path}>{job.project.name}</span>}
            <span className="measured">{job.calls} panggilan{live ? `, anggaran giliran ${budget}` : ''}</span>
            {job.opts?.model && <span className="measured">model {job.opts.model}</span>}
          </p>
        </div>
        <div className="row row--tight">
          {live && <button type="button" className="btn btn--small" onClick={() => cancelJob(job.id)}>Hentikan</button>}
          {job.project && <button type="button" className="btn btn--small" onClick={() => api.openFolder(job.project!.path).catch(() => {})}>Folder</button>}
          <Confirm label="Hapus" confirmLabel="Ya, hapus sesi" onConfirm={() => deleteJob(job.id)} />
        </div>
      </header>

      <div className="sess__body" ref={box} onScroll={e => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60; }}>
        {!log.length ? <p className="hint">Membaca catatan sesi…</p> : (
          <ol className="sess__log" aria-live="polite">{log.map(e => <Entry key={e.id} e={e} job={job} resolve={resolve} />)}</ol>
        )}
        {live && (
          <p className="sess__live" role="status">
            {job.status === 'queued' ? 'Menunggu giliran' : working.length ? `${working.join(', ')} bekerja` : 'Sekretaris berpikir'}
          </p>
        )}
      </div>

      <div className="sess__input">
        {pend && (pend.mode || pend.model || pend.maxCalls) && (
          <p className="hint">Untuk pesan berikutnya:{pend.mode ? ` mode ${pend.mode}` : ''}{pend.target ? ` ${roleById(ws, pend.target)?.name ?? ''}` : ''}{pend.model ? ` model ${pend.model}` : ''}{pend.maxCalls ? ` anggaran ${pend.maxCalls}` : ''}</p>
        )}
        {(slash.length > 0 || people.length > 0) && (
          <ul className="sess__suggest" aria-label="Saran">
            {slash.map(c => <li key={c[0]}><button type="button" className="btn btn--small" onClick={() => setText(c[0])}>{c[0].trim()}<span>{c[1]}</span></button></li>)}
            {people.map(r => <li key={r.id}><button type="button" className="btn btn--small" onClick={() => setText(`@${r.name} `)}>@{r.name}<span>{r.title}</span></button></li>)}
          </ul>
        )}
        <div className="sess__compose">
          <label htmlFor="sess-msg" className="sr-only">Pesan lanjutan</label>
          <textarea id="sess-msg" rows={2} value={text} disabled={sending}
            placeholder={live ? 'Sesi sedang bekerja. Ketik /stop untuk menghentikan.' : 'Lanjutkan percakapan. /help untuk perintah, @nama untuk satu karyawan.'}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }} />
          <button type="button" className="btn btn--primary" onClick={send} disabled={!text.trim() || sending}>Kirim</button>
        </div>
        <p className="hint">Enter mengirim, Shift+Enter baris baru. Pesan biasa melanjutkan sesi; sekretaris membaca hasil sebelumnya dan membagi pekerjaan lagi.</p>
      </div>
    </section>
  );
}
