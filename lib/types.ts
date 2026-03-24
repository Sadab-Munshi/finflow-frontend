export interface Transaction {
  id: string;
  user_id?: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  note: string;
  date: string;
  created_at?: string;
}

// Legacy Transaction type for migration/backward compatibility
export interface LegacyTransaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  categoryId: number;
  description: string;
  date: string;
  status: 'confirmed' | 'draft';
  source: 'manual' | 'nlp' | 'voice' | 'receipt' | 'pdf';
  receiptUrl: string | null;
  aiConfidence: number | null;
  createdAt: string;
}

export interface Budget {
  id: string;
  user_id?: string;
  category: string;
  amount: number;
  month: string;
  created_at?: string;
}

// Legacy Budget type for migration/backward compatibility
export interface LegacyBudget {
  id: string;
  categoryId: number;
  amount: number;
  period: 'weekly' | 'monthly';
  createdAt: string;
}

export interface User {
  name: string;
  email: string;
  language: 'en' | 'bn' | 'hi';
}

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense' | 'both';
  color: string;
}

export interface Insight {
  type: 'tip' | 'warning' | 'achievement' | 'trend';
  title: string;
  description: string;
}

export interface InsightsData {
  insights: Insight[];
  generatedAt: string;
}

export interface RateLimitData {
  count: number;
  resetAt: string;
}

export interface ParsedTransaction {
  amount: number;
  type: 'income' | 'expense';
  categoryId: number;
  description: string;
  date: string | null;
  confidence: number;
}

export interface Settings {
  id?: string;
  user_id?: string;
  language: string;
  currency: string;
  name: string;
  budget_alerts?: boolean;
  monthly_report?: boolean;
  need_help?: boolean;
  avatar_url?: string;
  telegram_chat_id?: string;
  welcome_email_sent?: boolean;
  updated_at?: string;
}

// Legacy Settings type for migration/backward compatibility
export interface LegacySettings {
  budgetAlerts: boolean;
  monthlyReports: boolean;
}

export type NotificationType = 'budget_alert' | 'transaction' | 'report' | 'system'

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  icon?: string;
  link?: string;
  read: boolean;
  shown: boolean;
  created_at: string;
}

export interface PushSubscription {
  id?: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent?: string;
  created_at?: string;
}
