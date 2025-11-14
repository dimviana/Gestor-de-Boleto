const DB_NAME = 'boleto-manager-offline-db';
const STORE_NAME = 'upload-queue';
const DB_VERSION = 1;

export interface QueuedFile {
  id: string;
  file: File;
  companyId: string;
  fileName: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

const getDB = (): Promise<IDBDatabase> => {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') {
                reject('IndexedDB is not supported in this browser.');
                return;
            }
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject('Error opening IndexedDB.');
            };

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };
        });
    }
    return dbPromise;
};

export const queueFileForUpload = async (file: File, companyId: string): Promise<QueuedFile> => {
    const db = await getDB();
    const queuedFile: QueuedFile = {
        id: crypto.randomUUID(),
        file,
        companyId,
        fileName: file.name,
    };

    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(queuedFile);

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve(queuedFile);
        tx.onerror = () => reject(tx.error);
    });
};

export const getQueuedFiles = async (): Promise<QueuedFile[]> => {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const deleteQueuedFile = async (id: string): Promise<void> => {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};
