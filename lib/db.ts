import { createClient } from '@/lib/supabase/client'
import { Transaction, Budget, Settings } from '@/lib/types'
import { getCategoryById, categories } from '@/lib/categories'

const supabase = createClient()

// TRANSACTIONS
export async function getTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) { console.error(error); return [] }
  return data || []
}

export async function addTransaction(transaction: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('No user logged in')
    return null
  }
  
  // Get current time in IST (Asia/Kolkata)
  const istNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
  const istDate = new Date(istNow)
  
  const payload = {
    user_id: user.id,
    amount: Number(transaction.amount),
    type: transaction.type,
    category: transaction.category,
    note: transaction.note || '',
    date: transaction.date,
    created_at: istDate.toISOString(),
  }
  
  console.log('Inserting transaction:', payload)
  
  const { data, error } = await supabase
    .from('transactions')
    .insert(payload)
    .select()
    .single()
    
  if (error) {
    console.error('Supabase insert error:', JSON.stringify(error))
    return null
  }
  return data
}

export async function updateTransaction(id: string, updates: Partial<Transaction>): Promise<boolean> {
  const { error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
  return !error
}

export async function deleteTransaction(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
  return !error
}

export async function deleteTransactions(ids: string[]): Promise<boolean> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .in('id', ids)
  return !error
}

export async function getTransactionById(id: string): Promise<Transaction | null> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single()
  if (error) { console.error(error); return null }
  return data
}

// BUDGETS
export async function getBudgets(): Promise<Budget[]> {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) { console.error(error); return [] }
  return data || []
}

export async function saveBudget(budget: Omit<Budget, 'id' | 'created_at'>): Promise<Budget | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('budgets')
    .insert({ ...budget, user_id: user.id })
    .select()
    .single()
  if (error) { console.error(error); return null }
  return data
}

export async function updateBudget(id: string, updates: Partial<Budget>): Promise<boolean> {
  const { error } = await supabase
    .from('budgets')
    .update(updates)
    .eq('id', id)
  return !error
}

export async function upsertBudget(budget: Omit<Budget, 'id' | 'created_at'>): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { error } = await supabase
    .from('budgets')
    .upsert({ ...budget, user_id: user.id }, { onConflict: 'user_id,category,month' })
  return !error
}

export async function deleteBudget(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', id)
  return !error
}

export async function getBudgetById(id: string): Promise<Budget | null> {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('id', id)
    .single()
  if (error) { console.error(error); return null }
  return data
}

// SETTINGS
export async function getSettings(): Promise<Settings | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', user.id)
    .single()
  if (error) {
    // If no settings found, return default
    if (error.code === 'PGRST116') {
      return { language: 'en', currency: 'INR', name: '' }
    }
    console.error(error)
    return null
  }
  return data
}

export async function upsertSettings(settings: { language?: string; currency?: string; name?: string }): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { error } = await supabase
    .from('settings')
    .upsert({ ...settings, user_id: user.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  return !error
}

export async function updateSettings(updates: Partial<Settings>): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { error } = await supabase
    .from('settings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
  return !error
}

// Helper functions for backward compatibility with categoryId
export function getCategoryNameById(categoryId: number): string {
  const category = getCategoryById(categoryId)
  return category?.name || 'Other'
}

export function getCategoryIdByName(categoryName: string): number {
  const category = categories.find(c => c.name === categoryName)
  return category?.id || 16 // 16 is 'Other'
}
