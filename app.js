// ============================================
// HABIT TRACKER CLI - CHALLENGE 3
// ============================================
// NAMA: Deva Wira Sanjaya
// KELAS: Kelas Repetisi Front End Developer
// TANGGAL: 5 November 2025
// ============================================

// TODO: Import module yang diperlukan
// HINT: readline, fs, path
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// TODO: Definisikan konstanta
// HINT: DATA_FILE, REMINDER_INTERVAL, DAYS_IN_WEEK
const DATA_FILE = path.join(__dirname, 'habits-data.json');
const REMINDER_INTERVAL = 10000; // 10 detik
const DAYS_IN_WEEK = 7;

// TODO: Setup readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// helper: jadikan rl.question promisified
function askQuestion(question) {
  return new Promise((resolve) => rl.question(question, (ans) => resolve(ans)));
}
// --- Helpers visual & tanggal ---
function clamp(num, min, max) {
  return Math.max(min, Math.min(num, max));
}
function formatDate(d) {
  const dt = new Date(d);
  return dt.toISOString().split('T')[0]; // YYYY-MM-DD
}
function progressBar(percentage, width = 20) {
  const filled = clamp(Math.round((percentage / 100) * width), 0, width);
  return '█'.repeat(filled) + '░'.repeat(width - filled) + ` ${percentage}%`;
}


// ============================================
// USER PROFILE OBJECT
// ============================================
// TODO: Buat object userProfile dengan properties:
// - name
// - joinDate
// - totalHabits
// - completedThisWeek
// TODO: Tambahkan method updateStats(habits)
// TODO: Tambahkan method getDaysJoined()

const userProfile = {
  // properti dasar pengguna
  name: 'Deva Wira', // nama user
  joinDate: new Date(), // tanggal mulai memakai aplikasi
  totalHabits: 0, // jumlah habit yang dimiliki
  completedThisWeek: 0, // jumlah penyelesaian habit minggu ini

  // method untuk memperbarui statistik berdasarkan daftar habits
  updateStats(habits) {
    // total habit = panjang array habits
    this.totalHabits = habits.length;

    // hitung total penyelesaian minggu ini dengan menjumlahkan jumlah
    // completions setiap habit yang terjadi dalam minggu berjalan
    const now = new Date();
    this.completedThisWeek = habits
      .map((h) => h.getThisWeekCompletions(now).length) // jumlah penyelesaian per habit
      .reduce((a, b) => a + b, 0); // jumlahkan semua

    // kembalikan objek ringkasan untuk ditampilkan
    return {
      totalHabits: this.totalHabits,
      completedThisWeek: this.completedThisWeek,
      daysJoined: this.getDaysJoined(now),
    };
  },

  // method untuk menghitung berapa hari user sudah bergabung
  getDaysJoined(refDate = new Date()) {
    const start = new Date(this.joinDate);
    start.setHours(0, 0, 0, 0); // normalisasi jam
    const end = new Date(refDate);
    end.setHours(0, 0, 0, 0);
    const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
    return diff + 1; // +1 supaya hari pertama dihitung
  },
};

// ============================================
// HABIT CLASS
// ============================================
// TODO: Buat class Habit dengan:
// - Constructor yang menerima name dan targetFrequency
// - Method markComplete()
// - Method getThisWeekCompletions()
// - Method isCompletedThisWeek()
// - Method getProgressPercentage()
// - Method getStatus()

class Habit {
  // constructor menerima name dan targetFrequency
  constructor({ id, name, targetFrequency, completions, createdAt }) {
    // buat ID unik
    this.id =
      id ?? Date.now().toString(36) + Math.random().toString(36).slice(2);

    // nama habit dan target per minggu (pakai nullish coalescing agar default aman)
    this.name = name ?? 'Habit Tanpa Nama';
    this.targetFrequency = Number(targetFrequency ?? 7);

    // daftar tanggal kapan habit ini diselesaikan
    this.completions = Array.isArray(completions) ? completions : [];

    // tanggal habit ini dibuat
    this.createdAt = createdAt ? new Date(createdAt) : new Date();
  }

