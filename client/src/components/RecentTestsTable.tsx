import React from 'react';
import { Database, ArrowRight, FileText, QrCode } from 'lucide-react';
import { TestBatch } from '../types';

interface RecentTestsTableProps {
  batches: TestBatch[];
  onSelectBatch: (testId: string) => void;
  onOpenReport: (testId: string) => void;
  onOpenQR: (testId: string, verifyUrl: string, qrDataUrl: string) => void;
  onViewAllTests: () => void;
}

export const RecentTestsTable: React.FC<RecentTestsTableProps> = ({
  batches,
  onSelectBatch,
  onOpenReport,
  onOpenQR,
  onViewAllTests
}) => {
  const recentBatches = batches.slice(0, 6);

  return (
    <div className="card-stitch font-mono text-xs">
      
      {/* Header */}
      <div className="card-header-stitch">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-[#48d7f9]" />
          <span className="text-white font-bold tracking-wide text-xs">HISTORICAL AUDIT &amp; TEST ARCHIVE</span>
        </div>
        <button
          onClick={onViewAllTests}
          className="text-[11px] text-[#48d7f9] hover:underline flex items-center gap-1 font-bold"
        >
          <span>VIEW FULL AUDIT TRAIL</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#0d141e] border-b border-[#232a36] text-[#8d9baf] text-[10px] uppercase font-bold tracking-wider">
              <th className="py-2.5 px-3.5">TEST ID</th>
              <th className="py-2.5 px-3.5">MCB SAMPLE</th>
              <th className="py-2.5 px-3.5">RATING</th>
              <th className="py-2.5 px-3.5">PEAK CURRENT</th>
              <th className="py-2.5 px-3.5">TRIP TIME</th>
              <th className="py-2.5 px-3.5">VERDICT</th>
              <th className="py-2.5 px-3.5">TIMESTAMP</th>
              <th className="py-2.5 px-3.5 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#232a36]">
            {recentBatches.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[#596980]">
                  No tests recorded in archive yet.
                </td>
              </tr>
            ) : (
              recentBatches.map((b) => (
                <tr
                  key={b.test_id}
                  onClick={() => onSelectBatch(b.test_id)}
                  className="hover:bg-[#19202b] transition-colors cursor-pointer"
                >
                  <td className="py-3 px-3.5 font-bold text-[#48d7f9]">
                    {b.test_id}
                  </td>
                  <td className="py-3 px-3.5 text-white">
                    {b.manufacturer} {b.model}
                  </td>
                  <td className="py-3 px-3.5">
                    <span className="text-[#f9bc45] font-bold text-[11px]">
                      {b.trip_curve}{b.rated_current_in}A
                    </span>
                  </td>
                  <td className="py-3 px-3.5 font-semibold text-white">
                    {b.peak_current ? `${b.peak_current.toFixed(1)} A` : '--'}
                  </td>
                  <td className="py-3 px-3.5 font-semibold text-[#ff4d5a]">
                    {b.trip_time_ms ? `${b.trip_time_ms.toFixed(1)} ms` : '--'}
                  </td>
                  <td className="py-3 px-3.5">
                    {b.verdict === 'PASS' || b.status === 'PASS' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#151c27] text-[#44dfab] border border-[#44dfab]/50">
                        PASS
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#151c27] text-[#ff4d5a] border border-[#ff4d5a]/50">
                        FAIL
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3.5 text-[#8d9baf] text-[10px]">
                    {new Date(b.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onOpenReport(b.test_id)}
                        title="View Report"
                        className="p-1 hover:bg-[#232a36] rounded text-[#8d9baf] hover:text-[#48d7f9] transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onOpenQR(b.test_id, b.verify_url || '', b.qr_code_data_url || '')}
                        title="Verify QR"
                        className="p-1 hover:bg-[#232a36] rounded text-[#8d9baf] hover:text-[#44dfab] transition-colors"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
