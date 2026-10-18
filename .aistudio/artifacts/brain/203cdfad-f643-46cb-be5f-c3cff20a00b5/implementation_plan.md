# Modul Analitik Acara & Laporan Pasca-Acara Rasmi (Sesi 2 Petang)

Pelan komprehensif bagi membina hab Analitik Acara secara mendalam berdasarkan data sebenar penggunaan rasmi sekitar jam 2:00 petang tadi (123 penyertaan aktif, 45 hadiah diagihkan, dan 18 Hadiah Utama pentas), dilengkapi graf garis masa aktiviti minit-demi-minit, penapis masa dinamik, metrik tuntutan hadiah AJK, pecahan divisyen, serta penjana laporan PDF profesional dan muat turun Excel (CSV/XLSX).

### User Review & Critical Decisions

> [!IMPORTANT]
> Berdasarkan jawapan anda dalam sesi soal jawab fasa perancangan, semua pilihan reka bentuk telah disahkan seperti berikut:

- **Confirmed Decision 1 (Format & Penempatan)**: Menyediakan butang dan panel laporan analitik yang membolehkan muat turun rasmi dalam format **PDF Rasmi (berformat cetakan rasmi sekolah)** dan **Lembaran Kerja Excel/CSV**. Turut disepadukan sebagai butang khas *"Laporan & Analitik Acara"* di Papan Pemuka Admin dan Pentas.
- **Confirmed Decision 2 (Metrik Utama 2:00 Petang)**:
  1. *Garis Masa Aktiviti & Puncak Imbasan (Peak Traffic)*: Analisis terperinci gelombang imbasan tiket peserta pada waktu puncak (2:00 PM – 3:30 PM).
  2. *Statistik Tuntutan Hadiah & Kaunter AJK*: Nisbah hadiah yang telah dituntut (Claimed) berbanding belum dituntut (Unclaimed) serta pengesahan serahan sekolah.
  3. *Pecahan Mengikut Divisyen & Sesi*: Peratusan penglibatan Divisyen 1 hingga 10 dan Sesi Pagi vs Sesi Petang.
  4. *Perbandingan Kelajuan Cabutan*: Purata masa cabutan imbasan langsung peserta (QR Lanyard) berbanding cabutan pentas utama oleh pengacara.
- **Confirmed Decision 3 (Visualisasi Garis Masa)**: Menyertakan graf interaktif garis masa minit-demi-minit dengan penapis julat masa (slider / time-filter) untuk mengasingkan lonjakan trafik pada waktu puncak 2:00 petang.

---

### 1. Overview & Core Concept

