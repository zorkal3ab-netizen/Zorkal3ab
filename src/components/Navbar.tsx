import React from 'react';
import { Volume2, VolumeX, Search, Compass, Box, Sparkles, User, Map, Layers } from 'lucide-react';
import { soundManager } from '../utils/soundManager';
import { getAssetUrl } from '../utils/assets';

export const CIRCULAR_MASCOT_SRC = getAssetUrl('assets/aistudio/________25_20261021085710_86e023ca.jpg');

interface NavbarProps {
  currentCategory: string;
  onSelectCategory: (slug: string) => void;
  onOpenSearch: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentCategory,
  onSelectCategory,
  onOpenSearch,
  soundEnabled,
  onToggleSound,
}) => {
  const navItems = [
    { slug: 'all', label: 'الرئيسية', icon: Compass, color: '#FF284A' },
    { slug: 'mods', label: 'المودات', icon: Box, color: '#FF791F' },
    { slug: 'shaders', label: 'الشيدرات', icon: Sparkles, color: '#8ADFFF' },
    { slug: 'skins', label: 'السكنات', icon: User, color: '#9D72FF' },
    { slug: 'maps', label: 'الخرائط', icon: Map, color: '#35D16F' },
    { slug: 'versions', label: 'الإصدارات', icon: Layers, color: '#C5CBD5' },
  ];

  return (
    <>
      {/* =========================================================================
          DESKTOP & TABLET TOP NAVIGATION
          Strict Top Bar Contract: Zone 1 (Brand) - Zone 2 (Nav Links) - Zone 3 (Action)
          ========================================================================= */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#07070B]/90 backdrop-blur-md px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto h-16 sm:h-20 flex items-center justify-between gap-4 sm:gap-6">
          {/* Zone 1: Official Circular ZORK Mascot Emblem (Desktop: 56px, Mobile: 52px) */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                onSelectCategory('all');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="group flex items-center gap-2.5 cursor-pointer text-right focus:outline-none"
              aria-label="العودة لأعلى الصفحة"
            >
              {/* Framed Circular Mascot Emblem with metallic/crimson rim */}
              <div className="w-[52px] h-[52px] sm:w-[56px] sm:h-[56px] rounded-full overflow-hidden border-2 border-[#FF284A]/60 shadow-[0_0_15px_rgba(255,40,74,0.35)] transition-transform duration-300 group-hover:scale-105 shrink-0 bg-[#101018]">
                <img
                  src={CIRCULAR_MASCOT_SRC}
                  alt="ZORK Official Mascot"
                  className="w-full h-full object-cover select-none"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-base sm:text-lg font-black tracking-wider text-white uppercase group-hover:text-[#FF284A] transition-colors leading-none">
                  ZORK
                </span>
                <span className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase leading-tight mt-0.5">
                  CRAFT
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Links (Clean unboxed text links with active color indicator) */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
            {navItems.map((item) => {
              const isActive = currentCategory === item.slug;
              return (
                <button
                  key={item.slug}
                  onClick={() => {
                    soundManager.playCategory();
                    onSelectCategory(item.slug);
                  }}
                  className={`relative py-1.5 transition-colors whitespace-nowrap shrink-0 text-sm font-semibold cursor-pointer ${
                    isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  style={{
                    color: isActive ? item.color : undefined,
                  }}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Actions (Search + Sound Toggle) */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Search Trigger */}
            <button
              onClick={() => {
                soundManager.playClick();
                onOpenSearch();
              }}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
              aria-label="البحث عن مورد أو إضافة"
              title="بحث"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Sound Toggle (Default OFF) */}
            <button
              onClick={onToggleSound}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                soundEnabled
                  ? 'border-[#35D16F]/40 bg-[#35D16F]/10 text-[#35D16F]'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
              }`}
              aria-label={soundEnabled ? 'كتم الصوت' : 'تفعيل المؤثرات الصوتية'}
              title={soundEnabled ? 'المؤثرات الصوتية: مفعّلة' : 'المؤثرات الصوتية: مكتومة'}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 animate-pulse" />
                  <span className="hidden sm:inline">الصوت: يعمل</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4" />
                  <span className="hidden sm:inline">الصوت: صامت</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          MOBILE FIXED BOTTOM NAVIGATION BAR
          Optimized for Android touch ergonomics with category colors & icons
          ========================================================================= */}
      <nav
        aria-label="التنقل السفلي للموبايل"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#07070B]/95 backdrop-blur-lg border-t border-slate-800/90 px-2 py-1.5"
      >
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentCategory === item.slug;
            return (
              <button
                key={item.slug}
                onClick={() => {
                  soundManager.playCategory();
                  onSelectCategory(item.slug);
                }}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all min-w-[50px] cursor-pointer ${
                  isActive ? 'scale-105' : 'text-slate-400 hover:text-slate-200 opacity-80'
                }`}
                style={{
                  color: isActive ? item.color : undefined,
                }}
              >
                <Icon
                  className="w-5 h-5 mb-0.5"
                  style={{
                    filter: isActive ? `drop-shadow(0 0 6px ${item.color})` : 'none',
                  }}
                />
                <span className="text-[10px] font-medium tracking-tight whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
