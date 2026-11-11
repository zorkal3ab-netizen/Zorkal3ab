import React, { useState, useRef, useCallback, useEffect } from 'react';
import { getAssetUrl } from '../utils/assets';
import { soundManager } from '../utils/soundManager';

export interface HeroLogoProps {
  className?: string;
  onFlipChange?: (isEnderman: boolean) => void;
}

// 4 Required Brand Assets, 10 Enderman Frames, and 10 Creeper Pixel Frames
export const CREEPER_LOGO_SRC = getAssetUrl('assets/logo-creeper.png');
export const ENDERMAN_LOGO_SRC = getAssetUrl('assets/logo-enderman.png');
export const HEAD_CREEPER_SRC = getAssetUrl('assets/aistudio/ccdbc547cfefc905215925217a660fff_9ebb004c.jpg');
export const HEAD_ENDERMAN_SRC = getAssetUrl('assets/aistudio/1794002110751_a4e91bf1.png');

// Exact 10 Enderman frame-by-frame animation assets (307x512 transparent PNGs)
export const ENDERMAN_FRAMES = [
  getAssetUrl('assets/enderman_01.png'),
  getAssetUrl('assets/enderman_02.png'),
  getAssetUrl('assets/enderman_03.png'),
  getAssetUrl('assets/enderman_04.png'),
  getAssetUrl('assets/enderman_05.png'),
  getAssetUrl('assets/enderman_06.png'),
  getAssetUrl('assets/enderman_07.png'),
  getAssetUrl('assets/enderman_08.png'),
  getAssetUrl('assets/enderman_09.png'),
  getAssetUrl('assets/enderman_10.png'),
];

// Exact 10 Creeper frame-by-frame animation assets (307x512 transparent PNGs)
export const CREEPER_PIXEL_FRAMES = [
  getAssetUrl('assets/creeper_pixel_01.png'),
  getAssetUrl('assets/creeper_pixel_02.png'),
  getAssetUrl('assets/creeper_pixel_03.png'),
  getAssetUrl('assets/creeper_pixel_04.png'),
  getAssetUrl('assets/creeper_pixel_05.png'),
  getAssetUrl('assets/creeper_pixel_06.png'),
  getAssetUrl('assets/creeper_pixel_07.png'),
  getAssetUrl('assets/creeper_pixel_08.png'),
  getAssetUrl('assets/creeper_pixel_09.png'),
  getAssetUrl('assets/creeper_pixel_10.png'),
];

export interface CubicDebrisParticle {
  id: number;
  size: number;
  color: string;
  tx: number;
  ty: number;
  rot: number;
  delay: number;
}

const generateCreeperParticles = (): CubicDebrisParticle[] => {
  const colors = [
    '#ffffff', '#ffffff', '#f3f4f6', '#d1d5db', '#9ca3af',
    '#4b5563', '#15803d', '#22c55e', '#16a34a', '#111827'
  ];
  const list: CubicDebrisParticle[] = [];
  const count = 24;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI + (Math.random() - 0.5) * 0.35;
    const size = [6, 8, 8, 10, 10, 12][i % 6];
    // Smaller particles travel farther
    const dist = size <= 8 ? 75 + Math.random() * 55 : 40 + Math.random() * 40;
    const tx = Math.cos(angle) * dist;
    // Downward gravity drift
    const ty = Math.sin(angle) * dist + (20 + Math.random() * 30);
    const rot = (Math.random() - 0.5) * 160;
    const color = colors[i % colors.length];
    list.push({
      id: i,
      size,
      color,
      tx,
      ty,
      rot,
      delay: Math.random() * 40,
    });
  }
  return list;
};