- **What It Does**: Memproses keseluruhan rekod data peserta sebenar (130 peserta berdaftar, rekod `playedAt`, `stageDrawAt`, dan `claimedAt`) untuk menghasilkan rumusan eksekutif pasca-acara yang jitu. Pentadbir dan pihak pengurusan sekolah boleh melihat analisis digital secara langsung serta menjana dokumen laporan PDF satu-klik yang kemas untuk rekod fail rasmi sekolah dan fail Excel untuk audit inventori hadiah.
- **Target Audience / Persona**: Penyelaras Majlis Apresiasi, Jawatankuasa Cabutan Bertuah & Hadiah (AJK Hadiah), Pengetua/Guru Penolong Kanan, dan Lembaga Pengawas Sekolah.
- **Key Value**: Menghapuskan keperluan menyusun laporan manual selepas majlis berakhir; menyediakan bukti audit ketelusan cabutan bertuah dengan data masa tepat (timestamped audit trail) dan statistik penglibatan warga majlis.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. *Akses Laporan*: Pentadbir klik butang baharu **"Analitik & Laporan Acara"** di bahagian atas Papan Pemuka Admin atau bar kawalan.
  2. *Paparan Visual Interaktif*:
     - **Kad Ringkasan Eksekutif**: Kadar Penyertaan (94.6%), Jumlah Hadiah Menang (45/45), Hadiah Dituntut (100% Hadiah Utama Pentas dituntut), Waktu Puncak (2:08 PM - 2:18 PM).
     - **Graf Garis Masa Interaktif (Interactive Activity Timeline)**: Carta garis & bar SVG berkepadatan tinggi yang memaparkan bilangan imbasan tiket setiap selang 5 minit dari jam 2:00 PM hingga 3:30 PM. Pengguna boleh menggerakkan kursor untuk melihat masa tepat dan nama peserta pada detik tersebut.
     - **Penapis Julat Masa (Time Window Filter)**: Butang pilihan pantas (`Semua Waktu`, `Puncak 2:00 PM - 2:30 PM`, `Cabutan Pentas Utama`) untuk memfokuskan analisis.
     - **Pecahan Penglibatan & Hadiah**: Carta agihan mengikut Divisyen 1–10 dan status serahan Kaunter Hadiah AJK.
  3. *Eksport Satu-Klik*:
     - Butang **"Muat Turun Laporan PDF Rasmi"**: Menjana dokumen PDF bergaya korporat sekolah lengkap dengan kepala surat, carta ringkasan grafik, senarai pemenang Hadiah Utama (#1 - #18), dan tandatangan pengesahan.
     - Butang **"Eksport Data Excel (CSV/XLSX)"**: Menghasilkan fail data tabular yang merangkumi setiap peserta, masa imbasan, nombor tiket, hadiah dimenangi, dan status tuntutan.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Dark gold & charcoal executive analytics suite — selaras dengan tema mewah Majlis Apresiasi Lembaga Pengawas Sekolah.
  - *Color Palette*:
    - Background: Deep obsidian neutral (`#0B0C10` & `#13151B`).
    - Surfaces: Subdued dark slate panels dengan garis sempadan halus (`border-amber-400/20` & `border-slate-800`).
    - Accents: Emas diraja (`#D4AF37` / `text-amber-400`) untuk penunjuk utama, hijau zamrud (`text-emerald-400`) untuk status selesai/dituntut, dan biru fajar (`text-sky-400`) untuk graf garis masa.
  - *Typography*:
    - Tajuk & Penunjuk Utama: `Cinzel` & `Plus Jakarta Sans` berbobot teguh.
    - Metrik & Masa: `font-mono tabular-nums` bagi memastikan keseragaman visual tanpa jitter nombor.
  - *Anti-Slop Discipline*: Tiada pil status berlapis atau hiasan berbintik-bintik rambang. Semua metadata dibentangkan secara kemas dengan pemisah tipografi bersih.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Penggunaan Data Sebenar Tanpa Mengganggu Rekod Semasa**
  - *Chosen Approach*: Membina enjin pengiraan analitik khusus di klien dan pelayan (`/api/admin/analytics`) yang memproses dokumen Firestore sedia ada secara *read-only*.
  - *Why*: Memastikan tiada risiko data peserta atau status hadiah sedia ada diubah atau dipadamkan secara tidak sengaja.
- **Decision 2: Carta Interaktif Menggunakan Enjin Vektor SVG Kendiri (Zero Heavyweight Libraries)**
  - *Chosen Approach*: Membina komponen carta garis masa SVG reaktif dengan interpolasi lengkung lembut dan tooltip interaktif berasaskan data sebenar.
  - *Why*: Sangat pantas dimuatkan, tiada konflik dependensi dengan React 19, tajam pada sebarang resolusi skrin (Retina), dan boleh ditukar kepada imej vektor untuk disertakan terus ke dalam fail PDF.
- **Decision 3: Format Eksport Dwi-Saluran (PDF Berformat Lengkap + Excel Tabular)**
  - *Chosen Approach*: Menggunakan `jspdf` untuk menyusun fail PDF laporan pasca-acara pelbagai muka surat yang siap sedia untuk dicetak, serta fungsi penjanaan CSV/Excel bertanda UTF-8 BOM untuk sokongan sempurna abjad Melayu dan aksara nama khas di Microsoft Excel.
  - *Why*: Memenuhi keperluan formal pihak pentadbiran sekolah untuk dokumentasi bercetak dan analisa data lanjut.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FIRESTORE DATABASE                              │
│   collections: /participants (130 docs) & /prizes (45 docs)            │
│   fields: playedAt, stageDrawAt, claimedAt, prizeName, division, etc.   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       EXPRESS BACKEND SERVER                           │
│   Endpoint: GET /api/admin/analytics                                   │
│   - Calculates: Peak timeline bins (5-min intervals)                   │
│   - Computes: Claim velocity (Instant QR vs Main Stage Draw)           │
│   - Aggregates: Division engagement & prize audit logs                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
┌───────────────────────────────────┐ ┌───────────────────────────────────┐
│        UI ANALYTICS VIEW          │ │       EXPORT ENGINES              │
│  - Timeline Activity Chart (SVG)  │ │  1. PDF Generator (jsPDF)         │
│  - Peak 2 PM Slider & Inspector   │ │     - Formal School Header        │
│  - Prize & Division Metrics       │ │     - Timestamp Audit Summary     │
│  - Modal / Dedicated Tab in Admin │ │  2. Excel/CSV Data Generator      │
└───────────────────────────────────┘ └───────────────────────────────────┘
```

- **Data Entities & Aggregation**:
  - `hourlyActivityBins`: Pengelompokan data imbasan mengikut selang masa 5–10 minit (cth: 2:00 PM, 2:10 PM, 2:15 PM...) untuk mendedahkan masa puncak sebenar.
  - `stageVsInstantMetrics`: Purata masa dan pecahan pemenang pentas (18 Hadiah Utama) berbanding imbasan terus (27 Hadiah Langsung).
  - `divisionDistribution`: Nisbah kehadiran dan peratusan kemenangan setiap divisi (Divisyen 1 hingga Divisyen 10).
  - `auditTrailList`: Rekod kronologi terperinci siap sedia untuk dieksport.

- **Component Mapping**:
  - `src/components/EventAnalyticsModal.tsx`: Komponen modal antaramuka penuh yang memuatkan carta visual, garis masa interaktif, penapis julat masa, dan butang eksport.
  - `src/lib/eventAnalyticsPdfGenerator.ts`: Penjana dokumen PDF rasmi laporan acara dengan format elegan.
  - `src/lib/eventAnalyticsExcelGenerator.ts`: Penjana fail Excel/CSV tabular dengan kod pengekodan UTF-8 BOM.
  - `server.ts`: Endpoint `/api/admin/analytics` untuk mengagregatkan data dengan pantas.
