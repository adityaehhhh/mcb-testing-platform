import React, { useState, useEffect, useRef } from 'react';
import { TelemetryData, TestEvent } from '../types';

export type ChannelId = 
  | 'CURRENT' 
  | 'VOLTAGE' 
  | 'TEMPERATURE' 
  | 'I2T' 
  | 'RMS_CURRENT' 
  | 'RMS_VOLTAGE' 
  | 'POWER' 
  | 'FREQUENCY' 
  | 'PEAK_CURRENT' 
  | 'I_IN';

interface ChannelConfig {
  id: ChannelId;
  label: string;
  shortLabel: string;
  unit: string;
  color: string;
  scaleDiv: string;
  getValue: (t: TelemetryData) => number;
  format: (val: number) => string;
}

const CHANNELS: ChannelConfig[] = [
  {
    id: 'CURRENT',
    label: 'Current (Instantaneous)',
    shortLabel: 'CURRENT CH1',
    unit: 'A',
    color: '#006194', // Stitch Primary Blue
    scaleDiv: '50 A/div',
    getValue: (t) => t.current,
    format: (v) => `${v.toFixed(2)} A`
  },
  {
    id: 'VOLTAGE',
    label: 'Voltage (Instantaneous)',
    shortLabel: 'VOLTAGE CH2',
    unit: 'V',
    color: '#00668b',
    scaleDiv: '100 V/div',
    getValue: (t) => t.voltage,
    format: (v) => `${v.toFixed(1)} V`
  },
  {
    id: 'TEMPERATURE',
    label: 'Temperature (PT100)',
    shortLabel: 'TEMP (PT100)',
    unit: '°C',
    color: '#b86200', // Amber/Orange
    scaleDiv: '10 °C/div',
    getValue: (t) => t.mcbTemp,
    format: (v) => `${v.toFixed(1)} °C`
  },
  {
    id: 'I2T',
    label: 'I²t Joule Integral',
    shortLabel: 'I²t ENERGY',
    unit: 'A²s',
    color: '#ba1a1a', // Red
    scaleDiv: '2k A²s/div',
    getValue: (t) => t.i2t,
    format: (v) => `${v.toLocaleString()} A²s`
  },
  {
    id: 'RMS_CURRENT',
    label: 'True RMS Current',
    shortLabel: 'RMS CURRENT',
    unit: 'A',
    color: '#006d3c', // Green / Tertiary
    scaleDiv: '50 A/div',
    getValue: (t) => t.rmsCurrent,
    format: (v) => `${v.toFixed(2)} A`
  },
  {
    id: 'RMS_VOLTAGE',
    label: 'True RMS Voltage',
    shortLabel: 'RMS VOLTAGE',
    unit: 'V',
    color: '#4c626a',
    scaleDiv: '100 V/div',
    getValue: (t) => t.rmsVoltage,
    format: (v) => `${v.toFixed(1)} V`
  },
  {
    id: 'POWER',
    label: 'Active Power',
    shortLabel: 'POWER (P)',
    unit: 'W',
    color: '#7b5800',
    scaleDiv: '5 kW/div',
    getValue: (t) => t.power,
    format: (v) => v >= 1000 ? `${(v / 1000).toFixed(2)} kW` : `${v.toFixed(0)} W`
  },
  {
    id: 'FREQUENCY',
    label: 'Grid Frequency',
    shortLabel: 'FREQ (Hz)',
    unit: 'Hz',
    color: '#5b5b7e',
    scaleDiv: '1 Hz/div',
    getValue: (t) => t.frequency,
    format: (v) => `${v.toFixed(2)} Hz`
  },
  {
    id: 'PEAK_CURRENT',
    label: 'Peak Inrush Hold',
    shortLabel: 'PEAK CURRENT',
    unit: 'A',
    color: '#93000a',
    scaleDiv: '50 A/div',
    getValue: (t) => t.peakCurrent,
    format: (v) => `${v.toFixed(2)} A`
  },
  {
    id: 'I_IN',
    label: 'Normalized I / In Ratio',
    shortLabel: 'I / In RATIO',
    unit: '×In',
    color: '#386663',
    scaleDiv: '2 ×In/div',
    getValue: (t) => t.iOverIn,
    format: (v) => `${v.toFixed(2)} ×In`
  }
];

