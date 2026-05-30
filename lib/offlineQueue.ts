import { Transaction, Budget, Settings } from './types'

const DB_NAME = 'finflow_offline'
const DB_VERSION = 2
const STORE_NAME = 'offline_transactions'
const CACHED_TRANSACTIONS_STORE = 'cached_transactions'
const CACHED_BUDGETS_STORE = 'cached_budgets'
const CACHED_SETTINGS_STORE = 'cached_settings'

type QueuedTransaction = Omit<Transaction, 'id' | 'created_at'> & { queuedAt: string }

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB not available on server'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      // Version 1: offline queue
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'queuedAt' })
      }
      // Version 2: cached data stores
      if (!db.objectStoreNames.contains(CACHED_TRANSACTIONS_STORE)) {
        db.createObjectStore(CACHED_TRANSACTIONS_STORE)
      }
      if (!db.objectStoreNames.contains(CACHED_BUDGETS_STORE)) {
        db.createObjectStore(CACHED_BUDGETS_STORE)
      }
      if (!db.objectStoreNames.contains(CACHED_SETTINGS_STORE)) {
        db.createObjectStore(CACHED_SETTINGS_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// ============ OFFLINE QUEUE (existing) ============

export async function enqueueTransaction(tx: Omit<Transaction, 'id' | 'created_at'>): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const txn = db.transaction(STORE_NAME, 'readwrite')
    const store = txn.objectStore(STORE_NAME)
    const record: QueuedTransaction = { ...tx, queuedAt: new Date().toISOString() }
    store.add(record)
    txn.oncomplete = () => resolve()
    txn.onerror = () => reject(txn.error)
  })
}

export async function dequeueAll(): Promise<QueuedTransaction[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const txn = db.transaction(STORE_NAME, 'readonly')
    const store = txn.objectStore(STORE_NAME)
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result as QueuedTransaction[])
    request.onerror = () => reject(request.error)
  })
}

export async function removeItem(queuedAt: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const txn = db.transaction(STORE_NAME, 'readwrite')
    const store = txn.objectStore(STORE_NAME)
    store.delete(queuedAt)
    txn.oncomplete = () => resolve()
    txn.onerror = () => reject(txn.error)
  })
}

export async function clearQueue(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const txn = db.transaction(STORE_NAME, 'readwrite')
    const store = txn.objectStore(STORE_NAME)
    store.clear()
    txn.oncomplete = () => resolve()
    txn.onerror = () => reject(txn.error)
  })
}

export async function getQueueCount(): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const txn = db.transaction(STORE_NAME, 'readonly')
    const store = txn.objectStore(STORE_NAME)
    const request = store.count()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// ============ CACHED DATA (new) ============

export async function cacheTransactions(data: Transaction[]): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const txn = db.transaction(CACHED_TRANSACTIONS_STORE, 'readwrite')
    const store = txn.objectStore(CACHED_TRANSACTIONS_STORE)
    store.put(data, 'all')
    txn.oncomplete = () => resolve()
    txn.onerror = () => reject(txn.error)
  })
}

export async function getCachedTransactions(): Promise<Transaction[] | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const txn = db.transaction(CACHED_TRANSACTIONS_STORE, 'readonly')
    const store = txn.objectStore(CACHED_TRANSACTIONS_STORE)
    const request = store.get('all')
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

export async function cacheBudgets(data: Budget[]): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const txn = db.transaction(CACHED_BUDGETS_STORE, 'readwrite')
    const store = txn.objectStore(CACHED_BUDGETS_STORE)
    store.put(data, 'all')
    txn.oncomplete = () => resolve()
    txn.onerror = () => reject(txn.error)
  })
}

export async function getCachedBudgets(): Promise<Budget[] | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const txn = db.transaction(CACHED_BUDGETS_STORE, 'readonly')
    const store = txn.objectStore(CACHED_BUDGETS_STORE)
    const request = store.get('all')
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

export async function cacheSettings(data: Settings): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const txn = db.transaction(CACHED_SETTINGS_STORE, 'readwrite')
    const store = txn.objectStore(CACHED_SETTINGS_STORE)
    store.put(data, 'user')
    txn.oncomplete = () => resolve()
    txn.onerror = () => reject(txn.error)
  })
}

export async function getCachedSettings(): Promise<Settings | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const txn = db.transaction(CACHED_SETTINGS_STORE, 'readonly')
    const store = txn.objectStore(CACHED_SETTINGS_STORE)
    const request = store.get('user')
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}
