import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Html5Qrcode } from 'html5-qrcode';
import QRCode from 'qrcode';
import {
  Award,
  Users,
  Radio,
  Sparkles,
  Gift,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Camera,
  Crown,
  Trophy,
  Volume2,
  VolumeX,
  UserCheck,
  Copy,
  Download,
  Check,
} from 'lucide-react';
import { Participant, EventStatus } from '../types';
import { useSoundEffects } from '../hooks/useSoundEffects';

interface ParticipantViewProps {
  initialToken?: string;
  isLightMode?: boolean;
}

export const ParticipantView: React.FC<ParticipantViewProps> = ({
  initialToken,
  isLightMode = false,
}) => {
  const [activeToken, setActiveToken] = useState<string>(initialToken || '');
  const [tokenInput, setTokenInput] = useState<string>('');
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [eventStatus, setEventStatus] = useState<EventStatus>('CLOSED');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sound effects hook
  const {
    isMuted,
    toggleMute,
    unlockAudio,
    playClick,
    playShuffleTick,
    playSuspenseRiser,
    playCelebrationFanfare,
    playGrandPrizeFanfare,
  } = useSoundEffects();

  // Scanner state
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [cameraStarting, setCameraStarting] = useState<boolean>(false);

  // Shuffle / Spin state
  const [isShuffling, setIsShuffling] = useState<boolean>(false);
  const [currentShuffleName, setCurrentShuffleName] = useState<string>('');
  const [drawResult, setDrawResult] = useState<any>(null);
  const isShufflingRef = useRef<boolean>(false);
  const [activePrizes, setActivePrizes] = useState<string[]>([]);
  const [claimQrDataUrl, setClaimQrDataUrl] = useState<string>('');
  const [claimCopied, setClaimCopied] = useState<boolean>(false);

  // Live in-hall presence & scan queue status ("mcm live org yg di talian")
  const [presence, setPresence] = useState<{
    activeOnline: number;
    totalPlayed: number;
    totalWaiting: number;
    totalParticipants: number;
  }>({
    activeOnline: 1,
    totalPlayed: 0,
    totalWaiting: 130,
    totalParticipants: 130,
  });

  useEffect(() => {
    const fetchPresence = async () => {
      try {
        const res = await fetch('/api/presence');
        if (res.ok) {
          const d = await res.json();
          if (d && typeof d.totalPlayed === 'number') {
            setPresence(d);
          }
        }
      } catch (e) {}
    };
    fetchPresence();
    const interval = setInterval(fetchPresence, 4500);
    return () => clearInterval(interval);
  }, []);

  // Generate high-resolution Claim QR Code for regular prize winner
  useEffect(() => {
    if (participant?.claimCode) {
      QRCode.toDataURL(`CLAIM:${participant.claimCode}`, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0b0c10',
          light: '#ffffff',
        },
      })
        .then((url) => setClaimQrDataUrl(url))
        .catch(() => {});
    } else {
      setClaimQrDataUrl('');
    }
  }, [participant?.claimCode]);

  const qrRegionId = 'qr-reader-region';
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const fetchActivePrizes = async () => {
      try {
        const res = await fetch('/api/prizes/active');
        if (res.ok) {
          const data = await res.json();
          if (data.prizeNames && Array.isArray(data.prizeNames)) {
            setActivePrizes(data.prizeNames);
          }
        }
      } catch (e) {}
    };
    fetchActivePrizes();
  }, []);

  const handleScanSuccess = (decodedText: string) => {
    let detectedToken = decodedText.trim();
    const urlMatch = detectedToken.match(/\/play\/([^/?#]+)/);
    const paramMatch = detectedToken.match(/[?&]token=([^&#]+)/);

    if (urlMatch) {
      detectedToken = urlMatch[1];
    } else if (paramMatch) {
      detectedToken = decodeURIComponent(paramMatch[1]);
    }

    stopScanner();
    setActiveToken(detectedToken);
    setTokenInput(detectedToken);
    fetchParticipant(detectedToken);
  };

  const startScanner = async () => {
    await unlockAudio();
    playClick();
    setScannerError(null);
    setCameraStarting(true);
    setIsScanning(true);

    // Allow DOM to render the scanner container element before initializing Html5Qrcode
    setTimeout(async () => {
      try {
        const el = document.getElementById(qrRegionId);
        if (!el) {
          throw new Error('Bekas imbasan belum siap di skrin.');
        }

        // Clean up previous instance if any
        if (html5QrCodeRef.current) {
          try {
            await html5QrCodeRef.current.stop();
          } catch (e) {}
          html5QrCodeRef.current = null;
        }

        const html5QrCode = new Html5Qrcode(qrRegionId);
        html5QrCodeRef.current = html5QrCode;

        // Determine best camera option
        let cameraConfig: any = { facingMode: 'environment' };
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length > 0) {
            const backCamera = cameras.find((c) => {
              const label = c.label.toLowerCase();
              return label.includes('back') || label.includes('belakang') || label.includes('environment');
            });
            cameraConfig = backCamera ? backCamera.id : cameras[0].id;
          }
        } catch (camListErr) {
          // If permission blocked or not enumerated, will fallback to default facingMode
        }

        await html5QrCode.start(
          cameraConfig,
          {
            fps: 12,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const qrEdge = Math.max(160, Math.floor(minEdge * 0.72));
              return { width: qrEdge, height: qrEdge };
            },
          },
          (decodedText) => {
            handleScanSuccess(decodedText);
          },
          () => {}
        );
        setCameraStarting(false);
      } catch (err: any) {
        console.warn('Camera initiation failed:', err);
        setCameraStarting(false);
        setScannerError(
          'Kamera tidak dapat diakses atau kebenaran disekat oleh pelayar. Sila benarkan kebenaran kamera pada pelayar atau masukkan nombor token secara manual di bawah.'
        );
      }
    }, 150);
  };

  const stopScanner = () => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current
        .stop()
        .then(() => {
          html5QrCodeRef.current = null;
          setIsScanning(false);
          setCameraStarting(false);
        })
        .catch(() => {
          html5QrCodeRef.current = null;
          setIsScanning(false);
          setCameraStarting(false);
        });
    } else {
      setIsScanning(false);
      setCameraStarting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const fetchParticipant = async (token: string) => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/participant/${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Pengawas tidak dijumpai. Sila pastikan nombor token tepat.');
        setParticipant(null);
      } else {
        setParticipant(data);
        if (data.eventStatus) {
          setEventStatus(data.eventStatus);
        }
      }
    } catch (err) {
      setErrorMsg('Gagal berhubung dengan pelayan sistem.');
      setParticipant(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialToken) {
      setActiveToken(initialToken);
      setTokenInput(initialToken);
      fetchParticipant(initialToken);
    }
  }, [initialToken]);

  // Live polling synchronization
  useEffect(() => {
    let isSubscribed = true;

    const syncLiveStatus = async () => {
      if (!isSubscribed || isShufflingRef.current) return;
      if (activeToken) {
        try {
          const res = await fetch(`/api/participant/${encodeURIComponent(activeToken)}`);
          if (res.ok && isSubscribed) {
            const data = await res.json();
            setParticipant((prev) => {
              if (!prev) return data;
              return {
                ...prev,
                status: data.status,
                prizeId: data.prizeId,
                prizeName: data.prizeName,
                claimCode: data.claimCode,
                claimStatus: data.claimStatus,
                isGrandPrizeCandidate: data.isGrandPrizeCandidate,
                grandPrizeStatus: data.grandPrizeStatus,
              };
            });
            if (data.eventStatus) {
              setEventStatus(data.eventStatus);
            }
          }
        } catch (e) {}
      } else {
        try {
          const res = await fetch('/api/event');
          if (res.ok && isSubscribed) {
            const data = await res.json();
            if (data.status) {
              setEventStatus(data.status);
            }
          }
        } catch (e) {}
      }
    };

    // Gentle 25s backup sync (SSE push handles instant real-time events without network flooding)
    const interval = setInterval(syncLiveStatus, 25000);
    const onFocus = () => syncLiveStatus();
    window.addEventListener('focus', onFocus);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [activeToken]);

  // Listen to Server-Sent Events (SSE) (100% Real Live Connection)
  useEffect(() => {
    let eventSource: EventSource | null = null;
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
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'event_status' && payload.status) {
            setEventStatus(payload.status);
          }
          if (payload.type === 'presence_tick' && payload.data) {
            setPresence(payload.data);
          }
          if (
            (payload.type === 'stage_draw_revealed' || payload.type === 'big_win') &&
            activeToken &&
            participant &&
            !isShufflingRef.current
          ) {
            fetchParticipant(activeToken);
          }
        } catch (err) {}
      };

      eventSource.addEventListener('presence_tick', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload && typeof payload.totalPlayed === 'number') {
            setPresence(payload);
          }
        } catch (err) {}
      });
    } catch (e) {}

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [activeToken, participant]);

  // Handle participant draw
  const handleDraw = async () => {
    if (!participant || participant.status === 'PLAYED' || isShuffling) return;
    if (eventStatus !== 'OPEN') {
      setErrorMsg('Sesi cabutan belum dibuka oleh Pengacara Majlis.');
      return;
    }

    // Crucial: Unlock Web Audio on this user click
    await unlockAudio();
    playClick();

    setIsShuffling(true);
    isShufflingRef.current = true;
    setErrorMsg(null);
    setDrawResult(null);

    let serverResponse: any = null;
    let serverError: string | null = null;

    try {
      const res = await fetch('/api/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: activeToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        serverError = data.error || 'Cabutan gagal diproses.';
      } else {
        serverResponse = data;
      }
    } catch (err: any) {
      serverError = 'Gagal menghubungi pelayan cabutan.';
    }

    const defaultPrizes = [
      'REDMI PAD 2 9.7 TABLET',
      'HUAWEI BAND 11 SERIES SMARTWATCH',
      'JAM TANGAN MOVEMBER',
      'HAIR DRYER YOOLE',
      'HEADPHONE SONIGEAR',
      'EARBUDS UGREEN',
      'KIPAS TANGAN GOOJODOQ MODEL GFS030',
      'HEADPHONE ACER',
      'BOTOL AIR STANLEY',
      'POWER BANK GOJOODOQ',
      'KIPAS ANGIN ELBA',
      'FOOD PROCESSOR MIDEA',
      'HAMPER',
      'ARMCHAIR BEIGE DECATHLON',
      'BAUCER BUKU',
      'COKLAT BERYL’S',
      'COKLAT KITKAT+SNICKERS',
      'COKLAT TIRAMISU BERYL’S',
    ];
    const currentPool = activePrizes.length > 0 ? activePrizes : defaultPrizes;

    let count = 0;
    const animStart = Date.now();
    const duration = 8000; // 8 seconds of suspense

    // Sound loop during shuffle
    const interval = setInterval(() => {
      const elapsed = Date.now() - animStart;

      // Play continuous crisp mechanical shuffle clicks
      const pitch = 0.9 + (count % 6) * 0.08;
      playShuffleTick(pitch);

      if (serverResponse && elapsed > duration - 1200 && serverResponse.won) {
        if (serverResponse.isGrandPrizeCandidate) {
          setCurrentShuffleName('⭐ TIKET EMAS PENTAS UTAMA ⭐');
        } else if (serverResponse.prize?.prizeName) {
          setCurrentShuffleName(serverResponse.prize.prizeName);
        }
      } else {
        const randomIdx = Math.floor(Math.random() * currentPool.length);
        setCurrentShuffleName(currentPool[randomIdx]);
      }

      // Suspense riser in last 1.8 seconds
      if (elapsed > duration - 1800 && elapsed < duration - 1700) {
        playSuspenseRiser(1.8);
      }

      count++;
    }, 95);

    setTimeout(() => {
      clearInterval(interval);
      setIsShuffling(false);
      isShufflingRef.current = false;

      if (serverError) {
        setErrorMsg(serverError);
        fetchParticipant(activeToken);
        return;
      }

      if (serverResponse) {
        setDrawResult(serverResponse);
        setParticipant((prev) =>
          prev
            ? {
                ...prev,
                status: 'PLAYED',
                prizeId: serverResponse.prize ? serverResponse.prize.prizeId : null,
                prizeName: serverResponse.prize
                  ? serverResponse.prize.prizeName
                  : serverResponse.isGrandPrizeCandidate
                  ? 'Tiket Emas Hadiah Utama'
                  : null,
                claimCode: serverResponse.claimCode,
                claimStatus: serverResponse.prize ? 'UNCLAIMED' : 'NOT_APPLICABLE',
                isGrandPrizeCandidate: serverResponse.isGrandPrizeCandidate,
                grandPrizeStatus: serverResponse.grandPrizeStatus,
              }
            : null
        );

        if (serverResponse.isGrandPrizeCandidate) {
          playGrandPrizeFanfare();
          confetti({
            particleCount: 160,
            spread: 110,
            origin: { y: 0.4 },
            colors: ['#ffd700', '#f59e0b', '#fbbf24', '#ffffff', '#e11d48'],
          });
        } else if (serverResponse.won) {
          playCelebrationFanfare();
          confetti({
            particleCount: 100,
            spread: 85,
            origin: { y: 0.5 },
            colors: ['#d4af37', '#6366f1', '#fbbf24', '#38bdf8'],
          });
        }
      }
    }, duration);
  };

  const handleManualTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    await unlockAudio();
    playClick();
    const clean = tokenInput.trim();
    setActiveToken(clean);
    fetchParticipant(clean);
  };

  const isPlayed = participant?.status === 'PLAYED';
  const isGrandCandidate = participant?.isGrandPrizeCandidate;
  const isGrandPendingStage = isGrandCandidate && participant?.grandPrizeStatus === 'PENDING_STAGE_DRAW';
  const isGrandRevealed = isGrandCandidate && participant?.grandPrizeStatus === 'REVEALED';

  return (
    <div className="w-full max-w-md mx-auto px-4 pb-12 pt-2">
      {/* Main Vintage Card */}
      <div
        className={`p-6 rounded-3xl border shadow-2xl transition-all ${
          isLightMode
            ? 'bg-[#fffdfa] border-[#c5a059]/40 text-[#2c2416]'
            : 'bg-[#10121d] border-amber-500/25 text-slate-100'
        }`}
      >
        {/* Header Ribbon */}
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-amber-500/20">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border font-serif-vintage ${
                isLightMode
                  ? 'bg-amber-100/70 border-[#c5a059] text-[#704e12]'
                  : 'bg-amber-500/15 border-amber-400/30 text-amber-300'
              }`}
            >
              ✦ Cabutan Pengawas ✦
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                eventStatus === 'OPEN'
                  ? 'bg-emerald-400 animate-pulse'
                  : eventStatus === 'PAUSED'
                  ? 'bg-amber-400'
                  : 'bg-rose-500'
              }`}
            />
          </div>

          <button
            onClick={toggleMute}
            className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
              isLightMode
                ? 'border-[#c5a059]/40 text-[#704e12] hover:bg-amber-50'
                : 'border-amber-500/30 text-amber-300 hover:bg-slate-800'
            }`}
            title={isMuted ? 'Buka Suara' : 'Senyapkan Suara'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>

        {/* 1. If NO PARTICIPANT LOGGED IN */}
        {!participant && !loading && (
          <div className="space-y-4">
            <div className="text-center py-2">
              <div
                className={`w-14 h-14 mx-auto rounded-2xl border flex items-center justify-center mb-3 shadow-sm ${
                  isLightMode
                    ? 'bg-amber-100/70 border-[#c5a059] text-[#8c6721]'
                    : 'bg-amber-500/15 border-amber-400/40 text-amber-300'
                }`}
              >
                <QrCode className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold font-serif-vintage">Imbas Kad Pengawas</h2>
              <p className="text-xs opacity-75 mt-1">
                Imbas kod QR pada lanyard anda atau masukkan nombor token di bawah.
              </p>
            </div>

            {/* QR Scanner Live Viewport */}
            {isScanning ? (
              <div className="space-y-3">
                <div
                  id={qrRegionId}
                  className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-amber-500 bg-black relative"
                />

                {cameraStarting && (
                  <p className="text-xs text-amber-400 text-center animate-pulse">
                    Menghubungkan ke peranti kamera...
                  </p>
                )}

                <button
                  onClick={stopScanner}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    isLightMode
                      ? 'bg-amber-50 hover:bg-amber-100 text-[#704e12] border-[#c5a059]'
                      : 'bg-[#181a28] hover:bg-[#202336] text-amber-300 border-amber-500/30'
                  }`}
                >
                  Tutup Pengimbas Kamera
                </button>
              </div>
            ) : (
              <button
                onClick={startScanner}
                className={`w-full py-3.5 rounded-2xl text-sm font-black transition flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                  isLightMode
                    ? 'bg-gradient-to-r from-[#c5a059] to-[#dfba73] text-[#241c13] hover:opacity-95'
                    : 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 text-slate-950 hover:brightness-105'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Buka Pengimbas Kamera</span>
              </button>
            )}

            {scannerError && (
              <div className="p-3 bg-rose-950/70 border border-rose-500/40 rounded-xl text-xs text-rose-200 leading-relaxed text-center">
                {scannerError}
              </div>
            )}

            {/* Divider */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-amber-500/20"></div>
              <span className="flex-shrink mx-3 text-[11px] opacity-60 font-serif-vintage uppercase">
                Atau Masukkan Token
              </span>
              <div className="flex-grow border-t border-amber-500/20"></div>
            </div>

            {/* Manual Token Input */}
            <form onSubmit={handleManualTokenSubmit} className="space-y-2.5">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Contoh: PREF-001"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm font-mono focus:outline-none transition ${
                  isLightMode
                    ? 'bg-[#f7f4ed] border-[#c5a059]/50 text-[#2c2416] focus:border-[#8c6721]'
                    : 'bg-[#181a28] border-amber-500/30 text-white focus:border-amber-400'
                }`}
              />

              <button
                type="submit"
                disabled={!tokenInput.trim()}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition uppercase tracking-wider font-serif-vintage cursor-pointer disabled:opacity-50 ${
                  isLightMode
                    ? 'bg-[#c5a059] text-white hover:bg-[#b08b44]'
                    : 'bg-amber-500/25 hover:bg-amber-500/35 text-amber-300 border border-amber-500/40'
                }`}
              >
                Sahkan Token
              </button>
            </form>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="text-center py-8 space-y-3">
            <div className="w-8 h-8 mx-auto border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs opacity-75 font-medium">Memuatkan maklumat pengawas...</p>
          </div>
        )}

        {/* Error Message */}
        {errorMsg && (
          <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-center flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 2. Active Attendee Profile & Lucky Draw Section */}
        {participant && !loading && (
          <div className="space-y-4">
            {/* LIVE IN-HALL PRESENCE & QUEUE STATUS CARD ("Mcm Live Org Yg Di Talian") */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all relative overflow-hidden shadow-lg ${
                isLightMode
                  ? 'bg-gradient-to-r from-[#fbf8f0] via-[#f7f0df] to-[#f4ecd6] border-[#c5a059]/60 text-[#2c2416]'
                  : 'bg-gradient-to-r from-[#141624] via-[#0f111c] to-[#0a0b12] border-amber-500/40 text-white shadow-black/50'
              }`}
            >
              {/* Top Live Presence Bar */}
              <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-amber-500/20 text-xs">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-black uppercase font-serif-vintage tracking-wider text-rose-400">
                    SIARAN LANGSUNG DEWAN
                  </span>
                </div>

                {/* Active in-hall connection pill ("Mcm live org yg di talian") */}
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] sm:text-[11px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{presence.activeOnline} Pengawas Di Talian</span>
                </div>
              </div>

              {/* Real-time Scan Progress Meter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-300 flex items-center gap-1.5 text-[11px]">
                    <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Status Imbasan Keseluruhan:</span>
                  </span>
                  <span className="font-mono text-amber-300 font-bold text-xs">
                    {presence.totalPlayed} / {presence.totalParticipants}
                  </span>
                </div>

                {/* Glowing Progress Track */}
                <div className="w-full bg-[#080910] h-2 rounded-full overflow-hidden p-0.5 border border-amber-500/30">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.7)]"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min(100, Math.round((presence.totalPlayed / Math.max(1, presence.totalParticipants)) * 100))}%`,
                    }}
                    transition={{ duration: 0.5 }}
                  />
                </div>

                {/* Detailed Breakdown Tags (100% Real Live Data Guaranteed) */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 font-medium">
                  <span className="text-emerald-400 font-mono">
                    ✓ {presence.totalPlayed} Telah Mengimbas
                  </span>
                  <span className="text-amber-300 font-mono animate-pulse">
                    ⏳ {presence.totalWaiting} Sedang Menunggu
                  </span>
                </div>

                {/* Real Data Transparency Micro-Pill */}
                <div className="pt-1 flex items-center justify-center gap-1.5 text-[9px] text-slate-400/80 font-mono">
                  <span className="w-1 h-1 rounded-full bg-emerald-400" />
                  <span>100% Data Sebenar Pangkalan Data • Kemas Kini Serta-merta</span>
                </div>
              </div>
            </motion.div>

            {/* Attendee ID Badge - Centered, Clean Number only, Sesi Pagi/Petang display */}
            <div
              className={`p-4 rounded-2xl border transition-colors text-center relative ${
                isLightMode
                  ? 'bg-[#f9f5eb] border-[#d8c292]'
                  : 'bg-[#181a28] border-amber-500/30 shadow-lg shadow-black/40'
              }`}
            >
              {/* Verified Badge top-right */}
              <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                <UserCheck className="w-3 h-3" />
                <span>Sah</span>
              </div>

              {/* Number only - "No. Pengawas" label removed */}
              <div className="inline-block px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-300 font-mono font-black text-sm tracking-widest mb-1.5 shadow-sm">
                {participant.participantNumber}
              </div>

              {/* Centered High-Contrast Name Container */}
              <div
                className={`my-2 py-2 px-3 rounded-xl border ${
                  isLightMode
                    ? 'bg-[#f0e6d2] border-[#c2a166] text-[#241708]'
                    : 'bg-[#0d0f17] border-amber-500/40 text-amber-300 shadow-inner'
                }`}
              >
                <div
                  className={`text-lg sm:text-xl font-black font-serif-vintage leading-tight tracking-wide ${
                    isLightMode
                      ? 'text-[#241708]'
                      : 'text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]'
                  }`}
                >
                  {participant.participantName}
                </div>
              </div>

              {/* Centered Division & Session Badges */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                {participant.division && participant.division.trim() !== '' && (
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${
                      isLightMode
                        ? 'bg-amber-100/70 border-[#c5a059]/50 text-[#704e12]'
                        : 'bg-amber-500/15 border-amber-400/30 text-amber-300'
                    }`}
                  >
                    {participant.division}
                  </span>
                )}

                {/* Sesi Pagi / Sesi Petang Display */}
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border flex items-center gap-1 ${
                    (participant.session || 'Sesi Pagi') === 'Sesi Pagi'
                      ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                      : 'bg-indigo-500/20 border-indigo-400/50 text-indigo-200'
                  }`}
                >
                  {(participant.session || 'Sesi Pagi') === 'Sesi Pagi' ? '☀️' : '🌙'}{' '}
                  {participant.session ? `Pengawas ${participant.session}` : 'Pengawas Sesi Pagi'}
                </span>
              </div>
            </div>

            {/* A. If ALREADY PLAYED */}
            {isPlayed ? (
              <div className="space-y-3 text-center pt-1">
                {/* GRAND PRIZE: PENDING STAGE DRAW */}
                {isGrandPendingStage && (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`p-5 rounded-2xl border-2 space-y-2.5 ${
                      isLightMode
                        ? 'border-[#b38628] bg-gradient-to-b from-[#fff7de] to-[#ffefc2] text-[#2c2416]'
                        : 'border-amber-400 bg-gradient-to-b from-[#262012] to-[#17140b] text-white shadow-xl shadow-amber-500/20'
                    }`}
                  >
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shadow-md">
                      <Crown className="w-7 h-7 animate-bounce" />
                    </div>

                    <div className="text-xs font-black tracking-widest uppercase font-serif-vintage text-amber-500">
                      ⭐ TIKET EMAS PENTAS UTAMA ⭐
                    </div>

                    <p className="text-sm font-bold font-serif-vintage leading-relaxed">
                      Tahniah! Anda terpilih ke pentas utama. Sila tunggu giliran anda dipanggil oleh Pengacara Majlis!
                    </p>

                    <div className="inline-block px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-[11px] font-bold text-amber-500">
                      Penyerahan di pentas sekarang!
                    </div>
                  </motion.div>
                )}

                {/* GRAND PRIZE: REVEALED ON STAGE */}
                {isGrandRevealed && (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`p-5 rounded-2xl border-2 space-y-2.5 ${
                      isLightMode
                        ? 'border-[#b38628] bg-[#fffbf0]'
                        : 'border-amber-400 bg-gradient-to-b from-[#262012] to-[#17140b] text-white shadow-xl shadow-amber-500/20'
                    }`}
                  >
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shadow-md">
                      <Trophy className="w-7 h-7 text-amber-400" />
                    </div>

                    <div className="text-xs font-bold uppercase tracking-wider text-amber-500 font-serif-vintage">
                      🏆 HADIAH UTAMA PENTAS
                    </div>

                    <div className="text-lg font-black font-serif-vintage text-amber-500">
                      {participant.prizeName}
                    </div>

                    <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[11px] font-bold text-emerald-500">
                      Penyerahan di pentas selesai
                    </div>
                  </motion.div>
                )}

                {/* REGULAR PRIZE WON WITH QR TUNTUTAN */}
                {!isGrandCandidate && participant.prizeName && (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`p-6 rounded-3xl border-2 space-y-4 ${
                      isLightMode
                        ? 'border-[#c5a059] bg-[#fbf9f4] text-[#2c2416]'
                        : 'border-amber-500/50 bg-[#121422] text-white shadow-2xl'
                    }`}
                  >
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 border border-amber-400 flex items-center justify-center text-slate-950 shadow-md">
                      <Gift className="w-8 h-8" />
                    </div>

                    <div>
                      <div className="text-xs font-black uppercase tracking-widest text-amber-400 font-serif-vintage">
                        ✨ TAHNIAH! ANDA MEMENANGI:
                      </div>
                      <div className="text-xl sm:text-2xl font-black font-serif-vintage text-white mt-1">
                        {participant.prizeName}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {participant.participantName} • <span className="text-amber-300 font-mono font-bold">{participant.participantNumber}</span>
                      </div>
                    </div>

                    {/* QR TUNTUTAN PAS HADIAH */}
                    <div className="p-4 rounded-2xl bg-[#0a0b12] border-2 border-amber-500/30 flex flex-col items-center text-center space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
                        <QrCode className="w-4 h-4" />
                        <span>KOD QR TUNTUTAN RASMI</span>
                      </div>

                      {claimQrDataUrl ? (
                        <div className="p-3 bg-white rounded-2xl shadow-xl border border-amber-400/40">
                          <img
                            src={claimQrDataUrl}
                            alt="QR Kod Tuntutan Hadiah"
                            className="w-44 h-44 sm:w-48 sm:h-48 object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-44 h-44 flex items-center justify-center bg-slate-900 rounded-2xl text-xs text-slate-500">
                          Menjana Kod QR...
                        </div>
                      )}

                      {/* Claim Code Pill & Copy Button */}
                      {participant.claimCode && (
                        <div className="w-full flex items-center justify-center gap-2">
                          <div className="px-3.5 py-1.5 rounded-xl bg-[#161826] border border-amber-500/40 font-mono text-sm sm:text-base font-black text-amber-300 tracking-wider">
                            {participant.claimCode}
                          </div>
                          <button
                            onClick={() => {
                              if (participant.claimCode) {
                                navigator.clipboard.writeText(participant.claimCode);
                                setClaimCopied(true);
                                setTimeout(() => setClaimCopied(false), 2000);
                              }
                            }}
                            className="p-2 rounded-xl border transition cursor-pointer bg-[#181a28] border-amber-500/30 text-amber-300 hover:bg-[#222538]"
                            title="Salin Kod Tuntutan"
                          >
                            {claimCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      )}

                      {/* Status Indicator */}
                      {participant.claimStatus === 'CLAIMED' ? (
                        <div className="w-full p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>HADIAH TELAH DITUNTUT ({participant.claimedBy || 'AJK Meja Hadiah'})</span>
                        </div>
                      ) : (
                        <div className="w-full p-2.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-bold flex items-center justify-center gap-2 animate-pulse">
                          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>Tunjukkan Kod QR ini di Kaunter AJK Hadiah</span>
                        </div>
                      )}

                      {/* Download Ticket Button */}
                      {claimQrDataUrl && (
                        <a
                          href={claimQrDataUrl}
                          download={`QR_Tuntutan_${participant.participantNumber}_${participant.claimCode || 'Hadiah'}.png`}
                          className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline flex items-center gap-1.5 pt-1 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Simpan Imej QR Tuntutan ke Telefon</span>
                        </a>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* OFFICIAL DIGITAL APPRECIATION CERTIFICATE (Zon Imbasan 116+ & Peserta Tanpa Hadiah Fizikal) */}
                {!isGrandCandidate && !participant.prizeName && (
                  <motion.div
                    initial={{ scale: 0.96, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`p-6 sm:p-7 rounded-3xl border-2 relative overflow-hidden shadow-2xl space-y-4 text-center ${
                      isLightMode
                        ? 'bg-gradient-to-b from-[#fbf8ee] via-[#fffdfa] to-[#f4ecd8] border-[#c5a059] text-[#2c2416]'
                        : 'bg-gradient-to-b from-[#181927] via-[#10111a] to-[#0c0d14] border-amber-500/40 text-white'
                    }`}
                  >
                    {/* Decorative Top Ribbon */}
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-amber-400" />
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-300 flex items-center justify-center text-slate-950 shadow-md">
                        <Award className="w-5 h-5" />
                      </div>
                      <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-amber-400" />
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] sm:text-xs font-black tracking-widest uppercase font-serif-vintage text-amber-500">
                        LEMBAGA PENGAWAS SMK BANDAR SRI PUTRA
                      </div>
                      <h4 className="text-lg sm:text-xl font-black font-serif-vintage text-amber-400 tracking-wide">
                        SIJIL PENGHARGAAN DIGITAL 2026
                      </h4>
                    </div>

                    {/* Participant Recipient Plaque */}
                    <div
                      className={`p-3.5 rounded-2xl border ${
                        isLightMode
                          ? 'bg-[#f4ead4] border-[#c2a166] text-[#241708]'
                          : 'bg-[#141624] border-amber-500/30 text-amber-200'
                      }`}
                    >
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        Dianugerahkan Kepada:
                      </div>
                      <div className="text-base sm:text-lg font-black font-serif-vintage mt-0.5">
                        {participant.participantName}
                      </div>
                      <div className="text-xs font-mono font-bold text-amber-400 mt-0.5">
                        [{participant.participantNumber}] • {participant.division || participant.session || 'Pengawas Sekolah'}
                      </div>
                    </div>

                    {/* Official Commemorative Dedication Text */}
                    <p className="text-xs sm:text-sm leading-relaxed opacity-90 font-serif-vintage px-1">
                      &ldquo;Setinggi-tinggi penghargaan dan terima kasih atas sumbangan bakti, dedikasi, serta komitmen terpuji anda dalam menegakkan disiplin dan sahsiah cemerlang warga sekolah.&rdquo;
                    </p>

                    {/* Seal & Metadata */}
                    <div className="pt-3 border-t border-amber-500/20 flex items-center justify-between text-[10px] text-slate-400">
                      <div className="text-left">
                        <span className="font-bold text-amber-400 block font-mono">17 OKTOBER 2026</span>
                        <span>Majlis Apresiasi Pengawas</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>Sijil Sah Digital</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            ) : (
              /* B. If NOT PLAYED YET: Ready to Draw or Shuffling */
              <div className="space-y-4">
                {isShuffling ? (
                  /* Animated Spinning Reel Box */
                  <div
                    className={`p-6 rounded-2xl border-2 text-center space-y-3 relative overflow-hidden ${
                      isLightMode
                        ? 'border-[#b38628] bg-gradient-to-b from-[#fff8e7] to-[#faedd0]'
                        : 'border-amber-400 bg-gradient-to-b from-[#1c180e] to-[#121008] text-white shadow-2xl'
                    }`}
                  >
                    <div className="text-xs font-bold uppercase tracking-widest text-amber-500 font-serif-vintage animate-pulse">
                      ✦ SEDANG MEMBUAT CABUTAN ✦
                    </div>

                    <div className="h-16 flex items-center justify-center">
                      <motion.div
                        key={currentShuffleName}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        transition={{ duration: 0.08 }}
                        className="text-base sm:text-lg font-black font-serif-vintage px-2 text-amber-500"
                      >
                        {currentShuffleName}
                      </motion.div>
                    </div>

                    {/* Progress pulse */}
                    <div className="w-full bg-amber-500/20 h-1.5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 8.0, ease: 'linear' }}
                        className="h-full bg-amber-500"
                      />
                    </div>
                  </div>
                ) : (
                  /* Draw Trigger Button */
                  <div className="space-y-3 pt-2">
                    <button
                      onClick={handleDraw}
                      disabled={eventStatus !== 'OPEN'}
                      className={`w-full py-4 rounded-2xl text-base font-black transition shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                        isLightMode
                          ? 'bg-gradient-to-r from-[#c5a059] to-[#dfba73] text-[#241c13] hover:opacity-95'
                          : 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 text-slate-950 hover:brightness-105'
                      }`}
                    >
                      <Gift className="w-5 h-5" />
                      <span>TEKAN UNTUK CABUT HADIAH</span>
                    </button>

                    <p className="text-[11px] text-center opacity-70">
                      Setiap pengawas layak membuat satu (1) kali cabutan bertuah sahaja.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
