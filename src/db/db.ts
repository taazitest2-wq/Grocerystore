import {
  Product,
  Category,
  Supplier,
  Customer,
  Sale,
  SaleItem,
  PaymentRecord,
  PaymentMethod,
  Purchase,
  PurchaseItem,
  GoodsReceipt,
  PurchasePayment,
  InventoryMovement,
  StockAdjustment,
  ReturnRecord,
  ReturnItem,
  Expense,
  CashSession,
  CashMovement,
  Settings,
  AuditLog,
  AppUser,
  UserRole,
  UnitOfMeasure,
} from '../types';
import { StorageEngine, AppDatabaseSchema } from './storage';
import { Money } from '../utils/money';
import { CryptoUtils } from '../utils/crypto';

export const Permissions = {
  canAccessSettings: (role: UserRole) => role === 'owner_admin',
  canManageUsers: (role: UserRole) => role === 'owner_admin',
  canPerformReversals: (role: UserRole) => role === 'owner_admin' || role === 'manager',
  canApproveDiscounts: (role: UserRole) => role === 'owner_admin' || role === 'manager',
  canManageExpenses: (role: UserRole) => role === 'owner_admin' || role === 'manager',
  canManagePurchases: (role: UserRole) => role === 'owner_admin' || role === 'manager',
  canManageSuppliers: (role: UserRole) => role === 'owner_admin' || role === 'manager',
  canManageInventory: (role: UserRole) =>
    role === 'owner_admin' || role === 'manager' || role === 'inventory_staff',
  canManageProducts: (role: UserRole) =>
    role === 'owner_admin' || role === 'manager' || role === 'inventory_staff',
  canUsePOS: (role: UserRole) => true,
  canViewReports: (role: UserRole) => role === 'owner_admin' || role === 'manager',
  canCloseCashSession: (role: UserRole) => role === 'owner_admin' || role === 'manager',
};

class DatabaseService {
  private data: AppDatabaseSchema = StorageEngine.getData();
  private listeners: (() => void)[] = [];
  public currentUser: AppUser = {
    id: 'user-1',
    name: 'Store Administrator',
    username: 'admin',
    role: 'owner_admin',
    isActive: true,
    salt: 'salt_admin_saif_01',
    pinHash: '680c1e8f1cbb5525373d99d44641ca51bd5377b543a26eced58cf4e44544243e',
    pin: '1234',
  };

  // High-performance O(1) indexed maps for large catalogs (1,000 - 2,000+ items)
  private productByIdMap = new Map<string, Product>();
  private productBySkuMap = new Map<string, Product>();
  private productByBarcodeMap = new Map<string, Product>();
  private categoryByIdMap = new Map<string, Category>();
  private customerByIdMap = new Map<string, Customer>();
  private supplierByIdMap = new Map<string, Supplier>();

  public rebuildIndexes(): void {
    this.productByIdMap.clear();
    this.productBySkuMap.clear();
    this.productByBarcodeMap.clear();
    for (const p of this.data.products) {
      if (!p.isArchived) {
        this.productByIdMap.set(p.id, p);
        if (p.sku) this.productBySkuMap.set(p.sku.trim().toLowerCase(), p);
        if (p.barcode) this.productByBarcodeMap.set(p.barcode.trim(), p);
      }
    }

    this.categoryByIdMap.clear();
    for (const c of this.data.categories) {
      this.categoryByIdMap.set(c.id, c);
    }

    this.customerByIdMap.clear();
    for (const cu of this.data.customers) {
      this.customerByIdMap.set(cu.id, cu);
    }

    this.supplierByIdMap.clear();
    for (const s of this.data.suppliers) {
      this.supplierByIdMap.set(s.id, s);
    }
  }

