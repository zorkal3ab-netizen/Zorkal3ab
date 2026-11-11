import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#07070B] text-slate-100 flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="w-16 h-16 rounded-2xl bg-[#270B18] border border-[#FF284A]/40 flex items-center justify-center mb-5 text-[#FF284A] text-2xl font-bold shadow-[0_0_30px_rgba(255,40,74,0.3)]">
            !
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">
            تعذر تشغيل الموقع بشكل صحيح.
          </h1>
          <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
            حدث خطأ أثناء تحميل التطبيق. يرجى تحديث الصفحة أو المحاولة مرة أخرى.
          </p>
          <button
            onClick={() => {
              window.location.reload();
            }}
            className="px-6 py-2.5 bg-gradient-to-r from-[#FF284A] to-[#FF791F] text-white text-sm font-semibold rounded-xl hover:opacity-95 transition-all shadow-[0_0_20px_rgba(255,40,74,0.3)] cursor-pointer"
          >
            إعادة المحاولة
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
