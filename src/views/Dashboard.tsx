import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Announcement, parseIssueDescription, serializeIssueDescription, IssueNote, Issue } from '../types';
import { 
  Wallet, CheckCircle, AlertCircle, Clock, Users, AlertTriangle, Megaphone, X, ThumbsUp, Bell, Eye,
  Wrench, User, MessageCircle, Send, Paperclip, TrendingUp, TrendingDown, Calendar, Check, Plus
} from 'lucide-react';
import { AnnouncementsGrid } from '../components/AnnouncementsGrid';
import { sendBrowserNotification } from '../lib/notifications';

const COMMUNICATED_PARTIES = [
  'السباك (صيانة المياه والتسريبات)',
  'الكهربائي (أعطال إنارة وبور وخدمات ميكانيكية)',
  'فني وصيانة المصعد (الشركة المسؤولة)',
  'الحارس (خدمات العمارة والنظافة والتشغيل)',
  'لجنة إدارة العمارة والمجلس الاستشاري',
  'سكان العمارة ككل / مجموعة من الجيران',
  'شركة النظافة الخارجية وإدارة المرافق',
  'شركة الصيانة العامة والمقاولين',
  'البلدية / شركة المياه والكهرباء الوطنية',
  'أخرى / طرف خارجي آخر'
];