interface OscilloscopeProps {
  telemetry: TelemetryData | null;
  isConnected: boolean;
  events?: TestEvent[];
  lastCompletedTest?: any | null;
  activeTestId?: string | null;
}

interface TelemetryPoint {
  timestamp: number;
  current: number;
  voltage: number;
  temperature: number;
  i2t: number;
  rmsCurrent: number;
  rmsVoltage: number;
  power: number;
  frequency: number;
  peakCurrent: number;
  iOverIn: number;
  stage: string;
  tripDetected: boolean;
}

export const Oscilloscope: React.FC<OscilloscopeProps> = ({
  telemetry,
  isConnected,
  events = [],
  lastCompletedTest,
  activeTestId
}) => {
  const [activeChannel, setActiveChannel] = useState<ChannelId>('CURRENT');
  const [isPaused, setIsPaused] = useState(false);
  const [hoverData, setHoverData] = useState<{ x: number; y: number; text: string } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bufferRef = useRef<TelemetryPoint[]>([]);
  const lastTestIdRef = useRef<string | null>(null);

  const currentChannelConfig = CHANNELS.find((c) => c.id === activeChannel) || CHANNELS[0];

  // Reset buffer when a new test starts
  useEffect(() => {
    if (activeTestId && activeTestId !== lastTestIdRef.current) {
      lastTestIdRef.current = activeTestId;
      bufferRef.current = [];
    }
  }, [activeTestId]);

  // Ingest incoming telemetry data into the bounded rolling buffer
  useEffect(() => {
    if (!isConnected || !telemetry || isPaused) return;

    const buf = bufferRef.current;
    const pt: TelemetryPoint = {
      timestamp: telemetry.timestamp || Date.now(),
      current: telemetry.current,
      voltage: telemetry.voltage,
      temperature: telemetry.mcbTemp,
      i2t: telemetry.i2t,
      rmsCurrent: telemetry.rmsCurrent,
      rmsVoltage: telemetry.rmsVoltage,
      power: telemetry.power,
      frequency: telemetry.frequency,
      peakCurrent: telemetry.peakCurrent,
      iOverIn: telemetry.iOverIn,
      stage: telemetry.currentStage || '',
      tripDetected: telemetry.tripDetected
    };

    buf.push(pt);

    // Keep bounded history window (e.g. 240 samples = ~8-12 seconds of rolling trace)
    if (buf.length > 240) {
      buf.shift();
    }
  }, [telemetry, isConnected, isPaused]);

  // Real-time Canvas Rendering Engine
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }

      const width = canvas.width;
      const height = canvas.height;

      ctx.save();
      ctx.scale(dpr, dpr);
      const w = rect.width;
      const h = rect.height;

      // 1. Oscilloscope Background - Clean Dark Industrial Grid
      ctx.fillStyle = '#0f172a'; // Deep Slate Navy (engineering oscilloscope)
      ctx.fillRect(0, 0, w, h);

      // 2. Calibrated Grid (10 horizontal divs x 8 vertical divs)
      const numCols = 10;
      const numRows = 8;
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';

      for (let i = 0; i <= numCols; i++) {
        const x = (w / numCols) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      for (let j = 0; j <= numRows; j++) {
        const y = (h / numRows) * j;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Center Reference Line
      const midY = h / 2;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(w, midY);
      ctx.stroke();
      ctx.setLineDash([]);

      const buf = bufferRef.current;

      // When disconnected or no telemetry
      if (!isConnected || buf.length < 2) {
        ctx.fillStyle = '#64748b';
        ctx.font = '500 12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          isConnected ? 'ACQUIRING TELEMETRY STREAM...' : 'OSCILLOSCOPE OFFLINE · CONNECT RIG TO STREAM WAVEFORM',
          w / 2,
          h / 2
        );
        ctx.restore();
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // 3. Channel Value Extraction and Auto-Ranging
      const ch = currentChannelConfig;
      const rawValues = buf.map((p) => {
        switch (activeChannel) {
          case 'CURRENT': return p.current;
          case 'VOLTAGE': return p.voltage;
          case 'TEMPERATURE': return p.temperature;
          case 'I2T': return p.i2t;
          case 'RMS_CURRENT': return p.rmsCurrent;
          case 'RMS_VOLTAGE': return p.rmsVoltage;
          case 'POWER': return p.power;
          case 'FREQUENCY': return p.frequency;
          case 'PEAK_CURRENT': return p.peakCurrent;
          case 'I_IN': return p.iOverIn;
          default: return p.current;
        }
      });

      let minVal = Math.min(...rawValues);
      let maxVal = Math.max(...rawValues);

      // Add minimum range bounds per channel so flat lines don't blow up
      if (activeChannel === 'CURRENT' || activeChannel === 'RMS_CURRENT' || activeChannel === 'PEAK_CURRENT') {
        minVal = Math.min(0, minVal);
        maxVal = Math.max(maxVal * 1.15, 10);
      } else if (activeChannel === 'VOLTAGE' || activeChannel === 'RMS_VOLTAGE') {
        minVal = 0;
        maxVal = Math.max(maxVal * 1.1, 260);
      } else if (activeChannel === 'TEMPERATURE') {
        minVal = Math.max(0, minVal - 5);
        maxVal = Math.max(maxVal + 5, 45);
      } else if (activeChannel === 'I2T') {
        minVal = 0;
        maxVal = Math.max(maxVal * 1.2, 500);
      } else if (activeChannel === 'FREQUENCY') {
        minVal = 48.0;
        maxVal = 52.0;
      } else if (activeChannel === 'POWER') {
        minVal = 0;
        maxVal = Math.max(maxVal * 1.2, 1000);
      } else if (activeChannel === 'I_IN') {
        minVal = 0;
        maxVal = Math.max(maxVal * 1.2, 6.0);
      }

      const range = Math.max(maxVal - minVal, 0.001);
      const pointsCount = buf.length;
      const stepX = w / Math.max(pointsCount - 1, 1);

      // Function to map data value to canvas Y
      const getY = (v: number) => {
        const normalized = (v - minVal) / range;
        return h - (normalized * (h * 0.78) + (h * 0.11));
      };

      // 4. Fill Gradient Under Waveform
      ctx.beginPath();
      buf.forEach((_, i) => {
        const x = i * stepX;
        const y = getY(rawValues[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.lineTo((pointsCount - 1) * stepX, h);
      ctx.lineTo(0, h);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, `${ch.color}40`);
      grad.addColorStop(1, `${ch.color}00`);
      ctx.fillStyle = grad;
      ctx.fill();

      // 5. Draw Primary Waveform Line
      ctx.beginPath();
      ctx.strokeStyle = ch.color;
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      buf.forEach((_, i) => {
        const x = i * stepX;
        const y = getY(rawValues[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // 6. Dynamic Event Markers from actual timestamps
      let tripIndex = -1;
      let peakIndex = -1;
      let maxCurrentRecorded = -1;

      buf.forEach((pt, i) => {
        if (pt.current > maxCurrentRecorded) {
          maxCurrentRecorded = pt.current;
          peakIndex = i;
        }
        if (pt.tripDetected && tripIndex === -1) {
          tripIndex = i;
        }
      });

      // Peak Event Marker (if current test reached high load)
      if (peakIndex >= 0 && maxCurrentRecorded > 5.0) {
        const px = peakIndex * stepX;
        const py = getY(rawValues[peakIndex]);

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`PEAK: ${maxCurrentRecorded.toFixed(1)}A`, px, Math.max(16, py - 8));
      }

      // Trip Event Marker
      if (tripIndex >= 0) {
        const tx = tripIndex * stepX;

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(tx, 0);
        ctx.lineTo(tx, h);
        ctx.stroke();
        ctx.setLineDash([]);

        // Trip Tag Banner
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(tx - 36, 6, 72, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ MCB TRIP', tx, 18);
      }

      // 7. Dynamic HUD & Scale Overlay
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(8, 8, 190, 24);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(8, 8, 190, 24);

      ctx.fillStyle = ch.color;
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${ch.shortLabel}: ${ch.scaleDiv}`, 16, 24);

      // Latest Value Readout (Top Right)
      const latestVal = rawValues[rawValues.length - 1];
      const readoutText = `LIVE: ${ch.format(latestVal)}`;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(w - 180, 8, 172, 24);
      ctx.strokeRect(w - 180, 8, 172, 24);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(readoutText, w - 16, 24);

      // Bottom Units and Range Indicators
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`MAX: ${ch.format(maxVal)}`, 8, h - 8);
      ctx.textAlign = 'right';
      ctx.fillText(`MIN: ${ch.format(minVal)}`, w - 8, h - 8);

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isConnected, activeChannel, isPaused, currentChannelConfig]);

  // Mouse hover crosshair logic
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || bufferRef.current.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pointsCount = bufferRef.current.length;
    const index = Math.min(
      Math.max(0, Math.floor((x / rect.width) * pointsCount)),
      pointsCount - 1
    );

    const pt = bufferRef.current[index];
    if (pt) {
      const val = currentChannelConfig.getValue({
        voltage: pt.voltage,
        current: pt.current,
        mcbTemp: pt.temperature,
        i2t: pt.i2t,
        rmsCurrent: pt.rmsCurrent,
        rmsVoltage: pt.rmsVoltage,
        power: pt.power,
        frequency: pt.frequency,
        peakCurrent: pt.peakCurrent,
        iOverIn: pt.iOverIn
      } as any);

      setHoverData({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        text: `${currentChannelConfig.format(val)} (${pt.stage || 'STAGE'})`
      });
    }
  };

  const handleMouseLeave = () => {
    setHoverData(null);
  };

  return (
    <div className="w-full bg-surface-container-lowest rounded-xl p-space-lg sm:p-space-xl shadow-sm flex flex-col gap-space-md">
      
      {/* Top Header & Multi-Channel Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-sm bg-surface-container-low/50 px-space-md py-space-xs rounded-lg">
        <div className="flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-primary text-[22px]">ssid_chart</span>
          <div>
            <div className="flex items-center gap-space-xs">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">REAL-TIME SIGNAL OSCILLOSCOPE</h2>
              <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-primary font-label-caps text-label-caps">
                IS/IEC 60898-1 CALIBRATED
              </span>
            </div>
            <p className="font-code-timestamp text-code-timestamp text-outline">
              Synchronous Deterministic Telemetry Bus · Multi-Channel Transducer Array
            </p>
          </div>
        </div>

        {/* Channel Selection Buttons */}
        <div className="flex items-center gap-1 bg-surface-container p-1 rounded-lg overflow-x-auto max-w-full">
          {CHANNELS.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch.id)}
              className={`px-space-md py-1 rounded font-label-caps text-label-caps transition-all whitespace-nowrap cursor-pointer ${
                activeChannel === ch.id
                  ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              type="button"
            >
              {ch.shortLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Oscilloscope Viewport */}
      <div className="relative w-full h-[360px] sm:h-[400px] rounded-xl overflow-hidden shadow-inner border border-outline-variant/30 bg-[#0f172a]">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full block cursor-crosshair"
        />

        {/* Hover Crosshair Tooltip */}
        {hoverData && (
          <div
            className="absolute z-30 pointer-events-none bg-surface-container-lowest/95 backdrop-blur-sm border border-outline-variant/50 px-space-sm py-1 rounded shadow-lg font-code-timestamp text-code-timestamp text-on-surface"
            style={{
              left: `${Math.min(hoverData.x + 12, canvasRef.current ? canvasRef.current.clientWidth - 160 : hoverData.x)}px`,
              top: `${Math.max(hoverData.y - 28, 10)}px`
            }}
          >
            {hoverData.text}
          </div>
        )}

        {/* Sweep / Pause & Trigger State Bar */}
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between font-code-timestamp text-code-timestamp text-slate-400 pointer-events-none">
          <div className="flex items-center gap-space-md bg-slate-900/80 px-space-sm py-0.5 rounded border border-slate-700/50">
            <span>TIMEBASE: 5.0 ms/DIV</span>
            <span>COUPLING: DC/AC TRUE-RMS</span>
            <span>TRIGGER: AUTO &gt; 5.0 A</span>
          </div>
          <div className="flex items-center gap-space-sm pointer-events-auto">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="px-space-sm py-1 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-600 font-label-caps text-label-caps transition-colors cursor-pointer flex items-center gap-1"
              type="button"
            >
              <span className="material-symbols-outlined text-[14px]">
                {isPaused ? 'play_arrow' : 'pause'}
              </span>
              <span>{isPaused ? 'RESUME SWEEP' : 'HOLD / PAUSE'}</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
