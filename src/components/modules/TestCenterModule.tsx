import React, { useState } from 'react';
import {
  FlaskConical,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { TestRunner, TestResult } from '../../services/testRunner';

export const TestCenterModule: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [lastRunTime, setLastRunTime] = useState<string | null>(null);

  const handleRunTests = async () => {
    setIsRunning(true);
    try {
      const res = await TestRunner.runAllScenarios();
      setResults(res);
      setLastRunTime(new Date().toLocaleTimeString());
    } finally {
      setIsRunning(false);
    }
  };

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-emerald-600" />
            Mandatory Acceptance Test Suite (Scenarios A — O)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Automated in-browser test harness running real transactions, atomic stock deductions, and invariant verifications.
          </p>
        </div>
        <button
          disabled={isRunning}
          onClick={handleRunTests}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-md text-xs font-bold shadow-sm transition-colors"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{isRunning ? 'Running Test Suite...' : 'Execute Automated Acceptance Tests'}</span>
        </button>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase block">Tests Executed</span>
          <span className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
            {results.length > 0 ? results.length : 'Ready'}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {lastRunTime ? `Last executed at ${lastRunTime}` : 'Click Execute to start'}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase block">Tests Passed</span>
          <span className="text-2xl font-bold text-emerald-600 mt-1 block font-mono">
            {passedCount}
          </span>
          <span className="text-[10px] text-emerald-600/80 mt-0.5 block">
            {results.length > 0 && passedCount === results.length ? '100% Passing Rate' : 'Awaiting run'}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-rose-500 uppercase block">Tests Failed</span>
          <span className="text-2xl font-bold text-rose-600 mt-1 block font-mono">
            {failedCount}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Zero regressions tolerated
          </span>
        </div>
      </div>

      {/* Scenario Descriptions & Live Results */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 font-bold text-xs text-slate-900 dark:text-white flex items-center justify-between">
          <span>Acceptance Test Results & Diagnostic Assertions</span>
          <span className="text-slate-400 font-normal">Section 26 Requirements</span>
        </div>

        {results.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <FlaskConical className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
            <p className="text-xs">
              Click &quot;Execute Automated Acceptance Tests&quot; above to run all scenarios against the live database engine.
            </p>
          </div>
        ) : (
          results.map((r, i) => (
            <div key={i} className="p-4 flex items-start justify-between gap-4 text-xs">
              <div className="flex items-start gap-3 min-w-0">
                {r.passed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {r.scenario}: {r.name}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                        r.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {r.passed ? 'Passed' : 'Failed'}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {r.message}
                  </p>
                </div>
              </div>

              <div className="text-right text-[11px] text-slate-400 font-mono flex-shrink-0">
                {r.durationMs}ms
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
