import { MarqueeDisplayMode, MarqueeTheme, MarqueeSpeed, MarqueeFontSize } from '../types';

export interface HolidayPreset {
  id: string;
  title: string;
  category: 'islam' | 'nasional' | 'sekolah' | 'tahun_baru_agama' | 'motivasi';
  categoryLabel: string;
  icon: string;
  theme: MarqueeTheme;
  displayMode: MarqueeDisplayMode;
  speed: MarqueeSpeed;
  fontSize: MarqueeFontSize;
  badgeText: string;
  badgeIcon: string;
  mainText: string;
  subText?: string;
  description: string;
}

export const HOLIDAY_CATEGORIES = [
  { id: 'all', label: '🌟 Semua Kategori', icon: 'Sparkles' },
  { id: 'islam', label: '🕌 Hari Raya Islam', icon: 'Moon' },
  { id: 'nasional', label: '🇮🇩 Hari Besar Nasional', icon: 'Flag' },
  { id: 'sekolah', label: '📝 Agenda Sekolah & Ujian', icon: 'GraduationCap' },
  { id: 'tahun_baru_agama', label: '🎆 Tahun Baru & Hari Raya', icon: 'Sparkles' },
  { id: 'motivasi', label: '🌟 Motivasi & Disiplin 5S', icon: 'Award' },
] as const;

