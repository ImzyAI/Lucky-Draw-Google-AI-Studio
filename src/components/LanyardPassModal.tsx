import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Printer,
  Download,
  Loader2,
  Filter,
  Scissors,
  Upload,
  Sparkles,
  CheckCircle,
  FileCheck,
} from 'lucide-react';
import { Participant } from '../types';
import { generateLanyardPdf, LanyardLayout } from '../lib/lanyardPdfGenerator';

interface LanyardPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Participant[];
}

type CardTheme = 'canva-vintage' | 'pure-vintage' | 'minimal-bw';

export const LanyardPassModal: React.FC<LanyardPassModalProps> = ({
  isOpen,
  onClose,
  participants,
}) => {
  const [qrCodes, setQrCodes] = useState<{ [token: string]: string }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [filterDivision, setFilterDivision] = useState<string>('ALL');
  const [filterSession, setFilterSession] = useState<string>('ALL');
  const [theme, setTheme] = useState<CardTheme>('canva-vintage');
  const [layout, setLayout] = useState<LanyardLayout>('fit-20-sheets');
  const [customBgUrl, setCustomBgUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfProgress, setPdfProgress] = useState<{
    current: number;
    total: number;
    message: string;
  } | null>(null);

  const handleDownloadPdf = async () => {
    if (loading || isGeneratingPdf || filtered.length === 0) return;
    setIsGeneratingPdf(true);
    setPdfProgress({
      current: 0,
      total: filtered.length,
      message: 'Menyediakan enjin PDF dan templat latar...',
    });

    try {
      const fileLabel =
        layout === 'fit-20-sheets'
          ? 'Jimat_20_Kertas_8_A4'
          : layout === 'large-4'
          ? 'Saiz_Besar_4_A4'
          : layout === 'xlarge-2'
          ? 'Ekstra_Besar_2_A4'
          : layout === 'single'
          ? 'Format_Individu'
          : 'Kompak_9_A4';

      await generateLanyardPdf(filtered, qrCodes, {
        theme,
        layout,
        customBgUrl,
        fileName: `Pas_Lanyard_SMKBSP_${fileLabel}_${filtered.length}_Peserta.pdf`,
        onProgress: (current, total, message) => {
          setPdfProgress({ current, total, message });
        },
      });
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
      setTimeout(() => setPdfProgress(null), 3000);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    let isMounted = true;
    const generateAllQr = async () => {
      const generated: { [token: string]: string } = {};
      const origin = window.location.origin;

      for (const p of participants) {
        try {
          const playUrl = `${origin}/play/${p.secureToken}`;
          const qr = await QRCode.toDataURL(playUrl, {
            width: 340,
            margin: 1,
            color: {
              dark: '#160e06',
              light: '#ffffff',
            },
            errorCorrectionLevel: 'M',
          });
          generated[p.secureToken] = qr;
        } catch (e) {}
      }

      if (isMounted) {
        setQrCodes(generated);
        setLoading(false);
      }
    };

    generateAllQr();
    return () => {
      isMounted = false;
    };
  }, [isOpen, participants]);

  if (!isOpen) return null;

  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setCustomBgUrl(reader.result);
          setTheme('canva-vintage');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const filtered = participants.filter((p) => {
    // Division filter
    if (filterDivision !== 'ALL') {
      const div = p.division || p.role || '';
      if (!div.includes(filterDivision)) return false;
    }
    // Session filter
    if (filterSession !== 'ALL') {
      const sess = p.session || 'Sesi Pagi';
      if (sess !== filterSession) return false;
    }
    return true;
  });

  const handlePrint = () => {
    window.print();
  };

  const cardsPerPage =
    layout === 'fit-20-sheets'
      ? 8
      : layout === 'compact-9'
      ? 9
      : layout === 'large-4'
      ? 4
      : layout === 'xlarge-2'
      ? 2
      : 1;

  const totalPagesNeeded = Math.ceil(filtered.length / cardsPerPage);
  const fits20Sheets = totalPagesNeeded <= 20;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/92 backdrop-blur-md flex flex-col items-center justify-start p-2 sm:p-5 print:p-0 print:bg-white print:overflow-visible">
      {/* Print Specific CSS Styles for exact 50mm x 85mm badges */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 6mm 5mm 6mm 5mm;
        }
        @media print {
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-hide {
            display: none !important;
          }
          .print-container {
            width: 100% !important;
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
          }
          .lanyard-sheet-grid {
            display: grid !important;
            grid-template-columns: repeat(4, 50mm) !important;
            gap: 1.5mm !important;
            justify-content: center !important;
            align-content: start !important;
            page-break-inside: auto !important;
          }
          .lanyard-card-exact {
            width: 50mm !important;
            height: 85mm !important;
            min-width: 50mm !important;
            max-width: 50mm !important;
            min-height: 85mm !important;
            max-height: 85mm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-shadow: none !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Control Toolbar - Hidden in Print */}
      <div className="w-full max-w-6xl bg-[#141622] border border-amber-500/35 rounded-2xl shadow-2xl p-4 sm:p-5 mb-4 flex flex-col gap-3.5 print-hide">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-500/15">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                <Printer className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold font-serif-vintage tracking-wide text-amber-200">
                Pencetakan Pas Lanyard (Jimat Kertas — Muat 20 Helai A4)
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
                {filtered.length} Pas Dipilih
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Templat rekaan khas <strong className="text-amber-300">Majlis Apresiasi Pengawas SMKBSP</strong>. Format lalai: <strong className="text-emerald-300 font-mono">8 Kad / A4 (17 Helai Sahaja)</strong> dengan kod QR diperbesarkan 42mm agar muat sepenuhnya dalam had 20 helai kertas.
            </p>

            {/* Paper Budget Indicator for 20 Sheets */}
            <div className={`mt-2.5 p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
              fits20Sheets
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
            }`}>
              <div className="flex items-center gap-2">
                <FileCheck className={`w-4 h-4 shrink-0 ${fits20Sheets ? 'text-emerald-400' : 'text-rose-400'}`} />
                <div>
                  <span className="font-bold">
                    {fits20Sheets
                      ? `✅ CUKUP & MUAT DALAM 20 HELAI KERTAS! (${totalPagesNeeded} helai A4 diperlukan, baki ${20 - totalPagesNeeded} helai simpanan)`
                      : `⚠️ Melebihi 20 kertas! (${totalPagesNeeded} helai diperlukan). Sila pilih "★ Khas Muat 20 Kertas (8 Kad / A4)" atau tapis mengikut Sesi.`}
                  </span>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    {filtered.length} peserta • {cardsPerPage} kad setiap helaian A4 • {totalPagesNeeded} muka surat PDF
                  </div>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-lg font-mono font-black text-xs shrink-0 self-start sm:self-auto ${
                fits20Sheets
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-400/40'
              }`}>
                {totalPagesNeeded} / 20 HELAI
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Direct Multi-Page PDF Download (Solves user's issue with browser print screenshots) */}
            <button
              onClick={handleDownloadPdf}
              disabled={loading || isGeneratingPdf || filtered.length === 0}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black rounded-xl text-xs transition shadow-xl shadow-amber-500/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Jana dan muat turun fail PDF A4 tulen ke komputer/telefon anda"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>
                    Menjana PDF ({pdfProgress ? `${pdfProgress.current}/${pdfProgress.total}` : '...'})
                  </span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-slate-950" />
                  <span>Muat Turun Fail PDF (A4)</span>
                </>
              )}
            </button>

            {/* Browser Print (Alternative) */}
            <button
              onClick={handlePrint}
              disabled={loading || isGeneratingPdf}
              className="px-3 py-2.5 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-300 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Cetak terus menggunakan pencetak pelayar web"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">Cetak Pelayar</span>
            </button>

            <button
              onClick={onClose}
              className="p-2.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
              title="Tutup tetingkap"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live PDF Generation Progress Bar */}
        {pdfProgress && (
          <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-200 flex items-center gap-2">
                {isGeneratingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                )}
                {pdfProgress.message}
              </span>
              <span className="font-mono text-amber-300 font-black">
                {pdfProgress.total > 0
                  ? `${Math.round((pdfProgress.current / pdfProgress.total) * 100)}%`
                  : ''}
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-amber-500/30">
              <div
                className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 transition-all duration-150 rounded-full"
                style={{
                  width: `${
                    pdfProgress.total > 0
                      ? Math.min(100, Math.round((pdfProgress.current / pdfProgress.total) * 100))
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Options Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Theme Selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold text-[11px]">Tema Kad:</span>
            <div className="flex rounded-lg bg-[#0b0c10] p-1 border border-amber-500/20">
              <button
                onClick={() => setTheme('canva-vintage')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  theme === 'canva-vintage'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-amber-300 hover:text-amber-200'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Vintage Canva (Emas & Coklat)</span>
              </button>
              <button
                onClick={() => setTheme('pure-vintage')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  theme === 'pure-vintage'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-amber-300 hover:text-amber-200'
                }`}
              >
                <span>Vektor Emas Klasik</span>
              </button>
              <button
                onClick={() => setTheme('minimal-bw')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  theme === 'minimal-bw'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-amber-300 hover:text-amber-200'
                }`}
              >
                <span>Jimat Dakwat (B&W)</span>
              </button>
            </div>

            {/* Custom Canva File Upload */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleCustomImageUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-200 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Jika anda ada fail Canva asal Untitled design(7).png, muat naik di sini untuk guna latar belakang 100% sama"
            >
              <Upload className="w-3 h-3 text-amber-400" />
              <span>{customBgUrl ? 'Tukar Gambar Canva' : 'Muat Naik Gambar Canva Sendiri'}</span>
            </button>

            {customBgUrl && (
              <button
                onClick={() => setCustomBgUrl(null)}
                className="text-[10px] text-red-400 hover:text-red-300 underline cursor-pointer"
              >
                Padam Fail Muat Naik
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Saiz Kad & Susun Atur Layout Selector */}
            <div className="flex items-center gap-1.5 bg-[#0b0c10] border border-amber-500/40 px-2.5 py-1.5 rounded-xl">
              <span className="text-[11px] text-amber-300 font-bold">Saiz Kad:</span>
              <select
                value={layout}
                onChange={(e) => setLayout(e.target.value as LanyardLayout)}
                className="bg-transparent text-xs font-semibold text-amber-200 focus:outline-none cursor-pointer"
                title="Pilih saiz cetakan kad lanyard"
              >
                <option value="fit-20-sheets" className="bg-[#141620] text-emerald-300 font-bold">
                  ★ KHAS MUAT 20 KERTAS: 8 Kad / A4 (17 Helai Sahaja — QR 42mm Besar) [DISYORKAN]
                </option>
                <option value="compact-9" className="bg-[#141620] text-amber-300 font-bold">
                  Kompak Poket (9 Kad / A4 — 15 Helai Sahaja)
                </option>
                <option value="large-4" className="bg-[#141620] text-slate-200">
                  Saiz Besar Tegak (4 Kad / A4 — 33 Helai / 18 Helai jika Sesi Pagi)
                </option>
                <option value="xlarge-2" className="bg-[#141620] text-slate-200">
                  Ekstra Besar (2 Kad / A4 — 65 Helai)
                </option>
                <option value="single" className="bg-[#141620] text-slate-200">
                  1 Kad Per Muka Surat (Pas Individu)
                </option>
              </select>
            </div>

            {/* Sesi Filter */}
            <div className="flex items-center gap-1.5 bg-[#0b0c10] border border-amber-500/25 px-2.5 py-1.5 rounded-xl">
              <span className="text-[11px] text-amber-400 font-bold">Sesi:</span>
              <select
                value={filterSession}
                onChange={(e) => setFilterSession(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[#141620] text-slate-200">
                  Semua Sesi
                </option>
                <option value="Sesi Pagi" className="bg-[#141620] text-slate-200">
                  ☀️ Sesi Pagi
                </option>
                <option value="Sesi Petang" className="bg-[#141620] text-slate-200">
                  🌙 Sesi Petang
                </option>
              </select>
            </div>

            {/* Division Filter */}
            <div className="flex items-center gap-1.5 bg-[#0b0c10] border border-amber-500/25 px-2.5 py-1.5 rounded-xl">
              <Filter className="w-3 h-3 text-amber-400" />
              <select
                value={filterDivision}
                onChange={(e) => setFilterDivision(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[#141620] text-slate-200">
                  Semua Divisyen ({participants.length})
                </option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <option key={num} value={`Divisyen ${num}`} className="bg-[#141620] text-slate-200">
                    Divisyen {num}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Badges Container / A4 Sheet View */}
      <div className="print-container w-full max-w-6xl bg-[#0f1118] border border-amber-500/20 rounded-3xl p-4 sm:p-6 shadow-2xl overflow-y-auto print:border-none print:p-0 print:bg-white print:overflow-visible">
        {loading ? (
          <div className="py-24 text-center text-amber-300 text-sm print-hide">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="font-serif-vintage tracking-wider">Menjana pas lanyard rekaan mewah 50mm × 85mm...</p>
          </div>
        ) : (
          <div className="lanyard-sheet-grid flex flex-wrap justify-center gap-4 print:grid">
            {filtered.map((p) => {
              const qr = qrCodes[p.secureToken];
              const sessionText = p.session || 'Sesi Pagi';
              const isPagi = sessionText === 'Sesi Pagi';
              const bgImage = customBgUrl || '/lanyard-template.jpg';

              const isHorizontal = layout === 'fit-20-sheets';
              const isEnlarged = layout !== 'compact-9' && layout !== 'fit-20-sheets';
              const cardW = isHorizontal ? '320px' : isEnlarged ? '240px' : '189px';
              const cardH = isHorizontal ? '240px' : isEnlarged ? '408px' : '321px';
              const qrSize = isHorizontal ? '110px' : isEnlarged ? '124px' : '88px';
              const cutLabel =
                layout === 'fit-20-sheets'
                  ? '88×66mm (A4-8 • 17 Helai)'
                  : layout === 'large-4'
                  ? '88×136mm (A4-4)'
                  : layout === 'xlarge-2'
                  ? '100×160mm (A4-2)'
                  : layout === 'single'
                  ? 'Format Pas'
                  : '50×85mm';

              // ----------------- FIT 20 SHEETS (HORIZONTAL LANDSCAPE CARD) -----------------
              if (isHorizontal) {
                return (
                  <div
                    key={p.participantId}
                    className="lanyard-card-exact relative rounded-xl border border-dashed border-amber-500/40 print:border-slate-400/50 flex flex-row items-center justify-between p-3 overflow-hidden shadow-2xl select-none text-left"
                    style={{
                      width: cardW,
                      height: cardH,
                      minWidth: cardW,
                      maxWidth: cardW,
                      minHeight: cardH,
                      maxHeight: cardH,
                      backgroundImage: `url(${bgImage})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundColor: '#26160d',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div className="absolute inset-0 bg-black/25 pointer-events-none" />

                    {/* Cutting indicator */}
                    <div className="absolute top-1 left-2 flex items-center gap-1 text-[8px] text-amber-200/60 font-mono pointer-events-none z-10">
                      <Scissors className="w-2.5 h-2.5" />
                      <span>{cutLabel}</span>
                    </div>

                    {/* Punch slot guide */}
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 z-10">
                      <div className="w-5 h-1.5 rounded-full border border-dashed border-amber-300/40 bg-black/30" />
                    </div>

                    {/* Left: Huge QR Code */}
                    <div className="relative z-10 flex flex-col items-center justify-center shrink-0 w-[124px] pt-2">
                      <div className="p-1.5 bg-white rounded-xl shadow-lg border-2 border-[#c49b45]">
                        {qr ? (
                          <img src={qr} alt={p.participantName} className="w-[104px] h-[104px] object-contain rounded" />
                        ) : (
                          <div className="w-[104px] h-[104px] bg-slate-100 flex items-center justify-center text-slate-800 text-[10px]">QR Code</div>
                        )}
                      </div>
                      <div className="mt-1 px-2 py-0.5 rounded-md bg-[#28160a]/90 border border-amber-500/40 text-[8.5px] font-mono font-bold text-amber-200 whitespace-nowrap">
                        ⚡ IMBAS CABUTAN
                      </div>
                    </div>

                    {/* Right: Info */}
                    <div className="relative z-10 flex-1 pl-3 pt-2 flex flex-col justify-between h-full py-0.5">
                      <div>
                        <div className="text-[7.5px] font-bold tracking-widest text-[#ecd599] uppercase font-serif-vintage">
                          MAJLIS APRESIASI PENGAWAS
                        </div>
                        <div className="text-[7px] text-amber-300/80 uppercase">
                          SMK BANDAR SERI PUTRA
                        </div>

                        {/* Number Pill */}
                        <div className="mt-1 px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 border border-amber-400 text-center shadow">
                          <span className="font-mono font-black text-amber-200 text-sm tracking-wider block">
                            {p.participantNumber}
                          </span>
                        </div>

                        {/* Name */}
                        <div className="mt-1 text-xs font-bold text-white leading-tight font-serif-vintage line-clamp-2 drop-shadow">
                          {p.participantName}
                        </div>
                      </div>

                      <div className="space-y-1 mt-auto">
                        <div className="flex items-center gap-1">
                          <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold ${isPagi ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/40'}`}>
                            {sessionText}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-amber-950/70 border border-amber-500/30 text-amber-200 truncate max-w-[100px]">
                            {p.division || 'DIVISYEN 1'}
                          </span>
                        </div>
                        <div className="text-[7px] text-[#e7cf93]/80 font-serif border-t border-amber-500/20 pt-0.5">
                          17 OKTOBER 2026 • DORSETT PUTRAJAYA
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // ----------------- THEME 1: CANVA VINTAGE REPLICA -----------------
              if (theme === 'canva-vintage') {
                return (
                  <div
                    key={p.participantId}
                    className="lanyard-card-exact relative rounded-xl border border-dashed border-amber-500/40 print:border-slate-400/50 flex flex-col items-center justify-between text-center overflow-hidden shadow-2xl select-none"
                    style={{
                      width: cardW,
                      height: cardH,
                      minWidth: cardW,
                      maxWidth: cardW,
                      minHeight: cardH,
                      maxHeight: cardH,
                      backgroundImage: `url(${bgImage})`,
                      backgroundSize: '100% 100%',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                      backgroundColor: '#26160d',
                      boxSizing: 'border-box',
                    }}
                  >
                    {/* Dim Overlay if needed for contrast */}
                    <div className="absolute inset-0 bg-black/15 pointer-events-none" />

                    {/* Cutting line indicators */}
                    <div className="absolute top-1 left-1.5 flex items-center gap-0.5 text-[7px] text-amber-200/50 font-mono pointer-events-none z-10">
                      <Scissors className="w-2 h-2" />
                      <span>{cutLabel}</span>
                    </div>

                    {/* Top Lanyard Slot / Punch Hole Guide */}
                    <div className="relative z-10 w-full flex items-center justify-center pt-1">
                      <div
                        className="w-4 h-1.5 rounded-full border border-dashed border-amber-300/40 bg-black/25"
                        title="Panduan Tebuk Klip Lanyard"
                      />
                    </div>

                    {/* Card Header (Matches the Canva typography) */}
                    <div className="relative z-10 w-full px-2 pt-0.5 pb-1">
                      <div
                        className="text-[7.5px] font-bold tracking-[0.2em] text-[#ecd599] uppercase leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                        style={{ fontFamily: "'Cinzel', serif" }}
                      >
                        MAJLIS APRESIASI
                      </div>
                      <div
                        className="text-[12.5px] font-bold text-[#fae9be] leading-[1.1] mt-0.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                      >
                        <span className="italic">Lembaga</span> <span className="italic font-black">Pengawas</span>
                        <div className="text-[11px] font-serif tracking-wide uppercase text-[#e7cf93]">
                          Sekolah
                        </div>
                      </div>
                      <div
                        className="text-[6.5px] font-bold tracking-[0.16em] text-[#e0c88d] uppercase mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                        style={{ fontFamily: "'Cinzel', serif" }}
                      >
                        SMK BANDAR SERI PUTRA
                      </div>

                      {/* Small Gold Divider */}
                      <div className="flex items-center justify-center gap-1 mt-0.5 opacity-80">
                        <span className="h-[0.5px] w-5 bg-gradient-to-r from-transparent to-[#d4af37]" />
                        <span className="text-[8px] text-[#e5ce94]">❦</span>
                        <span className="h-[0.5px] w-5 bg-gradient-to-l from-transparent to-[#d4af37]" />
                      </div>
                    </div>

                    {/* Center Participant Details: QR + Nama + No Pengawas + Divisyen */}
                    <div className="relative z-10 w-full flex flex-col items-center justify-center px-2 py-0.5 my-auto">
                      {/* Scannable QR Code with Gold Frame */}
                      <div className="p-1 bg-white rounded-md border border-[#c49b45] shadow-[0_2px_8px_rgba(0,0,0,0.6)] flex items-center justify-center">
                        {qr ? (
                          <img
                            src={qr}
                            alt={`QR ${p.participantNumber}`}
                            style={{ width: qrSize, height: qrSize }}
                            className="object-contain block transition-all"
                          />
                        ) : (
                          <div
                            style={{ width: qrSize, height: qrSize }}
                            className="bg-white flex items-center justify-center text-[8px] text-slate-800"
                          >
                            Jana QR...
                          </div>
                        )}
                      </div>

                      {/* Prefect ID & Session Tags */}
                      <div className="flex items-center justify-center gap-1.5 mt-1.5 w-full">
                        <span className="px-1.5 py-0.5 rounded bg-[#1e130c]/90 border border-[#b88c38] text-[#f7e4b2] font-mono text-[8.5px] font-black tracking-wider shadow-sm">
                          {p.participantNumber}
                        </span>
                        <span
                          className={`text-[7.5px] font-bold px-1.5 py-0.5 rounded border shadow-sm ${
                            isPagi
                              ? 'bg-amber-950/80 text-amber-200 border-amber-500/60'
                              : 'bg-indigo-950/80 text-indigo-200 border-indigo-400/60'
                          }`}
                        >
                          {isPagi ? '☀️' : '🌙'} {sessionText}
                        </span>
                      </div>

                      {/* Participant Name (Ultra High Contrast, Beautiful Font) */}
                      <div className="w-full px-1 mt-1 text-center">
                        <div
                          className="text-[10px] font-extrabold text-[#fff5df] tracking-tight leading-[1.2] drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]"
                          style={{
                            fontFamily: "'Playfair Display', serif",
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                          title={p.participantName}
                        >
                          {p.participantName}
                        </div>
                      </div>

                      {/* Division Ribbon (Class removed; empty if no division) */}
                      {p.division && p.division.trim() !== '' && (
                        <div className="mt-1 flex items-center justify-center">
                          <span className="text-[7.5px] font-black text-[#ecd599] bg-[#2a170b]/90 border border-[#bfa054] px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                            {p.division}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Footer (Date & Venue) */}
                    <div className="relative z-10 w-full pb-2 px-2">
                      <div className="flex items-center justify-center gap-1 mb-0.5 opacity-80">
                        <span className="h-[0.5px] w-6 bg-gradient-to-r from-transparent to-[#d4af37]" />
                        <span className="text-[7px] text-[#e5ce94]">✦</span>
                        <span className="h-[0.5px] w-6 bg-gradient-to-l from-transparent to-[#d4af37]" />
                      </div>
                      <div
                        className="text-[6.5px] font-bold tracking-[0.18em] text-[#ecd7a1] uppercase leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                        style={{ fontFamily: "'Cinzel', serif" }}
                      >
                        17 OKTOBER 2026
                      </div>
                      <div
                        className="text-[6px] font-semibold tracking-[0.14em] text-[#d6be83] uppercase mt-0.5 leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                        style={{ fontFamily: "'Cinzel', serif" }}
                      >
                        DORSETT PUTRAJAYA
                      </div>
                    </div>
                  </div>
                );
              }

              // ----------------- THEME 2: PURE VECTOR VINTAGE GOLD -----------------
              if (theme === 'pure-vintage') {
                return (
                  <div
                    key={p.participantId}
                    className="lanyard-card-exact relative rounded-xl border-2 border-[#b88c38] p-2 flex flex-col items-center justify-between text-center overflow-hidden shadow-2xl select-none"
                    style={{
                      width: '189px',
                      height: '321px',
                      minWidth: '189px',
                      maxWidth: '189px',
                      minHeight: '321px',
                      maxHeight: '321px',
                      background: 'radial-gradient(circle at center, #351c0e 0%, #1c0e06 100%)',
                      color: '#fdf0d5',
                      boxSizing: 'border-box',
                    }}
                  >
                    {/* Inner Ornate Filigree Border */}
                    <div className="absolute inset-1.5 border border-[#c9a050] rounded-lg pointer-events-none opacity-80" />
                    <div className="absolute inset-2 border border-[#8f6d2b] rounded-md pointer-events-none opacity-60" />

                    {/* Corner Flourishes */}
                    <span className="absolute top-2 left-2 text-[#d4af37] text-[10px] leading-none pointer-events-none">╔</span>
                    <span className="absolute top-2 right-2 text-[#d4af37] text-[10px] leading-none pointer-events-none">╗</span>
                    <span className="absolute bottom-2 left-2 text-[#d4af37] text-[10px] leading-none pointer-events-none">╚</span>
                    <span className="absolute bottom-2 right-2 text-[#d4af37] text-[10px] leading-none pointer-events-none">╝</span>

                    {/* Header */}
                    <div className="w-full pt-1 px-1 z-10">
                      <div className="text-[7.5px] font-bold tracking-[0.2em] text-[#d4af37] uppercase">
                        MAJLIS APRESIASI
                      </div>
                      <div className="text-[12px] font-bold text-[#fff3d4] font-serif-vintage tracking-wide leading-tight mt-0.5">
                        Lembaga Pengawas Sekolah
                      </div>
                      <div className="text-[6.5px] font-bold tracking-[0.16em] text-[#e0c88d] uppercase mt-0.5">
                        SMK BANDAR SERI PUTRA
                      </div>
                    </div>

                    {/* Center QR & Attendee Details */}
                    <div className="w-full flex flex-col items-center justify-center my-auto z-10 px-1">
                      <div className="p-1 bg-white rounded-md border border-[#c49b45] shadow-md">
                        {qr ? (
                          <img
                            src={qr}
                            alt={`QR ${p.participantNumber}`}
                            className="w-[88px] h-[88px] object-contain"
                          />
                        ) : null}
                      </div>

                      <div className="flex items-center justify-center gap-1.5 mt-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-black/60 border border-[#b88c38] text-[#f7e4b2] font-mono text-[8.5px] font-black">
                          {p.participantNumber}
                        </span>
                        <span className="text-[7.5px] font-bold px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-200 border border-amber-500/50">
                          {isPagi ? '☀️ Sesi Pagi' : '🌙 Sesi Petang'}
                        </span>
                      </div>

                      <div className="w-full px-1 mt-1">
                        <div className="text-[10px] font-extrabold text-[#fff8e7] font-serif-vintage leading-tight line-clamp-2">
                          {p.participantName}
                        </div>
                      </div>

                      {p.division && p.division.trim() !== '' && (
                        <div className="mt-1 flex items-center justify-center">
                          <span className="text-[7.5px] font-bold text-[#ecd599] bg-[#1a0e07] border border-[#bfa054] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            {p.division}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="w-full pb-1 z-10">
                      <div className="text-[6.5px] font-bold tracking-[0.18em] text-[#ecd7a1] uppercase">
                        17 OKTOBER 2026
                      </div>
                      <div className="text-[6px] font-medium tracking-[0.14em] text-[#d6be83] uppercase mt-0.5">
                        DORSETT PUTRAJAYA
                      </div>
                    </div>
                  </div>
                );
              }

              // ----------------- THEME 3: MINIMAL B&W (INK SAVER) -----------------
              return (
                <div
                  key={p.participantId}
                  className="lanyard-card-exact relative bg-white text-slate-900 rounded-xl p-2.5 border-2 border-dashed border-slate-400 flex flex-col items-center justify-between text-center overflow-hidden shadow-lg select-none"
                  style={{
                    width: '189px',
                    height: '321px',
                    minWidth: '189px',
                    maxWidth: '189px',
                    minHeight: '321px',
                    maxHeight: '321px',
                    boxSizing: 'border-box',
                  }}
                >
                  <div className="w-full border-b border-slate-300 pb-1 mb-1">
                    <div className="text-[9px] font-black tracking-wider uppercase font-serif-vintage text-slate-900 leading-tight">
                      SMK BANDAR SERI PUTRA
                    </div>
                    <div className="text-[7.5px] font-extrabold tracking-wider uppercase text-slate-700 mt-0.5">
                      MAJLIS APRESIASI PENGAWAS 2026
                    </div>
                  </div>

                  <div className="w-full flex items-center justify-between px-1 mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px] font-black">
                      {p.participantNumber}
                    </span>
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border border-slate-400 bg-slate-100 text-slate-800">
                      {isPagi ? '☀️' : '🌙'} {sessionText}
                    </span>
                  </div>

                  <div className="my-0.5 p-1 bg-white rounded-lg border border-slate-400 shadow-sm flex items-center justify-center">
                    {qr && (
                      <img
                        src={qr}
                        alt={`QR ${p.participantNumber}`}
                        className="w-[100px] h-[100px] object-contain"
                      />
                    )}
                  </div>

                  <div className="w-full px-1 my-0.5">
                    <div className="text-[11px] font-black font-serif-vintage text-slate-950 leading-tight line-clamp-2">
                      {p.participantName}
                    </div>
                  </div>

                  {p.division && p.division.trim() !== '' && (
                    <div className="w-full flex items-center justify-center">
                      <span className="text-[9px] font-bold text-slate-800 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-full uppercase">
                        {p.division}
                      </span>
                    </div>
                  )}

                  <div className="w-full mt-1 pt-1 border-t border-slate-300 text-[7px] text-slate-600 font-medium">
                    17 OKTOBER 2026 • DORSETT PUTRAJAYA
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
