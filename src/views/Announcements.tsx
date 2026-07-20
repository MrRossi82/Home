import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Announcement } from '../types';
import { 
  Megaphone, Plus, Trash2, Edit2, Check, Eye, Search, Filter, 
  AlertTriangle, Bell, ThumbsUp, X, Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';
import { AnnouncementsGrid } from '../components/AnnouncementsGrid';

export const Announcements: React.FC = () => {
  const { 
    currentUser, announcements, addAnnouncement, likeAnnouncement, deleteAnnouncement 
  } = useAppContext();

  const isAdmin = currentUser?.role === 'admin';
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'normal' | 'important' | 'urgent'>('all');

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'normal' | 'important' | 'urgent'>('normal');

  // Selected Announcement for detail modal
  const [selectedAnn, setSelectedAnn] = useState<Announcement | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    if (editId) {
      // For editing, we delete and re-insert in local-fallback context or update
      // But since we want to support editing, we'll implement it nicely
      // (Let's check if the context has edit announcement, or we can just delete & re-add, or we can add updateAnnouncement to context if needed).
      // Since context has delete and add, let's delete the old one and add the new edited one to keep the code extremely clean!
      await deleteAnnouncement(editId);
      await addAnnouncement({
        title,
        content,
        priority,
        created_at: new Date().toISOString(),
        views_count: 0,
        likes: 0,
        liked_by: []
      });
      setEditId(null);
    } else {
      await addAnnouncement({
        title,
        content,
        priority,
        created_at: new Date().toISOString(),
        views_count: 0,
        likes: 0,
        liked_by: []
      });
    }

    setTitle('');
    setContent('');
    setPriority('normal');
    setShowForm(false);
  };

  const handleEdit = (ann: Announcement) => {
    setEditId(ann.id);
    setTitle(ann.title);
    setContent(ann.content);
    setPriority(ann.priority);
    setShowForm(true);
  };

  // Filtered announcements
  const filteredAnnouncements = announcements.filter(ann => {
    const matchesSearch = ann.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          ann.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || ann.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgent':
        return (
          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1 w-max">
            <AlertTriangle className="w-3 h-3" /> عاجل جداً
          </span>
        );
      case 'important':
        return (
          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 flex items-center gap-1 w-max">
            <Bell className="w-3 h-3" /> هام
          </span>
        );
      default:
        return (
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 text-white/60 border border-white/10 flex items-center gap-1 w-max">
            إعلان عام
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12 rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#161616] p-6 rounded-3xl border border-white/5">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-[#D4AF37]" />
            التعميمات والقرارات الإدارية
          </h2>
          <p className="text-sm text-white/40 mt-1">عرض رسمي لجميع التعميمات الصادرة عن لجنة إدارة العمارة مع إمكانية تأكيد الاطلاع.</p>
        </div>
        
        {isAdmin && (
          <button 
            onClick={() => {
              setEditId(null);
              setTitle('');
              setContent('');
              setPriority('normal');
              setShowForm(!showForm);
            }}
            className="flex items-center gap-2 px-5 py-3 bg-[#D4AF37] text-black font-semibold rounded-xl hover:bg-[#D4AF37]/80 transition-colors shadow-lg shadow-[#D4AF37]/10"
          >
            {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            {showForm ? 'إلغاء' : 'إضافة تعميم رسمي جديد'}
          </button>
        )}
      </div>

      {/* Admin Add/Edit Form */}
      {showForm && isAdmin && (
        <div className="bg-[#161616] p-6 rounded-3xl border border-white/10">
          <h3 className="text-lg font-bold text-white mb-4">
            {editId ? 'تعديل التعميم الرسمي' : 'إنشاء تعميم رسمي جديد'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">عنوان التعميم</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1E1E1E] text-white border border-white/10 rounded-xl focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                  placeholder="مثال: موعد صيانة المصعد أو تنظيف الخزانات"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">الأولوية والأهمية</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as any)}
                  className="w-full px-4 py-3 bg-[#1E1E1E] text-white border border-white/10 rounded-xl focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                >
                  <option value="normal">عادي (عام)</option>
                  <option value="important">هام (يتطلب انتباه)</option>
                  <option value="urgent">عاجل جداً (يتطلب إجراء فوري)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">نص ومضمون التعميم بالتفصيل</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 bg-[#1E1E1E] text-white border border-white/10 rounded-xl focus:ring-[#D4AF37] focus:border-[#D4AF37] min-h-[120px]"
                placeholder="اكتب تفاصيل الإعلان هنا بوضوح لجميع السكان..."
                required
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 bg-white/5 text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#D4AF37] text-black font-bold rounded-xl hover:bg-[#D4AF37]/80 transition-colors"
              >
                {editId ? 'حفظ التعديلات' : 'نشر التعميم للجميع'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-[#161616] p-4 rounded-2xl border border-white/5">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 text-white/40 absolute right-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 bg-[#1E1E1E] text-white border border-white/5 rounded-xl focus:ring-[#D4AF37] focus:border-[#D4AF37]"
            placeholder="البحث في التعميمات..."
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-[#D4AF37]" />
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value as any)}
            className="bg-[#1E1E1E] text-white border border-white/5 rounded-xl py-2.5 px-4 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
          >
            <option value="all">كل المستويات</option>
            <option value="normal">عادي</option>
            <option value="important">هام</option>
            <option value="urgent">عاجل جداً</option>
          </select>
        </div>
      </div>

      {/* Announcements Grid */}
      <AnnouncementsGrid 
        announcements={filteredAnnouncements}
        onRead={setSelectedAnn}
        onLike={likeAnnouncement}
        onEdit={handleEdit}
        onDelete={deleteAnnouncement}
        isAdmin={isAdmin}
        currentUserId={currentUser?.id}
      />

      {/* Announcement Details Modal */}
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
    </div>
  );
};
