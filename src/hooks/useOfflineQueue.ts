import { useState, useEffect } from 'react';
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { useFirebase } from './useFirebase';

interface QueueItem {
    id: string;
    file: File;
    path: string;
    timestamp: number;
}

interface MyDB extends DBSchema {
    'offline-queue': {
        key: string;
        value: QueueItem;
    };
}

const DB_NAME = 'constructrack-offline';
const STORE_NAME = 'offline-queue';

export const useOfflineQueue = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'synced'>('idle');
    const [pendingCount, setPendingCount] = useState(0);
    const { uploadImage } = useFirebase();

    // Database Helper
    const getDB = async (): Promise<IDBPDatabase<MyDB>> => {
        return openDB<MyDB>(DB_NAME, 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            },
        });
    };

    // Sync Logic
    const syncQueue = async () => {
        if (!navigator.onLine) return;

        setSyncStatus('syncing');
        try {
            const db = await getDB();
            const items = await db.getAll(STORE_NAME);

            if (items.length === 0) {
                setSyncStatus('idle');
                return;
            }

            for (const item of items) {
                try {
                    // Attempt upload
                    await uploadImage(item.file, item.path);
                    // Remove from queue on success
                    await db.delete(STORE_NAME, item.id);
                } catch (error) {
                    console.error(`Failed to sync item ${item.id}:`, error);
                    // Keep in queue to retry later
                }
            }

            // Check if anything remains
            const remaining = await db.getAll(STORE_NAME);
            setPendingCount(remaining.length);
            setSyncStatus(remaining.length === 0 ? 'synced' : 'error');

        } catch (err) {
            console.error('Sync failed:', err);
            setSyncStatus('error');
        }
    };

    // Update online status and trigger sync
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            syncQueue();
        };
        const handleOffline = () => {
            setIsOnline(false);
            setSyncStatus('idle');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial check
        (async () => {
            const db = await getDB();
            const count = await db.count(STORE_NAME);
            setPendingCount(count);
            if (navigator.onLine && count > 0) {
                syncQueue();
            }
        })();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const addToQueue = async (file: File, path: string): Promise<void> => {
        if (isOnline) {
            try {
                setSyncStatus('syncing');
                await uploadImage(file, path);
                setSyncStatus('synced');
                return;
            } catch (err) {
                console.warn('Upload failed, falling back to offline queue', err);
                // Fallthrough to add to queue
            }
        }

        const item: QueueItem = {
            id: crypto.randomUUID(),
            file,
            path,
            timestamp: Date.now(),
        };

        const db = await getDB();
        await db.put(STORE_NAME, item);
        const count = await db.count(STORE_NAME);
        setPendingCount(count);
        setSyncStatus('idle'); // waiting for connection
    };

    return {
        isOnline,
        syncStatus,
        pendingCount,
        addToQueue,
        retrySync: syncQueue
    };
};
