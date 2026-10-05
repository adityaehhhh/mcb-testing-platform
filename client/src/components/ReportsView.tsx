import React, { useState } from 'react';
import { ReportItem } from '../types';

interface ReportsViewProps {
  reports: ReportItem[];
  onOpenReport: (testId: string) => void;
  onOpenQR: (testId: string, verifyUrl: string, qrDataUrl: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  reports,
  onOpenReport,
  onOpenQR
}) => {
  const [search, setSearch] = useState('');

  const filtered = reports.filter((r) => {
    return (
      r.test_id.toLowerCase().includes(search.toLowerCase()) ||
      r.certificate_no.toLowerCase().includes(search.toLowerCase()) ||
      r.manufacturer.toLowerCase().includes(search.toLowerCase()) ||
      r.model.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="w-full max-w-[1600px] mx-auto px-space-md sm:px-space-xl lg:px-space-2xl py-space-xl flex flex-col gap-space-xl">
      
      {/* Header Banner */}
      <div className="bg-surface-container-lowest p-space-xl rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-lg">
        <div className="flex items-center gap-space-md">
          <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center font-headline-sm">
            <span className="material-symbols-outlined text-on-primary-container">verified</span>
          </div>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Compliance Test Certificates &amp; Reports</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Cryptographically signed laboratory test records and certificates compliant with IS/IEC 60898-1.
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex items-center justify-between">
        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search Certificate No, Test ID, Sample..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg pl-9 pr-3 py-2 text-on-surface font-body-md text-body-md placeholder:text-outline focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/60 text-secondary font-label-caps text-label-caps uppercase tracking-wider">
                <th className="py-space-md px-space-xl">Certificate No</th>
                <th className="py-space-md px-space-xl">Test Batch ID</th>
                <th className="py-space-md px-space-xl">MCB Sample</th>
                <th className="py-space-md px-space-xl">Rating</th>
                <th className="py-space-md px-space-xl text-right">Trip Time</th>
                <th className="py-space-md px-space-xl text-right">Peak Current</th>
                <th className="py-space-md px-space-xl text-center">Compliance Verdict</th>
                <th className="py-space-md px-space-xl">Generated Date</th>
                <th className="py-space-md px-space-xl text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low text-on-surface font-body-md text-body-md">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-space-2xl text-center text-outline font-body-md">
                    No certificate reports found.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const isPass = r.verdict === 'PASS';
                  return (
                    <tr key={r.report_id} className="hover:bg-surface-container-low/30 transition-colors">
                      <td className="py-space-md px-space-xl font-code-id text-code-id font-bold text-primary">
                        {r.certificate_no}
                      </td>
                      <td className="py-space-md px-space-xl font-code-id text-code-id text-secondary">
                        {r.test_id}
                      </td>
                      <td className="py-space-md px-space-xl font-semibold">
                        <div>{r.manufacturer} {r.model}</div>
                        <div className="font-code-timestamp text-code-timestamp text-outline">{r.sample_id}</div>
                      </td>
                      <td className="py-space-md px-space-xl font-code-id text-code-id text-secondary">
                        {r.trip_curve}{r.rated_current_in}A
                      </td>
                      <td className={`py-space-md px-space-xl text-right font-code-id text-code-id font-semibold ${
                        isPass ? 'text-on-surface' : 'text-error'
                      }`}>
                        {r.trip_time_ms ? `${r.trip_time_ms.toFixed(1)} ms` : '--'}
                      </td>
                      <td className="py-space-md px-space-xl text-right font-code-id text-code-id">
                        {r.peak_current ? `${r.peak_current.toFixed(1)} A` : '--'}
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
                      <td className="py-space-md px-space-xl font-code-timestamp text-code-timestamp text-outline">
                        {new Date(r.generated_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-space-md px-space-xl text-right">
                        <button
                          onClick={() => onOpenReport(r.test_id)}
                          className="px-space-md py-1.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container transition-all font-title-md text-title-md font-semibold inline-flex items-center gap-space-xs shadow-sm cursor-pointer"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">description</span>
                          <span>View Certificate</span>
                        </button>
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
