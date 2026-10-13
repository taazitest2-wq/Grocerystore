import React, { useState } from 'react';
import {
  Boxes,
  Search,
  Filter,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  History,
  TrendingDown,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { db } from '../../db/db';
import { Product, InventoryMovement } from '../../types';
import { CsvService } from '../../services/csvService';
import { PdfService } from '../../services/pdfService';

export const InventoryModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'current_stock' | 'movements_ledger' | 'expiry_alerts'>('current_stock');
  const [searchTerm, setSearchTerm] = useState('');
  const [movementFilter, setMovementFilter] = useState<string>('all');

  const products = db.getProducts();
  const movements = db.getInventoryMovements();
  const settings = db.getSettings();

  const totalStockValuation = products.reduce(
    (acc, p) => acc + Math.max(0, p.quantityOnHand) * p.purchaseCost,
    0
  );

  const lowStockProducts = products.filter(
    (p) => p.quantityOnHand > 0 && p.quantityOnHand <= p.reorderLevel
  );
  const outOfStockProducts = products.filter((p) => p.quantityOnHand <= 0);

  // Expiry alerts: products with expiryTracking and expiry date within 60 days
  const nowTime = new Date().getTime();
  const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
  const expiringProducts = products.filter((p) => {
    if (!p.expiryTracking || !p.expiryDate) return false;
    const expTime = new Date(p.expiryDate).getTime();
    return expTime - nowTime <= sixtyDaysMs;
  });

  const filteredMovements = movements.filter((m) => {
    const matchesSearch =
      m.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.movementNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = movementFilter === 'all' || m.movementType === movementFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Boxes className="w-5 h-5 text-emerald-600" />
            Inventory & Stock Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time stock valuation, immutable movement audit ledger, and shelf expiration tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => CsvService.exportInventoryMovementsCsv(filteredMovements)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 rounded-md text-xs font-medium"
            title="Export stock movements to CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ledger CSV</span>
          </button>
          <button
            onClick={() => PdfService.generateInventoryReport(products, settings)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 rounded-md text-xs font-medium"
            title="Download Inventory Valuation PDF"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span>Inventory PDF</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase block">Total Stock Valuation</span>
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {settings.currencySymbol} {totalStockValuation.toLocaleString()}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-amber-500 uppercase block">Low Stock Items</span>
          <span className="text-xl font-bold text-amber-600 mt-1 block">
            {lowStockProducts.length} items
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-rose-500 uppercase block">Out of Stock Items</span>
          <span className="text-xl font-bold text-rose-600 mt-1 block">
            {outOfStockProducts.length} items
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-blue-500 uppercase block">Ledger Audit Records</span>
          <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">
            {movements.length} logged
          </span>
        </div>
      </div>

      {/* Segmented View Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('current_stock')}
          className={`pb-2.5 px-3 transition-colors border-b-2 ${
            activeTab === 'current_stock'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Current Stock & Valuation
        </button>
        <button
          onClick={() => setActiveTab('movements_ledger')}
          className={`pb-2.5 px-3 transition-colors border-b-2 ${
            activeTab === 'movements_ledger'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Auditable Stock Movement Ledger ({movements.length})
        </button>
        <button
          onClick={() => setActiveTab('expiry_alerts')}
          className={`pb-2.5 px-3 transition-colors border-b-2 ${
            activeTab === 'expiry_alerts'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Expiry Date Alerts ({expiringProducts.length})
        </button>
      </div>

      {/* Tab 1: Current Stock */}
      {activeTab === 'current_stock' && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Product Name & SKU</th>
                  <th className="py-3 px-4 text-center">Unit</th>
                  <th className="py-3 px-4 text-right">Unit Cost</th>
                  <th className="py-3 px-4 text-center">Stock On Hand</th>
                  <th className="py-3 px-4 text-center">Reorder Level</th>
                  <th className="py-3 px-4 text-right">Valuation (Cost)</th>
                  <th className="py-3 px-4 text-center">Stock Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {products.map((p) => {
                  const isLow = p.quantityOnHand > 0 && p.quantityOnHand <= p.reorderLevel;
                  const isOut = p.quantityOnHand <= 0;
                  const val = p.quantityOnHand * p.purchaseCost;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{p.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">SKU: {p.sku}</div>
                      </td>
                      <td className="py-3 px-4 text-center uppercase font-mono">{p.unit}</td>
                      <td className="py-3 px-4 text-right font-mono">
                        {settings.currencySymbol} {p.purchaseCost.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-white">
                        {p.quantityOnHand}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-500">
                        {p.reorderLevel}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {settings.currencySymbol} {val.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isOut ? (
                          <span className="text-rose-600 font-semibold text-[11px]">Out of Stock</span>
                        ) : isLow ? (
                          <span className="text-amber-600 font-semibold text-[11px]">Low Stock</span>
                        ) : (
                          <span className="text-emerald-600 font-medium text-[11px]">Healthy</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Stock Movements Ledger (Auditable) */}
      {activeTab === 'movements_ledger' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search ledger by product, SKU, movement #..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200"
              />
            </div>

            <select
              value={movementFilter}
              onChange={(e) => setMovementFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Movement Types</option>
              <option value="opening_stock">Opening Stock</option>
              <option value="sale">Sale Deduction</option>
              <option value="sale_return">Sale Return (Restock)</option>
              <option value="purchase_receive">Purchase Received</option>
              <option value="manual_adjustment">Manual Adjustment</option>
              <option value="damaged">Damaged Stock</option>
              <option value="expired">Expired Stock</option>
            </select>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Time & Ledger #</th>
                    <th className="py-3 px-4">Product & SKU</th>
                    <th className="py-3 px-4">Movement Type</th>
                    <th className="py-3 px-4 text-center">Change Qty</th>
                    <th className="py-3 px-4 text-center">Balance After</th>
                    <th className="py-3 px-4">Ref Document</th>
                    <th className="py-3 px-4">Reason & User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        No ledger movements recorded yet.
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((m) => {
                      const isPositive = m.quantityChange > 0;
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4">
                            <div className="font-mono text-slate-800 dark:text-slate-200">{m.movementNumber}</div>
                            <div className="text-[10px] text-slate-400">{new Date(m.timestamp).toLocaleString()}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 dark:text-white">{m.productName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{m.sku}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="capitalize font-medium text-slate-700 dark:text-slate-300">
                              {m.movementType.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold">
                            <span className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                              {isPositive ? `+${m.quantityChange}` : m.quantityChange}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-medium text-slate-800 dark:text-slate-200">
                            {m.balanceAfter}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                            {m.referenceNumber}
                          </td>
                          <td className="py-3 px-4">
                            <div>{m.reason}</div>
                            <div className="text-[10px] text-slate-400">By {m.userName}</div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Expiry Alerts */}
      {activeTab === 'expiry_alerts' && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4 text-center">Remaining Stock</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4 text-right">Potential Loss Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {expiringProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      No tracked products are expiring within the next 60 days.
                    </td>
                  </tr>
                ) : (
                  expiringProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{p.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{p.sku}</td>
                      <td className="py-3 px-4 text-center font-bold">{p.quantityOnHand} {p.unit}</td>
                      <td className="py-3 px-4 font-semibold text-amber-600">
                        {p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-rose-600">
                        {settings.currencySymbol} {(p.quantityOnHand * p.purchaseCost).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
