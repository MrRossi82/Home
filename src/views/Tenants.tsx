import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Phone, Home, User, Plus, Eye, X, Wallet, AlertTriangle, CheckCircle2, Clock, Ban, Calendar, Wrench, ShieldAlert } from 'lucide-react';
import { Apartment, parseIssueDescription } from '../types';

export const Tenants: React.FC = () => {
  const { apartments, users, currentUser, payments, issues } = useAppContext();
  const isAdmin = currentUser?.role === 'admin';
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', phone: '', apartmentNumber: '', floor: '', role: 'tenant' });
  const [loading, setLoading] = useState(false);

  // حالات نافذة التفاصيل الجديدة
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
  const [modalTab, setModalTab] = useState<'payments' | 'issues'>('payments');

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add user');
      }
      alert('تم إضافة المستخدم بنجاح. الرجاء تحديث الصفحة.');
      setShowAddForm(false);
      setNewUser({ name: '', email: '', password: '', phone: '', apartmentNumber: '', floor: '', role: 'tenant' });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // جلب الاشتراكات الخاصة بالشقة
  const getApartmentPayments = (aptId: string) => {
    return payments
      .filter(p => p.apartment_id === aptId)
      .sort((a, b) => b.month.localeCompare(a.month)); // الأحدث أولاً
  };

  // جلب الشكاوى وطلبات الصيانة الخاصة بالشقة
  const getApartmentIssues = (aptId: string, tenantId?: string | null) => {
    return issues.filter(i => 
      i.apartment_id === aptId || 
      (tenantId && i.reported_by === tenantId)
    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">الشقق والوحدات السكنية</h2>
          <p className="text-white/40 mt-1">تتبع السكان والوحدات، ومتابعة الاشتراكات والشكاوى الخاصة بكل شقة</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center px-4 py-2 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#D4AF37]/80 transition-colors"
          >
            <Plus className="w-5 h-5 ml-2" />
            إضافة مستخدم
          </button>
        )}
      </div>

      {showAddForm && isAdmin && (
        <div className="bg-[#161616] rounded-3xl p-6 border border-white/5">
          <h3 className="text-lg font-semibold text-white mb-4">إضافة مستخدم جديد</h3>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <input type="text" placeholder="الاسم الكامل" required value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="px-4 py-2 bg-[#1E1E1E] text-white border border-white/10 rounded-lg focus:ring-[#D4AF37] focus:border-[#D4AF37]" />
              <input type="email" placeholder="البريد الإلكتروني" required value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="px-4 py-2 bg-[#1E1E1E] text-white border border-white/10 rounded-lg focus:ring-[#D4AF37] focus:border-[#D4AF37]" />
              <input type="password" placeholder="كلمة المرور" required value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="px-4 py-2 bg-[#1E1E1E] text-white border border-white/10 rounded-lg focus:ring-[#D4AF37] focus:border-[#D4AF37]" />
              <input type="tel" placeholder="رقم الهاتف" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} className="px-4 py-2 bg-[#1E1E1E] text-white border border-white/10 rounded-lg focus:ring-[#D4AF37] focus:border-[#D4AF37]" />
              <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="px-4 py-2 bg-[#1E1E1E] text-white border border-white/10 rounded-lg focus:ring-[#D4AF37] focus:border-[#D4AF37]">
                <option value="tenant">ساكن</option>
                <option value="admin">مسؤول</option>
              </select>
              {newUser.role === 'tenant' && (
                <>
                  <input type="text" placeholder="رقم الشقة" required value={newUser.apartmentNumber} onChange={e => setNewUser({...newUser, apartmentNumber: e.target.value})} className="px-4 py-2 bg-[#1E1E1E] text-white border border-white/10 rounded-lg focus:ring-[#D4AF37] focus:border-[#D4AF37]" />
                  <input type="text" placeholder="الطابق" value={newUser.floor} onChange={e => setNewUser({...newUser, floor: e.target.value})} className="px-4 py-2 bg-[#1E1E1E] text-white border border-white/10 rounded-lg focus:ring-[#D4AF37] focus:border-[#D4AF37]" />
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button type="button" onClick={() => setShowAddForm(false)} className="px-5 py-2 text-white/60 hover:bg-white/5 rounded-lg font-medium">إلغاء</button>
              <button type="submit" disabled={loading} className="px-5 py-2 bg-[#D4AF37] text-black rounded-lg font-bold disabled:opacity-50">{loading ? 'جاري الإضافة...' : 'حفظ المستخدم'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {apartments.map(apt => {
          const tenant = users.find(u => u.id === apt.tenant_id);

          return (
            <div key={apt.id} className="bg-[#161616] rounded-3xl border border-white/5 p-6 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-2 h-full bg-[#D4AF37]"></div>
              
              <div>
                <div className="flex items-center gap-3 mb-4">
                  {tenant?.avatar_url ? (
                    <img src={tenant.avatar_url} alt={tenant.name} className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                  ) : (
                    <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center text-[#D4AF37]">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-white/40 font-medium">الوحدة {apt.number}</p>
                    <h3 className="text-xl font-bold text-white">{tenant ? tenant.name : 'شاغرة'}</h3>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                  {tenant ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-white/80">
                        <div className="flex items-center gap-3">
                          <Home className="w-4 h-4 text-[#D4AF37]" />
                          <span className="text-sm">الطابق: {apt.floor || 'غير محدد'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-white/80">
                        <Phone className="w-4 h-4 text-[#D4AF37]" />
                        <span className="text-sm" dir="ltr">{tenant.phone}</span>
                        <a 
                          href={`https://wa.me/${tenant.phone.replace(/^0/, '962').replace(/[^0-9]/g, '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-emerald-500 hover:text-emerald-400"
                        >
                          واتساب
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="py-2 flex items-center justify-center text-white/30 bg-white/[0.02] rounded-xl border border-white/10 border-dashed">
                      شاغرة
                    </div>
                  )}
                </div>
              </div>

              {tenant && (
                <div className="mt-5 pt-4 border-t border-white/5">
                  <button
                    onClick={() => {
                      setSelectedApartment(apt);
                      setModalTab('payments');
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-[#D4AF37] hover:text-[#e5c158] font-bold rounded-xl text-xs border border-white/5 hover:border-[#D4AF37]/20 transition-all"
                  >
                    <Eye className="w-4 h-4" />
                    تفاصيل الاشتراكات والشكاوى
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal تفاصيل الشقة والساكن الجديد */}
      {selectedApartment && (() => {
        const tenant = users.find(u => u.id === selectedApartment.tenant_id);
        const aptPayments = getApartmentPayments(selectedApartment.id);
        const aptIssues = getApartmentIssues(selectedApartment.id, selectedApartment.tenant_id);

        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#161616] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-200 text-right">
              
              {/* Header */}
              <div className="p-6 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#D4AF37]/10 text-[#D4AF37] rounded-2xl flex items-center justify-center">
                    <Home className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">تفاصيل الشقة {selectedApartment.number}</h3>
                    <p className="text-xs text-white/50">الساكن: {tenant?.name || 'غير محدد'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedApartment(null)}
                  className="p-2 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tenant brief info bar */}
              {tenant && (
                <div className="px-6 py-4 bg-white/[0.02] border-b border-white/5 flex flex-wrap gap-4 items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-2 text-white/70">
                    <Phone className="w-4 h-4 text-[#D4AF37]" />
                    <span dir="ltr">{tenant.phone || 'بدون هاتف'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/70">
                    <Calendar className="w-4 h-4 text-[#D4AF37]" />
                    <span>الطابق: {selectedApartment.floor || 'غير محدد'}</span>
                  </div>
                </div>
              )}

              {/* Subtab Selectors */}
              <div className="flex border-b border-white/5 bg-black/20">
                <button
                  onClick={() => setModalTab('payments')}
                  className={`flex-1 py-4 text-center font-bold text-sm transition-all flex items-center justify-center gap-2 border-b-2 ${
                    modalTab === 'payments' 
                      ? 'border-[#D4AF37] text-[#D4AF37] bg-white/[0.02]' 
                      : 'border-transparent text-white/40 hover:text-white'
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                  سجل الاشتراكات والمدفوعات ({aptPayments.length})
                </button>
                <button
                  onClick={() => setModalTab('issues')}
                  className={`flex-1 py-4 text-center font-bold text-sm transition-all flex items-center justify-center gap-2 border-b-2 ${
                    modalTab === 'issues' 
                      ? 'border-[#D4AF37] text-[#D4AF37] bg-white/[0.02]' 
                      : 'border-transparent text-white/40 hover:text-white'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  الشكاوى وطلبات الصيانة ({aptIssues.length})
                </button>
              </div>

              {/* Modal Body Scroll Container */}
              <div className="p-6 max-h-[350px] overflow-y-auto space-y-4">
                
                {/* 1. Payments List */}
                {modalTab === 'payments' && (
                  <div className="space-y-3">
                    {aptPayments.map((p) => {
                      const isPaid = p.status === 'paid';
                      const isPending = p.verification_status === 'pending';
                      const isRejected = p.verification_status === 'rejected';

                      return (
                        <div key={p.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-white/10 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl flex items-center justify-center font-mono text-xs font-bold">
                              {p.month.split('-')[1]}/{p.month.split('-')[0]}
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-sm">اشتراك شهر {p.month}</h4>
                              <p className="text-xs text-white/40 mt-0.5">
                                المبلغ: <span className="text-[#D4AF37] font-semibold">{p.amount} د.أ</span>
                                {p.payment_method && ` | طريقة الدفع: ${p.payment_method === 'cash' ? 'نقدي' : 'كليك'}`}
                              </p>
                            </div>
                          </div>

                          <div className="self-end sm:self-auto">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-extrabold rounded-lg">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                مدفوع ومؤكد
                              </span>
                            ) : isPending ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-extrabold rounded-lg animate-pulse">
                                <Clock className="w-3.5 h-3.5" />
                                قيد التحقق
                              </span>
                            ) : isRejected ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-extrabold rounded-lg">
                                <Ban className="w-3.5 h-3.5" />
                                مرفوض
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/5 text-white/40 border border-white/5 text-xs font-bold rounded-lg">
                                <Clock className="w-3.5 h-3.5" />
                                غير مدفوع
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {aptPayments.length === 0 && (
                      <div className="text-center py-8 text-white/30 italic text-sm">
                        لا يوجد أي دفعات أو اشتراكات مسجلة لهذه الشقة حالياً.
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Issues List */}
                {modalTab === 'issues' && (
                  <div className="space-y-3">
                    {aptIssues.map((issue) => {
                      const isResolved = issue.status === 'resolved';
                      const isInProgress = issue.status === 'in_progress';

                      return (
                        <div key={issue.id} className="bg-[#1E1E1E] border border-white/5 rounded-2xl p-4 space-y-2 hover:border-white/10 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <h4 className="font-bold text-white text-sm leading-snug">{issue.title}</h4>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase shrink-0 ${
                              isResolved 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : isInProgress 
                                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                                  : 'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}>
                              {isResolved ? 'تم الحل' : isInProgress ? 'قيد العمل' : 'مفتوح ومستلم'}
                            </span>
                          </div>

                          <p className="text-xs text-white/50 leading-relaxed line-clamp-2">{parseIssueDescription(issue.description).cleanDescription}</p>
                          
                          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] text-white/40 font-medium">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[#D4AF37]" />
                              {new Date(issue.created_at).toLocaleDateString('ar-JO')}
                            </span>
                            <span className={`flex items-center gap-1 font-bold ${
                              issue.priority === 'high' ? 'text-red-400' : issue.priority === 'medium' ? 'text-amber-400' : 'text-blue-400'
                            }`}>
                              <ShieldAlert className="w-3 h-3" />
                              أولوية {issue.priority === 'high' ? 'عالية' : issue.priority === 'medium' ? 'متوسطة' : 'عادية'}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {aptIssues.length === 0 && (
                      <div className="text-center py-8 text-white/30 italic text-sm">
                        لا توجد أي شكاوى أو طلبات صيانة مسجلة لهذه الشقة.
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Close Button Footer */}
              <div className="p-4 border-t border-white/5 bg-black/20 flex justify-end">
                <button
                  onClick={() => setSelectedApartment(null)}
                  className="px-6 py-2 bg-white text-black font-extrabold rounded-xl text-xs hover:bg-white/90 transition-colors"
                >
                  إغلاق النافذة
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
};

