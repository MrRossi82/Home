import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Profile, Apartment, Payment, Expense, Issue, Lookup, Meeting, MeetingEvaluation, AppNotification, Announcement, BuildingAsset } from '../types';

interface AppState {
  currentUser: Profile | null;
  users: Profile[];
  apartments: Apartment[];
  payments: Payment[];
  expenses: Expense[];
  issues: Issue[];
  lookups: Lookup[];
  meetings: Meeting[];
  meetingEvaluations: MeetingEvaluation[];
  announcements: Announcement[];
  buildingAssets: BuildingAsset[];
  isLoading: boolean;
}

interface AppContextType extends AppState {
  notifications: AppNotification[];
  dismissNotification: (id: string) => void;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  addPayment: (payment: Partial<Payment>) => Promise<void>;
  addExpense: (expense: Partial<Expense>) => Promise<void>;
  addIssue: (issue: Partial<Issue>) => Promise<void>;
  updateIssue: (id: string, updates: Partial<Issue>) => Promise<void>;
  addMeeting: (meeting: Partial<Meeting>) => Promise<void>;
  updateMeeting: (id: string, updates: Partial<Meeting>) => Promise<void>;
  evaluateMeeting: (evaluation: Partial<MeetingEvaluation>) => Promise<void>;
  addAnnouncement: (announcement: Partial<Announcement>) => Promise<void>;
  likeAnnouncement: (id: string, userId: string) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  addAsset: (asset: Partial<BuildingAsset>) => Promise<void>;
  updateAsset: (id: string, updates: Partial<BuildingAsset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    try {
      const stored = localStorage.getItem('building_announcements');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return [
       {
         id: 'ann-1',
         title: 'بدء صيانة المصعد الدورية لشهر تموز',
         content: 'نعلمكم بأنه سيتم إيقاف المصعد يوم الثلاثاء القادم من الساعة 10 صباحاً وحتى 2 ظهراً لإجراء الصيانة الدورية واختبار الفرامل ومطابقة معايير السلامة. نرجو من الجميع التخطيط المسبق وتفهم الموقف لسلامتكم.',
         created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
         priority: 'urgent',
         views_count: 14,
         likes: 5,
         liked_by: []
       },
       {
         id: 'ann-2',
         title: 'تنظيف وتعقيم خزانات المياه الرئيسية',
         content: 'سيقوم فريق الصيانة بتنظيف وتعقيم خزانات المياه الأرضية والعلوية للعمارة يوم الجمعة القادم. سيتم قطع المياه مؤقتاً خلال فترة العمل (من 8 صباحاً وحتى 12 ظهراً). نرجو تخزين كمية كافية من المياه لاستخداماتكم المنزلية.',
         created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
         priority: 'important',
         views_count: 18,
         likes: 8,
         liked_by: []
       },
       {
         id: 'ann-3',
         title: 'تركيب نظام إنارة طوارئ جديد على الدرج والمداخل',
         content: 'تم الانتهاء بحمد الله من تركيب كشافات إنارة طوارئ ذكية تعمل تلقائياً عند انقطاع التيار الكهربائي في جميع طوابق العمارة والمداخل الرئيسية والمواقف لضمان سلامة حركتكم ليلاً.',
         created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
         priority: 'normal',
         views_count: 22,
         likes: 12,
         liked_by: []
       }
    ];
  });

