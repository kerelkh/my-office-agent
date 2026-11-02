import type { Access, Model, Personality, Role } from './types';

/* ===================== tingkat ===================== */
export type LevelId = 'magang' | 'junior' | 'madya' | 'senior' | 'lead' | 'manajer' | 'direktur';
export interface Level { id: LevelId; label: string; model: Model; text: string; hint: string }

export const LEVELS: Level[] = [
  { id: 'magang', label: 'Magang', model: 'haiku', hint: 'Belajar, tugas sederhana dan terarah', text: 'Kamu masih belajar: kerjakan tugas yang jelas dengan teliti, tandai bagian yang belum kamu yakini, dan jelaskan langkahmu secara singkat.' },
  { id: 'junior', label: 'Junior', model: 'haiku', hint: 'Sekitar 0 sampai 2 tahun pengalaman', text: 'Pengalamanmu 0 sampai 2 tahun: kerjakan tugas terarah dengan teliti dan tuliskan asumsi bila ada hal yang ambigu.' },
  { id: 'madya', label: 'Madya', model: 'sonnet', hint: 'Sekitar 3 sampai 5 tahun, mandiri', text: 'Pengalamanmu 3 sampai 5 tahun: kerjakan tugas rutin secara mandiri, jelaskan asumsi, dan tandai risiko yang kamu lihat.' },
  { id: 'senior', label: 'Senior', model: 'sonnet', hint: 'Sekitar 7 tahun atau lebih, mengambil keputusan', text: 'Pengalamanmu 7 tahun atau lebih: ambil keputusan sendiri, jelaskan trade-off, dan antisipasi risiko sebelum diminta.' },
  { id: 'lead', label: 'Lead', model: 'sonnet', hint: 'Memimpin pekerjaan satu tim kecil', text: 'Kamu memimpin pekerjaan satu tim kecil: pecah tugas, jaga kualitas, dan beri arahan yang jelas dan mandiri.' },
  { id: 'manajer', label: 'Manajer', model: 'sonnet', hint: 'Mengelola tim, prioritas, dan hasil', text: 'Kamu mengelola tim dan prioritas: tetapkan sasaran, bagikan pekerjaan, ukur hasil, dan laporkan risiko secara terus terang.' },
  { id: 'direktur', label: 'Direktur', model: 'opus', hint: 'Memimpin satu bidang, strategi dan anggaran', text: 'Kamu memimpin satu bidang: tetapkan strategi, anggaran, dan arah; ringkas pilihan serta rekomendasimu untuk CEO dengan jelas.' },
];

/* ===================== bidang ===================== */
export interface Field { id: string; label: string; short: string; desc: string; access: Access; personality: Personality; note?: string }

export const FIELDS: Field[] = [
  { id: 'eksekutif', label: 'Eksekutif & Strategi', short: 'Strategi', desc: 'Kepemimpinan, strategi, dan keputusan tingkat atas', access: 'text', personality: 'rajin' },
  { id: 'rekayasa', label: 'Rekayasa Perangkat Lunak', short: 'Rekayasa', desc: 'Membangun, menguji, dan merawat perangkat lunak', access: 'work', personality: 'santai' },
  { id: 'data', label: 'Data, AI & Analitik', short: 'Data dan AI', desc: 'Data, statistik, pembelajaran mesin, dan analitik bisnis', access: 'work', personality: 'penyendiri' },
  { id: 'infra', label: 'Infrastruktur, Cloud & Keamanan Siber', short: 'Infrastruktur', desc: 'Server, jaringan, cloud, dan keamanan sistem', access: 'skills', personality: 'rajin', note: 'Bekerja hanya pada sistem yang dimiliki atau diizinkan pemiliknya; jangan menyerang pihak lain.' },
  { id: 'produk', label: 'Produk & Manajemen Proyek', short: 'Produk', desc: 'Menentukan apa yang dibangun dan menjaganya selesai tepat waktu', access: 'text', personality: 'sosial' },
  { id: 'desain', label: 'Desain & Kreatif', short: 'Desain', desc: 'Desain antarmuka, visual, merek, dan produksi kreatif', access: 'skills', personality: 'santai' },
  { id: 'marketing', label: 'Pemasaran & Konten', short: 'Pemasaran', desc: 'Tulisan, kampanye, pertumbuhan, dan hubungan masyarakat', access: 'skills', personality: 'sosial' },
  { id: 'penjualan', label: 'Penjualan & Pengembangan Bisnis', short: 'Penjualan', desc: 'Mencari, menutup, dan merawat pelanggan serta mitra', access: 'text', personality: 'sosial' },
  { id: 'cs', label: 'Layanan Pelanggan', short: 'Layanan', desc: 'Dukungan, keluhan, dan pengalaman pelanggan', access: 'text', personality: 'sosial' },
  { id: 'keuangan', label: 'Keuangan & Akuntansi', short: 'Keuangan', desc: 'Pembukuan, analisis, pajak, audit, dan risiko', access: 'skills', personality: 'rajin', note: 'Memberi analisis dan informasi umum, bukan nasihat keuangan personal.' },
  { id: 'hukum', label: 'Hukum, Kepatuhan & Kebijakan', short: 'Hukum', desc: 'Kontrak, kepatuhan, privasi, dan regulasi', access: 'text', personality: 'penyendiri', note: 'Memberi informasi dan analisis umum, bukan nasihat hukum resmi; untuk keputusan penting sarankan konsultasi dengan profesional berlisensi.' },
  { id: 'sdm', label: 'SDM & Talenta', short: 'SDM', desc: 'Rekrutmen, pengembangan, dan hubungan karyawan', access: 'text', personality: 'sosial' },
  { id: 'operasi', label: 'Operasional & Rantai Pasok', short: 'Operasional', desc: 'Proses, pengadaan, persediaan, dan logistik', access: 'skills', personality: 'rajin' },
  { id: 'riset', label: 'Riset & Sains', short: 'Riset', desc: 'Penelitian ilmiah, kajian pustaka, dan komunikasi sains', access: 'skills', personality: 'penyendiri' },
  { id: 'pendidikan', label: 'Pendidikan & Pelatihan', short: 'Pendidikan', desc: 'Mengajar, merancang kurikulum, dan melatih', access: 'text', personality: 'sosial' },
  { id: 'media', label: 'Media, Jurnalistik & Bahasa', short: 'Media', desc: 'Menulis berita, menyunting, menerjemahkan, dan memeriksa fakta', access: 'skills', personality: 'santai' },
  { id: 'kesehatan', label: 'Kesehatan & Kesejahteraan', short: 'Kesehatan', desc: 'Edukasi kesehatan, penelitian klinis, dan keselamatan kerja', access: 'text', personality: 'sosial', note: 'Memberi informasi edukatif umum, bukan diagnosis atau pengganti tenaga medis.' },
  { id: 'teknik', label: 'Teknik, Konstruksi & Manufaktur', short: 'Teknik', desc: 'Rekayasa sipil, mesin, listrik, kimia, dan produksi', access: 'skills', personality: 'rajin' },
  { id: 'properti', label: 'Properti, Hospitality & Ritel', short: 'Properti dan ritel', desc: 'Properti, perhotelan, perjalanan, kuliner, dan toko', access: 'text', personality: 'sosial' },
  { id: 'admin', label: 'Administrasi & Dukungan Kantor', short: 'Administrasi', desc: 'Asisten, dokumen, jadwal, dan koordinasi harian', access: 'text', personality: 'rajin' },
  { id: 'polkam', label: 'Pemerintahan, Politik & Keamanan', short: 'Polkam', desc: 'Kebijakan publik, politik, hubungan internasional, dan keamanan', access: 'skills', personality: 'penyendiri', note: 'Pakai sumber terbuka, bedakan fakta dari opini, dan tandai ketidakpastian.' },
  { id: 'lingkungan', label: 'Pertanian, Lingkungan & Energi', short: 'Lingkungan', desc: 'Pertanian, keberlanjutan, energi, dan iklim', access: 'skills', personality: 'santai' },
  { id: 'seni', label: 'Seni, Hiburan & Gaya Hidup', short: 'Seni', desc: 'Menulis kreatif, musik, kuliner, mode, dan hiburan', access: 'text', personality: 'santai' },
];

