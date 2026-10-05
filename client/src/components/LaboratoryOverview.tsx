import React from 'react';
import { SystemStatus, TelemetryData, MCBSample, TestBatch, TestEvent } from '../types';
import { Oscilloscope } from './Oscilloscope';

interface LaboratoryOverviewProps {
  status: SystemStatus;
  telemetry: TelemetryData | null;
  selectedSample: MCBSample | null;
  samples?: MCBSample[];
  onSelectSample?: (sample: MCBSample) => void;
  targetMultiplier: number;
  setTargetMultiplier: (multiplier: number) => void;
  scenario: string;
  setScenario: (scenario: string) => void;
  testType: string;
  setTestType: (testType: string) => void;
  onStartTest: () => void;
  onAbortTest: () => void;
  onResetFaults: () => void;
  onEmergencyStop: () => void;
  onOpenReport: (testId: string) => void;
  onOpenQR: (testId: string, verifyUrl: string, qrDataUrl: string) => void;
  onSelectBatch: (testId: string) => void;
  onViewAllBatches: () => void;
  batches: TestBatch[];
  events?: TestEvent[];
  lastCompletedTest: any | null;
  isLoading: boolean;
  onAddNewSample?: () => void;
}

export const LaboratoryOverview: React.FC<LaboratoryOverviewProps> = ({
  status,
  telemetry,
  selectedSample,
  samples = [],
  onSelectSample,
  targetMultiplier,
  setTargetMultiplier,
  scenario,
  setScenario,
  testType,
  setTestType,
  onStartTest,
  onAbortTest,
  onResetFaults,
  onEmergencyStop,
  onOpenReport,
  onOpenQR,
  onSelectBatch,
  onViewAllBatches,
  batches,
  events = [],
  lastCompletedTest,
  isLoading,
  onAddNewSample
}) => {
  const isConnected = status.connected;
  const isTesting = telemetry?.machineState === 'TESTING';
  const isPermissionReady = status.testPermission === 'READY';
  const currentStage = telemetry?.currentStage || (isConnected ? 'MACHINE READY' : 'OFFLINE');

  // Dynamic calculations from active configuration
  const ratedIn = selectedSample?.rated_current_in || 32;
  const targetCurrent = +(ratedIn * targetMultiplier).toFixed(1);

  // Live or fallback display values (strictly '--' when disconnected)
  const voltage = isConnected && telemetry ? telemetry.voltage.toFixed(1) : '--';
  const current = isConnected && telemetry ? telemetry.current.toFixed(1) : '--';
  const rmsCurrent = isConnected && telemetry ? telemetry.rmsCurrent.toFixed(2) : '--';
  const rmsVoltage = isConnected && telemetry ? telemetry.rmsVoltage.toFixed(1) : '--';
  const peakCurrent = isConnected && telemetry ? telemetry.peakCurrent.toFixed(2) : '--';
  const temperature = isConnected && telemetry ? telemetry.mcbTemp.toFixed(1) : '--';
  const tempRise = isConnected && telemetry ? `+${telemetry.tempRise.toFixed(1)}` : '--';
  const frequency = isConnected && telemetry ? telemetry.frequency.toFixed(2) : '--';
  const activePower = isConnected && telemetry ? (telemetry.power >= 1000 ? `${(telemetry.power / 1000).toFixed(2)} kW` : `${telemetry.power.toFixed(0)} W`) : '--';
  const iOverIn = isConnected && telemetry ? telemetry.iOverIn.toFixed(2) : '--';
  const i2t = isConnected && telemetry ? telemetry.i2t.toLocaleString() : '--';
  const tripTime = isConnected && telemetry && telemetry.tripTimeMs !== null 
    ? telemetry.tripTimeMs.toFixed(1) 
    : '--';

  // Control Chain & Hardware States
  const isEStop = telemetry?.emergencyStop;
  const mcbState = isConnected && telemetry ? telemetry.mcbState : 'DISCONNECTED';
  const contactorState = isConnected && telemetry ? telemetry.contactorState : 'OPEN';
  const relayState = isConnected && telemetry ? telemetry.relayState : 'OFF';
  const esp32State = isConnected && telemetry ? telemetry.esp32State : 'OFFLINE';
  const doorSafe = telemetry?.interlocks?.door ?? true;
  const curSensorOk = telemetry?.sensorHealth?.current !== 'FAULT';
  const voltSensorOk = telemetry?.sensorHealth?.voltage !== 'FAULT';
  const tempSensorOk = telemetry?.sensorHealth?.temperature !== 'FAULT';

  // 10-Stage Pipeline Mapping
  const pipelineStages = [
    { key: 'READY', label: '1. Ready', match: ['READY', 'IDLE', 'STANDBY'] },
    { key: 'INIT', label: '2. Initializing', match: ['SAFETY CHECK', 'PRE-TEST', 'CONTROLLER'] },
    { key: 'CONTACTOR', label: '3. Contactor Closed', match: ['CONTACTOR', 'CLOSING', 'CLOSED', 'LOAD PREP'] },
    { key: 'TESTING', label: '4. Current Stimulus', match: ['CURRENT APPLICATION', 'TESTING', 'MEASUREMENT'] },
    { key: 'TRIP', label: '5. Trip Detected', match: ['TRIP', 'TRIPPED', 'EXTINCTION'] },
    { key: 'COLLAPSE', label: '6. Current Collapse', match: ['COLLAPSE', 'DE-ENERGIZED'] },
    { key: 'ANALYSIS', label: '7. I²t Analysis', match: ['ANALYSIS', 'INTEGRATION', 'EVALUATION', 'COMPLIANCE'] },
    { key: 'COMPLETE', label: '8. Complete', match: ['COMPLETE', 'PASS', 'FAIL', 'ISSUED'] }
  ];

  const getPipelineStatus = (stageIndex: number) => {
    if (!isConnected) return { isComplete: false, isActive: false };
    const currentUpper = (currentStage || '').toUpperCase();

    let activeIndex = -1;
    for (let i = 0; i < pipelineStages.length; i++) {
      if (pipelineStages[i].match.some(m => currentUpper.includes(m))) {
        activeIndex = i;
        break;
      }
    }

    if (activeIndex === -1) {
      activeIndex = isTesting ? 3 : 0;
    }

    if (activeIndex > stageIndex) return { isComplete: true, isActive: false };
    if (activeIndex === stageIndex) return { isComplete: false, isActive: true };
    return { isComplete: false, isActive: false };
  };

  const recentBatches = batches.slice(0, 5);

  return (
    <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-space-xl lg:px-space-2xl py-space-xl flex flex-col gap-space-xl">
      
      {/* ============================================================== */}
      {/* 1. TOP HEADER SUMMARY BAR & RIG STATUS                          */}
      {/* ============================================================== */}
      <section className="w-full bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md border border-outline-variant/30">
        <div className="flex flex-wrap items-center gap-space-md sm:gap-space-xl">
          <div className="flex items-center gap-space-sm bg-surface-container-low px-space-md py-1.5 rounded-lg border border-outline-variant/30">
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-tertiary animate-pulse' : 'bg-outline'}`}></span>
            <span className="font-label-caps text-label-caps text-on-surface uppercase tracking-wider font-semibold">
              {isConnected ? 'Hardware Rig Online' : 'Hardware Rig Disconnected'}
            </span>
          </div>

          <div className="flex items-center gap-space-xs font-code-id text-code-id text-on-surface-variant">
            <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">RIG ID:</span>
            <span className="font-code-id text-code-id text-on-surface font-bold">{status.machineId || 'MCB-RIG-001'}</span>
          </div>

          <div className="flex items-center gap-space-xs font-code-timestamp text-code-timestamp text-secondary">
            <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">MODE:</span>
            <span className={`px-2 py-0.5 rounded font-label-caps text-label-caps font-semibold ${
              isTesting ? 'bg-primary text-on-primary animate-pulse' : isConnected ? 'bg-surface-container-high text-primary' : 'bg-surface-container-low text-outline'
            }`}>
              {isTesting ? 'LIVE TEST RUNNING' : isConnected ? 'STANDBY / READY' : 'OFFLINE'}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-space-xs font-code-timestamp text-code-timestamp text-outline">
            <span className="material-symbols-outlined text-[15px] text-tertiary">verified_user</span>
            <span>IS/IEC 60898-1 Calibrated Bus</span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-space-sm flex-wrap">
          {(isEStop || (telemetry && Object.values(telemetry.sensorHealth).some(v => v === 'FAULT'))) && (
            <button
              onClick={onResetFaults}
              className="px-space-md py-2 rounded-lg bg-surface-container-high border border-outline-variant hover:bg-surface-variant text-on-surface font-title-md text-title-md flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">restart_alt</span>
              <span>Reset Faults</span>
            </button>
          )}

          {isTesting ? (
            <button
              onClick={onAbortTest}
              className="px-space-xl py-2 rounded-lg bg-error text-on-error hover:bg-error/90 transition-all active:scale-95 shadow-sm font-title-md text-title-md font-semibold flex items-center gap-space-xs cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">power_settings_new</span>
              <span>Abort Test</span>
            </button>
          ) : (
            <button
              onClick={onStartTest}
              disabled={!isConnected || isLoading || !isPermissionReady}
              className="px-space-xl py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container transition-all active:scale-95 shadow-sm font-title-md text-title-md font-semibold flex items-center gap-space-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">play_arrow</span>
              <span>{isLoading ? 'Arming Rig...' : 'Start Live Test'}</span>
            </button>
          )}
        </div>
      </section>

      {/* ============================================================== */}
      {/* 2. REALTIME MULTI-CHANNEL SIGNAL OSCILLOSCOPE (TOP OF MAIN)    */}
      {/* ============================================================== */}
      <section className="w-full">
        <Oscilloscope
          telemetry={telemetry}
          isConnected={isConnected}
          events={events}
          lastCompletedTest={lastCompletedTest}
          activeTestId={telemetry?.activeTestId}
        />
      </section>

      {/* ============================================================== */}
      {/* 3. LIVE ELECTRICAL READINGS & INSTRUMENTATION CLUSTER          */}
      {/* ============================================================== */}
      <section className="w-full bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden flex flex-col">
        <div className="px-space-xl py-space-sm bg-surface-container-low/60 border-b border-outline-variant/20 flex flex-wrap items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-primary text-[20px]">speed</span>
            <span className="font-title-md text-title-md font-semibold text-on-surface">Calibrated Telemetry Cluster</span>
          </div>
          <div className="flex items-center gap-space-md font-code-timestamp text-code-timestamp text-outline">
            <span>Sampling: 20 Hz Synchronous</span>
            <span>•</span>
            <span className="text-tertiary flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
              Transducers Zero-Drift Verified
            </span>
          </div>
        </div>

        {/* Primary Measurement Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 p-space-lg sm:p-space-xl gap-space-md">
          {/* Voltage */}
          <div className="flex flex-col justify-between p-space-sm bg-surface-container-low/40 rounded-lg">
            <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Line Voltage</span>
            <div className="flex items-baseline gap-1 my-1">
              <span className="font-metric-xl text-metric-xl text-on-surface tracking-tight font-bold">{voltage}</span>
              <span className="font-title-md text-title-md text-outline font-medium">V</span>
            </div>
            <span className="font-code-timestamp text-code-timestamp text-secondary">
              RMS: {rmsVoltage} V
            </span>
          </div>

          {/* Current */}
          <div className="flex flex-col justify-between p-space-sm bg-surface-container-low/40 rounded-lg">
            <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Current (Actual)</span>
            <div className="flex items-baseline gap-1 my-1">
              <span className="font-metric-xl text-metric-xl text-primary font-bold tracking-tight">{current}</span>
              <span className="font-title-md text-title-md text-primary font-medium">A</span>
            </div>
            <span className="font-code-timestamp text-code-timestamp text-secondary">
              RMS: {rmsCurrent} A
            </span>
          </div>

          {/* Peak Current */}
          <div className="flex flex-col justify-between p-space-sm bg-surface-container-low/40 rounded-lg">
            <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Peak Inrush</span>
            <div className="flex items-baseline gap-1 my-1">
              <span className="font-metric-xl text-metric-xl text-error font-bold tracking-tight">{peakCurrent}</span>
              <span className="font-title-md text-title-md text-error font-medium">A</span>
            </div>
            <span className="font-code-timestamp text-code-timestamp text-outline">
              Peak Hold Captured
            </span>
          </div>

          {/* Trip Time */}
          <div className="flex flex-col justify-between p-space-sm bg-tertiary-container/10 rounded-lg border border-tertiary/20">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-label-caps text-tertiary font-bold uppercase tracking-wider">Trip Time</span>
              <span className="material-symbols-outlined text-tertiary text-[16px]">timer</span>
            </div>
            <div className="flex items-baseline gap-1 my-1">
              <span className="font-metric-xl text-metric-xl text-tertiary font-bold tracking-tight">{tripTime}</span>
              <span className="font-title-md text-title-md text-tertiary font-medium">ms</span>
            </div>
            <span className="font-code-timestamp text-code-timestamp text-tertiary font-medium">
              {tripTime !== '--' ? 'Spec Envelope: 20-100ms' : 'Awaiting Trip Event'}
            </span>
          </div>

          {/* Temperature */}
          <div className="flex flex-col justify-between p-space-sm bg-surface-container-low/40 rounded-lg">
            <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">MCB Temperature</span>
            <div className="flex items-baseline gap-1 my-1">
              <span className="font-metric-xl text-metric-xl text-on-surface tracking-tight font-bold">{temperature}</span>
              <span className="font-title-md text-title-md text-outline font-medium">°C</span>
            </div>
            <span className="font-code-timestamp text-code-timestamp text-tertiary font-medium">
              Rise: {tempRise} °C
            </span>
          </div>

          {/* Grid Frequency */}
          <div className="flex flex-col justify-between p-space-sm bg-surface-container-low/40 rounded-lg">
            <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Grid Frequency</span>
            <div className="flex items-baseline gap-1 my-1">
              <span className="font-metric-xl text-metric-xl text-on-surface tracking-tight font-bold">{frequency}</span>
              <span className="font-title-md text-title-md text-outline font-medium">Hz</span>
            </div>
            <span className="font-code-timestamp text-code-timestamp text-outline">
              Nominal 50.0 Hz
            </span>
          </div>
        </div>

        {/* Secondary Telemetry & Hardware States Ribbon */}
        <div className="px-space-xl py-space-sm bg-surface-container-low/30 flex flex-wrap items-center justify-between gap-space-md border-t border-outline-variant/20">
          <div className="flex items-center gap-space-lg flex-wrap">
            <div className="flex items-center gap-space-xs font-code-timestamp text-code-timestamp">
              <span className="text-outline uppercase">Active Power:</span>
              <span className="font-semibold text-on-surface">{activePower}</span>
            </div>
            <div className="flex items-center gap-space-xs font-code-timestamp text-code-timestamp">
              <span className="text-outline uppercase">I / In Ratio:</span>
              <span className="font-semibold text-primary">{iOverIn} × In</span>
            </div>
            <div className="flex items-center gap-space-xs font-code-timestamp text-code-timestamp">
              <span className="text-outline uppercase">I²t Energy Integral:</span>
              <span className="font-semibold text-on-surface">{i2t} A²s</span>
            </div>
          </div>

          {/* Hardware Subsystem State Indicators */}
          <div className="flex items-center gap-space-md flex-wrap font-label-caps text-[11px]">
            <div className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${mcbState === 'ON' || mcbState === 'TESTING' || mcbState === 'READY' ? 'bg-tertiary' : mcbState === 'TRIPPED' ? 'bg-error' : 'bg-outline'}`}></span>
              <span className="text-outline">MCB:</span>
              <span className="font-semibold text-on-surface">{mcbState}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${contactorState === 'CLOSED' ? 'bg-tertiary' : 'bg-outline'}`}></span>
              <span className="text-outline">Contactor:</span>
              <span className="font-semibold text-on-surface">{contactorState}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${relayState === 'ACTIVE' || relayState === 'READY' ? 'bg-tertiary' : 'bg-outline'}`}></span>
              <span className="text-outline">Relay:</span>
              <span className="font-semibold text-on-surface">{relayState}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${esp32State === 'ONLINE' ? 'bg-tertiary' : 'bg-outline'}`}></span>
              <span className="text-outline">MCU:</span>
              <span className="font-semibold text-on-surface">{esp32State}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${doorSafe && curSensorOk && voltSensorOk && tempSensorOk ? 'bg-tertiary' : 'bg-error'}`}></span>
              <span className="text-outline">Interlocks:</span>
              <span className="font-semibold text-on-surface">{doorSafe ? 'ARMED' : 'TRIPPED'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 4 & 5. TEST CONFIGURATION & TEST CONTROLS (2-COLUMN GRID)      */}
      {/* ============================================================== */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
        
        {/* Left Column: MCB Under Test & Configuration (7 Cols) */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl p-space-xl shadow-sm border border-outline-variant/30 flex flex-col gap-space-md">
          <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/20">
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-primary text-[20px]">tune</span>
              <h3 className="font-title-md text-title-md font-semibold text-on-surface">MCB Sample &amp; Test Parameters</h3>
            </div>
            {onAddNewSample && (
              <button
                onClick={onAddNewSample}
                className="text-primary hover:text-primary/80 font-label-caps text-label-caps flex items-center gap-1 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Add Sample</span>
              </button>
            )}
          </div>

          {/* Sample Selector Dropdown if multiple samples exist */}
          {samples.length > 0 && onSelectSample && (
            <div className="flex flex-col gap-1">
              <label className="font-label-caps text-label-caps text-outline">SELECT SAMPLE UNDER TEST</label>
              <select
                value={selectedSample?.sample_id || ''}
                onChange={(e) => {
                  const s = samples.find(x => x.sample_id === e.target.value);
                  if (s) onSelectSample(s);
                }}
                disabled={isTesting}
                className="w-full bg-surface-container-low border border-outline-variant/40 text-on-surface font-body-md text-body-md py-2 px-space-md rounded-lg focus:outline-none focus:border-primary cursor-pointer"
              >
                {samples.map((s) => (
                  <option key={s.sample_id} value={s.sample_id}>
                    {s.sample_id} — {s.manufacturer} {s.model} ({s.trip_curve}{s.rated_current_in}A, {s.poles})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* MCB Specifications Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm pt-space-xs">
            <div className="bg-surface-container-low p-space-sm rounded-lg flex flex-col">
              <span className="font-label-caps text-label-caps text-outline">RATED CURRENT (In)</span>
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold mt-0.5">
                {selectedSample?.rated_current_in || 32} A
              </span>
            </div>

            <div className="bg-surface-container-low p-space-sm rounded-lg flex flex-col">
              <span className="font-label-caps text-label-caps text-outline">TRIP CURVE</span>
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold mt-0.5">
                Curve {selectedSample?.trip_curve || 'C'}
              </span>
            </div>

            <div className="bg-surface-container-low p-space-sm rounded-lg flex flex-col">
              <span className="font-label-caps text-label-caps text-outline">POLES / VOLTAGE</span>
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold mt-0.5">
                {selectedSample?.poles || '2P'} · {selectedSample?.rated_voltage || 230} V
              </span>
            </div>

            <div className="bg-surface-container-low p-space-sm rounded-lg flex flex-col">
              <span className="font-label-caps text-label-caps text-outline">BREAKING CAP.</span>
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold mt-0.5">
                {selectedSample?.breaking_capacity_ka || 6.0} kA
              </span>
            </div>
          </div>

          {/* Dynamic Target Current & Stimulus Multiplier Slider */}
          <div className="p-space-md bg-surface-container-low rounded-xl flex flex-col gap-space-sm border border-outline-variant/20">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-label-caps text-primary font-bold">TEST STIMULUS MULTIPLIER</span>
              <span className="font-code-id text-code-id text-on-surface font-bold text-base">{targetMultiplier.toFixed(2)} × In</span>
            </div>

            <input
              type="range"
              min="1.0"
              max="10.0"
              step="0.5"
              value={targetMultiplier}
              onChange={(e) => setTargetMultiplier(parseFloat(e.target.value))}
              disabled={isTesting}
              className="w-full accent-primary cursor-pointer"
            />

            <div className="flex items-center justify-between pt-1 border-t border-outline-variant/20">
              <span className="font-body-sm text-body-sm text-on-surface-variant">Computed Dynamic Target Current:</span>
              <div className="flex items-baseline gap-1">
                <span className="font-metric-md text-metric-md text-primary font-bold">{targetCurrent}</span>
                <span className="font-body-sm text-body-sm text-primary font-semibold">A RMS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Scenario & Test Controls (5 Cols) */}
        <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl p-space-xl shadow-sm border border-outline-variant/30 flex flex-col gap-space-md">
          <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/20">
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-primary text-[20px]">smart_toy</span>
              <h3 className="font-title-md text-title-md font-semibold text-on-surface">Test Profile &amp; Fault Scenario</h3>
            </div>
          </div>

          {/* Test Type Select */}
          <div className="flex flex-col gap-1">
            <label className="font-label-caps text-label-caps text-outline">TEST SEQUENCE TYPE</label>
            <select
              value={testType}
              onChange={(e) => setTestType(e.target.value)}
              disabled={isTesting}
              className="w-full bg-surface-container-low border border-outline-variant/40 text-on-surface font-body-md text-body-md py-2 px-space-md rounded-lg focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="MAGNETIC_TRIP_5In">Magnetic Instantaneous Trip (5.0 × In)</option>
              <option value="SHORT_CIRCUIT_10In">Short-Circuit High Inrush (10.0 × In)</option>
              <option value="OVERLOAD_1.45In">Thermal Overload Verification (1.45 × In)</option>
              <option value="CONVENTIONAL_NON_TRIP">Non-Tripping Verification (1.13 × In)</option>
            </select>
          </div>

          {/* Fault Scenario Matrix */}
          <div className="flex flex-col gap-1">
            <label className="font-label-caps text-label-caps text-outline">FAULT &amp; SIMULATION SCENARIO</label>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              disabled={isTesting}
              className="w-full bg-surface-container-low border border-outline-variant/40 text-on-surface font-body-md text-body-md py-2 px-space-md rounded-lg focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="NORMAL_TEST">Normal Test Execution (PASS Envelope)</option>
              <option value="MCB_FAIL_TO_TRIP">MCB Fail to Trip (Stuck Mechanism / Safety Cutoff)</option>
              <option value="CURRENT_SENSOR_FAULT">Current Sensor Channel Discontinuity / Fault</option>
              <option value="VOLTAGE_SENSOR_FAULT">Voltage Sensor Zero-Crossing Lost</option>
              <option value="TEMPERATURE_SENSOR_FAULT">PT100 Temperature Probe Discontinuity</option>
              <option value="CONTACTOR_FAILURE">Contactor Auxiliary Feedback Failure</option>
              <option value="EMERGENCY_STOP">Emergency Stop Mushroom Interruption</option>
            </select>
          </div>

          {/* Safety Status Callout */}
          <div className={`p-space-sm rounded-lg flex items-center gap-space-sm ${
            isPermissionReady ? 'bg-tertiary-container/10 border border-tertiary/30 text-tertiary' : 'bg-error-container/20 border border-error/30 text-error'
          }`}>
            <span className="material-symbols-outlined text-[20px]">
              {isPermissionReady ? 'check_circle' : 'warning'}
            </span>
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps font-bold">
                {isPermissionReady ? 'SAFETY INTERLOCKS ARMED · READY' : 'TEST EXECUTION INTERLOCKED'}
              </span>
              <span className="font-code-timestamp text-code-timestamp">
                {status.blockedReasons && status.blockedReasons.length > 0 ? status.blockedReasons[0] : 'All safety conditions met.'}
              </span>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="pt-2">
            {isTesting ? (
              <button
                onClick={onAbortTest}
                className="w-full py-3 rounded-lg bg-error text-on-error hover:bg-error/90 font-title-md text-title-md font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">power_settings_new</span>
                <span>ABORT LIVE TEST SEQUENCE</span>
              </button>
            ) : (
              <button
                onClick={onStartTest}
                disabled={!isConnected || isLoading || !isPermissionReady}
                className="w-full py-3 rounded-lg bg-primary text-on-primary hover:bg-primary/90 font-title-md text-title-md font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                <span>{isLoading ? 'ARMING HIGH-CURRENT RIG...' : 'EXECUTE CALIBRATED TEST SEQUENCE'}</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* ============================================================== */}
      {/* 6. TEST PIPELINE / CURRENT STAGE (REALTIME STATE MACHINE)       */}
      {/* ============================================================== */}
      <section className="w-full bg-surface-container-lowest rounded-xl p-space-xl shadow-sm border border-outline-variant/30 flex flex-col gap-space-md">
        <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/20">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-primary text-[20px]">linear_scale</span>
            <h3 className="font-title-md text-title-md font-semibold text-on-surface">Test Execution State Pipeline</h3>
          </div>
          <span className="font-code-timestamp text-code-timestamp text-secondary font-medium">
            Stage: {currentStage}
          </span>
        </div>

        {/* 8-Stage Process Steps Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-space-xs">
          {pipelineStages.map((stage, idx) => {
            const p = getPipelineStatus(idx);
            return (
              <div
                key={stage.key}
                className={`p-space-sm rounded-lg flex flex-col justify-between gap-1 transition-all border ${
                  p.isActive
                    ? 'bg-primary-container/20 border-primary text-primary font-bold shadow-sm'
                    : p.isComplete
                    ? 'bg-tertiary-container/10 border-tertiary/30 text-tertiary'
                    : 'bg-surface-container-low/40 border-outline-variant/20 text-outline'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-label-caps text-[10px] uppercase tracking-wider font-semibold truncate">
                    {stage.label}
                  </span>
                  {p.isActive ? (
                    <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                  ) : p.isComplete ? (
                    <span className="material-symbols-outlined text-[14px]">check</span>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-outline-variant"></span>
                  )}
                </div>
                <span className="font-code-timestamp text-[10px] truncate">
                  {p.isActive ? 'ACTIVE NOW' : p.isComplete ? 'PASSED' : 'PENDING'}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================== */}
      {/* 7. EVENTS / FAULTS / LAST TEST RESULT BANNER                    */}
      {/* ============================================================== */}
      {lastCompletedTest && (
        <section className={`w-full rounded-xl p-space-xl shadow-sm border flex flex-col md:flex-row items-start md:items-center justify-between gap-space-lg ${
          lastCompletedTest.verdict === 'PASS' 
            ? 'bg-tertiary-container/10 border-tertiary/40' 
            : 'bg-error-container/20 border-error/40'
        }`}>
          <div className="flex items-center gap-space-lg">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-2xl shadow-sm ${
              lastCompletedTest.verdict === 'PASS' ? 'bg-tertiary text-on-tertiary' : 'bg-error text-on-error'
            }`}>
              <span className="material-symbols-outlined text-[28px]">
                {lastCompletedTest.verdict === 'PASS' ? 'verified' : 'cancel'}
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-space-sm">
                <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  TEST RESULT: {lastCompletedTest.verdict}
                </span>
                <span className="font-code-id text-code-id text-secondary">
                  #{lastCompletedTest.testId}
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Measured Trip Time: <strong className="text-on-surface">{lastCompletedTest.tripTimeMs || '--'} ms</strong> • Peak Inrush: <strong className="text-on-surface">{lastCompletedTest.peakCurrent || '--'} A</strong> • I²t: <strong className="text-on-surface">{lastCompletedTest.i2t || '--'} A²s</strong>
              </p>
              {lastCompletedTest.failureReason && (
                <p className="font-code-timestamp text-code-timestamp text-error mt-0.5">
                  Failure Reason: {lastCompletedTest.failureReason}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-space-sm flex-wrap">
            <button
              onClick={() => onOpenReport(lastCompletedTest.testId)}
              className="px-space-md py-2 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface border border-outline-variant/40 font-title-md text-title-md flex items-center gap-1 shadow-sm cursor-pointer transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">description</span>
              <span>View Certificate</span>
            </button>
            <button
              onClick={() => onOpenQR(lastCompletedTest.testId, lastCompletedTest.verifyUrl, lastCompletedTest.qrDataUrl)}
              className="px-space-md py-2 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface border border-outline-variant/40 font-title-md text-title-md flex items-center gap-1 shadow-sm cursor-pointer transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
              <span>QR Verification</span>
            </button>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* 8. RECENT TEST BATCHES / REPORTS ACCESS                         */}
      {/* ============================================================== */}
      <section className="w-full bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden flex flex-col">
        <div className="px-space-xl py-space-md bg-surface-container-low/40 flex items-center justify-between border-b border-outline-variant/20">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-primary text-[20px]">history</span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Recent Test Records &amp; Calibration Batches</h3>
          </div>
          <button
            onClick={onViewAllBatches}
            className="text-primary hover:text-primary/80 font-label-caps text-label-caps flex items-center gap-1 cursor-pointer"
            type="button"
          >
            <span>VIEW ALL BATCHES ({batches.length})</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-outline font-label-caps text-label-caps">
                <th className="py-space-sm px-space-xl">TEST ID</th>
                <th className="py-space-sm px-space-md">SAMPLE / MODEL</th>
                <th className="py-space-sm px-space-md text-right">TARGET (A)</th>
                <th className="py-space-sm px-space-md text-right">PEAK (A)</th>
                <th className="py-space-sm px-space-md text-right">TRIP TIME</th>
                <th className="py-space-sm px-space-md text-center">VERDICT</th>
                <th className="py-space-sm px-space-xl text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low font-body-md text-body-md text-on-surface">
              {recentBatches.length > 0 ? (
                recentBatches.map((b) => (
                  <tr key={b.test_id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-space-sm px-space-xl font-code-id text-code-id font-semibold text-primary">
                      {b.test_id}
                    </td>
                    <td className="py-space-sm px-space-md">
                      <span className="font-medium text-on-surface">{b.manufacturer || 'Schneider'} {b.model || 'Acti9'}</span>
                      <span className="text-secondary font-code-timestamp text-code-timestamp ml-1.5">({b.trip_curve || 'C'}{b.rated_current_in || 32}A)</span>
                    </td>
                    <td className="py-space-sm px-space-md text-right font-code-timestamp text-code-timestamp text-secondary">
                      {b.target_current ? `${b.target_current.toFixed(1)} A` : '--'}
                    </td>
                    <td className="py-space-sm px-space-md text-right font-code-timestamp text-code-timestamp text-on-surface font-semibold">
                      {b.peak_current ? `${b.peak_current.toFixed(1)} A` : '--'}
                    </td>
                    <td className="py-space-sm px-space-md text-right font-code-timestamp text-code-timestamp text-primary font-bold">
                      {b.trip_time_ms ? `${b.trip_time_ms.toFixed(1)} ms` : '--'}
                    </td>
                    <td className="py-space-sm px-space-md text-center">
                      <span className={`inline-flex items-center px-space-sm py-0.5 rounded font-label-caps text-label-caps ${
                        b.status === 'PASS' 
                          ? 'bg-tertiary text-on-tertiary font-bold' 
                          : b.status === 'FAIL' 
                          ? 'bg-error text-on-error font-bold' 
                          : 'bg-surface-container-high text-on-surface'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-space-sm px-space-xl text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onSelectBatch(b.test_id)}
                          className="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
                          title="View Details"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </button>
                        <button
                          onClick={() => onOpenReport(b.test_id)}
                          className="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
                          title="View Certificate"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[18px]">description</span>
                        </button>
                        <button
                          onClick={() => onOpenQR(b.test_id, b.verify_url || '', b.qr_code_data_url || '')}
                          className="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
                          title="View QR"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-space-lg text-center text-outline font-code-timestamp">
                    No historical test records found. Execute a live test sequence above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
};
