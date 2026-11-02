import { homePt, route, type Layout, type Pt, type Spot } from './layout';
import { positions } from './positions';
import { spotTaken } from './physics';
import type { Personality, Pose, Role } from './types';

/** Kehidupan kantor: karyawan yang tidak bekerja berkeliling, duduk, ngopi, dan ngobrol dengan waktu acak. Murni visual, tidak memakai kuota Claude. */
type Act = 'ngopi' | 'minum' | 'ngobrol' | 'baca' | 'regang' | 'keliling' | 'meja' | 'nonton' | 'duduk' | 'jalan' | 'taman' | 'kafe' | 'halte';

const WEIGHTS: Record<Personality, Record<Act, number>> = {
  sosial:     { ngobrol: 4, ngopi: 2, minum: 1, keliling: 2, regang: 1, baca: 0.5, meja: 1, nonton: 1, duduk: 1.5, jalan: 2, taman: 1.5, kafe: 3, halte: 0.5 },
  penyendiri: { ngobrol: 0.3, ngopi: 1.5, minum: 1, keliling: 1, regang: 2, baca: 3, meja: 2, nonton: 1, duduk: 1, jalan: 1.5, taman: 3, kafe: 1, halte: 1 },
  rajin:      { ngobrol: 0.5, ngopi: 1, minum: 1, keliling: 0.3, regang: 3, baca: 1, meja: 5, nonton: 0.3, duduk: 0.5, jalan: 0.4, taman: 0.4, kafe: 0.5, halte: 0.1 },
  santai:     { ngobrol: 3, ngopi: 3, minum: 1, keliling: 3, regang: 1, baca: 2, meja: 1, nonton: 2, duduk: 2.5, jalan: 3.5, taman: 3, kafe: 3, halte: 1 },
};

const OPENERS = ['Gimana kerjaannya?', 'Sibuk hari ini?', 'Ada kabar apa?', 'Lagi senggang nih.', 'Udah makan siang?'];
const REPLIES = ['Lancar, kamu?', 'Lumayan, banyak antrean.', 'Baru beres satu tugas.', 'Santai dulu sebentar.', 'Nanti ngopi bareng yuk.'];
const IDLE_SPEED = 0.5;       // jalan santai, separuh kecepatan kerja

export interface LifeApi {
  roles(): Role[];
  layout(): Layout;
  speed(): number;
  enabled(): boolean;
  /** true bila karyawan sedang bebas: tidak bekerja, tidak membawa dokumen, tidak berjalan, tidak beraktivitas */
  isFree(id: string): boolean;
  patch(id: string, p: { activity?: string | null; pose?: Pose; faceTo?: string | null; sit?: boolean; heading?: number | null }): void;
  say(id: string, text: string, ms?: number): void;
  walk(id: string, pts: Pt[], speed?: number): Promise<void>;
  cancelWalk(id: string): void;
}

interface Token { cancelled: boolean; ids: string[] }