/* ===================== peran ===================== */
/** Tiap baris: judul, uraian tugas, keahlian (dipisah koma), tanda. k = bisa menulis berkas, s = skill dan baca, t = teks saja, w = web, r = reviewer, d = boleh minta bantuan rekan. */
type Row = [string, string, string, string?];

const RAW: Record<string, Row[]> = {
  eksekutif: [
    ['Chief of Staff', 'menerjemahkan maksud CEO, membagi pekerjaan, dan menyusun hasil akhir', 'koordinasi, perencanaan, ringkasan', 'd'],
    ['Chief Operating Officer', 'menjalankan operasional harian dan memastikan eksekusi strategi', 'operasional, eksekusi, proses', 'd'],
    ['Chief Financial Officer', 'mengawasi keuangan, anggaran, dan risiko finansial perusahaan', 'keuangan, anggaran, risiko', 'sw'],
    ['Chief Technology Officer', 'menentukan arah teknologi dan arsitektur perusahaan', 'teknologi, arsitektur, strategi', 'sd'],
    ['Chief Marketing Officer', 'memimpin merek, pertumbuhan, dan strategi pemasaran', 'merek, pertumbuhan, kampanye', 'sw'],
    ['Chief Human Resources Officer', 'memimpin budaya, talenta, dan kebijakan SDM', 'budaya, talenta, kebijakan', 'd'],
    ['Chief Legal Officer', 'mengawasi risiko hukum dan kepatuhan perusahaan', 'hukum, kepatuhan, risiko', 'w'],
    ['Chief Product Officer', 'menentukan visi dan peta jalan produk', 'produk, visi, roadmap', 'd'],
    ['Chief Data Officer', 'memimpin strategi data dan tata kelolanya', 'data, tata kelola, analitik', 'sd'],
    ['Chief Information Security Officer', 'memimpin keamanan informasi dan manajemen risiko siber', 'keamanan, risiko, kebijakan', 'sd'],
    ['Chief Revenue Officer', 'menyelaraskan penjualan, pemasaran, dan layanan untuk pendapatan', 'pendapatan, penjualan, strategi', 'd'],
    ['Konsultan Strategi', 'menganalisis pasar dan merumuskan pilihan strategis', 'strategi, pasar, analisis', 'w'],
    ['Analis Bisnis', 'memetakan masalah bisnis, kebutuhan, dan solusi yang masuk akal', 'analisis, kebutuhan, proses'],
    ['Analis Pengembangan Korporat', 'menilai peluang kemitraan, akuisisi, dan investasi', 'm&a, valuasi, kemitraan', 'sw'],
    ['Sekretaris Perusahaan', 'menjaga tata kelola, rapat direksi, dan korespondensi resmi', 'tata kelola, notulen, korespondensi'],
    ['Kepala PMO', 'memantau seluruh program dan portofolio proyek', 'portofolio, pelaporan, risiko', 'd'],
  ],
  rekayasa: [
    ['Frontend Developer', 'membangun antarmuka web yang cepat dan mudah diakses', 'html, css, javascript, react'],
    ['Backend Developer', 'membangun layanan, API, dan logika server yang andal', 'api, database, node, python'],
    ['Full-stack Developer', 'membangun fitur dari antarmuka sampai server', 'react, node, database, api'],
    ['Mobile Developer', 'membangun aplikasi iOS dan Android', 'ios, android, flutter, react native'],
    ['Game Developer', 'membangun gim dan sistem interaktif', 'unity, c#, gameplay, grafik'],
    ['Embedded Engineer', 'menulis firmware untuk perangkat keras', 'c, mikrokontroler, firmware'],
    ['Software Architect', 'merancang struktur sistem dan keputusan teknis jangka panjang', 'arsitektur, desain sistem, trade-off', 'kd'],
    ['QA Engineer', 'memeriksa bug, kasus tepi, dan kualitas sebelum rilis', 'review, testing, kualitas', 'sr'],
    ['Test Automation Engineer', 'menulis tes otomatis dan kerangka pengujiannya', 'otomasi, testing, ci'],
    ['Code Reviewer', 'meninjau kode dari sisi benar, aman, dan mudah dirawat', 'review, keamanan, keterbacaan', 'sr'],
    ['Integration Engineer', 'menyambungkan sistem lewat API dan layanan pihak ketiga', 'integrasi, api, webhook'],
    ['Database Developer', 'merancang skema, kueri, dan performa database', 'sql, skema, indeks'],
    ['Performance Engineer', 'mengukur dan mempercepat aplikasi', 'profiling, optimasi, beban'],
    ['Blockchain Developer', 'membangun kontrak pintar dan aplikasi terdesentralisasi', 'solidity, web3, kontrak pintar'],
    ['AR/VR Developer', 'membangun pengalaman realitas tertambah dan virtual', 'unity, 3d, xr'],
    ['Technical Writer', 'menulis dokumentasi teknis dan panduan pengguna', 'dokumentasi, panduan, api docs', 'k'],
    ['Release Manager', 'mengatur jadwal dan kesiapan rilis', 'rilis, koordinasi, risiko', 'd'],
  ],
  data: [
    ['Data Analyst', 'menjawab pertanyaan bisnis dari data lewat analisis dan laporan', 'sql, analisis, visualisasi'],
    ['Data Scientist', 'membangun model dan eksperimen untuk memecahkan masalah', 'statistik, python, model'],
    ['Machine Learning Engineer', 'melatih dan menerapkan model ke produksi', 'ml, python, deployment'],
    ['Data Engineer', 'membangun pipeline data yang andal', 'etl, pipeline, sql, warehouse'],
    ['BI Developer', 'membuat dasbor dan model data untuk pengambilan keputusan', 'bi, dasbor, pemodelan'],
    ['Analytics Engineer', 'merapikan model data agar siap dianalisis', 'dbt, sql, pemodelan'],
    ['Statistician', 'merancang studi dan menguji hipotesis dengan benar', 'statistik, eksperimen, inferensi', 'sw'],
    ['NLP Engineer', 'membangun sistem pemrosesan bahasa alami', 'nlp, bahasa, model'],
    ['Computer Vision Engineer', 'membangun sistem pengenalan gambar dan video', 'visi komputer, model'],
    ['AI Prompt Engineer', 'merancang dan menguji prompt serta alur kerja LLM', 'prompt, llm, evaluasi', 'sw'],
    ['MLOps Engineer', 'mengotomasi pelatihan, rilis, dan pemantauan model', 'mlops, ci, monitoring'],
    ['Quantitative Analyst', 'membangun model kuantitatif untuk keuangan dan risiko', 'kuantitatif, model, risiko', 'sw'],
    ['Data Governance Specialist', 'menjaga kualitas, kepemilikan, dan kepatuhan data', 'tata kelola, kualitas data, privasi', 's'],
    ['AI Ethics Specialist', 'menilai bias, keamanan, dan dampak sistem AI', 'etika, bias, evaluasi', 'sw'],
  ],
  infra: [
    ['DevOps Engineer', 'mengotomasi build, rilis, dan infrastruktur', 'ci/cd, docker, otomasi', 'k'],
    ['Site Reliability Engineer', 'menjaga layanan tetap andal dan terukur', 'sre, monitoring, insiden', 'k'],
    ['Cloud Architect', 'merancang arsitektur cloud yang aman dan hemat', 'aws, gcp, azure, arsitektur', 'd'],
    ['Cloud Engineer', 'membangun dan merawat sumber daya cloud', 'cloud, terraform, jaringan', 'k'],
    ['Network Engineer', 'merancang dan merawat jaringan', 'jaringan, routing, firewall'],
    ['System Administrator', 'merawat server dan sistem internal', 'linux, windows, server'],
    ['Security Engineer', 'membangun kontrol keamanan pada sistem dan kode', 'keamanan, hardening, deteksi', 'sr'],
    ['Penetration Tester', 'menguji keamanan sistem milik sendiri secara terotorisasi', 'pentest, kerentanan, laporan', 'sr'],
    ['SOC Analyst', 'memantau dan menyelidiki peringatan keamanan', 'soc, log, insiden'],
    ['Incident Responder', 'menangani insiden keamanan dari deteksi sampai pemulihan', 'insiden, forensik, pemulihan'],
    ['Security Auditor', 'memeriksa kepatuhan dan celah kontrol keamanan', 'audit, kontrol, kepatuhan', 'sr'],
    ['IT Support Specialist', 'membantu pengguna menyelesaikan masalah perangkat dan akun', 'dukungan, perangkat, akun', 't'],
    ['Platform Engineer', 'membangun platform internal untuk tim pengembang', 'platform, tooling, otomasi', 'k'],
    ['FinOps Analyst', 'mengendalikan biaya cloud', 'biaya, cloud, optimasi', 'sw'],
    ['Database Administrator', 'merawat, mencadangkan, dan menyetel database', 'dba, backup, performa'],
    ['IT Manager', 'mengelola layanan TI dan timnya', 'layanan ti, anggaran, vendor', 'td'],
  ],
  produk: [
    ['Product Manager', 'menentukan masalah yang diselesaikan dan prioritas produk', 'produk, prioritas, strategi', 'd'],
    ['Product Owner', 'mengelola backlog dan kebutuhan tim pengembang', 'backlog, user story, prioritas', 'd'],
    ['Technical Product Manager', 'menjembatani kebutuhan bisnis dan batasan teknis', 'teknis, api, produk', 'd'],
    ['Project Manager', 'merencanakan jadwal, sumber daya, dan risiko proyek', 'jadwal, risiko, koordinasi', 'd'],
    ['Program Manager', 'mengoordinasikan beberapa proyek yang saling bergantung', 'program, dependensi, pelaporan', 'd'],
    ['Scrum Master', 'memfasilitasi tim agar proses agile berjalan sehat', 'agile, scrum, fasilitasi', 'd'],
    ['Product Analyst', 'mengukur penggunaan produk dan menemukan peluang', 'metrik, funnel, eksperimen', 's'],
    ['Business Requirements Analyst', 'menggali dan mendokumentasikan kebutuhan pengguna', 'kebutuhan, dokumentasi, wawancara'],
    ['Growth Product Manager', 'menjalankan eksperimen untuk menumbuhkan pengguna', 'growth, eksperimen, metrik', 'd'],
    ['Delivery Manager', 'memastikan hasil kerja sampai ke pelanggan tepat waktu', 'pengiriman, jadwal, kualitas', 'd'],
    ['Roadmap Strategist', 'menyusun peta jalan produk jangka menengah', 'roadmap, strategi, prioritas', 'w'],
  ],
  desain: [
    ['UX Designer', 'merancang alur dan pengalaman pengguna yang jelas', 'ux, alur, wireframe'],
    ['UI Designer', 'merancang tampilan antarmuka yang rapi dan konsisten', 'ui, tipografi, komponen'],
    ['Product Designer', 'menggabungkan riset, alur, dan visual untuk produk digital', 'produk, prototipe, sistem desain'],
    ['UX Researcher', 'meneliti kebutuhan dan perilaku pengguna', 'riset, wawancara, usability', 'w'],
    ['Graphic Designer', 'membuat materi visual untuk cetak dan digital', 'grafis, tata letak, tipografi'],
    ['Brand Designer', 'membangun identitas visual merek', 'merek, logo, panduan gaya'],
    ['Motion Designer', 'membuat animasi dan gerak antarmuka', 'animasi, motion, video', 'k'],
    ['Illustrator', 'membuat ilustrasi dengan gaya yang konsisten', 'ilustrasi, gaya, komposisi'],
    ['3D Artist', 'membuat model dan adegan tiga dimensi', '3d, modeling, tekstur'],
    ['Art Director', 'mengarahkan gaya visual sebuah proyek', 'arahan seni, konsep, kurasi', 'd'],
    ['Creative Director', 'memimpin konsep kreatif lintas media', 'konsep, kampanye, kreatif', 'd'],
    ['Design System Engineer', 'membangun komponen dan token sistem desain', 'komponen, token, css', 'k'],
    ['UX Writer', 'menulis teks antarmuka yang singkat dan jelas', 'microcopy, ux writing, nada'],
    ['Video Editor', 'menyusun naskah penyuntingan dan alur video', 'video, penyuntingan, narasi'],
    ['Game Designer', 'merancang mekanik dan keseimbangan gim', 'gameplay, level, keseimbangan'],
    ['Interior Designer', 'merancang tata ruang dan suasana interior', 'interior, tata ruang, material'],
    ['Sound Designer', 'merancang efek suara dan atmosfer audio', 'audio, efek, atmosfer'],
  ],
  marketing: [
    ['Content Writer', 'menulis artikel dan konten yang berguna dan mudah dibaca', 'artikel, blog, riset', 'w'],
    ['Copywriter', 'menulis teks iklan dan halaman yang meyakinkan', 'copywriting, iklan, headline'],
    ['SEO Specialist', 'meningkatkan kehadiran di mesin pencari', 'seo, kata kunci, audit', 'w'],
    ['Paid Ads Specialist', 'mengelola dan mengoptimalkan iklan berbayar', 'sem, iklan, anggaran', 'w'],
    ['Social Media Manager', 'merencanakan dan menulis konten media sosial', 'sosial media, kalender, komunitas', 'w'],
    ['Community Manager', 'membangun dan merawat komunitas', 'komunitas, moderasi, keterlibatan'],
    ['Email Marketing Specialist', 'merancang kampanye email dan alurnya', 'email, segmentasi, otomasi'],
    ['Marketing Analyst', 'mengukur kinerja kampanye dan sumber pertumbuhan', 'metrik, atribusi, analisis', 'sw'],
    ['Brand Strategist', 'merumuskan posisi dan pesan merek', 'merek, posisi, pesan', 'w'],
    ['PR Specialist', 'mengelola hubungan dengan media dan siaran pers', 'humas, siaran pers, media', 'w'],
    ['Influencer Marketing Manager', 'merencanakan kerja sama dengan kreator', 'kreator, kemitraan, kampanye', 'w'],
    ['Growth Marketer', 'menjalankan eksperimen pertumbuhan lintas kanal', 'growth, eksperimen, funnel', 'w'],
    ['Product Marketing Manager', 'merumuskan pesan dan peluncuran produk', 'peluncuran, pesan, pasar', 'w'],
    ['Marketing Automation Specialist', 'membangun alur otomasi pemasaran', 'otomasi, crm, alur'],
    ['Event Marketer', 'merencanakan acara dan aktivasi merek', 'acara, aktivasi, logistik'],
    ['Market Research Analyst', 'meneliti pasar, pesaing, dan pelanggan', 'riset pasar, pesaing, survei', 'sw'],
    ['Video Scriptwriter', 'menulis naskah video dan konten audio', 'naskah, video, podcast'],
  ],
  penjualan: [
    ['Sales Development Representative', 'mencari prospek dan menyusun pesan pembuka', 'prospek, outbound, pesan', 'w'],
    ['Account Executive', 'memandu calon pelanggan sampai transaksi', 'penjualan, demo, negosiasi'],
    ['Account Manager', 'merawat dan mengembangkan pelanggan yang sudah ada', 'pelanggan, perpanjangan, upsell'],
    ['Sales Engineer', 'menjelaskan solusi teknis kepada calon pelanggan', 'demo, teknis, solusi', 's'],
    ['Business Development Manager', 'mencari peluang pasar dan mitra baru', 'peluang, kemitraan, negosiasi', 'wd'],
    ['Partnerships Manager', 'membangun dan mengelola kemitraan strategis', 'kemitraan, aliansi, kesepakatan', 'wd'],
    ['Sales Operations Analyst', 'menjaga proses, data, dan laporan penjualan', 'crm, laporan, proses', 's'],
    ['Proposal Writer', 'menulis proposal dan jawaban tender', 'proposal, rfp, tender'],
    ['Pricing Analyst', 'menganalisis harga dan paket', 'harga, margin, analisis', 'sw'],
    ['Customer Success Manager', 'memastikan pelanggan mendapat nilai dari produk', 'onboarding, kesehatan akun, retensi', 'd'],
    ['E-commerce Manager', 'mengelola toko daring dan katalognya', 'marketplace, katalog, konversi', 'w'],
    ['Export Specialist', 'menangani ekspor, dokumen, dan regulasi perdagangan', 'ekspor, dokumen, perdagangan', 'w'],
  ],
  cs: [
    ['Customer Support Agent', 'menjawab pertanyaan pelanggan dengan ramah dan tepat', 'dukungan, empati, solusi'],
    ['Technical Support Engineer', 'menyelesaikan masalah teknis pelanggan', 'troubleshooting, log, produk', 's'],
    ['Support Team Lead', 'mengarahkan tim dukungan dan kualitas jawabannya', 'kualitas, pelatihan, antrean', 'd'],
    ['Customer Experience Analyst', 'menganalisis keluhan dan kepuasan pelanggan', 'csat, keluhan, analisis', 's'],
    ['Knowledge Base Writer', 'menulis artikel bantuan yang mudah diikuti', 'bantuan, panduan, faq', 'k'],
    ['Complaint Handler', 'menangani keluhan sulit sampai tuntas', 'keluhan, eskalasi, kompensasi'],
    ['Onboarding Specialist', 'memandu pelanggan baru sampai berhasil memakai produk', 'onboarding, panduan, pelatihan'],
    ['Support Quality Reviewer', 'menilai mutu jawaban tim dukungan', 'kualitas, penilaian, umpan balik', 'r'],
    ['Call Center Trainer', 'melatih agen menghadapi berbagai situasi', 'pelatihan, skrip, simulasi'],
  ],
  keuangan: [
    ['Akuntan', 'mencatat transaksi dan menyusun laporan keuangan', 'akuntansi, jurnal, laporan'],
    ['Bookkeeper', 'menjaga pembukuan harian tetap rapi', 'pembukuan, rekonsiliasi, bukti'],
    ['Financial Analyst', 'menganalisis kinerja dan membuat proyeksi', 'analisis, model, proyeksi', 'w'],
    ['FP&A Analyst', 'menyusun anggaran dan analisis varians', 'anggaran, varians, forecast'],
    ['Spesialis Pajak', 'menghitung dan merencanakan kewajiban pajak', 'pajak, kepatuhan, perencanaan', 'w'],
    ['Auditor Internal', 'menilai kontrol dan kepatuhan proses keuangan', 'audit, kontrol, temuan', 'r'],
    ['Auditor Eksternal', 'memeriksa kewajaran laporan keuangan', 'audit, standar, bukti', 'r'],
    ['Treasury Analyst', 'mengelola kas, likuiditas, dan pendanaan', 'kas, likuiditas, valuta'],
    ['Credit Analyst', 'menilai kelayakan kredit', 'kredit, risiko, rasio', 'w'],
    ['Analis Riset Investasi', 'meneliti perusahaan dan sektor secara mendalam', 'valuasi, sektor, riset', 'w'],
    ['Risk Analyst', 'mengidentifikasi dan menilai risiko keuangan', 'risiko, skenario, mitigasi'],
    ['Payroll Specialist', 'menghitung gaji dan potongannya', 'gaji, tunjangan, pajak'],
    ['Spesialis Piutang dan Utang', 'mengelola tagihan masuk dan keluar', 'piutang, utang, penagihan'],
    ['Cost Accountant', 'menghitung dan menganalisis biaya produksi', 'biaya, hpp, standar'],
    ['Financial Controller', 'mengawasi akuntansi dan penutupan buku', 'penutupan, kontrol, pelaporan', 'd'],
    ['Fraud Analyst', 'mendeteksi pola kecurangan', 'kecurangan, anomali, investigasi'],
    ['Analis Pelaporan ESG', 'menyusun laporan keberlanjutan', 'esg, pelaporan, standar', 'w'],
    ['Actuarial Analyst', 'memodelkan risiko dan kewajiban asuransi', 'aktuaria, model, risiko'],
  ],
  hukum: [
    ['Corporate Counsel', 'menelaah isu hukum perusahaan sehari-hari', 'hukum perusahaan, kontrak, risiko', 'w'],
    ['Contract Specialist', 'menyusun dan menelaah kontrak', 'kontrak, klausul, negosiasi'],
    ['Compliance Officer', 'memastikan perusahaan patuh pada aturan', 'kepatuhan, kebijakan, audit', 'w'],
    ['Data Protection Officer', 'menjaga kepatuhan pelindungan data pribadi', 'privasi, uu pdp, dpia', 'w'],
    ['Paralegal', 'menyiapkan dokumen dan riset hukum pendukung', 'dokumen, riset, administrasi', 'w'],
    ['Legal Researcher', 'meneliti peraturan dan putusan terkait', 'peraturan, putusan, riset', 'w'],
    ['Regulatory Affairs Specialist', 'memantau dan menerjemahkan regulasi menjadi tindakan', 'regulasi, izin, pemantauan', 'w'],
    ['Policy Analyst', 'menganalisis kebijakan dan dampaknya', 'kebijakan, dampak, rekomendasi', 'w'],
    ['Ethics and Risk Officer', 'menjaga etika dan memantau risiko perilaku', 'etika, risiko, pelaporan'],
    ['Legal Drafter', 'menyusun dokumen hukum dengan bahasa yang tepat', 'penyusunan, bahasa hukum, templat'],
    ['IP Specialist', 'mengelola merek, hak cipta, dan paten', 'hki, merek, paten', 'w'],
  ],
  sdm: [
    ['HR Generalist', 'menangani urusan SDM sehari-hari', 'sdm, administrasi, kebijakan'],
    ['Recruiter', 'mencari dan menyaring kandidat', 'rekrutmen, sourcing, seleksi', 'w'],
    ['Technical Recruiter', 'merekrut talenta teknis', 'rekrutmen teknis, sourcing, penilaian', 'w'],
    ['HR Business Partner', 'menjadi mitra strategis pimpinan dalam urusan orang', 'mitra bisnis, organisasi, talenta', 'd'],
    ['Learning and Development Specialist', 'merancang program belajar karyawan', 'pelatihan, kompetensi, kurikulum'],
    ['Compensation and Benefits Analyst', 'merancang struktur gaji dan tunjangan', 'kompensasi, benchmark, tunjangan', 'w'],
    ['People Analytics Specialist', 'menganalisis data karyawan untuk keputusan SDM', 'analitik sdm, retensi, survei', 's'],
    ['Employee Relations Specialist', 'menangani hubungan dan perselisihan kerja', 'hubungan kerja, mediasi, kebijakan'],
    ['Onboarding Coordinator', 'memandu karyawan baru di minggu pertama', 'onboarding, orientasi, checklist'],
    ['Organizational Development Specialist', 'merancang struktur dan perubahan organisasi', 'organisasi, perubahan, budaya', 'd'],
    ['DEI Specialist', 'membangun kebijakan inklusi dan kesetaraan', 'inklusi, kebijakan, program'],
    ['Career Coach', 'mendampingi karyawan merencanakan karier', 'karier, umpan balik, coaching'],
    ['Interview Panelist', 'menilai kandidat dari jawaban wawancara', 'wawancara, penilaian, rubrik', 'r'],
  ],
  operasi: [
    ['Operations Manager', 'mengelola operasi dan memperbaiki prosesnya', 'operasi, proses, kinerja', 'd'],
    ['Supply Chain Planner', 'merencanakan pasokan dan permintaan', 'perencanaan, pasokan, permintaan'],
    ['Logistics Coordinator', 'mengatur pengiriman dan pergerakan barang', 'logistik, pengiriman, jadwal'],
    ['Procurement Specialist', 'mengelola pengadaan dan pemasok', 'pengadaan, negosiasi, pemasok', 'w'],
    ['Inventory Analyst', 'menjaga akurasi dan level persediaan', 'persediaan, stok, analisis'],
    ['Demand Forecaster', 'memprediksi permintaan', 'peramalan, tren, statistik', 'sw'],
    ['Quality Control Inspector', 'memeriksa mutu produk dan proses', 'mutu, inspeksi, standar', 'r'],
    ['Process Improvement Specialist', 'menyederhanakan proses dengan lean dan six sigma', 'lean, six sigma, proses'],
    ['Facilities Manager', 'mengelola gedung, fasilitas, dan perawatannya', 'fasilitas, perawatan, vendor'],
    ['Vendor Manager', 'menilai dan mengelola kinerja vendor', 'vendor, kontrak, sla'],
    ['Business Continuity Planner', 'menyiapkan rencana kelangsungan usaha', 'kontinuitas, risiko, simulasi'],
    ['Trade Compliance Specialist', 'menangani kepabeanan dan aturan perdagangan', 'bea cukai, perdagangan, dokumen', 'w'],
  ],
  riset: [
    ['Research Scientist', 'merancang dan menjalankan penelitian orisinal', 'penelitian, metode, analisis', 'w'],
    ['Literature Reviewer', 'merangkum dan membandingkan literatur ilmiah', 'tinjauan pustaka, jurnal, sintesis', 'w'],
    ['Bioinformatician', 'menganalisis data biologi dengan komputasi', 'genomik, bioinformatika, python', 'kw'],
    ['Chemist', 'meneliti dan merancang eksperimen kimia', 'kimia, senyawa, eksperimen', 'w'],
    ['Physicist', 'memodelkan dan menganalisis fenomena fisika', 'fisika, model, simulasi', 'w'],
    ['Mathematician', 'membuktikan dan memodelkan masalah matematis', 'matematika, bukti, model'],
    ['Economist', 'menganalisis perilaku ekonomi dan kebijakan', 'ekonomi, ekonometrika, kebijakan', 'sw'],
    ['Sociologist', 'meneliti perilaku dan struktur masyarakat', 'sosiologi, survei, kualitatif', 'w'],
    ['Psychologist Researcher', 'merancang studi perilaku dan kognisi', 'psikologi, eksperimen, instrumen', 'w'],
    ['Linguist', 'menganalisis bahasa dan strukturnya', 'linguistik, korpus, bahasa'],
    ['Historian', 'menelusuri sumber dan menyusun narasi sejarah', 'sejarah, arsip, sumber', 'w'],
    ['Environmental Scientist', 'meneliti ekosistem dan dampak lingkungan', 'lingkungan, ekologi, data', 'w'],
    ['GIS Analyst', 'menganalisis data peta dan lokasi', 'gis, spasial, peta', 'k'],
    ['Science Communicator', 'menjelaskan sains rumit dengan bahasa sederhana', 'komunikasi sains, penjelasan', 'w'],
    ['Peer Reviewer', 'menilai kualitas dan kesahihan makalah penelitian', 'telaah sejawat, metode, kritik', 'r'],
    ['Grant Writer', 'menulis proposal pendanaan penelitian', 'proposal, hibah, anggaran', 'w'],
    ['Lab Protocol Writer', 'menyusun prosedur laboratorium yang jelas', 'protokol, prosedur, keselamatan'],
  ],
  pendidikan: [
    ['Curriculum Designer', 'merancang kurikulum dan capaian belajar', 'kurikulum, capaian, silabus'],
    ['Guru Matematika', 'mengajar matematika dengan contoh bertahap', 'matematika, soal, penjelasan'],
    ['Guru IPA', 'mengajar sains dengan percobaan sederhana', 'fisika, kimia, biologi'],
    ['Guru Bahasa Inggris', 'mengajar bahasa Inggris untuk berbagai tingkat', 'inggris, tata bahasa, percakapan'],
    ['Guru Bahasa Indonesia', 'mengajar menulis dan membaca yang baik', 'bahasa indonesia, menulis, ejaan'],
    ['Programming Mentor', 'membimbing orang belajar pemrograman', 'pemrograman, latihan, review', 'k'],
    ['Instructional Designer', 'merancang materi dan aktivitas belajar yang efektif', 'desain instruksional, modul, evaluasi'],
    ['Corporate Trainer', 'melatih karyawan pada keterampilan kerja', 'pelatihan, fasilitasi, materi'],
    ['Exam Writer', 'menyusun soal dan rubrik penilaian', 'soal, rubrik, tingkat kesulitan'],
    ['Academic Advisor', 'mendampingi pelajar memilih jalur belajar', 'bimbingan, jurusan, rencana studi', 'w'],
    ['Assessment Reviewer', 'menilai jawaban dan memberi umpan balik', 'penilaian, umpan balik, rubrik', 'r'],
    ['Study Coach', 'membantu menyusun kebiasaan dan jadwal belajar', 'belajar, jadwal, motivasi'],
    ['Educational Content Writer', 'menulis materi belajar yang menarik', 'materi, modul, kuis'],
  ],
  media: [
    ['Journalist', 'meliput, mewawancarai, dan menulis berita yang akurat', 'berita, wawancara, verifikasi', 'w'],
    ['Editor', 'menyunting naskah agar jelas, akurat, dan konsisten', 'penyuntingan, gaya, struktur', 'r'],
    ['Fact-checker', 'memeriksa klaim terhadap sumber tepercaya', 'verifikasi, sumber, klaim', 'wr'],
    ['Translator Inggris-Indonesia', 'menerjemahkan dengan menjaga makna dan nada', 'terjemahan, inggris, indonesia'],
    ['Technical Translator', 'menerjemahkan dokumen teknis dengan istilah tepat', 'istilah, teknis, glosarium'],
    ['Proofreader', 'memeriksa ejaan, tanda baca, dan kekonsistenan', 'ejaan, tata bahasa, ppi'],
    ['Copy Editor', 'merapikan gaya dan alur tulisan', 'gaya, alur, ringkas', 'r'],
    ['Scriptwriter', 'menulis naskah film, video, dan podcast', 'naskah, dialog, struktur'],
    ['Speechwriter', 'menulis pidato yang jelas dan berkesan', 'pidato, retorika, pesan'],
    ['Media Monitoring Analyst', 'memantau dan merangkum pemberitaan', 'pemantauan media, ringkasan, sentimen', 'sw'],
    ['Documentary Researcher', 'mencari bahan dan sumber untuk dokumenter', 'riset, arsip, sumber', 'w'],
    ['Librarian', 'menelusuri dan menata informasi dan referensi', 'pustaka, referensi, katalog', 'w'],
    ['Subtitler', 'menulis dan menyinkronkan subtitel', 'subtitel, sinkronisasi, bahasa'],
  ],
  kesehatan: [
    ['Health Information Specialist', 'menjelaskan topik kesehatan dari sumber tepercaya', 'edukasi kesehatan, sumber', 'w'],
    ['Medical Writer', 'menulis materi medis untuk khalayak yang tepat', 'penulisan medis, regulasi, referensi', 'w'],
    ['Nutrition Educator', 'memberi edukasi gizi dan pola makan umum', 'gizi, menu, edukasi', 'w'],
    ['Fitness Program Planner', 'menyusun rencana latihan umum yang aman', 'latihan, program, pemulihan'],
    ['Mental Wellness Educator', 'memberi edukasi kesejahteraan mental umum', 'kesejahteraan, stres, kebiasaan'],
    ['Public Health Analyst', 'menganalisis data dan kebijakan kesehatan masyarakat', 'epidemiologi, kebijakan, data', 'sw'],
    ['Clinical Research Coordinator', 'mengoordinasikan administrasi uji klinis', 'uji klinis, protokol, kepatuhan', 's'],
    ['Health Policy Analyst', 'menganalisis sistem dan kebijakan kesehatan', 'kebijakan, pembiayaan, mutu', 'w'],
    ['Occupational Safety Officer', 'menjaga keselamatan dan kesehatan kerja', 'k3, risiko, inspeksi', 's'],
    ['Wellness Program Coordinator', 'merancang program kesejahteraan karyawan', 'program, kegiatan, partisipasi'],
  ],
  teknik: [
    ['Civil Engineer', 'merancang dan menghitung struktur dan infrastruktur sipil', 'sipil, struktur, standar'],
    ['Mechanical Engineer', 'merancang sistem dan komponen mekanik', 'mesin, desain, analisis'],
    ['Electrical Engineer', 'merancang sistem kelistrikan dan kendali', 'listrik, rangkaian, daya'],
    ['Chemical Engineer', 'merancang proses dan neraca kimia', 'proses kimia, neraca, reaktor'],
    ['Industrial Engineer', 'meningkatkan efisiensi sistem produksi', 'industri, efisiensi, tata letak'],
    ['Architect', 'merancang bangunan dan ruang yang fungsional', 'arsitektur, denah, ruang'],
    ['Structural Engineer', 'menghitung kekuatan dan keamanan struktur', 'struktur, beban, standar'],
    ['Quantity Surveyor', 'menghitung volume pekerjaan dan anggaran biaya', 'rab, volume, harga satuan'],
    ['Project Estimator', 'memperkirakan biaya dan durasi proyek', 'estimasi, biaya, jadwal'],
    ['Manufacturing Process Engineer', 'merancang dan menyetel proses produksi', 'proses, produksi, mutu'],
    ['BIM Specialist', 'mengelola model informasi bangunan', 'bim, cad, koordinasi', 'k'],
    ['Safety Engineer', 'menilai bahaya dan merancang pengendaliannya', 'k3, bahaya, kontrol'],
    ['Maintenance Planner', 'merencanakan perawatan peralatan', 'perawatan, jadwal, suku cadang'],
    ['Production Planner', 'menjadwalkan produksi dan kapasitas', 'produksi, jadwal, kapasitas'],
    ['Quality Engineer', 'membangun sistem mutu dan menganalisis cacat', 'mutu, cacat, spc', 'r'],
    ['Urban Planner', 'merancang tata kota dan penggunaan lahan', 'tata kota, lahan, mobilitas', 'w'],
  ],
  properti: [
    ['Property Analyst', 'menganalisis nilai dan peluang properti', 'properti, valuasi, pasar', 'w'],
    ['Real Estate Assistant', 'membantu pencarian dan penawaran properti', 'properti, listing, negosiasi', 'w'],
    ['Property Manager', 'mengelola operasi dan penyewa properti', 'sewa, perawatan, penyewa'],
    ['Hotel Operations Manager', 'mengelola operasi harian hotel', 'perhotelan, layanan, operasi', 'd'],
    ['Event Planner', 'merencanakan acara dari konsep sampai pelaksanaan', 'acara, anggaran, vendor', 'w'],
    ['Travel Planner', 'menyusun rencana perjalanan dan itinerari', 'perjalanan, itinerari, anggaran', 'w'],
    ['Restaurant Operations Manager', 'mengelola operasi restoran dan stafnya', 'restoran, jadwal, biaya', 'd'],
    ['Recipe Developer', 'mengembangkan resep dan menu', 'resep, menu, bahan'],
    ['Retail Merchandiser', 'menata produk dan promosi di toko', 'merchandising, tata letak, promosi'],
    ['Category Manager', 'mengelola kategori produk dan marginnya', 'kategori, margin, pemasok', 'w'],
    ['Store Operations Manager', 'mengelola operasional toko', 'toko, staf, persediaan', 'd'],
    ['Concierge', 'membantu tamu dengan permintaan dan rekomendasi', 'layanan tamu, rekomendasi, reservasi', 'w'],
    ['Tourism Analyst', 'menganalisis tren pariwisata', 'pariwisata, tren, destinasi', 'w'],
  ],
  admin: [
    ['Executive Assistant', 'mengelola jadwal, korespondensi, dan urusan pimpinan', 'jadwal, korespondensi, prioritas'],
    ['Office Administrator', 'menjaga administrasi kantor berjalan rapi', 'administrasi, arsip, pengadaan'],
    ['Receptionist', 'menyambut tamu dan mengarahkan pertanyaan', 'resepsionis, tamu, informasi'],
    ['Data Entry Clerk', 'memasukkan dan merapikan data dengan akurat', 'entri data, validasi, spreadsheet'],
    ['Document Controller', 'mengelola versi dan arsip dokumen', 'dokumen, versi, arsip'],
    ['Notulis Rapat', 'mencatat dan merangkum rapat beserta tindak lanjutnya', 'notulen, tindak lanjut, ringkasan'],
    ['Travel Coordinator', 'mengatur perjalanan dinas dan akomodasi', 'perjalanan dinas, jadwal, anggaran', 'w'],
    ['Calendar Manager', 'mengatur jadwal dan menghindari bentrok', 'kalender, prioritas, pengingat'],
    ['Archivist', 'menata dan menelusuri arsip', 'arsip, klasifikasi, pencarian'],
    ['Inbox Triage Assistant', 'memilah dan merangkum surel masuk', 'surel, prioritas, ringkasan'],
    ['Personal Researcher', 'mencari informasi untuk keputusan sehari-hari', 'pencarian, perbandingan, rekomendasi', 'w'],
  ],
  polkam: [
    ['Policy Analyst Publik', 'menganalisis kebijakan publik dan dampaknya', 'kebijakan publik, dampak, opsi', 'w'],
    ['Political Analyst', 'membaca dinamika politik dari sumber terbuka', 'politik, aktor, tren', 'w'],
    ['International Relations Analyst', 'menganalisis hubungan dan kebijakan luar negeri', 'hubungan internasional, diplomasi', 'w'],
    ['Security Analyst', 'menganalisis isu keamanan dari sumber terbuka', 'keamanan, ancaman, analisis', 'w'],
    ['OSINT Analyst', 'mengumpulkan dan memverifikasi informasi sumber terbuka', 'osint, verifikasi, sumber', 'w'],
    ['Legislative Drafter', 'menyusun naskah peraturan yang rapi', 'peraturan, naskah, harmonisasi', 'w'],
    ['Public Administration Specialist', 'menganalisis tata kelola dan layanan publik', 'administrasi publik, layanan, tata kelola', 'w'],
    ['Election and Opinion Analyst', 'menganalisis survei dan data pemilu', 'survei, pemilu, statistik', 'sw'],
    ['Government Relations Manager', 'mengelola hubungan dengan pemerintah dan regulator', 'pemerintah, advokasi, regulator', 'wd'],
    ['Crisis Communications Specialist', 'menyiapkan komunikasi saat krisis', 'krisis, pesan, juru bicara', 'w'],
    ['Public Budget Analyst', 'menganalisis anggaran dan belanja publik', 'apbn, anggaran, belanja', 'sw'],
    ['Development Planner', 'menyusun rencana pembangunan daerah', 'perencanaan, daerah, indikator', 'w'],
    ['Pemantau Berita Polkam', 'merangkum berita menonjol bidang politik, hukum, dan keamanan', 'berita, ringkasan, pemantauan', 'sw'],
  ],
  lingkungan: [
    ['Agronomist', 'menganalisis budidaya tanaman dan tanah', 'agronomi, tanah, tanaman', 'w'],
    ['Agribusiness Analyst', 'menganalisis rantai nilai dan pasar pertanian', 'agribisnis, rantai nilai, harga', 'w'],
    ['Environmental Consultant', 'menilai dampak lingkungan dan kepatuhannya', 'amdal, lingkungan, kepatuhan', 'w'],
    ['Sustainability Manager', 'memimpin program keberlanjutan perusahaan', 'keberlanjutan, target, pelaporan', 'wd'],
    ['Energy Analyst', 'menganalisis konsumsi dan biaya energi', 'energi, efisiensi, tarif', 'sw'],
    ['Renewable Energy Engineer', 'merancang sistem energi terbarukan', 'surya, angin, desain', 'w'],
    ['Climate Analyst', 'menganalisis data dan risiko iklim', 'iklim, risiko, skenario', 'sw'],
    ['Water Resource Planner', 'merencanakan pengelolaan sumber daya air', 'air, daerah aliran, perencanaan', 'w'],
    ['Forestry Specialist', 'mengelola dan menganalisis hutan', 'kehutanan, konservasi, data', 'w'],
    ['Waste Management Planner', 'merancang sistem pengelolaan sampah', 'sampah, daur ulang, logistik', 'w'],
    ['Fisheries Analyst', 'menganalisis perikanan dan kelautan', 'perikanan, kelautan, stok', 'w'],
    ['Food Technologist', 'mengembangkan dan menguji produk pangan', 'pangan, formulasi, keamanan', 'w'],
  ],
  seni: [
    ['Novelist', 'menulis fiksi panjang dengan karakter dan alur kuat', 'fiksi, karakter, alur'],
    ['Screenwriter', 'menulis skenario film dan serial', 'skenario, struktur, dialog'],
    ['Songwriter', 'menulis lirik dan kerangka lagu', 'lirik, melodi, tema'],
    ['Game Narrative Designer', 'merancang cerita dan dialog gim', 'narasi, dialog, dunia'],
    ['Dungeon Master', 'memandu permainan peran dengan cerita yang hidup', 'rpg, cerita, improvisasi'],
    ['Fashion Stylist', 'menyarankan padu padan busana sesuai acara', 'mode, gaya, padu padan', 'w'],
    ['Chef Consultant', 'menyusun menu dan teknik memasak', 'kuliner, menu, teknik', 'w'],
    ['Travel Blogger', 'menulis cerita perjalanan yang menarik', 'perjalanan, cerita, tips', 'w'],
    ['Comedy Writer', 'menulis materi komedi yang segar', 'komedi, materi, ritme'],
    ['Life Coach', 'membantu menyusun tujuan dan kebiasaan harian', 'tujuan, kebiasaan, refleksi'],
    ['Gift Planner', 'menyarankan hadiah yang tepat dan terjangkau', 'hadiah, anggaran, rekomendasi', 'w'],
    ['Music Curator', 'menyusun daftar putar dan rekomendasi musik', 'musik, kurasi, suasana', 'w'],
  ],
};

