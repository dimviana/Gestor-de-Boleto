
import { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface UseFolderWatcherProps {
  onFileUpload: (file: File) => void;
  disabled: boolean;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
    kind: 'directory';
    values: () => AsyncIterableIterator<FileSystemHandle>;
}

interface FileSystemFileHandle extends FileSystemHandle {
    kind: 'file';
    getFile: () => Promise<File>;
}

export const useFolderWatcher = ({ onFileUpload, disabled }: UseFolderWatcherProps) => {
    const { t } = useLanguage();
    const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
    const [error, setError] = useState<string | null>(null);
    const processedFiles = useRef<Set<string>>(new Set());
    const intervalId = useRef<number | null>(null);

    const stopWatching = useCallback(() => {
        if (intervalId.current) {
            clearInterval(intervalId.current);
        }
        intervalId.current = null;
        setDirectoryHandle(null);
        processedFiles.current.clear();
    }, []);

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
        } catch (error) {
            console.error("Error scanning directory. Permission may have been revoked.", error);
            stopWatching();
        }
    }, [onFileUpload, disabled, stopWatching]);

    const handleSelectFolder = async () => {
        setError(null);
        try {
            const handle = await window.showDirectoryPicker();
            stopWatching();
            setDirectoryHandle(handle);
            
            await scanDirectory(handle); 
            
            intervalId.current = window.setInterval(() => {
                scanDirectory(handle);
            }, 10000);
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

    useEffect(() => {
        return () => stopWatching();
    }, [stopWatching]);

    return {
        directoryHandle,
        error,
        disabled,
        handleSelectFolder,
        stopWatching
    };
};
