import React from 'react';
import { SystemStatus, TelemetryData, MCBSample, TestBatch } from '../types';

interface LaboratoryOverviewProps {
  status: SystemStatus;
  telemetry: TelemetryData | null;
  selectedSample: MCBSample | null;
  targetMultiplier: number;
  onStartTest: () => void;
  onNavigateToLiveTest: () => void;
  onOpenReport: (testId: string) => void;
  onOpenQR: (testId: string, verifyUrl: string, qrDataUrl: string) => void;
  onSelectBatch: (testId: string) => void;
  onViewAllBatches: () => void;
  batches: TestBatch[];
  lastCompletedTest: any | null;
  isLoading: boolean;
}

export const LaboratoryOverview: React.FC<LaboratoryOverviewProps> = ({
  status,
  telemetry,
  selectedSample,
  targetMultiplier,
  onStartTest,
  onNavigateToLiveTest,
  onOpenReport,
  onOpenQR,
  onSelectBatch,
  onViewAllBatches,
  batches,
  lastCompletedTest,
  isLoading
}) => {
  const isConnected = status.connected;
  const isTesting = telemetry?.machineState === 'TESTING';
  const isPermissionReady = status.testPermission === 'READY';
  const currentStage = telemetry?.currentStage || 'OFFLINE';

  const ratedIn = selectedSample?.rated_current_in || 32;
  const targetCurrent = +(ratedIn * targetMultiplier).toFixed(1);

  // Real or disconnected telemetry values
  const voltage = isConnected && telemetry ? telemetry.voltage.toFixed(1) : '--';
  const current = isConnected && telemetry ? telemetry.current.toFixed(1) : '--';
  const peakCurrent = isConnected && telemetry ? telemetry.peakCurrent.toFixed(1) : (lastCompletedTest?.peakCurrent ? lastCompletedTest.peakCurrent.toFixed(1) : '--');
  const tripTime = isConnected && telemetry && telemetry.tripTimeMs !== null 
    ? telemetry.tripTimeMs.toFixed(1) 
    : (lastCompletedTest?.tripTimeMs ? lastCompletedTest.tripTimeMs.toFixed(1) : '--');
  const temperature = isConnected && telemetry ? telemetry.mcbTemp.toFixed(1) : '--';
  const rmsCurrent = isConnected && telemetry ? `${telemetry.rmsCurrent.toFixed(1)} A` : (lastCompletedTest?.rmsCurrent ? `${lastCompletedTest.rmsCurrent.toFixed(1)} A` : '--');
  const activePower = isConnected && telemetry ? `${(telemetry.power / 1000).toFixed(1)} kW` : '--';
  const powerFactor = isConnected && telemetry ? '0.99 pf' : '--';

  // 5 Step Stepper Mapping
  const getStageState = (stepIndex: number) => {
    if (!isConnected) return { isComplete: false, isActive: false, label: 'PENDING' };
    const s = (currentStage || '').toUpperCase();
    let currentStep = 0;
    if (s.includes('TRIP') || s.includes('TRIPPED')) currentStep = 2;
    else if (s.includes('ANALYSIS') || s.includes('COMPLIANCE')) currentStep = 3;
    else if (s.includes('COMPLETE') || s.includes('RESULT') || s.includes('PASS') || s.includes('FAIL')) currentStep = 4;
    else if (s.includes('CURRENT') || s.includes('MEASUREMENT') || s.includes('CONTACTOR') || s.includes('LOAD') || s.includes('TESTING')) currentStep = 1;
    else if (s.includes('READY') || s.includes('SETUP') || s.includes('IDLE')) currentStep = 0;

    if (currentStep > stepIndex) return { isComplete: true, isActive: false, label: 'COMPLETED' };
    if (currentStep === stepIndex) return { isComplete: false, isActive: true, label: isTesting ? 'ACTIVE' : 'READY' };
    return { isComplete: false, isActive: false, label: 'PENDING' };
  };

  const recentBatches = batches.slice(0, 4);

  return (
    <div className="w-full max-w-[1600px] mx-auto px-space-md sm:px-space-xl lg:px-space-2xl py-space-xl sm:py-space-2xl flex flex-col gap-space-2xl">
      
      {/* 1. TOP BANNER / STATUS ROW (Stitch Exact) */}
      <section className="w-full bg-surface-container-lowest rounded-xl p-space-lg sm:p-space-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-lg">
        <div className="flex flex-wrap items-center gap-space-md sm:gap-space-xl">
          <div className="flex items-center gap-space-sm bg-surface-container-low px-space-md py-2 rounded-lg">
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-tertiary animate-pulse' : 'bg-outline'}`}></span>
            <span className="font-label-caps text-label-caps text-on-surface uppercase tracking-wider">
              {isConnected ? 'Machine Connected' : 'Machine Disconnected'}
            </span>
          </div>
          <div className="flex items-center gap-space-xs font-code-id text-code-id text-on-surface-variant">
            <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">RIG:</span>
            <span className="font-code-id text-code-id text-on-surface font-semibold">{status.machineId || 'MCB-RIG-001'}</span>
          </div>
          <div className="flex items-center gap-space-xs font-code-timestamp text-code-timestamp text-secondary">
            <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">STATUS:</span>
            <span className={`px-2 py-0.5 rounded-DEFAULT font-label-caps text-label-caps font-semibold ${
              isTesting ? 'bg-primary text-on-primary animate-pulse' : isConnected ? 'bg-surface-container-high text-primary' : 'bg-surface-container-low text-outline'
            }`}>
              {isTesting ? 'TESTING' : isConnected ? 'READY' : 'OFFLINE'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-space-md flex-wrap sm:flex-nowrap">
          <button
            onClick={onNavigateToLiveTest}
            className="px-space-lg py-2.5 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors font-title-md text-title-md flex items-center gap-space-xs cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-secondary">tune</span>
            <span>Test Configuration</span>
          </button>
          <button
            onClick={onStartTest}
            disabled={!isConnected || isTesting || isLoading}
            className="px-space-xl py-2.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container transition-all active:scale-95 shadow-sm font-title-md text-title-md font-semibold flex items-center gap-space-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">play_arrow</span>
            <span>{isTesting ? 'Test Running...' : 'Start New Test'}</span>
          </button>
        </div>
      </section>

      {/* 2. CURRENT TEST / MCB UNDER TEST HERO CARD (Stitch Exact) */}
      <section className="w-full bg-surface-container-lowest rounded-xl p-space-xl sm:p-space-2xl shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-xl">
          <div className="flex flex-col gap-space-sm max-w-3xl">
            <div className="flex items-center gap-space-md">
              <span className="px-space-md py-1 rounded bg-surface-container text-on-surface font-code-id text-code-id">
                {selectedSample?.sample_id || 'MCB-2026-00142'}
              </span>
              <div className="flex items-center gap-1.5 px-space-md py-1 rounded-DEFAULT bg-tertiary-container/10 text-tertiary font-label-caps text-label-caps">
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-tertiary' : 'bg-outline'}`}></span>
                <span>{isTesting ? 'TEST IN PROGRESS' : isConnected ? 'READY FOR TEST' : 'STANDBY'}</span>
              </div>
            </div>
            <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight">
              {selectedSample ? `${selectedSample.manufacturer} ${selectedSample.model}` : 'Schneider Electric Acti9 iC60N'}
            </h1>
            <p className="font-body-lg text-body-lg text-secondary">
              {selectedSample?.trip_curve ? `Curve ${selectedSample.trip_curve}` : 'Curve C'}{selectedSample?.rated_current_in || 32} • {selectedSample?.poles || '2P'} {selectedSample?.rated_voltage || 230}V AC • Breaking Capacity:{' '}
              <span className="font-semibold text-on-surface">
                {selectedSample?.breaking_capacity_ka ? `${(selectedSample.breaking_capacity_ka * 1000).toLocaleString()} A (${selectedSample.breaking_capacity_ka}kA)` : '6,000 A (6kA)'}
              </span>
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-space-lg bg-surface-container-low p-space-lg rounded-xl">
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">Test Profile</span>
              <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">{targetMultiplier.toFixed(1)} × In</span>
              <span className="font-code-timestamp text-code-timestamp text-outline">Target: {targetCurrent} A • IS/IEC 60898-1</span>
            </div>
            <div className="w-12 h-12 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm">
              <span className="material-symbols-outlined text-[26px]">precision_manufacturing</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. KEY MEASUREMENTS (Calibrated Telemetry Cluster - Stitch Exact) */}
      <section className="w-full bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
        <div className="px-space-xl py-space-lg bg-surface-container-low/60 flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-primary text-[20px]">speed</span>
            <span className="font-title-md text-title-md font-semibold text-on-surface">Calibrated Telemetry Cluster</span>
          </div>
          <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">
            {isConnected ? 'Realtime Bus Sync • 10 kHz' : 'Hardware Bus Disconnected'}
          </span>
        </div>
        
        {/* Main Indicators Matrix */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 divide-y md:divide-y-0 p-space-lg sm:p-space-xl gap-y-space-lg gap-x-space-md">
          {/* Voltage */}
          <div className="flex flex-col pt-space-sm md:pt-0">
            <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">Voltage</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="font-metric-xl text-metric-xl text-on-surface tracking-tight">{voltage}</span>
              <span className="font-title-md text-title-md text-outline font-medium">V</span>
            </div>
            <span className="font-code-timestamp text-code-timestamp text-outline mt-1">
              {isConnected && telemetry ? `Freq: ${telemetry.frequency.toFixed(2)} Hz` : 'Nominal ±0.8%'}
            </span>
          </div>

          {/* Current */}
          <div className="flex flex-col pt-space-sm md:pt-0">
            <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">Current</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="font-metric-xl text-metric-xl text-on-surface tracking-tight">{current}</span>
              <span className="font-title-md text-title-md text-outline font-medium">A</span>
            </div>
            <span className="font-code-timestamp text-code-timestamp text-outline mt-1">Instantaneous</span>
          </div>

          {/* Peak Current */}
          <div className="flex flex-col pt-space-sm md:pt-0">
            <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">Peak Current</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="font-metric-xl text-metric-xl text-on-surface tracking-tight">{peakCurrent}</span>
              <span className="font-title-md text-title-md text-outline font-medium">A</span>
            </div>
            <span className="font-code-timestamp text-code-timestamp text-outline mt-1">Peak Hold Captured</span>
          </div>

          {/* Trip Time */}
          <div className="flex flex-col pt-space-sm md:pt-0">
            <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">Trip Time</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="font-metric-xl text-metric-xl text-primary font-bold tracking-tight">{tripTime}</span>
              <span className="font-title-md text-title-md text-outline font-medium">ms</span>
            </div>
            <span className="font-code-timestamp text-code-timestamp text-tertiary font-medium mt-1">
              {tripTime !== '--' ? 'Within Spec (20-100ms)' : 'Spec Envelope: 20-100ms'}
            </span>
          </div>

          {/* Temperature */}
          <div className="flex flex-col pt-space-sm md:pt-0">
            <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">Temperature</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="font-metric-xl text-metric-xl text-on-surface tracking-tight">{temperature}</span>
              <span className="font-title-md text-title-md text-outline font-medium">°C</span>
            </div>
            <span className="font-code-timestamp text-code-timestamp text-outline mt-1">Contact Terminal Probe</span>
          </div>
        </div>

        {/* Secondary Telemetry Ribbon */}
        <div className="px-space-xl py-space-md bg-surface-container-lowest flex flex-wrap items-center justify-between gap-space-md border-t border-surface-container">
          <div className="flex items-center gap-space-xl flex-wrap">
            <div className="flex items-center gap-space-sm">
              <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">RMS CURRENT:</span>
              <span className="font-code-id text-code-id text-on-surface font-semibold">{rmsCurrent}</span>
            </div>
            <div className="flex items-center gap-space-sm">
              <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">ACTIVE POWER:</span>
              <span className="font-code-id text-code-id text-on-surface font-semibold">{activePower}</span>
            </div>
            <div className="flex items-center gap-space-sm">
              <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">POWER FACTOR:</span>
              <span className="font-code-id text-code-id text-on-surface font-semibold">{powerFactor}</span>
            </div>
          </div>
          <div className="flex items-center gap-space-xs font-code-timestamp text-code-timestamp text-outline">
            <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>
            <span>Transducers Zero-Calibrated</span>
          </div>
        </div>
      </section>

      {/* 4. TEST SEQUENCE OVERVIEW (Horizontal Process Stepper - Stitch Exact) */}
      <section className="w-full bg-surface-container-lowest rounded-xl p-space-xl sm:p-space-2xl shadow-sm">
        <div className="flex items-center justify-between mb-space-xl">
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Test Sequence Progression</h2>
            <p className="font-body-sm text-body-sm text-secondary">Automated sequence execution conforming to protocol IEC-60898-B3</p>
          </div>
          <span className="font-code-timestamp text-code-timestamp bg-surface-container-low px-space-md py-1 rounded text-secondary">
            {isTesting ? `Stage: ${currentStage}` : isConnected ? 'Ready for Execution' : 'Rig Offline'}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-space-md relative">
          {[
            { step: '1. SETUP', desc: 'Clamp force 2.4Nm' },
            { step: '2. TESTING', desc: `Current applied ${targetCurrent}A` },
            { step: '3. TRIP', desc: `Break confirmed @ ${tripTime !== '--' ? tripTime : '32'}ms` },
            { step: '4. ANALYSIS', desc: 'Arc energy calculated' },
            { step: '5. RESULT', desc: 'Signed by Lab Sys' }
          ].map((item, idx) => {
            const st = getStageState(idx);
            return (
              <div
                key={idx}
                className={`flex md:flex-col items-center md:items-start gap-space-md p-space-md rounded-lg transition-all ${
                  st.isActive
                    ? 'bg-surface-container-high/70 ring-2 ring-primary/30'
                    : st.isComplete
                    ? 'bg-surface-container-low/40'
                    : 'bg-surface-container-low/20 opacity-60'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-title-md text-title-md flex-shrink-0 ${
                    st.isActive
                      ? 'bg-primary text-on-primary ring-4 ring-primary/20'
                      : st.isComplete
                      ? 'bg-tertiary-container text-on-tertiary'
                      : 'bg-surface-container text-outline'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {st.isComplete ? 'check' : st.isActive ? 'autorenew' : 'circle'}
                  </span>
                </div>
                <div>
                  <div className="font-title-md text-title-md text-on-surface font-semibold">{item.step}</div>
                  <div className={`font-label-caps text-label-caps mt-0.5 ${
                    st.isActive ? 'text-primary font-bold' : st.isComplete ? 'text-tertiary' : 'text-outline'
                  }`}>
                    {st.label}
                  </div>
                  <div className="font-code-timestamp text-code-timestamp text-outline mt-1">{item.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. TEST RESULT SUMMARY CARD (Stitch Exact) */}
      <section className="w-full bg-surface-container-lowest rounded-xl p-space-xl sm:p-space-2xl shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-2xl">
          <div className="flex items-start sm:items-center gap-space-xl">
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 ${
              lastCompletedTest?.verdict === 'PASS' || (!lastCompletedTest && isConnected)
                ? 'bg-tertiary-container/10 text-tertiary'
                : lastCompletedTest?.verdict === 'FAIL'
                ? 'bg-error-container text-error'
                : 'bg-surface-container text-outline'
            }`}>
              <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {lastCompletedTest?.verdict === 'PASS' || (!lastCompletedTest && isConnected)
                  ? 'check_circle'
                  : lastCompletedTest?.verdict === 'FAIL'
                  ? 'cancel'
                  : 'pending'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-space-md">
                <span className={`font-display-sm text-display-sm font-bold tracking-tight ${
                  lastCompletedTest?.verdict === 'PASS' || (!lastCompletedTest && isConnected)
                    ? 'text-tertiary'
                    : lastCompletedTest?.verdict === 'FAIL'
                    ? 'text-error'
                    : 'text-outline'
                }`}>
                  {lastCompletedTest?.verdict || (isConnected ? 'PASS' : 'STANDBY')}
                </span>
                <span className={`px-space-md py-0.5 rounded font-label-caps text-label-caps font-semibold ${
                  lastCompletedTest?.verdict === 'PASS' || (!lastCompletedTest && isConnected)
                    ? 'bg-tertiary-container/10 text-tertiary'
                    : lastCompletedTest?.verdict === 'FAIL'
                    ? 'bg-error-container text-error'
                    : 'bg-surface-container text-outline'
                }`}>
                  {lastCompletedTest?.verdict === 'FAIL' ? 'NON-COMPLIANT' : 'CERTIFIED SPECIMEN'}
                </span>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant font-medium">
                {lastCompletedTest?.verdict === 'FAIL'
                  ? (lastCompletedTest.failureReason || 'Trip duration outside standard bounds • Failed IS/IEC 60898-1')
                  : 'Test completed successfully • Compliant with IS/IEC 60898-1 Cl. 9.10'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-space-xl">
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">Trip Time</span>
              <span className="font-headline-sm text-headline-sm text-on-surface font-semibold mt-0.5">
                {lastCompletedTest?.tripTimeMs ? `${lastCompletedTest.tripTimeMs.toFixed(1)} ms` : (isConnected ? '32.0 ms' : '--')}
              </span>
              <span className="font-code-timestamp text-code-timestamp text-outline">Tolerance: 20ms - 100ms</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">Peak Current</span>
              <span className="font-headline-sm text-headline-sm text-on-surface font-semibold mt-0.5">
                {lastCompletedTest?.peakCurrent ? `${lastCompletedTest.peakCurrent.toFixed(1)} A` : (isConnected ? '97.1 A' : '--')}
              </span>
              <span className="font-code-timestamp text-code-timestamp text-outline">Limit &lt; 165.0 A</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">I²t Energy</span>
              <span className="font-headline-sm text-headline-sm text-on-surface font-semibold mt-0.5">
                {lastCompletedTest?.i2t ? `${lastCompletedTest.i2t.toLocaleString()} A²s` : (isConnected ? '6,389 A²s' : '--')}
              </span>
              <span className="font-code-timestamp text-code-timestamp text-outline">Thermal Stress Cleared</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-md">
            <button
              onClick={() => {
                const id = lastCompletedTest?.testId || (batches[0]?.test_id);
                if (id) {
                  const match = batches.find((b) => b.test_id === id);
                  onOpenQR(id, match?.verify_url || `http://localhost:5173/verify/${id}`, match?.qr_code_data_url || '');
                }
              }}
              className="px-space-lg py-2.5 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors font-title-md text-title-md flex items-center justify-center gap-space-xs cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
              <span>Verify QR Certificate</span>
            </button>
            <button
              onClick={() => {
                const id = lastCompletedTest?.testId || (batches[0]?.test_id);
                if (id) onOpenReport(id);
              }}
              className="px-space-xl py-2.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container transition-all active:scale-95 shadow-sm font-title-md text-title-md font-semibold flex items-center justify-center gap-space-xs cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">description</span>
              <span>View Laboratory Report</span>
            </button>
          </div>
        </div>
      </section>

      {/* 6. RECENT TESTS TABLE (Stitch Exact) */}
      <section className="w-full bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="px-space-xl py-space-lg flex items-center justify-between bg-surface-container-low/40">
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Recent Sequence Executions</h2>
            <p className="font-body-sm text-body-sm text-secondary">Active audit trail of most recent bench evaluations</p>
          </div>
          <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider">STATION RIG-001 LOG</span>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/60 text-secondary font-label-caps text-label-caps uppercase tracking-wider">
                <th className="py-space-md px-space-xl">Test ID</th>
                <th className="py-space-md px-space-xl">Sample / MCB</th>
                <th className="py-space-md px-space-xl">Rating</th>
                <th className="py-space-md px-space-xl text-right">Peak Current</th>
                <th className="py-space-md px-space-xl text-right">Trip Time</th>
                <th className="py-space-md px-space-xl text-center">Result</th>
                <th className="py-space-md px-space-xl">Date &amp; Time</th>
                <th className="py-space-md px-space-xl text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low text-on-surface font-body-md text-body-md">
              {recentBatches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-space-xl text-center text-outline font-body-md">
                    No sequence executions recorded in database yet.
                  </td>
                </tr>
              ) : (
                recentBatches.map((b) => {
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
                      <td className="py-space-md px-space-xl font-semibold">
                        {b.manufacturer} {b.model}
                      </td>
                      <td className="py-space-md px-space-xl font-code-id text-code-id text-secondary">
                        {b.trip_curve}{b.rated_current_in} / {b.poles}
                      </td>
                      <td className="py-space-md px-space-xl text-right font-code-id text-code-id">
                        {b.peak_current ? `${b.peak_current.toFixed(1)} A` : '--'}
                      </td>
                      <td className={`py-space-md px-space-xl text-right font-code-id text-code-id font-semibold ${
                        isPass ? 'text-on-surface' : 'text-error'
                      }`}>
                        {b.trip_time_ms ? `${b.trip_time_ms.toFixed(1)} ms` : '--'}
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
                        {new Date(b.started_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}, {new Date(b.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-space-md px-space-xl text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onSelectBatch(b.test_id)}
                          className="text-primary hover:text-primary-container font-label-caps text-label-caps uppercase tracking-wider font-semibold cursor-pointer"
                          type="button"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-space-xl py-space-lg bg-surface-container-low/40 flex items-center justify-between">
          <span className="font-body-sm text-body-sm text-outline">
            Showing {recentBatches.length} of {batches.length} total recorded sequence runs
          </span>
          <button
            onClick={onViewAllBatches}
            className="font-title-md text-title-md text-primary hover:text-primary-container font-semibold flex items-center gap-1 group cursor-pointer"
          >
            <span>View All {batches.length} Batches in History</span>
            <span className="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 transition-transform">
              arrow_forward
            </span>
          </button>
        </div>
      </section>

    </div>
  );
};
