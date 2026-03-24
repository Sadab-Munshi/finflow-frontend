import { Transaction, Budget, User, InsightsData, RateLimitData, Settings } from './types';

export function getUserId(): string {
  if (typeof window === 'undefined') return 'anonymous';
  return localStorage.getItem('finflow_current_user_id') || 'anonymous';
}

const getKeys = (userId: string) => ({
  TRANSACTIONS: `finflow_${userId}_transactions`,
  BUDGETS: `finflow_${userId}_budgets`,
  USER: `finflow_${userId}_user`,
  INSIGHTS: `finflow_${userId}_insights`,
  RATE_LIMIT: `finflow_${userId}_rate_limit`,
  SETTINGS: `finflow_${userId}_settings`,
  INITIALIZED: `finflow_${userId}_initialized`,
});

export function initializeStorage(): void {
  if (typeof window === 'undefined') return;
  const keys = getKeys(getUserId());
  const initialized = localStorage.getItem(keys.INITIALIZED);
  if (!initialized) {
    const defaultUser: User = { name: 'Demo User', email: 'demo@finflow.app', language: 'en' };
    localStorage.setItem(keys.TRANSACTIONS, JSON.stringify([]));
    localStorage.setItem(keys.BUDGETS, JSON.stringify([]));
    localStorage.setItem(keys.USER, JSON.stringify(defaultUser));
    localStorage.setItem(keys.SETTINGS, JSON.stringify({ budgetAlerts: true, monthlyReports: true }));
    localStorage.setItem(keys.INITIALIZED, 'true');
  }
}

export function getTransactions(): Transaction[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(getKeys(getUserId()).TRANSACTIONS);
  return data ? JSON.parse(data) : [];
}

export function saveTransaction(transaction: Transaction): void {
  const transactions = getTransactions();
  transactions.push(transaction);
  localStorage.setItem(getKeys(getUserId()).TRANSACTIONS, JSON.stringify(transactions));
}

export function updateTransaction(id: string, updates: Partial<Transaction>): void {
  const transactions = getTransactions();
  const index = transactions.findIndex(t => t.id === id);
  if (index !== -1) {
    transactions[index] = { ...transactions[index], ...updates };
    localStorage.setItem(getKeys(getUserId()).TRANSACTIONS, JSON.stringify(transactions));
  }
}

export function deleteTransaction(id: string): void {
  const transactions = getTransactions().filter(t => t.id !== id);
  localStorage.setItem(getKeys(getUserId()).TRANSACTIONS, JSON.stringify(transactions));
}

export function deleteTransactions(ids: string[]): void {
  const transactions = getTransactions().filter(t => !ids.includes(t.id));
  localStorage.setItem(getKeys(getUserId()).TRANSACTIONS, JSON.stringify(transactions));
}

export function getTransactionById(id: string): Transaction | undefined {
  return getTransactions().find(t => t.id === id);
}

export function getBudgets(): Budget[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(getKeys(getUserId()).BUDGETS);
  return data ? JSON.parse(data) : [];
}

export function saveBudget(budget: Budget): void {
  const budgets = getBudgets();
  budgets.push(budget);
  localStorage.setItem(getKeys(getUserId()).BUDGETS, JSON.stringify(budgets));
}

export function updateBudget(id: string, updates: Partial<Budget>): void {
  const budgets = getBudgets();
  const index = budgets.findIndex(b => b.id === id);
  if (index !== -1) {
    budgets[index] = { ...budgets[index], ...updates };
    localStorage.setItem(getKeys(getUserId()).BUDGETS, JSON.stringify(budgets));
  }
}

export function deleteBudget(id: string): void {
  const budgets = getBudgets().filter(b => b.id !== id);
  localStorage.setItem(getKeys(getUserId()).BUDGETS, JSON.stringify(budgets));
}

export function getBudgetById(id: string): Budget | undefined {
  return getBudgets().find(b => b.id === id);
}

export function getUser(): User {
  if (typeof window === 'undefined') return { name: 'User', email: '', language: 'en' };
  const data = localStorage.getItem(getKeys(getUserId()).USER);
  return data ? JSON.parse(data) : { name: 'Demo User', email: 'demo@finflow.app', language: 'en' };
}

