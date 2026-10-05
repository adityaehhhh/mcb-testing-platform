import React, { useState, useEffect, useRef } from 'react';
import { Activity, Pause, Play, Terminal } from 'lucide-react';
import { TelemetryData } from '../types';

interface OscilloscopeProps {
  telemetry: TelemetryData | null;
  isConnected: boolean;
}

export const Oscilloscope: React.FC<OscilloscopeProps> = ({ telemetry, isConnected }) => {
  const [activeTab, setActiveTab] = useState<'CURRENT' | 'VOLTAGE' | 'TEMPERATURE' | 'I2T'>('CURRENT');
  const [isPaused, setIsPaused] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // History buffer for streaming trace
  const bufferRef = useRef<{
    time: number;
    current: number;
    voltage: number;
    temp: number;
    i2t: number;
    trip: boolean;
  }[]>([]);

  // Push incoming telemetry samples into buffer
  useEffect(() => {
    if (!isConnected || !telemetry || isPaused) return;

    const buf = bufferRef.current;
    buf.push({
      time: Date.now(),
      current: telemetry.current,
      voltage: telemetry.voltage,
      temp: telemetry.mcbTemp,
      i2t: telemetry.i2t,
      trip: telemetry.tripDetected
    });

    if (buf.length > 150) {
      buf.shift();
    }
  }, [telemetry, isConnected, isPaused]);

  // 60FPS Canvas Animation Loop
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Dark oscilloscope screen background
      ctx.fillStyle = '#0a1017';
      ctx.fillRect(0, 0, width, height);

      // Grid Lines (10x8 subdivisions)
      ctx.strokeStyle = 'rgba(72, 215, 249, 0.08)';
      ctx.lineWidth = 1;

      const numCols = 10;
      for (let i = 0; i <= numCols; i++) {
        const x = (width / numCols) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      const numRows = 6;
      for (let i = 0; i <= numRows; i++) {
        const y = (height / numRows) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Zero Baseline
      const zeroY = activeTab === 'VOLTAGE' ? height / 2 : height * 0.82;
      ctx.strokeStyle = 'rgba(141, 155, 175, 0.35)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, zeroY);
      ctx.lineTo(width, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#596980';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText('0.00', 6, zeroY - 4);

      if (!isConnected || bufferRef.current.length < 2) {
        ctx.strokeStyle = '#232a36';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, zeroY);
        ctx.lineTo(width, zeroY);
        ctx.stroke();

        ctx.fillStyle = '#677b95';
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('NO LIVE TELEMETRY', width / 2, height / 2);
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const buf = bufferRef.current;
      const pointsCount = buf.length;
      const stepX = width / Math.max(pointsCount - 1, 1);

      let color = '#48d7f9';
      let maxVal = 100;

      if (activeTab === 'CURRENT') {
        color = '#44dfab';
        const maxCurr = Math.max(...buf.map(p => p.current), 10);
        maxVal = Math.max(maxCurr * 1.25, 40);
      } else if (activeTab === 'VOLTAGE') {
        color = '#48d7f9';
        maxVal = 260;
      } else if (activeTab === 'TEMPERATURE') {
        color = '#f9bc45';
        maxVal = 90;
      } else if (activeTab === 'I2T') {
        color = '#ff4d5a';
        const maxI2t = Math.max(...buf.map(p => p.i2t), 100);
        maxVal = maxI2t * 1.2;
      }

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';

      let tripMarkerX = -1;

      buf.forEach((pt, i) => {
        const x = i * stepX;
        let val = pt.current;

        if (activeTab === 'CURRENT') {
          if (pt.current > 1.0) {
            const phase = (i * 0.85);
            val = pt.current * Math.sin(phase);
          } else {
            val = pt.current;
          }
        } else if (activeTab === 'VOLTAGE') {
          val = pt.voltage * Math.sin(i * 0.45);
        } else if (activeTab === 'TEMPERATURE') {
          val = pt.temp;
        } else if (activeTab === 'I2T') {
          val = pt.i2t;
        }

        if (pt.trip && tripMarkerX === -1) {
          tripMarkerX = x;
        }

        let y = zeroY;
        if (activeTab === 'VOLTAGE') {
          y = height / 2 - (val / 300) * (height * 0.4);
        } else {
          y = zeroY - (val / maxVal) * (height * 0.7);
        }

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Trip Event Marker
      if (tripMarkerX > 0) {
        ctx.strokeStyle = '#ff4d5a';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(tripMarkerX, 0);
        ctx.lineTo(tripMarkerX, height);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ff4d5a';
        ctx.fillRect(tripMarkerX + 4, 8, 88, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.fillText('● MCB TRIP', tripMarkerX + 10, 20);
      }

      // Readout
      ctx.textAlign = 'right';
      ctx.fillStyle = color;
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      
      const currentVal = buf[buf.length - 1];
      let displayReadout = '';
      if (activeTab === 'CURRENT') displayReadout = `CH1: ${currentVal.current.toFixed(2)} A (Pk: ${telemetry?.peakCurrent.toFixed(2)} A)`;
      if (activeTab === 'VOLTAGE') displayReadout = `CH2: ${currentVal.voltage.toFixed(1)} V (50 Hz)`;
      if (activeTab === 'TEMPERATURE') displayReadout = `PT100: ${currentVal.temp.toFixed(1)} °C`;
      if (activeTab === 'I2T') displayReadout = `I²t: ${currentVal.i2t.toFixed(1)} A²s`;

      ctx.fillText(displayReadout, width - 12, 20);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isConnected, activeTab, telemetry, isPaused]);

  return (
    <div className="card-stitch font-mono">
      
      {/* Header / Selector */}
      <div className="card-header-stitch">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#48d7f9]" />
          <span className="text-white font-bold tracking-wide text-xs">REAL-TIME SIGNAL ANALYSIS</span>
          <span className="hidden sm:inline text-[9px] text-[#8d9baf] bg-[#0d141e] px-2 py-0.5 rounded border border-[#232a36]">
            CH1: 100A/DIV · 50Hz SWEEP
          </span>
        </div>

        {/* Clean Channel Tabs */}
        <div className="flex items-center gap-1 bg-[#0d141e] p-0.5 rounded border border-[#232a36]">
          {[
            { id: 'CURRENT', label: 'CURRENT (CH1)' },
            { id: 'VOLTAGE', label: 'VOLTAGE (CH2)' },
            { id: 'TEMPERATURE', label: 'TEMP (PT100)' },
            { id: 'I2T', label: 'I²t INTEGRAL' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-2.5 py-1 text-[10px] font-bold rounded transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#19202b] text-[#48d7f9] border border-[#3c494d] shadow-sm'
                  : 'text-[#8d9baf] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Hold / Pause */}
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="p-1 rounded bg-[#0d141e] hover:bg-[#19202b] text-[#8d9baf] hover:text-white border border-[#232a36] text-xs transition-colors"
          title={isPaused ? 'Resume Sweep' : 'Pause Trace'}
        >
          {isPaused ? <Play className="w-3.5 h-3.5 text-[#44dfab]" /> : <Pause className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Canvas Screen */}
      <div className="p-3 bg-[#0a1017]">
        <div className="relative rounded border border-[#232a36] overflow-hidden">
          <canvas
            ref={canvasRef}
            width={720}
            height={210}
            className="w-full h-[200px] block"
          />
          <div className="absolute bottom-2 left-3 flex items-center gap-3 text-[9px] text-[#596980]">
            <span>TIMEBASE: 10ms/DIV</span>
            <span>COUPLING: AC</span>
            <span>TRIGGER: AUTO &gt; 5.0A</span>
          </div>
        </div>
      </div>

    </div>
  );
};
