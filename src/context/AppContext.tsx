import React, { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Profile, Apartment, Payment, Expense, Issue, Lookup, Meeting, MeetingEvaluation, AppNotification, Announcement, BuildingAsset } from '../types';
import { sendBrowserNotification } from '../lib/notifications';
import { 
  FCMTokenRecord, 
  getAllRegisteredTokens, 
  getUserTokens, 
  registerDeviceTokenInDB, 
  registerSimulatedDeviceToken, 
  unregisterDeviceToken, 
  getOrGenerateCurrentToken 
} from '../lib/fcm';

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
  isLoading: boolean;
}

interface AppContextType extends AppState {
  notifications: AppNotification[];
  fcmTokens: FCMTokenRecord[];
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
  registerDeviceToken: (customDevice?: string) => Promise<string>;
  registerSimulatedToken: (userId: string, deviceName: string, customToken?: string) => Promise<void>;
  removeToken: (token: string) => Promise<void>;
  refreshTokensList: () => Promise<void>;
  pushNotificationToToken: (token: string, title: string, body: string, type: 'issue' | 'meeting' | 'announcement' | 'payment') => Promise<void>;
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
    isLoading: true
  });

  const [fcmTokens, setFcmTokens] = useState<FCMTokenRecord[]>([]);

  const refreshTokensList = async () => {
    const tokens = await getAllRegisteredTokens();
    setFcmTokens(tokens);
  };

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

      // Try fetching announcements from Supabase
      try {
        const { data: annDb } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
        if (annDb && annDb.length > 0) {
          setAnnouncements(annDb as any);
          localStorage.setItem('building_announcements', JSON.stringify(annDb));
        }
      } catch (annFetchErr) {
        console.warn('Could not load announcements from Supabase, using local fallback:', annFetchErr);
      }

      await refreshTokensList();



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
      refreshTokensList();
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await fetchCurrentUser(session.user.id);
        await loadData();
        // Auto-register current browser FCM token upon login
        await registerDeviceTokenInDB(session.user.id);
        await refreshTokensList();
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
        refreshTokensList();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await fetchCurrentUser(session.user.id);
        await loadData();
        // Auto-register current browser FCM token upon auth change
        await registerDeviceTokenInDB(session.user.id);
        await refreshTokensList();
      } else {
        setState(prev => ({ ...prev, currentUser: null }));
        refreshTokensList();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Ref to always hold the latest state without causing dependency-induced resubscriptions
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Subscribe to real-time changes on Supabase for live push notifications
  useEffect(() => {
    if (!supabase || !state.currentUser) return;

    const currentUserId = state.currentUser.id;
    const userRole = state.currentUser.role;

    console.log('[Realtime] Subscribing to database changes for user:', currentUserId);

    const handlePostgresChanges = (payload: any) => {
      const { table, eventType, new: newRecord, old: oldRecord } = payload;
      console.log('[Realtime] Change detected:', table, eventType, payload);

      // Access latest state safely from our Ref BEFORE database reload updates it
      const currentState = stateRef.current;

      // Reload the data in state so the app UI is updated in real-time!
      loadData();

      // Show browser notifications based on table
      if (table === 'announcements' && eventType === 'INSERT') {
        sendBrowserNotification(
          '📢 تعميم جديد من إدارة العمارة',
          newRecord.title || 'تم نشر تعميم جديد يرجى الاطلاع عليه',
          'announcement'
        );
      } else if (table === 'meetings' && eventType === 'INSERT') {
        sendBrowserNotification(
          '📅 اجتماع أو لجنة جديدة مقرر',
          newRecord.title || 'تمت جدولة اجتماع جديد لسكان العمارة',
          'meeting'
        );
      } else if (table === 'issues') {
        if (eventType === 'UPDATE') {
          // Compare with locally stored issue state before loadData completes
          const existingIssue = currentState.issues.find(i => i.id === newRecord.id);
          const oldStatus = existingIssue ? existingIssue.status : (oldRecord ? oldRecord.status : undefined);

          // Only notify if status has actually changed!
          if (oldStatus !== newRecord.status) {
            // Check if the current user is the owner of this complaint
            // Also fallback to check if user's apartment matches the issue's apartment
            const userApartment = currentState.apartments.find(apt => apt.tenant_id === currentUserId);
            const isUserIssue = newRecord.reported_by === currentUserId || 
                                (userApartment && userApartment.id === newRecord.apartment_id);

            if (isUserIssue) {
              const statusLabels: Record<string, string> = {
                'open': 'مفتوحة',
                'in_progress': 'قيد المتابعة والعمل',
                'resolved': 'تم حلها وإغلاقها'
              };
              const statusLabel = statusLabels[newRecord.status] || newRecord.status;
              sendBrowserNotification(
                '🔧 تحديث على شكواك',
                `تغيرت حالة الشكوى "${newRecord.title}" إلى: ${statusLabel}`,
                'issue'
              );
            }
          }
        } else if (eventType === 'INSERT' && userRole === 'admin') {
          // Admin gets notified of newly filed complaints
          sendBrowserNotification(
            '🚨 شكوى جديدة مستلمة',
            `قام أحد السكان بتقديم شكوى جديدة: "${newRecord.title}"`,
            'issue'
          );
        }
      } else if (table === 'payments') {
        if (eventType === 'UPDATE') {
          // Check if payment belongs to the current user's apartment
          const userApartment = currentState.apartments.find(apt => apt.tenant_id === currentUserId);
          const isUserPayment = userApartment && userApartment.id === newRecord.apartment_id;

          if (isUserPayment) {
            const existingPayment = currentState.payments.find(p => p.id === newRecord.id);
            const oldVerificationStatus = existingPayment ? existingPayment.verification_status : (oldRecord ? oldRecord.verification_status : undefined);
            const oldStatus = existingPayment ? existingPayment.status : (oldRecord ? oldRecord.status : undefined);

            if (oldVerificationStatus !== newRecord.verification_status) {
              const statusLabels: Record<string, string> = {
                'pending': 'قيد التدقيق والتحقق',
                'verified': 'تم قبولها وتأكيد السداد',
                'rejected': 'مرفوضة (يرجى التحقق مع الإدارة)',
                'none': 'غير مدفوعة'
              };
              const statusLabel = statusLabels[newRecord.verification_status] || newRecord.verification_status;
              sendBrowserNotification(
                '💰 تحديث حالة الدفعة',
                `تم تحديث حالة دفعتك لشهر ${newRecord.month} إلى: ${statusLabel}`,
                'payment'
              );
            } else if (oldStatus !== newRecord.status) {
              const statusLabel = newRecord.status === 'paid' ? 'مدفوعة' : 'غير مدفوعة';
              sendBrowserNotification(
                '💰 تحديث حالة الدفعة',
                `تم تغيير حالة الدفعة لشهر ${newRecord.month} إلى: ${statusLabel}`,
                'payment'
              );
            }
          }
        } else if (eventType === 'INSERT' && userRole === 'tenant') {
          // If a new payment request is inserted for the tenant's apartment
          const userApartment = currentState.apartments.find(apt => apt.tenant_id === currentUserId);
          if (userApartment && userApartment.id === newRecord.apartment_id) {
            sendBrowserNotification(
              '📅 دفعة مستحقة جديدة',
              `تم إصدار دفعة جديدة مستحقة بقيمة ${newRecord.amount} د.أ لشهر ${newRecord.month}`,
              'payment'
            );
          }
        }
      }
    };

    const channel = supabase
      .channel('smart-building-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        handlePostgresChanges
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meetings' },
        handlePostgresChanges
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'issues' },
        handlePostgresChanges
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        handlePostgresChanges
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
      });

    return () => {
      console.log('[Realtime] Unsubscribing from changes');
      supabase.removeChannel(channel);
    };
  }, [state.currentUser?.id, state.currentUser?.role]);

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
    
    if (supabase) {
      try {
        await supabase.from('announcements').insert([newAnn]);
        await loadData();
      } catch (err) {
        console.error('Error inserting announcement into Supabase:', err);
      }
    }
  };

  const likeAnnouncement = async (id: string, userId: string) => {
    if (!supabase) return;
    
    const announcement = announcements.find(a => a.id === id);
    if (!announcement) return;

    const liked_by = announcement.liked_by || [];
    const isLiked = liked_by.includes(userId);
    const newLikedBy = isLiked 
      ? liked_by.filter(uId => uId !== userId)
      : [...liked_by, userId];
    
    try {
      await supabase.from('announcements').update({
        liked_by: newLikedBy,
        likes: newLikedBy.length
      }).eq('id', id);
      await loadData();
    } catch (err) {
      console.error('Error liking announcement in Supabase:', err);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (supabase) {
      try {
        await supabase.from('announcements').delete().eq('id', id);
        await loadData();
      } catch (err) {
        console.error('Error deleting announcement from Supabase:', err);
      }
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
      
      // New announcements in last 7 days
      announcements.forEach(ann => {
        const id = `announcement-${ann.id}`;
        if (!dismissedNotifications.includes(id)) {
          const createdDate = new Date(ann.created_at);
          const diffDays = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays <= 7) {
            list.push({
              id,
              title: '📢 تعميم جديد من الإدارة',
              message: `تم نشر تعميم جديد بعنوان "${ann.title}". يرجى قراءة التفاصيل.`,
              type: 'announcement',
              created_at: ann.created_at
            });
          }
        }
      });

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
  }, [state, dismissedNotifications, announcements]);

  const registerDeviceToken = async (customDevice?: string): Promise<string> => {
    if (!state.currentUser) return '';
    const res = await registerDeviceTokenInDB(state.currentUser.id, customDevice);
    await refreshTokensList();
    return res.token;
  };

  const registerSimulatedToken = async (userId: string, deviceName: string, customToken?: string) => {
    await registerSimulatedDeviceToken(userId, deviceName, customToken);
    await refreshTokensList();
  };

  const removeToken = async (token: string) => {
    await unregisterDeviceToken(token);
    await refreshTokensList();
  };

  const pushNotificationToToken = async (token: string, title: string, body: string, type: 'issue' | 'meeting' | 'announcement' | 'payment') => {
    const currentDeviceToken = getOrGenerateCurrentToken();
    if (token === currentDeviceToken) {
      sendBrowserNotification(title, body, type);
    }
    
    // Find device and user info
    const deviceRecord = fcmTokens.find(t => t.token === token);
    const deviceName = deviceRecord ? deviceRecord.device : 'متصفح نشط';
    const recipientUser = deviceRecord ? state.users.find(u => u.id === deviceRecord.user_id) : null;
    const recipientName = recipientUser ? recipientUser.name : (state.currentUser?.id === deviceRecord?.user_id ? state.currentUser.name : 'مستخدم العمارة');
    
    // Create custom window event for instant visual simulation of push notification arrival in open tabs
    const event = new CustomEvent('simulated_push_received', {
      detail: { 
        token, 
        title, 
        body, 
        type, 
        deviceName,
        recipientName,
        timestamp: new Date().toISOString() 
      }
    });
    window.dispatchEvent(event);
  };

  return (
    <AppContext.Provider value={{ 
      ...state, 
      announcements,
      notifications, 
      fcmTokens,
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
      registerDeviceToken,
      registerSimulatedToken,
      removeToken,
      refreshTokensList,
      pushNotificationToToken
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
