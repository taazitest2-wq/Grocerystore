import React from 'react';
import {
  FileText,
  Download,
  Receipt,
  Truck,
  PackageCheck,
  Users,
  Building2,
  Wallet,
  SlidersHorizontal,
  Boxes,
  RotateCcw,
  Coins,
  Calendar,
} from 'lucide-react';
import { db } from '../../db/db';
import { PdfService } from '../../services/pdfService';

export const PDFDocumentsModule: React.FC = () => {
  const settings = db.getSettings();
  const sales = db.getSales();
  const purchases = db.getPurchases();
  const suppliers = db.getSuppliers();
  const customers = db.getCustomers();
  const expenses = db.getExpenses();
  const adjustments = db.getStockAdjustments();
  const returns = db.getReturns();
  const products = db.getProducts();
  const activeSession = db.getActiveCashSession() || db.getCashSessions()[0];

  const sampleSale = sales[0];
  const samplePurchase = purchases[0];
  const sampleCustomer = customers.find((c) => c.id !== 'walkin-cust') || customers[0];
  const sampleSupplier = suppliers[0];
  const sampleExpense = expenses[0];
  const sampleAdjustment = adjustments[0];
  const sampleReturn = returns[0];
  const sampleGrn = samplePurchase?.receipts[0];

  const docTypes = [
    {
      title: 'Sales Receipt / Invoice (A4 Page)',
      desc: 'Itemized standard full-page customer invoice with VAT/tax breakdown and store headers.',
      icon: FileText,
      badge: 'Sales',
      action: () => {
        if (!sampleSale) alert('No completed sales found. Complete a sale in POS first.');
        else PdfService.generateSalesReceipt(sampleSale, settings, 'a4');
      },
      available: !!sampleSale,
    },
    {
      title: 'Point of Sale Receipt (Thermal 80mm)',
      desc: 'Compact narrow roll receipt designed for POS receipt printer roll layouts.',
      icon: Receipt,
      badge: 'Sales',
      action: () => {
        if (!sampleSale) alert('No completed sales found. Complete a sale in POS first.');
        else PdfService.generateSalesReceipt(sampleSale, settings, 'thermal_80mm');
      },
      available: !!sampleSale,
    },
    {
      title: 'Purchase Order (PO)',
      desc: 'Official procurement document sent to suppliers with itemized order quantities.',
      icon: Truck,
      badge: 'Purchasing',
      action: () => {
        if (!samplePurchase) alert('No purchase orders found. Create a PO first.');
        else PdfService.generatePurchaseOrder(samplePurchase, settings);
      },
      available: !!samplePurchase,
    },
    {
      title: 'Goods Received Note (GRN)',
      desc: 'Warehouse receiving slip confirming exact verified delivered counts.',
      icon: PackageCheck,
      badge: 'Warehouse',
      action: () => {
        if (!sampleGrn || !samplePurchase) alert('No goods received notes found yet. Receive delivery on a PO first.');
        else PdfService.generateGoodsReceivedNote(sampleGrn, samplePurchase, settings);
      },
      available: !!sampleGrn,
    },
    {
      title: 'Customer Account Statement',
      desc: 'Periodic ledger statement for neighborhood customer credit accounts.',
      icon: Users,
      badge: 'CRM',
      action: () => {
        if (!sampleCustomer) alert('No customer record found.');
        else PdfService.generateCustomerStatement(sampleCustomer, sales, settings);
      },
      available: !!sampleCustomer,
    },
    {
      title: 'Supplier Account Statement',
      desc: 'Payables ledger statement showing purchase invoices, payments, and balance due.',
      icon: Building2,
      badge: 'Procurement',
      action: () => {
        if (!sampleSupplier) alert('No supplier record found.');
        else PdfService.generateSupplierStatement(sampleSupplier, purchases, settings);
      },
      available: !!sampleSupplier,
    },
    {
      title: 'Petty Cash & Expense Voucher',
      desc: 'Official voucher for utility, transport, rent, or staff wage payments.',
      icon: Wallet,
      badge: 'Finance',
      action: () => {
        if (!sampleExpense) alert('No expenses recorded. Create an expense voucher first.');
        else PdfService.generateExpenseVoucher(sampleExpense, settings);
      },
      available: !!sampleExpense,
    },
    {
      title: 'Stock Adjustment & Audit Report',
      desc: 'Formal record documenting damaged goods, write-offs, or physical inventory audit counts.',
      icon: SlidersHorizontal,
      badge: 'Inventory',
      action: () => {
        if (!sampleAdjustment) alert('No stock adjustments recorded. Perform an adjustment first.');
        else PdfService.generateStockAdjustmentReport(sampleAdjustment, settings);
      },
      available: !!sampleAdjustment,
    },
    {
      title: 'Inventory Stock Valuation Report',
      desc: 'Comprehensive stock catalog with units on hand and cost valuation totals.',
      icon: Boxes,
      badge: 'Inventory',
      action: () => PdfService.generateInventoryReport(products, settings),
      available: products.length > 0,
    },
    {
      title: 'Daily Sales Performance Report',
      desc: 'Management end-of-day sales register summary with totals and cashier audit.',
      icon: Calendar,
      badge: 'Reporting',
      action: () =>
        PdfService.generateDailySalesReport(
          new Date().toISOString().slice(0, 10),
          sales,
          settings
        ),
      available: true,
    },
    {
      title: 'Cash Drawer Shift Reconciliation',
      desc: 'Shift closing report showing cash float, sales, expenses, and physical cash variance.',
      icon: Coins,
      badge: 'Finance',
      action: () => {
        if (!activeSession) alert('No cash session recorded.');
        else PdfService.generateCashReconciliationReport(activeSession, settings);
      },
      available: !!activeSession,
    },
    {
      title: 'Customer Return & Refund Voucher',
      desc: 'Official refund slip referencing original sale invoice and return disposition.',
      icon: RotateCcw,
      badge: 'Returns',
      action: () => {
        if (!sampleReturn) alert('No return records found. Process a return first.');
        else PdfService.generateReturnReceipt(sampleReturn, settings);
      },
      available: !!sampleReturn,
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-600" />
          PDF Document Hub & Document Generator
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Generate and download authentic, print-ready PDF documents generated locally from active database records.
        </p>
      </div>

      {/* Grid of PDF Documents */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {docTypes.map((doc, idx) => {
          const Icon = doc.icon;
          return (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                    <Icon className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {doc.badge}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                  {doc.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {doc.desc}
                </p>
              </div>

              <button
                onClick={doc.action}
                disabled={!doc.available}
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Download Sample PDF</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
