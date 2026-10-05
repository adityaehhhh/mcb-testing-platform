import React from 'react';
import { X, ListOrdered } from 'lucide-react';
import { TestTimeline } from './TestTimeline';
import { TelemetryData, TestEvent } from '../types';

interface TestSequenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: TelemetryData | null;
  events: TestEvent[];
}

export const TestSequenceModal: React.FC<TestSequenceModalProps> = ({
  isOpen,
  onClose,
  telemetry,
  events
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-[#101726] border border-[#23334d] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden font-mono text-xs">
        
        {/* Header */}
        <div className="bg-[#0b0f19] px-4 py-3 border-b border-[#23334d] flex items-center justify-between">
          <div className="flex items-center gap-2 text-cyan-400 font-bold">
            <ListOrdered className="w-4 h-4" />
            <span className="text-xs uppercase">Full Test Execution Sequence</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Timeline Content */}
        <div className="p-4 overflow-y-auto max-h-[75vh]">
          <TestTimeline telemetry={telemetry} events={events} />
        </div>

      </div>
    </div>
  );
};
