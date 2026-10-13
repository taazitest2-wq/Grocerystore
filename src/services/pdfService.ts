import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Sale,
  Purchase,
  GoodsReceipt,
  Customer,
  Supplier,
  Expense,
  StockAdjustment,
  CashSession,
  ReturnRecord,
  Settings,
  Product,
} from '../types';

export const PdfService = {
  // 1. Sales Receipt (A4 or Thermal 80mm)
  generateSalesReceipt(sale: Sale, settings: Settings, layout: 'a4' | 'thermal_80mm' = 'a4') {
    if (layout === 'thermal_80mm') {
      const doc = new jsPDF({
        unit: 'mm',
        format: [80, 220 + sale.items.length * 10],
      });

      let y = 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(settings.businessName, 40, y, { align: 'center' });

      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      if (settings.address) {
        doc.text(settings.address, 40, y, { align: 'center' });
        y += 4;
      }
      if (settings.phone) {
        doc.text(`Tel: ${settings.phone}`, 40, y, { align: 'center' });
        y += 4;
      }

      doc.setLineDashPattern([1, 1], 0);
      doc.line(5, y, 75, y);
      y += 5;

      doc.text(`Receipt #: ${sale.saleNumber}`, 5, y);
      y += 4;
      doc.text(`Date: ${new Date(sale.createdAt).toLocaleString()}`, 5, y);
      y += 4;
      doc.text(`Customer: ${sale.customerName}`, 5, y);
      y += 4;
      doc.text(`Cashier: ${sale.cashierName}`, 5, y);
      y += 4;

      doc.line(5, y, 75, y);
      y += 4;

      // Items table
      autoTable(doc, {
        startY: y,
        head: [['Item', 'Qty', 'Price', 'Total']],
        body: sale.items.map((it) => [
          it.productName,
          `${it.quantity} ${it.unit}`,
          `${it.unitPrice}`,
          `${it.total}`,
        ]),
        theme: 'plain',
        styles: { fontSize: 7, cellPadding: 1 },
        headStyles: { fontStyle: 'bold', fillColor: [240, 240, 240] },
        margin: { left: 5, right: 5 },
      });

      // @ts-expect-error autoTable adds lastAutoTable to doc
      y = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 4 : y + 30;

      doc.line(5, y, 75, y);
      y += 5;

      doc.setFontSize(8);
      doc.text(`Subtotal:`, 40, y, { align: 'right' });
      doc.text(`${settings.currencySymbol} ${sale.subtotal.toFixed(2)}`, 75, y, { align: 'right' });
      y += 4;

      if (sale.discountTotal > 0) {
        doc.text(`Discount:`, 40, y, { align: 'right' });
        doc.text(`- ${settings.currencySymbol} ${sale.discountTotal.toFixed(2)}`, 75, y, { align: 'right' });
        y += 4;
      }

      if (sale.taxTotal > 0) {
        doc.text(`Tax:`, 40, y, { align: 'right' });
        doc.text(`${settings.currencySymbol} ${sale.taxTotal.toFixed(2)}`, 75, y, { align: 'right' });
        y += 4;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`TOTAL:`, 40, y, { align: 'right' });
      doc.text(`${settings.currencySymbol} ${sale.total.toFixed(2)}`, 75, y, { align: 'right' });
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Paid: ${settings.currencySymbol} ${sale.amountPaid.toFixed(2)}`, 75, y, { align: 'right' });
      y += 4;
      if (sale.changeGiven > 0) {
        doc.text(`Change: ${settings.currencySymbol} ${sale.changeGiven.toFixed(2)}`, 75, y, { align: 'right' });
        y += 4;
      }

      y += 4;
      doc.setFontSize(7);
      doc.text(settings.receiptFooter || 'Thank you for your visit!', 40, y, { align: 'center' });

      doc.save(`Receipt-${sale.saleNumber}.pdf`);
      return;
    }

    // A4 Format
    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 20;

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text(settings.businessName, 14, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    y += 6;
    if (settings.address) {
      doc.text(settings.address, 14, y);
      y += 5;
    }
    if (settings.phone || settings.email) {
      doc.text(`Phone: ${settings.phone} | Email: ${settings.email}`, 14, y);
      y += 5;
    }
    if (settings.taxNumber) {
      doc.text(settings.taxNumber, 14, y);
      y += 5;
    }

    // Invoice badge
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text('SALES INVOICE / RECEIPT', 196, 20, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Invoice #: ${sale.saleNumber}`, 196, 26, { align: 'right' });
    doc.text(`Date: ${new Date(sale.createdAt).toLocaleDateString()}`, 196, 31, { align: 'right' });
    doc.text(`Status: ${sale.status.toUpperCase()}`, 196, 36, { align: 'right' });

    y = Math.max(y + 8, 45);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, y, 196, y);
    y += 8;

    // Bill To
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text('Customer Information:', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(sale.customerName, 14, y + 5);
    doc.text(`Cashier: ${sale.cashierName}`, 14, y + 10);
    doc.text(`Payment: ${sale.primaryPaymentMethod.toUpperCase()} (${sale.paymentStatus.toUpperCase()})`, 14, y + 15);

    y += 22;

    // Items table
    autoTable(doc, {
      startY: y,
      head: [['#', 'Item Description', 'SKU', 'Qty', 'Unit Price', 'Disc.', 'Total']],
      body: sale.items.map((it, idx) => [
        idx + 1,
        it.productName,
        it.sku,
        `${it.quantity} ${it.unit}`,
        `${settings.currencySymbol} ${it.unitPrice.toFixed(2)}`,
        it.discount > 0 ? `${settings.currencySymbol} ${it.discount.toFixed(2)}` : '-',
        `${settings.currencySymbol} ${it.total.toFixed(2)}`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 10 },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right', fontStyle: 'bold' },
      },
    });

    // @ts-expect-error autoTable adds lastAutoTable to doc
    y = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 8 : y + 40;

    // Financial totals summary
    const rightMargin = 196;
    doc.setFontSize(9);
    doc.text('Subtotal:', 140, y);
    doc.text(`${settings.currencySymbol} ${sale.subtotal.toFixed(2)}`, rightMargin, y, { align: 'right' });
    y += 6;

    if (sale.discountTotal > 0) {
      doc.text('Discount:', 140, y);
      doc.text(`- ${settings.currencySymbol} ${sale.discountTotal.toFixed(2)}`, rightMargin, y, { align: 'right' });
      y += 6;
    }

    if (sale.taxTotal > 0) {
      doc.text('Sales Tax:', 140, y);
      doc.text(`${settings.currencySymbol} ${sale.taxTotal.toFixed(2)}`, rightMargin, y, { align: 'right' });
      y += 6;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Grand Total:', 140, y);
    doc.text(`${settings.currencySymbol} ${sale.total.toFixed(2)}`, rightMargin, y, { align: 'right' });
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Amount Received:', 140, y);
    doc.text(`${settings.currencySymbol} ${sale.amountPaid.toFixed(2)}`, rightMargin, y, { align: 'right' });
    y += 5;

    if (sale.changeGiven > 0) {
      doc.text('Change Returned:', 140, y);
      doc.text(`${settings.currencySymbol} ${sale.changeGiven.toFixed(2)}`, rightMargin, y, { align: 'right' });
      y += 5;
    }

    // Footer note
    y = Math.max(y + 15, 260);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, y, 196, y);
    y += 6;
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(settings.receiptFooter || 'Thank you for your business.', 105, y, { align: 'center' });

    doc.save(`SalesInvoice-${sale.saleNumber}.pdf`);
  },

  // 2. Purchase Order PDF
  generatePurchaseOrder(purchase: Purchase, settings: Settings) {
    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text(settings.businessName, 14, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    y += 6;
    doc.text(settings.address || 'Retail Grocery Store', 14, y);
    y += 5;
    doc.text(`Phone: ${settings.phone} | Email: ${settings.email}`, 14, y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text('PURCHASE ORDER', 196, 20, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`PO Number: ${purchase.purchaseNumber}`, 196, 26, { align: 'right' });
    doc.text(`Order Date: ${new Date(purchase.orderDate).toLocaleDateString()}`, 196, 31, { align: 'right' });
    doc.text(`Status: ${purchase.status.toUpperCase()}`, 196, 36, { align: 'right' });

    y = 48;
    doc.setDrawColor(226, 232, 240);
    doc.line(14, y, 196, y);
    y += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Vendor / Supplier Details:', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(purchase.supplierName, 14, y + 5);
    doc.text(`Supplier Ref / Invoice: ${purchase.supplierInvoiceNo}`, 14, y + 10);

    y += 18;

    autoTable(doc, {
      startY: y,
      head: [['#', 'Item', 'SKU', 'Ordered', 'Received', 'Unit Cost', 'Total']],
      body: purchase.items.map((it, idx) => [
        idx + 1,
        it.productName,
        it.sku,
        `${it.quantityOrdered} ${it.unit}`,
        `${it.quantityReceived} ${it.unit}`,
        `${settings.currencySymbol} ${it.unitCost.toFixed(2)}`,
        `${settings.currencySymbol} ${it.total.toFixed(2)}`,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
    });

    // @ts-expect-error autoTable adds lastAutoTable to doc
    y = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : y + 50;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Total PO Amount: ${settings.currencySymbol} ${purchase.total.toFixed(2)}`, 196, y, { align: 'right' });
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Amount Paid: ${settings.currencySymbol} ${purchase.amountPaid.toFixed(2)}`, 196, y, { align: 'right' });
    y += 5;
    doc.text(`Outstanding Balance Due: ${settings.currencySymbol} ${purchase.balanceDue.toFixed(2)}`, 196, y, { align: 'right' });

    doc.save(`PO-${purchase.purchaseNumber}.pdf`);
  },

  // 3. Goods Received Note (GRN)
  generateGoodsReceivedNote(grn: GoodsReceipt, purchase: Purchase, settings: Settings) {
    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(settings.businessName, 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('GOODS RECEIVED NOTE (GRN) — WAREHOUSE RECEIVING', 14, y);

    doc.text(`GRN Number: ${grn.receiptNumber}`, 196, 20, { align: 'right' });
    doc.text(`Date Received: ${new Date(grn.date).toLocaleString()}`, 196, 26, { align: 'right' });
    doc.text(`Linked PO: ${purchase.purchaseNumber}`, 196, 31, { align: 'right' });
    doc.text(`Received By: ${grn.receivedBy}`, 196, 36, { align: 'right' });

    y = 48;
    doc.line(14, y, 196, y);
    y += 8;

    doc.setFont('helvetica', 'bold');
    doc.text(`Supplier: ${purchase.supplierName}`, 14, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [['#', 'Product Name', 'Quantity Received', 'Unit Cost', 'Subtotal Value']],
      body: grn.items.map((it, idx) => [
        idx + 1,
        it.productName,
        it.quantityReceived,
        `${settings.currencySymbol} ${it.unitCost.toFixed(2)}`,
        `${settings.currencySymbol} ${(it.quantityReceived * it.unitCost).toFixed(2)}`,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
    });

    // @ts-expect-error autoTable adds lastAutoTable to doc
    y = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : y + 40;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text(`Receiver Signature: _________________________`, 14, y);
    doc.text(`Store Manager Signature: _________________________`, 110, y);

    doc.save(`GRN-${grn.receiptNumber}.pdf`);
  },

  // 4. Customer Statement PDF
  generateCustomerStatement(customer: Customer, sales: Sale[], settings: Settings) {
    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(settings.businessName, 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('CUSTOMER ACCOUNT STATEMENT', 14, y);

    doc.text(`Customer: ${customer.name}`, 14, y + 8);
    doc.text(`Phone: ${customer.phone}`, 14, y + 13);
    doc.text(`Credit Limit: ${settings.currencySymbol} ${customer.creditLimit.toFixed(2)}`, 196, y + 8, { align: 'right' });
    doc.text(`Current Outstanding Due: ${settings.currencySymbol} ${customer.currentReceivable.toFixed(2)}`, 196, y + 13, { align: 'right' });

    y += 24;

    const customerSales = sales.filter((s) => s.customerId === customer.id);

    autoTable(doc, {
      startY: y,
      head: [['Date', 'Invoice #', 'Total Amount', 'Amount Paid', 'Status', 'Payment Method']],
      body: customerSales.map((s) => [
        new Date(s.createdAt).toLocaleDateString(),
        s.saleNumber,
        `${settings.currencySymbol} ${s.total.toFixed(2)}`,
        `${settings.currencySymbol} ${s.amountPaid.toFixed(2)}`,
        s.paymentStatus.toUpperCase(),
        s.primaryPaymentMethod.toUpperCase(),
      ]),
      theme: 'striped',
    });

    doc.save(`CustomerStatement-${customer.name.replace(/\s+/g, '_')}.pdf`);
  },

  // 5. Supplier Statement PDF
  generateSupplierStatement(supplier: Supplier, purchases: Purchase[], settings: Settings) {
    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(settings.businessName, 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('SUPPLIER ACCOUNT STATEMENT', 14, y);

    doc.text(`Supplier: ${supplier.name}`, 14, y + 8);
    doc.text(`Contact: ${supplier.contactPerson} (${supplier.phone})`, 14, y + 13);
    doc.text(`Current Payable Balance: ${settings.currencySymbol} ${supplier.currentPayable.toFixed(2)}`, 196, y + 8, { align: 'right' });

    y += 24;

    const supPurchases = purchases.filter((p) => p.supplierId === supplier.id);

    autoTable(doc, {
      startY: y,
      head: [['PO #', 'Date', 'Supplier Ref', 'Total Amount', 'Paid', 'Balance Due', 'Status']],
      body: supPurchases.map((p) => [
        p.purchaseNumber,
        new Date(p.orderDate).toLocaleDateString(),
        p.supplierInvoiceNo,
        `${settings.currencySymbol} ${p.total.toFixed(2)}`,
        `${settings.currencySymbol} ${p.amountPaid.toFixed(2)}`,
        `${settings.currencySymbol} ${p.balanceDue.toFixed(2)}`,
        p.status.toUpperCase(),
      ]),
      theme: 'striped',
    });

    doc.save(`SupplierStatement-${supplier.name.replace(/\s+/g, '_')}.pdf`);
  },

  // 6. Expense Voucher PDF
  generateExpenseVoucher(expense: Expense, settings: Settings) {
    const doc = new jsPDF('p', 'mm', 'a5', true); // landscape A5 voucher
    let y = 15;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(settings.businessName, 105, y, { align: 'center' });
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('PETTY CASH & EXPENSE PAYMENT VOUCHER', 105, y, { align: 'center' });
    y += 8;

    doc.setLineDashPattern([1, 1], 0);
    doc.line(14, y, 196, y);
    y += 8;

    doc.text(`Voucher Number: ${expense.expenseNumber}`, 14, y);
    doc.text(`Date: ${new Date(expense.createdAt).toLocaleDateString()}`, 196, y, { align: 'right' });
    y += 8;

    doc.text(`Category: ${expense.category.toUpperCase().replace('_', ' ')}`, 14, y);
    doc.text(`Payment Method: ${expense.paymentMethod.toUpperCase()}`, 196, y, { align: 'right' });
    y += 8;

    doc.text(`Paid To / Payee: ${expense.payee || 'Direct Expense'}`, 14, y);
    if (expense.referenceNumber) {
      doc.text(`Ref #: ${expense.referenceNumber}`, 196, y, { align: 'right' });
    }
    y += 8;

    doc.text(`Description: ${expense.description}`, 14, y);
    y += 12;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`AMOUNT PAID: ${settings.currencySymbol} ${expense.amount.toFixed(2)}`, 105, y, { align: 'center' });
    y += 18;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Prepared By: ${expense.createdBy}`, 20, y);
    doc.text(`Authorized Sign: ___________________`, 130, y);

    doc.save(`ExpenseVoucher-${expense.expenseNumber}.pdf`);
  },

  // 7. Inventory Stock Report PDF
  generateInventoryReport(products: Product[], settings: Settings) {
    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(settings.businessName, 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`STOCK ON HAND & INVENTORY VALUATION REPORT — ${new Date().toLocaleDateString()}`, 14, y);
    y += 8;

    const totalValuation = products.reduce((acc, p) => acc + Math.max(0, p.quantityOnHand) * p.purchaseCost, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Stock Value: ${settings.currencySymbol} ${totalValuation.toLocaleString()}`, 196, y - 8, { align: 'right' });

    autoTable(doc, {
      startY: y,
      head: [['#', 'Product Name', 'SKU', 'Stock Qty', 'Unit Cost', 'Selling Price', 'Total Valuation']],
      body: products.map((p, idx) => [
        idx + 1,
        p.name,
        p.sku,
        `${p.quantityOnHand} ${p.unit}`,
        `${settings.currencySymbol} ${p.purchaseCost.toFixed(2)}`,
        `${settings.currencySymbol} ${p.sellingPrice.toFixed(2)}`,
        `${settings.currencySymbol} ${(p.quantityOnHand * p.purchaseCost).toFixed(2)}`,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] },
      styles: { fontSize: 8 },
    });

    doc.save(`InventoryReport-${new Date().toISOString().slice(0, 10)}.pdf`);
  },

  // 8. Daily Sales & Performance Report PDF
  generateDailySalesReport(date: string, sales: Sale[], settings: Settings) {
    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(settings.businessName, 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`DAILY SALES SUMMARY REPORT — ${date}`, 14, y);
    y += 10;

    const completed = sales.filter((s) => s.status !== 'reversed');
    const gross = completed.reduce((a, s) => a + s.subtotal, 0);
    const disc = completed.reduce((a, s) => a + s.discountTotal, 0);
    const net = completed.reduce((a, s) => a + s.total, 0);

    doc.setFont('helvetica', 'bold');
    doc.text(`Transactions: ${completed.length}`, 14, y);
    doc.text(`Gross Sales: ${settings.currencySymbol} ${gross.toFixed(2)}`, 65, y);
    doc.text(`Discounts: ${settings.currencySymbol} ${disc.toFixed(2)}`, 125, y);
    doc.text(`Net Revenue: ${settings.currencySymbol} ${net.toFixed(2)}`, 196, y, { align: 'right' });
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [['Time', 'Invoice #', 'Customer', 'Items', 'Total', 'Payment', 'Status']],
      body: completed.map((s) => [
        new Date(s.createdAt).toLocaleTimeString(),
        s.saleNumber,
        s.customerName,
        s.items.length,
        `${settings.currencySymbol} ${s.total.toFixed(2)}`,
        s.primaryPaymentMethod.toUpperCase(),
        s.status.toUpperCase(),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42] },
    });

    doc.save(`DailySalesReport-${date}.pdf`);
  },

  // 9. Cash Drawer Reconciliation Report PDF
  generateCashReconciliationReport(session: CashSession, settings: Settings) {
    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(settings.businessName, 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`CASH DRAWER RECONCILIATION — SESSION #${session.sessionNumber}`, 14, y);
    y += 10;

    doc.text(`Opened At: ${new Date(session.openedAt).toLocaleString()} by ${session.openedBy}`, 14, y);
    if (session.closedAt) {
      doc.text(`Closed At: ${new Date(session.closedAt).toLocaleString()} by ${session.closedBy}`, 196, y, { align: 'right' });
    }
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [['Cash Breakdown Item', 'Amount']],
      body: [
        ['Opening Cash Float', `${settings.currencySymbol} ${session.openingBalance.toFixed(2)}`],
        ['(+) Cash Sales Collected', `${settings.currencySymbol} ${session.cashSales.toFixed(2)}`],
        ['(+) Manual Cash In (Deposits/Float additions)', `${settings.currencySymbol} ${session.cashIn.toFixed(2)}`],
        ['(-) Cash Refunds Paid Out', `${settings.currencySymbol} ${session.cashReturns.toFixed(2)}`],
        ['(-) Cash Operating Expenses Paid', `${settings.currencySymbol} ${session.cashExpenses.toFixed(2)}`],
        ['(-) Manual Cash Out (Draws/Bank Drops)', `${settings.currencySymbol} ${session.cashOut.toFixed(2)}`],
        ['(=) System Expected Cash In Drawer', `${settings.currencySymbol} ${session.expectedCash.toFixed(2)}`],
        ['Actual Counted Cash', session.actualCash !== undefined ? `${settings.currencySymbol} ${session.actualCash.toFixed(2)}` : 'Not Counted Yet'],
        ['Cash Variance (Overage / Shortage)', session.variance !== undefined ? `${settings.currencySymbol} ${session.variance.toFixed(2)}` : '-'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] },
    });

    doc.save(`CashReconciliation-${session.sessionNumber}.pdf`);
  },

  // 10. Return Receipt PDF
  generateReturnReceipt(ret: ReturnRecord, settings: Settings) {
    const doc = new jsPDF('p', 'mm', 'a5');
    let y = 15;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(settings.businessName, 105, y, { align: 'center' });
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('CUSTOMER RETURN & REFUND VOUCHER', 105, y, { align: 'center' });
    y += 8;

    doc.text(`Return #: ${ret.returnNumber}`, 14, y);
    doc.text(`Original Sale #: ${ret.originalSaleNumber}`, 196, y, { align: 'right' });
    y += 6;
    doc.text(`Customer: ${ret.customerName}`, 14, y);
    doc.text(`Date: ${new Date(ret.date).toLocaleDateString()}`, 196, y, { align: 'right' });
    y += 6;
    doc.text(`Disposition: ${ret.disposition.toUpperCase()} | Refund via: ${ret.refundMethod.toUpperCase()}`, 14, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [['Product', 'Qty Returned', 'Refund Rate', 'Refund Total']],
      body: ret.items.map((it) => [
        it.productName,
        it.quantity,
        `${settings.currencySymbol} ${it.unitPrice.toFixed(2)}`,
        `${settings.currencySymbol} ${it.refundAmount.toFixed(2)}`,
      ]),
      theme: 'grid',
    });

    // @ts-expect-error autoTable adds lastAutoTable to doc
    y = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 8 : y + 30;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`TOTAL REFUND: ${settings.currencySymbol} ${ret.totalRefund.toFixed(2)}`, 196, y, { align: 'right' });

    doc.save(`Return-${ret.returnNumber}.pdf`);
  },

  // 11. Stock Adjustment Report
  generateStockAdjustmentReport(adj: StockAdjustment, settings: Settings) {
    const doc = new jsPDF('p', 'mm', 'a5');
    let y = 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(settings.businessName, 105, y, { align: 'center' });
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`STOCK ADJUSTMENT RECORD #${adj.adjustmentNumber}`, 105, y, { align: 'center' });
    y += 10;

    autoTable(doc, {
      startY: y,
      head: [['Property', 'Detail']],
      body: [
        ['Product', adj.productName],
        ['SKU', adj.sku],
        ['Adjustment Type', adj.adjustmentType.toUpperCase().replace('_', ' ')],
        ['Previous Stock', adj.currentStock.toString()],
        ['Quantity Change', `${adj.adjustmentQuantity > 0 ? '+' : ''}${adj.adjustmentQuantity}`],
        ['New Final Stock', adj.finalStock.toString()],
        ['Reason', adj.reason],
        ['Performed By', adj.userName],
        ['Date', new Date(adj.createdAt).toLocaleString()],
      ],
      theme: 'grid',
    });

    doc.save(`StockAdjustment-${adj.adjustmentNumber}.pdf`);
  },
};
