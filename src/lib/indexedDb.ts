import { StoredRecording } from '../types';

const DB_NAME = 'record_hachihi_db';
const DB_VERSION = 2;
const STORE_RECORDINGS = 'recordings';
const STORE_SETTINGS = 'settings';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_RECORDINGS)) {
        const store = db.createObjectStore(STORE_RECORDINGS, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveRecordingToDb(recording: StoredRecording): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RECORDINGS, 'readwrite');
    const store = tx.objectStore(STORE_RECORDINGS);
    const req = store.put(recording);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAllRecordingsFromDb(): Promise<StoredRecording[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RECORDINGS, 'readonly');
    const store = tx.objectStore(STORE_RECORDINGS);
    const index = store.index('createdAt');
    const req = index.openCursor(null, 'prev'); // sort newest first
    const results: StoredRecording[] = [];

    req.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteRecordingFromDb(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RECORDINGS, 'readwrite');
    const store = tx.objectStore(STORE_RECORDINGS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function updateRecordingNameInDb(id: string, newName: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RECORDINGS, 'readwrite');
    const store = tx.objectStore(STORE_RECORDINGS);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const data = getReq.result;
      if (data) {
        data.name = newName;
        const putReq = store.put(data);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      } else {
        reject(new Error('Recording not found'));
      }
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function clearAllRecordingsFromDb(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RECORDINGS, 'readwrite');
    const store = tx.objectStore(STORE_RECORDINGS);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Directory handle persistence for automatic saving
export async function saveDefaultDirectoryHandle(handle: any, folderName: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, 'readwrite');
    const store = tx.objectStore(STORE_SETTINGS);
    store.put(handle, 'default_directory_handle');
    store.put(folderName, 'default_directory_name');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getDefaultDirectoryHandle(): Promise<{ handle: any | null; name: string | null }> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SETTINGS, 'readonly');
      const store = tx.objectStore(STORE_SETTINGS);
      const reqHandle = store.get('default_directory_handle');
      const reqName = store.get('default_directory_name');

      let handle: any = null;
      let name: string | null = null;

      reqHandle.onsuccess = () => {
        handle = reqHandle.result || null;
      };
      reqName.onsuccess = () => {
        name = reqName.result || null;
      };

      tx.oncomplete = () => {
        resolve({ handle, name });
      };
      tx.onerror = () => {
        resolve({ handle: null, name: null });
      };
    });
  } catch (err) {
    return { handle: null, name: null };
  }
}

export async function clearDefaultDirectoryHandle(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, 'readwrite');
    const store = tx.objectStore(STORE_SETTINGS);
    store.delete('default_directory_handle');
    store.delete('default_directory_name');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
