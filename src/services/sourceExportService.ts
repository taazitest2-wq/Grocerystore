import JSZip from 'jszip';

export const SourceExportService = {
  /**
   * Generates a complete ZIP archive of the entire application source code
   * including Electron packaging files, desktop scripts, and documentation
   */
  async downloadFullSourceZip(): Promise<void> {
    const zip = new JSZip();

    // Fetch and include project root files
    const fileList = [
      'package.json',
      'tsconfig.json',
      'vite.config.ts',
      'index.html',
      'metadata.json',
      'README.md',
      'install-and-run-windows.bat',
      'install-and-run-mac.sh',
      'electron/main.cjs',
      'electron/preload.cjs',
      'src/main.tsx',
      'src/index.css',
      'src/App.tsx',
      'src/types/index.ts',
      'src/utils/money.ts',
      'src/db/storage.ts',
      'src/db/initialData.ts',
      'src/db/db.ts',
      'src/services/pdfService.ts',
      'src/services/csvService.ts',
      'src/services/testRunner.ts',
      'src/services/sourceExportService.ts',
      'src/components/layout/Sidebar.tsx',
      'src/components/layout/TopBar.tsx',
      'src/components/modules/DashboardModule.tsx',
      'src/components/modules/POSModule.tsx',
      'src/components/modules/ProductsModule.tsx',
      'src/components/modules/CategoriesModule.tsx',
      'src/components/modules/InventoryModule.tsx',
      'src/components/modules/StockAdjustmentsModule.tsx',
      'src/components/modules/PurchasesModule.tsx',
      'src/components/modules/SuppliersModule.tsx',
      'src/components/modules/CustomersModule.tsx',
      'src/components/modules/SalesHistoryModule.tsx',
      'src/components/modules/ReturnsRefundsModule.tsx',
      'src/components/modules/ExpensesModule.tsx',
      'src/components/modules/CashManagementModule.tsx',
      'src/components/modules/ReportsModule.tsx',
      'src/components/modules/PDFDocumentsModule.tsx',
      'src/components/modules/UsersPermissionsModule.tsx',
      'src/components/modules/SettingsModule.tsx',
      'src/components/modules/AuditLogModule.tsx',
      'src/components/modules/TestCenterModule.tsx',
    ];

    // Read files via fetch from the active dev server
    for (const filePath of fileList) {
      try {
        const response = await fetch(`/${filePath}`);
        if (response.ok) {
          const content = await response.text();
          zip.file(filePath, content);
        }
      } catch (err) {
        console.warn(`Could not bundle file ${filePath}:`, err);
      }
    }

    // Add Desktop Quickstart instructions
    zip.file(
      'QUICKSTART_DESKTOP.md',
      `# BusinessDesk Grocery - Quickstart Desktop Guide

## How to Run on Windows
1. Unzip this folder.
2. Ensure you have Node.js installed (download free from https://nodejs.org).
3. Double-click "install-and-run-windows.bat".
4. The application will automatically install dependencies and launch the desktop window!

## How to Run on macOS
1. Unzip this folder.
2. Open Terminal in this folder.
3. Run: chmod +x install-and-run-mac.sh && ./install-and-run-mac.sh

## How to Package as .exe (Windows Installer) or .dmg (macOS)
1. Run in terminal: npm install
2. For Windows: npm run electron:build:win
   -> Generates "dist/BusinessDesk Grocery Setup.exe"
3. For macOS: npm run electron:build:mac
   -> Generates "dist/BusinessDesk Grocery.dmg"
`
    );

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `businessdesk-grocery-full-source-${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
