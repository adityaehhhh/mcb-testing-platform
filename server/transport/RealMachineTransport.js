const MachineTransport = require('./MachineTransport');
const { runQuery } = require('../db');

class RealMachineTransport extends MachineTransport {
  constructor(machineId = 'MCB-RIG-001') {
    super(machineId);
    this.dataSource = 'REAL_MACHINE';
    this.machineState = 'DISCONNECTED';
    this.lastHeartbeatTime = 0;
    this.heartbeatTimeout = 6000; // 6s timeout
    this.watchdogTimer = null;
    this.clientSocket = null;
  }

  setClientSocket(ws) {
    this.clientSocket = ws;
    this.isConnected = true;
    this.machineState = 'IDLE';
    this.lastHeartbeatTime = Date.now();
    this.startWatchdog();

    runQuery(`
      UPDATE machines 
      SET status = 'CONNECTED', last_seen_at = CURRENT_TIMESTAMP 
      WHERE machine_id = ?
    `, [this.machineId]).catch(() => {});

    this.emit('connected', { machineId: this.machineId, dataSource: this.dataSource });
  }

  handleIncomingPacket(rawPacket) {
    try {
      const data = typeof rawPacket === 'string' ? JSON.parse(rawPacket) : rawPacket;
      this.lastHeartbeatTime = Date.now();

      // Normalize hardware telemetry
      const normalized = {
        machineId: this.machineId,
        timestamp: data.timestamp || Date.now(),
        voltage: +(data.voltage || 0).toFixed(2),
        current: +(data.current || 0).toFixed(2),
        frequency: +(data.frequency || 50.0).toFixed(2),
        mcbTemp: +(data.mcbTemp || 25.0).toFixed(1),
        loadTemp: +(data.loadTemp || 25.0).toFixed(1),
        maxTemp: +(data.maxTemp || 25.0).toFixed(1),
        tempRise: +(data.tempRise || 0).toFixed(1),
        power: +(data.power || (data.voltage * data.current)).toFixed(1),
        rmsVoltage: +(data.rmsVoltage || data.voltage).toFixed(1),
        rmsCurrent: +(data.rmsCurrent || data.current).toFixed(2),
        peakCurrent: +(data.peakCurrent || data.current * 1.414).toFixed(2),
        iOverIn: +(data.iOverIn || 0).toFixed(2),
        i2t: +(data.i2t || 0).toFixed(2),
        tripTimeMs: data.tripTimeMs || null,
        mcbState: data.mcbState || 'UNKNOWN',
        contactorState: data.contactorState || 'OPEN',
        relayState: data.relayState || 'READY',
        esp32State: 'ONLINE',
        loadState: data.loadState || 'OFF',
        tripDetected: !!data.tripDetected,
        emergencyStop: !!data.emergencyStop,
        interlocks: data.interlocks || { door: true, overcurrent: true, overtemperature: true },
        sensorHealth: data.sensorHealth || { current: 'ONLINE', voltage: 'ONLINE', temperature: 'ONLINE', trip: 'ONLINE', feedback: 'ONLINE' },
        machineState: data.machineState || 'IDLE',
        currentStage: data.currentStage || 'MONITORING',
        dataSource: this.dataSource,
        activeTestId: data.activeTestId || null
      };

      this.emit('telemetry', normalized);
    } catch (e) {
      console.error('Failed to parse real machine telemetry packet:', e);
    }
  }

  startWatchdog() {
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    this.watchdogTimer = setInterval(() => {
      if (this.isConnected && (Date.now() - this.lastHeartbeatTime > this.heartbeatTimeout)) {
        console.warn(`[RealMachineTransport] Heartbeat lost for ${this.machineId}. Marking disconnected.`);
        this.disconnect();
      }
    }, 2000);
  }

  startTest(config) {
    if (!this.isConnected || !this.clientSocket) {
      throw new Error('Real machine is not connected.');
    }
    // Send command payload over WebSocket to ESP32
    const command = {
      cmd: 'START_TEST',
      config: config,
      timestamp: Date.now()
    };
    this.clientSocket.send(JSON.stringify(command));
  }

  abortTest(reason = 'Operator abort') {
    if (this.clientSocket) {
      this.clientSocket.send(JSON.stringify({ cmd: 'ABORT_TEST', reason, timestamp: Date.now() }));
    }
  }

  emergencyStop() {
    if (this.clientSocket) {
      this.clientSocket.send(JSON.stringify({ cmd: 'EMERGENCY_STOP', timestamp: Date.now() }));
    }
  }

  resetFaults() {
    if (this.clientSocket) {
      this.clientSocket.send(JSON.stringify({ cmd: 'RESET_FAULTS', timestamp: Date.now() }));
    }
  }

  disconnect() {
    this.isConnected = false;
    this.machineState = 'DISCONNECTED';
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);

    runQuery(`
      UPDATE machines 
      SET status = 'DISCONNECTED', last_seen_at = CURRENT_TIMESTAMP 
      WHERE machine_id = ?
    `, [this.machineId]).catch(() => {});

    this.emit('disconnected', { machineId: this.machineId });
  }
}

module.exports = RealMachineTransport;
