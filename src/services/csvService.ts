import { Product, Sale, InventoryMovement } from '../types';

export const CsvService = {
  // Products CSV Export
  exportProductsCsv(products: Product[]): void {
    const headers = [
      'ID',
      'Name',
      'SKU',
      'Barcode',
      'Category ID',
      'Brand',
      'Purchase Cost',
      'Selling Price',
      'Unit',
      'Quantity On Hand',
      'Reorder Level',
      'Expiry Tracking',
      'Expiry Date',
    ];

    const rows = products.map((p) => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      p.sku,
      p.barcode || '',
      p.categoryId,
      `"${(p.brand || '').replace(/"/g, '""')}"`,
      p.purchaseCost,
      p.sellingPrice,
      p.unit,
      p.quantityOnHand,
      p.reorderLevel,
      p.expiryTracking ? 'true' : 'false',
      p.expiryDate || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    this.downloadFile(csvContent, `Products_Export_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
  },

  // Sales CSV Export
  exportSalesCsv(sales: Sale[]): void {
    const headers = [
      'Sale Number',
      'Date',
      'Cashier',
      'Customer',
      'Subtotal',
      'Discount',
      'Tax',
      'Total',
      'Amount Paid',
      'Payment Status',
      'Payment Method',
      'Status',
    ];

    const rows = sales.map((s) => [
      s.saleNumber,
      s.createdAt,
      `"${s.cashierName.replace(/"/g, '""')}"`,
      `"${s.customerName.replace(/"/g, '""')}"`,
      s.subtotal,
      s.discountTotal,
      s.taxTotal,
      s.total,
      s.amountPaid,
      s.paymentStatus,
      s.primaryPaymentMethod,
      s.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    this.downloadFile(csvContent, `Sales_Export_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
  },

  // Inventory Movements CSV Export
  exportInventoryMovementsCsv(movements: InventoryMovement[]): void {
    const headers = [
      'Movement Number',
      'Timestamp',
      'Product Name',
      'SKU',
      'Type',
      'Quantity Change',
      'Balance After',
      'Reference Number',
      'User',
      'Reason',
    ];

    const rows = movements.map((m) => [
      m.movementNumber,
      m.timestamp,
      `"${m.productName.replace(/"/g, '""')}"`,
      m.sku,
      m.movementType,
      m.quantityChange,
      m.balanceAfter,
      m.referenceNumber,
      `"${m.userName.replace(/"/g, '""')}"`,
      `"${m.reason.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    this.downloadFile(csvContent, `Inventory_Movements_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
  },

  // Helper download trigger
  downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // Parse CSV text for Products Bulk Import
  parseProductsCsv(csvText: string): {
    valid: Array<{
      name: string;
      sku: string;
      barcode?: string;
      categoryId: string;
      brand?: string;
      purchaseCost: number;
      sellingPrice: number;
      unit: any;
      quantityOnHand: number;
      reorderLevel: number;
      expiryTracking: boolean;
      expiryDate?: string;
    }>;
    errors: string[];
  } {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return { valid: [], errors: ['CSV file is empty or missing data rows.'] };
    }

    const errors: string[] = [];
    const valid: any[] = [];

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Basic CSV token parser handling quotes
      const cells: string[] = [];
      let inQuotes = false;
      let currentCell = '';

      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"' && (c === 0 || line[c - 1] !== '\\')) {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          cells.push(currentCell.trim().replace(/^"|"$/g, ''));
          currentCell = '';
        } else {
          currentCell += char;
        }
      }
      cells.push(currentCell.trim().replace(/^"|"$/g, ''));

      if (cells.length < 5) {
        errors.push(`Row ${i + 1}: Insufficient columns`);
        continue;
      }

      const name = cells[0] || cells[1];
      const sku = cells[1] || cells[2];
      const cost = parseFloat(cells[3] || '0');
      const price = parseFloat(cells[4] || '0');
      const unit = (cells[5] || 'pack').toLowerCase();
      const qty = parseFloat(cells[6] || '0');

      if (!name || !sku) {
        errors.push(`Row ${i + 1}: Name and SKU cannot be blank.`);
        continue;
      }

      if (isNaN(cost) || cost < 0 || isNaN(price) || price < 0) {
        errors.push(`Row ${i + 1}: Invalid cost or selling price numbers.`);
        continue;
      }

      valid.push({
        name,
        sku: sku.toUpperCase(),
        purchaseCost: cost,
        sellingPrice: price,
        unit: ['pcs', 'pack', 'box', 'bottle', 'kg', 'g', 'l', 'ml'].includes(unit) ? unit : 'pack',
        quantityOnHand: isNaN(qty) ? 0 : qty,
        reorderLevel: 10,
        categoryId: 'cat-1', // Default category or matched
        expiryTracking: false,
      });
    }

    return { valid, errors };
  },
};