export function updateUser(updates: Partial<User>): void {
  const user = getUser();
  localStorage.setItem(getKeys(getUserId()).USER, JSON.stringify({ ...user, ...updates }));
}

export function getSettings(): Settings {
  if (typeof window === 'undefined') return { budgetAlerts: true, monthlyReports: true };
  const data = localStorage.getItem(getKeys(getUserId()).SETTINGS);
  return data ? JSON.parse(data) : { budgetAlerts: true, monthlyReports: true };
}

export function updateSettings(updates: Partial<Settings>): void {
  const settings = getSettings();
  localStorage.setItem(getKeys(getUserId()).SETTINGS, JSON.stringify({ ...settings, ...updates }));
}

export function getInsights(): InsightsData | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(getKeys(getUserId()).INSIGHTS);
  return data ? JSON.parse(data) : null;
}

export function saveInsights(insights: InsightsData): void {
  localStorage.setItem(getKeys(getUserId()).INSIGHTS, JSON.stringify(insights));
}

export function getRateLimit(): RateLimitData {
  if (typeof window === 'undefined') return { count: 0, resetAt: new Date().toISOString() };
  const keys = getKeys(getUserId());
  const data = localStorage.getItem(keys.RATE_LIMIT);
  if (data) {
    const parsed = JSON.parse(data);
    const resetAt = new Date(parsed.resetAt);
    if (new Date() > resetAt) {
      const newData: RateLimitData = {
        count: 0,
        resetAt: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
      };
      localStorage.setItem(keys.RATE_LIMIT, JSON.stringify(newData));
      return newData;
    }
    return parsed;
  }
  const newData: RateLimitData = {
    count: 0,
    resetAt: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
  };
  localStorage.setItem(keys.RATE_LIMIT, JSON.stringify(newData));
  return newData;
}

export function incrementRateLimit(): boolean {
  const keys = getKeys(getUserId());
  const rateLimit = getRateLimit();
  if (rateLimit.count >= 3) return false;
  rateLimit.count++;
  localStorage.setItem(keys.RATE_LIMIT, JSON.stringify(rateLimit));
  return true;
}

export function exportAllData(): string {
  return JSON.stringify({
    app: 'FinFlow',
    version: '1.0',
    exportedAt: new Date().toLocaleDateString('en-IN'),
    transactions: getTransactions(),
    budgets: getBudgets(),
    user: getUser(),
  }, null, 2);
}

export function importData(jsonData: string): { transactions: number; budgets: number; skipped: number } {
  const data = JSON.parse(jsonData);
  const existingTransactions = getTransactions();
  const existingBudgets = getBudgets();
  const keys = getKeys(getUserId());

  let transactionsAdded = 0;
  let budgetsAdded = 0;
  let skipped = 0;

  if (data.transactions && Array.isArray(data.transactions)) {
    for (const t of data.transactions) {
      const isDuplicate = existingTransactions.some(
        et => et.date === t.date && et.amount === t.amount && et.description === t.description
      );
      if (!isDuplicate) {
        existingTransactions.push(t);
        transactionsAdded++;
      } else {
        skipped++;
      }
    }
    localStorage.setItem(keys.TRANSACTIONS, JSON.stringify(existingTransactions));
  }

  if (data.budgets && Array.isArray(data.budgets)) {
    for (const b of data.budgets) {
      const isDuplicate = existingBudgets.some(
        eb => eb.categoryId === b.categoryId && eb.period === b.period
      );
      if (!isDuplicate) {
        existingBudgets.push(b);
        budgetsAdded++;
      } else {
        skipped++;
      }
    }
    localStorage.setItem(keys.BUDGETS, JSON.stringify(existingBudgets));
  }

  if (data.user) updateUser(data.user);

  return { transactions: transactionsAdded, budgets: budgetsAdded, skipped };
}

export function clearAllData(): void {
  const keys = getKeys(getUserId());
  Object.values(keys).forEach(key => localStorage.removeItem(key));
}