  // ===========================
  // Helper static: deteksi minggu yang sama
  // ===========================
  static startOfWeek(date) {
    const d = new Date(date);
    const day = (d.getDay() + 6) % 7; // Senin = 0
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - day);
    return d;
  }

  static isSameWeek(a, b) {
    return Habit.startOfWeek(a).getTime() === Habit.startOfWeek(b).getTime();
  }

  // ===========================
  // 1️⃣ markComplete(): tandai habit selesai hari ini
  // ===========================
  markComplete(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0); // normalisasi jam

    // cek apakah hari ini sudah ditandai
    const exists = this.completions.some((ts) => {
      const t = new Date(ts);
      t.setHours(0, 0, 0, 0);
      return t.getTime() === d.getTime();
    });

    // kalau belum, tambahkan ke daftar completions
    if (!exists) {
      this.completions.push(d.toISOString());
      return true; // sukses
    }
    return false; // sudah ditandai sebelumnya
  }

  // ===========================
  // 2️⃣ getThisWeekCompletions(): ambil semua tanggal completion minggu ini
  // ===========================
  getThisWeekCompletions(refDate = new Date()) {
    return this.completions.filter((ts) =>
      Habit.isSameWeek(new Date(ts), refDate)
    );
  }

  // ===========================
  // 3️⃣ isCompletedThisWeek(): cek apakah target mingguan tercapai
  // ===========================
  isCompletedThisWeek(refDate = new Date()) {
    return this.getThisWeekCompletions(refDate).length >= this.targetFrequency;
  }

  // ===========================
  // 4️⃣ getProgressPercentage(): hitung persentase progres minggu ini
  // ===========================
  getProgressPercentage(refDate = new Date()) {
    const done = this.getThisWeekCompletions(refDate).length;
    const pct = Math.round((done / this.targetFrequency) * 100);
    return Math.max(0, Math.min(100, pct)); // jaga agar 0–100%
  }

  // ===========================
  // 5️⃣ getStatus(): kembalikan status "Aktif" / "Selesai"
  // ===========================
  getStatus(refDate = new Date()) {
    return this.isCompletedThisWeek(refDate) ? 'Selesai' : 'Aktif';
  }
}

// ============================================
// HABIT TRACKER CLASS
// ============================================
// TODO: Buat class HabitTracker dengan:
// - Constructor
// - Method addHabit(name, frequency)
// - Method completeHabit(habitIndex)
// - Method deleteHabit(habitIndex)
// - Method displayProfile()
// - Method displayHabits(filter)
// - Method displayHabitsWithWhile()
// - Method displayHabitsWithFor()
// - Method displayStats()
// - Method startReminder()
// - Method showReminder()
// - Method stopReminder()
// - Method saveToFile()
// - Method loadFromFile()
// - Method clearAllData()

class HabitTracker {
  constructor() {
    this.habits = []; // penyimpanan habit
    this.profile = { ...userProfile }; // profil (di-clone dari object userProfile)
    this.reminderTimer = null; // handler interval reminder
  }

  // ---------- CRUD ----------
  addHabit(name, frequency, category) {
    const freq = Number(frequency ?? DAYS_IN_WEEK); // default 7/minggu
    const habit = new Habit({
      name,
      targetFrequency: freq,
      category: category ?? 'General',
    });
    this.habits.push(habit);
    this.saveToFile();
  }

  completeHabit(habitIndexOrQuery) {
  const raw = String(habitIndexOrQuery).trim();
  const num = Number(raw);
  let habit = Number.isInteger(num) && num > 0 ? this.habits[num - 1] : null;

  if (!habit) {
    // cari by id atau nama (case-insensitive)
    habit = this.habits.find(h =>
      h.id === raw || h.name.toLowerCase() === raw.toLowerCase()
    ) ?? null;
  }
  if (!habit) return false;

  const ok = habit.markComplete(new Date());
  this.saveToFile();
  return ok;
}


  deleteHabit(habitIndexOrQuery) {
  const raw = String(habitIndexOrQuery).trim();
  const num = Number(raw);
  let index = Number.isInteger(num) && num > 0 ? num - 1 : -1;

  if (index < 0) {
    index = this.habits.findIndex(h =>
      h.id === raw || h.name.toLowerCase() === raw.toLowerCase()
    );
  }
  if (index < 0 || index >= this.habits.length) return false;

  this.habits.splice(index, 1);
  this.saveToFile();
  return true;
}


  // ---------- DISPLAY ----------
  displayProfile() {
    const stats = this.profile.updateStats(this.habits);
    console.log('\n==================================================');
    console.log('PROFIL PENGGUNA');
    console.log('==================================================');
    console.log(`Nama           : ${this.profile.name}`);
    console.log(`Bergabung Sejak: ${formatDate(this.profile.joinDate)}`);
    console.log(`Hari Ke        : ${stats.daysJoined}`);
    console.log(`Jumlah Habit   : ${stats.totalHabits}`);
    console.log(`Selesai/Minggu : ${stats.completedThisWeek}`);
    console.log('==================================================\n');
  }

