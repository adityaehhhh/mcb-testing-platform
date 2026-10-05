const EventEmitter = require('events');

/**
 * Normalized Telemetry Data Interface
 * @typedef {Object} NormalizedTelemetry
 * @property {string} machineId
 * @property {number} timestamp - Unix timestamp in ms
 * @property {number} voltage - Instantaneous Voltage (V)
 * @property {number} current - Instantaneous Current (A)
 * @property {number} frequency - Grid Frequency (Hz)
 * @property {number} mcbTemp - MCB Terminal/Body Temperature (°C)
 * @property {number} loadTemp - Heating/Load Coil Temperature (°C)
 * @property {number} maxTemp - Peak recorded temperature (°C)
 * @property {number} tempRise - Temperature Rise ΔT (°C)
 * @property {number} power - Instantaneous Power (W)
 * @property {number} rmsVoltage - Calculated RMS Voltage (V)
 * @property {number} rmsCurrent - Calculated RMS Current (A)
 * @property {number} peakCurrent - Peak Current (A)
 * @property {number} iOverIn - Ratio I / In (calculated multiplier)
 * @property {number} i2t - Cumulative Joule integral ∫ I² dt (A²s)
 * @property {number|null} tripTimeMs - Millisecond precision trip time
 * @property {string} mcbState - 'READY' | 'ON' | 'TESTING' | 'TRIPPED' | 'FAILED_TO_TRIP' | 'UNKNOWN'
 * @property {string} contactorState - 'OPEN' | 'CLOSING' | 'CLOSED' | 'FAULT'
 * @property {string} relayState - 'READY' | 'ACTIVE' | 'OFF'
 * @property {string} esp32State - 'ONLINE' | 'OFFLINE' | 'DISCONNECTED'
 * @property {string} loadState - 'OFF' | 'ARMED' | 'ACTIVE'
 * @property {boolean} tripDetected - Boolean flag for trip confirmation
 * @property {boolean} emergencyStop - True if E-Stop is triggered
 * @property {Object} interlocks - { door: boolean, overcurrent: boolean, overtemperature: boolean }
 * @property {Object} sensorHealth - { current: string, voltage: string, temperature: string, trip: string, feedback: string }
 * @property {string} machineState - 'DISCONNECTED' | 'IDLE' | 'HANDSHAKE' | 'SAFETY_CHECK' | 'TESTING' | 'TRIPPED' | 'FAULT'
 * @property {string} currentStage - Current stage in test sequence
 * @property {string} dataSource - 'REAL_MACHINE' | 'SIMULATED'
 */

class MachineTransport extends EventEmitter {
  constructor(machineId = 'MCB-RIG-001') {
    super();
    this.machineId = machineId;
    this.isConnected = false;
    this.dataSource = 'DISCONNECTED';
  }

  connect() {
    throw new Error('Method connect() must be implemented');
  }

  disconnect() {
    throw new Error('Method disconnect() must be implemented');
  }

  startTest(config) {
    throw new Error('Method startTest() must be implemented');
  }

  abortTest(reason) {
    throw new Error('Method abortTest() must be implemented');
  }

  emergencyStop() {
    throw new Error('Method emergencyStop() must be implemented');
  }

  resetFaults() {
    throw new Error('Method resetFaults() must be implemented');
  }

  getTelemetry() {
    throw new Error('Method getTelemetry() must be implemented');
  }
}

module.exports = MachineTransport;
