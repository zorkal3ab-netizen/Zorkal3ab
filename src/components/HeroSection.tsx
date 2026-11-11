import React from 'react';
import { Search, Compass } from 'lucide-react';
import { CircularHeroMascot } from './CreeperEasterEgg';
import { HeroLogo } from './HeroLogo';
import { soundManager } from '../utils/soundManager';

interface HeroSectionProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onExploreClick: () => void;
  currentCategory?: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  searchQuery,
  onSearchChange,
  onExploreClick,
}) => {
  return (
    <section className="relative pt-6 pb-10 md:pt-10 md:pb-14 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Subtle cosmic background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-gradient-to-tr from-[#FF284A]/10 via-[#9D72FF]/10 to-[#8ADFFF]/10 rounded-full blur-[90px] pointer-events-none" />

      <div className="relative max-w-4xl mx-auto flex flex-col items-center text-center">
        {/* 
          1. Official Circular ZORK Mascot Avatar
          Purely visual brand portrait.
        */}
        <div className="mb-4">
          <CircularHeroMascot />
        </div>

        {/* 
          2. Official Interactive Metallic ZORK Wordmark Logo
          Sizing: Mobile ~240–285px (w-[260px] sm:w-[280px]), Desktop ~300–360px (md:w-[330px] lg:w-[350px]).
          Features:
          - Realistic periodic metallic shine sweep animation across metallic letters every 4.5s
          - 3D Swipe Flip gesture (Physical swipe right -> Enderman, swipe left -> Creeper, Click toggle)
          - Creeper emerald ambient glow & Enderman amethyst purple glow
          - Zero layout shift (exact aspect-[2/1] dimensions preserved)
          - Arabic context support (LTR gesture coordinates container)
        */}
        <div className="mb-5">
          <HeroLogo />
        </div>

        {/* Official Arabic Description */}
        <p className="text-base sm:text-lg md:text-xl text-slate-300 font-medium mb-7 max-w-xl text-balance">
          منصتك لاكتشاف إضافات ومحتوى Minecraft Bedrock.
        </p>

        {/* Prominent Search Bar */}
        <div className="w-full max-w-xl relative mb-6">
          <div className="relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ابحث عن مود، شيدر، سكن، خريطة، أو إصدار..."
              className="w-full pl-12 pr-12 py-3.5 bg-[#101018]/90 border border-slate-700/80 rounded-xl text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#FF284A] focus:ring-1 focus:ring-[#FF284A] transition-all shadow-lg backdrop-blur-sm"
              dir="rtl"
            />
            <div className="absolute right-4 pointer-events-none text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute left-4 text-xs text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded bg-slate-800 cursor-pointer"
              >
                مسح
              </button>
            )}
          </div>
        </div>

        {/* Explore Categories Action */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onExploreClick();
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FF284A] to-[#FF791F] text-white text-sm font-semibold rounded-lg shadow-[0_0_20px_rgba(255,40,74,0.3)] hover:opacity-95 active:scale-95 transition-all cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span>استعراض الأقسام</span>
          </button>
        </div>
      </div>
    </section>
  );
};
