import { ContractRecord, HistoricalBatch, ExtractionProviderConfig } from '../types';

const DB_NAME = 'HR_TIMESHEET_DB';
const DB_VERSION = 1;
const STORE_BATCHES = 'batches';
const STORE_CONTRACTS = 'contracts';
const STORE_CONFIG = 'config';

const DEFAULT_CONFIG: ExtractionProviderConfig = {
  activeProvider: 'vector-pdf',
  enableOcrFallback: false,
  enableDocAiFallback: false,
  apiKeys: {
    geminiApiKey: '',
    customEndpointUrl: ''
  }
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_BATCHES)) {
        db.createObjectStore(STORE_BATCHES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CONTRACTS)) {
        db.createObjectStore(STORE_CONTRACTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CONFIG)) {
        db.createObjectStore(STORE_CONFIG, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ----------------- Batches -----------------
export async function saveHistoricalBatch(batch: HistoricalBatch): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_BATCHES, 'readwrite');
    tx.objectStore(STORE_BATCHES).put(batch);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (err) {
    console.warn('Could not save to IndexedDB:', err);
  }
}

export async function getHistoricalBatches(): Promise<HistoricalBatch[]> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_BATCHES, 'readonly');
    const store = tx.objectStore(STORE_BATCHES);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = reject;
    });
  } catch {
    return [];
  }
}

export async function deleteHistoricalBatch(id: string): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_BATCHES, 'readwrite');
    tx.objectStore(STORE_BATCHES).delete(id);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (err) {
    console.warn('Could not delete batch from IndexedDB:', err);
  }
}

// ----------------- Saved Contracts -----------------
export async function saveCachedContracts(contracts: ContractRecord[]): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_CONTRACTS, 'readwrite');
    tx.objectStore(STORE_CONTRACTS).put({ id: 'active_contracts', contracts, updatedAt: Date.now() });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (err) {
    console.warn('Could not save cached contracts:', err);
  }
}

export async function getCachedContracts(): Promise<ContractRecord[]> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_CONTRACTS, 'readonly');
    const request = tx.objectStore(STORE_CONTRACTS).get('active_contracts');
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result?.contracts || []);
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// ----------------- Provider Config -----------------
export function getSavedProviderConfig(): ExtractionProviderConfig {
  try {
    const saved = localStorage.getItem('hr_extractor_provider_config');
    if (saved) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    }
  } catch {
    // fallback
  }
  return DEFAULT_CONFIG;
}

export function saveProviderConfig(config: ExtractionProviderConfig): void {
  try {
    localStorage.setItem('hr_extractor_provider_config', JSON.stringify(config));
  } catch (err) {
    console.warn('Could not save provider config:', err);
  }
}
