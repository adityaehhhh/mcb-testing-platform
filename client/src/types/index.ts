export interface SensorHealth {
  current: 'ONLINE' | 'WARNING' | 'FAULT' | 'DISCONNECTED';
  voltage: 'ONLINE' | 'WARNING' | 'FAULT' | 'DISCONNECTED';
  temperature: 'ONLINE' | 'WARNING' | 'FAULT' | 'DISCONNECTED';
  trip: 'ONLINE' | 'WARNING' | 'FAULT' | 'DISCONNECTED';
  feedback: 'ONLINE' | 'WARNING' | 'FAULT' | 'DISCONNECTED';
  frequency?: 'ONLINE' | 'WARNING' | 'FAULT' | 'DISCONNECTED';
}

export interface Interlocks {
  door: boolean;
  overcurrent: boolean;
  overtemperature: boolean;
}

export interface TelemetryData {
  machineId: string;
  timestamp: number;
  voltage: number;
  current: number;
  frequency: number;
  mcbTemp: number;
  loadTemp: number;
  maxTemp: number;
  tempRise: number;
  power: number;
  rmsVoltage: number;
  rmsCurrent: number;
  peakCurrent: number;
  iOverIn: number;
  i2t: number;
  tripTimeMs: number | null;
  mcbState: 'READY' | 'ON' | 'TESTING' | 'TRIPPED' | 'FAILED_TO_TRIP' | 'UNKNOWN';
  contactorState: 'OPEN' | 'CLOSING' | 'CLOSED' | 'FAULT';
  relayState: 'READY' | 'ACTIVE' | 'OFF';
  esp32State: 'ONLINE' | 'OFFLINE' | 'DISCONNECTED';
  loadState: 'OFF' | 'ARMED' | 'ACTIVE';
  tripDetected: boolean;
  emergencyStop: boolean;
  interlocks: Interlocks;
  sensorHealth: SensorHealth;
  machineState: 'DISCONNECTED' | 'IDLE' | 'CONNECTING' | 'HANDSHAKE' | 'SAFETY_CHECK' | 'TESTING' | 'TRIPPED' | 'FAULT';
  currentStage: string;
  dataSource: 'REAL_MACHINE' | 'SIMULATED' | 'DISCONNECTED';
  activeTestId: string | null;
}

export interface MCBSample {
  sample_id: string;
  serial_number: string;
  manufacturer: string;
  model: string;
  rated_current_in: number;
  trip_curve: 'B' | 'C' | 'D';
  rated_voltage: number;
  poles: string;
  breaking_capacity_ka: number;
  standard_ref: string;
  created_at?: string;
}

export interface TestResult {
  test_id: string;
  verdict: 'PASS' | 'FAIL' | 'INCONCLUSIVE';
  trip_time_ms: number;
  peak_current: number;
  rms_current: number;
  rms_voltage: number;
  i_over_in: number;
  i2t_value: number;
  initial_temp: number;
  max_temp: number;
  temp_rise: number;
  standard_ref: string;
  standard_limit_min_ms: number;
  standard_limit_max_ms: number;
  failure_reason: string | null;
  created_at?: string;
}

export interface TestWaveforms {
  timeStepMs: number;
  current: number[];
  voltage: number[];
  temperature: number[];
  i2t: number[];
}

export interface TestBatch {
  test_id: string;
  machine_id: string;
  sample_id: string;
  test_type: string;
  scenario: string;
  data_source: 'REAL_MACHINE' | 'SIMULATED';
  target_current: number;
  status: 'READY' | 'RUNNING' | 'PASS' | 'FAIL' | 'ABORTED' | 'FAULT';
  started_at: string;
  completed_at?: string;
  notes?: string;
  // Joined fields
  manufacturer?: string;
  model?: string;
  rated_current_in?: number;
  trip_curve?: 'B' | 'C' | 'D';
  poles?: string;
  breaking_capacity_ka?: number;
  serial_number?: string;
  verdict?: 'PASS' | 'FAIL' | 'INCONCLUSIVE';
  trip_time_ms?: number;
  peak_current?: number;
  rms_current?: number;
  rms_voltage?: number;
  i2t_value?: number;
  temp_rise?: number;
  failure_reason?: string | null;
  verify_url?: string;
  qr_code_data_url?: string;
}

export interface TestEvent {
  id?: number;
  test_id: string;
  timestamp_ms: number;
  stage_name: string;
  description: string;
  level: 'INFO' | 'WARN' | 'ERROR';
}

export interface TestFault {
  id?: number;
  test_id?: string;
  fault_code: string;
  fault_type: string;
  component: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  timestamp: string;
  message: string;
  resolved?: boolean;
}

export interface ReportSummary {
  test_id: string;
  certificate_no: string;
  sample_id: string;
  machine_id: string;
  date: string;
  verdict: string;
  trip_time_ms: number;
  peak_current: number;
  rms_current: number;
  rms_voltage: number;
  i2t_value: number;
  i_over_in: number;
  temp_rise: number;
  initial_temp?: number;
  max_temp?: number;
  data_source: string;
  standard_ref: string;
  failure_reason?: string | null;
  hash: string;
}

export interface ReportItem {
  report_id: string;
  test_id: string;
  certificate_no: string;
  generated_at: string;
  summary: ReportSummary;
  sample_id: string;
  data_source: string;
  manufacturer: string;
  model: string;
  trip_curve: string;
  rated_current_in: number;
  verdict: string;
  trip_time_ms: number;
  peak_current: number;
  i2t_value: number;
}

export interface SystemStatus {
  machineId: string;
  connected: boolean;
  mode: 'NONE' | 'SIMULATED' | 'REAL';
  dataSource: 'REAL_MACHINE' | 'SIMULATED' | 'DISCONNECTED';
  machineState: string;
  currentStage: string;
  testPermission: 'READY' | 'BLOCKED';
  blockedReasons: string[];
  telemetry: TelemetryData | null;
}
