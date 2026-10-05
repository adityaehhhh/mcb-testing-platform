import React, { useState, useEffect } from 'react';

export const SettingsView: React.FC = () => {
  const [standards, setStandards] = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/standards/iec60898')
      .then((res) => res.json())
      .then((data) => setStandards(data))
      .catch((err) => console.error('Failed to load standard specs:', err));
  }, []);

  return (
    <div className="w-full max-w-[1600px] mx-auto px-space-md sm:px-space-xl lg:px-space-2xl py-space-xl flex flex-col gap-space-xl">
      
      {/* Header */}
      <div className="bg-surface-container-lowest p-space-xl rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-lg">
        <div className="flex items-center gap-space-md">
          <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center font-headline-sm">
            <span className="material-symbols-outlined text-on-primary-container">settings</span>
          </div>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Compliance Standards &amp; System Configuration</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              IS/IEC 60898-1 Tripping Boundary Definitions &amp; Laboratory Thresholds.
            </p>
          </div>
        </div>
      </div>

      {/* IEC Standard Reference Cards */}
      <div className="bg-surface-container-lowest p-space-xl rounded-xl shadow-sm flex flex-col gap-space-lg">
        <div className="flex items-center gap-space-sm font-title-md text-title-md text-primary font-semibold">
          <span className="material-symbols-outlined text-[20px]">menu_book</span>
          <span>IS/IEC 60898-1: Tripping Characteristics Specifications</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
          {/* Curve B */}
          <div className="bg-surface-container-low p-space-xl rounded-xl flex flex-col justify-between gap-space-md border border-outline-variant/30">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-headline-sm text-headline-sm text-on-surface">TYPE B CURVE</span>
                <span className="px-space-md py-1 rounded bg-surface-container-high text-primary font-label-caps text-label-caps font-bold">
                  3 In – 5 In
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-sm">
                For protection of domestic lighting and resistive heating circuits with minimal inrush surges.
              </p>
            </div>
            <div className="font-code-timestamp text-code-timestamp text-on-surface space-y-1 bg-surface-container-lowest p-space-md rounded-lg border border-outline-variant/30">
              <div>Instantaneous Trip Time: <strong className="text-primary font-semibold">0.01 s – 0.04 s</strong></div>
              <div>Thermal Overload @ 1.45 In: <strong className="text-secondary font-semibold">&lt; 1 hour</strong></div>
            </div>
          </div>

          {/* Curve C */}
          <div className="bg-surface-container-low p-space-xl rounded-xl flex flex-col justify-between gap-space-md border border-outline-variant/30">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-headline-sm text-headline-sm text-on-surface">TYPE C CURVE</span>
                <span className="px-space-md py-1 rounded bg-surface-container-high text-primary font-label-caps text-label-caps font-bold">
                  5 In – 10 In
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-sm">
                General commercial switchgear, inductive motor loads, fluorescent lighting, and socket outlets.
              </p>
            </div>
            <div className="font-code-timestamp text-code-timestamp text-on-surface space-y-1 bg-surface-container-lowest p-space-md rounded-lg border border-outline-variant/30">
              <div>Instantaneous Trip Time: <strong className="text-primary font-semibold">0.01 s – 0.06 s</strong></div>
              <div>Thermal Overload @ 1.45 In: <strong className="text-secondary font-semibold">&lt; 1 hour</strong></div>
            </div>
          </div>

          {/* Curve D */}
          <div className="bg-surface-container-low p-space-xl rounded-xl flex flex-col justify-between gap-space-md border border-outline-variant/30">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-headline-sm text-headline-sm text-on-surface">TYPE D CURVE</span>
                <span className="px-space-md py-1 rounded bg-surface-container-high text-primary font-label-caps text-label-caps font-bold">
                  10 In – 20 In
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-sm">
                High inrush industrial loads, X-ray machinery, large transformers, and heavy motor drives.
              </p>
            </div>
            <div className="font-code-timestamp text-code-timestamp text-on-surface space-y-1 bg-surface-container-lowest p-space-md rounded-lg border border-outline-variant/30">
              <div>Instantaneous Trip Time: <strong className="text-primary font-semibold">0.01 s – 0.10 s</strong></div>
              <div>Thermal Overload @ 1.45 In: <strong className="text-secondary font-semibold">&lt; 1 hour</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* Database & Audit Configuration */}
      <div className="bg-surface-container-lowest p-space-xl rounded-xl shadow-sm flex flex-col gap-space-md">
        <div className="flex items-center gap-space-sm font-title-md text-title-md text-tertiary font-semibold">
          <span className="material-symbols-outlined text-[20px]">database</span>
          <span>Database &amp; Compliance Audit Trail</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md font-body-sm text-body-sm">
          <div className="bg-surface-container-low p-space-lg rounded-xl border border-outline-variant/30 space-y-1">
            <div className="text-on-surface-variant">Storage Backend: <strong className="text-on-surface">SQLite 3 / PostgreSQL Compatible</strong></div>
            <div className="text-on-surface-variant">Cryptographic Signing: <strong className="text-tertiary font-semibold">SHA-256 HMAC</strong></div>
            <div className="text-on-surface-variant">Schema Version: <strong className="text-primary font-semibold">v1.2.0-certified</strong></div>
          </div>
          <div className="bg-surface-container-low p-space-lg rounded-xl border border-outline-variant/30 space-y-1">
            <div className="text-on-surface-variant">Telemetry Frequency: <strong className="text-primary font-semibold">20 Hz (50ms per frame)</strong></div>
            <div className="text-on-surface-variant">High-Speed Waveform ADC: <strong className="text-tertiary font-semibold">200 kS/s (1.0ms resolution)</strong></div>
            <div className="text-on-surface-variant">Heartbeat Timeout: <strong className="text-on-surface font-semibold">6.0 seconds</strong></div>
          </div>
        </div>
      </div>

    </div>
  );
};
