import React, { useState } from 'react';
import { ShieldAlert, Search, Filter, Clock, User, Shield } from 'lucide-react';
import { db } from '../../db/db';

export const AuditLogModule: React.FC = () => {
  const [logs] = useState(db.getAuditLogs());
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const filteredLogs = logs.filter((l) => {
    const matchesSearch =
      l.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.entity.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === 'all' || l.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-emerald-600" />
          Audit Trail & System Compliance Log
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Immutable event log of every transactional change, inventory movement, price adjustment, and authorization.
        </p>
      </div>

      {/* Filter */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search audit trail by keyword, staff user, action..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border rounded-md"
          />
        </div>
        <div className="text-xs text-slate-500">
          Total Audit Records: <strong>{filteredLogs.length}</strong>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800 font-semibold uppercase text-slate-500 text-[10px]">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Action Type</th>
                <th className="p-3">Entity</th>
                <th className="p-3">Staff Member</th>
                <th className="p-3">Event Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="p-3 font-mono font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                    {log.action}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 uppercase font-mono">
                      {log.entity}
                    </span>
                  </td>
                  <td className="p-3 font-medium text-slate-700 dark:text-slate-300">
                    {log.userName}
                  </td>
                  <td className="p-3 text-slate-800 dark:text-slate-200">
                    {log.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
