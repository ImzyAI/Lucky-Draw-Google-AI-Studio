import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Trophy, Gift, X, Volume2, VolumeX, BellRing } from 'lucide-react';
import { WinnerAnnouncement } from '../types';
import { sound } from '../lib/sound';

export const triggerGlobalTestNotification = async () => {
  await sound.unlockContext();
  sound.playNotificationDing();
  sound.playCelebrationFanfare();

  try {
    await fetch('/api/test/broadcast-win', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        winnerName: 'Muhammad Danish (Ujian Pengawas)',
        participantNumber: 'BP-007',
        prizeName: 'Hamper Khas Apresiasi Pengawas',
        prizeCategory: 'Standard Prize',
      }),
    });
  } catch (e) {}
};

interface GlobalWinnerNotificationProps {
  isLightMode?: boolean;
}

export const GlobalWinnerNotification: React.FC<GlobalWinnerNotificationProps> = ({
  isLightMode = false,
}) => {
  const [activeAnnouncements, setActiveAnnouncements] = useState<WinnerAnnouncement[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const seenIdsRef = useRef<Set<string>>(new Set());

  // Silent automatic audio unlock on any passive interaction - no banner needed
  useEffect(() => {
    sound.setMute(false);
    const silentUnlock = () => {
      sound.unlockContext();
    };
    ['touchstart', 'touchend', 'click', 'pointerdown', 'keydown'].forEach((evt) => {
      window.addEventListener(evt, silentUnlock, { passive: true });
    });
    return () => {
      ['touchstart', 'touchend', 'click', 'pointerdown', 'keydown'].forEach((evt) => {
        window.removeEventListener(evt, silentUnlock);
      });
    };
  }, []);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let fallbackInterval: any = null;

    const connectSse = () => {
      try {
        eventSource = new EventSource('/api/events');

        eventSource.addEventListener('big_win', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            handleNewAnnouncement(data);
          } catch (err) {}
        });

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
        };
      } catch (err) {}
    };

    const pollAnnouncements = async () => {
      try {
        const res = await fetch('/api/announcements');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.announcements)) {
            const recent = data.announcements.slice(0, 5);
            recent.reverse().forEach((item: WinnerAnnouncement) => {
              const ageMs = Date.now() - new Date(item.timestamp).getTime();
              if (ageMs < 16000 && !seenIdsRef.current.has(item.id)) {
                handleNewAnnouncement(item);
              } else {
                seenIdsRef.current.add(item.id);
              }
            });
          }
        }
      } catch (e) {}
    };

    connectSse();
    // Gentle 30s fallback (SSE pushes real-time big_win announcements instantly)
    fallbackInterval = setInterval(pollAnnouncements, 30000);

    return () => {
      if (eventSource) eventSource.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, []);

  const triggerConfetti = (isGrand: boolean) => {
    try {
      if (isGrand) {
        confetti({
          particleCount: 80,
          spread: 90,
          origin: { y: 0.15 },
          colors: ['#ffd700', '#f59e0b', '#fbbf24', '#ffffff', '#e11d48'],
        });
      } else {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.15 },
          colors: ['#d4af37', '#6366f1', '#fbbf24', '#38bdf8'],
        });
      }
    } catch (e) {}
  };

  const handleNewAnnouncement = (ann: WinnerAnnouncement) => {
    if (seenIdsRef.current.has(ann.id)) return;
    seenIdsRef.current.add(ann.id);

    if (ann.type === 'BIG_WIN') {
      const isGrand =
        /grand|emas|pentas/i.test(ann.prizeCategory || '') ||
        /pentas|golden pass/i.test(ann.prizeName || '');

      // Overlap queue: newest goes to front (index 0)
      setActiveAnnouncements((prev) => {
        const next = [ann, ...prev.filter((item) => item.id !== ann.id)];
        return next.slice(0, 3);
      });

      // Sound effects guaranteed for all users with silent unlock
      sound.unlockContext();
      sound.playNotificationDing();
      if (isGrand) {
        sound.playGrandPrizeFanfare();
      } else {
        sound.playCelebrationFanfare();
      }

      triggerConfetti(isGrand);

      setTimeout(() => {
        dismissAnnouncement(ann.id);
      }, 9000);
    }
  };

  const dismissAnnouncement = (id: string) => {
    setActiveAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  const toggleSound = () => {
    const next = sound.toggleMute();
    setIsMuted(next);
  };

  return (
    <>
      {/* Overlapping Announcement Stack */}
      {activeAnnouncements.length > 0 && (
        <div
          id="global-winner-notifications"
          className="fixed top-3 left-0 right-0 z-50 pointer-events-none flex flex-col items-center px-3 max-w-lg mx-auto"
        >
          <div className="relative w-full">
            <AnimatePresence>
              {activeAnnouncements.map((ann, index) => {
                const isGrand =
                  /grand|emas|pentas/i.test(ann.prizeCategory || '') ||
                  /pentas|golden pass/i.test(ann.prizeName || '');

                return (
                  <motion.div
                    key={ann.id}
                    initial={{ opacity: 0, y: -25, scale: 0.95 }}
                    animate={{
                      opacity: 1,
                      y: index * 10,
                      scale: 1 - index * 0.03,
                      zIndex: 50 - index,
                    }}
                    exit={{ opacity: 0, y: -15, scale: 0.9 }}
                    transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                    style={{
                      position: index === 0 ? 'relative' : 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                    }}
                    className={`w-full pointer-events-auto rounded-2xl p-3.5 sm:p-4 border-2 shadow-2xl relative overflow-hidden backdrop-blur-md transition-all ${
                      isLightMode
                        ? isGrand
                          ? 'border-[#b38628] bg-gradient-to-r from-[#fff9ea] via-[#fff4d1] to-[#fff9ea] text-[#2c2416] shadow-amber-900/20'
                          : 'border-[#c5a059]/70 bg-gradient-to-r from-[#fbf8f2] via-[#f7f2e7] to-[#fbf8f2] text-[#2c2416] shadow-amber-900/15'
                        : isGrand
                        ? 'border-amber-400 bg-gradient-to-r from-[#201c12] via-[#16140e] to-[#201c12] text-white shadow-amber-500/30'
                        : 'border-amber-500/50 bg-gradient-to-r from-[#171926] via-[#12131d] to-[#171926] text-white shadow-black/60'
                    }`}
                  >
                    <div className="relative z-10 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-sm ${
                            isLightMode
                              ? isGrand
                                ? 'bg-amber-200/70 border-[#b38628] text-[#8c6721]'
                                : 'bg-amber-100/70 border-[#c5a059] text-[#704e12]'
                              : isGrand
                              ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                              : 'bg-amber-500/15 border-amber-400/30 text-amber-300'
                          }`}
                        >
                          {isGrand ? (
                            <Trophy className="w-5 h-5 animate-pulse" />
                          ) : (
                            <Gift className="w-5 h-5" />
                          )}
                        </div>

                        <div className="min-w-0 leading-tight">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-serif-vintage border ${
                                isLightMode
                                  ? 'bg-amber-100 text-[#704e12] border-[#c5a059]/50'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                              }`}
                            >
                              {isGrand ? '🏆 PENTAS UTAMA' : '✨ PEMENANG CABUTAN'}
                            </span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/20 text-amber-500">
                              {ann.participantNumber}
                            </span>
                          </div>

                          <div className="text-xs sm:text-sm font-bold truncate">
                            <span className="font-serif-vintage">{ann.winnerName}</span>{' '}
                            <span className="font-normal opacity-80">menang</span>{' '}
                            <span className="font-bold font-serif-vintage">"{ann.prizeName}"</span>
                          </div>

                          <p className="text-[11px] opacity-75 font-medium mt-0.5">
                            {isGrand
                              ? 'Penyerahan di pentas sekarang!'
                              : 'Tuntut di sekolah (Bilik Pengawas)'}
                          </p>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={toggleSound}
                          className="p-1 rounded-lg hover:bg-black/10 transition cursor-pointer"
                          title={isMuted ? 'Buka Suara' : 'Senyapkan'}
                        >
                          {isMuted ? (
                            <VolumeX className="w-3.5 h-3.5 opacity-50" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5 text-amber-500" />
                          )}
                        </button>
                        <button
                          onClick={() => dismissAnnouncement(ann.id)}
                          className="p-1 rounded-lg hover:bg-black/10 transition cursor-pointer"
                          title="Tutup"
                        >
                          <X className="w-3.5 h-3.5 opacity-70" />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Timer Progress */}
                    <motion.div
                      initial={{ width: '100%' }}
                      animate={{ width: '0%' }}
                      transition={{ duration: 9.0, ease: 'linear' }}
                      className="absolute bottom-0 left-0 h-0.5 bg-amber-500/40"
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}
    </>
  );
};
