# MR. PLANER Telegram Bot

Bot Telegram untuk affiliator TikTok. User mengirim foto produk, bot menganalisis produknya, lalu menyusun rencana konten 7 atau 30 hari lengkap dengan skrip video per konten. Hasilnya dikirim sebagai Google Spreadsheet dan Google Docs.

Semua logika berjalan di n8n, dan datanya disimpan di Supabase (Postgres).

## Perintah bot

| Perintah | Yang terjadi |
|---|---|
| `/start` (juga `/help`, `/menu`) | Menu awal dengan tombol 7 hari, 30 hari, riwayat, dan cara analisis |
| Foto + caption `/analyze` | Produk di foto dianalisis (nama, deskripsi, selling point, target market), disimpan, lalu keyword dicari di latar belakang |
| `/create` | Bot menanyakan durasi (7 atau 30 hari), lalu membuat plan dari produk terakhir yang dianalisis user |
| `/history` | Lima plan terakhir beserta link spreadsheet |

Kalau user menjalankan `/create` sebelum pernah `/analyze`, bot meminta foto produk dulu.

Hasil `/create`:

- Satu Google Spreadsheet berisi jadwal: tanggal, jam posting, judul, jenis konten, hook, caption, hashtag, ide musik, dan link skrip.
- Satu Google Doc skrip per konten.

Keduanya dibuat public (siapa pun yang punya link bisa membuka), dan linknya dikirim ke chat.

## Cara kerjanya

```
Telegram ─► WF-01 Router ─┬─ /analyze ──────────► WF-02 Product Analyzer ─► WF-04 Keyword Generator
                          └─ /create + durasi ──► WF-03 Content Plan Generator
```

| Workflow | ID live | Trigger | Isi |
|---|---|---|---|
| WF-01 Telegram Bot Router | `NABwYQobx1GQzFCh` | Telegram Trigger | Parse pesan, upsert user ke `users`, routing perintah |
| WF-02 Product Analyzer | `YUtQO5eQiGBeOmZA` | `POST /webhook/analyze-product` | Ambil foto dari Telegram, analisis dengan Groq vision, simpan ke `products`, panggil WF-04 |
| WF-03 Content Plan Generator | `1SJ1Zp0K1jE9Nac9` | `POST /webhook/generate-content-plan` | Susun plan dengan Groq, simpan ke `content_plans` dan `content_items`, buat skrip per item, buat Docs dan Spreadsheet |
| WF-04 Keyword Generator | `r5R8Om6lswshoC2G` | `POST /webhook/generate-keywords` | Ambil related queries dari SerpAPI Google Trends (geo `ID`), simpan ke `keywords` dengan skor 0-100 |

Workflow saling memanggil lewat HTTP ke webhook masing-masing dengan header `x-internal-secret`. Node `Verify Secret` di workflow tujuan menolak request yang header-nya tidak cocok.

Model AI yang dipakai adalah Groq `meta-llama/llama-4-scout-17b-16e-instruct`, untuk vision dan teks. Karena kuota harian Groq gratis cepat habis, setiap panggilan AI punya tiga lapis:

1. Akun Groq utama, dicoba ulang beberapa kali.
2. Kalau tetap gagal, pindah ke akun Groq cadangan (kuota terpisah).
3. Kalau dua-duanya gagal, workflow memakai template supaya user tetap dapat hasil, tapi isinya lebih generik.

## Isi repo

```
.env.example        catatan nilai konfigurasi (tidak dibaca n8n)
supabase/
  migrations/
    001_schema.sql  schema database
n8n/
  workflows/        export JSON keempat workflow
```

Export JSON di `n8n/workflows/` lebih lama dari versi yang berjalan di n8n. Perbedaan yang diketahui:

- WF-02 dan WF-03 live punya node Groq cadangan (`Analyze with Groq (Backup)`, `Generate Plan (Backup)`, `Generate Script (Backup)`) dan node `Parse Script Item`.
- WF-04 live memakai SerpAPI Google Trends, sedangkan di export masih Groq.
- Credential ID di export dikosongkan, jadi credential perlu dipasang ulang setelah import.

Saat mengubah workflow, jadikan versi live sebagai acuan, lalu export ulang ke folder ini.

## Setup dari nol

### 1. Database

1. Buat project baru di Supabase.
2. Buka SQL Editor, lalu jalankan isi `supabase/migrations/001_schema.sql`. Hasilnya tujuh tabel: `users`, `products`, `content_plans`, `content_items`, `scripts`, `keywords`, `activity_logs`.
3. Ambil detail koneksi dari tombol **Connect**, bagian **Session pooler**.

Jangan pakai host `db.<project-ref>.supabase.co`. Host itu hanya punya alamat IPv6, dan server n8n tidak bisa menjangkaunya.

Semua tabel memakai RLS tanpa policy, jadi tidak bisa dibaca lewat REST API dengan anon key. n8n tidak terpengaruh karena terhubung langsung sebagai user `postgres`, yaitu pemilik tabel.

