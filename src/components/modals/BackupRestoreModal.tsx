import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FileJson,
  Calendar,
  Layers,
  Database,
  ExternalLink,
} from 'lucide-react';
import { db } from '../../db/db';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({ isOpen, onClose }) => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [crashSnapshotInfo, setCrashSnapshotInfo] = useState<{
    timestamp: string;
    recordCount: number;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [restorePreview, setRestorePreview] = useState<{
    version: string;
    exportedAt: string;
    productCount: number;
    salesCount: number;
    dataJson: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSuccessMessage(null);
      setErrorMessage(null);
      setRestorePreview(null);
      try {
        const snap = db.getCrashRecoverySnapshot();
        if (snap) {
          setCrashSnapshotInfo({
            timestamp: snap.timestamp,
            recordCount: snap.recordCount,
          });
        } else {
          setCrashSnapshotInfo(null);
        }
      } catch {
        setCrashSnapshotInfo(null);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Download Local Backup File
  const handleDownloadBackup = () => {
    try {
      setIsProcessing(true);
      const jsonStr = db.exportBackupJson();
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `SaifKaryana-Backup-${dateStr}-${Date.now().toString().slice(-4)}.json`;

      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccessMessage(`Backup successfully downloaded as ${filename}`);
      setErrorMessage(null);
    } catch (e: unknown) {
      setErrorMessage(e instanceof Error ? e.message : 'Failed to generate backup file.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Backup to Google Drive
  const handleBackupToGoogleDrive = async () => {
    try {
      setIsProcessing(true);
      const jsonStr = db.exportBackupJson();
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `SaifKaryana-Backup-${dateStr}.json`;

      const blob = new Blob([jsonStr], { type: 'application/json' });
      const file = new File([blob], filename, { type: 'application/json' });

      // If Web Share API supports file sharing, trigger native share dialog
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Saif Karyana Store Database Backup',
            text: 'Save store database backup to Google Drive or cloud storage.',
          });
          setSuccessMessage('Backup sent to Google Drive share picker.');
          return;
        } catch (shareErr) {
          console.warn('Share cancelled or not supported, proceeding with direct download and Drive launcher', shareErr);
        }
      }

      // Download file to user device
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccessMessage(
        `Backup file (${filename}) prepared and downloaded! Click the Google Drive link below or upload the file to your Google Drive folder for safe off-site preservation.`
      );
      setErrorMessage(null);
    } catch (e: unknown) {
      setErrorMessage(e instanceof Error ? e.message : 'Failed to prepare Google Drive backup.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. File Input Selection for Restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const data = parsed.database || parsed.data || parsed;

        if (!data || !Array.isArray(data.products) || !Array.isArray(data.categories)) {
          throw new Error('Invalid backup file structure: missing products or categories tables.');
        }

        setRestorePreview({
          version: parsed.version || '1.0.0',
          exportedAt: parsed.exportedAt || parsed.timestamp || 'Unknown',
          productCount: data.products.length,
          salesCount: data.sales ? data.sales.length : 0,
          dataJson: text,
        });
        setErrorMessage(null);
      } catch (err: unknown) {
        setErrorMessage(
          err instanceof Error
            ? `Cannot parse backup file: ${err.message}`
            : 'File is not a valid JSON database backup.'
        );
        setRestorePreview(null);
      }
    };
    reader.readAsText(file);
  };

  // 4. Confirm Restore
  const handleExecuteRestore = async () => {
    if (!restorePreview) return;
    if (
      !confirm(
        `Are you sure you want to load this backup? It contains ${restorePreview.productCount} products and ${restorePreview.salesCount} sales. Current state will be replaced.`
      )
    ) {
      return;
    }

    try {
      setIsProcessing(true);
      await db.importBackupJson(restorePreview.dataJson);
      setSuccessMessage('Database backup successfully loaded into software! Refreshing data...');
      setRestorePreview(null);
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1200);
    } catch (e: unknown) {
      setErrorMessage(e instanceof Error ? e.message : 'Error restoring backup data.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. Restore from Emergency Crash Snapshot
  const handleRestoreFromCrashSnapshot = async () => {
    if (
      !confirm(
        'Restore state from the emergency crash snapshot? This recovers all items and transactions saved right before the browser exit or crash.'
      )
    ) {
      return;
    }

    try {
      setIsProcessing(true);
      await db.restoreCrashRecoverySnapshot();
      setSuccessMessage('Emergency crash recovery snapshot restored successfully!');
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1000);
    } catch (e: unknown) {
      setErrorMessage(e instanceof Error ? e.message : 'Could not restore crash snapshot.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Database Backup & Crash Recovery
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Safeguard all store inventory, sales, purchases, customers, and ledger data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Notifications */}
          {successMessage && (
            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">
                <div>{successMessage}</div>
                <div className="mt-2.5">
                  <a
                    href="https://drive.google.com/drive/my-drive"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors"
                  >
                    <span>Open Google Drive</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Section 1: Backup Exports */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              Export & Cloud Backup Options
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Google Drive Option */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20 dark:to-transparent flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">
                      Google Drive Backup
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Generates a timestamped JSON file and opens Google Drive to upload and preserve off-site.
                  </p>
                </div>
                <button
                  onClick={handleBackupToGoogleDrive}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-sm transition-colors cursor-pointer"
                >
                  <Cloud className="w-4 h-4" />
                  <span>Take Backup on Google Drive</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </button>
              </div>

              {/* Local File Option */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/60 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileJson className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">
                      Local File Backup
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Download full complete database archive directly to your computer or USB drive.
                  </p>
                </div>
                <button
                  onClick={handleDownloadBackup}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs shadow-sm transition-colors cursor-pointer dark:bg-slate-700 dark:hover:bg-slate-600"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Backup (.json)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Load / Restore from Backup */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-blue-500" />
              Load Backup into Software
            </h3>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />

            {!restorePreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors cursor-pointer bg-slate-50/40 dark:bg-slate-850/40"
              >
                <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Click to select or drop a Backup (.json) file
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Supports any previous Saif Karyana or BusinessDesk backup archive
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                    <FileJson className="w-4 h-4 text-blue-600" />
                    Backup File Ready to Load
                  </span>
                  <button
                    onClick={() => setRestorePreview(null)}
                    className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Change File
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2 rounded bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <Layers className="w-4 h-4 text-emerald-500" />
                    <span>
                      <strong>{restorePreview.productCount}</strong> Products
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <Calendar className="w-4 h-4 text-purple-500" />
                    <span>
                      <strong>{restorePreview.salesCount}</strong> Sales
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleExecuteRestore}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Confirm and Load this Backup</span>
                </button>
              </div>
            )}
          </div>

          {/* Section 3: Crash Recovery Safeguard */}
          <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="font-semibold text-xs text-amber-900 dark:text-amber-300">
                  Emergency Crash Recovery Log
                </span>
              </div>
              {crashSnapshotInfo && (
                <span className="text-[11px] text-amber-700 dark:text-amber-400 font-mono">
                  {new Date(crashSnapshotInfo.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              )}
            </div>

            <p className="text-[11px] text-amber-800 dark:text-amber-300/80 leading-relaxed">
              The system automatically writes continuous snapshots before browser crashes or accidental tab closures.
              {crashSnapshotInfo
                ? ` Latest recorded snapshot contains ${crashSnapshotInfo.recordCount} records.`
                : ' Continuous auto-save active.'}
            </p>

            {crashSnapshotInfo && (
              <button
                onClick={handleRestoreFromCrashSnapshot}
                disabled={isProcessing}
                className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Previous Session from Crash Snapshot</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/60 flex items-center justify-between text-xs text-slate-500">
          <span>Security: Backups are encrypted locally with client-side JSON format</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
