import { jsPDF } from 'jspdf';
import { Participant } from '../types';

export type LanyardLayout = 'fit-20-sheets' | 'large-4' | 'xlarge-2' | 'single' | 'compact-9';

export interface PdfGenerationOptions {
  theme: 'canva-vintage' | 'pure-vintage' | 'minimal-bw';
  layout?: LanyardLayout;
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
 * Renders a single lanyard card (600x1020 high-res canvas) with an enlarged, high-contrast QR code
 */
const renderCardToCanvas = async (
  p: Participant,
  qrDataUrl: string,
  theme: 'canva-vintage' | 'pure-vintage' | 'minimal-bw',
  bgImg: HTMLImageElement | null
): Promise<HTMLCanvasElement> => {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 1020;
  const ctx = canvas.getContext('2d')!;

  const divNum = parseInt((p.division || '').replace(/\D/g, ''), 10) || 1;
  const sessionText = p.session || (divNum <= 4 ? 'Sesi Pagi' : 'Sesi Petang');
  const isPagi = sessionText === 'Sesi Pagi';

  // 1. Draw Background
  if (theme === 'canva-vintage' && bgImg) {
    ctx.drawImage(bgImg, 0, 0, 600, 1020);
    // Subtle darkening vignette for contrast
    ctx.fillStyle = 'rgba(15, 8, 4, 0.18)';
    ctx.fillRect(0, 0, 600, 1020);
  } else if (theme === 'pure-vintage') {
    // Elegant warm dark parchment
    const bgGrad = ctx.createLinearGradient(0, 0, 600, 1020);
    bgGrad.addColorStop(0, '#1c130b');
    bgGrad.addColorStop(0.5, '#2b1a10');
    bgGrad.addColorStop(1, '#150c07');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 600, 1020);

    // Ornate double border
    ctx.strokeStyle = '#c49b45';
    ctx.lineWidth = 4;
    ctx.strokeRect(18, 18, 564, 984);
    ctx.strokeStyle = '#e7cf93';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(26, 26, 548, 968);
  } else {
    // Minimal B&W (Eco-print)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 600, 1020);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.strokeRect(16, 16, 568, 988);
  }

  // 2. Punch Hole / Lanyard Slot Guide
  ctx.save();
  ctx.strokeStyle = theme === 'minimal-bw' ? '#94a3b8' : 'rgba(231, 207, 147, 0.45)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  drawRoundedRect(ctx, 270, 16, 60, 14, 7, false, true);
  ctx.restore();

  // 3. Header Typography
  if (theme === 'minimal-bw') {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('MAJLIS APRESIASI', 300, 72);

    ctx.font = 'bold 28px Georgia, serif';
    ctx.fillText('LEMBAGA PENGAWAS', 300, 108);

    ctx.font = 'bold 17px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('SMK BANDAR SERI PUTRA', 300, 138);

    // Divider
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(100, 156);
    ctx.lineTo(500, 156);
    ctx.stroke();
  } else {
    // Luxury Gold / Canva Typography
    ctx.textAlign = 'center';

    // "MAJLIS APRESIASI"
    ctx.fillStyle = '#ecd599';
    ctx.font = 'bold 21px Cinzel, "Times New Roman", Georgia, serif';
    ctx.letterSpacing = '4px';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fillText('MAJLIS APRESIASI', 300, 74);

    // "Lembaga Pengawas"
    ctx.fillStyle = '#fae9be';
    ctx.font = 'italic bold 34px "Playfair Display", Georgia, serif';
    ctx.letterSpacing = '1px';
    ctx.fillText('Lembaga Pengawas', 300, 114);

    // "Sekolah"
    ctx.fillStyle = '#e7cf93';
    ctx.font = 'bold 24px "Playfair Display", Georgia, serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('SEKOLAH', 300, 148);

    // School Name
    ctx.fillStyle = '#dfc488';
    ctx.font = 'bold 17px Cinzel, "Times New Roman", Georgia, serif';
    ctx.letterSpacing = '3px';
    ctx.fillText('SMK BANDAR SERI PUTRA', 300, 178);

    // Ornate gold line divider
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    const dividerGrad = ctx.createLinearGradient(120, 0, 480, 0);
    dividerGrad.addColorStop(0, 'rgba(212, 175, 55, 0)');
    dividerGrad.addColorStop(0.5, 'rgba(231, 207, 147, 0.9)');
    dividerGrad.addColorStop(1, 'rgba(212, 175, 55, 0)');
    ctx.strokeStyle = dividerGrad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(100, 196);
    ctx.lineTo(500, 196);
    ctx.stroke();

    ctx.fillStyle = '#ecd599';
    ctx.font = '15px serif';
    ctx.fillText('❦', 300, 201);
  }

