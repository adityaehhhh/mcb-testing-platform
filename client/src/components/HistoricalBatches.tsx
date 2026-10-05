import React, { useState } from 'react';
import { TestBatch } from '../types';

interface HistoricalBatchesProps {
  batches: TestBatch[];
  stats: { total: number; passCount: number; failCount: number; realMachineCount: number; simulatedCount: number };
  onSelectBatch: (testId: string) => void;
  onOpenReport: (testId: string) => void;
  onOpenQR: (testId: string, verifyUrl: string, qrDataUrl: string) => void;
  onRefresh: () => void;
}

export const HistoricalBatches: React.FC<HistoricalBatchesProps> = ({
  batches,
  stats,
  onSelectBatch,
  onOpenReport,
  onOpenQR,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [curveFilter, setCurveFilter] = useState('ALL');

  const filteredBatches = batches.filter((b) => {
    const matchSearch =
      b.test_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.sample_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.manufacturer && b.manufacturer.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (b.model && b.model.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchStatus = statusFilter === 'ALL' || b.status === statusFilter || b.verdict === statusFilter;
    const matchSource = sourceFilter === 'ALL' || b.data_source === sourceFilter;
    const matchCurve = curveFilter === 'ALL' || b.trip_curve === curveFilter;

    return matchSearch && matchStatus && matchSource && matchCurve;
  });

  return (
    <div className="w-full max-w-[1600px] mx-auto px-space-md sm:px-space-xl lg:px-space-2xl py-space-xl flex flex-col gap-space-xl">
      
      {/* Top Stat Ribbon (Stitch Design) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-space-md">
        <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between">
          <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Total Batches</span>
          <div className="text-display-sm font-bold text-on-surface my-1">{stats.total}</div>
          <span className="font-code-timestamp text-code-timestamp text-outline">In Test Database</span>
        </div>

        <div className="bg-tertiary-container/10 p-space-lg rounded-xl shadow-sm flex flex-col justify-between border border-tertiary/20">
          <span className="font-label-caps text-label-caps text-tertiary uppercase tracking-wider font-bold">Compliant (PASS)</span>
          <div className="text-display-sm font-bold text-tertiary my-1">{stats.passCount}</div>
          <span className="font-code-timestamp text-code-timestamp text-tertiary">IS/IEC 60898-1</span>
        </div>

        <div className="bg-error-container/40 p-space-lg rounded-xl shadow-sm flex flex-col justify-between border border-error/20">
          <span className="font-label-caps text-label-caps text-error uppercase tracking-wider font-bold">Non-Compliant (FAIL)</span>
          <div className="text-display-sm font-bold text-error my-1">{stats.failCount}</div>
          <span className="font-code-timestamp text-code-timestamp text-error">Tripping Faults</span>
        </div>

        <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between">
          <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Real Rig Tests</span>
          <div className="text-display-sm font-bold text-primary my-1">{stats.realMachineCount}</div>
          <span className="font-code-timestamp text-code-timestamp text-outline">Hardware Captured</span>
        </div>

        <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between">
          <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Simulated Demo</span>
          <div className="text-display-sm font-bold text-secondary my-1">{stats.simulatedCount}</div>
          <span className="font-code-timestamp text-code-timestamp text-outline">Engine Generated</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-space-md">
        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search Test ID, Sample, Brand..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg pl-9 pr-3 py-2 text-on-surface font-body-md text-body-md placeholder:text-outline focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-space-sm w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-container-low border border-outline-variant/40 rounded-lg px-space-md py-2 text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="ALL">All Verdicts</option>
            <option value="PASS">PASS Only</option>
            <option value="FAIL">FAIL Only</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-surface-container-low border border-outline-variant/40 rounded-lg px-space-md py-2 text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="ALL">All Data Sources</option>
            <option value="REAL_MACHINE">REAL MACHINE Only</option>
            <option value="SIMULATED">SIMULATED Only</option>
          </select>

          <select
            value={curveFilter}
            onChange={(e) => setCurveFilter(e.target.value)}
            className="bg-surface-container-low border border-outline-variant/40 rounded-lg px-space-md py-2 text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="ALL">All Curves (B/C/D)</option>
            <option value="B">Curve B</option>
            <option value="C">Curve C</option>
            <option value="D">Curve D</option>
          </select>

          <button
            onClick={onRefresh}
            className="p-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            title="Refresh Database"
          >
            <span className="material-symbols-outlined text-[20px]">refresh</span>
          </button>
        </div>
      </div>

      {/* Batches Table (Stitch Exact Table Style) */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/60 text-secondary font-label-caps text-label-caps uppercase tracking-wider">
                <th className="py-space-md px-space-xl">Test ID</th>
                <th className="py-space-md px-space-xl">Date / Time</th>
                <th className="py-space-md px-space-xl">MCB Sample</th>
                <th className="py-space-md px-space-xl">Rating / Curve</th>
                <th className="py-space-md px-space-xl text-right">Peak Current</th>
                <th className="py-space-md px-space-xl text-right">Trip Time</th>
                <th className="py-space-md px-space-xl text-right">I²t (A²s)</th>
                <th className="py-space-md px-space-xl text-center">Verdict</th>
                <th className="py-space-md px-space-xl">Data Source</th>
                <th className="py-space-md px-space-xl text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low text-on-surface font-body-md text-body-md">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-space-2xl text-center text-outline font-body-md">
                    No historical test records matched your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredBatches.map((b) => {
                  const isPass = b.verdict === 'PASS' || b.status === 'PASS';
                  return (
                    <tr
                      key={b.test_id}
                      onClick={() => onSelectBatch(b.test_id)}
                      className="hover:bg-surface-container-low/30 transition-colors cursor-pointer"
                    >
                      <td className="py-space-md px-space-xl font-code-id text-code-id font-medium text-primary">
                        {b.test_id}
                      </td>
                      <td className="py-space-md px-space-xl font-code-timestamp text-code-timestamp text-outline">
                        {new Date(b.started_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}, {new Date(b.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-space-md px-space-xl font-semibold">
                        <div>{b.manufacturer} {b.model}</div>
                        <div className="font-code-timestamp text-code-timestamp text-outline">{b.sample_id}</div>
                      </td>
                      <td className="py-space-md px-space-xl font-code-id text-code-id text-secondary">
                        {b.trip_curve}{b.rated_current_in}A ({b.poles})
                      </td>
                      <td className="py-space-md px-space-xl text-right font-code-id text-code-id">
                        {b.peak_current ? `${b.peak_current.toFixed(1)} A` : '--'}
                      </td>
                      <td className={`py-space-md px-space-xl text-right font-code-id text-code-id font-semibold ${
                        isPass ? 'text-on-surface' : 'text-error'
                      }`}>
                        {b.trip_time_ms ? `${b.trip_time_ms.toFixed(1)} ms` : '--'}
                      </td>
                      <td className="py-space-md px-space-xl text-right font-code-id text-code-id text-secondary">
                        {b.i2t_value ? `${b.i2t_value.toLocaleString()}` : '--'}
                      </td>
                      <td className="py-space-md px-space-xl text-center">
                        <span className={`inline-flex items-center gap-1 px-space-md py-0.5 rounded-DEFAULT font-label-caps text-label-caps font-semibold ${
                          isPass
                            ? 'bg-tertiary-container/10 text-tertiary'
                            : 'bg-error-container text-error'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isPass ? 'bg-tertiary' : 'bg-error'}`}></span>
                          {isPass ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                      <td className="py-space-md px-space-xl font-code-timestamp text-code-timestamp text-outline uppercase">
                        {b.data_source}
                      </td>
                      <td className="py-space-md px-space-xl text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-space-xs">
                          <button
                            onClick={() => onOpenReport(b.test_id)}
                            className="p-1.5 hover:bg-surface-container rounded text-primary hover:text-primary-container transition-colors cursor-pointer"
                            title="View Certificate"
                          >
                            <span className="material-symbols-outlined text-[18px]">description</span>
                          </button>
                          <button
                            onClick={() => onOpenQR(b.test_id, b.verify_url || '', b.qr_code_data_url || '')}
                            className="p-1.5 hover:bg-surface-container rounded text-tertiary hover:text-tertiary-container transition-colors cursor-pointer"
                            title="QR Code"
                          >
                            <span className="material-symbols-outlined text-[18px]">qr_code</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
