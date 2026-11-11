import React from 'react';
import { X, Shield, FileText, Info, Mail, AlertTriangle, ExternalLink } from 'lucide-react';
import { soundManager } from '../utils/soundManager';

interface LegalPagesModalProps {
  initialTab: string;
  onClose: () => void;
}

export const LegalPagesModal: React.FC<LegalPagesModalProps> = ({ initialTab, onClose }) => {
  const [activeTab, setActiveTab] = React.useState(initialTab);

  const tabs = [
    { id: 'about', label: 'من نحن', icon: Info },
    { id: 'contact', label: 'تواصل معنا', icon: Mail },
    { id: 'privacy', label: 'سياسة الخصوصية', icon: Shield },
    { id: 'terms', label: 'شروط الاستخدام', icon: FileText },
    { id: 'dmca', label: 'بلاغ حقوق النشر', icon: AlertTriangle },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-[#101018] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 bg-[#07070B]/80 sticky top-0 z-20">
          <div className="flex items-center gap-2 overflow-x-auto">
            {tabs.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    soundManager.playClick();
                    setActiveTab(t.id);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#FF284A]/15 text-[#FF284A] border border-[#FF284A]/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto text-xs sm:text-sm leading-relaxed text-slate-300 space-y-4">
          {activeTab === 'about' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-[#FF284A]" />
                <span>عن منصة ZORK CRAFT</span>
              </h3>
              <p>
                ZORK CRAFT هي المنصة العربية الرسمية الرائدة المخصصة لمحتوى وإضافات Minecraft Bedrock Edition.
                تم تصميم المنصة لتوفير وصول موثوق ومباشر لأفضل المودات، حزم الشيدرات والريـسورس، السكنات، والخرائط المتوافقة مع أجهزة الأندرويد، الآيفون، والحواسيب.
              </p>
              <p>
                نلتزم بتقديم محتوى نظيف، مفحوص أمنياً، وخالٍ من الروابط المضللة أو الإعلانات المزعجة، لنمنح عشاق ماينكرافت العرب بيئة لعب وترقية استثنائية.
              </p>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#8ADFFF]" />
                <span>قنوات التواصل الرسمية</span>
              </h3>
              <p>
                للاستفسارات، الاقتراحات، أو بلاغات التوافق، يسعدنا تواصلكم عبر القنوات المعتمدة:
              </p>
              <div className="bg-[#07070B] p-4 rounded-xl border border-slate-800 space-y-2">
                <p>
                  <strong>قناة التواصل والدعم:</strong>{' '}
                  <span className="text-slate-300">منتدى مجتمع ZORK CRAFT الرسمي وبلاغات المحتوى (DMCA)</span>
                </p>
                <p>
                  <strong>القناة الرسمية على يوتيوب:</strong>{' '}
                  <a
                    href="https://youtube.com/@zork_al3ab?si=VOP34dCv3OlP1bTr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FF284A] hover:underline inline-flex items-center gap-1 font-semibold"
                  >
                    <span>قناة ZORK</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#35D16F]" />
                <span>سياسة الخصوصية وحماية البيانات</span>
              </h3>
              <p>
                تحترم منصة ZORK CRAFT خصوصية الزوار التامة. نحن لا نقوم بجمع أو بيع أي بيانات شخصية أو حسابات مستخدمين.
              </p>
              <ul className="list-disc pr-5 space-y-1 text-slate-400">
                <li>لا توجد استمارات تسجيل عامة للزوار العاديين.</li>
                <li>يتم تشفير وتجزئة عناوين الـ IP الخاصة بالتحميلات بتقنية SHA-256 لمنع تكرار العداد وحماية الخوادم.</li>
                <li>يتم تخزين تفضيلات واجهة المستخدم (مثل الصوت وتأكيد الاشتراك) محلياً داخل متصفحك فقط.</li>
              </ul>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#9D72FF]" />
                <span>شروط الاستخدام</span>
              </h3>
              <p>
                باستخدامك لمنصة ZORK CRAFT، فإنك توافق على الالتزام بالشروط التالية:
              </p>
              <ul className="list-disc pr-5 space-y-1 text-slate-400">
                <li>استخدام الموارد والإضافات للاستخدام الشخصي غير التجاري.</li>
                <li>عدم استغلال خوادم التحميل بأي أدوات آلية أو هجمات حرمان من الخدمة.</li>
                <li>احترام حقوق المطورين وصناع المحتوى الأصليين المذكورين في صفحات الموارد.</li>
              </ul>
            </div>
          )}

          {activeTab === 'dmca' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>بلاغ حقوق النشر والملكية الفكرية (DMCA)</span>
              </h3>
              <p>
                تحرص منصة ZORK CRAFT على احترام حقوق الملكية الفكرية لكافة المبدعين وصناع محتوى مجتمع ماينكرافت.
              </p>
              <p>
                إذا كنت تعتقد أن هناك عملاً منشوراً ينتهك حقوقك الفكرية دون إذنك، يرجى مراسلتنا فوراً عبر البريد الرسمي مع إرفاق:
              </p>
              <ul className="list-disc pr-5 space-y-1 text-slate-400">
                <li>إثبات ملكيتك للمورد أو الإضافة.</li>
                <li>رابط صفحة المورد على منصة ZORK CRAFT.</li>
                <li>الإجراء المطلوب (إضافة النسبة والتفاصيل، أو الحذف الفوري).</li>
              </ul>
              <p className="text-slate-400">
                سيتم التعامل مع البلاغات وإزالة أي محتوى مخالف في غضون 24 ساعة.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