### 2. Credential di n8n

| Credential | Tipe di n8n | Isi |
|---|---|---|
| Telegram | Telegram API | Token bot dari @BotFather |
| Postgres | Postgres | Host pooler dari langkah 1 (saat ini `aws-1-ap-southeast-1.pooler.supabase.com`), port `5432`, database `postgres`, user `postgres.<project-ref>`, password database. Nyalakan **Ignore SSL Issues**, karena sertifikat pooler tidak lolos verifikasi di n8n. |
| Groq | Header Auth | Name `Authorization`, value `Bearer gsk_...` dari console.groq.com |
| Groq cadangan | Header Auth | Sama seperti di atas, tapi dari akun Groq lain |
| Google | Google Sheets OAuth2 API | Credential ini juga dipakai untuk memanggil Google Docs dan Drive. Aktifkan Google Sheets API, Google Docs API, dan Google Drive API di project Google Cloud yang sama. |

Perhatikan shard pooler (`aws-0` atau `aws-1`). Kalau salah, n8n menampilkan "Host not found", bukan pesan yang menyebut tenant atau user.

### 3. Isi placeholder di file workflow

Workflow tidak memakai `$env.*`, karena instance n8n yang dipakai menyalakan `N8N_BLOCK_ENV_ACCESS_IN_NODE`. Akibatnya beberapa nilai ditulis langsung di node. Di file export, nilai-nilai itu diganti placeholder. Cari dan ganti placeholder berikut di file JSON sebelum import:

| Placeholder | Ganti dengan | Ada di |
|---|---|---|
| `https://n8n.example.com` | URL publik instance n8n, tanpa garis miring di akhir | WF-01, WF-02 |
| `YOUR_TELEGRAM_BOT_TOKEN` | Token bot dari @BotFather | WF-01, WF-02, WF-03 |
| `YOUR_INTERNAL_SECRET` | String acak, misalnya hasil `openssl rand -hex 16` | Semua workflow |

`YOUR_INTERNAL_SECRET` dipakai sebagai nilai header `x-internal-secret` di node pemanggil dan sebagai pembanding di setiap node `Verify Secret`, jadi isinya harus sama di keempat workflow. WF-04 versi live juga menyimpan API key SerpAPI langsung di URL node `Get Google Trends`.

### 4. Import dan aktifkan

1. Import keempat file JSON.
2. Buka setiap workflow, lalu pasang credential di node yang ditandai merah.
3. Aktifkan dengan urutan WF-04, WF-02, WF-03, lalu WF-01 terakhir, karena WF-01 memanggil ketiga workflow lainnya.

Saat WF-01 diaktifkan, Telegram Trigger mendaftarkan webhook bot sendiri. Tidak perlu memanggil `setWebhook` manual. Satu bot hanya bisa punya satu webhook, jadi jangan pakai bot yang sama di workflow lain karena webhook WF-01 akan tertimpa. Webhook yang sedang aktif bisa dicek lewat `https://api.telegram.org/bot<token>/getWebhookInfo`.

### 5. Tes

1. Kirim `/start`. Tabel `users` harus punya baris dengan `telegram_id` akun kamu.
2. Kirim foto produk dengan caption `/analyze`. Tabel `products` terisi, dan tidak lama kemudian `keywords` juga terisi.
3. Kirim `/create`, lalu pilih 7 hari. `content_plans` dan `content_items` terisi, status plan berubah menjadi `done`, dan link spreadsheet terkirim ke chat.

## Troubleshooting

| Gejala | Penyebab yang pernah ditemukan |
|---|---|
| Node Postgres error "Host not found" | Project Supabase di-pause atau dihapus. Project free tier otomatis di-pause kalau lama tidak dipakai, dan bisa di-restore dari dashboard. Cek dengan `nslookup <project-ref>.supabase.co`; kalau hasilnya "Non-existent domain", masalahnya di project, bukan di n8n. Penyebab lain: shard pooler salah. |
| "access to env vars denied" | Ada node yang memakai `$env`. Ganti dengan nilai langsung. |
| `Create Plan Record` gagal dengan `content_plans_duration_days_check` | `duration_days` hanya boleh 7 atau 30. |
| Keyword cuma berupa variasi nama produk ("review", "murah", "harga ...") | SerpAPI tidak punya data Google Trends untuk produk yang kurang dikenal, jadi `Parse Trends` memakai fallback. |
| Isi plan atau skrip terasa generik | Groq utama dan cadangan sama-sama kena limit, sehingga workflow memakai template. |
| Workflow berhenti di `Verify Secret` | Nilai `x-internal-secret` di pemanggil berbeda dengan nilai di workflow tujuan. |

## Keamanan

Repo ini tidak menyimpan token, secret, atau API key. Simpan nilai aslinya di `.env.local`, yang sudah masuk `.gitignore`.

Export dari n8n berisi token bot dan secret dalam bentuk teks biasa. Setiap kali export ulang workflow ke folder ini, ganti dulu nilainya dengan placeholder sebelum commit.
