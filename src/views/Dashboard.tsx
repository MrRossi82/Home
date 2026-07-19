import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { parseIssueDescription, Announcement, BuildingAsset } from '../types';
import { 
  Wallet, CheckCircle, AlertCircle, Clock, Home, Users, AlertTriangle,
  Megaphone, Sparkles, Plus, Trash2, Edit2, Phone, CalendarRange, Check, 
  ThumbsUp, LayoutDashboard, Wrench, Shield, Zap, Eye, Building
} from 'lucide-react';

interface DashboardProps {
  setActiveTab?: (tab: string) => void;
  setPaymentPreselectMonth?: (month: string | null) => void;
  setIssuePreselectAdd?: (add: boolean) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTab, setPaymentPreselectMonth, setIssuePreselectAdd }) => {
  const { 
    currentUser, payments, expenses, issues, apartments, users,
    announcements, buildingAssets, addAnnouncement, likeAnnouncement, deleteAnnouncement,
    addAsset, updateAsset, deleteAsset
  } = useAppContext();

  const isAdmin = currentUser?.role === 'admin';
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [dashboardSubTab, setDashboardSubTab] = useState<'overview' | 'announcements' | 'assets'>('overview');

  // Announcement Form State
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState<'normal' | 'important' | 'urgent'>('normal');

  // Asset Form State
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [assetName, setAssetName] = useState('');
  const [assetDesc, setAssetDesc] = useState('');
  const [assetValue, setAssetValue] = useState('');
  const [assetCategory, setAssetCategory] = useState('المرافق والمعدات');
  const [assetStatus, setAssetStatus] = useState<'excellent' | 'active' | 'needs_maintenance' | 'under_repair'>('active');
  const [assetLastMaint, setAssetLastMaint] = useState('');
  const [assetNextMaint, setAssetNextMaint] = useState('');
  const [assetContact, setAssetContact] = useState('');
  const [assetPhone, setAssetPhone] = useState('');

  // Admin Stats
  const totalIncome = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = expenses.reduce((sum, p) => sum + p.amount, 0);
  const openIssues = issues.filter(i => i.status === 'open').length;
  const unpaidCount = payments.filter(p => p.month === currentMonth && p.status === 'unpaid').length;

  // Tenant Stats
  const tenantApartment = apartments.find(a => a.tenant_id === currentUser?.id);
  const tenantPayments = payments.filter(p => p.apartment_id === tenantApartment?.id);
  const currentMonthPayment = tenantPayments.find(p => p.month === currentMonth);
  const tenantIssues = issues.filter(i => i.apartment_id === tenantApartment?.id);

  const isCurrentMonthUnpaid = !currentMonthPayment || currentMonthPayment.status === 'unpaid';

  // Announcement submission
  const handleAddAnnouncementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annContent) return;
    await addAnnouncement({
      title: annTitle,
      content: annContent,
      priority: annPriority,
      liked_by: [],
      likes: 0,
      views_count: 0
    });
    setAnnTitle('');
    setAnnContent('');
    setAnnPriority('normal');
    setShowAnnForm(false);
  };

  // Asset submission
  const handleAddAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName) return;
    await addAsset({
      name: assetName,
      description: assetDesc,
      value: Number(assetValue) || 0,
      category: assetCategory,
      status: assetStatus,
      last_maintenance: assetLastMaint || null,
      next_maintenance: assetNextMaint || null,
      contact_person: assetContact,
      contact_phone: assetPhone
    });
    setAssetName('');
    setAssetDesc('');
    setAssetValue('');
    setAssetLastMaint('');
    setAssetNextMaint('');
    setAssetContact('');
    setAssetPhone('');
    setShowAssetForm(false);
  };

  // Helper to render Category Icon
  const getAssetIcon = (category: string) => {
    switch (category) {
      case 'المرافق والمعدات':
        return <Wrench className="w-5 h-5 text-[#D4AF37]" />;
      case 'الطاقة والكهرباء':
        return <Zap className="w-5 h-5 text-yellow-500" />;
      case 'شبكة المياه':
        return <Home className="w-5 h-5 text-blue-400" />;
      case 'الأمن والحماية':
        return <Shield className="w-5 h-5 text-green-400" />;
      default:
        return <Building className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation pill tab bar */}
      <div className="flex bg-[#161616] p-1.5 rounded-2xl border border-white/5 w-full max-w-xl">
        <button
          id="tab-dashboard-overview"
          onClick={() => setDashboardSubTab('overview')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            dashboardSubTab === 'overview'
              ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/10'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          نظرة عامة
        </button>
        
        <button
          id="tab-dashboard-announcements"
          onClick={() => setDashboardSubTab('announcements')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all relative ${
            dashboardSubTab === 'announcements'
              ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/10'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          لوحة الإعلانات
          {announcements.length > 0 && (
            <span className="absolute -top-1 -left-1 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
              {announcements.length}
            </span>
          )}
        </button>
        
        <button
          id="tab-dashboard-assets"
          onClick={() => setDashboardSubTab('assets')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            dashboardSubTab === 'assets'
              ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/10'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          مرافق وصيانة العمارة
        </button>
      </div>

      {/* VIEW 1: OVERVIEW */}
      {dashboardSubTab === 'overview' && (
        isAdmin ? (
          // Admin Dashboard
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1: Cash Balance */}
              <div 
                id="card-cash-balance"
                onClick={() => { if (setActiveTab) setActiveTab('financials'); }}
                className="bg-[#161616] rounded-2xl p-6 border border-white/5 cursor-pointer hover:bg-[#1E1E1E] hover:border-[#D4AF37]/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-[#D4AF37]/20 text-[#D4AF37] rounded-xl flex items-center justify-center">
                    <Wallet className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-sm font-medium text-white/40 mb-1">صافي الصندوق / الرصيد النقدي</p>
                <h3 className="text-2xl font-bold text-white">{totalIncome - totalExpenses} د.أ</h3>
              </div>
              
              {/* Card 2: Overdue Payments */}
              <div 
                id="card-overdue-payments"
                onClick={() => { if (setActiveTab) setActiveTab('financials'); }}
                className="bg-[#161616] rounded-2xl p-6 border border-white/5 cursor-pointer hover:bg-[#1E1E1E] hover:border-[#D4AF37]/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-xl flex items-center justify-center">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-sm font-medium text-white/40 mb-1">المدفوعات المتأخرة ({currentMonth})</p>
                <h3 className="text-2xl font-bold text-white">{unpaidCount} وحدة</h3>
              </div>

              {/* Card 3: Pending Complaints */}
              <div 
                id="card-pending-complaints"
                onClick={() => { if (setActiveTab) setActiveTab('issues'); }}
                className="bg-[#161616] rounded-2xl p-6 border border-white/5 cursor-pointer hover:bg-[#1E1E1E] hover:border-[#D4AF37]/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-500/20 text-orange-500 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-sm font-medium text-white/40 mb-1">شكاوى قيد الانتظار</p>
                <h3 className="text-2xl font-bold text-white">{openIssues}</h3>
              </div>

              {/* Card 4: Active Tasks */}
              <div 
                id="card-active-tasks"
                onClick={() => { if (setActiveTab) setActiveTab('issues'); }}
                className="bg-[#161616] rounded-2xl p-6 border border-white/5 cursor-pointer hover:bg-[#1E1E1E] hover:border-[#D4AF37]/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-sm font-medium text-white/40 mb-1">المهام النشطة / الصيانة</p>
                <h3 className="text-2xl font-bold text-white">{issues.filter(i => i.status === 'in_progress').length}</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#161616] rounded-3xl border border-white/5 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">أحدث المصاريف</h3>
                <div className="space-y-4">
                  {expenses.slice(0, 5).map(expense => (
                    <div key={expense.id} className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl border border-white/5">
                      <div>
                        <h4 className="font-medium text-white">{expense.title}</h4>
                        <p className="text-sm text-white/40">{new Date(expense.date).toLocaleDateString('ar-JO')}</p>
                      </div>
                      <span className="font-semibold text-[#D4AF37]">{expense.amount} د.أ</span>
                    </div>
                  ))}
                  {expenses.length === 0 && <p className="text-white/40 text-center py-4">لا يوجد مصاريف مسجلة</p>}
                </div>
              </div>

              <div className="bg-[#161616] rounded-3xl border border-white/5 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">الشكاوى الأخيرة</h3>
                <div className="space-y-4">
                  {issues.slice(0, 5).map(issue => (
                    <div key={issue.id} className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-white truncate pl-4">{issue.title}</h4>
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold whitespace-nowrap uppercase ${
                          issue.status === 'open' ? 'bg-red-500/10 text-red-500' :
                          issue.status === 'in_progress' ? 'bg-yellow-500/10 text-yellow-500' :
                          'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {issue.status === 'open' ? 'مفتوحة' : issue.status === 'in_progress' ? 'قيد العمل' : 'مغلقة'}
                        </span>
                      </div>
                      <p className="text-sm text-white/40 line-clamp-2">{parseIssueDescription(issue.description).cleanDescription}</p>
                    </div>
                  ))}
                  {issues.length === 0 && <p className="text-white/40 text-center py-4">لا يوجد شكاوى</p>}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Tenant Dashboard
          <div className="space-y-6">
            <div className="bg-[#1E1E1E] border border-[#D4AF37]/20 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-3xl font-bold mb-2">مرحباً بك، {currentUser?.name}</h2>
                <p className="text-[#D4AF37] text-lg">شقة رقم {tenantApartment?.number}</p>
              </div>
              <div className="absolute left-0 top-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#161616] rounded-3xl border border-white/5 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">حالة الدفع ({currentMonth})</h3>
                  {currentMonthPayment?.status === 'paid' ? (
                    <span className="flex items-center text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-md text-sm font-medium">
                      <CheckCircle className="w-4 h-4 ml-1.5" />
                      مدفوع
                    </span>
                  ) : (
                    <span className="flex items-center text-orange-400 bg-orange-500/10 px-3 py-1 rounded-md text-sm font-medium">
                      <AlertCircle className="w-4 h-4 ml-1.5" />
                      غير مدفوع
                    </span>
                  )}
                </div>
                <div className="text-center py-6 border-t border-white/5">
                  <p className="text-white/40 mb-2">المبلغ المستحق لخدمات العمارة</p>
                  <p className="text-4xl font-bold text-white mb-4">10 <span className="text-xl text-white/40 font-medium">د.أ</span></p>
                  {isCurrentMonthUnpaid && (
                    <button
                      onClick={() => {
                        if (setActiveTab) setActiveTab('payments');
                        if (setPaymentPreselectMonth) setPaymentPreselectMonth(currentMonth);
                      }}
                      className="mt-2 w-full py-3 bg-[#D4AF37] text-black font-semibold rounded-xl hover:bg-[#D4AF37]/80 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#D4AF37]/10"
                    >
                      <Wallet className="w-4 h-4" />
                      سداد دفعة هذا الشهر الآن
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-[#161616] rounded-3xl border border-white/5 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">طلبات الصيانة والشكاوى الخاصة بي</h3>
                  <span className="bg-white/5 text-white/60 px-3 py-1 rounded-md text-sm font-medium">
                    {tenantIssues.length} طلب
                  </span>
                </div>
                <div className="space-y-3">
                  {tenantIssues.slice(0, 3).map(issue => (
                    <div key={issue.id} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/5">
                      <span className="font-medium text-white truncate">{issue.title}</span>
                      <span className={`text-[10px] px-2 py-1 rounded-md uppercase font-bold ${
                        issue.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {issue.status === 'resolved' ? 'مكتمل' : 'قيد المعالجة'}
                      </span>
                    </div>
                  ))}
                  {tenantIssues.length === 0 && <p className="text-white/40 text-center py-4">لا يوجد طلبات سابقة</p>}
                </div>

                <div className="mt-4 pt-4 border-t border-white/5">
                  <button
                    onClick={() => {
                      if (setActiveTab) setActiveTab('issues');
                      if (setIssuePreselectAdd) setIssuePreselectAdd(true);
                    }}
                    className="w-full py-3 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-[#D4AF37] font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    إضافة طلب صيانة أو شكوى
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* VIEW 2: ANNOUNCEMENTS BOARD */}
      {dashboardSubTab === 'announcements' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#161616] p-6 rounded-3xl border border-white/5">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-[#D4AF37]" />
                لوحة الإعلانات والتعميمات الرسمية
              </h2>
              <p className="text-sm text-white/40 mt-1">تابع آخر القرارات والتعميمات الهامة الصادرة من لجنة إدارة العمارة.</p>
            </div>
            {isAdmin && (
              <button
                id="btn-add-announcement"
                onClick={() => setShowAnnForm(!showAnnForm)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                إضافة تعميم جديد
              </button>
            )}
          </div>

          {/* Form to Add Announcement */}
          {showAnnForm && isAdmin && (
            <form onSubmit={handleAddAnnouncementSubmit} className="bg-[#161616] p-6 rounded-3xl border border-white/10 space-y-4">
              <h3 className="text-lg font-bold text-white">إنشاء تعميم رسمي جديد</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">عنوان التعميم</label>
                  <input
                    type="text"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="مثال: موعد صيانة المصعد أو تنظيف الخزانات"
                    className="w-full px-4 py-2.5 bg-[#1E1E1E] text-white border border-white/10 rounded-xl focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">الأولوية والأهمية</label>
                  <select
                    value={annPriority}
                    onChange={(e: any) => setAnnPriority(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#1E1E1E] text-white border border-white/10 rounded-xl focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                  >
                    <option value="normal">عادي (عام)</option>
                    <option value="important">هام (يتطلب انتباه)</option>
                    <option value="urgent">عاجل جداً (يتطلب إجراء فوري)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1.5">نص ومضمون التعميم بالتفصيل</label>
                <textarea
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  rows={4}
                  placeholder="اكتب تفاصيل الإعلان هنا بوضوح لجميع السكان..."
                  className="w-full px-4 py-2.5 bg-[#1E1E1E] text-white border border-white/10 rounded-xl focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                  required
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAnnForm(false)}
                  className="px-4 py-2.5 bg-white/5 text-white/80 rounded-xl hover:bg-white/10 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#D4AF37] text-black font-semibold rounded-xl hover:bg-[#D4AF37]/90 transition-colors"
                >
                  نشر التعميم للجميع
                </button>
              </div>
            </form>
          )}

          {/* Announcements List */}
          <div className="space-y-4">
            {announcements.length === 0 ? (
              <div className="text-center py-12 bg-[#161616] rounded-3xl border border-white/5">
                <Megaphone className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/60 font-semibold">لا يوجد أي تعميمات منشورة حالياً</p>
              </div>
            ) : (
              announcements.map((ann) => {
                const hasLiked = ann.liked_by?.includes(currentUser?.id || '');
                const isUrgent = ann.priority === 'urgent';
                const isImportant = ann.priority === 'important';

                return (
                  <div 
                    key={ann.id}
                    className={`bg-[#161616] p-6 rounded-3xl border transition-all ${
                      isUrgent 
                        ? 'border-red-500/30 shadow-lg shadow-red-500/5 bg-gradient-to-l from-red-500/[0.02] to-transparent' 
                        : isImportant 
                        ? 'border-yellow-500/30 bg-gradient-to-l from-yellow-500/[0.01] to-transparent' 
                        : 'border-white/5'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          isUrgent 
                            ? 'bg-red-500/10 text-red-500' 
                            : isImportant 
                            ? 'bg-[#D4AF37]/10 text-[#D4AF37]' 
                            : 'bg-white/5 text-white/60'
                        }`}>
                          {isUrgent ? 'عاجل وهام' : isImportant ? 'هام' : 'إعلان عام'}
                        </span>
                        <h3 className="text-lg font-bold text-white">{ann.title}</h3>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/40">
                        <span>{new Date(ann.created_at).toLocaleDateString('ar-JO', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        {isAdmin && (
                          <button
                            onClick={() => deleteAnnouncement(ann.id)}
                            className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="حذف التعميم"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-white/80 leading-relaxed whitespace-pre-wrap text-sm mb-6 bg-white/[0.01] p-4 rounded-2xl border border-white/[0.02]">
                      {ann.content}
                    </p>

                    <div className="flex items-center justify-between border-t border-white/5 pt-4">
                      <p className="text-xs text-white/40 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        أقر بالاطلاع {ann.likes || 0} من الجيران والأعضاء
                      </p>

                      <button
                        onClick={() => likeAnnouncement(ann.id, currentUser?.id || '')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          hasLiked
                            ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/15'
                            : 'bg-white/5 hover:bg-white/10 text-white/80'
                        }`}
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${hasLiked ? 'fill-current' : ''}`} />
                        {hasLiked ? 'تم الاطلاع ✔️' : 'تأكيد الاطلاع وموافقة'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: BUILDING FACILITIES & ASSETS PREVENTIVE MAINTENANCE */}
      {dashboardSubTab === 'assets' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#161616] p-6 rounded-3xl border border-white/5">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                أصول وممتلكات العمارة مع الصيانة الوقائية
              </h2>
              <p className="text-sm text-white/40 mt-1">تتبع الحالة الفنية للخدمات المشتركة ومواعيد الصيانة وعقود الدعم.</p>
            </div>
            {isAdmin && (
              <button
                id="btn-add-asset"
                onClick={() => setShowAssetForm(!showAssetForm)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                إضافة أصل / مرفق
              </button>
            )}
          </div>

          {/* Form to Add Asset */}
          {showAssetForm && isAdmin && (
            <form onSubmit={handleAddAssetSubmit} className="bg-[#161616] p-6 rounded-3xl border border-white/10 space-y-4">
              <h3 className="text-lg font-bold text-white">تسجيل مرفق أو أصل جديد</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">اسم المرفق / الجهاز</label>
                  <input
                    type="text"
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    placeholder="مثال: مضخة المياه الطابقية، المصعد الغربي"
                    className="w-full px-4 py-2.5 bg-[#1E1E1E] text-white border border-white/10 rounded-xl focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">التصنيف</label>
                  <select
                    value={assetCategory}
                    onChange={(e) => setAssetCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#1E1E1E] text-white border border-white/10 rounded-xl focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                  >
                    <option value="المرافق والمعدات">المرافق والمعدات</option>
                    <option value="الطاقة والكهرباء">الطاقة والكهرباء</option>
                    <option value="شبكة المياه">شبكة المياه</option>
                    <option value="الأمن والحماية">الأمن والحماية</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">تكلفة الإنشاء / القيمة (د.أ)</label>
                  <input
                    type="number"
                    value={assetValue}
                    onChange={(e) => setAssetValue(e.target.value)}
                    placeholder="القيمة المقدرة بالأردن"
                    className="w-full px-4 py-2.5 bg-[#1E1E1E] text-white border border-white/10 rounded-xl focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">الحالة التشغيلية الحالية</label>
                  <select
                    value={assetStatus}
                    onChange={(e: any) => setAssetStatus(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#1E1E1E] text-white border border-white/10 rounded-xl focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                  >
                    <option value="excellent">ممتازة (مفحوص وجديد)</option>
                    <option value="active">تعمل بشكل ممتاز (نشط)</option>
                    <option value="needs_maintenance">تحتاج لصيانة دورية قريباً</option>
                    <option value="under_repair">تحت الإصلاح الفني (متعطل)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">تاريخ آخر صيانة</label>
                  <input
                    type="date"
                    value={assetLastMaint}
                    onChange={(e) => setAssetLastMaint(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#1E1E1E] text-white border border-white/10 rounded-xl focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">تاريخ الصيانة القادمة</label>
                  <input
                    type="date"
                    value={assetNextMaint}
                    onChange={(e) => setAssetNextMaint(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#1E1E1E] text-white border border-white/10 rounded-xl focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">مسؤول الصيانة / الشركة المتعهدة</label>
                  <input
                    type="text"
                    value={assetContact}
                    onChange={(e) => setAssetContact(e.target.value)}
                    placeholder="مثال: شركة النخبة الفنية"
                    className="w-full px-4 py-2.5 bg-[#1E1E1E] text-white border border-white/10 rounded-xl focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">رقم هاتف الفني للصيانة</label>
                  <input
                    type="text"
                    value={assetPhone}
                    onChange={(e) => setAssetPhone(e.target.value)}
                    placeholder="مثال: 079xxxxxxx"
                    className="w-full px-4 py-2.5 bg-[#1E1E1E] text-white border border-white/10 rounded-xl focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1.5">ملاحظات ومواصفات المرفق</label>
                <textarea
                  value={assetDesc}
                  onChange={(e) => setAssetDesc(e.target.value)}
                  placeholder="مواصفات المرفق، فترة الضمان، ماركة الصنع، وما إلى ذلك..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-[#1E1E1E] text-white border border-white/10 rounded-xl"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAssetForm(false)}
                  className="px-4 py-2.5 bg-white/5 text-white/80 rounded-xl hover:bg-white/10 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#D4AF37] text-black font-semibold rounded-xl hover:bg-[#D4AF37]/90 transition-colors"
                >
                  حفظ وتسجيل الأصل
                </button>
              </div>
            </form>
          )}

          {/* Assets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {buildingAssets.map((asset) => {
              const statusColors = {
                excellent: 'bg-green-500/10 text-green-400 border-green-500/20',
                active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                needs_maintenance: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
                under_repair: 'bg-red-500/10 text-red-400 border-red-500/20'
              };

              const statusLabels = {
                excellent: 'حالة ممتازة',
                active: 'يعمل بكفاءة',
                needs_maintenance: 'يتطلب فحص دوري',
                under_repair: 'قيد الإصلاح حالياً'
              };

              return (
                <div 
                  key={asset.id} 
                  className="bg-[#161616] p-6 rounded-3xl border border-white/5 flex flex-col justify-between hover:border-white/10 transition-all duration-300"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                          {getAssetIcon(asset.category)}
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-base">{asset.name}</h3>
                          <span className="text-xs text-white/40">{asset.category}</span>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusColors[asset.status]}`}>
                        {statusLabels[asset.status]}
                      </span>
                    </div>

                    {/* Description */}
                    {asset.description && (
                      <p className="text-xs text-white/60 mb-5 leading-relaxed bg-white/[0.01] p-3 rounded-xl border border-white/[0.02]">
                        {asset.description}
                      </p>
                    )}

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs border-t border-white/5 pt-4 mb-5">
                      <div>
                        <p className="text-white/40 mb-1">القيمة الإنشائية للأصل</p>
                        <p className="font-bold text-[#D4AF37]">{asset.value ? `${asset.value} د.أ` : 'غير محددة'}</p>
                      </div>
                      <div>
                        <p className="text-white/40 mb-1">تاريخ التركيب/الشراء</p>
                        <p className="font-medium text-white">
                          {asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString('ar-JO') : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/40 mb-1">تاريخ آخر صيانة</p>
                        <p className="font-medium text-white">
                          {asset.last_maintenance ? new Date(asset.last_maintenance).toLocaleDateString('ar-JO') : 'لم تجرى سابقاً'}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/40 mb-1">موعد الصيانة القادمة</p>
                        <p className="font-semibold text-white/80 flex items-center gap-1">
                          <CalendarRange className="w-3.5 h-3.5 text-white/40" />
                          {asset.next_maintenance ? new Date(asset.next_maintenance).toLocaleDateString('ar-JO') : 'غير محددة'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action and Contact Card */}
                  <div className="border-t border-white/5 pt-4 space-y-3">
                    {asset.contact_person && (
                      <div className="flex items-center justify-between p-2 bg-white/5 rounded-xl border border-white/5">
                        <div className="overflow-hidden">
                          <p className="text-[10px] text-white/40">الجهة المتعهدة بالصيانة</p>
                          <p className="text-xs font-semibold text-white truncate">{asset.contact_person}</p>
                        </div>
                        {asset.contact_phone && (
                          <a 
                            href={`tel:${asset.contact_phone}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20 rounded-lg text-xs font-bold transition-all"
                          >
                            <Phone className="w-3 h-3" />
                            اتصال مباشر
                          </a>
                        )}
                      </div>
                    )}

                    {/* Admin Log & Actions */}
                    {isAdmin && (
                      <div className="flex gap-2 justify-end pt-2">
                        <button
                          onClick={async () => {
                            const today = new Date().toISOString().slice(0, 10);
                            const nextDate = new Date();
                            nextDate.setMonth(nextDate.getMonth() + 3); // next 3 months
                            const formattedNextDate = nextDate.toISOString().slice(0, 10);
                            await updateAsset(asset.id, {
                              last_maintenance: today,
                              next_maintenance: formattedNextDate,
                              status: 'active'
                            });
                          }}
                          className="flex-1 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          توثيق صيانة دورية اليوم
                        </button>

                        <button
                          onClick={() => deleteAsset(asset.id)}
                          className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all"
                          title="إزالة الأصل"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
