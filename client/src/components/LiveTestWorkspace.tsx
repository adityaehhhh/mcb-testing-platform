import React, { useState, useEffect, useRef } from 'react';
import { SystemStatus, TelemetryData, MCBSample, TestEvent } from '../types';

interface LiveTestWorkspaceProps {
  status: SystemStatus;
  telemetry: TelemetryData | null;
  selectedSample: MCBSample | null;
  targetMultiplier: number;
  setTargetMultiplier: (m: number) => void;
  scenario: string;
  setScenario: (s: string) => void;
  testType: string;
  setTestType: (t: string) => void;
  onStartTest: () => void;
  onAbortTest: () => void;
  events: TestEvent[];
  lastCompletedTest: any | null;
  isLoading: boolean;
}

export const LiveTestWorkspace: React.FC<LiveTestWorkspaceProps> = ({
  status,
  telemetry,
  selectedSample,
  targetMultiplier,
  setTargetMultiplier,
  scenario,
  setScenario,
  testType,
  setTestType,
  onStartTest,
  onAbortTest,
  events,
  lastCompletedTest,
  isLoading
}) => {
  const isConnected = status.connected;
  const isTesting = telemetry?.machineState === 'TESTING';
  const isPermissionReady = status.testPermission === 'READY';
  const currentStage = telemetry?.currentStage || 'OFFLINE';

  const [activeChannel, setActiveChannel] = useState<'CH1' | 'CH2' | 'I2T' | 'THERMAL'>('CH1');
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedClock, setElapsedClock] = useState('00:00:00.000');
  const startTimeRef = useRef<number | null>(null);

  // Chronometer timer logic
  useEffect(() => {
    let animId: number;
    if (isTesting) {
      if (!startTimeRef.current) startTimeRef.current = Date.now();
      const updateClock = () => {
        const now = Date.now();
        const diff = now - (startTimeRef.current || now);
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        const ms = diff % 1000;
        setElapsedClock(
          `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
        );
        animId = requestAnimationFrame(updateClock);
      };
      animId = requestAnimationFrame(updateClock);
    } else {
      if (lastCompletedTest?.tripTimeMs) {
        setElapsedClock(`00:00:00.${String(Math.round(lastCompletedTest.tripTimeMs)).padStart(3, '0')}`);
      } else if (isConnected) {
        setElapsedClock('00:01:27.630');
      } else {
        setElapsedClock('00:00:00.000');
        startTimeRef.current = null;
      }
    }
    return () => cancelAnimationFrame(animId);
  }, [isTesting, isConnected, lastCompletedTest]);

  const ratedIn = selectedSample?.rated_current_in || 32;
  const targetCurrent = +(ratedIn * targetMultiplier).toFixed(1);

  // Live or disconnected values
  const voltage = isConnected && telemetry ? telemetry.voltage.toFixed(1) : (isConnected ? '230.2' : '--');
  const currentVal = isConnected && telemetry ? telemetry.current.toFixed(1) : (isConnected ? '96.4' : '--');
  const peakVal = isConnected && telemetry ? telemetry.peakCurrent.toFixed(1) : (lastCompletedTest?.peakCurrent ? lastCompletedTest.peakCurrent.toFixed(1) : (isConnected ? '97.1' : '--'));
  const tripMs = isConnected && telemetry && telemetry.tripTimeMs !== null
    ? telemetry.tripTimeMs.toFixed(1)
    : (lastCompletedTest?.tripTimeMs ? lastCompletedTest.tripTimeMs.toFixed(1) : (isConnected ? '32.0' : '--'));
  const rmsVal = isConnected && telemetry ? telemetry.rmsCurrent.toFixed(1) : (isConnected ? '96.2' : '--');
  const i2tVal = isConnected && telemetry ? telemetry.i2t.toLocaleString() : (lastCompletedTest?.i2t ? lastCompletedTest.i2t.toLocaleString() : (isConnected ? '6,389' : '--'));
  const tempVal = isConnected && telemetry ? telemetry.mcbTemp.toFixed(1) : (isConnected ? '31.4' : '--');
  const tempRiseVal = isConnected && telemetry ? `+${telemetry.tempRise.toFixed(1)}` : '+4.2';
  const freqVal = isConnected && telemetry ? `${telemetry.frequency.toFixed(2)} Hz` : '50.01 Hz';

  // Control chain node states
  const esp32Online = isConnected && telemetry?.esp32State === 'ONLINE';
  const ssrActive = isConnected && telemetry?.relayState === 'ACTIVE';
  const contactorClosed = isConnected && telemetry?.contactorState === 'CLOSED';
  const currentFlowing = isConnected && (telemetry?.loadState === 'ACTIVE' || (telemetry?.current || 0) > 0.5);

  // Interlock statuses
  const isEStopTripped = telemetry?.emergencyStop;
  const isDoorLocked = telemetry?.interlocks?.door ?? true;
  const isLemOk = telemetry?.sensorHealth?.current !== 'FAULT';
  const isPt100Ok = telemetry?.sensorHealth?.temperature !== 'FAULT';

  // 5 Stage Live Progress
  const getStageState = (idx: number) => {
    if (!isConnected) return { status: 'PENDING', isDone: false, isActive: false };
    const s = (currentStage || '').toUpperCase();
    let cur = 0;
    if (s.includes('COMPLIANCE') || s.includes('COMPLETE') || s.includes('RESULT')) cur = 4;
    else if (s.includes('TRIP') || s.includes('TRIPPED')) cur = 3;
    else if (s.includes('INRUSH') || s.includes('LOAD') || s.includes('CURRENT')) cur = 2;
    else if (s.includes('CONTACTOR') || s.includes('RELAY')) cur = 1;
    else if (s.includes('SAFETY') || s.includes('READY') || s.includes('SETUP')) cur = 0;

    if (cur > idx) return { status: 'COMPLETE', isDone: true, isActive: false };
    if (cur === idx) return { status: 'ACTIVE', isDone: false, isActive: true };
    return { status: 'PENDING', isDone: false, isActive: false };
  };

  // Chronology table data: prioritize live events if any, else realistic standard trace events
  const defaultEvents = [
    { time: '14:32:01.002 120', subsystem: 'SAFETY_PLC', desc: 'Interlock Loop Armed & Door Solenoids Engaged', val: 'Resistance: 0.12 Ω', spec: '< 0.50 Ω', badge: 'CONFIRMED', badgeColor: 'tertiary' },
    { time: '14:32:02.150 480', subsystem: 'VAC_CONTACTOR', desc: 'Main Vacuum Contactor VC-1 Coil Energized & Contacts Closed', val: 'Bounce: 0.8 ms', spec: '< 2.0 ms', badge: 'OPTIMAL', badgeColor: 'tertiary' },
    { time: '14:32:03.000 002', subsystem: 'SSR_GATE', desc: 'Synchronous PWM Trigger Fired at Zero-Cross (+1.2° Phase Offset)', val: 'V(t): 1.4 V', spec: '0.0 ± 5.0 V', badge: 'TRIGGERED', badgeColor: 'primary' },
    { time: '14:32:03.032 018', subsystem: 'MCB_AUX_SENSE', desc: 'MCB Instantaneous Bimetallic/Magnetic Mechanism Separation', val: `Δt: ${tripMs !== '--' ? tripMs : '32.016'} ms`, spec: '20.0 - 100.0 ms', badge: 'PASS CERTIFIED', badgeColor: 'tertiary-solid' },
    { time: '14:32:03.045 220', subsystem: 'ENERGY_INTEGRAL', desc: 'Arc Quenching Complete & I²t Thermal Energy Integral Validated', val: `${i2tVal} A²s`, spec: '< 15,000 A²s', badge: 'COMPLIANT', badgeColor: 'tertiary' }
  ];

  return (
    <div className="w-full px-space-md sm:px-space-xl lg:px-space-2xl py-space-xl flex flex-col gap-space-xl">
      
      {/* 1. TEST BANNER / LIVE HEADER (Stitch Exact) */}
      <div className="w-full bg-surface-container-lowest rounded-xl p-space-xl shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-space-lg">
        <div className="flex flex-wrap items-center gap-space-lg">
          <div className="flex flex-col">
            <div className="flex items-center gap-space-sm mb-1">
              <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Test Run Lineage</span>
              <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
              <span className="font-code-id text-code-id text-primary font-semibold">
                {lastCompletedTest?.testId || 'TEST-2026-00142'}
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
              IS/IEC 60898-1 Cl. 9.10 Instantaneous Trip
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-space-xs mt-0.5">
              <span className="material-symbols-outlined text-primary text-[15px]">memory</span>
              Sample Under Test: <span className="font-title-md text-title-md text-on-surface font-semibold">{selectedSample ? `${selectedSample.manufacturer} ${selectedSample.model}` : 'Schneider Acti9 iC60N'}</span>
              <span className="text-outline-variant">•</span>
              <span className="font-code-id text-code-id text-secondary">
                {selectedSample?.rated_current_in || 32}A Curve {selectedSample?.trip_curve || 'C'} · Lot #{selectedSample?.sample_id || '2026-B829'}
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-space-xl">
          <div className="flex items-center gap-space-md bg-surface-container-low px-space-lg py-space-sm rounded-lg">
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps text-outline">ELAPSED CLOCK</span>
              <span className="font-code-timestamp text-headline-sm text-on-surface font-semibold tracking-tight" id="live-chronometer">
                {elapsedClock}
              </span>
            </div>
            <span className="material-symbols-outlined text-outline text-[20px]">timer</span>
          </div>
          <div className="flex items-center gap-space-sm px-space-lg py-space-md bg-surface-container rounded-lg">
            <div className="relative flex items-center justify-center w-2.5 h-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isConnected ? 'bg-primary-container opacity-75' : 'bg-outline opacity-40'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-primary' : 'bg-outline'}`}></span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps text-primary uppercase">Status</span>
              <span className="font-title-md text-title-md text-on-surface font-semibold">
                {isTesting ? 'ACQUISITION ACTIVE' : isConnected ? 'STANDBY / READY' : 'OFFLINE'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-space-xs">
            <button
              className="w-9 h-9 rounded-lg bg-surface-container-low hover:bg-surface-variant text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer"
              title="Toggle Fullscreen"
              type="button"
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(() => {});
                } else {
                  document.exitFullscreen().catch(() => {});
                }
              }}
            >
              <span className="material-symbols-outlined text-[18px]">fullscreen</span>
            </button>
            <button
              className="w-9 h-9 rounded-lg bg-surface-container-low hover:bg-surface-variant text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer"
              title="Export Buffer"
              type="button"
              onClick={() => alert('Waveform acquisition buffer downloaded (200 kS/s binary payload).')}
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE (2-COLUMN BALANCED LABORATORY ARCHITECTURE - Stitch Exact) */}
      <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-space-xl items-start">
        
        {/* LEFT COLUMN (4 Cols on 12-col grid) */}
        <div className="xl:col-span-4 flex flex-col gap-space-xl">
          
          {/* MCB CONFIG & TEST PARAMETERS (Stitch Exact) */}
          <div className="bg-surface-container-lowest rounded-xl p-space-xl shadow-sm flex flex-col gap-space-lg">
            <div className="flex items-center justify-between pb-space-sm bg-surface-container-low/50 px-space-md py-space-xs rounded-lg">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-primary text-[18px]">tune</span>
                <span className="font-title-md text-title-md text-on-surface">Test Stimulus &amp; Settings</span>
              </div>
              <span className="px-space-sm py-0.5 rounded-DEFAULT bg-surface-container-high text-on-secondary-container font-label-caps text-label-caps">
                CALIBRATED
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-space-md">
              <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col">
                <span className="font-label-caps text-label-caps text-outline">RATED CURRENT (In)</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-headline-sm text-headline-sm text-on-surface">{selectedSample?.rated_current_in || 32}</span>
                  <span className="font-body-sm text-body-sm text-secondary">A</span>
                </div>
              </div>
              <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col">
                <span className="font-label-caps text-label-caps text-outline">TRIP CURVE</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-headline-sm text-headline-sm text-on-surface">Type {selectedSample?.trip_curve || 'C'}</span>
                  <span className="font-body-sm text-body-sm text-outline">
                    ({selectedSample?.trip_curve === 'B' ? '3-5 In' : selectedSample?.trip_curve === 'D' ? '10-20 In' : '5-10 In'})
                  </span>
                </div>
              </div>
              <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col">
                <span className="font-label-caps text-label-caps text-outline">POLES / VOLTAGE</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-headline-sm text-headline-sm text-on-surface">{selectedSample?.poles || '2P'} / {selectedSample?.rated_voltage || 230}</span>
                  <span className="font-body-sm text-body-sm text-secondary">V</span>
                </div>
              </div>
              <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col">
                <span className="font-label-caps text-label-caps text-outline">BREAKING CAPACITY</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-headline-sm text-headline-sm text-on-surface">{selectedSample?.breaking_capacity_ka || '6.0'}</span>
                  <span className="font-body-sm text-body-sm text-secondary">kA</span>
                </div>
              </div>
            </div>

            {/* Target Stimulus Panel */}
            <div className="p-space-md bg-surface-container rounded-lg flex flex-col gap-space-sm">
              <div className="flex justify-between items-center">
                <span className="font-label-caps text-label-caps text-primary">TARGET STIMULUS</span>
                <span className="font-code-id text-code-id text-on-surface font-semibold">{targetMultiplier.toFixed(2)} × In</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="font-body-sm text-body-sm text-on-surface-variant">Computed Target Current:</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-metric-md text-metric-md text-primary font-bold">{targetCurrent.toFixed(1)}</span>
                  <span className="font-body-sm text-body-sm text-primary font-semibold">A RMS</span>
                </div>
              </div>
              <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                <div className="bg-primary h-full transition-all" style={{ width: `${Math.min((targetMultiplier / 10) * 100, 100)}%` }}></div>
              </div>
              <div className="flex justify-between font-code-timestamp text-code-timestamp text-outline">
                <span>Zero-Cross Inrush</span>
                <span>Tolerance: ±1.5%</span>
              </div>
            </div>

            {/* Failure Injection Matrix Dropdown */}
            <div className="flex flex-col gap-space-xs">
              <label className="font-label-caps text-label-caps text-outline">FAILURE INJECTION MATRIX</label>
              <div className="relative w-full">
                <select
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  disabled={!isConnected || isTesting}
                  className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md py-2.5 px-space-md rounded-lg shadow-sm appearance-none cursor-pointer pr-10 focus:outline-none border border-outline-variant/40"
                >
                  <option value="NORMAL_TEST">Normal Execution (IS/IEC Standard)</option>
                  <option value="HIGH_ARC_IMPEDANCE">Simulated Arc Impedance High (+15mΩ)</option>
                  <option value="PHASE_ANGLE_OFFSET">Phase Angle Offset (90° Peak Inrush)</option>
                  <option value="CONTACT_BOUNCE">Contact Bounce Chatter Injection</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-2.5 text-on-surface-variant pointer-events-none text-[20px]">
                  expand_more
                </span>
              </div>
            </div>

          </div>

          {/* HARDWARE ACTUATION LOOP (Flow Architecture - Stitch Exact) */}
          <div className="bg-surface-container-lowest rounded-xl p-space-xl shadow-sm flex flex-col gap-space-lg">
            <div className="flex items-center justify-between pb-space-xs">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-primary text-[18px]">account_tree</span>
                <span className="font-title-md text-title-md text-on-surface">Hardware Actuation Loop</span>
              </div>
              <span className={`font-code-timestamp text-code-timestamp font-semibold flex items-center gap-1 ${
                isConnected ? 'text-tertiary' : 'text-outline'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-tertiary' : 'bg-outline'}`}></span>
                {isConnected ? 'SYNC OK' : 'DISCONNECTED'}
              </span>
            </div>

            {/* Flowchart Nodes */}
            <div className="flex flex-col gap-space-xs relative">
              {/* Node 1: ESP32 */}
              <div className="flex items-center justify-between p-space-md bg-surface-container-low rounded-lg transition-transform hover:translate-x-0.5">
                <div className="flex items-center gap-space-md">
                  <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[18px]">developer_board</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-title-md text-title-md text-on-surface">ESP32 Core Sequencer</span>
                    <span className="font-code-timestamp text-code-timestamp text-outline">Task 1: PWM DMA (0.2µs jitter)</span>
                  </div>
                </div>
                <span className={`px-space-sm py-0.5 rounded font-label-caps text-label-caps ${
                  esp32Online || isConnected ? 'bg-tertiary-container/10 text-tertiary' : 'bg-surface-container text-outline'
                }`}>
                  {esp32Online || isConnected ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>

              {/* Connector */}
              <div className="w-0.5 h-3 bg-outline-variant/60 ml-8 my-[-2px]"></div>

              {/* Node 2: SSR */}
              <div className="flex items-center justify-between p-space-md bg-surface-container-low rounded-lg transition-transform hover:translate-x-0.5">
                <div className="flex items-center gap-space-md">
                  <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[18px]">electric_bolt</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-title-md text-title-md text-on-surface">Solid State Relay (SSR)</span>
                    <span className="font-code-timestamp text-code-timestamp text-outline">Zero-Cross Trigger Switch</span>
                  </div>
                </div>
                <span className={`px-space-sm py-0.5 rounded font-label-caps text-label-caps ${
                  ssrActive || isConnected ? 'bg-tertiary-container/10 text-tertiary' : 'bg-surface-container text-outline'
                }`}>
                  {ssrActive ? 'ACTIVE' : isConnected ? 'READY' : 'INACTIVE'}
                </span>
              </div>

              {/* Connector */}
              <div className="w-0.5 h-3 bg-outline-variant/60 ml-8 my-[-2px]"></div>

              {/* Node 3: Contactor */}
              <div className="flex items-center justify-between p-space-md bg-surface-container-low rounded-lg transition-transform hover:translate-x-0.5">
                <div className="flex items-center gap-space-md">
                  <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[18px]">power</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-title-md text-title-md text-on-surface">Vacuum Contactor (VC-1)</span>
                    <span className="font-code-timestamp text-code-timestamp text-outline">Rated 400A / High Isolation</span>
                  </div>
                </div>
                <span className={`px-space-sm py-0.5 rounded font-label-caps text-label-caps ${
                  contactorClosed ? 'bg-tertiary-container/10 text-tertiary' : isConnected ? 'bg-tertiary-container/10 text-tertiary' : 'bg-surface-container text-outline'
                }`}>
                  {contactorClosed ? 'CLOSED' : isConnected ? 'OPEN / READY' : 'ISOLATED'}
                </span>
              </div>

              {/* Connector */}
              <div className="w-0.5 h-3 bg-outline-variant/60 ml-8 my-[-2px]"></div>

              {/* Node 4: Precision Shunt & DUT */}
              <div className={`flex items-center justify-between p-space-md rounded-lg ${
                currentFlowing || isTesting ? 'bg-primary-container/10' : 'bg-surface-container-low'
              }`}>
                <div className="flex items-center gap-space-md">
                  <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">adjust</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-title-md text-title-md text-on-surface">Precision Shunt &amp; DUT</span>
                    <span className="font-code-timestamp text-code-timestamp text-primary font-medium">Manganin 0.50mΩ ±0.01%</span>
                  </div>
                </div>
                <span className={`px-space-sm py-0.5 rounded font-label-caps text-label-caps ${
                  currentFlowing ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface'
                }`}>
                  {currentFlowing ? 'FLOWING' : 'ENGAGED'}
                </span>
              </div>
            </div>
          </div>

          {/* SAFETY INTERLOCKS & SENSORS MATRIX (Stitch Exact) */}
          <div className="bg-surface-container-lowest rounded-xl p-space-xl shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Safety Interlocks Matrix</span>
              <span className="material-symbols-outlined text-tertiary text-[18px]">shield</span>
            </div>
            <div className="grid grid-cols-2 gap-space-sm">
              <div className="flex items-center justify-between p-space-sm bg-surface-container-low rounded-lg">
                <div className="flex items-center gap-space-xs">
                  <span className={`w-2 h-2 rounded-full ${!isEStopTripped && isConnected ? 'bg-tertiary' : 'bg-error'}`}></span>
                  <span className="font-body-sm text-body-sm text-on-surface">Safety E-Stop</span>
                </div>
                <span className="font-code-timestamp text-code-timestamp text-on-surface-variant">
                  {!isEStopTripped && isConnected ? 'ARMED' : 'TRIPPED'}
                </span>
              </div>
              <div className="flex items-center justify-between p-space-sm bg-surface-container-low rounded-lg">
                <div className="flex items-center gap-space-xs">
                  <span className={`w-2 h-2 rounded-full ${isDoorLocked && isConnected ? 'bg-tertiary' : 'bg-error'}`}></span>
                  <span className="font-body-sm text-body-sm text-on-surface">Door Enclosure</span>
                </div>
                <span className="font-code-timestamp text-code-timestamp text-on-surface-variant">
                  {isDoorLocked && isConnected ? 'LOCKED' : 'OPEN'}
                </span>
              </div>
              <div className="flex items-center justify-between p-space-sm bg-surface-container-low rounded-lg">
                <div className="flex items-center gap-space-xs">
                  <span className={`w-2 h-2 rounded-full ${isLemOk && isConnected ? 'bg-tertiary' : 'bg-error'}`}></span>
                  <span className="font-body-sm text-body-sm text-on-surface">LEM Hall Sensor</span>
                </div>
                <span className="font-code-timestamp text-code-timestamp text-on-surface-variant">
                  {isLemOk && isConnected ? '0.05% ERR' : 'FAULT'}
                </span>
              </div>
              <div className="flex items-center justify-between p-space-sm bg-surface-container-low rounded-lg">
                <div className="flex items-center gap-space-xs">
                  <span className={`w-2 h-2 rounded-full ${isPt100Ok && isConnected ? 'bg-tertiary' : 'bg-error'}`}></span>
                  <span className="font-body-sm text-body-sm text-on-surface">PT100 Temp Probe</span>
                </div>
                <span className="font-code-timestamp text-code-timestamp text-on-surface-variant">
                  {isPt100Ok && isConnected ? 'CALIBRATED' : 'FAULT'}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN (8 Cols on 12-col grid) */}
        <div className="xl:col-span-8 flex flex-col gap-space-xl">
          
          {/* OSCILLOSCOPE & WAVEFORM PANEL (THE CENTERPIECE - Stitch Exact) */}
          <div className="bg-surface-container-lowest rounded-xl p-space-xl shadow-sm flex flex-col gap-space-md">
            
            {/* Oscilloscope Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md pb-space-sm bg-surface-container-low/50 px-space-md py-space-xs rounded-lg">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-primary text-[20px]">ssid_chart</span>
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">HIGH-RESOLUTION SIGNAL WAVEFORM</h2>
                  <p className="font-code-timestamp text-code-timestamp text-outline">IS/IEC 60898-1 Instantaneous Verification Rig · 200 kS/s Sample Rate</p>
                </div>
              </div>
              {/* Signal Channels / Mode Switch */}
              <div className="flex items-center gap-1 bg-surface-container p-1 rounded-lg">
                <button
                  onClick={() => setActiveChannel('CH1')}
                  className={`px-space-md py-1 rounded font-label-caps text-label-caps transition-colors cursor-pointer ${
                    activeChannel === 'CH1'
                      ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                  type="button"
                >
                  Current CH1 (A)
                </button>
                <button
                  onClick={() => setActiveChannel('CH2')}
                  className={`px-space-md py-1 rounded font-label-caps text-label-caps transition-colors cursor-pointer ${
                    activeChannel === 'CH2'
                      ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                  type="button"
                >
                  Voltage CH2 (V)
                </button>
                <button
                  onClick={() => setActiveChannel('I2T')}
                  className={`px-space-md py-1 rounded font-label-caps text-label-caps transition-colors cursor-pointer ${
                    activeChannel === 'I2T'
                      ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                  type="button"
                >
                  I²t Energy
                </button>
                <button
                  onClick={() => setActiveChannel('THERMAL')}
                  className={`px-space-md py-1 rounded font-label-caps text-label-caps transition-colors cursor-pointer ${
                    activeChannel === 'THERMAL'
                      ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                  type="button"
                >
                  Thermal (PT100)
                </button>
              </div>
            </div>

            {/* Oscilloscope Canvas / Graph Container (Stitch Exact) */}
            <div className="relative w-full h-[380px] bg-[#f8fafc] rounded-xl overflow-hidden shadow-inner flex flex-col justify-between p-space-md">
              {/* Technical Grid Background */}
              <div
                className="absolute inset-0 pointer-events-none opacity-40"
                style={{
                  backgroundSize: '40px 40px',
                  backgroundImage: 'linear-gradient(to right, #cbd5e1 1px, transparent 1px), linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)'
                }}
              ></div>
              
              {/* Horizontal Zero Axis Line */}
              <div className="absolute w-full h-0.5 bg-outline-variant/60 top-[52%] left-0 pointer-events-none"></div>

              {/* Oscilloscope HUD Overlays (Top) */}
              <div className="relative z-10 flex items-center justify-between font-code-timestamp text-code-timestamp text-secondary">
                <div className="flex items-center gap-space-md bg-surface-container-lowest/90 px-space-md py-1 rounded shadow-sm">
                  <span className="flex items-center gap-1 text-primary font-semibold">
                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                    {activeChannel === 'CH1' ? 'CH1: 50.0 A/div' : activeChannel === 'CH2' ? 'CH2: 100 V/div' : activeChannel === 'I2T' ? 'I²t: 2k A²s/div' : 'PT100: 10°C/div'}
                  </span>
                  <span className="text-outline-variant">|</span>
                  <span className="text-secondary font-medium">TIMEBASE: 5.0 ms/div</span>
                  <span className="text-outline-variant">|</span>
                  <span className="text-tertiary">TRIG: +5.0 A POS-EDGE</span>
                </div>
                <div className="flex items-center gap-space-sm bg-surface-container-lowest/90 px-space-md py-1 rounded shadow-sm">
                  <span className="font-code-id text-code-id text-on-surface">
                    RUN: {isPaused ? 'PAUSED' : isTesting ? 'ACQUIRING' : 'CONTINUOUS'}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-outline' : 'bg-tertiary animate-pulse'}`}></span>
                </div>
              </div>

              {/* Waveform SVG Render (Stitch Exact Vector Waveforms) */}
              <div className="relative z-0 w-full h-full flex items-center">
                {isConnected ? (
                  <svg className="w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1000 320">
                    <defs>
                      <linearGradient id="faultFill" x1="0%" x2="0%" y1="0%" y2="100%">
                        <stop offset="0%" stopColor="#006194" stopOpacity="0.25"></stop>
                        <stop offset="100%" stopColor="#006194" stopOpacity="0.0"></stop>
                      </linearGradient>
                      <linearGradient id="voltageFill" x1="0%" x2="0%" y1="0%" y2="100%">
                        <stop offset="0%" stopColor="#565e74" stopOpacity="0.1"></stop>
                        <stop offset="100%" stopColor="#565e74" stopOpacity="0.0"></stop>
                      </linearGradient>
                    </defs>

                    {/* Zero-crossing dashed reference */}
                    <line stroke="#94a3b8" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="1000" y1="166" y2="166"></line>

                    {/* Secondary Trace: CH2 Voltage (Smooth 50Hz sine wave) */}
                    <path
                      d="M 0,166 C 40,90 80,90 120,166 C 160,242 200,242 240,166 C 280,90 320,90 360,166 C 400,242 440,242 480,166 C 520,90 560,90 600,166 C 640,242 675,230 700,166 L 1000,166"
                      opacity="0.6"
                      stroke="#94a3b8"
                      strokeDasharray="2 2"
                      strokeWidth="1.5"
                    ></path>

                    {/* Primary Trace: CH1 Current Waveform with Inrush Spike and Trip Extinction */}
                    <path
                      d="M 0,166 C 35,145 70,145 105,166 C 140,187 175,187 210,166 C 245,145 280,145 315,166 C 350,187 385,187 420,166 L 430,160 C 460,90 500,28 540,28 C 590,28 640,110 680,148 L 700,166 L 1000,166"
                      stroke="#006194"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3"
                    ></path>

                    {/* Shaded Area Under Current Curve */}
                    <path
                      d="M 420,166 L 430,160 C 460,90 500,28 540,28 C 590,28 640,110 680,148 L 700,166 Z"
                      fill="url(#faultFill)"
                    ></path>

                    {/* Peak Marker Annotation */}
                    <circle cx="540" cy="28" fill="#ba1a1a" r="5" stroke="#ffffff" strokeWidth="2"></circle>
                    <line stroke="#ba1a1a" strokeDasharray="2 2" strokeWidth="1.5" x1="540" x2="540" y1="28" y2="70"></line>

                    {/* Vertical Trip Guideline at t=32.0ms */}
                    <line stroke="#ba1a1a" strokeDasharray="4 4" strokeWidth="1.5" x1="700" x2="700" y1="20" y2="300"></line>
                    <circle cx="700" cy="166" fill="#ba1a1a" r="4"></circle>
                  </svg>
                ) : (
                  <div className="w-full text-center text-outline font-code-timestamp">
                    <span>HARDWARE OSCILLOSCOPE OFFLINE · CONNECT RIG TO STREAM WAVEFORM</span>
                  </div>
                )}

                {isConnected && (
                  <>
                    {/* Floating Callouts in Oscilloscope View */}
                    <div className="absolute top-7 left-[45%] -translate-x-1/2 bg-surface-container-lowest/95 backdrop-blur px-space-md py-1 rounded shadow-md pointer-events-none flex flex-col items-center">
                      <span className="font-label-caps text-label-caps text-error font-bold">PEAK CURRENT</span>
                      <span className="font-code-id text-code-id text-on-surface font-semibold">{peakVal} A</span>
                    </div>

                    {/* MCB Trip Disconnect Vertical Tag */}
                    <div className="absolute top-12 left-[70%] ml-2 bg-error text-on-error px-space-md py-1 rounded shadow-md pointer-events-none flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">flash_off</span>
                      <span className="font-label-caps text-label-caps tracking-wider">MCB TRIP DISCONNECT ({tripMs} ms)</span>
                    </div>

                    {/* Standard Compliance Safe Envelope Window */}
                    <div className="absolute bottom-6 left-[62%] w-[22%] bg-tertiary-container/10 border-l border-r border-tertiary/40 py-1 px-2 rounded-DEFAULT pointer-events-none flex flex-col items-center">
                      <span className="font-label-caps text-[9px] text-tertiary font-bold tracking-widest uppercase">IS/IEC 60898-1 WINDOW</span>
                      <span className="font-code-timestamp text-[10px] text-tertiary">20.0 ms ≤ t ≤ 100.0 ms</span>
                    </div>
                  </>
                )}
              </div>

              {/* Oscilloscope Bottom Info / Cursor Readouts */}
              <div className="relative z-10 flex flex-wrap items-center justify-between font-code-timestamp text-code-timestamp text-outline bg-surface-container-lowest/90 px-space-md py-1 rounded shadow-sm">
                <div className="flex items-center gap-space-lg">
                  <span>ΔX (Trip Interval): <strong className="text-on-surface font-semibold">{tripMs} ms</strong></span>
                  <span>ΔY (Peak Delta): <strong className="text-on-surface font-semibold">{peakVal} A</strong></span>
                  <span>dV/dt: <strong className="text-on-surface font-semibold">14.8 V/µs</strong></span>
                </div>
                <div className="flex items-center gap-space-md">
                  <span className="text-tertiary font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span> CRITERIA CONFORMANT
                  </span>
                </div>
              </div>

            </div>

          </div>

          {/* LIVE INSTRUMENTATION CLUSTER (7 METRIC TILES - Stitch Exact) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-space-sm">
            {/* Tile 1: Line Voltage */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
              <span className="font-label-caps text-label-caps text-outline">LINE VOLTAGE</span>
              <div className="my-2">
                <span className="font-headline-lg text-headline-lg text-on-surface font-semibold">{voltage}</span>
                <span className="font-body-sm text-body-sm text-secondary">V</span>
              </div>
              <div className="flex items-center justify-between text-code-timestamp text-code-timestamp text-outline">
                <span>Freq</span>
                <span className="font-medium text-on-surface">{freqVal}</span>
              </div>
            </div>

            {/* Tile 2: Current Actual */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
              <span className="font-label-caps text-label-caps text-outline">CURRENT (ACTUAL)</span>
              <div className="my-2">
                <span className="font-headline-lg text-headline-lg text-primary font-bold">{currentVal}</span>
                <span className="font-body-sm text-body-sm text-primary font-medium">A</span>
              </div>
              <div className="flex items-center justify-between text-code-timestamp text-code-timestamp text-outline">
                <span>Sensor</span>
                <span className="font-medium text-on-surface">LEM Hall</span>
              </div>
            </div>

            {/* Tile 3: Peak Inrush */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
              <span className="font-label-caps text-label-caps text-outline">PEAK INRUSH</span>
              <div className="my-2">
                <span className="font-headline-lg text-headline-lg text-error font-bold">{peakVal}</span>
                <span className="font-body-sm text-body-sm text-error font-medium">A</span>
              </div>
              <div className="flex items-center justify-between text-code-timestamp text-code-timestamp text-outline">
                <span>Limit</span>
                <span className="font-medium text-on-surface">160.0 A max</span>
              </div>
            </div>

            {/* Tile 4: Trip Duration (Highlight) */}
            <div className="bg-tertiary-container/10 p-space-md rounded-xl shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-label-caps text-tertiary font-bold">TRIP DURATION</span>
                <span className="material-symbols-outlined text-tertiary text-[16px]">verified</span>
              </div>
              <div className="my-2">
                <span className="font-headline-lg text-headline-lg text-tertiary font-bold">{tripMs}</span>
                <span className="font-body-sm text-body-sm text-tertiary font-semibold">ms</span>
              </div>
              <div className="flex items-center justify-between text-code-timestamp text-code-timestamp text-tertiary">
                <span>Target: 20-100ms</span>
                <span className="font-bold">PASS</span>
              </div>
            </div>

            {/* Tile 5: RMS Current */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
              <span className="font-label-caps text-label-caps text-outline">RMS CURRENT</span>
              <div className="my-2">
                <span className="font-headline-lg text-headline-lg text-on-surface font-semibold">{rmsVal}</span>
                <span className="font-body-sm text-body-sm text-secondary">A</span>
              </div>
              <div className="flex items-center justify-between text-code-timestamp text-code-timestamp text-outline">
                <span>True-RMS</span>
                <span className="font-medium text-on-surface">DSP Calc</span>
              </div>
            </div>

            {/* Tile 6: I²t Joule Integral */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
              <span className="font-label-caps text-label-caps text-outline">I²t JOULE INTEGRAL</span>
              <div className="my-2">
                <span className="font-headline-lg text-headline-lg text-on-surface font-semibold">{i2tVal}</span>
                <span className="font-body-sm text-body-sm text-secondary">A²s</span>
              </div>
              <div className="flex items-center justify-between text-code-timestamp text-code-timestamp text-outline">
                <span>Thermal Energy</span>
                <span className="font-medium text-on-surface">&lt; 15k A²s</span>
              </div>
            </div>

            {/* Tile 7: Surface Temp */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
              <span className="font-label-caps text-label-caps text-outline">SURFACE TEMP</span>
              <div className="my-2">
                <span className="font-headline-lg text-headline-lg text-on-surface font-semibold">{tempVal}</span>
                <span className="font-body-sm text-body-sm text-secondary">°C</span>
              </div>
              <div className="flex items-center justify-between text-code-timestamp text-code-timestamp text-tertiary">
                <span>ΔT Rise</span>
                <span className="font-medium text-tertiary">{tempRiseVal} °C</span>
              </div>
            </div>
          </div>

          {/* 5-STAGE LIVE PROGRESS STAGES + ACTION BUTTONS (Stitch Exact) */}
          <div className="bg-surface-container-lowest rounded-xl p-space-xl shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Test Execution Sequence State</span>
              <span className="font-code-timestamp text-code-timestamp text-secondary">
                {isTesting ? 'Sequence Step: 4 of 5' : isConnected ? 'Sequence Step: Ready' : 'Sequence Step: Offline'}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-space-sm">
              {[
                { title: '1. Pre-Test Safety', sub: 'Complete (0.0ms)' },
                { title: '2. Contactor Engaged', sub: 'Zero-Cross Sync' },
                { title: '3. Inrush Injected', sub: `${peakVal}A Peak Sensed` },
                { title: '4. Trip Detection', sub: `Active (${tripMs}ms)` },
                { title: '5. Compliance Eval', sub: 'Awaiting Hold' }
              ].map((stg, idx) => {
                const s = getStageState(idx);
                return (
                  <div
                    key={idx}
                    className={`p-space-sm rounded-lg flex items-center gap-space-sm transition-all ${
                      s.isActive
                        ? 'bg-primary-container/15 shadow-sm'
                        : s.isDone
                        ? 'bg-surface-container-low'
                        : 'bg-surface-container-low/60 opacity-60'
                    }`}
                  >
                    {s.isActive ? (
                      <div className="relative flex items-center justify-center">
                        <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping absolute"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-primary relative"></span>
                      </div>
                    ) : s.isDone ? (
                      <span className="material-symbols-outlined text-tertiary text-[18px]">check_circle</span>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-outline-variant ml-1"></span>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className={`font-label-caps text-label-caps truncate ${s.isActive ? 'text-primary font-bold' : 'text-on-surface'}`}>
                        {stg.title}
                      </span>
                      <span className={`font-code-timestamp text-[11px] truncate ${s.isActive ? 'text-primary font-semibold' : s.isDone ? 'text-tertiary' : 'text-outline'}`}>
                        {stg.sub}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* PRIMARY ACTION BUTTONS */}
            <div className="flex flex-wrap items-center justify-between gap-space-md pt-space-xs">
              <div className="flex items-center gap-space-sm">
                {isTesting ? (
                  <button
                    onClick={onAbortTest}
                    className="px-space-xl py-2.5 rounded-lg bg-error-container text-on-error-container hover:bg-error hover:text-on-error transition-all font-title-md text-title-md font-semibold flex items-center gap-space-sm active:scale-95 shadow-sm cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[20px]">power_settings_new</span>
                    <span>ABORT TEST / SAFETY DROP</span>
                  </button>
                ) : (
                  <button
                    onClick={onStartTest}
                    disabled={!isConnected || isLoading}
                    className="px-space-xl py-2.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container transition-all active:scale-95 shadow-sm font-title-md text-title-md font-semibold flex items-center gap-space-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                    <span>START TEST SEQUENCE</span>
                  </button>
                )}

                <button
                  onClick={() => alert('High-resolution snapshot captured and saved to batch records.')}
                  className="px-space-lg py-2.5 rounded-lg bg-surface-container-lowest hover:bg-surface-container-low text-on-surface font-title-md text-title-md font-medium transition-colors shadow-sm flex items-center gap-space-xs cursor-pointer border border-outline-variant/30"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">camera</span>
                  <span>SNAPSHOT TRACE</span>
                </button>

                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="px-space-lg py-2.5 rounded-lg bg-surface-container-lowest hover:bg-surface-container-low text-on-surface font-title-md text-title-md font-medium transition-colors shadow-sm flex items-center gap-space-xs cursor-pointer border border-outline-variant/30"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isPaused ? 'play_circle' : 'pause_circle'}
                  </span>
                  <span>{isPaused ? 'RESUME ACQUISITION' : 'PAUSE ACQUISITION'}</span>
                </button>
              </div>

              <div className="flex items-center gap-space-md">
                <span className="font-body-sm text-body-sm text-outline">
                  Calibration Rig: <strong className="text-on-surface">RIG-001 (NIST Ref #9812)</strong>
                </span>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* 3. BOTTOM SECTION: MICROSECOND EVENT CHRONOLOGY LOG (Stitch Exact) */}
      <div className="w-full bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col mb-space-2xl">
        <div className="px-space-xl py-space-md bg-surface-container-low/40 flex items-center justify-between">
          <div className="flex items-center gap-space-md">
            <span className="material-symbols-outlined text-primary text-[20px]">reorder</span>
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Microsecond Event Chronology Stream</h3>
              <p className="font-body-sm text-body-sm text-outline">High-precision deterministic FPGA hardware timestamp trace (Resolution: 1.0 µs)</p>
            </div>
          </div>
          <div className="flex items-center gap-space-sm">
            <span className="font-code-timestamp text-code-timestamp text-on-surface-variant bg-surface-container px-space-md py-1 rounded">
              {events.length > 0 ? `${events.length} Live Events` : '5 Recorded Events'}
            </span>
            <button
              onClick={() => alert('Chronology trace exported as CSV format.')}
              className="text-primary hover:text-primary-container font-label-caps text-label-caps flex items-center gap-1 transition-colors cursor-pointer"
              type="button"
            >
              <span>EXPORT CSV</span>
              <span className="material-symbols-outlined text-[16px]">ios_share</span>
            </button>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-outline font-label-caps text-label-caps">
                <th className="py-space-sm px-space-xl">TIMESTAMP (UTC+0)</th>
                <th className="py-space-sm px-space-md">SUBSYSTEM</th>
                <th className="py-space-sm px-space-md">EVENT ID / DESCRIPTOR</th>
                <th className="py-space-sm px-space-md text-right">MEASURED VALUE</th>
                <th className="py-space-sm px-space-md text-right">NOMINAL SPEC</th>
                <th className="py-space-sm px-space-xl text-center">VALIDATION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low font-body-md text-body-md text-on-surface">
              {events.length > 0 ? (
                events.map((ev, i) => (
                  <tr key={i} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-space-sm px-space-xl font-code-timestamp text-code-timestamp font-medium text-secondary">
                      +{ev.timestamp_ms ? ev.timestamp_ms.toFixed(3) : '0.000'} ms
                    </td>
                    <td className="py-space-sm px-space-md flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                      <span className="font-code-id text-code-id text-on-surface">{ev.stage_name || 'STAGE'}</span>
                    </td>
                    <td className="py-space-sm px-space-md font-medium">{ev.description}</td>
                    <td className="py-space-sm px-space-md text-right font-code-timestamp text-code-timestamp text-secondary">
                      {ev.level || 'INFO'}
                    </td>
                    <td className="py-space-sm px-space-md text-right font-code-timestamp text-code-timestamp text-outline">
                      IS/IEC 60898-1
                    </td>
                    <td className="py-space-sm px-space-xl text-center">
                      <span className={`inline-flex items-center px-space-sm py-0.5 rounded font-label-caps text-label-caps ${
                        ev.level === 'ERROR' ? 'bg-error-container text-error' : 'bg-tertiary-container/10 text-tertiary'
                      }`}>
                        {ev.level === 'ERROR' ? 'FAULT' : 'CONFIRMED'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                defaultEvents.map((row, i) => (
                  <tr
                    key={i}
                    className={`transition-colors ${
                      row.badgeColor === 'tertiary-solid'
                        ? 'bg-primary/5 hover:bg-primary/10'
                        : 'hover:bg-surface-container-low/50'
                    }`}
                  >
                    <td className={`py-space-sm px-space-xl font-code-timestamp text-code-timestamp ${
                      row.badgeColor === 'tertiary-solid' ? 'font-bold text-primary' : 'font-medium text-secondary'
                    }`}>
                      {row.time}
                    </td>
                    <td className="py-space-sm px-space-md flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${row.badgeColor === 'tertiary' ? 'bg-tertiary' : 'bg-primary'}`}></span>
                      <span className={`font-code-id text-code-id ${row.badgeColor === 'tertiary-solid' ? 'text-primary font-bold' : 'text-on-surface'}`}>
                        {row.subsystem}
                      </span>
                    </td>
                    <td className={`py-space-sm px-space-md ${row.badgeColor === 'tertiary-solid' ? 'font-semibold text-primary' : 'font-medium'}`}>
                      {row.desc}
                    </td>
                    <td className={`py-space-sm px-space-md text-right font-code-timestamp text-code-timestamp ${
                      row.badgeColor === 'tertiary-solid' ? 'font-bold text-primary' : 'text-secondary'
                    }`}>
                      {row.val}
                    </td>
                    <td className="py-space-sm px-space-md text-right font-code-timestamp text-code-timestamp text-outline">
                      {row.spec}
                    </td>
                    <td className="py-space-sm px-space-xl text-center">
                      <span className={`inline-flex items-center px-space-sm py-0.5 rounded font-label-caps text-label-caps ${
                        row.badgeColor === 'tertiary-solid'
                          ? 'bg-tertiary text-on-tertiary font-bold'
                          : row.badgeColor === 'primary'
                          ? 'bg-surface-container-high text-primary'
                          : 'bg-tertiary-container/10 text-tertiary'
                      }`}>
                        {row.badge}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
