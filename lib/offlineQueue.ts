import { Transaction } from './types'

const DB_NAME = 'finflow_offline'
const STORE_NAME = 'offline_transactions'
const DB_VERSION = 1

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
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'queuedAt' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

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
