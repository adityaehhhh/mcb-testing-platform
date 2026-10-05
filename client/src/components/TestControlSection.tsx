import React from 'react';
import { Play, Square, CheckCircle2, XCircle, FileText, QrCode, AlertTriangle } from 'lucide-react';
import { SystemStatus, TelemetryData, MCBSample } from '../types';

interface TestControlSectionProps {
  status: SystemStatus;
  telemetry: TelemetryData | null;
  selectedSample: MCBSample | null;
  targetMultiplier: number;
  onStartTest: () => void;
  onAbortTest: () => void;
  onOpenSequenceModal: () => void;
  onOpenReport: (testId: string) => void;
  onOpenQR: (testId: string) => void;
  lastCompletedTest: any | null;
  isLoading: boolean;
}

export const TestControlSection: React.FC<TestControlSectionProps> = ({
  status,
  telemetry,
  selectedSample,
  targetMultiplier,
  onStartTest,
  onAbortTest,
  onOpenSequenceModal,
  onOpenReport,
  onOpenQR,
  lastCompletedTest,
  isLoading
}) => {
  const isConnected = status.connected;
  const isTesting = telemetry?.machineState === 'TESTING';
  const isPermissionReady = status.testPermission === 'READY';
  const currentStage = telemetry?.currentStage || 'OFFLINE';

  const ratedIn = selectedSample?.rated_current_in || 32;
  const targetCurrent = +(ratedIn * targetMultiplier).toFixed(1);

  // 5 Compact Stages
  const stages = ['READY', 'TESTING', 'TRIP DETECTED', 'ANALYSIS', 'RESULT'];
  const getStageIndex = (stageStr: string) => {
    const s = stageStr.toUpperCase();
    if (s.includes('TRIP') || s.includes('TRIPPED')) return 2;
    if (s.includes('ANALYSIS') || s.includes('COMPLIANCE')) return 3;
    if (s.includes('COMPLETE') || s.includes('RESULT')) return 4;
    if (s.includes('CURRENT') || s.includes('MEASUREMENT') || s.includes('CONTACTOR') || s.includes('LOAD')) return 1;
    return isConnected ? 0 : -1;
  };

  const activeIdx = getStageIndex(currentStage);

  return (
    <div className="space-y-3 font-mono text-xs">
      
      {/* 1. TEST STATUS & DISPATCH */}
      <div className="card-stitch p-3.5 space-y-3">
        <div className="flex items-center justify-between border-b border-[#232a36] pb-2">
          <div className="flex items-center gap-1.5 text-white font-bold tracking-wide text-xs">
            <span className="text-[#8d9baf]">TEST STATUS:</span>
            <span className={isTesting ? 'text-[#48d7f9] animate-pulse' : isConnected ? 'text-[#44dfab]' : 'text-[#8d9baf]'}>
              {isTesting ? 'TEST IN PROGRESS' : isConnected ? 'READY TO DISPATCH' : 'DISCONNECTED'}
            </span>
          </div>
          <button
            onClick={onOpenSequenceModal}
            className="text-[10px] text-[#48d7f9] hover:underline"
          >
            14-Stage View
          </button>
        </div>

        {/* 5-Step Compact Horizontal Stepper */}
        <div className="grid grid-cols-5 gap-1">
          {stages.map((stg, idx) => {
            const isPassed = activeIdx > idx;
            const isActive = activeIdx === idx;
            return (
              <div
                key={idx}
                className={`py-1.5 px-0.5 rounded text-center border text-[9px] font-bold uppercase transition-colors ${
                  isActive
                    ? 'bg-[#19202b] border-[#48d7f9] text-[#48d7f9] shadow-[0_0_8px_rgba(72,215,249,0.3)] animate-pulse'
                    : isPassed
                    ? 'bg-[#151c27] border-[#44dfab]/40 text-[#44dfab]'
                    : 'bg-[#0d141e] border-[#232a36] text-[#596980]'
                }`}
              >
                {stg}
              </div>
            );
          })}
        </div>

        {/* Target Info Summary */}
        <div className="grid grid-cols-3 gap-2 bg-[#0d141e] p-2.5 rounded border border-[#232a36] text-[11px]">
          <div>
            <span className="text-[#8d9baf] text-[9px] uppercase block">TARGET</span>
            <span className="font-bold text-[#f9bc45]">{targetCurrent} A</span>
          </div>
          <div>
            <span className="text-[#8d9baf] text-[9px] uppercase block">RATIO</span>
            <span className="font-bold text-[#48d7f9]">{targetMultiplier.toFixed(2)}× In</span>
          </div>
          <div>
            <span className="text-[#8d9baf] text-[9px] uppercase block">STAGE</span>
            <span className="font-semibold text-white truncate block">{currentStage}</span>
          </div>
        </div>

        {/* Start / Stop Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <button
            onClick={onStartTest}
            disabled={!isPermissionReady || isTesting || isLoading}
            className={`py-2.5 px-3 text-xs font-bold uppercase tracking-wider rounded border flex items-center justify-center gap-1.5 transition-all ${
              isPermissionReady && !isTesting
                ? 'bg-[#48d7f9] hover:bg-[#38bdf8] text-[#070e19] border-[#48d7f9] shadow-[0_0_12px_rgba(72,215,249,0.3)] cursor-pointer font-black'
                : 'bg-[#19202b] text-[#596980] border-[#232a36] cursor-not-allowed'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>START TEST</span>
          </button>

          <button
            onClick={onAbortTest}
            disabled={!isTesting}
            className={`py-2.5 px-3 text-xs font-bold uppercase tracking-wider rounded border flex items-center justify-center gap-1.5 transition-all ${
              isTesting
                ? 'bg-[#ff4d5a] hover:bg-rose-600 text-white border-[#ff4d5a] shadow-[0_0_12px_rgba(255,77,90,0.4)] animate-pulse cursor-pointer'
                : 'bg-[#19202b] text-[#596980] border-[#232a36] cursor-not-allowed'
            }`}
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>STOP / ABORT</span>
          </button>
        </div>
      </div>

      {/* 2. TEST RESULT STATUS */}
      <div className="card-stitch p-3.5 space-y-3">
        <div className="flex items-center justify-between border-b border-[#232a36] pb-2">
          <span className="text-white font-bold tracking-wide text-xs">RESULT STATUS</span>
          {lastCompletedTest && (
            <span className="text-[10px] text-[#8d9baf]">
              ID: <strong className="text-[#48d7f9]">{lastCompletedTest.testId}</strong>
            </span>
          )}
        </div>

        {isTesting ? (
          <div className="py-6 text-center text-[#48d7f9] space-y-1">
            <div className="text-sm font-bold animate-pulse">TEST SEQUENCE ACTIVE</div>
            <div className="text-[10px] text-[#8d9baf]">Monitoring AC current application and contact separation</div>
          </div>
        ) : lastCompletedTest ? (
          <div className="space-y-2.5">
            {/* Verdict Badge */}
            <div className={`p-2.5 rounded border text-center font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2 ${
              lastCompletedTest.verdict === 'PASS'
                ? 'bg-[#151c27] border-[#44dfab] text-[#44dfab] shadow-[0_0_10px_rgba(68,223,171,0.2)]'
                : 'bg-[#151c27] border-[#ff4d5a] text-[#ff4d5a] shadow-[0_0_10px_rgba(255,77,90,0.2)]'
            }`}>
              {lastCompletedTest.verdict === 'PASS' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#44dfab]" />
                  <span>PASS — IS/IEC 60898-1 COMPLIANT</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-[#ff4d5a]" />
                  <span>FAIL — NON-COMPLIANT</span>
                </>
              )}
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#0d141e] p-2.5 rounded border border-[#232a36]">
              <div>
                <span className="text-[#8d9baf] text-[9px] uppercase block">Trip Time</span>
                <span className="font-bold text-[#ff4d5a] text-xs">{lastCompletedTest.tripTimeMs?.toFixed(1)} ms</span>
              </div>
              <div>
                <span className="text-[#8d9baf] text-[9px] uppercase block">Peak Current</span>
                <span className="font-bold text-[#f9bc45] text-xs">{lastCompletedTest.peakCurrent?.toFixed(1)} A</span>
              </div>
              <div>
                <span className="text-[#8d9baf] text-[9px] uppercase block">RMS Current</span>
                <span className="font-semibold text-white">{lastCompletedTest.rmsCurrent?.toFixed(1)} A</span>
              </div>
              <div>
                <span className="text-[#8d9baf] text-[9px] uppercase block">I²t (Energy)</span>
                <span className="font-semibold text-white">{lastCompletedTest.i2t?.toFixed(1)} A²s</span>
              </div>
            </div>

            {/* Failure reason if any */}
            {lastCompletedTest.failureReason && (
              <div className="text-[10px] text-[#ff4d5a] bg-[#0d141e] p-2 rounded border border-[#ff4d5a]/40 leading-snug">
                {lastCompletedTest.failureReason}
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => onOpenReport(lastCompletedTest.testId)}
                className="py-1.5 px-2 bg-[#19202b] hover:bg-[#232a36] text-white border border-[#3c494d] rounded text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-[#48d7f9]" />
                <span>REPORT (PDF)</span>
              </button>
              <button
                onClick={() => onOpenQR(lastCompletedTest.testId)}
                className="py-1.5 px-2 bg-[#19202b] hover:bg-[#232a36] text-white border border-[#3c494d] rounded text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <QrCode className="w-3.5 h-3.5 text-[#44dfab]" />
                <span>VERIFY QR</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-[#596980] space-y-1">
            <div className="text-xs font-semibold">—</div>
            <div className="text-[10px]">Awaiting test execution</div>
          </div>
        )}
      </div>

    </div>
  );
};
