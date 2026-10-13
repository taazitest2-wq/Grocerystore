import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderTree,
  Boxes,
  SlidersHorizontal,
  Truck,
  Building2,
  Users,
  Receipt,
  RotateCcw,
  Wallet,
  Coins,
  BarChart3,
  FileText,
  UserCheck,
  Settings as SettingsIcon,
  ShieldAlert,
  FlaskConical,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { NavigationPage } from '../../types';

interface SidebarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  activeRole: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: NavigationPage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: string;
  badge?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Core' },
  { id: 'pos', label: 'Point of Sale (POS)', icon: ShoppingCart, section: 'Core' },
  { id: 'sales_history', label: 'Sales History', icon: Receipt, section: 'Sales' },
  { id: 'returns', label: 'Returns & Refunds', icon: RotateCcw, section: 'Sales' },
  { id: 'products', label: 'Products', icon: Package, section: 'Catalog & Stock' },
  { id: 'categories', label: 'Categories', icon: FolderTree, section: 'Catalog & Stock' },
  { id: 'inventory', label: 'Inventory Ledger', icon: Boxes, section: 'Catalog & Stock' },
  { id: 'stock_adjustments', label: 'Stock Adjustments', icon: SlidersHorizontal, section: 'Catalog & Stock' },
  { id: 'purchases', label: 'Purchases & Receiving', icon: Truck, section: 'Procurement' },
  { id: 'suppliers', label: 'Suppliers', icon: Building2, section: 'Procurement' },
  { id: 'customers', label: 'Customers', icon: Users, section: 'CRM' },
  { id: 'expenses', label: 'Expenses', icon: Wallet, section: 'Financial' },
  { id: 'cash_management', label: 'Cash Drawer', icon: Coins, section: 'Financial' },
  { id: 'reports', label: 'Financial Reports', icon: BarChart3, section: 'Reporting' },
  { id: 'pdf_documents', label: 'PDF Document Hub', icon: FileText, section: 'Reporting' },
  { id: 'users', label: 'Users & Permissions', icon: UserCheck, section: 'System' },
  { id: 'settings', label: 'Settings', icon: SettingsIcon, section: 'System' },
  { id: 'audit_log', label: 'Audit Trail', icon: ShieldAlert, section: 'System' },
  { id: 'test_center', label: 'Acceptance Tests', icon: FlaskConical, section: 'Verification', badge: 'A-O' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  // Group nav items by section
  const sections: { [key: string]: NavItem[] } = {};
  NAV_ITEMS.forEach((item) => {
    const sec = item.section || 'General';
    if (!sections[sec]) sections[sec] = [];
    sections[sec].push(item);
  });

  const handleItemClick = (page: NavigationPage) => {
    onNavigate(page);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 lg:static lg:z-auto flex flex-col h-screen bg-slate-900 text-slate-300 border-r border-slate-800 select-none transition-all duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'w-20' : 'w-64'}`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex-shrink-0 flex items-center justify-center font-bold text-white shadow-sm">
              SK
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-sm text-white tracking-tight truncate">
                  Saif Karyana
                </span>
                <span className="text-[11px] text-emerald-400 font-medium tracking-wide uppercase">
                  Grocery POS & ERP
                </span>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close menu"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items List */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 text-xs font-medium custom-scrollbar">
          {Object.entries(sections).map(([sectionTitle, items]) => (
            <div key={sectionTitle} className="space-y-1">
              {!isCollapsed ? (
                <div className="px-2 pb-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  {sectionTitle}
                </div>
              ) : (
                <div className="my-2 border-t border-slate-800/60" />
              )}

              {items.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-2.5 py-2'
                    } rounded-md transition-colors text-left ${
                      isActive
                        ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'} min-w-0`}>
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </div>
                    {!isCollapsed && item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-medium ${
                          isActive ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* App Footer & Collapse Switch */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-400">
          {!isCollapsed ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span>Engine</span>
                <span className="text-emerald-400 font-mono">IndexedDB Ready</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Backup</span>
                <span className="text-slate-300 font-mono">Continuous Crash Log</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="System Operational" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
