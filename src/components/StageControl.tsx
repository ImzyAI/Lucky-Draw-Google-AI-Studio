import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Crown,
  Sparkles,
  Trophy,
  Users,
  Award,
  Maximize2,
  Minimize2,
  RefreshCw,
  Gift,
  CheckCircle2,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Sliders,
  X,
  Music,
  ChevronRight,
  ChevronLeft,
  Settings,
  Lock,
} from 'lucide-react';
import { Prize, EventStatus } from '../types';
import { useSoundEffects } from '../hooks/useSoundEffects';

interface StageCandidate {
  participantId: string;
  participantNumber: string;
  participantName: string;
  division?: string;
  session?: string;
  grandPrizeStatus: 'PENDING_STAGE_DRAW' | 'REVEALED';
  prizeId?: string | null;
  prizeName?: string | null;
  playedAt?: string | null;
  stageDrawAt?: string | null;
}

interface EligibleParticipant {
  participantId: string;
  participantNumber: string;
  participantName: string;
  division?: string;
  session?: string;
  isGrandPrizeCandidate?: boolean;
  grandPrizeStatus?: string;
  status: string;
}

interface PrizeWinner {
  participantId: string;
  participantNumber: string;
  participantName: string;
  session?: string;
  division?: string;
  claimedAt?: string;
}

interface StageControlProps {
  onClose?: () => void;
  isLightMode?: boolean;
}

