import { jsPDF } from 'jspdf';
import { AjkMember } from '../types';

export interface AjkPdfGenerationOptions {
  theme: 'vintage-dorsett' | 'pure-vintage' | 'minimal-bw';
  layout?: 'grid-a4' | 'single-card';
  customBgUrl?: string | null;
  onProgress?: (current: number, total: number, message: string) => void;
  fileName?: string;
}

// Helper to load an image element
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
};

// Helper to draw rounded rectangle on canvas
const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill = true,
  stroke = false
) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
};

/**
 * Draws an ornate vintage filigree flourish divider
 */
const drawVintageFlourish = (ctx: CanvasRenderingContext2D, cx: number, cy: number, width: number, color: string) => {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;

  const half = width / 2;

  // Left curve
  ctx.beginPath();
  ctx.moveTo(cx - half, cy);
  ctx.bezierCurveTo(cx - half * 0.5, cy - 6, cx - half * 0.2, cy + 6, cx - 14, cy);
  ctx.stroke();

  // Right curve
  ctx.beginPath();
  ctx.moveTo(cx + half, cy);
  ctx.bezierCurveTo(cx + half * 0.5, cy - 6, cx + half * 0.2, cy + 6, cx + 14, cy);
  ctx.stroke();

  // Center diamond emblem
  ctx.beginPath();
  ctx.moveTo(cx, cy - 6);
  ctx.lineTo(cx + 6, cy);
  ctx.lineTo(cx, cy + 6);
  ctx.lineTo(cx - 6, cy);
  ctx.closePath();
  ctx.fill();

  // Small dots
  ctx.beginPath();
  ctx.arc(cx - 10, cy, 2, 0, Math.PI * 2);
  ctx.arc(cx + 10, cy, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};

/**
 * Renders a single AJK ID card onto a 600x1020 high-resolution canvas
 */
export const renderAjkCardToCanvas = async (
  member: AjkMember,
  theme: 'vintage-dorsett' | 'pure-vintage' | 'minimal-bw',
  bgImg: HTMLImageElement | null
): Promise<HTMLCanvasElement> => {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 1020;
  const ctx = canvas.getContext('2d')!;

  const isBw = theme === 'minimal-bw';

  // 1. Draw Background
  if (theme === 'vintage-dorsett' && bgImg) {
    ctx.drawImage(bgImg, 0, 0, 600, 1020);
    // Subtle warm brightening overlay in center area for maximum readability
    const centerGrad = ctx.createRadialGradient(300, 520, 50, 300, 520, 380);
    centerGrad.addColorStop(0, 'rgba(255, 250, 240, 0.45)');
    centerGrad.addColorStop(0.7, 'rgba(255, 248, 235, 0.15)');
    centerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = centerGrad;
    ctx.fillRect(0, 0, 600, 1020);
  } else if (theme === 'pure-vintage') {
    // Rich aged warm parchment texture
    const bgGrad = ctx.createLinearGradient(0, 0, 600, 1020);
    bgGrad.addColorStop(0, '#f4ece1');
    bgGrad.addColorStop(0.5, '#eee0cc');
    bgGrad.addColorStop(1, '#e3d0b5');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 600, 1020);

    // Ornate double border
    ctx.strokeStyle = '#8c6721';
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, 560, 980);
    ctx.strokeStyle = '#b89445';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(28, 28, 544, 964);
  } else {
    // Minimal B&W (Eco-Print)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 600, 1020);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(18, 18, 564, 984);
  }

  // 2. Punch Hole / Lanyard Slot Guide
  ctx.save();
  ctx.strokeStyle = isBw ? '#94a3b8' : 'rgba(140, 103, 33, 0.4)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  drawRoundedRect(ctx, 270, 16, 60, 14, 7, false, true);
  ctx.restore();

  // Color Palette Definitions
  const primaryTextColor = isBw ? '#0f172a' : '#2b190a';
  const headerSubtitleColor = isBw ? '#334155' : '#4a331c';
  const roleColor = isBw ? '#020617' : '#2a1708';
  const nameColor = isBw ? '#0f172a' : '#1f1005';
  const classColor = isBw ? '#475569' : '#3e2714';
  const footerColor = isBw ? '#334155' : '#4a341e';
  const flourishColor = isBw ? '#64748b' : '#8c6721';

  ctx.textAlign = 'center';

  // 3. Header Section (MAJLIS APRESIASI LEMBAGA PENGAWAS SEKOLAH SMKBSP)
  // "M A J L I S   A P R E S I A S I"
  ctx.fillStyle = headerSubtitleColor;
  ctx.font = 'bold 20px "Cinzel", "Times New Roman", Georgia, serif';
  ctx.letterSpacing = '5px';
  ctx.fillText('MAJLIS APRESIASI', 300, 88);

  // "Lembaga Pengawas" (Script Calligraphy Style)
  ctx.fillStyle = primaryTextColor;
  ctx.font = 'italic bold 44px "Playfair Display", "Georgia", serif';
  ctx.letterSpacing = '1px';
  ctx.fillText('Lembaga Pengawas', 300, 142);

  // "SEKOLAH"
  ctx.fillStyle = primaryTextColor;
  ctx.font = 'bold 30px "Cinzel", "Times New Roman", Georgia, serif';
  ctx.letterSpacing = '4px';
  ctx.fillText('SEKOLAH', 300, 182);

  // "SMK BANDAR SERI PUTRA"
  ctx.fillStyle = headerSubtitleColor;
  ctx.font = 'bold 18px "Cinzel", "Times New Roman", Georgia, serif';
  ctx.letterSpacing = '3px';
  ctx.fillText('SMK BANDAR SERI PUTRA', 300, 218);

  // Header Divider
  drawVintageFlourish(ctx, 300, 246, 200, flourishColor);

  // 4. Middle Section — Prominent AJK Role Title
  const roleY = 380;
  ctx.fillStyle = roleColor;
  ctx.letterSpacing = '3px';

  // Format Role text (handle multi-line if needed)
  const roleText = member.role.trim().toUpperCase();
  if (roleText.length > 15 || roleText.includes('&')) {
    // Two-line role
    const parts = roleText.split('&');
    if (parts.length === 2) {
      ctx.font = 'bold 36px "Cinzel", "Times New Roman", Georgia, serif';
      ctx.fillText(parts[0].trim() + ' &', 300, roleY - 20);
      ctx.fillText(parts[1].trim(), 300, roleY + 26);
    } else {
      ctx.font = 'bold 34px "Cinzel", "Times New Roman", Georgia, serif';
      ctx.fillText(roleText, 300, roleY);
    }
  } else {
    // Single line prominent role
    ctx.font = 'bold 40px "Cinzel", "Times New Roman", Georgia, serif';
    ctx.fillText(roleText, 300, roleY);
  }

  // Decorative Ornament Flourish below role
  drawVintageFlourish(ctx, 300, 448, 240, flourishColor);

  // 5. Member Full Name
  ctx.fillStyle = nameColor;
  ctx.letterSpacing = '0.5px';

  const name = member.name.trim();
  const nameParts = name.split(' ');

  if (name.length > 24) {
    // Split long name onto 2 lines cleanly
    let line1 = '';
    let line2 = '';
    const mid = Math.ceil(nameParts.length / 2);
    line1 = nameParts.slice(0, mid).join(' ');
    line2 = nameParts.slice(mid).join(' ');

    ctx.font = 'bold 28px "Georgia", "Times New Roman", serif';
    ctx.fillText(line1, 300, 545);
    ctx.fillText(line2, 300, 585);

    // Class Name below
    ctx.fillStyle = classColor;
    ctx.font = 'italic 24px "Georgia", serif';
    ctx.fillText(member.className, 300, 635);
  } else {
    // Single line name
    ctx.font = 'bold 32px "Georgia", "Times New Roman", serif';
    ctx.fillText(name, 300, 560);

    // Class Name below
    ctx.fillStyle = classColor;
    ctx.font = 'italic 24px "Georgia", serif';
    ctx.fillText(member.className, 300, 608);
  }

  // Small bottom diamond flourish
  ctx.save();
  ctx.fillStyle = flourishColor;
  ctx.beginPath();
  ctx.moveTo(300, 680);
  ctx.lineTo(306, 686);
  ctx.lineTo(300, 692);
  ctx.lineTo(294, 686);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 6. Footer Section (Date & Venue)
  const footerY = 930;
  ctx.fillStyle = footerColor;
  ctx.font = 'bold 17px "Cinzel", "Times New Roman", Georgia, serif';
  ctx.letterSpacing = '4px';
  ctx.fillText(member.date || '17 OKTOBER 2026', 300, footerY);

  ctx.font = 'bold 17px "Cinzel", "Times New Roman", Georgia, serif';
  ctx.letterSpacing = '3px';
  ctx.fillText(member.venue || 'DORSETT PUTRAJAYA', 300, footerY + 30);

  return canvas;
};

