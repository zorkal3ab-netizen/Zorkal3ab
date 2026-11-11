import React from 'react';
import { Download, Eye, Sparkles, Smartphone, HardDrive, Star } from 'lucide-react';
import { ResourceItem } from '../types';
import { getAssetUrl } from '../utils/assets';
import { soundManager } from '../utils/soundManager';

export type { ResourceItem } from '../types';

export interface ResourceCardProps {
  item?: ResourceItem;
  resource?: ResourceItem;
  onOpenDetails?: (item: ResourceItem) => void;
  onSelect?: (item: ResourceItem) => void;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({
  item: propItem,
  resource: propResource,
  onOpenDetails,
  onSelect,
}) => {
  const item = propItem || propResource!;
  const handleClick = () => {
    soundManager.playClick();
    if (onSelect) onSelect(item);
    if (onOpenDetails) onOpenDetails(item);
  };

  return (
    <div
      onClick={handleClick}
      className="group bg-[#101018] hover:bg-[#141420] border border-slate-800 hover:border-emerald-500/50 rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer shadow-md hover:shadow-xl hover:shadow-emerald-950/20 flex flex-col"
    >
      {/* Cover Image Container */}
      <div className="relative aspect-[16/9] w-full bg-[#0a0a0f] overflow-hidden">
        {item.cover_image ? (
          <img
            src={getAssetUrl(item.cover_image)}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-700">
            <Sparkles className="w-8 h-8 opacity-40" />
          </div>
        )}

        {/* Featured Badge */}
        {Boolean(item.is_featured) && (
          <div className="absolute top-2.5 right-2.5 px-2 py-1 rounded-lg bg-amber-500/90 text-slate-950 text-[10px] font-black tracking-wider flex items-center gap-1 shadow-md">
            <Sparkles className="w-3 h-3 fill-slate-950" />
            <span>مميز</span>
          </div>
        )}

        {/* Version Badge */}
        <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm text-slate-200 text-[10px] font-mono font-bold border border-white/10" dir="ltr">
          {item.mc_version}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
            {item.title}
          </h3>
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {item.short_description}
          </p>
        </div>

        {/* Bottom Metadata */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold font-mono">
            <Download className="w-3.5 h-3.5" />
            <span>{(item.download_count ?? 0).toLocaleString()}</span>
          </div>

          {item.creator_name && (
            <span className="text-slate-500 truncate max-w-[110px]">
              بواسطة: {item.creator_name}
            </span>
          )}

          <div className="flex items-center gap-1 text-amber-400 font-bold">
            <Star className="w-3 h-3 fill-amber-400" />
            <span>{item.rating || '5.0'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
