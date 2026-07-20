import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Wallet, Calendar, CheckCircle2, Clock, X, AlertTriangle, ArrowLeftRight, HelpCircle, Check, Ban } from 'lucide-react';

interface TenantPaymentsProps {
  preselectMonth?: string | null;
  setPreselectMonth?: (month: string | null) => void;
}

export const TenantPayments: React.FC<TenantPaymentsProps> = ({ preselectMonth, setPreselectMonth }) => {
  const { currentUser, payments, apartments, addPayment } = useAppContext();
  const [showAddForm, setShowAddForm] = useState(false);
  
  // State for form
  const [paymentMonth, setPaymentMonth] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'cliq'>('cliq');
  const [amount, setAmount] = useState(10); // Standard fee is 10 JOD
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Find tenant's apartment
  const tenantApartment = apartments.find(a => a.tenant_id === currentUser?.id);

  // If there's a preselected month from the Dashboard, auto-fill and open the form
  useEffect(() => {
    if (preselectMonth) {
      setPaymentMonth(preselectMonth);
      setShowAddForm(true);
      if (setPreselectMonth) {
        setPreselectMonth(null);
      }
    } else {
      // Default to current month
      const current = new Date().toISOString().slice(0, 7);
      setPaymentMonth(current);
    }
  }, [preselectMonth]);

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantApartment) {
      setErrorMsg('خطأ: لم يتم ربط حسابك بشقة في النظام بعد. يرجى مراجعة المسؤول.');
      return;
    }
    if (!paymentMonth) {
      setErrorMsg('يرجى تحديد شهر الدفعة.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // We will insert/update the payment with:
      // status: 'unpaid' (retains unpaid until admin verifies it)
      // verification_status: 'pending' (signaling to the admin there is a request)
      // payment_method: chosen method
      await addPayment({
        apartment_id: tenantApartment.id,
        month: paymentMonth,
        amount: amount,
        status: 'unpaid', // Keep unpaid until admin verifies
        payment_method: paymentMethod,
        verification_status: 'pending'
      });

      setSuccessMsg('تم إرسال طلب الدفع بنجاح إلى مسؤول العمارة للتحقق منه.');
      setShowAddForm(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getArabicMonthName = (monthStr: string) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const months = [
      'كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران',
      'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'
    ];
    const index = parseInt(month, 10) - 1;
    return `${months[index]} ${year}`;
  };

  // Get tenant's payments
  const myPayments = tenantApartment 
    ? payments.filter(p => p.apartment_id === tenantApartment.id)
    : [];

  // Sort payments: most recent month first
  const sortedPayments = [...myPayments].sort((a, b) => b.month.localeCompare(a.month));

  const getStatusBadge = (payment: any) => {
    if (payment.status === 'paid') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          مدفوع
        </span>
      );
    }

    if (payment.verification_status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400">
          <Clock className="w-3.5 h-3.5 animate-pulse" />
          قيد التحقق من المسؤول
        </span>
      );
    }

    if (payment.verification_status === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400">
          <Ban className="w-3.5 h-3.5" />
          مرفوض / يرجى إعادة التقديم
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-500">
        <AlertTriangle className="w-3.5 h-3.5" />
        غير مدفوع
      </span>
    );
  };

  const getMethodText = (method?: string | null) => {
    if (!method) return '-';
    return method === 'cash' ? 'كاش (نقدي)' : 'كليك (CliQ) / تحويل بنكي';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">إدارة المدفوعات والاشتراكات</h2>
          <p className="text-white/60">استعرض سجل دفعاتك الشهرية لخدمات العمارة وأرسل إيصالات الدفع الجديدة</p>
        </div>
        
        {tenantApartment && (
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-xl hover:bg-[#D4AF37]/80 transition-colors"
          >
            {showAddForm ? <X className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
            {showAddForm ? 'إلغاء' : 'تسجيل إيصال دفع جديد'}
          </button>
        )}
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center gap-3">
          <Check className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{errorMsg}</p>
        </div>
      )}

      {showAddForm && tenantApartment && (
        <div className="bg-[#161616] p-6 rounded-3xl border border-white/5 shadow-2xl">
          <h3 className="text-lg font-bold text-white mb-4">تقديم إثبات سداد دفعة</h3>
          <form onSubmit={handleSubmitPayment} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">الشهر المستهدف</label>
                <input
                  type="month"
                  value={paymentMonth}
                  onChange={e => setPaymentMonth(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1E1E1E] text-white border border-white/10 rounded-xl focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">قيمة الاشتراك</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-[#1E1E1E] text-white border border-white/10 rounded-xl focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                  />
                  <span className="absolute left-4 top-3 text-white/40">د.أ</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">طريقة التحويل / الدفع</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cliq')}
                  className={`p-4 rounded-xl border text-center font-medium transition-all ${
                    paymentMethod === 'cliq'
                      ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]'
                      : 'bg-[#1E1E1E] border-white/5 text-white/60 hover:border-white/20'
                  }`}
                >
                  كليك (CliQ) / بنك
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-4 rounded-xl border text-center font-medium transition-all ${
                    paymentMethod === 'cash'
                      ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]'
                      : 'bg-[#1E1E1E] border-white/5 text-white/60 hover:border-white/20'
                  }`}
                >
                  كاش (نقدي للمسؤول)
                </button>
              </div>
            </div>

            <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5 text-xs text-white/50 leading-relaxed space-y-1">
              <p className="font-semibold text-white/70">تعليمات هامة:</p>
              {paymentMethod === 'cliq' ? (
                <p>• يرجى تحويل مبلغ 10 دنانير عبر تطبيق كليك إلى الحساب المصرفي المعتمد للعمارة، ثم تقديم هذا الطلب ليقوم مسؤول النظام بمطابقة التحويل وتأكيد الدفعة.</p>
              ) : (
                <p>• عند تسليم المبلغ نقداً لمسؤول الصندوق، يرجى تقديم هذا الطلب هنا لتوثيق تاريخ ووقت التسليم ومطابقته فور استلامه.</p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-[#D4AF37] text-black font-bold rounded-xl hover:bg-[#D4AF37]/80 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'جاري الإرسال...' : 'إرسال الطلب للمسؤول'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payment History List */}
      <div className="bg-[#161616] rounded-3xl border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h3 className="text-lg font-bold text-white">سجل دفعاتي الشهرية</h3>
          <p className="text-white/40 text-sm mt-1">قائمة بجميع الدفعات السابقة والطلبات المعلقة لشقتك</p>
        </div>

        {!tenantApartment ? (
          <div className="text-center py-12 bg-[#161616]">
            <AlertTriangle className="w-12 h-12 text-yellow-500/50 mx-auto mb-4" />
            <p className="text-white/80">لم يتم تعيين رقم شقة لحسابك بعد.</p>
            <p className="text-white/40 text-sm mt-1">يرجى التواصل مع مسؤول النظام لربط حسابك وتفعيل لوحة المدفوعات.</p>
          </div>
        ) : sortedPayments.length === 0 ? (
          <div className="text-center py-12 bg-[#161616]">
            <Wallet className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">لا يوجد أي دفعات مسجلة لشقتك حتى الآن.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-white/[0.02] border-b border-white/5 text-white/60 text-sm">
                <tr>
                  <th className="px-6 py-4 font-medium">الشهر</th>
                  <th className="px-6 py-4 font-medium">قيمة الاشتراك</th>
                  <th className="px-6 py-4 font-medium">طريقة الدفع</th>
                  <th className="px-6 py-4 font-medium">تاريخ الدفع/التقديم</th>
                  <th className="px-6 py-4 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedPayments.map(payment => (
                  <tr key={payment.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-semibold text-white">
                        {getArabicMonthName(payment.month)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#D4AF37] font-semibold">
                      {payment.amount} د.أ
                    </td>
                    <td className="px-6 py-4 text-white/80 text-sm">
                      {getMethodText(payment.payment_method)}
                    </td>
                    <td className="px-6 py-4 text-white/40 text-sm">
                      {payment.date_paid 
                        ? new Date(payment.date_paid).toLocaleDateString('ar-JO') 
                        : payment.created_at 
                          ? new Date(payment.created_at).toLocaleDateString('ar-JO')
                          : '-'
                      }
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(payment)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