  // 4. Center QR Code Frame (ENLARGED to 350x350 for crystal-clear scanning!)
  const qrBoxSize = 350;
  const qrBoxX = (600 - qrBoxSize) / 2; // 125
  const qrBoxY = 220;

  if (theme === 'minimal-bw') {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 20, true, true);
  } else {
    // White background card for 100% reliable camera scanner contrast
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;
    drawRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 22, true, false);

    // Gold rim border
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#c49b45';
    ctx.lineWidth = 4;
    drawRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 22, false, true);
  }

  // Draw QR code image (enlarged inside the box with 14px padding)
  if (qrDataUrl) {
    try {
      const qrImg = await loadImage(qrDataUrl);
      ctx.drawImage(qrImg, qrBoxX + 14, qrBoxY + 14, qrBoxSize - 28, qrBoxSize - 28);
    } catch (e) {
      ctx.fillStyle = '#334155';
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('QR Code', 300, qrBoxY + 175);
    }
  }

  // 5. Participant Number & Session Pills
  const pillY = 595;
  if (theme === 'minimal-bw') {
    // Number Pill
    ctx.fillStyle = '#0f172a';
    drawRoundedRect(ctx, 185, pillY, 105, 38, 19, true, false);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(p.participantNumber, 237, pillY + 26);

    // Session Pill
    ctx.fillStyle = '#f1f5f9';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, 305, pillY, 115, 38, 19, true, true);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(sessionText, 362, pillY + 25);
  } else {
    // Dark Gold Prefect No Pill
    ctx.fillStyle = 'rgba(25, 15, 8, 0.95)';
    ctx.strokeStyle = '#b88c38';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, 175, pillY, 115, 42, 21, true, true);

    ctx.fillStyle = '#f7e4b2';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(p.participantNumber, 232, pillY + 29);

    // Session Tag Pill
    ctx.fillStyle = isPagi ? 'rgba(70, 28, 5, 0.92)' : 'rgba(25, 20, 60, 0.92)';
    ctx.strokeStyle = isPagi ? '#d97706' : '#818cf8';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, 305, pillY, 125, 42, 21, true, true);

    ctx.fillStyle = isPagi ? '#fef08a' : '#e0e7ff';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText((isPagi ? '☀️ ' : '🌙 ') + sessionText, 367, pillY + 27);
  }

  // 6. Participant Full Name (Sharp, High Contrast, Wrapped if long)
  ctx.textAlign = 'center';
  const nameY = 665;
  const fullName = p.participantName.trim();

  // Smart multiline wrap for long Malay names
  const words = fullName.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    ctx.font = 'bold 28px "Playfair Display", Georgia, serif';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > 510 && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  if (theme === 'minimal-bw') {
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 26px "Playfair Display", Georgia, serif';
    if (lines.length === 1) {
      ctx.fillText(lines[0], 300, nameY + 20);
    } else {
      ctx.fillText(lines[0], 300, nameY + 5);
      ctx.fillText(lines.slice(1).join(' '), 300, nameY + 38);
    }
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.font = 'bold 28px "Playfair Display", Georgia, serif';

    if (lines.length === 1) {
      ctx.fillText(lines[0], 300, nameY + 20);
    } else {
      ctx.fillText(lines[0], 300, nameY + 5);
      ctx.font = 'bold 25px "Playfair Display", Georgia, serif';
      ctx.fillText(lines.slice(1).join(' '), 300, nameY + 40);
    }
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  // 7. Division / Role Badge (Class completely removed)
  const badgesY = 755;
  const divText = (p.division || '').trim().toUpperCase();

  if (divText) {
    if (theme === 'minimal-bw') {
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      const textMetrics = ctx.measureText(divText);
      const badgeWidth = Math.max(160, Math.min(320, textMetrics.width + 48));
      ctx.fillStyle = '#0f172a';
      drawRoundedRect(ctx, 300 - badgeWidth / 2, badgesY, badgeWidth, 36, 18, true, false);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(divText, 300, badgesY + 24);
    } else {
      ctx.font = 'bold 20px Cinzel, "Times New Roman", Georgia, serif';
      ctx.textAlign = 'center';
      const textMetrics = ctx.measureText(divText);
      const badgeWidth = Math.max(180, Math.min(340, textMetrics.width + 50));

      ctx.fillStyle = 'rgba(38, 22, 10, 0.95)';
      ctx.strokeStyle = '#c49b45';
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, 300 - badgeWidth / 2, badgesY, badgeWidth, 42, 21, true, true);

      ctx.fillStyle = '#fae9be';
      ctx.fillText(divText, 300, badgesY + 28);
    }
  }

  // 8. Card Footer: Date & Location
  const footerY = 940;
  if (theme === 'minimal-bw') {
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, footerY - 25);
    ctx.lineTo(520, footerY - 25);
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('17 OKTOBER 2026 • DORSETT PUTRAJAYA', 300, footerY);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('PAS RASMI CABUTAN BERTUAH', 300, footerY + 22);
  } else if (theme === 'canva-vintage') {
    ctx.strokeStyle = 'rgba(231, 207, 147, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(140, footerY - 30);
    ctx.lineTo(460, footerY - 30);
    ctx.stroke();

    // Diamond center star
    ctx.fillStyle = '#e5ce94';
    ctx.font = '15px serif';
    ctx.textAlign = 'center';
    ctx.fillText('✦', 300, footerY - 25);

    ctx.fillStyle = '#ecd7a1';
    ctx.font = 'bold 18px Cinzel, "Times New Roman", Georgia, serif';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1;
    ctx.textAlign = 'center';
    ctx.fillText('17 OKTOBER 2026', 300, footerY - 4);

    ctx.fillStyle = '#d6be83';
    ctx.font = 'bold 14px Cinzel, "Times New Roman", Georgia, serif';
    ctx.fillText('DORSETT PUTRAJAYA', 300, footerY + 18);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  } else {
    ctx.strokeStyle = 'rgba(231, 207, 147, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(90, footerY - 30);
    ctx.lineTo(510, footerY - 30);
    ctx.stroke();

    ctx.fillStyle = '#f3e1b7';
    ctx.font = 'bold 16px Cinzel, "Times New Roman", Georgia, serif';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1;
    ctx.textAlign = 'center';
    ctx.fillText('17 OKTOBER 2026 • DORSETT PUTRAJAYA', 300, footerY - 8);

    ctx.fillStyle = '#d4af37';
    ctx.font = '13px Cinzel, "Times New Roman", Georgia, serif';
    ctx.fillText('PAS RASMI MAJLIS APRESIASI', 300, footerY + 14);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  // 9. Outer Cutting Guide Outline
  ctx.strokeStyle = theme === 'minimal-bw' ? 'rgba(0, 0, 0, 0.15)' : 'rgba(231, 207, 147, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, 600, 1020);

  return canvas;
};

