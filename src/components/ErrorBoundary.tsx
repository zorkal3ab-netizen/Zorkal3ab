import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#07070b] text-slate-100 flex items-center justify-center p-4 font-sans" dir="rtl">
          <div className="max-w-md w-full bg-[#101018] border border-slate-800 rounded-2xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
            <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-red-500/30 flex items-center justify-center mx-auto mb-4 text-red-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h1 className="text-xl font-bold text-white mb-2">
              حدث خطأ أثناء تحميل المنصة
            </h1>

            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              تعذر عرض الواجهة مؤقتًا. يرجى إعادة المحاولة أو تحديث الصفحة للعودة لمنصة ZORK CRAFT.
            </p>

            <button
              onClick={this.handleReload}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#FF284A] hover:bg-[#ff3b5c] text-white font-bold text-sm transition-all shadow-lg shadow-red-950/30 cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>إعادة تحميل الصفحة</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
