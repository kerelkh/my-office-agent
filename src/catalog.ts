import { fullRole, randomName, type LevelId, type RoleSpec } from './catalogData';
import { newRole } from './normalize';
import type { Role } from './types';

export * from './catalogData';

/** Mengubah satu peran katalog menjadi karyawan siap pakai. `name` bawaan: nama orang acak, jabatannya ada di `title`. */
export function makeRole(spec: RoleSpec, levelId: LevelId, roomId: string, id: string, name?: string): Role {
  return newRole(fullRole(spec, levelId, { id, name: name ?? randomName(new Set()), roomId }));
}
