// Image blobs live in IndexedDB (localStorage would blow its quota);
// chats only keep { id, width, height } metadata and reference these ids.

const DB_NAME = "rachits-assistant-images";
const STORE = "images";
const VERSION = 1;

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("idb_unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("idb_open_failed"));
  }).catch((error) => {
    dbPromise = null; // retry on next call
    throw error;
  });
  return dbPromise;
}

function withStore(mode, run) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const store = transaction.objectStore(STORE);
        let result;
        try {
          result = run(store);
        } catch (error) {
          reject(error);
          return;
        }
        transaction.oncomplete = () => resolve(result?.result ?? result);
        transaction.onerror = () =>
          reject(transaction.error || new Error("idb_tx_failed"));
        transaction.onabort = () =>
          reject(transaction.error || new Error("idb_tx_aborted"));
      }),
  );
}

// Never throws — chat saving must keep working if storage is full/blocked.
export async function putImage(id, blob) {
  try {
    await withStore("readwrite", (store) => store.put(blob, id));
    return true;
  } catch {
    return false;
  }
}

export async function getImage(id) {
  try {
    return await withStore("readonly", (store) => store.get(id));
  } catch {
    return null;
  }
}

export async function deleteImage(id) {
  try {
    await withStore("readwrite", (store) => store.delete(id));
    return true;
  } catch {
    return false;
  }
}
