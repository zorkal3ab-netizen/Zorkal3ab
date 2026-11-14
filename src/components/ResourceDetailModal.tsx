import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  X,
  Download,
  ExternalLink,
  Check,
  Share2,
  Copy,
  Settings,
  Sparkles,
  ShieldCheck,
  Maximize2,
  FileDown,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { ResourceItem, ResourceFile } from '../types';
import { getAssetUrl } from '../utils/assets';
import { soundManager } from '../utils/soundManager';
import { FALLBACK_RESOURCES } from '../data/fallbackData';
import { isStaticHostingEnvironment } from '../utils/loadingLifecycle';

export interface ResourceDetailModalProps {
  item?: ResourceItem;
  resourceId?: string;
  onClose: () => void;
  onDownloadCompleted?: () => void | Promise<void>;
  onSelectResource?: (id: string) => void;
}

const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

function formatArabicDate(dateStr?: string): string {
  if (!dateStr) return '19 أكتوبر 2026';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '19 أكتوبر 2026';
    const day = d.getDate();
    const month = ARABIC_MONTHS[d.getMonth()] || 'أكتوبر';
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return '19 أكتوبر 2026';
  }
}

function formatFileSizeMB(bytes?: number, fallbackMb?: string): string {
  if (fallbackMb) return fallbackMb;
  if (!bytes || bytes <= 0) return '14 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
}

