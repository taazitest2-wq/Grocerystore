import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Archive,
  CheckCircle2,
  AlertCircle,
  FileText,
  CreditCard,
} from 'lucide-react';
import { db } from '../../db/db';
import { Supplier, PaymentMethod } from '../../types';
import { PdfService } from '../../services/pdfService';

export const SuppliersModule: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>(db.getSuppliers());
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Payment dialog state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedSupplierForPay, setSelectedSupplierForPay] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payRef, setPayRef] = useState('');

  const settings = db.getSettings();
  const purchases = db.getPurchases();

  const refreshList = () => {
    setSuppliers(db.getSuppliers());
  };

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    setTaxNumber('');
    setOpeningBalance(0);
    setNotes('');
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setName(s.name);
    setContactPerson(s.contactPerson);
    setPhone(s.phone);
    setEmail(s.email);
    setAddress(s.address);
    setTaxNumber(s.taxNumber || '');
    setOpeningBalance(s.openingBalance);
    setNotes(s.notes || '');
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingSupplier) {
        await db.updateSupplier(editingSupplier.id, {
          name,
          contactPerson,
          phone,
          email,
          address,
          taxNumber,
          notes,
        });
        setSuccess(`Supplier "${name}" updated.`);
      } else {
        await db.createSupplier({
          name,
          contactPerson,
          phone,
          email,
          address,
          taxNumber,
          openingBalance: Number(openingBalance),
          notes,
        });
        setSuccess(`Supplier "${name}" created.`);
      }
      setIsModalOpen(false);
      refreshList();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save supplier');
    }
  };

  const handleArchive = async (s: Supplier) => {
    if (confirm(`Archive supplier "${s.name}"?`)) {
      try {
        await db.archiveSupplier(s.id);
        setSuccess(`Supplier "${s.name}" archived.`);
        refreshList();
        setTimeout(() => setSuccess(null), 3000);
      } catch (err: any) {
        alert(err.message || 'Failed to archive supplier');
      }
    }
  };

  const handleOpenPay = (s: Supplier) => {
    setSelectedSupplierForPay(s);
    setPayAmount(s.currentPayable);
    setPayMethod('cash');
    setPayRef('');
    setPaymentModalOpen(true);
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierForPay) return;
    try {
      // Find open purchase order for this supplier or record against first pending PO
      const openPo = purchases.find((p) => p.supplierId === selectedSupplierForPay.id && p.balanceDue > 0);
      if (openPo) {
        await db.recordSupplierPayment(openPo.id, payAmount, payMethod, payRef, 'Direct supplier payment');
      } else {
        // Direct supplier payable adjustment
        selectedSupplierForPay.currentPayable = Math.max(0, selectedSupplierForPay.currentPayable - payAmount);
        await db.updateSupplier(selectedSupplierForPay.id, { currentPayable: selectedSupplierForPay.currentPayable });
      }
      setSuccess(`Recorded payment of ${settings.currencySymbol} ${payAmount} to ${selectedSupplierForPay.name}`);
      setPaymentModalOpen(false);
      refreshList();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Payment failed');
    }
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone.includes(searchTerm)
  );

  const totalPayables = suppliers.reduce((acc, s) => acc + s.currentPayable, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            Suppliers & Vendors
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Maintain wholesale supplier contacts, track purchase history, and manage outstanding balances.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Supplier</span>
        </button>
      </div>

      {/* Notifications */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-md text-xs">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Payables banner */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase block">Total Outstanding Payables</span>
          <span className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5 block">
            {settings.currencySymbol} {totalPayables.toLocaleString()}
          </span>
        </div>
        <div className="text-xs text-slate-500">
          Suppliers: <strong className="text-slate-800 dark:text-slate-200">{suppliers.length}</strong>
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
            placeholder="Search suppliers by name, contact, phone..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Supplier Name</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Phone & Email</th>
                <th className="py-3 px-4">Address</th>
                <th className="py-3 px-4 text-right">Outstanding Payable</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No suppliers found. Click &quot;Add Supplier&quot; to register a vendor.
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {s.name}
                      {s.taxNumber && (
                        <span className="block text-[10px] text-slate-400 font-normal">{s.taxNumber}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {s.contactPerson}
                    </td>
                    <td className="py-3 px-4">
                      <div>{s.phone}</div>
                      <div className="text-[10px] text-slate-400">{s.email}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                      {s.address}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold">
                      <span className={s.currentPayable > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'}>
                        {settings.currencySymbol} {s.currentPayable.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      {s.currentPayable > 0 && (
                        <button
                          onClick={() => handleOpenPay(s)}
                          className="px-2 py-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition-colors font-medium"
                          title="Record payment to supplier"
                        >
                          <CreditCard className="w-3.5 h-3.5 inline mr-1" />
                          Pay
                        </button>
                      )}
                      <button
                        onClick={() => PdfService.generateSupplierStatement(s, purchases, settings)}
                        className="px-2 py-1 text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                        title="Download Supplier Statement PDF"
                      >
                        <FileText className="w-3.5 h-3.5 inline mr-1" />
                        Statement
                      </button>
                      <button
                        onClick={() => handleOpenEdit(s)}
                        className="px-2 py-1 text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5 inline mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleArchive(s)}
                        className="px-2 py-1 text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                      >
                        <Archive className="w-3.5 h-3.5 inline mr-1" />
                        Archive
                      </button>
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
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {editingSupplier ? 'Edit Supplier' : 'Register New Supplier'}
            </h3>

            {error && (
              <div className="flex items-center gap-2 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Company / Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Engro Foods Supply Hub"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Kamran Siddiqui"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +92 300 1234567"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. supplier@domain.pk"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tax / GST Identification
                  </label>
                  <input
                    type="text"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    placeholder="e.g. GST-1234567"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Warehouse / Depot Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Plot 12, Industrial Area I-9, Islamabad"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {!editingSupplier && (
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Opening Payable Balance ({settings.currencySymbol})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md shadow-xs"
                >
                  {editingSupplier ? 'Save Changes' : 'Register Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Payment Dialog */}
      {paymentModalOpen && selectedSupplierForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              Record Payment to {selectedSupplierForPay.name}
            </h3>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded text-xs space-y-1">
              <div>Current Balance: <strong className="font-mono text-amber-600">{settings.currencySymbol} {selectedSupplierForPay.currentPayable.toLocaleString()}</strong></div>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Amount ({settings.currencySymbol}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={selectedSupplierForPay.currentPayable}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Method *
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="cash">Cash (from drawer)</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card / Cheque</option>
                </select>
                {payMethod === 'cash' && (
                  <span className="text-[10px] text-amber-600 mt-1 block">
                    Cash payments are recorded as a physical cash withdrawal in the cash drawer session.
                  </span>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bank Reference / Cheque #
                </label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="e.g. Cheque # 99281 / IBFT Trans ID"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
