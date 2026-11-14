export type LoadingPhase = 'loading' | 'ready' | 'dismissed' | 'error';

export type LoadingMilestone = 'dom' | 'bundle' | 'mounted' | 'ready';

export interface LoadingState {
  phase: LoadingPhase;
  progress: number;
  initialized: boolean;
  domReady: boolean;
  bundleLoaded: boolean;
  appMounted: boolean;
  optionalFailedCount: number;
  errorMessage: string | null;
  startedAt: number;
}

export const MAX_LOADING_TIMEOUT_MS = 6500;

export const MILESTONE_PROGRESS: Record<LoadingMilestone, number> = {
  dom: 30,
  bundle: 65,
  mounted: 90,
  ready: 100,
};

export function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function createLoadingState(startedAt = 0): LoadingState {
  return {
    phase: 'loading',
    progress: 12,
    initialized: false,
    domReady: false,
    bundleLoaded: false,
    appMounted: false,
    optionalFailedCount: 0,
    errorMessage: null,
    startedAt,
  };
}

export function beginLoadingInitialization(state: LoadingState): {
  state: LoadingState;
  accepted: boolean;
} {
  if (state.initialized) {
    return { state, accepted: false };
  }
  return {
    accepted: true,
    state: {
      ...state,
      initialized: true,
      progress: Math.max(state.progress, 15),
    },
  };
}

export function calculateProgress(state: LoadingState): number {
  if (state.phase === 'dismissed' || state.phase === 'ready') {
    return 100;
  }
  let target = state.progress;
  if (state.domReady) target = Math.max(target, MILESTONE_PROGRESS.dom);
  if (state.bundleLoaded) target = Math.max(target, MILESTONE_PROGRESS.bundle);
  if (state.appMounted) target = Math.max(target, MILESTONE_PROGRESS.mounted);
  return clampProgress(target);
}

export function advanceMilestone(
  state: LoadingState,
  milestone: LoadingMilestone
): LoadingState {
  if (state.phase === 'error' && milestone !== 'mounted' && milestone !== 'ready') {
    return state;
  }

  const next: LoadingState = { ...state };
  if (milestone === 'dom') {
    next.domReady = true;
  } else if (milestone === 'bundle') {
    next.domReady = true;
    next.bundleLoaded = true;
  } else if (milestone === 'mounted') {
    next.domReady = true;
    next.bundleLoaded = true;
    next.appMounted = true;
    next.errorMessage = null;
    if (next.phase === 'error') {
      next.phase = 'loading';
    }
  } else if (milestone === 'ready') {
    next.domReady = true;
    next.bundleLoaded = true;
    next.appMounted = true;
    next.errorMessage = null;
    next.phase = 'ready';
    next.progress = 100;
    return next;
  }

  next.progress = calculateProgress(next);
  return next;
}

export function handleAssetResult(
  state: LoadingState,
  opts: { essential: boolean; ok: boolean; errorLabel?: string }
): LoadingState {
  if (opts.ok) {
    const bump = state.phase === 'loading' ? Math.min(95, state.progress + 3) : state.progress;
    return {
      ...state,
      progress: clampProgress(Math.max(state.progress, bump)),
    };
  }

  if (!opts.essential) {
    return {
      ...state,
      optionalFailedCount: state.optionalFailedCount + 1,
    };
  }

  return handleInitError(
    state,
    opts.errorLabel || 'تعذر تحميل ملفات التشغيل الأساسية للموقع.'
  );
}

export function handleInitError(state: LoadingState, message: string): LoadingState {
  return {
    ...state,
    phase: 'error',
    errorMessage: message || 'حدث خطأ أثناء تهيئة الموقع.',
  };
}

export function handleLoadingTimeout(state: LoadingState): LoadingState {
  if (state.phase === 'dismissed' || state.phase === 'ready') {
    return state;
  }
  // If React mounted cleanly and only optional/slow tasks are left, complete safely
  if (state.appMounted) {
    return {
      ...state,
      phase: 'ready',
      progress: 100,
      errorMessage: null,
    };
  }
  // Never dismiss over a broken/empty screen if the app never mounted
  return handleInitError(
    state,
    'استغرق تحميل الموقع وقتًا أطول من المتوقع. تأكد من اتصالك بالإنترنت ثم أعد المحاولة.'
  );
}

export function canDismissOverlay(state: LoadingState): boolean {
  return state.appMounted || state.phase === 'ready' || state.phase === 'dismissed';
}

export function dismissLoadingOverlay(state: LoadingState): LoadingState {
  if (!canDismissOverlay(state)) {
    return state;
  }
  return {
    ...state,
    phase: 'dismissed',
    progress: 100,
  };
}

export function shouldSkipLoadingIntro(search: string): boolean {
  if (!search) return false;
  try {
    const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
    const val = params.get('autostart');
    return val === '1' || val === 'true';
  } catch {
    return false;
  }
}

export function isStaticHostingEnvironment(hostname: string, protocol = 'https:'): boolean {
  if (protocol === 'file:') return true;
  const host = (hostname || '').toLowerCase();
  return host.endsWith('.github.io') || host === 'github.io';
}
