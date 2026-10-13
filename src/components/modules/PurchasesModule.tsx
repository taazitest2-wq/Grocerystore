import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  PackageCheck,
  CreditCard,
  Eye,
  Pencil,
  Trash2,
  X,
  PlusCircle,
  AlertTriangle,
} from 'lucide-react';
import { db } from '../../db/db';
import { Purchase, PaymentMethod } from '../../types';
import { PdfService } from '../../services/pdfService';

export const PurchasesModule: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>(db.getPurchases());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [activePurchase, setActivePurchase] = useState<Purchase | null>(null);

  // Notifications
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New PO State
  const [supplierId, setSupplierId] = useState('');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [poLines, setPoLines] = useState<
    Array<{ productId: string; unitCost: number; quantity: number }>
  >([{ productId: '', unitCost: 0, quantity: 10 }]);

  // Edit PO State
  const [editInvoiceNo, setEditInvoiceNo] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLines, setEditLines] = useState<
    Array<{ productId: string; productName: string; unitCost: number; quantityOrdered: number; quantityReceived: number }>
  >([]);

  // Receive Dialog State
  const [receiveInputs, setReceiveInputs] = useState<{ [productId: string]: number }>({});
  const [receiveNotes, setReceiveNotes] = useState('');

  // Payment State
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('bank_transfer');
  const [payRef, setPayRef] = useState('');

  const suppliers = db.getSuppliers();
  const products = db.getProducts();
  const settings = db.getSettings();

  const refreshList = () => {
    setPurchases(db.getPurchases());
    if (activePurchase) {
      const refreshed = db.getPurchases().find((p) => p.id === activePurchase.id);
      setActivePurchase(refreshed || null);
    }
  };

  const handleOpenCreate = () => {
    setSupplierId(suppliers[0]?.id || '');
    setSupplierInvoiceNo('');
    const firstProd = products[0];
    setPoLines([
      {
        productId: firstProd?.id || '',
        unitCost: firstProd?.purchaseCost || 0,
        quantity: 10,
      },
    ]);
    setError(null);
    setIsCreateModalOpen(true);
  };

  const handleAddLine = () => {
    const firstProd = products[0];
    setPoLines([
      ...poLines,
      {
        productId: firstProd?.id || '',
        unitCost: firstProd?.purchaseCost || 0,
        quantity: 10,
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (poLines.length <= 1) return;
    setPoLines(poLines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: string, val: any) => {
    const updated = [...poLines];
    if (field === 'productId') {
      const p = products.find((prod) => prod.id === val);
      updated[index] = {
        ...updated[index],
        productId: val,
        unitCost: p?.purchaseCost || 0,
      };
    } else {
      updated[index] = { ...updated[index], [field]: val };
    }
    setPoLines(updated);
  };

  const handleSavePO = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const validLines = poLines.filter((l) => l.productId && l.quantity > 0);
      if (validLines.length === 0) {
        throw new Error('Please select valid products with quantities.');
      }
      const po = await db.createPurchaseOrder(supplierId, supplierInvoiceNo, validLines);
      setSuccess(`Purchase Order #${po.purchaseNumber} created.`);
      setIsCreateModalOpen(false);
      refreshList();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create PO');
    }
  };

  // Open Edit Dialog
  const handleOpenEdit = (p: Purchase) => {
    setActivePurchase(p);
    setEditInvoiceNo(p.supplierInvoiceNo || '');
    setEditNotes(p.notes || '');
    setEditLines(
      p.items.map((it) => ({
        productId: it.productId,
        productName: it.productName,
        unitCost: it.unitCost,
        quantityOrdered: it.quantityOrdered,
        quantityReceived: it.quantityReceived,
      }))
    );
    setError(null);
    setIsEditModalOpen(true);
  };

  const handleAddEditLine = () => {
    const firstProd = products[0];
    if (!firstProd) return;
    setEditLines([
      ...editLines,
      {
        productId: firstProd.id,
        productName: firstProd.name,
        unitCost: firstProd.purchaseCost,
        quantityOrdered: 10,
        quantityReceived: 0,
      },
    ]);
  };

  const handleRemoveEditLine = (index: number) => {
    const line = editLines[index];
    if (line.quantityReceived > 0) {
      alert(`Cannot remove ${line.productName} because ${line.quantityReceived} units have already been received.`);
      return;
    }
    if (editLines.length <= 1) {
      alert('A purchase order must contain at least one product.');
      return;
    }
    setEditLines(editLines.filter((_, i) => i !== index));
  };

  const handleEditLineChange = (index: number, field: string, val: any) => {
    const updated = [...editLines];
    if (field === 'productId') {
      const prod = products.find((p) => p.id === val);
      updated[index] = {
        ...updated[index],
        productId: val,
        productName: prod?.name || '',
        unitCost: prod?.purchaseCost || 0,
      };
    } else {
      updated[index] = { ...updated[index], [field]: val };
    }
    setEditLines(updated);
  };

  const handleSaveEditPO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePurchase) return;
    setError(null);
    try {
      const updated = await db.updatePurchaseOrder(activePurchase.id, {
        supplierInvoiceNo: editInvoiceNo,
        notes: editNotes,
        items: editLines.map((l) => ({
          productId: l.productId,
          productName: l.productName,
          quantityOrdered: Number(l.quantityOrdered),
          unitCost: Number(l.unitCost),
        })),
      });

      setSuccess(`Purchase Order #${updated.purchaseNumber} updated successfully!`);
      setIsEditModalOpen(false);
      refreshList();
      setActivePurchase(updated);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update PO');
    }
  };

  const handleDeletePO = async (p: Purchase) => {
    if (p.items.some((it) => it.quantityReceived > 0)) {
      alert('Cannot delete this purchase order because goods have already been received.');
      return;
    }
    if (!confirm(`Are you sure you want to delete Purchase Order #${p.purchaseNumber}?`)) {
      return;
    }

    try {
      await db.deletePurchaseOrder(p.id);
      setSuccess(`Purchase Order #${p.purchaseNumber} deleted.`);
      refreshList();
      setIsDetailModalOpen(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to delete PO');
    }
  };

  // Open Receive Dialog
  const handleOpenReceive = (p: Purchase) => {
    setActivePurchase(p);
    const initialInputs: { [productId: string]: number } = {};
    p.items.forEach((item) => {
      const remaining = item.quantityOrdered - item.quantityReceived;
      initialInputs[item.productId] = remaining > 0 ? remaining : 0;
    });
    setReceiveInputs(initialInputs);
    setReceiveNotes('');
    setError(null);
    setIsReceiveModalOpen(true);
  };

  const handleConfirmReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePurchase) return;
    setError(null);
    try {
      const lines = Object.entries(receiveInputs)
        .filter(([_, qty]) => qty > 0)
        .map(([productId, quantity]) => ({ productId, quantity: Number(quantity) }));

      if (lines.length === 0) {
        throw new Error('Enter quantities greater than 0 for at least one item to receive.');
      }

      const updated = await db.receiveGoods(activePurchase.id, lines, receiveNotes);
      setSuccess(`Goods Received successfully! GRN logged & stock updated.`);
      setIsReceiveModalOpen(false);
      refreshList();
      setActivePurchase(updated);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to receive goods');
    }
  };

  // Open Payment Dialog
  const handleOpenPay = (p: Purchase) => {
    setActivePurchase(p);
    setPayAmount(p.balanceDue);
    setPayMethod('bank_transfer');
    setPayRef('');
    setIsPayModalOpen(true);
  };

  const handleConfirmPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePurchase) return;
    try {
      await db.recordSupplierPayment(activePurchase.id, payAmount, payMethod, payRef);
      setSuccess(`Recorded payment of ${settings.currencySymbol} ${payAmount}`);
      setIsPayModalOpen(false);
      refreshList();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Payment recording failed');
    }
  };

  const filteredPurchases = purchases.filter((p) => {
    const matchesSearch =
      p.purchaseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplierInvoiceNo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-600" />
            Purchases & Goods Receiving
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Create Purchase Orders, edit orders, execute receiving with over-delivery support, and reconcile stock.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Purchase Order</span>
        </button>
      </div>

      {/* Notifications */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-md text-xs">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search PO number, supplier, invoice..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Statuses</option>
            <option value="ordered">Ordered (Pending)</option>
            <option value="partially_received">Partially Received</option>
            <option value="received">Received (Complete)</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="text-xs text-slate-500">
          Showing <strong>{filteredPurchases.length}</strong> purchase orders
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">PO Number & Date</th>
                <th className="py-3 px-4">Supplier & Ref</th>
                <th className="py-3 px-4 text-center">Items Ordered</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Delivery Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No purchase orders found. Create a PO to replenish inventory.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p) => {
                  const isReceived = p.status === 'received';
                  const isPartial = p.status === 'partially_received';
                  const canEdit = p.status !== 'cancelled';
                  const canDelete = p.items.every((it) => it.quantityReceived === 0);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {p.purchaseNumber}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(p.orderDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {p.supplierName}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Ref: {p.supplierInvoiceNo || 'N/A'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-medium">
                          {p.items.length} lines
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-900 dark:text-white">
                        {settings.currencySymbol} {p.total.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <span className={p.balanceDue > 0 ? 'text-amber-600 font-semibold' : 'text-slate-400'}>
                          {settings.currencySymbol} {p.balanceDue.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            isReceived
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : isPartial
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                          }`}
                        >
                          {p.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                        {p.status !== 'received' && p.status !== 'cancelled' && (
                          <button
                            onClick={() => handleOpenReceive(p)}
                            className="px-2 py-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition-colors font-medium cursor-pointer"
                            title="Receive goods into warehouse stock (supports supplier over-delivery)"
                          >
                            <PackageCheck className="w-3.5 h-3.5 inline mr-1" />
                            Receive
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="px-2 py-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors font-medium cursor-pointer"
                            title="Edit quantities, prices, or invoice ref"
                          >
                            <Pencil className="w-3.5 h-3.5 inline mr-1" />
                            Edit
                          </button>
                        )}
                        {p.balanceDue > 0 && (
                          <button
                            onClick={() => handleOpenPay(p)}
                            className="px-2 py-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded transition-colors font-medium cursor-pointer"
                            title="Record supplier payment"
                          >
                            <CreditCard className="w-3.5 h-3.5 inline mr-1" />
                            Pay
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setActivePurchase(p);
                            setIsDetailModalOpen(true);
                          }}
                          className="px-2 py-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded cursor-pointer"
                          title="View order details & GRNs"
                        >
                          <Eye className="w-3.5 h-3.5 inline mr-1" />
                          View
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => handleDeletePO(p)}
                            className="px-2 py-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors font-medium cursor-pointer"
                            title="Delete purchase order"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
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

      {/* New Purchase Order Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-600" />
                Create Purchase Order
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSavePO} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Supplier *
                  </label>
                  <select
                    required
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Supplier Bill / Reference No.
                  </label>
                  <input
                    type="text"
                    value={supplierInvoiceNo}
                    onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                    placeholder="e.g. ENGRO-INV-9902"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Order Line Items
                  </span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    + Add Line Item
                  </button>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-2">Product</th>
                        <th className="p-2 w-28 text-right">Unit Cost</th>
                        <th className="p-2 w-24 text-center">Qty Ordered</th>
                        <th className="p-2 w-28 text-right">Subtotal</th>
                        <th className="p-2 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {poLines.map((line, idx) => {
                        const lineSubtotal = line.unitCost * line.quantity;
                        return (
                          <tr key={idx}>
                            <td className="p-2">
                              <select
                                required
                                value={line.productId}
                                onChange={(e) => handleLineChange(idx, 'productId', e.target.value)}
                                className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                              >
                                {products.map((pr) => (
                                  <option key={pr.id} value={pr.id}>
                                    {pr.name} ({pr.unit})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                value={line.unitCost}
                                onChange={(e) =>
                                  handleLineChange(idx, 'unitCost', parseFloat(e.target.value) || 0)
                                }
                                className="w-full px-2 py-1 text-right font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="1"
                                required
                                value={line.quantity}
                                onChange={(e) =>
                                  handleLineChange(idx, 'quantity', parseInt(e.target.value) || 1)
                                }
                                className="w-full px-2 py-1 text-center font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                              />
                            </td>
                            <td className="p-2 text-right font-mono font-medium">
                              {settings.currencySymbol} {lineSubtotal.toFixed(2)}
                            </td>
                            <td className="p-2 text-center">
                              {poLines.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLine(idx)}
                                  className="text-rose-500 hover:text-rose-700 cursor-pointer"
                                >
                                  ×
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md shadow-xs cursor-pointer"
                >
                  Save Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Purchase Order Modal */}
      {isEditModalOpen && activePurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-blue-600" />
                  Edit Purchase Order #{activePurchase.purchaseNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  Supplier: {activePurchase.supplierName} · Adjust lines, costs, or add items
                </p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditPO} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Supplier Invoice / Bill No.
                  </label>
                  <input
                    type="text"
                    value={editInvoiceNo}
                    onChange={(e) => setEditInvoiceNo(e.target.value)}
                    placeholder="e.g. INV-9902"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Internal Procurement Notes
                  </label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Order notes, driver contact, delivery instructions"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Editable Line Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Order Lines (Ordered Quantities & Unit Costs)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddEditLine}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 rounded font-medium cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Item Line</span>
                  </button>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-2">Product</th>
                        <th className="p-2 w-28 text-right">Unit Cost</th>
                        <th className="p-2 w-28 text-center">Ordered</th>
                        <th className="p-2 w-24 text-center">Received</th>
                        <th className="p-2 w-28 text-right">Subtotal</th>
                        <th className="p-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {editLines.map((line, idx) => {
                        const lineSubtotal = line.unitCost * line.quantityOrdered;
                        return (
                          <tr key={idx}>
                            <td className="p-2">
                              {line.quantityReceived > 0 ? (
                                <span className="font-medium text-slate-800 dark:text-slate-200">
                                  {line.productName}
                                </span>
                              ) : (
                                <select
                                  value={line.productId}
                                  onChange={(e) => handleEditLineChange(idx, 'productId', e.target.value)}
                                  className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                                >
                                  {products.map((pr) => (
                                    <option key={pr.id} value={pr.id}>
                                      {pr.name} ({pr.unit})
                                    </option>
                                  ))}
                                </select>
                              )}
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                value={line.unitCost}
                                onChange={(e) =>
                                  handleEditLineChange(idx, 'unitCost', parseFloat(e.target.value) || 0)
                                }
                                className="w-full px-2 py-1 text-right font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min={line.quantityReceived}
                                required
                                value={line.quantityOrdered}
                                onChange={(e) =>
                                  handleEditLineChange(idx, 'quantityOrdered', parseInt(e.target.value) || line.quantityReceived)
                                }
                                className="w-full px-2 py-1 text-center font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                              />
                            </td>
                            <td className="p-2 text-center font-mono text-emerald-600 font-medium">
                              {line.quantityReceived}
                            </td>
                            <td className="p-2 text-right font-mono font-medium">
                              {settings.currencySymbol} {lineSubtotal.toFixed(2)}
                            </td>
                            <td className="p-2 text-center">
                              {line.quantityReceived === 0 && editLines.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveEditLine(idx)}
                                  className="text-rose-500 hover:text-rose-700 cursor-pointer"
                                  title="Remove line"
                                >
                                  ×
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">
                  Total Order Amount:{' '}
                  <strong className="text-slate-900 dark:text-white font-mono">
                    {settings.currencySymbol}{' '}
                    {editLines
                      .reduce((acc, l) => acc + l.unitCost * l.quantityOrdered, 0)
                      .toFixed(2)}
                  </strong>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-xs cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Goods Receiving Dialog with Over-Delivery Support */}
      {isReceiveModalOpen && activePurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <PackageCheck className="w-5 h-5 text-emerald-600" />
                  Receive Goods (GRN) — PO #{activePurchase.purchaseNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  Supplier: {activePurchase.supplierName} · Supplier over-deliveries are automatically accepted & reconciled
                </p>
              </div>
              <button onClick={() => setIsReceiveModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleConfirmReceive} className="space-y-4 text-xs">
              <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="p-2">Product Name</th>
                      <th className="p-2 text-center">Ordered</th>
                      <th className="p-2 text-center">Prev. Received</th>
                      <th className="p-2 text-center">Remaining</th>
                      <th className="p-2 w-32 text-center">Receive Now</th>
                      <th className="p-2 text-left">Status Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activePurchase.items.map((it) => {
                      const remaining = Math.max(0, it.quantityOrdered - it.quantityReceived);
                      const currentVal = receiveInputs[it.productId] ?? 0;
                      const isOver = currentVal > remaining;

                      return (
                        <tr key={it.id} className={isOver ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}>
                          <td className="p-2 font-medium">{it.productName}</td>
                          <td className="p-2 text-center font-mono">{it.quantityOrdered}</td>
                          <td className="p-2 text-center font-mono text-emerald-600">{it.quantityReceived}</td>
                          <td className="p-2 text-center font-mono font-semibold">{remaining}</td>
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min="0"
                              value={receiveInputs[it.productId] ?? 0}
                              onChange={(e) =>
                                setReceiveInputs({
                                  ...receiveInputs,
                                  [it.productId]: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-24 px-2 py-1 text-center font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="p-2">
                            {isOver ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                                <AlertTriangle className="w-3 h-3" />
                                +{currentVal - remaining} over-delivery
                              </span>
                            ) : currentVal === remaining && remaining > 0 ? (
                              <span className="text-[11px] text-emerald-600 font-medium">Fulfills remaining</span>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Receiving Inspector Notes (Optional)
                </label>
                <input
                  type="text"
                  value={receiveNotes}
                  onChange={(e) => setReceiveNotes(e.target.value)}
                  placeholder="e.g. Supplier delivered extra crate, quality batch verified"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 text-[11px]">
                  Warehouse stock and supplier payable ledger will be updated immediately.
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsReceiveModalOpen(false)}
                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md shadow-xs cursor-pointer"
                  >
                    Confirm Goods Receipt (GRN)
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PO Detail & GRN History Modal */}
      {isDetailModalOpen && activePurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Purchase Order #{activePurchase.purchaseNumber}
                </h3>
                <span className="text-xs text-slate-500">
                  Supplier: {activePurchase.supplierName} · Date: {new Date(activePurchase.orderDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenEdit(activePurchase);
                  }}
                  className="px-2.5 py-1.5 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 rounded text-xs flex items-center gap-1 font-medium cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit PO</span>
                </button>
                <button
                  onClick={() => PdfService.generatePurchaseOrder(activePurchase, settings)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <span>PO PDF</span>
                </button>
                <button onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Items Summary */}
            <div className="space-y-2 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Order Items & Receiving Progress:
              </span>
              <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="p-2">Product</th>
                      <th className="p-2 text-center">Ordered</th>
                      <th className="p-2 text-center">Received</th>
                      <th className="p-2 text-right">Unit Cost</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activePurchase.items.map((it) => (
                      <tr key={it.id}>
                        <td className="p-2 font-medium">{it.productName}</td>
                        <td className="p-2 text-center font-mono">{it.quantityOrdered}</td>
                        <td className="p-2 text-center font-mono text-emerald-600">{it.quantityReceived}</td>
                        <td className="p-2 text-right font-mono">
                          {settings.currencySymbol} {it.unitCost.toFixed(2)}
                        </td>
                        <td className="p-2 text-right font-mono font-medium">
                          {settings.currencySymbol} {(it.totalCost ?? it.total).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* GRN History */}
            <div className="space-y-2 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Receipt Delivery History (GRNs):
              </span>
              {activePurchase.receipts.length === 0 ? (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-md text-center">
                  No goods received yet. Order is pending delivery.
                </div>
              ) : (
                <div className="space-y-2">
                  {activePurchase.receipts.map((grn) => (
                    <div
                      key={grn.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span>{grn.receiptNumber}</span>
                        <span className="text-slate-500 font-normal">
                          {new Date(grn.date).toLocaleString()} by {grn.receivedBy}
                        </span>
                      </div>
                      {grn.notes && <div className="text-slate-500 italic mt-1">"{grn.notes}"</div>}
                      <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-300">
                        Items received:{' '}
                        {grn.items.map((gi) => `${gi.productName} (${gi.quantityReceived})`).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div>
                Total: <strong>{settings.currencySymbol} {activePurchase.total.toFixed(2)}</strong> · Balance Due:{' '}
                <strong className="text-amber-600">{settings.currencySymbol} {activePurchase.balanceDue.toFixed(2)}</strong>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 rounded font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Dialog Modal */}
      {isPayModalOpen && activePurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Pay Supplier
            </h3>

            <div className="text-xs text-slate-500">
              PO #{activePurchase.purchaseNumber} · Supplier: {activePurchase.supplierName}
              <div className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                Outstanding Balance: {settings.currencySymbol} {activePurchase.balanceDue.toFixed(2)}
              </div>
            </div>

            <form onSubmit={handleConfirmPay} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Payment Amount ({settings.currencySymbol}) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={activePurchase.balanceDue}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="mobile_wallet">Mobile Wallet (Easypaisa/JazzCash)</option>
                  <option value="card">Card / Cheque</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Transaction Ref / Cheque No.</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="e.g. HBL-FT-49102"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-xs cursor-pointer"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
