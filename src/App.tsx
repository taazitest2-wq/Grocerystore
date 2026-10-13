import React, { useState, useEffect } from 'react';
import { db } from './db/db';
import { NavigationPage } from './types';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { BackupRestoreModal } from './components/modals/BackupRestoreModal';
import { AlertCircle, RotateCcw, X } from 'lucide-react';
import { LoginScreen } from './components/auth/LoginScreen';

// Modules
import { DashboardModule } from './components/modules/DashboardModule';
import { POSModule } from './components/modules/POSModule';
import { ProductsModule } from './components/modules/ProductsModule';
import { CategoriesModule } from './components/modules/CategoriesModule';
import { InventoryModule } from './components/modules/InventoryModule';
import { StockAdjustmentsModule } from './components/modules/StockAdjustmentsModule';
import { PurchasesModule } from './components/modules/PurchasesModule';
import { SuppliersModule } from './components/modules/SuppliersModule';
import { CustomersModule } from './components/modules/CustomersModule';
import { SalesHistoryModule } from './components/modules/SalesHistoryModule';
import { ReturnsRefundsModule } from './components/modules/ReturnsRefundsModule';
import { ExpensesModule } from './components/modules/ExpensesModule';
import { CashManagementModule } from './components/modules/CashManagementModule';
import { ReportsModule } from './components/modules/ReportsModule';
import { PDFDocumentsModule } from './components/modules/PDFDocumentsModule';
import { UsersPermissionsModule } from './components/modules/UsersPermissionsModule';
import { SettingsModule } from './components/modules/SettingsModule';
import { AuditLogModule } from './components/modules/AuditLogModule';
import { TestCenterModule } from './components/modules/TestCenterModule';

export default function App() {
  const [currentPage, setCurrentPage] = useState<NavigationPage>('dashboard');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [crashBannerInfo, setCrashBannerInfo] = useState<{
    timestamp: string;
    recordCount: number;
  } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    // Restore sidebar preference
    const savedCollapse = localStorage.getItem('sidebar_collapsed_pref');
    if (savedCollapse === 'true') {
      setIsSidebarCollapsed(true);
    }

    // Initialize persistent database
    db.init().then(() => {
      setIsInitialized(true);
      const settings = db.getSettings();
      if (settings.theme === 'dark') {
        setIsDarkMode(true);
      }

      // Check for available crash recovery snapshot
      try {
        const snap = db.getCrashRecoverySnapshot();
        if (snap) {
          const currentTotal =
            db.getProducts().length +
            db.getSales().length +
            db.getPurchases().length;
          // If snapshot has more records or is fresh, notify user
          if (snap.recordCount >= currentTotal) {
            setCrashBannerInfo({
              timestamp: snap.timestamp,
              recordCount: snap.recordCount,
            });
          }
        }
      } catch {
        // ignore
      }
    });

    // Subscribe to state mutations
    const unsubscribe = db.subscribe(() => {
      setTick((t) => t + 1);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    db.updateSettings({ theme: next ? 'dark' : 'light' });
  };

  const toggleSidebarCollapse = () => {
    const next = !isSidebarCollapsed;
    setIsSidebarCollapsed(next);
    localStorage.setItem('sidebar_collapsed_pref', String(next));
  };

  const handleRestoreCrashBanner = async () => {
    try {
      await db.restoreCrashRecoverySnapshot();
      setCrashBannerInfo(null);
      window.location.reload();
    } catch {
      alert('Unable to load crash snapshot.');
    }
  };

  if (!isInitialized) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white space-y-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-xl shadow-lg animate-pulse">
          SK
        </div>
        <div className="text-sm font-semibold tracking-wide">
          Loading Saif Karyana Store Engine...
        </div>
        <div className="text-xs text-slate-400">
          Connecting to IndexedDB persistent storage repository
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  const renderModule = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardModule onNavigate={setCurrentPage} />;
      case 'pos':
        return <POSModule onNavigateToHistory={() => setCurrentPage('sales_history')} />;
      case 'products':
        return <ProductsModule />;
      case 'categories':
        return <CategoriesModule />;
      case 'inventory':
        return <InventoryModule />;
      case 'stock_adjustments':
        return <StockAdjustmentsModule />;
      case 'purchases':
        return <PurchasesModule />;
      case 'suppliers':
        return <SuppliersModule />;
      case 'customers':
        return <CustomersModule />;
      case 'sales_history':
        return <SalesHistoryModule />;
      case 'returns':
        return <ReturnsRefundsModule />;
      case 'expenses':
        return <ExpensesModule />;
      case 'cash_management':
        return <CashManagementModule />;
      case 'reports':
        return <ReportsModule />;
      case 'pdf_documents':
        return <PDFDocumentsModule />;
      case 'users':
        return <UsersPermissionsModule />;
      case 'settings':
        return <SettingsModule />;
      case 'audit_log':
        return <AuditLogModule />;
      case 'test_center':
        return <TestCenterModule />;
      default:
        return <DashboardModule onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      {/* Left Sidebar (Collapsible & Closeable) */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        activeRole={db.currentUser.role}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        {/* Crash Recovery Notification Banner */}
        {crashBannerInfo && (
          <div className="bg-amber-600 text-white px-4 py-2 text-xs flex items-center justify-between shadow-sm z-30">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>Crash Recovery Available:</strong> A snapshot with {crashBannerInfo.recordCount} records from{' '}
                {new Date(crashBannerInfo.timestamp).toLocaleTimeString()} is available.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRestoreCrashBanner}
                className="px-2.5 py-1 rounded bg-amber-700 hover:bg-amber-800 font-semibold flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restore Data</span>
              </button>
              <button
                onClick={() => setCrashBannerInfo(null)}
                className="p-1 hover:bg-amber-700 rounded transition-colors"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <TopBar
          onNavigate={setCurrentPage}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenBackupModal={() => setIsBackupModalOpen(true)}
        />

        <main className="flex-1 overflow-y-auto bg-slate-50/60 dark:bg-slate-950/60">
          {renderModule()}
        </main>
      </div>

      {/* Database Backup & Google Drive Modal */}
      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />
    </div>
  );
}
