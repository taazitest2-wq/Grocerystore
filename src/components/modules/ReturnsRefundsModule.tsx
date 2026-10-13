import React, { useState } from 'react';
import {
  RotateCcw,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Package,
  CreditCard,
  Plus,
} from 'lucide-react';
import { db } from '../../db/db';
import { ReturnRecord, Sale, PaymentMethod } from '../../types';
import { PdfService } from '../../services/pdfService';

export const ReturnsRefundsModule: React.FC = () => {
  const [returns, setReturns] = useState<ReturnRecord[]>(db.getReturns());
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [selectedSaleNumber, setSelectedSaleNumber] = useState('');
  const [foundSale, setFoundSale] = useState<Sale | null>(null);

  // Return items form state: { saleItemId: quantityToReturn }
  const [returnItemsInput, setReturnItemsInput] = useState<{ [saleItemId: string]: number }>({});
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('cash');
  const [disposition, setDisposition] = useState<'restock' | 'quarantine' | 'discard'>('restock');
  const [reason, setReason] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const sales = db.getSales();
  const settings = db.getSettings();

  const refreshList = () => {
    setReturns(db.getReturns());
  };

  const handleSearchSale = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const sale = sales.find(
      (s) =>
        s.saleNumber.toLowerCase() === selectedSaleNumber.trim().toLowerCase() &&
        s.status !== 'reversed'
    );
    if (!sale) {
      setError(`No active sale found with invoice #${selectedSaleNumber}`);
      setFoundSale(null);
      return;
    }
    setFoundSale(sale);
    const initialInputs: { [saleItemId: string]: number } = {};
    sale.items.forEach((it) => {
      const remaining = it.quantity - it.returnedQuantity;
      initialInputs[it.id] = remaining > 0 ? 1 : 0;
    });
    setReturnItemsInput(initialInputs);
  };

  const handleOpenProcess = () => {
    setSelectedSaleNumber('');
    setFoundSale(null);
    setReturnItemsInput({});
    setRefundMethod('cash');
    setDisposition('restock');
    setReason('Customer returned unopened item with original receipt');
    setError(null);
    setIsProcessModalOpen(true);
  };

  const handleConfirmReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundSale) return;
    setError(null);

    try {
      const items = Object.entries(returnItemsInput)
        .filter(([_, qty]) => qty > 0)
        .map(([saleItemId, quantity]) => ({ saleItemId, quantity: Number(quantity) }));

      if (items.length === 0) {
        throw new Error('Please select at least one item and quantity to return.');
      }

      const ret = await db.processReturn({
        originalSaleId: foundSale.id,
        items,
        refundMethod,
        disposition,
        reason,
      });

      setSuccess(`Return #${ret.returnNumber} processed successfully (Refund: ${settings.currencySymbol}${ret.totalRefund}).`);
      setIsProcessModalOpen(false);
      refreshList();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Return processing failed');
    }
  };

  const filteredReturns = returns.filter((r) =>
    r.returnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.originalSaleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-emerald-600" />
            Customer Returns & Refunds
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Link returns directly to original sales receipts, ensure refundable quantities are strictly enforced, and track restocked inventory.
          </p>
        </div>
        <button
          onClick={handleOpenProcess}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Process Return & Refund</span>
        </button>
      </div>

      {/* Notifications */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs">
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
            placeholder="Search return number, invoice #, customer..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200"
          />
        </div>
        <div className="text-xs text-slate-500">
          Total Returns: <strong>{filteredReturns.length}</strong>
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Return # & Date</th>
                <th className="py-3 px-4">Original Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-center">Items Returned</th>
                <th className="py-3 px-4 text-right">Refund Amount</th>
                <th className="py-3 px-4 text-center">Disposition</th>
                <th className="py-3 px-4">Reason & Approver</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No returns logged yet.
                  </td>
                </tr>
              ) : (
                filteredReturns.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <div className="font-mono font-medium text-slate-900 dark:text-white">{r.returnNumber}</div>
                      <div className="text-[10px] text-slate-400">{new Date(r.createdAt).toLocaleString()}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {r.originalSaleNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-800 dark:text-slate-200">{r.customerName}</td>
                    <td className="py-3 px-4 text-center">{r.items.length} lines</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                      {settings.currencySymbol} {r.totalRefund.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          r.disposition === 'restock'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60'
                        }`}
                      >
                        {r.disposition}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>{r.reason}</div>
                      <div className="text-[10px] text-slate-400">Approved by {r.approvedBy}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => PdfService.generateReturnReceipt(r, settings)}
                        className="px-2 py-1 text-slate-600 hover:text-emerald-600 rounded"
                        title="Download Return Voucher PDF"
                      >
                        <FileText className="w-3.5 h-3.5 inline mr-1" />
                        PDF
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Process Return Modal */}
      {isProcessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl p-6 space-y-4 my-8">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-emerald-600" />
              Process Customer Return & Refund
            </h3>

            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Find Sale Form */}
            <form onSubmit={handleSearchSale} className="flex gap-2 text-xs">
              <input
                type="text"
                required
                value={selectedSaleNumber}
                onChange={(e) => setSelectedSaleNumber(e.target.value)}
                placeholder="Enter Invoice Number (e.g. INV-2026-1001)..."
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold rounded-md"
              >
                Find Sale
              </button>
            </form>

            {foundSale && (
              <form onSubmit={handleConfirmReturn} className="space-y-4 text-xs pt-2">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Invoice:</span>
                    <strong className="font-mono">{foundSale.saleNumber}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer:</span>
                    <span>{foundSale.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Original Total:</span>
                    <span className="font-mono">{settings.currencySymbol} {foundSale.total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Items to return table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="p-2">Product Name</th>
                        <th className="p-2 text-center">Sold Qty</th>
                        <th className="p-2 text-center">Already Returned</th>
                        <th className="p-2 text-center">Remaining Returnable</th>
                        <th className="p-2 text-center w-28">Return Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {foundSale.items.map((it) => {
                        const remaining = it.quantity - it.returnedQuantity;
                        return (
                          <tr key={it.id}>
                            <td className="p-2 font-medium">{it.productName}</td>
                            <td className="p-2 text-center font-mono">{it.quantity} {it.unit}</td>
                            <td className="p-2 text-center font-mono text-slate-400">{it.returnedQuantity}</td>
                            <td className="p-2 text-center font-mono font-semibold">{remaining}</td>
                            <td className="p-2 text-center">
                              <input
                                type="number"
                                min="0"
                                max={remaining}
                                disabled={remaining <= 0}
                                value={returnItemsInput[it.id] ?? 0}
                                onChange={(e) =>
                                  setReturnItemsInput({
                                    ...returnItemsInput,
                                    [it.id]: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-20 px-2 py-1 text-center font-mono bg-white dark:bg-slate-800 border rounded"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold mb-1">Stock Disposition *</label>
                    <select
                      value={disposition}
                      onChange={(e) => setDisposition(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md"
                    >
                      <option value="restock">Restock (Return to shelf inventory)</option>
                      <option value="quarantine">Quarantine (Inspect / Damaged)</option>
                      <option value="discard">Discard / Write-off</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Refund Method *</label>
                    <select
                      value={refundMethod}
                      onChange={(e) => setRefundMethod(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md"
                    >
                      <option value="cash">Cash (payout from drawer float)</option>
                      <option value="credit">Store Credit / Account Deduction</option>
                      <option value="card">Card / Reversal</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Reason for Return *</label>
                  <input
                    type="text"
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Customer changed mind, wrong flavor purchased..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsProcessModalOpen(false)}
                    className="px-3 py-1.5 border rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-md shadow-xs"
                  >
                    Authorize & Issue Refund
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
