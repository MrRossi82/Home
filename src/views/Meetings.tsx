import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Calendar, Clock, Plus, CheckCircle2, FileText, AlertCircle, CalendarClock, Ban, UserIcon, Edit2, X, Star } from 'lucide-react';

export const Meetings: React.FC = () => {
  const { currentUser, meetings, meetingEvaluations, addMeeting, updateMeeting, evaluateMeeting, users } = useAppContext();
  const isAdmin = currentUser?.role === 'admin';

  const [showAddForm, setShowAddForm] = useState(false);
  const [newMeeting, setNewMeeting] = useState({ title: '', description: '', date: '', time: '' });
  
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [minutesText, setMinutesText] = useState('');
  
  const [showEvalForm, setShowEvalForm] = useState<string | null>(null);
  const [evalData, setEvalData] = useState({ status: 'approved' as const, reason: '', rating: 5 });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeeting.title || !newMeeting.date || !newMeeting.time) return;
    
    // Create timestamp
    const scheduled_at = new Date(`${newMeeting.date}T${newMeeting.time}`).toISOString();
    
    await addMeeting({
      title: newMeeting.title,
      description: newMeeting.description,
      scheduled_at,
      status: 'scheduled'
    });
    
    setShowAddForm(false);
    setNewMeeting({ title: '', description: '', date: '', time: '' });
    
    // In a real app, here we would trigger an email reminder creation (e.g. via a server API endpoint).
    // For now, it will be handled by the backend periodically checking or using an API.
    // fetch('/api/meetings/schedule-reminder', { ... })
  };

  const handleStatusChange = async (meetingId: string, status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled') => {
    await updateMeeting(meetingId, { status });
  };

  const handleSaveMinutes = async (meetingId: string) => {
    await updateMeeting(meetingId, { minutes: minutesText });
    setSelectedMeetingId(null);
    setMinutesText('');
  };

  const handleEvaluate = async (e: React.FormEvent, meetingId: string) => {
    e.preventDefault();
    if (!currentUser) return;
    
    await evaluateMeeting({
      meeting_id: meetingId,
      tenant_id: currentUser.id,
      status: evalData.status,
      reason: evalData.reason,
      rating: evalData.rating
    });
    
    setShowEvalForm(null);
    setEvalData({ status: 'approved', reason: '', rating: 5 });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled': return <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-xs flex items-center gap-1"><CalendarClock className="w-3 h-3" /> مجدول</span>;
      case 'in_progress': return <span className="bg-[#D4AF37]/10 text-[#D4AF37] px-3 py-1 rounded-full text-xs flex items-center gap-1"><Clock className="w-3 h-3 animate-pulse" /> جاري الآن</span>;
      case 'completed': return <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> مكتمل</span>;
      case 'cancelled': return <span className="bg-red-500/10 text-red-400 px-3 py-1 rounded-full text-xs flex items-center gap-1"><Ban className="w-3 h-3" /> ملغى</span>;
      default: return null;
    }
  };

  const getEvalBadge = (status: string) => {
    switch (status) {
      case 'approved': return <span className="text-green-400">موافق</span>;
      case 'rejected': return <span className="text-red-400">مرفوض</span>;
      case 'conditional': return <span className="text-yellow-400">موافق بشروط</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">الاجتماعات الدورية</h2>
          <p className="text-white/60">إدارة اجتماعات العمارة ومحاضر الجلسات</p>
        </div>
        
        {isAdmin && (
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-xl hover:bg-[#D4AF37]/80 transition-colors"
          >
            {showAddForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            {showAddForm ? 'إلغاء' : 'إضافة اجتماع جديد'}
          </button>
        )}
      </div>

      {isAdmin && showAddForm && (
        <div className="bg-[#161616] p-6 rounded-3xl border border-white/5">
          <h3 className="text-lg font-bold text-white mb-4">تفاصيل الاجتماع الجديد</h3>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">عنوان الاجتماع</label>
              <input
                type="text"
                value={newMeeting.title}
                onChange={e => setNewMeeting({...newMeeting, title: e.target.value})}
                className="w-full px-4 py-3 bg-[#1E1E1E] text-white border border-white/10 rounded-xl focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                placeholder="مثال: اجتماع سكان العمارة الشهري"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">الوصف أو الأجندة</label>
              <textarea
                value={newMeeting.description}
                onChange={e => setNewMeeting({...newMeeting, description: e.target.value})}
                className="w-full px-4 py-3 bg-[#1E1E1E] text-white border border-white/10 rounded-xl focus:ring-[#D4AF37] focus:border-[#D4AF37] min-h-[100px]"
                placeholder="النقاط التي سيتم مناقشتها..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">تاريخ الاجتماع</label>
                <input
                  type="date"
                  value={newMeeting.date}
                  onChange={e => setNewMeeting({...newMeeting, date: e.target.value})}
                  className="w-full px-4 py-3 bg-[#1E1E1E] text-white border border-white/10 rounded-xl focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">وقت الاجتماع</label>
                <input
                  type="time"
                  value={newMeeting.time}
                  onChange={e => setNewMeeting({...newMeeting, time: e.target.value})}
                  className="w-full px-4 py-3 bg-[#1E1E1E] text-white border border-white/10 rounded-xl focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                className="px-6 py-3 bg-[#D4AF37] text-black font-bold rounded-xl hover:bg-[#D4AF37]/80 transition-colors"
              >
                حفظ وجدولة الاجتماع
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {meetings.length === 0 ? (
          <div className="text-center py-12 bg-[#161616] rounded-3xl border border-white/5">
            <Calendar className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">لا توجد اجتماعات مسجلة</p>
          </div>
        ) : (
          meetings.map(meeting => {
            const meetingEvals = meetingEvaluations.filter(e => e.meeting_id === meeting.id);
            const ratedEvals = meetingEvals.filter(e => e.rating != null);
            const averageRating = ratedEvals.length > 0 
              ? (ratedEvals.reduce((acc, e) => acc + (e.rating || 0), 0) / ratedEvals.length).toFixed(1)
              : null;
            const userEval = meetingEvals.find(e => e.tenant_id === currentUser?.id);
            const scheduledDate = new Date(meeting.scheduled_at);
            
            return (
              <div key={meeting.id} className="bg-[#161616] rounded-3xl border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5">
                  <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">{meeting.title}</h3>
                        {getStatusBadge(meeting.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-white/40">
                        <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {scheduledDate.toLocaleDateString('ar-JO')}</span>
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {scheduledDate.toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    
                    {isAdmin && (
                      <div className="flex flex-wrap gap-2">
                        {meeting.status === 'scheduled' && (
                          <button onClick={() => handleStatusChange(meeting.id, 'in_progress')} className="px-3 py-1.5 bg-[#D4AF37]/10 text-[#D4AF37] rounded-lg text-sm hover:bg-[#D4AF37]/20 transition-colors">
                            بدء الاجتماع
                          </button>
                        )}
                        {meeting.status === 'in_progress' && (
                          <button onClick={() => handleStatusChange(meeting.id, 'completed')} className="px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-sm hover:bg-green-500/20 transition-colors">
                            إنهاء الاجتماع
                          </button>
                        )}
                        {meeting.status !== 'completed' && meeting.status !== 'cancelled' && (
                          <button onClick={() => handleStatusChange(meeting.id, 'cancelled')} className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-sm hover:bg-red-500/20 transition-colors">
                            إلغاء
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {meeting.description && (
                    <div className="mt-4 p-4 bg-white/5 rounded-xl">
                      <h4 className="text-sm font-medium text-white/60 mb-2">الأجندة / الوصف:</h4>
                      <p className="text-white/80 whitespace-pre-wrap text-sm leading-relaxed">{meeting.description}</p>
                    </div>
                  )}
                </div>

                {/* Meeting Minutes Section */}
                {(meeting.status === 'completed' || meeting.minutes) && (
                  <div className="p-6 bg-white/[0.02]">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-bold text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[#D4AF37]" />
                        محضر الجلسة
                      </h4>
                      {isAdmin && selectedMeetingId !== meeting.id && (
                        <button 
                          onClick={() => {
                            setSelectedMeetingId(meeting.id);
                            setMinutesText(meeting.minutes || '');
                          }}
                          className="flex items-center gap-2 text-sm text-[#D4AF37] hover:underline"
                        >
                          <Edit2 className="w-4 h-4" />
                          {meeting.minutes ? 'تعديل المحضر' : 'إضافة محضر'}
                        </button>
                      )}
                    </div>

                    {selectedMeetingId === meeting.id ? (
                      <div className="space-y-4">
                        <textarea
                          value={minutesText}
                          onChange={e => setMinutesText(e.target.value)}
                          className="w-full px-4 py-3 bg-[#1E1E1E] text-white border border-white/10 rounded-xl focus:ring-[#D4AF37] focus:border-[#D4AF37] min-h-[150px]"
                          placeholder="اكتب النقاط التي تم الاتفاق عليها هنا..."
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setSelectedMeetingId(null)} className="px-4 py-2 text-white/60 hover:text-white transition-colors">إلغاء</button>
                          <button onClick={() => handleSaveMinutes(meeting.id)} className="px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-xl hover:bg-[#D4AF37]/80 transition-colors">حفظ المحضر</button>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-6">
                        {meeting.minutes ? (
                          <div className="prose prose-invert max-w-none text-white/80 text-sm whitespace-pre-wrap leading-relaxed bg-[#1E1E1E] p-5 rounded-xl border border-white/5">
                            {meeting.minutes}
                          </div>
                        ) : (
                          <p className="text-white/40 text-sm italic">لم يتم كتابة المحضر بعد.</p>
                        )}
                      </div>
                    )}

                    {/* Evaluations Section */}
                    {meeting.minutes && (
                      <div className="mt-8 border-t border-white/5 pt-6">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <h5 className="font-bold text-white">تقييمات وموافقات السكان</h5>
                            {averageRating && (
                              <div className="flex items-center gap-1 px-2.5 py-1 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 rounded-xl text-xs font-semibold">
                                <Star className="w-3.5 h-3.5 fill-[#D4AF37]" />
                                <span>معدل الفاعلية: {averageRating} / 5</span>
                              </div>
                            )}
                          </div>
                          {!isAdmin && showEvalForm !== meeting.id && (
                            <button 
                              onClick={() => {
                                setShowEvalForm(meeting.id);
                                setEvalData({ status: userEval?.status || 'approved', reason: userEval?.reason || '', rating: userEval?.rating || 5 });
                              }}
                              className="px-4 py-2 bg-white/10 text-white text-sm rounded-lg hover:bg-white/20 transition-colors"
                            >
                              {userEval ? 'تعديل التقييم' : 'إضافة تقييم'}
                            </button>
                          )}
                        </div>

                        {showEvalForm === meeting.id && (
                          <form onSubmit={(e) => handleEvaluate(e, meeting.id)} className="mb-6 bg-[#1E1E1E] p-4 rounded-xl border border-white/10">
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-white/80 mb-2">رأيك في المحضر</label>
                              <div className="flex flex-wrap gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="radio" checked={evalData.status === 'approved'} onChange={() => setEvalData({...evalData, status: 'approved'})} className="text-[#D4AF37] focus:ring-[#D4AF37] bg-white/5 border-white/10" />
                                  <span className="text-white">موافق</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="radio" checked={evalData.status === 'conditional'} onChange={() => setEvalData({...evalData, status: 'conditional'})} className="text-[#D4AF37] focus:ring-[#D4AF37] bg-white/5 border-white/10" />
                                  <span className="text-white">موافق بشروط</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="radio" checked={evalData.status === 'rejected'} onChange={() => setEvalData({...evalData, status: 'rejected'})} className="text-[#D4AF37] focus:ring-[#D4AF37] bg-white/5 border-white/10" />
                                  <span className="text-white">غير موافق</span>
                                </label>
                              </div>
                            </div>

                            <div className="mb-4">
                              <label className="block text-sm font-medium text-white/80 mb-2">تقييم فاعلية الاجتماع وإدارته</label>
                              <div className="flex items-center gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => setEvalData({ ...evalData, rating: star })}
                                    className="p-1 hover:scale-110 transition-transform"
                                  >
                                    <Star
                                      className={`w-6 h-6 ${
                                        star <= (evalData.rating || 5)
                                          ? 'text-[#D4AF37] fill-[#D4AF37]'
                                          : 'text-white/20'
                                      }`}
                                    />
                                  </button>
                                ))}
                                <span className="text-xs text-white/50 mr-2">
                                  ({evalData.rating || 5} من 5 نجوم)
                                </span>
                              </div>
                            </div>
                            
                            {(evalData.status === 'conditional' || evalData.status === 'rejected') && (
                              <div className="mb-4">
                                <label className="block text-sm font-medium text-white/80 mb-2">السبب / الشروط</label>
                                <textarea
                                  value={evalData.reason}
                                  onChange={e => setEvalData({...evalData, reason: e.target.value})}
                                  className="w-full px-4 py-3 bg-[#161616] text-white border border-white/10 rounded-xl focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                                  placeholder="يرجى توضيح سبب الرفض أو الشروط..."
                                  required
                                />
                              </div>
                            )}

                            <div className="flex justify-end gap-2 mt-4">
                              <button type="button" onClick={() => setShowEvalForm(null)} className="px-4 py-2 text-white/60 hover:text-white transition-colors text-sm">إلغاء</button>
                              <button type="submit" className="px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#D4AF37]/80 transition-colors text-sm">حفظ التقييم</button>
                            </div>
                          </form>
                        )}

                        {meetingEvals.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {meetingEvals.map(evaluation => {
                              const tenant = users.find(u => u.id === evaluation.tenant_id);
                              return (
                                <div key={evaluation.id} className="bg-[#1E1E1E] p-4 rounded-xl border border-white/5">
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#D4AF37]">
                                        <UserIcon className="w-4 h-4" />
                                      </div>
                                      <span className="text-sm font-medium text-white">{tenant?.name || 'مستخدم غير معروف'}</span>
                                    </div>
                                    <div className="text-xs font-bold px-2 py-1 bg-white/5 rounded-md">
                                      {getEvalBadge(evaluation.status)}
                                    </div>
                                  </div>
                                  {evaluation.rating && (
                                    <div className="flex items-center gap-0.5 mt-2 mb-1" title={`تقييم: ${evaluation.rating} من 5`}>
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                          key={star}
                                          className={`w-3.5 h-3.5 ${
                                            star <= evaluation.rating!
                                              ? 'text-[#D4AF37] fill-[#D4AF37]'
                                              : 'text-white/10'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                  )}
                                  {evaluation.reason && (
                                    <div className="mt-2 text-xs text-white/60 bg-[#161616] p-2 rounded-lg border border-white/5 whitespace-pre-wrap">
                                      {evaluation.reason}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-white/40 text-sm">لا توجد تقييمات حتى الآن.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
