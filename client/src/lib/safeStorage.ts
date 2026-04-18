type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const memoryStore = new Map<string, string>();

const fallbackStorage: StorageLike = {
  getItem(key: string) {
    return memoryStore.has(key) ? memoryStore.get(key)! : null;
  },
  setItem(key: string, value: string) {
    memoryStore.set(key, value);
  },
  removeItem(key: string) {
    memoryStore.delete(key);
  },
};

function resolveStorage(): StorageLike {
  if (typeof window === 'undefined') return fallbackStorage;
  try {
    const testKey = '__cv_safe_storage_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    try {
      const testKey = '__cv_safe_storage_test_session__';
      window.sessionStorage.setItem(testKey, '1');
      window.sessionStorage.removeItem(testKey);
      return window.sessionStorage;
    } catch {
      return fallbackStorage;
    }
  }
}

const store = resolveStorage();

export const safeStorage: StorageLike = {
  getItem: (key: string) => store.getItem(key),
  setItem: (key: string, value: string) => store.setItem(key, value),
  removeItem: (key: string) => store.removeItem(key),
};
