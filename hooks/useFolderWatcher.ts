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
    // FIX: Add a defensive check to ensure the handle has the required methods.
    // Handles retrieved from IndexedDB may not be full-featured FileSystemDirectoryHandle objects,
    // as serialization can strip methods.
    if (typeof handle?.queryPermission !== 'function' || typeof handle?.requestPermission !== 'function') {
        console.warn('The provided handle is not a valid FileSystemHandle. Permissions cannot be verified without user interaction.');
        // Return false to indicate that permission cannot be verified/granted for this handle
        return false;
    }

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
      for await (const entry of folderHandleRef.current.values()) {
        if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.pdf')) {
          if (!processedFilesRef.current.has(entry.name)) {
            const file = await entry.getFile();
            filesToUpload.push(file);
            processedFilesRef.current.add(entry.name);
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
            // Check if the stored handle is a "live" FileSystemDirectoryHandle with methods
            if (typeof handle?.queryPermission === 'function' && typeof handle?.requestPermission === 'function') {
                const hasPermission = await verifyPermission(handle, false);
                if (hasPermission) {
                    await startMonitoring(handle);
                } else {
                    // Handle is valid but permission revoked (not the TypeError case)
                    setFolderName(handle.name);
                    setIsPermissionDenied(true);
                }
            } else {
                // Stored handle is a plain object, not a live FileSystemDirectoryHandle. It's invalid.
                console.warn('Stored folder handle is invalid (missing methods), requesting user to re-select.');
                await deleteHandle('folderHandle'); // Clear the invalid handle
                setFolderName(null); // Clear folder name from state
                setIsPermissionDenied(false); // Reset permission denied state
            }
        }
    } catch (e) {
        console.error("Error checking for existing permission:", e);
        // If an error occurs during permission check, assume permission is denied for now
        setFolderName(null);
        setIsPermissionDenied(false);
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