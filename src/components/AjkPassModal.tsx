import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Printer,
  Download,
  Loader2,
  Filter,
  Search,
  Upload,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  ShieldCheck,
  Check,
  FileText,
} from 'lucide-react';
import { AjkMember } from '../types';
import { DEFAULT_AJK_MEMBERS } from '../data/defaultAjkMembers';
import { generateAjkPdf, renderAjkCardToCanvas } from '../lib/ajkPdfGenerator';

interface AjkPassModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type CardTheme = 'vintage-dorsett' | 'pure-vintage' | 'minimal-bw';
type PdfLayout = 'grid-a4' | 'single-card';

const STORAGE_KEY = 'smkbsp_ajk_members_list_2026';

export const AjkPassModal: React.FC<AjkPassModalProps> = ({ isOpen, onClose }) => {
  const [members, setMembers] = useState<AjkMember[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_AJK_MEMBERS;
  });

  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [theme, setTheme] = useState<CardTheme>('vintage-dorsett');
  const [layout, setLayout] = useState<PdfLayout>('grid-a4');
  const [customBgUrl, setCustomBgUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit/Add Member Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingMember, setEditingMember] = useState<AjkMember | null>(null);
  const [formRole, setFormRole] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formClass, setFormClass] = useState<string>('');
  const [formDate, setFormDate] = useState<string>('17 OKTOBER 2026');
  const [formVenue, setFormVenue] = useState<string>('DORSETT PUTRAJAYA');

  // PDF Generation State
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfProgress, setPdfProgress] = useState<{
    current: number;
    total: number;
    message: string;
  } | null>(null);

  // Save changes to localStorage
  const saveMembers = (updated: AjkMember[]) => {
    setMembers(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
  };

  // Restore Default 26 AJK
  const handleRestoreDefault = () => {
    if (window.confirm('Set semula senarai kepada 26 Ahli Jawatankuasa (AJK) asal majlis?')) {
      saveMembers(DEFAULT_AJK_MEMBERS);
    }
  };

  // Roles list for filtering
  const allRoles = Array.from(new Set(members.map((m) => m.role.trim().toUpperCase()))).sort();

  // Filtered members
  const filtered = members.filter((m) => {
    const matchRole = selectedRole === 'ALL' || m.role.trim().toUpperCase() === selectedRole;
    const matchSearch =
      !searchQuery.trim() ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.className.toLowerCase().includes(searchQuery.toLowerCase());
    return matchRole && matchSearch;
  });

  // Handle Download Full PDF
  const handleDownloadPdf = async () => {
    if (isGeneratingPdf || filtered.length === 0) return;
    setIsGeneratingPdf(true);
    setPdfProgress({
      current: 0,
      total: filtered.length,
      message: 'Menyediakan enjin PDF untuk kad ID AJK...',
    });

    try {
      const fileName =
        layout === 'grid-a4'
          ? `Kad_ID_AJK_SMKBSP_A4_Lembaran_${filtered.length}_Ahli.pdf`
          : `Kad_ID_AJK_SMKBSP_Format_Individu_${filtered.length}_MukaSurat.pdf`;

      await generateAjkPdf(filtered, {
        theme,
        layout,
        customBgUrl,
        fileName,
        onProgress: (current, total, message) => {
          setPdfProgress({ current, total, message });
        },
      });
    } catch (err) {
      console.error('Failed to generate AJK PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
      setTimeout(() => setPdfProgress(null), 3000);
    }
  };

  // Handle Download Single Card as PNG
  const handleDownloadSinglePng = async (member: AjkMember) => {
    try {
      let bgImg: HTMLImageElement | null = null;
      if (theme === 'vintage-dorsett') {
        const bgSrc = customBgUrl || '/lanyard-template.jpg';
        bgImg = await new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = bgSrc;
        });
      }
      const canvas = await renderAjkCardToCanvas(member, theme, bgImg);
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `Kad_AJK_${member.role.replace(/\s+/g, '_')}_${member.name.replace(/\s+/g, '_')}.png`;
      a.click();
    } catch (e) {
      console.error('Failed to download PNG:', e);
    }
  };

  // Open Edit/Add Form
  const handleOpenEdit = (member?: AjkMember) => {
    if (member) {
      setEditingMember(member);
      setFormRole(member.role);
      setFormName(member.name);
      setFormClass(member.className);
      setFormDate(member.date || '17 OKTOBER 2026');
      setFormVenue(member.venue || 'DORSETT PUTRAJAYA');
    } else {
      setEditingMember(null);
      setFormRole('HADIAH');
      setFormName('');
      setFormClass('');
      setFormDate('17 OKTOBER 2026');
      setFormVenue('DORSETT PUTRAJAYA');
    }
    setIsEditModalOpen(true);
  };

  // Save Member Edit/Add
  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formRole.trim()) return;

    if (editingMember) {
      const updated = members.map((m) =>
        m.id === editingMember.id
          ? {
              ...m,
              role: formRole.trim().toUpperCase(),
              name: formName.trim(),
              className: formClass.trim(),
              date: formDate.trim(),
              venue: formVenue.trim(),
            }
          : m
      );
      saveMembers(updated);
    } else {
      const newMember: AjkMember = {
        id: `ajk_custom_${Date.now()}`,
        role: formRole.trim().toUpperCase(),
        name: formName.trim(),
        className: formClass.trim(),
        date: formDate.trim(),
        venue: formVenue.trim(),
      };
      saveMembers([...members, newMember]);
    }
    setIsEditModalOpen(false);
  };

  // Delete Member
  const handleDeleteMember = (id: string, name: string) => {
    if (window.confirm(`Padam ahli AJK "${name}"?`)) {
      saveMembers(members.filter((m) => m.id !== id));
    }
  };

  // Upload Custom Background Image
  const handleUploadBg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCustomBgUrl(event.target.result as string);
          setTheme('vintage-dorsett');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden">
      <div className="bg-[#10121d] border-2 border-amber-500/40 rounded-3xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden text-white relative">
        {/* Top Gold Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 shrink-0" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-amber-500/20 flex items-center justify-between gap-3 shrink-0 bg-[#141624]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold font-serif-vintage tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300">
                  Kad ID Ahli Jawatankuasa (AJK)
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-mono font-bold">
                  {members.length} Ahli Rasmi
                </span>
                <span className="hidden md:inline-block text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono">
                  Sistem Asing / PDF Utility
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Majlis Apresiasi Lembaga Pengawas Sekolah SMK Bandar Seri Putra 2026 • Dorsett Putrajaya
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Tutup tetingkap"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="p-3 sm:p-4 border-b border-amber-500/20 bg-[#12141f] space-y-3 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Search & Layout Controls */}
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama, jawatan atau kelas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#181a2c] border border-amber-500/25 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-medium"
                />
              </div>

              {/* Theme Selector */}
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as CardTheme)}
                className="bg-[#181a2c] border border-amber-500/25 rounded-xl px-3 py-1.5 text-xs text-amber-200 font-medium focus:outline-none focus:border-amber-400 cursor-pointer"
                title="Pilih tema kad ID"
              >
                <option value="vintage-dorsett">✦ Tema Vintage Dorsett (Asal)</option>
                <option value="pure-vintage">Parchment Klasik (Emas Tua)</option>
                <option value="minimal-bw">Minimalis Eco-Print (B&W)</option>
              </select>

              {/* Layout Selector */}
              <select
                value={layout}
                onChange={(e) => setLayout(e.target.value as PdfLayout)}
                className="bg-[#181a2c] border border-amber-500/25 rounded-xl px-3 py-1.5 text-xs text-amber-200 font-medium focus:outline-none focus:border-amber-400 cursor-pointer"
                title="Pilih susun atur fail PDF"
              >
                <option value="grid-a4">📄 A4 Lembaran Cetakan (9 Kad / Muka Surat)</option>
                <option value="single-card">📑 1 Kad Per Muka Surat (26 Muka Surat Asal)</option>
              </select>

              {/* Upload Custom BG */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleUploadBg}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1.5 bg-[#181a2c] hover:bg-[#20233b] border border-amber-500/25 rounded-xl text-xs text-slate-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
                title="Gunakan gambar latar belakang tersuai"
              >
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Latar Tersuai</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleOpenEdit()}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Tambah ahli jawatankuasa baharu"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>+ AJK</span>
              </button>

              <button
                onClick={handleRestoreDefault}
                className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
                title="Set semula ke 26 AJK asal dari fail"
              >
                <RotateCcw className="w-4 h-4 text-slate-400" />
              </button>

              {/* Main Download PDF Button */}
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf || filtered.length === 0}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs font-serif-vintage rounded-xl transition shadow-lg shadow-amber-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menjana PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Muat Turun PDF ({filtered.length} Kad)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            <button
              onClick={() => setSelectedRole('ALL')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                selectedRole === 'ALL'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              Semua ({members.length})
            </button>
            {allRoles.map((role) => {
              const count = members.filter((m) => m.role.trim().toUpperCase() === role).length;
              const isSelected = selectedRole === role;
              return (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <span>{role}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-900 text-slate-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Progress Bar for PDF Generation */}
          {pdfProgress && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-200 text-xs flex items-center justify-between gap-3 animate-pulse">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span className="font-medium">{pdfProgress.message}</span>
              </div>
              <span className="font-mono font-bold text-amber-300">
                {pdfProgress.current} / {pdfProgress.total} (
                {Math.round((pdfProgress.current / Math.max(1, pdfProgress.total)) * 100)}%)
              </span>
            </div>
          )}
        </div>

        {/* Gallery / Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0a0b12] space-y-4">
          {filtered.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center space-y-2 text-slate-400">
              <FileText className="w-10 h-10 opacity-30 text-amber-400" />
              <p className="text-sm font-semibold">Tiada kad AJK dijumpai untuk carian ini.</p>
              <button
                onClick={() => {
                  setSelectedRole('ALL');
                  setSearchQuery('');
                }}
                className="text-xs text-amber-400 hover:underline"
              >
                Set semula penapis
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((member, idx) => (
                <div
                  key={member.id}
                  className="rounded-2xl border border-amber-500/30 bg-[#141624] overflow-hidden shadow-lg hover:border-amber-400/60 transition group flex flex-col"
                >
                  {/* Card Visual Top Preview */}
                  <div className="p-4 bg-gradient-to-b from-[#22180d] to-[#160f08] border-b border-amber-500/20 text-center relative overflow-hidden flex-1 flex flex-col justify-between min-h-[220px]">
                    {/* Corner filigree accents */}
                    <div className="text-[10px] text-amber-500/40 absolute top-2 left-2">✦</div>
                    <div className="text-[10px] text-amber-500/40 absolute top-2 right-2">✦</div>

                    {/* Header Snippet */}
                    <div className="space-y-0.5">
                      <div className="text-[8px] font-black tracking-widest uppercase font-serif-vintage text-amber-400/90">
                        MAJLIS APRESIASI
                      </div>
                      <div className="text-xs font-serif-vintage italic text-amber-200">
                        Lembaga Pengawas Sekolah
                      </div>
                      <div className="text-[8px] font-bold tracking-wider text-amber-400/70">
                        SMK BANDAR SERI PUTRA
                      </div>
                      <div className="text-[8px] text-amber-500/50">❦</div>
                    </div>

                    {/* Middle: Role & Name */}
                    <div className="my-3 space-y-1">
                      <div className="text-xs font-black tracking-wider uppercase font-serif-vintage text-amber-300 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-400/30 inline-block max-w-full truncate">
                        {member.role}
                      </div>
                      <div className="text-sm font-bold font-serif-vintage text-white line-clamp-2 leading-snug pt-1">
                        {member.name}
                      </div>
                      <div className="text-xs italic text-amber-200/90 font-serif">
                        {member.className}
                      </div>
                    </div>

                    {/* Footer Snippet */}
                    <div className="pt-2 border-t border-amber-500/20 text-[8px] font-bold tracking-wider text-amber-400/80 uppercase">
                      {member.date} • {member.venue}
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="p-2.5 bg-[#0f111a] flex items-center justify-between gap-1 text-xs">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDownloadSinglePng(member)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white transition cursor-pointer"
                        title="Muat turun imej PNG resolusi tinggi kad ini"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(member)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                        title="Sunting nama / jawatan / kelas"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleDeleteMember(member.id, member.name)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                      title="Padam ahli"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Bottom Status Bar */}
        <div className="p-3 bg-[#12141f] border-t border-amber-500/20 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Memaparkan {filtered.length} daripada {members.length} Ahli Jawatankuasa
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span>Ukuran Standard Pas: 50mm × 85mm</span>
            <span>•</span>
            <span className="text-amber-300">Siap sedia cetak skala 100%</span>
          </div>
        </div>
      </div>

      {/* Edit / Add Member Dialog */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141624] border-2 border-amber-400 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-serif-vintage text-amber-300">
                {editingMember ? 'Sunting Ahli Jawatankuasa' : 'Tambah Ahli Jawatankuasa'}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Jawatan / Sektor AJK</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EVENT COORDINATOR, HOST, HADIAH"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full bg-[#181a28] border border-amber-500/40 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-amber-400 uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Nama Penuh Murid</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Muhammad Adam Iman bin Muzzan"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-[#181a28] border border-amber-500/40 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Tingkatan / Kelas</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5 Mumtaz, 4 Ametis, 3 Baiduri"
                  value={formClass}
                  onChange={(e) => setFormClass(e.target.value)}
                  className="w-full bg-[#181a28] border border-amber-500/40 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Tarikh</label>
                  <input
                    type="text"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-[#181a28] border border-slate-700 rounded-xl px-3 py-1.5 text-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Lokasi</label>
                  <input
                    type="text"
                    value={formVenue}
                    onChange={(e) => setFormVenue(e.target.value)}
                    className="w-full bg-[#181a28] border border-slate-700 rounded-xl px-3 py-1.5 text-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold font-serif-vintage hover:from-amber-400 hover:to-yellow-300 cursor-pointer"
                >
                  Simpan Kad AJK
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
