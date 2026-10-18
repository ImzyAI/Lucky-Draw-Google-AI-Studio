import React, { useId } from 'react';

interface AnimatedBackgroundProps {
  isLightMode?: boolean;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ isLightMode = false }) => {
  const maskId = useId();

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 transition-colors duration-500"
      aria-hidden="true"
    >
      {/* Dynamic Animated Radiant Gradients (Blobs) */}
      <div className="absolute inset-0">
        {/* Blob 1: Golden / Amber Glow Top-Left */}
        <div
          className={`absolute -top-32 -left-32 w-96 h-96 sm:w-[500px] sm:h-[500px] rounded-full blur-3xl opacity-40 mix-blend-screen animate-pulse ${
            isLightMode
              ? 'bg-amber-200/50 mix-blend-multiply'
              : 'bg-amber-600/20'
          }`}
          style={{ animationDuration: '8s' }}
        />

        {/* Blob 2: Warm Royal Crimson / Rose Glow Top-Right */}
        <div
          className={`absolute top-1/4 -right-28 w-80 h-80 sm:w-[480px] sm:h-[480px] rounded-full blur-3xl opacity-30 mix-blend-screen ${
            isLightMode
              ? 'bg-orange-200/40 mix-blend-multiply'
              : 'bg-rose-900/20'
          }`}
          style={{
            animation: 'floatBlob 16s ease-in-out infinite alternate',
          }}
        />

        {/* Blob 3: Deep Gold / Bronze Center-Bottom Glow */}
        <div
          className={`absolute -bottom-24 left-1/3 w-96 h-96 sm:w-[600px] sm:h-[600px] rounded-full blur-3xl opacity-35 mix-blend-screen ${
            isLightMode
              ? 'bg-yellow-200/40 mix-blend-multiply'
              : 'bg-yellow-600/15'
          }`}
          style={{
            animation: 'floatBlobReverse 20s ease-in-out infinite alternate',
          }}
        />
      </div>

      {/* Subtle Geometric Luxury Grid Pattern */}
      <div
        className={`absolute inset-0 opacity-[0.035] ${
          isLightMode ? 'opacity-[0.04]' : 'opacity-[0.03]'
        }`}
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, ${
            isLightMode ? '#92400e' : '#fbbf24'
          } 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Floating Sparkle / Stardust Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[
          { top: '15%', left: '10%', size: 3, delay: '0s', duration: '7s' },
          { top: '25%', left: '85%', size: 4, delay: '1.5s', duration: '9s' },
          { top: '45%', left: '20%', size: 2.5, delay: '3s', duration: '6s' },
          { top: '65%', left: '75%', size: 3.5, delay: '2s', duration: '8.5s' },
          { top: '80%', left: '15%', size: 3, delay: '4s', duration: '10s' },
          { top: '35%', left: '60%', size: 2, delay: '0.8s', duration: '7.5s' },
          { top: '75%', left: '45%', size: 4, delay: '2.5s', duration: '9.5s' },
          { top: '10%', left: '40%', size: 3, delay: '3.5s', duration: '8s' },
        ].map((particle, idx) => (
          <div
            key={idx}
            className={`absolute rounded-full transition-opacity ${
              isLightMode ? 'bg-amber-600/50' : 'bg-amber-300/60'
            }`}
            style={{
              top: particle.top,
              left: particle.left,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animation: `twinkleFloat ${particle.duration} ease-in-out ${particle.delay} infinite alternate`,
              boxShadow: isLightMode
                ? '0 0 6px rgba(217, 119, 6, 0.4)'
                : '0 0 8px rgba(251, 191, 36, 0.7)',
            }}
          />
        ))}

        {/* Floating Golden Diamond / Star Accent Motifs */}
        <div
          className={`absolute top-20 right-16 w-6 h-6 border rotate-45 transition-colors ${
            isLightMode ? 'border-amber-400/20' : 'border-amber-400/15'
          }`}
          style={{ animation: 'spinSlow 35s linear infinite' }}
        />
        <div
          className={`absolute bottom-32 left-12 w-8 h-8 border rotate-12 transition-colors ${
            isLightMode ? 'border-amber-500/15' : 'border-amber-400/10'
          }`}
          style={{ animation: 'spinSlowReverse 45s linear infinite' }}
        />
        <div
          className={`absolute top-1/2 left-8 w-4 h-4 border rotate-45 transition-colors ${
            isLightMode ? 'border-amber-600/15' : 'border-amber-300/15'
          }`}
          style={{ animation: 'twinkleFloat 11s ease-in-out infinite' }}
        />
      </div>

      {/* Decorative Radial Vignette Overlay to enhance readability */}
      <div
        className={`absolute inset-0 pointer-events-none ${
          isLightMode
            ? 'bg-radial-gradient-to-edge-light'
            : 'bg-radial-gradient-to-edge-dark'
        }`}
      />
    </div>
  );
};
