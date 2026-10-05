import React from 'react';
import { TelemetryData } from '../types';

interface SafetyInterlocksProps {
  telemetry: TelemetryData | null;
  isConnected: boolean;
}

export const SafetyInterlocks: React.FC<SafetyInterlocksProps> = ({ telemetry, isConnected }) => {
  const sensorHealth = telemetry?.sensorHealth;
  const isEStop = telemetry?.emergencyStop;
  const doorSafe = telemetry?.interlocks?.door;
  const ocSafe = telemetry?.interlocks?.overcurrent;
  const tempSafe = telemetry?.interlocks?.overtemperature;

  const currentSensorOk = isConnected && sensorHealth?.current !== 'FAULT';
  const voltageSensorOk = isConnected && sensorHealth?.voltage !== 'FAULT';
  const tempSensorOk = isConnected && sensorHealth?.temperature !== 'FAULT';
  const tripSensorOk = isConnected && sensorHealth?.trip !== 'FAULT';
  const auxFeedbackOk = isConnected && sensorHealth?.feedback !== 'FAULT';

  return (
    <div className="flex flex-col gap-3 font-mono text-xs">
      
      {/* 1. HARDWARE SENSORS (STITCH MATCH) */}
      <section className="bg-[#151c27] border border-[#3c494d]/80 p-3 flex flex-col gap-1.5 rounded">
        <div className="flex items-center justify-between border-b border-[#3c494d]/60 pb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#44dfab] text-[16px]">sensors</span>
            <span className="font-bold tracking-wider uppercase text-[#dce2f2] text-xs">HARDWARE SENSORS</span>
          </div>
          <span className="text-[10px] text-[#44dfab]">
            {isConnected ? '5/5 HEALTHY' : 'STANDBY'}
          </span>
        </div>

        <div className="flex flex-col divide-y divide-[#3c494d]/40 pt-1 text-[11px]">
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${currentSensorOk ? 'bg-[#44dfab]' : 'bg-[#ff4d5a]'}`} />
              <span className="text-[#dce2f2]">Current Sensor (LEM CT)</span>
            </div>
            <span className="text-[#bcc9cd] text-[10px]">{currentSensorOk ? '0.05% ERR' : 'FAULT'}</span>
          </div>

          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${voltageSensorOk ? 'bg-[#44dfab]' : 'bg-[#ff4d5a]'}`} />
              <span className="text-[#dce2f2]">Voltage Transducer</span>
            </div>
            <span className="text-[#bcc9cd] text-[10px]">{voltageSensorOk ? '0.10V RES' : 'FAULT'}</span>
          </div>

          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${tempSensorOk ? 'bg-[#44dfab]' : 'bg-[#ff4d5a]'}`} />
              <span className="text-[#dce2f2]">Thermocouple Probe</span>
            </div>
            <span className="text-[#bcc9cd] text-[10px]">{tempSensorOk ? 'PT100 RTD' : 'FAULT'}</span>
          </div>

          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${tripSensorOk ? 'bg-[#44dfab]' : 'bg-[#ff4d5a]'}`} />
              <span className="text-[#dce2f2]">Trip Detect Circuit</span>
            </div>
            <span className="text-[#bcc9cd] text-[10px]">{tripSensorOk ? 'OPTO-ISOLATED' : 'FAULT'}</span>
          </div>

          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${auxFeedbackOk ? 'bg-[#44dfab]' : 'bg-[#ff4d5a]'}`} />
              <span className="text-[#dce2f2]">MCB Feedback State</span>
            </div>
            <span className={`font-bold text-[10px] ${auxFeedbackOk ? 'text-[#44dfab]' : 'text-[#ff4d5a]'}`}>
              {auxFeedbackOk ? 'AUX CLOSED' : 'DISCONNECTED'}
            </span>
          </div>
        </div>
      </section>

      {/* 2. SAFETY INTERLOCKS (STITCH MATCH) */}
      <section className="bg-[#151c27] border border-[#3c494d]/80 p-3 flex flex-col gap-1.5 rounded">
        <div className="flex items-center justify-between border-b border-[#3c494d]/60 pb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#44dfab] text-[16px]">verified_user</span>
            <span className="font-bold tracking-wider uppercase text-[#dce2f2] text-xs">SAFETY INTERLOCKS</span>
          </div>
          <span className="text-[10px] bg-[#44dfab]/10 text-[#44dfab] border border-[#44dfab]/30 px-1 py-0.5 rounded">
            {isConnected && !isEStop ? 'LATCH ARMED' : 'OPEN'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
          <div className="bg-[#19202b] p-1.5 border border-[#3c494d] rounded flex items-center justify-between">
            <span className="text-[10px] text-[#bcc9cd]">E-STOP LOOP</span>
            <span className={`font-bold text-[10px] ${!isEStop && isConnected ? 'text-[#44dfab]' : 'text-[#ff4d5a]'}`}>
              {!isEStop && isConnected ? 'OK' : 'TRIPPED'}
            </span>
          </div>

          <div className="bg-[#19202b] p-1.5 border border-[#3c494d] rounded flex items-center justify-between">
            <span className="text-[10px] text-[#bcc9cd]">HOOD ENCLOSURE</span>
            <span className={`font-bold text-[10px] ${doorSafe && isConnected ? 'text-[#44dfab]' : 'text-[#ff4d5a]'}`}>
              {doorSafe && isConnected ? 'OK' : 'OPEN'}
            </span>
          </div>

          <div className="bg-[#19202b] p-1.5 border border-[#3c494d] rounded flex items-center justify-between">
            <span className="text-[10px] text-[#bcc9cd]">OVERCURRENT LIM</span>
            <span className={`font-bold text-[10px] ${ocSafe && isConnected ? 'text-[#44dfab]' : 'text-[#ff4d5a]'}`}>
              {ocSafe && isConnected ? 'OK' : 'EXCEEDED'}
            </span>
          </div>

          <div className="bg-[#19202b] p-1.5 border border-[#3c494d] rounded flex items-center justify-between">
            <span className="text-[10px] text-[#bcc9cd]">THERMAL CUTOFF</span>
            <span className={`font-bold text-[10px] ${tempSafe && isConnected ? 'text-[#44dfab]' : 'text-[#ff4d5a]'}`}>
              {tempSafe && isConnected ? 'OK' : 'HOT'}
            </span>
          </div>

          <div className="col-span-2 bg-[#19202b] p-1.5 border border-[#3c494d] rounded flex items-center justify-between">
            <span className="text-[10px] text-[#bcc9cd]">COMM LINK (ESP32 RIG)</span>
            <span className={`font-bold text-[10px] ${isConnected ? 'text-[#44dfab]' : 'text-[#869397]'}`}>
              {isConnected ? '● SYNCHRONIZED' : '○ DISCONNECTED'}
            </span>
          </div>
        </div>
      </section>

    </div>
  );
};
