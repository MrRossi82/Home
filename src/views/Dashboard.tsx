import React from 'react';
import { useAppContext } from '../context/AppContext';
import { parseIssueDescription } from '../types';
import { 
  Wallet, CheckCircle, AlertCircle, Clock, Users, AlertTriangle
} from 'lucide-react';

interface DashboardProps {
  setActiveTab?: (tab: string) => void;
  setPaymentPreselectMonth?: (month: string | null) => void;
  setIssuePreselectAdd?: (add: boolean) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTab, setPaymentPreselectMonth, setIssuePreselectAdd }) => {
  const { 
    currentUser, payments, expenses, issues, apartments
  } = useAppContext();

  const isAdmin = currentUser?.role === 'admin';
  const currentMonth = new Date().toISOString().slice(0, 7);

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

  return (
    <div className="space-y-6">
      {isAdmin ? (
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
      )}
    </div>
  );
};
