import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Crown, Sparkles, CheckCircle2, Volume2, VolumeX } from 'lucide-react';
import { useSoundEffects } from '../hooks/useSoundEffects';

interface InaugurationCountdownOverlayProps {
  countdownNumber: number | null; // 5, 4, 3, 2, 1, 0
  active: boolean;
  onFinished?: () => void;
  isLightMode?: boolean;
}

export const InaugurationCountdownOverlay: React.FC<InaugurationCountdownOverlayProps> = ({
  countdownNumber,
  active,
  onFinished,
}) => {
  const {
    isMuted,
    toggleMute,
    unlockAudio,
    playCountdownBeep,
    playInaugurationFanfare,
    playDrumroll,
  } = useSoundEffects();

  const prevNumberRef = useRef<number | null>(null);
  const hasTriggeredFinishedRef = useRef<boolean>(false);

  // Play audio beeps and effects on every tick
  useEffect(() => {
    if (!active || countdownNumber === null) {
      hasTriggeredFinishedRef.current = false;
      prevNumberRef.current = null;
      return;
    }

    if (prevNumberRef.current !== countdownNumber) {
      prevNumberRef.current = countdownNumber;

      if (countdownNumber > 0) {
        // Clear crisp tick beep for 5, 4, 3, 2, 1
        playCountdownBeep(false);
      } else if (countdownNumber === 0 && !hasTriggeredFinishedRef.current) {
        hasTriggeredFinishedRef.current = true;
        // Final launch beep + ceremonial royal fanfare & confetti
        playCountdownBeep(true);
        playDrumroll(1.5);
        setTimeout(() => {
          playInaugurationFanfare();
        }, 600);

        // Grand confetti burst across entire screen
        try {
          confetti({
            particleCount: 220,
            spread: 140,
            origin: { y: 0.45 },
            colors: ['#ffd700', '#f59e0b', '#fbbf24', '#ffffff', '#e11d48', '#b45309'],
          });
          setTimeout(() => {
            confetti({
              particleCount: 120,
              angle: 60,
              spread: 80,
              origin: { x: 0.1, y: 0.6 },
              colors: ['#ffd700', '#fbbf24', '#ffffff'],
            });
            confetti({
              particleCount: 120,
              angle: 120,
              spread: 80,
              origin: { x: 0.9, y: 0.6 },
              colors: ['#ffd700', '#fbbf24', '#ffffff'],
            });
          }, 350);
        } catch (e) {}

        if (onFinished) {
          setTimeout(() => {
            onFinished();
          }, 2400);
        }
      }
    }
  }, [countdownNumber, active, playCountdownBeep, playDrumroll, playInaugurationFanfare, onFinished]);

  if (!active || countdownNumber === null) return null;

  const isCompleted = countdownNumber === 0;

  return (
    <AnimatePresence>
      <motion.div
        key="inauguration-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/92 backdrop-blur-xl select-none"
      >
        {/* Audio helper toggle in top right */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 flex items-center gap-2">
          <button
            onClick={async () => {
              await unlockAudio();
              toggleMute();
            }}
            className="p-2.5 rounded-xl bg-[#161824] border border-amber-500/40 text-amber-300 hover:text-white transition shadow-lg flex items-center gap-2 text-xs font-semibold cursor-pointer"
            title={isMuted ? 'Buka Suara Countdown' : 'Senyapkan'}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-4 h-4 text-rose-400" />
                <span className="hidden sm:inline text-rose-300">Suara Ditutup</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline text-emerald-300">Audio Aktif</span>
              </>
            )}
          </button>
        </div>

        {/* Central Presentation Plaque */}
        <motion.div
          initial={{ scale: 0.88, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 1.05, opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full max-w-lg rounded-3xl p-6 sm:p-10 text-center relative overflow-hidden bg-[#0a0b12] border-2 border-amber-400/90 shadow-[0_0_90px_rgba(0,0,0,0.95),0_0_40px_rgba(217,119,6,0.4)] text-white"
        >
          {/* Top Decorative Filigree Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#8c6721] via-[#ffd700] to-[#8c6721]" />

          {/* Majestic Royal Header */}
          <div className="mb-4">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[11px] font-black uppercase tracking-widest font-serif-vintage shadow-sm">
              <Crown className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>Majlis Apresiasi Lembaga Pengawas Sekolah</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black font-serif-vintage tracking-wide text-amber-100 mt-2">
              ✦ Detik Perasmian Sesi Cabutan Bertuah ✦
            </h2>
            <p className="text-xs text-amber-200/80 mt-1">
              Disiarkan serentak ke semua skrin pengawas di dalam dewan
            </p>
          </div>

          {/* Central High-Contrast Display Window */}
          {!isCompleted ? (
            <div className="py-4">
              {/* Solid dark disc with gold rim ensuring MAXIMUM CONTRAST & LEGIBILITY */}
              <div className="relative w-40 h-40 sm:w-48 sm:h-48 mx-auto rounded-full bg-[#05060a] border-4 border-amber-400 shadow-[inset_0_4px_25px_rgba(0,0,0,1),0_0_50px_rgba(251,191,36,0.35)] flex items-center justify-center overflow-hidden">
                {/* Subtle ambient rotating glow ring inside disc */}
                <div className="absolute inset-1 rounded-full border border-amber-400/30 border-dashed animate-spin [animation-duration:18s]" />

                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={countdownNumber}
                    initial={{ scale: 0.35, opacity: 0, y: 15 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 1.45, opacity: 0 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                    className="font-mono font-black text-8xl sm:text-9xl text-[#ffd700] select-none leading-none drop-shadow-[0_6px_16px_rgba(0,0,0,1)]"
                  >
                    {countdownNumber}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Clear Step Indicators: [ 5 ] [ 4 ] [ 3 ] [ 2 ] [ 1 ] */}
              <div className="flex items-center justify-center gap-2 mt-6">
                {[5, 4, 3, 2, 1].map((step) => {
                  const isCurrent = countdownNumber === step;
                  const isPast = countdownNumber < step;
                  return (
                    <div
                      key={step}
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xs font-mono font-black transition-all ${
                        isCurrent
                          ? 'bg-amber-400 border-amber-300 text-slate-950 scale-110 shadow-[0_0_15px_rgba(251,191,36,0.8)]'
                          : isPast
                          ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-400'
                          : 'bg-[#12131e] border-slate-700/60 text-slate-400'
                      }`}
                    >
                      {step}
                    </div>
                  );
                })}
              </div>

              <p className="text-xs font-bold text-amber-300 animate-pulse mt-4">
                Bersedia... Membuka akses cabutan bertuah...
              </p>
            </div>
          ) : (
            /* Triumphant "DIRASMIKAN" State */
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, type: 'spring', bounce: 0.4 }}
              className="py-6 space-y-4"
            >
              <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.6)]">
                <Sparkles className="w-10 h-10 text-amber-300 animate-spin [animation-duration:8s]" />
              </div>

              <div>
                <div className="text-4xl sm:text-5xl font-black font-serif-vintage tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-100 drop-shadow-[0_4px_16px_rgba(245,158,11,0.6)]">
                  DIRASMIKAN!
                </div>
                <div className="text-sm sm:text-base font-bold font-serif-vintage text-emerald-400 mt-2 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Sesi Cabutan Bertuah Kini Dibuka Rasmi!</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-xs text-amber-200 font-medium max-w-sm mx-auto">
                Para pengawas boleh mula mengimbas pas lanyard dan mencabut hadiah sekarang!
              </div>
            </motion.div>
          )}

          {/* Footer Transparency Notice */}
          <div className="mt-4 pt-3 border-t border-amber-500/20 text-[10px] text-amber-300/60 font-serif-vintage">
            ✦ Sistem Cabutan Bertuah Digital SMK Bandar Seri Putra ✦
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
