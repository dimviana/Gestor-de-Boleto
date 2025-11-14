import { useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';
import * as offlineService from '../services/offlineService';
import { QueuedFile } from '../services/offlineService';

interface UseOfflineSyncProps {
    onSyncStart: (item: QueuedFile) => void;
    onSyncSuccess: (item: QueuedFile) => void;
    onSyncError: (item: QueuedFile, error: Error) => void;
}

export const useOfflineSync = ({ onSyncStart, onSyncSuccess, onSyncError }: UseOfflineSyncProps) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const syncQueuedFiles = useCallback(async () => {
        if (!navigator.onLine) return;

        console.log('Connection restored. Starting sync...');
        let queuedFiles: QueuedFile[];
        try {
            queuedFiles = await offlineService.getQueuedFiles();
        } catch (e: any) {
            console.error("Failed to get queued files from IndexedDB:", e);
            return;
        }


        if (queuedFiles.length === 0) {
            console.log('No files in queue to sync.');
            return;
        }

        console.log(`Syncing ${queuedFiles.length} files...`);

        for (const item of queuedFiles) {
            try {
                onSyncStart(item);
                const onProgress = (progress: number) => {
                    // This callback is required by the API but not used for background sync.
                };
                await api.uploadAndProcessBoleto(item.file, item.companyId, onProgress);
                await offlineService.deleteQueuedFile(item.id);
                onSyncSuccess(item);
            } catch (error: any) {
                console.error(`Failed to sync file ${item.fileName}:`, error);
                onSyncError(item, error);
                // Stop on the first error to avoid spamming the server if there's a persistent issue.
                break;
            }
        }
    }, [onSyncStart, onSyncSuccess, onSyncError]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            syncQueuedFiles();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial sync check on hook mount if online
        if (navigator.onLine) {
            syncQueuedFiles();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [syncQueuedFiles]);

    return { isOnline };
};