export const HOLIDAY_GREETINGS_PRESETS: HolidayPreset[] = [
  // --- 1. HARI RAYA & HARI BESAR ISLAM ---
  {
    id: 'idul_fitri',
    title: 'Hari Raya Idul Fitri 1447 H',
    category: 'islam',
    categoryLabel: 'Hari Raya Islam',
    icon: '🕌',
    theme: 'emerald',
    displayMode: 'marquee_scroll',
    speed: 'normal',
    fontSize: 'base',
    badgeText: 'IDUL FITRI 1447 H',
    badgeIcon: '🕌',
    mainText: '✨ SELAMAT HARI RAYA IDUL FITRI 1447 H • TAQOBBALALLAHU MINNA WA MINKUM • MINAL AIDIN WAL FAIDZIN, MOHON MAAF LAHIR DAN BATIN • KELUARGA BESAR SMK EKONOMIKA ✨',
    subText: 'Semoga amal ibadah kita diterima oleh Allah SWT & kembali suci.',
    description: 'Ucapan Idul Fitri bernuansa Islami dengan tema Hijau Zamrud & aksen keemasan.'
  },
  {
    id: 'ramadhan_mubarak',
    title: 'Bulan Suci Ramadhan 1447 H',
    category: 'islam',
    categoryLabel: 'Hari Raya Islam',
    icon: '🌙',
    theme: 'emerald',
    displayMode: 'marquee_scroll',
    speed: 'normal',
    fontSize: 'base',
    badgeText: 'RAMADHAN 1447 H',
    badgeIcon: '🌙',
    mainText: '🌙 MARHABAN YA RAMADHAN 1447 H • SELAMAT MENJALANKAN IBADAH PUASA DENGAN PENUH KEBERKAHAN, KEDISIPLINAN, DAN KETAKWAAN • TETAP SEMANGAT MENUNTUT ILMU 🌙',
    subText: 'Tingkatkan amal ibadah, kedisiplinan shalat, dan ketertiban belajar.',
    description: 'Tema Ramadhan menyejukkan untuk menyemangati siswa & guru berpuasa.'
  },
  {
    id: 'idul_adha',
    title: 'Hari Raya Idul Adha 1447 H',
    category: 'islam',
    categoryLabel: 'Hari Raya Islam',
    icon: '🐑',
    theme: 'emerald',
    displayMode: 'marquee_scroll',
    speed: 'normal',
    fontSize: 'base',
    badgeText: 'IDUL ADHA 1447 H',
    badgeIcon: '🐑',
    mainText: '🕋 SELAMAT HARI RAYA IDUL ADHA 1447 H • MENELADANI KEIKHLASAN DAN PENGORBANAN NABI IBRAHIM AS • TUMBUHKAN JIWA KEPEDULIAN DAN SEMANGAT BERBAGI KEPADA SESAMA 🕋',
    subText: 'Semangat berqurban dan mempererat ukhuwah islamiyah.',
    description: 'Ucapan Hari Raya Qurban dengan pesan keikhlasan & kepedulian sosial.'
  },
  {
    id: 'tahun_baru_hijriyah',
    title: 'Tahun Baru Islam 1 Muharram 1448 H',
    category: 'islam',
    categoryLabel: 'Hari Raya Islam',
    icon: '✨',
    theme: 'gold',
    displayMode: 'marquee_scroll',
    speed: 'normal',
    fontSize: 'base',
    badgeText: '1 MUHARRAM 1448 H',
    badgeIcon: '✨',
    mainText: '🌟 SELAMAT TAHUN BARU ISLAM 1 MUHARRAM 1448 H • MOMENTUM HIJRAH MENUJU PRIBADI YANG LEBIH DISIPLIN, BERILMU, DAN BERAKHLAKUL KARIMAH 🌟',
    subText: 'Awali tahun baru dengan tekad belajar dan beribadah lebih baik.',
    description: 'Pesan hijrah dan resolusi kedisiplinan awal tahun hijriyah.'
  },
  {
    id: 'maulid_nabi',
    title: 'Maulid Nabi Muhammad SAW',
    category: 'islam',
    categoryLabel: 'Hari Raya Islam',
    icon: '📜',
    theme: 'emerald',
    displayMode: 'marquee_scroll',
    speed: 'normal',
    fontSize: 'base',
    badgeText: 'MAULID NABI SAW',
    badgeIcon: '📜',
    mainText: '🌸 SELAMAT MEMPERINGATI MAULID NABI MUHAMMAD SAW 12 RABIUL AWAL • TELADANI AKHLAK MULIA BAGINDA RASULULLAH DALAM MENUNTUT ILMU DAN BERBUDI PEKERTI 🌸',
    subText: 'Meneladani sifat jujur, amanah, fathonah, dan tabligh.',
    description: 'Peringatan kelahiran Nabi Muhammad SAW dengan ajakan meneladani akhlak mulia.'
  },
  {
    id: 'isra_miraj',
    title: 'Isra Mi\'raj Nabi Muhammad SAW',
    category: 'islam',
    categoryLabel: 'Hari Raya Islam',
    icon: '🌌',
    theme: 'royal_purple',
    displayMode: 'marquee_scroll',
    speed: 'normal',
    fontSize: 'base',
    badgeText: 'ISRA MI\'RAJ',
    badgeIcon: '🌌',
    mainText: '✨ SELAMAT MEMPERINGATI ISRA MI\'RAJ NABI MUHAMMAD SAW 27 RAJAB • TEGAKKAN KEDISIPLINAN SHALAT SEBAGAI TIANG AGAMA DAN PEMBENTUK KARAKTER INSAN CENDEKIA ✨',
    subText: 'Shalat tepat waktu, disiplin gerbang, dan berintegritas.',
    description: 'Peringatan Isra Miraj berfokus pada pentingnya disiplin shalat dan waktu.'
  },

  // --- 2. HARI BESAR NASIONAL & KENEGARAAN ---
  {
    id: 'hut_ri_17_agustus',
    title: 'HUT Kemerdekaan RI 17 Agustus',
    category: 'nasional',
    categoryLabel: 'Hari Besar Nasional',
    icon: '🇮🇩',
    theme: 'merah_putih',
    displayMode: 'marquee_scroll',
    speed: 'fast',
    fontSize: 'lg',
    badgeText: 'DIRGAHAYU RI KE-81',
    badgeIcon: '🇮🇩',
    mainText: '🇮🇩 DIRGAHAYU REPUBLIK INDONESIA KE-81! • NUSANTARA BARU INDONESIA MAJU • KOBARKAN SEMANGAT BELAJAR DAN BERKARYA DEMI KEJAYAAN BANGSA INDONESIA! MERDEKA! 🇮🇩',
    subText: '17 Agustus 1945 - 17 Agustus 2026',
    description: 'Tema merah putih patriotik penuh semangat untuk perayaan Kemerdekaan RI.'
  },
  {
    id: 'hari_guru_nasional',
    title: 'Hari Guru Nasional (25 November)',
    category: 'nasional',
    categoryLabel: 'Hari Besar Nasional',
    icon: '👨‍🏫',
    theme: 'gold',
    displayMode: 'marquee_scroll',
    speed: 'normal',
    fontSize: 'base',
    badgeText: 'HARI GURU NASIONAL',
    badgeIcon: '👨‍🏫',
    mainText: '💐 SELAMAT HARI GURU NASIONAL (25 NOVEMBER) • TERIMA KASIH KEPADA SELURUH GURU & PTK ATAS DEDIKASI TULUS TANPA TANDA JASA DALAM MENCERDASKAN GENERASI BANGSA 💐',
    subText: 'Guru Hebat, Indonesia Kuat. Hormat dan baktiku untuk guruku.',
    description: 'Apresiasi mendalam untuk bapak/ibu dewan guru dan tenaga pendidik.'
  },
  {
    id: 'hari_pendidikan_nasional',
    title: 'Hari Pendidikan Nasional (2 Mei)',
    category: 'nasional',
    categoryLabel: 'Hari Besar Nasional',
    icon: '🎓',
    theme: 'cyber_blue',
    displayMode: 'marquee_scroll',
    speed: 'normal',
    fontSize: 'base',
    badgeText: 'HARDIKNAS 2 MEI',
    badgeIcon: '🎓',
    mainText: '🎓 SELAMAT HARI PENDIDIKAN NASIONAL • ING NGARSO SUNG TULODO, ING MADYO MANGUN KARSO, TUT WURI HANDAYANI • BELAJAR BERKELANJUTAN DAN BERKARYA TANPA BATAS! 🎓',
    subText: 'Memperingati Hari Lahir Ki Hadjar Dewantara.',
    description: 'Tema biru pendidikan yang futuristik dan mengobarkan semangat merdeka belajar.'
  },
  {
    id: 'hari_pahlawan',
    title: 'Hari Pahlawan (10 November)',
    category: 'nasional',
    categoryLabel: 'Hari Besar Nasional',
    icon: '🎖️',
    theme: 'merah_putih',
    displayMode: 'marquee_scroll',
    speed: 'normal',
    fontSize: 'base',
    badgeText: 'HARI PAHLAWAN 10 NOV',
    badgeIcon: '🎖️',
    mainText: '🎖️ SELAMAT HARI PAHLAWAN 10 NOVEMBER • TELADANI PAHLAWANMU, CINTAI NEGERIMU • TERUSKAN PERJUANGAN DENGAN KEDISIPLINAN, PRESTASI, DAN INTEGRITAS TINGGI! 🇮🇩',
    subText: 'Bangsa yang besar adalah bangsa yang menghargai jasa para pahlawannya.',
    description: 'Membangkitkan patriotisme dan semangat belajar generasi penerus.'
  },
  {
    id: 'hari_sumpah_pemuda',
    title: 'Hari Sumpah Pemuda (28 Oktober)',
    category: 'nasional',
    categoryLabel: 'Hari Besar Nasional',
    icon: '⚡',
    theme: 'merah_putih',
    displayMode: 'marquee_scroll',
    speed: 'normal',
    fontSize: 'base',
    badgeText: 'SUMPAH PEMUDA 28 OKT',
    badgeIcon: '⚡',
    mainText: '⚡ SELAMAT HARI SUMPAH PEMUDA • SATU NUSA, SATU BANGSA, SATU BAHASA INDONESIA • GENERASI MUDA BERKARAKTER JUARA, KREATIF, DAN BERDAYA SAING GLOBAL! 🇮🇩',
    subText: 'Pemuda Pelopor Kemajuan Bangsa dan Teknologi.',
    description: 'Peringatan ikrar pemuda dengan semangat persatuan & inovasi pelajar.'
  },
  {
    id: 'hari_kesaktian_pancasila',
    title: 'Hari Kesaktian Pancasila (1 Oktober)',
    category: 'nasional',
    categoryLabel: 'Hari Besar Nasional',
    icon: '🦅',
    theme: 'merah_putih',
    displayMode: 'marquee_scroll',
    speed: 'normal',
    fontSize: 'base',
    badgeText: 'KESAKTIAN PANCASILA',
    badgeIcon: '🦅',
    mainText: '🇮🇩 SELAMAT HARI KESAKTIAN PANCASILA 1 OKTOBER • PANCASILA SEBAGAI PEMERSATU BANGSA DAN PANDUAN KARAKTER GENERASI EMAS INDONESIA 🇮🇩',
    subText: 'Amalkan butir-butir Pancasila dalam setiap langkah kehidupan sekolah.',
    description: 'Peneguhan nilai-nilai luhur Pancasila di lingkungan sekolah.'
  },
  {
    id: 'hari_pramuka',
    title: 'Hari Pramuka (14 Agustus)',
    category: 'nasional',
    categoryLabel: 'Hari Besar Nasional',
    icon: '⛺',
    theme: 'gold',
    displayMode: 'marquee_scroll',
    speed: 'normal',
    fontSize: 'base',
    badgeText: 'HARI PRAMUKA 14 AGUSTUS',
    badgeIcon: '⛺',
    mainText: '⚜️ SELAMAT HARI PRAMUKA 14 AGUSTUS • SATYAKU KUDARMAKAN, DARMAKU KUBAKTIKAN • PRAJA MUDA KARANA: DISIPLIN, BERANI, SETIA, DAN PANTANG MENYERAH! ⚜️',
    subText: 'Dasa Darma dan Tri Satya sebagai pedoman disiplin tunas bangsa.',
    description: 'Tema keemasan cokelat Pramuka dengan semangat kepanduan.'
  },

  // --- 3. AGENDA AKADEMIK & SEKOLAH ---
  {
    id: 'ujian_asas_pas',
    title: 'Pekan Ujian Sumatif / Semester (PAS/ASAS)',
    category: 'sekolah',
    categoryLabel: 'Agenda Sekolah',
    icon: '📝',
    theme: 'cyber_blue',
    displayMode: 'center_pulse',
    speed: 'normal',
    fontSize: 'lg',
    badgeText: 'PEKAN ASESMEN ASAS',
    badgeIcon: '📝',
    mainText: '📝 SELAMAT MENEMPUH ASESMEN SUMATIF AKHIR SEMESTER (ASAS) • JUNJUNG TINGGI KEJUJURAN, DISIPLIN WAKTU, TELITI, DAN RAIH PRESTASI TERBAIK! 💯',
    subText: 'Prestasi penting, namun Kejujuran dan Integritas adalah yang Utama.',
    description: 'Tampilan terfokus di tengah (Center Pulse) untuk suasana tenang tertib ujian.'
  },
  {
    id: 'ujian_anbk',
    title: 'Asesmen Nasional Berbasis Komputer (ANBK)',
    category: 'sekolah',
    categoryLabel: 'Agenda Sekolah',
    icon: '💻',
    theme: 'cyber_blue',
    displayMode: 'marquee_scroll',
    speed: 'normal',
    fontSize: 'base',
    badgeText: 'ASESMEN NASIONAL ANBK',
    badgeIcon: '💻',
    mainText: '💻 SELAMAT MENGIKUTI ASESMEN NASIONAL (ANBK) • FOKUS, TELITI, PENUH PERCAYA DIRI, DAN BERIKAN HASIL MAKSIMAL UNTUK MUTU PENDIDIKAN TERBAIK! ✨',
    subText: 'Literasi, Numerasi, dan Survei Karakter.',
    description: 'Semangat untuk siswa-siswi yang mengikuti asesmen ANBK.'
  },
  {
    id: 'tahun_ajaran_baru_mpls',
    title: 'Tahun Ajaran Baru & MPLS Siswa Baru',
    category: 'sekolah',
    categoryLabel: 'Agenda Sekolah',
    icon: '🎉',
    theme: 'gold',
    displayMode: 'marquee_scroll',
    speed: 'normal',
    fontSize: 'lg',
    badgeText: 'TAHUN AJARAN 2026/2027',
    badgeIcon: '🎉',
    mainText: '✨ SELAMAT DATANG PESERTA DIDIK BARU & SELAMAT MEMASUKI TAHUN AJARAN BARU 2026/2027 • BERSAMA SMK EKONOMIKA MENGUKIR PRESTASI DAN KEAHLIAN MASA DEPAN! ✨',
    subText: 'Masa Pengenalan Lingkungan Sekolah yang Edukatif dan Menyenangkan.',
    description: 'Sambutan meriah bagi siswa baru dan seluruh warga sekolah awal semester.'
  },
  {
    id: 'dies_natalis_smk',
    title: 'HUT & Dies Natalis SMK Ekonomika',
    category: 'sekolah',
    categoryLabel: 'Agenda Sekolah',
    icon: '🏢',
    theme: 'royal_purple',
    displayMode: 'center_pulse',
    speed: 'normal',
    fontSize: 'lg',
    badgeText: 'DIES NATALIS SEKOLAH',
    badgeIcon: '🏢',
    mainText: '🏆 DIRGAHAYU SMK EKONOMIKA! • MENJADI SMK PUSAT KEUNGGULAN YANG UNGGUL, RELIGIUS, DISIPLIN, DAN BERDAYA SAING GLOBAL DI DUNIA KERJA & INDUSTRI 🌟',
    subText: 'Mencetak lulusan siap kerja, santun, dan berakhlak mulia.',
    description: 'Format mewah untuk perayaan hari ulang tahun sekolah.'
  },

  // --- 4. TAHUN BARU & HARI RAYA LAIN ---
  {
    id: 'tahun_baru_masehi',
    title: 'Tahun Baru Masehi 1 Januari',
    category: 'tahun_baru_agama',
    categoryLabel: 'Tahun Baru & Hari Raya',
    icon: '🎆',
    theme: 'gold',
    displayMode: 'marquee_scroll',
    speed: 'normal',
    fontSize: 'lg',
    badgeText: 'HAPPY NEW YEAR 2027',
    badgeIcon: '🎆',
    mainText: '🎉 HAPPY NEW YEAR 2027! • SELAMAT TAHUN BARU! SAMBUT TAHUN BARU DENGAN SEMANGAT BARU, TARGET BARU, DAN DISIPLIN MENUJU PRESTASI GEMILANG! 🌟',
    subText: 'Jadikan setiap hari sebagai langkah nyata meraih cita-cita.',
    description: 'Penyambutan Tahun Baru Masehi penuh energi positif dan harapan baru.'
  },
  {
    id: 'hari_natal',
    title: 'Hari Raya Natal & Tahun Baru',
    category: 'tahun_baru_agama',
    categoryLabel: 'Tahun Baru & Hari Raya',
    icon: '🎄',
    theme: 'merah_putih',
    displayMode: 'marquee_scroll',
    speed: 'normal',
    fontSize: 'base',
    badgeText: 'MERRY CHRISTMAS',
    badgeIcon: '🎄',
    mainText: '🎄 SELAMAT HARI RAYA NATAL & TAHUN BARU • SEMOGA KEDAMAIAN, KASIH, DAN SUKACITA MENYERTAI KITA SEMUA DALAM KEBERAGAMAN DAN KEHARMONISAN 🎄',
    subText: 'Damai di bumi, damai di hati.',
    description: 'Ucapan Selamat Hari Raya Natal dan Tahun Baru dalam semangat toleransi.'
  },
  {
    id: 'tahun_baru_imlek',
    title: 'Tahun Baru Imlek (Gong Xi Fa Cai)',
    category: 'tahun_baru_agama',
    categoryLabel: 'Tahun Baru & Hari Raya',
    icon: '🧧',
    theme: 'merah_putih',
    displayMode: 'marquee_scroll',
    speed: 'normal',
    fontSize: 'base',
    badgeText: 'GONG XI FA CAI',
    badgeIcon: '🧧',
    mainText: '🏮 SELAMAT TAHUN BARU IMLEK • GONG XI FA CAI • SEMOGA MEMBAWA KESEHATAN, KEDAMAIAN, KEBERUNTUNGAN, DAN KESUKSESAN BAGI KITA SEMUA 🏮',
    subText: 'Harmoni dalam kebhinekaan budaya.',
    description: 'Ucapan Tahun Baru Imlek bertema merah kemakmuran.'
  },
  {
    id: 'hari_nyepi',
    title: 'Hari Raya Nyepi Tahun Baru Saka',
    category: 'tahun_baru_agama',
    categoryLabel: 'Tahun Baru & Hari Raya',
    icon: '🪷',
    theme: 'gold',
    displayMode: 'marquee_scroll',
    speed: 'normal',
    fontSize: 'base',
    badgeText: 'RAHAJENG RAHINA NYEPI',
    badgeIcon: '🪷',
    mainText: '🪷 SELAMAT HARI RAYA NYEPI TAHUN BARU SAKA • RAHIS RAHINA NYEPI • MENEMUKAN KEDAMAIAN DAN KEMURNIAN JIWA DALAM KEHENINGAN REFLEKSI DIRI 🪷',
    subText: 'Catur Brata Penyepian menuju kesucian lahir dan batin.',
    description: 'Ucapan Hari Raya Nyepi dengan nilai hening dan ketenangan batin.'
  },
  {
    id: 'hari_waisak',
    title: 'Hari Raya Tri Suci Waisak',
    category: 'tahun_baru_agama',
    categoryLabel: 'Tahun Baru & Hari Raya',
    icon: '🌸',
    theme: 'gold',
    displayMode: 'marquee_scroll',
    speed: 'normal',
    fontSize: 'base',
    badgeText: 'TRI SUCI WAISAK',
    badgeIcon: '🌸',
    mainText: '🌸 SELAMAT HARI RAYA TRI SUCI WAISAK • SABBE SATTA BHAVANTU SUKHITATTA • SEMOGA SEMUA MAKHLUK HIDUP BERBAHAGIA DAN HIDUP DALAM KEDAMAIAN ABADI 🌸',
    subText: 'Semoga kedamaian selalu menyelimuti semesta.',
    description: 'Ucapan Hari Raya Waisak bernuansa damai dan welas asih.'
  },

  // --- 5. MOTIVASI DISIPLIN & BUDAYA 5S ---
  {
    id: 'disiplin_tepat_waktu',
    title: 'Disiplin Waktu & Tap RFID Harian',
    category: 'motivasi',
    categoryLabel: 'Motivasi & 5S',
    icon: '⏰',
    theme: 'gold',
    displayMode: 'marquee_scroll',
    speed: 'normal',
    fontSize: 'base',
    badgeText: 'DISIPLIN TEPAT WAKTU',
    badgeIcon: '⏰',
    mainText: '⏰ DISIPLIN ADALAH KUNCI KESUKSESAN! • HARAP SELALU MELAKUKAN TAP KARTU RFID SAAT MASUK & PULANG • HADIR TEPAT WAKTU DAN JADILAH PELAJAR TELADAN! 🌟',
    subText: 'Waktu tidak bisa diulang, hargai setiap menit dengan belajar bermakna.',
    description: 'Pesan standar harian mengingatkan tap kartu RFID dan jam masuk pagi.'
  },
  {
    id: 'budaya_5s_sekolah',
    title: 'Budaya 5S (Senyum, Salam, Sapa, Sopan, Santun)',
    category: 'motivasi',
    categoryLabel: 'Motivasi & 5S',
    icon: '😊',
    theme: 'emerald',
    displayMode: 'center_pulse',
    speed: 'normal',
    fontSize: 'base',
    badgeText: 'BUDAYA 5S SEKOLAH',
    badgeIcon: '😊',
    mainText: '🤝 BUDAYAKAN 5S: SENYUM, SALAM, SAPA, SOPAN, DAN SANTUN • HORMATI BAPAK/IBU GURU, SAYANGI TEMAN, DAN RAWAT KEBERSIHAN LINGKUNGAN SEKOLAH KITA 🌿',
    subText: 'Karakter santun mencerminkan kepribadian unggul generasi cendekia.',
    description: 'Menanamkan etika 5S dan kebersihan lingkungan sekolah di layar monitor.'
  },
  {
    id: 'tertib_seragam_atribut',
    title: 'Tertib Atribut Seragam & Tata Tertib Gerbang',
    category: 'motivasi',
    categoryLabel: 'Motivasi & 5S',
    icon: '👔',
    theme: 'cyber_blue',
    displayMode: 'marquee_scroll',
    speed: 'normal',
    fontSize: 'base',
    badgeText: 'TATA TERTIB GERBANG',
    badgeIcon: '👔',
    mainText: '👔 TERTIB SERAGAM, LENGKAP ATRIBUT, DAN RAPI SEBELUM MEMASUKI GERBANG SEKOLAH • SMK BISA, SMK HEBAT, EKONOMIKA JUARA! 🏆',
    subText: 'Kerapian seragam adalah cermin kedisiplinan dan profesionalisme.',
    description: 'Mengingatkan kerapian seragam dan atribut saat tiba di pos gerbang.'
  }
];

