import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { CATALOG, FIELDS, LEVELS, TEAMS, fieldOf, levelOf, makeRole, randomName, resolveTeam, titleFor, type LevelId, type RoleSpec, type TeamPreset } from '../catalog';
import { MAX_ROLES, MAX_ROOMS, newRole, newRoom, nextSlot } from '../normalize';
import type { Access, Model, Personality, Role } from '../types';
import { Back, Chip, Confirm, EmptyState, Group, SearchBox, Seg, TagEditor, go, uid, useRoute } from './kit';

const MODEL_LABEL: Record<Model, string> = { haiku: 'Haiku', sonnet: 'Sonnet', opus: 'Opus' };
const ACCESS_LABEL: Record<Access, string> = { text: 'Tanpa skill', skills: 'Skill', work: 'Skill' };
const ACCESS_HINT: Record<Access, string> = {
  text: 'Bekerja dengan kemampuan sendiri, tanpa skill. Tetap bisa membaca dan mengubah berkas, mencari di web, dan memakai shell.',
  skills: 'Memakai skill terdaftar, ditambah semua yang bisa dilakukan karyawan tanpa skill.',
  work: 'Memakai skill terdaftar, ditambah semua yang bisa dilakukan karyawan tanpa skill.',
};
const PERSONALITIES: { v: Personality; label: string }[] = [
  { v: 'sosial', label: 'Sosial, suka ngobrol' }, { v: 'santai', label: 'Santai, suka keliling' },
  { v: 'rajin', label: 'Rajin, jarang beranjak' }, { v: 'penyendiri', label: 'Penyendiri, suka membaca' },
];

type GroupBy = 'ruangan' | 'lantai' | 'model' | 'none';

export function EmployeesPanel() {
  const { id } = useRoute();
  if (id === 'katalog') return <Catalog />;
  return id ? <EmployeeDetail id={id} /> : <EmployeeList />;
}