/**
 * Renders a horizontal lanyard card (880x660 high-res canvas) with an enlarged 42mm QR code
 * Specially designed to fit 8 cards per A4 (130 cards = 17 pages <= 20 sheets of paper!)
 */
export const renderHorizontalCardToCanvas = async (
  p: Participant,
  qrDataUrl: string,
  theme: 'canva-vintage' | 'pure-vintage' | 'minimal-bw',
  bgImg: HTMLImageElement | null
): Promise<HTMLCanvasElement> => {
  const canvas = document.createElement('canvas');
  canvas.width = 880;
  canvas.height = 660;
  const ctx = canvas.getContext('2d')!;

  const divNum = parseInt((p.division || '').replace(/\D/g, ''), 10) || 1;
  const sessionText = p.session || (divNum <= 4 ? 'Sesi Pagi' : 'Sesi Petang');
  const isPagi = sessionText === 'Sesi Pagi';
  const isBw = theme === 'minimal-bw';

  // 1. Draw Background
  if (theme === 'canva-vintage' && bgImg) {
    ctx.drawImage(bgImg, 0, 0, 880, 660);
    ctx.fillStyle = 'rgba(15, 8, 4, 0.22)';
    ctx.fillRect(0, 0, 880, 660);
  } else if (theme === 'pure-vintage' || theme === 'canva-vintage') {
    const bgGrad = ctx.createLinearGradient(0, 0, 880, 660);
    bgGrad.addColorStop(0, '#1c130b');
    bgGrad.addColorStop(0.5, '#2b1a10');
    bgGrad.addColorStop(1, '#150c07');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 880, 660);

    // Ornate gold border
    ctx.strokeStyle = '#c49b45';
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, 848, 628);
    ctx.strokeStyle = '#e7cf93';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(24, 24, 832, 612);
  } else {
    // Minimal B&W (Eco)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 880, 660);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.strokeRect(14, 14, 852, 632);
  }

  // 2. Punch hole / Lanyard slot at top center
  ctx.save();
  ctx.strokeStyle = isBw ? '#94a3b8' : 'rgba(231, 207, 147, 0.5)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  drawRoundedRect(ctx, 410, 14, 60, 14, 7, false, true);
  ctx.restore();

  // 3. Left Side: Massive High-Contrast QR Code
  const qrBoxX = 40;
  const qrBoxY = 60;
  const qrBoxSize = 380;

  if (isBw) {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 18, true, true);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
    drawRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 20, true, false);

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#c49b45';
    ctx.lineWidth = 4;
    drawRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 20, false, true);
  }

  // Draw QR code image inside box (350x350)
  if (qrDataUrl) {
    try {
      const qrImg = await loadImage(qrDataUrl);
      ctx.drawImage(qrImg, qrBoxX + 15, qrBoxY + 15, qrBoxSize - 30, qrBoxSize - 30);
    } catch (e) {
      ctx.fillStyle = '#334155';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('QR Code', qrBoxX + qrBoxSize / 2, qrBoxY + qrBoxSize / 2);
    }
  }

  // Sub-badge under QR Code
  const scanBadgeY = qrBoxY + qrBoxSize + 22;
  ctx.fillStyle = isBw ? '#f1f5f9' : 'rgba(38, 22, 10, 0.9)';
  ctx.strokeStyle = isBw ? '#0f172a' : '#c49b45';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, qrBoxX + 20, scanBadgeY, qrBoxSize - 40, 52, 12, true, true);

  ctx.fillStyle = isBw ? '#0f172a' : '#fae9be';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('⚡ IMBAS UNTUK CABUTAN', qrBoxX + qrBoxSize / 2, scanBadgeY + 34);

  // 4. Right Side: Information Details
  const rightCenterX = 645;

  // Header Title
  ctx.textAlign = 'center';
  if (isBw) {
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('MAJLIS APRESIASI PENGAWAS', rightCenterX, 85);
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('SMK BANDAR SERI PUTRA', rightCenterX, 114);
  } else {
    ctx.fillStyle = '#fae9be';
    ctx.font = 'bold 22px Cinzel, "Times New Roman", serif';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.fillText('MAJLIS APRESIASI PENGAWAS', rightCenterX, 85);
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 16px Cinzel, "Times New Roman", serif';
    ctx.fillText('SMK BANDAR SERI PUTRA', rightCenterX, 114);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  // Big Participant Number Pill (BP-XXX)
  const numPillY = 145;
  const numPillW = 340;
  const numPillH = 80;
  const numPillX = rightCenterX - numPillW / 2;

  if (isBw) {
    ctx.fillStyle = '#0f172a';
    drawRoundedRect(ctx, numPillX, numPillY, numPillW, numPillH, 20, true, false);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px monospace';
    ctx.fillText(p.participantNumber, rightCenterX, numPillY + 56);
  } else {
    const pillGrad = ctx.createLinearGradient(numPillX, numPillY, numPillX + numPillW, numPillY);
    pillGrad.addColorStop(0, 'rgba(40, 20, 8, 0.95)');
    pillGrad.addColorStop(0.5, 'rgba(65, 35, 12, 0.98)');
    pillGrad.addColorStop(1, 'rgba(40, 20, 8, 0.95)');
    ctx.fillStyle = pillGrad;
    ctx.strokeStyle = '#c49b45';
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, numPillX, numPillY, numPillW, numPillH, 20, true, true);

    ctx.fillStyle = '#fef3c7';
    ctx.font = '900 48px monospace';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fillText(p.participantNumber, rightCenterX, numPillY + 57);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  // Participant Name
  const nameY = 275;
  const rawName = p.participantName.trim().toUpperCase();
  ctx.textAlign = 'center';

  if (isBw) {
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 28px sans-serif';
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px "Playfair Display", Georgia, serif';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
  }

  const words = rawName.split(' ');
  let line1 = '';
  let line2 = '';
  for (const w of words) {
    if ((line1 + ' ' + w).trim().length <= 22) {
      line1 = (line1 + ' ' + w).trim();
    } else {
      line2 = (line2 + ' ' + w).trim();
    }
  }

  if (line2) {
    ctx.fillText(line1, rightCenterX, nameY);
    ctx.fillText(line2, rightCenterX, nameY + 38);
  } else {
    ctx.fillText(line1, rightCenterX, nameY + 18);
  }
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Session & Division Pills Side-by-Side
  const tagsY = 385;
  const tagW = 165;
  const tagH = 50;
  const tag1X = rightCenterX - tagW - 6;
  const tag2X = rightCenterX + 6;

  // Session Tag
  if (isBw) {
    ctx.fillStyle = '#f1f5f9';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, tag1X, tagsY, tagW, tagH, 14, true, true);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(sessionText, tag1X + tagW / 2, tagsY + 32);
  } else {
    ctx.fillStyle = isPagi ? 'rgba(75, 30, 8, 0.95)' : 'rgba(25, 20, 65, 0.95)';
    ctx.strokeStyle = isPagi ? '#f59e0b' : '#818cf8';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, tag1X, tagsY, tagW, tagH, 14, true, true);
    ctx.fillStyle = isPagi ? '#fde68a' : '#c7d2fe';
    ctx.font = 'bold 20px Cinzel, serif';
    ctx.fillText(sessionText, tag1X + tagW / 2, tagsY + 32);
  }

  // Division Tag
  const divText = (p.division || 'DIVISYEN 1').trim().toUpperCase();
  if (isBw) {
    ctx.fillStyle = '#0f172a';
    drawRoundedRect(ctx, tag2X, tagsY, tagW, tagH, 14, true, false);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(divText, tag2X + tagW / 2, tagsY + 32);
  } else {
    ctx.fillStyle = 'rgba(40, 24, 12, 0.95)';
    ctx.strokeStyle = '#c49b45';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, tag2X, tagsY, tagW, tagH, 14, true, true);
    ctx.fillStyle = '#fae9be';
    ctx.font = 'bold 20px Cinzel, serif';
    ctx.fillText(divText, tag2X + tagW / 2, tagsY + 32);
  }

  // Footer Date & Location Bar
  const footerY = 560;
  ctx.strokeStyle = isBw ? '#cbd5e1' : 'rgba(231, 207, 147, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rightCenterX - 160, footerY - 24);
  ctx.lineTo(rightCenterX + 160, footerY - 24);
  ctx.stroke();

  if (isBw) {
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('17 OKTOBER 2026 • DORSETT PUTRAJAYA', rightCenterX, footerY);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.fillText('PAS RASMI CABUTAN BERTUAH', rightCenterX, footerY + 24);
  } else {
    ctx.fillStyle = '#ecd7a1';
    ctx.font = 'bold 18px Cinzel, serif';
    ctx.fillText('17 OKTOBER 2026 • DORSETT PUTRAJAYA', rightCenterX, footerY);
    ctx.fillStyle = '#d4af37';
    ctx.font = '14px Cinzel, serif';
    ctx.fillText('PAS RASMI CABUTAN BERTUAH', rightCenterX, footerY + 24);
  }

  // Outer cutting outline
  ctx.strokeStyle = isBw ? 'rgba(0, 0, 0, 0.15)' : 'rgba(231, 207, 147, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, 880, 660);

  return canvas;
};

