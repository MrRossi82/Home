import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Payment, Expense } from '../types';
import { 
  Check, 
  X, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  Wrench, 
  Trash2, 
  Activity, 
  DollarSign, 
  Calendar, 
  AlertTriangle, 
  PieChart,
  Hammer,
  Sparkles,
  Info
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { supabase } from '../lib/supabase';

export const Financials: React.FC = () => {
  const { payments, expenses, apartments, users, addPayment, addExpense, lookups } = useAppContext();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [tenantSearchTerm, setTenantSearchTerm] = useState('');

  // تبويبات الصفحة الرئيسية
  const [activeSubTab, setActiveSubTab] = useState<'stats' | 'payments' | 'expenses'>('stats');

  const [newExpense, setNewExpense] = useState({ title: '', amount: '', category: 'cleaning' });
  const [expenseImage, setExpenseImage] = useState<File | null>(null);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // إحصائيات مالية عامة
  const totalIncomeAllTime = useMemo(() => {
    return payments
      .filter(p => p.status === 'paid' || p.verification_status === 'verified')
      .reduce((sum, p) => sum + Number(p.amount), 0);
  }, [payments]);

  const totalExpensesAllTime = useMemo(() => {
    return expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  }, [expenses]);

  const netSafeBalance = useMemo(() => {
    return totalIncomeAllTime - totalExpensesAllTime;
  }, [totalIncomeAllTime, totalExpensesAllTime]);

  // إحصائيات الشهر المختار
  const monthlyPayments = useMemo(() => {
    return payments.filter(p => p.month === selectedMonth);
  }, [payments, selectedMonth]);

  const monthlyIncome = useMemo(() => {
    return monthlyPayments
      .filter(p => p.status === 'paid' || p.verification_status === 'verified')
      .reduce((sum, p) => sum + Number(p.amount), 0);
  }, [monthlyPayments]);

  const monthlyExpenses = useMemo(() => {
    return expenses
      .filter(e => {
        try {
          return new Date(e.date).toISOString().slice(0, 7) === selectedMonth;
        } catch {
          return false;
        }
      })
      .reduce((sum, e) => sum + Number(e.amount), 0);
  }, [expenses, selectedMonth]);

  const occupiedApartments = useMemo(() => {
    return apartments.filter(a => a.tenant_id).length;
  }, [apartments]);

  const paidApartmentsCount = useMemo(() => {
    return monthlyPayments.filter(p => p.status === 'paid' || p.verification_status === 'verified').length;
  }, [monthlyPayments]);

  const monthlyCollectionRate = useMemo(() => {
    return occupiedApartments > 0 
      ? Math.round((paidApartmentsCount / occupiedApartments) * 100) 
      : 0;
  }, [occupiedApartments, paidApartmentsCount]);

  const filteredApartments = useMemo(() => {
    return apartments.filter(apt => {
      const tenant = users.find(u => u.id === apt.tenant_id);
      const tenantName = tenant ? tenant.name.toLowerCase() : '';
      const aptNum = apt.number.toString();
      const term = tenantSearchTerm.toLowerCase().trim();
      if (!term) return true;
      return tenantName.includes(term) || aptNum.includes(term);
    });
  }, [apartments, users, tenantSearchTerm]);

  // تجهيز بيانات الرسم البياني الشهري (آخر 6 أشهر)
  const monthlyData = useMemo(() => {
    const monthsSet = new Set<string>();
    
    // تأمين آخر 6 أشهر افتراضياً
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      monthsSet.add(d.toISOString().slice(0, 7));
    }
    
    payments.forEach(p => monthsSet.add(p.month));
    expenses.forEach(e => {
      try {
        monthsSet.add(new Date(e.date).toISOString().slice(0, 7));
      } catch {}
    });
    
    const sortedMonths = Array.from(monthsSet).sort();
    
    const getArabicMonthName = (monthStr: string) => {
      const [year, month] = monthStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleString('ar-JO', { month: 'short' }) + ' ' + year;
    };

    return sortedMonths.map(month => {
      const income = payments
        .filter(p => p.month === month && (p.status === 'paid' || p.verification_status === 'verified'))
        .reduce((sum, p) => sum + Number(p.amount), 0);
        
      const expense = expenses
        .filter(e => {
          try {
            return new Date(e.date).toISOString().slice(0, 7) === month;
          } catch {
            return false;
          }
        })
        .reduce((sum, e) => sum + Number(e.amount), 0);

      return {
        month,
        name: getArabicMonthName(month),
        'الواردات (د.أ)': income,
        'المصاريف (د.أ)': expense,
        'الصافي': income - expense
      };
    }).slice(-6); // عرض آخر 6 أشهر فقط للوضوح
  }, [payments, expenses]);

  // توزيع المصاريف حسب التصنيفات
  const categoryExpensesBreakdown = useMemo(() => {
    const categoriesMap: Record<string, { label: string; amount: number; color: string }> = {
      'cleaning': { label: 'نظافة وغسيل', amount: 0, color: '#10B981' },
      'maintenance': { label: 'صيانة دورية', amount: 0, color: '#3B82F6' },
      'utilities': { label: 'كهرباء ومياه مشتركة', amount: 0, color: '#F59E0B' },
      'other': { label: 'مصاريف أخرى', amount: 0, color: '#8B5CF6' }
    };

    expenses.forEach(e => {
      const lookup = lookups.find(l => l.id === e.category_id);
      const catKey = lookup?.value || 'other';
      if (categoriesMap[catKey]) {
        categoriesMap[catKey].amount += Number(e.amount);
      } else {
        categoriesMap['other'].amount += Number(e.amount);
      }
    });

    const total = Object.values(categoriesMap).reduce((sum, c) => sum + c.amount, 0);

    return Object.entries(categoriesMap).map(([key, data]) => ({
      key,
      ...data,
      percentage: total > 0 ? Math.round((data.amount / total) * 100) : 0
    })).sort((a, b) => b.amount - a.amount);
  }, [expenses, lookups]);

  // دالة مخصصة لعرض تفاصيل تلميحات الرسم البياني بشكل أنيق
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1E1E1E] border border-white/10 p-4 rounded-2xl shadow-2xl text-right font-sans">
          <p className="text-white font-bold mb-2 text-sm">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 justify-end mb-1 text-xs font-semibold">
              <span className="text-white/60">{entry.name}:</span>
              <span style={{ color: entry.color }}>{entry.value.toFixed(1)} د.أ</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // معالجة إضافة مصروف جديد
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.title || !newExpense.amount) return;
    
    setUploadingImage(true);
    let image_url = null;
    if (expenseImage) {
      const fileExt = expenseImage.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `expenses/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase!.storage
        .from('attachments')
        .upload(filePath, expenseImage);

      if (!uploadError && uploadData) {
        const { data: publicUrlData } = supabase!.storage.from('attachments').getPublicUrl(filePath);
        image_url = publicUrlData.publicUrl;
      }
    }
    
    const categoryLookup = lookups.find(l => l.category === 'expense_type' && l.value === newExpense.category);
    
    await addExpense({
      title: newExpense.title,
      amount: parseFloat(newExpense.amount),
      category_id: categoryLookup?.id,
      image_url: image_url,
      date: new Date().toISOString()
    });
    
    setNewExpense({ title: '', amount: '', category: 'cleaning' });
    setExpenseImage(null);
    setUploadingImage(false);
    setShowAddExpense(false);
  };

  // معالجة تغيير دفع اشتراك لشقة يدوياً
  const handleTogglePayment = (apartment_id: string, currentPayment?: Payment) => {
    if (currentPayment && currentPayment.status === 'paid') {
      addPayment({
        apartment_id,
        month: selectedMonth,
        amount: 10,
        status: 'unpaid',
        payment_method: null,
        verification_status: 'none'
      });
    } else {
      addPayment({
        apartment_id,
        month: selectedMonth,
        amount: 10,
        status: 'paid',
        date_paid: new Date().toISOString(),
        payment_method: 'cash',
        verification_status: 'verified'
      });
    }
  };

  // التحقق من دفعة (موافقة أو رفض)
  const handleVerifyPayment = (apartment_id: string, currentPayment: any, verifyStatus: 'verified' | 'rejected') => {
    addPayment({
      apartment_id,
      month: selectedMonth,
      amount: currentPayment.amount || 10,
      status: verifyStatus === 'verified' ? 'paid' : 'unpaid',
      date_paid: verifyStatus === 'verified' ? new Date().toISOString() : undefined,
      payment_method: currentPayment.payment_method,
      verification_status: verifyStatus
    });
  };

  return (
    <div className="space-y-8 font-sans">
      
      {/* Header section with page title & responsive switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#161616] p-6 rounded-3xl border border-white/5">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <span className="p-2 bg-[#D4AF37]/10 rounded-xl text-[#D4AF37]">
              <DollarSign className="w-6 h-6" />
            </span>
            الإدارة المالية
          </h1>
          <p className="text-sm text-white/40 mt-1.5">تتبع الميزانية العامة، جمع الاشتراكات، وإدارة نفقات ومصاريف العمارة.</p>
        </div>
        
        {/* SubTab selectors */}
        <div className="flex flex-wrap items-center gap-1.5 bg-black/30 p-1.5 rounded-2xl border border-white/5">
          <button
            onClick={() => setActiveSubTab('stats')}
            className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeSubTab === 'stats'
                ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/10'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <PieChart className="w-4 h-4" />
            الإحصائيات والتحليل
          </button>
          
          <button
            onClick={() => setActiveSubTab('payments')}
            className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeSubTab === 'payments'
                ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/10'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calendar className="w-4 h-4" />
            جمع الاشتراكات
          </button>
          
          <button
            onClick={() => setActiveSubTab('expenses')}
            className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeSubTab === 'expenses'
                ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/10'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            مصاريف العمارة
          </button>
        </div>
      </div>

      {/* SUBTAB 1: STATISTICS & ANALYTICS */}
      {activeSubTab === 'stats' && (
        <div className="space-y-8">
          
          {/* Bento Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Net Balance Card */}
            <div className="bg-[#161616] rounded-3xl p-6 border border-white/5 relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-[#D4AF37]/20 text-[#D4AF37] rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <span className="text-emerald-400 text-[10px] font-black bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1 animate-pulse">
                    <Activity className="w-3 h-3" /> نشط وآمن
                  </span>
                </div>
                <p className="text-xs font-medium text-white/40 mb-1">صافي رصيد صندوق العمارة</p>
                <h3 className="text-3xl font-black text-white tracking-tight">{netSafeBalance.toFixed(1)} د.أ</h3>
              </div>
              <p className="text-[10px] text-white/30 border-t border-white/5 pt-3 mt-4">
                إجمالي الواردات: {totalIncomeAllTime.toFixed(1)} د.أ | المصاريف: {totalExpensesAllTime.toFixed(1)} د.أ
              </p>
            </div>

            {/* Collection Rate Card */}
            <div className="bg-[#161616] rounded-3xl p-6 border border-white/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-semibold bg-white/5 px-2.5 py-1 rounded-full text-white/60">
                    شهر {selectedMonth}
                  </span>
                </div>
                <p className="text-xs font-medium text-white/40 mb-1">معدل تحصيل الاشتراكات</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-white tracking-tight">{monthlyCollectionRate}%</h3>
                  <span className="text-xs text-white/40 font-semibold">({paidApartmentsCount} من {occupiedApartments} مسكونة)</span>
                </div>
              </div>
              <div className="space-y-1.5 mt-4">
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-500 h-full rounded-full transition-all duration-700" 
                    style={{ width: `${monthlyCollectionRate}%` }} 
                  />
                </div>
                <p className="text-[10px] text-white/30">نسبة الشقق التي سددت اشتراك الخدمات لهذا الشهر</p>
              </div>
            </div>

            {/* Total Historical Income Card */}
            <div className="bg-[#161616] rounded-3xl p-6 border border-white/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                    +{monthlyIncome} د.أ للشهر الحالي
                  </span>
                </div>
                <p className="text-xs font-medium text-white/40 mb-1">إجمالي الواردات والاشتراكات</p>
                <h3 className="text-3xl font-black text-white tracking-tight">{totalIncomeAllTime.toFixed(1)} د.أ</h3>
              </div>
              <p className="text-[10px] text-white/30 border-t border-white/5 pt-3 mt-4">
                تراكمي لجميع الأشهر والمدفوعات الموثقة
              </p>
            </div>

            {/* Total Historical Expenses Card */}
            <div className="bg-[#161616] rounded-3xl p-6 border border-white/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-xl flex items-center justify-center">
                    <TrendingDown className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] text-red-400 font-bold bg-red-500/10 px-2.5 py-1 rounded-md border border-red-500/20">
                    -{monthlyExpenses} د.أ للشهر الحالي
                  </span>
                </div>
                <p className="text-xs font-medium text-white/40 mb-1">إجمالي المصروفات والنفقات</p>
                <h3 className="text-3xl font-black text-white tracking-tight">{totalExpensesAllTime.toFixed(1)} د.أ</h3>
              </div>
              <p className="text-[10px] text-white/30 border-t border-white/5 pt-3 mt-4">
                تراكمي لجميع عمليات الصيانة والنظافة والخدمات
              </p>
            </div>
          </div>

          {/* Interactive Chart & Category breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Visual Recharts Area */}
            <div className="bg-[#161616] rounded-3xl border border-white/5 p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
                    مقارنة المقبوضات مع المصاريف
                  </h3>
                  <p className="text-xs text-white/40 mt-1">تطور التدفق المالي والدفع لآخر 6 أشهر لتحديد التوجه المالي.</p>
                </div>
              </div>
              
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyData}
                    margin={{ top: 20, right: 5, left: 5, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="rgba(255,255,255,0.4)" 
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.4)" 
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      unit=" د.أ"
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                    <Legend 
                      verticalAlign="top" 
                      height={36} 
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 11, direction: 'rtl', paddingBottom: 15 }}
                    />
                    <Bar dataKey="الواردات (د.أ)" fill="#D4AF37" radius={[4, 4, 0, 0]} name="إجمالي المقبوضات" barSize={14} />
                    <Bar dataKey="المصاريف (د.أ)" fill="#EF4444" radius={[4, 4, 0, 0]} name="إجمالي المصروفات" barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category progress list */}
            <div className="bg-[#161616] rounded-3xl border border-white/5 p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-[#D4AF37]" />
                  تحليل النفقات والتبويب المالي
                </h3>
                <p className="text-xs text-white/40 mb-6">توزيع الميزانية المستهلكة حسب فئات الإنفاق والصيانة المعتمدة.</p>
                
                <div className="space-y-5">
                  {categoryExpensesBreakdown.map((item) => (
                    <div key={item.key} className="space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-white/80 font-medium flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          {item.label}
                        </span>
                        <span className="text-white font-bold">
                          {item.amount.toFixed(1)} د.أ <span className="text-white/40 text-[10px] font-normal">({item.percentage}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-700" 
                          style={{ width: `${item.percentage}%`, backgroundColor: item.color }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-8 border-t border-white/5 pt-4 flex gap-2 items-start bg-white/[0.01] p-3 rounded-2xl border border-white/5">
                <Info className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <p className="text-[10px] text-white/50 leading-relaxed">
                  تساعدك البيانات أعلاه على فهم مجالات الاستهلاك الأكثر استقطاباً للأموال لدراسة إمكانية ترشيد الإنفاق أو جدولة الصيانة الدورية للأصول بفاعلية أكبر.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: FEE COLLECTIONS */}
      {activeSubTab === 'payments' && (
        <div className="bg-[#161616] rounded-3xl border border-white/5 overflow-hidden">
          <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#D4AF37]" />
                تحصيل الاشتراكات ورسوم الخدمات
              </h2>
              <p className="text-white/40 text-sm mt-1">تتبع حالة تسديد المدفوعات والاشتراكات الشهرية لجميع الشقق السكنية في العمارة.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  placeholder="بحث باسم الساكن أو رقم الشقة..." 
                  value={tenantSearchTerm}
                  onChange={(e) => setTenantSearchTerm(e.target.value)}
                  className="w-full sm:w-56 px-4 py-2 bg-[#1E1E1E] text-white placeholder-white/30 border border-white/10 rounded-xl focus:ring-[#D4AF37] focus:border-[#D4AF37] text-sm outline-none font-medium"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-white/60 font-semibold hidden md:inline whitespace-nowrap">عرض شهر:</label>
                <input 
                  type="month" 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full sm:w-auto px-4 py-2 bg-[#1E1E1E] text-white border border-white/10 rounded-xl focus:ring-[#D4AF37] focus:border-[#D4AF37] font-semibold text-sm outline-none"
                />
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead className="bg-white/[0.02] border-b border-white/5 text-white/60 text-xs sm:text-sm">
                <tr>
                  <th className="px-6 py-4 font-bold">رقم الشقة</th>
                  <th className="px-6 py-4 font-bold">اسم الساكن / المستأجر</th>
                  <th className="px-6 py-4 font-bold">المبلغ المستحق</th>
                  <th className="px-6 py-4 font-bold">طريقة الدفع وملاحظات</th>
                  <th className="px-6 py-4 font-bold">الحالة</th>
                  <th className="px-6 py-4 font-bold text-center">إجراءات الإدارة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filteredApartments.map(apt => {
                  const payment = payments.find(p => p.apartment_id === apt.id && p.month === selectedMonth);
                  const tenant = users.find(u => u.id === apt.tenant_id);
                  const isPaid = payment?.status === 'paid';

                  return (
                    <tr key={apt.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-extrabold text-white text-base">شقة {apt.number}</span>
                      </td>
                      <td className="px-6 py-4">
                        {tenant ? (
                          <div className="flex flex-col">
                            <span className="text-white font-semibold">{tenant.name}</span>
                            {tenant.phone && <span className="text-[10px] text-white/40">{tenant.phone}</span>}
                          </div>
                        ) : (
                          <span className="text-white/20 italic">شقة شاغرة</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[#D4AF37] font-bold">10.00 د.أ</td>
                      <td className="px-6 py-4">
                        {payment?.payment_method ? (
                          <span className="text-xs bg-white/5 text-white/70 px-2 py-1 rounded-md border border-white/5 font-semibold">
                            {payment.payment_method === 'cash' ? 'نقداً (كاش)' : 'كليك (CliQ)'}
                          </span>
                        ) : (
                          <span className="text-white/25 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isPaid ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            مدفوع وموثق
                          </span>
                        ) : payment?.verification_status === 'pending' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                            قيد التحقق والموافقة
                          </span>
                        ) : payment?.verification_status === 'rejected' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                            مرفوض / غير دقيق
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-white/5 text-white/30 border border-white/5">
                            غير مدفوع
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {payment?.verification_status === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleVerifyPayment(apt.id, payment, 'verified')}
                                className="px-3 py-1.5 bg-emerald-500 text-black font-extrabold text-xs rounded-xl hover:bg-emerald-400 transition-all flex items-center gap-1 shadow-md shadow-emerald-500/5"
                                title="تأكيد وموافقة"
                              >
                                <Check className="w-3.5 h-3.5" />
                                موافقة
                              </button>
                              <button
                                onClick={() => handleVerifyPayment(apt.id, payment, 'rejected')}
                                className="px-3 py-1.5 bg-red-500/20 text-red-400 font-bold text-xs rounded-xl hover:bg-red-500/30 transition-all flex items-center gap-1 border border-red-500/10"
                                title="رفض الطلب"
                              >
                                <X className="w-3.5 h-3.5" />
                                رفض
                              </button>
                            </>
                          ) : (
                            <button
                              disabled={!tenant}
                              onClick={() => handleTogglePayment(apt.id, payment)}
                              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                                !tenant ? 'opacity-30 cursor-not-allowed bg-white/5 text-white/20' :
                                isPaid 
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20' 
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                              }`}
                            >
                              {isPaid ? (
                                <>
                                  <X className="w-3.5 h-3.5" />
                                  إلغاء السداد
                                </>
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  تسجيل سداد نقدي
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: BUILDING EXPENDITURES */}
      {activeSubTab === 'expenses' && (
        <div className="space-y-6">
          <div className="bg-[#161616] rounded-3xl border border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                  سجل مصاريف ونفقات العمارة
                </h2>
                <p className="text-white/40 text-sm mt-1">تسجيل وتوثيق المصاريف التشغيلية والدورية والطارئة مع المرفقات وسندات الصرف.</p>
              </div>
              <button 
                onClick={() => setShowAddExpense(!showAddExpense)}
                className="flex items-center px-5 py-2.5 bg-[#D4AF37] text-black font-extrabold rounded-xl hover:bg-[#D4AF37]/80 transition-all text-sm shadow-lg shadow-[#D4AF37]/10"
              >
                <Plus className="w-4 h-4 ml-2" />
                إضافة مصروف جديد
              </button>
            </div>

            {/* Add expense sub-form */}
            {showAddExpense && (
              <div className="p-6 bg-[#1E1E1E] border-b border-white/5">
                <h3 className="text-sm font-bold text-white/90 mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  تسجيل مصروف أو سند صرف جديد
                </h3>
                <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      placeholder="بيان المصروف (مثال: تغيير إنارة بيت الدرج والمدخل)"
                      value={newExpense.title}
                      onChange={e => setNewExpense({...newExpense, title: e.target.value})}
                      className="w-full px-4 py-2.5 bg-[#161616] text-white border border-white/10 rounded-xl focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none text-sm"
                      required
                    />
                  </div>
                  
                  <div>
                    <input
                      type="number"
                      placeholder="المبلغ المصروف (د.أ)"
                      value={newExpense.amount}
                      onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
                      className="w-full px-4 py-2.5 bg-[#161616] text-white border border-white/10 rounded-xl focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none text-sm font-bold"
                      required
                      min="0"
                      step="0.1"
                    />
                  </div>
                  
                  <div>
                    <select
                      value={newExpense.category}
                      onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                      className="w-full px-4 py-2.5 bg-[#161616] text-white border border-white/10 rounded-xl focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none text-sm"
                    >
                      <option value="cleaning">نظافة وغسيل</option>
                      <option value="maintenance">صيانة دورية</option>
                      <option value="utilities">كهرباء ومياه مشتركة</option>
                      <option value="other">أخرى / متنوعة</option>
                    </select>
                  </div>

                  <div className="md:col-span-3 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                    <div className="relative flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => setExpenseImage(e.target.files?.[0] || null)}
                        className="hidden"
                        id="expense-image-upload"
                      />
                      <label 
                        htmlFor="expense-image-upload" 
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#161616] text-white/70 border border-white/10 rounded-xl cursor-pointer hover:bg-white/5 transition-colors text-sm border-dashed"
                      >
                        <Layers className="w-4 h-4 text-white/40" />
                        {expenseImage ? `المرفق المحدد: ${expenseImage.name}` : 'إرفاق صورة الفاتورة أو الإيصال'}
                      </label>
                    </div>

                    <button 
                      type="submit" 
                      disabled={uploadingImage} 
                      className="px-8 py-2.5 bg-white text-black font-extrabold rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50 text-sm whitespace-nowrap"
                    >
                      {uploadingImage ? 'جاري توثيق المصروف...' : 'حفظ وتسجيل المصروف'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Expenses List */}
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead className="bg-white/[0.02] border-b border-white/5 text-white/60 text-xs sm:text-sm">
                  <tr>
                    <th className="px-6 py-4 font-bold">التاريخ والوقت</th>
                    <th className="px-6 py-4 font-bold">بيان المصروف وتفاصيل الصرف</th>
                    <th className="px-6 py-4 font-bold">التصنيف المحاسبي</th>
                    <th className="px-6 py-4 font-bold text-left">المبلغ المصروف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {expenses.map(expense => {
                    const categoryLabel = lookups.find(l => l.id === expense.category_id)?.label || 'أخرى';
                    return (
                      <tr key={expense.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="px-6 py-4 text-white/40 font-mono text-xs">
                          {new Date(expense.date).toLocaleDateString('ar-JO', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="px-6 py-4 font-semibold text-white">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <span>{expense.title}</span>
                            {expense.image_url && (
                              <a 
                                href={expense.image_url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="inline-flex items-center text-[10px] text-blue-400 hover:text-blue-300 font-bold bg-blue-500/5 border border-blue-500/10 px-2 py-0.5 rounded-full"
                              >
                                عرض الفاتورة المرفقة
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-white/5 text-white/70 px-2.5 py-1 rounded-lg text-xs font-semibold border border-white/5">
                            {categoryLabel}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-extrabold text-red-400 text-left text-base font-mono">
                          -{Number(expense.amount).toFixed(2)} د.أ
                        </td>
                      </tr>
                    );
                  })}
                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-white/30 italic">لا توجد أي مصاريف أو قيود صرف مسجلة في صندوق العمارة حالياً.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
