import React, { useState } from 'react';
import { db } from '../../db/db';
import { AppUser } from '../../types';
import { KeyRound, ShieldCheck, Lock, User, Sparkles } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: AppUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const users = db.getUsers();
  const [selectedUser, setSelectedUser] = useState<AppUser>(users[0] || {
    id: 'user-1',
    name: 'Store Administrator',
    username: 'admin',
    role: 'owner_admin',
    isActive: true,
  });
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const settings = db.getSettings();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    setTimeout(() => {
      const isValid = db.validateUserPin(selectedUser, pin);
      if (isValid) {
        db.setCurrentUser(selectedUser);
        onLoginSuccess(selectedUser);
      } else {
        setError('Invalid security PIN. Please enter the correct 4-digit PIN.');
        setIsLoading(false);
      }
    }, 400);
  };

  const handleQuickSelect = (u: AppUser) => {
    setSelectedUser(u);
    setPin('');
    setError('');
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4 relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 relative z-10 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30 text-white font-bold text-2xl tracking-wider">
            SK
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            {settings.businessName || 'Saif Karyana Store'}
          </h1>
          <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Secure Enterprise POS & ERP Terminal
          </p>
        </div>

        {/* User Selection List */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Select User Profile
          </label>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
            {users.map((u) => {
              const isSelected = selectedUser.id === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleQuickSelect(u)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-emerald-950/60 border-emerald-500/80 text-white shadow-sm ring-1 ring-emerald-500/50'
                      : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-xs truncate max-w-[110px]">{u.name}</span>
                    <User className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                  </div>
                  <span className="text-[10px] text-slate-400 capitalize mt-1">
                    {u.role === 'owner_admin' ? 'Admin' : 'Cashier'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* PIN Authentication Form */}
        <form onSubmit={handleLogin} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                Security PIN for {selectedUser.name}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Default: {selectedUser.role === 'owner_admin' ? '1234' : '0000'}
              </span>
            </div>
            <input
              type="password"
              autoFocus
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN..."
              className="w-full text-center text-xl tracking-widest py-3 px-4 border border-slate-700 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono shadow-inner"
            />
          </div>

          {error && (
            <div className="text-xs text-rose-400 text-center font-medium bg-rose-950/40 border border-rose-900/60 p-2 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !pin}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs tracking-wide transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <span className="animate-pulse">Authenticating Secure Session...</span>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Sign In to POS Terminal</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Security Badge */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            SHA-256 Salted Hashing
          </span>
          <span className="font-mono">v2.5.0 Secure</span>
        </div>
      </div>
    </div>
  );
};
