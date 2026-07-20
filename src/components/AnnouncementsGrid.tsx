import React from 'react';
import { motion } from 'motion/react';
import { Eye, Check, Edit2, Trash2, ThumbsUp } from 'lucide-react';
import { Announcement } from '../types';

interface AnnouncementsGridProps {
  announcements: Announcement[];
  onRead?: (ann: Announcement) => void;
  onLike?: (id: string, userId: string) => void;
  onEdit?: (ann: Announcement) => void;
  onDelete?: (id: string) => void;
  isAdmin?: boolean;
  currentUserId?: string;
}

export const AnnouncementsGrid: React.FC<AnnouncementsGridProps> = ({
  announcements,
  onRead,
  onLike,
  onEdit,
  onDelete,
  isAdmin,
  currentUserId,
}) => {
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <span className="bg-red-500/10 text-red-500 text-[10px] font-bold px-2 py-1 rounded-md uppercase">عاجل</span>;
      case 'medium': return <span className="bg-yellow-500/10 text-yellow-500 text-[10px] font-bold px-2 py-1 rounded-md uppercase">هام</span>;
      default: return <span className="bg-blue-500/10 text-blue-500 text-[10px] font-bold px-2 py-1 rounded-md uppercase">عادي</span>;
    }
  };

  return (
    <motion.div 
      layout
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
    >
      {announcements.map((ann, index) => {
        const hasLiked = ann.liked_by?.includes(currentUserId || '');
        
        return (
          <motion.div
            key={ann.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group bg-[#161616] hover:border-[#D4AF37]/30 transition-all duration-300 rounded-3xl border border-white/5 p-6 flex flex-col gap-4 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/5 rounded-bl-[100px] -mr-10 -mt-10 pointer-events-none" />
            
            <div className="flex justify-between items-start gap-4">
              {getPriorityBadge(ann.priority)}
              <span className="text-xs text-white/40 font-mono">
                {new Date(ann.created_at).toLocaleDateString('ar-JO')}
              </span>
            </div>
            
            <h3 className="text-lg font-bold text-white group-hover:text-[#D4AF37] transition-colors leading-tight">
              {ann.title}
            </h3>
            
            <p className="text-sm text-white/60 leading-relaxed flex-grow line-clamp-3">
              {ann.content}
            </p>
            
            <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-3">
              <div className="text-xs text-white/60 flex items-center gap-2">
                <ThumbsUp className="w-4 h-4 fill-current opacity-80" />
                <span>{ann.likes || 0} مؤيد</span>
              </div>
              
              <div className="flex items-center gap-2">
                {onRead && (
                  <button
                    onClick={() => onRead(ann)}
                    className="p-2 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl transition-colors"
                    title="قراءة التفاصيل"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
                
                {onLike && (
                  <button
                    onClick={() => onLike(ann.id, currentUserId || '')}
                    className={`p-2 rounded-xl transition-all ${
                      hasLiked 
                        ? 'bg-[#D4AF37] text-black font-semibold' 
                        : 'bg-white/5 text-white hover:bg-[#D4AF37]/20 hover:text-[#D4AF37]'
                    }`}
                    title={hasLiked ? 'تم تأكيد الاطلاع' : 'تأكيد الاطلاع والموافقة'}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}

                {isAdmin && onEdit && onDelete && (
                  <>
                    <button
                      onClick={() => onEdit(ann)}
                      className="p-2 bg-white/5 hover:bg-yellow-500/20 text-white/80 hover:text-yellow-400 rounded-xl transition-colors"
                      title="تعديل التعميم"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(ann.id)}
                      className="p-2 bg-white/5 hover:bg-red-500/20 text-white/80 hover:text-red-400 rounded-xl transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
};
