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
  getOrGenerateCurrentToken,
  autoEnsureAllProfilesHaveTokens
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

  // Refs for tracking known items for background polling real-time synchronization fallback
  const knownAnnouncementIdsRef = useRef<Set<string>>(new Set());
  const knownIssueStatusesRef = useRef<Map<string, string>>(new Map());

  const refreshTokensList = async () => {
    const tokens = await getAllRegisteredTokens();
    setFcmTokens(tokens);
  };

  const loadData = async (silent = false) => {
    if (!supabase) return;
    
    if (!silent) {
      setState(prev => ({ ...prev, isLoading: true }));
    }
    
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

          // Initialize known announcement IDs baseline
          if (knownAnnouncementIdsRef.current.size === 0) {
            annDb.forEach(ann => knownAnnouncementIdsRef.current.add(ann.id));
          }
        }
      } catch (annFetchErr) {
        console.warn('Could not load announcements from Supabase, using local fallback:', annFetchErr);
      }

      // Initialize known issue statuses baseline
      if (knownIssueStatusesRef.current.size === 0 && issues && issues.length > 0) {
        issues.forEach(issue => knownIssueStatusesRef.current.set(issue.id, issue.status));
      }

      // Auto-ensure that all profiles in the system have at least one registered token
      if (profiles && profiles.length > 0) {
        await autoEnsureAllProfilesHaveTokens(profiles);
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

    const handlePostgresChanges = async (payload: any) => {
      const { table, eventType, new: newRecord } = payload;
      console.log('[Realtime] Change detected:', table, eventType, payload);

      // Reload the data in state silently so the app UI is updated in real-time!
      loadData(true);

      if (table === 'announcements' && eventType === 'INSERT') {
        knownAnnouncementIdsRef.current.add(newRecord.id);
      } else if (table === 'issues') {
        knownIssueStatusesRef.current.set(newRecord.id, newRecord.status);
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

  // Dual Fallback: Silent background polling interval every 8 seconds
  // This guarantees push notification delivery even if Supabase Realtime replication is disabled.
  useEffect(() => {
    if (!supabase || !state.currentUser) return;

    const interval = setInterval(async () => {
      try {
        const currentUserId = state.currentUser?.id;
        const userRole = state.currentUser?.role;
        if (!currentUserId) return;

        const currentToken = getOrGenerateCurrentToken();

        // 1. Fetch latest announcements
        const { data: freshAnns } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        if (freshAnns) {
          let hasNewAnn = false;
          for (const ann of freshAnns) {
            if (!knownAnnouncementIdsRef.current.has(ann.id)) {
              knownAnnouncementIdsRef.current.add(ann.id);
              hasNewAnn = true;

              // Only notify if recent (within last 3 minutes) to avoid historic clutter
              const isRecent = (Date.now() - new Date(ann.created_at).getTime()) < 180000;
              if (isRecent) {
                await pushNotificationToToken(
                  currentToken,
                  '📢 تعميم جديد من إدارة العمارة',
                  ann.title || 'تم نشر تعميم جديد يرجى الاطلاع عليه',
                  'announcement'
                );
              }
            }
          }
          if (hasNewAnn) {
            setAnnouncements(freshAnns as any);
            localStorage.setItem('building_announcements', JSON.stringify(freshAnns));
          }
        }

        // 2. Fetch latest issues
        const { data: freshIssues } = await supabase
          .from('issues')
          .select('*, type:type_id(*), reporter:reported_by(*), apartment:apartment_id(*)');

        if (freshIssues) {
          let stateUpdated = false;
          for (const issue of freshIssues) {
            const prevStatus = knownIssueStatusesRef.current.get(issue.id);

            if (prevStatus === undefined) {
              knownIssueStatusesRef.current.set(issue.id, issue.status);
              stateUpdated = true;

              const isRecent = (Date.now() - new Date(issue.created_at).getTime()) < 180000;
              if (isRecent && userRole === 'admin') {
                await pushNotificationToToken(
                  currentToken,
                  '🚨 شكوى جديدة مستلمة',
                  `قام أحد السكان بتقديم شكوى جديدة: "${issue.title}"`,
                  'issue'
                );
              }
            } else if (prevStatus !== issue.status) {
              knownIssueStatusesRef.current.set(issue.id, issue.status);
              stateUpdated = true;

              // Check if payment/apartment matches user's complaints
              const isUserIssue = issue.reported_by === currentUserId;
              if (isUserIssue) {
                const statusLabels: Record<string, string> = {
                  'open': 'مفتوحة',
                  'in_progress': 'قيد المتابعة والعمل',
                  'resolved': 'تم حلها وإغلاقها'
                };
                const statusLabel = statusLabels[issue.status] || issue.status;
                await pushNotificationToToken(
                  currentToken,
                  '🔧 تحديث على شكواك',
                  `تغيرت حالة الشكوى "${issue.title}" إلى: ${statusLabel}`,
                  'issue'
                );
              }
            }
          }
          if (stateUpdated) {
            setState(prev => ({ ...prev, issues: freshIssues }));
          }
        }
      } catch (err) {
        console.warn('[Sync Error]', err);
      }
    }, 8000);

    return () => clearInterval(interval);
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
    
    // Find the apartment tenant to notify them
    const { data: apt } = await supabase.from('apartments').select('tenant_id').eq('id', payment.apartment_id).single();
    const tenantId = apt?.tenant_id;

    const { data: existingPayment } = await supabase.from('payments')
        .select('*')
        .eq('apartment_id', payment.apartment_id)
        .eq('month', payment.month)
        .single();

    let isNew = false;
    let isStatusChanged = false;
    let isVerificationChanged = false;

    if (existingPayment) {
        // update
        isStatusChanged = existingPayment.status !== payment.status;
        isVerificationChanged = existingPayment.verification_status !== payment.verification_status;
        const { error } = await supabase.from('payments')
            .update(payment)
            .eq('id', existingPayment.id);
        if (error) console.error(error);
    } else {
        isNew = true;
        const { error } = await supabase.from('payments').insert([payment]);
        if (error) console.error(error);
    }
    await loadData();

    // Send push notification to the tenant
    if (tenantId) {
      try {
        const freshTokens = await getAllRegisteredTokens();
        const tenantTokens = freshTokens.filter(t => t.user_id === tenantId);
        
        for (const t of tenantTokens) {
          if (isNew) {
            await pushNotificationToToken(
              t.token,
              '💰 دفعة مستحقة جديدة',
              `تم إصدار دفعة جديدة مستحقة بقيمة ${payment.amount || 10} د.أ لشهر ${payment.month}`,
              'payment'
            );
          } else if (isVerificationChanged && payment.verification_status) {
            const statusLabels: Record<string, string> = {
              'pending': 'قيد التدقيق والتحقق',
              'verified': 'تم قبولها وتأكيد السداد',
              'rejected': 'مرفوضة (يرجى التحقق مع الإدارة)',
              'none': 'غير مدفوعة'
            };
            const statusLabel = statusLabels[payment.verification_status] || payment.verification_status;
            await pushNotificationToToken(
              t.token,
              '💰 تحديث حالة الدفعة',
              `تم تحديث حالة دفعتك لشهر ${payment.month} إلى: ${statusLabel}`,
              'payment'
            );
          } else if (isStatusChanged && payment.status) {
            const statusLabel = payment.status === 'paid' ? 'مدفوعة' : 'غير مدفوعة';
            await pushNotificationToToken(
              t.token,
              '💰 تحديث حالة الدفعة',
              `تم تغيير حالة الدفعة لشهر ${payment.month} إلى: ${statusLabel}`,
              'payment'
            );
          }
        }
      } catch (pushErr) {
        console.error('Failed to dispatch payment push notification:', pushErr);
      }
    }
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

    // Send push notification to administrators about the new complaint
    try {
      const freshTokens = await getAllRegisteredTokens();
      const admins = state.users.filter(u => u.role === 'admin');
      for (const admin of admins) {
        const adminTokens = freshTokens.filter(t => t.user_id === admin.id);
        for (const t of adminTokens) {
          await pushNotificationToToken(
            t.token,
            '🚨 شكوى جديدة مستلمة',
            `قام أحد السكان بتقديم شكوى جديدة: "${issue.title || 'بدون عنوان'}"`,
            'issue'
          );
        }
      }
    } catch (pushErr) {
      console.error('Failed to dispatch addIssue push notification:', pushErr);
    }
  };

  const updateIssue = async (id: string, updates: Partial<Issue>) => {
    if (!supabase) return;
    const { error } = await supabase.from('issues').update(updates).eq('id', id);
    if (error) console.error(error);
    
    // Find the reporter from the existing issues state before reloading
    const targetIssue = state.issues.find(i => i.id === id);
    
    await loadData();

    // Send push notification to the reporter about the update
    if (targetIssue && targetIssue.reported_by) {
      try {
        const statusLabels: Record<string, string> = {
          'open': 'مفتوحة',
          'in_progress': 'قيد المتابعة والعمل',
          'resolved': 'تم حلها وإغلاقها'
        };
        const statusLabel = updates.status ? (statusLabels[updates.status] || updates.status) : 'قيد العمل';
        
        const freshTokens = await getAllRegisteredTokens();
        const reporterTokens = freshTokens.filter(t => t.user_id === targetIssue.reported_by);
        for (const t of reporterTokens) {
          await pushNotificationToToken(
            t.token,
            '🔧 تحديث على شكواك',
            `تغيرت حالة الشكوى "${updates.title || targetIssue.title}" إلى: ${statusLabel}`,
            'issue'
          );
        }
      } catch (pushErr) {
        console.error('Failed to dispatch updateIssue push notification:', pushErr);
      }
    }
  };

  const addMeeting = async (meeting: Partial<Meeting>) => {
    if (!supabase) return;
    const { error } = await supabase.from('meetings').insert([meeting]);
    if (error) console.error(error);
    await loadData();

    // Send push notification to ALL tenants/users about the meeting
    try {
      const freshTokens = await getAllRegisteredTokens();
      for (const t of freshTokens) {
        await pushNotificationToToken(
          t.token,
          '📅 اجتماع أو لجنة جديدة مقرر',
          meeting.title || 'تمت جدولة اجتماع جديد لسكان العمارة',
          'meeting'
        );
      }
    } catch (pushErr) {
      console.error('Failed to dispatch meeting push notification:', pushErr);
    }
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

        // Dispatch Firebase Push Notification to ALL registered tokens of all users
        try {
          const freshTokens = await getAllRegisteredTokens();
          for (const t of freshTokens) {
            await pushNotificationToToken(
              t.token,
              '📢 تعميم جديد من إدارة العمارة',
              newAnn.title || 'تم نشر تعميم جديد يرجى الاطلاع عليه',
              'announcement'
            );
          }
        } catch (pushErr) {
          console.error('Failed to dispatch announcement push notification:', pushErr);
        }
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
    
    let result = { success: true, simulated: true, message: "Local fallback" };
    
    // Send actual HTTP POST request to backend to send real Google FCM notification
    try {
      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokens: [token],
          title,
          body,
          type
        })
      });
      const data = await response.json();
      console.log('[FCM Backend Push Response]', data);
      result = data;
    } catch (err) {
      console.warn('[FCM Backend Push Error]', err);
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
    
    return result;
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
