import React from 'react';
import { ListOrdered, CheckCircle2, Clock, Zap, ShieldCheck, FileCheck } from 'lucide-react';
import { TelemetryData, TestEvent } from '../types';

interface TestTimelineProps {
  telemetry: TelemetryData | null;
  events: TestEvent[];
}

export const TestTimeline: React.FC<TestTimelineProps> = ({ telemetry, events }) => {
  const currentStage = telemetry?.currentStage || 'OFFLINE';

  const stages = [
    'PRE-TEST SAFETY CHECK',
    'CONTACTOR INITIALIZATION',
    'LOAD PREPARATION',
    'CURRENT APPLICATION',
    'LIVE MEASUREMENT & TRIP MONITORING',
    'MCB TRIP DETECTED',
    'DATA ANALYSIS & I²t INTEGRATION',
    'COMPLIANCE EVALUATION (IS/IEC 60898-1)',
    'RESULT & REPORT GENERATION',
    'TEST COMPLETE'
  ];

  const getStageIndex = (stage: string) => {
    return stages.findIndex(s => stage.toUpperCase().includes(s.slice(0, 10)));
  };

  const activeIdx = getStageIndex(currentStage);

  return (
    <div className="eng-panel p-4 font-mono text-xs space-y-3">
      
      {/* Timeline Header */}
      <div className="flex items-center justify-between border-b border-[#222f46] pb-2">
        <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider text-xs">
          <ListOrdered className="w-4 h-4" />
          <span>TEST STAGES & SEQUENCE TIMELINE</span>
        </div>
        <span className="text-[10px] text-cyan-300 font-bold bg-[#142337] px-2 py-0.5 rounded border border-cyan-800">
          STAGE: {currentStage}
        </span>
      </div>

      {/* Progressive Stage Stepper */}
      <div className="space-y-1.5 pt-1">
        {stages.map((stage, idx) => {
          const isPassed = activeIdx > idx;
          const isActive = activeIdx === idx;

          return (
            <div
              key={idx}
              className={`flex items-center justify-between p-2 rounded text-xs transition-all ${
                isActive
                  ? 'bg-cyan-950/60 border border-cyan-500 text-cyan-200 font-bold shadow-sm shadow-cyan-500/20 animate-pulse'
                  : isPassed
                  ? 'bg-[#0f1d16] border border-emerald-900/60 text-emerald-400'
                  : 'bg-[#0a0f19] border border-[#1a2335] text-slate-500'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 font-black'
                    : isPassed
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  {idx + 1}
                </span>
                <span className="text-[11px]">{stage}</span>
              </div>

              <div>
                {isPassed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : isActive ? (
                  <span className="text-[9px] text-cyan-400 uppercase tracking-widest font-bold">ACTIVE</span>
                ) : (
                  <span className="text-[9px] text-slate-600 uppercase">PENDING</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Event Feed */}
      {events && events.length > 0 && (
        <div className="pt-2 border-t border-[#222f46] space-y-1">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Latest Test Events:</div>
          <div className="max-h-24 overflow-y-auto space-y-1 bg-[#090d16] p-2 rounded border border-slate-800 text-[10px]">
            {events.slice(-4).reverse().map((ev, i) => (
              <div key={i} className="flex items-start gap-1.5 text-slate-300">
                <span className="text-cyan-400 font-mono shrink-0">+{ev.timestamp_ms}ms:</span>
                <span>{ev.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
