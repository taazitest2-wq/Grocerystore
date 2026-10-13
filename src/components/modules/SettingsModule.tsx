import React, { useState, useRef } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  CheckCircle2,
  AlertCircle,
  Database,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Building2,
  Coins,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { db } from '../../db/db';
import { Settings } from '../../types';
import { StorageEngine } from '../../db/storage';
import { SourceCodeService } from '../../services/sourceCodeService';
import { Laptop, Apple, FolderArchive } from 'lucide-react';

export const SettingsModule: React.FC = () => {
  const [settings, setSettings] = useState<Settings>(db.getSettings());
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await db.updateSettings(settings);
      setSuccess('Settings saved and configuration applied successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    }
  };

  const handleExportBackup = () => {
    const json = StorageEngine.exportBackupJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BusinessDesk_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setSuccess('Database backup JSON exported successfully.');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        await StorageEngine.importBackupJson(text);
        await db.init();
        setSettings(db.getSettings());
        setSuccess('Database successfully restored from backup file. Reloading...');
        setTimeout(() => window.location.reload(), 1500);
      } catch (err: any) {
        alert(`Restore error: ${err.message}`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleResetSample = async () => {
    if (confirm('Reset database to default sample demonstration grocery dataset? (This will populate fresh rice, atta, oil, milk, suppliers, and customer accounts).')) {
      await StorageEngine.resetToSampleData();
      await db.init();
      window.location.reload();
    }
  };

  const handleClearAll = async () => {
    if (confirm('WARNING: Are you sure you want to purge all business transaction records, products, and sales? This action cannot be undone.')) {
      await StorageEngine.clearAllData();
      await db.init();
      window.location.reload();
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-emerald-600" />
          Store Settings & Configuration
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Customize grocery business profiles, currency formatting, tax regulations, negative stock policies, and database backup.
        </p>
      </div>

      {/* Notifications */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-md text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Section 1: Business Profile */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b pb-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            Grocery Business Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Store / Business Name *</label>
              <input
                type="text"
                required
                value={settings.businessName}
                onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Tax / NTN / Registration Number</label>
              <input
                type="text"
                value={settings.taxNumber || ''}
                onChange={(e) => setSettings({ ...settings, taxNumber: e.target.value })}
                placeholder="e.g. NTN: 8492041-3"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Phone Number</label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Email Address</label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold mb-1">Physical Store Address</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Financial & Currency */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b pb-2">
            <Coins className="w-4 h-4 text-emerald-600" />
            Currency & Financial Policy
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold mb-1">Currency Symbol</label>
              <input
                type="text"
                value={settings.currencySymbol}
                onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Currency Code</label>
              <input
                type="text"
                value={settings.currencyCode}
                onChange={(e) => setSettings({ ...settings, currencyCode: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Max Cashier Discount %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={settings.maxDiscountPercent}
                onChange={(e) => setSettings({ ...settings, maxDiscountPercent: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md font-mono"
              />
            </div>

            <div className="sm:col-span-3 flex flex-wrap items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.creditSalesEnabled}
                  onChange={(e) => setSettings({ ...settings, creditSalesEnabled: e.target.checked })}
                  className="rounded text-emerald-600"
                />
                <span className="font-semibold">Enable Store Credit Sales for Registered Customers</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.taxEnabled}
                  onChange={(e) => setSettings({ ...settings, taxEnabled: e.target.checked })}
                  className="rounded text-emerald-600"
                />
                <span className="font-semibold">Enable Sales Tax / GST</span>
              </label>
            </div>

            {settings.taxEnabled && (
              <div>
                <label className="block font-semibold mb-1">Tax Rate Percentage (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={settings.taxRatePercent}
                  onChange={(e) => setSettings({ ...settings, taxRatePercent: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md font-mono"
                />
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Inventory Control Policies */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b pb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Inventory Stock Safeguards
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Inventory Costing Policy</label>
              <select
                value={settings.costingPolicy}
                onChange={(e) => setSettings({ ...settings, costingPolicy: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md"
              >
                <option value="weighted_average">Weighted-Average Cost (Recommended)</option>
                <option value="last_cost">Last Purchase Cost</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Default Low Stock Reorder Threshold</label>
              <input
                type="number"
                min="1"
                value={settings.defaultReorderLevel}
                onChange={(e) => setSettings({ ...settings, defaultReorderLevel: parseInt(e.target.value) || 10 })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md font-mono"
              />
            </div>

            <div className="sm:col-span-2 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allowNegativeStock}
                  onChange={(e) => setSettings({ ...settings, allowNegativeStock: e.target.checked })}
                  className="rounded text-emerald-600"
                />
                <div>
                  <span className="font-semibold block">Allow Selling Below Zero Stock (Negative Stock Override)</span>
                  <span className="text-[10px] text-slate-400">
                    When disabled, the POS strictly blocks checkouts if stock is zero or insufficient.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Section 4: Receipts & Documents */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b pb-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            Receipt Headers & Printing Layout
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Default Receipt Layout</label>
              <select
                value={settings.receiptLayout}
                onChange={(e) => setSettings({ ...settings, receiptLayout: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md"
              >
                <option value="a4">Standard A4 Document Format</option>
                <option value="thermal_80mm">Compact 80mm POS Thermal Receipt</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold mb-1">Receipt Footer Note</label>
              <input
                type="text"
                value={settings.receiptFooter}
                onChange={(e) => setSettings({ ...settings, receiptFooter: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md"
              />
            </div>
          </div>
        </div>

        {/* Save Settings Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md shadow-sm transition-colors text-xs"
          >
            <Save className="w-4 h-4" />
            <span>Save Store Configuration</span>
          </button>
        </div>
      </form>

      {/* Section 5: Database Health, Backup & Restore, Demo Data */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 space-y-4 mt-8">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b pb-2">
          <Database className="w-4 h-4 text-emerald-600" />
          Database Management, Persistent Backup & Electron Bridge
        </h3>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded border text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Active Storage Engine:</span>
            <span className="font-mono text-emerald-600 font-bold">IndexedDB Persistent Repository</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold">Electron IPC Main Bridge:</span>
            <span className="font-mono text-blue-600">SQLite Preload IPC Adapter Ready</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            All records persist permanently across browser tabs, page refreshes, and computer restarts. For packaging as a standalone native desktop app on Windows and macOS, the Electron Main Process loads the bundled SQLite engine using the unified Data Access Layer.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleExportBackup}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded font-semibold text-xs border"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export Database JSON Backup</span>
          </button>

          <label className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded font-semibold text-xs border cursor-pointer">
            <Upload className="w-4 h-4 text-blue-600" />
            <span>Restore from JSON Backup</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleResetSample}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded font-semibold text-xs border"
          >
            <RotateCcw className="w-4 h-4 text-amber-600" />
            <span>Reset Demo Grocery Dataset</span>
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            className="flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded font-semibold text-xs border border-rose-200 dark:border-rose-800 ml-auto"
          >
            <Trash2 className="w-4 h-4" />
            <span>Purge Operational Records</span>
          </button>
        </div>

        {/* Desktop Executables & Source Archive */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
            Desktop Executable Installers & Full Source Code (.ZIP)
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => SourceCodeService.downloadCompleteSourceCodeZip()}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shadow-xs"
            >
              <FolderArchive className="w-4 h-4" />
              <span>Download Complete Source (.ZIP)</span>
            </button>

            <button
              type="button"
              onClick={() => SourceCodeService.downloadWindowsLauncher()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-xs shadow-xs"
            >
              <Laptop className="w-4 h-4" />
              <span>Windows Launcher (.bat)</span>
            </button>

            <button
              type="button"
              onClick={() => SourceCodeService.downloadMacLauncher()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded font-semibold text-xs shadow-xs"
            >
              <Apple className="w-4 h-4" />
              <span>macOS Launcher (.command)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
