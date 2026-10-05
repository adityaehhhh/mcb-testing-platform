import React, { useState, useEffect } from 'react';
import { TestBatch, TestResult, TestWaveforms, TestEvent, TestFault } from '../types';

interface BatchDetailModalProps {
  testId: string | null;
  onClose: () => void;
  onOpenReport: (testId: string) => void;
  onOpenQR: (testId: string, verifyUrl: string, qrDataUrl: string) => void;
}

export const BatchDetailModal: React.FC<BatchDetailModalProps> = ({
  testId,
  onClose,
  onOpenReport,
  onOpenQR
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    batch: TestBatch;
    result: TestResult;
    waveforms: TestWaveforms | null;
    events: TestEvent[];
    faults: TestFault[];
    qrRecord: any;
    report: any;
  } | null>(null);

  useEffect(() => {
    if (!testId) return;
    setLoading(true);
    fetch(`/api/batches/${testId}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch batch detail:', err);
        setLoading(false);
      });
  }, [testId]);

  if (!testId) return null;

  const isPass = data?.result?.verdict === 'PASS';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/60 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col font-body-md text-body-md text-on-surface">
        
        {/* Header */}
        <div className="bg-surface-container-low px-space-xl py-space-md border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-space-md">
            <span className="font-headline-sm text-headline-sm text-primary font-bold">BATCH DETAIL: {testId}</span>
            {data?.result && (
              <span className={`px-space-md py-0.5 rounded font-label-caps text-label-caps font-semibold ${
                isPass ? 'bg-tertiary-container/10 text-tertiary' : 'bg-error-container text-error'
              }`}>
                {isPass ? 'PASS (COMPLIANT)' : 'FAIL (NON-COMPLIANT)'}
              </span>
            )}
            <span className="font-code-id text-code-id px-space-sm py-0.5 rounded bg-surface-container text-secondary">
              SOURCE: {data?.batch?.data_source}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface-variant text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-space-xl overflow-y-auto space-y-space-lg flex-1">
          {loading ? (
            <div className="py-space-3xl text-center text-outline">Loading batch telemetry and waveform data...</div>
          ) : data ? (
            <>
              {/* Top Overview Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
                
                {/* MCB Info */}
                <div className="bg-surface-container-low p-space-lg rounded-xl border border-outline-variant/30 space-y-1.5">
                  <div className="font-label-caps text-label-caps text-primary font-bold uppercase">MCB Under Test</div>
                  <div className="font-headline-sm text-headline-sm text-on-surface">{data.batch.manufacturer} {data.batch.model}</div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant">Sample ID: <span className="text-on-surface font-semibold">{data.batch.sample_id}</span></div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant">Rating: <span className="text-primary font-bold">{data.batch.trip_curve}{data.batch.rated_current_in}A ({data.batch.poles})</span></div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant">Breaking Capacity: <span className="text-on-surface font-semibold">{data.batch.breaking_capacity_ka} kA</span></div>
                  <div className="font-code-timestamp text-code-timestamp text-outline pt-1 border-t border-outline-variant/30">REF: IS/IEC 60898-1</div>
                </div>

                {/* Electrical Summary */}
                <div className="bg-surface-container-low p-space-lg rounded-xl border border-outline-variant/30 space-y-1.5 font-body-sm text-body-sm">
                  <div className="font-label-caps text-label-caps text-tertiary font-bold uppercase">Electrical Results</div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Peak Current:</span>
                    <span className="font-bold text-tertiary">{data.result?.peak_current?.toFixed(1)} A</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">RMS Current:</span>
                    <span className="font-semibold text-on-surface">{data.result?.rms_current?.toFixed(1)} A</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">RMS Voltage:</span>
                    <span className="font-semibold text-on-surface">{data.result?.rms_voltage?.toFixed(1)} V</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">I / In Ratio:</span>
                    <span className="font-bold text-primary">{data.result?.i_over_in?.toFixed(2)} ×</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Joule Integral I²t:</span>
                    <span className="font-bold text-secondary">{data.result?.i2t_value?.toFixed(1)} A²s</span>
                  </div>
                </div>

                {/* Performance & Compliance */}
                <div className="bg-surface-container-low p-space-lg rounded-xl border border-outline-variant/30 space-y-1.5 font-body-sm text-body-sm">
                  <div className="font-label-caps text-label-caps text-primary font-bold uppercase">Tripping &amp; Thermal</div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Measured Trip Time:</span>
                    <span className={`font-bold text-headline-sm ${isPass ? 'text-tertiary' : 'text-error'}`}>
                      {data.result?.trip_time_ms?.toFixed(1)} ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Standard Boundary:</span>
                    <span className="text-on-surface">{data.result?.standard_limit_min_ms} – {data.result?.standard_limit_max_ms} ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Initial / Max Temp:</span>
                    <span className="text-on-surface">{data.result?.initial_temp}°C / {data.result?.max_temp}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Temperature Rise ΔT:</span>
                    <span className="font-bold text-tertiary">+{data.result?.temp_rise}°C</span>
                  </div>
                  {data.result?.failure_reason && (
                    <div className="font-code-timestamp text-code-timestamp text-error bg-error-container/30 p-1.5 rounded border border-error/30 mt-1">
                      {data.result.failure_reason}
                    </div>
                  )}
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-space-md pt-space-md border-t border-outline-variant/30">
                <button
                  onClick={() => onOpenQR(testId, data.batch.verify_url || `http://localhost:5173/verify/${testId}`, data.batch.qr_code_data_url || '')}
                  className="px-space-lg py-2 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container font-title-md text-title-md font-semibold flex items-center gap-space-xs cursor-pointer border border-outline-variant/30"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">qr_code</span>
                  <span>View QR Code</span>
                </button>
                <button
                  onClick={() => onOpenReport(testId)}
                  className="px-space-xl py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-title-md text-title-md font-semibold flex items-center gap-space-xs shadow-sm cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">description</span>
                  <span>Open Full Certificate Report</span>
                </button>
              </div>
            </>
          ) : null}
        </div>

      </div>
    </div>
  );
};
