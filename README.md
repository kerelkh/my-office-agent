# Kantor Agen

Kantor 3D bergaya simulasi (seperti The Sims) tempat agen Claude bekerja sebagai karyawan. Anda adalah CEO: lempar pekerjaan ke sekretaris, dan sekretaris membentuk tim dari karyawan yang ada atau merekrut karyawan kontrak dari katalog peran. Karyawan berjalan, duduk, dan menyerahkan hasil di gedung 3D, sementara pekerjaannya berjalan sungguhan lewat **Claude Code CLI** memakai login langganan Anda. Tidak ada API key.

Aplikasi ini **hanya untuk dipakai di komputer sendiri (self-hosted lokal)**. Lihat bagian [Keamanan](#keamanan).

## Fitur

- **Sesi pekerjaan seperti terminal Claude Code.** Tiap pekerjaan adalah percakapan: kirim pesan lanjutan, karyawan bekerja sebagai sub-agen (paralel), hasil tampil sebagai Markdown, berkas hasil bisa diklik dan dibuka di browser.
- **Sekretaris dan tim otomatis.** Sekretaris memilih karyawan yang ada atau merekrut dari katalog (23 bidang, tingkat magang sampai direktur, sekitar 230 peran) dengan nama acak. Karyawan kontrak pulang setelah pekerjaan selesai.
- **Folder proyek per pekerjaan.** Pilih folder yang boleh diakses agen, taruh berkas di sana, dan hasil kerja disimpan di sana juga.
- **Semua karyawan bisa membaca dan menulis berkas, mencari di web, dan memakai shell.** Izin web dan shell mengikuti permission Claude Code Anda (`settings.json`). Yang membedakan karyawan hanya **skill** (tanpa skill, semua skill, atau skill pilihan) dan model (Haiku, Sonnet, Opus).
- **Gedung 3D hidup.** Beberapa lantai dan ruangan (kerja, pantry, rapat, aula, lobi, diskusi), tangga, halaman luar, NPC, dan karyawan yang berkeliling saat menganggur.
- **Penyimpanan SQLite satu berkas.** Perusahaan, sesi, dan seluruh log tersimpan di `data/kantor.db`.

## Prasyarat

| Kebutuhan | Keterangan |
|---|---|
| Node.js 22.13 atau lebih baru (disarankan 24+) | Database memakai `node:sqlite` bawaan Node. Di Node 22.5 sampai 22.12 butuh flag `--experimental-sqlite`. |
| [Claude Code CLI](https://docs.claude.com/en/docs/claude-code) | Perintah `claude` harus ada di PATH. |
| Akun Claude (langganan) | Login sekali dengan `claude auth login`, atau lewat tombol di Pengaturan aplikasi. |
| Browser modern | Chrome, Edge, atau Firefox dengan WebGL. |

## Menjalankan

```bash
git clone https://github.com/kerelkh/my-office-agent.git
cd my-office-agent
npm install
npm run dev
```

Buka `http://localhost:5173`. Perintah `npm run dev` menjalankan backend (port 3737) dan Vite (port 5173) bersamaan.

Untuk pemakaian sehari-hari tanpa mode pengembangan:

```bash
npm run build
npm start
```

Lalu buka `http://localhost:3737`.

Pertama kali buka, pastikan chip di kanan atas bertuliskan **Claude tersambung**. Kalau belum, buka **Pengaturan**, bagian Koneksi Claude, lalu login dan tekan Periksa status.

## Cara memakai

1. **Mulai sesi.** Buka panel **Pekerjaan**, tulis apa yang perlu dikerjakan, pilih folder proyek, lalu **Mulai sesi**.
   - **Otomatis:** sekretaris membentuk tim dan membagi pekerjaan.
   - **Pilih karyawan:** satu karyawan mengerjakan langsung. Bisa juga diawali `@Nama` di pesan.
   - **Playbook:** mengikuti alur "setelah ini" dari karyawan awal.
2. **Ikuti progres.** Kotak obrolan di kiri bawah menampilkan aliran kejadian sesi aktif, lengkap dengan bar kemajuan. Panel **Jejak** menampilkan sesi penuh seperti terminal.
3. **Lanjutkan percakapan.** Di Jejak atau kotak obrolan, ketik pesan lanjutan. Sekretaris membaca hasil sebelumnya lalu membagi pekerjaan lagi.
4. **Buka hasil.** Berkas yang dibuat karyawan muncul sebagai tautan di Jejak. Klik untuk membukanya di tab browser (HTML langsung tampil).
5. **Hapus sesi.** Tombol Hapus ada di Jejak dan di daftar sesi. Berkas hasil di folder proyek tidak ikut terhapus.

### Perintah sesi

| Perintah | Fungsi |
|---|---|
| `/help` | daftar perintah |
| `/stop` | hentikan yang sedang berjalan |
| `/delete` | hapus sesi ini |
| `/files` | daftar berkas hasil |
| `/team` | siapa saja yang bekerja di sesi ini |
| `/model haiku\|sonnet\|opus\|default` | ganti model untuk pesan berikutnya |
| `/budget 20` | batas panggilan Claude per giliran (1 sampai 60) |
| `/mode auto` atau `/mode direct Nala` | ganti cara penugasan |
| `/nama-skill teks` | minta karyawan memakai sebuah skill |
| `@Nama teks` | kirim pesan langsung ke satu karyawan |

### Panel lain

- **Karyawan:** tambah, ubah, dan rekrut dari katalog. Atur model, skill, kepribadian, dan siapa yang jadi koordinator.
- **Ruangan:** atur denah gedung dan lantai.
- **Pengaturan:** nama perusahaan, folder proyek, suasana kantor (jumlah NPC, kehidupan kantor), koneksi Claude dan skill, serta template contoh.

### Kamera

Seret untuk menggeser, klik kanan lalu seret untuk memutar, roda untuk zoom ke kursor, `W A S D` untuk berjalan (Shift lebih cepat), `Q E` untuk memutar, `R` untuk kembali ke tengah. Tombol `L1`, `L2`, `L3` memilih lantai yang tampak.

## Izin dan batasan agen

- Karyawan bekerja di **folder proyek** yang Anda pilih dan tidak boleh mengubah folder konfigurasi Claude (`~/.claude`).
- **Web dan shell tidak diatur oleh aplikasi ini.** Apa yang boleh dijalankan mengikuti permission Claude Code Anda. Aturan yang belum diizinkan di sana akan ditolak dan tercatat di Jejak sebagai "ditolak". Tambahkan aturan izinnya di `settings.json` bila ingin dibolehkan.
- Koneksi MCP (Gmail, Drive, Kalender, dan sebagainya) selalu ditutup (`--strict-mcp-config`).
- Anggaran panggilan per giliran dibatasi (bawaan 12) supaya kuota langganan tidak habis tanpa sadar.

## Data

| Data | Lokasi |
|---|---|
| Perusahaan, sesi, dan log | `data/kantor.db` (SQLite) |
| Berkas hasil kerja agen | folder proyek yang Anda pilih (bawaan `workdir/`) |
| Login Claude | dikelola Claude Code sendiri, tidak disimpan aplikasi ini |

Folder `data/` dan `workdir/` **tidak ikut di Git** karena berisi percakapan dan hasil kerja pribadi. Berkas JSON versi lama (`data/workspace.json`, `data/jobs.json`) diimpor sekali ke SQLite saat server pertama berjalan, dan tidak diubah.

Isi database tidak dienkripsi. Siapa pun yang bisa membuka folder `data/` bisa membacanya.

## Pindah ke perangkat baru

1. Pasang Node.js dan Claude Code CLI, lalu `claude auth login`.
2. Clone repo, `npm install`, lalu `npm run dev`.
3. Matikan server di perangkat lama, lalu salin `data/kantor.db` ke folder `data/` di perangkat baru (sebelum server dijalankan). Salin juga folder proyek Anda.
4. Di **Pengaturan**, perbaiki path folder proyek bila lokasinya berbeda.
5. Salin permission `settings.json` dan pasang ulang skill atau plugin Claude Code yang dipakai karyawan. Keduanya melekat pada perangkat.

## Arsitektur

```
src/                 antarmuka (React 18, TypeScript, Vite)
  scene/             gedung 3D, karyawan, NPC (Three.js lewat React Three Fiber)
  ui/                panel Pekerjaan, Jejak, Karyawan, Ruangan, Pengaturan, kotak obrolan
  layout.ts          denah, pintu, tangga, navigasi A* antarruangan dan lantai
  catalogData.ts     katalog peran, tingkat, dan nama acak (dipakai juga oleh server)
  store.ts           state aplikasi (Zustand)
server/
  index.mjs          backend Node tanpa framework: antrean sesi, pemanggilan `claude -p`, SSE
  db.mjs             lapisan SQLite
```

- Backend menjalankan tiap panggilan karyawan sebagai `claude -p --output-format stream-json`, dan menyiarkan kejadiannya ke antarmuka lewat Server-Sent Events.
- Sampai 3 sesi dapat berjalan bersamaan, dan anggota tim dalam satu putaran bekerja paralel.
- Skrip `npm run build` menjalankan pemeriksaan TypeScript lalu membangun frontend ke `dist/`.

## Keamanan

Aplikasi ini **tidak punya login**. Siapa pun yang bisa menjangkau servernya bisa menjalankan Claude dengan langganan Anda, memakai shell, dan membaca berkas di folder proyek.

- Backend hanya mendengarkan di `127.0.0.1`, dan Vite hanya di `localhost`. Permintaan dengan Host atau Origin selain localhost ditolak.
- **Jangan** membuka port 3737 atau 5173 ke jaringan atau internet (port forwarding, tunnel, atau mengubah `host` di `vite.config.ts`) tanpa menambahkan autentikasi dan HTTPS terlebih dahulu.
- Berkas hasil yang dibuka dari Jejak disajikan dengan CSP `sandbox`, sehingga skripnya tidak bisa memanggil API aplikasi ini.

## Pemecahan masalah

| Gejala | Penyebab dan solusi |
|---|---|
| "Claude belum terpasang" | Perintah `claude` tidak ada di PATH. Pasang Claude Code CLI lalu mulai ulang terminal. |
| "Claude belum login" | Jalankan `claude auth login`, lalu tekan Periksa status di Pengaturan. |
| Karyawan menulis "ditolak" di Jejak | Permission Claude Code belum mengizinkan alat itu. Tambahkan aturannya di `settings.json`. |
| "Anggaran N panggilan sudah habis" | Naikkan anggaran di komposer atau ketik `/budget 24`. |
| Error `node:sqlite` saat server mulai | Versi Node terlalu lama. Pakai Node 22.13 atau lebih baru. |
| Port 3737 atau 5173 sudah dipakai | Tutup proses lama, atau set variabel lingkungan `PORT` (mis. 3800) sebelum `npm start`. |
| Layar 3D kosong atau lambat | Pastikan akselerasi perangkat keras browser aktif. Kurangi jumlah NPC di Pengaturan. |

## Lisensi

Belum ditentukan. Tambahkan berkas `LICENSE` sebelum membagikan proyek ini ke orang lain.
