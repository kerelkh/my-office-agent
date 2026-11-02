import type { Workspace } from './types';

export interface Issue { level: 'error' | 'warn'; text: string }

/** Masalah umum pada perusahaan, apa pun cara penugasannya. */
export function validateCompany(ws: Workspace): Issue[] {
  const out: Issue[] = [];
  if (!ws.rooms.some(r => r.kind === 'kerja')) out.push({ level: 'error', text: 'Belum ada ruang kerja. Tambahkan di tab Ruangan.' });
  if (!ws.roles.length) { out.push({ level: 'error', text: 'Belum ada karyawan. Tambahkan di tab Karyawan.' }); return out; }
  ws.roles.forEach(r => {
    if (!r.prompt.trim()) out.push({ level: 'warn', text: `${r.name}: instruksi kosong.` });
    if (r.access !== 'text' && r.skillMode === 'pick' && !r.skills.length) out.push({ level: 'warn', text: `${r.name}: mode "skill pilihan" tanpa skill terpilih, tidak ada skill yang bisa dipakai.` });
  });
  return out;
}

/** Masalah pada alur tetap yang dimulai dari `startId`. */
export function validatePlaybook(ws: Workspace, startId: string): Issue[] {
  const out: Issue[] = [];
  const ids = new Set(ws.roles.map(r => r.id));
  if (!ids.has(startId)) return [{ level: 'error', text: 'Pilih karyawan awal untuk playbook.' }];
  ws.roles.forEach(r => {
    if (r.next !== 'END' && !ids.has(r.next)) out.push({ level: 'error', text: `${r.name}: tujuan "setelah ini" tidak ditemukan.` });
    if (r.reviewer && !r.rejectTo) out.push({ level: 'warn', text: `${r.name}: reviewer tanpa tujuan revisi, permintaan revisi akan diabaikan.` });
  });
  const seen = new Set<string>();
  const stack = [startId];
  let canEnd = false;
  while (stack.length) {
    const id = stack.pop()!;
    if (id === 'END') { canEnd = true; continue; }
    if (seen.has(id)) continue;
    const r = ws.roles.find(x => x.id === id);
    if (!r) continue;
    seen.add(id);
    stack.push(r.next || 'END');
    if (r.reviewer && r.rejectTo) stack.push(r.rejectTo);
  }
  if (!canEnd) out.push({ level: 'error', text: 'Alur tidak pernah mencapai Selesai. Arahkan satu karyawan ke Selesai.' });
  return out;
}
