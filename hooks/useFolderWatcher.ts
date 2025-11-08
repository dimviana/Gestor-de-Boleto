


import { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import * as api from '../services/api';

// This is an experimental browser feature.
// Add type definitions for the File System Access API to avoid TypeScript errors.
type PermissionState = 'granted' | 'denied' | 'prompt';

interface FileSystemHandlePermissionDescriptor {
    mode?: 'read' | 'readwrite';
}

interface FileSystemHandle {
    kind: 'file' | 'directory';
    name: string;
    isSameEntry(other: FileSystemHandle): Promise<boolean>;
    queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
    requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
    kind: 'directory';
    values: () => AsyncIterableIterator<FileSystemHandle>;
    queryPermission: (descriptor?: FileSystemHandlePermissionDescriptor) => Promise<PermissionState>;
    requestPermission: (descriptor?: FileSystemHandlePermissionDescriptor) => Promise<PermissionState>;
}

interface FileSystemFileHandle extends FileSystemHandle {
    kind: 'file';
    getFile: () => Promise<File>;
}

declare global {
    interface Window {
        showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
    }
}

const isApiSupported = 'showDirectoryPicker' in window && 'indexedDB' in window;

// --- IndexedDB Helper Functions ---
const DB_NAME = 'folder-watcher-db';
const STORE_NAME = 'handles-store';

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onerror = () => reject("Error opening IndexedDB");
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
};

const storeHandle = async (companyId: string, handle: FileSystemDirectoryHandle): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(handle, companyId);
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

const getHandle = async (companyId: string): Promise<FileSystemDirectoryHandle | null> => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(companyId);
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
};

const clearHandle = async (companyId: string): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(companyId);
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};
// --- End of IndexedDB Helpers ---


interface UseFolderWatcherProps {
  onFileUpload: (file: File) => void;
  disabled: boolean;
  companyId: string | null;
}

export const useFolderWatcher = ({ onFileUpload, disabled, companyId }: UseFolderWatcherProps) => {
    const { t } = useLanguage();
    const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
    const [error, setError] = useState<string | null>(null);
    const processedFiles = useRef<Set<string>>(new Set());
    const intervalId = useRef<number | null>(null);

    const stopWatching = useCallback(async () => {
        if (intervalId.current) {
            clearInterval(intervalId.current);
        }
        intervalId.current = null;
        if (directoryHandle && companyId) {
             try {
                await clearHandle(companyId);
                await api.clearCompanyMonitoredFolder(companyId);
            } catch (err) {
                console.error("Failed to clear monitoring state:", err);
            }
        }
        setDirectoryHandle(null);
        processedFiles.current.clear();
    }, [directoryHandle, companyId]);

    const scanDirectory = useCallback(async (handle: FileSystemDirectoryHandle) => {
        if (disabled) return;
        try {
            for await (const entry of handle.values()) {
                if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.pdf')) {
                    if (!processedFiles.current.has(entry.name)) {
                        processedFiles.current.add(entry.name);
                        const file = await (entry as FileSystemFileHandle).getFile();
                        onFileUpload(file);
                    }
                }
            }
        } catch (err) {
            console.error("Error scanning directory. Permission may have been revoked.", err);
            stopWatching();
        }
    }, [onFileUpload, disabled, stopWatching]);

    const startMonitoring = useCallback((handle: FileSystemDirectoryHandle) => {
        if (intervalId.current) clearInterval(intervalId.current);
        processedFiles.current.clear(); // Reset processed files on new monitoring
        
        scanDirectory(handle); // Initial scan
        intervalId.current = window.setInterval(() => {
            scanDirectory(handle);
        }, 10000); // Scan every 10 seconds
    }, [scanDirectory]);


    // Effect to resume monitoring on component mount / company change
    useEffect(() => {
        if (!isApiSupported || !companyId) {
            return;
        }

        const resumeMonitoring = async () => {
            try {
                const handle = await getHandle(companyId);
                if (handle) {
                    const permission = await handle.queryPermission({ mode: 'readwrite' });
                    if (permission === 'granted') {
                        setDirectoryHandle(handle);
                        startMonitoring(handle);
                    } else {
                        // Permission was revoked or expired
                        await clearHandle(companyId);
                        await api.clearCompanyMonitoredFolder(companyId);
                    }
                }
            } catch (err) {
                console.error("Error resuming monitoring:", err);
            }
        };

        resumeMonitoring();
        
        // Cleanup interval on unmount or when companyId changes
        return () => {
            if (intervalId.current) {
                clearInterval(intervalId.current);
            }
        };
    }, [companyId, startMonitoring]);


    const handleSelectFolder = async () => {
        if (disabled || !companyId) return;
        setError(null);

        try {
            const handle = await window.showDirectoryPicker();
            await storeHandle(companyId, handle);
            await api.setCompanyMonitoredFolder(companyId, handle.name);
            setDirectoryHandle(handle);
            startMonitoring(handle);
        } catch (err) {
            if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) {
                console.error("Directory Picker security error:", err);
                setError('folderWatcherCrossOriginError');
            } else if ((err as Error).name !== 'AbortError') {
                 console.error("Error selecting directory:", err);
                 setError('genericErrorText');
            }
        }
    };

    return {
        directoryHandle,
        error,
        disabled,
        handleSelectFolder,
        stopWatching
    };
};
