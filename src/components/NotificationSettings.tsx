import React, { useState, useEffect } from 'react';
import { 
  Bell, BellOff, CheckCircle, HelpCircle, ShieldAlert, Sparkles, Send, 
  Smartphone, Laptop, Plus, Trash2, Copy, Check, Code, Users, Settings, SmartphoneIcon
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getOrGenerateCurrentToken, getDeviceName } from '../lib/fcm';

export const NotificationSettings: React.FC = () => {
  const { 
    currentUser, 
    users,
    fcmTokens, 
    registerDeviceToken, 
    registerSimulatedToken, 
    removeToken, 
    pushNotificationToToken 
  } = useAppContext();

  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newSimulatedDevice, setNewSimulatedDevice] = useState('Android Phone');
  const [showSimForm, setShowSimForm] = useState(false);

  // FCM Target Sending State
  const [targetType, setTargetType] = useState<'single_token' | 'single_user' | 'role' | 'all'>('single_user');
  const [selectedToken, setSelectedToken] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'tenant'>('tenant');
  const [pushTitle, setPushTitle] = useState('🚨 تنبيه عاجل من الإدارة');
  const [pushBody, setPushBody] = useState('يرجى العلم بأنه سيتم إيقاف المصعد مؤقتاً لأعمال الصيانة بعد ساعة من الآن.');
  const [pushType, setPushType] = useState<'issue' | 'meeting' | 'announcement' | 'payment'>('announcement');
  const [apiLogs, setApiLogs] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Update selected token/user defaults when list changes
  useEffect(() => {
    if (fcmTokens.length > 0 && !selectedToken) {
      setSelectedToken(fcmTokens[0].token);
    }
    if (users.length > 0 && !selectedUserId) {
      setSelectedUserId(users[0].id);
    }
  }, [fcmTokens, users]);

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) return;
    const res = await Notification.requestPermission();
    setPermission(res);
    if (res === 'granted' && currentUser) {
      const token = await registerDeviceToken();
      // Test welcome push
      pushNotificationToToken(
        token,
        '🔔 تم تفعيل إشعارات FCM بنجاح',
        'مرحباً بك في نظام الإشعارات الذكي للعمارة! ستتلقى التنبيهات المباشرة هنا.',
        'announcement'
      );
    }
  };

  const copyTokenToClipboard = () => {
    const currentToken = getOrGenerateCurrentToken();
    navigator.clipboard.writeText(currentToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddSimDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    await registerSimulatedToken(currentUser.id, newSimulatedDevice);
    setShowSimForm(false);
    setNewSimulatedDevice('Android Phone');
  };

  const handleSendPush = async () => {
    setIsSending(true);
    const logs: string[] = [];
    logs.push(`[${new Date().toLocaleTimeString()}] البدء في جلب التوكينات المستهدفة...`);

    let targetTokens: string[] = [];

    if (targetType === 'single_token') {
      if (selectedToken) {
        targetTokens.push(selectedToken);
        logs.push(`استهداف توكين FCM محدد: ${selectedToken.substring(0, 20)}...`);
      }
    } else if (targetType === 'single_user') {
      const userTokens = fcmTokens.filter(t => t.user_id === selectedUserId);
      targetTokens = userTokens.map(t => t.token);
      const uName = users.find(u => u.id === selectedUserId)?.name || 'مستخدم مجهول';
      logs.push(`العثور على ${targetTokens.length} أجهزة نشطة مرتبطة بالمستخدم: ${uName}`);
    } else if (targetType === 'role') {
      const targetUsers = users.filter(u => u.role === selectedRole);
      const userIds = new Set(targetUsers.map(u => u.id));
      targetTokens = fcmTokens.filter(t => userIds.has(t.user_id)).map(t => t.token);
      logs.push(`استهداف مجموعة "${selectedRole === 'admin' ? 'المدراء' : 'السكان'}"... العثور على ${targetTokens.length} أجهزة نشطة.`);
    } else if (targetType === 'all') {
      targetTokens = fcmTokens.map(t => t.token);
      logs.push(`استهداف كافة الأجهزة المسجلة بالنظام... العثور على ${targetTokens.length} أجهزة إجمالاً.`);
    }

    if (targetTokens.length === 0) {
      logs.push(`❌ خطأ: لم يتم العثور على أي أجهزة (Tokens) نشطة للجهة المستهدفة!`);
      setApiLogs(prev => [...logs, ...prev]);
      setIsSending(false);
      return;
    }

    // Simulate calling Google FCM API
    logs.push(`[${new Date().toLocaleTimeString()}] POST https://fcm.googleapis.com/fcm/send`);
    logs.push(`Authorization: Bearer Server_Key_******`);
    logs.push(`Body Payload: ${JSON.stringify({
      registration_ids: targetTokens,
      notification: {
        title: pushTitle,
        body: pushBody,
        sound: "default",
        click_action: window.location.origin
      },
      data: {
        type: pushType,
        click_target: "dashboard"
      }
    }, null, 2)}`);

    // Dispatching notifications to targeted devices
    for (const token of targetTokens) {
      const deviceRec = fcmTokens.find(t => t.token === token);
      const devName = deviceRec ? deviceRec.device : 'جهاز نشط';
      logs.push(`✔ تم إرسال الإشعار بنجاح إلى الجهاز: ${devName}`);
      
      // Trigger browser/service worker alert in-app
      await pushNotificationToToken(token, pushTitle, pushBody, pushType);
    }

    logs.push(`🎉 اكتملت عملية الإرسال بنجاح! تم تسليم الإشعار لـ ${targetTokens.length} أجهزة بنجاح.`);
    setApiLogs(prev => [...logs, ...prev]);
    setIsSending(false);
  };

  // Get current user's tokens
  const currentUserTokens = fcmTokens.filter(t => t.user_id === currentUser?.id);
  const currentToken = getOrGenerateCurrentToken();

  // JSON Preview of FCM API Call
  const getFcmPayloadPreview = () => {
    let targetTokens: string[] = [];
    if (targetType === 'single_token') {
      if (selectedToken) targetTokens.push(selectedToken);
    } else if (targetType === 'single_user') {
      targetTokens = fcmTokens.filter(t => t.user_id === selectedUserId).map(t => t.token);
    } else if (targetType === 'role') {
      const targetUsers = users.filter(u => u.role === selectedRole);
      const userIds = new Set(targetUsers.map(u => u.id));
      targetTokens = fcmTokens.filter(t => userIds.has(t.user_id)).map(t => t.token);
    } else {
      targetTokens = fcmTokens.map(t => t.token);
    }

    return JSON.stringify({
      to: targetTokens.length === 1 ? targetTokens[0] : undefined,
      registration_ids: targetTokens.length > 1 ? targetTokens : undefined,
      notification: {
        title: pushTitle,
        body: pushBody,
        sound: "default",
        icon: "/icon.svg"
      },
      data: {
        type: pushType,
        timestamp: new Date().toISOString()
      }
    }, null, 2);
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 rounded-xl border transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
          permission === 'granted'
            ? 'bg-[#D4AF37]/5 border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/10 shadow-lg shadow-[#D4AF37]/5'
            : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
        }`}
        title="بوابة إشعارات FCM وإدارة الأجهزة"
      >
        <Bell className={`w-5 h-5 ${permission === 'granted' ? 'animate-wiggle' : ''}`} />
        <span className="text-xs font-bold hidden md:inline-block">إشعارات FCM</span>
        {permission === 'granted' && currentUserTokens.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-extrabold rounded-full border-2 border-[#161616]">
            {currentUserTokens.length}
          </span>
        )}
      </button>

      {/* Large Drawer / Modal Overlay */}
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setIsOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#141414] border border-white/10 rounded-3xl shadow-2xl z-50 p-6 sm:p-8 space-y-6 text-right animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <button 
                onClick={() => setIsOpen(false)}
                className="text-white/40 hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="text-left">
                  <h2 className="text-xl font-black text-white">إعدادات إشعارات Firebase (FCM)</h2>
                  <p className="text-xs text-white/40 mt-1">إدارة الأجهزة، تخزين التوكينات، ومحاكاة الإرسال المستهدف.</p>
                </div>
                <div className="w-12 h-12 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-2xl flex items-center justify-center shrink-0">
                  <Settings className="w-6 h-6 text-[#D4AF37]" />
                </div>
              </div>
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column (FCM Management & Devices list) */}
              <div className="lg:col-span-5 space-y-5">
                
                {/* Section A: Current Device State */}
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3.5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 justify-end">
                    <span>جهازك الحالي</span>
                    <Smartphone className="w-4 h-4 text-[#D4AF37]" />
                  </h3>

                  <div className="flex items-center justify-between p-2.5 bg-black/40 rounded-xl border border-white/5 text-xs">
                    {permission === 'granted' ? (
                      <span className="flex items-center gap-1.5 text-green-400 font-bold text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        الإشعارات مفعلة ومربوطة بـ FCM
                      </span>
                    ) : permission === 'denied' ? (
                      <span className="text-red-400 font-bold text-[11px] flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4" />
                        محظورة في المتصفح
                      </span>
                    ) : (
                      <span className="text-amber-400 font-bold text-[11px] flex items-center gap-1.5 animate-pulse">
                        بانتظار الموافقة على الإذن
                      </span>
                    )}
                    <span className="text-white/60 font-semibold">{getDeviceName()}</span>
                  </div>

                  {permission !== 'granted' && (
                    <button
                      onClick={handleRequestPermission}
                      className="w-full py-2 px-4 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-extrabold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#D4AF37]/10"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      طلب إذن الإشعارات وتوليد FCM Token
                    </button>
                  )}

                  {permission === 'granted' && (
                    <div className="space-y-2">
                      <div className="text-right">
                        <label className="text-[10px] text-white/40 block mb-1">رمز الـ FCM Token الحالي للجهاز:</label>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={copyTokenToClipboard}
                            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white rounded-lg transition-all cursor-pointer"
                            title="نسخ التوكين"
                          >
                            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <input
                            type="text"
                            readOnly
                            value={currentToken}
                            className="w-full bg-black/40 border border-white/5 rounded-lg px-2.5 py-1.5 text-[9px] font-mono text-[#D4AF37] text-left focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section B: Registered Devices & Tokens linked to Account */}
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setShowSimForm(!showSimForm)}
                      className="px-2 py-1 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      إضافة جهاز محاكي للاختبار
                    </button>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>الأجهزة النشطة بحسابك ({currentUserTokens.length})</span>
                      <Laptop className="w-4 h-4 text-[#D4AF37]" />
                    </h3>
                  </div>

                  {showSimForm && (
                    <form onSubmit={handleAddSimDevice} className="p-3 bg-black/30 border border-[#D4AF37]/10 rounded-xl space-y-2.5 animate-in slide-in-from-top-2 duration-200">
                      <label className="text-[10px] text-white/50 block text-right">اختر نوع الجهاز المحاكي لإضافته لقاعدة البيانات:</label>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="px-3 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black text-xs font-bold rounded-lg transition-all cursor-pointer"
                        >
                          إضافة
                        </button>
                        <select
                          value={newSimulatedDevice}
                          onChange={(e) => setNewSimulatedDevice(e.target.value)}
                          className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white text-right focus:outline-none"
                        >
                          <option value="هاتف أندرويد (Galaxy S24)">هاتف أندرويد (Galaxy S24)</option>
                          <option value="هاتف آيفون (iPhone 15 Pro)">هاتف آيفون (iPhone 15 Pro)</option>
                          <option value="جهاز آيباد (iPad Air)">جهاز آيباد (iPad Air)</option>
                          <option value="متصفح سفاري على ماك">متصفح سفاري على ماك</option>
                        </select>
                      </div>
                    </form>
                  )}

                  <div className="space-y-2 max-h-[220px] overflow-y-auto">
                    {currentUserTokens.map(device => {
                      const isCurrent = device.token === currentToken;
                      return (
                        <div key={device.id} className="p-2.5 bg-black/30 hover:bg-black/50 border border-white/5 rounded-xl flex items-center justify-between text-right transition-all">
                          <button
                            onClick={() => removeToken(device.token)}
                            className="text-white/40 hover:text-red-400 p-1 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                            title="حذف وإلغاء تسجيل هذا الجهاز"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          
                          <div className="min-w-0 flex items-center gap-2">
                            <div className="truncate text-left pr-2">
                              <span className="font-semibold text-white text-xs truncate block">{device.device}</span>
                              <span className="text-[9px] text-[#D4AF37] font-mono block mt-0.5 truncate max-w-[150px]">{device.token}</span>
                            </div>
                            <div className={`w-8 h-8 rounded-lg ${isCurrent ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20'} flex items-center justify-center shrink-0`}>
                              <SmartphoneIcon className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {currentUserTokens.length === 0 && (
                      <div className="text-center py-6 bg-black/20 border border-dashed border-white/5 rounded-xl">
                        <p className="text-white/30 text-xs">لا توجد أجهزة مسجلة لحسابك. يرجى تفعيل التراخيص أعلاه.</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Right Column (FCM API Targeted Sending Dashboard - Admins or Testing) */}
              <div className="lg:col-span-7 space-y-5">
                
                {/* Section C: Targeted FCM Sender Control */}
                <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[10px] font-bold rounded-md border border-red-500/20">
                      {currentUser?.role === 'admin' ? 'صلاحيات الإدارة مفعلة' : 'معاينة تجريبية للأجهزة'}
                    </span>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>بوابة إرسال إشعارات FCM المستهدفة</span>
                      <Send className="w-4 h-4 text-[#D4AF37]" />
                    </h3>
                  </div>

                  {/* Targeted parameters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-white/50 block mb-1.5">الهدف (Target Audience):</label>
                      <select
                        value={targetType}
                        onChange={(e: any) => setTargetType(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white text-right focus:outline-none focus:border-[#D4AF37]"
                      >
                        <option value="single_user">مستخدم معين (إرسال لكافة أجهزته)</option>
                        <option value="single_token">توكين FCM محدد وجهاز واحد فقط</option>
                        <option value="role">حسب صلاحية المستخدم (المدراء أو السكان)</option>
                        <option value="all">كافة مستخدمي وأجهزة العمارة المسجلة</option>
                      </select>
                    </div>

                    {/* Dynamic field based on Target Type */}
                    <div>
                      {targetType === 'single_user' && (
                        <>
                          <label className="text-xs text-white/50 block mb-1.5">اختر مستخدم العمارة المستهدف:</label>
                          <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white text-right focus:outline-none focus:border-[#D4AF37]"
                          >
                            {users.map(u => (
                              <option key={u.id} value={u.id}>{u.name} ({u.role === 'admin' ? 'مسؤول' : 'ساكن'})</option>
                            ))}
                          </select>
                        </>
                      )}

                      {targetType === 'single_token' && (
                        <>
                          <label className="text-xs text-white/50 block mb-1.5">اختر التوكين والجهاز المعين:</label>
                          <select
                            value={selectedToken}
                            onChange={(e) => setSelectedToken(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white text-right focus:outline-none focus:border-[#D4AF37]"
                          >
                            {fcmTokens.map(t => {
                              const u = users.find(user => user.id === t.user_id);
                              return (
                                <option key={t.id} value={t.token}>
                                  {t.device} ({u ? u.name : 'مجهول'})
                                </option>
                              );
                            })}
                            {fcmTokens.length === 0 && (
                              <option value="">لا توجد توكينات مسجلة حالياً</option>
                            )}
                          </select>
                        </>
                      )}

                      {targetType === 'role' && (
                        <>
                          <label className="text-xs text-white/50 block mb-1.5">اختر نوع الصلاحية المستهدفة:</label>
                          <select
                            value={selectedRole}
                            onChange={(e: any) => setSelectedRole(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white text-right focus:outline-none focus:border-[#D4AF37]"
                          >
                            <option value="tenant">كافة سكان العمارة (Tenants)</option>
                            <option value="admin">مسؤولي الإدارة واللجنة (Admins)</option>
                          </select>
                        </>
                      )}

                      {targetType === 'all' && (
                        <div className="flex items-center h-full pt-6">
                          <p className="text-xs text-green-400 font-bold flex items-center gap-1.5 justify-end w-full">
                            سيصل الإشعار إلى جميع الأجهزة الفعالة بقاعدة البيانات في نفس الوقت!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-white/50 block mb-1">عنوان الإشعار:</label>
                      <input
                        type="text"
                        value={pushTitle}
                        onChange={(e) => setPushTitle(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white text-right focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-white/50 block mb-1">نص ومحتوى الإشعار:</label>
                      <textarea
                        value={pushBody}
                        onChange={(e) => setPushBody(e.target.value)}
                        rows={2}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white text-right focus:outline-none focus:border-[#D4AF37] resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-white/50 block mb-1 text-right">نوع الحدث (Data Category):</label>
                        <select
                          value={pushType}
                          onChange={(e: any) => setPushType(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white text-right focus:outline-none focus:border-[#D4AF37]"
                        >
                          <option value="announcement">📢 تعميم إداري (Announcement)</option>
                          <option value="meeting">📅 اجتماع/لجنة (Meeting)</option>
                          <option value="payment">💰 دفعة مالية (Payment)</option>
                          <option value="issue">🔧 شكوى وصيانة (Issue)</option>
                        </select>
                      </div>
                      
                      <div className="flex items-end">
                        <button
                          onClick={handleSendPush}
                          disabled={isSending}
                          className="w-full py-2 px-4 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-extrabold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                          {isSending ? 'جاري الإرسال للتونيكات...' : 'إرسال الإشعار المباشر'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Collapsible live JSON API Payload representation */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-white/70 flex items-center gap-1.5 justify-end">
                      <span>عرض تفاصيل حمولة الـ API (JSON Payload Preview)</span>
                      <Code className="w-3.5 h-3.5 text-[#D4AF37]" />
                    </h4>
                    <pre className="p-3 bg-black/80 rounded-xl border border-white/5 text-[10px] font-mono text-[#D4AF37] text-left overflow-x-auto max-h-[140px] leading-relaxed">
                      {getFcmPayloadPreview()}
                    </pre>
                  </div>
                </div>

                {/* Section D: Live FCM logs inside dropdown console */}
                <div className="p-4 bg-black/70 border border-white/5 rounded-2xl space-y-2.5">
                  <h3 className="text-xs font-bold text-white flex items-center gap-2 justify-end">
                    <span>مخرجات وسجلات إرسال واستقبال بوابة FCM (API Network Logs)</span>
                    <Users className="w-4 h-4 text-green-400" />
                  </h3>
                  <div className="bg-black border border-white/5 rounded-xl p-3 h-28 overflow-y-auto text-left font-mono text-[9px] text-green-400 space-y-1.5 leading-normal">
                    {apiLogs.map((log, index) => (
                      <div key={index} className="whitespace-pre-wrap">{log}</div>
                    ))}
                    {apiLogs.length === 0 && (
                      <p className="text-white/20 italic text-center py-6">اضغط على زر الإرسال أعلاه لمشاهدة سجل الشبكة لمحاكاة الـ API...</p>
                    )}
                  </div>
                </div>

              </div>

            </div>

          </div>
        </>
      )}
    </div>
  );
};

interface XProps {
  className?: string;
}
const X: React.FC<XProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
