import React, { useState, useRef } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Archive,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { db } from '../../db/db';
import { Product, UnitOfMeasure } from '../../types';
import { CsvService } from '../../services/csvService';
import { PdfService } from '../../services/pdfService';

export const ProductsModule: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(db.getProducts());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Pagination & Bulk Generation
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [purchaseCost, setPurchaseCost] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [unit, setUnit] = useState<UnitOfMeasure>('pack');
  const [quantityOnHand, setQuantityOnHand] = useState<number>(0);
  const [reorderLevel, setReorderLevel] = useState<number>(10);
  const [preferredSupplierId, setPreferredSupplierId] = useState('');
  const [expiryTracking, setExpiryTracking] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');

  // Bulk Import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = db.getCategories();
  const suppliers = db.getSuppliers();
  const settings = db.getSettings();

  const refreshList = () => {
    setProducts(db.getProducts());
  };

  const handleGenerateBulk = async () => {
    if (
      !confirm(
        'Generate 1,500 realistic grocery products (Rice, Atta, Ghee, Spices, Dairy, Biscuits, Soaps) into catalog? This stress-tests large volume performance.'
      )
    ) {
      return;
    }
    try {
      setIsGeneratingBulk(true);
      const count = await db.generateBulkGroceryCatalog(1500);
      setSuccess(`Successfully added ${count} items to catalog! Total active items: ${db.getProducts().length}`);
      refreshList();
      setTimeout(() => setSuccess(null), 4000);
    } catch (e: any) {
      setError(e.message || 'Bulk generation failed');
    } finally {
      setIsGeneratingBulk(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setName('');
    setSku(`SKU-${Date.now().toString().slice(-5)}`);
    setBarcode('');
    setCategoryId(categories[0]?.id || '');
    setBrand('');
    setPurchaseCost(0);
    setSellingPrice(0);
    setUnit('pack');
    setQuantityOnHand(0);
    setReorderLevel(settings.defaultReorderLevel || 10);
    setPreferredSupplierId(suppliers[0]?.id || '');
    setExpiryTracking(false);
    setExpiryDate('');
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setSku(p.sku);
    setBarcode(p.barcode || '');
    setCategoryId(p.categoryId);
    setBrand(p.brand || '');
    setPurchaseCost(p.purchaseCost);
    setSellingPrice(p.sellingPrice);
    setUnit(p.unit);
    setQuantityOnHand(p.quantityOnHand);
    setReorderLevel(p.reorderLevel);
    setPreferredSupplierId(p.preferredSupplierId || '');
    setExpiryTracking(p.expiryTracking);
    setExpiryDate(p.expiryDate || '');
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingProduct) {
        await db.updateProduct(editingProduct.id, {
          name,
          sku,
          barcode,
          categoryId,
          brand,
          purchaseCost: Number(purchaseCost),
          sellingPrice: Number(sellingPrice),
          unit,
          reorderLevel: Number(reorderLevel),
          preferredSupplierId,
          expiryTracking,
          expiryDate: expiryTracking ? expiryDate : undefined,
        });
        setSuccess(`Product "${name}" updated successfully.`);
      } else {
        await db.createProduct({
          name,
          sku,
          barcode,
          categoryId,
          brand,
          purchaseCost: Number(purchaseCost),
          sellingPrice: Number(sellingPrice),
          unit,
          quantityOnHand: Number(quantityOnHand),
          reorderLevel: Number(reorderLevel),
          preferredSupplierId,
          expiryTracking,
          expiryDate: expiryTracking ? expiryDate : undefined,
        });
        setSuccess(`Product "${name}" created successfully.`);
      }
      setIsModalOpen(false);
      refreshList();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save product');
    }
  };

  const handleArchive = async (p: Product) => {
    if (confirm(`Archive product "${p.name}"? It will be hidden from the active catalog.`)) {
      try {
        await db.archiveProduct(p.id);
        setSuccess(`Product "${p.name}" archived.`);
        refreshList();
        setTimeout(() => setSuccess(null), 3000);
      } catch (err: any) {
        alert(err.message || 'Failed to archive product');
      }
    }
  };

  // CSV Import handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { valid, errors } = CsvService.parseProductsCsv(text);
      setImportPreview(valid);
      setImportErrors(errors);
      setIsImportModalOpen(true);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = async () => {
    try {
      let importedCount = 0;
      for (const item of importPreview) {
        await db.createProduct({
          ...item,
          categoryId: item.categoryId || categories[0]?.id || 'cat-1',
        });
        importedCount++;
      }
      setSuccess(`Successfully imported ${importedCount} products from CSV.`);
      setIsImportModalOpen(false);
      refreshList();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      alert(`Import error: ${err.message}`);
    }
  };

  // Filtering
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm)) ||
      (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;

    let matchesStock = true;
    if (stockFilter === 'low') matchesStock = p.quantityOnHand > 0 && p.quantityOnHand <= p.reorderLevel;
    if (stockFilter === 'out') matchesStock = p.quantityOnHand <= 0;

    return matchesSearch && matchesCategory && matchesStock;
  });

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const paginatedProducts = filteredProducts.slice(
    (currentPageNum - 1) * pageSize,
    currentPageNum * pageSize
  );

  const totalInventoryValuation = products.reduce(
    (acc, p) => acc + Math.max(0, p.quantityOnHand) * p.purchaseCost,
    0
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            Products & Catalog
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage grocery products, unit prices, supplier assignments, and inventory stock valuations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* CSV Export */}
          <button
            onClick={() => CsvService.exportProductsCsv(filteredProducts)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-md text-xs font-medium"
            title="Export filtered products to CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          {/* PDF Report Export */}
          <button
            onClick={() => PdfService.generateInventoryReport(filteredProducts, settings)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-md text-xs font-medium"
            title="Download PDF inventory report"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span>Inventory PDF</span>
          </button>

          {/* CSV Bulk Import */}
          <label className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-md text-xs font-medium cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-blue-600" />
            <span>Import CSV</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {/* 1,500 Bulk Items Generator */}
          <button
            onClick={handleGenerateBulk}
            disabled={isGeneratingBulk}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Generate 1,500 realistic grocery items into store catalog"
          >
            <Package className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isGeneratingBulk ? 'Generating...' : '+ 1,500 Bulk Items'}</span>
          </button>

          {/* Add Product Button */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-md text-xs">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase block">Active Products</span>
          <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">
            {products.length}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase block">Total Stock Value (Cost)</span>
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {settings.currencySymbol} {totalInventoryValuation.toLocaleString()}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-amber-500 uppercase block">Low Stock Warning</span>
          <span className="text-xl font-bold text-amber-600 mt-1 block">
            {products.filter((p) => p.quantityOnHand > 0 && p.quantityOnHand <= p.reorderLevel).length}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-rose-500 uppercase block">Out of Stock</span>
          <span className="text-xl font-bold text-rose-600 mt-1 block">
            {products.filter((p) => p.quantityOnHand <= 0).length}
          </span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, SKU, barcode, brand..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Stock Filter Segmented */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                stockFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Stock
            </button>
            <button
              onClick={() => setStockFilter('low')}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                stockFilter === 'low'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-medium'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Low Stock
            </button>
            <button
              onClick={() => setStockFilter('out')}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                stockFilter === 'out'
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-medium'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Out of Stock
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500">
          Showing <strong>{filteredProducts.length}</strong> of {products.length} products
        </div>
      </div>

      {/* Product Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Product Name & SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Cost Price</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-center">Stock Level</th>
                <th className="py-3 px-4 text-right">Stock Valuation</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No products matched your search or filters.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
                  const cat = categories.find((c) => c.id === p.categoryId);
                  const isLow = p.quantityOnHand > 0 && p.quantityOnHand <= p.reorderLevel;
                  const isOut = p.quantityOnHand <= 0;
                  const val = p.quantityOnHand * p.purchaseCost;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                          <span>SKU: {p.sku}</span>
                          {p.barcode && <span>· Barcode: {p.barcode}</span>}
                          {p.brand && <span>· {p.brand}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {cat?.name || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                        {settings.currencySymbol} {p.purchaseCost.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 dark:text-white">
                        {settings.currencySymbol} {p.sellingPrice.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center font-medium">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] ${
                            isOut
                              ? 'text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300 font-semibold'
                              : isLow
                              ? 'text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {p.quantityOnHand} {p.unit}
                          {isLow && <span className="text-[10px] text-amber-600">(Low)</span>}
                          {isOut && <span className="text-[10px] text-rose-600">(Out)</span>}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-800 dark:text-slate-200 font-medium">
                        {settings.currencySymbol} {val.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="px-2 py-1 text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                          title="Edit product"
                        >
                          <Edit2 className="w-3.5 h-3.5 inline mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleArchive(p)}
                          className="px-2 py-1 text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                          title="Archive product"
                        >
                          <Archive className="w-3.5 h-3.5 inline mr-1" />
                          Archive
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        {filteredProducts.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPageNum(1);
                }}
                className="px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
              <span>
                Showing <strong>{(currentPageNum - 1) * pageSize + 1}</strong> -{' '}
                <strong>{Math.min(currentPageNum * pageSize, filteredProducts.length)}</strong> of{' '}
                <strong>{filteredProducts.length}</strong> items
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPageNum((p) => Math.max(1, p - 1))}
                disabled={currentPageNum === 1}
                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
              >
                Previous
              </button>
              <span className="px-2 font-mono">
                Page {currentPageNum} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPageNum((p) => Math.min(totalPages, p + 1))}
                disabled={currentPageNum >= totalPages}
                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl p-6 space-y-4 my-8">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Create New Grocery Product'}
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
                    Product Title / Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Super Basmati Rice 5kg"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g. RIC-BAS-001"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Barcode (Manual or Scanned)
                  </label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="e.g. 896400010011"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Brand / Manufacturer
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Falak, Dalda, Tapal..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Purchase Cost ({settings.currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={purchaseCost}
                    onChange={(e) => setPurchaseCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Selling Price ({settings.currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unit of Measure *
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as UnitOfMeasure)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="pack">Pack / Pouch</option>
                    <option value="pcs">Pieces (Pcs)</option>
                    <option value="box">Box / Carton</option>
                    <option value="bottle">Bottle / Jar</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="g">Gram (g)</option>
                    <option value="l">Litre (L)</option>
                    <option value="ml">Millilitre (ml)</option>
                  </select>
                </div>

                {!editingProduct && (
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Opening Quantity on Hand
                    </label>
                    <input
                      type="number"
                      step={['kg', 'g', 'l', 'ml'].includes(unit) ? '0.01' : '1'}
                      min="0"
                      value={quantityOnHand}
                      onChange={(e) => setQuantityOnHand(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Initial stock entry is logged to the inventory ledger.
                    </span>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Reorder Alert Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={reorderLevel}
                    onChange={(e) => setReorderLevel(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Preferred Supplier
                  </label>
                  <select
                    value={preferredSupplierId}
                    onChange={(e) => setPreferredSupplierId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">None / Open</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 flex items-center gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={expiryTracking}
                      onChange={(e) => setExpiryTracking(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Enable Expiry Tracking for this product
                    </span>
                  </label>

                  {expiryTracking && (
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  )}
                </div>
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
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Bulk Import Preview Dialog */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-600" />
              CSV Bulk Product Import Preview
            </h3>

            {importErrors.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded text-xs space-y-1">
                <strong>Validation notices:</strong>
                {importErrors.slice(0, 3).map((err, i) => (
                  <div key={i}>• {err}</div>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 font-semibold text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-2">Name</th>
                    <th className="p-2">SKU</th>
                    <th className="p-2 text-right">Cost</th>
                    <th className="p-2 text-right">Price</th>
                    <th className="p-2 text-center">Unit</th>
                    <th className="p-2 text-right">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {importPreview.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2 font-medium">{item.name}</td>
                      <td className="p-2 font-mono">{item.sku}</td>
                      <td className="p-2 text-right">{item.purchaseCost}</td>
                      <td className="p-2 text-right">{item.sellingPrice}</td>
                      <td className="p-2 text-center">{item.unit}</td>
                      <td className="p-2 text-right">{item.quantityOnHand}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-slate-500">
                Ready to import <strong>{importPreview.length}</strong> items.
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={importPreview.length === 0}
                  onClick={handleConfirmImport}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md shadow-xs disabled:opacity-50"
                >
                  Commit Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
