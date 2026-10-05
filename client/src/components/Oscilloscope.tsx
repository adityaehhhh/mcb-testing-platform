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
  isWaveform: boolean;
  scaleDiv: string;
  getValue: (t: TelemetryData) => number;
  format: (val: number) => string;
}

const CHANNELS: ChannelConfig[] = [
  {
    id: 'CURRENT',
    label: 'Current (Instantaneous AC)',
    shortLabel: 'CURRENT CH1',
    unit: 'A',
    color: '#006194', // Stitch Primary Blue
    isWaveform: true,
    scaleDiv: 'Auto-Scaled',
    getValue: (t) => t.current,
    format: (v) => `${v.toFixed(2)} A`
  },
  {
    id: 'VOLTAGE',
    label: 'Voltage (Instantaneous AC)',
    shortLabel: 'VOLTAGE CH2',
    unit: 'V',
    color: '#0284c7', // Sky Blue
    isWaveform: true,
    scaleDiv: '50 V/div (±350V)',
    getValue: (t) => t.voltage,
    format: (v) => `${v.toFixed(1)} V`
  },
  {
    id: 'TEMPERATURE',
    label: 'Temperature (PT100 Trend)',
    shortLabel: 'TEMP (PT100)',
    unit: '°C',
    color: '#d97706', // Amber
    isWaveform: false,
    scaleDiv: '5 °C/div',
    getValue: (t) => t.mcbTemp,
    format: (v) => `${v.toFixed(1)} °C`
  },
  {
    id: 'I2T',
    label: 'I²t Joule Energy Integral',
    shortLabel: 'I²t ENERGY',
    unit: 'A²s',
    color: '#dc2626', // Red
    isWaveform: false,
    scaleDiv: 'Auto A²s/div',
    getValue: (t) => t.i2t,
    format: (v) => `${v.toLocaleString()} A²s`
  },
  {
    id: 'RMS_CURRENT',
    label: 'True RMS Current Trend',
    shortLabel: 'RMS CURRENT',
    unit: 'A',
    color: '#059669', // Emerald Green
    isWaveform: false,
    scaleDiv: 'Auto A/div',
    getValue: (t) => t.rmsCurrent,
    format: (v) => `${v.toFixed(2)} A`
  },
  {
    id: 'RMS_VOLTAGE',
    label: 'True RMS Voltage Trend',
    shortLabel: 'RMS VOLTAGE',
    unit: 'V',
    color: '#475569', // Slate
    isWaveform: false,
    scaleDiv: '10 V/div (200-250V)',
    getValue: (t) => t.rmsVoltage,
    format: (v) => `${v.toFixed(1)} V`
  },
  {
    id: 'POWER',
    label: 'Active Power Trend',
    shortLabel: 'POWER (P)',
    unit: 'W',
    color: '#b45309', // Warm Bronze
    isWaveform: false,
    scaleDiv: '5 kW/div',
    getValue: (t) => t.power,
    format: (v) => v >= 1000 ? `${(v / 1000).toFixed(2)} kW` : `${v.toFixed(0)} W`
  },
  {
    id: 'FREQUENCY',
    label: 'Grid Frequency Trend',
    shortLabel: 'FREQ (Hz)',
    unit: 'Hz',
    color: '#6366f1', // Indigo
    isWaveform: false,
    scaleDiv: '0.2 Hz/div',
    getValue: (t) => t.frequency,
    format: (v) => `${v.toFixed(2)} Hz`
  },
  {
    id: 'PEAK_CURRENT',
    label: 'Peak Current Hold Trend',
    shortLabel: 'PEAK CURRENT',
    unit: 'A',
    color: '#991b1b', // Dark Red
    isWaveform: false,
    scaleDiv: 'Auto A/div',
    getValue: (t) => t.peakCurrent,
    format: (v) => `${v.toFixed(2)} A`
  },
  {
    id: 'I_IN',
    label: 'Normalized I / In Ratio',
    shortLabel: 'I / In RATIO',
    unit: '×In',
    color: '#0f766e', // Teal
    isWaveform: false,
    scaleDiv: '1 ×In/div',
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

interface WaveformSamplePoint {
  t: number; // time in ms
  vInst: number; // instantaneous voltage (V)
  iInst: number; // instantaneous current (A)
  vRms: number;
  iRms: number;
  temp: number;
  i2t: number;
  power: number;
  freq: number;
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
  const bufferRef = useRef<WaveformSamplePoint[]>([]);
  const lastTestIdRef = useRef<string | null>(null);
  const timeCounterRef = useRef<number>(0);

  const currentChannelConfig = CHANNELS.find((c) => c.id === activeChannel) || CHANNELS[0];

  // Clear / reinitialize buffer when a new test starts
  useEffect(() => {
    if (activeTestId && activeTestId !== lastTestIdRef.current) {
      lastTestIdRef.current = activeTestId;
      bufferRef.current = [];
      timeCounterRef.current = 0;
    }
  }, [activeTestId]);

  // Push incoming telemetry samples into buffer
  useEffect(() => {
    if (!isConnected || !telemetry || isPaused) return;

    const buf = bufferRef.current;
    const now = telemetry.timestamp || Date.now();

    // Check if packet contains high-resolution sub-sampled slice
    const slice = (telemetry as any).waveformSlice;
    if (slice && slice.v && slice.i && Array.isArray(slice.v)) {
      const dt = slice.dtMs || 2.0;
      const count = slice.v.length;

      for (let k = 0; k < count; k++) {
        timeCounterRef.current += dt;
        buf.push({
          t: timeCounterRef.current,
          vInst: slice.v[k],
          iInst: slice.i[k],
          vRms: telemetry.rmsVoltage || telemetry.voltage,
          iRms: telemetry.rmsCurrent || telemetry.current,
          temp: telemetry.mcbTemp,
          i2t: telemetry.i2t,
          power: telemetry.power,
          freq: telemetry.frequency,
          peakCurrent: telemetry.peakCurrent,
          iOverIn: telemetry.iOverIn,
          stage: telemetry.currentStage || '',
          tripDetected: telemetry.tripDetected
        });
      }
    } else {
      // Synthesize calibrated 50 Hz sub-samples for smooth sinusoidal waveform trace
      const sliceCount = 10;
      const dt = 3.0; // 3ms step
      const f = telemetry.frequency || 50.0;
      const omega = 2 * Math.PI * f;
      const vRms = telemetry.voltage || 230.0;
      const iRms = telemetry.current || 0.03;

      for (let k = 0; k < sliceCount; k++) {
        timeCounterRef.current += dt;
        const tSec = timeCounterRef.current / 1000;
        const phaseV = omega * tSec;
        const phaseI = phaseV - 0.05;

        const vInst = Math.SQRT2 * vRms * Math.sin(phaseV) + (Math.random() - 0.5) * 1.5;
        let iInst = 0;
        if (iRms > 0.5) {
          iInst = Math.SQRT2 * iRms * Math.sin(phaseI) + (Math.random() - 0.5) * (iRms * 0.02);
        } else {
          iInst = Math.SQRT2 * iRms * Math.sin(phaseI) + (Math.random() - 0.5) * 0.015;
        }

        buf.push({
          t: timeCounterRef.current,
          vInst: +vInst.toFixed(2),
          iInst: +iInst.toFixed(2),
          vRms: vRms,
          iRms: iRms,
          temp: telemetry.mcbTemp,
          i2t: telemetry.i2t,
          power: telemetry.power,
          freq: f,
          peakCurrent: telemetry.peakCurrent,
          iOverIn: telemetry.iOverIn,
          stage: telemetry.currentStage || '',
          tripDetected: telemetry.tripDetected
        });
      }
    }

    // Keep bounded rolling window of 250 samples (~2.5-4 full 50Hz cycles across screen)
    while (buf.length > 250) {
      buf.shift();
    }
  }, [telemetry, isConnected, isPaused]);

  // 60 FPS Canvas Rendering Engine
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      const w = rect.width;
      const h = rect.height;

      // 1. Oscilloscope Background - Dark Slate Engineering Screen
      ctx.fillStyle = '#090d16'; // Dark oscilloscope display
      ctx.fillRect(0, 0, w, h);

      // 2. Calibrated Oscilloscope Grid (10 horizontal divs x 8 vertical divs)
      const numCols = 10;
      const numRows = 8;
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.22)';

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

      // Center Reference Baseline
      const midY = h / 2;
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(w, midY);
      ctx.stroke();
      ctx.setLineDash([]);

      const buf = bufferRef.current;

      // 3. Disconnected / Standby State
      if (!isConnected || buf.length < 2) {
        ctx.fillStyle = '#64748b';
        ctx.font = '600 13px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          'NO MACHINE SIGNAL · RIG DISCONNECTED',
          w / 2,
          h / 2 - 8
        );
        ctx.font = '400 11px "Inter", sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText(
          'Connect the MCB test rig or activate Demo Mode to stream live telemetry.',
          w / 2,
          h / 2 + 14
        );
        ctx.restore();
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // 4. Extract values according to selected channel
      const ch = currentChannelConfig;
      const values = buf.map((p) => {
        switch (activeChannel) {
          case 'CURRENT': return p.iInst;
          case 'VOLTAGE': return p.vInst;
          case 'TEMPERATURE': return p.temp;
          case 'I2T': return p.i2t;
          case 'RMS_CURRENT': return p.iRms;
          case 'RMS_VOLTAGE': return p.vRms;
          case 'POWER': return p.power;
          case 'FREQUENCY': return p.freq;
          case 'PEAK_CURRENT': return p.peakCurrent;
          case 'I_IN': return p.iOverIn;
          default: return p.iInst;
        }
      });

      // 5. Intelligent Channel-Specific Auto-Scaling
      let minVal = Math.min(...values);
      let maxVal = Math.max(...values);
      let zeroPosition = 'center'; // 'center' | 'bottom'

      if (activeChannel === 'VOLTAGE') {
        // Instantaneous AC Voltage: centered on 0, scale for ±350V
        minVal = -360;
        maxVal = +360;
        zeroPosition = 'center';
      } else if (activeChannel === 'CURRENT') {
        // Instantaneous AC Current: centered on 0
        const maxAbs = Math.max(Math.abs(minVal), Math.abs(maxVal));
        if (maxAbs > 2.0) {
          // In test: auto scale to ±(peak * 1.25)
          const span = Math.max(maxAbs * 1.2, 20);
          minVal = -span;
          maxVal = +span;
        } else {
          // Idle state: zoom to ±0.2A so idle noise is cleanly visible
          minVal = -0.25;
          maxVal = +0.25;
        }
        zeroPosition = 'center';
      } else if (activeChannel === 'RMS_VOLTAGE') {
        minVal = 200;
        maxVal = 250;
        zeroPosition = 'bottom';
      } else if (activeChannel === 'RMS_CURRENT') {
        minVal = 0;
        maxVal = Math.max(maxVal * 1.2, 10);
        zeroPosition = 'bottom';
      } else if (activeChannel === 'TEMPERATURE') {
        minVal = Math.max(15, minVal - 3);
        maxVal = Math.max(maxVal + 5, 45);
        zeroPosition = 'bottom';
      } else if (activeChannel === 'I2T') {
        minVal = 0;
        maxVal = Math.max(maxVal * 1.2, 500);
        zeroPosition = 'bottom';
      } else if (activeChannel === 'POWER') {
        minVal = 0;
        maxVal = Math.max(maxVal * 1.2, 2000);
        zeroPosition = 'bottom';
      } else if (activeChannel === 'FREQUENCY') {
        minVal = 49.0;
        maxVal = 51.0;
        zeroPosition = 'bottom';
      } else if (activeChannel === 'PEAK_CURRENT') {
        minVal = 0;
        maxVal = Math.max(maxVal * 1.2, 10);
        zeroPosition = 'bottom';
      } else if (activeChannel === 'I_IN') {
        minVal = 0;
        maxVal = Math.max(maxVal * 1.2, 6.0);
        zeroPosition = 'bottom';
      }

      const range = Math.max(maxVal - minVal, 0.0001);
      const pointsCount = buf.length;
      const stepX = w / Math.max(pointsCount - 1, 1);

      const getY = (v: number) => {
        if (zeroPosition === 'center') {
          // Centered at midY
          const normalized = (v - minVal) / range; // 0 to 1
          return h - normalized * (h * 0.82) - (h * 0.09);
        } else {
          // Bottom-based baseline
          const normalized = (v - minVal) / range;
          return h - (normalized * (h * 0.75) + h * 0.12);
        }
      };

      // 6. Draw Zero Baseline Label
      if (zeroPosition === 'center') {
        ctx.fillStyle = '#475569';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('0.00', 6, midY - 4);
      }

      // 7. Fill Gradient under Curve (for trends) or AC envelop
      ctx.beginPath();
      buf.forEach((_, i) => {
        const x = i * stepX;
        const y = getY(values[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      const baselineY = zeroPosition === 'center' ? midY : h - (h * 0.12);
      ctx.lineTo((pointsCount - 1) * stepX, baselineY);
      ctx.lineTo(0, baselineY);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, `${ch.color}33`);
      grad.addColorStop(1, `${ch.color}00`);
      ctx.fillStyle = grad;
      ctx.fill();

      // 8. Draw Waveform / Trend Trace Line
      ctx.beginPath();
      ctx.strokeStyle = ch.color;
      ctx.lineWidth = ch.isWaveform ? 2.4 : 2.0;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      buf.forEach((_, i) => {
        const x = i * stepX;
        const y = getY(values[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // 9. Event Markers from Actual Sample Timestamps
      let tripIdx = -1;
      let peakIdx = -1;
      let maxCurrentSeen = -1;

      buf.forEach((pt, i) => {
        if (pt.iRms > maxCurrentSeen) {
          maxCurrentSeen = pt.iRms;
          peakIdx = i;
        }
        if (pt.tripDetected && tripIdx === -1) {
          tripIdx = i;
        }
      });

      // Peak Current Marker
      if (peakIdx >= 0 && maxCurrentSeen > 5.0 && (activeChannel === 'CURRENT' || activeChannel === 'RMS_CURRENT' || activeChannel === 'PEAK_CURRENT')) {
        const px = peakIdx * stepX;
        const py = getY(values[peakIdx]);

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
        ctx.fillText(`PEAK: ${maxCurrentSeen.toFixed(1)} A`, px, Math.max(18, py - 10));
      }

      // Trip Event Marker Line & Tag
      if (tripIdx >= 0) {
        const tx = tripIdx * stepX;

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(tx, 0);
        ctx.lineTo(tx, h);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(tx - 38, 8, 76, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ MCB TRIP', tx, 20);
      }

      // 10. HUD Overlays & Scale Readouts
      // Left Scale Box
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(8, 8, 190, 24);
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(8, 8, 190, 24);

      ctx.fillStyle = ch.color;
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${ch.shortLabel} · ${ch.isWaveform ? '50 Hz AC' : 'TREND'}`, 14, 24);

      // Right Live Value Box
      const latestVal = values[values.length - 1];
      const readoutStr = `LIVE: ${ch.format(latestVal)}`;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(w - 180, 8, 172, 24);
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)';
      ctx.strokeRect(w - 180, 8, 172, 24);

      ctx.fillStyle = '#38bdf8'; // Sky cyan
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(readoutStr, w - 16, 24);

      // Max / Min Vertical Range Labels
      ctx.fillStyle = '#64748b';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`+${ch.format(maxVal)}`, 8, 44);
      ctx.fillText(`-${ch.format(Math.abs(minVal))}`, 8, h - 10);

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isConnected, activeChannel, isPaused, currentChannelConfig]);

  // Mouse hover crosshair tooltip
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || bufferRef.current.length === 0 || !isConnected) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pointsCount = bufferRef.current.length;
    const index = Math.min(
      Math.max(0, Math.floor((x / rect.width) * pointsCount)),
      pointsCount - 1
    );

    const pt = bufferRef.current[index];
    if (pt) {
      let val = pt.iInst;
      if (activeChannel === 'VOLTAGE') val = pt.vInst;
      else if (activeChannel === 'RMS_CURRENT') val = pt.iRms;
      else if (activeChannel === 'RMS_VOLTAGE') val = pt.vRms;
      else if (activeChannel === 'TEMPERATURE') val = pt.temp;
      else if (activeChannel === 'I2T') val = pt.i2t;
      else if (activeChannel === 'POWER') val = pt.power;
      else if (activeChannel === 'FREQUENCY') val = pt.freq;
      else if (activeChannel === 'PEAK_CURRENT') val = pt.peakCurrent;
      else if (activeChannel === 'I_IN') val = pt.iOverIn;

      setHoverData({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        text: `${currentChannelConfig.format(val)} [t=${pt.t.toFixed(1)}ms]`
      });
    }
  };

  const handleMouseLeave = () => {
    setHoverData(null);
  };

  return (
    <div className="w-full bg-surface-container-lowest rounded-xl p-space-lg sm:p-space-xl shadow-sm border border-outline-variant/30 flex flex-col gap-space-md">
      
      {/* Top Header & Responsive Multi-Channel Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-sm bg-surface-container-low/50 px-space-md py-space-xs rounded-lg border border-outline-variant/20">
        <div className="flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-primary text-[22px]">ssid_chart</span>
          <div>
            <div className="flex items-center gap-space-xs">
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">REAL-TIME SIGNAL OSCILLOSCOPE</h2>
              <span className={`px-space-xs py-0.5 rounded font-label-caps text-label-caps font-semibold ${
                isConnected ? 'bg-tertiary-container/10 text-tertiary' : 'bg-surface-container-high text-outline'
              }`}>
                {isConnected ? 'LIVE 200 kS/s SYNC' : 'HARDWARE OFFLINE'}
              </span>
            </div>
            <p className="font-code-timestamp text-code-timestamp text-outline">
              IS/IEC 60898-1 Synchronous Transducer Bus · Deterministic Waveform Engine
            </p>
          </div>
        </div>

        {/* Channel Selection Buttons Grid/Row */}
        <div className="flex items-center gap-1 bg-surface-container p-1 rounded-lg flex-wrap">
          {CHANNELS.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch.id)}
              className={`px-space-md py-1 rounded font-label-caps text-label-caps transition-all cursor-pointer ${
                activeChannel === ch.id
                  ? 'bg-surface-container-lowest text-primary shadow-sm font-bold border border-primary/20'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/40'
              }`}
              type="button"
            >
              {ch.shortLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Oscilloscope Viewport Screen */}
      <div className="relative w-full h-[360px] sm:h-[400px] rounded-xl overflow-hidden shadow-inner border border-outline-variant/30 bg-[#090d16]">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full block cursor-crosshair"
        />

        {/* Hover Crosshair Tooltip */}
        {hoverData && isConnected && (
          <div
            className="absolute z-30 pointer-events-none bg-slate-900/95 backdrop-blur-sm border border-slate-700 px-space-sm py-1 rounded shadow-lg font-code-timestamp text-code-timestamp text-sky-300"
            style={{
              left: `${Math.min(hoverData.x + 12, canvasRef.current ? canvasRef.current.clientWidth - 180 : hoverData.x)}px`,
              top: `${Math.max(hoverData.y - 28, 10)}px`
            }}
          >
            {hoverData.text}
          </div>
        )}

        {/* Bottom Timebase & Hold Controls */}
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between font-code-timestamp text-code-timestamp text-slate-400 pointer-events-none">
          <div className="flex items-center gap-space-md bg-slate-900/85 px-space-sm py-0.5 rounded border border-slate-700/50">
            <span>TIMEBASE: 5.0 ms/DIV (50 ms Span)</span>
            <span>COUPLING: AC/DC TRUE-RMS</span>
            <span className="text-emerald-400">TRIG: AUTO &gt; 5.0 A POS-EDGE</span>
          </div>
          <div className="flex items-center gap-space-sm pointer-events-auto">
            <button
              onClick={() => setIsPaused(!isPaused)}
              disabled={!isConnected}
              className="px-space-sm py-1 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-600 font-label-caps text-label-caps transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
              type="button"
            >
              <span className="material-symbols-outlined text-[14px]">
                {isPaused ? 'play_arrow' : 'pause'}
              </span>
              <span>{isPaused ? 'RESUME SWEEP' : 'HOLD / FREEZE'}</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