  displayHabits(filter = 'all') {
    const now = new Date();
    let list = this.habits;

    if (filter === 'active')
      list = this.habits.filter((h) => !h.isCompletedThisWeek(now));
    if (filter === 'done')
      list = this.habits.filter((h) => h.isCompletedThisWeek(now));

    if (list.length === 0) {
      console.log('\n( kosong )\n');
      return;
    }

    list.forEach((h, i) => {
      const done = h.getThisWeekCompletions(now).length;
      const pct = h.getProgressPercentage(now);
      console.log(
        `${i + 1}. [${h.getStatus(now)}] ${h.name} (${h.category ?? 'General'})`
      );
      console.log(`   Dibuat : ${formatDate(h.createdAt)}`);
      console.log(
        `   Target : ${h.targetFrequency}x/minggu | Progress: ${done}/${h.targetFrequency} (${pct}%)`
      );
      console.log(`   Bar    : ${progressBar(pct, 10)}\n`);
    });
  }

  displayHabitsWithWhile() {
    console.log('\n--- Demo WHILE Loop ---');
    let i = 0;
    while (i < this.habits.length) {
      console.log(`(${i + 1}) ${this.habits[i].name}`);
      i++;
    }
    if (this.habits.length === 0) console.log('( kosong )');
    console.log('-----------------------\n');
  }

  displayHabitsWithFor() {
    console.log('\n--- Demo FOR Loop ---');
    for (let i = 0; i < this.habits.length; i++) {
      console.log(`(${i + 1}) ${this.habits[i].name}`);
    }
    if (this.habits.length === 0) console.log('( kosong )');
    console.log('---------------------\n');
  }

  displayStats() {
    const now = new Date();
    const summaries = this.habits.map((h) => ({
      name: h.name,
      target: h.targetFrequency,
      done: h.getThisWeekCompletions(now).length,
      pct: h.getProgressPercentage(now),
      status: h.getStatus(now),
      category: h.category ?? 'General',
    }));

    const total = summaries.length;
    const finished = summaries.filter((s) => s.status === 'Selesai').length;
    const avgPct = Math.round(
      summaries.reduce((a, b) => a + b.pct, 0) / (total || 1)
    );

    // agregasi per kategori
    const byCat = {};
    summaries.forEach((s) => {
      byCat[s.category] = byCat[s.category] ?? { count: 0, sumPct: 0 };
      byCat[s.category].count += 1;
      byCat[s.category].sumPct += s.pct;
    });

    console.log('\n================= STATISTIK =================');
    console.log(`Total Habit     : ${total}`);
    console.log(`Selesai (minggu): ${finished}`);
    console.log(`Progress Rata2  : ${avgPct}%`);
    console.log('--------------------------------------------');
    console.log('Kategori:');
    Object.keys(byCat).forEach((cat) => {
      const avg = Math.round(byCat[cat].sumPct / byCat[cat].count);
      console.log(`- ${cat}: ${byCat[cat].count} habit | avg ${avg}%`);
    });
    console.log('============================================\n');
  }

  // ---------- REMINDER ----------
  startReminder() {
    if (this.reminderTimer) return; // sudah jalan
    this.reminderTimer = setInterval(
      () => this.showReminder(),
      REMINDER_INTERVAL
    );
  }

  showReminder() {
    const now = new Date();
    const candidates = this.habits.filter((h) => !h.isCompletedThisWeek(now));
    if (candidates.length === 0) return; // tidak ada yang perlu diingatkan

    const idx = Math.floor(Math.random() * candidates.length);
    const target = candidates[idx];
    console.log('\n==================================================');
    console.log(`REMINDER: Jangan lupa "${target.name}"!`);
    console.log('==================================================\n');
  }

  stopReminder() {
    if (this.reminderTimer) {
      clearInterval(this.reminderTimer);
      this.reminderTimer = null;
    }
  }

