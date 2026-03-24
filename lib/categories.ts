import { Category } from './types';

export const categories: Category[] = [
  { id: 1, name: "Food & Dining", type: "expense", color: "#ef4444" },
  { id: 2, name: "Transport", type: "expense", color: "#f97316" },
  { id: 3, name: "Shopping", type: "expense", color: "#8b5cf6" },
  { id: 4, name: "Bills & Utilities", type: "expense", color: "#06b6d4" },
  { id: 5, name: "Entertainment", type: "expense", color: "#ec4899" },
  { id: 6, name: "Health", type: "expense", color: "#14b8a6" },
  { id: 7, name: "Education", type: "expense", color: "#6366f1" },
  { id: 8, name: "Rent", type: "expense", color: "#78716c" },
  { id: 9, name: "Groceries", type: "expense", color: "#84cc16" },
  { id: 10, name: "Personal Care", type: "expense", color: "#f43f5e" },
  { id: 11, name: "Salary", type: "income", color: "#22c55e" },
  { id: 12, name: "Freelance", type: "income", color: "#10b981" },
  { id: 13, name: "Business", type: "income", color: "#059669" },
  { id: 14, name: "Investment", type: "income", color: "#0d9488" },
  { id: 15, name: "Gift", type: "both", color: "#a855f7" },
  { id: 16, name: "Other", type: "both", color: "#6b7280" },
];

export const getCategoryById = (id: number): Category | undefined => {
  return categories.find(c => c.id === id);
};

export const getCategoriesByType = (type: 'income' | 'expense'): Category[] => {
  return categories.filter(c => c.type === type || c.type === 'both');
};

export const getExpenseCategories = (): Category[] => {
  return categories.filter(c => c.type === 'expense' || c.type === 'both');
};

export const getIncomeCategories = (): Category[] => {
  return categories.filter(c => c.type === 'income' || c.type === 'both');
};

export const getCategoryByName = (name: string): Category | undefined => {
  if (!name) return undefined;
  const normalized = name.trim().toLowerCase();
  return categories.find(c => c.name.toLowerCase() === normalized);
};

export const getCategoryIdByName = (name: string): number => {
  if (!name) return 16;
  const normalized = name.trim().toLowerCase();
  const category = categories.find(c => c.name.toLowerCase() === normalized);
  return category?.id || 16; // 16 is 'Other'
};

export const getCategoryNameById = (id: number): string => {
  const category = categories.find(c => c.id === id);
  return category?.name || 'Other';
};
