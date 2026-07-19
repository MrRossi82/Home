import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Profile, Apartment, Payment, Expense, Issue, Lookup, Meeting, MeetingEvaluation, AppNotification } from '../types';

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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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
      evaluateMeeting 
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
