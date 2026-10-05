import React from 'react';
import { TelemetryData } from '../types';

interface LiveTelemetryProps {
  telemetry: TelemetryData | null;
  isConnected: boolean;
  ratedIn?: number;
}

export const LiveTelemetry: React.FC<LiveTelemetryProps> = ({
  telemetry,
  isConnected,
  ratedIn = 32
}) => {
  const voltage = isConnected && telemetry ? telemetry.voltage.toFixed(1) : '--';
  const current = isConnected && telemetry ? telemetry.current.toFixed(1) : '--';
  const peakCurrent = isConnected && telemetry ? telemetry.peakCurrent.toFixed(1) : '--';
  const tripTime = isConnected && telemetry && telemetry.tripTimeMs !== null ? telemetry.tripTimeMs.toFixed(1) : '--';

  const rmsCurrent = isConnected && telemetry ? `${telemetry.rmsCurrent.toFixed(1)} A` : '--';
  const frequency = isConnected && telemetry ? `${telemetry.frequency.toFixed(2)} Hz` : '--';
  const mcbTemp = isConnected && telemetry ? `${telemetry.mcbTemp.toFixed(1)} °C` : '--';
  const tempRise = isConnected && telemetry ? `+${telemetry.tempRise.toFixed(1)} °C` : '--';
  const powerKw = isConnected && telemetry ? `${(telemetry.power / 1000).toFixed(2)} kW` : '--';
  const iOverIn = isConnected && telemetry ? `${(telemetry.rmsCurrent / ratedIn).toFixed(2)} ×` : '--';
  const i2t = isConnected && telemetry ? `${telemetry.i2t.toLocaleString()} A²s` : '--';

  return (
    <section className="bg-[#151c27] border border-[#3c494d]/80 p-3 flex flex-col gap-3 rounded font-mono text-xs">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#3c494d]/60 pb-1.5">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full inline-block ${isConnected ? 'bg-[#48d7f9] animate-pulse' : 'bg-[#869397]'}`} />
          <span className="font-bold uppercase text-[#dce2f2] tracking-wider text-xs font-sans">
            LIVE TELEMETRY READOUT
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[#bcc9cd]">
          <span>SAMPLING:</span>
          <span className="text-[#48d7f9] font-bold">100 kHz</span>
          <span className="text-[#3c494d]">|</span>
          <span>BUFFER:</span>
          <span className={`font-bold ${isConnected ? 'text-[#44dfab]' : 'text-[#869397]'}`}>
            {isConnected ? 'LIVE STREAM' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Primary 4 Major Readout Tiles (Stitch Exact Layout) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        
        {/* Voltage Tile */}
        <div className="bg-[#19202b] p-2.5 border border-[#3c494d] rounded flex flex-col justify-between">
          <span className="text-[9px] text-[#bcc9cd] uppercase">VOLTAGE (RMS)</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-[#dce2f2] font-mono">{voltage}</span>
            <span className="text-[10px] text-[#48d7f9] font-bold">V</span>
          </div>
        </div>

        {/* Current Tile (Prominent Cyan Border in Stitch) */}
        <div className="bg-[#19202b] p-2.5 border border-[#48d7f9] rounded flex flex-col justify-between shadow-sm">
          <span className="text-[9px] text-[#48d7f9] uppercase font-bold">CURRENT (ACTUAL)</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-[#48d7f9] font-mono">{current}</span>
            <span className="text-[10px] text-[#48d7f9] font-bold">A</span>
          </div>
        </div>

        {/* Peak Current Tile */}
        <div className="bg-[#19202b] p-2.5 border border-[#3c494d] rounded flex flex-col justify-between">
          <span className="text-[9px] text-[#f9bc45] uppercase font-bold">PEAK CURRENT</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-[#f9bc45] font-mono">{peakCurrent}</span>
            <span className="text-[10px] text-[#f9bc45] font-bold">A</span>
          </div>
        </div>

        {/* Trip Time Tile */}
        <div className="bg-[#19202b] p-2.5 border border-[#44dfab] rounded flex flex-col justify-between">
          <span className="text-[9px] text-[#44dfab] uppercase font-bold">TRIP TIME</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-[#44dfab] font-mono">{tripTime}</span>
            <span className="text-[10px] text-[#44dfab] font-bold">ms</span>
          </div>
        </div>

      </div>

      {/* Secondary & Calculated Readout Matrix (Stitch Exact 8 metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-[#3c494d]/60 text-[11px]">
        
        <div className="flex flex-col">
          <span className="text-[#bcc9cd] uppercase text-[9px]">RMS Current</span>
          <span className="font-semibold text-[#dce2f2]">{rmsCurrent}</span>
        </div>

        <div className="flex flex-col">
          <span className="text-[#bcc9cd] uppercase text-[9px]">Frequency</span>
          <span className="font-semibold text-[#dce2f2]">{frequency}</span>
        </div>

        <div className="flex flex-col">
          <span className="text-[#bcc9cd] uppercase text-[9px]">MCB Case Temp</span>
          <span className="font-semibold text-[#f9bc45]">{mcbTemp}</span>
        </div>

        <div className="flex flex-col">
          <span className="text-[#bcc9cd] uppercase text-[9px]">Temp Rise (ΔT)</span>
          <span className="font-semibold text-[#f9bc45]">{tempRise}</span>
        </div>

        <div className="flex flex-col pt-1">
          <span className="text-[#bcc9cd] uppercase text-[9px]">Active Power (P)</span>
          <span className="font-semibold text-[#48d7f9]">{powerKw}</span>
        </div>

        <div className="flex flex-col pt-1">
          <span className="text-[#bcc9cd] uppercase text-[9px]">Ratio (I / In)</span>
          <span className="font-semibold text-[#44dfab]">{iOverIn}</span>
        </div>

        <div className="flex flex-col pt-1">
          <span className="text-[#bcc9cd] uppercase text-[9px]">Joule Integral (I²t)</span>
          <span className="font-semibold text-[#48d7f9]">{i2t}</span>
        </div>

        <div className="flex flex-col pt-1">
          <span className="text-[#bcc9cd] uppercase text-[9px]">Power Factor (cos φ)</span>
          <span className="font-semibold text-[#dce2f2]">0.998</span>
        </div>

      </div>

    </section>
  );
};
