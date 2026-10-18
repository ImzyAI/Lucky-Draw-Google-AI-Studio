import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface FooterProps {
  isLightMode?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ isLightMode = false }) => {
  return (
    <footer
      className={`w-full border-t transition-colors mt-auto py-5 px-4 text-center relative z-10 print:hidden ${
        isLightMode
          ? 'bg-[#f4efe4]/90 backdrop-blur-sm border-[#c5a059]/30 text-[#423624]'
          : 'bg-[#090a0f]/90 backdrop-blur-sm border-amber-500/20 text-slate-300'
      }`}
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        {/* Left / Integrity Tag */}
        <div className="flex items-center gap-2">
          <div
            className={`p-1 rounded-full ${
              isLightMode ? 'bg-amber-100 text-[#8c6721]' : 'bg-amber-500/15 text-amber-400'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="font-medium tracking-wide">
            Jaminan Ketelusan melalui Algoritma Kriptografi Fisher-Yates
          </span>
        </div>

        {/* Right / Copyright */}
        <div
          className={`font-serif-vintage tracking-wider text-xs font-semibold ${
            isLightMode ? 'text-[#704e12]' : 'text-amber-400/90'
          }`}
        >
          © 2026 SMK Bandar Seri Putra
        </div>
      </div>
    </footer>
  );
};
