import React from 'react';
import { Play, Square, AlertOctagon, CheckCircle2, ShieldAlert, AlertTriangle } from 'lucide-react';
import { SystemStatus, TelemetryData } from '../types';

interface TestControlsProps {
  status: SystemStatus;
  telemetry: TelemetryData | null;
  onStartTest: () => void;
  onAbortTest: () => void;
  isLoading: boolean;
}

export const TestControls: React.FC<TestControlsProps> = ({
  status,
  telemetry,
  onStartTest,
  onAbortTest,
  isLoading
}) => {
  const isConnected = status.connected;
  const isTesting = telemetry?.machineState === 'TESTING';
  const isPermissionReady = status.testPermission === 'READY';
  const blockedReasons = status.blockedReasons || [];

  return (
    <div className="eng-panel p-4 font-mono text-xs space-y-4">
      
      {/* Test Permission Status Banner */}
      <div className={`p-3 rounded-lg border flex flex-col gap-2 ${
        isPermissionReady
          ? 'bg-[#0e2118] border-emerald-500/40 text-emerald-300'
          : 'bg-[#1b151e] border-rose-900/60 text-slate-300'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isPermissionReady ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
            <span className="font-bold uppercase tracking-wider text-xs">
              TEST PERMISSION: <span className={isPermissionReady ? 'text-emerald-400' : 'text-rose-400'}>{status.testPermission}</span>
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {isTesting ? 'ACTIVE CYCLE' : isConnected ? 'ARMED' : 'STANDBY'}
          </span>
        </div>

        {!isPermissionReady && (
          <div className="text-[11px] text-slate-400 space-y-1 bg-[#100d14] p-2.5 rounded border border-rose-950">
            <span className="text-amber-400 font-bold block text-[10px] uppercase">PERMISSION REQUIREMENTS BLOCKED:</span>
            {blockedReasons.length > 0 ? (
              blockedReasons.map((r, i) => (
                <div key={i} className="flex items-center gap-1.5 text-rose-300/90">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  <span>{r}</span>
                </div>
              ))
            ) : (
              <div className="text-rose-300">Connect the MCB testing machine to begin a live test.</div>
            )}
          </div>
        )}
      </div>

      {/* Primary Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        
        {/* START TEST */}
        <button
          onClick={onStartTest}
          disabled={!isPermissionReady || isTesting || isLoading}
          className={`eng-btn py-3 text-sm font-bold uppercase tracking-wider rounded-lg transition-all ${
            isPermissionReady && !isTesting
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-500/20'
              : 'bg-[#151c2c] text-slate-500 border-[#222d42] cursor-not-allowed'
          }`}
        >
          <Play className="w-4 h-4 fill-current" />
          <span>START TEST</span>
        </button>

        {/* ABORT TEST */}
        <button
          onClick={onAbortTest}
          disabled={!isTesting}
          className={`eng-btn py-3 text-sm font-bold uppercase tracking-wider rounded-lg transition-all ${
            isTesting
              ? 'bg-rose-700 hover:bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/30 animate-pulse'
              : 'bg-[#151c2c] text-slate-600 border-[#222d42] cursor-not-allowed'
          }`}
        >
          <Square className="w-4 h-4 fill-current" />
          <span>ABORT TEST</span>
        </button>

      </div>

    </div>
  );
};
