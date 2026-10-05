import React, { useState, useEffect } from 'react';

export const MachinesView: React.FC = () => {
  const [machines, setMachines] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/machines')
      .then((res) => res.json())
      .then((data) => setMachines(data))
      .catch((err) => console.error('Failed to load machines:', err));
  }, []);

  return (
    <div className="w-full max-w-[1600px] mx-auto px-space-md sm:px-space-xl lg:px-space-2xl py-space-xl flex flex-col gap-space-xl">
      
      {/* Header Banner */}
      <div className="bg-surface-container-lowest p-space-xl rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-lg">
        <div className="flex items-center gap-space-md">
          <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center font-headline-sm">
            <span className="material-symbols-outlined text-on-primary-container">dns</span>
          </div>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Hardware Machine Infrastructure &amp; Rig Bridge</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Transport abstraction for physical ESP32 test benches &amp; high-voltage load chambers.
            </p>
          </div>
        </div>
      </div>

      {/* Registered Machines List */}
      <div className="bg-surface-container-lowest p-space-xl rounded-xl shadow-sm flex flex-col gap-space-lg">
        <div className="font-title-md text-title-md text-on-surface font-semibold flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-primary text-[20px]">devices</span>
          <span>Registered Hardware Test Benches</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
          {machines.map((m) => (
            <div key={m.machine_id} className="bg-surface-container-low p-space-xl rounded-xl flex flex-col justify-between gap-space-md border border-outline-variant/30">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">{m.name}</h3>
                  <span className="font-code-id text-code-id text-primary">{m.machine_id}</span>
                </div>
                <span className={`px-space-md py-1 rounded-DEFAULT font-label-caps text-label-caps font-semibold ${
                  m.status === 'CONNECTED' ? 'bg-tertiary-container/10 text-tertiary' : 'bg-surface-container text-outline'
                }`}>
                  {m.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-space-sm font-body-sm text-body-sm text-on-surface-variant pt-space-sm border-t border-outline-variant/30">
                <div>CONTROLLER: <strong className="text-on-surface font-semibold">{m.controller_type}</strong></div>
                <div>FIRMWARE: <strong className="text-tertiary font-semibold">{m.firmware_version}</strong></div>
                <div>LOCATION: <strong className="text-on-surface font-semibold">{m.location}</strong></div>
                <div>CALIBRATION: <strong className="text-primary font-semibold">NIST #9812</strong></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ESP32 Hardware Integration Guide */}
      <div className="bg-surface-container-lowest p-space-xl rounded-xl shadow-sm flex flex-col gap-space-md">
        <div className="flex items-center gap-space-sm font-title-md text-title-md text-primary font-semibold">
          <span className="material-symbols-outlined text-[20px]">code</span>
          <span>Real ESP32 Microcontroller Bridge Specification</span>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
          To connect the physical testing rig, program the ESP32 to open a WebSocket connection to <code className="font-code-id text-primary bg-surface-container-low px-2 py-0.5 rounded">ws://localhost:5000/ws/hardware</code> and emit normalized JSON telemetry packets at 20 Hz.
        </p>

        <div className="bg-surface-container-low p-space-lg rounded-xl border border-outline-variant/40 overflow-x-auto">
          <div className="font-label-caps text-label-caps text-outline mb-2">NORMALIZED TELEMETRY PACKET JSON SCHEMA:</div>
          <pre className="font-code-timestamp text-[11px] text-primary leading-snug">
{`{
  "machineId": "MCB-RIG-001",
  "timestamp": 1728132000000,
  "voltage": 230.2,            // Instantaneous Voltage (V)
  "current": 24.6,             // Instantaneous Current (A)
  "frequency": 50.0,           // Grid Frequency (Hz)
  "mcbTemp": 31.4,             // MCB Terminal Temp (°C)
  "loadTemp": 42.8,            // Heating Coil Temp (°C)
  "power": 5662.9,             // Calculated Power (W)
  "rmsVoltage": 229.8,
  "rmsCurrent": 24.4,
  "peakCurrent": 24.6,
  "tripTimeMs": 28.4,          // Millisecond precision trip detection
  "mcbState": "TRIPPED",       // 'READY' | 'TESTING' | 'TRIPPED'
  "contactorState": "OPEN",    // 'OPEN' | 'CLOSING' | 'CLOSED'
  "relayState": "READY",
  "tripDetected": true,
  "emergencyStop": false,
  "interlocks": { "door": true, "overcurrent": true, "overtemperature": true },
  "sensorHealth": { "current": "ONLINE", "voltage": "ONLINE", "temperature": "ONLINE", "trip": "ONLINE" }
}`}
          </pre>
        </div>
      </div>

    </div>
  );
};
