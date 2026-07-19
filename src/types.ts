export type Role = 'admin' | 'tenant';

export interface Profile {
  id: string;
  name: string;
  role: Role;
  phone: string | null;
  avatar_url: string | null;
}

export interface Lookup {
  id: string;
  category: string;
  value: string;
  label: string;
}

export interface Apartment {
  id: string;
  number: string;
  floor: string | null;
  tenant_id: string | null;
  tenant?: Profile;
}

export interface Payment {
  id: string;
  apartment_id: string;
  month: string;
  amount: number;
  status: 'paid' | 'unpaid';
  date_paid?: string;
  apartment?: Apartment;
  payment_method?: 'cash' | 'cliq' | null;
  verification_status?: 'none' | 'pending' | 'verified' | 'rejected' | null;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string;
  category_id: string | null;
  image_url: string | null;
  category?: Lookup;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  apartment_id: string | null;
  reported_by: string | null;
  is_anonymous: boolean;
  status: 'open' | 'in_progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  type_id: string | null;
  attachments: string[];
  created_at: string;
  resolved_at?: string;
  type?: Lookup;
  reporter?: Profile;
  apartment?: Apartment;
}

export interface Meeting {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  minutes: string | null;
  created_at: string;
}

export interface MeetingEvaluation {
  id: string;
  meeting_id: string;
  tenant_id: string;
  status: 'approved' | 'rejected' | 'conditional';
  reason: string | null;
  created_at: string;
  tenant?: Profile;
  rating?: number | null;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'issue' | 'expense' | 'meeting' | 'rent';
  created_at: string;
}

export interface IssueNote {
  id: string;
  author_name: string;
  author_role: Role;
  text: string;
  created_at: string;
  status_change?: string;
  communicated_party?: string;
}

export function parseIssueDescription(description: string): {
  cleanDescription: string;
  notes: IssueNote[];
} {
  if (!description) return { cleanDescription: '', notes: [] };
  const delimiter = '---NOTES---';
  const parts = description.split(delimiter);
  const cleanDescription = parts[0].trim();
  let notes: IssueNote[] = [];
  if (parts.length > 1) {
    try {
      notes = JSON.parse(parts[1].trim());
    } catch (e) {
      console.error('Error parsing notes:', e);
    }
  }
  return { cleanDescription, notes };
}

export function serializeIssueDescription(cleanDescription: string, notes: IssueNote[]): string {
  const delimiter = '---NOTES---';
  return `${cleanDescription}\n\n${delimiter}\n${JSON.stringify(notes)}`;
}