export function startLife(api: LifeApi) {
  const tokens: Record<string, Token | undefined> = {};
  const next: Record<string, number> = {};
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);
  const pick = <T,>(xs: T[]): T | undefined => xs[Math.floor(Math.random() * xs.length)];
  /** Pilih titik yang sedang tidak dipakai orang lain; bila semua penuh, ambil sembarang. */
  const pickFree = (id: string, xs: Spot[]): Spot | undefined => pick(xs.filter(s => !spotTaken(s.x, s.z, s.y, id))) ?? pick(xs);
  const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

  const posOf = (id: string): Pt => {
    const p = positions[id];
    if (p) return [p.x, p.z, p.y];
    const d = api.layout().desks[id];
    return d ? homePt(d) : [0, 0, 0];
  };

  /** Menghentikan aktivitas (dan pasangan ngobrolnya) agar karyawan bisa langsung dipakai bekerja. */
  function cancel(id: string) {
    const t = tokens[id];
    if (!t) return;
    t.cancelled = true;
    t.ids.forEach(i => api.cancelWalk(i));
  }

  async function perform(id: string, act: Act) {
    const tok: Token = { cancelled: false, ids: [id] };
    tokens[id] = tok;
    api.patch(id, { activity: 'Bersiap' });
    const alive = () => !tok.cancelled;
    const go = async (who: string, pt: Pt, speed = IDLE_SPEED) => {
      if (!alive()) return false;
      await api.walk(who, route(api.layout(), posOf(who), pt), speed);
      return alive();
    };
    const toSpot = (who: string, s: Spot) => go(who, [s.x, s.z, s.y]);
    const hold = async (ms: number) => {
      const end = Date.now() + ms / api.speed();
      while (alive() && Date.now() < end) await delay(150);
      return alive();
    };
    const seatAt = (s: Spot) => api.patch(id, { sit: !!s.sit, heading: s.face });
    const L = api.layout();

    try {
      let a: Act = act;
      if (a === 'ngopi' && !L.spots.coffee.length) a = 'duduk';
      if (a === 'minum' && !L.spots.water.length) a = 'regang';
      if (a === 'baca' && !L.spots.sofa.length && !L.spots.seats.length) a = 'regang';
      if (a === 'nonton' && !L.spots.view.length) a = 'duduk';
      if (a === 'duduk' && !L.spots.seats.length && !L.spots.sofa.length) a = 'keliling';
      if (a === 'keliling' && !L.spots.stand.length) a = 'regang';
      if ((a === 'jalan') && !L.spots.park.length) a = 'keliling';
      if ((a === 'taman' || a === 'halte') && !L.spots.bench.length) a = 'jalan';
      if (a === 'kafe' && !L.spots.cafe.length) a = 'ngopi';

      if (a === 'ngopi') {
        api.patch(id, { activity: 'Ngopi di pantry' });
        if (!await toSpot(id, pickFree(id, L.spots.coffee)!)) return;
        api.patch(id, { pose: 'drink' });
        if (!await hold(rnd(5000, 9000))) return;
        const table = pickFree(id, L.spots.seats.filter(s => s.sit));
        if (table && Math.random() < 0.6) {
          api.patch(id, { pose: 'none' });
          if (!await toSpot(id, table)) return;
          seatAt(table); api.patch(id, { pose: 'drink', activity: 'Ngopi sambil duduk' });
          await hold(rnd(12000, 30000));
        }
      } else if (a === 'minum') {
        api.patch(id, { activity: 'Minum air' });
        if (!await toSpot(id, pickFree(id, L.spots.water)!)) return;
        api.patch(id, { pose: 'drink' });
        await hold(rnd(3000, 6000));
      } else if (a === 'baca') {
        api.patch(id, { activity: 'Membaca' });
        const s = pickFree(id, L.spots.sofa.length ? L.spots.sofa : L.spots.seats)!;
        if (!await toSpot(id, s)) return;
        seatAt(s); api.patch(id, { pose: 'read' });
        await hold(rnd(18000, 55000));
      } else if (a === 'nonton') {
        api.patch(id, { activity: 'Menonton di aula' });
        const s = pickFree(id, L.spots.view)!;
        if (!await toSpot(id, s)) return;
        seatAt(s);
        await hold(rnd(20000, 70000));
      } else if (a === 'duduk') {
        api.patch(id, { activity: 'Duduk santai' });
        const s = pickFree(id, [...L.spots.sofa, ...L.spots.seats])!;
        if (!await toSpot(id, s)) return;
        seatAt(s);
        await hold(rnd(15000, 45000));
      } else if (a === 'jalan') {
        // menjelajah di luar gedung: plaza, taman, trotoar
        api.patch(id, { activity: 'Jalan-jalan di luar' });
        const stops = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < stops; i++) {
          const s = pickFree(id, L.spots.park);
          if (!s) break;
          if (!await go(id, [s.x + rnd(-1, 1), s.z + rnd(-0.5, 0.5), 0])) return;
          api.patch(id, { pose: 'look' });
          if (!await hold(rnd(4000, 11000))) return;
          api.patch(id, { pose: 'none' });
        }
      } else if (a === 'taman' || a === 'halte') {
        api.patch(id, { activity: a === 'taman' ? 'Duduk di taman' : 'Menunggu di halte' });
        const benches = a === 'halte' ? L.spots.bench.slice(-2) : L.spots.bench.slice(0, -2);
        const s = pickFree(id, benches.length ? benches : L.spots.bench)!;
        if (!await toSpot(id, s)) return;
        seatAt(s);
        await hold(rnd(20000, 70000));
      } else if (a === 'kafe') {
        api.patch(id, { activity: 'Ngopi di kafe' });
        if (!await toSpot(id, pickFree(id, L.spots.cafe)!)) return;
        api.patch(id, { pose: 'drink' });
        if (!await hold(rnd(4000, 8000))) return;
        const seat = pickFree(id, L.spots.cafeSeat);
        if (seat) {
          api.patch(id, { pose: 'none' });
          if (!await toSpot(id, seat)) return;
          seatAt(seat); api.patch(id, { pose: 'drink' });
          await hold(rnd(15000, 45000));
        }
      } else if (a === 'regang') {
        api.patch(id, { activity: 'Peregangan', pose: 'stretch' });
        await hold(rnd(2500, 4500));
      } else if (a === 'keliling') {
        api.patch(id, { activity: 'Jalan-jalan' });
        const stops = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < stops; i++) {
          const s = pickFree(id, L.spots.stand);
          if (!s) break;
          if (!await go(id, [s.x + rnd(-0.8, 0.8), s.z + rnd(0, 0.5), s.y])) return;
          api.patch(id, { pose: 'look' });
          if (!await hold(rnd(3000, 9000))) return;
          api.patch(id, { pose: 'none' });
          if (Math.random() < 0.3) await hold(rnd(1500, 4000));
        }
      } else if (a === 'ngobrol') {
        const partners = api.roles().filter(r => r.id !== id && L.desks[r.id] && api.isFree(r.id));
        const p = pick(partners);
        if (!p) { api.patch(id, { activity: 'Di meja' }); await hold(rnd(3000, 6000)); return; }
        tok.ids.push(p.id); tokens[p.id] = tok;
        const name = api.roles().find(r => r.id === id)?.name ?? '';
        api.patch(id, { activity: `Ngobrol dengan ${p.name}`, faceTo: p.id });
        api.patch(p.id, { activity: `Ngobrol dengan ${name}`, faceTo: id });
        const d = L.desks[p.id];
        const m: Pt = [d.x + 0.9, d.z + 2.6, d.y];
        const ok = await Promise.all([go(id, [m[0] + 0.6, m[1], m[2]]), go(p.id, [m[0] - 0.6, m[1], m[2]])]);
        if (!ok[0] || !ok[1] || !alive()) return;
        api.patch(id, { pose: 'talk' }); api.patch(p.id, { pose: 'talk' });
        const rounds = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < rounds; i++) {
          api.say(id, pick(OPENERS)!, 2200);
          if (!await hold(rnd(2500, 4000))) return;
          api.say(p.id, pick(REPLIES)!, 2200);
          if (!await hold(rnd(2500, 4000))) return;
        }
      } else {
        api.patch(id, { activity: 'Di meja' });
        await hold(rnd(6000, 22000));
      }
    } finally {
      for (const i of tok.ids) {
        if (tokens[i] !== tok) continue;
        tokens[i] = undefined;
        api.patch(i, { activity: null, pose: 'none', faceTo: null, sit: false, heading: null });
      }
      // jeda acak sebelum kegiatan berikutnya: kadang singkat, kadang lama
      next[id] = Date.now() + (Math.random() < 0.25 ? rnd(3000, 8000) : rnd(12000, 55000)) / api.speed();
    }
  }

  function tick() {
    if (!api.enabled()) return;
    const L = api.layout();
    const roles = api.roles();
    for (const r of roles) {
      const desk = L.desks[r.id];
      if (!desk || !api.isFree(r.id)) continue;
      if (!next[r.id]) next[r.id] = Date.now() + rnd(2000, 20000) / api.speed();
      if (Date.now() < next[r.id]) continue;
      const p = positions[r.id];
      if (p && Math.hypot(p.x - desk.x, p.z - desk.z) + Math.abs(p.y - desk.y) > 0.5) continue; // tunggu sampai duduk di mejanya

      const w = WEIGHTS[r.personality] ?? WEIGHTS.santai;
      const hasPartner = roles.some(o => o.id !== r.id && L.desks[o.id] && api.isFree(o.id));
      const options = (Object.keys(w) as Act[]).filter(a => a !== 'ngobrol' || hasPartner);
      let roll = Math.random() * options.reduce((s, a) => s + w[a], 0);
      let chosen: Act = 'meja';
      for (const a of options) { roll -= w[a]; if (roll <= 0) { chosen = a; break; } }
      void perform(r.id, chosen);
    }
  }

  const timer = setInterval(tick, 1000);
  return { cancel, stop: () => clearInterval(timer) };
}
