import React from 'react';
import { Layers, Plus, Sliders, Zap } from 'lucide-react';
import { MCBSample } from '../types';

interface MCBSamplePanelProps {
  samples: MCBSample[];
  selectedSample: MCBSample | null;
  onSelectSample: (sample: MCBSample) => void;
  onAddNewSample: () => void;
  testType: string;
  setTestType: (type: string) => void;
  scenario: string;
  setScenario: (scenario: string) => void;
  targetMultiplier: number;
  setTargetMultiplier: (m: number) => void;
  disabled: boolean;
}

export const MCBSamplePanel: React.FC<MCBSamplePanelProps> = ({
  samples,
  selectedSample,
  onSelectSample,
  onAddNewSample,
  testType,
  setTestType,
  scenario,
  setScenario,
  targetMultiplier,
  setTargetMultiplier,
  disabled
}) => {
  const ratedIn = selectedSample?.rated_current_in || 32;
  const targetCurrent = +(ratedIn * targetMultiplier).toFixed(1);

  const handleTestTypeChange = (type: string) => {
    setTestType(type);
    if (type === 'MAGNETIC_TRIP_5In') {
      setTargetMultiplier(5.0);
    } else if (type === 'SHORT_CIRCUIT_10In') {
      setTargetMultiplier(10.0);
    } else if (type === 'OVERLOAD_1.45In') {
      setTargetMultiplier(1.45);
    }
  };

  return (
    <div className="flex flex-col gap-3 font-mono text-xs">
      
      {/* 1. MCB CONFIGURATION (STITCH MATCH) */}
      <section className="bg-[#151c27] border border-[#3c494d]/80 p-3 flex flex-col gap-2 rounded">
        <div className="flex items-center justify-between border-b border-[#3c494d]/60 pb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#48d7f9] text-[16px]">settings_input_component</span>
            <span className="font-bold tracking-wider uppercase text-[#dce2f2] text-xs">MCB CONFIGURATION</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#48d7f9] bg-[#19202b] px-1.5 py-0.5 border border-[#3c494d] rounded">
              {selectedSample?.standard_ref || 'IS/IEC 60898-1'}
            </span>
            <button
              onClick={onAddNewSample}
              className="text-[10px] px-1.5 py-0.5 bg-[#19202b] hover:bg-[#232a36] text-[#bcc9cd] hover:text-white rounded border border-[#3c494d] flex items-center gap-0.5 transition-colors"
              disabled={disabled}
              title="Add New MCB"
            >
              <Plus className="w-3 h-3 text-[#48d7f9]" />
              <span>NEW</span>
            </button>
          </div>
        </div>

        {/* MCB Selector */}
        <div>
          <select
            value={selectedSample?.sample_id || ''}
            onChange={(e) => {
              const found = samples.find((s) => s.sample_id === e.target.value);
              if (found) onSelectSample(found);
            }}
            disabled={disabled}
            className="w-full bg-[#070e19] border border-[#3c494d] text-[#dce2f2] font-mono text-xs px-2 py-1 rounded focus:outline-none focus:border-[#48d7f9]"
          >
            {samples.map((s) => (
              <option key={s.sample_id} value={s.sample_id}>
                {s.sample_id} — {s.manufacturer} {s.model} ({s.trip_curve}{s.rated_current_in}A)
              </option>
            ))}
          </select>
        </div>

        {/* Specifications Grid */}
        {selectedSample && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1 text-[11px]">
            <div className="flex flex-col">
              <span className="text-[9px] text-[#bcc9cd] uppercase">Sample Ref</span>
              <span className="font-semibold text-[#48d7f9] truncate">{selectedSample.sample_id}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-[#bcc9cd] uppercase">Manufacturer</span>
              <span className="font-medium text-[#dce2f2] truncate">{selectedSample.manufacturer}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-[#bcc9cd] uppercase">Model Series</span>
              <span className="text-[#dce2f2] truncate">{selectedSample.model}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-[#bcc9cd] uppercase">Rated Current (In)</span>
              <span className="font-bold text-[#44dfab] text-sm">
                {selectedSample.rated_current_in} <span className="text-[10px] text-[#bcc9cd] font-normal">A</span>
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-[#bcc9cd] uppercase">Trip Curve</span>
              <div className="flex items-center gap-1">
                <span className="font-bold text-[#f9bc45] text-sm">{selectedSample.trip_curve}</span>
                <span className="text-[9px] text-[#bcc9cd]">
                  ({selectedSample.trip_curve === 'B' ? '3–5 In' : selectedSample.trip_curve === 'C' ? '5–10 In' : '10–20 In'})
                </span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-[#bcc9cd] uppercase">Poles / Voltage</span>
              <span className="text-[#dce2f2]">{selectedSample.poles} / {selectedSample.rated_voltage}V AC</span>
            </div>
            <div className="col-span-2 flex items-center justify-between pt-1 border-t border-[#3c494d]/60">
              <span className="text-[9px] text-[#bcc9cd] uppercase">Breaking Capacity (Icn)</span>
              <span className="font-bold text-[#48d7f9]">{selectedSample.breaking_capacity_ka * 1000} A ({selectedSample.breaking_capacity_ka}kA)</span>
            </div>
          </div>
        )}
      </section>

      {/* 2. TEST PROFILE & STIMULUS (STITCH MATCH) */}
      <section className="bg-[#151c27] border border-[#3c494d]/80 p-3 flex flex-col gap-2 rounded">
        <div className="flex items-center justify-between border-b border-[#3c494d]/60 pb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#48d7f9] text-[16px]">tune</span>
            <span className="font-bold tracking-wider uppercase text-[#dce2f2] text-xs">TEST PROFILE &amp; STIMULUS</span>
          </div>
          <span className="text-[10px] text-[#44dfab] font-semibold">STAGE 05</span>
        </div>

        {/* Ratio Quick Buttons */}
        <div className="flex flex-col gap-1 pt-0.5">
          <label className="text-[9px] text-[#bcc9cd] uppercase">Test Ratio Multiplier</label>
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => handleTestTypeChange('MAGNETIC_TRIP_5In')}
              disabled={disabled}
              className={`py-1 px-1.5 font-mono text-[11px] font-bold text-center border transition-colors ${
                testType === 'MAGNETIC_TRIP_5In'
                  ? 'bg-[#00b8d9] text-[#003641] border-[#48d7f9]'
                  : 'bg-[#19202b] hover:bg-[#232a36] text-[#dce2f2] border-[#3c494d]'
              }`}
            >
              5.0 × In
            </button>
            <button
              type="button"
              onClick={() => handleTestTypeChange('SHORT_CIRCUIT_10In')}
              disabled={disabled}
              className={`py-1 px-1.5 font-mono text-[11px] font-bold text-center border transition-colors ${
                testType === 'SHORT_CIRCUIT_10In'
                  ? 'bg-[#00b8d9] text-[#003641] border-[#48d7f9]'
                  : 'bg-[#19202b] hover:bg-[#232a36] text-[#dce2f2] border-[#3c494d]'
              }`}
            >
              10.0 × In
            </button>
            <button
              type="button"
              onClick={() => handleTestTypeChange('OVERLOAD_1.45In')}
              disabled={disabled}
              className={`py-1 px-1.5 font-mono text-[11px] font-bold text-center border transition-colors ${
                testType === 'OVERLOAD_1.45In'
                  ? 'bg-[#00b8d9] text-[#003641] border-[#48d7f9]'
                  : 'bg-[#19202b] hover:bg-[#232a36] text-[#dce2f2] border-[#3c494d]'
              }`}
            >
              1.45 × In
            </button>
          </div>
        </div>

        {/* Target Readout Tile */}
        <div className="grid grid-cols-2 gap-2 bg-[#19202b] p-2 border border-[#3c494d] rounded">
          <div className="flex flex-col">
            <span className="text-[9px] text-[#bcc9cd] uppercase">Target Ratio</span>
            <span className="font-bold text-[#48d7f9] text-sm">{targetMultiplier.toFixed(2)} ×</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[9px] text-[#bcc9cd] uppercase">Target Current</span>
            <span className="font-bold text-[#f9bc45] text-sm">{targetCurrent} A</span>
          </div>
        </div>

        {/* Scenario Selector */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] text-[#bcc9cd] uppercase flex justify-between">
            <span>Test Scenario Script</span>
            <span className="text-[#44dfab]">READY</span>
          </label>
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            disabled={disabled}
            className="w-full bg-[#070e19] border border-[#3c494d] text-[#dce2f2] font-mono text-xs px-2 py-1 rounded focus:outline-none focus:border-[#48d7f9]"
          >
            <option value="NORMAL_TEST">Normal Test (IS/IEC 60898-1 Instantaneous)</option>
            <option value="OVERLOAD">Overload (1.45 In Thermal Trip)</option>
            <option value="HIGH_CURRENT">High Current (10.0 In Magnetic Threshold)</option>
            <option value="MCB_FAIL_TO_TRIP">MCB Fail To Trip (Simulated Stuck Contact)</option>
            <option value="TEMPERATURE_SENSOR_FAULT">Temperature Sensor Fault (PT100 Fault)</option>
            <option value="CURRENT_SENSOR_FAULT">Current Sensor Fault (Hall Fault)</option>
            <option value="VOLTAGE_SENSOR_FAULT">Voltage Sensor Fault (Zero Potential)</option>
            <option value="CONTACTOR_FAILURE">Contactor Failure (Pole Mismatch)</option>
            <option value="EMERGENCY_STOP">Emergency Stop Trigger Sequence</option>
          </select>
        </div>
      </section>

    </div>
  );
};
