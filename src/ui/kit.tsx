import { useEffect, useRef, useState, type ReactNode } from 'react';

/* ---------- rute dalam alamat: #tab atau #tab/id ---------- */
const ALIAS: Record<string, string> = { jalankan: 'pekerjaan', role: 'karyawan', claude: 'pengaturan' };
export const TAB_IDS = ['pekerjaan', 'karyawan', 'ruangan', 'jejak', 'pengaturan'] as const;
export type TabId = (typeof TAB_IDS)[number];

export function parseHash(): { tab: TabId; id: string | null } {
  const [raw, ...rest] = location.hash.slice(1).split('/');
  const t = (ALIAS[raw] ?? raw) as TabId;
  return { tab: TAB_IDS.includes(t) ? t : 'pekerjaan', id: rest.length ? decodeURIComponent(rest.join('/')) : null };
}
export const go = (tab: TabId, id?: string | null) => { location.hash = id ? `#${tab}/${encodeURIComponent(id)}` : `#${tab}`; };

export function useRoute() {
  const [route, setRoute] = useState(parseHash);
  useEffect(() => {
    const on = () => setRoute(parseHash());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return route;
}

/* ---------- potongan kecil ---------- */
export function Chip({ tone, children, title }: { tone?: 'accent' | 'cool' | 'bad' | 'ok'; children: ReactNode; title?: string }) {
  return <span className={`tag ${tone ? `tag--${tone}` : ''}`} title={title}>{children}</span>;
}

export function SearchBox({ value, onChange, label, placeholder }: { value: string; onChange: (v: string) => void; label: string; placeholder: string }) {
  return (
    <div className="search">
      <input type="search" value={value} onChange={e => onChange(e.target.value)} aria-label={label} placeholder={placeholder} spellCheck={false} />
      {value && <button type="button" className="search__clear" aria-label="Hapus pencarian" onClick={() => onChange('')}>×</button>}
    </div>
  );
}

export function Seg<T extends string | number>({ options, value, onChange, label, small }: {
  options: { v: T; label: string; hint?: string }[]; value: T; onChange: (v: T) => void; label: string; small?: boolean;
}) {
  return (
    <div className={`segmented ${small ? 'segmented--small' : 'segmented--full'}`} role="radiogroup" aria-label={label}>
      {options.map(o => (
        <button key={String(o.v)} type="button" role="radio" aria-checked={value === o.v} title={o.hint}
          className={`seg ${value === o.v ? 'seg--on' : ''}`} onClick={() => onChange(o.v)}>{o.label}</button>
      ))}
    </div>
  );
}

/** Kelompok yang bisa dilipat, dengan jumlah isinya. */
export function Group({ title, count, children, defaultOpen = true, aside }: { title: string; count?: number; children: ReactNode; defaultOpen?: boolean; aside?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useRef(`g-${Math.random().toString(36).slice(2, 7)}`).current;
  return (
    <section className="group">
      <div className="group__head">
        <button type="button" className="group__toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
          <span className="group__title">{title}</span>
          {count !== undefined && <span className="measured">{count}</span>}
        </button>
        {aside}
      </div>
      <div id={id} hidden={!open} className="group__body">{children}</div>
    </section>
  );
}

export function EmptyState({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <div className="emptybox">
      <h3>{title}</h3>
      <p>{text}</p>
      {children && <div className="row">{children}</div>}
    </div>
  );
}

export function Back({ to, label }: { to: TabId; label: string }) {
  return <a className="back" href={`#${to}`}>{label}</a>;
}

export function Confirm({ label, confirmLabel, onConfirm, disabled, title }: { label: string; confirmLabel: string; onConfirm: () => void; disabled?: boolean; title?: string }) {
  const [ask, setAsk] = useState(false);
  if (!ask) return <button type="button" className="btn btn--small" onClick={() => setAsk(true)} disabled={disabled} title={title}>{label}</button>;
  return (
    <span className="row row--tight">
      <button type="button" className="btn btn--small btn--danger" onClick={() => { setAsk(false); onConfirm(); }}>{confirmLabel}</button>
      <button type="button" className="btn btn--small" onClick={() => setAsk(false)}>Batal</button>
    </span>
  );
}

export const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 7)}`;

/** Penyunting keahlian: chip yang bisa dihapus, Enter atau koma menambah. */
export function TagEditor({ id, value, onChange, disabled }: { id: string; value: string[]; onChange: (v: string[]) => void; disabled?: boolean }) {
  const [draft, setDraft] = useState('');
  const add = (raw: string) => {
    const t = raw.trim().toLowerCase();
    if (t && !value.includes(t) && value.length < 12) onChange([...value, t]);
    setDraft('');
  };
  return (
    <div className="tags">
      {value.map(t => (
        <span key={t} className="tag tag--cool">
          {t}
          <button type="button" aria-label={`Hapus keahlian ${t}`} disabled={disabled} onClick={() => onChange(value.filter(x => x !== t))}>×</button>
        </span>
      ))}
      <input id={id} value={draft} disabled={disabled} placeholder={value.length ? 'tambah…' : 'riset, menulis, kode'} aria-label="Tambah keahlian"
        onChange={e => { const v = e.target.value; if (v.endsWith(',')) add(v.slice(0, -1)); else setDraft(v); }}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); add(draft); }
          else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => add(draft)} />
    </div>
  );
}
