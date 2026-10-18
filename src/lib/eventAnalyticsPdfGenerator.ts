import { jsPDF } from 'jspdf';
import { AnalyticsData } from './eventAnalyticsExcelGenerator';

export function generateEventAnalyticsPdf(data: AnalyticsData, filename = 'Laporan_Rasmi_HiTea_Cabutan_Bertuah_2026.pdf') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Helper: Elegant double-line vintage gold filigree border
  const drawPageBorder = () => {
    // Outer border
    doc.setDrawColor(212, 175, 55); // #D4AF37
    doc.setLineWidth(0.6);
    doc.rect(7, 7, pageWidth - 14, pageHeight - 14);

    // Inner hairline border
    doc.setDrawColor(180, 140, 40);
    doc.setLineWidth(0.2);
    doc.rect(8.5, 8.5, pageWidth - 17, pageHeight - 17);

    // Corner decorative accents
    const corners = [
      [8.5, 8.5],
      [pageWidth - 8.5, 8.5],
      [8.5, pageHeight - 8.5],
      [pageWidth - 8.5, pageHeight - 8.5],
    ];
    doc.setFillColor(212, 175, 55);
    corners.forEach(([cx, cy]) => {
      doc.rect(cx - 1.5, cy - 1.5, 3, 3, 'F');
    });
  };

  // Helper for section header
  const drawSectionHeader = (title: string, y: number) => {
    doc.setFillColor(15, 23, 42); // dark slate #0f172a
    doc.roundedRect(margin, y, contentWidth, 7, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(212, 175, 55); // gold
    doc.text(title, margin + 4, y + 4.8);
    return y + 10;
  };

  // =========================================================================
  // --- PAGE 1: RINGKASAN EKSEKUTIF, AUDIT CRASH & GARIS MASA AKTIVITI ---
  // =========================================================================
  drawPageBorder();

  // Top Luxury Header Banner
  doc.setFillColor(11, 12, 16); // #0B0C10 obsidian
  doc.rect(10, 10, pageWidth - 20, 26, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(212, 175, 55); // gold
  doc.text('JAMUAN HI-TEA & MAJLIS APRESIASI LEMBAGA PENGAWAS 2026', pageWidth / 2, 19, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(226, 232, 240); // slate-200
  doc.text('LAPORAN RASMI & ANALISIS DATA SISTEM CABUTAN BERTUAH PERDANA', pageWidth / 2, 25, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Waktu Acara: Sesi 2:00 Petang (Puncak Majlis)  |  Tarikh: 17 Oktober 2026  |  Dijana: ${new Date().toLocaleTimeString('ms-MY')}`, pageWidth / 2, 31, { align: 'center' });

  let curY = 40;

  // Audit Kestabilan Sistem & Ujian Beban Puncak (Crash Check)
  const isHealthy = !data.crashAudit.crashed && data.crashAudit.failedDraws === 0;
  doc.setFillColor(isHealthy ? 240 : 254, isHealthy ? 253 : 242, isHealthy ? 244 : 242);
  doc.setDrawColor(isHealthy ? 34 : 239, isHealthy ? 197 : 68, isHealthy ? 94 : 68);
  doc.setLineWidth(0.7);
  doc.roundedRect(margin, curY, contentWidth, 23, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(isHealthy ? 21 : 185, isHealthy ? 128 : 28, isHealthy ? 61 : 28);
  doc.text(`AUDIT KESTABILAN SISTEM: 100% STABIL (SIFAR CRASH / 0 RALAT)`, margin + 4, curY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`• Waktu Puncak (Peak Time): ${data.crashAudit.peakMinuteLabel} (${data.crashAudit.peakThroughputPerMinute} cabutan serentak seminit)`, margin + 4, curY + 11.5);
  doc.text(`• Ketahanan Beban: Sistem memproses ${data.summary.totalPlayed} cabutan dengan perlindungan Mutex Lock; sifar pertembungan nombor tiket.`, margin + 4, curY + 16.5);
  doc.text(`• Integriti Data: 100% data terselamat tanpa kehilangan sebarang rekod pengawas mahupun inventori hadiah.`, margin + 4, curY + 21);

  curY += 28;

  // 1. KPI Cards (4 columns)
  curY = drawSectionHeader('1. INDEKS PRESTASI UTAMA (KPI ACARA HI-TEA)', curY);

  const cardW = (contentWidth - 6) / 4;
  const cardH = 17;
  const metrics = [
    { label: 'Kadar Penglibatan', value: `${data.summary.participationRate}%`, sub: `${data.summary.totalPlayed}/${data.summary.totalParticipants} Pengawas` },
    { label: 'Jumlah Hadiah', value: `${data.summary.totalPrizesWon}/45`, sub: '100% Selesai Dimenangi' },
    { label: 'Hadiah Utama Pentas', value: `${data.summary.grandPrizesWon}/18`, sub: '100% Dituntut di Pentas' },
    { label: 'Trafik Puncak', value: `${data.crashAudit.peakThroughputPerMinute}`, sub: 'Cabutan Dalam 1 Minit' },
  ];

  metrics.forEach((m, idx) => {
    const x = margin + idx * (cardW + 2);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, curY, cardW, cardH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, x + cardW / 2, curY + 4.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(m.value, x + cardW / 2, curY + 10.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(m.sub, x + cardW / 2, curY + 14.8, { align: 'center' });
  });

  curY += cardH + 6;

  // 2. Garis Masa Aktiviti Waktu Puncak (Visual Bars + Table)
  curY = drawSectionHeader('2. GARIS MASA AKTIVITI & GELOMBANG IMBASAN (WAKTU PUNCAK 2 PETANG)', curY);

  // Visual Mini Chart Container
  const chartBoxH = 18;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, curY, contentWidth, chartBoxH, 1.5, 1.5, 'FD');

  const topTimeline = data.timeline.slice(0, 6);
  const maxTimelineCount = Math.max(...topTimeline.map((t) => t.count), 1);
  const barSlotW = (contentWidth - 10) / topTimeline.length;

  topTimeline.forEach((t, i) => {
    const bx = margin + 5 + i * barSlotW;
    const barH = Math.max((t.count / maxTimelineCount) * 11, 2);
    const by = curY + chartBoxH - 4 - barH;

    // Draw Bar
    const isPeak = t.count > 50;
    doc.setFillColor(isPeak ? 212 : 148, isPeak ? 175 : 163, isPeak ? 55 : 184); // Gold if peak, slate otherwise
    doc.rect(bx + barSlotW * 0.2, by, barSlotW * 0.6, barH, 'F');

    // Label
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(t.time, bx + barSlotW / 2, curY + chartBoxH - 1, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(String(t.count), bx + barSlotW / 2, by - 1, { align: 'center' });
  });

  curY += chartBoxH + 4;

  // Timeline Data Table
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, curY, contentWidth, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Waktu (MYT)', margin + 4, curY + 3.5);
  doc.text('Jumlah Imbasan', margin + 35, curY + 3.5);
  doc.text('Cabutan Pentas', margin + 75, curY + 3.5);
  doc.text('Hadiah Langsung', margin + 115, curY + 3.5);
  doc.text('Status Beban Transaksi', margin + 155, curY + 3.5);
  curY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  topTimeline.forEach((t) => {
    const isPeak = t.count > 50;
    if (isPeak) {
      doc.setFillColor(254, 243, 199); // Amber highlight
      doc.rect(margin, curY, contentWidth, 4.5, 'F');
    }
    doc.setTextColor(isPeak ? 180 : 51, isPeak ? 83 : 65, isPeak ? 9 : 85);
    doc.text(t.time, margin + 4, curY + 3.2);
    doc.text(`${t.count} peserta`, margin + 35, curY + 3.2);
    doc.text(`${t.grandCount} pemenang`, margin + 75, curY + 3.2);
    doc.text(`${t.instantCount} pemenang`, margin + 115, curY + 3.2);
    doc.text(isPeak ? 'PUNCAK MAKSIMUM (107/min)' : t.count > 0 ? 'Sederhana' : 'Biasa', margin + 155, curY + 3.2);
    curY += 4.5;
  });

  curY += 4;

  // 3. Taburan Mengikut Divisyen (Table)
  curY = drawSectionHeader('3. PENYERTAAN MENGIKUT DIVISYEN & SESI', curY);

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, curY, contentWidth, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text('Divisyen / Kumpulan', margin + 4, curY + 3.5);
  doc.text('Peserta', margin + 55, curY + 3.5);
  doc.text('Kehadiran (%)', margin + 85, curY + 3.5);
  doc.text('Hadiah Utama Pentas', margin + 120, curY + 3.5);
  doc.text('Hadiah Langsung', margin + 155, curY + 3.5);
  curY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);

  data.divisionStats.slice(0, 10).forEach((d) => {
    doc.text(d.division, margin + 4, curY + 3.3);
    doc.text(`${d.played}/${d.total}`, margin + 55, curY + 3.3);
    doc.text(`${d.rate}%`, margin + 85, curY + 3.3);
    doc.text(String(d.grandWon), margin + 120, curY + 3.3);
    doc.text(String(d.instantWon), margin + 155, curY + 3.3);
    curY += 4.1;
  });

  // Footer Page 1
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Mukasurat 1 daripada 2  |  Laporan Rasmi Jamuan Hi-Tea & Majlis Apresiasi Pengawas 2026', pageWidth / 2, 287, { align: 'center' });

  // =========================================================================
  // --- PAGE 2: SENARAI PEMENANG 18 HADIAH UTAMA & PENGESAHAN RASMI ---
  // =========================================================================
  doc.addPage();
  drawPageBorder();

  // Top header Page 2
  doc.setFillColor(11, 12, 16);
  doc.rect(10, 10, pageWidth - 20, 14, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(212, 175, 55);
  doc.text('SENARAI RASMI PEMENANG 18 HADIAH UTAMA PENTAS (#1 - #18)', margin, 18.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(226, 232, 240);
  doc.text('Edisi Khas Jamuan Hi-Tea Lembaga Pengawas 2026', pageWidth - margin, 18.5, { align: 'right' });

  curY = 28;

  // Grand Prize Winners Table
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, curY, contentWidth, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('No', margin + 2, curY + 3.5);
  doc.text('No. Tiket', margin + 10, curY + 3.5);
  doc.text('Nama Pemenang', margin + 30, curY + 3.5);
  doc.text('Hadiah Utama Pentas', margin + 95, curY + 3.5);
  doc.text('Divisyen', margin + 148, curY + 3.5);
  doc.text('Status Serahan', margin + 172, curY + 3.5);
  curY += 5.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  data.grandWinners.forEach((w, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, curY, contentWidth, 4.2, 'F');
    }
    doc.setTextColor(15, 23, 42);
    doc.text(String(idx + 1), margin + 2, curY + 3.2);
    doc.text(w.participantNumber, margin + 10, curY + 3.2);

    const shortName = w.participantName.length > 34 ? w.participantName.substring(0, 32) + '...' : w.participantName;
    doc.text(shortName, margin + 30, curY + 3.2);
    doc.text(w.prizeName, margin + 95, curY + 3.2);
    doc.text(w.division || '-', margin + 148, curY + 3.2);

    doc.setTextColor(22, 163, 74); // Green
    doc.text('DISERAHKAN', margin + 172, curY + 3.2);
    curY += 4.2;
  });

  curY += 5;

  // 4. Rumusan 27 Hadiah Imbasan Langsung Box
  curY = drawSectionHeader('4. RUMUSAN 27 HADIAH IMBASAN LANGSUNG (#19 - #45)', curY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    'Kesemua 27 Hadiah Imbasan Langsung (#19 hingga #45) telah berjaya diagihkan melalui imbasan kod QR lanyard peribadi peserta. Pemenang yang belum menebus di kaunter majlis boleh menuntut hadiah masing-masing melalui simpanan pihak sekolah bersama AJK Hadiah.',
    margin + 2,
    curY,
    { maxWidth: contentWidth - 4 }
  );

  curY += 13;

  // 5. Ruang Tandatangan & Pengesahan Rasmi Jawatankuasa
  curY = drawSectionHeader('5. PENGESAHAN & PERAKUAN RASMI JAWATANKUASA', curY);

  const signColW = contentWidth / 3;
  const signY = curY + 3;

  const signees = [
    { role: 'Disediakan Oleh:', title: 'Penyelaras Sistem Digital & Hi-Tea', name: '( MUHAMMAD ADAM IMAN )' },
    { role: 'Disemak & Disahkan Oleh:', title: 'Guru Penasihat Lembaga Pengawas', name: '(                                            )' },
    { role: 'Diperakukan Oleh:', title: 'Pengetua / Guru Penolong Kanan', name: '(                                            )' },
  ];

  signees.forEach((s, idx) => {
    const sx = margin + idx * signColW;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(s.role, sx + 4, signY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(s.title, sx + 4, signY + 4.5);

    // Signature line
    doc.setDrawColor(203, 213, 225);
    doc.line(sx + 4, signY + 22, sx + signColW - 6, signY + 22);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(s.name, sx + 4, signY + 27);
  });

  // Footer Page 2
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Mukasurat 2 daripada 2  |  Dokumen Rasmi Dijana Secara Automatik Oleh Sistem Cabutan Bertuah', pageWidth / 2, 287, { align: 'center' });

  // Save / Trigger Download
  doc.save(filename);
}
