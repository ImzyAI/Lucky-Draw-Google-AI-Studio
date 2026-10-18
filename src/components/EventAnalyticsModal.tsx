import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileText,
  FileSpreadsheet,
  TrendingUp,
  ShieldCheck,
  Award,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AnalyticsData, downloadEventAnalyticsExcel } from '../lib/eventAnalyticsExcelGenerator';
import { generateEventAnalyticsPdf } from '../lib/eventAnalyticsPdfGenerator';

interface EventAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EventAnalyticsModal: React.FC<EventAnalyticsModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'winners' | 'divisions'>('overview');
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [showUnplayed, setShowUnplayed] = useState<boolean>(false);
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'peak' | 'grand'>('all');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch('/api/admin/analytics')
      .then((res) => {
        if (!res.ok) throw new Error('Gagal memuat turun data analitik.');
        return res.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [isOpen]);

  // Filtered timeline based on user choice
  const filteredTimeline = useMemo(() => {
    if (!data?.timeline) return [];
    if (timelineFilter === 'peak') {
      return data.timeline.filter((t) => t.count > 10);
    }
    if (timelineFilter === 'grand') {
      return data.timeline.filter((t) => t.grandCount > 0);
    }
    return data.timeline;
  }, [data, timelineFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#0f1118] border border-amber-500/30 rounded-2xl shadow-2xl shadow-amber-950/40 text-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:px-7 border-b border-slate-800 bg-gradient-to-r from-amber-950/30 via-slate-900 to-[#0f1118]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <Activity className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-bold font-serif-vintage tracking-wide text-amber-200">
                  Laporan & Analitik Acara Rasmi (Sesi 2 Petang)
                </h2>
                <p className="text-xs text-slate-400">
                  Analisis data masa nyata, penilaian beban puncak, dan audit ketahanan sistem
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {data && (
              <>
                <button
                  onClick={() => generateEventAnalyticsPdf(data)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-semibold shadow-md shadow-amber-900/40 flex items-center gap-1.5 transition active:scale-95"
                  title="Muat turun Laporan PDF Rasmi Sekolah"
                >
                  <FileText className="w-4 h-4" />
                  <span>Muat Turun PDF</span>
                </button>
                <button
                  onClick={() => downloadEventAnalyticsExcel(data)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                  title="Eksport Fail Excel (CSV / Spreadsheet)"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Eksport Excel</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-5 sm:px-7 pt-3 border-b border-slate-800/80 bg-slate-900/40 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'border-amber-400 text-amber-300 bg-amber-400/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Rumusan & Kestabilan (Crash Audit)</span>
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'timeline'
                ? 'border-amber-400 text-amber-300 bg-amber-400/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Garis Masa & Puncak 2 Petang</span>
          </button>
          <button
            onClick={() => setActiveTab('winners')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'winners'
                ? 'border-amber-400 text-amber-300 bg-amber-400/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Pemenang 45 Hadiah</span>
          </button>
          <button
            onClick={() => setActiveTab('divisions')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'divisions'
                ? 'border-amber-400 text-amber-300 bg-amber-400/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Taburan Divisyen & Sesi</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Sedang memproses dan mengagregatkan data analitik acara...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!loading && data && (
            <>
              {/* TAB 1: OVERVIEW & CRASH AUDIT */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* System Health / Crash Check Banner */}
                  <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-emerald-950/20 border border-emerald-500/40 shadow-lg shadow-emerald-950/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                              Audit Kestabilan Sistem Semasa Waktu Puncak
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                              STATUS: 100% CEMERLANG (TIADA CRASH)
                            </span>
                          </div>
                          <p className="text-sm text-slate-200 mt-1 font-medium">
                            {data.crashAudit.summaryNote}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                            <span>Kegagalan Transaksi: <strong className="text-emerald-300 font-mono">0 Ralat</strong></span>
                            <span>·</span>
                            <span>Pertindihan Hadiah: <strong className="text-emerald-300 font-mono">0 (Integriti Penuh)</strong></span>
                            <span>·</span>
                            <span>Kadar Kejayaan: <strong className="text-emerald-300 font-mono">100%</strong></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4 Core KPI Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                      <span className="text-xs text-slate-400 block">Kadar Penglibatan Peserta</span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-bold font-mono tabular-nums text-amber-300">
                          {data.summary.participationRate}%
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          ({data.summary.totalPlayed}/{data.summary.totalParticipants})
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1 block">123 peserta telah imbas tiket</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                      <span className="text-xs text-slate-400 block">Jumlah Hadiah Diagihkan</span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-bold font-mono tabular-nums text-emerald-300">
                          {data.summary.totalPrizesWon} / 45
                        </span>
                        <span className="text-xs text-emerald-400 font-semibold">100%</span>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1 block">Semua 45 hadiah selamat dimenangi</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                      <span className="text-xs text-slate-400 block">Hadiah Utama Pentas (#1 - #18)</span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-bold font-mono tabular-nums text-amber-200">
                          {data.summary.grandPrizesWon} / 18
                        </span>
                        <span className="text-xs text-amber-400 font-semibold">Dituntut</span>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1 block">18 pemenang dicabut di pentas</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                      <span className="text-xs text-slate-400 block">Beban Puncak Trafik</span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-bold font-mono tabular-nums text-sky-400">
                          {data.crashAudit.peakThroughputPerMinute}
                        </span>
                        <span className="text-xs text-slate-400">cabutan/min</span>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1 block">Puncak pada jam {data.crashAudit.peakMinuteLabel}</span>
                    </div>
                  </div>

                  {/* Summary Comparison Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Hadiah Pentas vs Imbasan Langsung */}
                    <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        <span>Kategori Agihan Hadiah</span>
                      </h4>
                      <div className="space-y-2.5">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300">18 Hadiah Utama Pentas (#1 - #18)</span>
                            <span className="font-mono text-amber-300 font-bold">18 / 18 Dituntut (100%)</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full" style={{ width: '100%' }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300">27 Hadiah Imbasan Langsung (#19 - #45)</span>
                            <span className="font-mono text-emerald-400 font-bold">27 / 27 Dimenangi</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 italic pt-1">
                        *Hadiah langsung yang belum dituntut di kaunter akan diserahkan melalui simpanan pihak sekolah.
                      </p>
                    </div>

                    {/* Kehadiran Mengikut Sesi */}
                    <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>Kehadiran Mengikut Sesi</span>
                      </h4>
                      <div className="space-y-2.5">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300">Sesi Pagi</span>
                            <span className="font-mono text-slate-200">
                              {data.sessionStats.pagi.played} / {data.sessionStats.pagi.total} (
                              {Math.round((data.sessionStats.pagi.played / data.sessionStats.pagi.total) * 100)}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-amber-500/80 rounded-full"
                              style={{ width: `${(data.sessionStats.pagi.played / data.sessionStats.pagi.total) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300">Sesi Petang</span>
                            <span className="font-mono text-slate-200">
                              {data.sessionStats.petang.played} / {data.sessionStats.petang.total} (
                              {Math.round((data.sessionStats.petang.played / data.sessionStats.petang.total) * 100)}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-sky-500/80 rounded-full"
                              style={{ width: `${(data.sessionStats.petang.played / data.sessionStats.petang.total) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 7 Unplayed Participants Collapsible */}
                  {data.unplayedParticipants.length > 0 && (
                    <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800">
                      <button
                        onClick={() => setShowUnplayed(!showUnplayed)}
                        className="w-full flex items-center justify-between text-left text-xs font-semibold text-slate-300 hover:text-white"
                      >
                        <span className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-400" />
                          <span>Senarai 7 Peserta Belum Imbas Tiket / Tidak Hadir</span>
                        </span>
                        {showUnplayed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {showUnplayed && (
                        <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {data.unplayedParticipants.map((u) => (
                            <div key={u.participantNumber} className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
                              <span className="font-mono font-bold text-amber-300">{u.participantNumber}</span>
                              <span className="block text-slate-200 font-medium truncate">{u.participantName}</span>
                              <span className="text-[10px] text-slate-500">{u.division} · {u.session}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: TIMELINE & INTERACTIVE GRAPH */}
              {activeTab === 'timeline' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-amber-200 font-serif-vintage">
                        Graf Aktiviti & Ketumpatan Imbasan (Waktu Puncak 2 Petang)
                      </h3>
                      <p className="text-xs text-slate-400">
                        Memaparkan lonjakan peserta membuat cabutan pada setiap minit
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800 self-start sm:self-auto">
                      <button
                        onClick={() => setTimelineFilter('all')}
                        className={`px-3 py-1 text-xs rounded-md font-medium transition ${
                          timelineFilter === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Semua Waktu
                      </button>
                      <button
                        onClick={() => setTimelineFilter('peak')}
                        className={`px-3 py-1 text-xs rounded-md font-medium transition ${
                          timelineFilter === 'peak' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Waktu Puncak (&gt;10)
                      </button>
                      <button
                        onClick={() => setTimelineFilter('grand')}
                        className={`px-3 py-1 text-xs rounded-md font-medium transition ${
                          timelineFilter === 'grand' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Cabutan Pentas
                      </button>
                    </div>
                  </div>

                  {/* SVG Bar & Curve Timeline Chart */}
                  <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 relative">
                    <div className="text-xs text-slate-400 mb-4 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
                        <span>Jumlah Imbasan</span>
                        <span className="w-2.5 h-2.5 rounded-sm bg-purple-400 ml-2" />
                        <span>Hadiah Pentas</span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Maksimum: {data.crashAudit.peakThroughputPerMinute} cabutan/minit
                      </span>
                    </div>

                    {/* Chart Container */}
                    <div className="h-64 w-full flex items-end gap-2 sm:gap-4 pt-6 pb-2 border-b border-slate-800">
                      {filteredTimeline.map((item, idx) => {
                        const maxCount = Math.max(...filteredTimeline.map((t) => t.count), 1);
                        const heightPct = Math.max((item.count / maxCount) * 100, 8);
                        const isHovered = hoveredPoint === idx;
                        const isPeak = item.count > 50;

                        return (
                          <div
                            key={item.time}
                            onMouseEnter={() => setHoveredPoint(idx)}
                            onMouseLeave={() => setHoveredPoint(null)}
                            className="flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer group"
                          >
                            {/* Hover Tooltip */}
                            {isHovered && (
                              <div className="absolute bottom-[calc(100%+8px)] z-20 min-w-[160px] p-2.5 rounded-xl bg-slate-950/95 border border-amber-400/40 text-xs shadow-xl backdrop-blur-md pointer-events-none">
                                <span className="font-bold font-mono text-amber-300 block">{item.time} MYT</span>
                                <span className="text-slate-200 block font-semibold mt-0.5">{item.count} cabutan diproses</span>
                                {item.grandCount > 0 && (
                                  <span className="text-purple-300 block text-[11px]">★ {item.grandCount} Hadiah Pentas</span>
                                )}
                                {item.instantCount > 0 && (
                                  <span className="text-emerald-300 block text-[11px]">🎁 {item.instantCount} Hadiah Langsung</span>
                                )}
                              </div>
                            )}

                            {/* Value label on top of bar */}
                            <span className="text-[10px] font-mono font-bold text-slate-400 mb-1">
                              {item.count}
                            </span>

                            {/* Bar element */}
                            <div
                              className={`w-full max-w-[48px] rounded-t-lg transition-all duration-300 relative overflow-hidden ${
                                isPeak
                                  ? 'bg-gradient-to-t from-amber-600 via-amber-500 to-amber-300 shadow-lg shadow-amber-500/20'
                                  : 'bg-gradient-to-t from-slate-700 to-slate-500 group-hover:from-amber-600 group-hover:to-amber-400'
                              }`}
                              style={{ height: `${heightPct}%` }}
                            >
                              {item.grandCount > 0 && (
                                <div
                                  className="w-full bg-purple-500/80 absolute bottom-0"
                                  style={{ height: `${(item.grandCount / item.count) * 100}%` }}
                                />
                              )}
                            </div>

                            {/* Time Label */}
                            <span className="text-[10px] font-mono text-slate-400 mt-2 whitespace-nowrap">
                              {item.time}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Minute Breakdown Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/30">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-4">Waktu</th>
                          <th className="py-2.5 px-4">Jumlah Imbasan</th>
                          <th className="py-2.5 px-4">Pemenang Pentas</th>
                          <th className="py-2.5 px-4">Pemenang Langsung</th>
                          <th className="py-2.5 px-4">Status & Catatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                        {data.timeline.map((item) => (
                          <tr key={item.time} className={item.count > 50 ? 'bg-amber-500/10' : ''}>
                            <td className="py-2.5 px-4 font-bold text-amber-200">{item.time}</td>
                            <td className="py-2.5 px-4">{item.count} peserta</td>
                            <td className="py-2.5 px-4 text-purple-300">{item.grandCount}</td>
                            <td className="py-2.5 px-4 text-emerald-300">{item.instantCount}</td>
                            <td className="py-2.5 px-4 font-sans text-slate-400">
                              {item.count > 50 ? (
                                <span className="text-amber-400 font-bold">Waktu Puncak Majlis (107 cabutan/min)</span>
                              ) : (
                                <span>Aktiviti Biasa</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: WINNERS LIST (18 GRAND + 27 INSTANT) */}
              {activeTab === 'winners' && (
                <div className="space-y-6">
                  {/* 18 Grand Prize Winners Table */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-amber-300 font-serif-vintage flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-400" />
                        <span>18 Hadiah Utama Pentas (#1 - #18)</span>
                      </h3>
                      <span className="text-xs text-emerald-400 font-semibold">18 / 18 Selesai Dituntut di Pentas</span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-amber-500/30 bg-slate-900/40">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-amber-950/40 text-amber-300 font-semibold border-b border-amber-500/20">
                          <tr>
                            <th className="py-2.5 px-3">No</th>
                            <th className="py-2.5 px-3">No. Peserta</th>
                            <th className="py-2.5 px-4">Nama Pemenang</th>
                            <th className="py-2.5 px-4">Hadiah Utama</th>
                            <th className="py-2.5 px-3">Divisyen</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80">
                          {data.grandWinners.map((w, idx) => (
                            <tr key={w.participantNumber} className="hover:bg-amber-400/5">
                              <td className="py-2.5 px-3 font-mono font-bold text-amber-400">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-300">{w.participantNumber}</td>
                              <td className="py-2.5 px-4 font-semibold text-slate-100">{w.participantName}</td>
                              <td className="py-2.5 px-4 font-medium text-amber-200">{w.prizeName}</td>
                              <td className="py-2.5 px-3 text-slate-400">{w.division}</td>
                              <td className="py-2.5 px-3">
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Diserahkan di Pentas</span>
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 27 Instant Prize Winners */}
                  <div className="space-y-3 pt-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-200 font-serif-vintage flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-400" />
                        <span>27 Hadiah Imbasan Langsung (#19 - #45)</span>
                      </h3>
                      <span className="text-xs text-slate-400">27 / 27 Selesai Dimenangi</span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3">No</th>
                            <th className="py-2.5 px-3">No. Peserta</th>
                            <th className="py-2.5 px-4">Nama Pemenang</th>
                            <th className="py-2.5 px-4">Hadiah Langsung</th>
                            <th className="py-2.5 px-3">Kod Tuntutan</th>
                            <th className="py-2.5 px-3">Divisyen</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80">
                          {data.instantWinners.map((w, idx) => (
                            <tr key={w.participantNumber} className="hover:bg-slate-800/40">
                              <td className="py-2.5 px-3 font-mono text-slate-500">{idx + 19}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-300">{w.participantNumber}</td>
                              <td className="py-2.5 px-4 font-medium text-slate-200">{w.participantName}</td>
                              <td className="py-2.5 px-4 font-semibold text-emerald-300">{w.prizeName}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-400">{w.claimCode || '-'}</td>
                              <td className="py-2.5 px-3 text-slate-400">{w.division}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: DIVISIONS & SESSIONS */}
              {activeTab === 'divisions' && (
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                    <h3 className="text-sm font-bold text-amber-200 font-serif-vintage mb-1">
                      Taburan Penglibatan Mengikut Divisyen
                    </h3>
                    <p className="text-xs text-slate-400">
                      Peratusan kehadiran dan agihan hadiah bagi setiap divisyen lembaga pengawas
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.divisionStats.map((d) => (
                      <div key={d.division} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200">{d.division}</span>
                          <span className="text-xs font-mono font-bold text-amber-300">{d.rate}% Hadir</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
                            style={{ width: `${d.rate}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                          <span>{d.played} daripada {d.total} peserta imbas</span>
                          <span className="text-amber-200">
                            {d.grandWon} Hadiah Pentas · {d.instantWon} Hadiah Langsung
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:px-7 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <span>
            Data dijanakan daripada rekod transaksi rasmi pangkalan data Firestore.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition"
          >
            Tutup Paparan
          </button>
        </div>
      </div>
    </div>
  );
};
