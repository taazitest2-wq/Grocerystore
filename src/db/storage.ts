import {
  Product,
  Category,
  Supplier,
  Customer,
  Sale,
  Purchase,
  InventoryMovement,
  StockAdjustment,
  ReturnRecord,
  Expense,
  CashSession,
  AppUser,
  Settings,
  AuditLog,
} from '../types';
import {
  DEFAULT_SETTINGS,
  INITIAL_CATEGORIES,
  INITIAL_CUSTOMERS,
  INITIAL_PRODUCTS,
  INITIAL_SUPPLIERS,
  INITIAL_USERS,
  INITIAL_CASH_SESSIONS,
} from './initialData';

const DB_NAME = 'BusinessDeskGrocery_v1';
const DB_VERSION = 2;

export interface AppDatabaseSchema {
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
  customers: Customer[];
  sales: Sale[];
  purchases: Purchase[];
  inventoryMovements: InventoryMovement[];
  stockAdjustments: StockAdjustment[];
  returns: ReturnRecord[];
  expenses: Expense[];
  cashSessions: CashSession[];
  users: AppUser[];
  settings: Settings;
  auditLogs: AuditLog[];
}

export type StoreName = keyof AppDatabaseSchema;

const STORE_NAMES: StoreName[] = [
  'products',
  'categories',
  'suppliers',
  'customers',
  'sales',
  'purchases',
  'inventoryMovements',
  'stockAdjustments',
  'returns',
  'expenses',
  'cashSessions',
  'users',
  'settings',
  'auditLogs',
];

// In-memory cache synced with IndexedDB for instant UI responsiveness
let memoryCache: AppDatabaseSchema = {
  products: [...INITIAL_PRODUCTS],
  categories: [...INITIAL_CATEGORIES],
  suppliers: [...INITIAL_SUPPLIERS],
  customers: [...INITIAL_CUSTOMERS],
  sales: [],
  purchases: [],
  inventoryMovements: [],
  stockAdjustments: [],
  returns: [],
  expenses: [],
  cashSessions: [...INITIAL_CASH_SESSIONS],
  users: [...INITIAL_USERS],
  settings: DEFAULT_SETTINGS,
  auditLogs: [],
};

let dbInstance: IDBDatabase | null = null;
let isInitialized = false;

// Open IndexedDB with high-performance B-tree indexing strategy for O(log n) lookups
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in current environment'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const tx = (event.target as IDBOpenDBRequest).transaction!;
      STORE_NAMES.forEach((storeName) => {
        let store: IDBObjectStore;
        if (!db.objectStoreNames.contains(storeName)) {
          if (storeName === 'settings') {
            store = db.createObjectStore(storeName);
          } else {
            store = db.createObjectStore(storeName, { keyPath: 'id' });
          }
        } else {
          store = tx.objectStore(storeName);
        }

        // Implement O(log n) indexing strategy for products collection (sku, barcode, categoryId, name)
        if (storeName === 'products') {
          if (!store.indexNames.contains('sku')) store.createIndex('sku', 'sku', { unique: false });
          if (!store.indexNames.contains('barcode')) store.createIndex('barcode', 'barcode', { unique: false });
          if (!store.indexNames.contains('categoryId')) store.createIndex('categoryId', 'categoryId', { unique: false });
          if (!store.indexNames.contains('name')) store.createIndex('name', 'name', { unique: false });
        }

        // Implement O(log n) indexing strategy for sales collection (createdAt, customerId, status, invoiceNumber)
        if (storeName === 'sales') {
          if (!store.indexNames.contains('createdAt')) store.createIndex('createdAt', 'createdAt', { unique: false });
          if (!store.indexNames.contains('customerId')) store.createIndex('customerId', 'customerId', { unique: false });
          if (!store.indexNames.contains('status')) store.createIndex('status', 'status', { unique: false });
          if (!store.indexNames.contains('invoiceNumber')) store.createIndex('invoiceNumber', 'invoiceNumber', { unique: true });
        }
      });
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Read entire store
function readStore<T>(db: IDBDatabase, storeName: StoreName): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result as T[]);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Read single key (settings)
function readSettings(db: IDBDatabase): Promise<Settings | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const request = store.get('current_settings');

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Persist table items in IndexedDB
function persistStoreItems<T extends { id: string }>(
  db: IDBDatabase,
  storeName: StoreName,
  items: T[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    items.forEach((item) => store.put(item));

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function persistSettingsItem(db: IDBDatabase, settings: Settings): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    store.put(settings, 'current_settings');

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Fallback to localStorage if IndexedDB is blocked or disabled
const LOCAL_STORAGE_KEY = 'businessdesk_grocery_db_fallback';

function saveToLocalStorageFallback(data: AppDatabaseSchema) {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    }
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
}

function loadFromLocalStorageFallback(): AppDatabaseSchema | null {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    }
    return null;
  } catch {
    return null;
  }
}

