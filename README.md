# BusinessDesk Grocery — Store Management & Point of Sale (POS) System

BusinessDesk Grocery is a desktop-ready grocery store management and Point of Sale (POS) system built with React, TypeScript, Tailwind CSS, persistent database architecture, and native PDF document generation.

---

## 1. System Overview & Technology Architecture

- **Frontend & UI**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons.
- **Persistence Layer**: IndexedDB persistent storage repository with in-memory sync cache for instant responsiveness in browser preview environments, and an abstraction layer prepared for Electron SQLite IPC bridging.
- **Reporting & Printing**: Client-side vector PDF generation via `jsPDF` and `jspdf-autotable` supporting both standard A4 documents and 80mm thermal receipt roll layouts without requiring external hardware printers or server-side renderers.
- **Desktop Target**: Electron with context isolation enabled and Node integration disabled in the renderer.

---

## 2. Implemented Modules

1. **Dashboard (Module 1)**: Real-time financial analytics (Gross Sales, Discounts, Net Sales, Cost of Goods Sold, Gross Profit, Operating Expenses, Net Operating Profit, Average Sale Value, Inventory Valuation, Cash Drawer balance, Top Sellers, and Category breakdowns).
2. **Point of Sale / POS (Module 2)**: Fast counter checkout with keyboard/mouse product search, category navigation, quantity stepper, cart and line discounts, tax handling, customer selection, split tender (Cash, Card, Bank, Credit), cash change calculation, and atomic transaction commits.
3. **Products & Catalog (Module 3)**: Product CRUD, unique SKU validation, barcode support, unit of measure support (`pcs`, `pack`, `box`, `bottle`, `kg`, `g`, `l`, `ml`), decimal quantities, reorder levels, CSV import/export, and stock valuation.
4. **Categories (Module 4)**: Grocery aisle organization with active product counts and deletion protection for categories in use.
5. **Inventory Ledger (Module 5)**: Auditable stock movement ledger (`opening_stock`, `sale`, `sale_return`, `purchase_receive`, `manual_adjustment`, `damaged`, `expired`) and shelf expiry alerts.
6. **Stock Adjustments (Module 6)**: Formal adjustments for physical count discrepancies, damage write-offs, and store use.
7. **Suppliers & Procurement (Module 7)**: Supplier registry, contact management, accounts payable aging, and payment recording.
8. **Purchases & Receiving (Module 8)**: Purchase Order (PO) creation, partial/full delivery receipt with Goods Received Notes (GRN), weighted-average cost updating, and stock increases applied only upon verified physical delivery.
9. **Customers & Credit Accounts (Module 9)**: Counter walk-in and registered shoppers, monthly store credit limits, receivables tracking, and debt collection.
10. **Sales History & Invoices (Module 10)**: Full invoice archive, search, date filtering, receipt reprint in A4 or thermal layouts, and audited transaction reversals.
11. **Returns & Refunds (Module 11)**: Original sale lookup, itemized refundable unit validation, return dispositions (`restock`, `quarantine`, `discard`), and cash drawer outflow adjustments.
12. **Expenses & Petty Cash (Module 12)**: Categorized operational store expenditures (utilities, rent, wages, freight, packaging) with cash drawer float synchronization.
13. **Cash Drawer Management (Module 13)**: Opening cash floats, sales inflows, expense outflows, manual cash-in/cash-out drops, physical count reconciliation, and cash variance logging.
14. **Financial Reports (Module 14)**: Daily sales summaries, product-level profit margins, category sales, payables, receivables, and executive Profit & Loss statements.
15. **PDF Document Hub (Module 15)**: On-demand generation of all 12+ genuine downloadable PDF document types (A4 Invoices, Thermal Receipts, POs, GRNs, Statements, Vouchers, and Reports).
16. **Users & Role Governance (Module 16)**: Local user accounts for Owner/Admin, Store Manager, Cashier, and Inventory Staff with capability matrix.
17. **Store Settings (Module 17)**: Configurable store details, currency formatting (`PKR / Rs.`), tax rates, negative stock policy, and full JSON database backup/restore.
18. **Audit Trail (Module 18)**: Chronological immutable event logging of every system mutation.
19. **Acceptance Test Suite (Acceptance Tests)**: Automated test harness running Scenarios A through J directly against the live database engine.
20. **Desktop Applications & Downloads Center (Module 20)**: 1-click download of full project source code (.ZIP), Windows batch launcher (`.bat`), macOS launcher (`.command`), native PWA desktop app installation, and Electron executable build configurations.

---

## 3. Development Commands

```bash
# Install dependencies
npm install

# Start local development server (port 3000)
npm run dev

# Run TypeScript compile & lint checks
npm run lint

# Production build
npm run build
```

---

## 4. Packaging for Windows and macOS (Electron Desktop)

To package BusinessDesk Grocery as a native desktop application with SQLite:

### Step 1: Install Electron & SQLite packages
```bash
npm install -D electron electron-builder
npm install better-sqlite3
npm install -D @types/better-sqlite3
```

### Step 2: Electron Main Process (`electron/main.ts`)
```typescript
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import Database from 'better-sqlite3';

let mainWindow: BrowserWindow | null = null;
const db = new Database(path.join(app.getPath('userData'), 'grocery_store.db'));

// Initialize SQLite schema
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    purchaseCost REAL,
    sellingPrice REAL,
    quantityOnHand REAL,
    reorderLevel REAL
  );
  -- Additional normalized tables matching AppDatabaseSchema
`);

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
});

// IPC Handler bridging the Data Access Layer to SQLite
ipcMain.handle('db:query', async (_event, { sql, params }) => {
  const stmt = db.prepare(sql);
  return stmt.all(...(params || []));
});
```

### Step 3: Electron Preload Bridge (`electron/preload.ts`)
```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: string, data: any) => ipcRenderer.invoke(channel, data),
});
```

### Step 4: Build Desktop Installers
```bash
# Package for Windows (.exe installer & portable)
npx electron-builder --win

# Package for macOS (.dmg and .app bundle)
npx electron-builder --mac
```

---

## 5. Database Backup & Restore

1. Go to **Settings** in the left sidebar.
2. Under **Database Management, Persistent Backup & Electron Bridge**, click **Export Database JSON Backup** to save a timestamped JSON file containing all products, categories, suppliers, customers, sales, purchases, stock movements, and cash records.
3. To restore or migrate data to a new device, click **Restore from JSON Backup** and select your saved backup file.