export const MARQUEE_THEMES_CONFIG: Record<
  MarqueeTheme,
  {
    name: string;
    shortName: string;
    description: string;
    bgClass: string;
    borderClass: string;
    textClass: string;
    badgeBgClass: string;
    badgeTextClass: string;
    accentGlowClass: string;
    previewGradient: string;
  }
> = {
  gold: {
    name: 'Emas Mewah (Gold Luxury)',
    shortName: 'Emas Luxury',
    description: 'Latar gelap pekat dengan teks emas bercahaya, sangat elegan untuk hari besar & penghargaan.',
    bgClass: 'bg-gradient-to-r from-slate-950 via-amber-950/70 to-slate-950',
    borderClass: 'border-amber-500/60 shadow-amber-500/10',
    textClass: 'text-amber-300 drop-shadow-[0_1px_4px_rgba(245,158,11,0.4)]',
    badgeBgClass: 'bg-amber-400 border border-amber-300 text-slate-950',
    badgeTextClass: 'text-slate-950',
    accentGlowClass: 'shadow-[0_0_15px_rgba(245,158,11,0.25)]',
    previewGradient: 'from-amber-900 to-slate-900'
  },
  emerald: {
    name: 'Hijau Ramadhan & Islami (Emerald Green)',
    shortName: 'Emerald Islami',
    description: 'Warna hijau zamrud menyejukkan dengan aksen mint, sangat cocok untuk Ramadhan & Idul Fitri.',
    bgClass: 'bg-gradient-to-r from-slate-950 via-emerald-950/80 to-slate-950',
    borderClass: 'border-emerald-500/60 shadow-emerald-500/10',
    textClass: 'text-emerald-300 drop-shadow-[0_1px_4px_rgba(168,85,247,0.4)]',
    badgeBgClass: 'bg-emerald-400 border border-emerald-300 text-slate-950',
    badgeTextClass: 'text-slate-950',
    accentGlowClass: 'shadow-[0_0_15px_rgba(16,185,129,0.25)]',
    previewGradient: 'from-emerald-900 to-slate-900'
  },
  merah_putih: {
    name: 'Merah Putih Kemerdekaan (Patriotik RI)',
    shortName: 'Merah Putih RI',
    description: 'Nuansa merah membara dan putih bersih untuk HUT RI, Hari Pahlawan, dan Sumpah Pemuda.',
    bgClass: 'bg-gradient-to-r from-rose-950 via-red-900/90 to-rose-950',
    borderClass: 'border-rose-500/70 shadow-rose-500/20',
    textClass: 'text-white drop-shadow-[0_1px_6px_rgba(255,255,255,0.6)]',
    badgeBgClass: 'bg-white border border-rose-200 text-rose-950',
    badgeTextClass: 'text-rose-950',
    accentGlowClass: 'shadow-[0_0_15px_rgba(244,63,94,0.3)]',
    previewGradient: 'from-rose-900 to-slate-900'
  },
  cyber_blue: {
    name: 'Cyber Blue & Akademik (Biru Modern)',
    shortName: 'Cyber Blue',
    description: 'Warna biru neon futuristik yang cerdas dan fokus, ideal untuk pekan ujian dan ANBK.',
    bgClass: 'bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950',
    borderClass: 'border-cyan-500/60 shadow-cyan-500/10',
    textClass: 'text-cyan-300 drop-shadow-[0_1px_4px_rgba(6,182,212,0.4)]',
    badgeBgClass: 'bg-cyan-400 border border-cyan-300 text-slate-950',
    badgeTextClass: 'text-slate-950',
    accentGlowClass: 'shadow-[0_0_15px_rgba(6,182,212,0.25)]',
    previewGradient: 'from-cyan-900 to-indigo-950'
  },
  royal_purple: {
    name: 'Ungu Prestasi & Dies Natalis (Royal Purple)',
    shortName: 'Royal Purple',
    description: 'Perpaduan ungu kerajaan dan violet mewah untuk perayaan prestasi, wisuda, dan dies natalis.',
    bgClass: 'bg-gradient-to-r from-slate-950 via-purple-950/80 to-slate-950',
    borderClass: 'border-purple-500/60 shadow-purple-500/10',
    textClass: 'text-purple-200 drop-shadow-[0_1px_4px_rgba(168,85,247,0.4)]',
    badgeBgClass: 'bg-purple-400 border border-purple-300 text-slate-950',
    badgeTextClass: 'text-slate-950',
    accentGlowClass: 'shadow-[0_0_15px_rgba(168,85,247,0.25)]',
    previewGradient: 'from-purple-900 to-slate-900'
  },
  classic_dark: {
    name: 'Monokrom Kontras Tinggi (Classic Dark)',
    shortName: 'Classic Dark',
    description: 'Gaya monokrom bersih dengan kontras maksimal dan keterbacaan tinggi di segala pencahayaan.',
    bgClass: 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900',
    borderClass: 'border-slate-600 shadow-slate-900/30',
    textClass: 'text-slate-100',
    badgeBgClass: 'bg-slate-200 text-slate-950',
    badgeTextClass: 'text-slate-950',
    accentGlowClass: 'shadow-md',
    previewGradient: 'from-slate-800 to-slate-900'
  }
};
