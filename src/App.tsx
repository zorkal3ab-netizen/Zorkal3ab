import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { CategoryCards } from './components/CategoryCards';
import { ResourceCard } from './components/ResourceCard';
import type { ResourceItem } from './types';
import { ResourceDetailModal } from './components/ResourceDetailModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { Footer } from './components/Footer';
import { LegalPagesModal } from './components/LegalPagesModal';
import { soundManager } from './utils/soundManager';
import { Sparkles, Download, Clock, Search, FolderOpen } from 'lucide-react';
import { FALLBACK_RESOURCES, FALLBACK_CATEGORIES } from './data/fallbackData';

export default function App() {
  // Subscription gate state (shown once per session)
  const [hasConfirmedSubscription, setHasConfirmedSubscription] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return sessionStorage.getItem('zork_subscription_confirmed') === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });

  // Sound manager state (default OFF)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => soundManager.getEnabled());

  // Category and search filter state
  const [currentCategory, setCurrentCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Resources state - initialized immediately with published resources for 0ms load time on GitHub Pages
  const [resources, setResources] = useState<ResourceItem[]>(() =>
    FALLBACK_RESOURCES.filter((r) => r.is_published === 1)
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    FALLBACK_CATEGORIES.forEach((c) => {
      counts[c.slug] = FALLBACK_RESOURCES.filter(
        (r) => r.category_slug === c.slug && r.is_published === 1
      ).length;
    });
    return counts;
  });

  // Modals state
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [legalPage, setLegalPage] = useState<string | null>(null);

  // Toggle global sound setting
  const handleToggleSound = () => {
    const newState = soundManager.toggle();
    setSoundEnabled(newState);
  };

  // Fetch resources with silent background sync when backend API is present, without blocking static page load
  const fetchResources = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (currentCategory !== 'all') {
        params.set('category', currentCategory);
      }
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }

      let fetchedSuccessfully = false;
      try {
        const res = await fetch(`/api/resources?${params.toString()}`);
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          const data = await res.json();
          if (data.success && Array.isArray(data.resources)) {
            setResources(data.resources);
            fetchedSuccessfully = true;
          }
        }
      } catch {
        // Quietly handled by static fallback
      }

      if (!fetchedSuccessfully) {
        // Filter published static resources
        let filtered = FALLBACK_RESOURCES.filter((r) => r.is_published === 1);
        if (currentCategory !== 'all') {
          filtered = filtered.filter((r) => r.category_slug === currentCategory);
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          filtered = filtered.filter(
            (r) =>
              r.title.toLowerCase().includes(q) ||
              r.short_description.toLowerCase().includes(q)
          );
        }
        setResources(filtered);
      }

      // Refresh category counts
      let catCountsUpdated = false;
      try {
        const catRes = await fetch('/api/categories');
        if (catRes.ok && catRes.headers.get('content-type')?.includes('application/json')) {
          const catData = await catRes.json();
          if (catData.success && Array.isArray(catData.categories)) {
            const counts: Record<string, number> = {};
            catData.categories.forEach((c: any) => {
              counts[c.slug] = c.resource_count ?? 0;
            });
            setCategoryCounts(counts);
            catCountsUpdated = true;
          }
        }
      } catch {
        // Quietly handled
      }

      if (!catCountsUpdated) {
        const counts: Record<string, number> = {};
        FALLBACK_CATEGORIES.forEach((c) => {
          counts[c.slug] = FALLBACK_RESOURCES.filter(
            (r) => r.category_slug === c.slug && r.is_published === 1
          ).length;
        });
        setCategoryCounts(counts);
      }
    } catch (err) {
      console.error('Failed to update resources', err);
    }
  }, [currentCategory, searchQuery]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // Handle URL hash and route checks for resource modals (#/i/..., #resource-...)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const redirectRoute = searchParams.get('p') || searchParams.get('route');

      // Check if redirected from GitHub Pages 404.html
      if (redirectRoute) {
        if (redirectRoute.includes('#/i/')) {
          const id = redirectRoute.split('#/i/')[1];
          if (id) setSelectedResourceId(id);
        } else if (redirectRoute.startsWith('/#resource-') || redirectRoute.includes('#resource-')) {
          const id = redirectRoute.split('#resource-')[1];
          if (id) setSelectedResourceId(id);
        }
        // Clean URL parameter without reloading
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState(null, '', cleanUrl);
      }

      const handleHashChange = () => {
        const currentHash = window.location.hash;
        if (currentHash.startsWith('#/i/')) {
          const id = currentHash.replace('#/i/', '').trim();
          if (id) setSelectedResourceId(id);
        } else if (currentHash.startsWith('#/resource/')) {
          const id = currentHash.replace('#/resource/', '').trim();
          if (id) setSelectedResourceId(id);
        } else if (currentHash.startsWith('#resource-')) {
          const id = currentHash.replace('#resource-', '').trim();
          if (id) setSelectedResourceId(id);
        } else if (!currentHash || currentHash === '#' || currentHash === '#/') {
          setSelectedResourceId(null);
        }
      };

      handleHashChange();
      window.addEventListener('hashchange', handleHashChange);
      window.addEventListener('popstate', handleHashChange);
      return () => {
        window.removeEventListener('hashchange', handleHashChange);
        window.removeEventListener('popstate', handleHashChange);
      };
    }
  }, []);

  // Open and close resource detail with URL hash synchronization
  const handleOpenResource = (id: string) => {
    setSelectedResourceId(id);
    if (typeof window !== 'undefined') {
      const targetHash = `#/i/${id}`;
      if (window.location.hash !== targetHash) {
        window.history.pushState(null, '', `${window.location.pathname}${window.location.search}${targetHash}`);
      }
    }
  };

  const handleCloseResource = () => {
    setSelectedResourceId(null);
    if (typeof window !== 'undefined') {
      const currentHash = window.location.hash;
      if (currentHash.startsWith('#/i/') || currentHash.startsWith('#/resource/') || currentHash.startsWith('#resource-')) {
        window.history.pushState(null, '', `${window.location.pathname}${window.location.search}`);
      }
    }
  };

  // Filter subsets for homepage sections when viewing all categories without search
  const featuredResources = resources.filter((r) => r.is_featured === 1);
  const mostDownloaded = [...resources].sort((a, b) => (b.real_download_count || 0) - (a.real_download_count || 0));

  return (
    <div className="min-h-screen bg-[#07070B] text-slate-100 flex flex-col font-sans selection:bg-[#FF284A]/30 selection:text-white">
      {/* 
        SUBSCRIPTION GATE
        Untouched original 16:9 artwork with invisible button hotspots
        Shown once per session until confirmed
      */}
      {!hasConfirmedSubscription && (
        <SubscriptionModal
          onConfirmed={() => setHasConfirmedSubscription(true)}
        />
      )}

      {/* Main Public Navigation */}
      <Navbar
        currentCategory={currentCategory}
        onSelectCategory={(slug) => {
          setCurrentCategory(slug);
          const el = document.getElementById('resources-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        onOpenSearch={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          const input = document.querySelector('input[type="text"]') as HTMLInputElement;
          if (input) input.focus();
        }}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />

      {/* Hero Section */}
      <HeroSection
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onExploreClick={() => {
          const el = document.getElementById('categories-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        currentCategory={currentCategory}
      />

      {/* 5 Official Categories Cards */}
      <CategoryCards
        currentCategory={currentCategory}
        onSelectCategory={setCurrentCategory}
        resourceCounts={categoryCounts}
      />

      {/* Main Content & Resources Container */}
      <main id="resources-section" className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Active Filter or Search Title */}
        {(currentCategory !== 'all' || searchQuery.trim() !== '') && (
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                {searchQuery.trim() ? (
                  <>
                    <Search className="w-5 h-5 text-[#8ADFFF]" />
                    <span>نتائج البحث عن: "{searchQuery.trim()}"</span>
                  </>
                ) : (
                  <>
                    <FolderOpen className="w-5 h-5 text-[#FF791F]" />
                    <span>محتوى قسم {currentCategory}</span>
                  </>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                تم العثور على {resources.length} مورد معتمد.
              </p>
            </div>

            <button
              onClick={() => {
                soundManager.playClick();
                setCurrentCategory('all');
                setSearchQuery('');
              }}
              className="text-xs text-[#FF284A] hover:underline font-semibold cursor-pointer"
            >
              إلغاء التصفية
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 border-2 border-[#FF284A] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-slate-400 font-medium">جاري جلب الموارد من الخادم...</p>
          </div>
        ) : resources.length === 0 ? (
          /* Premium Empty States as strictly required by prompt Section 2 */
          <div className="py-14 sm:py-20 px-6 rounded-2xl bg-[#101018]/80 border border-slate-800/90 text-center max-w-lg mx-auto shadow-2xl relative overflow-hidden backdrop-blur-md">
            {/* Subtle background ambient glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-[#FF284A]/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-[#270B18] border border-[#FF284A]/40 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(255,40,74,0.15)]">
                <FolderOpen className="w-8 h-8 text-[#FF284A]" />
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-white mb-2 tracking-tight">
                {searchQuery.trim()
                  ? 'لم يتم العثور على نتائج مطابقة'
                  : currentCategory !== 'all'
                  ? 'لم تتم إضافة موارد لهذا القسم بعد.'
                  : 'لا توجد مودات منشورة حاليًا.'}
              </h3>

              <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto mb-6">
                {searchQuery.trim()
                  ? 'جرب البحث بكلمات أخرى أو تصفح الأقسام الرئيسية بالأعلى.'
                  : 'سيتم عرض المحتوى هنا بمجرد نشر موارد جديدة.'}
              </p>

              {(currentCategory !== 'all' || searchQuery.trim() !== '') && (
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setCurrentCategory('all');
                    setSearchQuery('');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold transition-all border border-slate-700/60 shadow-md cursor-pointer"
                >
                  <span>عرض جميع الموارد والأقسام</span>
                </button>
              )}
            </div>
          </div>
        ) : currentCategory !== 'all' || searchQuery.trim() !== '' ? (
          /* Grid View for Filtered / Searched Results */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {resources.map((item) => (
              <ResourceCard
                key={item.id}
                resource={item}
                onSelect={(res: ResourceItem) => handleOpenResource(res.id)}
              />
            ))}
          </div>
        ) : (
          /* Standard Multi-Section Homepage Layout */
          <>
            {/* Section E — Featured Resources (if marked by owner) */}
            {featuredResources.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span>الموارد المميزة المختارة</span>
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {featuredResources.map((item) => (
                    <ResourceCard
                      key={item.id}
                      resource={item}
                      onSelect={(res: ResourceItem) => handleOpenResource(res.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Section C — Latest Resources */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#8ADFFF]" />
                  <span>أحدث الموارد المضافة</span>
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {resources.slice(0, 8).map((item) => (
                  <ResourceCard
                    key={item.id}
                    resource={item}
                    onSelect={(res: ResourceItem) => handleOpenResource(res.id)}
                  />
                ))}
              </div>
            </section>

            {/* Section D — Most Downloaded Resources */}
            {mostDownloaded.some((r) => ((r as any).real_download_count || 0) > 0) && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <Download className="w-5 h-5 text-[#35D16F]" />
                    <span>الأكثر تحميلاً بالمنصة</span>
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {mostDownloaded.slice(0, 8).map((item) => (
                    <ResourceCard
                      key={item.id}
                      resource={item}
                      onSelect={(res: ResourceItem) => handleOpenResource(res.id)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Footer with legal info */}
      <Footer onOpenLegal={(page) => setLegalPage(page)} />

      {/* Resource Detail Modal */}
      {selectedResourceId && (
        <ResourceDetailModal
          resourceId={selectedResourceId}
          onClose={handleCloseResource}
          onDownloadCompleted={() => fetchResources()}
          onSelectResource={handleOpenResource}
        />
      )}

      {/* Legal Pages Modal */}
      {legalPage && (
        <LegalPagesModal
          initialTab={legalPage}
          onClose={() => setLegalPage(null)}
        />
      )}
    </div>
  );
}
