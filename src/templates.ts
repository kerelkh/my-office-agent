import { CATALOG, FIELDS, fullRole, levelOf, randomName, type LevelId } from './catalogData';
import { newRole, newRoom } from './normalize';
import type { Role, Workspace } from './types';

const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];
const shuffle = <T,>(xs: T[]): T[] => xs.map(x => [Math.random(), x] as const).sort((a, b) => a[0] - b[0]).map(p => p[1]);

/** Sekretaris sebagai koordinator, ditambah beberapa karyawan acak dari katalog (nama acak, jabatan sesuai peran). */
function secretaryAndRandomStaff(): Workspace {
  const rooms = [
    newRoom({ id: 'room-lobi', name: 'Lobi', kind: 'lobi', floor: 0, row: 0 }),
    newRoom({ id: 'room-eks', name: 'Kantor Sekretaris', floor: 0, row: 0 }),
    newRoom({ id: 'room-kerja-1', name: 'Ruang Kerja 1', floor: 0, row: 0 }),
    newRoom({ id: 'room-pantry', name: 'Pantry', kind: 'pantry', floor: 0, row: 0 }),
    newRoom({ id: 'room-rapat', name: 'Ruang Rapat Besar', kind: 'rapat', wide: true, floor: 0, row: 1 }),
    newRoom({ id: 'room-aula', name: 'Aula', kind: 'aula', floor: 0, row: 1 }),
    newRoom({ id: 'room-diskusi', name: 'Ruang Diskusi', kind: 'diskusi', floor: 0, row: 1 }),
    newRoom({ id: 'room-kerja-2', name: 'Ruang Kerja 2', floor: 1, row: 0 }),
  ];
  const used = new Set<string>(['Sekretaris']);
  const secretary = newRole({
    ...fullRole(CATALOG.find(s => s.title === 'Chief of Staff')!, 'senior', { id: 'sekretaris', name: 'Sekretaris', roomId: 'room-eks' }),
    title: 'Chief of Staff', personality: 'rajin', canDelegate: true,
    prompt: 'Kamu Sekretaris sekaligus Chief of Staff. Kamu memahami maksud CEO, membentuk tim dari karyawan yang ada atau merekrut peran dan tingkat yang paling tepat dari katalog, membagi pekerjaan, memeriksa hasilnya, lalu menyampaikan hasil akhir yang jelas. Hemat kuota: tim sekecil mungkin yang masih optimal. Jawab dalam bahasa Indonesia.',
  });
  const levels: LevelId[] = ['junior', 'madya', 'madya', 'senior', 'senior', 'lead'];
  const staff: Role[] = shuffle(FIELDS.filter(f => f.id !== 'eksekutif')).slice(0, 7).map((f, i) => {
    const spec = pick(CATALOG.filter(s => s.field === f.id));
    const name = randomName(used); used.add(name);
    return newRole(fullRole(spec, pick(levels), { id: `staf-${i + 1}-${Math.random().toString(36).slice(2, 5)}`, name, roomId: i % 2 ? 'room-kerja-2' : 'room-kerja-1' }));
  });
  void levelOf;
  return {
    company: { name: 'Perusahaan Saya' },
    projects: [{ id: 'proyek-utama', name: 'Proyek utama', path: '' }], defaultProjectId: 'proyek-utama', releaseTemps: true,
    maxCalls: 12, npcCount: 6, coordinatorId: 'sekretaris', rooms, roles: [secretary, ...staff],
  };
}


export interface Template { id: string; name: string; description: string; make: () => Workspace }

