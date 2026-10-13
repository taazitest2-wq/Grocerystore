import React, { useState, useEffect } from 'react';
import {
  Download,
  Monitor,
  Laptop,
  Apple,
  FileCode,
  CheckCircle2,
  FolderArchive,
  Terminal,
  ShieldCheck,
  Package,
  Layers,
  ArrowRight,
  ExternalLink,
  Info,
} from 'lucide-react';
import { SourceCodeService } from '../../services/sourceCodeService';

export const DesktopInstallersModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'windows' | 'mac' | 'source'>('all');
  const [isZipping, setIsZipping] = useState(false);
  const [zipSuccess, setZipSuccess] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);

  useEffect(() => {
    // Listen for PWA desktop installation trigger
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsPwaInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleDownloadSourceZip = async () => {
    setIsZipping(true);
    try {
      await SourceCodeService.downloadCompleteSourceCodeZip();
      setZipSuccess(true);
      setTimeout(() => setZipSuccess(false), 5000);
    } catch (err) {
      console.error('Failed to generate ZIP:', err);
      alert('Failed to package source code. Please try again.');
    } finally {
      setIsZipping(false);
    }
  };

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsPwaInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert(
        'To install as a native desktop application:\n\n' +
          '• Chrome / Edge: Click the install icon (computer screen with down arrow) in the browser address bar, or click Menu > "Install BusinessDesk Grocery".\n' +
          '• Safari (macOS): Click File > "Add to Dock".\n\n' +
          'Once installed, it will launch in its own standalone desktop window without browser bars!'
      );
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Monitor className="w-5 h-5 text-emerald-600" />
            Desktop Applications & Source Code Downloads
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Download executable install scripts for Windows and macOS, install as a native desktop app, or download the full project source code archive.
          </p>
        </div>

        {/* Direct Download ZIP Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/Saif-Karyana-Store-POS-Full-Package.zip"
            download="Saif-Karyana-Store-POS-Full-Package.zip"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold shadow-sm transition-all"
            title="Complete project package including source code, executables, compiled dist, and portable launchers"
          >
            <Download className="w-4 h-4" />
            <span>Download All (.ZIP)</span>
          </a>

          <a
            href="/BusinessDesk-Grocery-v1.0.0-Gmail-Safe.zip"
            download="BusinessDesk-Grocery-v1.0.0-Gmail-Safe.zip"
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md text-xs font-medium border border-slate-300 dark:border-slate-700 transition-all"
            title="Safe for Gmail attachments (bypasses Gmail security blocking)"
          >
            <FolderArchive className="w-4 h-4" />
            <span>Gmail-Safe (.ZIP)</span>
          </a>

          <button
            onClick={handleDownloadSourceZip}
            disabled={isZipping}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md text-xs font-medium border border-slate-300 dark:border-slate-700 transition-all"
            title="Re-generate fresh archive from current browser state"
          >
            <span>{isZipping ? 'Generating...' : 'Live Export'}</span>
          </button>
        </div>
      </div>

      {/* Gmail Sharing Solutions Banner */}
      <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg text-xs space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-1.5 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300 rounded-md shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-amber-900 dark:text-amber-200">
              Why did Gmail show &ldquo;Blocked for security reasons&rdquo;?
            </h4>
            <p className="text-amber-800 dark:text-amber-300">
              Google Gmail automatically inspects inside all <code className="bg-amber-100/70 dark:bg-amber-900/60 px-1 py-0.5 rounded font-mono">.zip</code> archives and strictly blocks any email attachment that contains batch scripts (<code className="font-mono">.bat</code>) or shell scripts (<code className="font-mono">.sh</code>, <code className="font-mono">.command</code>) to prevent accidental virus execution.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3 bg-white dark:bg-slate-900 rounded border border-amber-200 dark:border-amber-800/60 space-y-1.5">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">1</span>
              Method 1: Gmail-Safe ZIP
            </span>
            <p className="text-slate-600 dark:text-slate-400 text-[11px]">
              Contains all 50 source files with launchers stored safely as text files. Gmail attaches it with <strong>zero warnings</strong>!
            </p>
            <a
              href="/BusinessDesk-Grocery-v1.0.0-Gmail-Safe.zip"
              download="BusinessDesk-Grocery-v1.0.0-Gmail-Safe.zip"
              className="inline-block mt-1 text-emerald-600 dark:text-emerald-400 font-semibold underline text-[11px]"
            >
              Download Gmail-Safe.zip &rarr;
            </a>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded border border-amber-200 dark:border-amber-800/60 space-y-1.5">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
              Method 2: Google Drive Link
            </span>
            <p className="text-slate-600 dark:text-slate-400 text-[11px]">
              In Gmail, click the <strong>Google Drive icon</strong> when composing to insert as a Google Drive download link.
            </p>
            <span className="inline-block mt-1 text-slate-500 text-[11px]">No attachment scanning limit</span>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded border border-amber-200 dark:border-amber-800/60 space-y-1.5">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">3</span>
              Method 3: Rename to .zip.txt
            </span>
            <p className="text-slate-600 dark:text-slate-400 text-[11px]">
              Add <code className="font-mono">.txt</code> to the file name. Recipient simply deletes <code className="font-mono">.txt</code> to open.
            </p>
            <a
              href="/BusinessDesk-Grocery-v1.0.0-Full-Package.zip.txt"
              download="BusinessDesk-Grocery-v1.0.0-Full-Package.zip.txt"
              className="inline-block mt-1 text-purple-600 dark:text-purple-400 font-semibold underline text-[11px]"
            >
              Download as .zip.txt &rarr;
            </a>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {zipSuccess && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Complete source code archive (BusinessDesk-Grocery-v1.0.0-SourceCode.zip) was generated and downloaded!</span>
        </div>
      )}

      {/* Navigation Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            activeTab === 'all'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          All Installers & Files
        </button>
        <button
          onClick={() => setActiveTab('windows')}
          className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
            activeTab === 'windows'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Laptop className="w-3.5 h-3.5" />
          <span>Windows (.exe / .bat)</span>
        </button>
        <button
          onClick={() => setActiveTab('mac')}
          className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
            activeTab === 'mac'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Apple className="w-3.5 h-3.5" />
          <span>macOS (.dmg / .command)</span>
        </button>
        <button
          onClick={() => setActiveTab('source')}
          className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
            activeTab === 'source'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Source Code (.zip)</span>
        </button>
      </div>

      {/* Main Grid: Windows, Mac, and Source */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* CARD 1: Windows Executable & Installer */}
        {(activeTab === 'all' || activeTab === 'windows') && (
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center font-bold">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Windows Desktop Application
                </h3>
                <span className="text-[11px] text-blue-600 font-medium">
                  Compatible with Windows 10 & Windows 11 (64-bit)
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Run BusinessDesk Grocery as a dedicated desktop application. Double-click setup batch file or compile into a standalone Windows installer (.exe).
              </p>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>One-click double-clickable launcher script (.bat)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Configured for Electron builder (.exe installer / portable)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Native offline IndexedDB caching</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <button
                onClick={() => SourceCodeService.downloadWindowsLauncher()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Windows Launcher (.bat)</span>
              </button>

              <button
                onClick={handleInstallPWA}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md text-xs font-medium"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>{isPwaInstalled ? 'Installed as Desktop App' : 'Install as Windows Desktop App'}</span>
              </button>
            </div>
          </div>
        )}

        {/* CARD 2: Mac Executable & Installer */}
        {(activeTab === 'all' || activeTab === 'mac') && (
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white flex items-center justify-center font-bold">
                <Apple className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  macOS Desktop Application
                </h3>
                <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                  Compatible with Apple Silicon (M1/M2/M3/M4) & Intel
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Native macOS desktop package. Double-click .command launcher from Finder or build into an official macOS Disk Image (.dmg) installer.
              </p>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Double-clickable Finder launcher (.command)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Configured for Electron builder (.dmg / .app bundle)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Full menu bar and native Dock integration</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <button
                onClick={() => SourceCodeService.downloadMacLauncher()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-md text-xs font-semibold shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download macOS Launcher (.command)</span>
              </button>

              <button
                onClick={handleInstallPWA}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md text-xs font-medium"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>{isPwaInstalled ? 'Installed as Desktop App' : 'Install as macOS Desktop App'}</span>
              </button>
            </div>
          </div>
        )}

        {/* CARD 3: Complete Source Code Archive (.ZIP) */}
        {(activeTab === 'all' || activeTab === 'source') && (
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center font-bold">
                <FolderArchive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Full Source Code (.ZIP)
                </h3>
                <span className="text-[11px] text-emerald-600 font-medium">
                  Complete Project Tree & Desktop Build Configs
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Download every single file in the project cleanly archived into a single .zip file. Includes TypeScript models, DB engine, POS modules, PDF engine, test runner, and desktop build configs.
              </p>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>All 18 modules and components</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Zero floating-point Money arithmetic utility</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Windows (.bat) & macOS (.command) launchers included</span>
                </div>
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-2">
              <a
                href="/BusinessDesk-Grocery-v1.0.0-Full-Package.zip"
                download="BusinessDesk-Grocery-v1.0.0-Full-Package.zip"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Package (.ZIP)</span>
              </a>
              <button
                onClick={handleDownloadSourceZip}
                disabled={isZipping}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md text-xs font-medium border border-slate-200 dark:border-slate-700 disabled:opacity-50"
              >
                <FolderArchive className="w-3.5 h-3.5" />
                <span>{isZipping ? 'Generating...' : 'Live In-Browser Re-package'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Terminal Guide: Compiling Standalone .exe and .dmg */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Terminal className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Command-Line Guide: Building Standalone .EXE and .DMG Installers
          </h3>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300">
          If you prefer to compile standalone native installation executables that can be distributed to staff or clients without opening a browser:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 bg-slate-950 text-slate-200 rounded-lg space-y-2 border border-slate-800">
            <span className="text-blue-400 font-bold block">// Windows Setup Executable (.exe)</span>
            <div className="text-slate-400"># 1. Extract the downloaded source ZIP and open terminal</div>
            <div className="text-emerald-400">cd BusinessDesk-Grocery</div>
            <div className="text-slate-400"># 2. Install dependencies</div>
            <div className="text-emerald-400">npm install</div>
            <div className="text-slate-400"># 3. Compile Windows NSIS Installer & Portable EXE</div>
            <div className="text-emerald-400">npm run electron:build:win</div>
            <div className="text-slate-500 mt-2">
              Output: release/BusinessDesk Grocery Setup 1.0.0.exe
            </div>
          </div>

          <div className="p-4 bg-slate-950 text-slate-200 rounded-lg space-y-2 border border-slate-800">
            <span className="text-slate-300 font-bold block">// macOS Installer Disk Image (.dmg)</span>
            <div className="text-slate-400"># 1. Extract the downloaded source ZIP and open terminal</div>
            <div className="text-emerald-400">cd BusinessDesk-Grocery</div>
            <div className="text-slate-400"># 2. Install dependencies</div>
            <div className="text-emerald-400">npm install</div>
            <div className="text-slate-400"># 3. Compile macOS DMG Installer & App Bundle</div>
            <div className="text-emerald-400">npm run electron:build:mac</div>
            <div className="text-slate-500 mt-2">
              Output: release/BusinessDesk-Grocery-1.0.0.dmg
            </div>
          </div>
        </div>
      </div>

      {/* Included Project Files Directory Tree */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Source Archive Content Specification
        </h4>
        <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
          <div>📁 BusinessDesk-Grocery/</div>
          <div>├── 📄 install-and-run-windows.bat <span className="text-slate-400">(Windows 1-click launcher)</span></div>
          <div>├── 📄 install-and-run-mac.command <span className="text-slate-400">(macOS 1-click launcher)</span></div>
          <div>├── 📄 electron-builder.json <span className="text-slate-400">(.exe and .dmg packaging rules)</span></div>
          <div>├── 📄 package.json, tsconfig.json, vite.config.ts</div>
          <div>├── 📁 electron/ <span className="text-slate-400">(main.cjs & preload.cjs desktop windows)</span></div>
          <div>├── 📁 public/ <span className="text-slate-400">(manifest.json, icon.svg, sw.js)</span></div>
          <div>└── 📁 src/</div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;├── 📁 db/ <span className="text-slate-400">(db.ts, storage.ts, initialData.ts)</span></div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;├── 📁 services/ <span className="text-slate-400">(pdfService.ts, csvService.ts, testRunner.ts, sourceCodeService.ts)</span></div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;├── 📁 utils/ <span className="text-slate-400">(money.ts - decimal-safe arithmetic)</span></div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;├── 📁 types/ <span className="text-slate-400">(index.ts domain definitions)</span></div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;└── 📁 components/ <span className="text-slate-400">(all layout & modules)</span></div>
        </div>
      </div>
    </div>
  );
};
