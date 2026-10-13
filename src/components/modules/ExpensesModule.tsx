import React, { useState } from 'react';
import {
  Wallet,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { db } from '../../db/db';
import { Expense, ExpenseCategory } from '../../types';
import { PdfService } from '../../services/pdfService';

export const ExpensesModule: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>(db.getExpenses());
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedExpenseForCancel, setSelectedExpenseForCancel] = useState<Expense | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [category, setCategory] = useState<ExpenseCategory>('cleaning');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer'>('cash');
  const [payee, setPayee] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  const settings = db.getSettings();

  const refreshList = () => {
    setExpenses(db.getExpenses());
  };

  const handleOpenAdd = () => {
    setCategory('cleaning');
    setDescription('');
    setAmount(0);
    setPaymentMethod('cash');
    setPayee('');
    setReferenceNumber('');
    setNotes('');
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const exp = await db.createExpense({
        date: new Date().toISOString().slice(0, 10),
        category,
        description,
        amount: Number(amount),
        paymentMethod,
        payee,
        referenceNumber,
        notes,
        status: 'paid',
      });
      setSuccess(`Expense #${exp.expenseNumber} recorded.`);
      setIsModalOpen(false);
      refreshList();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to record expense');
    }
  };

  const handleOpenCancel = (exp: Expense) => {
    setSelectedExpenseForCancel(exp);
    setCancelReason('');
    setError(null);
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpenseForCancel) return;
    try {
      await db.cancelExpense(selectedExpenseForCancel.id, cancelReason);
      setSuccess(`Expense #${selectedExpenseForCancel.expenseNumber} cancelled.`);
      setCancelModalOpen(false);
      refreshList();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to cancel expense');
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      e.expenseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.payee && e.payee.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalExpenses = filteredExpenses
    .filter((e) => e.status === 'paid')
    .reduce((acc, e) => acc + e.amount, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
            Operating Expenses & Petty Cash
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Record utilities, staff wages, freight, packaging, and store maintenance with cash drawer integration.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Record Expense</span>
        </button>
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
          <span className="text-[11px] font-semibold text-slate-400 uppercase block">Total Operating Expenses (Paid)</span>
          <span className="text-2xl font-bold text-rose-600 mt-0.5 block font-mono">
            {settings.currencySymbol} {totalExpenses.toLocaleString()}
          </span>
        </div>
        <div className="text-xs text-slate-500">
          Vouchers: <strong>{filteredExpenses.length}</strong>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search expenses by description, payee, voucher #..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Categories</option>
            <option value="electricity">Electricity & Utilities</option>
            <option value="rent">Shop Rent</option>
            <option value="staff_costs">Staff Wages</option>
            <option value="transport">Freight & Transport</option>
            <option value="packaging">Packaging Bags & Cartons</option>
            <option value="cleaning">Cleaning & Hygiene</option>
            <option value="maintenance">Maintenance</option>
            <option value="miscellaneous">Miscellaneous</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Voucher # & Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Payee / Vendor</th>
                <th className="py-3 px-4 text-center">Payment Method</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No operating expenses recorded yet.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const isCancelled = exp.status === 'cancelled';
                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <div className="font-mono font-medium text-slate-900 dark:text-white">{exp.expenseNumber}</div>
                        <div className="text-[10px] text-slate-400">{new Date(exp.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="py-3 px-4 capitalize font-medium text-slate-800 dark:text-slate-200">
                        {exp.category.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-700 dark:text-slate-300">{exp.description}</td>
                      <td className="py-3 px-4 text-slate-500">{exp.payee || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="capitalize font-mono text-[11px]">
                          {exp.paymentMethod.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {settings.currencySymbol} {exp.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            isCancelled
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 line-through'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60'
                          }`}
                        >
                          {exp.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          onClick={() => PdfService.generateExpenseVoucher(exp, settings)}
                          className="px-2 py-1 text-slate-600 hover:text-emerald-600 rounded"
                          title="Download Expense Voucher PDF"
                        >
                          <FileText className="w-3.5 h-3.5 inline mr-1" />
                          Voucher
                        </button>
                        {!isCancelled && (
                          <button
                            onClick={() => handleOpenCancel(exp)}
                            className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded"
                            title="Cancel expense"
                          >
                            <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
                            Cancel
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

      {/* Record Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-600" />
              Record Store Expense
            </h3>

            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Expense Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md"
                >
                  <option value="electricity">Electricity & Utilities</option>
                  <option value="rent">Shop Rent</option>
                  <option value="staff_costs">Staff Wages / Tea</option>
                  <option value="transport">Freight & Loading</option>
                  <option value="packaging">Packaging Supplies</option>
                  <option value="cleaning">Store Cleaning & Supplies</option>
                  <option value="maintenance">Maintenance & Repairs</option>
                  <option value="miscellaneous">Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Description *</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Monthly commercial electricity bill"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Amount ({settings.currencySymbol}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Paid Via *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md"
                  >
                    <option value="cash">Cash (from drawer)</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Payee / Recipient</label>
                <input
                  type="text"
                  value={payee}
                  onChange={(e) => setPayee(e.target.value)}
                  placeholder="e.g. IESCO / Landlord / Vendor"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Reference / Bill #</label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. Bill Consumer # 192831"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md shadow-xs"
                >
                  Post Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Expense Modal */}
      {cancelModalOpen && selectedExpenseForCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-rose-600" />
              Cancel Expense #{selectedExpenseForCancel.expenseNumber}
            </h3>

            <p className="text-xs text-slate-500">
              Cancelling this expense will restore the cash amount to the cash drawer if it was paid in cash.
            </p>

            <form onSubmit={handleConfirmCancel} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Reason for Cancellation *</label>
                <textarea
                  rows={3}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Duplicate voucher entry, reimbursed by supplier..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="px-3 py-1.5 border rounded-md"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-md shadow-xs"
                >
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