export const TEMPLATES: Template[] = [
  {
    id: 'sekretaris-acak',
    name: 'Sekretaris dan karyawan acak',
    description: 'Sekretaris sebagai koordinator dan tujuh karyawan acak dari katalog. Sekretaris bisa merekrut peran lain sesuai pekerjaan.',
    make: secretaryAndRandomStaff,
  },
  {
    id: 'serba-bisa',
    name: 'Perusahaan serba bisa',
    description: 'Gedung dua lantai: lobi, kantor eksekutif, studio, pantry, rapat besar, aula, ruang diskusi, dan engineering di lantai atas.',
    make: () => ({
      company: { name: 'Perusahaan Saya' },
      projects: [{ id: 'proyek-utama', name: 'Proyek utama', path: '' }],
      defaultProjectId: 'proyek-utama',
      releaseTemps: true,
      maxCalls: 12,
      npcCount: 6,
      coordinatorId: 'sekretaris',
      rooms: [
        newRoom({ id: 'room-lobi', name: 'Lobi', kind: 'lobi', floor: 0, row: 0 }),
        newRoom({ id: 'room-eks', name: 'Kantor Eksekutif', floor: 0, row: 0 }),
        newRoom({ id: 'room-studio', name: 'Studio', floor: 0, row: 0 }),
        newRoom({ id: 'room-pantry', name: 'Pantry', kind: 'pantry', floor: 0, row: 0 }),
        newRoom({ id: 'room-rapat', name: 'Ruang Rapat Besar', kind: 'rapat', wide: true, floor: 0, row: 1 }),
        newRoom({ id: 'room-aula', name: 'Aula', kind: 'aula', floor: 0, row: 1 }),
        newRoom({ id: 'room-diskusi', name: 'Ruang Diskusi', kind: 'diskusi', floor: 0, row: 1 }),
        newRoom({ id: 'room-eng', name: 'Engineering', floor: 1, row: 0 }),
      ],
      roles: [
        newRole({
          id: 'sekretaris', name: 'Sekretaris', title: 'Chief of Staff', roomId: 'room-eks', model: 'sonnet', personality: 'rajin',
          tags: ['koordinasi', 'perencanaan', 'ringkasan'],
          prompt: 'Kamu Chief of Staff yang sigap dan ringkas. Kamu memahami maksud CEO, memecah pekerjaan, memilih karyawan yang paling cocok, memeriksa hasil, lalu menyampaikan hasil akhir yang jelas. Jawab dalam bahasa Indonesia.',
        }),
        newRole({
          id: 'peneliti', name: 'Riset', title: 'Peneliti', roomId: 'room-studio', model: 'haiku', personality: 'penyendiri',
          tags: ['riset', 'fakta', 'sumber'], access: 'skills', web: true, next: 'penulis',
          prompt: 'Kamu seorang peneliti. Cari bahan di web bila perlu, lalu berikan poin-poin riset yang padat dan faktual dengan sumbernya. Tandai hal yang belum pasti. Jawab dalam bahasa Indonesia.',
        }),
        newRole({
          id: 'penulis', name: 'Nala', title: 'Penulis', roomId: 'room-studio', model: 'sonnet', personality: 'sosial',
          tags: ['menulis', 'artikel', 'copywriting'], canDelegate: true,
          prompt: 'Kamu seorang penulis. Tulis teks berbahasa Indonesia yang mengalir, jelas, dan sesuai kebutuhan. Bila butuh data atau fakta tambahan, minta bantuan rekan yang ahli.',
        }),
        newRole({
          id: 'developer', name: 'Senior Developer', title: 'Software Engineer', roomId: 'room-eng', model: 'sonnet', personality: 'santai',
          tags: ['kode', 'javascript', 'python', 'debugging'], access: 'work', next: 'qa',
          prompt: 'Kamu Senior Developer. Selesaikan tugas dengan kode yang rapi dan ringkas, simpan sebagai berkas di folder kerja, dan sebutkan path berkasnya. Jika menerima catatan QA, perbaiki berkasnya. Jawab dalam bahasa Indonesia.',
        }),
        newRole({
          id: 'qa', name: 'QA', title: 'Quality Assurance', roomId: 'room-eng', model: 'sonnet', personality: 'rajin',
          tags: ['review', 'testing', 'keamanan'], access: 'skills', reviewer: true, rejectTo: 'developer',
          prompt: 'Kamu QA yang teliti. Baca berkas yang disebut developer di folder kerja, lalu periksa bug, kasus tepi, keamanan, dan keterbacaan. Jika sudah layak, setujui dan ringkas hasilnya. Jawab dalam bahasa Indonesia.',
        }),
      ],
    }),
  },
  {
    id: 'kosong',
    name: 'Mulai dari kosong',
    description: 'Hanya satu ruang kerja dan satu pantry. Anda menambah karyawan sendiri.',
    make: () => ({
      company: { name: 'Perusahaan Saya' },
      projects: [{ id: 'proyek-utama', name: 'Proyek utama', path: '' }],
      defaultProjectId: 'proyek-utama',
      releaseTemps: true,
      maxCalls: 12,
      npcCount: 4,
      coordinatorId: '',
      rooms: [newRoom({ id: 'room-lobi', name: 'Lobi', kind: 'lobi' }), newRoom({ id: 'room-1', name: 'Ruang Kerja' }), newRoom({ id: 'room-pantry', name: 'Pantry', kind: 'pantry' })],
      roles: [],
    }),
  },
];

export const defaultWorkspace = () => TEMPLATES[0].make();