/**
 * Main function to generate multi-page PDF with selectable sizing and enlarged cards
 */
export const generateLanyardPdf = async (
  participants: Participant[],
  qrCodes: { [token: string]: string },
  options: PdfGenerationOptions
): Promise<void> => {
  const {
    theme = 'canva-vintage',
    layout = 'fit-20-sheets', // DEFAULT: EXACTLY FITS WITHIN 20 SHEETS OF PAPER (17 SHEETS TOTAL)
    customBgUrl = null,
    onProgress,
    fileName = 'Pas_Lanyard_SMKBSP.pdf',
  } = options;

  const total = participants.length;
  if (total === 0) return;

  onProgress?.(0, total, 'Menyediakan templat latar belakang...');

  // Pre-load background image if canva-vintage theme is selected
  let bgImg: HTMLImageElement | null = null;
  if (theme === 'canva-vintage') {
    try {
      const bgSrc = customBgUrl || '/lanyard-template.jpg';
      bgImg = await loadImage(bgSrc);
    } catch (e) {
      console.warn('Failed to load vintage background image, falling back to procedural style:', e);
    }
  }

  // ========================================================
  // MODE: FIT-20-SHEETS (8 KAD PER A4 — 88mm × 66mm LANDSCAPE)
  // [KHAS UNTUK 20 HELAI KERTAS: 130 / 8 = 17 MUKA SURAT SAHAJA]
  // ========================================================
  if (layout === 'fit-20-sheets') {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const cardWidth = 88;
    const cardHeight = 66;
    const cols = 2;
    const rows = 4;
    const cardsPerPage = cols * rows; // 8 cards per A4 page

    const gapX = 10;
    const gapY = 4;

    const totalGridWidth = cols * cardWidth + (cols - 1) * gapX; // 88*2 + 10 = 186 mm
    const startX = (210 - totalGridWidth) / 2; // 12 mm
    const totalGridHeight = rows * cardHeight + (rows - 1) * gapY; // 66*4 + 12 = 276 mm
    const startY = (297 - totalGridHeight) / 2; // 10.5 mm

    const totalPages = Math.ceil(total / cardsPerPage);

    for (let i = 0; i < total; i++) {
      const p = participants[i];
      const pageIndex = Math.floor(i / cardsPerPage);
      const cardIndexOnPage = i % cardsPerPage;

      onProgress?.(
        i + 1,
        total,
        `Menjana kad jimat kertas ${i + 1} / ${total}: ${p.participantNumber} — ${p.participantName.slice(0, 20)}...`
      );

      if (i > 0 && cardIndexOnPage === 0) {
        pdf.addPage('a4', 'portrait');
      }

      // Page Header
      if (cardIndexOnPage === 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(60, 45, 25);
        pdf.text(
          `MAJLIS APRESIASI PENGAWAS SMKBSP — PAS LANYARD 8-KAD (Muka Surat ${
            pageIndex + 1
          } / ${totalPages} • Jimat Kertas: ${totalPages} Helai Sahaja)`,
          105,
          6,
          { align: 'center' }
        );
      }

      const col = cardIndexOnPage % cols;
      const row = Math.floor(cardIndexOnPage / cols);

      const x = startX + col * (cardWidth + gapX);
      const y = startY + row * (cardHeight + gapY);

      const qrDataUrl = qrCodes[p.secureToken] || '';
      const cardCanvas = await renderHorizontalCardToCanvas(p, qrDataUrl, theme, bgImg);
      const cardImageData = cardCanvas.toDataURL('image/jpeg', 0.95);

      pdf.addImage(cardImageData, 'JPEG', x, y, cardWidth, cardHeight, undefined, 'FAST');

      // Cutting Guideline Lines
      pdf.setDrawColor(160, 140, 110);
      pdf.setLineWidth(0.25);
      const markLength = 3.5;

      pdf.line(x - 2, y, x - 2 - markLength, y);
      pdf.line(x, y - 2, x, y - 2 - markLength);
      pdf.line(x + cardWidth + 2, y, x + cardWidth + 2 + markLength, y);
      pdf.line(x + cardWidth, y - 2, x + cardWidth, y - 2 - markLength);
      pdf.line(x - 2, y + cardHeight, x - 2 - markLength, y + cardHeight);
      pdf.line(x, y + cardHeight + 2, x, y + cardHeight + 2 + markLength);
      pdf.line(x + cardWidth + 2, y + cardHeight, x + cardWidth + 2 + markLength, y + cardHeight);
      pdf.line(x + cardWidth, y + cardHeight + 2, x + cardWidth, y + cardHeight + 2 + markLength);
    }

    onProgress?.(total, total, 'Menyimpan fail PDF ke peranti...');
    pdf.save(fileName);
    return;
  }

  // ========================================================
  // MODE 1: LARGE-4 (4 KAD PER A4 — 88mm × 136mm)
  // ========================================================
  if (layout === 'large-4') {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const cardWidth = 88;
    const cardHeight = 136;
    const cols = 2;
    const rows = 2;
    const cardsPerPage = 4;

    const gapX = 10;
    const gapY = 8;

    const totalGridWidth = cols * cardWidth + (cols - 1) * gapX; // 88*2 + 10 = 186 mm
    const startX = (210 - totalGridWidth) / 2; // 12 mm
    const totalGridHeight = rows * cardHeight + (rows - 1) * gapY; // 136*2 + 8 = 280 mm
    const startY = (297 - totalGridHeight) / 2; // 8.5 mm

    const totalPages = Math.ceil(total / cardsPerPage);

    for (let i = 0; i < total; i++) {
      const p = participants[i];
      const pageIndex = Math.floor(i / cardsPerPage);
      const cardIndexOnPage = i % cardsPerPage;

      onProgress?.(
        i + 1,
        total,
        `Menjana kad besar ${i + 1} daripada ${total}: ${p.participantNumber} — ${p.participantName.slice(0, 20)}...`
      );

      if (i > 0 && cardIndexOnPage === 0) {
        pdf.addPage('a4', 'portrait');
      }

      // Page Header
      if (cardIndexOnPage === 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        pdf.setTextColor(60, 45, 25);
        pdf.text(
          `MAJLIS APRESIASI PENGAWAS SMK BANDAR SERI PUTRA — PAS LANYARD BESAR (Muka Surat ${
            pageIndex + 1
          } / ${totalPages})`,
          105,
          6,
          { align: 'center' }
        );
      }

      const col = cardIndexOnPage % cols;
      const row = Math.floor(cardIndexOnPage / cols);

      const x = startX + col * (cardWidth + gapX);
      const y = startY + row * (cardHeight + gapY);

      const qrDataUrl = qrCodes[p.secureToken] || '';
      const cardCanvas = await renderCardToCanvas(p, qrDataUrl, theme, bgImg);
      const cardImageData = cardCanvas.toDataURL('image/jpeg', 0.95);

      pdf.addImage(cardImageData, 'JPEG', x, y, cardWidth, cardHeight, undefined, 'FAST');

      // Cutting Guideline Lines
      pdf.setDrawColor(160, 140, 110);
      pdf.setLineWidth(0.25);
      const markLength = 4;

      pdf.line(x - 2, y, x - 2 - markLength, y);
      pdf.line(x, y - 2, x, y - 2 - markLength);
      pdf.line(x + cardWidth + 2, y, x + cardWidth + 2 + markLength, y);
      pdf.line(x + cardWidth, y - 2, x + cardWidth, y - 2 - markLength);
      pdf.line(x - 2, y + cardHeight, x - 2 - markLength, y + cardHeight);
      pdf.line(x, y + cardHeight + 2, x, y + cardHeight + 2 + markLength);
      pdf.line(x + cardWidth + 2, y + cardHeight, x + cardWidth + 2 + markLength, y + cardHeight);
      pdf.line(x + cardWidth, y + cardHeight + 2, x + cardWidth, y + cardHeight + 2 + markLength);
    }

    onProgress?.(total, total, 'Menyimpan fail PDF ke peranti...');
    pdf.save(fileName);
    return;
  }

  // ========================================================
  // MODE 2: XLARGE-2 (2 KAD PER A4 — 100mm × 160mm)
  // ========================================================
  if (layout === 'xlarge-2') {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const cardWidth = 100;
    const cardHeight = 160;
    const cardsPerPage = 2;
    const totalPages = Math.ceil(total / cardsPerPage);

    for (let i = 0; i < total; i++) {
      const p = participants[i];
      const pageIndex = Math.floor(i / cardsPerPage);
      const cardIndexOnPage = i % cardsPerPage;

      onProgress?.(
        i + 1,
        total,
        `Menjana kad ekstra besar ${i + 1} daripada ${total}: ${p.participantNumber}...`
      );

      if (i > 0 && cardIndexOnPage === 0) {
        pdf.addPage('a4', 'portrait');
      }

      const x = (210 - cardWidth) / 2; // Center horizontally
      const y = cardIndexOnPage === 0 ? 14 : 148; // Two stacked vertically

      const qrDataUrl = qrCodes[p.secureToken] || '';
      const cardCanvas = await renderCardToCanvas(p, qrDataUrl, theme, bgImg);
      const cardImageData = cardCanvas.toDataURL('image/jpeg', 0.95);

      pdf.addImage(cardImageData, 'JPEG', x, y, cardWidth, cardHeight, undefined, 'FAST');
    }

    onProgress?.(total, total, 'Menyimpan fail PDF ke peranti...');
    pdf.save(fileName);
    return;
  }

  // ========================================================
  // MODE 3: SINGLE (1 KAD PER MUKA SURAT — 70mm × 119mm)
  // ========================================================
  if (layout === 'single') {
    const cardWidthMm = 70;
    const cardHeightMm = 119;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [cardWidthMm, cardHeightMm],
    });

    for (let i = 0; i < total; i++) {
      const p = participants[i];
      onProgress?.(
        i + 1,
        total,
        `Menjana pas ${i + 1} daripada ${total}: ${p.participantNumber}...`
      );

      if (i > 0) {
        pdf.addPage([cardWidthMm, cardHeightMm], 'portrait');
      }

      const qrDataUrl = qrCodes[p.secureToken] || '';
      const cardCanvas = await renderCardToCanvas(p, qrDataUrl, theme, bgImg);
      const cardImageData = cardCanvas.toDataURL('image/jpeg', 0.95);

      pdf.addImage(cardImageData, 'JPEG', 0, 0, cardWidthMm, cardHeightMm, undefined, 'FAST');
    }

    onProgress?.(total, total, 'Menyimpan fail PDF ke peranti...');
    pdf.save(fileName);
    return;
  }

  // ========================================================
  // MODE 4: COMPACT-9 (9 KAD PER A4 — 50mm × 85mm)
  // ========================================================
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const cardWidth = 50;
  const cardHeight = 85;
  const cols = 3;
  const rows = 3;
  const cardsPerPage = cols * rows; // 9

  const gapX = 6;
  const gapY = 5;

  const totalGridWidth = cols * cardWidth + (cols - 1) * gapX;
  const totalGridHeight = rows * cardHeight + (rows - 1) * gapY;

  const startX = (210 - totalGridWidth) / 2;
  const startY = 16;

  const totalPages = Math.ceil(total / cardsPerPage);

  for (let i = 0; i < total; i++) {
    const p = participants[i];
    const pageIndex = Math.floor(i / cardsPerPage);
    const cardIndexOnPage = i % cardsPerPage;

    onProgress?.(
      i + 1,
      total,
      `Menjana kad ${i + 1} daripada ${total}: ${p.participantName.slice(0, 22)}...`
    );

    if (i > 0 && cardIndexOnPage === 0) {
      pdf.addPage('a4', 'portrait');
    }

    if (cardIndexOnPage === 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(80, 80, 80);
      pdf.text(
        `MAJLIS APRESIASI PENGAWAS SMK BANDAR SERI PUTRA — PAS LANYARD (Muka Surat ${
          pageIndex + 1
        } / ${totalPages})`,
        105,
        9,
        { align: 'center' }
      );
    }

    const col = cardIndexOnPage % cols;
    const row = Math.floor(cardIndexOnPage / cols);

    const x = startX + col * (cardWidth + gapX);
    const y = startY + row * (cardHeight + gapY);

    const qrDataUrl = qrCodes[p.secureToken] || '';
    const cardCanvas = await renderCardToCanvas(p, qrDataUrl, theme, bgImg);
    const cardImageData = cardCanvas.toDataURL('image/jpeg', 0.95);

    pdf.addImage(cardImageData, 'JPEG', x, y, cardWidth, cardHeight, undefined, 'FAST');

    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(0.2);
    const markLength = 3;

    pdf.line(x - 2, y, x - 2 - markLength, y);
    pdf.line(x, y - 2, x, y - 2 - markLength);
    pdf.line(x + cardWidth + 2, y, x + cardWidth + 2 + markLength, y);
    pdf.line(x + cardWidth, y - 2, x + cardWidth, y - 2 - markLength);
    pdf.line(x - 2, y + cardHeight, x - 2 - markLength, y + cardHeight);
    pdf.line(x, y + cardHeight + 2, x, y + cardHeight + 2 + markLength);
    pdf.line(x + cardWidth + 2, y + cardHeight, x + cardWidth + 2 + markLength, y + cardHeight);
    pdf.line(x + cardWidth, y + cardHeight + 2, x + cardWidth, y + cardHeight + 2 + markLength);
  }

  onProgress?.(total, total, 'Menyimpan fail PDF ke peranti...');
  pdf.save(fileName);
};