/* ===================== spesifikasi dan perekrutan ===================== */
export interface RoleSpec {
  key: string; field: string; title: string; desc: string; tags: string[]; access: Access; web: boolean; reviewer: boolean; delegate: boolean; personality: Personality;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const CATALOG: RoleSpec[] = FIELDS.flatMap(f => (RAW[f.id] ?? []).map(([title, desc, tags, flags = '']): RoleSpec => ({
  key: `${f.id}:${slug(title)}`, field: f.id, title, desc, tags: tags.split(',').map(t => t.trim()),
  access: flags.includes('k') ? 'work' : flags.includes('s') ? 'skills' : flags.includes('t') ? 'text' : f.access,
  web: flags.includes('w'), reviewer: flags.includes('r'), delegate: flags.includes('d'), personality: f.personality,
})));

export const fieldOf = (id: string) => FIELDS.find(f => f.id === id)!;
export const levelOf = (id: LevelId) => LEVELS.find(l => l.id === id)!;

/** Nama jabatan menurut tingkat. */
export function titleFor(spec: RoleSpec, level: Level): string {
  const t = spec.title;
  switch (level.id) {
    case 'magang': return `Magang ${t}`;
    case 'junior': return `Junior ${t}`;
    case 'senior': return `Senior ${t}`;
    case 'lead': return `Lead ${t}`;
    case 'manajer': return `Manajer ${t}`;
    case 'direktur': return `Direktur ${fieldOf(spec.field).short}`;
    default: return t;
  }
}

/** Nama jabatan lengkap menurut tingkat, mis. "Senior Frontend Developer". */
export const jobTitle = (spec: RoleSpec, level: Level) => titleFor(spec, level);

/** Seluruh isian karyawan dari satu peran katalog. Murni, tanpa import runtime, supaya dipakai juga oleh server. */
export function fullRole(spec: RoleSpec, levelId: LevelId, o: { id: string; name: string; roomId: string; temp?: boolean }): Role {
  const f = fieldOf(spec.field), lv = levelOf(levelId);
  const leader = lv.id === 'manajer' || lv.id === 'direktur' || lv.id === 'lead';
  const access: Access = (lv.id === 'manajer' || lv.id === 'direktur') && spec.access === 'work' ? 'skills' : spec.access;
  const title = titleFor(spec, lv);
  const prompt = [
    `Kamu ${title} di bidang ${f.label}. ${lv.text}`,
    lv.id === 'direktur' ? `Kamu memimpin bidang ${f.short}, dengan latar keahlian ${spec.title}.` : '',
    `Tugas utamamu: ${spec.desc}.`,
    'Kerjakan dengan standar profesional bidangmu, nyatakan asumsi yang kamu pakai, dan berikan hasil yang bisa langsung dipakai.',
    f.note ?? '',
    'Jawab dalam bahasa Indonesia.',
  ].filter(Boolean).join(' ');
  return {
    id: o.id, name: o.name, title, roomId: o.roomId, model: lv.model, prompt, tags: spec.tags.slice(0, 8), memory: '',
    personality: leader ? 'rajin' : spec.personality, access, web: spec.web, shell: false, skillMode: 'all', skills: [],
    canDelegate: spec.delegate || leader, reviewer: spec.reviewer, next: 'END', rejectTo: '', temp: !!o.temp,
  };
}

/* ===================== nama acak ===================== */
const FIRST = ['Budi', 'Siti', 'Agus', 'Dewi', 'Rina', 'Andi', 'Wulan', 'Bagas', 'Putri', 'Fajar', 'Nadia', 'Rizky', 'Maya', 'Dimas', 'Lestari', 'Hendra', 'Citra', 'Yoga', 'Ayu', 'Eko', 'Intan', 'Rangga', 'Sekar', 'Tomi', 'Vina', 'Galih', 'Laras', 'Joko', 'Mira', 'Surya', 'Anisa', 'Bayu', 'Clara', 'Dani', 'Elsa', 'Farhan', 'Gita', 'Hadi', 'Indah', 'Kevin', 'Lia', 'Naufal', 'Olivia', 'Prasetyo', 'Qori', 'Reza', 'Salsa', 'Taufik', 'Umar', 'Vero', 'Wahyu', 'Yanti', 'Zaki', 'Aldo', 'Bella', 'Cahyo', 'Dinda', 'Erlangga', 'Feby', 'Gilang'];
const LAST = ['Santoso', 'Wijaya', 'Pratama', 'Lestari', 'Kusuma', 'Hidayat', 'Saputra', 'Nugroho', 'Rahayu', 'Setiawan', 'Maulana', 'Siregar', 'Nasution', 'Gunawan', 'Halim', 'Susanto', 'Permata', 'Wibowo', 'Utami', 'Firmansyah', 'Purnama', 'Ramadhan', 'Simanjuntak', 'Lubis', 'Harahap', 'Anggraini', 'Kurniawan', 'Mahendra', 'Salim', 'Tarigan'];

/** Nama orang acak yang belum dipakai. */
export function randomName(used: Set<string>, rnd: () => number = Math.random): string {
  for (let i = 0; i < 80; i++) {
    const n = `${FIRST[Math.floor(rnd() * FIRST.length)]} ${LAST[Math.floor(rnd() * LAST.length)]}`;
    if (!used.has(n)) return n;
  }
  let k = 2, base = FIRST[Math.floor(rnd() * FIRST.length)];
  while (used.has(`${base} ${k}`)) k++;
  return `${base} ${k}`;
}

/* ===================== tim siap pakai ===================== */
export interface TeamPreset { id: string; name: string; desc: string; level: LevelId; members: string[] }

export const TEAMS: TeamPreset[] = [
  { id: 'produk', name: 'Tim produk digital', desc: 'Dari ide sampai rilis: produk, desain, kode, dan pengujian.', level: 'senior', members: ['Chief of Staff', 'Product Manager', 'UX Designer', 'Frontend Developer', 'Backend Developer', 'QA Engineer'] },
  { id: 'konten', name: 'Tim konten dan pemasaran', desc: 'Riset topik, menulis, menyunting, dan menyebarkan.', level: 'madya', members: ['Chief of Staff', 'Content Writer', 'SEO Specialist', 'Social Media Manager', 'Graphic Designer', 'Copy Editor'] },
  { id: 'riset', name: 'Tim riset', desc: 'Kajian pustaka, analisis data, verifikasi, dan penjelasan sains.', level: 'senior', members: ['Chief of Staff', 'Research Scientist', 'Literature Reviewer', 'Data Analyst', 'Fact-checker', 'Science Communicator'] },
  { id: 'hukum', name: 'Tim hukum dan kepatuhan', desc: 'Kontrak, regulasi, privasi, dan kepatuhan.', level: 'senior', members: ['Chief of Staff', 'Corporate Counsel', 'Contract Specialist', 'Compliance Officer', 'Legal Researcher', 'Data Protection Officer'] },
  { id: 'keuangan', name: 'Tim keuangan', desc: 'Pembukuan, anggaran, pajak, dan audit.', level: 'senior', members: ['Chief of Staff', 'Akuntan', 'FP&A Analyst', 'Spesialis Pajak', 'Auditor Internal', 'Risk Analyst'] },
  { id: 'data', name: 'Tim data dan AI', desc: 'Pipeline, analisis, model, dan dasbor.', level: 'senior', members: ['Chief of Staff', 'Data Engineer', 'Data Analyst', 'Data Scientist', 'Machine Learning Engineer', 'BI Developer'] },
  { id: 'polkam', name: 'Tim analisis polkam', desc: 'Pemantauan berita, analisis kebijakan dan keamanan dari sumber terbuka.', level: 'senior', members: ['Chief of Staff', 'Pemantau Berita Polkam', 'Political Analyst', 'Policy Analyst Publik', 'OSINT Analyst', 'Crisis Communications Specialist'] },
  { id: 'cs', name: 'Tim layanan pelanggan', desc: 'Menjawab, menyelesaikan, menulis bantuan, dan menilai mutu.', level: 'madya', members: ['Chief of Staff', 'Customer Support Agent', 'Technical Support Engineer', 'Support Team Lead', 'Knowledge Base Writer', 'Customer Experience Analyst'] },
  { id: 'startup', name: 'Perusahaan rintisan lengkap', desc: 'Satu orang per fungsi utama, dipimpin Chief of Staff.', level: 'senior', members: ['Chief of Staff', 'Product Manager', 'Full-stack Developer', 'Product Designer', 'Growth Marketer', 'Account Executive', 'Financial Analyst', 'HR Generalist', 'Customer Support Agent'] },
];

export function resolveTeam(team: TeamPreset): RoleSpec[] {
  return team.members.map(m => CATALOG.find(s => s.title === m)).filter((s): s is RoleSpec => !!s);
}
