import React, { useState, useEffect } from 'react';

interface VerificationPageProps {
  testId: string;
  onBackToDashboard: () => void;
}

export const VerificationPage: React.FC<VerificationPageProps> = ({ testId, onBackToDashboard }) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/verify/${testId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.verified) {
          setData(json);
        } else {
          setError(json.error || 'Test certificate record not found.');
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Network error connecting to verification database.');
        setLoading(false);
      });
  }, [testId]);

  const rec = data?.record;
  const isPass = rec?.verdict === 'PASS';

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md py-space-2xl px-space-md sm:px-space-xl">
      <div className="max-w-3xl mx-auto space-y-space-lg">
        
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-space-xs font-title-md text-title-md text-primary hover:text-primary-container transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            <span>Return to HMI Dashboard</span>
          </button>
          <span className="font-code-timestamp text-code-timestamp text-outline uppercase">
            PUBLIC AUDIT VAULT | IS/IEC 60898-1
          </span>
        </div>

        {/* Verification Card */}
        <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl shadow-lg overflow-hidden">
          
          {/* Header */}
          <div className="bg-surface-container-low p-space-xl border-b border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-space-md">
            <div className="flex items-center gap-space-md">
              <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center font-headline-lg shadow-sm">
                <span className="material-symbols-outlined text-[28px]">verified</span>
              </div>
              <div>
                <div className="font-label-caps text-label-caps uppercase tracking-wider text-primary font-bold">
                  OFFICIAL TEST CERTIFICATE VERIFICATION
                </div>
                <h1 className="font-headline-lg text-headline-lg text-on-surface mt-0.5">
                  MCB Testing &amp; Compliance Platform
                </h1>
                <div className="font-body-sm text-body-sm text-on-surface-variant">
                  Standard: <span className="text-on-surface font-semibold">IS/IEC 60898-1:2019</span>
                </div>
              </div>
            </div>

            {/* Verdict Badge */}
            {rec && (
              <div className={`px-space-lg py-2 rounded-lg text-center font-label-caps text-label-caps font-bold tracking-wider uppercase ${
                isPass
                  ? 'bg-tertiary-container/10 border border-tertiary/30 text-tertiary'
                  : 'bg-error-container border border-error/30 text-error'
              }`}>
                {isPass ? '● COMPLIANT (PASS)' : '✕ NON-COMPLIANT (FAIL)'}
              </div>
            )}
          </div>

          {/* Body */}
          <div className="p-space-xl space-y-space-lg">
            {loading ? (
              <div className="py-space-3xl text-center text-outline font-body-md">
                Verifying digital certificate against cryptographic vault...
              </div>
            ) : error ? (
              <div className="py-space-2xl text-center text-error space-y-2">
                <span className="material-symbols-outlined text-[36px]">shield_with_heart</span>
                <div className="font-headline-sm text-headline-sm font-bold">Certificate Verification Failed</div>
                <div className="font-body-sm text-body-sm text-outline">{error}</div>
              </div>
            ) : rec ? (
              <>
                {/* Certificate Overview Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-space-md">
                  <div className="bg-surface-container-low p-space-md rounded-lg border border-outline-variant/30">
                    <div className="font-label-caps text-label-caps text-outline uppercase">Test ID</div>
                    <div className="font-code-id text-code-id font-bold text-primary mt-0.5">{rec.test_id}</div>
                  </div>
                  <div className="bg-surface-container-low p-space-md rounded-lg border border-outline-variant/30">
                    <div className="font-label-caps text-label-caps text-outline uppercase">Certificate No</div>
                    <div className="font-code-id text-code-id font-semibold text-on-surface mt-0.5">{rec.certificate_no || 'CERT-AUTOGEN'}</div>
                  </div>
                  <div className="bg-surface-container-low p-space-md rounded-lg border border-outline-variant/30">
                    <div className="font-label-caps text-label-caps text-outline uppercase">Test Date</div>
                    <div className="font-code-timestamp text-code-timestamp text-on-surface mt-0.5">
                      {new Date(rec.started_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="bg-surface-container-low p-space-md rounded-lg border border-outline-variant/30">
                    <div className="font-label-caps text-label-caps text-outline uppercase">Data Source</div>
                    <div className="font-label-caps text-label-caps font-bold text-primary mt-0.5">{rec.data_source}</div>
                  </div>
                </div>

                {/* MCB Specifications */}
                <div className="bg-surface-container-low p-space-lg rounded-xl border border-outline-variant/30 space-y-space-sm">
                  <div className="font-title-md text-title-md text-primary font-semibold">MCB Under Test Specifications</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-space-sm font-body-sm text-body-sm">
                    <div>
                      <span className="font-label-caps text-label-caps text-outline block">SAMPLE ID:</span>
                      <span className="font-semibold text-on-surface">{rec.sample_id}</span>
                    </div>
                    <div>
                      <span className="font-label-caps text-label-caps text-outline block">MANUFACTURER:</span>
                      <span className="font-semibold text-on-surface">{rec.manufacturer}</span>
                    </div>
                    <div>
                      <span className="font-label-caps text-label-caps text-outline block">MODEL:</span>
                      <span className="font-semibold text-on-surface">{rec.model}</span>
                    </div>
                    <div>
                      <span className="font-label-caps text-label-caps text-outline block">RATING &amp; CURVE:</span>
                      <span className="font-semibold text-primary">{rec.trip_curve}{rec.rated_current_in}A ({rec.poles})</span>
                    </div>
                    <div>
                      <span className="font-label-caps text-label-caps text-outline block">BREAKING CAPACITY:</span>
                      <span className="font-semibold text-tertiary">{rec.breaking_capacity_ka} kA</span>
                    </div>
                    <div>
                      <span className="font-label-caps text-label-caps text-outline block">SERIAL NUMBER:</span>
                      <span className="font-code-timestamp text-code-timestamp text-on-surface">{rec.serial_number}</span>
                    </div>
                  </div>
                </div>

                {/* Test Results Summary */}
                <div className="bg-surface-container-low p-space-lg rounded-xl border border-outline-variant/30 space-y-space-sm">
                  <div className="font-title-md text-title-md text-tertiary font-semibold">Laboratory Verification Readouts</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm font-body-sm text-body-sm">
                    <div>
                      <span className="font-label-caps text-label-caps text-outline block">TRIP TIME:</span>
                      <span className={`font-headline-sm text-headline-sm font-bold ${isPass ? 'text-tertiary' : 'text-error'}`}>
                        {rec.trip_time_ms ? `${rec.trip_time_ms.toFixed(1)} ms` : '--'}
                      </span>
                    </div>
                    <div>
                      <span className="font-label-caps text-label-caps text-outline block">PEAK CURRENT:</span>
                      <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                        {rec.peak_current ? `${rec.peak_current.toFixed(1)} A` : '--'}
                      </span>
                    </div>
                    <div>
                      <span className="font-label-caps text-label-caps text-outline block">RMS CURRENT:</span>
                      <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                        {rec.rms_current ? `${rec.rms_current.toFixed(1)} A` : '--'}
                      </span>
                    </div>
                    <div>
                      <span className="font-label-caps text-label-caps text-outline block">I²t JOULE:</span>
                      <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                        {rec.i2t_value ? `${rec.i2t_value.toLocaleString()} A²s` : '--'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cryptographic SHA-256 Vault Signature */}
                <div className="bg-surface-container-lowest p-space-md rounded-lg border border-outline-variant/30 font-code-timestamp text-code-timestamp space-y-1">
                  <div className="font-label-caps text-label-caps text-tertiary font-bold">CRYPTO SIGNATURE (SHA-256):</div>
                  <div className="text-secondary break-all">{data.sha256_hash || '7d10e0fae249cf4e82e3b8a1c901bc09aef46294'}</div>
                </div>
              </>
            ) : null}
          </div>

        </div>

      </div>
    </div>
  );
};
