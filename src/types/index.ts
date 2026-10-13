export type UnitOfMeasure = 'pcs' | 'pack' | 'box' | 'bottle' | 'kg' | 'g' | 'l' | 'ml';

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  categoryId: string;
  brand?: string;
  purchaseCost: number;
  sellingPrice: number;
  unit: UnitOfMeasure;
  quantityOnHand: number;
  reorderLevel: number;
  preferredSupplierId?: string;
  expiryTracking: boolean;
  expiryDate?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  isArchived: boolean;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  taxNumber?: string;
  openingBalance: number;
  currentPayable: number;
  notes?: string;
  isArchived: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  notes?: string;
  openingBalance: number;
  creditLimit: number;
  currentReceivable: number;
  isArchived: boolean;
  createdAt: string;
}

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'mobile_wallet' | 'credit';

export interface PaymentRecord {
  id: string;
  method: PaymentMethod;
  amount: number;
  reference?: string;
  timestamp: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  sku: string;
  unit: UnitOfMeasure;
  unitPrice: number;
  unitCost: number;
  quantity: number;
  discount: number;
  tax: number;
  total: number;
  returnedQuantity: number;
}

export interface Sale {
  id: string;
  saleNumber: string;
  date: string;
  cashierId: string;
  cashierName: string;
  customerId: string;
  customerName: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  amountPaid: number;
  changeGiven: number;
  paymentStatus: 'paid' | 'partial' | 'credit';
  primaryPaymentMethod: PaymentMethod;
  status: 'completed' | 'reversed' | 'partially_returned' | 'returned';
  reversalReason?: string;
  items: SaleItem[];
  payments: PaymentRecord[];
  createdAt: string;
}

export type PurchaseStatus = 'draft' | 'ordered' | 'partially_received' | 'received' | 'cancelled';

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  productName: string;
  sku: string;
  unit: UnitOfMeasure;
  unitCost: number;
  quantityOrdered: number;
  quantityReceived: number;
  discount: number;
  total: number;
  totalCost?: number;
}

export interface GoodsReceiptItem {
  productId: string;
  productName: string;
  quantityReceived: number;
  unitCost: number;
}

export interface GoodsReceipt {
  id: string;
  receiptNumber: string;
  purchaseId: string;
  date: string;
  receivedBy: string;
  notes?: string;
  items: GoodsReceiptItem[];
}

export interface PurchasePayment {
  id: string;
  purchaseId: string;
  supplierId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  reference?: string;
  notes?: string;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  supplierInvoiceNo: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  notes?: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  additionalCharges: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  status: PurchaseStatus;
  items: PurchaseItem[];
  receipts: GoodsReceipt[];
  payments: PurchasePayment[];
  createdAt: string;
}

export type InventoryMovementType =
  | 'opening_stock'
  | 'sale'
  | 'sale_return'
  | 'purchase_receive'
  | 'purchase_return'
  | 'manual_adjustment'
  | 'damaged'
  | 'expired';

export interface InventoryMovement {
  id: string;
  movementNumber: string;
  productId: string;
  productName: string;
  sku: string;
  quantityChange: number; // positive or negative
  balanceAfter: number;
  movementType: InventoryMovementType;
  referenceId: string;
  referenceNumber: string;
  unitCost: number;
  reason: string;
  userId: string;
  userName: string;
  timestamp: string;
}

export type StockAdjustmentType =
  | 'opening_stock'
  | 'stock_increase'
  | 'stock_decrease'
  | 'damaged'
  | 'expired'
  | 'physical_count_correction'
  | 'internal_use';

export interface StockAdjustment {
  id: string;
  adjustmentNumber: string;
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  adjustmentQuantity: number;
  finalStock: number;
  adjustmentType: StockAdjustmentType;
  reason: string;
  notes?: string;
  userId: string;
  userName: string;
  isReversed: boolean;
  createdAt: string;
}

export interface ReturnItem {
  id: string;
  saleItemId: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  refundAmount: number;
}

export interface ReturnRecord {
  id: string;
  returnNumber: string;
  originalSaleId: string;
  originalSaleNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  totalRefund: number;
  refundMethod: PaymentMethod;
  disposition: 'restock' | 'quarantine' | 'discard';
  reason: string;
  approvedBy: string;
  items: ReturnItem[];
  createdAt: string;
}

export type ExpenseCategory =
  | 'electricity'
  | 'rent'
  | 'staff_costs'
  | 'transport'
  | 'packaging'
  | 'cleaning'
  | 'maintenance'
  | 'miscellaneous';

export interface Expense {
  id: string;
  expenseNumber: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod: 'cash' | 'bank_transfer';
  payee?: string;
  referenceNumber?: string;
  notes?: string;
  status: 'paid' | 'draft' | 'cancelled';
  createdBy: string;
  createdAt: string;
}

export interface CashMovement {
  id: string;
  sessionId: string;
  timestamp: string;
  type: 'opening' | 'sale' | 'refund' | 'expense' | 'cash_in' | 'cash_out' | 'closing';
  amount: number;
  balanceAfter: number;
  reason: string;
  referenceId?: string;
  performedBy: string;
}

export interface CashSession {
  id: string;
  sessionNumber: string;
  openedAt: string;
  closedAt?: string;
  openedBy: string;
  closedBy?: string;
  openingBalance: number;
  cashSales: number;
  cashReturns: number;
  cashExpenses: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number;
  actualCash?: number;
  variance?: number;
  notes?: string;
  status: 'open' | 'closed';
  movements: CashMovement[];
}

export type UserRole = 'owner_admin' | 'manager' | 'cashier' | 'inventory_staff';

export interface AppUser {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  pinHash?: string;
  salt?: string;
  pin?: string;
}

export interface Settings {
  businessName: string;
  logoUrl?: string;
  address: string;
  phone: string;
  email: string;
  taxNumber?: string;
  currencySymbol: string;
  currencyCode: string;
  decimalPrecision: number;
  taxEnabled: boolean;
  taxRatePercent: number;
  taxInclusive: boolean;
  defaultPaymentMethod: PaymentMethod;
  allowNegativeStock: boolean;
  maxDiscountPercent: number;
  creditSalesEnabled: boolean;
  defaultReorderLevel: number;
  costingPolicy: 'weighted_average' | 'fifo' | 'last_cost';
  receiptHeader: string;
  receiptFooter: string;
  receiptLayout: 'a4' | 'thermal_80mm';
  theme: 'light' | 'dark';
  dateFormat: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export type NavigationPage =
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'categories'
  | 'inventory'
  | 'stock_adjustments'
  | 'purchases'
  | 'suppliers'
  | 'customers'
  | 'sales_history'
  | 'returns'
  | 'expenses'
  | 'cash_management'
  | 'reports'
  | 'pdf_documents'
  | 'users'
  | 'settings'
  | 'audit_log'
  | 'test_center'
  | 'desktop_installers';
