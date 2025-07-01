// IndexedDB wrapper for offline data storage
class OfflineStorage {
  private dbName = 'LuckyPickDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('bets')) {
          db.createObjectStore('bets', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('results')) {
          db.createObjectStore('results', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('transactions')) {
          db.createObjectStore('transactions', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('user')) {
          db.createObjectStore('user', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('offlineActions')) {
          db.createObjectStore('offlineActions', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  async saveData(storeName: string, data: any): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getData(storeName: string, key?: string): Promise<any> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = key ? store.get(key) : store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async saveOfflineAction(action: any): Promise<void> {
    const actionWithTimestamp = {
      ...action,
      timestamp: new Date().toISOString(),
      synced: false
    };
    await this.saveData('offlineActions', actionWithTimestamp);
  }

  async getOfflineActions(): Promise<any[]> {
    const actions = await this.getData('offlineActions');
    return actions.filter((action: any) => !action.synced);
  }

  async markActionSynced(actionId: number): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineActions'], 'readwrite');
      const store = transaction.objectStore('offlineActions');
      const getRequest = store.get(actionId);

      getRequest.onsuccess = () => {
        const action = getRequest.result;
        if (action) {
          action.synced = true;
          const putRequest = store.put(action);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }
}

export const offlineStorage = new OfflineStorage();