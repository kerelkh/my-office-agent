export type Model = 'haiku' | 'sonnet' | 'opus';

/** kerja: ruang kerja dengan meja · pantry, rapat, lobi: fasilitas tempat karyawan beraktivitas saat idle */
export type RoomKind = 'kerja' | 'pantry' | 'rapat' | 'lobi' | 'aula' | 'diskusi';
export interface Room {
  id: string;
  name: string;
  kind: RoomKind;
  /** lantai, mulai dari 0 */
  floor: number;
  /** 0 = baris depan (menghadap lobi utama), 1 = baris belakang (menghadap lorong dalam) */
  row: 0 | 1;
  /** ruangan besar: 1,5 kali lebih lebar (tidak berlaku untuk ruang kerja, lebarnya mengikuti jumlah meja) */
  wide: boolean;
}

/** text: tanpa tool · skills: Skill + baca berkas · work: skills + tulis berkas di folder kerja */
export type Access = 'text' | 'skills' | 'work';
export type Personality = 'sosial' | 'penyendiri' | 'rajin' | 'santai';

export interface Role {
  id: string;
  name: string;
  /** jabatan, mis. "Senior Developer" */
  title: string;
  roomId: string;
  model: Model;
  /** instruksi peran */
  prompt: string;
  /** keahlian, dibaca koordinator saat membagi pekerjaan */
  tags: string[];
  /** catatan tetap dari CEO yang selalu dibawa karyawan ini */
  memory: string;
  personality: Personality;
  access: Access;
  /** WebSearch dan WebFetch */
  web: boolean;
  /** Bash: menjalankan perintah di komputer ini */
  shell: boolean;
  /** semua skill terdaftar, atau hanya yang dipilih */
  skillMode: 'all' | 'pick';
  skills: string[];
  /** boleh meminta bantuan rekan saat mengerjakan tugas */
  canDelegate: boolean;
  /** karyawan kontrak: direkrut sekretaris untuk satu pekerjaan, lalu dilepas */
  temp?: boolean;
  /** reviewer menjawab "SETUJU:" atau "REVISI:" */
  reviewer: boolean;
  /** Playbook: role berikutnya, atau 'END' */
  next: string;
  /** Playbook: tujuan bila reviewer meminta revisi */
  rejectTo: string;
}

/** Folder proyek yang bisa diakses agen. path kosong = folder bawaan aplikasi. */
export interface Project { id: string; name: string; path: string }

export interface Workspace {
  company: { name: string };
  rooms: Room[];
  roles: Role[];
  /** karyawan yang memecah dan membagi pekerjaan otomatis */
  coordinatorId: string;
  /** jumlah NPC pengunjung yang berkeliaran, hanya pemanis */
  npcCount: number;
  /** anggaran panggilan Claude per pekerjaan */
  maxCalls: number;
  /** folder proyek yang boleh dipilih untuk tiap pekerjaan */
  projects: Project[];
  defaultProjectId: string;
  /** lepas karyawan kontrak setelah pekerjaan selesai */
  releaseTemps: boolean;
}

export type JobMode = 'auto' | 'direct' | 'playbook';
export type JobStatus = 'queued' | 'running' | 'done' | 'error' | 'stopped';
export interface JobStep { role: string; name: string; text: string }
export interface Job {
  id: string;
  task: string;
  mode: JobMode;
  /** nama dan path folder proyek yang dipakai pekerjaan ini */
  project?: { id: string; name: string; path: string };
  /** karyawan yang dibentuk sekretaris untuk pekerjaan ini */
  team?: { id: string; name: string; title: string; temp: boolean; why?: string }[];
  /** direct: karyawan penerima · playbook: role awal */
  target?: string;
  status: JobStatus;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  calls: number;
  /** anggaran panggilan untuk giliran yang sedang atau terakhir berjalan */
  budget?: number;
  /** pengaturan sesi dari perintah /model dan /budget */
  opts?: { model?: 'haiku' | 'sonnet' | 'opus'; maxCalls?: number };
  updatedAt?: number;
  steps: JobStep[];
  final?: string;
  error?: string;
  /** berkas yang dibuat atau diubah karyawan di folder proyek, path relatif */
  files?: JobFile[];
  /** pesan CEO beserta hasilnya; sesi ini percakapan, bukan satu kali jalan */
  turns?: { text: string; at: number; final?: string }[];
}
export interface JobFile { path: string; size: number; new?: boolean }

/** satu baris di terminal sesi */
export interface LogEntry {
  id: number;
  t: number;
  kind: 'user' | 'result' | 'tool' | 'denied' | 'error' | 'info' | 'status' | 'files' | 'local';
  role?: string;
  name?: string;
  tool?: string;
  text: string;
  files?: JobFile[];
}

export type ServerEvent =
  | { type: 'job'; job: Job }
  | { type: 'jobdeleted'; job: string }
  | { type: 'log'; job: string; entry: LogEntry }
  | { type: 'start'; job: string; task: string; role: string }
  | { type: 'work'; job: string; role: string; status: string }
  | { type: 'recruit'; job: string; role: Role; why: string }
  | { type: 'result'; job: string; role: string; text: string; full: string }
  | { type: 'tool'; job: string; role: string; tool: string; label: string }
  | { type: 'denied'; job: string; role: string; tool: string; label: string }
  | { type: 'handover'; job: string; from: string; to: string; revise: boolean }
  | { type: 'done'; job: string; text: string }
  | { type: 'error'; job: string; message: string }
  | { type: 'stopped'; job: string; message: string };

/** pose tubuh karyawan saat beraktivitas */
export type Pose = 'none' | 'drink' | 'read' | 'stretch' | 'talk' | 'look';

/** keadaan sesaat tiap karyawan, hanya ada di browser */
export interface RoleRuntime {
  status: string;
  working: boolean;
  bubble: string | null;
  carrying: boolean;
  /** aktivitas saat idle (ngopi, ngobrol, ...); selama terisi karyawan tidak pulang ke mejanya */
  activity: string | null;
  pose: Pose;
  /** id karyawan yang sedang dihadapi saat ngobrol */
  faceTo: string | null;
  /** duduk di kursi atau sofa saat beraktivitas */
  sit: boolean;
  /** arah hadap paksa (radian) saat berhenti, mis. menghadap layar aula */
  heading: number | null;
}

export interface ClaudeStatus {
  installed: boolean;
  version?: string;
  loggedIn?: boolean;
  email?: string | null;
  plan?: string | null;
  method?: string | null;
  error?: string;
}

export interface TrailEntry { id: number; time: string; roleId?: string; kind: 'info' | 'result' | 'error' | 'final' | 'tool' | 'denied'; text: string }
