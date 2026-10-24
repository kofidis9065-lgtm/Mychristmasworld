import React from 'react';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  showGreeting?: boolean;
}

export const AnimatedSantaIcon: React.FC<Props> = ({ size = 'md', showGreeting = false }) => {
  const dim = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-16 h-16' : 'w-10 h-10';

  return (
    <div className="relative inline-flex items-center gap-2 group cursor-pointer select-none">
      {/* 3D Shaded Animated Santa Face SVG */}
      <div className={`relative ${dim} shrink-0 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-110 active:scale-95 duration-200`}>
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
          <defs>
            {/* Velvet Red Hat Gradient */}
            <radialGradient id="santaHatGrad" cx="40%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="70%" stopColor="#b91c1c" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </radialGradient>

            {/* Rosy Skin Gradient */}
            <radialGradient id="santaSkinGrad" cx="50%" cy="40%" r="55%">
              <stop offset="0%" stopColor="#ffe4d6" />
              <stop offset="75%" stopColor="#fecaca" />
              <stop offset="100%" stopColor="#fca5a5" />
            </radialGradient>

            {/* Fluffy Snow Beard Gradient */}
            <linearGradient id="santaBeardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="70%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>

            {/* Gold Bell/Accent */}
            <radialGradient id="santaGoldGrad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="60%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ca8a04" />
            </radialGradient>

            {/* Drop Shadow Filter */}
            <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* 1. Flowing White Beard (Sways gently) */}
          <g className="origin-top animate-[wiggle_3s_ease-in-out_infinite]">
            <path
              d="M 22 52 C 16 68 25 94 50 96 C 75 94 84 68 78 52 C 72 58 64 62 50 62 C 36 62 28 58 22 52 Z"
              fill="url(#santaBeardGrad)"
              filter="url(#softShadow)"
            />
            {/* Beard curls */}
            <path d="M 35 72 C 42 80 58 80 65 72" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M 42 84 C 47 88 53 88 58 84" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>

          {/* 2. Santa Face Base */}
          <circle cx="50" cy="46" r="24" fill="url(#santaSkinGrad)" filter="url(#softShadow)" />

          {/* Rosy Cheeks */}
          <circle cx="34" cy="48" r="5" fill="#f87171" opacity="0.55" />
          <circle cx="66" cy="48" r="5" fill="#f87171" opacity="0.55" />

          {/* Twinkling Happy Eyes */}
          <path d="M 36 40 Q 40 37 44 40" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M 56 40 Q 60 37 64 40" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />

          {/* Round Red Nose */}
          <ellipse cx="50" cy="47" rx="4.5" ry="3.5" fill="#ef4444" filter="url(#softShadow)" />
          <ellipse cx="48.5" cy="46" rx="1.5" ry="1" fill="#fecaca" opacity="0.8" />

          {/* 3. White Fluffy Mustache */}
          <path
            d="M 50 48 C 42 42 28 48 30 54 C 36 58 46 54 50 51 C 54 54 64 58 70 54 C 72 48 58 42 50 48 Z"
            fill="#ffffff"
            filter="url(#softShadow)"
          />

          {/* 4. Velvet Red Hat with Curved Tip */}
          <path
            d="M 23 32 C 26 12 65 6 78 24 C 84 32 90 40 88 48 C 86 52 80 50 82 44 C 84 36 78 26 68 18 C 50 8 32 16 27 32 Z"
            fill="url(#santaHatGrad)"
            filter="url(#softShadow)"
          />

          {/* 5. Plush White Hat Trim */}
          <rect
            x="20"
            y="28"
            width="60"
            height="11"
            rx="5.5"
            fill="url(#santaBeardGrad)"
            filter="url(#softShadow)"
          />

          {/* 6. Bouncing Fluffy Pom-Pom at Hat Tip */}
          <g className="origin-[85px_46px] animate-[bounce_1.8s_ease-in-out_infinite]">
            <circle cx="85" cy="46" r="7.5" fill="#ffffff" filter="url(#softShadow)" />
            <circle cx="83" cy="44" r="2" fill="#f8fafc" />
          </g>
        </svg>

        {/* Festive Sparkle Star */}
        <span className="absolute -top-1 -right-1 text-xs animate-ping">✨</span>
      </div>

      {showGreeting && (
        <div className="flex flex-col">
          <span className="font-extrabold text-sm sm:text-base tracking-wider text-white uppercase font-serif-display leading-tight flex items-center gap-1">
            <span>Santa's Realm</span>
            <span className="text-[#e5c783]">❄️</span>
          </span>
          <span className="text-[10px] text-[#e5c783] font-medium font-serif-display">
            Ho Ho Ho! Merry Christmas
          </span>
        </div>
      )}
    </div>
  );
};
