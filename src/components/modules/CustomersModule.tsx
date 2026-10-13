import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Archive,
  CheckCircle2,
  AlertCircle,
  FileText,
  CreditCard,
  UserCheck,
} from 'lucide-react';
import { db } from '../../db/db';
import { Customer, PaymentMethod } from '../../types';
import { PdfService } from '../../services/pdfService';

export const CustomersModule: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>(db.getCustomers());
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState<number>(10000);
  const [notes, setNotes] = useState('');

  // Payment State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedCustomerForPay, setSelectedCustomerForPay] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payRef, setPayRef] = useState('');

  const settings = db.getSettings();
  const sales = db.getSales();

  const refreshList = () => {
    setCustomers(db.getCustomers());
  };

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setAddress('');
    setCreditLimit(10000);
    setNotes('');
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setAddress(c.address || '');
    setCreditLimit(c.creditLimit);
    setNotes(c.notes || '');
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingCustomer) {
        await db.updateCustomer(editingCustomer.id, {
          name,
          phone,
          address,
          creditLimit: Number(creditLimit),
          notes,
        });
        setSuccess(`Customer "${name}" updated.`);
      } else {
        await db.createCustomer({
          name,
          phone,
          address,
          openingBalance: 0,
          creditLimit: Number(creditLimit),
          notes,
        });
        setSuccess(`Customer "${name}" created.`);
      }
      setIsModalOpen(false);
      refreshList();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save customer');
    }
  };

  const handleArchive = async (c: Customer) => {
    if (c.id === 'walkin-cust') {
      alert('Walk-in Customer is a permanent system record and cannot be archived.');
      return;
    }
    if (c.currentReceivable > 0) {
      alert(`Cannot archive ${c.name} while there is an outstanding debt of ${settings.currencySymbol} ${c.currentReceivable}.`);
      return;
    }
    if (confirm(`Archive customer "${c.name}"?`)) {
      try {
        await db.updateCustomer(c.id, { isArchived: true });
        setSuccess(`Customer "${c.name}" archived.`);
        refreshList();
        setTimeout(() => setSuccess(null), 3000);
      } catch (err: any) {
        alert(err.message || 'Failed to archive customer');
      }
    }
  };

  const handleOpenPay = (c: Customer) => {
    setSelectedCustomerForPay(c);
    setPayAmount(c.currentReceivable);
    setPayMethod('cash');
    setPayRef('');
    setPaymentModalOpen(true);
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForPay) return;
    try {
      await db.recordCustomerPayment(
        selectedCustomerForPay.id,
        payAmount,
        payMethod,
        payRef,
        'Customer credit account payment'
      );
      setSuccess(`Recorded payment of ${settings.currencySymbol} ${payAmount} from ${selectedCustomerForPay.name}`);
      setPaymentModalOpen(false);
      refreshList();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Payment collection failed');
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalReceivables = customers.reduce((acc, c) => acc + c.currentReceivable, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            Customers & Credit Accounts
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage neighborhood shopper profiles, store credit limits, receivables, and payment receipts.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Notifications */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-md text-xs">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Receivables summary banner */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase block">Total Store Credit Receivables</span>
          <span className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5 block">
            {settings.currencySymbol} {totalReceivables.toLocaleString()}
          </span>
        </div>
        <div className="text-xs text-slate-500">
          Registered Accounts: <strong className="text-slate-800 dark:text-slate-200">{customers.length}</strong>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search customers by name, phone, address..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Address</th>
                <th className="py-3 px-4 text-right">Credit Limit</th>
                <th className="py-3 px-4 text-right">Outstanding Due</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No customers found. Click &quot;Add Customer&quot; to register a customer.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {c.name}
                      {c.id === 'walkin-cust' && (
                        <span className="ml-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                          (Default POS)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">{c.phone}</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">{c.address || '-'}</td>
                    <td className="py-3 px-4 text-right font-mono">
                      {c.creditLimit > 0 ? `${settings.currencySymbol} ${c.creditLimit.toLocaleString()}` : 'Cash Only'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold">
                      <span className={c.currentReceivable > 0 ? 'text-amber-600 font-bold' : 'text-slate-400'}>
                        {settings.currencySymbol} {c.currentReceivable.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      {c.currentReceivable > 0 && (
                        <button
                          onClick={() => handleOpenPay(c)}
                          className="px-2 py-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition-colors font-medium"
                          title="Record payment received"
                        >
                          <CreditCard className="w-3.5 h-3.5 inline mr-1" />
                          Collect
                        </button>
                      )}
                      <button
                        onClick={() => PdfService.generateCustomerStatement(c, sales, settings)}
                        className="px-2 py-1 text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-slate-100 rounded"
                        title="Download Statement PDF"
                      >
                        <FileText className="w-3.5 h-3.5 inline mr-1" />
                        Statement
                      </button>
                      {c.id !== 'walkin-cust' && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="px-2 py-1 text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-slate-100 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5 inline mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleArchive(c)}
                            className="px-2 py-1 text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded"
                          >
                            <Archive className="w-3.5 h-3.5 inline mr-1" />
                            Archive
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {editingCustomer ? 'Edit Customer Account' : 'Register New Customer'}
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
                  Customer Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Ayesha Khan"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile / Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +92 333 1234567"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Home / Business Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. House # 18, Street 7, Sector G-9/1"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Monthly Store Credit Limit ({settings.currencySymbol})
                </label>
                <input
                  type="number"
                  min="0"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Set 0 to enforce cash/instant payments only.
                </span>
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
                  {editingCustomer ? 'Save Changes' : 'Register Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collect Customer Payment Modal */}
      {paymentModalOpen && selectedCustomerForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              Collect Payment from {selectedCustomerForPay.name}
            </h3>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded text-xs space-y-1">
              <div>Current Balance Due: <strong className="font-mono text-amber-600">{settings.currencySymbol} {selectedCustomerForPay.currentReceivable.toLocaleString()}</strong></div>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Amount Collected ({settings.currencySymbol}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={selectedCustomerForPay.currentReceivable}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Method *
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
                >
                  <option value="cash">Cash (added to cash drawer float)</option>
                  <option value="bank_transfer">Bank Transfer (IBFT)</option>
                  <option value="mobile_wallet">Mobile Wallet (JazzCash / EasyPaisa)</option>
                  <option value="card">Card</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Transaction Reference
                </label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="e.g. Cash Counter / Bank Ref / Wallet Trans ID"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md shadow-xs"
                >
                  Confirm Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