/**
 * Generates the complete AJK ID Card PDF
 */
export const generateAjkPdf = async (
  members: AjkMember[],
  options: AjkPdfGenerationOptions
): Promise<void> => {
  const {
    theme = 'vintage-dorsett',
    layout = 'grid-a4',
    customBgUrl,
    onProgress,
    fileName = 'Pas_ID_AJK_Majlis_Apresiasi_SMKBSP_2026.pdf',
  } = options;

  const total = members.length;
  if (total === 0) return;

  onProgress?.(0, total, 'Memuatkan templat rasmi kad ID AJK...');

  // Pre-load background image if needed
  let bgImg: HTMLImageElement | null = null;
  if (theme === 'vintage-dorsett') {
    try {
      const bgSrc = customBgUrl || '/lanyard-template.jpg';
      bgImg = await loadImage(bgSrc);
    } catch (e) {
      console.warn('Failed to load vintage background image, using pure vintage style:', e);
    }
  }

  // ==========================================
  // MODE 1: GRID A4 (3 Kolum x 3 Baris = 9 Kad per A4)
  // ==========================================
  if (layout === 'grid-a4') {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const cardWidth = 50;
    const cardHeight = 85;
    const cols = 3;
    const rows = 3;
    const cardsPerPage = cols * rows; // 9 cards per A4 page

    const gapX = 6;
    const gapY = 5;

    const totalGridWidth = cols * cardWidth + (cols - 1) * gapX; // 162 mm
    const startX = (210 - totalGridWidth) / 2; // 24 mm
    const startY = 16; // Top margin

    const totalPages = Math.ceil(total / cardsPerPage);

    for (let i = 0; i < total; i++) {
      const member = members[i];
      const pageIndex = Math.floor(i / cardsPerPage);
      const cardIndexOnPage = i % cardsPerPage;

      onProgress?.(
        i + 1,
        total,
        `Menjana kad AJK ${i + 1} / ${total}: ${member.role} — ${member.name.slice(0, 20)}...`
      );

      if (i > 0 && cardIndexOnPage === 0) {
        pdf.addPage('a4', 'portrait');
      }

      // Page header
      if (cardIndexOnPage === 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        pdf.setTextColor(60, 45, 25);
        pdf.text(
          `MAJLIS APRESIASI PENGAWAS SMK BANDAR SERI PUTRA — KAD ID AJK (Muka Surat ${
            pageIndex + 1
          } / ${totalPages})`,
          105,
          9,
          { align: 'center' }
        );

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(120, 100, 75);
        pdf.text(
          'Ukuran Pas: 50mm × 85mm. Potong mengikut garis panduan. Cetak pada skala 100% (Actual Size).',
          105,
          13,
          { align: 'center' }
        );
      }

      const col = cardIndexOnPage % cols;
      const row = Math.floor(cardIndexOnPage / cols);

      const x = startX + col * (cardWidth + gapX);
      const y = startY + row * (cardHeight + gapY);

      // Render high-res canvas
      const canvas = await renderAjkCardToCanvas(member, theme, bgImg);
      const cardDataUrl = canvas.toDataURL('image/jpeg', 0.94);

      // Embed image into PDF
      pdf.addImage(cardDataUrl, 'JPEG', x, y, cardWidth, cardHeight, undefined, 'FAST');

      // Subtle cutting guideline around each card
      pdf.setDrawColor(180, 160, 130);
      pdf.setLineWidth(0.15);
      pdf.rect(x, y, cardWidth, cardHeight);

      // Cutting guide ticks
      pdf.setDrawColor(120, 100, 70);
      pdf.setLineWidth(0.2);
      const tick = 2.5;
      pdf.line(x - tick, y, x, y);
      pdf.line(x, y - tick, x, y);
      pdf.line(x + cardWidth, y - tick, x + cardWidth, y);
      pdf.line(x + cardWidth + tick, y, x + cardWidth, y);
      pdf.line(x - tick, y + cardHeight, x, y + cardHeight);
      pdf.line(x, y + cardHeight, x, y + cardHeight + tick);
      pdf.line(x + cardWidth, y + cardHeight + tick, x + cardWidth, y + cardHeight);
      pdf.line(x + cardWidth + tick, y + cardHeight, x + cardWidth, y + cardHeight);
    }

    onProgress?.(total, total, 'Menyimpan dan memuat turun fail PDF...');
    pdf.save(fileName);
    return;
  }

  // ==========================================
  // MODE 2: SINGLE-CARD (1 Kad Per Muka Surat, Format Pas Individu)
  // ==========================================
  const cardWidthMm = 70;
  const cardHeightMm = 119; // Standard 70mm x 119mm ratio matching 600x1020

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [cardWidthMm, cardHeightMm],
  });

  for (let i = 0; i < total; i++) {
    const member = members[i];

    onProgress?.(
      i + 1,
      total,
      `Menjana kad AJK ${i + 1} / ${total}: ${member.role} — ${member.name.slice(0, 20)}...`
    );

    if (i > 0) {
      pdf.addPage([cardWidthMm, cardHeightMm], 'portrait');
    }

    const canvas = await renderAjkCardToCanvas(member, theme, bgImg);
    const cardDataUrl = canvas.toDataURL('image/jpeg', 0.95);

    pdf.addImage(cardDataUrl, 'JPEG', 0, 0, cardWidthMm, cardHeightMm, undefined, 'FAST');
  }

  onProgress?.(total, total, 'Menyimpan dan memuat turun fail PDF...');
  pdf.save(fileName);
};
