import React, { useState } from 'react';
import {
  BarChart3,
  FileText,
  FileSpreadsheet,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  Boxes,
  Users,
  Building2,
  Wallet,
} from 'lucide-react';
import { db } from '../../db/db';
import { PdfService } from '../../services/pdfService';
import { CsvService } from '../../services/csvService';

type ReportTab =
  | 'daily_sales'
  | 'by_product'
  | 'by_category'
  | 'profit_cogs'
  | 'expenses'
  | 'supplier_payables'
  | 'customer_receivables'
  | 'inventory_valuation'
  | 'pnl_summary';

export const ReportsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('daily_sales');
  const [dateFilter, setDateFilter] = useState<'today' | 'month' | 'all'>('all');

  const products = db.getProducts();
  const sales = db.getSales();
  const categories = db.getCategories();
  const expenses = db.getExpenses();
  const suppliers = db.getSuppliers();
  const customers = db.getCustomers();
  const returns = db.getReturns();
  const settings = db.getSettings();

  const metrics = db.getFinancialSummary();

  // 1. Sales by Product Table Data
  const productPerformance: {
    [id: string]: { name: string; sku: string; unitsSold: number; revenue: number; cost: number; profit: number };
  } = {};

  sales
    .filter((s) => s.status !== 'reversed')
    .forEach((s) => {
      s.items.forEach((it) => {
        if (!productPerformance[it.productId]) {
          productPerformance[it.productId] = {
            name: it.productName,
            sku: it.sku,
            unitsSold: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
          };
        }
        const netQty = it.quantity - it.returnedQuantity;
        const netRev = (it.total / it.quantity) * netQty;
        const netCost = it.unitCost * netQty;

        productPerformance[it.productId].unitsSold += netQty;
        productPerformance[it.productId].revenue += netRev;
        productPerformance[it.productId].cost += netCost;
        productPerformance[it.productId].profit += netRev - netCost;
      });
    });

  const productRows = Object.values(productPerformance).sort((a, b) => b.revenue - a.revenue);

  // 2. Sales by Category Table Data
  const categoryMap: { [catId: string]: { name: string; revenue: number; units: number } } = {};
  categories.forEach((c) => {
    categoryMap[c.id] = { name: c.name, revenue: 0, units: 0 };
  });

  sales
    .filter((s) => s.status !== 'reversed')
    .forEach((s) => {
      s.items.forEach((it) => {
        const prod = products.find((p) => p.id === it.productId);
        if (prod && categoryMap[prod.categoryId]) {
          const netQty = it.quantity - it.returnedQuantity;
          categoryMap[prod.categoryId].units += netQty;
          categoryMap[prod.categoryId].revenue += (it.total / it.quantity) * netQty;
        }
      });
    });

  const categoryRows = Object.values(categoryMap).filter((c) => c.revenue > 0);

  // 3. Expenses by Category Data
  const expenseCatMap: { [cat: string]: number } = {};
  expenses
    .filter((e) => e.status === 'paid')
    .forEach((e) => {
      expenseCatMap[e.category] = (expenseCatMap[e.category] || 0) + e.amount;
    });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            Retail Reports & Financial Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Verified financial reports derived from transaction records: Gross Sales, COGS, Gross Profit, and Operating Result.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => PdfService.generateDailySalesReport(new Date().toISOString().slice(0, 10), sales, settings)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-xs font-medium"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span>Download Daily PDF</span>
          </button>
        </div>
      </div>

      {/* Financial Glossary / Policy Notice */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <strong className="text-slate-900 dark:text-white block font-semibold">Net Sales Policy:</strong>
          Gross Sales value minus discounts allowed, minus returned merchandise refunds.
        </div>
        <div>
          <strong className="text-slate-900 dark:text-white block font-semibold">Costing Method:</strong>
          Weighted-Average Cost per inventory lot at time of receiving.
        </div>
        <div>
          <strong className="text-slate-900 dark:text-white block font-semibold">Operating Profit:</strong>
          Gross Profit (Net Sales - COGS) minus paid operating expenses.
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800 pb-1 text-xs font-medium">
        <button
          onClick={() => setActiveTab('daily_sales')}
          className={`py-2 px-3 rounded-t-md border-b-2 whitespace-nowrap ${
            activeTab === 'daily_sales'
              ? 'border-emerald-600 text-emerald-600 font-bold bg-white dark:bg-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Daily Sales Summary
        </button>
        <button
          onClick={() => setActiveTab('by_product')}
          className={`py-2 px-3 rounded-t-md border-b-2 whitespace-nowrap ${
            activeTab === 'by_product'
              ? 'border-emerald-600 text-emerald-600 font-bold bg-white dark:bg-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Gross Profit by Product
        </button>
        <button
          onClick={() => setActiveTab('by_category')}
          className={`py-2 px-3 rounded-t-md border-b-2 whitespace-nowrap ${
            activeTab === 'by_category'
              ? 'border-emerald-600 text-emerald-600 font-bold bg-white dark:bg-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Sales by Category
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`py-2 px-3 rounded-t-md border-b-2 whitespace-nowrap ${
            activeTab === 'expenses'
              ? 'border-emerald-600 text-emerald-600 font-bold bg-white dark:bg-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Expenses by Category
        </button>
        <button
          onClick={() => setActiveTab('supplier_payables')}
          className={`py-2 px-3 rounded-t-md border-b-2 whitespace-nowrap ${
            activeTab === 'supplier_payables'
              ? 'border-emerald-600 text-emerald-600 font-bold bg-white dark:bg-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Supplier Payables
        </button>
        <button
          onClick={() => setActiveTab('customer_receivables')}
          className={`py-2 px-3 rounded-t-md border-b-2 whitespace-nowrap ${
            activeTab === 'customer_receivables'
              ? 'border-emerald-600 text-emerald-600 font-bold bg-white dark:bg-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Customer Receivables
        </button>
        <button
          onClick={() => setActiveTab('pnl_summary')}
          className={`py-2 px-3 rounded-t-md border-b-2 whitespace-nowrap ${
            activeTab === 'pnl_summary'
              ? 'border-emerald-600 text-emerald-600 font-bold bg-white dark:bg-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Executive P&L Statement
        </button>
      </div>

      {/* Tab: Daily Sales */}
      {activeTab === 'daily_sales' && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <span className="font-semibold text-xs text-slate-900 dark:text-white">
              Itemized Daily Sales Table ({sales.length} records)
            </span>
            <button
              onClick={() => CsvService.exportSalesCsv(sales)}
              className="text-xs text-emerald-600 font-medium hover:underline flex items-center gap-1"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800 font-semibold uppercase text-slate-500 text-[10px]">
                <tr>
                  <th className="p-3">Time & Invoice #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3 text-right">Subtotal</th>
                  <th className="p-3 text-right">Discount</th>
                  <th className="p-3 text-right">Net Total</th>
                  <th className="p-3 text-center">Payment</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No sales recorded.
                    </td>
                  </tr>
                ) : (
                  sales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-mono font-medium">
                        {s.saleNumber}
                        <div className="text-[10px] text-slate-400 font-normal">
                          {new Date(s.createdAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="p-3">{s.customerName}</td>
                      <td className="p-3 text-right font-mono">{settings.currencySymbol} {s.subtotal.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono text-slate-400">
                        {s.discountTotal > 0 ? `-${settings.currencySymbol} ${s.discountTotal.toFixed(2)}` : '-'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {settings.currencySymbol} {s.total.toFixed(2)}
                      </td>
                      <td className="p-3 text-center capitalize">{s.primaryPaymentMethod}</td>
                      <td className="p-3 text-center uppercase font-mono text-[10px]">{s.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Gross Profit by Product */}
      {activeTab === 'by_product' && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <span className="font-semibold text-xs text-slate-900 dark:text-white">
              Product-Level Gross Margin and Unit Profitability
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800 font-semibold uppercase text-slate-500 text-[10px]">
                <tr>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3 text-center">Net Units Sold</th>
                  <th className="p-3 text-right">Net Sales Revenue</th>
                  <th className="p-3 text-right">Cost of Goods Sold</th>
                  <th className="p-3 text-right">Gross Profit</th>
                  <th className="p-3 text-right">Gross Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {productRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No product sales yet.
                    </td>
                  </tr>
                ) : (
                  productRows.map((r, i) => {
                    const margin = r.revenue > 0 ? ((r.profit / r.revenue) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">{r.name}</td>
                        <td className="p-3 font-mono text-slate-400">{r.sku}</td>
                        <td className="p-3 text-center font-bold">{r.unitsSold}</td>
                        <td className="p-3 text-right font-mono">{settings.currencySymbol} {r.revenue.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono text-slate-500">{settings.currencySymbol} {r.cost.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600">
                          {settings.currencySymbol} {r.profit.toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold">{margin}%</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Sales by Category */}
      {activeTab === 'by_category' && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <span className="font-semibold text-xs text-slate-900 dark:text-white">
              Category Department Contribution
            </span>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 font-semibold text-slate-500 text-[10px] uppercase">
              <tr>
                <th className="p-3">Category Name</th>
                <th className="p-3 text-center">Total Units Sold</th>
                <th className="p-3 text-right">Net Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {categoryRows.map((c, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-3 font-semibold text-slate-900 dark:text-white">{c.name}</td>
                  <td className="p-3 text-center">{c.units}</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                    {settings.currencySymbol} {c.revenue.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Operating Expenses by Category */}
      {activeTab === 'expenses' && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <span className="font-semibold text-xs text-slate-900 dark:text-white">
              Paid Operating Expenses by Category
            </span>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 font-semibold text-slate-500 text-[10px] uppercase">
              <tr>
                <th className="p-3">Expense Category</th>
                <th className="p-3 text-right">Total Paid Out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {Object.entries(expenseCatMap).map(([cat, amt], i) => (
                <tr key={i}>
                  <td className="p-3 font-medium capitalize">{cat.replace('_', ' ')}</td>
                  <td className="p-3 text-right font-mono font-bold text-rose-600">
                    {settings.currencySymbol} {amt.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Supplier Payables */}
      {activeTab === 'supplier_payables' && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <span className="font-semibold text-xs text-slate-900 dark:text-white">
              Vendor Payables Balance Aging
            </span>
            <span className="font-mono font-bold text-amber-600 text-xs">
              Total Payables: {settings.currencySymbol} {suppliers.reduce((a, s) => a + s.currentPayable, 0).toLocaleString()}
            </span>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 font-semibold text-slate-500 text-[10px] uppercase">
              <tr>
                <th className="p-3">Supplier Name</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Phone</th>
                <th className="p-3 text-right">Current Payable Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td className="p-3 font-semibold">{s.name}</td>
                  <td className="p-3">{s.contactPerson}</td>
                  <td className="p-3">{s.phone}</td>
                  <td className="p-3 text-right font-mono font-bold text-amber-600">
                    {settings.currencySymbol} {s.currentPayable.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Customer Receivables */}
      {activeTab === 'customer_receivables' && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <span className="font-semibold text-xs text-slate-900 dark:text-white">
              Customer Store Credit Ledger & Receivables
            </span>
            <span className="font-mono font-bold text-blue-600 text-xs">
              Total Receivables: {settings.currencySymbol} {customers.reduce((a, c) => a + c.currentReceivable, 0).toLocaleString()}
            </span>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 font-semibold text-slate-500 text-[10px] uppercase">
              <tr>
                <th className="p-3">Customer Name</th>
                <th className="p-3">Phone</th>
                <th className="p-3 text-right">Credit Limit</th>
                <th className="p-3 text-right">Current Debt Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {customers.map((c) => (
                <tr key={c.id}>
                  <td className="p-3 font-semibold">{c.name}</td>
                  <td className="p-3">{c.phone}</td>
                  <td className="p-3 text-right font-mono">{settings.currencySymbol} {c.creditLimit}</td>
                  <td className="p-3 text-right font-mono font-bold text-blue-600">
                    {settings.currencySymbol} {c.currentReceivable.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Executive P&L Statement */}
      {activeTab === 'pnl_summary' && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-w-2xl mx-auto">
          <div className="text-center pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {settings.businessName} — Profit and Loss Statement
            </h3>
            <span className="text-xs text-slate-500">
              Accrual-based grocery accounting statement
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between font-semibold">
              <span>Gross Sales (Revenues)</span>
              <span className="font-mono">{settings.currencySymbol} {metrics.grossSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500 pl-4">
              <span>Less: Customer Discounts Allowed</span>
              <span className="font-mono">({settings.currencySymbol} {metrics.discounts.toFixed(2)})</span>
            </div>
            <div className="flex justify-between text-slate-500 pl-4">
              <span>Less: Sales Returns & Refunds</span>
              <span className="font-mono">({settings.currencySymbol} {metrics.returnsTotal.toFixed(2)})</span>
            </div>
            <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1 border-t">
              <span>NET SALES REVENUE</span>
              <span className="font-mono">{settings.currencySymbol} {metrics.netSales.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-slate-600 pl-4 pt-2">
              <span>Less: Cost of Goods Sold (COGS)</span>
              <span className="font-mono">({settings.currencySymbol} {metrics.cogs.toFixed(2)})</span>
            </div>

            <div className="flex justify-between font-bold text-emerald-600 text-sm pt-2 border-t">
              <span>GROSS PROFIT</span>
              <span className="font-mono">{settings.currencySymbol} {metrics.grossProfit.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-slate-600 pl-4 pt-2">
              <span>Less: Operating Expenses</span>
              <span className="font-mono">({settings.currencySymbol} {metrics.operatingExpenses.toFixed(2)})</span>
            </div>

            <div className="flex justify-between font-bold text-base pt-3 border-t-2 border-slate-900 dark:border-slate-100 text-slate-900 dark:text-white">
              <span>NET OPERATING INCOME / PROFIT</span>
              <span
                className={`font-mono ${
                  metrics.netOperatingProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                }`}
              >
                {settings.currencySymbol} {metrics.netOperatingProfit.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
