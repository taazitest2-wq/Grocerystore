import React, { useState, useEffect } from 'react';
import {
  Clock,
  Coins,
  Search,
  ChevronDown,
  Moon,
  Sun,
  ShieldCheck,
  RotateCcw,
  Menu,
  Database,
  Lock,
  KeyRound,
  X,
  Eye,
  EyeOff,
  LogOut,
} from 'lucide-react';
import { db } from '../../db/db';
import { AppUser, NavigationPage } from '../../types';

interface TopBarProps {
  onNavigate: (page: NavigationPage) => void;
  onSearchSelect?: (term: string) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onToggleMobileSidebar: () => void;
  onOpenBackupModal: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onNavigate,
  isDarkMode,
  onToggleDarkMode,
  onToggleMobileSidebar,
  onOpenBackupModal,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // PIN security verification state
  const [pinModalUser, setPinModalUser] = useState<AppUser | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isTerminalLocked, setIsTerminalLocked] = useState(false);
  const [unlockPin, setUnlockPin] = useState('');
  const [unlockError, setUnlockError] = useState('');

  const settings = db.getSettings();
  const currentUser = db.currentUser;
  const users = db.getUsers();
  const activeCashSession = db.getActiveCashSession();
  const [isCashVisible, setIsCashVisible] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setCurrentDate(
        now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectUser = (user: AppUser) => {
    setUserDropdownOpen(false);
    if (user.id === currentUser.id) return;

    // Challenge with PIN verification
    setPinModalUser(user);
    setEnteredPin('');
    setPinError('');
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinModalUser) return;

    const expectedPin = pinModalUser.pin || (pinModalUser.role === 'owner_admin' ? '1234' : '0000');
    if (enteredPin === expectedPin) {
      db.setCurrentUser(pinModalUser);
      setPinModalUser(null);
      setEnteredPin('');
      setPinError('');
    } else {
      setPinError('Incorrect security PIN. Please try again.');
    }
  };

  const handleUnlockTerminal = (e: React.FormEvent) => {
    e.preventDefault();
    const expectedPin = currentUser.pin || (currentUser.role === 'owner_admin' ? '1234' : '0000');
    if (unlockPin === expectedPin) {
      setIsTerminalLocked(false);
      setUnlockPin('');
      setUnlockError('');
    } else {
      setUnlockError('Incorrect PIN to unlock terminal.');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      onNavigate('products');
    }
  };

  return (
    <>
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 flex items-center justify-between gap-3 z-20">
        {/* Left: Mobile Menu Toggle & Store Title */}
        <div className="flex items-center gap-3 md:gap-5 min-w-0">
          {/* Mobile Side Menu Trigger */}
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Open side menu"
            aria-label="Open side menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Store Name & Live Clock */}
          <div className="min-w-0">
            <h1 className="text-sm md:text-base font-semibold text-slate-900 dark:text-white leading-tight truncate">
              {settings.businessName || 'Saif Karyana Store'}
            </h1>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{currentDate}</span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1 font-mono font-medium text-slate-600 dark:text-slate-300">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {currentTime}
              </span>
            </div>
          </div>

          {/* Quick Search Form */}
          <form onSubmit={handleSearchSubmit} className="hidden xl:flex items-center relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Quick search products, SKUs..."
              className="w-56 pl-9 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-200 placeholder-slate-400"
            />
          </form>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Cash Drawer Status */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <button
              onClick={() => onNavigate('cash_management')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left"
              title="Click to view Cash Drawer"
            >
              <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block leading-none">
                  Drawer Cash
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs font-mono">
                  {activeCashSession
                    ? isCashVisible
                      ? `${settings.currencySymbol} ${activeCashSession.expectedCash.toLocaleString()}`
                      : `${settings.currencySymbol} •••••••`
                    : 'Closed'}
                </span>
              </div>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsCashVisible(!isCashVisible);
              }}
              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isCashVisible ? 'Hide cash amount' : 'Show cash amount'}
              aria-label={isCashVisible ? 'Hide cash amount' : 'Show cash amount'}
            >
              {isCashVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Backup & Recovery Button */}
          <button
            onClick={onOpenBackupModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 font-medium transition-colors"
            title="Open Backup & Crash Recovery Center"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Backup / Drive</span>
          </button>

          {/* Lock Terminal Button */}
          <button
            onClick={() => setIsTerminalLocked(true)}
            className="p-2 rounded-md text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Lock POS Terminal (PIN Required)"
            aria-label="Lock POS Terminal"
          >
            <Lock className="w-4 h-4" />
          </button>

          {/* Dark/Light mode toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-md text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle Light / Dark mode"
            aria-label="Toggle Light / Dark mode"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Active User Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-1.5 sm:gap-2 pl-2 pr-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs"
            >
              <div className="w-6 h-6 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left hidden sm:block">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block leading-tight truncate max-w-[100px]">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                  {currentUser.role === 'owner_admin' ? 'Admin' : 'Cashier'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50">
                <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-700/60">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Security: Switch Account
                  </span>
                  <span className="text-[10px] text-slate-500">
                    PIN verification enforced on switch
                  </span>
                </div>
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors ${
                      u.id === currentUser.id
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="leading-tight">{u.name}</div>
                      <div className="text-[10px] text-slate-500 capitalize">
                        {u.role === 'owner_admin' ? 'Administrator' : 'Store Cashier'}
                      </div>
                    </div>
                    {u.id === currentUser.id ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                ))}
                <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-700/60">
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Lock / Sign Out to Login Screen</span>
                  </button>
                </div>
                <div className="px-3 py-1.5 mt-1 border-t border-slate-100 dark:border-slate-700/60 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Admin PIN: 1234</span>
                  <span>Cashier PIN: 0000</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* PIN Verification Modal */}
      {pinModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Security PIN Required
                </h3>
              </div>
              <button
                onClick={() => setPinModalUser(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Please enter the security PIN to switch to{' '}
              <strong>{pinModalUser.name}</strong> ({pinModalUser.role === 'owner_admin' ? 'Admin' : 'Cashier'}).
            </p>

            <form onSubmit={handleVerifyPin} className="space-y-3">
              <div>
                <input
                  type="password"
                  autoFocus
                  maxLength={6}
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value)}
                  placeholder="Enter 4-digit PIN..."
                  className="w-full text-center text-lg tracking-widest py-2 px-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <div className="mt-1 text-[11px] text-slate-400 text-center">
                  Default PIN: {pinModalUser.role === 'owner_admin' ? '1234' : '0000'}
                </div>
              </div>

              {pinError && (
                <div className="text-xs text-rose-600 dark:text-rose-400 text-center font-medium">
                  {pinError}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPinModalUser(null)}
                  className="w-1/2 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
                >
                  Authenticate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Terminal Lock Screen Overlay */}
      {isTerminalLocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 text-white p-4">
          <div className="w-full max-w-sm text-center space-y-5 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-emerald-950/80 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-800/60">
              <Lock className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">POS Terminal Locked</h2>
              <p className="text-xs text-slate-400 mt-1">
                Active User: <strong>{currentUser.name}</strong> ({currentUser.role === 'owner_admin' ? 'Admin' : 'Cashier'})
              </p>
            </div>

            <form onSubmit={handleUnlockTerminal} className="space-y-4">
              <div>
                <input
                  type="password"
                  autoFocus
                  maxLength={6}
                  value={unlockPin}
                  onChange={(e) => setUnlockPin(e.target.value)}
                  placeholder="Enter PIN to unlock..."
                  className="w-full text-center text-xl tracking-widest py-3 px-4 border border-slate-700 rounded-xl bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <div className="mt-1.5 text-[11px] text-slate-500">
                  Default PIN: {currentUser.role === 'owner_admin' ? '1234' : '0000'}
                </div>
              </div>

              {unlockError && (
                <div className="text-xs text-rose-400 font-medium">{unlockError}</div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs tracking-wide transition-colors cursor-pointer"
              >
                Unlock Terminal
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
