import React, { useState } from 'react';
import {
  Gift,
  Volume2,
  VolumeX,
  KeyRound,
  ArrowLeft,
  Crown,
  Shield,
  ShieldCheck,
  X,
} from 'lucide-react';
import { EventStatus } from '../types';
import { sound } from '../lib/sound';

interface HeaderProps {
  currentView: 'participant' | 'stage' | 'admin';
  onSelectView: (view: 'participant' | 'stage' | 'admin', tab?: 'control' | 'ajk_hadiah' | 'participants' | 'prizes' | 'logs' | 'testing') => void;
  eventStatus?: EventStatus;
  isLightMode?: boolean;
  onToggleLightMode?: () => void;
  onOpenAjkPass?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onSelectView,
  onOpenAjkPass,
  eventStatus = 'OPEN',
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(() => sound.isSoundMuted());
  const [isAccessModalOpen, setIsAccessModalOpen] = useState<boolean>(false);

  const handleToggleSound = () => {
    const next = sound.toggleMute();
    setIsMuted(next);
  };

  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur-md border-b transition-colors bg-[#0f1118]/95 border-amber-500/25 text-white">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          {/* Brand & Event Title */}
          <div
            onClick={() => onSelectView('participant')}
            className="flex items-center gap-2.5 cursor-pointer select-none shrink-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center shadow-md font-black bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 border-amber-400/50 text-slate-950">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-black tracking-wider uppercase font-serif-vintage leading-none flex items-center gap-1.5">
                <span className="text-amber-200">
                  CABUTAN BERTUAH
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    eventStatus === 'OPEN'
                      ? 'bg-emerald-500 ring-2 ring-emerald-500/30'
                      : eventStatus === 'PAUSED'
                      ? 'bg-amber-500 ring-2 ring-amber-500/30'
                      : 'bg-rose-500 ring-2 ring-rose-500/30'
                  }`}
                  title={`Status: ${eventStatus}`}
                />
              </div>
              <div className="text-[10px] sm:text-xs font-bold font-serif-vintage leading-none mt-1 truncate max-w-[170px] sm:max-w-none text-slate-300">
                Majlis Apresiasi Lembaga Pengawas Sekolah
              </div>
            </div>
          </div>

          {/* Action Controls & Navigation */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* If in Stage or Admin view, show simple back button */}
            {currentView !== 'participant' && (
              <button
                onClick={() => {
                  sound.playClick();
                  onSelectView('participant');
                }}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border bg-amber-500/20 border-amber-400/50 text-amber-300 hover:bg-amber-500/30"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Paparan Pengawas</span>
                <span className="sm:hidden">Kembali</span>
              </button>
            )}

            {/* Sound Toggle */}
            <button
              onClick={handleToggleSound}
              className="p-2 rounded-xl border transition cursor-pointer flex items-center justify-center bg-[#181a28] border-amber-500/20 text-amber-300 hover:bg-[#222538]"
              title={isMuted ? 'Buka Suara' : 'Senyapkan Suara'}
              aria-label="Kawalan suara"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 opacity-50" />
              ) : (
                <Volume2 className="w-4 h-4 text-amber-500" />
              )}
            </button>

            {/* Discrete Special Access Button (for Stage / Admin) */}
            {currentView === 'participant' && (
              <button
                onClick={() => setIsAccessModalOpen(true)}
                className="p-2 rounded-xl border transition cursor-pointer flex items-center justify-center bg-[#181a28] border-amber-500/20 text-slate-300 hover:text-white hover:bg-[#222538]"
                title="Akses Khas Pentadbir & Pentas"
                aria-label="Akses Khas"
              >
                <KeyRound className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Access Selection Modal */}
      {isAccessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border-2 p-6 shadow-2xl relative bg-[#121422] border-amber-400 text-white">
            <button
              onClick={() => setIsAccessModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg opacity-60 hover:opacity-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-5">
              <div className="w-12 h-12 mx-auto rounded-2xl border flex items-center justify-center mb-2.5 bg-amber-500/20 border-amber-400 text-amber-300">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold font-serif-vintage">Akses Khas Pengurusan</h3>
              <p className="text-xs opacity-75 mt-0.5">
                Pilih bilik kawalan yang ingin dibuka:
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  sound.playClick();
                  setIsAccessModalOpen(false);
                  onSelectView('stage');
                }}
                className="w-full p-3.5 rounded-2xl border transition flex items-center gap-3 text-left cursor-pointer bg-[#181a2c] hover:bg-[#20233b] border-amber-500/30 text-white"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-400">
                  <Crown className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold font-serif-vintage">Kawalan Pentas</div>
                  <div className="text-[11px] opacity-70">
                    Perasmian sesi & putaran calon pentas utama
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setIsAccessModalOpen(false);
                  onSelectView('admin', 'ajk_hadiah');
                }}
                className="w-full p-3.5 rounded-2xl border transition flex items-center gap-3 text-left cursor-pointer bg-[#181a2c] hover:bg-[#20233b] border-emerald-500/30 text-white"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
                  <Gift className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold font-serif-vintage">Kaunter AJK Hadiah</div>
                  <div className="text-[11px] opacity-70">
                    Tuntutan & serahan hadiah bukan utama
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setIsAccessModalOpen(false);
                  onSelectView('admin');
                }}
                className="w-full p-3.5 rounded-2xl border transition flex items-center gap-3 text-left cursor-pointer bg-[#181a2c] hover:bg-[#20233b] border-indigo-500/30 text-white"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold font-serif-vintage">Admin Panel</div>
                  <div className="text-[11px] opacity-70">
                    Senarai pengawas, inventori hadiah & laporan
                  </div>
                </div>
              </button>

              {/* Dedicated AJK ID Card PDF Generator Utility */}
              <button
                onClick={() => {
                  sound.playClick();
                  setIsAccessModalOpen(false);
                  if (onOpenAjkPass) {
                    onOpenAjkPass();
                  } else {
                    onSelectView('admin');
                  }
                }}
                className="w-full p-3.5 rounded-2xl border transition flex items-center gap-3 text-left cursor-pointer bg-[#181a2c] hover:bg-[#20233b] border-emerald-500/30 text-white"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold font-serif-vintage text-emerald-300">
                    Kad ID AJK (PDF)
                  </div>
                  <div className="text-[11px] opacity-70">
                    Penjana & cetakan pas ID 26 Ahli Jawatankuasa
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
