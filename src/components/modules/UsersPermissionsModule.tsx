import React, { useState } from 'react';
import {
  UserCheck,
  Shield,
  Plus,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { db } from '../../db/db';
import { AppUser, UserRole } from '../../types';

export const UsersPermissionsModule: React.FC = () => {
  const [users, setUsers] = useState<AppUser[]>(db.getUsers());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>('cashier');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const currentUser = db.currentUser;

  const refreshList = () => {
    setUsers(db.getUsers());
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await db.createUser(name, username, role);
      setSuccess(`User "${name}" created.`);
      setIsAddModalOpen(false);
      setName('');
      setUsername('');
      refreshList();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    }
  };

  const handleToggleActive = async (user: AppUser) => {
    if (user.id === currentUser.id) {
      alert('You cannot deactivate your own active account.');
      return;
    }
    await db.updateUserRole(user.id, user.role, !user.isActive);
    refreshList();
  };

  const permissionsMatrix = [
    { module: 'Point of Sale (POS)', owner: true, manager: true, cashier: true, inventory: false },
    { module: 'Sales History & Receipts', owner: true, manager: true, cashier: true, inventory: false },
    { module: 'Transaction Reversals', owner: true, manager: true, cashier: false, inventory: false },
    { module: 'Product Catalog & Pricing', owner: true, manager: true, cashier: false, inventory: true },
    { module: 'Inventory Stock Receiving', owner: true, manager: true, cashier: false, inventory: true },
    { module: 'Stock Adjustments & Damage', owner: true, manager: true, cashier: false, inventory: true },
    { module: 'Purchases & Vendors', owner: true, manager: true, cashier: false, inventory: false },
    { module: 'Operating Expenses', owner: true, manager: true, cashier: false, inventory: false },
    { module: 'Close Cash Drawer Shift', owner: true, manager: true, cashier: false, inventory: false },
    { module: 'Financial & P&L Reports', owner: true, manager: true, cashier: false, inventory: false },
    { module: 'Store Settings & Backup', owner: true, manager: false, cashier: false, inventory: false },
    { module: 'User Accounts & Roles', owner: true, manager: false, cashier: false, inventory: false },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            Users & Role Permissions
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Local staff authentication, role authorizations, and operational governance matrix.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Staff Account</span>
        </button>
      </div>

      {/* Notifications */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* POC Notice Banner */}
      <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-md text-xs text-blue-900 dark:text-blue-200">
        <strong>POC Role Switcher:</strong> Switch users using the top-right profile selector to test how permissions apply to Owner/Admin, Store Manager, Cashier, and Inventory Staff.
      </div>

      {/* Users List Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-600" />
          Staff User Accounts
        </div>
        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-800 font-semibold uppercase text-slate-500 text-[10px]">
            <tr>
              <th className="p-3">Staff Name</th>
              <th className="p-3">Username</th>
              <th className="p-3">Assigned Role</th>
              <th className="p-3 text-center">Active Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="p-3 font-semibold text-slate-900 dark:text-white">
                  {u.name}
                  {u.id === currentUser.id && (
                    <span className="ml-2 text-[10px] text-emerald-600 font-mono">(Current Active)</span>
                  )}
                </td>
                <td className="p-3 font-mono">{u.username}</td>
                <td className="p-3 capitalize">
                  <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 font-medium">
                    {u.role.replace('_', ' ')}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {u.isActive ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => handleToggleActive(u)}
                    className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  >
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Permissions Matrix */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Role Capability & Governance Matrix
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800 font-semibold text-slate-500 text-[10px] uppercase">
            <tr>
              <th className="p-3">Application Feature</th>
              <th className="p-3 text-center">Owner / Admin</th>
              <th className="p-3 text-center">Store Manager</th>
              <th className="p-3 text-center">Counter Cashier</th>
              <th className="p-3 text-center">Inventory Staff</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {permissionsMatrix.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{row.module}</td>
                <td className="p-3 text-center">{row.owner ? '✓' : '—'}</td>
                <td className="p-3 text-center">{row.manager ? '✓' : '—'}</td>
                <td className="p-3 text-center">{row.cashier ? '✓' : '—'}</td>
                <td className="p-3 text-center">{row.inventory ? '✓' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Staff Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Create Staff Account
            </h3>

            {error && (
              <div className="p-2.5 bg-rose-50 text-rose-800 border rounded text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Usman Ali"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. usman"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-md"
                >
                  <option value="owner_admin">Owner / Admin (Full Access)</option>
                  <option value="manager">Store Manager</option>
                  <option value="cashier">Counter Cashier</option>
                  <option value="inventory_staff">Inventory Staff</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 border rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 text-white font-semibold rounded-md shadow-xs"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
