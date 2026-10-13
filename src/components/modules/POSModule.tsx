import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  CreditCard,
  RotateCcw,
  Receipt,
  ArrowRight,
  UserPlus,
  Coins,
  Percent,
} from 'lucide-react';
import { db } from '../../db/db';
import { Product, Sale, PaymentMethod, Customer } from '../../types';
import { PdfService } from '../../services/pdfService';
import { Money } from '../../utils/money';

interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
}

export const POSModule: React.FC<{ onNavigateToHistory?: () => void }> = ({
  onNavigateToHistory,
}) => {
  const [products, setProducts] = useState<Product[]>(db.getProducts());
  const [categories, setCategories] = useState(db.getCategories());
  const [customers, setCustomers] = useState(db.getCustomers());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState<number>(48);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('walkin-cust');
  const [cartDiscount, setCartDiscount] = useState<number>(0);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitCard, setSplitCard] = useState<number>(0);
  const [splitCredit, setSplitCredit] = useState<number>(0);

  // Quick Customer Create
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  // Post Checkout Success State
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const settings = db.getSettings();

  useEffect(() => {
    setProducts(db.getProducts());
    setCategories(db.getCategories());
    setCustomers(db.getCustomers());
  }, []);

  const refreshProducts = () => {
    setProducts(db.getProducts());
  };

  // Cart Calculations
  const subtotal = Money.round(
    cart.reduce((sum, item) => Money.add(sum, Money.mul(item.product.sellingPrice, item.quantity)), 0)
  );
  const itemDiscounts = Money.round(
    cart.reduce((sum, item) => Money.add(sum, item.discount || 0), 0)
  );
  const totalDiscount = Money.add(itemDiscounts, cartDiscount || 0);

  let taxTotal = 0;
  if (settings.taxEnabled && settings.taxRatePercent > 0) {
    const taxable = Math.max(0, Money.sub(subtotal, totalDiscount));
    taxTotal = Money.tax(taxable, settings.taxRatePercent);
  }

  const grandTotal = Money.round(Math.max(0, Money.add(Money.sub(subtotal, totalDiscount), taxTotal)));

  // Add product to cart
  const handleAddToCart = (product: Product) => {
    if (product.quantityOnHand <= 0 && !settings.allowNegativeStock) {
      alert(`Cannot sell "${product.name}": item is out of stock.`);
      return;
    }

    const existingIndex = cart.findIndex((item) => item.product.id === product.id);
    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty + 1 > product.quantityOnHand && !settings.allowNegativeStock) {
        alert(`Cannot add more: only ${product.quantityOnHand} ${product.unit} available in stock.`);
        return;
      }
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([...cart, { product, quantity: 1, discount: 0 }]);
    }
  };

  const handleUpdateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    const item = cart[index];
    if (newQty > item.product.quantityOnHand && !settings.allowNegativeStock) {
      alert(`Only ${item.product.quantityOnHand} ${item.product.unit} available in stock.`);
      return;
    }
    const updated = [...cart];
    updated[index].quantity = newQty;
    setCart(updated);
  };

  const handleUpdateLineDiscount = (index: number, disc: number) => {
    const updated = [...cart];
    updated[index].discount = Math.max(0, disc);
    setCart(updated);
  };

  const handleRemoveItem = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (confirm('Clear all items from the current cart?')) {
      setCart([]);
      setCartDiscount(0);
      setAmountReceived('');
    }
  };

  // Quick Customer Creation
  const handleSaveQuickCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await db.createCustomer({
        name: newCustName,
        phone: newCustPhone,
        creditLimit: 10000,
        openingBalance: 0,
      });
      setCustomers(db.getCustomers());
      setSelectedCustomerId(created.id);
      setIsQuickCustomerOpen(false);
      setNewCustName('');
      setNewCustPhone('');
    } catch (err: any) {
      alert(err.message || 'Failed to create customer');
    }
  };

  // Atomic Checkout
  const handleCheckout = async () => {
    setError(null);
    if (cart.length === 0) {
      setError('Cart is empty. Add at least one product.');
      return;
    }

    try {
      let payments: { method: PaymentMethod; amount: number }[] = [];

      if (isSplitPayment) {
        const totalSplit = splitCash + splitCard + splitCredit;
        if (totalSplit < grandTotal) {
          throw new Error(
            `Total split payments (${settings.currencySymbol} ${totalSplit}) do not cover amount due (${settings.currencySymbol} ${grandTotal})`
          );
        }
        if (splitCash > 0) payments.push({ method: 'cash', amount: splitCash });
        if (splitCard > 0) payments.push({ method: 'card', amount: splitCard });
        if (splitCredit > 0) payments.push({ method: 'credit', amount: splitCredit });
      } else {
        const tendered = paymentMethod === 'cash' ? parseFloat(amountReceived) || grandTotal : grandTotal;
        payments = [{ method: paymentMethod, amount: tendered }];
      }

      const sale = await db.checkoutSale({
        customerId: selectedCustomerId,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          discount: item.discount,
        })),
        payments,
        cartDiscount,
      });

      // Success
      setCompletedSale(sale);
      setCart([]);
      setCartDiscount(0);
      setAmountReceived('');
      setIsSplitPayment(false);
      refreshProducts();
    } catch (err: any) {
      setError(err.message || 'Checkout failed');
    }
  };

  const handleStartNewSale = () => {
    setCompletedSale(null);
    setError(null);
    setCart([]);
    setSelectedCustomerId('walkin-cust');
    setPaymentMethod('cash');
    setAmountReceived('');
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm));
    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  // Cash change calculation
  const receivedNum = Money.round(parseFloat(amountReceived) || 0);
  const changeDue = paymentMethod === 'cash' && receivedNum > grandTotal ? Money.sub(receivedNum, grandTotal) : 0;

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = searchTerm.trim();
      if (!query) return;

      let found = db.getProductByBarcode(query);
      if (!found) found = db.getProductBySku(query);
      if (!found && filteredProducts.length === 1) {
        found = filteredProducts[0];
      }

      if (found) {
        handleAddToCart(found);
        setSearchTerm('');
      }
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-slate-100 dark:bg-slate-950 overflow-hidden">
      {/* LEFT COLUMN: Product Catalog & Fast Search */}
      <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {/* Top Search Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Scan barcode with scanner or search title/SKU (Press Enter)..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
              />
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="px-2.5 py-2 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 dark:border-slate-700 rounded"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              All Items ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Catalog Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.slice(0, visibleCount).map((p) => {
              const isOut = p.quantityOnHand <= 0;
              const isLow = p.quantityOnHand > 0 && p.quantityOnHand <= p.reorderLevel;

              return (
                <button
                  key={p.id}
                  disabled={isOut && !settings.allowNegativeStock}
                  onClick={() => handleAddToCart(p)}
                  className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all group cursor-pointer ${
                    isOut
                      ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 opacity-60 cursor-not-allowed'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 hover:shadow-xs active:scale-[0.98]'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-xs text-slate-900 dark:text-white line-clamp-2 leading-tight">
                      {p.name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      {p.sku}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white font-mono">
                      {settings.currencySymbol} {p.sellingPrice.toFixed(2)}
                    </span>
                    <span
                      className={`text-[10px] font-medium ${
                        isOut
                          ? 'text-rose-600'
                          : isLow
                          ? 'text-amber-600'
                          : 'text-slate-400'
                      }`}
                    >
                      {p.quantityOnHand} {p.unit}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredProducts.length > visibleCount && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setVisibleCount((c) => c + 48)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Load More Products ({filteredProducts.length - visibleCount} more)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Sale Cart & Atomic Checkout Panel */}
      <div className="w-full md:w-96 lg:w-[420px] flex-shrink-0 flex flex-col bg-slate-50 dark:bg-slate-950 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 h-full">
        {/* Cart Header & Customer Selector */}
        <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
              Current Sale Cart ({cart.reduce((sum, it) => sum + it.quantity, 0)} items)
            </h3>
            {cart.length > 0 && (
              <button
                onClick={handleClearCart}
                className="text-xs text-rose-600 hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>

          {/* Customer Selection Row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.id !== 'walkin-cust' ? `(Balance: ${settings.currencySymbol}${c.currentReceivable})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setIsQuickCustomerOpen(true)}
              className="p-1.5 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              title="Quick Add Customer"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
              <ShoppingCart className="w-8 h-8 text-slate-300 stroke-[1.5]" />
              <span className="text-xs">Cart is empty. Search products or click items on the left to add.</span>
            </div>
          ) : (
            cart.map((item, index) => {
              const lineTotal = item.product.sellingPrice * item.quantity - item.discount;
              return (
                <div
                  key={item.product.id}
                  className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-white truncate">
                        {item.product.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {settings.currencySymbol} {item.product.sellingPrice.toFixed(2)} / {item.product.unit}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="text-slate-400 hover:text-rose-600 p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {/* Stepper */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleUpdateQuantity(index, item.quantity - 1)}
                        className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-200"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        step={['kg', 'g', 'l', 'ml'].includes(item.product.unit) ? '0.1' : '1'}
                        value={item.quantity}
                        onChange={(e) => handleUpdateQuantity(index, parseFloat(e.target.value) || 1)}
                        className="w-12 text-center py-0.5 font-mono text-xs border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800"
                      />
                      <button
                        onClick={() => handleUpdateQuantity(index, item.quantity + 1)}
                        className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-200"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right font-mono font-bold text-slate-900 dark:text-white">
                      {settings.currencySymbol} {lineTotal.toFixed(2)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Cart Totals & Checkout Actions */}
        {cart.length > 0 && (
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-3">
            {/* Calculation rows */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {settings.currencySymbol} {subtotal.toFixed(2)}
                </span>
              </div>

              {/* Cart Discount */}
              <div className="flex items-center justify-between text-slate-500">
                <span className="flex items-center gap-1">
                  <Percent className="w-3 h-3" /> Discount:
                </span>
                <div className="flex items-center gap-1">
                  <span>- {settings.currencySymbol}</span>
                  <input
                    type="number"
                    min="0"
                    max={subtotal}
                    value={cartDiscount}
                    onChange={(e) => setCartDiscount(parseFloat(e.target.value) || 0)}
                    className="w-16 px-1.5 py-0.5 text-right font-mono border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              {settings.taxEnabled && (
                <div className="flex justify-between text-slate-500">
                  <span>Sales Tax ({settings.taxRatePercent}%):</span>
                  <span className="font-mono">
                    {settings.currencySymbol} {taxTotal.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white">
                <span>Grand Total:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 text-base">
                  {settings.currencySymbol} {grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Payment Method</span>
                <button
                  type="button"
                  onClick={() => setIsSplitPayment(!isSplitPayment)}
                  className="text-[11px] text-emerald-600 hover:underline"
                >
                  {isSplitPayment ? 'Single Payment' : 'Split Tender'}
                </button>
              </div>

              {!isSplitPayment ? (
                <div className="grid grid-cols-4 gap-1 text-[11px]">
                  {(['cash', 'card', 'bank_transfer', 'mobile_wallet'] as PaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`py-1.5 px-1 rounded text-center capitalize font-medium transition-colors ${
                        paymentMethod === m
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {m.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5 p-2 bg-slate-50 dark:bg-slate-800 rounded text-xs">
                  <div className="flex items-center justify-between">
                    <span>Cash Tender:</span>
                    <input
                      type="number"
                      value={splitCash}
                      onChange={(e) => setSplitCash(parseFloat(e.target.value) || 0)}
                      className="w-20 px-1.5 py-0.5 text-right font-mono border rounded bg-white dark:bg-slate-700 text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Card / POS:</span>
                    <input
                      type="number"
                      value={splitCard}
                      onChange={(e) => setSplitCard(parseFloat(e.target.value) || 0)}
                      className="w-20 px-1.5 py-0.5 text-right font-mono border rounded bg-white dark:bg-slate-700 text-xs"
                    />
                  </div>
                  {settings.creditSalesEnabled && selectedCustomerId !== 'walkin-cust' && (
                    <div className="flex items-center justify-between">
                      <span>Store Credit:</span>
                      <input
                        type="number"
                        value={splitCredit}
                        onChange={(e) => setSplitCredit(parseFloat(e.target.value) || 0)}
                        className="w-20 px-1.5 py-0.5 text-right font-mono border rounded bg-white dark:bg-slate-700 text-xs"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Cash Change Calculator */}
              {paymentMethod === 'cash' && !isSplitPayment && (
                <div className="p-2 bg-slate-50 dark:bg-slate-800/80 rounded-md space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Amount Received:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-slate-400">{settings.currencySymbol}</span>
                      <input
                        type="number"
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(e.target.value)}
                        placeholder={grandTotal.toFixed(0)}
                        className="w-24 px-2 py-1 font-mono text-right bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  {receivedNum > grandTotal && (
                    <div className="flex items-center justify-between font-semibold text-emerald-600 dark:text-emerald-400">
                      <span>Change to Return:</span>
                      <span className="font-mono text-sm">
                        {settings.currencySymbol} {changeDue.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="p-2 bg-rose-50 text-rose-800 border border-rose-200 rounded text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Complete Sale Button */}
            <button
              onClick={handleCheckout}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Complete Sale ({settings.currencySymbol} {grandTotal.toFixed(2)})</span>
            </button>
          </div>
        )}
      </div>

      {/* Sale Confirmation Dialog with PDF download (Atomic Post-Sale UI) */}
      {completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4 text-center">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Transaction Completed!
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Invoice #{completedSale.saleNumber}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-lg text-xs space-y-1.5 text-left border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <strong className="text-slate-800 dark:text-slate-200">{completedSale.customerName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Items Sold:</span>
                <span>{completedSale.items.length} lines</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Amount:</span>
                <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                  {settings.currencySymbol} {completedSale.total.toFixed(2)}
                </strong>
              </div>
              {completedSale.changeGiven > 0 && (
                <div className="flex justify-between text-amber-600 font-semibold">
                  <span>Change Given:</span>
                  <span className="font-mono">
                    {settings.currencySymbol} {completedSale.changeGiven.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => PdfService.generateSalesReceipt(completedSale, settings, 'a4')}
                  className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Download A4 PDF</span>
                </button>
                <button
                  onClick={() => PdfService.generateSalesReceipt(completedSale, settings, 'thermal_80mm')}
                  className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Thermal 80mm PDF</span>
                </button>
              </div>

              <button
                onClick={handleStartNewSale}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <span>Start New Sale (Counter Ready)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Customer Add Dialog */}
      {isQuickCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-600" />
              Quick Add Customer
            </h3>
            <form onSubmit={handleSaveQuickCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Aslam Khan"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="e.g. +92 300 1234567"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsQuickCustomerOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md shadow-xs"
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
