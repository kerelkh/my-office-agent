import { useMemo, useState } from 'react';
import { computeLayout } from '../layout';
import { KIND_LABEL, MAX_FLOORS, MAX_ROOMS, STRIP_MAX, newRoom, nextSlot } from '../normalize';
import { useStore } from '../store';
import type { Room, RoomKind } from '../types';
import { Back, Chip, Confirm, EmptyState, Group, SearchBox, Seg, go, uid, useRoute } from './kit';

const KIND_INFO: Record<RoomKind, string> = {
  kerja: 'Meja karyawan, tempat tugas dikerjakan',
  pantry: 'Kopi, air minum, dan tempat istirahat',
  rapat: 'Meja panjang dan layar, bisa dibuat besar',
  aula: 'Panggung, layar, dan kursi untuk menonton',
  diskusi: 'Meja bundar dan papan tulis',
  lobi: 'Area lapang dengan sofa di tepi',
};
const ROW_LABEL = ['Depan', 'Belakang'] as const;

export function RoomsPanel() {
  const { id } = useRoute();
  return id ? <RoomDetail id={id} /> : <RoomList />;
}

/* ===================== denah ===================== */
function FloorPlan({ selected, onSelect, onAdd }: { selected: string | null; onSelect: (id: string) => void; onAdd: (slot: { floor: number; row: 0 | 1 }) => void }) {
  const ws = useStore(s => s.ws);
  const layout = useMemo(() => computeLayout(ws), [ws]);
  const span = Math.max(1, layout.strip.x1 - layout.strip.x0);
  const floors = Array.from({ length: layout.floors }, (_, i) => layout.floors - 1 - i);
  return (
    <section className="plan" aria-label="Denah gedung">
      {floors.map(f => (
        <div key={f} className="plan__floor">
          <span className="plan__label">Lantai {f + 1}</span>
          <div className="plan__strips">
            {([1, 0] as const).map(row => {
              const rooms = layout.rooms.filter(r => r.floor === f && r.row === row);
              return (
                <div key={row} className="plan__strip" aria-label={`Lantai ${f + 1}, baris ${ROW_LABEL[row].toLowerCase()}`}>
                  {rooms.map(r => (
                    <button key={r.id} type="button" className={`plan__room plan__room--${r.kind} ${selected === r.id ? 'plan__room--on' : ''}`}
                      style={{ flex: `${r.width / span} 1 0` }} aria-pressed={selected === r.id} title={`${r.name}, ${KIND_LABEL[r.kind]}`} onClick={() => onSelect(r.id)}>
                      <span className="plan__name">{r.name}</span>
                      <span className="plan__kind">{KIND_LABEL[r.kind]}</span>
                    </button>
                  ))}
                  {rooms.length < STRIP_MAX && ws.rooms.length < MAX_ROOMS && (
                    <button type="button" className="plan__add" aria-label={`Tambah ruangan di lantai ${f + 1}, baris ${ROW_LABEL[row].toLowerCase()}`} onClick={() => onAdd({ floor: f, row })}>+</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {layout.floors < MAX_FLOORS && (
        <button type="button" className="plan__newfloor" onClick={() => onAdd({ floor: layout.floors, row: 0 })}>Tambah lantai {layout.floors + 1}</button>
      )}
    </section>
  );
}

function KindPicker({ slot, onPick, onCancel }: { slot: { floor: number; row: 0 | 1 }; onPick: (k: RoomKind) => void; onCancel: () => void }) {
  return (
    <section className="picker" aria-label="Pilih jenis ruangan">
      <div className="row row--between">
        <h3>Ruangan baru di lantai {slot.floor + 1}, baris {ROW_LABEL[slot.row].toLowerCase()}</h3>
        <button type="button" className="btn btn--small" onClick={onCancel}>Batal</button>
      </div>
      <ul className="picker__list">
        {(Object.keys(KIND_LABEL) as RoomKind[]).map(k => (
          <li key={k}>
            <button type="button" className="picker__item" onClick={() => onPick(k)}>
              <span className="picker__name">{KIND_LABEL[k]}</span>
              <span className="picker__info">{KIND_INFO[k]}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ===================== daftar ===================== */
function useCreateRoom() {
  const { ws, update, focusRoom } = useStore();
  return (kind: RoomKind, slot: { floor: number; row: 0 | 1 }) => {
    const n = ws.rooms.filter(r => r.kind === kind).length + 1;
    const room = newRoom({ id: uid('room'), name: `${KIND_LABEL[kind]} ${n}`, kind, ...slot });
    update(w => ({ ...w, rooms: [...w.rooms, room] }));
    go('ruangan', room.id);
    focusRoom(room.id);
  };
}

function RoomList() {
  const { ws, loaded, focusRoom } = useStore();
  const create = useCreateRoom();
  const [q, setQ] = useState('');
  const [floor, setFloor] = useState(-1);
  const [adding, setAdding] = useState<{ floor: number; row: 0 | 1 } | null>(null);
  const floors = Math.max(1, ...ws.rooms.map(r => r.floor + 1));
  const countOf = (r: Room) => ws.roles.filter(x => x.roomId === r.id).length;

  const shown = useMemo(() => {
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return ws.rooms.filter(r => (floor < 0 || r.floor === floor) && terms.every(t => `${r.name} ${KIND_LABEL[r.kind]}`.toLowerCase().includes(t)));
  }, [ws.rooms, q, floor]);
  const byFloor = useMemo(() => {
    const m = new Map<number, Room[]>();
    shown.forEach(r => m.set(r.floor, [...(m.get(r.floor) ?? []), r]));
    return [...m.entries()].sort((a, b) => b[0] - a[0]);
  }, [shown]);

  if (!loaded) return <div className="skeleton" aria-label="Memuat"><i /><i /><i /></div>;
  return (
    <div className="stack">
      <FloorPlan selected={null} onSelect={id => { go('ruangan', id); focusRoom(id); }} onAdd={setAdding} />
      {adding && <KindPicker slot={adding} onCancel={() => setAdding(null)} onPick={k => { create(k, adding); setAdding(null); }} />}

      <div className="toolbar">
        <SearchBox value={q} onChange={setQ} label="Cari ruangan" placeholder="Cari nama atau jenis ruangan" />
        {floors > 1 && <Seg small label="Filter lantai" value={floor} onChange={setFloor} options={[{ v: -1, label: 'Semua' }, ...Array.from({ length: floors }, (_, f) => ({ v: f, label: `L${f + 1}` }))]} />}
        <button type="button" className="btn btn--primary" disabled={ws.rooms.length >= MAX_ROOMS} onClick={() => setAdding(nextSlot(ws.rooms))}>Tambah ruangan</button>
      </div>

      {!ws.rooms.length ? (
        <EmptyState title="Belum ada ruangan" text="Mulai dengan satu ruang kerja, lalu tambahkan lobi, pantry, atau aula." />
      ) : !shown.length ? (
        <EmptyState title="Tidak ada yang cocok" text="Tidak ada ruangan yang cocok dengan pencarian atau lantai ini."><button type="button" className="btn" onClick={() => { setQ(''); setFloor(-1); }}>Hapus filter</button></EmptyState>
      ) : (
        <>
          <p className="count"><span className="measured">{shown.length}</span> dari <span className="measured">{ws.rooms.length}</span> ruangan</p>
          {byFloor.map(([f, list]) => (
            <Group key={f} title={`Lantai ${f + 1}`} count={list.length}>
              <ul className="rows">
                {list.map(r => (
                  <li key={r.id} className="rowitem">
                    <a className="rowitem__main" href={`#ruangan/${encodeURIComponent(r.id)}`}>
                      <span className="rowitem__name">{r.name}<span className="rowitem__sub">Baris {ROW_LABEL[r.row].toLowerCase()}</span></span>
                      <span className="rowitem__chips">
                        <Chip tone={r.kind === 'kerja' ? 'accent' : undefined}>{KIND_LABEL[r.kind]}</Chip>
                        {r.wide && <Chip>Besar</Chip>}
                        {r.kind === 'kerja' && <Chip tone="cool">{countOf(r)} karyawan</Chip>}
                      </span>
                    </a>
                    <button type="button" className="btn btn--small" onClick={() => focusRoom(r.id)} aria-label={`Lihat ${r.name} di kantor`}>Lihat</button>
                  </li>
                ))}
              </ul>
            </Group>
          ))}
        </>
      )}
    </div>
  );
}

/* ===================== detail ===================== */
function RoomDetail({ id }: { id: string }) {
  const { ws, update, running, focusRoom } = useStore();
  const create = useCreateRoom();
  const [adding, setAdding] = useState<{ floor: number; row: 0 | 1 } | null>(null);
  const room = ws.rooms.find(r => r.id === id);
  if (!room) return (
    <div className="stack">
      <Back to="ruangan" label="Semua ruangan" />
      <EmptyState title="Ruangan tidak ditemukan" text="Ruangan ini mungkin sudah dihapus." />
    </div>
  );
  const staff = ws.roles.filter(r => r.roomId === room.id);
  const set = (p: Partial<Room>) => update(w => ({ ...w, rooms: w.rooms.map(r => r.id === room.id ? { ...r, ...p } : r) }));
  const crowded = ws.rooms.filter(x => x.floor === room.floor && x.row === room.row).length > STRIP_MAX;
  const f = (k: string) => `${k}-${room.id}`;

  return (
    <div className="stack">
      <Back to="ruangan" label="Semua ruangan" />
      <FloorPlan selected={room.id} onSelect={rid => { go('ruangan', rid); focusRoom(rid); }} onAdd={setAdding} />
      {adding && <KindPicker slot={adding} onCancel={() => setAdding(null)} onPick={k => { create(k, adding); setAdding(null); }} />}
      <header className="detailhead">
        <div>
          <h2>{room.name || 'Tanpa nama'}</h2>
          <p className="rowitem__sub">{KIND_LABEL[room.kind]}, lantai {room.floor + 1}, baris {ROW_LABEL[room.row].toLowerCase()}</p>
        </div>
        <div className="row row--tight">
          <button type="button" className="btn btn--small" onClick={() => focusRoom(room.id)}>Lihat di kantor</button>
          <Confirm label="Hapus" confirmLabel="Ya, hapus" disabled={staff.length > 0 || running}
            title={staff.length ? 'Pindahkan atau hapus karyawan di ruangan ini dulu' : undefined}
            onConfirm={() => { update(w => ({ ...w, rooms: w.rooms.filter(r => r.id !== room.id) })); go('ruangan'); }} />
        </div>
      </header>

      <div className="field"><label htmlFor={f('name')}>Nama ruangan</label><input id={f('name')} value={room.name} onChange={e => set({ name: e.target.value })} /></div>
      <div className="field"><label htmlFor={f('kind')}>Jenis</label>
        <select id={f('kind')} value={room.kind} disabled={staff.length > 0} onChange={e => set({ kind: e.target.value as RoomKind })}>
          {(Object.keys(KIND_LABEL) as RoomKind[]).map(k => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
        </select>
        <span className="hint">{staff.length ? 'Jenis tidak bisa diubah selama masih ada karyawan di ruangan ini.' : KIND_INFO[room.kind]}</span></div>
      <div className="grid2">
        <div className="field"><label htmlFor={f('floor')}>Lantai</label>
          <select id={f('floor')} value={room.floor} onChange={e => set({ floor: Number(e.target.value) })}>
            {Array.from({ length: MAX_FLOORS }, (_, i) => <option key={i} value={i}>Lantai {i + 1}</option>)}
          </select></div>
        <div className="field"><label htmlFor={f('row')}>Baris</label>
          <select id={f('row')} value={room.row} onChange={e => set({ row: Number(e.target.value) as 0 | 1 })}>
            <option value={0}>Depan, menghadap lobi</option><option value={1}>Belakang, lewat lorong dalam</option>
          </select></div>
      </div>
      {room.kind !== 'kerja' && <label className="check"><input type="checkbox" checked={room.wide} onChange={e => set({ wide: e.target.checked })} />Ruangan besar, 1,5 kali lebih lebar</label>}
      {crowded && <p className="hint">Baris ini berisi lebih dari {STRIP_MAX} ruangan dan jadi sangat lebar. Pindahkan sebagian ke baris atau lantai lain.</p>}

      {room.kind === 'kerja' && (
        <Group title="Karyawan di ruangan ini" count={staff.length}>
          {staff.length ? (
            <ul className="rows">
              {staff.map(r => (
                <li key={r.id} className="rowitem">
                  <a className="rowitem__main" href={`#karyawan/${encodeURIComponent(r.id)}`}>
                    <span className="rowitem__name">{r.name}<span className="rowitem__sub">{r.title || 'tanpa jabatan'}</span></span>
                  </a>
                </li>
              ))}
            </ul>
          ) : <p className="empty">Belum ada karyawan. Tambahkan di tab Karyawan dan pilih ruangan ini.</p>}
        </Group>
      )}
    </div>
  );
}
