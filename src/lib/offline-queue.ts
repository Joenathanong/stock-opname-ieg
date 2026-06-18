import Dexie, { Table } from 'dexie';
import { OfflineQueueItem } from '@/types';

class StockOpnameDB extends Dexie {
  offlineQueue!: Table<OfflineQueueItem>;
  constructor() {
    super('StockOpnameDB');
    this.version(1).stores({
      offlineQueue: '++id, type, createdAt, attempts',
    });
  }
}

export const db = typeof window !== 'undefined' ? new StockOpnameDB() : null;

export async function addToQueue(item: Omit<OfflineQueueItem, 'id'>): Promise<number | undefined> {
  if (!db) return undefined;
  const key = await db.offlineQueue.add(item as OfflineQueueItem);
  return key as number;
}

export async function getQueue(): Promise<OfflineQueueItem[]> {
  if (!db) return [];
  return await db.offlineQueue.orderBy('createdAt').toArray();
}

export async function removeFromQueue(id: number): Promise<void> {
  if (!db) return;
  await db.offlineQueue.delete(id);
}

export async function updateAttempts(id: number, attempts: number): Promise<void> {
  if (!db) return;
  await db.offlineQueue.update(id, { attempts, lastAttempt: Date.now() });
}

export async function getQueueCount(): Promise<number> {
  if (!db) return 0;
  return await db.offlineQueue.count();
}
