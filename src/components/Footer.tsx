import React from 'react';
import { Youtube, Shield, FileText, Info, Mail, AlertTriangle } from 'lucide-react';

interface FooterProps {
  onOpenLegal: (page: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenLegal }) => {
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
      </div>
    </footer>
  );
};