export const ResourceDetailModal: React.FC<ResourceDetailModalProps> = ({
  item: propItem,
  resourceId,
  onClose,
  onDownloadCompleted,
}) => {
  const [loadedItem, setLoadedItem] = useState<ResourceItem | null>(propItem || null);
  const [loading, setLoading] = useState<boolean>(!propItem && !!resourceId);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [lightboxZoom, setLightboxZoom] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [showFilePickerModal, setShowFilePickerModal] = useState<boolean>(false);

  // Touch swipe tracking refs
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const touchStartTimeRef = useRef<number>(0);
  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Fetch resource data if only ID is provided
  useEffect(() => {
    if (propItem) {
      setLoadedItem(propItem);
      return;
    }
    if (resourceId) {
      const staticFallback = FALLBACK_RESOURCES.find((r) => r.id === resourceId);
      const isStaticHost =
        typeof window !== 'undefined' &&
        isStaticHostingEnvironment(window.location.hostname, window.location.protocol);

      if (isStaticHost) {
        if (staticFallback) setLoadedItem(staticFallback);
        setLoading(false);
        return;
      }

      setLoading(true);
      fetch(`/api/resources/${resourceId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.resource) {
            setLoadedItem(data.resource);
          } else if (staticFallback) {
            setLoadedItem(staticFallback);
          }
        })
        .catch(() => {
          if (staticFallback) setLoadedItem(staticFallback);
        })
        .finally(() => setLoading(false));
    }
  }, [propItem, resourceId]);

  const item = loadedItem;

  // Compile image list: cover image first, followed by screenshots / extra gallery images
  const allImages = React.useMemo(() => {
    if (!item) return [];
    const list: string[] = [];
    if (item.cover_image) list.push(item.cover_image);
    if (Array.isArray(item.images)) {
      item.images.forEach((img: any) => {
        const url = typeof img === 'string' ? img : img?.image_url;
        if (url && !list.includes(url)) list.push(url);
      });
    }
    if (Array.isArray((item as any).screenshots)) {
      (item as any).screenshots.forEach((url: string) => {
        if (url && !list.includes(url)) list.push(url);
      });
    }
    return list.length > 0 ? list : ['/uploads/1017055164_1794181925516_61b98c0e640e.jpg'];
  }, [item]);

  const totalImages = allImages.length;
  const currentImage = allImages[activeImageIndex] || allImages[0];

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    const activeThumb = thumbnailRefs.current[activeImageIndex];
    if (activeThumb) {
      activeThumb.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [activeImageIndex]);

  // Keyboard navigation
  const goToNextImage = useCallback(() => {
    if (totalImages <= 1) return;
    soundManager.playClick();
    setActiveImageIndex((prev) => (prev + 1) % totalImages);
  }, [totalImages]);

  const goToPrevImage = useCallback(() => {
    if (totalImages <= 1) return;
    soundManager.playClick();
    setActiveImageIndex((prev) => (prev - 1 + totalImages) % totalImages);
  }, [totalImages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isLightboxOpen) {
          setIsLightboxOpen(false);
          setLightboxZoom(1);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowRight') {
        // In RTL, ArrowRight moves backwards in flow
        goToPrevImage();
      } else if (e.key === 'ArrowLeft') {
        goToNextImage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, onClose, goToNextImage, goToPrevImage]);

  // Touch Swipe Handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    touchStartTimeRef.current = Date.now();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.changedTouches.length !== 1) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    const duration = Date.now() - touchStartTimeRef.current;

    // Must be predominantly horizontal swipe and fast enough or long enough
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3 && duration < 600) {
      // In RTL: swiping finger to left (deltaX < 0) advances to next image
      if (deltaX < 0) {
        goToNextImage();
      } else {
        goToPrevImage();
      }
    }
  };

  // Lock body scroll when Lightbox or modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Files
  const files: ResourceFile[] = item?.files || [];
  const primaryFile = files[0];

  // Dynamic file size
  const displaySettings = typeof item?.display_settings === 'string'
    ? (() => { try { return JSON.parse(item.display_settings); } catch { return {}; } })()
    : item?.display_settings || {};

  const formattedFileSize = formatFileSizeMB(primaryFile?.file_size, displaySettings?.file_size_mb);
  const versionBadge = displaySettings?.version_badge || '1.0';
  const formattedDate = formatArabicDate(item?.created_at);
  const categoryTitle = (item as any)?.category_title || (item as any)?.category_name || 'مودات';

  // Copy page link
  const handleCopyLink = () => {
    soundManager.playClick();
    const currentUrl = typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}#/i/${item?.id}`
      : '';

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(currentUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }).catch(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    } else {
      // Fallback
      const input = document.createElement('input');
      input.value = currentUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Execute Download
  const handleDownload = (file?: ResourceFile) => {
    soundManager.playSuccess();
    setDownloading(true);

    const targetFile = file || primaryFile;

    if (targetFile && item) {
      if (targetFile.is_external && (targetFile.external_url || targetFile.file_url?.startsWith('http'))) {
        const dest = targetFile.external_url || targetFile.file_url;
        window.open(dest, '_blank', 'noopener,noreferrer');
        setDownloading(false);
        setDownloadSuccess(true);
        if (onDownloadCompleted) onDownloadCompleted();
        return;
      }

      // Download from API
      const downloadUrl = `/api/resources/${item.id}/download/${targetFile.id}`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = targetFile.file_name || 'Bedrock_Addon.mcaddon';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        setDownloading(false);
        setDownloadSuccess(true);
        if (onDownloadCompleted) onDownloadCompleted();
      }, 700);
    } else if (item) {
      // Fallback direct download
      const downloadUrl = `/api/resources/${item.id}/download`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${item.title.replace(/\s+/g, '_')}.mcaddon`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        setDownloading(false);
        setDownloadSuccess(true);
        if (onDownloadCompleted) onDownloadCompleted();
      }, 700);
    } else {
      setDownloading(false);
    }
  };

  if (loading && !item) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" dir="rtl">
        <div className="p-8 bg-[#101018] rounded-3xl border border-slate-800 text-center text-slate-300 max-w-sm w-full space-y-4">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-white">جاري تحميل تفاصيل المود...</p>
        </div>
      </div>
    );
  }

  if (!item) return null;

  return (
    <div
      ref={scrollContainerRef}
      className="fixed inset-0 z-50 bg-[#07070B] overflow-y-auto selection:bg-[#FF284A]/30 selection:text-white"
      dir="rtl"
    >
      {/* Top Header Bar with Back Button */}
      <header className="sticky top-0 z-30 bg-[#07070B]/90 backdrop-blur-md border-b border-white/5 px-4 py-3 sm:px-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {/* Back Button matching screenshot: rounded pill with 'رجوع >' */}
          <button
            type="button"
            onClick={onClose}
            aria-label="رجوع"
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-black/50 hover:bg-black/75 border border-slate-700/80 hover:border-slate-500 text-slate-200 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95 group"
          >
            <span>رجوع</span>
            <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 text-slate-400 group-hover:text-white" />
          </button>

          {/* Quick share button on the opposite corner */}
          <button
            type="button"
            onClick={handleCopyLink}
            aria-label="مشاركة المود"
            className="p-2 rounded-full bg-black/40 hover:bg-black/60 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-[#00DF89]" /> : <Share2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Content Container matching screenshot visual hierarchy */}
      <main className="max-w-2xl mx-auto px-4 py-3 sm:px-6 space-y-4 pb-28">
        {/* 1. Main Image Gallery Container (16:9 Aspect Ratio) */}
        <div className="space-y-2.5">
          <div
            className="relative aspect-video w-full rounded-2xl overflow-hidden bg-[#050508] border border-slate-800/80 shadow-2xl cursor-pointer group select-none"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onClick={() => {
              soundManager.playClick();
              setIsLightboxOpen(true);
            }}
          >
            {/* The Main Image */}
            <img
              src={getAssetUrl(currentImage)}
              alt={`${item.title} - صورة ${activeImageIndex + 1}`}
              className="w-full h-full object-cover transition-opacity duration-200"
              loading="eager"
            />

            {/* Subtle Gradient Overlays for Badges and Controls */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/40 pointer-events-none" />

            {/* Version Badge (Top-Left matching screenshot '1.0') */}
            <div className="absolute top-3 left-3 pointer-events-none">
              <span className="px-2 py-0.5 rounded bg-black/85 text-white font-mono text-xs font-black border border-white/20 select-none shadow-md">
                {versionBadge}
              </span>
            </div>

            {/* Image Counter Badge (Top-Right: '1 / 4') */}
            {totalImages > 1 && (
              <div className="absolute top-3 right-3 pointer-events-none">
                <span className="px-2.5 py-0.5 rounded-full bg-black/75 backdrop-blur-md text-white text-[11px] font-mono font-bold border border-white/10 shadow-md">
                  {activeImageIndex + 1} / {totalImages}
                </span>
              </div>
            )}

            {/* Previous Image Button (Left) */}
            {totalImages > 1 && (
              <button
                type="button"
                aria-label="الصورة السابقة"
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevImage();
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 active:scale-95 text-white flex items-center justify-center border border-white/20 backdrop-blur-md transition-all cursor-pointer shadow-lg"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
            )}

            {/* Next Image Button (Right) */}
            {totalImages > 1 && (
              <button
                type="button"
                aria-label="الصورة التالية"
                onClick={(e) => {
                  e.stopPropagation();
                  goToNextImage();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 active:scale-95 text-white flex items-center justify-center border border-white/20 backdrop-blur-md transition-all cursor-pointer shadow-lg"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            )}

            {/* Fullscreen Hint Badge (Bottom-Left) */}
            <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/15 text-[10px] text-white flex items-center gap-1">
              <Maximize2 className="w-3 h-3" />
              <span>تكبير</span>
            </div>
          </div>

          {/* 2. Horizontal Thumbnail Gallery (Directly below main image) */}
          {totalImages > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 no-scrollbar scroll-smooth">
              {allImages.map((imgUrl, idx) => {
                const isActive = idx === activeImageIndex;
                return (
                  <button
                    key={idx}
                    ref={(el) => {
                      thumbnailRefs.current[idx] = el;
                    }}
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      setActiveImageIndex(idx);
                    }}
                    aria-label={`عرض الصورة ${idx + 1}`}
                    className={`relative shrink-0 w-20 sm:w-24 aspect-video rounded-lg overflow-hidden transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'border-2 border-[#00DF89] ring-2 ring-[#00DF89]/40 opacity-100 scale-[1.02] shadow-[0_0_12px_rgba(0,223,137,0.35)]'
                        : 'border border-slate-800 opacity-55 hover:opacity-90'
                    }`}
                  >
                    <img
                      src={getAssetUrl(imgUrl)}
                      alt={`مصغرة ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Category Label (Matching screenshot: ⚙️ مودات) */}
        <div className="flex items-center gap-1.5 pt-1 text-slate-300">
          <Settings className="w-4 h-4 text-slate-400" />
          <span className="text-xs sm:text-sm font-bold tracking-wide">
            {categoryTitle}
          </span>
        </div>

        {/* 4. Mod Title (Matching screenshot bold Arabic title) */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            {item.title}
          </h1>
        </div>

        {/* 5. Essential Mod Information 2x2 Grid (Matching screenshot layout) */}
        <div className="bg-[#12121a]/90 border border-slate-800/80 rounded-2xl overflow-hidden divide-y divide-slate-800/80 shadow-lg">
          {/* Row 1 */}
          <div className="grid grid-cols-2 divide-x divide-x-reverse divide-slate-800/80">
            {/* Top Right: إصدار اللعبة المسجل */}
            <div className="p-3.5 sm:p-4 space-y-1">
              <span className="text-xs text-slate-400 block font-medium">
                إصدار اللعبة المسجل
              </span>
              <span className="text-base sm:text-lg font-black text-white font-mono block" dir="ltr">
                {item.mc_version || '26.60'}
              </span>
            </div>
            {/* Top Left: الحجم */}
            <div className="p-3.5 sm:p-4 space-y-1">
              <span className="text-xs text-slate-400 block font-medium">
                الحجم
              </span>
              <span className="text-base sm:text-lg font-black text-white font-mono block" dir="ltr">
                {formattedFileSize}
              </span>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 divide-x divide-x-reverse divide-slate-800/80">
            {/* Bottom Right: التحميلات */}
            <div className="p-3.5 sm:p-4 space-y-1">
              <span className="text-xs text-slate-400 block font-medium">
                التحميلات
              </span>
              <span className="text-base sm:text-lg font-black text-white font-mono block">
                {(item.download_count ?? (item as any).real_download_count ?? 11).toLocaleString()}
              </span>
            </div>
            {/* Bottom Left: أُضيف في */}
            <div className="p-3.5 sm:p-4 space-y-1">
              <span className="text-xs text-slate-400 block font-medium">
                أُضيف في
              </span>
              <span className="text-xs sm:text-sm font-bold text-white block">
                {formattedDate}
              </span>
            </div>
          </div>
        </div>

        {/* 6. Copy Page Link Button (Matching screenshot outline button) */}
        <div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full py-3 px-4 rounded-xl border border-slate-700/80 bg-[#12121a]/70 hover:bg-[#181824] hover:border-slate-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99] shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-[#00DF89]" />
                <span className="text-[#00DF89]">تم نسخ رابط الصفحة!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-300" />
                <span>نسخ رابط الصفحة</span>
              </>
            )}
          </button>
        </div>

        {/* 7. Mod Description & Features */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#12121a]/60 border border-slate-800/80 space-y-3">
          <h3 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#00DF89]" />
            <span>عن المود والمواصفات:</span>
          </h3>
          <div className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line space-y-2">
            {item.full_description || item.short_description}
          </div>

          {item.install_instructions && (
            <div className="pt-2 border-t border-slate-800/70">
              <h4 className="text-xs font-bold text-slate-400 mb-1">طريقة التثبيت:</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {item.install_instructions}
              </p>
            </div>
          )}
        </div>

        {/* Multiple Download Links (if more than 1 file exists) */}
        {files.length > 1 && (
          <div className="p-4 rounded-2xl bg-[#12121a]/80 border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FileDown className="w-4 h-4 text-[#00DF89]" />
                <span>خيارات التحميل المتوفرة:</span>
              </span>
              <span className="text-[10px] text-slate-400">
                {files.length} ملفات متاحة
              </span>
            </div>
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#0a0a10] border border-slate-800 gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-white block truncate" dir="ltr">
                      {file.file_name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {file.file_size ? `${(file.file_size / (1024 * 1024)).toFixed(1)} MB` : 'رابط مباشر'}
                      {file.is_external ? ' • MediaFire' : ' • سيرفر مباشر'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownload(file)}
                    disabled={downloading}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                  >
                    {file.is_external ? <ExternalLink className="w-3 h-3" /> : <Download className="w-3 h-3" />}
                    <span>تحميل</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* In-Page Download Button (for desktop or full page flow) */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => handleDownload()}
            disabled={downloading}
            className="w-full py-4 px-6 rounded-2xl bg-[#00DF89] hover:bg-[#00F095] active:scale-[0.99] text-slate-950 font-black text-base sm:text-lg flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Download className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            <span>تحميل · {formattedFileSize}</span>
          </button>
        </div>

        {downloadSuccess && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>جاري بدء التنزيل... استمتع بمود ماين كرافت!</span>
          </div>
        )}
      </main>

      {/* 8. Sticky Mobile Bottom Download Bar (Matching screenshot vibrant green button) */}
      {!isLightboxOpen && (
        <div className="fixed bottom-0 inset-x-0 p-3.5 bg-gradient-to-t from-black via-black/95 to-transparent z-40 backdrop-blur-md sm:hidden pb-[calc(0.85rem+env(safe-area-inset-bottom))] border-t border-white/5">
          <button
            type="button"
            onClick={() => handleDownload()}
            disabled={downloading}
            className="w-full py-3.5 px-6 rounded-2xl bg-[#00DF89] hover:bg-[#00F095] active:scale-[0.98] text-slate-950 font-black text-base flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/30 transition-all cursor-pointer"
          >
            <Download className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            <span>تحميل · {formattedFileSize}</span>
          </button>
        </div>
      )}

      {/* 9. Fullscreen Image Viewer (Lightbox) */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between select-none"
          dir="rtl"
          onClick={() => {
            setIsLightboxOpen(false);
            setLightboxZoom(1);
          }}
        >
          {/* Lightbox Top Header */}
          <div
            className="flex items-center justify-between p-4 z-10 bg-gradient-to-b from-black/80 to-transparent"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Counter */}
            <span className="text-xs sm:text-sm font-bold text-slate-200 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md">
              الصورة {activeImageIndex + 1} من {totalImages}
            </span>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                setIsLightboxOpen(false);
                setLightboxZoom(1);
              }}
              aria-label="إغلاق المعاينة"
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer border border-white/20"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Lightbox Center Image View */}
          <div
            className="flex-1 relative flex items-center justify-center p-2 sm:p-6 overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getAssetUrl(currentImage)}
              alt={`${item.title} - صورة مكبرة ${activeImageIndex + 1}`}
              className="max-h-[85vh] max-w-[95vw] object-contain rounded-xl shadow-2xl transition-transform duration-200"
              style={{ transform: `scale(${lightboxZoom})` }}
              onDoubleClick={() => setLightboxZoom((prev) => (prev === 1 ? 1.8 : 1))}
            />

            {/* Prev/Next in Lightbox */}
            {totalImages > 1 && (
              <>
                <button
                  type="button"
                  aria-label="الصورة السابقة"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrevImage();
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/70 hover:bg-black/90 active:scale-95 text-white flex items-center justify-center border border-white/20 backdrop-blur-md cursor-pointer transition-all shadow-xl"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  aria-label="الصورة التالية"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNextImage();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/70 hover:bg-black/90 active:scale-95 text-white flex items-center justify-center border border-white/20 backdrop-blur-md cursor-pointer transition-all shadow-xl"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Lightbox Bottom Thumbnail Row */}
          {totalImages > 1 && (
            <div
              className="p-3 bg-gradient-to-t from-black/80 to-transparent flex justify-center gap-2 overflow-x-auto no-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              {allImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setActiveImageIndex(idx);
                  }}
                  className={`w-14 sm:w-18 aspect-video rounded-md overflow-hidden transition-all ${
                    idx === activeImageIndex
                      ? 'border-2 border-[#00DF89] ring-2 ring-[#00DF89]/40 opacity-100 scale-105'
                      : 'border border-slate-700 opacity-50 hover:opacity-80'
                  }`}
                >
                  <img src={getAssetUrl(imgUrl)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
