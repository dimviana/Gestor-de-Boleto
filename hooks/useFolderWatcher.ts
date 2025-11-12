import { useState, useEffect, useCallback, useRef } from 'react';
import { useNotification } from '../contexts/NotificationContext';

// IndexedDB helper functions
const DB_NAME = 'folder-watcher-db';
const STORE_NAME = 'folder-handles';

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

const setHandle = async (key: string, value: any) => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(value, key);
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const getHandle = async (key: string): Promise<any> => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const request = store.get(key);

  return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
  });
};

const deleteHandle = async (key: string) => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(key);
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// Main hook
export const useFolderWatcher = (onFileUpload: (files: File[]) => void) => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const { addNotification } = useNotification();
  const intervalRef = useRef<number | null>(null);
  const folderHandleRef = useRef<any | null>(null);
  const processedFilesRef = useRef<Set<string>>(new Set());

  const verifyPermission = async (handle: any, readWrite = false) => {
    const options: any = {};
    if (readWrite) {
      options.mode = 'readwrite';
    }
    if ((await handle.queryPermission(options)) === 'granted') {
      return true;
    }
    if ((await handle.requestPermission(options)) === 'granted') {
      return true;
    }
    return false;
  };

  const stopMonitoring = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsMonitoring(false);
    setFolderName(null);
    folderHandleRef.current = null;
    processedFilesRef.current.clear();
    await deleteHandle('folderHandle');
    addNotification('Monitoramento de pasta desativado.', 'info');
  }, [addNotification]);

  const processFolder = useCallback(async () => {
    if (!folderHandleRef.current) return;
    try {
      const filesToUpload: File[] = [];
      const today = new Date();

      for await (const entry of folderHandleRef.current.values()) {
        if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.pdf')) {
          if (!processedFilesRef.current.has(entry.name)) {
            const file = await entry.getFile();
            const fileDate = new Date(file.lastModified);

            // Check if the file's last modified date is today
            const isToday = fileDate.getFullYear() === today.getFullYear() &&
                            fileDate.getMonth() === today.getMonth() &&
                            fileDate.getDate() === today.getDate();

            if (isToday) {
              filesToUpload.push(file);
              processedFilesRef.current.add(entry.name);
            }
          }
        }
      }
      if (filesToUpload.length > 0) {
        onFileUpload(filesToUpload);
      }
    } catch (e: any) {
      console.error("Error processing folder:", e);
      if (e.name === 'NotAllowedError') {
         setError('folderWatcherCrossOriginError');
         setIsPermissionDenied(true);
         await stopMonitoring();
      }
    }
  }, [onFileUpload, stopMonitoring]);

  const startMonitoring = useCallback(async (handle?: any) => {
    setError(null);
    setIsPermissionDenied(false);

    try {
      const dirHandle = handle || await (window as any).showDirectoryPicker();
      if (!dirHandle) return;

      const permissionGranted = await verifyPermission(dirHandle);
      if (!permissionGranted) {
        setError('Permissão negada para acessar a pasta.');
        return;
      }

      folderHandleRef.current = dirHandle;
      await setHandle('folderHandle', dirHandle);

      setFolderName(dirHandle.name);
      setIsMonitoring(true);
      processedFilesRef.current.clear();
      
      await processFolder(); // Initial scan
      
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = window.setInterval(processFolder, 10000); // Poll every 10 seconds

    } catch (e: any) {
      if (e.name === 'AbortError') {
        // User cancelled the picker, do nothing
      } else {
        // For other errors, log them for debugging but do not change the state.
        // This prevents the button from disappearing and allows the user to try again.
        console.error("Error starting folder monitoring:", e);
      }
    }
  }, [processFolder]);
  
  const checkForExistingPermission = useCallback(async () => {
    try {
        const handle = await getHandle('folderHandle');
        if (handle) {
            const hasPermission = await verifyPermission(handle, false);
            if (hasPermission) {
                // Permission already granted, we can start monitoring
                await startMonitoring(handle);
            } else {
                // We have a handle, but no permission. Prompt user to re-enable.
                setFolderName(handle.name);
                setIsPermissionDenied(true);
            }
        }
    } catch (e) {
        console.error("Error checking for existing permission:", e);
    }
  }, [startMonitoring]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
        checkForExistingPermission();
    } else {
        setError('folderWatcherUnsupported');
    }
    
    return () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
    };
  }, [checkForExistingPermission]);

  return { isMonitoring, folderName, error, isPermissionDenied, startMonitoring, stopMonitoring, reselectFolder: startMonitoring };
};