/**
 * HeroLogo Component
 * 
 * Features:
 * 1. Realistic periodic metallic shine sweep animation across 3D metal letters every 4.5s.
 * 2. 3D Swipe Flip Gesture on mobile (and click/drag on desktop):
 *    - Physical Swipe Right (X-delta > 50px): 3D flips to Enderman logo (`logo-enderman.png`)
 *    - Physical Swipe Left (X-delta < -50px): 3D flips back to Creeper logo (`logo-creeper.png`)
 * 3. Interactive Animations:
 *    - If isEnderman is FALSE: Triggers "Authentic 2.5D Minecraft Creeper Explosion" using 10 frames
 *      (Emergence -> White Charging Flashes -> Final Charge Anticipation -> Intense White Blast -> Cubic Particles -> Smoke Dissipation -> Restoration).
 *    - If isEnderman is TRUE: Triggers "Enderman Frame-by-Frame Teleportation" (authentic 10-frame sequence:
 *      Appearance 01-05 -> Full Hold 05 for 800ms -> Teleportation 06-10 with pixel particles and disappearing energy).
 * 4. Zero Layout Shift: Absolute overlays with high z-index (z-[9999]) centered perfectly over the logo.
 * 5. Hardware-accelerated CSS transforms and pixel-art rendering.
 */