  const [buildingAssets, setBuildingAssets] = useState<BuildingAsset[]>(() => {
    try {
      const stored = localStorage.getItem('building_assets_local');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return [
       {
         id: 'asset-1',
         name: 'نظام المصعد الكهربائي',
         description: 'مصعد إيطالي الصنع حمولة 6 أشخاص، تم عمل صيانة دورية للمحرك والأسلاك والفرامل الكهربائية.',
         value: 8500.00,
         category: 'المرافق والمعدات',
         status: 'excellent',
         last_maintenance: '2026-06-10',
         next_maintenance: '2026-07-25',
         purchase_date: '2022-04-12',
         created_at: new Date().toISOString(),
         contact_person: 'شركة الشروق للمصاعد',
         contact_phone: '0795551234'
       },
       {
         id: 'asset-2',
         name: 'نظام الخلايا الشمسية لتوليد الطاقة',
         description: 'نظام خلايا شمسية بقدرة 10 كيلوواط لتغذية الخدمات المشتركة (المصعد، إنارة الدرج والساحات الخارجية).',
         value: 5200.00,
         category: 'الطاقة والكهرباء',
         status: 'active',
         last_maintenance: '2026-05-15',
         next_maintenance: '2026-11-15',
         purchase_date: '2024-02-18',
         created_at: new Date().toISOString(),
         contact_person: 'المهندس عمر - شمس المستقبل',
         contact_phone: '0784445678'
       },
       {
         id: 'asset-3',
         name: 'مضخات وخزانات المياه الرئيسية',
         description: '3 مضخات إيطالية مع لوحة تحكم أوتوماتيكية مخصصة لرفع المياه لخزانات الشقق وخزانات أرضية سعة 12م³.',
         value: 1800.00,
         category: 'شبكة المياه',
         status: 'needs_maintenance',
         last_maintenance: '2026-01-20',
         next_maintenance: '2026-07-20',
         purchase_date: '2021-09-05',
         created_at: new Date().toISOString(),
         contact_person: 'أبو حميد للخدمات الصحية',
         contact_phone: '0773339911'
       },
       {
         id: 'asset-4',
         name: 'نظام كاميرات المراقبة والحماية',
         description: 'شبكة مكونة من 8 كاميرات خارجية وداخلية بدقة 4K مع جهاز تسجيل NVR وشاشة مراقبة وسعة تخزين 30 يوماً.',
         value: 750.00,
         category: 'الأمن والحماية',
         status: 'active',
         last_maintenance: '2026-04-01',
         next_maintenance: '2026-10-01',
         purchase_date: '2023-11-10',
         created_at: new Date().toISOString(),
         contact_person: 'الدرع الرقمي للأنظمة الأمنية',
         contact_phone: '0798884433'
       },
       {
         id: 'asset-5',
         name: 'نظام الإنتركم والبوابة الإلكترونية',
         description: 'بوابة حديدية للمواقف بمحرك إيطالي أوتوماتيكي مع نظام إنتركم صوتي ومرئي متصل بجميع الشقق السكنية.',
         value: 1200.00,
         category: 'الأمن والحماية',
         status: 'excellent',
         last_maintenance: '2026-03-10',
         next_maintenance: '2026-09-10',
         purchase_date: '2023-01-20',
         created_at: new Date().toISOString(),
         contact_person: 'تقنيات البيت الذكي',
         contact_phone: '0789990011'
       }
    ];
  });

  const [state, setState] = useState<AppState>({
    currentUser: null,
    users: [],
    apartments: [],
    payments: [],
    expenses: [],
    issues: [],
    lookups: [],
    meetings: [],
    meetingEvaluations: [],
    announcements: [],
    buildingAssets: [],
    isLoading: true
  });

  const loadData = async () => {
    if (!supabase) return;
    
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const [
        { data: profiles },
        { data: apartments },
        { data: payments },
        { data: expenses },
        { data: issues },
        { data: lookups },
        { data: meetings },
        { data: meetingEvaluations }
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('apartments').select('*, tenant:tenant_id(*)'),
        supabase.from('payments').select('*, apartment:apartment_id(*)'),
        supabase.from('expenses').select('*, category:category_id(*)'),
        supabase.from('issues').select('*, type:type_id(*), reporter:reported_by(*), apartment:apartment_id(*)'),
        supabase.from('lookups').select('*'),
        supabase.from('meetings').select('*').order('scheduled_at', { ascending: false }),
        supabase.from('meeting_evaluations').select('*, tenant:tenant_id(*)')
      ]);

      // Try fetching assets from Supabase if table exists
      try {
        const { data: assetsDb } = await supabase.from('building_assets').select('*');
        if (assetsDb && assetsDb.length > 0) {
          setBuildingAssets(assetsDb as any);
          localStorage.setItem('building_assets_local', JSON.stringify(assetsDb));
        }
      } catch (assetsFetchErr) {
        console.warn('Could not load assets from Supabase, using local fallback:', assetsFetchErr);
      }

      setState(prev => ({
        ...prev,
        users: profiles || [],
        apartments: apartments || [],
        payments: payments || [],
        expenses: expenses || [],
        issues: issues || [],
        lookups: lookups || [],
        meetings: meetings || [],
        meetingEvaluations: meetingEvaluations || [],
        isLoading: false
      }));
    } catch (error) {
      console.error('Error loading data:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    if (!supabase) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchCurrentUser(session.user.id);
        loadData();
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchCurrentUser(session.user.id);
        loadData();
      } else {
        setState(prev => ({ ...prev, currentUser: null }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchCurrentUser = async (userId: string) => {
    if (!supabase) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      setState(prev => ({ ...prev, currentUser: data }));
    }
  };

  const login = async (email: string, pass: string) => {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
  };

  const logout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const addPayment = async (payment: Partial<Payment>) => {
    if (!supabase) return;
    
    const { data: existingPayment } = await supabase.from('payments')
        .select('*')
        .eq('apartment_id', payment.apartment_id)
        .eq('month', payment.month)
        .single();

    if (existingPayment) {
        // update
        const { error } = await supabase.from('payments')
            .update(payment)
            .eq('id', existingPayment.id);
        if (error) console.error(error);
    } else {
        const { error } = await supabase.from('payments').insert([payment]);
        if (error) console.error(error);
    }
    await loadData();
  };

  const addExpense = async (expense: Partial<Expense>) => {
    if (!supabase) return;
    const { error } = await supabase.from('expenses').insert([expense]);
    if (error) console.error(error);
    await loadData();
  };

  const addIssue = async (issue: Partial<Issue>) => {
    if (!supabase) return;
    const { error } = await supabase.from('issues').insert([issue]);
    if (error) console.error(error);
    await loadData();
  };

  const updateIssue = async (id: string, updates: Partial<Issue>) => {
    if (!supabase) return;
    const { error } = await supabase.from('issues').update(updates).eq('id', id);
    if (error) console.error(error);
    await loadData();
  };

  const addMeeting = async (meeting: Partial<Meeting>) => {
    if (!supabase) return;
    const { error } = await supabase.from('meetings').insert([meeting]);
    if (error) console.error(error);
    await loadData();
  };

  const updateMeeting = async (id: string, updates: Partial<Meeting>) => {
    if (!supabase) return;
    const { error } = await supabase.from('meetings').update(updates).eq('id', id);
    if (error) console.error(error);
    await loadData();
  };

  const evaluateMeeting = async (evaluation: Partial<MeetingEvaluation>) => {
    if (!supabase) return;
    
    // Check if evaluation exists
    const { data: existing } = await supabase.from('meeting_evaluations')
      .select('*')
      .eq('meeting_id', evaluation.meeting_id)
      .eq('tenant_id', evaluation.tenant_id)
      .single();

    if (existing) {
      const { error } = await supabase.from('meeting_evaluations').update({
        status: evaluation.status,
        reason: evaluation.reason,
        rating: evaluation.rating
      }).eq('id', existing.id);
      if (error) console.error(error);
    } else {
      const { error } = await supabase.from('meeting_evaluations').insert([evaluation]);
      if (error) console.error(error);
    }
    
    await loadData();
  };

  const addAnnouncement = async (announcement: Partial<Announcement>) => {
    const newAnn: Announcement = {
      id: announcement.id || `ann-${Date.now()}`,
      title: announcement.title || '',
      content: announcement.content || '',
      created_at: announcement.created_at || new Date().toISOString(),
      priority: announcement.priority || 'normal',
      views_count: announcement.views_count || 0,
      likes: announcement.likes || 0,
      liked_by: announcement.liked_by || []
    };
    
    setAnnouncements(prev => {
      const updated = [newAnn, ...prev];
      localStorage.setItem('building_announcements', JSON.stringify(updated));
      return updated;
    });

    if (supabase) {
      try {
        await supabase.from('announcements').insert([newAnn]);
      } catch (err) {}
    }
  };

  const likeAnnouncement = async (id: string, userId: string) => {
    setAnnouncements(prev => {
      const updated = prev.map(ann => {
        if (ann.id === id) {
          const liked_by = ann.liked_by || [];
          const isLiked = liked_by.includes(userId);
          const newLikedBy = isLiked 
            ? liked_by.filter(uId => uId !== userId)
            : [...liked_by, userId];
          return {
            ...ann,
            liked_by: newLikedBy,
            likes: newLikedBy.length
          };
        }
        return ann;
      });
      localStorage.setItem('building_announcements', JSON.stringify(updated));
      return updated;
    });
  };

  const deleteAnnouncement = async (id: string) => {
    setAnnouncements(prev => {
      const updated = prev.filter(ann => ann.id !== id);
      localStorage.setItem('building_announcements', JSON.stringify(updated));
      return updated;
    });
    
    if (supabase) {
      try {
        await supabase.from('announcements').delete().eq('id', id);
      } catch (err) {}
    }
  };

  const addAsset = async (asset: Partial<BuildingAsset>) => {
    const newAsset: BuildingAsset = {
      id: asset.id || `asset-${Date.now()}`,
      name: asset.name || '',
      description: asset.description || '',
      value: Number(asset.value) || 0,
      category: asset.category || 'المرافق والمعدات',
      status: asset.status || 'active',
      last_maintenance: asset.last_maintenance || null,
      next_maintenance: asset.next_maintenance || null,
      purchase_date: asset.purchase_date || null,
      created_at: new Date().toISOString(),
      contact_person: asset.contact_person || '',
      contact_phone: asset.contact_phone || ''
    };

    setBuildingAssets(prev => {
      const updated = [newAsset, ...prev];
      localStorage.setItem('building_assets_local', JSON.stringify(updated));
      return updated;
    });

    if (supabase) {
      try {
        await supabase.from('building_assets').insert([newAsset]);
      } catch (err) {}
    }
  };

  const updateAsset = async (id: string, updates: Partial<BuildingAsset>) => {
    setBuildingAssets(prev => {
      const updated = prev.map(asset => {
        if (asset.id === id) {
          return { ...asset, ...updates, value: updates.value !== undefined ? Number(updates.value) : asset.value };
        }
        return asset;
      });
      localStorage.setItem('building_assets_local', JSON.stringify(updated));
      return updated;
    });

    if (supabase) {
      try {
        await supabase.from('building_assets').update(updates).eq('id', id);
      } catch (err) {}
    }
  };

  const deleteAsset = async (id: string) => {
    setBuildingAssets(prev => {
      const updated = prev.filter(asset => asset.id !== id);
      localStorage.setItem('building_assets_local', JSON.stringify(updated));
      return updated;
    });

    if (supabase) {
      try {
        await supabase.from('building_assets').delete().eq('id', id);
      } catch (err) {}
    }
  };

  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('dismissed_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const dismissNotification = (id: string) => {
    setDismissedNotifications(prev => {
      const updated = [...prev, id];
      localStorage.setItem('dismissed_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const notifications = useMemo(() => {
    const list: AppNotification[] = [];
    const { currentUser, issues, expenses, meetings, payments } = state;
    if (!currentUser) return [];

    const isAdmin = currentUser.role === 'admin';

    // 1. Admin Notifications
    if (isAdmin) {
      // New complaints (issues) in last 7 days
      issues.forEach(issue => {
        const id = `issue-${issue.id}`;
        if (!dismissedNotifications.includes(id)) {
          const createdDate = new Date(issue.created_at);
          const diffDays = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays <= 7) {
            list.push({
              id,
              title: 'شكوى جديدة',
              message: `تم تقديم شكوى جديدة بعنوان "${issue.title}" من قبل سكان العمارة.`,
              type: 'issue',
              created_at: issue.created_at
            });
          }
        }
      });

      // New expenses in last 7 days
      expenses.forEach(expense => {
        const id = `expense-${expense.id}`;
        if (!dismissedNotifications.includes(id)) {
          const expenseDate = new Date(expense.date);
          const diffDays = (Date.now() - expenseDate.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays <= 7) {
            list.push({
              id,
              title: 'مصروف جديد',
              message: `تمت إضافة مصروف جديد بقيمة ${expense.amount} د.أ بعنوان "${expense.title}".`,
              type: 'expense',
              created_at: expense.date
            });
          }
        }
      });
    } else {
      // 2. Tenant Notifications
      
      // Upcoming meetings in next 24 hours
      meetings.forEach(meeting => {
        if (meeting.status === 'scheduled') {
          const id = `meeting-remind-${meeting.id}`;
          if (!dismissedNotifications.includes(id)) {
            const scheduledTime = new Date(meeting.scheduled_at).getTime();
            const now = Date.now();
            const timeDiff = scheduledTime - now;
            const hoursDiff = timeDiff / (1000 * 60 * 60);
            
            if (hoursDiff > 0 && hoursDiff <= 24) {
              list.push({
                id,
                title: 'تذكير باجتماع قادم',
                message: `تذكير: هناك اجتماع مقرر بعنوان "${meeting.title}" خلال أقل من 24 ساعة.`,
                type: 'meeting',
                created_at: meeting.scheduled_at
              });
            }
          }
        }
      });

      // Monthly rent / Service fee payment reminder
      const currentMonthStr = new Date().toLocaleString('en-US', { month: 'long' }); // e.g. "July"
      const hasPaidCurrentMonth = payments.some(p => 
        p.tenant_id === currentUser.id && 
        p.payment_month === currentMonthStr && 
        p.verification_status === 'verified'
      );
      
      if (!hasPaidCurrentMonth) {
        const id = `rent-due-${currentMonthStr}`;
        if (!dismissedNotifications.includes(id)) {
          list.push({
            id,
            title: 'اقتراب موعد الدفعة الشهرية',
            message: `تذكير: اقتراب موعد دفع الإيجار الشهري / الاشتراك لشهر ${currentMonthStr}. يرجى السداد قريباً.`,
            type: 'rent',
            created_at: new Date().toISOString()
          });
        }
      }
    }

    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [state, dismissedNotifications]);

  return (
    <AppContext.Provider value={{ 
      ...state, 
      announcements,
      buildingAssets,
      notifications, 
      dismissNotification, 
      login, 
      logout, 
      addPayment, 
      addExpense, 
      addIssue, 
      updateIssue, 
      addMeeting, 
      updateMeeting, 
      evaluateMeeting,
      addAnnouncement,
      likeAnnouncement,
      deleteAnnouncement,
      addAsset,
      updateAsset,
      deleteAsset
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
