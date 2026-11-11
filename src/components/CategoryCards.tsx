import React from 'react';
import { Sword, Compass, Sparkles, Layers, User, Boxes, Grid } from 'lucide-react';
import { CategoryItem } from '../types';
import { soundManager } from '../utils/soundManager';

import { FALLBACK_CATEGORIES } from '../data/fallbackData';

interface CategoryCardsProps {
  categories?: CategoryItem[];
  currentCategory: string;
  onSelectCategory: (slug: string) => void;
  categoryCounts?: Record<string, number>;
  resourceCounts?: Record<string, number>;
}

export const CategoryCards: React.FC<CategoryCardsProps> = ({
  categories = FALLBACK_CATEGORIES,
  currentCategory,
  onSelectCategory,
  categoryCounts,
  resourceCounts,
}) => {
  const counts = categoryCounts || resourceCounts || {};
  const getIcon = (iconName: string) => {
    switch (iconName.toLowerCase()) {
      case 'sword':
        return <Sword className="w-5 h-5" />;
      case 'compass':
        return <Compass className="w-5 h-5" />;
      case 'sparkles':
        return <Sparkles className="w-5 h-5" />;
      case 'layers':
        return <Layers className="w-5 h-5" />;
      case 'user':
        return <User className="w-5 h-5" />;
      case 'boxes':
        return <Boxes className="w-5 h-5" />;
      default:
        return <Boxes className="w-5 h-5" />;
    }
  };

  const handleSelect = (slug: string) => {
    soundManager.playClick();
    onSelectCategory(slug);
  };

  return (
    <div className="py-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {/* All Categories Option */}
        <button
          type="button"
          onClick={() => handleSelect('all')}
          className={`shrink-0 min-h-[44px] flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            currentCategory === 'all'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500/80 shadow-md shadow-emerald-950/50'
              : 'bg-[#101018] text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>الكل</span>
        </button>

        {/* Categories List */}
        {categories.map((cat) => {
          const isSelected = currentCategory === cat.slug;
          const count = counts[cat.slug] || 0;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleSelect(cat.slug)}
              className={`shrink-0 min-h-[44px] flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500/80 shadow-md shadow-emerald-950/50'
                  : 'bg-[#101018] text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className={isSelected ? 'text-white' : 'text-emerald-400'}>{getIcon(cat.icon || 'boxes')}</span>
              <span>{cat.name}</span>
              {count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