  async init() {
    this.data = await StorageEngine.init();
    if (this.data.users.length > 0) {
      this.currentUser = this.data.users[0];
    }

    // Encrypt and migrate any plain PINs to salted SHA-256 hashes
    let usersMigrated = false;
    for (const u of this.data.users) {
      if (!u.pinHash || !u.salt) {
        const rawPin = u.pin || (u.role === 'owner_admin' ? '1234' : '0000');
        const { pinHash, salt } = CryptoUtils.hashPin(rawPin);
        u.pinHash = pinHash;
        u.salt = salt;
        usersMigrated = true;
      }
    }
    if (usersMigrated) {
      await StorageEngine.persistStore('users');
    }

    // Build O(1) indexed maps for high-performance querying
    this.rebuildIndexes();

    // Attach emergency crash recovery listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        StorageEngine.saveCrashRecoverySnapshot();
      });
      window.addEventListener('error', () => {
        StorageEngine.saveCrashRecoverySnapshot();
      });
    }

    this.notify();
  }

  // Cryptographically verify user PIN against salted hash
  validateUserPin(user: AppUser, inputPin: string): boolean {
    if (user.pinHash && user.salt) {
      return CryptoUtils.verifyPin(inputPin, user.pinHash, user.salt);
    }
    const defaultPin = user.pin || (user.role === 'owner_admin' ? '1234' : '0000');
    return inputPin.trim() === defaultPin.trim();
  }

  // Update and cryptographically hash user PIN
  async updateUserPin(userId: string, newPin: string): Promise<AppUser> {
    const user = this.data.users.find((u) => u.id === userId);
    if (!user) throw new Error('User not found.');
    if (!newPin || newPin.trim().length < 4) {
      throw new Error('PIN must be at least 4 digits long.');
    }
    const { pinHash, salt } = CryptoUtils.hashPin(newPin);
    user.pinHash = pinHash;
    user.salt = salt;
    user.pin = newPin.trim();
    await StorageEngine.persistStore('users');
    this.logAudit('PIN_UPDATED', 'USER', user.id, `Encrypted PIN updated for user ${user.name}`);
    this.notify();
    return user;
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    try {
      StorageEngine.saveCrashRecoverySnapshot();
    } catch {
      // ignore
    }
    this.listeners.forEach((l) => l());
  }

  setCurrentUser(user: AppUser) {
    this.currentUser = user;
    this.logAudit('USER_SWITCH', 'USER', user.id, `Active session switched to ${user.name} (${user.role})`);
    this.notify();
  }

  // --- Audit Logging ---
  logAudit(action: string, entity: string, entityId: string, description: string, metadata?: Record<string, unknown>) {
    const entry: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      action,
      entity,
      entityId,
      description,
      metadata,
    };
    this.data.auditLogs.unshift(entry);
    StorageEngine.persistStore('auditLogs');
  }

  getAuditLogs(): AuditLog[] {
    return [...this.data.auditLogs];
  }

  // --- Settings ---
  getSettings(): Settings {
    return { ...this.data.settings };
  }

  async updateSettings(settings: Partial<Settings>): Promise<Settings> {
    this.data.settings = { ...this.data.settings, ...settings };
    await StorageEngine.persistStore('settings');
    this.logAudit('UPDATE_SETTINGS', 'SETTINGS', 'CONFIG', 'Store settings and configuration updated');
    this.notify();
    return this.data.settings;
  }

  // --- Categories ---
  getCategories(): Category[] {
    return this.data.categories.filter((c) => !c.isArchived);
  }

  getAllCategories(): Category[] {
    return [...this.data.categories];
  }

  getCategoryById(id: string): Category | undefined {
    return this.categoryByIdMap.get(id) || this.data.categories.find((c) => c.id === id);
  }

  async createCategory(name: string, description?: string): Promise<Category> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Category name is required.');
    const exists = this.data.categories.some(
      (c) => !c.isArchived && c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) throw new Error(`Category "${trimmed}" already exists.`);

    const category: Category = {
      id: `cat-${Date.now()}`,
      name: trimmed,
      description: description?.trim(),
      isArchived: false,
      createdAt: new Date().toISOString(),
    };
    this.data.categories.push(category);
    await StorageEngine.persistStore('categories');
    this.logAudit('CREATE_CATEGORY', 'CATEGORY', category.id, `Created category: ${category.name}`);
    this.notify();
    return category;
  }

  async updateCategory(id: string, name: string, description?: string): Promise<Category> {
    const cat = this.data.categories.find((c) => c.id === id);
    if (!cat) throw new Error('Category not found.');
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Category name is required.');

    const duplicate = this.data.categories.some(
      (c) => c.id !== id && !c.isArchived && c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) throw new Error(`Another category with name "${trimmed}" already exists.`);

    cat.name = trimmed;
    cat.description = description?.trim();
    await StorageEngine.persistStore('categories');
    this.logAudit('UPDATE_CATEGORY', 'CATEGORY', cat.id, `Updated category: ${cat.name}`);
    this.notify();
    return cat;
  }

  async archiveCategory(id: string): Promise<void> {
    const cat = this.data.categories.find((c) => c.id === id);
    if (!cat) throw new Error('Category not found.');
    const hasProducts = this.data.products.some((p) => p.categoryId === id && !p.isArchived);
    if (hasProducts) {
      throw new Error(`Cannot archive category "${cat.name}": it is currently assigned to active products.`);
    }
    cat.isArchived = true;
    await StorageEngine.persistStore('categories');
    this.logAudit('ARCHIVE_CATEGORY', 'CATEGORY', cat.id, `Archived category: ${cat.name}`);
    this.notify();
  }

  // --- Products ---
  getProducts(): Product[] {
    return this.data.products.filter((p) => !p.isArchived);
  }

  getAllProducts(): Product[] {
    return [...this.data.products];
  }

  getProductById(id: string): Product | undefined {
    return this.productByIdMap.get(id) || this.data.products.find((p) => p.id === id);
  }

  getProductBySku(sku: string): Product | undefined {
    return (
      this.productBySkuMap.get(sku.trim().toLowerCase()) ||
      this.data.products.find((p) => p.sku.toLowerCase() === sku.trim().toLowerCase())
    );
  }

  getProductByBarcode(barcode: string): Product | undefined {
    return (
      this.productByBarcodeMap.get(barcode.trim()) ||
      this.data.products.find((p) => p.barcode === barcode.trim())
    );
  }

  async createProduct(
    productData: Omit<Product, 'id' | 'isArchived' | 'createdAt' | 'updatedAt'>
  ): Promise<Product> {
    if (!productData.name.trim()) throw new Error('Product name is required.');
    if (!productData.sku.trim()) throw new Error('Product SKU is required.');
    if (productData.purchaseCost < 0) throw new Error('Purchase cost cannot be negative.');
    if (productData.sellingPrice < 0) throw new Error('Selling price cannot be negative.');

    const duplicateSku = this.data.products.some(
      (p) => !p.isArchived && p.sku.toLowerCase() === productData.sku.trim().toLowerCase()
    );
    if (duplicateSku) {
      throw new Error(`A product with SKU "${productData.sku}" already exists.`);
    }

    const now = new Date().toISOString();
    const product: Product = {
      ...productData,
      id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: productData.name.trim(),
      sku: productData.sku.trim().toUpperCase(),
      barcode: productData.barcode?.trim(),
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };

    this.data.products.push(product);

    // If initial quantity > 0, log opening stock movement
    if (product.quantityOnHand > 0) {
      const movement: InventoryMovement = {
        id: `mov-${Date.now()}`,
        movementNumber: `MOV-${Date.now().toString().slice(-6)}`,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantityChange: product.quantityOnHand,
        balanceAfter: product.quantityOnHand,
        movementType: 'opening_stock',
        referenceId: product.id,
        referenceNumber: 'INITIAL-ENTRY',
        unitCost: product.purchaseCost,
        reason: 'Opening inventory balance on product creation',
        userId: this.currentUser.id,
        userName: this.currentUser.name,
        timestamp: now,
      };
      this.data.inventoryMovements.push(movement);
      await StorageEngine.persistStore('inventoryMovements');
    }

    await StorageEngine.persistStore('products');
    this.logAudit('CREATE_PRODUCT', 'PRODUCT', product.id, `Created product: ${product.name} (SKU: ${product.sku})`);
    this.notify();
    return product;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const prod = this.data.products.find((p) => p.id === id);
    if (!prod) throw new Error('Product not found.');

    if (updates.sku && updates.sku !== prod.sku) {
      const duplicateSku = this.data.products.some(
        (p) => p.id !== id && !p.isArchived && p.sku.toLowerCase() === updates.sku!.trim().toLowerCase()
      );
      if (duplicateSku) {
        throw new Error(`A product with SKU "${updates.sku}" already exists.`);
      }
    }

    if (updates.purchaseCost !== undefined && updates.purchaseCost < 0) {
      throw new Error('Purchase cost cannot be negative.');
    }
    if (updates.sellingPrice !== undefined && updates.sellingPrice < 0) {
      throw new Error('Selling price cannot be negative.');
    }

    // Notice: Stock changes should not be done by silently overwriting quantityOnHand!
    // Quantity on hand changes must go through stock adjustments or receiving.
    const oldPrice = prod.sellingPrice;
    const oldCost = prod.purchaseCost;

    Object.assign(prod, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    await StorageEngine.persistStore('products');
    let logMsg = `Updated product details for ${prod.name}`;
    if (updates.sellingPrice !== undefined && updates.sellingPrice !== oldPrice) {
      logMsg += ` (Price: ${oldPrice} -> ${updates.sellingPrice})`;
    }
    if (updates.purchaseCost !== undefined && updates.purchaseCost !== oldCost) {
      logMsg += ` (Cost: ${oldCost} -> ${updates.purchaseCost})`;
    }
    this.logAudit('UPDATE_PRODUCT', 'PRODUCT', prod.id, logMsg);
    this.notify();
    return prod;
  }

  async archiveProduct(id: string): Promise<void> {
    const prod = this.data.products.find((p) => p.id === id);
    if (!prod) throw new Error('Product not found.');
    prod.isArchived = true;
    prod.updatedAt = new Date().toISOString();
    await StorageEngine.persistStore('products');
    this.logAudit('ARCHIVE_PRODUCT', 'PRODUCT', prod.id, `Archived product: ${prod.name}`);
    this.notify();
  }

  // --- Suppliers ---
  getSuppliers(): Supplier[] {
    return this.data.suppliers.filter((s) => !s.isArchived);
  }

  getSupplierById(id: string): Supplier | undefined {
    return this.supplierByIdMap.get(id) || this.data.suppliers.find((s) => s.id === id);
  }

  async createSupplier(
    data: Omit<Supplier, 'id' | 'isArchived' | 'createdAt' | 'currentPayable'>
  ): Promise<Supplier> {
    if (!data.name.trim()) throw new Error('Supplier name is required.');
    if (!data.phone.trim()) throw new Error('Supplier phone is required.');

    const supplier: Supplier = {
      ...data,
      id: `sup-${Date.now()}`,
      name: data.name.trim(),
      currentPayable: data.openingBalance || 0,
      isArchived: false,
      createdAt: new Date().toISOString(),
    };
    this.data.suppliers.push(supplier);
    await StorageEngine.persistStore('suppliers');
    this.logAudit('CREATE_SUPPLIER', 'SUPPLIER', supplier.id, `Added supplier: ${supplier.name}`);
    this.notify();
    return supplier;
  }

  async updateSupplier(id: string, updates: Partial<Supplier>): Promise<Supplier> {
    const sup = this.data.suppliers.find((s) => s.id === id);
    if (!sup) throw new Error('Supplier not found.');
    Object.assign(sup, updates);
    await StorageEngine.persistStore('suppliers');
    this.logAudit('UPDATE_SUPPLIER', 'SUPPLIER', sup.id, `Updated supplier: ${sup.name}`);
    this.notify();
    return sup;
  }

  async archiveSupplier(id: string): Promise<void> {
    const sup = this.data.suppliers.find((s) => s.id === id);
    if (!sup) throw new Error('Supplier not found.');
    const hasPurchases = this.data.purchases.some((p) => p.supplierId === id);
    if (hasPurchases) {
      throw new Error(`Cannot delete supplier "${sup.name}" as historical purchase orders exist. Archiving instead.`);
    }
    sup.isArchived = true;
    await StorageEngine.persistStore('suppliers');
    this.logAudit('ARCHIVE_SUPPLIER', 'SUPPLIER', sup.id, `Archived supplier: ${sup.name}`);
    this.notify();
  }

  // --- Customers ---
  getCustomers(): Customer[] {
    return this.data.customers.filter((c) => !c.isArchived);
  }

  getCustomerById(id: string): Customer | undefined {
    return this.customerByIdMap.get(id) || this.data.customers.find((c) => c.id === id);
  }

  async createCustomer(
    data: Omit<Customer, 'id' | 'isArchived' | 'createdAt' | 'currentReceivable'>
  ): Promise<Customer> {
    if (!data.name.trim()) throw new Error('Customer name is required.');

    const customer: Customer = {
      ...data,
      id: `cust-${Date.now()}`,
      name: data.name.trim(),
      currentReceivable: data.openingBalance || 0,
      isArchived: false,
      createdAt: new Date().toISOString(),
    };
    this.data.customers.push(customer);
    await StorageEngine.persistStore('customers');
    this.logAudit('CREATE_CUSTOMER', 'CUSTOMER', customer.id, `Created customer: ${customer.name}`);
    this.notify();
    return customer;
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    const cust = this.data.customers.find((c) => c.id === id);
    if (!cust) throw new Error('Customer not found.');
    Object.assign(cust, updates);
    await StorageEngine.persistStore('customers');
    this.logAudit('UPDATE_CUSTOMER', 'CUSTOMER', cust.id, `Updated customer: ${cust.name}`);
    this.notify();
    return cust;
  }

  async recordCustomerPayment(
    customerId: string,
    amount: number,
    method: PaymentMethod,
    reference?: string,
    notes?: string
  ): Promise<Customer> {
    const cust = this.data.customers.find((c) => c.id === customerId);
    if (!cust) throw new Error('Customer not found.');
    if (amount <= 0) throw new Error('Payment amount must be greater than zero.');

    cust.currentReceivable = Math.max(0, cust.currentReceivable - amount);
    await StorageEngine.persistStore('customers');

    // If cash received, update cash drawer
    if (method === 'cash') {
      const activeSession = this.getActiveCashSession();
      if (activeSession) {
        activeSession.cashIn += amount;
        activeSession.expectedCash += amount;
        const mov: CashMovement = {
          id: `cmov-${Date.now()}`,
          sessionId: activeSession.id,
          timestamp: new Date().toISOString(),
          type: 'cash_in',
          amount,
          balanceAfter: activeSession.expectedCash,
          reason: `Customer credit payment: ${cust.name}`,
          referenceId: cust.id,
          performedBy: this.currentUser.name,
        };
        activeSession.movements.push(mov);
        await StorageEngine.persistStore('cashSessions');
      }
    }

    this.logAudit(
      'CUSTOMER_PAYMENT',
      'CUSTOMER',
      cust.id,
      `Received payment of ${this.data.settings.currencySymbol}${amount} from ${cust.name} via ${method}`
    );
    this.notify();
    return cust;
  }

  // --- Purchases & Receiving Workflow ---
  getPurchases(): Purchase[] {
    return [...this.data.purchases].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createPurchaseOrder(
    supplierId: string,
    supplierInvoiceNo: string,
    items: { productId: string; unitCost: number; quantity: number }[],
    notes?: string
  ): Promise<Purchase> {
    const supplier = this.data.suppliers.find((s) => s.id === supplierId);
    if (!supplier) throw new Error('Supplier not found.');
    if (!items || items.length === 0) throw new Error('Purchase order must contain at least one product line.');

    const purchaseNumber = `PO-${new Date().getFullYear()}-${String(this.data.purchases.length + 1).padStart(4, '0')}`;
    const pItems: PurchaseItem[] = items.map((it) => {
      const prod = this.data.products.find((p) => p.id === it.productId);
      if (!prod) throw new Error(`Product not found with id ${it.productId}`);
      if (it.quantity <= 0) throw new Error(`Invalid quantity for ${prod.name}`);
      return {
        id: `pitem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        purchaseId: '',
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        unit: prod.unit,
        unitCost: it.unitCost,
        quantityOrdered: it.quantity,
        quantityReceived: 0,
        discount: 0,
        total: it.unitCost * it.quantity,
      };
    });

    const subtotal = pItems.reduce((acc, it) => acc + it.total, 0);
    const purchaseId = `po-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    pItems.forEach((it) => (it.purchaseId = purchaseId));

    const purchase: Purchase = {
      id: purchaseId,
      purchaseNumber,
      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierInvoiceNo: supplierInvoiceNo || purchaseNumber,
      orderDate: new Date().toISOString(),
      subtotal,
      discountTotal: 0,
      taxTotal: 0,
      additionalCharges: 0,
      total: subtotal,
      amountPaid: 0,
      balanceDue: subtotal,
      status: 'ordered',
      items: pItems,
      receipts: [],
      payments: [],
      createdAt: new Date().toISOString(),
    };

    // Note: Stock is NOT increased when order is created! Increased ONLY upon receiving goods.
    this.data.purchases.push(purchase);
    supplier.currentPayable += subtotal;

    await StorageEngine.persistStore('purchases');
    await StorageEngine.persistStore('suppliers');
    this.logAudit('CREATE_PURCHASE', 'PURCHASE', purchase.id, `Created Purchase Order ${purchase.purchaseNumber} for ${supplier.name}`);
    this.notify();
    return purchase;
  }

  // Scenario A: Receive Goods (Atomic Stock Increase & Ledger Entry, with supplier over-delivery support)
  async receiveGoods(
    purchaseId: string,
    receivedLines: { productId: string; quantity: number }[],
    notes?: string
  ): Promise<Purchase> {
    const purchase = this.data.purchases.find((p) => p.id === purchaseId);
    if (!purchase) throw new Error('Purchase order not found.');
    if (purchase.status === 'cancelled') throw new Error('Cannot receive cancelled purchase order.');
    if (purchase.status === 'received') throw new Error('Purchase order has already been fully received.');

    const receiptNumber = `GRN-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
    const now = new Date().toISOString();
    const grnItems: GoodsReceipt['items'] = [];
    let excessCostTotal = 0;

    // Atomic execution
    for (const line of receivedLines) {
      if (line.quantity <= 0) continue;
      const pItem = purchase.items.find((it) => it.productId === line.productId);
      if (!pItem) continue;

      const remainingToReceive = Math.max(0, pItem.quantityOrdered - pItem.quantityReceived);
      const isOverDelivery = line.quantity > remainingToReceive;
      const overDeliveredQty = isOverDelivery ? line.quantity - remainingToReceive : 0;

      const product = this.data.products.find((p) => p.id === line.productId);
      if (!product) throw new Error(`Product not found: ${line.productId}`);

      // 1. Update purchase item quantity received
      pItem.quantityReceived += line.quantity;

      // If supplier delivered more quantity than ordered, dynamically adjust ordered quantity and total
      if (pItem.quantityReceived > pItem.quantityOrdered) {
        const addedQty = pItem.quantityReceived - pItem.quantityOrdered;
        pItem.quantityOrdered = pItem.quantityReceived;
        pItem.total = Money.round(Money.mul(pItem.quantityOrdered, pItem.unitCost));
        pItem.totalCost = pItem.total;
        excessCostTotal = Money.add(excessCostTotal, Money.mul(addedQty, pItem.unitCost));
      }

      // 2. Increase product stock on hand atomically
      const prevStock = product.quantityOnHand;
      product.quantityOnHand += line.quantity;
      product.updatedAt = now;

      // Weighted average cost update policy:
      if (prevStock + line.quantity > 0) {
        const totalCostValue = prevStock * product.purchaseCost + line.quantity * pItem.unitCost;
        product.purchaseCost = Math.round((totalCostValue / (prevStock + line.quantity)) * 100) / 100;
      }

      // 3. Write immutable inventory movement ledger
      const movement: InventoryMovement = {
        id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        movementNumber: `MOV-${Date.now().toString().slice(-6)}`,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantityChange: line.quantity,
        balanceAfter: product.quantityOnHand,
        movementType: 'purchase_receive',
        referenceId: purchase.id,
        referenceNumber: receiptNumber,
        unitCost: pItem.unitCost,
        reason: isOverDelivery
          ? `Goods received against PO ${purchase.purchaseNumber} (Supplier over-delivery +${overDeliveredQty} units)`
          : `Goods received against PO ${purchase.purchaseNumber}`,
        userId: this.currentUser.id,
        userName: this.currentUser.name,
        timestamp: now,
      };
      this.data.inventoryMovements.push(movement);

      grnItems.push({
        productId: product.id,
        productName: product.name,
        quantityReceived: line.quantity,
        unitCost: pItem.unitCost,
      });
    }

    if (grnItems.length === 0) {
      throw new Error('No valid quantities provided to receive.');
    }

    // If there was an excess cost from over-delivery, update purchase subtotal, total, balanceDue and supplier payable
    if (excessCostTotal > 0) {
      purchase.subtotal = Money.round(purchase.items.reduce((acc, it) => Money.add(acc, it.total), 0));
      purchase.total = Money.round(
        Money.add(
          Money.sub(purchase.subtotal, purchase.discountTotal || 0),
          Money.add(purchase.taxTotal || 0, purchase.additionalCharges || 0)
        )
      );
      purchase.balanceDue = Money.round(Math.max(0, Money.sub(purchase.total, purchase.amountPaid)));

      const supplier = this.data.suppliers.find((s) => s.id === purchase.supplierId);
      if (supplier) {
        supplier.currentPayable = Money.round(Money.add(supplier.currentPayable, excessCostTotal));
      }
    }

    // Record Goods Receipt Note (GRN)
    const grn: GoodsReceipt = {
      id: `grn-${Date.now()}`,
      receiptNumber,
      purchaseId: purchase.id,
      date: now,
      receivedBy: this.currentUser.name,
      notes,
      items: grnItems,
    };
    purchase.receipts.push(grn);

    // Update overall purchase status
    const allFullyReceived = purchase.items.every((it) => it.quantityReceived >= it.quantityOrdered);
    purchase.status = allFullyReceived ? 'received' : 'partially_received';

    await StorageEngine.persistStore('purchases');
    await StorageEngine.persistStore('suppliers');
    await StorageEngine.persistStore('products');
    await StorageEngine.persistStore('inventoryMovements');

    this.logAudit(
      'GOODS_RECEIVED',
      'PURCHASE',
      purchase.id,
      `Received goods for PO ${purchase.purchaseNumber} (GRN: ${receiptNumber}, Status: ${purchase.status})`
    );
    this.notify();
    return purchase;
  }

  // Update existing purchase order (editable items, quantities, costs, notes)
  async updatePurchaseOrder(
    purchaseId: string,
    updates: {
      supplierInvoiceNo?: string;
      expectedDeliveryDate?: string;
      notes?: string;
      discountTotal?: number;
      taxTotal?: number;
      additionalCharges?: number;
      items?: {
        productId: string;
        productName: string;
        quantityOrdered: number;
        unitCost: number;
      }[];
    }
  ): Promise<Purchase> {
    const purchase = this.data.purchases.find((p) => p.id === purchaseId);
    if (!purchase) throw new Error('Purchase order not found.');
    if (purchase.status === 'cancelled') throw new Error('Cannot edit a cancelled purchase order.');

    const supplier = this.data.suppliers.find((s) => s.id === purchase.supplierId);
    const oldTotal = purchase.total;

    if (updates.supplierInvoiceNo !== undefined) purchase.supplierInvoiceNo = updates.supplierInvoiceNo;
    if (updates.expectedDeliveryDate !== undefined) purchase.expectedDeliveryDate = updates.expectedDeliveryDate;
    if (updates.notes !== undefined) purchase.notes = updates.notes;
    if (updates.discountTotal !== undefined) purchase.discountTotal = updates.discountTotal;
    if (updates.taxTotal !== undefined) purchase.taxTotal = updates.taxTotal;
    if (updates.additionalCharges !== undefined) purchase.additionalCharges = updates.additionalCharges;

    if (updates.items && updates.items.length > 0) {
      // Validate that ordered quantity is not less than already received quantity
      for (const updatedLine of updates.items) {
        const existingLine = purchase.items.find((it) => it.productId === updatedLine.productId);
        if (existingLine && updatedLine.quantityOrdered < existingLine.quantityReceived) {
          throw new Error(
            `Quantity for ${existingLine.productName} cannot be less than already received quantity (${existingLine.quantityReceived}).`
          );
        }
      }

      // Reconstruct items
      purchase.items = updates.items.map((line) => {
        const existingLine = purchase.items.find((it) => it.productId === line.productId);
        const prod = this.data.products.find((p) => p.id === line.productId);
        const qtyReceived = existingLine ? existingLine.quantityReceived : 0;
        const total = Money.round(Money.mul(line.quantityOrdered, line.unitCost));
        return {
          id: existingLine ? existingLine.id : `poi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          purchaseId: purchase.id,
          productId: line.productId,
          productName: line.productName,
          sku: existingLine ? existingLine.sku : (prod ? prod.sku : 'SKU-000'),
          unit: existingLine ? existingLine.unit : (prod ? prod.unit : 'pack'),
          quantityOrdered: line.quantityOrdered,
          quantityReceived: qtyReceived,
          unitCost: line.unitCost,
          discount: 0,
          total,
          totalCost: total,
        };
      });
    }

    // Recalculate totals
    purchase.subtotal = Money.round(purchase.items.reduce((sum, it) => Money.add(sum, it.total), 0));
    purchase.total = Money.round(
      Money.add(
        Money.sub(purchase.subtotal, purchase.discountTotal || 0),
        Money.add(purchase.taxTotal || 0, purchase.additionalCharges || 0)
      )
    );
    purchase.balanceDue = Money.round(Math.max(0, Money.sub(purchase.total, purchase.amountPaid)));

    // Recalculate status
    const allReceived = purchase.items.every((it) => it.quantityReceived >= it.quantityOrdered);
    const anyReceived = purchase.items.some((it) => it.quantityReceived > 0);
    if (allReceived && purchase.items.length > 0) {
      purchase.status = 'received';
    } else if (anyReceived) {
      purchase.status = 'partially_received';
    } else {
      purchase.status = 'ordered';
    }

    // Adjust supplier currentPayable for the total difference
    const totalDiff = Money.sub(purchase.total, oldTotal);
    if (supplier && totalDiff !== 0) {
      supplier.currentPayable = Money.round(Money.add(supplier.currentPayable, totalDiff));
    }

    await StorageEngine.persistStore('purchases');
    if (supplier) await StorageEngine.persistStore('suppliers');

    this.logAudit('UPDATE_PURCHASE', 'PURCHASE', purchase.id, `Updated Purchase Order ${purchase.purchaseNumber}`);
    this.notify();
    return purchase;
  }

  // Delete / cancel purchase order
  async deletePurchaseOrder(purchaseId: string): Promise<boolean> {
    const pIndex = this.data.purchases.findIndex((p) => p.id === purchaseId);
    if (pIndex === -1) throw new Error('Purchase order not found.');
    const purchase = this.data.purchases[pIndex];

    const hasReceivedItems = purchase.items.some((it) => it.quantityReceived > 0);
    if (hasReceivedItems) {
      throw new Error('Cannot delete purchase order with received goods. Stock movements have already been posted.');
    }

    // Remove from supplier payable
    const supplier = this.data.suppliers.find((s) => s.id === purchase.supplierId);
    if (supplier) {
      supplier.currentPayable = Money.round(Math.max(0, Money.sub(supplier.currentPayable, purchase.balanceDue)));
    }

    this.data.purchases.splice(pIndex, 1);
    await StorageEngine.persistStore('purchases');
    if (supplier) await StorageEngine.persistStore('suppliers');

    this.logAudit('DELETE_PURCHASE', 'PURCHASE', purchaseId, `Deleted Purchase Order ${purchase.purchaseNumber}`);
    this.notify();
    return true;
  }

  async recordSupplierPayment(
    purchaseId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    reference?: string,
    notes?: string
  ): Promise<Purchase> {
    const purchase = this.data.purchases.find((p) => p.id === purchaseId);
    if (!purchase) throw new Error('Purchase order not found.');
    if (amount <= 0) throw new Error('Payment amount must be greater than zero.');
    if (amount > purchase.balanceDue) {
      throw new Error(`Payment cannot exceed outstanding balance of ${purchase.balanceDue}`);
    }

    const supplier = this.data.suppliers.find((s) => s.id === purchase.supplierId);
    if (supplier) {
      supplier.currentPayable = Math.max(0, Money.sub(supplier.currentPayable, amount));
    }

    purchase.amountPaid = Money.add(purchase.amountPaid, amount);
    purchase.balanceDue = Money.sub(purchase.total, purchase.amountPaid);

    const payment: PurchasePayment = {
      id: `ppay-${Date.now()}`,
      purchaseId: purchase.id,
      supplierId: purchase.supplierId,
      amount,
      paymentMethod,
      paymentDate: new Date().toISOString(),
      reference,
      notes,
    };
    purchase.payments.push(payment);

    // If cash paid out, record in cash drawer session
    if (paymentMethod === 'cash') {
      const activeSession = this.getActiveCashSession();
      if (activeSession) {
        activeSession.cashOut = Money.add(activeSession.cashOut, amount);
        activeSession.expectedCash = Money.sub(activeSession.expectedCash, amount);
        const mov: CashMovement = {
          id: `cmov-${Date.now()}`,
          sessionId: activeSession.id,
          timestamp: new Date().toISOString(),
          type: 'cash_out',
          amount,
          balanceAfter: activeSession.expectedCash,
          reason: `Supplier payment PO ${purchase.purchaseNumber}: ${purchase.supplierName}`,
          referenceId: purchase.id,
          performedBy: this.currentUser.name,
        };
        activeSession.movements.push(mov);
        await StorageEngine.persistStore('cashSessions');
      }
    }

    await StorageEngine.persistStore('purchases');
    await StorageEngine.persistStore('suppliers');
    this.logAudit(
      'SUPPLIER_PAYMENT',
      'PURCHASE',
      purchase.id,
      `Paid ${this.data.settings.currencySymbol}${amount} to ${purchase.supplierName} for PO ${purchase.purchaseNumber}`
    );
    this.notify();
    return purchase;
  }

  // --- Inventory & Stock Adjustments ---
  getInventoryMovements(): InventoryMovement[] {
    return [...this.data.inventoryMovements].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  getStockAdjustments(): StockAdjustment[] {
    return [...this.data.stockAdjustments].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createStockAdjustment(
    productId: string,
    adjustmentType: StockAdjustment['adjustmentType'],
    adjustmentQuantity: number, // can be positive or negative
    reason: string,
    notes?: string
  ): Promise<StockAdjustment> {
    const product = this.data.products.find((p) => p.id === productId);
    if (!product) throw new Error('Product not found.');
    if (adjustmentQuantity === 0) throw new Error('Adjustment quantity cannot be zero.');

    const currentStock = product.quantityOnHand;
    const finalStock = currentStock + adjustmentQuantity;

    if (finalStock < 0 && !this.data.settings.allowNegativeStock) {
      throw new Error(
        `Adjustment would result in negative stock (${finalStock}). Negative stock is not allowed in settings.`
      );
    }

    const adjustmentNumber = `ADJ-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
    const now = new Date().toISOString();

    // Atomic update
    product.quantityOnHand = finalStock;
    product.updatedAt = now;

    let movementType: InventoryMovement['movementType'] = 'manual_adjustment';
    if (adjustmentType === 'damaged') movementType = 'damaged';
    else if (adjustmentType === 'expired') movementType = 'expired';
    else if (adjustmentType === 'opening_stock') movementType = 'opening_stock';

    const movement: InventoryMovement = {
      id: `mov-${Date.now()}`,
      movementNumber: `MOV-${Date.now().toString().slice(-6)}`,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantityChange: adjustmentQuantity,
      balanceAfter: finalStock,
      movementType,
      referenceId: adjustmentNumber,
      referenceNumber: adjustmentNumber,
      unitCost: product.purchaseCost,
      reason: `${adjustmentType.toUpperCase()}: ${reason}`,
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      timestamp: now,
    };
    this.data.inventoryMovements.push(movement);

    const adjustment: StockAdjustment = {
      id: `adj-${Date.now()}`,
      adjustmentNumber,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      currentStock,
      adjustmentQuantity,
      finalStock,
      adjustmentType,
      reason,
      notes,
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      isReversed: false,
      createdAt: now,
    };
    this.data.stockAdjustments.push(adjustment);

    await StorageEngine.persistStore('products');
    await StorageEngine.persistStore('inventoryMovements');
    await StorageEngine.persistStore('stockAdjustments');

    this.logAudit(
      'STOCK_ADJUSTMENT',
      'STOCK',
      product.id,
      `Adjusted stock for ${product.name} by ${adjustmentQuantity > 0 ? '+' : ''}${adjustmentQuantity} (${currentStock} -> ${finalStock}). Reason: ${reason}`
    );
    this.notify();
    return adjustment;
  }

  // --- Point of Sale & Checkout (Atomic Transaction) ---
  getSales(): Sale[] {
    return [...this.data.sales].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getSaleById(id: string): Sale | undefined {
    return this.data.sales.find((s) => s.id === id);
  }

  // Scenario B: Grocery Sale atomic checkout
  async checkoutSale(payload: {
    customerId: string;
    items: { productId: string; quantity: number; discount?: number }[];
    payments: { method: PaymentMethod; amount: number; reference?: string }[];
    cartDiscount?: number;
  }): Promise<Sale> {
    if (!payload.items || payload.items.length === 0) {
      throw new Error('Cart is empty. Add at least one product.');
    }

    const customer = this.data.customers.find((c) => c.id === payload.customerId) || this.data.customers[0];
    const now = new Date().toISOString();
    const saleNumber = `INV-${new Date().getFullYear()}-${String(this.data.sales.length + 1001)}`;

    // 1. Validate line items & stock availability
    let subtotal = 0;
    let itemDiscountsTotal = 0;

    const rawLineDetails = payload.items.map((item) => {
      if (item.quantity <= 0) {
        throw new Error('Item quantity must be greater than zero.');
      }
      const product = this.data.products.find((p) => p.id === item.productId);
      if (!product) throw new Error(`Product not found: ${item.productId}`);
      if (product.isArchived) throw new Error(`Product "${product.name}" is archived and cannot be sold.`);

      // Check stock
      if (product.quantityOnHand < item.quantity && !this.data.settings.allowNegativeStock) {
        throw new Error(
          `Insufficient stock for "${product.name}". Available: ${product.quantityOnHand} ${product.unit}, Requested: ${item.quantity}.`
        );
      }

      const lineGross = Money.mul(product.sellingPrice, item.quantity);
      const lineDiscount = Math.min(lineGross, Math.max(0, Money.round(item.discount || 0)));
      subtotal = Money.add(subtotal, lineGross);
      itemDiscountsTotal = Money.add(itemDiscountsTotal, lineDiscount);

      return {
        item,
        product,
        lineGross,
        lineDiscount,
      };
    });

    const netBeforeCartDiscount = Math.max(0, Money.sub(subtotal, itemDiscountsTotal));
    const requestedCartDiscount = Math.max(0, Money.round(payload.cartDiscount || 0));
    const cartDiscount = Math.min(requestedCartDiscount, netBeforeCartDiscount);
    const totalDiscount = Money.add(itemDiscountsTotal, cartDiscount);

    // Distribute cart discount proportionately across line items
    const distributedCartDiscounts = Money.distributeDiscount(
      rawLineDetails.map((r) => ({ gross: Math.max(0, Money.sub(r.lineGross, r.lineDiscount)) })),
      cartDiscount
    );

    const saleItems: SaleItem[] = rawLineDetails.map((r, idx) => {
      const itemCartShare = distributedCartDiscounts[idx] || 0;
      const totalItemDiscount = Money.add(r.lineDiscount, itemCartShare);
      const lineTotal = Math.max(0, Money.sub(r.lineGross, totalItemDiscount));

      return {
        id: `sitem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}-${idx}`,
        saleId: '',
        productId: r.product.id,
        productName: r.product.name,
        sku: r.product.sku,
        unit: r.product.unit,
        unitPrice: r.product.sellingPrice,
        unitCost: r.product.purchaseCost,
        quantity: r.item.quantity,
        discount: totalItemDiscount,
        tax: 0,
        total: lineTotal,
        returnedQuantity: 0,
      };
    });

    // Tax calculation
    let taxTotal = 0;
    if (this.data.settings.taxEnabled && this.data.settings.taxRatePercent > 0) {
      const taxableAmount = Math.max(0, Money.sub(subtotal, totalDiscount));
      taxTotal = Money.tax(taxableAmount, this.data.settings.taxRatePercent);
    }

    const grandTotal = Money.round(Math.max(0, Money.add(Money.sub(subtotal, totalDiscount), taxTotal)));

    // Validate payments
    const totalPaymentProvided = payload.payments.reduce((acc, p) => Money.add(acc, Money.round(p.amount)), 0);
    if (totalPaymentProvided < grandTotal) {
      const hasCredit = payload.payments.some((p) => p.method === 'credit');
      if (!hasCredit) {
        throw new Error(
          `Payment amount (${this.data.settings.currencySymbol}${totalPaymentProvided.toFixed(2)}) is less than total due (${this.data.settings.currencySymbol}${grandTotal.toFixed(2)}).`
        );
      }
    }

    const primaryMethod = payload.payments[0]?.method || 'cash';
    let cashPaid = 0;
    let nonCashPaid = 0;
    let creditAmount = 0;

    payload.payments.forEach((p) => {
      const pAmt = Money.round(p.amount);
      if (p.method === 'cash') cashPaid = Money.add(cashPaid, pAmt);
      else if (p.method === 'credit') creditAmount = Money.add(creditAmount, pAmt);
      else nonCashPaid = Money.add(nonCashPaid, pAmt);
    });

    // Check customer credit limit
    if (creditAmount > 0) {
      if (!this.data.settings.creditSalesEnabled) {
        throw new Error('Credit sales are disabled in store settings.');
      }
      if (customer.id === 'walkin-cust') {
        throw new Error('Cannot issue store credit to Walk-in Customer. Please select or register an account.');
      }
      if (Money.add(customer.currentReceivable, creditAmount) > customer.creditLimit) {
        throw new Error(
          `Credit limit exceeded for ${customer.name}. Limit: ${this.data.settings.currencySymbol}${customer.creditLimit}, Current: ${this.data.settings.currencySymbol}${customer.currentReceivable}, Attempted: ${this.data.settings.currencySymbol}${creditAmount}.`
        );
      }
      customer.currentReceivable = Money.add(customer.currentReceivable, creditAmount);
      await StorageEngine.persistStore('customers');
    }

    const excessPaid = totalPaymentProvided > grandTotal ? Money.sub(totalPaymentProvided, grandTotal) : 0;
    const changeGiven = Math.min(cashPaid, excessPaid);
    const amountPaid = Math.min(grandTotal, totalPaymentProvided);

    const saleId = `sale-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    saleItems.forEach((si) => (si.saleId = saleId));

    const paymentRecords: PaymentRecord[] = payload.payments.map((p) => ({
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      method: p.method,
      amount: Money.round(p.amount),
      reference: p.reference,
      timestamp: now,
    }));

    const sale: Sale = {
      id: saleId,
      saleNumber,
      date: now,
      cashierId: this.currentUser.id,
      cashierName: this.currentUser.name,
      customerId: customer.id,
      customerName: customer.name,
      subtotal,
      discountTotal: totalDiscount,
      taxTotal,
      total: grandTotal,
      amountPaid,
      changeGiven,
      paymentStatus: creditAmount > 0 ? (amountPaid > 0 ? 'partial' : 'credit') : 'paid',
      primaryPaymentMethod: primaryMethod,
      status: 'completed',
      items: saleItems,
      payments: paymentRecords,
      createdAt: now,
    };

    // 2. ATOMIC INVENTORY DEDUCTION & AUDIT TRAIL
    for (const item of saleItems) {
      const product = this.data.products.find((p) => p.id === item.productId)!;
      product.quantityOnHand -= item.quantity;
      product.updatedAt = now;

      const movement: InventoryMovement = {
        id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        movementNumber: `MOV-${Date.now().toString().slice(-6)}`,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantityChange: -item.quantity,
        balanceAfter: product.quantityOnHand,
        movementType: 'sale',
        referenceId: sale.id,
        referenceNumber: sale.saleNumber,
        unitCost: item.unitCost,
        reason: `Sold at POS to ${customer.name} on ${sale.saleNumber}`,
        userId: this.currentUser.id,
        userName: this.currentUser.name,
        timestamp: now,
      };
      this.data.inventoryMovements.push(movement);
    }

    // 3. CASH MANAGEMENT RECORDING (PHYSICAL CASH ONLY)
    if (cashPaid > 0) {
      const netCashToDrawer = Money.sub(cashPaid, changeGiven);
      const activeSession = this.getActiveCashSession();
      if (activeSession) {
        activeSession.cashSales = Money.add(activeSession.cashSales, netCashToDrawer);
        activeSession.expectedCash = Money.add(activeSession.expectedCash, netCashToDrawer);
        const mov: CashMovement = {
          id: `cmov-${Date.now()}`,
          sessionId: activeSession.id,
          timestamp: now,
          type: 'sale',
          amount: netCashToDrawer,
          balanceAfter: activeSession.expectedCash,
          reason: `Cash Sale #${sale.saleNumber}`,
          referenceId: sale.id,
          performedBy: this.currentUser.name,
        };
        activeSession.movements.push(mov);
        await StorageEngine.persistStore('cashSessions');
      }
    }

    this.data.sales.push(sale);

    await StorageEngine.persistStore('sales');
    await StorageEngine.persistStore('products');
    await StorageEngine.persistStore('inventoryMovements');

    this.logAudit(
      'SALE_COMPLETED',
      'SALE',
      sale.id,
      `Sale ${sale.saleNumber} completed for ${this.data.settings.currencySymbol}${sale.total} (${sale.items.length} items)`
    );
    this.notify();
    return sale;
  }

  // Controlled Reversal of Sale
  async reverseSale(saleId: string, reason: string): Promise<Sale> {
    const sale = this.data.sales.find((s) => s.id === saleId);
    if (!sale) throw new Error('Sale not found.');
    if (sale.status === 'reversed') throw new Error('Sale has already been reversed.');
    if (sale.status === 'returned' || sale.status === 'partially_returned') {
      throw new Error('Sale has returns posted. Cannot reverse entire sale; process individual returns instead.');
    }

    const now = new Date().toISOString();
    sale.status = 'reversed';
    sale.reversalReason = reason;

    // Restore inventory
    for (const item of sale.items) {
      const product = this.data.products.find((p) => p.id === item.productId);
      if (product) {
        product.quantityOnHand += item.quantity;
        product.updatedAt = now;

        const mov: InventoryMovement = {
          id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          movementNumber: `MOV-${Date.now().toString().slice(-6)}`,
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantityChange: item.quantity,
          balanceAfter: product.quantityOnHand,
          movementType: 'sale_return',
          referenceId: sale.id,
          referenceNumber: `REV-${sale.saleNumber}`,
          unitCost: item.unitCost,
          reason: `Sale ${sale.saleNumber} reversed: ${reason}`,
          userId: this.currentUser.id,
          userName: this.currentUser.name,
          timestamp: now,
        };
        this.data.inventoryMovements.push(mov);
      }
    }

    // Reverse customer balance if credit sale
    const customer = this.data.customers.find((c) => c.id === sale.customerId);
    const creditPayment = sale.payments.find((p) => p.method === 'credit');
    if (customer && creditPayment) {
      customer.currentReceivable = Math.max(0, customer.currentReceivable - creditPayment.amount);
      await StorageEngine.persistStore('customers');
    }

    // Reverse cash from drawer if cash sale
    const cashPayment = sale.payments.find((p) => p.method === 'cash');
    if (cashPayment) {
      const activeSession = this.getActiveCashSession();
      if (activeSession) {
        const netCashTaken = Math.min(cashPayment.amount - sale.changeGiven, sale.total);
        activeSession.cashReturns += netCashTaken;
        activeSession.expectedCash -= netCashTaken;
        const mov: CashMovement = {
          id: `cmov-${Date.now()}`,
          sessionId: activeSession.id,
          timestamp: now,
          type: 'refund',
          amount: netCashTaken,
          balanceAfter: activeSession.expectedCash,
          reason: `Reversal of Sale #${sale.saleNumber}`,
          referenceId: sale.id,
          performedBy: this.currentUser.name,
        };
        activeSession.movements.push(mov);
        await StorageEngine.persistStore('cashSessions');
      }
    }

    await StorageEngine.persistStore('sales');
    await StorageEngine.persistStore('products');
    await StorageEngine.persistStore('inventoryMovements');

    this.logAudit('SALE_REVERSED', 'SALE', sale.id, `Sale ${sale.saleNumber} reversed. Reason: ${reason}`);
    this.notify();
    return sale;
  }

  // --- Scenario D: Returns and Refunds ---
  getReturns(): ReturnRecord[] {
    return [...this.data.returns].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async processReturn(payload: {
    originalSaleId: string;
    items: { saleItemId: string; quantity: number }[];
    refundMethod: PaymentMethod;
    disposition: 'restock' | 'quarantine' | 'discard';
    reason: string;
  }): Promise<ReturnRecord> {
    const sale = this.data.sales.find((s) => s.id === payload.originalSaleId);
    if (!sale) throw new Error('Original sale not found.');
    if (sale.status === 'reversed') throw new Error('Cannot return items from a reversed sale.');

    const returnNumber = `RET-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
    const now = new Date().toISOString();
    const returnItems: ReturnItem[] = [];
    let totalRefund = 0;

    for (const reqItem of payload.items) {
      if (reqItem.quantity <= 0) continue;
      const saleItem = sale.items.find((si) => si.id === reqItem.saleItemId);
      if (!saleItem) throw new Error(`Sale item ${reqItem.saleItemId} not found on original sale.`);

      const remainingReturnable = saleItem.quantity - saleItem.returnedQuantity;
      if (reqItem.quantity > remainingReturnable) {
        throw new Error(
          `Cannot return ${reqItem.quantity} units of ${saleItem.productName}. Remaining returnable: ${remainingReturnable}.`
        );
      }

      // Calculate unit refund after proportionate discounts
      let refundAmount: number;
      if (reqItem.quantity === remainingReturnable && saleItem.returnedQuantity === 0) {
        refundAmount = saleItem.total;
      } else {
        const effectiveUnitPrice = Money.div(saleItem.total, saleItem.quantity);
        refundAmount = Money.mul(effectiveUnitPrice, reqItem.quantity);
      }
      totalRefund = Money.add(totalRefund, refundAmount);

      // Update returned quantity on sale item
      saleItem.returnedQuantity = Money.round(saleItem.returnedQuantity + reqItem.quantity);

      // Check disposition: only update inventory if restocked!
      if (payload.disposition === 'restock') {
        const product = this.data.products.find((p) => p.id === saleItem.productId);
        if (product) {
          product.quantityOnHand = Money.round(product.quantityOnHand + reqItem.quantity);
          product.updatedAt = now;

          const mov: InventoryMovement = {
            id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            movementNumber: `MOV-${Date.now().toString().slice(-6)}`,
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            quantityChange: reqItem.quantity,
            balanceAfter: product.quantityOnHand,
            movementType: 'sale_return',
            referenceId: returnNumber,
            referenceNumber: returnNumber,
            unitCost: saleItem.unitCost,
            reason: `Customer return restocked: ${payload.reason}`,
            userId: this.currentUser.id,
            userName: this.currentUser.name,
            timestamp: now,
          };
          this.data.inventoryMovements.push(mov);
        }
      }

      returnItems.push({
        id: `ritem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        saleItemId: saleItem.id,
        productId: saleItem.productId,
        productName: saleItem.productName,
        sku: saleItem.sku,
        quantity: reqItem.quantity,
        unitPrice: saleItem.unitPrice,
        unitCost: saleItem.unitCost,
        refundAmount,
      });
    }

    if (returnItems.length === 0) {
      throw new Error('No items specified to return.');
    }

    // Update original sale status
    const allItemsReturned = sale.items.every((it) => it.returnedQuantity >= it.quantity);
    sale.status = allItemsReturned ? 'returned' : 'partially_returned';

    // Handle refund payout
    if (payload.refundMethod === 'cash') {
      const activeSession = this.getActiveCashSession();
      if (activeSession) {
        activeSession.cashReturns = Money.add(activeSession.cashReturns, totalRefund);
        activeSession.expectedCash = Money.sub(activeSession.expectedCash, totalRefund);
        const mov: CashMovement = {
          id: `cmov-${Date.now()}`,
          sessionId: activeSession.id,
          timestamp: now,
          type: 'refund',
          amount: totalRefund,
          balanceAfter: activeSession.expectedCash,
          reason: `Cash Refund Return #${returnNumber}`,
          referenceId: returnNumber,
          performedBy: this.currentUser.name,
        };
        activeSession.movements.push(mov);
        await StorageEngine.persistStore('cashSessions');
      }
    } else if (payload.refundMethod === 'credit') {
      const customer = this.data.customers.find((c) => c.id === sale.customerId);
      if (customer) {
        customer.currentReceivable = Math.max(0, Money.sub(customer.currentReceivable, totalRefund));
        await StorageEngine.persistStore('customers');
      }
    }

    const returnRecord: ReturnRecord = {
      id: `ret-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      returnNumber,
      originalSaleId: sale.id,
      originalSaleNumber: sale.saleNumber,
      customerId: sale.customerId,
      customerName: sale.customerName,
      date: now,
      totalRefund,
      refundMethod: payload.refundMethod,
      disposition: payload.disposition,
      reason: payload.reason,
      approvedBy: this.currentUser.name,
      items: returnItems,
      createdAt: now,
    };

    this.data.returns.push(returnRecord);

    await StorageEngine.persistStore('returns');
    await StorageEngine.persistStore('sales');
    await StorageEngine.persistStore('products');
    await StorageEngine.persistStore('inventoryMovements');

    this.logAudit(
      'RETURN_PROCESSED',
      'RETURN',
      returnRecord.id,
      `Processed return ${returnRecord.returnNumber} on ${sale.saleNumber} for ${this.data.settings.currencySymbol}${totalRefund} (Disposition: ${payload.disposition})`
    );
    this.notify();
    return returnRecord;
  }

  // --- Scenario E: Expenses ---
  getExpenses(): Expense[] {
    return [...this.data.expenses].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createExpense(payload: Omit<Expense, 'id' | 'expenseNumber' | 'createdBy' | 'createdAt'>): Promise<Expense> {
    if (payload.amount <= 0) throw new Error('Expense amount must be greater than zero.');
    if (!payload.description.trim()) throw new Error('Expense description is required.');

    const expenseNumber = `EXP-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
    const now = new Date().toISOString();

    const expense: Expense = {
      ...payload,
      id: `exp-${Date.now()}`,
      expenseNumber,
      description: payload.description.trim(),
      createdBy: this.currentUser.name,
      createdAt: now,
    };

    // If paid via cash, deduce from active cash drawer
    if (expense.status === 'paid' && expense.paymentMethod === 'cash') {
      const activeSession = this.getActiveCashSession();
      if (activeSession) {
        activeSession.cashExpenses = Money.add(activeSession.cashExpenses, expense.amount);
        activeSession.expectedCash = Money.sub(activeSession.expectedCash, expense.amount);
        const mov: CashMovement = {
          id: `cmov-${Date.now()}`,
          sessionId: activeSession.id,
          timestamp: now,
          type: 'expense',
          amount: expense.amount,
          balanceAfter: activeSession.expectedCash,
          reason: `Cash Expense #${expenseNumber}: ${expense.description}`,
          referenceId: expense.id,
          performedBy: this.currentUser.name,
        };
        activeSession.movements.push(mov);
        await StorageEngine.persistStore('cashSessions');
      }
    }

    this.data.expenses.push(expense);
    await StorageEngine.persistStore('expenses');

    this.logAudit(
      'EXPENSE_RECORDED',
      'EXPENSE',
      expense.id,
      `Recorded expense ${expenseNumber}: ${this.data.settings.currencySymbol}${expense.amount} (${expense.category})`
    );
    this.notify();
    return expense;
  }

  async cancelExpense(id: string, reason: string): Promise<Expense> {
    const expense = this.data.expenses.find((e) => e.id === id);
    if (!expense) throw new Error('Expense not found.');
    if (expense.status === 'cancelled') throw new Error('Expense is already cancelled.');

    expense.status = 'cancelled';
    expense.notes = (expense.notes ? expense.notes + ' | ' : '') + `Cancelled: ${reason}`;

    // If was paid via cash, reverse cash back to drawer
    if (expense.paymentMethod === 'cash') {
      const activeSession = this.getActiveCashSession();
      if (activeSession) {
        activeSession.cashExpenses = Math.max(0, Money.sub(activeSession.cashExpenses, expense.amount));
        activeSession.expectedCash = Money.add(activeSession.expectedCash, expense.amount);
        const mov: CashMovement = {
          id: `cmov-${Date.now()}`,
          sessionId: activeSession.id,
          timestamp: new Date().toISOString(),
          type: 'cash_in',
          amount: expense.amount,
          balanceAfter: activeSession.expectedCash,
          reason: `Expense cancellation reversal #${expense.expenseNumber}`,
          referenceId: expense.id,
          performedBy: this.currentUser.name,
        };
        activeSession.movements.push(mov);
        await StorageEngine.persistStore('cashSessions');
      }
    }

    await StorageEngine.persistStore('expenses');
    this.logAudit('EXPENSE_CANCELLED', 'EXPENSE', expense.id, `Cancelled expense ${expense.expenseNumber}: ${reason}`);
    this.notify();
    return expense;
  }

  // --- Scenario F: Cash Reconciliation & Sessions ---
  getCashSessions(): CashSession[] {
    return [...this.data.cashSessions].sort(
      (a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()
    );
  }

  getActiveCashSession(): CashSession | undefined {
    return this.data.cashSessions.find((s) => s.status === 'open');
  }

  async openCashSession(openingBalance: number): Promise<CashSession> {
    const active = this.getActiveCashSession();
    if (active) {
      throw new Error(`A cash drawer session (${active.sessionNumber}) is already currently open.`);
    }
    if (openingBalance < 0) throw new Error('Opening balance cannot be negative.');

    const sessionNumber = `CS-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();

    const session: CashSession = {
      id: `csess-${Date.now()}`,
      sessionNumber,
      openedAt: now,
      openedBy: this.currentUser.name,
      openingBalance,
      cashSales: 0,
      cashReturns: 0,
      cashExpenses: 0,
      cashIn: 0,
      cashOut: 0,
      expectedCash: openingBalance,
      status: 'open',
      movements: [
        {
          id: `cmov-${Date.now()}`,
          sessionId: `csess-${Date.now()}`,
          timestamp: now,
          type: 'opening',
          amount: openingBalance,
          balanceAfter: openingBalance,
          reason: 'Drawer opening float',
          performedBy: this.currentUser.name,
        },
      ],
    };

    this.data.cashSessions.unshift(session);
    await StorageEngine.persistStore('cashSessions');
    this.logAudit('CASH_SESSION_OPENED', 'CASH', session.id, `Opened cash drawer session with ${this.data.settings.currencySymbol}${openingBalance}`);
    this.notify();
    return session;
  }

  async recordManualCashMovement(
    type: 'cash_in' | 'cash_out',
    amount: number,
    reason: string
  ): Promise<CashMovement> {
    const session = this.getActiveCashSession();
    if (!session) throw new Error('No active cash drawer session is open.');
    if (amount <= 0) throw new Error('Amount must be greater than zero.');
    if (!reason.trim()) throw new Error('Reason is required.');

    const now = new Date().toISOString();
    if (type === 'cash_in') {
      session.cashIn = Money.add(session.cashIn, amount);
      session.expectedCash = Money.add(session.expectedCash, amount);
    } else {
      if (amount > session.expectedCash) {
        throw new Error(
          `Cannot withdraw ${this.data.settings.currencySymbol}${amount}. Expected cash balance is ${this.data.settings.currencySymbol}${session.expectedCash}.`
        );
      }
      session.cashOut = Money.add(session.cashOut, amount);
      session.expectedCash = Money.sub(session.expectedCash, amount);
    }

    const mov: CashMovement = {
      id: `cmov-${Date.now()}`,
      sessionId: session.id,
      timestamp: now,
      type,
      amount,
      balanceAfter: session.expectedCash,
      reason: reason.trim(),
      performedBy: this.currentUser.name,
    };
    session.movements.push(mov);

    await StorageEngine.persistStore('cashSessions');
    this.logAudit('CASH_MANUAL_MOVEMENT', 'CASH', session.id, `${type.toUpperCase()} of ${this.data.settings.currencySymbol}${amount}: ${reason}`);
    this.notify();
    return mov;
  }

  async closeCashSession(actualCashCounted: number, notes?: string): Promise<CashSession> {
    const session = this.getActiveCashSession();
    if (!session) throw new Error('No active cash session is currently open.');
    if (actualCashCounted < 0) throw new Error('Actual cash counted cannot be negative.');

    const now = new Date().toISOString();
    session.status = 'closed';
    session.closedAt = now;
    session.closedBy = this.currentUser.name;
    session.actualCash = Money.round(actualCashCounted);
    session.variance = Money.sub(actualCashCounted, session.expectedCash);
    session.notes = notes;

    const closeMov: CashMovement = {
      id: `cmov-${Date.now()}`,
      sessionId: session.id,
      timestamp: now,
      type: 'closing',
      amount: actualCashCounted,
      balanceAfter: 0,
      reason: `Cash drawer closed. Variance: ${session.variance}`,
      performedBy: this.currentUser.name,
    };
    session.movements.push(closeMov);

    await StorageEngine.persistStore('cashSessions');
    this.logAudit(
      'CASH_SESSION_CLOSED',
      'CASH',
      session.id,
      `Closed cash drawer session ${session.sessionNumber}. Expected: ${this.data.settings.currencySymbol}${session.expectedCash}, Counted: ${this.data.settings.currencySymbol}${actualCashCounted}, Variance: ${this.data.settings.currencySymbol}${session.variance}`
    );
    this.notify();
    return session;
  }

  // --- Users ---
  getUsers(): AppUser[] {
    return [...this.data.users];
  }

  async createUser(name: string, username: string, role: UserRole): Promise<AppUser> {
    if (!name.trim() || !username.trim()) throw new Error('Name and username are required.');
    const user: AppUser = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      username: username.trim().toLowerCase(),
      role,
      isActive: true,
    };
    this.data.users.push(user);
    await StorageEngine.persistStore('users');
    this.logAudit('CREATE_USER', 'USER', user.id, `Created staff account: ${user.name} (${user.role})`);
    this.notify();
    return user;
  }

  async updateUserRole(userId: string, role: UserRole, isActive: boolean): Promise<AppUser> {
    const user = this.data.users.find((u) => u.id === userId);
    if (!user) throw new Error('User not found.');
    user.role = role;
    user.isActive = isActive;
    await StorageEngine.persistStore('users');
    this.logAudit('UPDATE_USER', 'USER', user.id, `Updated user ${user.name} status and role to ${role}`);
    this.notify();
    return user;
  }

  // --- Financial & Metric Calculations ---
  getFinancialSummary(startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate).getTime() : 0;
    const end = endDate ? new Date(endDate).getTime() : Infinity;

    // Filter sales
    const completedSales = this.data.sales.filter((s) => {
      const t = new Date(s.createdAt).getTime();
      return t >= start && t <= end && s.status !== 'reversed';
    });

    const grossSales = Money.round(completedSales.reduce((acc, s) => Money.add(acc, s.subtotal), 0));
    const discounts = Money.round(completedSales.reduce((acc, s) => Money.add(acc, s.discountTotal), 0));

    // Returns
    const periodReturns = this.data.returns.filter((r) => {
      const t = new Date(r.createdAt).getTime();
      return t >= start && t <= end;
    });
    const returnsTotal = Money.round(periodReturns.reduce((acc, r) => Money.add(acc, r.totalRefund), 0));

    const netSales = Money.round(Math.max(0, Money.sub(Money.sub(grossSales, discounts), returnsTotal)));

    // COGS: cost of goods sold
    let totalCogs = 0;
    completedSales.forEach((s) => {
      s.items.forEach((item) => {
        // Net units retained = quantity - returnedQuantity
        const netQty = Money.round(item.quantity - item.returnedQuantity);
        if (netQty > 0) {
          totalCogs = Money.add(totalCogs, Money.mul(netQty, item.unitCost));
        }
      });
    });

    const grossProfit = Money.round(Money.sub(netSales, totalCogs));

    // Expenses
    const periodExpenses = this.data.expenses.filter((e) => {
      const t = new Date(e.createdAt).getTime();
      return t >= start && t <= end && e.status === 'paid';
    });
    const operatingExpenses = Money.round(periodExpenses.reduce((acc, e) => Money.add(acc, e.amount), 0));
    const netOperatingProfit = Money.round(Money.sub(grossProfit, operatingExpenses));

    // Inventory Valuation
    const activeProducts = this.getProducts();
    const inventoryValuation = Money.round(
      activeProducts.reduce(
        (acc, p) => Money.add(acc, Money.mul(Math.max(0, p.quantityOnHand), p.purchaseCost)),
        0
      )
    );
    const lowStockCount = activeProducts.filter((p) => p.quantityOnHand > 0 && p.quantityOnHand <= p.reorderLevel).length;
    const outOfStockCount = activeProducts.filter((p) => p.quantityOnHand <= 0).length;

    // Payables and Receivables
    const totalSupplierPayables = Money.round(this.getSuppliers().reduce((acc, s) => Money.add(acc, s.currentPayable), 0));
    const totalCustomerReceivables = Money.round(this.getCustomers().reduce((acc, c) => Money.add(acc, c.currentReceivable), 0));

    // Drawer Cash
    const activeSession = this.getActiveCashSession();
    const currentDrawerCash = activeSession ? Money.round(activeSession.expectedCash) : 0;

    return {
      grossSales,
      discounts,
      returnsTotal,
      netSales,
      cogs: totalCogs,
      grossProfit,
      operatingExpenses,
      netOperatingProfit,
      completedTransactionsCount: completedSales.length,
      averageSaleValue: completedSales.length > 0 ? Money.div(netSales, completedSales.length) : 0,
      inventoryValuation,
      lowStockCount,
      outOfStockCount,
      totalSupplierPayables,
      totalCustomerReceivables,
      currentDrawerCash,
      salesCount: completedSales.length,
    };
  }

  // --- Crash Recovery & Backup Engine ---
  saveCrashRecoverySnapshot(): void {
    StorageEngine.saveCrashRecoverySnapshot();
  }

  getCrashRecoverySnapshot(): {
    timestamp: string;
    recordCount: number;
    data: AppDatabaseSchema;
  } | null {
    return StorageEngine.getCrashRecoverySnapshot();
  }

  async restoreCrashRecoverySnapshot(): Promise<AppDatabaseSchema> {
    const restored = await StorageEngine.restoreCrashRecoverySnapshot();
    this.data = restored;
    this.logAudit('CRASH_RECOVERY', 'SYSTEM', 'RESTORE', 'Restored data state from emergency crash recovery snapshot');
    this.notify();
    return restored;
  }

  exportBackupJson(): string {
    return StorageEngine.exportBackupJson();
  }

  async importBackupJson(jsonString: string): Promise<AppDatabaseSchema> {
    const imported = await StorageEngine.importBackupJson(jsonString);
    this.data = imported;
    this.logAudit('IMPORT_BACKUP', 'SYSTEM', 'DATABASE', 'Imported full database backup archive');
    this.notify();
    return imported;
  }

  // --- Scalability & Stress Test: Bulk Catalog Generator (1,000 - 2,000 Items) ---
  async generateBulkGroceryCatalog(count: number = 1000): Promise<number> {
    const prefixes = [
      'Al-Karam', 'Shan', 'National', 'Nestle', 'Dalda', 'Habib', 'Mezan', 'Olpers', 
      'Dawn', 'English', 'Lipton', 'Tapal', 'Vital', 'Mitchells', 'Knorr', 'Kolson', 
      'LU', 'Super', 'Peak Freans', 'Surf Excel', 'Ariel', 'Dettol', 'Lifebuoy', 'Sufi'
    ];
    const items = [
      { name: 'Basmati Rice Premium Kernel', unit: 'kg' as UnitOfMeasure, baseCost: 320, catIndex: 0 },
      { name: 'Sella Rice Golden Super', unit: 'kg' as UnitOfMeasure, baseCost: 290, catIndex: 0 },
      { name: 'Fine Chakki Wheat Atta', unit: 'kg' as UnitOfMeasure, baseCost: 140, catIndex: 1 },
      { name: 'Whole Wheat Flour', unit: 'pack' as UnitOfMeasure, baseCost: 650, catIndex: 1 },
      { name: 'Cooking Oil Pure Canola', unit: 'bottle' as UnitOfMeasure, baseCost: 520, catIndex: 5 },
      { name: 'Banaspati Ghee Pouch', unit: 'pack' as UnitOfMeasure, baseCost: 490, catIndex: 5 },
      { name: 'Pure Cow Milk UHT 1L', unit: 'pack' as UnitOfMeasure, baseCost: 280, catIndex: 2 },
      { name: 'Full Cream Yogurt Sweet', unit: 'box' as UnitOfMeasure, baseCost: 160, catIndex: 2 },
      { name: 'Black Danedar Tea Leaf', unit: 'pack' as UnitOfMeasure, baseCost: 580, catIndex: 3 },
      { name: 'Green Tea Bags Mint', unit: 'box' as UnitOfMeasure, baseCost: 220, catIndex: 3 },
      { name: 'Biryani Special Recipe Mix', unit: 'box' as UnitOfMeasure, baseCost: 110, catIndex: 6 },
      { name: 'Korma Masala Powder Pack', unit: 'box' as UnitOfMeasure, baseCost: 105, catIndex: 6 },
      { name: 'Refined Table Salt Iodized', unit: 'pack' as UnitOfMeasure, baseCost: 45, catIndex: 6 },
      { name: 'Red Chilli Powder Special', unit: 'pack' as UnitOfMeasure, baseCost: 180, catIndex: 6 },
      { name: 'Daal Chana Washed Special', unit: 'kg' as UnitOfMeasure, baseCost: 260, catIndex: 7 },
      { name: 'Daal Moong Yellow Whole', unit: 'kg' as UnitOfMeasure, baseCost: 280, catIndex: 7 },
      { name: 'Daal Masoor Red Polished', unit: 'kg' as UnitOfMeasure, baseCost: 270, catIndex: 7 },
      { name: 'Crispy Potato Chips Masala', unit: 'pack' as UnitOfMeasure, baseCost: 50, catIndex: 4 },
      { name: 'Egg Biscuits Family Pack', unit: 'pack' as UnitOfMeasure, baseCost: 90, catIndex: 4 },
      { name: 'Chocolate Cream Sandwich', unit: 'pack' as UnitOfMeasure, baseCost: 40, catIndex: 4 },
      { name: 'Antibacterial Soap Bar', unit: 'pcs' as UnitOfMeasure, baseCost: 85, catIndex: 9 },
      { name: 'Washing Powder Active Foam', unit: 'pack' as UnitOfMeasure, baseCost: 380, catIndex: 8 },
      { name: 'Dishwash Liquid Lemon', unit: 'bottle' as UnitOfMeasure, baseCost: 195, catIndex: 8 },
      { name: 'Farm Fresh Brown Eggs Tray', unit: 'box' as UnitOfMeasure, baseCost: 360, catIndex: 10 },
      { name: 'Sandwich Bread Plain Large', unit: 'pcs' as UnitOfMeasure, baseCost: 130, catIndex: 10 },
      { name: 'Mixed Fruit Jam Jar', unit: 'bottle' as UnitOfMeasure, baseCost: 240, catIndex: 10 },
    ];

    const categories = this.getCategories();
    const suppliers = this.getSuppliers();
    const now = new Date().toISOString();
    let generatedCount = 0;

    const startNum = this.data.products.length + 1;
    for (let i = 0; i < count; i++) {
      const idx = (startNum + i) % items.length;
      const base = items[idx];
      const brand = prefixes[(startNum + i) % prefixes.length];
      const cat = categories[base.catIndex % categories.length] || categories[0];
      const supplier = suppliers[(startNum + i) % suppliers.length] || suppliers[0];

      const variantNumber = Math.floor((startNum + i) / items.length) + 1;
      const productName = variantNumber > 1 
        ? `${brand} ${base.name} #${variantNumber}`
        : `${brand} ${base.name}`;

      const sku = `SKU-${10000 + startNum + i}`;
      const barcode = `890${String(100000000 + startNum + i).slice(-9)}`;
      const costVariance = 1 + ((i % 15) - 7) * 0.02;
      const purchaseCost = Math.round(base.baseCost * costVariance * 100) / 100;
      const sellingPrice = Math.round(purchaseCost * 1.25 * 100) / 100;
      const quantityOnHand = 15 + ((i * 7) % 120);

      const newProduct: Product = {
        id: `prod-bulk-${Date.now()}-${i}`,
        name: productName,
        sku,
        barcode,
        categoryId: cat ? cat.id : 'cat-1',
        brand,
        purchaseCost,
        sellingPrice,
        unit: base.unit,
        quantityOnHand,
        reorderLevel: 10,
        preferredSupplierId: supplier ? supplier.id : undefined,
        expiryTracking: false,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      };

      this.data.products.push(newProduct);
      generatedCount++;
    }

    await StorageEngine.persistStore('products');
    this.logAudit('BULK_CATALOG_GENERATION', 'PRODUCT', 'BULK', `Generated ${generatedCount} grocery items into store catalog`);
    this.notify();
    return generatedCount;
  }
}

export const db = new DatabaseService();
