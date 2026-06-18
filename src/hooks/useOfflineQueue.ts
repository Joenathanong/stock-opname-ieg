'use client';
import { useState, useEffect, useCallback } from 'react';
import { getQueue, removeFromQueue, updateAttempts, getQueueCount } from '@/lib/offline-queue';

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const syncQueue = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const queue = await getQueue();
      for (const item of queue) {
        if (!item.id) continue;
        try {
          // Check for duplicates before saving
          const checkRes = await fetch('/api/sheets/check-duplicate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              barcode: (item.data as any).barcode,
              location: (item.data as any).location,
              sheet: item.type,
            }),
          });
          const checkData = checkRes.ok ? await checkRes.json() : { isDuplicate: false };

          const dataToSave = {
            ...item.data,
            potentialDouble: checkData.isDuplicate,
            notes: checkData.isDuplicate
              ? `${(item.data as any).notes ? (item.data as any).notes + ' | ' : ''}POTENSI DOUBLE - DARI OFFLINE QUEUE`
              : (item.data as any).notes
          };

          const endpoint = item.type === 'gudang-besar'
            ? '/api/sheets/gudang-besar'
            : '/api/sheets/gudang-kecil-transit';

          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSave),
          });

          if (res.ok) {
            await removeFromQueue(item.id);
          } else {
            await updateAttempts(item.id, item.attempts + 1);
          }
        } catch (e) {
          if (item.id) await updateAttempts(item.id, item.attempts + 1);
        }
      }
    } finally {
      setIsSyncing(false);
      const count = await getQueueCount();
      setQueueCount(count);
    }
  }, [isSyncing]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      syncQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load initial count
    getQueueCount().then(setQueueCount);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const refreshCount = useCallback(async () => {
    const count = await getQueueCount();
    setQueueCount(count);
  }, []);

  return { isOnline, queueCount, isSyncing, syncQueue, refreshCount };
}