export const StageControl: React.FC<StageControlProps> = ({ onClose }) => {
  // Passcode gate (Password: stagecontrol123)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('stage_passcode_authenticated') === 'true';
    } catch {
      return false;
    }
  });
  const [passcodeInput, setPasscodeInput] = useState<string>('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  const handleVerifyPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcodeInput.trim() === 'stagecontrol123') {
      setIsAuthenticated(true);
      setPasscodeError(null);
      try {
        sessionStorage.setItem('stage_passcode_authenticated', 'true');
      } catch {}
    } else {
      setPasscodeError('Kata laluan pentas tidak sah.');
    }
  };

  // Main Theater Views: 'scanner' (Kaunter Dewan Langsung), 'wheel' (Pentas 16 Hadiah Utama), 'wall' (Wall of Fame)
  const [stageView, setStageView] = useState<'scanner' | 'wheel' | 'wall'>('scanner');

  // Slide-out MC Drawer state for technical operator controls (keeps stage 100% clean)
  const [isMcDrawerOpen, setIsMcDrawerOpen] = useState<boolean>(false);

  // Data states
  const [candidates, setCandidates] = useState<StageCandidate[]>([]);
  const [grandPrizePool, setGrandPrizePool] = useState<Prize[]>([]);
  const [prizeWinnersMap, setPrizeWinnersMap] = useState<Record<string, PrizeWinner[]>>({});
  const [liveStats, setLiveStats] = useState<{ totalParticipants: number; totalPlayed: number }>({
    totalParticipants: 130,
    totalPlayed: 0,
  });

  // Selected Grand Prize
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  const [sessionFilter, setSessionFilter] = useState<'ALL' | 'Sesi Pagi' | 'Sesi Petang'>('ALL');

  // Suspense wheel state
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [, setSuspensePhase] = useState<'idle' | 'spinning' | 'slowing' | 'climax' | 'winner'>('idle');
  const [currentReelParticipant, setCurrentReelParticipant] = useState<string>('Bersedia untuk cabutan pentas...');
  const [revealedResult, setRevealedResult] = useState<{
    winner: StageCandidate | EligibleParticipant;
    prize: Prize;
  } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isTestingAudio, setIsTestingAudio] = useState<boolean>(false);

  // Event session status
  const [eventStatus, setEventStatus] = useState<EventStatus>('CLOSED');
  const [statusUpdating, setStatusUpdating] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const spinTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sound effects
  const {
    isMuted,
    toggleMute,
    unlockAudio,
    playClick,
    playShuffleTick,
    playDramaticStageDrumroll,
    stopDramaticStageDrumroll,
    playSuspenseHeartbeat,
    playVictoryCymbalCrash,
    playCelebrationFanfare,
    playTestStageAudio,
    playCountdownBeep,
    playDrumroll,
    playInaugurationFanfare,
  } = useSoundEffects();

  useEffect(() => {
    return () => {
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
      stopDramaticStageDrumroll();
    };
  }, [stopDramaticStageDrumroll]);

  const handleTestStageAudio = async () => {
    if (isTestingAudio || isSpinning) return;
    setIsTestingAudio(true);
    await unlockAudio();
    playTestStageAudio();
    setTimeout(() => setIsTestingAudio(false), 4500);
  };

  const fetchStageState = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/stage-draw/state');
      if (res.ok) {
        const data = await res.json();
        // Stale-While-Revalidate: never wipe candidates if transient fetch is empty
        if (Array.isArray(data.candidates) && (data.candidates.length > 0 || candidates.length === 0)) {
          setCandidates(data.candidates);
        }
        const pool: Prize[] = data.grandPrizePool || [];
        // Stale-While-Revalidate: never wipe grandPrizePool if transient fetch is empty
        if (Array.isArray(pool) && pool.length > 0) {
          setGrandPrizePool(pool);
        }
        if (data.prizeWinnersMap && Object.keys(data.prizeWinnersMap).length > 0) {
          setPrizeWinnersMap(data.prizeWinnersMap);
        }

        // Auto select earliest prize with stock from active pool or cached pool
        setSelectedPrize((prev) => {
          const effectivePool = pool.length > 0 ? pool : grandPrizePool;
          if (prev) {
            const refreshed = effectivePool.find((p) => p.prizeId === prev.prizeId);
            if (refreshed) return refreshed;
          }
          const firstWithStock = effectivePool.find((p) => p.remainingQuantity > 0);
          return firstWithStock || effectivePool[0] || null;
        });
      }

      // Live counts and event status
      const ovRes = await fetch('/api/admin/overview');
      if (ovRes.ok) {
        const ovData = await ovRes.json();
        if (ovData.stats) {
          setLiveStats({
            totalParticipants: ovData.stats.totalParticipants || 130,
            totalPlayed: ovData.stats.totalPlayed || 0,
          });
        }
        if (ovData.event?.status) {
          setEventStatus(ovData.event.status);
        }
      }
    } catch (err) {
      console.error('Failed to load stage state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStageState();
    const interval = setInterval(fetchStageState, 3500);
    return () => clearInterval(interval);
  }, []);

  // SSE real-time listener
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');
      eventSource.addEventListener('event_status', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload?.status) setEventStatus(payload.status);
        } catch {}
      });
      eventSource.addEventListener('stage_candidate_added', () => {
        fetchStageState();
      });
      eventSource.addEventListener('stage_draw_revealed', () => {
        fetchStageState();
      });
    } catch {}

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Status toggle from MC Drawer
  const handleUpdateStatus = async (nextStatus: EventStatus) => {
    await unlockAudio();
    playClick();
    setStatusUpdating(true);
    try {
      const res = await fetch('/api/event/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, actor: 'Kawalan Pentas' }),
      });
      if (res.ok) setEventStatus(nextStatus);
    } catch {} finally {
      setStatusUpdating(false);
    }
  };

  // Inaugurate countdown trigger
  const handleInaugurateSession = async () => {
    await unlockAudio();
    playClick();
    try {
      await fetch('/api/event/inaugurate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: 'Pengacara Pentas' }),
      });
    } catch {}
  };

  // Advance to next prize in ladder
  const handleSelectNextPrize = () => {
    if (!selectedPrize || grandPrizePool.length === 0) return;
    const currentIdx = grandPrizePool.findIndex((p) => p.prizeId === selectedPrize.prizeId);
    for (let i = currentIdx + 1; i < grandPrizePool.length; i++) {
      if (grandPrizePool[i].remainingQuantity > 0) {
        setSelectedPrize(grandPrizePool[i]);
        setRevealedResult(null);
        return;
      }
    }
    const anyRemaining = grandPrizePool.find((p) => p.remainingQuantity > 0);
    if (anyRemaining) {
      setSelectedPrize(anyRemaining);
      setRevealedResult(null);
    }
  };

  // Grand Spin Wheel
  const handleStartSpin = async () => {
    if (!selectedPrize || isSpinning) return;
    if (selectedPrize.remainingQuantity <= 0) {
      setErrorMsg(`Hadiah "${selectedPrize.prizeName}" telah selesai dicabut.`);
      return;
    }

    await unlockAudio();
    playClick();

    setIsSpinning(true);
    setSuspensePhase('spinning');
    setRevealedResult(null);
    setErrorMsg(null);

    let stageResponse: any = null;

    try {
      const res = await fetch('/api/stage-draw/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prizeId: selectedPrize.prizeId,
          sessionFilter,
          actor: 'Pengacara Pentas',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal memulakan cabutan pentas.');
        setIsSpinning(false);
        setSuspensePhase('idle');
        return;
      }
      stageResponse = data;
    } catch {
      setErrorMsg('Gagal menyambung ke pelayan.');
      setIsSpinning(false);
      setSuspensePhase('idle');
      return;
    }

    let reelCandidates = candidates.filter((p) => p.grandPrizeStatus === 'PENDING_STAGE_DRAW');
    if (sessionFilter !== 'ALL') {
      const filtered = reelCandidates.filter((p) => (p.session || 'Sesi Pagi') === sessionFilter);
      if (filtered.length > 0) reelCandidates = filtered;
    }

    if (reelCandidates.length === 0) {
      setErrorMsg('Tiada calon finalis Tiket Emas yang sedang menunggu cabutan pentas.');
      setIsSpinning(false);
      setSuspensePhase('idle');
      return;
    }

    const candidateStrings = reelCandidates.map(
      (c) => `👑 [${c.participantNumber}] ${c.participantName} (${c.session || 'Sesi Pagi'})`
    );

    const startTime = Date.now();
    const duration = 7200; // 7.2s dramatic build-up
    let tickCount = 0;

    playDramaticStageDrumroll(7.2);

    if (spinTimerRef.current) clearTimeout(spinTimerRef.current);

    const scheduleTick = () => {
      const elapsed = Date.now() - startTime;

      if (elapsed >= duration) {
        stopDramaticStageDrumroll();
        setIsSpinning(false);
        setSuspensePhase('winner');

        if (stageResponse?.participant) {
          setRevealedResult({
            winner: stageResponse.participant,
            prize: stageResponse.prize,
          });

          playVictoryCymbalCrash();
          playCelebrationFanfare();

          confetti({
            particleCount: 260,
            spread: 160,
            origin: { y: 0.45 },
            colors: ['#ffd700', '#f59e0b', '#fbbf24', '#ffffff', '#e11d48'],
          });

          setTimeout(() => {
            confetti({
              particleCount: 180,
              spread: 120,
              origin: { x: 0.1, y: 0.6 },
              colors: ['#ffd700', '#f59e0b', '#38bdf8', '#ffffff'],
            });
            confetti({
              particleCount: 180,
              spread: 120,
              origin: { x: 0.9, y: 0.6 },
              colors: ['#ffd700', '#f59e0b', '#38bdf8', '#ffffff'],
            });
          }, 350);

          fetchStageState();
        }
        return;
      }

      const progress = elapsed / duration;
      if (progress < 0.62) {
        setSuspensePhase('spinning');
        playShuffleTick(0.92 + (tickCount % 6) * 0.08);
      } else if (progress < 0.85) {
        setSuspensePhase('slowing');
        playSuspenseHeartbeat(0.85);
      } else {
        setSuspensePhase('climax');
        playSuspenseHeartbeat(1.2);
      }

      if (stageResponse && elapsed > duration - 1200) {
        setCurrentReelParticipant(
          `👑 [${stageResponse.participant.participantNumber}] ${stageResponse.participant.participantName} (${stageResponse.participant.session || 'Sesi Pagi'})`
        );
      } else {
        const randIdx = Math.floor(Math.random() * candidateStrings.length);
        setCurrentReelParticipant(candidateStrings[randIdx]);
      }

      tickCount++;

      let nextDelay = 65;
      if (progress >= 0.93) nextDelay = 550;
      else if (progress >= 0.82) nextDelay = 220 + Math.floor(((progress - 0.82) / 0.11) * 260);
      else if (progress >= 0.62) nextDelay = 75 + Math.floor(((progress - 0.62) / 0.2) * 145);

      spinTimerRef.current = setTimeout(scheduleTick, nextDelay);
    };

    scheduleTick();
  };

  const pendingCandidates = candidates.filter((c) => c.grandPrizeStatus === 'PENDING_STAGE_DRAW');
  const revealedCandidates = candidates.filter((c) => c.grandPrizeStatus === 'REVEALED');

  // Total 16 Grand Prizes count
  const totalGrandPrizeUnits = grandPrizePool.reduce((sum, p) => sum + p.totalQuantity, 0);

  // Password Lock Gate
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#07080c] text-white p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md p-8 rounded-3xl bg-[#10121c] border border-amber-500/40 text-center space-y-5 shadow-2xl"
        >
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-xl">
            <Crown className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-black font-serif-vintage tracking-wide text-amber-300">
              Pentas Teater Projektor SMKBSP
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Sila masukkan kata laluan untuk melancarkan paparan projektor dewan.
            </p>
          </div>

          <form onSubmit={handleVerifyPasscode} className="space-y-4 pt-2">
            <input
              type="password"
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value)}
              placeholder="Kata laluan pentas"
              autoFocus
              required
              className="w-full px-4 py-3 rounded-xl bg-[#08090f] border border-amber-500/30 text-white text-center font-mono text-sm focus:outline-none focus:border-amber-400"
            />

            {passcodeError && (
              <p className="text-xs text-rose-400 font-semibold">{passcodeError}</p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-wider font-serif-vintage bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 text-slate-950 hover:brightness-110 transition cursor-pointer shadow-lg"
            >
              Buka Paparan Pentas
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 text-xs text-slate-400 hover:text-white transition cursor-pointer"
              >
                Kembali ke Paparan Pengawas
              </button>
            )}
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`min-h-screen w-full bg-[#07080e] text-slate-100 flex flex-col justify-between selection:bg-amber-500/30 relative overflow-x-hidden ${
        isFullscreen ? 'fixed inset-0 z-50 p-4 sm:p-6' : 'p-3 sm:p-6'
      }`}
    >
      {/* 1. CINEMATIC MINIMALIST TOP BAR (Clean & Uncluttered) */}
      <header className="w-full max-w-7xl mx-auto flex items-center justify-between pb-3 sm:pb-4 border-b border-amber-500/20">
        {/* Brand & Crest */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-sm shrink-0">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-black font-serif-vintage tracking-wider text-amber-300 uppercase leading-tight">
              SMK BANDAR SRI PUTRA
            </h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
              APRESIASI PENGAWAS 2026
            </p>
          </div>
        </div>

        {/* Center Mode Switcher (Clean, Pill-style buttons) */}
        <div className="flex items-center bg-[#10121d] border border-amber-500/30 rounded-2xl p-1 gap-1 shadow-inner">
          <button
            onClick={() => {
              playClick();
              setStageView('scanner');
            }}
            className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              stageView === 'scanner'
                ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Kaunter Dewan</span>
          </button>

          <button
            onClick={() => {
              playClick();
              setStageView('wheel');
            }}
            className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              stageView === 'wheel'
                ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-300" />
            <span>Cabutan Pentas ({totalGrandPrizeUnits || 16})</span>
          </button>

          <button
            onClick={() => {
              playClick();
              setStageView('wall');
            }}
            className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              stageView === 'wall'
                ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-300" />
            <span>Rekod Pemenang</span>
          </button>
        </div>

        {/* Right Utility Buttons (Audio, Fullscreen, MC Drawer, Exit) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-[#121422] border border-amber-500/25 text-amber-300 hover:bg-[#1a1c2e] transition cursor-pointer"
            title={isMuted ? 'Buka Suara' : 'Senyapkan'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-[#121422] border border-amber-500/25 text-amber-300 hover:bg-[#1a1c2e] transition cursor-pointer"
            title={isFullscreen ? 'Keluar Skrin Penuh' : 'Skrin Penuh (Projektor)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsMcDrawerOpen(true)}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-300 hover:bg-amber-500/25 transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Buka panel kawalan juruacara"
          >
            <Settings className="w-4 h-4 text-amber-400" />
            <span className="hidden md:inline">Kawalan MC</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Keluar ke Paparan Utama"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* 2. MAIN THEATER STAGE (Zero Administrative Clutter) */}
      <main className="w-full max-w-7xl mx-auto flex-1 flex flex-col justify-center py-4 sm:py-8">
        {/* VIEW 1: KAUNTER IMBASAN DEWAN LANGSUNG (Simultaneous Hall Scan Screen) */}
        {stageView === 'scanner' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-6 text-center"
          >
            {/* Majestic Stage Title */}
            <div className="space-y-1">
              <span className="text-[11px] font-black tracking-widest uppercase font-serif-vintage text-amber-400 px-4 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 inline-block mb-1">
                ✦ CABUTAN BERTUAH DIGITAL APRESIASI PENGAWAS 2026 ✦
              </span>
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black font-serif-vintage tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 drop-shadow-[0_2px_10px_rgba(245,158,11,0.3)]">
                KAUNTER IMBASAN DEWAN LANGSUNG
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-medium">
                Sila halakan kamera telefon pintar anda ke kod QR pada kad lanyard pengawas sekarang!
              </p>
            </div>

            {/* Giant Live Scan Meter Plaque */}
            <div className="max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#141624] via-[#0d0e17] to-[#08090f] border-2 border-amber-400/50 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500" />

              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="flex items-baseline justify-center gap-2 font-mono">
                  <span className="text-5xl sm:text-7xl lg:text-8xl font-black text-amber-300 tracking-tight drop-shadow-[0_4px_20px_rgba(245,158,11,0.5)]">
                    {liveStats.totalPlayed}
                  </span>
                  <span className="text-2xl sm:text-4xl font-bold text-slate-500">
                    / {liveStats.totalParticipants}
                  </span>
                </div>

                <div className="text-xs sm:text-sm font-black tracking-widest uppercase font-serif-vintage text-amber-400">
                  PENGAWAS TELAH BERJAYA MENGIMBAS
                </div>

                {/* Smooth Glowing Progress Bar */}
                <div className="w-full max-w-lg bg-slate-900 h-3 rounded-full overflow-hidden p-0.5 border border-amber-500/30 mt-2">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.8)]"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min(100, Math.round((liveStats.totalPlayed / Math.max(1, liveStats.totalParticipants)) * 100))}%`,
                    }}
                    transition={{ duration: 0.8 }}
                  />
                </div>

                <div className="text-[11px] text-slate-400 font-mono pt-1">
                  {Math.min(100, Math.round((liveStats.totalPlayed / Math.max(1, liveStats.totalParticipants)) * 100))}% Kehadiran Lengkap Imbasan
                </div>
              </div>
            </div>

            {/* 16 Golden Ticket Live Stage Slots (Audience sees Golden Tickets landing in real time!) */}
            <div className="w-full max-w-5xl mx-auto space-y-3 pt-2">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300 font-serif-vintage uppercase">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>Finalis Tiket Emas Pentas ({candidates.length} / {totalGrandPrizeUnits || 16} Ditemui)</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Layak mara ke pusingan cabutan pentas utama
                </span>
              </div>

              {/* 16 Golden Ticket Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
                {Array.from({ length: totalGrandPrizeUnits || 16 }).map((_, idx) => {
                  const candidate = candidates[idx];
                  const isClaimed = Boolean(candidate);

                  return (
                    <motion.div
                      key={idx}
                      initial={{ scale: 0.95 }}
                      animate={{ scale: 1 }}
                      className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center min-h-[90px] relative overflow-hidden ${
                        isClaimed
                          ? 'bg-gradient-to-b from-[#251f11] to-[#141209] border-amber-400 shadow-lg shadow-amber-500/20'
                          : 'bg-[#0f111c] border-slate-800 text-slate-600'
                      }`}
                    >
                      {isClaimed ? (
                        <>
                          <div className="w-6 h-6 rounded-full bg-amber-500/30 border border-amber-400 flex items-center justify-center text-amber-300 mb-1">
                            <Crown className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-amber-300">
                            {candidate.participantNumber}
                          </span>
                          <span className="text-[11px] font-bold text-white font-serif-vintage line-clamp-1 leading-tight mt-0.5">
                            {candidate.participantName}
                          </span>
                          <span className="text-[9px] text-amber-400/80 font-mono mt-0.5">
                            {candidate.session === 'Sesi Petang' ? 'Petang' : 'Pagi'}
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-6 h-6 rounded-full bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-600 mb-1">
                            <Sparkles className="w-3 h-3" />
                          </div>
                          <span className="text-[9px] font-mono text-slate-500">
                            Tiket #{idx + 1}
                          </span>
                          <span className="text-[10px] text-slate-500 italic mt-0.5 animate-pulse">
                            Menunggu...
                          </span>
                        </>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Quick Action to Enter Stage Wheel */}
            <div className="pt-2">
              <button
                onClick={() => {
                  playClick();
                  setStageView('wheel');
                }}
                className="px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-wider font-serif-vintage bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 text-slate-950 hover:brightness-110 transition shadow-xl shadow-amber-500/20 cursor-pointer flex items-center gap-2 mx-auto"
              >
                <Trophy className="w-5 h-5 text-slate-950" />
                <span>MULAKAN CABUTAN PENTAS UTAMA ({pendingCandidates.length} CALON TIKET EMAS) ➔</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* VIEW 2: CABUTAN 16 HADIAH UTAMA (Single Unified Grand Wheel Showcase) */}
        {stageView === 'wheel' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-6"
          >
            {/* Sleek Horizontal Prize Carousel */}
            <div className="w-full max-w-6xl mx-auto space-y-2">
              <div className="flex items-center justify-between px-2 text-xs">
                <span className="font-bold text-amber-300 font-serif-vintage uppercase flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-amber-400" />
                  <span>Pilih Hadiah Utama Pentas (#1 - #18):</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  {grandPrizePool.filter((p) => p.remainingQuantity > 0).length} Hadiah Bersedia
                </span>
              </div>

              {/* Horizontal Scrollable Prize Rail */}
              <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
                {grandPrizePool.map((pz, idx) => {
                  const isSelected = selectedPrize?.prizeId === pz.prizeId;
                  const isComplete = pz.remainingQuantity === 0;

                  return (
                    <button
                      key={pz.prizeId}
                      onClick={() => {
                        setSelectedPrize(pz);
                        setRevealedResult(null);
                        playClick();
                      }}
                      className={`px-3.5 py-2.5 rounded-2xl border transition text-left flex items-center gap-3 shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-amber-500/25 to-yellow-500/15 border-amber-400 ring-2 ring-amber-400/40 shadow-lg'
                          : isComplete
                          ? 'bg-[#0f101a] border-emerald-500/30 opacity-75'
                          : 'bg-[#121422] border-slate-800 hover:border-amber-500/40'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-mono font-bold text-xs shrink-0">
                        #{pz.order || idx + 1}
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-white font-serif-vintage block max-w-[170px] truncate">
                          {pz.prizeName}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                            isComplete
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {isComplete ? '✓ Selesai' : `${pz.remainingQuantity} Unit Baki`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* GRAND STAGE SPOTLIGHT CARD (Clean Centerpiece) */}
            <div className="w-full max-w-4xl mx-auto p-6 sm:p-10 rounded-3xl bg-gradient-to-b from-[#161828] via-[#0f111d] to-[#080910] border-2 border-amber-400/60 shadow-2xl relative overflow-hidden text-center space-y-6">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#8c6721] via-[#d4af37] to-[#8c6721]" />

              {selectedPrize ? (
                <>
                  {/* Prize Details Presentation */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-5 text-center sm:text-left max-w-2xl mx-auto">
                    {selectedPrize.imageUrl ? (
                      <img
                        src={selectedPrize.imageUrl}
                        alt={selectedPrize.prizeName}
                        className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-2xl border-2 border-amber-400/50 shadow-xl shrink-0"
                      />
                    ) : (
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-amber-500/20 border-2 border-amber-400/50 flex items-center justify-center text-amber-400 shrink-0">
                        <Gift className="w-12 h-12" />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-center sm:justify-start gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300">
                          👑 HADIAH UTAMA PENTAS
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono">
                          Baki: {selectedPrize.remainingQuantity} Unit
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-3xl font-black font-serif-vintage text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">
                        {selectedPrize.prizeName}
                      </h3>
                      <p className="text-xs text-slate-300">
                        {selectedPrize.description || 'Penyerahan rasmi di Pentas Utama dewan serta-merta'}
                      </p>
                    </div>
                  </div>

                  {/* SHUFFLE REEL OR WINNER ANNOUNCEMENT */}
                  {isSpinning ? (
                    <motion.div
                      initial={{ scale: 0.95 }}
                      animate={{ scale: 1 }}
                      className="p-8 sm:p-10 rounded-3xl bg-[#090b12] border-2 border-amber-400 text-center space-y-4 shadow-2xl relative overflow-hidden"
                    >
                      <div className="text-xs font-black uppercase tracking-widest text-amber-400 font-serif-vintage animate-pulse">
                        ✦ MEMUTAR NAMA DARI FINALIS TIKET EMAS ✦
                      </div>

                      <div className="h-20 flex items-center justify-center">
                        <div className="text-xl sm:text-3xl font-black font-serif-vintage text-amber-300 drop-shadow-[0_2px_10px_rgba(245,158,11,0.8)]">
                          {currentReelParticipant}
                        </div>
                      </div>

                      {/* Deceleration Progress Pulse */}
                      <div className="w-full max-w-md mx-auto bg-slate-900 h-2 rounded-full overflow-hidden p-0.5 border border-amber-500/30">
                        <motion.div
                          initial={{ width: '0%' }}
                          animate={{ width: '100%' }}
                          transition={{ duration: 7.2, ease: 'linear' }}
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300"
                        />
                      </div>
                    </motion.div>
                  ) : revealedResult ? (
                    /* VICTORY CELEBRATION REVEAL CARD */
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-[#221b0e] to-[#121008] border-2 border-amber-400 text-center space-y-4 shadow-2xl"
                    >
                      <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 shadow-xl">
                        <Trophy className="w-9 h-9 animate-bounce" />
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs font-bold uppercase tracking-widest text-amber-400 font-serif-vintage">
                          🏆 TAHNIAH KEPADA PEMENANG {revealedResult.prize.prizeName}!
                        </div>
                        <div className="text-2xl sm:text-4xl font-black font-serif-vintage text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                          {revealedResult.winner.participantName}
                        </div>
                        <div className="text-sm font-mono font-bold text-amber-300">
                          {revealedResult.winner.participantNumber} • {revealedResult.winner.session || 'Sesi Pagi'}
                          {revealedResult.winner.division ? ` • ${revealedResult.winner.division}` : ''}
                        </div>
                      </div>

                      <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
                        <button
                          onClick={handleSelectNextPrize}
                          className="px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider font-serif-vintage bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:brightness-110 transition shadow-lg cursor-pointer"
                        >
                          Teruskan Ke Hadiah Seterusnya ➔
                        </button>

                        {selectedPrize.remainingQuantity > 0 && pendingCandidates.length > 0 && (
                          <button
                            onClick={handleStartSpin}
                            className="px-5 py-3.5 rounded-xl text-xs font-bold border transition flex items-center gap-2 bg-[#181a28] border-amber-500/40 text-amber-300 hover:bg-[#202235] cursor-pointer"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span>Cabut Unit Seterusnya ({selectedPrize.remainingQuantity} baki)</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ) : selectedPrize.remainingQuantity > 0 ? (
                    pendingCandidates.length > 0 ? (
                      /* GRAND SPIN ACTION BUTTON */
                      <div className="py-6 space-y-4">
                        <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
                          Terdapat <strong className="text-amber-300 font-mono font-bold">{pendingCandidates.length} finalis Tiket Emas</strong> yang sedang menunggu di dewan. Tekan butang di bawah untuk memutarkan cabutan!
                        </p>

                        <button
                          onClick={handleStartSpin}
                          className="px-10 py-5 rounded-2xl text-base sm:text-xl font-black uppercase tracking-wider font-serif-vintage bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-400 text-slate-950 hover:brightness-110 transition shadow-2xl shadow-amber-500/40 flex items-center justify-center gap-3 mx-auto cursor-pointer"
                        >
                          <Play className="w-6 h-6 fill-current" />
                          <span>PUTAR CABUTAN PENTAS SEKARANG</span>
                        </button>
                      </div>
                    ) : (
                      /* WAITING FOR GOLDEN TICKETS */
                      <div className="py-8 space-y-3">
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-400/40 flex items-center justify-center text-amber-400 animate-pulse">
                          <Crown className="w-7 h-7" />
                        </div>
                        <h4 className="text-sm sm:text-base font-bold font-serif-vintage text-amber-300">
                          Menunggu Pengawas Memenangi Tiket Emas
                        </h4>
                        <p className="text-xs text-slate-400 max-w-md mx-auto">
                          Hanya murid yang memenangi Tiket Emas semasa imbasan di dewan yang layak ke pusingan pentas ini.
                        </p>
                      </div>
                    )
                  ) : (
                    /* ALL UNITS OF THIS PRIZE COMPLETED */
                    <div className="py-6 space-y-3">
                      <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold font-serif-vintage text-emerald-300">
                        Semua unit bagi hadiah ini telah selesai dicabut!
                      </h4>
                      <button
                        onClick={handleSelectNextPrize}
                        className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider font-serif-vintage bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:brightness-110 transition shadow-lg cursor-pointer"
                      >
                        Pilih Hadiah Seterusnya Dalam Tangga ➔
                      </button>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                      {errorMsg}
                    </div>
                  )}
                </>
              ) : (
                <div className="py-12 text-slate-400 text-xs">
                  Sila pilih hadiah dari tangga di atas untuk memulakan cabutan.
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* VIEW 3: REKOD PEMENANG PENTAS (Wall of Fame) */}
        {stageView === 'wall' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-6xl mx-auto space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
              <div>
                <h2 className="text-lg sm:text-2xl font-black font-serif-vintage text-amber-300">
                  REKOD KEMENANGAN 16 HADIAH UTAMA PENTAS
                </h2>
                <p className="text-xs text-slate-400">
                  Senarai pengawas bertuah yang telah memenangi Hadiah Utama di Pentas Majlis Apresiasi 2026.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
                {revealedCandidates.length} Hadiah Selesai Diserahkan
              </span>
            </div>

            {revealedCandidates.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-[#10121d] rounded-3xl border border-slate-800">
                <Trophy className="w-12 h-12 mx-auto text-slate-600" />
                <p className="text-sm text-slate-400 font-serif-vintage">
                  Belum ada cabutan hadiah utama yang disempurnakan di pentas.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {revealedCandidates.map((c) => (
                  <div
                    key={c.participantId}
                    className="p-4 rounded-2xl bg-gradient-to-b from-[#181a28] to-[#0f1019] border border-amber-400/40 shadow-lg space-y-2 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300">
                        {c.participantNumber}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Diserahkan
                      </span>
                    </div>

                    <h4 className="text-sm font-black font-serif-vintage text-white line-clamp-1">
                      {c.participantName}
                    </h4>

                    <div className="text-xs font-bold text-amber-400 line-clamp-1">
                      {c.prizeName || 'Hadiah Utama'}
                    </div>

                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800 font-mono">
                      {c.session || 'Sesi Pagi'} • {c.division || 'Pengawas'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </main>

      {/* 3. SLIDE-OUT MC / OPERATOR DRAWER (Tucked away so screen stays 100% clean) */}
      <AnimatePresence>
        {isMcDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMcDrawerOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 cursor-pointer"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[#10121d] border-l border-amber-500/30 z-50 p-6 flex flex-col justify-between overflow-y-auto shadow-2xl"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
                  <div className="flex items-center gap-2 text-amber-300 font-serif-vintage font-bold">
                    <Settings className="w-5 h-5 text-amber-400" />
                    <span>Panel Kawalan Juruacara (MC)</span>
                  </div>
                  <button
                    onClick={() => setIsMcDrawerOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Sesi Perasmian Countdown */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block font-serif-vintage">
                    1. Detik Perasmian Cabutan (Countdown 5s)
                  </span>
                  <p className="text-xs text-slate-400">
                    Kira detik 5 saat serentak dengan muzik dramatik ke seluruh telefon dan projektor.
                  </p>
                  <button
                    onClick={handleInaugurateSession}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 font-black text-xs font-serif-vintage uppercase hover:brightness-110 transition cursor-pointer shadow-md"
                  >
                    ✦ Lancarkan Detik Perasmian 5 Saat ✦
                  </button>
                </div>

                {/* Status Sesi Cabutan */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block font-serif-vintage">
                    2. Status Sesi Cabutan Bertuah
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleUpdateStatus('OPEN')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        eventStatus === 'OPEN'
                          ? 'bg-emerald-950 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/30'
                          : 'bg-[#181a28] border-slate-700 text-slate-400'
                      }`}
                    >
                      Buka
                    </button>
                    <button
                      onClick={() => handleUpdateStatus('PAUSED')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        eventStatus === 'PAUSED'
                          ? 'bg-amber-950 border-amber-400 text-amber-300 ring-2 ring-amber-500/30'
                          : 'bg-[#181a28] border-slate-700 text-slate-400'
                      }`}
                    >
                      Tangguh
                    </button>
                    <button
                      onClick={() => handleUpdateStatus('CLOSED')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        eventStatus === 'CLOSED'
                          ? 'bg-rose-950 border-rose-400 text-rose-300 ring-2 ring-rose-500/30'
                          : 'bg-[#181a28] border-slate-700 text-slate-400'
                      }`}
                    >
                      Tutup
                    </button>
                  </div>
                </div>

                {/* Sesi Filter */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block font-serif-vintage">
                    3. Tapisan Sesi Finalis
                  </span>
                  <select
                    value={sessionFilter}
                    onChange={(e) => setSessionFilter(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#181a28] border border-amber-500/30 text-white text-xs font-semibold focus:outline-none"
                  >
                    <option value="ALL">Semua Sesi (Pagi & Petang)</option>
                    <option value="Sesi Pagi">Pengawas Sesi Pagi Sahaja</option>
                    <option value="Sesi Petang">Pengawas Sesi Petang Sahaja</option>
                  </select>
                </div>

                {/* Ujian Audio Pentas */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block font-serif-vintage">
                    4. Ujian Sistem Audio Pentas
                  </span>
                  <button
                    onClick={handleTestStageAudio}
                    disabled={isTestingAudio}
                    className="w-full py-2.5 rounded-xl bg-[#181a28] border border-amber-500/30 text-amber-300 hover:bg-[#202235] text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Music className="w-4 h-4 text-amber-400" />
                    <span>{isTestingAudio ? 'Sedang Memainkan Ujian Audio...' : 'Uji Paluan Dram & Simbal Pentas'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 text-center">
                <button
                  onClick={() => setIsMcDrawerOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer"
                >
                  Tutup Panel Kawalan
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
