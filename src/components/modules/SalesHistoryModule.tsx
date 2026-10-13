import React, { useState } from 'react';
import {
  Receipt,
  Search,
  Filter,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  Eye,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { db } from '../../db/db';
import { Sale } from '../../types';
import { CsvService } from '../../services/csvService';
import { PdfService } from '../../services/pdfService';

export const SalesHistoryModule: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>(db.getSales());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [reversalModalOpen, setReversalModalOpen] = useState(false);
  const [reversalReason, setReversalReason] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const settings = db.getSettings();

  const refreshList = () => {
    setSales(db.getSales());
    if (selectedSale) {
      const updated = db.getSaleById(selectedSale.id);
      setSelectedSale(updated || null);
    }
  };

  const handleOpenReverse = (sale: Sale) => {
    setSelectedSale(sale);
    setReversalReason('');
    setError(null);
    setReversalModalOpen(true);
  };

  const handleConfirmReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) return;
    if (!reversalReason.trim()) {
      setError('A documented reversal reason is required.');
      return;
    }

    try {
      await db.reverseSale(selectedSale.id, reversalReason.trim());
      setSuccess(`Sale #${selectedSale.saleNumber} reversed. Stock & drawer cash restored.`);
      setReversalModalOpen(false);
      refreshList();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Reversal failed');
    }
  };

  const filteredSales = sales.filter((s) => {
    const matchesSearch =
      s.saleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.cashierName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || s.primaryPaymentMethod === paymentFilter;
    return matchesSearch && matchesStatus && matchesPayment;
  });

  const totalVolume = filteredSales
    .filter((s) => s.status !== 'reversed')
    .reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            Sales History & Invoices
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Complete transaction ledger of counter checkouts, reprints, audit trails, and controlled reversals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => CsvService.exportSalesCsv(filteredSales)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 rounded-md text-xs font-medium"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Summary KPI */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase block">Filtered Revenue Volume</span>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block font-mono">
            {settings.currencySymbol} {totalVolume.toFixed(2)}
          </span>
        </div>
        <div className="text-xs text-slate-500">
          Transactions: <strong>{filteredSales.length}</strong>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search invoice number, customer, cashier..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="reversed">Reversed</option>
            <option value="partially_returned">Partially Returned</option>
            <option value="returned">Fully Returned</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Payment Methods</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="mobile_wallet">Mobile Wallet</option>
            <option value="credit">Store Credit</option>
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Invoice # & Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Cashier</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Payment</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No sales found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => {
                  const isReversed = s.status === 'reversed';
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white font-mono">
                          {s.saleNumber}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(s.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {s.customerName}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {s.cashierName}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {s.items.length} lines
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {settings.currencySymbol} {s.total.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="capitalize font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          {s.primaryPaymentMethod.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            isReversed
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 line-through'
                              : s.status === 'returned'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                        >
                          {s.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          onClick={() => setSelectedSale(s)}
                          className="px-2 py-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded"
                          title="View sale items & details"
                        >
                          <Eye className="w-3.5 h-3.5 inline mr-1" />
                          Details
                        </button>
                        <button
                          onClick={() => PdfService.generateSalesReceipt(s, settings, 'a4')}
                          className="px-2 py-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded font-medium"
                          title="Reprint receipt PDF"
                        >
                          <FileText className="w-3.5 h-3.5 inline mr-1" />
                          PDF
                        </button>
                        {!isReversed && (
                          <button
                            onClick={() => handleOpenReverse(s)}
                            className="px-2 py-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded"
                            title="Controlled Transaction Reversal"
                          >
                            <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
                            Reverse
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Details Modal */}
      {selectedSale && !reversalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Sale Invoice #{selectedSale.saleNumber}
                </h3>
                <span className="text-xs text-slate-500">
                  Customer: {selectedSale.customerName} · Cashier: {selectedSale.cashierName} · {new Date(selectedSale.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => PdfService.generateSalesReceipt(selectedSale, settings, 'a4')}
                  className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  A4 PDF
                </button>
                <button
                  onClick={() => PdfService.generateSalesReceipt(selectedSale, settings, 'thermal_80mm')}
                  className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded flex items-center gap-1"
                >
                  <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                  Thermal PDF
                </button>
              </div>
            </div>

            {selectedSale.reversalReason && (
              <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded text-xs">
                <strong>Reversed:</strong> {selectedSale.reversalReason}
              </div>
            )}

            {/* Line Items Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 font-semibold">
                  <tr>
                    <th className="p-2">Item</th>
                    <th className="p-2 text-right">Unit Price</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Discount</th>
                    <th className="p-2 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedSale.items.map((it) => (
                    <tr key={it.id}>
                      <td className="p-2">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{it.productName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{it.sku}</div>
                      </td>
                      <td className="p-2 text-right font-mono">{settings.currencySymbol} {it.unitPrice.toFixed(2)}</td>
                      <td className="p-2 text-center font-mono">{it.quantity} {it.unit}</td>
                      <td className="p-2 text-right font-mono text-slate-500">
                        {it.discount > 0 ? `-${settings.currencySymbol} ${it.discount.toFixed(2)}` : '-'}
                      </td>
                      <td className="p-2 text-right font-mono font-semibold">{settings.currencySymbol} {it.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded text-xs space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-mono">{settings.currencySymbol} {selectedSale.subtotal.toFixed(2)}</span>
              </div>
              {selectedSale.discountTotal > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Discounts Applied:</span>
                  <span className="font-mono">-{settings.currencySymbol} {selectedSale.discountTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-700">
                <span>Grand Total:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  {settings.currencySymbol} {selectedSale.total.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-500 pt-1">
                <span>Amount Paid:</span>
                <span className="font-mono">{settings.currencySymbol} {selectedSale.amountPaid.toFixed(2)}</span>
              </div>
              {selectedSale.changeGiven > 0 && (
                <div className="flex justify-between text-amber-600 font-semibold">
                  <span>Change Given:</span>
                  <span className="font-mono">{settings.currencySymbol} {selectedSale.changeGiven.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="px-4 py-1.5 border border-slate-200 dark:border-slate-700 rounded text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controlled Reversal Confirmation Dialog */}
      {reversalModalOpen && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-rose-600" />
              Controlled Reversal of Sale #{selectedSale.saleNumber}
            </h3>

            <p className="text-xs text-slate-500">
              Reversing this completed transaction will atomically restore all item stock quantities, reverse any cash received from the drawer session, and log an auditable event.
            </p>

            {error && (
              <div className="p-2.5 bg-rose-50 text-rose-800 border border-rose-200 rounded text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleConfirmReversal} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Transaction Reversal *
                </label>
                <textarea
                  rows={3}
                  required
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="e.g. Wrong items entered, customer payment failed after checkout, cashier entry mistake..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setReversalModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-md shadow-xs"
                >
                  Confirm Reversal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
