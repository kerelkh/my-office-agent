import type { Access, Model, Personality, Project, Role, Room, RoomKind, Workspace } from './types';

const ACCESS: Access[] = ['text', 'skills', 'work'];
const MODELS: Model[] = ['haiku', 'sonnet', 'opus'];
const KINDS: RoomKind[] = ['kerja', 'pantry', 'rapat', 'lobi', 'aula', 'diskusi'];
const PERSONALITIES: Personality[] = ['sosial', 'penyendiri', 'rajin', 'santai'];

export const KIND_LABEL: Record<RoomKind, string> = {
  kerja: 'Ruang kerja', pantry: 'Pantry', rapat: 'Ruang rapat', lobi: 'Lobi', aula: 'Aula', diskusi: 'Ruang diskusi',
};

export const MAX_FLOORS = 3;
export const STRIP_MAX = 4;
export const MAX_ROOMS = 16;
export const MAX_ROLES = 40;

export const newRoom = (p: Partial<Room> & Pick<Room, 'id' | 'name'>): Room => ({ kind: 'kerja', floor: 0, row: 0, wide: false, ...p });

/** Slot kosong berikutnya: baris depan lantai 1, baris belakang lantai 1, lalu naik ke lantai berikutnya. */
export function nextSlot(rooms: Room[]): Pick<Room, 'floor' | 'row'> {
  for (let floor = 0; floor < MAX_FLOORS; floor++) {
    for (const row of [0, 1] as const) {
      if (rooms.filter(r => r.floor === floor && r.row === row).length < STRIP_MAX) return { floor, row };
    }
  }
  return { floor: MAX_FLOORS - 1, row: 1 };
}

export const newRole = (p: Partial<Role> & Pick<Role, 'id' | 'name' | 'roomId'>): Role => ({
  title: '', model: 'sonnet', prompt: '', tags: [], memory: '', personality: 'santai', access: 'text', web: false, shell: false,
  skillMode: 'all', skills: [], canDelegate: false, reviewer: false, next: 'END', rejectTo: '', ...p,
});

/** Melengkapi workspace tersimpan dari versi lama dan menjaga referensinya tetap valid. */
export function normalizeWorkspace(w: Partial<Workspace>): Workspace {
  const placed: Room[] = [];
  for (const r of w.rooms ?? []) {
    const hasSlot = typeof r.floor === 'number' && (r.row === 0 || r.row === 1);
    const slot = hasSlot ? { floor: Math.min(MAX_FLOORS - 1, Math.max(0, r.floor)), row: r.row } : nextSlot(placed);
    placed.push(newRoom({ ...r, ...slot, kind: KINDS.includes(r.kind) ? r.kind : 'kerja', wide: !!r.wide }));
  }
  const rooms = placed;
  const firstWork = rooms.find(r => r.kind === 'kerja')?.id ?? '';
  const workIds = new Set(rooms.filter(r => r.kind === 'kerja').map(r => r.id));
  const roles: Role[] = (w.roles ?? []).filter(r => !r.temp).map(r => newRole({
    ...r,
    roomId: workIds.has(r.roomId) ? r.roomId : firstWork,
    model: MODELS.includes(r.model) ? r.model : 'sonnet',
    access: ACCESS.includes(r.access) && r.access !== 'text' ? 'work' : 'text',
    personality: PERSONALITIES.includes(r.personality) ? r.personality : 'santai',
    tags: Array.isArray(r.tags) ? r.tags.filter(t => typeof t === 'string') : [],
    skills: Array.isArray(r.skills) ? r.skills : [],
    skillMode: r.skillMode === 'pick' ? 'pick' : 'all',
    web: !!r.web, shell: !!r.shell, canDelegate: !!r.canDelegate, reviewer: !!r.reviewer,
    title: typeof r.title === 'string' ? r.title : '', memory: typeof r.memory === 'string' ? r.memory : '',
  }));
  const ids = new Set(roles.map(r => r.id));
  // folder proyek; data lama hanya punya satu `workdir`
  const legacy = (w as { workdir?: string }).workdir;
  const projects: Project[] = Array.isArray(w.projects) && w.projects.length
    ? w.projects.filter(p => p && typeof p.id === 'string').map(p => ({ id: p.id, name: String(p.name || 'Proyek'), path: String(p.path || '') }))
    : [{ id: 'proyek-utama', name: 'Proyek utama', path: typeof legacy === 'string' ? legacy : '' }];
  return {
    company: { name: w.company?.name?.trim() || 'Perusahaan Saya' },
    rooms, roles,
    coordinatorId: ids.has(w.coordinatorId ?? '') ? w.coordinatorId! : '',
    npcCount: Number.isFinite(w.npcCount) ? Math.min(12, Math.max(0, Math.round(w.npcCount!))) : 5,
    maxCalls: [6, 12, 24].includes(Number(w.maxCalls)) ? Number(w.maxCalls) : 12,
    projects, defaultProjectId: projects.some(p => p.id === w.defaultProjectId) ? w.defaultProjectId! : projects[0].id,
    releaseTemps: w.releaseTemps !== false,
  };
}
