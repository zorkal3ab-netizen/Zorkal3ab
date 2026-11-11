import React from 'react';
import { Lock, Youtube, Shield, FileText, Info, Mail, AlertTriangle } from 'lucide-react';
import { soundManager } from '../utils/soundManager';

interface FooterProps {
  onOpenLegal: (page: string) => void;
  onOpenOwnerLogin: () => void;
  isServerVerifiedOwner?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ onOpenLegal, onOpenOwnerLogin, isServerVerifiedOwner = false }) => {
  return (
    <footer className="mt-16 border-t border-slate-800/80 bg-[#07070B] text-slate-400 pb-20 lg:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-3">
            <h3 className="text-lg font-extrabold text-white tracking-wider flex items-center gap-2">
              <span className="text-[#FF284A]">ZORK</span>
              <span>CRAFT</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md">
              المنصة العربية المتخصصة لإضافات ومحتوى Minecraft Bedrock. نقدم تجربة استكشاف متكاملة وموثوقة للمجتمع العربي.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <a
                href="https://youtube.com/@zork_al3ab?si=VOP34dCv3OlP1bTr"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 hover:text-white hover:bg-red-600 transition-colors text-xs font-semibold"
              >
                <Youtube className="w-4 h-4" />
                <span>قناة ZORK الرسمية</span>
              </a>
            </div>
          </div>

          {/* Legal Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              روابط وقوانين
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onOpenLegal('about')}
                  className="hover:text-slate-200 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Info className="w-3.5 h-3.5 text-slate-500" />
                  <span>من نحن</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLegal('contact')}
                  className="hover:text-slate-200 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>تواصل معنا</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLegal('privacy')}
                  className="hover:text-slate-200 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5 text-slate-500" />
                  <span>سياسة الخصوصية</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Compliance Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              الشروط والنزاهة
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onOpenLegal('terms')}
                  className="hover:text-slate-200 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>شروط الاستخدام</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLegal('dmca')}
                  className="hover:text-slate-200 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500/70" />
                  <span>بلاغ حقوق النشر (DMCA)</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Independence Disclaimer */}
        <div className="pt-6 border-t border-slate-900 text-center space-y-2">
          <p className="text-[11px] text-slate-500">
            ZORK CRAFT مشروع مجتمعي مستقل ولا يتبع Mojang Studios أو Microsoft بأي شكل رسمي. Minecraft علامة تجارية لشركة Mojang Synergies AB.
          </p>
          <p className="text-xs text-slate-400">
            شكرًا لزيارتك، نورت عالم ZORK CRAFT.
          </p>
          <p className="text-[10px] text-slate-600 font-mono">
            جميع الحقوق محفوظة © {new Date().getFullYear()} ZORK CRAFT
          </p>
        </div>

        {/* 
          PUBLIC OWNER LOCK (Per Section 3 of Specifications)
          Always visible to all public visitors with premium metallic chrome design,
          subtle crimson highlights, 44x44px minimum touch area, and navigation to /admin/login.
        */}
        <div className="mt-8 pt-4 border-t border-slate-900/60 flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onOpenOwnerLogin();
            }}
            className="group min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-lg bg-gradient-to-b from-[#1C1D26] via-[#13141B] to-[#0A0B10] border border-slate-700/60 hover:border-[#FF284A]/70 text-slate-400 hover:text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.6)] hover:shadow-[0_0_14px_rgba(255,40,74,0.25)] transition-all cursor-pointer flex items-center gap-2.5 focus-visible:ring-2 focus-visible:ring-[#FF284A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07070B] outline-none"
            title="دخول المالك"
            aria-label="دخول المالك"
          >
            <div className="w-6 h-6 rounded-md bg-[#0A0B10] border border-slate-700/80 group-hover:border-[#FF284A]/60 flex items-center justify-center transition-colors shadow-inner">
              <Lock className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#FF284A] transition-colors" />
            </div>
            <span className="text-xs font-semibold tracking-wide text-slate-400 group-hover:text-slate-100 transition-colors">
              دخول المالك
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
};
