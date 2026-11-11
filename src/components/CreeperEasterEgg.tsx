import React from 'react';
import { getAssetUrl } from '../utils/assets';

export const METALLIC_LOGO_SRC = getAssetUrl('assets/aistudio/file_00000000deb881f4abdeb400840e0850_1ec1cc6a.png');
export const CIRCULAR_MASCOT_SRC = getAssetUrl('assets/aistudio/________25_20261021085710_86e023ca.jpg');

/**
 * Pure Circular Hero Mascot
 * STRICT SPECIFICATION: Purely visual portrait of the official ZORK mascot.
 */
export const CircularHeroMascot: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
      <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-2 border-[#FF284A]/60 shadow-[0_0_20px_rgba(255,40,74,0.3)] bg-[#101018]">
        <img
          src={CIRCULAR_MASCOT_SRC}
          alt="ZORK Mascot"
          className="w-full h-full object-cover select-none pointer-events-none"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
};

import { HeroLogo } from './HeroLogo';

interface MetallicWordmarkProps {
  className?: string;
  onExplode?: () => void;
}

/**
 * Official Metallic ZORK Wordmark Logo (Interactive 3D Card with Metallic Shine & 3D Flip)
 * Forwards to HeroLogo.
 */
export const MetallicWordmark: React.FC<MetallicWordmarkProps> = ({ className = '' }) => {
  return <HeroLogo className={className} />;
};

// Backward-compatible alias for any consumer referencing the previous export name
export const MetallicWordmarkWithEasterEgg = MetallicWordmark;