  // ---------- FILE I/O ----------
  saveToFile() {
    const data = {
      profile: this.profile,
      habits: this.habits.map((h) => ({
        id: h.id,
        name: h.name,
        targetFrequency: h.targetFrequency,
        completions: h.completions,
        createdAt: h.createdAt,
        category: h.category,
      })),
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  }

  loadFromFile() {
    if (!fs.existsSync(DATA_FILE)) {
      this.saveToFile(); // buat file awal kosong
      return;
    }
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);

      const prof = parsed.profile ?? {};
      this.profile.name = prof.name ?? this.profile.name;
      this.profile.joinDate = prof.joinDate
        ? new Date(prof.joinDate)
        : this.profile.joinDate;

      const list = parsed.habits ?? [];
      this.habits = list.map((obj) => new Habit(obj));
    } catch (e) {
      console.error('Gagal memuat file data, membuat ulang.', e.message);
      this.saveToFile();
    }
  }

  clearAllData() {
    this.habits = [];
    this.profile = { ...userProfile, joinDate: new Date() };
    this.saveToFile();
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================
// TODO: Buat function askQuestion(question)
// TODO: Buat async function handleMenu(tracker)

// Fungsi untuk menanyakan input dari pengguna di CLI
function askQuestion(question) {
  // Gunakan Promise supaya bisa dipanggil dengan "await"
  return new Promise((resolve) =>
    rl.question(question, (answer) => resolve(answer))
  );
}

// Fungsi utama untuk menangani menu interaktif CLI
async function handleMenu(tracker) {
  tracker.startReminder(); // mulai reminder otomatis

  // perulangan tak terbatas sampai user memilih keluar
  while (true) {
    // tampilkan daftar menu
    console.log('\n==================================================');
    console.log('HABIT TRACKER - MAIN MENU');
    console.log('==================================================');
    console.log('1. Lihat Profil');
    console.log('2. Lihat Semua Kebiasaan');
    console.log('3. Lihat Kebiasaan Aktif');
    console.log('4. Lihat Kebiasaan Selesai');
    console.log('5. Tambah Kebiasaan Baru');
    console.log('6. Tandai Kebiasaan Selesai');
    console.log('7. Hapus Kebiasaan');
    console.log('8. Lihat Statistik');
    console.log('9. Demo Loop (while/for)');
    console.log('0. Keluar');
    console.log('==================================================');

    // ambil input user
    const choice = await askQuestion('Pilih menu (0-9): ');
    const input = (choice ?? '').trim();

    switch (input) {
      case '1': // lihat profil
        tracker.displayProfile();
        break;

      case '2': // lihat semua habit
        tracker.displayHabits('all');
        break;

      case '3': // filter aktif
        tracker.displayHabits('active');
        break;

      case '4': // filter selesai
        tracker.displayHabits('done');
        break;

      case '5': {
        // tambah habit baru
        const name = await askQuestion('Nama kebiasaan: ');
        const freq = await askQuestion('Target per minggu (angka): ');
        const cat = await askQuestion('Kategori (opsional): ');
        tracker.addHabit(
          name || 'Habit Baru',
          Number(freq) || 7,
          cat || 'General'
        );
        console.log('Habit ditambahkan!\n');
        break;
      }

      case '6': {
        // tandai selesai hari ini
        tracker.displayHabits('all');
        const idx = await askQuestion('Nomor/Nama/ID habit yang selesai hari ini: ');
        const ok = tracker.completeHabit(idx);   // ✅ kirim raw string
        console.log(ok ? '✅ Dicatat. Mantap!' : '❌ Tidak ditemukan / sudah dicatat hari ini.');
        break;
      }

      case '7': {
        // hapus habit
        tracker.displayHabits('all');
        const idx = await askQuestion('Nomor/Nama/ID habit yang dihapus: ');
        const ok = tracker.deleteHabit(idx);     // ✅ kirim raw string
        console.log(ok ? '🗑️ Habit dihapus.' : '⚠️ Tidak ditemukan.');
        break;
      }

      case '8': // statistik keseluruhan
        tracker.displayStats();
        break;

      case '9': // demo while & for loop
        tracker.displayHabitsWithWhile();
        tracker.displayHabitsWithFor();
        break;

      case '0': // keluar dari program
        tracker.stopReminder();
        console.log(
          '👋 Sampai jumpa! Terima kasih sudah memakai Habit Tracker.'
        );
        rl.close();
        return;

      default:
        console.log('❓ Pilihan tidak dikenal. Coba lagi.');
    }
  }
}

// ============================================
// MAIN FUNCTION
// ============================================
// TODO: Buat async function main()

async function main() {
  // 1) Buat instance tracker
  const tracker = new HabitTracker();

  // 2) Muat data dari file JSON (dibuat otomatis jika belum ada)
  tracker.loadFromFile();

  // 3) (Opsional) Seed data contoh jika belum ada habit sama sekali
  if (tracker.habits.length === 0) {
    tracker.addHabit('Minum Air 8 Gelas', 7, 'Health');
    tracker.addHabit('Baca Buku 30 Menit', 5, 'Mind');
    tracker.addHabit('Jalan 5.000 langkah', 6, 'Health');
    console.log('Contoh habits dibuat (pertama kali). Anda bisa hapus.\n');
  }

  // 4) Jalankan menu interaktif
  await handleMenu(tracker);
}

// TODO: Jalankan main() dengan error handling
main().catch((err) => {
  console.error('Terjadi kesalahan fatal:', err);
  try {
    rl.close();
  } catch {}
});