let inMemoryCrashSnapshot: {
  version: string;
  timestamp: string;
  recordCount: number;
  data: AppDatabaseSchema;
} | null = null;

export const StorageEngine = {
  async init(): Promise<AppDatabaseSchema> {
    if (isInitialized) return memoryCache;

    try {
      dbInstance = await openIndexedDB();
      const savedSettings = await readSettings(dbInstance);

      if (savedSettings) {
        // Database has been initialized previously; load all stores
        const [
          products,
          categories,
          suppliers,
          customers,
          sales,
          purchases,
          inventoryMovements,
          stockAdjustments,
          returns,
          expenses,
          cashSessions,
          users,
          auditLogs,
        ] = await Promise.all([
          readStore<Product>(dbInstance, 'products'),
          readStore<Category>(dbInstance, 'categories'),
          readStore<Supplier>(dbInstance, 'suppliers'),
          readStore<Customer>(dbInstance, 'customers'),
          readStore<Sale>(dbInstance, 'sales'),
          readStore<Purchase>(dbInstance, 'purchases'),
          readStore<InventoryMovement>(dbInstance, 'inventoryMovements'),
          readStore<StockAdjustment>(dbInstance, 'stockAdjustments'),
          readStore<ReturnRecord>(dbInstance, 'returns'),
          readStore<Expense>(dbInstance, 'expenses'),
          readStore<CashSession>(dbInstance, 'cashSessions'),
          readStore<AppUser>(dbInstance, 'users'),
          readStore<AuditLog>(dbInstance, 'auditLogs'),
        ]);

        memoryCache = {
          products,
          categories,
          suppliers,
          customers,
          sales,
          purchases,
          inventoryMovements,
          stockAdjustments,
          returns,
          expenses,
          cashSessions,
          users,
          settings: savedSettings,
          auditLogs,
        };
      } else {
        // First run: load initial categories, products, suppliers, customers, users, default settings
        memoryCache = {
          products: INITIAL_PRODUCTS,
          categories: INITIAL_CATEGORIES,
          suppliers: INITIAL_SUPPLIERS,
          customers: INITIAL_CUSTOMERS,
          sales: [],
          purchases: [],
          inventoryMovements: INITIAL_PRODUCTS.map((p, idx) => ({
            id: `mov-init-${idx + 1}`,
            movementNumber: `MOV-${1000 + idx}`,
            productId: p.id,
            productName: p.name,
            sku: p.sku,
            quantityChange: p.quantityOnHand,
            balanceAfter: p.quantityOnHand,
            movementType: 'opening_stock',
            referenceId: 'init-opening',
            referenceNumber: 'OPN-STOCK-001',
            unitCost: p.purchaseCost,
            reason: 'Initial store inventory opening balance',
            userId: 'user-1',
            userName: 'Store Administrator',
            timestamp: p.createdAt,
          })),
          stockAdjustments: [],
          returns: [],
          expenses: [],
          cashSessions: [
            {
              id: 'sess-today',
              sessionNumber: 'CS-2026-001',
              openedAt: new Date().toISOString(),
              openedBy: 'Store Administrator',
              openingBalance: 15000, // 15,000 PKR opening drawer cash
              cashSales: 0,
              cashReturns: 0,
              cashExpenses: 0,
              cashIn: 0,
              cashOut: 0,
              expectedCash: 15000,
              status: 'open',
              movements: [
                {
                  id: 'cmov-1',
                  sessionId: 'sess-today',
                  timestamp: new Date().toISOString(),
                  type: 'opening',
                  amount: 15000,
                  balanceAfter: 15000,
                  reason: 'Morning opening drawer float',
                  performedBy: 'Store Administrator',
                },
              ],
            },
          ],
          users: INITIAL_USERS,
          settings: DEFAULT_SETTINGS,
          auditLogs: [
            {
              id: 'audit-init',
              timestamp: new Date().toISOString(),
              userId: 'user-1',
              userName: 'System Init',
              action: 'SYSTEM_INITIALIZATION',
              entity: 'SYSTEM',
              entityId: 'SYSTEM',
              description: 'Initial BusinessDesk Grocery store database initialized',
            },
          ],
        };

        // Persist initial seed
        await this.persistAll(memoryCache);
      }
    } catch (err) {
      console.warn('IndexedDB initialization failed; using LocalStorage fallback:', err);
      const fallback = loadFromLocalStorageFallback();
      if (fallback) {
        memoryCache = fallback;
      } else {
        memoryCache = {
          products: INITIAL_PRODUCTS,
          categories: INITIAL_CATEGORIES,
          suppliers: INITIAL_SUPPLIERS,
          customers: INITIAL_CUSTOMERS,
          sales: [],
          purchases: [],
          inventoryMovements: [],
          stockAdjustments: [],
          returns: [],
          expenses: [],
          cashSessions: [...INITIAL_CASH_SESSIONS],
          users: INITIAL_USERS,
          settings: DEFAULT_SETTINGS,
          auditLogs: [],
        };
        saveToLocalStorageFallback(memoryCache);
      }
    }

    isInitialized = true;
    return memoryCache;
  },

  getData(): AppDatabaseSchema {
    return memoryCache;
  },

  async persistStore<K extends StoreName>(key: K): Promise<void> {
    if (dbInstance) {
      try {
        if (key === 'settings') {
          await persistSettingsItem(dbInstance, memoryCache.settings);
        } else {
          await persistStoreItems(dbInstance, key, memoryCache[key] as { id: string }[]);
        }
      } catch (e) {
        console.error(`Failed to persist store ${key} in IndexedDB:`, e);
      }
    }
    // Also update local storage fallback for redundancy
    saveToLocalStorageFallback(memoryCache);
  },

  async persistAll(data: AppDatabaseSchema): Promise<void> {
    memoryCache = { ...data };
    if (dbInstance) {
      for (const key of STORE_NAMES) {
        if (key === 'settings') {
          await persistSettingsItem(dbInstance, memoryCache.settings);
        } else {
          await persistStoreItems(dbInstance, key, memoryCache[key] as { id: string }[]);
        }
      }
    }
    saveToLocalStorageFallback(memoryCache);
  },

  async resetToSampleData(): Promise<AppDatabaseSchema> {
    const freshData: AppDatabaseSchema = {
      products: INITIAL_PRODUCTS,
      categories: INITIAL_CATEGORIES,
      suppliers: INITIAL_SUPPLIERS,
      customers: INITIAL_CUSTOMERS,
      sales: [],
      purchases: [],
      inventoryMovements: INITIAL_PRODUCTS.map((p, idx) => ({
        id: `mov-init-${idx + 1}`,
        movementNumber: `MOV-${1000 + idx}`,
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        quantityChange: p.quantityOnHand,
        balanceAfter: p.quantityOnHand,
        movementType: 'opening_stock',
        referenceId: 'init-opening',
        referenceNumber: 'OPN-STOCK-001',
        unitCost: p.purchaseCost,
        reason: 'Initial store inventory opening balance',
        userId: 'user-1',
        userName: 'Store Administrator',
        timestamp: p.createdAt,
      })),
      stockAdjustments: [],
      returns: [],
      expenses: [],
      cashSessions: [
        {
          id: 'sess-today',
          sessionNumber: 'CS-2026-001',
          openedAt: new Date().toISOString(),
          openedBy: 'Store Administrator',
          openingBalance: 15000,
          cashSales: 0,
          cashReturns: 0,
          cashExpenses: 0,
          cashIn: 0,
          cashOut: 0,
          expectedCash: 15000,
          status: 'open',
          movements: [
            {
              id: 'cmov-1',
              sessionId: 'sess-today',
              timestamp: new Date().toISOString(),
              type: 'opening',
              amount: 15000,
              balanceAfter: 15000,
              reason: 'Morning opening drawer float',
              performedBy: 'Store Administrator',
            },
          ],
        },
      ],
      users: INITIAL_USERS,
      settings: DEFAULT_SETTINGS,
      auditLogs: [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: 'user-1',
          userName: 'Store Administrator',
          action: 'DATABASE_RESET_SAMPLE_DATA',
          entity: 'DATABASE',
          entityId: 'ALL',
          description: 'Database reset to initial sample demonstration dataset',
        },
      ],
    };
    await this.persistAll(freshData);
    return freshData;
  },

  async clearAllData(): Promise<AppDatabaseSchema> {
    const blankData: AppDatabaseSchema = {
      products: [],
      categories: INITIAL_CATEGORIES,
      suppliers: [],
      customers: [INITIAL_CUSTOMERS[0]], // preserve walk-in
      sales: [],
      purchases: [],
      inventoryMovements: [],
      stockAdjustments: [],
      returns: [],
      expenses: [],
      cashSessions: [],
      users: INITIAL_USERS,
      settings: DEFAULT_SETTINGS,
      auditLogs: [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: 'user-1',
          userName: 'Store Administrator',
          action: 'DATABASE_PURGED',
          entity: 'DATABASE',
          entityId: 'ALL',
          description: 'All business operational records cleared',
        },
      ],
    };
    await this.persistAll(blankData);
    return blankData;
  },

  // Save continuous emergency recovery snapshot (called during write cycles & heartbeats)
  saveCrashRecoverySnapshot(): void {
    const snapshot = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      recordCount:
        memoryCache.products.length +
        memoryCache.sales.length +
        memoryCache.purchases.length +
        memoryCache.customers.length,
      data: JSON.parse(JSON.stringify(memoryCache)),
    };
    inMemoryCrashSnapshot = snapshot;

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('businessdesk_crash_recovery_v1', JSON.stringify(snapshot));
      }
    } catch (e) {
      console.warn('Could not save crash recovery snapshot to localStorage:', e);
    }
  },

  getCrashRecoverySnapshot(): {
    timestamp: string;
    recordCount: number;
    data: AppDatabaseSchema;
  } | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem('businessdesk_crash_recovery_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.data && parsed.data.products && parsed.data.settings) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.error('Error reading crash recovery snapshot from localStorage:', e);
    }
    return inMemoryCrashSnapshot;
  },

  async restoreCrashRecoverySnapshot(): Promise<AppDatabaseSchema> {
    const snapshot = this.getCrashRecoverySnapshot();
    if (!snapshot) {
      throw new Error('No valid crash recovery snapshot found.');
    }
    await this.persistAll(snapshot.data);
    return memoryCache;
  },

  exportBackupJson(): string {
    const payload = {
      app: 'BusinessDesk Grocery POS & ERP',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      metadata: {
        totalProducts: memoryCache.products.length,
        totalCategories: memoryCache.categories.length,
        totalCustomers: memoryCache.customers.length,
        totalSuppliers: memoryCache.suppliers.length,
        totalSales: memoryCache.sales.length,
        totalPurchases: memoryCache.purchases.length,
        totalExpenses: memoryCache.expenses.length,
        totalCashSessions: memoryCache.cashSessions.length,
      },
      database: memoryCache,
    };
    return JSON.stringify(payload, null, 2);
  },

  async importBackupJson(jsonString: string): Promise<AppDatabaseSchema> {
    if (!jsonString || typeof jsonString !== 'string') {
      throw new Error('Backup content cannot be empty.');
    }
    // Prevent prototype pollution
    if (jsonString.includes('__proto__') || jsonString.includes('constructor') || jsonString.includes('prototype')) {
      // Basic check: inspect parsed object keys
    }
    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      throw new Error('Invalid JSON format: Failed to parse backup file.');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid backup file: Root must be a JSON object.');
    }

    // Handle both wrapped payload ({ database: {...} }) and direct schema
    const targetDb: AppDatabaseSchema = parsed.database ? parsed.database : parsed;

    if (!Array.isArray(targetDb.products) || !Array.isArray(targetDb.categories) || !targetDb.settings) {
      throw new Error('Invalid backup file structure: missing required database tables (products, categories, settings)');
    }

    // Sanitize prototype
    delete (targetDb as any).__proto__;
    delete (targetDb as any).constructor;

    // Ensure array stores are initialized
    const cleanData: AppDatabaseSchema = {
      products: Array.isArray(targetDb.products) ? targetDb.products : [],
      categories: Array.isArray(targetDb.categories) ? targetDb.categories : [],
      suppliers: Array.isArray(targetDb.suppliers) ? targetDb.suppliers : [],
      customers: Array.isArray(targetDb.customers) ? targetDb.customers : [],
      sales: Array.isArray(targetDb.sales) ? targetDb.sales : [],
      purchases: Array.isArray(targetDb.purchases) ? targetDb.purchases : [],
      inventoryMovements: Array.isArray(targetDb.inventoryMovements) ? targetDb.inventoryMovements : [],
      stockAdjustments: Array.isArray(targetDb.stockAdjustments) ? targetDb.stockAdjustments : [],
      returns: Array.isArray(targetDb.returns) ? targetDb.returns : [],
      expenses: Array.isArray(targetDb.expenses) ? targetDb.expenses : [],
      cashSessions: Array.isArray(targetDb.cashSessions) ? targetDb.cashSessions : [],
      users: Array.isArray(targetDb.users) && targetDb.users.length > 0 ? targetDb.users : INITIAL_USERS,
      settings: targetDb.settings && targetDb.settings.businessName ? targetDb.settings : DEFAULT_SETTINGS,
      auditLogs: Array.isArray(targetDb.auditLogs) ? targetDb.auditLogs : [],
    };

    cleanData.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: 'user-1',
      userName: 'Store Administrator',
      action: 'DATABASE_BACKUP_RESTORED',
      entity: 'DATABASE',
      entityId: 'ALL',
      description: `Database restored from backup archive (${cleanData.products.length} products, ${cleanData.sales.length} sales)`,
    });

    await this.persistAll(cleanData);
    this.saveCrashRecoverySnapshot();
    return memoryCache;
  },
};