interface DashboardProps {
  setActiveTab?: (tab: string) => void;
  setPaymentPreselectMonth?: (month: string | null) => void;
  setIssuePreselectAdd?: (add: boolean) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTab, setPaymentPreselectMonth, setIssuePreselectAdd }) => {
  const { 
    currentUser, payments, expenses, issues, apartments, announcements, likeAnnouncement, updateIssue, users
  } = useAppContext();

  const [selectedAnn, setSelectedAnn] = useState<Announcement | null>(null);

  const [selectedDetailIssue, setSelectedDetailIssue] = useState<Issue | null>(null);
  const [quickActionStatus, setQuickActionStatus] = useState<'open' | 'in_progress' | 'resolved' | null>(null);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [quickCommunicatedParty, setQuickCommunicatedParty] = useState('');
  const [fullScreenIssueImage, setFullScreenIssueImage] = useState<string | null>(null);

  // Check for upcoming payments
  useEffect(() => {
    if (!currentUser || !payments) return;
    const currentMonth = new Date().toISOString().slice(0, 7);
    const payment = payments.find(p => p.month === currentMonth && p.apartment_id === apartments.find(a => a.tenant_id === currentUser.id)?.id);
    
    if (payment && payment.status === 'unpaid') {
        const dueDate = new Date(currentMonth + '-25');
        const today = new Date();
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
        if (diffDays > 0 && diffDays <= 5) {
            sendBrowserNotification('📅 تذكير بالدفع', 'عزيزي الساكن، موعد استحقاق الإيجار يقترب. يرجى المبادرة بالسداد.', 'payment');
        }
    }
  }, [currentUser, payments, apartments]);

  const isAdmin = currentUser?.role === 'admin';
  const currentMonth = new Date().toISOString().slice(0, 7);

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgent':
        return <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1 w-max"><AlertTriangle className="w-3 h-3" /> عاجل جداً</span>;
      case 'important':
        return <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 flex items-center gap-1 w-max"><Bell className="w-3 h-3" /> هام</span>;
      default:
        return <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 text-white/60 border border-white/10 flex items-center gap-1 w-max">إعلان عام</span>;
    }
  };

  // Admin Stats
  const totalIncome = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = expenses.reduce((sum, p) => sum + p.amount, 0);
  const openIssues = issues.filter(i => i.status === 'open').length;
  const unpaidCount = payments.filter(p => p.month === currentMonth && p.status === 'unpaid').length;

  // Tenant Stats
  const tenantApartment = apartments.find(a => a.tenant_id === currentUser?.id);
  const tenantPayments = payments.filter(p => p.apartment_id === tenantApartment?.id);
  const currentMonthPayment = tenantPayments.find(p => p.month === currentMonth);
  const tenantIssues = issues.filter(i => i.apartment_id === tenantApartment?.id).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const isCurrentMonthUnpaid = !currentMonthPayment || currentMonthPayment.status === 'unpaid';

  const handleConfirmQuickAction = async () => {
    if (!selectedDetailIssue) return;
    if (!quickActionStatus) return;
    if (!quickNoteText.trim()) return;

    const { cleanDescription, notes } = parseIssueDescription(selectedDetailIssue.description);

    const newNote: IssueNote = {
      id: Math.random().toString(36).substring(2, 11),
      author_name: currentUser?.name || 'مدير النظام',
      author_role: currentUser?.role || 'admin',
      text: quickNoteText,
      created_at: new Date().toISOString(),
      status_change: `${selectedDetailIssue.status} -> ${quickActionStatus}`,
      communicated_party: quickCommunicatedParty || undefined
    };

    const updatedNotes = [...notes, newNote];
    const newDescription = serializeIssueDescription(cleanDescription, updatedNotes);

    await updateIssue(selectedDetailIssue.id, {
      status: quickActionStatus,
      description: newDescription,
      resolved_at: quickActionStatus === 'resolved' ? new Date().toISOString() : undefined
    });

    setSelectedDetailIssue(null);
    setQuickActionStatus(null);
    setQuickNoteText('');
    setQuickCommunicatedParty('');
  };

  return (
    <div className="space-y-6">
      {/* Announcements Section - Top for All */}
      <div className="bg-[#161616] rounded-3xl border border-white/5 p-6">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-[#D4AF37]" />
          آخر التعميمات
        </h3>
        <AnnouncementsGrid 
          announcements={announcements.slice(0, 3)} 
          onLike={likeAnnouncement}
          onRead={setSelectedAnn}
          currentUserId={currentUser?.id}
        />
      </div>

      {isAdmin ? (
        // Admin Dashboard
        <div className="space-y-6">
          {/* Section 1: KPI Stats Summary (Top Priority - Birds-eye View) */}
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

          {/* Section 2: Operational & Urgent Actions Priority (Complaints & Maintenance - Quick view and action) */}
          <div className="bg-[#161616] rounded-3xl border border-white/5 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-[#D4AF37]" />
                  الشكاوى وبلاغات الصيانة الأخيرة المستلمة
                </h3>
                <p className="text-xs text-white/40 mt-1">
                  تابع طلبات سكان العمارة وقدم الردود السريعة وتحديثات الحالات لتوفير صيانة فورية.
                </p>
              </div>
              {issues.filter(i => i.status !== 'resolved').length > 0 && (
                <span className="px-2.5 py-1 bg-red-500/10 text-red-400 text-xs font-bold rounded-lg border border-red-500/10">
                  {issues.filter(i => i.status !== 'resolved').length} شكوى نشطة
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {issues.slice(0, 4).map(issue => (
                <div key={issue.id} className="p-4 bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl border border-white/5 flex flex-col justify-between gap-3 transition-all duration-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 truncate pl-2">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        issue.priority === 'high' ? 'bg-red-500' :
                        issue.priority === 'medium' ? 'bg-yellow-500' : 'bg-white/30'
                      }`} title={issue.priority === 'high' ? 'أولوية عالية' : 'أولوية عادية'} />
                      <h4 className="font-semibold text-white truncate text-sm">{issue.title}</h4>
                      <span className="text-[10px] text-white/30 font-mono">#{issue.id.substring(0, 6)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold whitespace-nowrap ${
                        issue.status === 'open' ? 'bg-red-500/10 text-red-500' :
                        issue.status === 'in_progress' ? 'bg-yellow-500/10 text-yellow-500' :
                        'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {issue.status === 'open' ? 'مفتوحة' : issue.status === 'in_progress' ? 'قيد العمل' : 'مغلقة'}
                      </span>
                      
                      <button
                        onClick={() => {
                          setSelectedDetailIssue(issue);
                          setQuickActionStatus(issue.status);
                        }}
                        className="px-2.5 py-1 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/20 rounded-lg text-[#D4AF37] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="عرض التفاصيل والإجراءات السريعة"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>عرض</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">{parseIssueDescription(issue.description).cleanDescription}</p>
                </div>
              ))}
              {issues.length === 0 && (
                <div className="col-span-2 text-center py-8 bg-white/[0.01] border border-dashed border-white/5 rounded-2xl">
                  <p className="text-white/30 text-sm">لا توجد بلاغات أو شكاوى مسجلة حالياً 🎉</p>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Financial Overview & Cash Flow (Tenant Payments vs building expenditures) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column A: Newest Tenant Payments (أحدث دفعات سكان العمارة) */}
            <div className="bg-[#161616] rounded-3xl border border-white/5 p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-[#D4AF37]" />
                      أحدث دفعات واشتراكات السكان
                    </h3>
                    <p className="text-xs text-white/40 mt-1">آخر المعاملات والإيصالات التي قدمها السكان للتسديد والتحقق.</p>
                  </div>
                  <button 
                    onClick={() => { if (setActiveTab) setActiveTab('financials'); }}
                    className="text-xs text-[#D4AF37] hover:underline font-bold"
                  >
                    عرض الكل ➔
                  </button>
                </div>

                <div className="space-y-3">
                  {(() => {
                    // Sorting function: prioritize actual payments, sort newest first
                    const latestPayments = [...payments]
                      .sort((a, b) => {
                        if (a.date_paid && b.date_paid) {
                          return b.date_paid.localeCompare(a.date_paid);
                        }
                        if (a.date_paid) return -1;
                        if (b.date_paid) return 1;
                        return b.month.localeCompare(a.month);
                      })
                      .slice(0, 5);

                    const formatArabicMonth = (monthStr: string) => {
                      try {
                        const [year, month] = monthStr.split('-');
                        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
                        return date.toLocaleString('ar-JO', { month: 'long' }) + ' ' + year;
                      } catch {
                        return monthStr;
                      }
                    };

                    if (latestPayments.length === 0) {
                      return <p className="text-white/30 text-center py-6 text-sm">لا توجد عمليات دفع مسجلة بعد.</p>;
                    }

                    return latestPayments.map(payment => {
                      const apt = apartments.find(a => a.id === payment.apartment_id);
                      const tenant = apt ? users.find(u => u.id === apt.tenant_id) : null;
                      
                      return (
                        <div key={payment.id} className="flex items-center justify-between p-3.5 bg-white/[0.02] hover:bg-white/[0.03] border border-white/5 rounded-2xl transition-all duration-200">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 rounded-xl flex flex-col items-center justify-center font-extrabold text-xs shrink-0">
                              <span className="text-[10px] text-white/50 leading-none">شقة</span>
                              <span className="leading-none mt-0.5">{apt?.number || '؟'}</span>
                            </div>
                            <div className="truncate">
                              <h4 className="text-xs font-semibold text-white truncate">
                                {tenant ? tenant.name : <span className="text-white/30 italic">شقة شاغرة</span>}
                              </h4>
                              <p className="text-[10px] text-white/40 mt-0.5">
                                اشتراك شهر: <span className="text-[#D4AF37] font-medium">{formatArabicMonth(payment.month)}</span>
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-left">
                              <span className="text-xs font-bold text-[#D4AF37] block">{payment.amount} د.أ</span>
                              <span className="text-[9px] text-white/30 block mt-0.5">
                                {payment.payment_method === 'cash' ? 'نقداً (كاش)' : 'كليك (CliQ)'}
                              </span>
                            </div>
                            <div>
                              {payment.status === 'paid' ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  مدفوع وموثق
                                </span>
                              ) : payment.verification_status === 'pending' ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                                  قيد التحقق
                                </span>
                              ) : payment.verification_status === 'rejected' ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                                  مرفوض
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold bg-white/5 text-white/30 border border-white/5">
                                  غير مدفوع
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            {/* Column B: Latest Building Expenses (أحدث مصاريف ونفقات العمارة) */}
            <div className="bg-[#161616] rounded-3xl border border-white/5 p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <TrendingDown className="w-5 h-5 text-red-500" />
                      أحدث المصاريف والنفقات
                    </h3>
                    <p className="text-xs text-white/40 mt-1">آخر فواتير وتكاليف صيانة وتشغيل مرافق العمارة المسجلة.</p>
                  </div>
                  <button 
                    onClick={() => { if (setActiveTab) setActiveTab('financials'); }}
                    className="text-xs text-red-400 hover:underline font-bold"
                  >
                    سجل المصاريف ➔
                  </button>
                </div>

                <div className="space-y-3">
                  {expenses.slice(0, 5).map(expense => (
                    <div key={expense.id} className="flex items-center justify-between p-3.5 bg-white/[0.02] hover:bg-white/[0.03] border border-white/5 rounded-2xl transition-all duration-200">
                      <div>
                        <h4 className="text-xs font-semibold text-white">{expense.title}</h4>
                        <p className="text-[10px] text-white/40 mt-1">{new Date(expense.date).toLocaleDateString('ar-JO', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      </div>
                      <span className="font-bold text-red-400 text-sm shrink-0">-{expense.amount} د.أ</span>
                    </div>
                  ))}
                  {expenses.length === 0 && <p className="text-white/40 text-center py-6 text-sm">لا توجد مصاريف مسجلة حتى الآن.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Tenant Dashboard
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#161616] rounded-3xl border border-white/5 p-6 flex flex-col h-full">
              <div className="flex-grow">
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
                </div>
              </div>
              <div className="space-y-2 pt-4 border-t border-white/5">
                {currentMonthPayment?.status !== 'paid' && (
                  <button
                    onClick={() => {
                      if (setActiveTab) setActiveTab('payments');
                      if (setPaymentPreselectMonth) setPaymentPreselectMonth(currentMonth);
                    }}
                    className="w-full py-3 bg-[#D4AF37] text-black font-semibold rounded-xl hover:bg-[#D4AF37]/80 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#D4AF37]/10"
                  >
                    <Wallet className="w-4 h-4" />
                    سداد دفعة هذا الشهر الآن
                  </button>
                )}
                <button
                  onClick={() => { if (setActiveTab) setActiveTab('payments'); }}
                  className="w-full py-3 bg-white/5 text-white font-semibold rounded-xl hover:bg-white/10 transition-all"
                >
                  سجل الدفعات
                </button>
              </div>
            </div>

            <div className="bg-[#161616] rounded-3xl border border-white/5 p-6 flex flex-col h-full">
              <div className="flex-grow">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">طلبات الصيانة والشكاوى الخاصة بي</h3>
                  <span className="bg-white/5 text-white/60 px-3 py-1 rounded-md text-sm font-medium">
                    {tenantIssues.length} طلب
                  </span>
                </div>
                <div className="space-y-3">
                  {tenantIssues.slice(0, 3).map(issue => (
                    <div 
                      key={issue.id} 
                      className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/5 hover:border-white/20 cursor-pointer transition-colors"
                      onClick={() => { if(setActiveTab) setActiveTab('issues'); }}
                    >
                      <div className="flex items-center gap-2 truncate">
                          <span className="font-medium text-white truncate">{issue.title}</span>
                          <span className="text-[10px] text-white/40">#{issue.id.substring(0,6)}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-1 rounded-md uppercase font-bold ${
                        issue.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {issue.status === 'resolved' ? 'مكتمل' : 'قيد المعالجة'}
                      </span>
                    </div>
                  ))}
                  {tenantIssues.length === 0 && <p className="text-white/40 text-center py-4">لا يوجد طلبات سابقة</p>}
                </div>
              </div>

              <div className="pt-6 border-t border-white/5">
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
      )}
      {selectedAnn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#161616] w-full max-w-2xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <Megaphone className="w-6 h-6 text-[#D4AF37]" />
                <h3 className="text-xl font-bold text-white">{selectedAnn.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedAnn(null)} 
                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-4 text-xs text-white/40 border-b border-white/5 pb-4">
                <div>{getPriorityBadge(selectedAnn.priority)}</div>
                <div>تاريخ النشر: {new Date(selectedAnn.created_at).toLocaleString('ar-JO')}</div>
                <div className="text-[#D4AF37]">الاطلاعات والموافقات: {selectedAnn.likes || 0} من السكان</div>
              </div>
              <div className="text-white/80 leading-relaxed text-base whitespace-pre-wrap bg-white/[0.01] p-5 rounded-2xl border border-white/[0.02]">
                {selectedAnn.content}
              </div>
            </div>
            <div className="p-6 border-t border-white/5 bg-white/[0.01] flex justify-end gap-3">
              <button
                onClick={() => {
                  likeAnnouncement(selectedAnn.id, currentUser?.id || '');
                  setSelectedAnn(null);
                }}
                className="px-6 py-3 bg-[#D4AF37] text-black font-bold rounded-xl hover:bg-[#D4AF37]/80 transition-all flex items-center gap-2"
              >
                <ThumbsUp className="w-4 h-4 fill-current" />
                تأكيد الاطلاع وموافقة
              </button>
              <button
                onClick={() => setSelectedAnn(null)}
                className="px-5 py-3 bg-white/5 text-white/80 rounded-xl hover:bg-white/10 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedDetailIssue && (() => {
        const { cleanDescription, notes } = parseIssueDescription(selectedDetailIssue.description);
        const reporter = users.find(u => u.id === selectedDetailIssue.reported_by);
        const apt = apartments.find(a => a.id === selectedDetailIssue.apartment_id);
        const isMaintenanceType = selectedDetailIssue.type === 'maintenance' || (selectedDetailIssue.type && typeof selectedDetailIssue.type === 'object' && selectedDetailIssue.type.value === 'maintenance');

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
            <div className="bg-[#161616] w-full max-w-5xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col my-8">
              {/* Modal Header */}
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                <div className="flex items-center gap-3">
                  <Wrench className="w-6 h-6 text-[#D4AF37]" />
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedDetailIssue.title}</h3>
                    <p className="text-xs text-white/40 mt-0.5">معرّف الشكوى: #{selectedDetailIssue.id.substring(0, 8)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setSelectedDetailIssue(null);
                    setQuickActionStatus(null);
                    setQuickNoteText('');
                    setQuickCommunicatedParty('');
                  }} 
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content - Two Columns */}
              <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto max-h-[70vh]">
                {/* Column 1: Left - Complaint Details */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5 space-y-4">
                    <h4 className="text-sm font-bold text-white border-b border-white/5 pb-2">تفاصيل الطلب الأساسية</h4>
                    
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="block text-white/40 mb-1">نوع الطلب</span>
                        <span className="font-semibold text-white">
                          {isMaintenanceType ? 'طلب صيانة' : 'شكوى عامة'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-white/40 mb-1">الأولوية</span>
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          selectedDetailIssue.priority === 'high' ? 'bg-red-500/10 text-red-400' :
                          selectedDetailIssue.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                          'bg-white/5 text-white/60'
                        }`}>
                          {selectedDetailIssue.priority === 'high' ? 'عالية جداً' : selectedDetailIssue.priority === 'medium' ? 'متوسطة' : 'عادية'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-white/40 mb-1">تاريخ التقديم</span>
                        <span className="font-semibold text-white">
                          {new Date(selectedDetailIssue.created_at).toLocaleString('ar-JO')}
                        </span>
                      </div>
                      <div>
                        <span className="block text-white/40 mb-1">الساكن / الشقة</span>
                        <span className="font-semibold text-white">
                          {selectedDetailIssue.is_anonymous ? 'مجهول الهوية' : `شقة ${apt?.number || '؟'} - ${reporter?.name || 'غير معروف'}`}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <span className="block text-xs text-white/40 mb-1.5">شرح ووصف المشكلة</span>
                      <div className="text-white/80 leading-relaxed text-sm bg-[#1E1E1E] p-4 rounded-xl border border-white/5 whitespace-pre-wrap">
                        {cleanDescription}
                      </div>
                    </div>

                    {/* Attachments */}
                    {selectedDetailIssue.attachments && selectedDetailIssue.attachments.length > 0 && (
                      <div className="pt-2">
                        <span className="block text-xs text-white/40 mb-2">الصور والمرفقات ({selectedDetailIssue.attachments.length})</span>
                        <div className="flex flex-wrap gap-2">
                          {selectedDetailIssue.attachments.map((url, idx) => (
                            <button 
                              key={idx}
                              onClick={() => setFullScreenIssueImage(url)}
                              className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10 hover:border-white/20 transition-all group cursor-zoom-in"
                            >
                              <img 
                                src={url} 
                                alt={`مرفق ${idx + 1}`} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                referrerPolicy="no-referrer"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Column 2: Right - Actions & Timeline */}
                <div className="lg:col-span-6 space-y-6">
                  {/* Actions Timeline */}
                  <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5 space-y-4">
                    <h4 className="text-sm font-bold text-white border-b border-white/5 pb-2">سجل المتابعة والتحديثات ({notes.length})</h4>
                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                      {notes.length === 0 ? (
                        <p className="text-xs text-white/40 italic">لا توجد تحديثات أو إجراءات مسجلة بعد لهذا الطلب.</p>
                      ) : (
                        notes.map((note) => (
                          <div key={note.id} className="p-3 bg-white/[0.01] border border-white/5 rounded-xl space-y-1">
                            <div className="flex items-center justify-between text-[11px] text-white/40">
                              <span className="font-bold text-[#D4AF37]">
                                {note.author_name} ({note.author_role === 'admin' ? 'الإدارة' : 'ساكن'})
                              </span>
                              <span>{new Date(note.created_at).toLocaleString('ar-JO')}</span>
                            </div>
                            <p className="text-xs text-white/80 leading-relaxed">{note.text}</p>
                            
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {note.status_change && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[9px] font-bold">
                                  <Wrench className="w-2.5 h-2.5" />
                                  الحالة: {note.status_change === 'open -> in_progress' ? 'مفتوح ➔ قيد العمل' : note.status_change === 'in_progress -> resolved' ? 'قيد العمل ➔ تم الحل' : note.status_change === 'open -> resolved' ? 'مفتوح ➔ تم الحل' : note.status_change}
                                </span>
                              )}
                              {note.communicated_party && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-500/10 text-[#D4AF37] text-[9px] font-bold">
                                  <User className="w-2.5 h-2.5" />
                                  تواصل مع: {note.communicated_party}
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Quick Action Panel Form */}
                  <div className="bg-[#1E1E1E]/50 p-5 rounded-2xl border border-[#D4AF37]/15 space-y-4">
                    <h4 className="text-sm font-bold text-[#D4AF37] flex items-center gap-1.5">
                      <Send className="w-4 h-4" />
                      إجراء سريع وتحديث الحالة
                    </h4>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-white/50 mb-1.5">تحديث الحالة إلى</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: 'open', label: 'مفتوح', color: 'border-red-500 text-red-500 hover:bg-red-500/10' },
                            { value: 'in_progress', label: 'قيد العمل', color: 'border-yellow-500 text-yellow-500 hover:bg-yellow-500/10' },
                            { value: 'resolved', label: 'مكتمل / تم الحل', color: 'border-emerald-500 text-emerald-400 hover:bg-emerald-500/10' }
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setQuickActionStatus(opt.value as any)}
                              className={`py-2 px-1 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                                quickActionStatus === opt.value
                                  ? opt.value === 'open' ? 'bg-red-500 text-white border-red-500' : opt.value === 'in_progress' ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-emerald-500 text-black border-emerald-500'
                                  : `bg-white/5 border-white/5 text-white/60 hover:text-white`
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-white/50 mb-1">الجهة التي تم التواصل معها (اختياري)</label>
                        <select
                          value={quickCommunicatedParty}
                          onChange={(e) => setQuickCommunicatedParty(e.target.value)}
                          className="w-full px-3 py-2 bg-[#1E1E1E] text-white text-xs border border-white/10 rounded-xl focus:ring-[#D4AF37] focus:border-[#D4AF37] cursor-pointer"
                        >
                          <option value="">لا يوجد جهة اتصال جديدة</option>
                          {COMMUNICATED_PARTIES.map((party, idx) => (
                            <option key={idx} value={party}>{party}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-white/50 mb-1">تفاصيل وملاحظات الإجراء (مطلوب)</label>
                        <textarea
                          rows={2}
                          required
                          value={quickNoteText}
                          onChange={(e) => setQuickNoteText(e.target.value)}
                          placeholder="مثال: تم التنسيق مع الفني المعني للحضور وتصليح العطل يوم غد..."
                          className="w-full px-3 py-2 bg-[#1E1E1E] text-white border border-white/10 rounded-xl focus:ring-[#D4AF37] focus:border-[#D4AF37] placeholder-white/20 text-xs resize-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-white/5 bg-white/[0.01] flex justify-end gap-3">
                <button
                  onClick={() => {
                    setSelectedDetailIssue(null);
                    setQuickActionStatus(null);
                    setQuickNoteText('');
                    setQuickCommunicatedParty('');
                  }}
                  className="px-5 py-3 bg-white/5 text-white/80 rounded-xl hover:bg-white/10 text-sm font-semibold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={!quickNoteText.trim() || !quickActionStatus}
                  onClick={handleConfirmQuickAction}
                  className="px-6 py-3 bg-[#D4AF37] text-black font-bold rounded-xl hover:bg-[#D4AF37]/80 transition-all flex items-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  حفظ الإجراء وتحديث الحالة
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {fullScreenIssueImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setFullScreenIssueImage(null)}>
          <button className="absolute top-4 right-4 text-white p-2 bg-black/50 rounded-full cursor-pointer" onClick={() => setFullScreenIssueImage(null)}>
            <X className="w-8 h-8" />
          </button>
          <img src={fullScreenIssueImage} alt="FullScreen" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
        </div>
      )}
    </div>
  );
};
