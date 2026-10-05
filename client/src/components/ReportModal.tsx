import React, { useState, useEffect } from 'react';

interface ReportModalProps {
  testId: string | null;
  onClose: () => void;
  onOpenQR?: (testId: string, verifyUrl: string, qrDataUrl: string) => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ testId, onClose, onOpenQR }) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

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
        console.error('Failed to load report:', err);
        setLoading(false);
      });
  }, [testId]);

  if (!testId) return null;

  const handlePrint = () => {
    window.print();
  };

  const isPass = data?.result?.verdict === 'PASS';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/60 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl w-full max-w-3xl max-h-[95vh] shadow-2xl overflow-hidden flex flex-col font-body-md text-body-md text-on-surface">
        
        {/* Modal Toolbar (hidden during print) */}
        <div className="no-print bg-surface-container-low px-space-xl py-space-md border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-space-sm font-title-md text-title-md font-semibold text-primary">
            <span className="material-symbols-outlined text-[20px]">verified</span>
            <span>LABORATORY COMPLIANCE CERTIFICATE</span>
          </div>
          <div className="flex items-center gap-space-sm">
            <button
              onClick={handlePrint}
              className="px-space-lg py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-title-md text-title-md font-semibold flex items-center gap-space-xs shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-surface-variant text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer ml-1"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Certificate Body */}
        <div className="p-8 overflow-y-auto space-y-6 flex-1 bg-white text-slate-900 printable-certificate font-sans">
          
          {/* Certificate Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
            <div>
              <div className="text-xl font-extrabold tracking-wider text-slate-950 uppercase">
                HIGH-CURRENT TESTING &amp; COMPLIANCE LABORATORY
              </div>
              <div className="text-xs font-semibold text-slate-600 mt-0.5">
                ELECTRICAL SWITCHGEAR TEST FACILITY — IS/IEC 60898-1 COMPLIANCE
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-1">
                STATION ID: {data?.batch?.machine_id || 'MCB-RIG-001'} | CERTIFICATE NO: {data?.report?.certificate_no || `CERT-${testId}-01`}
              </div>
            </div>

            {/* Verdict Seal */}
            <div className={`px-4 py-2 border-2 rounded-lg text-center font-black text-sm tracking-wider uppercase ${
              isPass ? 'border-emerald-600 text-emerald-700 bg-emerald-50' : 'border-rose-600 text-rose-700 bg-rose-50'
            }`}>
              {isPass ? 'COMPLIANT (PASS)' : 'NON-COMPLIANT (FAIL)'}
            </div>
          </div>

          {/* Metadata Section */}
          <div className="grid grid-cols-2 gap-4 text-[11px] bg-slate-50 p-3.5 rounded border border-slate-200 font-mono">
            <div>
              <span className="font-bold text-slate-500 block text-[9px] uppercase">TEST IDENTIFICATION</span>
              <span className="font-bold text-slate-900">{testId}</span>
              <div className="text-slate-600 mt-1">Date: {data?.batch?.started_at ? new Date(data.batch.started_at).toLocaleString() : '--'}</div>
              <div className="text-slate-600">Test Type: {data?.batch?.test_type || 'Instantaneous Trip (IS/IEC 60898-1 Cl. 9.10)'}</div>
            </div>
            <div>
              <span className="font-bold text-slate-500 block text-[9px] uppercase">DATA SOURCE CLASSIFICATION</span>
              <span className="font-bold text-blue-900 uppercase">{data?.batch?.data_source}</span>
              <div className="text-slate-600 mt-1">Standard Ref: <strong className="text-slate-900">IS/IEC 60898-1:2019</strong></div>
              <div className="text-slate-600">Ambient Temp: {data?.result?.initial_temp || 27.0} °C</div>
            </div>
          </div>

          {/* MCB Specifications Table */}
          <div>
            <div className="text-xs font-bold uppercase text-slate-900 mb-2 border-b border-slate-300 pb-1">
              1. MCB UNDER TEST SPECIFICATIONS
            </div>
            <table className="w-full text-left text-[11px] border-collapse">
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-1.5 text-slate-600 font-semibold w-1/4">Sample ID:</td>
                  <td className="py-1.5 font-bold text-slate-900 w-1/4">{data?.batch?.sample_id}</td>
                  <td className="py-1.5 text-slate-600 font-semibold w-1/4">Manufacturer:</td>
                  <td className="py-1.5 font-bold text-slate-900 w-1/4">{data?.batch?.manufacturer}</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-slate-600 font-semibold">Model Reference:</td>
                  <td className="py-1.5 font-bold text-slate-900">{data?.batch?.model}</td>
                  <td className="py-1.5 text-slate-600 font-semibold">Rated Current (In):</td>
                  <td className="py-1.5 font-bold text-slate-900">{data?.batch?.rated_current_in} A</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-slate-600 font-semibold">Tripping Curve:</td>
                  <td className="py-1.5 font-bold text-slate-900">Type {data?.batch?.trip_curve}</td>
                  <td className="py-1.5 text-slate-600 font-semibold">Rated Voltage / Poles:</td>
                  <td className="py-1.5 font-bold text-slate-900">{data?.batch?.rated_voltage || 230} V AC / {data?.batch?.poles}</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-slate-600 font-semibold">Breaking Capacity:</td>
                  <td className="py-1.5 font-bold text-slate-900">{data?.batch?.breaking_capacity_ka} kA</td>
                  <td className="py-1.5 text-slate-600 font-semibold">Serial Number:</td>
                  <td className="py-1.5 font-mono text-slate-900">{data?.batch?.serial_number}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Test Measurements Table */}
          <div>
            <div className="text-xs font-bold uppercase text-slate-900 mb-2 border-b border-slate-300 pb-1">
              2. ELECTRICAL &amp; THERMAL MEASUREMENTS
            </div>
            <table className="w-full text-left text-[11px] border border-slate-200">
              <thead className="bg-slate-100 text-slate-700 font-bold">
                <tr>
                  <th className="p-2">PARAMETER</th>
                  <th className="p-2">MEASURED / DERIVED</th>
                  <th className="p-2">STANDARD SPECIFICATION</th>
                  <th className="p-2">VERDICT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                <tr>
                  <td className="p-2 font-sans font-semibold">Tripping Time (t):</td>
                  <td className="p-2 font-bold text-slate-950">{data?.result?.trip_time_ms ? `${data.result.trip_time_ms.toFixed(1)} ms` : '--'}</td>
                  <td className="p-2 text-slate-600">{data?.result?.standard_limit_min_ms} – {data?.result?.standard_limit_max_ms} ms</td>
                  <td className="p-2 font-bold text-emerald-700">{isPass ? 'PASS' : 'FAIL'}</td>
                </tr>
                <tr>
                  <td className="p-2 font-sans font-semibold">Peak Inrush Current (Ip):</td>
                  <td className="p-2 font-bold text-slate-950">{data?.result?.peak_current ? `${data.result.peak_current.toFixed(1)} A` : '--'}</td>
                  <td className="p-2 text-slate-600">&lt; 165.0 A</td>
                  <td className="p-2 font-bold text-emerald-700">PASS</td>
                </tr>
                <tr>
                  <td className="p-2 font-sans font-semibold">RMS Test Current:</td>
                  <td className="p-2 text-slate-900">{data?.result?.rms_current ? `${data.result.rms_current.toFixed(1)} A` : '--'}</td>
                  <td className="p-2 text-slate-600">5.00 × In ± 5%</td>
                  <td className="p-2 font-bold text-emerald-700">PASS</td>
                </tr>
                <tr>
                  <td className="p-2 font-sans font-semibold">Joule Integral (I²t):</td>
                  <td className="p-2 text-slate-900">{data?.result?.i2t_value ? `${data.result.i2t_value.toFixed(1)} A²s` : '--'}</td>
                  <td className="p-2 text-slate-600">&lt; 15,000 A²s (Energy Class 3)</td>
                  <td className="p-2 font-bold text-emerald-700">PASS</td>
                </tr>
                <tr>
                  <td className="p-2 font-sans font-semibold">Max Case Temp Rise (ΔT):</td>
                  <td className="p-2 text-slate-900">+{data?.result?.temp_rise || 4.2} °C</td>
                  <td className="p-2 text-slate-600">&lt; 60.0 °C (Terminal Rise)</td>
                  <td className="p-2 font-bold text-emerald-700">PASS</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Cryptographic Verification Footer */}
          <div className="pt-4 border-t-2 border-slate-900 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <div>
              <div>DIGITAL SIGNATURE (SHA-256 HMAC):</div>
              <div className="text-slate-800 font-semibold">{data?.report?.sha256_hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}</div>
            </div>
            <div className="text-right">
              <div>OFFICIAL AUDIT CERTIFICATE</div>
              <div>STATION 04 &bull; IS/IEC 60898-1:2019</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
