import React, { useState } from 'react';
import {
  Coins,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  History,
} from 'lucide-react';
import { db } from '../../db/db';
import { CashSession } from '../../types';
import { PdfService } from '../../services/pdfService';

export const CashManagementModule: React.FC = () => {
  const [sessions, setSessions] = useState<CashSession[]>(db.getCashSessions());
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isOpenSessionModalOpen, setIsOpenSessionModalOpen] = useState(false);

  // Manual Movement Form
  const [manualType, setManualType] = useState<'cash_in' | 'cash_out'>('cash_in');
  const [manualAmount, setManualAmount] = useState<number>(0);
  const [manualReason, setManualReason] = useState('');

  // Close Session Form
  const [countedCash, setCountedCash] = useState<number>(0);
  const [closeNotes, setCloseNotes] = useState('');

  // Open Session Form
  const [openingFloat, setOpeningFloat] = useState<number>(10000);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const activeSession = db.getActiveCashSession();
  const settings = db.getSettings();

  const refreshSessions = () => {
    setSessions(db.getCashSessions());
  };

  const handleOpenManual = (type: 'cash_in' | 'cash_out') => {
    setManualType(type);
    setManualAmount(0);
    setManualReason(type === 'cash_in' ? 'Additional counter change float' : 'Midday bank cash drop');
    setError(null);
    setIsManualModalOpen(true);
  };

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await db.recordManualCashMovement(manualType, manualAmount, manualReason);
      setSuccess(`Cash ${manualType === 'cash_in' ? 'In' : 'Out'} recorded.`);
      setIsManualModalOpen(false);
      refreshSessions();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Manual movement failed');
    }
  };

  const handleOpenCloseModal = () => {
    if (!activeSession) return;
    setCountedCash(activeSession.expectedCash);
    setCloseNotes('');
    setError(null);
    setIsCloseModalOpen(true);
  };

  const handleConfirmClose = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const closed = await db.closeCashSession(countedCash, closeNotes);
      setSuccess(`Session #${closed.sessionNumber} closed with variance of ${settings.currencySymbol} ${closed.variance}.`);
      setIsCloseModalOpen(false);
      refreshSessions();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Session closing failed');
    }
  };

  const handleOpenNewSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const session = await db.openCashSession(openingFloat);
      setSuccess(`Opened new cash drawer session #${session.sessionNumber}.`);
      setIsOpenSessionModalOpen(false);
      refreshSessions();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to open session');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-600" />
            Cash Drawer Management & Reconciliation
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Track physical counter cash float, cash sales, manual bank drops, expenses, and shift variance reconciliations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeSession ? (
            <>
              <button
                onClick={() => handleOpenManual('cash_in')}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md text-xs font-semibold"
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>Cash In (Deposit)</span>
              </button>
              <button
                onClick={() => handleOpenManual('cash_out')}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-md text-xs font-semibold"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Cash Out (Drop)</span>
              </button>
              <button
                onClick={handleOpenCloseModal}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 text-white dark:text-slate-900 rounded-md text-xs font-semibold shadow-sm"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Close Cash Drawer Shift</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsOpenSessionModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-sm"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Open New Cash Drawer Shift</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Active Drawer Live Status Card */}
      {activeSession ? (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Live Active Shift #{activeSession.sessionNumber}
              </h3>
              <span className="text-xs text-slate-500">
                Opened at {new Date(activeSession.openedAt).toLocaleTimeString()} by {activeSession.openedBy}
              </span>
            </div>
            <button
              onClick={() => PdfService.generateCashReconciliationReport(activeSession, settings)}
              className="text-xs text-emerald-600 hover:underline flex items-center gap-1 font-medium"
            >
              <FileText className="w-3.5 h-3.5" />
              Export Reconciliation PDF
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded">
              <span className="text-slate-400 block">Opening Float</span>
              <strong className="text-base font-mono text-slate-800 dark:text-slate-200 mt-1 block">
                {settings.currencySymbol} {activeSession.openingBalance.toLocaleString()}
              </strong>
            </div>

            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded border border-emerald-100 dark:border-emerald-900/40">
              <span className="text-emerald-700 dark:text-emerald-400 block font-medium">(+) Cash Sales</span>
              <strong className="text-base font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
                {settings.currencySymbol} {activeSession.cashSales.toLocaleString()}
              </strong>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded">
              <span className="text-slate-400 block">(+) Manual Cash In</span>
              <strong className="text-base font-mono text-slate-800 dark:text-slate-200 mt-1 block">
                {settings.currencySymbol} {activeSession.cashIn.toLocaleString()}
              </strong>
            </div>

            <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded border border-amber-100 dark:border-amber-900/40">
              <span className="text-amber-700 dark:text-amber-400 block font-medium">(-) Cash Refunds</span>
              <strong className="text-base font-mono text-amber-600 mt-1 block">
                {settings.currencySymbol} {activeSession.cashReturns.toLocaleString()}
              </strong>
            </div>

            <div className="p-3 bg-rose-50/60 dark:bg-rose-950/30 rounded border border-rose-100 dark:border-rose-900/40">
              <span className="text-rose-700 dark:text-rose-400 block font-medium">(-) Cash Expenses / Drops</span>
              <strong className="text-base font-mono text-rose-600 mt-1 block">
                {settings.currencySymbol} {(activeSession.cashExpenses + activeSession.cashOut).toLocaleString()}
              </strong>
            </div>

            <div className="p-3 bg-slate-900 text-white rounded shadow-sm">
              <span className="text-slate-300 block">Expected Cash in Drawer</span>
              <strong className="text-lg font-mono text-emerald-400 mt-1 block">
                {settings.currencySymbol} {activeSession.expectedCash.toLocaleString()}
              </strong>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-6 rounded-lg text-amber-900 dark:text-amber-200 text-center space-y-3">
          <Lock className="w-8 h-8 mx-auto text-amber-600" />
          <h3 className="font-bold text-sm">No Active Cash Drawer Shift is Currently Open</h3>
          <p className="text-xs max-w-md mx-auto text-amber-800 dark:text-amber-300">
            Open a morning session with an opening float count before processing retail transactions.
          </p>
          <button
            onClick={() => setIsOpenSessionModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-xs"
          >
            Open Cash Drawer Shift Now
          </button>
        </div>
      )}

      {/* Cash Sessions History */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
          <History className="w-4 h-4 text-emerald-600" />
          Cash Drawer Sessions History & Variance Log
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Session #</th>
                <th className="py-3 px-4">Opened / Closed By</th>
                <th className="py-3 px-4 text-right">Opening Float</th>
                <th className="py-3 px-4 text-right">Cash Sales</th>
                <th className="py-3 px-4 text-right">Expected Cash</th>
                <th className="py-3 px-4 text-right">Actual Counted</th>
                <th className="py-3 px-4 text-center">Variance</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sessions.map((sess) => {
                const isOpen = sess.status === 'open';
                const hasVariance = sess.variance !== undefined && sess.variance !== 0;
                return (
                  <tr key={sess.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <div className="font-mono font-semibold text-slate-900 dark:text-white">
                        {sess.sessionNumber}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(sess.openedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>{sess.openedBy}</div>
                      {sess.closedBy && <div className="text-[10px] text-slate-400">Closed by {sess.closedBy}</div>}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {settings.currencySymbol} {sess.openingBalance.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-600">
                      {settings.currencySymbol} {sess.cashSales.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-slate-900 dark:text-white">
                      {settings.currencySymbol} {sess.expectedCash.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {sess.actualCash !== undefined
                        ? `${settings.currencySymbol} ${sess.actualCash.toLocaleString()}`
                        : '-'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {sess.variance !== undefined ? (
                        <span
                          className={`font-semibold ${
                            sess.variance === 0
                              ? 'text-emerald-600'
                              : sess.variance > 0
                              ? 'text-blue-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {sess.variance > 0 ? `+${sess.variance}` : sess.variance}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          isOpen ? 'bg-emerald-50 text-emerald-700 animate-pulse' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {sess.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => PdfService.generateCashReconciliationReport(sess, settings)}
                        className="px-2 py-1 text-slate-600 hover:text-emerald-600 rounded text-xs"
                        title="Download Shift Reconciliation PDF"
                      >
                        <FileText className="w-3.5 h-3.5 inline mr-1" />
                        Report
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Cash In / Out Dialog */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {manualType === 'cash_in' ? (
                <ArrowDownRight className="w-5 h-5 text-emerald-600" />
              ) : (
                <ArrowUpRight className="w-5 h-5 text-rose-600" />
              )}
              {manualType === 'cash_in' ? 'Record Manual Cash In' : 'Record Manual Cash Out (Drop)'}
            </h3>

            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSaveManual} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">
                  Amount ({settings.currencySymbol}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={manualAmount}
                  onChange={(e) => setManualAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Documented Reason *</label>
                <input
                  type="text"
                  required
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder="e.g. Midday cash drop to owner bank safe, coins replenishment"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-3 py-1.5 border rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md shadow-xs"
                >
                  Confirm Movement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Cash Drawer Shift Modal (Scenario F) */}
      {isCloseModalOpen && activeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-600" />
              Reconcile & Close Cash Drawer Shift
            </h3>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded text-xs space-y-1">
              <div className="flex justify-between">
                <span>System Expected Cash:</span>
                <strong className="font-mono">{settings.currencySymbol} {activeSession.expectedCash.toFixed(2)}</strong>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Session Opening Float:</span>
                <span className="font-mono">{settings.currencySymbol} {activeSession.openingBalance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Cash Sales Recorded:</span>
                <span className="font-mono">{settings.currencySymbol} {activeSession.cashSales.toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmClose} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">
                  Actual Physically Counted Cash ({settings.currencySymbol}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={countedCash}
                  onChange={(e) => setCountedCash(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md font-mono text-sm font-bold"
                />
              </div>

              {/* Calculated Variance */}
              <div className="flex items-center justify-between p-2.5 bg-slate-100 dark:bg-slate-800 rounded text-xs font-semibold">
                <span>Cash Drawer Variance:</span>
                <span
                  className={`font-mono text-sm ${
                    countedCash - activeSession.expectedCash === 0
                      ? 'text-emerald-600'
                      : countedCash - activeSession.expectedCash > 0
                      ? 'text-blue-600'
                      : 'text-rose-600'
                  }`}
                >
                  {countedCash - activeSession.expectedCash > 0 ? '+' : ''}
                  {settings.currencySymbol} {(countedCash - activeSession.expectedCash).toFixed(2)}
                  {countedCash - activeSession.expectedCash === 0
                    ? ' (Perfect Match)'
                    : countedCash - activeSession.expectedCash > 0
                    ? ' (Overage)'
                    : ' (Shortage)'}
                </span>
              </div>

              <div>
                <label className="block font-semibold mb-1">Closing Audit Notes (Optional)</label>
                <input
                  type="text"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="e.g. End of night counter register closing count"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCloseModalOpen(false)}
                  className="px-3 py-1.5 border rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded-md shadow-xs"
                >
                  Commit Shift Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Open Session Modal */}
      {isOpenSessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Unlock className="w-5 h-5 text-emerald-600" />
              Open New Cash Drawer Session
            </h3>

            <form onSubmit={handleOpenNewSession} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">
                  Opening Float / Cash in Register ({settings.currencySymbol}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Physically counted cash in drawer at shift start for customer change.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpenSessionModalOpen(false)}
                  className="px-3 py-1.5 border rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md shadow-xs"
                >
                  Open Drawer Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