/* ===================== daftar ===================== */
function EmployeeList() {
  const { ws, loaded, loadError, update, focusRole } = useStore();
  const [q, setQ] = useState('');
  const [by, setBy] = useState<GroupBy>('ruangan');
  const roomOf = (r: Role) => ws.rooms.find(x => x.id === r.roomId);

  const shown = useMemo(() => {
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return ws.roles.filter(r => {
      const hay = [r.name, r.title, r.tags.join(' '), roomOf(r)?.name, MODEL_LABEL[r.model], ACCESS_LABEL[r.access], r.personality].join(' ').toLowerCase();
      return terms.every(t => hay.includes(t));
    });
  }, [ws, q]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = useMemo(() => {
    const m = new Map<string, Role[]>();
    const keyOf = (r: Role) => by === 'ruangan' ? (roomOf(r)?.name ?? 'Tanpa ruangan') : by === 'lantai' ? `Lantai ${(roomOf(r)?.floor ?? 0) + 1}` : by === 'model' ? MODEL_LABEL[r.model] : 'Semua karyawan';
    [...shown].sort((a, b) => a.name.localeCompare(b.name, 'id')).forEach(r => m.set(keyOf(r), [...(m.get(keyOf(r)) ?? []), r]));
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'id'));
  }, [shown, by, ws]); // eslint-disable-line react-hooks/exhaustive-deps

  const workRoom = ws.rooms.find(r => r.kind === 'kerja');
  const add = () => {
    if (!workRoom) return;
    const role = newRole({ id: uid('role'), name: `Karyawan ${ws.roles.length + 1}`, roomId: workRoom.id, prompt: 'Kamu anggota tim yang cermat. Kerjakan bagianmu dan jawab dalam bahasa Indonesia.' });
    update(w => ({ ...w, roles: [...w.roles, role], coordinatorId: w.coordinatorId || role.id }));
    go('karyawan', role.id);
  };

  if (!loaded) return <div className="skeleton" aria-label="Memuat"><i /><i /><i /></div>;
  return (
    <div className="stack">
      {loadError && <p className="banner banner--bad" role="alert">{loadError}</p>}
      <div className="toolbar">
        <SearchBox value={q} onChange={setQ} label="Cari karyawan" placeholder="Cari nama, jabatan, keahlian" />
        <div className="field field--inline toolbar__group">
          <label htmlFor="emp-group">Kelompokkan</label>
          <select id="emp-group" value={by} onChange={e => setBy(e.target.value as GroupBy)}>
            <option value="ruangan">Ruangan</option><option value="lantai">Lantai</option><option value="model">Model</option><option value="none">Tanpa kelompok</option>
          </select>
        </div>
        <a className="btn" href="#karyawan/katalog">Dari katalog</a>
        <button type="button" className="btn btn--primary" onClick={add} disabled={!workRoom || ws.roles.length >= MAX_ROLES} title={workRoom ? undefined : 'Buat ruang kerja dulu di tab Ruangan'}>Tambah karyawan</button>
      </div>

      {!ws.roles.length ? (
        <EmptyState title="Belum ada karyawan" text={workRoom ? 'Karyawan adalah agen dengan keahlian, akses, dan kepribadiannya sendiri. Tambahkan yang pertama, atau pakai contoh di Pengaturan.' : 'Buat satu ruang kerja di tab Ruangan, lalu tambahkan karyawan di sini.'}>
          {workRoom ? <><a className="btn btn--primary" href="#karyawan/katalog">Pilih dari katalog</a><button type="button" className="btn" onClick={add}>Tambah kosong</button></> : <a className="btn btn--primary" href="#ruangan">Buka tab Ruangan</a>}
        </EmptyState>
      ) : !shown.length ? (
        <EmptyState title="Tidak ada yang cocok" text={`Tidak ada karyawan yang cocok dengan "${q}".`}>
          <button type="button" className="btn" onClick={() => setQ('')}>Hapus pencarian</button>
        </EmptyState>
      ) : (
        <>
          <p className="count"><span className="measured">{shown.length}</span> dari <span className="measured">{ws.roles.length}</span> karyawan{ws.coordinatorId ? '' : ', belum ada koordinator'}</p>
          {groups.map(([name, list]) => (
            <Group key={name} title={name} count={list.length}>
              <ul className="rows">
                {list.map(r => (
                  <li key={r.id} className="rowitem">
                    <a className="rowitem__main" href={`#karyawan/${encodeURIComponent(r.id)}`}>
                      <span className="rowitem__name">{r.name}<span className="rowitem__sub">{r.title || 'tanpa jabatan'}</span></span>
                      <span className="rowitem__chips">
                        {ws.coordinatorId === r.id && <Chip tone="accent">Koordinator</Chip>}
                        {r.reviewer && <Chip tone="cool">Reviewer</Chip>}
                        <Chip>{ACCESS_LABEL[r.access]}</Chip>
                        <Chip>{MODEL_LABEL[r.model]}</Chip>
                        {by !== 'ruangan' && <Chip>{roomOf(r)?.name ?? 'tanpa ruangan'}</Chip>}
                      </span>
                    </a>
                    <button type="button" className="btn btn--small" onClick={() => focusRole(r.id)} aria-label={`Lihat ${r.name} di kantor`}>Lihat</button>
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
function SkillPicker({ role, onChange }: { role: Role; onChange: (skills: string[]) => void }) {
  const { skills, skillsLoading, skillsError, loadSkills } = useStore();
  const [q, setQ] = useState('');
  const shown = skills.filter(s => s.toLowerCase().includes(q.trim().toLowerCase()));
  if (skillsLoading) return <div className="skeleton"><i /><i /><i /></div>;
  if (!skills.length) return (
    <div className="stack">
      <p className="hint">{skillsError ?? 'Daftar skill belum terbaca.'}</p>
      <div className="row"><button type="button" className="btn btn--small" onClick={loadSkills}>Muat ulang skill</button></div>
    </div>
  );
  const toggle = (s: string) => onChange(role.skills.includes(s) ? role.skills.filter(x => x !== s) : [...role.skills, s]);
  return (
    <div className="skillpick">
      <SearchBox value={q} onChange={setQ} label="Cari skill" placeholder="Cari skill" />
      <ul className="skillpick__list">
        {shown.map(s => <li key={s}><label className="check"><input type="checkbox" checked={role.skills.includes(s)} onChange={() => toggle(s)} /><span className="measured">{s}</span></label></li>)}
        {!shown.length && <li className="hint">Tidak ada skill yang cocok.</li>}
      </ul>
      <span className="hint">{role.skills.length} dipilih dari {skills.length} skill terdaftar.</span>
    </div>
  );
}

function EmployeeDetail({ id }: { id: string }) {
  const { ws, update, removeRole, running, focusRole } = useStore();
  const [sub, setSub] = useState<'profil' | 'akses' | 'kerja'>('profil');
  const role = ws.roles.find(r => r.id === id);
  if (!role) return (
    <div className="stack">
      <Back to="karyawan" label="Semua karyawan" />
      <EmptyState title="Karyawan tidak ditemukan" text="Karyawan ini mungkin sudah dihapus." />
    </div>
  );

  const set = (p: Partial<Role>) => update(w => ({ ...w, roles: w.roles.map(r => r.id === role.id ? { ...r, ...p } : r) }));
  const others = ws.roles.filter(r => r.id !== role.id);
  const workRooms = ws.rooms.filter(r => r.kind === 'kerja');
  const f = (k: string) => `${k}-${role.id}`;
  const isCoord = ws.coordinatorId === role.id;
  const duplicate = () => {
    const copy: Role = { ...role, id: uid('role'), name: `${role.name} (salinan)` };
    update(w => ({ ...w, roles: [...w.roles, copy] }));
    go('karyawan', copy.id);
  };

  return (
    <div className="stack">
      <Back to="karyawan" label="Semua karyawan" />
      <header className="detailhead">
        <div>
          <h2>{role.name || 'Tanpa nama'}</h2>
          <p className="rowitem__sub">{role.title || 'tanpa jabatan'}</p>
        </div>
        <div className="row row--tight">
          <button type="button" className="btn btn--small" onClick={() => focusRole(role.id)}>Lihat di kantor</button>
          <button type="button" className="btn btn--small" onClick={duplicate} disabled={running}>Gandakan</button>
          <Confirm label="Hapus" confirmLabel="Ya, hapus" disabled={running} onConfirm={() => { removeRole(role.id); go('karyawan'); }} />
        </div>
      </header>

      <Seg label="Bagian editor" value={sub} onChange={setSub} options={[{ v: 'profil', label: 'Profil' }, { v: 'akses', label: 'Akses' }, { v: 'kerja', label: 'Kerja sama' }]} />

      {sub === 'profil' && (
        <div className="stack">
          <div className="grid2">
            <div className="field"><label htmlFor={f('name')}>Nama</label><input id={f('name')} value={role.name} onChange={e => set({ name: e.target.value })} /></div>
            <div className="field"><label htmlFor={f('title')}>Jabatan</label><input id={f('title')} value={role.title} placeholder="mis. Senior Developer" onChange={e => set({ title: e.target.value })} /></div>
          </div>
          <div className="grid2">
            <div className="field"><label htmlFor={f('room')}>Ruang kerja</label>
              <select id={f('room')} value={role.roomId} disabled={running} onChange={e => set({ roomId: e.target.value })}>
                {!workRooms.some(r => r.id === role.roomId) && <option value="">Pilih ruangan</option>}
                {workRooms.map(r => <option key={r.id} value={r.id}>{r.name}, lantai {r.floor + 1}</option>)}
              </select></div>
            <div className="field"><label htmlFor={f('person')}>Kepribadian di kantor</label>
              <select id={f('person')} value={role.personality} onChange={e => set({ personality: e.target.value as Personality })}>
                {PERSONALITIES.map(p => <option key={p.v} value={p.v}>{p.label}</option>)}
              </select></div>
          </div>
          <div className="field"><label htmlFor={f('tags')}>Keahlian</label>
            <TagEditor id={f('tags')} value={role.tags} onChange={tags => set({ tags })} />
            <span className="hint">Enter atau koma menambah. Koordinator memakainya untuk memilih siapa yang mengerjakan.</span></div>
          <div className="field"><label htmlFor={f('prompt')}>Instruksi peran</label>
            <textarea id={f('prompt')} rows={5} value={role.prompt} onChange={e => set({ prompt: e.target.value })} /></div>
          <div className="field"><label htmlFor={f('memory')}>Catatan tetap</label>
            <textarea id={f('memory')} rows={3} value={role.memory} placeholder="Aturan atau preferensi yang selalu dibawa karyawan ini di setiap pekerjaan." onChange={e => set({ memory: e.target.value })} /></div>
        </div>
      )}

      {sub === 'akses' && (
        <div className="stack">
          <div className="field"><span className="field__label" id={f('mdl')}>Model</span>
            <Seg label="Model" value={role.model} onChange={v => set({ model: v })} options={[
              { v: 'haiku', label: 'Haiku', hint: 'Hemat kuota' }, { v: 'sonnet', label: 'Sonnet', hint: 'Seimbang' }, { v: 'opus', label: 'Opus', hint: 'Paling teliti' }]} />
            <span className="hint">Haiku paling hemat kuota, Opus paling teliti.</span></div>

          <div className="field"><span className="field__label">Skill</span>
            <Seg label="Skill" value={role.access === 'text' ? 'text' : 'work'} onChange={v => set({ access: v })} options={[
              { v: 'text', label: 'Tanpa skill' }, { v: 'work', label: 'Pakai skill' }]} />
            <span className="hint">{ACCESS_HINT[role.access]}</span></div>

          {role.access !== 'text' && (
            <>
              <fieldset className="subset">
                <legend>Skill</legend>
                <label className="check"><input type="radio" name={`skillmode-${role.id}`} checked={role.skillMode === 'all'} onChange={() => set({ skillMode: 'all' })} />Semua skill yang terdaftar</label>
                <label className="check"><input type="radio" name={`skillmode-${role.id}`} checked={role.skillMode === 'pick'} onChange={() => set({ skillMode: 'pick' })} />Hanya skill yang saya pilih</label>
                {role.skillMode === 'pick' && <SkillPicker role={role} onChange={skills => set({ skills })} />}
              </fieldset>
              <p className="hint">Semua karyawan bisa membaca dan mengubah berkas di folder proyek, mencari di web, dan memakai shell. Izin web dan shell mengikuti permission Claude Code Anda (settings.json); yang belum diizinkan di sana ditolak dan tercatat di Jejak. Pembedanya hanya skill.</p>
              <p className="hint">Karyawan dengan skill memakai lebih banyak kuota per panggilan. Gmail, Drive, dan koneksi MCP lain tetap tertutup.</p>
            </>
          )}
        </div>
      )}

      {sub === 'kerja' && (
        <div className="stack">
          <label className="check"><input type="checkbox" checked={isCoord} onChange={e => update(w => ({ ...w, coordinatorId: e.target.checked ? role.id : '' }))} />
            Koordinator: menerima pekerjaan Anda lalu membaginya ke tim</label>
          <label className="check"><input type="checkbox" checked={role.canDelegate} onChange={e => set({ canDelegate: e.target.checked })} />Boleh meminta bantuan rekan saat mengerjakan tugas</label>
          <label className="check"><input type="checkbox" checked={role.reviewer} onChange={e => set({ reviewer: e.target.checked, rejectTo: e.target.checked ? (role.rejectTo || others[0]?.id || '') : '' })} />
            Reviewer: menjawab SETUJU atau REVISI atas hasil karyawan lain</label>

          <fieldset className="flowset">
            <legend>Playbook (alur tetap, opsional)</legend>
            <div className="field"><label htmlFor={f('next')}>{role.reviewer ? 'Jika disetujui, lanjut ke' : 'Setelah ini ke'}</label>
              <select id={f('next')} value={role.next} onChange={e => set({ next: e.target.value })}>
                <option value="END">Selesai</option>
                {others.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select></div>
            {role.reviewer && (
              <div className="field"><label htmlFor={f('rej')}>Jika perlu revisi, kembali ke</label>
                <select id={f('rej')} value={role.rejectTo} onChange={e => set({ rejectTo: e.target.value })}>
                  <option value="">Abaikan revisi</option>
                  {others.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <span className="hint">Maksimal 2 putaran revisi per reviewer.</span></div>
            )}
            <p className="hint">Dipakai saat Anda memilih penugasan Playbook di tab Pekerjaan.</p>
          </fieldset>
        </div>
      )}
    </div>
  );
}

/* ===================== katalog peran ===================== */
const ACCESS_SHORT: Record<Access, string> = { text: 'Tanpa skill', skills: 'Skill', work: 'Skill' };

function useHire() {
  const update = useStore(s => s.update);
  return (specs: RoleSpec[], levelId: LevelId, naming: 'acak' | 'jabatan'): { count: number; first: string } => {
    let count = 0, first = '';
    update(w => {
      let rooms = [...w.rooms];
      const roles = [...w.roles];
      const staff = (id: string) => roles.filter(x => x.roomId === id).length;
      const pickRoom = () => {
        const works = rooms.filter(r => r.kind === 'kerja');
        const free = works.filter(r => staff(r.id) < 6).sort((a, b) => staff(a.id) - staff(b.id))[0];
        if (free) return free.id;
        if (rooms.length < MAX_ROOMS) {
          const r = newRoom({ id: uid('room'), name: `Ruang Kerja ${works.length + 1}`, ...nextSlot(rooms) });
          rooms = [...rooms, r];
          return r.id;
        }
        return works.sort((a, b) => staff(a.id) - staff(b.id))[0]?.id ?? '';
      };
      let cur = '';
      const used = new Set(roles.map(r => r.name));
      for (const s of specs) {
        if (roles.length >= MAX_ROLES) break;
        if (!cur || staff(cur) >= 6) cur = pickRoom();
        // nama orang acak; jabatan lengkap ada di kolom jabatan
        const base = titleFor(s, levelOf(levelId));
        let name = naming === 'acak' ? randomName(used) : base, n = 2;
        while (naming === 'jabatan' && used.has(name)) name = `${base} ${n++}`;
        const r = makeRole(s, levelId, cur, uid('role'), name);
        roles.push(r); used.add(name); count++; first ||= r.id;
      }
      const coord = w.coordinatorId || roles.find(r => /chief of staff/i.test(r.name))?.id || '';
      return { ...w, rooms, roles, coordinatorId: coord };
    });
    return { count, first };
  };
}

function Catalog() {
  const ws = useStore(s => s.ws);
  const hire = useHire();
  const [q, setQ] = useState('');
  const [field, setField] = useState('semua');
  const [level, setLevel] = useState<LevelId>('senior');
  const [view, setView] = useState<'peran' | 'tim'>('peran');
  const [naming, setNaming] = useState<'acak' | 'jabatan'>('acak');
  const [done, setDone] = useState<{ count: number; first: string } | null>(null);
  const lv = levelOf(level);
  const room = MAX_ROLES - ws.roles.length;

  const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = useMemo(() => CATALOG.filter(s => (field === 'semua' || s.field === field)
    && terms.every(t => `${s.title} ${s.desc} ${s.tags.join(' ')} ${fieldOf(s.field).label}`.toLowerCase().includes(t))), [field, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const byField = FIELDS.map(f => ({ f, list: shown.filter(s => s.field === f.id) })).filter(g => g.list.length);

  const recruit = (specs: RoleSpec[]) => setDone(hire(specs, level, naming));

  return (
    <div className="stack">
      <Back to="karyawan" label="Semua karyawan" />
      <header className="detailhead">
        <div><h2>Katalog peran</h2><p className="rowitem__sub"><span className="measured">{CATALOG.length}</span> peran di <span className="measured">{FIELDS.length}</span> bidang, tujuh tingkat</p></div>
      </header>

      <div className="field">
        <span className="field__label">Tingkat saat merekrut</span>
        <Seg small label="Tingkat" value={level} onChange={setLevel} options={LEVELS.map(l => ({ v: l.id, label: l.label, hint: l.hint }))} />
        <span className="hint">{lv.hint}. Model awal: {MODEL_LABEL[lv.model]}, bisa diubah di editor.</span>
      </div>

      <div className="field">
        <span className="field__label">Nama karyawan</span>
        <Seg small label="Penamaan" value={naming} onChange={setNaming} options={[{ v: 'acak', label: 'Nama orang acak', hint: 'Mis. Budi Santoso; jabatannya tampil terpisah' }, { v: 'jabatan', label: 'Sesuai jabatan' }]} />
        <span className="hint">{naming === 'acak' ? 'Karyawan diberi nama orang acak. Jabatan dan tingkatnya tetap tertulis di kolom jabatan.' : 'Karyawan memakai nama jabatannya, mis. Senior Frontend Developer.'}</span>
      </div>

      {done && (
        <p className="note" role="status">
          {done.count ? <>Merekrut <span className="measured">{done.count}</span> karyawan. <a href={`#karyawan/${encodeURIComponent(done.first)}`}>Buka yang pertama</a> atau <a href="#karyawan">lihat daftar</a>.</> : `Batas ${MAX_ROLES} karyawan tercapai.`}
        </p>
      )}

      <Seg label="Tampilan katalog" value={view} onChange={setView} options={[{ v: 'peran', label: 'Peran per bidang' }, { v: 'tim', label: 'Tim siap pakai' }]} />

      {view === 'peran' && (
        <>
          <div className="toolbar">
            <SearchBox value={q} onChange={setQ} label="Cari peran" placeholder="Cari peran, tugas, atau keahlian" />
            <div className="field field--inline toolbar__group">
              <label htmlFor="cat-field">Bidang</label>
              <select id="cat-field" value={field} onChange={e => setField(e.target.value)}>
                <option value="semua">Semua bidang</option>
                {FIELDS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
          </div>
          {!byField.length ? (
            <EmptyState title="Tidak ada peran yang cocok" text="Coba kata kunci lain, atau pilih semua bidang."><button type="button" className="btn" onClick={() => { setQ(''); setField('semua'); }}>Hapus filter</button></EmptyState>
          ) : (
            <>
              <p className="count"><span className="measured">{shown.length}</span> peran. Sisa kapasitas <span className="measured">{room}</span> karyawan.</p>
              {byField.map(({ f, list }) => (
                <Group key={`${f.id}-${field}-${q}`} title={f.label} count={list.length} defaultOpen={!!q || field !== 'semua'}>
                  <p className="hint">{f.desc}</p>
                  <ul className="rows">
                    {list.map(s => (
                      <li key={s.key} className="rowitem">
                        <div className="rowitem__main">
                          <span className="rowitem__name">{titleFor(s, lv)}</span>
                          <span className="rowitem__sub">{s.desc}</span>
                          <span className="rowitem__chips">
                            <Chip>{ACCESS_SHORT[s.access]}</Chip>{s.reviewer && <Chip tone="cool">Reviewer</Chip>}
                          </span>
                        </div>
                        <button type="button" className="btn btn--small" disabled={room < 1} onClick={() => recruit([s])}>Rekrut</button>
                      </li>
                    ))}
                  </ul>
                </Group>
              ))}
            </>
          )}
        </>
      )}

      {view === 'tim' && (
        <ul className="rows">
          {TEAMS.map(t => <TeamRow key={t.id} team={t} level={level} room={room} onHire={specs => recruit(specs)} />)}
        </ul>
      )}
    </div>
  );
}

function TeamRow({ team, level, room, onHire }: { team: TeamPreset; level: LevelId; room: number; onHire: (specs: RoleSpec[]) => void }) {
  const specs = resolveTeam(team);
  const lv = levelOf(level);
  return (
    <li className="rowitem teamrow">
      <div className="rowitem__main">
        <span className="rowitem__name">{team.name}<span className="rowitem__sub"><span className="measured">{specs.length}</span> orang</span></span>
        <span className="rowitem__sub">{team.desc}</span>
        <span className="rowitem__chips">{specs.map(s => <Chip key={s.key}>{titleFor(s, lv)}</Chip>)}</span>
      </div>
      <button type="button" className="btn btn--small" disabled={room < specs.length} title={room < specs.length ? `Kapasitas tersisa ${room}` : undefined} onClick={() => onHire(specs)}>Rekrut tim</button>
    </li>
  );
}
