import React, { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle, HelpCircle, ShieldAlert, Sparkles, Send } from 'lucide-react';
import { 
  requestNotificationPermission, 
  isNotificationPermissionGranted, 
  sendBrowserNotification 
} from '../lib/notifications';

export const NotificationSettings: React.FC = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isOpen, setIsOpen] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    if (granted) {
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 4000);
      
      // Fire a welcome push notification
      sendBrowserNotification(
        '🔔 تم تفعيل التنبيهات بنجاح!',
        'مرحباً بك! ستتلقى الآن إشعارات فورية حول الدفعات، التعميمات، الاجتماعات، والشكاوى.',
        'announcement'
      );
    }
  };

  const handleTestNotification = () => {
    sendBrowserNotification(
      '🔔 إشعار تجريبي من العمارة الذكية',
      'هذا إشعار تجريبي لتأكيد عمل نظام تنبيهات المتصفح لديك بنجاح! 🎉',
      'announcement'
    );
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 rounded-xl border transition-all duration-300 ${
          permission === 'granted'
            ? 'bg-[#D4AF37]/5 border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/10'
            : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
        }`}
        title="إعدادات إشعارات المتصفح"
      >
        {permission === 'granted' ? (
          <>
            <Bell className="w-5 h-5 animate-wiggle" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full ring-2 ring-[#161616]" />
          </>
        ) : (
          <BellOff className="w-5 h-5" />
        )}
      </button>

      {/* Settings Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-3 w-80 bg-[#161616] border border-white/10 rounded-2xl shadow-2xl z-50 p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#D4AF37]" />
                إشعارات المتصفح
              </h3>
              {permission === 'granted' && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  نشطة
                </span>
              )}
            </div>

            {/* If Permission is Default (Not requested yet) */}
            {permission === 'default' && (
              <div className="space-y-3">
                <p className="text-xs text-white/70 leading-relaxed text-right">
                  يرجى تفعيل الإشعارات لتلقي تنبيهات فورية ومباشرة من إدارة العمارة على جهازك مباشرة.
                </p>
                <button
                  onClick={handleRequestPermission}
                  className="w-full py-2.5 px-4 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  السماح بالتنبيهات الآن
                </button>
              </div>
            )}

            {/* If Permission is Denied */}
            {permission === 'denied' && (
              <div className="space-y-3 text-right">
                <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300 leading-relaxed">
                    الإشعارات محظورة في إعدادات متصفحك. يرجى الضغط على قفل الأمان بجانب رابط الموقع في شريط العنوان وإعادة السماح بالتنبيهات.
                  </p>
                </div>
              </div>
            )}

            {/* If Permission is Granted */}
            {permission === 'granted' && (
              <div className="space-y-3">
                <div className="text-xs text-white/50 space-y-2.5">
                  <p className="text-[11px] font-medium text-white/60 text-right">الأحداث التي ستتلقى بها إشعارات:</p>
                  <ul className="space-y-1.5 pr-1 text-right">
                    <li className="flex items-center justify-start gap-2 text-white/80">
                      <CheckCircle className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                      <span>اقتراب موعد الدفعات أو تغيير حالتها</span>
                    </li>
                    <li className="flex items-center justify-start gap-2 text-white/80">
                      <CheckCircle className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                      <span>نشر التعميمات والقرارات الإدارية الجديدة</span>
                    </li>
                    <li className="flex items-center justify-start gap-2 text-white/80">
                      <CheckCircle className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                      <span>جدولة الاجتماعات أو اللجان الجديدة</span>
                    </li>
                    <li className="flex items-center justify-start gap-2 text-white/80">
                      <CheckCircle className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                      <span>تحديث حالة الشكوى التي قمت بتقديمها</span>
                    </li>
                  </ul>
                </div>

                <div className="border-t border-white/5 pt-3">
                  <button
                    onClick={handleTestNotification}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white rounded-xl text-xs transition-all flex items-center justify-center gap-2 border border-white/5"
                  >
                    <Send className="w-3 h-3 text-[#D4AF37]" />
                    إرسال إشعار تجريبي للاختبار
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed bottom-6 left-6 z-50 bg-[#161616] border border-[#D4AF37]/30 p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300">
          <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white text-right">تم تفعيل التنبيهات بنجاح</h4>
            <p className="text-[10px] text-white/60 mt-0.5 text-right">ستصلك الإشعارات المهمة أولاً بأول!</p>
          </div>
        </div>
      )}
    </div>
  );
};
