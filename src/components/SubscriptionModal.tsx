import React, { useState } from 'react';
import { soundManager } from '../utils/soundManager';
import { getAssetUrl } from '../utils/assets';

interface SubscriptionModalProps {
  onConfirmed: () => void;
}

export const OFFICIAL_YOUTUBE_URL = 'https://youtube.com/@zork_al3ab?si=VOP34dCv3OlP1bTr';
export const SUBSCRIPTION_IMAGE_SRC = getAssetUrl('assets/aistudio/file_0000000069fc81f4bb5183b517c34ea1_54deaede.png');

/**
 * ZORK Subscription Interface (Floating Card)
 * - Uses exact original 1672x941 artwork with zero redesign or extra buttons.
 * - Left button: Native HTML anchor to official YouTube URL (same-tab navigation with iframe fallback).
 * - Right button: Independent confirmation action (closes card, stores session, never navigates to YouTube).
 * - Hotspots are mapped to exact image aspect ratio (1672/941) ensuring 100% responsive alignment without letterboxing.
 */
export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ onConfirmed }) => {
  const [isOpen, setIsOpen] = useState(true);

  // Right Button: "نعم، اشتركت"
  const handleConfirmSubscription = () => {
    soundManager.playClick();
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('zork_subscription_confirmed', 'true');
    }
    setIsOpen(false);
    onConfirmed();
  };

  // Left Button: "لا، ليس بعد"
  const handleDeclineSubscription = (e: React.MouseEvent<HTMLAnchorElement>) => {
    soundManager.playClick();
    // Do NOT store confirmation in sessionStorage; question can appear again if visitor returns.
    
    // In sandboxed preview iframes where top-level or same-frame cross-origin navigation is restricted,
    // trigger fallback without breaking standalone tab navigation.
    if (typeof window !== 'undefined' && window.self !== window.top) {
      try {
        if (window.top) {
          window.top.location.href = OFFICIAL_YOUTUBE_URL;
        }
      } catch {
        window.open(OFFICIAL_YOUTUBE_URL, '_blank');
      }
    }
    // In normal standalone browser tabs, native <a href="..."> performs same-tab navigation.
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="سؤال الاشتراك في قناة ZORK"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 md:p-6 overflow-hidden select-none"
    >
      {/* 
        Floating Card Container:
        Locked to exact natural aspect ratio of the subscription artwork (1672 / 941).
        Homepage remains visible behind the scrim.
      */}
      <div className="relative w-[92vw] max-w-[720px] rounded-2xl border border-slate-700/60 shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden bg-black">
        <div className="relative w-full aspect-[1672/941]">
          {/* Original untouched subscription image */}
          <img
            src={SUBSCRIPTION_IMAGE_SRC}
            alt="هل اشتركت في قناة ZORK يا صديقي؟"
            className="w-full h-full object-cover block pointer-events-none select-none"
            referrerPolicy="no-referrer"
          />

          {/* 
            Invisible Click Hotspots perfectly aligned over pre-existing image buttons:
            Left Button: 'لا، ليس بعد'  (left 31.5%, width 32.5%, top 64.0%, height 20.0%)
            Right Button: 'نعم، اشتركت' (left 66.0%, width 32.0%, top 64.0%, height 20.0%)
            No overlap.
          */}
          
          {/* Left Hotspot: "لا، ليس بعد" — Real native <a> with exact YouTube href */}
          <a
            href={OFFICIAL_YOUTUBE_URL}
            onClick={handleDeclineSubscription}
            className="absolute cursor-pointer opacity-0 focus:opacity-10 focus:bg-white/20 transition-opacity rounded-xl active:scale-95 z-20"
            style={{
              left: '31.5%',
              width: '32.5%',
              top: '64.0%',
              height: '20.0%',
            }}
            aria-label="لا، ليس بعد - الانتقال إلى قناة ZORK على يوتيوب"
            title="لا، ليس بعد"
          >
            <span className="sr-only">لا، ليس بعد</span>
          </a>

          {/* Right Hotspot: "نعم، اشتركت ❤️" — Independent confirm action */}
          <button
            type="button"
            onClick={handleConfirmSubscription}
            className="absolute cursor-pointer opacity-0 focus:opacity-10 focus:bg-white/20 transition-opacity rounded-xl active:scale-95 z-20"
            style={{
              left: '66.0%',
              width: '32.0%',
              top: '64.0%',
              height: '20.0%',
            }}
            aria-label="نعم، اشتركت - المتابعة إلى منصة ZORK CRAFT"
            title="نعم، اشتركت"
          >
            <span className="sr-only">نعم، اشتركت</span>
          </button>
        </div>
      </div>
    </div>
  );
};
