import React from 'react';
import { Cpu, ToggleRight, Zap, Flame, ShieldCheck } from 'lucide-react';
import { TelemetryData } from '../types';

interface ControlChainProps {
  telemetry: TelemetryData | null;
  isConnected: boolean;
}

export const ControlChain: React.FC<ControlChainProps> = ({ telemetry, isConnected }) => {
  const esp32State = isConnected && telemetry ? telemetry.esp32State : 'DISCONNECTED';
  const relayState = isConnected && telemetry ? telemetry.relayState : 'OFF';
  const contactorState = isConnected && telemetry ? telemetry.contactorState : 'OPEN';
  const loadState = isConnected && telemetry ? telemetry.loadState : 'OFF';
  const mcbState = isConnected && telemetry ? telemetry.mcbState : 'UNKNOWN';

  return (
    <div className="card-stitch font-mono text-xs">
      
      {/* Panel Header */}
      <div className="card-header-stitch">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#48d7f9]" />
          <span className="text-white font-bold tracking-wide text-xs">ELECTRICAL CONTROL CHAIN (HARDWARE LOOP)</span>
        </div>
        <span className="text-[9px] text-[#8d9baf] bg-[#0d141e] px-2 py-0.5 rounded border border-[#232a36]">
          230V AC RIG TOPOLOGY
        </span>
      </div>

      {/* Interactive Control Block Pipeline */}
      <div className="p-3.5 grid grid-cols-1 md:grid-cols-5 gap-2.5">
        
        {/* Step 1: ESP32 MCU */}
        <div className={`p-3 rounded border text-center transition-all ${
          esp32State === 'ONLINE'
            ? 'bg-[#151c27] border-[#44dfab]/40 text-[#44dfab]'
            : 'bg-[#151c27] border-[#232a36] text-[#596980]'
        }`}>
          <div className="flex justify-center mb-1.5">
            <Cpu className={`w-5 h-5 ${esp32State === 'ONLINE' ? 'text-[#44dfab]' : 'text-[#596980]'}`} />
          </div>
          <div className="font-bold text-[11px] text-white">ESP32 / MCU</div>
          <div className="text-[9px] text-[#8d9baf]">Core Controller</div>
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[9px] font-bold">
            <span className={`w-2 h-2 rounded-full ${esp32State === 'ONLINE' ? 'bg-[#44dfab] shadow-[0_0_8px_rgba(68,223,171,0.6)]' : 'bg-[#596980]'}`} />
            <span>{esp32State}</span>
          </div>
        </div>

        {/* Step 2: Relay Modules */}
        <div className={`p-3 rounded border text-center transition-all ${
          relayState === 'ACTIVE'
            ? 'bg-[#151c27] border-[#44dfab]/40 text-[#44dfab]'
            : relayState === 'READY'
            ? 'bg-[#151c27] border-[#48d7f9]/40 text-[#48d7f9]'
            : 'bg-[#151c27] border-[#232a36] text-[#596980]'
        }`}>
          <div className="flex justify-center mb-1.5">
            <ToggleRight className={`w-5 h-5 ${relayState !== 'OFF' ? 'text-[#48d7f9]' : 'text-[#596980]'}`} />
          </div>
          <div className="font-bold text-[11px] text-white">RELAY MODULE</div>
          <div className="text-[9px] text-[#8d9baf]">Optocoupled 24V</div>
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[9px] font-bold">
            <span className={`w-2 h-2 rounded-full ${relayState === 'ACTIVE' ? 'bg-[#44dfab]' : relayState === 'READY' ? 'bg-[#48d7f9]' : 'bg-[#596980]'}`} />
            <span>{relayState}</span>
          </div>
        </div>

        {/* Step 3: Power Contactor */}
        <div className={`p-3 rounded border text-center transition-all ${
          contactorState === 'CLOSED'
            ? 'bg-[#151c27] border-[#f9bc45] text-[#f9bc45] shadow-[0_0_12px_rgba(249,188,69,0.15)]'
            : contactorState === 'CLOSING'
            ? 'bg-[#151c27] border-[#f9bc45]/50 text-[#f9bc45] animate-pulse'
            : 'bg-[#151c27] border-[#232a36] text-[#596980]'
        }`}>
          <div className="flex justify-center mb-1.5">
            <Zap className={`w-5 h-5 ${contactorState === 'CLOSED' ? 'text-[#f9bc45]' : 'text-[#596980]'}`} />
          </div>
          <div className="font-bold text-[11px] text-white">CONTACTOR</div>
          <div className="text-[9px] text-[#8d9baf]">Heavy AC-3 Bay</div>
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[9px] font-bold">
            <span className={`w-2 h-2 rounded-full ${contactorState === 'CLOSED' ? 'bg-[#f9bc45] shadow-[0_0_8px_rgba(249,188,69,0.6)]' : 'bg-[#596980]'}`} />
            <span>{contactorState}</span>
          </div>
        </div>

        {/* Step 4: Load Bank / Heating Coils */}
        <div className={`p-3 rounded border text-center transition-all ${
          loadState === 'ACTIVE'
            ? 'bg-[#151c27] border-[#ff4d5a] text-[#ff4d5a]'
            : 'bg-[#151c27] border-[#232a36] text-[#596980]'
        }`}>
          <div className="flex justify-center mb-1.5">
            <Flame className={`w-5 h-5 ${loadState === 'ACTIVE' ? 'text-[#ff4d5a]' : 'text-[#596980]'}`} />
          </div>
          <div className="font-bold text-[11px] text-white">LOAD BANK</div>
          <div className="text-[9px] text-[#8d9baf]">NiCr Coils Array</div>
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[9px] font-bold">
            <span className={`w-2 h-2 rounded-full ${loadState === 'ACTIVE' ? 'bg-[#ff4d5a]' : 'bg-[#596980]'}`} />
            <span>{loadState}</span>
          </div>
        </div>

        {/* Step 5: MCB Under Test */}
        <div className={`p-3 rounded border text-center transition-all ${
          mcbState === 'TRIPPED'
            ? 'bg-[#151c27] border-[#ff4d5a] text-[#ff4d5a]'
            : mcbState === 'TESTING'
            ? 'bg-[#151c27] border-[#48d7f9] text-[#48d7f9]'
            : mcbState === 'READY'
            ? 'bg-[#151c27] border-[#44dfab]/40 text-[#44dfab]'
            : 'bg-[#151c27] border-[#232a36] text-[#596980]'
        }`}>
          <div className="flex justify-center mb-1.5">
            <ShieldCheck className={`w-5 h-5 ${
              mcbState === 'TRIPPED' ? 'text-[#ff4d5a]' : mcbState === 'TESTING' ? 'text-[#48d7f9]' : 'text-[#44dfab]'
            }`} />
          </div>
          <div className="font-bold text-[11px] text-white">MCB (DUT)</div>
          <div className="text-[9px] text-[#8d9baf]">DUT Station</div>
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[9px] font-bold">
            <span className={`w-2 h-2 rounded-full ${
              mcbState === 'TRIPPED' ? 'bg-[#ff4d5a]' : mcbState === 'TESTING' ? 'bg-[#48d7f9]' : mcbState === 'READY' ? 'bg-[#44dfab]' : 'bg-[#596980]'
            }`} />
            <span>{mcbState}</span>
          </div>
        </div>

      </div>

    </div>
  );
};