export const HeroLogo: React.FC<HeroLogoProps> = ({ className = '', onFlipChange }) => {
  const [isEnderman, setIsEnderman] = useState<boolean>(false);
  // Creeper Animation States
  const [isCreeperActive, setIsCreeperActive] = useState<boolean>(false);
  const [creeperFrameIndex, setCreeperFrameIndex] = useState<number>(0);
  const [creeperPhase, setCreeperPhase] = useState<'idle' | 'emerging' | 'charging' | 'anticipation' | 'exploding' | 'dissipating'>('idle');
  const [creeperParticles, setCreeperParticles] = useState<CubicDebrisParticle[]>([]);

  // Enderman Animation States
  const [isTeleporting, setIsTeleporting] = useState<boolean>(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Gesture tracking refs
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const touchStartTimeRef = useRef<number>(0);
  const hasMovedRef = useRef<boolean>(false);

  // Concurrency & animation locking refs
  const isAnimatingRef = useRef<boolean>(false);
  const creeperTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const frameTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Preload all 10 Enderman and 10 Creeper animation frames immediately on mount
  useEffect(() => {
    ENDERMAN_FRAMES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
    CREEPER_PIXEL_FRAMES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      creeperTimersRef.current.forEach(clearTimeout);
      creeperTimersRef.current = [];
      frameTimersRef.current.forEach(clearTimeout);
      frameTimersRef.current = [];
    };
  }, []);

  const setFlippedState = useCallback(
    (nextState: boolean) => {
      if (nextState !== isEnderman) {
        soundManager.playClick();
        if (isTeleporting || isCreeperActive || isAnimatingRef.current) {
          setIsTeleporting(false);
          setIsCreeperActive(false);
          setCurrentFrameIndex(0);
          setCreeperFrameIndex(0);
          setCreeperPhase('idle');
          setCreeperParticles([]);
          isAnimatingRef.current = false;
          frameTimersRef.current.forEach(clearTimeout);
          frameTimersRef.current = [];
          creeperTimersRef.current.forEach(clearTimeout);
          creeperTimersRef.current = [];
        }
        setIsEnderman(nextState);
        if (onFlipChange) {
          onFlipChange(nextState);
        }
      }
    },
    [isEnderman, isTeleporting, isCreeperActive, onFlipChange]
  );

  // Complete 2.5D Minecraft Creeper Frame-by-Frame Interactive Explosion Sequence:
  // Phase A: Emergence & perspective movement (0 - 240ms, Frame 01)
  // Phase B: White activation flashes (240ms - 980ms, Frames 01 to 05)
  // Phase B Climax: Final charge anticipation pause with blinding white flash & slight backward shift (780ms - 980ms, Frame 05)
  // Phase C: Powerful WHITE pixelated explosion blast & cubic debris burst (980ms - 1170ms, Frames 06 & 07)
  // Phase D: Pixel smoke cloud expansion, cubic debris gravity fall & dissipation (1170ms - 1560ms, Frames 08, 09, 10)
  // Phase E: Logo restoration & clean state reset (1580ms)
  const triggerCreeperExplosion = useCallback(() => {
    if (isAnimatingRef.current || isCreeperActive || isTeleporting) return;
    isAnimatingRef.current = true;
    setIsCreeperActive(true);
    setCreeperFrameIndex(0);
    setCreeperPhase('emerging');
    setCreeperParticles([]);

    // Synchronized authentic Minecraft Creeper sound: Rising fuse hiss (0-0.98s) + explosive boom & rumble (0.98s+)
    soundManager.playCreeperExplosion();

    // Clear any previous timers
    creeperTimersRef.current.forEach(clearTimeout);
    creeperTimersRef.current = [];

    // Phase B: White Charging Flashes
    // Flash 1 (Pulse white on Frame 01 at 240ms)
    const tFlash1 = setTimeout(() => {
      setCreeperPhase('charging');
    }, 240);
    creeperTimersRef.current.push(tFlash1);

    // Flash 2 (Frame 02 with white charging flash & expanding aura at 350ms)
    const tFrame2 = setTimeout(() => {
      setCreeperFrameIndex(1);
    }, 350);
    creeperTimersRef.current.push(tFrame2);

    // Flash 3 (Frame 03 with pulsing white flash at 480ms)
    const tFrame3 = setTimeout(() => {
      setCreeperFrameIndex(2);
    }, 480);
    creeperTimersRef.current.push(tFrame3);

    // Flash 4 (Frame 04 with accelerated intense white flash at 630ms)
    const tFrame4 = setTimeout(() => {
      setCreeperFrameIndex(3);
    }, 630);
    creeperTimersRef.current.push(tFrame4);

    // Phase B Final Charge Anticipation: Frame 05 at 780ms (moves backward, pauses, blinding white core)
    const tFrame5 = setTimeout(() => {
      setCreeperPhase('anticipation');
      setCreeperFrameIndex(4);
    }, 780);
    creeperTimersRef.current.push(tFrame5);

    // Phase C: THE EXPLOSION at 980ms!
    // Frame 06: initial powerful WHITE explosion flash + cubic particles burst outward
    const tExplosion = setTimeout(() => {
      setCreeperPhase('exploding');
      setCreeperFrameIndex(5);
      setCreeperParticles(generateCreeperParticles());
    }, 980);
    creeperTimersRef.current.push(tExplosion);

    // Frame 07 at 1070ms: shockwave expansion & scattering cubic debris
    const tFrame7 = setTimeout(() => {
      setCreeperFrameIndex(6);
    }, 1070);
    creeperTimersRef.current.push(tFrame7);

    // Phase D: Pixel Smoke & Particle Dissipation
    // Frame 08 at 1170ms: expanding pixel smoke cloud & scattering square debris
    const tFrame8 = setTimeout(() => {
      setCreeperPhase('dissipating');
      setCreeperFrameIndex(7);
    }, 1170);
    creeperTimersRef.current.push(tFrame8);

    // Frame 09 at 1290ms: dispersing smoke & falling cubic debris with gravity
    const tFrame9 = setTimeout(() => {
      setCreeperFrameIndex(8);
    }, 1290);
    creeperTimersRef.current.push(tFrame9);

    // Frame 10 at 1420ms: residual smoke and particles fading naturally
    const tFrame10 = setTimeout(() => {
      setCreeperFrameIndex(9);
    }, 1420);
    creeperTimersRef.current.push(tFrame10);

    // Phase E: Logo restoration and cleanup at 1580ms
    const tCleanup = setTimeout(() => {
      setIsCreeperActive(false);
      setCreeperFrameIndex(0);
      setCreeperPhase('idle');
      setCreeperParticles([]);
      isAnimatingRef.current = false;
    }, 1580);
    creeperTimersRef.current.push(tCleanup);
  }, [isCreeperActive, isTeleporting]);

  // Frame-by-frame Enderman Teleportation Animation Sequence:
  // 1. Appearance (Frames 01-05, 70ms/frame): gradually emerges with intense purple glow & depth
  // 2. Full Appearance Hold (Frame 05 held for 800ms): fully visible glowing Enderman
  // 3. Teleportation (Frames 06-10, 75ms/frame): glitches, breaks into purple pixel particles, fades out
  const triggerEndermanTeleport = useCallback(() => {
    if (isAnimatingRef.current || isTeleporting) return;
    isAnimatingRef.current = true;
    setIsTeleporting(true);
    setCurrentFrameIndex(0);

    // Play synchronized authentic teleportation sound (emergence hum + warp crackle)
    soundManager.playEndermanTeleport();

    // Clear any previous frame timers
    frameTimersRef.current.forEach(clearTimeout);
    frameTimersRef.current = [];

    // Phase 1: Appearance (Frames 01 to 05, ~70ms per frame)
    const appearanceTiming = 70;
    for (let i = 1; i <= 4; i++) {
      const timer = setTimeout(() => {
        setCurrentFrameIndex(i);
      }, i * appearanceTiming);
      frameTimersRef.current.push(timer);
    }

    // Phase 2: Hold Frame 05 for 800ms
    const holdStartTime = 4 * appearanceTiming; // 280ms
    const teleportStartTime = holdStartTime + 800; // 1080ms

    // Phase 3: Teleportation (Frames 06 to 10, ~75ms per frame)
    const teleportTiming = 75;
    for (let i = 5; i <= 9; i++) {
      const delay = teleportStartTime + (i - 5) * teleportTiming;
      const timer = setTimeout(() => {
        setCurrentFrameIndex(i);
      }, delay);
      frameTimersRef.current.push(timer);
    }

    // Phase 4: Cleanup after Frame 10 finishes
    const totalDuration = teleportStartTime + 5 * teleportTiming; // ~1455ms
    const cleanupTimer = setTimeout(() => {
      setIsTeleporting(false);
      setCurrentFrameIndex(0);
      isAnimatingRef.current = false;
    }, totalDuration);
    frameTimersRef.current.push(cleanupTimer);
  }, [isTeleporting]);

  // Trigger Easter Egg Animations based on current face
  const triggerEasterEgg = useCallback(() => {
    if (isCreeperActive || isTeleporting || isAnimatingRef.current) return;

    if (!isEnderman) {
      // Trigger Authentic 2.5D Minecraft Creeper Explosion
      triggerCreeperExplosion();
    } else {
      // Trigger Game-Accurate Enderman Frame-by-Frame Teleportation
      triggerEndermanTeleport();
    }
  }, [isEnderman, isCreeperActive, isTeleporting, triggerCreeperExplosion, triggerEndermanTeleport]);

  // Touch event handlers for mobile screens
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    touchStartTimeRef.current = Date.now();
    hasMovedRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartXRef.current;
    const deltaY = currentY - touchStartYRef.current;

    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      hasMovedRef.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.changedTouches.length !== 1) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    const duration = Date.now() - touchStartTimeRef.current;

    // Check if horizontal swipe dominates vertical movement
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.1 && duration < 700) {
      // Physical Swipe Right -> Reveal Enderman
      if (deltaX > 50) {
        setFlippedState(true);
      }
      // Physical Swipe Left -> Flip back to Creeper
      else if (deltaX < -50) {
        setFlippedState(false);
      }
    } else if (!hasMovedRef.current && duration < 350) {
      // Direct Click / Tap on the logo triggers the egg interaction!
      triggerEasterEgg();
    }
  };

  // Mouse drag / click support for desktop testing
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    touchStartXRef.current = e.clientX;
    touchStartYRef.current = e.clientY;
    touchStartTimeRef.current = Date.now();
    hasMovedRef.current = false;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaX = e.clientX - touchStartXRef.current;
    const deltaY = e.clientY - touchStartYRef.current;
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      hasMovedRef.current = true;
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    const deltaX = e.clientX - touchStartXRef.current;
    const duration = Date.now() - touchStartTimeRef.current;

    if (Math.abs(deltaX) > 50 && duration < 700) {
      if (deltaX > 50) {
        setFlippedState(true);
      } else {
        setFlippedState(false);
      }
    } else if (!hasMovedRef.current) {
      // Direct Click on logo triggers the egg interaction
      triggerEasterEgg();
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (hasMovedRef.current) return;
    triggerEasterEgg();
  };

  // Native desktop double-click fallback
  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    triggerEasterEgg();
  };


  return (
    <div
      className={`relative inline-flex items-center justify-center select-none group ${className}`}
      style={{ perspective: '1000px' }}
      dir="ltr" /* Force LTR gesture coordinates container for consistent physical swipe */
    >
      {/* 
        3D Card Container
        Dimensions: Mobile w-[260px] sm:w-[280px], Desktop md:w-[330px] lg:w-[350px] aspect-[2/1]
      */}
      <div
        role="button"
        tabIndex={0}
        aria-label={
          isEnderman
            ? 'شعار ZORK أندرمان - انقر للتنقل الآني (Teleport)، أو اسحب لليسار للعودة للكريبر'
            : 'شعار ZORK كريبر - انقر لتفعيل شحنة الانفجار، أو اسحب لليمين للكشف عن الأندرمان'
        }
        title="انقر للتفاعل السري، أو اسحب لليمين/اليسار لقلب الشعار!"
        className="relative w-[260px] sm:w-[280px] md:w-[330px] lg:w-[350px] aspect-[2/1] cursor-pointer touch-pan-y"
        style={{
          transformStyle: 'preserve-3d',
          transform: isEnderman ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: 'transform 0.65s cubic-bezier(0.34, 1.3, 0.64, 1)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            triggerEasterEgg();
          } else if (e.key === ' ') {
            e.preventDefault();
            setFlippedState(!isEnderman);
          }
        }}
      >
        {/* ===================================================================
            FRONT FACE: Creeper Logo (0deg)
            =================================================================== */}
        <div
          className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(0deg)',
          }}
        >
          {/* Creeper Emerald Ambient Glow */}
          <div className="absolute inset-0 transition-opacity duration-500 opacity-60 group-hover:opacity-90 blur-xl pointer-events-none bg-emerald-500/15 rounded-full scale-90" />

          {/* Front Logo Image with subtle 2.5D perspective idle breathing */}
          <img
            src={CREEPER_LOGO_SRC}
            alt="ZORK CRAFT Creeper Logo"
            className={`w-full h-full object-contain select-none pointer-events-none transition-all duration-300 drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] group-hover:drop-shadow-[0_6px_22px_rgba(0,223,137,0.4)] ${
              !isEnderman && !isCreeperActive ? 'animate-creeper-idle-25d' : ''
            }`}
            draggable={false}
          />

          {/* 
            Periodic Metallic Shine Sweep (Front)
            Sweeps every 4.5s smoothly across the metallic letters
          */}
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            style={{
              maskImage: `url("${CREEPER_LOGO_SRC}")`,
              WebkitMaskImage: `url("${CREEPER_LOGO_SRC}")`,
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              maskPosition: 'center',
              WebkitMaskPosition: 'center',
            }}
          >
            <div className="absolute inset-0 animate-metallic-shine bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-[-25deg] pointer-events-none mix-blend-overlay" />
          </div>
        </div>

        {/* ===================================================================
            BACK FACE: Enderman Metal Emblem (180deg)
            Full-sized pristine metal emblem matching Creeper dimensions
            =================================================================== */}
        <div
          className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {/* Enderman Purple Ambient Glow */}
          <div className="absolute inset-0 transition-opacity duration-500 opacity-70 group-hover:opacity-100 blur-xl pointer-events-none bg-purple-600/25 rounded-full scale-90" />

          {/* Back Logo Image: Full Size Enderman Metal Emblem */}
          <img
            src={ENDERMAN_LOGO_SRC}
            alt="ZORK CRAFT Enderman Metal Emblem"
            className="w-full h-full object-contain select-none pointer-events-none transition-all duration-300 drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] drop-shadow-[0_6px_24px_rgba(168,85,247,0.5)] group-hover:drop-shadow-[0_8px_30px_rgba(192,132,252,0.6)]"
            draggable={false}
          />

          {/* 
            Periodic Metallic Shine Sweep (Back)
            Sweeps smoothly across the metallic letters
          */}
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            style={{
              maskImage: `url("${ENDERMAN_LOGO_SRC}")`,
              WebkitMaskImage: `url("${ENDERMAN_LOGO_SRC}")`,
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              maskPosition: 'center',
              WebkitMaskPosition: 'center',
            }}
          >
            <div className="absolute inset-0 animate-metallic-shine bg-gradient-to-r from-transparent via-purple-100/60 to-transparent skew-x-[-25deg] pointer-events-none mix-blend-overlay" />
          </div>
        </div>

        {/* =====================================================================
          AUTHENTIC 2.5D MINECRAFT CREEPER INTERACTIVE EXPLOSION
          Uses exact 10 transparent PNG frames (307x512)
          Centered absolutely over the logo, Zero Layout Shift
          ===================================================================== */}
      {isCreeperActive && (
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-[9999] overflow-visible"
          aria-hidden="true"
        >
          <div
            className="relative w-28 sm:w-36 md:w-44 aspect-[307/512] flex items-center justify-center pointer-events-none select-none transition-all duration-100 ease-out"
            style={{
              imageRendering: 'pixelated',
              // 2.5D Perspective Movement across phases
              transform:
                creeperPhase === 'emerging'
                  ? 'perspective(700px) rotateY(-3.5deg) rotateX(-2deg) translateZ(16px) scale(1.04) translateY(-2px)'
                  : creeperPhase === 'charging'
                    ? creeperFrameIndex % 2 === 0
                      ? 'perspective(700px) rotateY(2.5deg) rotateX(-1deg) translateZ(24px) scale(1.08)'
                      : 'perspective(700px) rotateY(-2deg) rotateX(-2.5deg) translateZ(28px) scale(1.1)'
                    : creeperPhase === 'anticipation'
                      ? 'perspective(700px) rotateY(0deg) rotateX(2deg) translateZ(-8px) scale(0.96) translateY(3px)'
                      : creeperPhase === 'exploding'
                        ? 'perspective(700px) scale(1.18) translateZ(35px)'
                        : 'perspective(700px) scale(1.05) translateY(4px)',
              // Authentic White Charging & Explosion Flashes (CRITICAL: Pure white, no green energy)
              filter:
                creeperPhase === 'emerging'
                  ? 'brightness(1) contrast(1)'
                  : creeperPhase === 'charging'
                    ? creeperFrameIndex === 0
                      ? 'brightness(2.6) contrast(1.5) drop-shadow(0 0 18px rgba(255, 255, 255, 0.95))'
                      : creeperFrameIndex === 1
                        ? 'brightness(1.5) contrast(1.2) drop-shadow(0 0 16px rgba(255, 255, 255, 0.8))'
                        : creeperFrameIndex === 2
                          ? 'brightness(2.4) contrast(1.5) drop-shadow(0 0 26px rgba(255, 255, 255, 0.95))'
                          : 'brightness(3.2) contrast(1.7) drop-shadow(0 0 36px rgba(255, 255, 255, 1))'
                    : creeperPhase === 'anticipation'
                      ? 'brightness(4.0) contrast(2.0) drop-shadow(0 0 45px rgba(255, 255, 255, 1))'
                      : creeperPhase === 'exploding'
                        ? 'brightness(2.2) drop-shadow(0 0 50px rgba(255, 255, 255, 1))'
                        : 'drop-shadow(0 0 15px rgba(200, 200, 200, 0.4))',
              opacity: creeperPhase === 'dissipating' && creeperFrameIndex === 9 ? 0.45 : 1,
            }}
          >
            {/* Active Creeper Frame Image (307x512 transparent PNG) */}
            <img
              src={CREEPER_PIXEL_FRAMES[creeperFrameIndex]}
              alt={`Creeper Frame ${creeperFrameIndex + 1}`}
              className="w-full h-full object-contain select-none pointer-events-none"
              style={{
                aspectRatio: '307 / 512',
                imageRendering: 'pixelated',
              }}
              draggable={false}
            />

            {/* Procedural Cubic Debris Particles (Phase C & D) */}
            {creeperParticles.length > 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-visible">
                {creeperParticles.map((p) => (
                  <div
                    key={p.id}
                    className="absolute pointer-events-none select-none"
                    style={{
                      width: `${p.size}px`,
                      height: `${p.size}px`,
                      backgroundColor: p.color,
                      imageRendering: 'pixelated',
                      boxShadow: '0 0 2px rgba(0,0,0,0.85)',
                      transform: `translate(${p.tx}px, ${p.ty}px) rotate(${p.rot}deg)`,
                      transition: `transform 550ms cubic-bezier(0.12, 0.85, 0.35, 1) ${p.delay}ms, opacity 550ms ease-out ${p.delay + 80}ms`,
                      opacity: creeperPhase === 'dissipating' ? 0.15 : 0.95,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          EASTER EGG OVERLAY 2: Enderman Frame-by-Frame Teleportation Animation
          Uses exact 10 transparent PNG frames (307x512)
          Centered absolutely over the logo, Zero Layout Shift
          ===================================================================== */}
      {isTeleporting && (
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-[9999] overflow-visible"
          aria-hidden="true"
        >
          <div
            className="relative w-28 h-48 sm:w-36 sm:h-60 md:w-44 md:h-72 aspect-[307/512] flex items-center justify-center pointer-events-none select-none transition-all duration-75 ease-out"
            style={{
              // Frame 01-05: Gradually emerge with subtle depth & slight forward movement
              transform: currentFrameIndex < 5 
                ? `scale(${0.92 + currentFrameIndex * 0.02}) translateY(-${currentFrameIndex * 1.5}px)` 
                : 'scale(1) translateY(-6px)',
              // Frame 01-05: Increasingly intense purple glow; Frame 05 hold: full mystic radiance; Frame 06-10: dispersing digital particles
              filter: currentFrameIndex < 4 
                ? `drop-shadow(0 0 ${12 + currentFrameIndex * 7}px rgba(168, 85, 247, ${0.45 + currentFrameIndex * 0.12}))`
                : currentFrameIndex === 4
                  ? 'drop-shadow(0 0 42px rgba(192, 132, 252, 0.95)) drop-shadow(0 0 15px rgba(216, 180, 254, 0.8))'
                  : currentFrameIndex < 9
                    ? `drop-shadow(0 0 ${32 - (currentFrameIndex - 4) * 5}px rgba(168, 85, 247, ${0.85 - (currentFrameIndex - 4) * 0.15}))`
                    : 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.3))',
              opacity: currentFrameIndex === 9 ? 0.75 : 1
            }}
          >
            {/* Active Enderman Frame Image - 307x512 contain, preserving original transparency */}
            <img
              src={ENDERMAN_FRAMES[currentFrameIndex]}
              alt={`Enderman Teleportation Frame ${currentFrameIndex + 1}`}
              className="w-full h-full object-contain select-none pointer-events-none"
              style={{
                aspectRatio: '307 / 512',
                imageRendering: 'auto'
              }}
              draggable={false}
            />
          </div>
        </div>
      )}
      </div>

      {/* Hidden preloaded images to ensure instantaneous rendering without any decode delay */}
      <div className="hidden" aria-hidden="true">
        {ENDERMAN_FRAMES.map((src, i) => (
          <img key={`enderman-pre-${i}`} src={src} alt="" loading="eager" />
        ))}
        {CREEPER_PIXEL_FRAMES.map((src, i) => (
          <img key={`creeper-pre-${i}`} src={src} alt="" loading="eager" />
        ))}
      </div>

      {/* Interactive indicator dots for face switching and discovery */}
      <div className="absolute -bottom-3.5 flex items-center justify-center gap-2 pointer-events-auto z-10">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setFlippedState(false);
          }}
          aria-label="عرض شعار الكريبر"
          title="شعار الكريبر"
          className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
            !isEnderman ? 'bg-emerald-400 w-5 shadow-[0_0_8px_rgba(52,211,153,0.9)]' : 'bg-slate-600 hover:bg-slate-500 w-2'
          }`}
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setFlippedState(true);
          }}
          aria-label="عرض شعار الأندرمان"
          title="شعار الأندرمان"
          className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
            isEnderman ? 'bg-purple-400 w-5 shadow-[0_0_8px_rgba(192,132,252,0.9)]' : 'bg-slate-600 hover:bg-slate-500 w-2'
          }`}
        />
      </div>
    </div>
  );
};
