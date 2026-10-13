import React, { useState } from 'react';
import {
  TrendingUp,
  ShoppingCart,
  Boxes,
  AlertTriangle,
  Building2,
  Users,
  Wallet,
  Coins,
  Receipt,
  ArrowRight,
  Package,
  Calendar,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { db } from '../../db/db';
import { NavigationPage } from '../../types';

interface DashboardProps {
  onNavigate: (page: NavigationPage) => void;
}

export const DashboardModule: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days' | 'all'>('all');

  const products = db.getProducts();
  const sales = db.getSales();
  const purchases = db.getPurchases();
  const suppliers = db.getSuppliers();
  const customers = db.getCustomers();
  const categories = db.getCategories();
  const settings = db.getSettings();
  const activeSession = db.getActiveCashSession();

  // Date boundaries
  const now = new Date();
  let startTime = 0;
  if (dateRange === 'today') {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    startTime = today.getTime();
  } else if (dateRange === '7days') {
    startTime = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  } else if (dateRange === '30days') {
    startTime = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  }

  const startDateIso = startTime > 0 ? new Date(startTime).toISOString() : undefined;
  const metrics = db.getFinancialSummary(startDateIso);

  // Best selling products calculation
  const productSalesMap: { [prodId: string]: { name: string; qty: number; revenue: number } } = {};
  sales
    .filter((s) => s.status !== 'reversed')
    .forEach((s) => {
      s.items.forEach((it) => {
        if (!productSalesMap[it.productId]) {
          productSalesMap[it.productId] = { name: it.productName, qty: 0, revenue: 0 };
        }
        productSalesMap[it.productId].qty += it.quantity - it.returnedQuantity;
        productSalesMap[it.productId].revenue += it.total;
      });
    });

  const bestSellers = Object.values(productSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Sales by Category
  const categorySalesMap: { [catId: string]: { name: string; revenue: number } } = {};
  categories.forEach((c) => {
    categorySalesMap[c.id] = { name: c.name, revenue: 0 };
  });

  sales
    .filter((s) => s.status !== 'reversed')
    .forEach((s) => {
      s.items.forEach((it) => {
        const prod = products.find((p) => p.id === it.productId);
        if (prod && categorySalesMap[prod.categoryId]) {
          categorySalesMap[prod.categoryId].revenue += it.total;
        }
      });
    });

  const topCategories = Object.values(categorySalesMap)
    .filter((c) => c.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const lowStockAlerts = products.filter(
    (p) => p.quantityOnHand > 0 && p.quantityOnHand <= p.reorderLevel
  );
  const outOfStockAlerts = products.filter((p) => p.quantityOnHand <= 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Welcome & Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Store Operational Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time grocery performance metrics calculated from verified immutable ledger entries.
          </p>
        </div>

        {/* Date Filter Segmented */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-md text-xs font-medium">
          <button
            onClick={() => setDateRange('today')}
            className={`px-3 py-1 rounded transition-colors ${
              dateRange === 'today'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setDateRange('7days')}
            className={`px-3 py-1 rounded transition-colors ${
              dateRange === '7days'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setDateRange('30days')}
            className={`px-3 py-1 rounded transition-colors ${
              dateRange === '30days'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setDateRange('all')}
            className={`px-3 py-1 rounded transition-colors ${
              dateRange === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            All-Time Record
          </button>
        </div>
      </div>

      {/* CORE FINANCIAL PERFORMANCE CARDS (True Accrual Math) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Gross Sales */}
        <div
          onClick={() => onNavigate('sales_history')}
          className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-emerald-500 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase">Gross Sales</span>
            <Receipt className="w-3.5 h-3.5" />
          </div>
          <span className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-1 block">
            {settings.currencySymbol} {metrics.grossSales.toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Before discounts & returns
          </span>
        </div>

        {/* Discounts */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase">Discounts</span>
            <span className="text-[10px] font-mono">%</span>
          </div>
          <span className="text-lg font-bold text-slate-600 dark:text-slate-300 font-mono mt-1 block">
            {settings.currencySymbol} {metrics.discounts.toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Given at checkout
          </span>
        </div>

        {/* Net Revenue */}
        <div
          onClick={() => onNavigate('sales_history')}
          className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-emerald-500 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-[11px] font-semibold uppercase">Net Sales</span>
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1 block">
            {settings.currencySymbol} {metrics.netSales.toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Sales less disc & returns
          </span>
        </div>

        {/* COGS */}
        <div
          onClick={() => onNavigate('inventory')}
          className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-emerald-500 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase">COGS</span>
            <Boxes className="w-3.5 h-3.5" />
          </div>
          <span className="text-lg font-bold text-slate-700 dark:text-slate-300 font-mono mt-1 block">
            {settings.currencySymbol} {metrics.cogs.toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Recorded product cost
          </span>
        </div>

        {/* Gross Profit */}
        <div
          onClick={() => onNavigate('reports')}
          className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-emerald-500 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase">Gross Profit</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-1 block">
            {settings.currencySymbol} {metrics.grossProfit.toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Net sales minus COGS
          </span>
        </div>

        {/* Net Operating Result */}
        <div
          onClick={() => onNavigate('reports')}
          className="bg-slate-900 text-white p-4 rounded-lg shadow-sm cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase text-emerald-400">Net Operating P/L</span>
            <Wallet className="w-3.5 h-3.5" />
          </div>
          <span className="text-lg font-bold text-white font-mono mt-1 block">
            {settings.currencySymbol} {metrics.netOperatingProfit.toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            After expenses ({settings.currencySymbol}{metrics.operatingExpenses.toFixed(0)})
          </span>
        </div>
      </div>

      {/* SECONDARY ROW: Cash Drawer, Inventory Valuation, Payables, Receivables */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Cash in Drawer */}
        <div
          onClick={() => onNavigate('cash_management')}
          className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-emerald-500 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Cash Drawer Float</span>
            <Coins className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1 block">
            {settings.currencySymbol} {metrics.currentDrawerCash.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            {activeSession ? 'Shift Active' : 'Drawer Closed'}
          </span>
        </div>

        {/* Inventory Valuation */}
        <div
          onClick={() => onNavigate('inventory')}
          className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-emerald-500 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Inventory Valuation</span>
            <Boxes className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1 block">
            {settings.currencySymbol} {metrics.inventoryValuation.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Across {products.length} products
          </span>
        </div>

        {/* Supplier Payables */}
        <div
          onClick={() => onNavigate('suppliers')}
          className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-emerald-500 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase text-amber-500">Supplier Payables</span>
            <Building2 className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1 block">
            {settings.currencySymbol} {metrics.totalSupplierPayables.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Owed to {suppliers.length} vendors
          </span>
        </div>

        {/* Customer Receivables */}
        <div
          onClick={() => onNavigate('customers')}
          className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-emerald-500 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase text-blue-500">Customer Credit Due</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <span className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1 block">
            {settings.currencySymbol} {metrics.totalCustomerReceivables.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Owed by registered shoppers
          </span>
        </div>
      </div>

      {/* THIRD ROW: Best Sellers, Top Categories, Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Best Sellers */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              Best-Selling Grocery Products
            </h3>
            <button
              onClick={() => onNavigate('reports')}
              className="text-[11px] text-emerald-600 hover:underline flex items-center gap-0.5"
            >
              <span>Report</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {bestSellers.length === 0 ? (
              <div className="py-6 text-center text-slate-400">
                No items sold yet. Check out in POS to populate sales.
              </div>
            ) : (
              bestSellers.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {item.qty} units sold
                    </span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                    {settings.currencySymbol} {item.revenue.toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sales by Category */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              Top Grocery Aisles / Categories
            </h3>
            <button
              onClick={() => onNavigate('categories')}
              className="text-[11px] text-emerald-600 hover:underline flex items-center gap-0.5"
            >
              <span>Manage</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {topCategories.length === 0 ? (
              <div className="py-6 text-center text-slate-400">
                No category sales recorded yet.
              </div>
            ) : (
              topCategories.map((c, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                    {c.name}
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {settings.currencySymbol} {c.revenue.toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock & Out of Stock Alerts */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Inventory Depletion Alerts
            </h3>
            <button
              onClick={() => onNavigate('purchases')}
              className="text-[11px] text-emerald-600 hover:underline flex items-center gap-0.5"
            >
              <span>Restock PO</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {outOfStockAlerts.length > 0 && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded">
                <span className="font-bold text-rose-700 dark:text-rose-300 block">
                  {outOfStockAlerts.length} Products Completely Out of Stock:
                </span>
                <span className="text-[11px] text-rose-600 dark:text-rose-400 truncate block mt-0.5">
                  {outOfStockAlerts.map((p) => p.name).join(', ')}
                </span>
              </div>
            )}

            {lowStockAlerts.length > 0 && (
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 rounded">
                <span className="font-bold text-amber-700 dark:text-amber-300 block">
                  {lowStockAlerts.length} Products Below Reorder Threshold:
                </span>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 truncate block mt-0.5">
                  {lowStockAlerts.map((p) => `${p.name} (${p.quantityOnHand} left)`).join(', ')}
                </span>
              </div>
            )}

            {outOfStockAlerts.length === 0 && lowStockAlerts.length === 0 && (
              <div className="py-6 text-center text-slate-400">
                All shelf inventories are currently above reorder levels.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
