import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { parseIssueDescription, serializeIssueDescription, IssueNote } from '../types';
import { AlertTriangle, MessageSquare, Paperclip, CheckCircle2, Clock, UserIcon, ShieldAlert, Trash2, Send, MessageCircle, Wrench, ChevronDown, ChevronUp, X } from 'lucide-react';

interface IssuesProps {
  preselectAdd?: boolean;
  setPreselectAdd?: (add: boolean) => void;
}

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

export const Issues: React.FC<IssuesProps> = ({ preselectAdd, setPreselectAdd }) => {
  const { currentUser, issues, addIssue, updateIssue, apartments, users, lookups } = useAppContext();
  const isAdmin = currentUser?.role === 'admin';

  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  // States for notes and status changes

  // States for notes and status changes
  const [statusChangingIssue, setStatusChangingIssue] = useState<{ issueId: string; nextStatus: 'open' | 'in_progress' | 'resolved' } | null>(null);
  const [statusNoteText, setStatusNoteText] = useState('');
  const [statusCommunicatedParty, setStatusCommunicatedParty] = useState('');

  const [activeAddingNoteIssueId, setActiveAddingNoteIssueId] = useState<string | null>(null);
  const [generalNoteText, setGeneralNoteText] = useState('');
  const [generalCommunicatedParty, setGeneralCommunicatedParty] = useState('');

  const [expandedNotesIssueIds, setExpandedNotesIssueIds] = useState<Record<string, boolean>>({});

  const toggleNotesExpanded = (issueId: string) => {
    setExpandedNotesIssueIds(prev => ({
      ...prev,
      [issueId]: !prev[issueId]
    }));
  };

  const handleConfirmStatusChange = async () => {
    if (!statusChangingIssue) return;
    const { issueId, nextStatus } = statusChangingIssue;
    if (!statusNoteText.trim()) return;

    const targetIssue = issues.find(i => i.id === issueId);
    if (!targetIssue) return;

    const { cleanDescription, notes } = parseIssueDescription(targetIssue.description);

    const statusLabels: Record<string, string> = {
      open: 'مفتوح',
      in_progress: 'قيد العمل',
      resolved: 'مغلق / تم الحل'
    };

    const newNote: IssueNote = {
      id: Math.random().toString(36).substring(2, 11),
      author_name: currentUser?.name || 'مدير النظام',
      author_role: currentUser?.role || 'admin',
      text: statusNoteText,
      created_at: new Date().toISOString(),
      status_change: `${targetIssue.status} -> ${nextStatus}`,
      communicated_party: statusCommunicatedParty || undefined
    };

    const updatedNotes = [...notes, newNote];
    const newDescription = serializeIssueDescription(cleanDescription, updatedNotes);

    await updateIssue(issueId, {
      status: nextStatus,
      description: newDescription,
      resolved_at: nextStatus === 'resolved' ? new Date().toISOString() : undefined
    });

    // Reset status changing state
    setStatusChangingIssue(null);
    setStatusNoteText('');
    setStatusCommunicatedParty('');
  };

  const handleAddGeneralNote = async (issueId: string) => {
    if (!generalNoteText.trim()) return;
    const targetIssue = issues.find(i => i.id === issueId);
    if (!targetIssue) return;

    const { cleanDescription, notes } = parseIssueDescription(targetIssue.description);

    const newNote: IssueNote = {
      id: Math.random().toString(36).substring(2, 11),
      author_name: currentUser?.name || 'مستخدم',
      author_role: currentUser?.role || 'tenant',
      text: generalNoteText,
      created_at: new Date().toISOString(),
      communicated_party: generalCommunicatedParty || undefined
    };

    const updatedNotes = [...notes, newNote];
    const newDescription = serializeIssueDescription(cleanDescription, updatedNotes);

    await updateIssue(issueId, {
      description: newDescription
    });

    setGeneralNoteText('');
    setGeneralCommunicatedParty('');
    setActiveAddingNoteIssueId(null);
  };

  useEffect(() => {
    if (preselectAdd) {
      setShowAddForm(true);
      if (setPreselectAdd) {
        setPreselectAdd(false);
      }
    }
  }, [preselectAdd, setPreselectAdd]);

  const [newIssue, setNewIssue] = useState(() => ({
    title: '',
    description: '',
    type: 'maintenance' as 'maintenance' | 'complaint',
    is_anonymous: false,
    priority: 'low' as 'low' | 'medium' | 'high'
  }));

  const displayIssues = isAdmin 
    ? issues 
    : issues.filter(i => i.apartment_id === apartments.find(a => a.tenant_id === currentUser?.id)?.id || (i.reported_by === currentUser?.id));

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      setSelectedImages(prev => [...prev, ...files]);
      
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const uploadedUrls: string[] = [];
      
      // Upload images if any are selected
      if (supabase && selectedImages.length > 0) {
        for (const image of selectedImages) {
          const fileExt = image.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `issues/${fileName}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(filePath, image);
            
          if (uploadError) {
            console.error('Error uploading image:', uploadError);
            continue;
          }
          
          if (uploadData) {
            const { data: publicUrlData } = supabase.storage.from('attachments').getPublicUrl(filePath);
            uploadedUrls.push(publicUrlData.publicUrl);
          }
        }
      }

      const typeLookup = lookups.find(l => l.category === 'issue_type' && l.value === newIssue.type);
      
      // Destructure to remove the 'type' field which is not in the DB schema
      const { type, ...issueData } = newIssue;
      
      const finalTitle = newIssue.title.trim() || (newIssue.type === 'maintenance' ? 'طلب صيانة جديد' : 'شكوى جديدة');

      await addIssue({
        ...issueData,
        title: finalTitle,
        type_id: typeLookup?.id,
        apartment_id: newIssue.is_anonymous ? null : apartments.find(a => a.tenant_id === currentUser?.id)?.id || null,
        reported_by: newIssue.is_anonymous ? null : currentUser!.id,
        attachments: uploadedUrls
      });

      setShowAddForm(false);
      setNewIssue({ 
        title: '', 
        description: '', 
        type: 'maintenance', 
        is_anonymous: false, 
        priority: 'low' 
      });
      setSelectedImages([]);
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
      setImagePreviews([]);
    } catch (err) {
      console.error('Failed to submit issue:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      default: return 'text-white/40 bg-white/10 border-white/5';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'عالية جداً';
      case 'medium': return 'متوسطة';
      default: return 'عادية';
    }
  };

  return (
    <div className="space-y-6" id="issues-container">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" id="issues-header">
        <div>
          <h2 className="text-2xl font-bold text-white">الشكاوى وطلبات الصيانة</h2>
          <p className="text-white/40 mt-1">متابعة ومعالجة المشاكل في العمارة</p>
        </div>
        {!isAdmin && (
          <button 
            id="add-issue-btn"
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-[#D4AF37] text-black px-5 py-2.5 rounded-xl font-bold hover:bg-[#D4AF37]/80 transition-colors border border-white/10 cursor-pointer"
          >
            تقديم طلب جديد
          </button>
        )}
      </div>

      {showAddForm && !isAdmin && (
        <div className="bg-[#161616] rounded-3xl p-6 border border-white/5" id="add-issue-form-container">
          <h3 className="text-lg font-semibold text-white mb-4">نموذج طلب جديد</h3>
          <form onSubmit={handleAddSubmit} className="space-y-4" id="add-issue-form">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">نوع الطلب</label>
                <select 
                  id="issue-type-select"
                  value={newIssue.type}
                  onChange={(e) => setNewIssue({...newIssue, type: e.target.value as any})}
                  className="w-full px-4 py-2 bg-[#1E1E1E] text-white border border-white/10 rounded-lg focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                >
                  <option value="maintenance">طلب صيانة</option>
                  <option value="complaint">شكوى</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">الأولوية</label>
                <select 
                  id="issue-priority-select"
                  value={newIssue.priority}
                  onChange={(e) => setNewIssue({...newIssue, priority: e.target.value as any})}
                  className="w-full px-4 py-2 bg-[#1E1E1E] text-white border border-white/10 rounded-lg focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                >
                  <option value="low">عادية</option>
                  <option value="medium">متوسطة</option>
                  <option value="high">عالية جداً</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">عنوان الطلب</label>
              <input 
                id="issue-title-input"
                type="text" required
                value={newIssue.title}
                onChange={(e) => setNewIssue({...newIssue, title: e.target.value})}
                className="w-full px-4 py-2 bg-[#1E1E1E] text-white border border-white/10 rounded-lg focus:ring-[#D4AF37] focus:border-[#D4AF37] font-sans"
                placeholder="مثال: تسريب مياه في الحمام، عطل في المصعد، إلخ..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">التفاصيل</label>
              <textarea 
                id="issue-description-input"
                required rows={3}
                value={newIssue.description}
                onChange={(e) => setNewIssue({...newIssue, description: e.target.value})}
                className="w-full px-4 py-2 bg-[#1E1E1E] text-white border border-white/10 rounded-lg focus:ring-[#D4AF37] focus:border-[#D4AF37] resize-none"
                placeholder="يرجى وصف المشكلة بالتفصيل..."
              ></textarea>
            </div>

            <div className="flex flex-col gap-4 pt-2">
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    id="issue-anonymous-checkbox"
                    type="checkbox" 
                    checked={newIssue.is_anonymous}
                    onChange={(e) => {
                      const isAnon = e.target.checked;
                      setNewIssue(prev => ({
                        ...prev,
                        is_anonymous: isAnon
                      }));
                    }}
                    className="w-4 h-4 text-[#D4AF37] border-white/10 rounded focus:ring-[#D4AF37] bg-white/5"
                  />
                  <span className="text-sm text-white/80 flex items-center gap-1">
                    <ShieldAlert className="w-4 h-4 text-white/40" /> تقديم كمجهول (للسرية)
                  </span>
                </label>

                <button 
                  id="issue-attach-btn"
                  type="button" 
                  onClick={() => document.getElementById('issue-image-upload')?.click()}
                  className="text-sm text-[#D4AF37] flex items-center gap-1 hover:text-[#D4AF37]/80 cursor-pointer font-bold"
                >
                  <Paperclip className="w-4 h-4" /> إضافة صور
                </button>
                <input 
                  id="issue-image-upload"
                  type="file" 
                  accept="image/*" 
                  multiple 
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              {/* Previews of selected images */}
              {imagePreviews.length > 0 && (
                <div className="flex flex-wrap gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl" id="image-previews-container">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/10 group">
                      <img 
                        src={preview} 
                        alt="Preview" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                      />
                      <button 
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full transition-colors cursor-pointer"
                        title="حذف الصورة"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-white/5">
              <button 
                id="issue-cancel-btn"
                type="button" 
                onClick={() => {
                  setShowAddForm(false);
                  setNewIssue({ 
                    title: '', 
                    description: '', 
                    type: 'maintenance', 
                    is_anonymous: false, 
                    priority: 'low' 
                  });
                  setSelectedImages([]);
                  imagePreviews.forEach(url => URL.revokeObjectURL(url));
                  setImagePreviews([]);
                }}
                className="px-5 py-2 text-white/60 hover:bg-white/5 rounded-lg font-medium transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button 
                id="issue-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-[#D4AF37] text-black rounded-lg font-bold hover:bg-[#D4AF37]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full"></span>
                    جاري إرسال الطلب...
                  </>
                ) : (
                  'إرسال الطلب'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4" id="issues-list">
        {displayIssues.map(issue => {
          const reporter = users.find(u => u.id === issue.reported_by);
          const apt = apartments.find(a => a.id === issue.apartment_id);
          const isMaintenanceType = issue.type === 'maintenance' || (issue.type && typeof issue.type === 'object' && issue.type.value === 'maintenance');
          const { cleanDescription, notes } = parseIssueDescription(issue.description);

          return (
            <div key={issue.id} className="bg-white/[0.02] rounded-3xl border border-white/5 p-6 hover:bg-white/[0.04] transition-colors" id={`issue-card-${issue.id}`}>
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {isMaintenanceType ? (
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    ) : (
                      <MessageSquare className="w-5 h-5 text-[#D4AF37]" />
                    )}
                    <h3 className="text-xl font-bold text-white">{issue.title}</h3>
                  </div>
                  
                  <p className="text-white/80 mb-4 whitespace-pre-wrap">{cleanDescription}</p>

                  {/* Render attachments/images if any exist */}
                  {issue.attachments && issue.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4" id={`issue-attachments-${issue.id}`}>
                      {issue.attachments.map((url, idx) => (
                        <button 
                          key={idx} 
                          onClick={() => setFullScreenImage(url)}
                          className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/10 hover:border-white/20 transition-all group cursor-zoom-in"
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
                  )}
                  
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className={`px-2.5 py-1 rounded-md border ${getPriorityColor(issue.priority)}`}>
                      أولوية {getPriorityLabel(issue.priority)}
                    </span>
                    
                    <span className="flex items-center text-white/40 gap-1.5">
                      <Clock className="w-4 h-4" />
                      {new Date(issue.created_at).toLocaleDateString('ar-JO')}
                    </span>

                    {isAdmin && (
                      <span className="flex items-center text-white/60 gap-1.5 bg-white/5 px-2.5 py-1 rounded-md">
                        <UserIcon className="w-4 h-4" />
                        {issue.is_anonymous ? 'فاعل خير (مخفي)' : `شقة ${apt?.number || '؟'} - ${reporter?.name || 'غير معروف'}`}
                      </span>
                    )}
                  </div>

                  {/* Notes Timeline / History section */}
                  <div className="mt-6 border-t border-white/5 pt-4">
                    <button
                      type="button"
                      onClick={() => toggleNotesExpanded(issue.id)}
                      className="flex items-center gap-2 text-sm font-bold text-[#D4AF37] hover:text-[#D4AF37]/80 transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>سجل الإجراءات والمتابعة والتواصل ({notes.length})</span>
                      {expandedNotesIssueIds[issue.id] ? (
                        <ChevronUp className="w-4 h-4 text-white/50" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-white/50" />
                      )}
                    </button>

                    {expandedNotesIssueIds[issue.id] && (
                      <div className="mt-4 space-y-4 pl-2 border-r-2 border-white/5 pr-4 mr-2">
                        {notes.length === 0 ? (
                          <p className="text-xs text-white/40 italic">لا توجد ملاحظات أو إجراءات مسجلة بعد لهذا الطلب.</p>
                        ) : (
                          <div className="space-y-3">
                            {notes.map((note) => (
                              <div key={note.id} className="p-3 bg-white/[0.01] border border-white/5 rounded-xl space-y-1">
                                <div className="flex items-center justify-between text-xs text-white/40">
                                  <span className="font-bold text-[#D4AF37]">
                                    {note.author_name} ({note.author_role === 'admin' ? 'الإدارة' : 'ساكن'})
                                  </span>
                                  <span>{new Date(note.created_at).toLocaleString('ar-JO')}</span>
                                </div>
                                <p className="text-sm text-white/80 leading-relaxed">{note.text}</p>
                                
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {note.status_change && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold">
                                      <Wrench className="w-3 h-3" />
                                      تحديث حالة: {note.status_change === 'open -> in_progress' ? 'مفتوح ➔ قيد العمل' : note.status_change === 'in_progress -> resolved' ? 'قيد العمل ➔ تم الحل' : note.status_change === 'open -> resolved' ? 'مفتوح ➔ تم الحل' : note.status_change}
                                    </span>
                                  )}
                                  {note.communicated_party && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-500/10 text-[#D4AF37] text-[10px] font-bold">
                                      <UserIcon className="w-3 h-3" />
                                      تم التواصل مع: {note.communicated_party}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add note form for pending action items */}
                        {issue.status !== 'resolved' ? (
                          <div className="pt-3 border-t border-white/5">
                            {activeAddingNoteIssueId === issue.id ? (
                              <div className="space-y-3 bg-white/[0.01] p-3 rounded-xl border border-white/5">
                                <h4 className="text-xs font-bold text-white">إضافة ملاحظة / إجراء جديد</h4>
                                <div className="grid grid-cols-1 gap-3">
                                  <div>
                                    <label className="block text-[10px] text-white/40 mb-1">الجهة التي تم التواصل معها (اختياري)</label>
                                    <select
                                      value={generalCommunicatedParty}
                                      onChange={(e) => setGeneralCommunicatedParty(e.target.value)}
                                      className="w-full px-3 py-1.5 bg-[#1E1E1E] text-white text-xs border border-white/10 rounded-lg focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                                    >
                                      <option value="">لا يوجد جهة تواصل</option>
                                      {COMMUNICATED_PARTIES.map((party, idx) => (
                                        <option key={idx} value={party}>{party}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-[10px] text-white/40 mb-1">نص الملاحظة أو الإجراء</label>
                                  <textarea
                                    rows={2}
                                    value={generalNoteText}
                                    onChange={(e) => setGeneralNoteText(e.target.value)}
                                    placeholder="اكتب ملاحظة حول التواصل أو العمل الجاري..."
                                    className="w-full px-3 py-1.5 bg-[#1E1E1E] text-white text-xs border border-white/10 rounded-lg focus:ring-[#D4AF37] focus:border-[#D4AF37] placeholder-white/20"
                                  />
                                </div>
                                <div className="flex justify-end gap-2 text-xs">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveAddingNoteIssueId(null);
                                      setGeneralNoteText('');
                                      setGeneralCommunicatedParty('');
                                    }}
                                    className="px-3 py-1.5 text-white/60 hover:bg-white/5 rounded-lg"
                                  >
                                    إلغاء
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!generalNoteText.trim()}
                                    onClick={() => handleAddGeneralNote(issue.id)}
                                    className="px-3 py-1.5 bg-[#D4AF37] text-black font-bold rounded-lg hover:bg-[#D4AF37]/80 transition-colors disabled:opacity-40"
                                  >
                                    حفظ الملاحظة
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setActiveAddingNoteIssueId(issue.id)}
                                className="inline-flex items-center gap-1.5 text-xs text-[#D4AF37] hover:underline"
                              >
                                <Send className="w-3.5 h-3.5" />
                                إضافة ملاحظة أو توثيق اتصال جديد
                              </button>
                            )}
                          </div>
                        ) : (
                          <p className="text-[11px] text-emerald-400 italic">تم إغلاق وحل هذه الشكوى/المشكلة، سجل الملاحظات مغلق.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-3 min-w-[140px]">
                  <span className={`px-4 py-1.5 rounded-full text-sm font-bold w-full text-center uppercase ${
                    issue.status === 'open' ? 'bg-red-500/10 text-red-500' :
                    issue.status === 'in_progress' ? 'bg-yellow-500/10 text-yellow-500' :
                    'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {issue.status === 'open' ? 'مفتوح' : issue.status === 'in_progress' ? 'قيد العمل' : 'تم الحل'}
                  </span>

                  {isAdmin && issue.status !== 'resolved' && (
                    <select
                      id={`issue-status-select-${issue.id}`}
                      value={issue.status}
                      onChange={(e) => setStatusChangingIssue({ issueId: issue.id, nextStatus: e.target.value as any })}
                      className="text-sm border border-white/10 bg-[#1E1E1E] text-white rounded-lg px-3 py-1.5 focus:ring-[#D4AF37] focus:border-[#D4AF37] cursor-pointer"
                    >
                      <option value="open">تحديد كـ مفتوح</option>
                      <option value="in_progress">قيد العمل</option>
                      <option value="resolved">إغلاق المشكلة</option>
                    </select>
                  )}
                  {issue.status === 'resolved' && (
                    <div className="flex items-center text-emerald-400 gap-1 mt-2">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm font-medium">مغلقة</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {displayIssues.length === 0 && (
          <div className="text-center py-12 bg-white/[0.02] rounded-3xl border border-white/10 border-dashed" id="no-issues-placeholder">
            <CheckCircle2 className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 font-medium">لا توجد شكاوى أو طلبات حالية</p>
          </div>
        )}
      </div>

      {fullScreenImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setFullScreenImage(null)}>
          <button className="absolute top-4 right-4 text-white p-2 bg-black/50 rounded-full" onClick={() => setFullScreenImage(null)}>
            <X className="w-8 h-8" />
          </button>
          <img src={fullScreenImage} alt="FullScreen" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
        </div>
      )}

      {statusChangingIssue && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#121212] border border-white/10 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Wrench className="w-5 h-5 text-[#D4AF37]" />
              تحديث حالة الطلب وإضافة ملاحظة المتابعة
            </h3>
            
            <p className="text-sm text-white/60 leading-relaxed">
              وفقاً للنظام، يرجى تزويدنا بتحديث تفصيلي عن حالة هذا الطلب، والجهة التي تم التواصل معها لمتابعة العمل.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/40 mb-1.5">الحالة الجديدة</label>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  statusChangingIssue.nextStatus === 'open' ? 'bg-red-500/10 text-red-500' :
                  statusChangingIssue.nextStatus === 'in_progress' ? 'bg-yellow-500/10 text-yellow-500' :
                  'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {statusChangingIssue.nextStatus === 'open' ? 'مفتوح (معلق)' : statusChangingIssue.nextStatus === 'in_progress' ? 'قيد العمل والمعالجة' : 'تم الحل وإغلاق الشكوى'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/40 mb-1.5">الجهة التي تم التواصل معها (اختياري)</label>
                <select
                  value={statusCommunicatedParty}
                  onChange={(e) => setStatusCommunicatedParty(e.target.value)}
                  className="w-full px-4 py-2 bg-[#1E1E1E] text-white border border-white/10 rounded-xl focus:ring-[#D4AF37] focus:border-[#D4AF37] text-sm cursor-pointer"
                >
                  <option value="">لا يوجد جهة اتصال (تغيير حالة فقط)</option>
                  {COMMUNICATED_PARTIES.map((party, idx) => (
                    <option key={idx} value={party}>{party}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/40 mb-1.5">ملاحظة تغيير الحالة والإجراء (مطلوب)</label>
                <textarea
                  required
                  rows={3}
                  value={statusNoteText}
                  onChange={(e) => setStatusNoteText(e.target.value)}
                  placeholder="مثال: تم التواصل مع فني الصيانة وسيكون بالموقع اليوم مساءً لإصلاح الخلل..."
                  className="w-full px-4 py-2 bg-[#1E1E1E] text-white border border-white/10 rounded-xl focus:ring-[#D4AF37] focus:border-[#D4AF37] placeholder-white/20 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStatusChangingIssue(null);
                  setStatusNoteText('');
                  setStatusCommunicatedParty('');
                }}
                className="px-4 py-2 text-white/60 hover:bg-white/5 rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={!statusNoteText.trim()}
                onClick={handleConfirmStatusChange}
                className="px-5 py-2 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:bg-[#D4AF37]/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                تأكيد وحفظ الإجراء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
