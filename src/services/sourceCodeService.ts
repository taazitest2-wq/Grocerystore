import JSZip from 'jszip';

// Load source code files as raw strings at build/runtime
const srcModules = import.meta.glob(
  ['/src/**/*.{ts,tsx,css}'],
  { query: '?raw', import: 'default', eager: true }
) as Record<string, string>;

export const SourceCodeService = {
  /**
   * Generates and downloads a complete .zip archive of the entire project
   */
  async downloadCompleteSourceCodeZip(): Promise<void> {
    const zip = new JSZip();

    // 1. Add all /src directory files
    for (const [path, content] of Object.entries(srcModules)) {
      // Remove leading slash if present
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      zip.file(cleanPath, content);
    }

    // 2. Add package.json
    zip.file(
      'package.json',
      JSON.stringify(
        {
          name: 'businessdesk-grocery',
          private: true,
          version: '1.0.0',
          description: 'Production-grade Grocery Store Management & POS System',
          main: 'electron/main.cjs',
          scripts: {
            dev: 'vite --port=3000 --host=0.0.0.0',
            build: 'vite build',
            preview: 'vite preview',
            lint: 'tsc --noEmit',
            'electron:start': 'electron .',
            'electron:build:win': 'vite build && electron-builder --win',
            'electron:build:mac': 'vite build && electron-builder --mac',
            'install:windows': 'install-and-run-windows.bat',
            'install:mac': './install-and-run-mac.command',
          },
          dependencies: {
            '@google/genai': '^2.4.0',
            '@tailwindcss/vite': '^4.3.3',
            '@vitejs/plugin-react': '^6.1.1',
            dotenv: '^17.2.3',
            express: '^4.21.2',
            jspdf: '^4.2.1',
            'jspdf-autotable': '^5.0.8',
            jszip: '^3.10.2',
            'lucide-react': '^0.546.0',
            motion: '^12.23.24',
            react: '^19.0.1',
            'react-dom': '^19.0.1',
            vite: '^8.3.0',
          },
          devDependencies: {
            '@types/express': '^4.17.21',
            '@types/jszip': '^3.4.1',
            '@types/node': '^22.14.0',
            '@types/react': '^19.3.0',
            '@types/react-dom': '^19.3.0',
            autoprefixer: '^10.4.21',
            esbuild: '^0.25.0',
            tailwindcss: '^4.3.3',
            tsx: '^4.21.0',
            typescript: '^7.0.2',
            electron: '^33.2.1',
            'electron-builder': '^25.1.8',
          },
        },
        null,
        2
      )
    );

    // 3. Add tsconfig.json
    zip.file(
      'tsconfig.json',
      JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            experimentalDecorators: true,
            useDefineForClassFields: false,
            module: 'ESNext',
            types: ['vite/client'],
            lib: ['ES2022', 'DOM', 'DOM.Iterable'],
            skipLibCheck: true,
            moduleResolution: 'bundler',
            isolatedModules: true,
            moduleDetection: 'force',
            allowJs: true,
            jsx: 'react-jsx',
            paths: { '@/*': ['./*'] },
            allowImportingTsExtensions: true,
            noEmit: true,
          },
        },
        null,
        2
      )
    );

    // 4. Add vite.config.ts
    zip.file(
      'vite.config.ts',
      `import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
  };
});
`
    );

    // 5. Add index.html
    zip.file(
      'index.html',
      `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>BusinessDesk Grocery — Store Management & POS System</title>
    <meta name="description" content="Professional desktop-ready Grocery Store Management & POS System" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="icon" type="image/svg+xml" href="/icon.svg" />
  </head>
  <body class="bg-slate-50 text-slate-900 antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`
    );

    // 6. Add electron/main.cjs
    zip.file(
      'electron/main.cjs',
      `const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'BusinessDesk Grocery — Store Management & POS System',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: false,
  });

  const devUrl = 'http://localhost:3000';
  const prodPath = path.join(__dirname, '../dist/index.html');

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL(devUrl);
  } else if (fs.existsSync(prodPath)) {
    mainWindow.loadFile(prodPath);
  } else {
    mainWindow.loadURL(devUrl);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
`
    );

    // 7. Add electron/preload.cjs
    zip.file(
      'electron/preload.cjs',
      `const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.versions.electron,
});
`
    );

    // 8. Add electron-builder.json
    zip.file(
      'electron-builder.json',
      JSON.stringify(
        {
          appId: 'com.businessdesk.grocery',
          productName: 'BusinessDesk Grocery',
          directories: { output: 'release' },
          files: ['dist/**/*', 'electron/**/*', 'package.json'],
          win: {
            target: [
              { target: 'nsis', arch: ['x64'] },
              { target: 'portable', arch: ['x64'] },
            ],
          },
          nsis: {
            oneClick: false,
            allowToChangeInstallationDirectory: true,
            createDesktopShortcut: true,
            createStartMenuShortcut: true,
            shortcutName: 'BusinessDesk Grocery',
          },
          mac: {
            target: [
              { target: 'dmg', arch: ['x64', 'arm64'] },
              { target: 'zip', arch: ['x64', 'arm64'] },
            ],
            category: 'public.app-category.business',
          },
          dmg: {
            contents: [
              { x: 130, y: 220 },
              { x: 410, y: 220, type: 'link', path: '/Applications' },
            ],
          },
        },
        null,
        2
      )
    );

    // 9. Add install-and-run-windows.bat
    zip.file(
      'install-and-run-windows.bat',
      `@echo off
title BusinessDesk Grocery - Desktop Setup and Launcher
echo =========================================================
echo   BusinessDesk Grocery - Desktop Setup and Launcher
echo =========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js (LTS version) from https://nodejs.org
    echo Then run this batch file again.
    pause
    exit /b 1
)

echo [1/3] Checking dependencies...
if not exist "node_modules" (
    echo Installing npm dependencies...
    call npm install
)

echo [2/3] Building application bundle...
call npm run build

echo [3/3] Starting BusinessDesk Grocery Desktop Application...
call npx electron .
if %errorlevel% neq 0 (
    echo Launching in Native Windows App Mode...
    start "" msedge --app=http://localhost:3000 2>nul || start "" chrome --app=http://localhost:3000 2>nul || start http://localhost:3000
    call npm run dev
)

pause
`
    );

    // 10. Add install-and-run-mac.command
    zip.file(
      'install-and-run-mac.command',
      `#!/usr/bin/env bash
cd "$(dirname "$0")"

echo "=========================================================="
echo "  BusinessDesk Grocery — macOS Desktop App Launcher"
echo "=========================================================="
echo ""

if ! command -v node &> /dev/null; then
    echo "[!] Node.js was not detected on your Mac."
    echo "Please download the Node.js LTS installer from: https://nodejs.org"
    echo "After installation, double-click this file again."
    read -p "Press Enter to exit..."
    exit 1
fi

echo "[1/3] Verifying dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing packages..."
    npm install
fi

echo "[2/3] Compiling BusinessDesk Grocery engine..."
npm run build

echo "[3/3] Launching BusinessDesk Grocery Desktop Application..."
if command -v electron &> /dev/null; then
    electron .
else
    npx electron . || (
        echo "Launching standalone browser desktop mode..."
        open "http://localhost:3000"
        npm run dev
    )
fi
`
    );

    // 11. Add README.md
    zip.file(
      'README.md',
      `# BusinessDesk Grocery — Desktop Store Management & POS System

A complete retail grocery management system with:
- Point of Sale (POS) with barcode/search, line discounts, split payments, change calculation
- Real persistent database with atomic transactions
- Inventory ledger with weighted average cost updates and reorder level alerts
- Purchases, Partial Goods Receiving (GRN), and Supplier Payables
- Customer Credit Accounts and CRM with credit limits
- Sales returns with disposition handling (restock / quarantine / discard)
- Operational expense tracking and cash drawer reconciliation
- 15+ Genuine PDF documents (Thermal receipts, invoices, purchase orders, P&L statements)
- Zero floating-point drift exact decimal arithmetic

## 💻 Running Locally

### Prerequisites
- Node.js LTS (v18, v20, or v22) installed from https://nodejs.org

### Windows (Quickest)
Double-click \`install-and-run-windows.bat\`

### macOS (Quickest)
Double-click \`install-and-run-mac.command\` (or run \`chmod +x install-and-run-mac.command && ./install-and-run-mac.command\`)

### Manual Shell Commands
\`\`\`bash
# 1. Install dependencies
npm install

# 2. Run in browser
npm run dev

# 3. Build standalone Windows .exe installer
npm run electron:build:win

# 4. Build standalone macOS .dmg installer
npm run electron:build:mac
\`\`\`
`
    );

    // 12. Generate and trigger download
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BusinessDesk-Grocery-v1.0.0-SourceCode.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Downloads the Windows Setup batch launcher (.bat) directly
   */
  downloadWindowsLauncher(): void {
    const batContent = `@echo off
title BusinessDesk Grocery - Desktop Setup and Launcher
echo =========================================================
echo   BusinessDesk Grocery - Desktop Setup and Launcher
echo =========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js (LTS version) from https://nodejs.org
    echo Then run this batch file again.
    pause
    exit /b 1
)

echo [1/3] Checking dependencies...
if not exist "node_modules" (
    echo Installing npm dependencies...
    call npm install
)

echo [2/3] Building application bundle...
call npm run build

echo [3/3] Starting BusinessDesk Grocery Desktop Application...
call npx electron .
if %errorlevel% neq 0 (
    echo Launching in Native Windows App Mode...
    start "" msedge --app=http://localhost:3000 2>nul || start "" chrome --app=http://localhost:3000 2>nul || start http://localhost:3000
    call npm run dev
)

pause
`;
    const blob = new Blob([batContent], { type: 'application/x-bat' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'install-and-run-windows.bat';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Downloads the macOS double-clickable launcher (.command) directly
   */
  downloadMacLauncher(): void {
    const macContent = `#!/usr/bin/env bash
cd "$(dirname "$0")"

echo "=========================================================="
echo "  BusinessDesk Grocery — macOS Desktop App Launcher"
echo "=========================================================="
echo ""

if ! command -v node &> /dev/null; then
    echo "[!] Node.js was not detected on your Mac."
    echo "Please download the Node.js LTS installer from: https://nodejs.org"
    echo "After installation, double-click this file again."
    read -p "Press Enter to exit..."
    exit 1
fi

echo "[1/3] Verifying dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing packages..."
    npm install
fi

echo "[2/3] Compiling BusinessDesk Grocery engine..."
npm run build

echo "[3/3] Launching BusinessDesk Grocery Desktop Application..."
if command -v electron &> /dev/null; then
    electron .
else
    npx electron . || (
        echo "Launching standalone browser desktop mode..."
        open "http://localhost:3000"
        npm run dev
    )
fi
`;
    const blob = new Blob([macContent], { type: 'application/x-sh' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'install-and-run-mac.command';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
