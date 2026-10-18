import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, RefreshCw, KeyRound, Sparkles } from 'lucide-react';
import { EventStatus } from '../types';

interface EventLockScreenProps {
  status: EventStatus;
  onOpenAdmin: () => void;
  onCheckStatus?: () => Promise<void> | void;
  isLightMode?: boolean;
  isCountingDown?: boolean;
  countdownNumber?: number | null;
}

interface PresenceData {
  activeOnline: number;
  totalPlayed: number;
  totalWaiting: number;
  totalParticipants: number;
}

export const EventLockScreen: React.FC<EventLockScreenProps> = ({
  status,
  onOpenAdmin,
  onCheckStatus,
  isLightMode = false,
  isCountingDown = false,
  countdownNumber = null,
}) => {
  const [checking, setChecking] = useState<boolean>(false);
  const [checkFeedback, setCheckFeedback] = useState<string | null>(null);

  // Live in-hall presence & queue status (100% Real Live Data)
  const [presence, setPresence] = useState<PresenceData>({
    activeOnline: 1,
    totalPlayed: 0,
    totalWaiting: 130,
    totalParticipants: 130,
  });

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let isSubscribed = true;

    const fetchPresence = async () => {
      try {
        const res = await fetch('/api/presence');
        if (res.ok && isSubscribed) {
          const d = await res.json();
          if (d && typeof d.totalPlayed === 'number') {
            setPresence(d);
          }
        }
      } catch (e) {}
    };

    fetchPresence();
    const interval = setInterval(fetchPresence, 4500);

    try {
      let deviceId = '';
      try {
        deviceId = localStorage.getItem('smkbsp_device_uuid') || '';
        if (!deviceId) {
          deviceId = 'dev_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
          localStorage.setItem('smkbsp_device_uuid', deviceId);
        }
      } catch (e) {
        deviceId = 'dev_' + Math.random().toString(36).substring(2, 9);
      }

      eventSource = new EventSource(`/api/events?clientId=${encodeURIComponent(deviceId)}`);
      eventSource.addEventListener('presence_tick', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload && typeof payload.totalPlayed === 'number' && isSubscribed) {
            setPresence(payload);
          }
        } catch (err) {}
      });
    } catch (e) {}

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  const handleManualCheck = async () => {
    if (checking) return;
    setChecking(true);
    setCheckFeedback(null);
    try {
      if (onCheckStatus) {
        await onCheckStatus();
      }
      setCheckFeedback('Status disemak: Sesi cabutan belum dibuka.');
    } catch (e) {
      setCheckFeedback('Gagal menghubungi pelayan. Sila cuba lagi.');
    } finally {
      setTimeout(() => {
        setChecking(false);
      }, 500);
      setTimeout(() => {
        setCheckFeedback(null);
      }, 3500);
    }
  };

  const isPaused = status === 'PAUSED';

  return (
    <div
      id="event-lock-screen"
      className={`fixed inset-0 z-50 flex flex-col justify-between items-center p-4 sm:p-6 select-none overflow-y-auto ${
        isLightMode
          ? 'bg-[#f7f4ed] text-[#2c2416]'
          : 'bg-[#090a0f] text-white'
      }`}
    >
      {/* Top spacer to balance the footer and keep center card perfectly centered */}
      <div className="w-full h-4 sm:h-8 shrink-0 pointer-events-none" />

      {/* Ornate vintage frame (Center card remains clean and uncluttered) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`w-full max-w-md rounded-3xl p-6 sm:p-8 text-center border-2 shadow-2xl relative overflow-hidden my-auto ${
          isLightMode
            ? 'bg-[#fffdfa] border-[#c5a059] shadow-amber-900/10'
            : 'bg-[#12141e]/95 border-amber-500/40 shadow-black'
        }`}
      >
        {/* Vintage gold top filigree accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#8c6721] via-[#d4af37] to-[#8c6721]" />

        {/* Vintage emblem */}
        <div className="my-3 flex items-center justify-center">
          <div
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 flex items-center justify-center shadow-md relative ${
              isLightMode
                ? 'bg-amber-100/60 border-[#b38628] text-[#8c6721]'
                : 'bg-amber-500/15 border-amber-400/40 text-amber-300'
            }`}
          >
            <Lock className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
        </div>

        {/* Official Event Title - EXACTLY "Majlis Apresiasi Lembaga Pengawas Sekolah" */}
        <div className="mb-4">
          <p
            className={`text-xs font-bold uppercase tracking-wider font-serif-vintage ${
              isLightMode ? 'text-[#8c6721]' : 'text-amber-300'
            }`}
          >
            ✦ Majlis Apresiasi Lembaga Pengawas Sekolah ✦
          </p>
        </div>

        {/* Message strictly as requested: "Laman web ini masih belum dibuka. Sila tunggu arahan daripada Pengacara Majlis." */}
        <div
          className={`p-5 rounded-2xl border my-4 text-center ${
            isLightMode
              ? 'bg-[#f9f5eb] border-[#d8c292] text-[#3d2f1b]'
              : 'bg-[#1a1712] border-amber-500/40 text-amber-100'
          }`}
        >
          <p className="text-base sm:text-lg font-bold font-serif-vintage leading-relaxed">
            {isPaused
              ? 'Sesi cabutan ditangguhkan seketika. Sila beri tumpuan kepada acara di pentas.'
              : 'Laman web ini masih belum dibuka. Sila tunggu arahan daripada Pengacara Majlis.'}
          </p>
        </div>

        {/* Status sync indicator */}
        <div
          className={`flex items-center justify-center gap-2 text-xs font-medium my-3 ${
            isLightMode ? 'text-[#705e46]' : 'text-slate-300'
          }`}
        >
          {isCountingDown ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-400/40 animate-pulse text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Detik Perasmian Sedang Berlangsung ({countdownNumber}s)...</span>
            </span>
          ) : (
            <>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Sistem akan dibuka secara automatik</span>
            </>
          )}
        </div>

        {/* Simple straightforward buttons */}
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <button
            onClick={handleManualCheck}
            disabled={checking}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold transition border flex items-center justify-center gap-2 cursor-pointer ${
              isLightMode
                ? 'bg-[#f0e8d8] hover:bg-[#e7dcbf] text-[#4a3b22] border-[#c5a059]'
                : 'bg-[#181a28] hover:bg-[#222438] text-amber-300 hover:text-white border-amber-500/30'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Menyemak...' : 'Semak Status'}</span>
          </button>

          <button
            onClick={onOpenAdmin}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              isLightMode
                ? 'bg-amber-50 hover:bg-amber-100 text-[#73541c] border-[#d8c292]'
                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Akses Admin Panel</span>
          </button>
        </div>

        {/* Feedback Alert */}
        <AnimatePresence>
          {checkFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className={`mt-3 text-xs font-medium ${
                isLightMode ? 'text-[#8c6721]' : 'text-amber-300'
              }`}
            >
              {checkFeedback}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* DISCREET, CLEAN LIVE IN-HALL PRESENCE FOOTER BAR ("Footer - Jgn semak di tengah") */}
      <footer className="w-full max-w-2xl mt-6 mb-2 shrink-0 z-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className={`px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl border backdrop-blur-md transition-all flex flex-wrap items-center justify-between gap-3 shadow-lg ${
            isLightMode
              ? 'bg-[#fffdfa]/95 border-[#c5a059]/40 text-[#2c2416] shadow-amber-900/5'
              : 'bg-[#12141e]/90 border-amber-500/30 text-slate-200 shadow-black/50'
          }`}
        >
          {/* Left: Live In-Hall Indicator */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
            </span>
            <span className="text-[10px] sm:text-[11px] font-black uppercase font-serif-vintage tracking-wider text-rose-400">
              SIARAN LANGSUNG DEWAN
            </span>
          </div>

          {/* Center / Right: Live Online & Queue Breakdown */}
          <div className="flex items-center flex-wrap gap-2 text-xs font-mono">
            {/* Active Online Phone Count */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-[10px] sm:text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{presence.activeOnline} Pengawas Di Talian</span>
            </div>

            {/* In-Hall Scan & Waiting Breakdown */}
            <div
              className={`flex items-center gap-2 px-2.5 py-1 rounded-full border text-[10px] sm:text-[11px] ${
                isLightMode
                  ? 'bg-amber-50/80 border-amber-200/80 text-slate-700'
                  : 'bg-slate-800/80 border-slate-700/80 text-slate-300'
              }`}
            >
              <span className="text-amber-400 font-semibold">
                ⏳ {presence.totalWaiting} Menunggu
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-emerald-400 font-medium">
                ✓ {presence.totalPlayed}/{presence.totalParticipants} Selesai
              </span>
            </div>
          </div>
        </motion.div>
      </footer>
    </div>
  );
};
