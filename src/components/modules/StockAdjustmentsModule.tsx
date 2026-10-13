import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { db } from '../../db/db';
import { StockAdjustment, StockAdjustmentType } from '../../types';
import { PdfService } from '../../services/pdfService';

export const StockAdjustmentsModule: React.FC = () => {
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>(db.getStockAdjustments());
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form
  const [selectedProductId, setSelectedProductId] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<StockAdjustmentType>('physical_count_correction');
  const [adjustmentQty, setAdjustmentQty] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const products = db.getProducts();
  const settings = db.getSettings();

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const refreshList = () => {
    setAdjustments(db.getStockAdjustments());
  };

  const handleOpenAdd = () => {
    setSelectedProductId(products[0]?.id || '');
    setAdjustmentType('physical_count_correction');
    setAdjustmentQty(0);
    setReason('Monthly shelf inventory count audit');
    setNotes('');
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedProductId) {
      setError('Please select a product.');
      return;
    }
    if (adjustmentQty === 0) {
      setError('Adjustment quantity cannot be zero.');
      return;
    }

    try {
      const adj = await db.createStockAdjustment(
        selectedProductId,
        adjustmentType,
        adjustmentQty,
        reason,
        notes
      );
      setSuccess(`Stock adjustment #${adj.adjustmentNumber} posted successfully.`);
      setIsModalOpen(false);
      refreshList();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to adjust stock');
    }
  };

  const filteredAdjustments = adjustments.filter(
    (a) =>
      a.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.adjustmentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-emerald-600" />
            Stock Adjustments & Corrections
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Perform physical stock count corrections, document damaged or expired goods, and record internal use.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Stock Adjustment</span>
        </button>
      </div>

      {/* Notifications */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-md text-xs">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search adjustments by product, SKU, reference..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200"
          />
        </div>
        <div className="text-xs text-slate-500">
          Total Adjustments: <strong>{filteredAdjustments.length}</strong>
        </div>
      </div>

      {/* Adjustments Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Adj # & Date</th>
                <th className="py-3 px-4">Product Name & SKU</th>
                <th className="py-3 px-4">Adjustment Type</th>
                <th className="py-3 px-4 text-center">Previous Stock</th>
                <th className="py-3 px-4 text-center">Qty Change</th>
                <th className="py-3 px-4 text-center">New Final Stock</th>
                <th className="py-3 px-4">Reason & Staff</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAdjustments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No stock adjustments recorded yet.
                  </td>
                </tr>
              ) : (
                filteredAdjustments.map((adj) => {
                  const isPositive = adj.adjustmentQuantity > 0;
                  return (
                    <tr key={adj.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <div className="font-mono font-medium text-slate-900 dark:text-white">
                          {adj.adjustmentNumber}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(adj.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {adj.productName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {adj.sku}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize font-medium text-slate-700 dark:text-slate-300">
                          {adj.adjustmentType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-500">
                        {adj.currentStock}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        <span className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                          {isPositive ? `+${adj.adjustmentQuantity}` : adj.adjustmentQuantity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-slate-900 dark:text-white">
                        {adj.finalStock}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-700 dark:text-slate-300">{adj.reason}</div>
                        <div className="text-[10px] text-slate-400">By {adj.userName}</div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => PdfService.generateStockAdjustmentReport(adj, settings)}
                          className="px-2 py-1 text-slate-600 hover:text-emerald-600 dark:text-slate-400 rounded"
                          title="Download Adjustment PDF"
                        >
                          <FileText className="w-3.5 h-3.5 inline mr-1" />
                          PDF
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
              Perform Stock Adjustment
            </h3>

            {error && (
              <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Product *
                </label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — Current Stock: {p.quantityOnHand} {p.unit}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduct && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Current Stock On Hand:</span>
                    <strong className="font-mono text-slate-900 dark:text-white">
                      {selectedProduct.quantityOnHand} {selectedProduct.unit}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Proposed Change:</span>
                    <span
                      className={`font-mono font-semibold ${
                        adjustmentQty >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {adjustmentQty > 0 ? `+${adjustmentQty}` : adjustmentQty} {selectedProduct.unit}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Resulting Stock:</span>
                    <strong className="font-mono text-slate-900 dark:text-white">
                      {selectedProduct.quantityOnHand + adjustmentQty} {selectedProduct.unit}
                    </strong>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Adjustment Type *
                </label>
                <select
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value as StockAdjustmentType)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
                >
                  <option value="physical_count_correction">Physical Stock Count Correction</option>
                  <option value="stock_increase">Manual Stock Increase</option>
                  <option value="stock_decrease">Manual Stock Decrease</option>
                  <option value="damaged">Damaged Goods Write-off</option>
                  <option value="expired">Expired Goods Disposal</option>
                  <option value="internal_use">Internal Store Use</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Quantity Change (+ or -) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. -5 to reduce, +10 to increase"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Use negative numbers (e.g. -3) for damages, expiration, or stock shrinkage.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Adjustment *
                </label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Shelf audit discrepancy, broken bottle during transport"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md shadow-xs"
                >
                  Commit Stock Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
