import React, { useState } from 'react';
import { MCBSample } from '../types';

interface MCBSamplesViewProps {
  samples: MCBSample[];
  onAddNewSample: () => void;
  onSelectForTest: (sample: MCBSample) => void;
}

export const MCBSamplesView: React.FC<MCBSamplesViewProps> = ({
  samples,
  onAddNewSample,
  onSelectForTest
}) => {
  const [search, setSearch] = useState('');
  const [curveFilter, setCurveFilter] = useState('ALL');

  const filtered = samples.filter((s) => {
    const matchSearch =
      s.sample_id.toLowerCase().includes(search.toLowerCase()) ||
      s.manufacturer.toLowerCase().includes(search.toLowerCase()) ||
      s.model.toLowerCase().includes(search.toLowerCase());
    const matchCurve = curveFilter === 'ALL' || s.trip_curve === curveFilter;
    return matchSearch && matchCurve;
  });

  return (
    <div className="w-full max-w-[1600px] mx-auto px-space-md sm:px-space-xl lg:px-space-2xl py-space-xl flex flex-col gap-space-xl">
      
      {/* Header Banner */}
      <div className="bg-surface-container-lowest p-space-xl rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-lg">
        <div className="flex items-center gap-space-md">
          <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center font-headline-sm">
            <span className="material-symbols-outlined text-on-primary-container">inventory_2</span>
          </div>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">MCB Sample Inventory &amp; Catalog</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Specimens registered for compliance testing conforming to IS/IEC 60898-1 standard.
            </p>
          </div>
        </div>

        <button
          onClick={onAddNewSample}
          className="px-space-lg py-2.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container transition-all font-title-md text-title-md font-semibold flex items-center gap-space-xs shadow-sm cursor-pointer"
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          <span>Register New MCB Sample</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-space-md">
        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search by Sample ID, Brand, Model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg pl-9 pr-3 py-2 text-on-surface font-body-md text-body-md placeholder:text-outline focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-space-sm w-full md:w-auto">
          <span className="font-label-caps text-label-caps text-secondary">Filter by Curve:</span>
          <select
            value={curveFilter}
            onChange={(e) => setCurveFilter(e.target.value)}
            className="bg-surface-container-low border border-outline-variant/40 rounded-lg px-space-md py-2 text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="ALL">All Tripping Curves</option>
            <option value="B">Type B (3–5 In)</option>
            <option value="C">Type C (5–10 In)</option>
            <option value="D">Type D (10–20 In)</option>
          </select>
        </div>
      </div>

      {/* Grid of Samples */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
        {filtered.map((s) => (
          <div
            key={s.sample_id}
            className="bg-surface-container-lowest p-space-xl rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between border border-outline-variant/20 gap-space-md"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-code-id text-code-id text-primary font-semibold">{s.sample_id}</span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mt-0.5">{s.manufacturer} {s.model}</h3>
                </div>
                <span className="px-space-sm py-0.5 rounded bg-surface-container-high text-primary font-code-id text-code-id font-bold">
                  {s.trip_curve}{s.rated_current_in}A
                </span>
              </div>

              <div className="grid grid-cols-2 gap-space-sm p-space-md bg-surface-container-low rounded-lg mt-space-md">
                <div>
                  <span className="font-label-caps text-label-caps text-outline block">RATED CURRENT</span>
                  <span className="font-headline-sm text-headline-sm text-on-surface">{s.rated_current_in} A</span>
                </div>
                <div>
                  <span className="font-label-caps text-label-caps text-outline block">TRIP CURVE</span>
                  <span className="font-headline-sm text-headline-sm text-primary">Curve {s.trip_curve}</span>
                </div>
                <div>
                  <span className="font-label-caps text-label-caps text-outline block">VOLTAGE / POLES</span>
                  <span className="font-body-md text-body-md text-on-surface font-semibold">{s.rated_voltage}V / {s.poles}</span>
                </div>
                <div>
                  <span className="font-label-caps text-label-caps text-outline block">BREAKING CAPACITY</span>
                  <span className="font-body-md text-body-md text-tertiary font-bold">{s.breaking_capacity_ka} kA</span>
                </div>
              </div>
            </div>

            <div className="pt-space-sm border-t border-surface-container flex items-center justify-between">
              <span className="font-code-timestamp text-code-timestamp text-outline">REF: {s.standard_ref}</span>
              <button
                onClick={() => onSelectForTest(s)}
                className="px-space-md py-1.5 rounded-lg bg-surface-container-low hover:bg-primary hover:text-on-primary text-primary font-title-md text-title-md font-semibold transition-colors cursor-pointer border border-primary/20"
                type="button"
              >
                Load to Test Bay
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
