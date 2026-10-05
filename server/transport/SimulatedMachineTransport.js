const MachineTransport = require('./MachineTransport');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { runQuery, getQuery } = require('../db');

class SimulatedMachineTransport extends MachineTransport {
  constructor(machineId = 'MCB-RIG-001') {
    super(machineId);
    this.dataSource = 'SIMULATED';
    this.machineState = 'DISCONNECTED';
    this.currentStage = 'IDLE';

    // Physical state variables
    this.time = 0;
    this.voltage = 0;
    this.current = 0;
    this.frequency = 0;
    this.mcbTemp = 27.2;
    this.loadTemp = 28.0;
    this.initialTemp = 27.2;
    this.maxTemp = 27.2;
    this.ambientTemp = 27.0;

    // Control chain states
    this.esp32State = 'OFFLINE';
    this.relayState = 'OFF';
    this.contactorState = 'OPEN';
    this.loadState = 'OFF';
    this.mcbState = 'UNKNOWN';
    this.tripDetected = false;
    this.emergencyStop = false;

    // Safety and Sensors
    this.interlocks = {
      door: true, // true = closed/safe
      overcurrent: true, // true = safe
      overtemperature: true // true = safe
    };

    this.sensorHealth = {
      current: 'DISCONNECTED',
      voltage: 'DISCONNECTED',
      temperature: 'DISCONNECTED',
      trip: 'DISCONNECTED',
      feedback: 'DISCONNECTED',
      frequency: 'DISCONNECTED'
    };

    // Active test parameters
    this.activeTest = null;
    this.testBuffer = [];
    this.waveformCurrent = [];
    this.waveformVoltage = [];
    this.waveformTemp = [];
    this.waveformI2t = [];
    this.cumulativeI2t = 0;
    this.testStartTime = null;
    this.currentAppliedTime = null;
    this.tripTime = null;
    this.calculatedTripTimeMs = null;

    // Active faults
    this.activeFaults = [];

    // Telemetry loop timer
    this.telemetryInterval = null;
    this.tickIntervalMs = 50; // 20 Hz telemetry tick
  }

  async connect() {
    this.machineState = 'CONNECTING';
    this.emit('state_change', { state: this.machineState, message: 'Initiating handshake...' });

    // Step 1: Handshake
    await new Promise((r) => setTimeout(r, 400));
    this.machineState = 'HANDSHAKE';
    this.emit('state_change', { state: this.machineState, message: 'Controller detected: ESP32-WROOM-32D' });

    // Step 2: ESP32 Detected
    await new Promise((r) => setTimeout(r, 400));
    this.esp32State = 'ONLINE';
    this.relayState = 'READY';
    this.machineState = 'CONTROLLER_DETECTED';
    this.emit('state_change', { state: this.machineState, message: 'ESP32 firmware v1.4.2 verified' });

    // Step 3: Sensor Discovery
    await new Promise((r) => setTimeout(r, 500));
    this.sensorHealth = {
      current: 'ONLINE',
      voltage: 'ONLINE',
      temperature: 'ONLINE',
      trip: 'ONLINE',
      feedback: 'ONLINE',
      frequency: 'ONLINE'
    };
    this.machineState = 'SENSOR_DISCOVERY';
    this.emit('state_change', { state: this.machineState, message: '6/6 Sensor channels online and calibrated' });

    // Step 4: Safety Check
    await new Promise((r) => setTimeout(r, 400));
    this.interlocks = { door: true, overcurrent: true, overtemperature: true };
    this.emergencyStop = false;
    this.machineState = 'SAFETY_CHECK';
    this.emit('state_change', { state: this.machineState, message: 'Safety interlocks locked. Contactor de-energized.' });

    // Step 5: Ready
    await new Promise((r) => setTimeout(r, 300));
    this.isConnected = true;
    this.machineState = 'IDLE';
    this.mcbState = 'READY';
    this.contactorState = 'OPEN';
    this.loadState = 'OFF';
    this.currentStage = 'MACHINE READY';

    // Update DB
    await runQuery(`
      UPDATE machines 
      SET status = 'CONNECTED', last_seen_at = CURRENT_TIMESTAMP 
      WHERE machine_id = ?
    `, [this.machineId]);

    this.startTelemetryLoop();
    this.emit('connected', { machineId: this.machineId, dataSource: this.dataSource });
    this.emit('state_change', { state: this.machineState, message: '● MACHINE CONNECTED' });
  }

  disconnect() {
    this.stopTelemetryLoop();
    this.isConnected = false;
    this.machineState = 'DISCONNECTED';
    this.currentStage = 'OFFLINE';
    this.esp32State = 'DISCONNECTED';
    this.relayState = 'OFF';
    this.contactorState = 'OPEN';
    this.loadState = 'OFF';
    this.mcbState = 'UNKNOWN';
    this.sensorHealth = {
      current: 'DISCONNECTED',
      voltage: 'DISCONNECTED',
      temperature: 'DISCONNECTED',
      trip: 'DISCONNECTED',
      feedback: 'DISCONNECTED',
      frequency: 'DISCONNECTED'
    };

    runQuery(`
      UPDATE machines 
      SET status = 'DISCONNECTED', last_seen_at = CURRENT_TIMESTAMP 
      WHERE machine_id = ?
    `, [this.machineId]).catch(() => {});

    this.emit('disconnected', { machineId: this.machineId });
    this.emit('state_change', { state: this.machineState, message: '○ MACHINE DISCONNECTED' });
  }

  startTelemetryLoop() {
    if (this.telemetryInterval) clearInterval(this.telemetryInterval);
    this.telemetryInterval = setInterval(() => {
      this.tick();
    }, this.tickIntervalMs);
  }

  stopTelemetryLoop() {
    if (this.telemetryInterval) {
      clearInterval(this.telemetryInterval);
      this.telemetryInterval = null;
    }
  }

  /**
   * Physics Simulation & Telemetry Tick
   */
  tick() {
    this.time += this.tickIntervalMs / 1000;
    const now = Date.now();

    // 1. Idle Physics & Micro-fluctuations
    if (!this.activeTest) {
      // Natural instrumentation drift
      const vNoise = 0.45 * Math.sin(this.time * 0.8) + 0.25 * Math.cos(this.time * 1.7);
      this.voltage = +(230.0 + vNoise).toFixed(2);

      const fNoise = 0.04 * Math.sin(this.time * 0.3);
      this.frequency = +(50.0 + fNoise).toFixed(2);

      const iNoise = 0.03 + 0.03 * Math.abs(Math.sin(this.time * 2.1));
      this.current = +(iNoise).toFixed(2);

      // Ambient temperature slow drift
      const tDrift = 0.3 * Math.sin(this.time * 0.05);
      this.mcbTemp = +(this.ambientTemp + tDrift).toFixed(1);
      this.loadTemp = +(this.ambientTemp + 0.8 + tDrift).toFixed(1);
      this.maxTemp = Math.max(this.maxTemp, this.mcbTemp);
    } else {
      // 2. Active Test Simulation Engine
      this.simulateTestProgress(now);
    }

    // Derived Instrumentation Calculations
    const power = +(this.voltage * this.current).toFixed(1); // Watts
    const rmsVoltage = +(this.voltage * (0.998 + 0.002 * Math.sin(this.time))).toFixed(1);
    const rmsCurrent = +(this.current * 0.995).toFixed(2);
    const peakCurrent = +(this.current * (this.current > 1.0 ? 1.414 * (0.98 + 0.03 * Math.random()) : 1.1)).toFixed(2);
    const ratedIn = this.activeTest ? this.activeTest.sample.rated_current_in : 32.0;
    const iOverIn = +(rmsCurrent / ratedIn).toFixed(2);
    const tempRise = +(this.maxTemp - this.initialTemp).toFixed(1);

    const telemetry = {
      machineId: this.machineId,
      timestamp: now,
      voltage: this.voltage,
      current: this.current,
      frequency: this.frequency,
      mcbTemp: this.mcbTemp,
      loadTemp: this.loadTemp,
      maxTemp: this.maxTemp,
      tempRise: Math.max(0, tempRise),
      power: power,
      rmsVoltage: rmsVoltage,
      rmsCurrent: rmsCurrent,
      peakCurrent: peakCurrent,
      iOverIn: iOverIn,
      i2t: +(this.cumulativeI2t).toFixed(2),
      tripTimeMs: this.calculatedTripTimeMs,
      mcbState: this.mcbState,
      contactorState: this.contactorState,
      relayState: this.relayState,
      esp32State: this.esp32State,
      loadState: this.loadState,
      tripDetected: this.tripDetected,
      emergencyStop: this.emergencyStop,
      interlocks: this.interlocks,
      sensorHealth: this.sensorHealth,
      machineState: this.machineState,
      currentStage: this.currentStage,
      dataSource: this.dataSource,
      activeTestId: this.activeTest ? this.activeTest.testId : null
    };

    this.emit('telemetry', telemetry);
  }

  /**
   * State Machine for Test Execution
   */
  async startTest(config) {
    if (!this.isConnected) {
      throw new Error('Machine is disconnected. Cannot start test.');
    }
    if (this.activeTest) {
      throw new Error('A test is already in progress.');
    }
    if (this.emergencyStop) {
      throw new Error('Emergency Stop active. Clear E-Stop before starting.');
    }

    const { sample, testType = 'MAGNETIC_TRIP_5In', scenario = 'NORMAL_TEST', targetMultiplier = 5.0 } = config;
    const testId = `TEST-${new Date().getFullYear()}-${String(Math.floor(10000 + Math.random() * 90000)).slice(-5)}`;
    const targetCurrent = +(sample.rated_current_in * targetMultiplier).toFixed(1);

    this.activeTest = {
      testId,
      sample,
      testType,
      scenario,
      targetMultiplier,
      targetCurrent,
      startTime: Date.now(),
      elapsedMs: 0,
      phase: 0,
      plannedTripMs: this.computeTargetTripTime(sample.trip_curve, targetMultiplier, scenario),
      isCompleted: false
    };

    this.initialTemp = this.mcbTemp;
    this.maxTemp = this.mcbTemp;
    this.cumulativeI2t = 0;
    this.calculatedTripTimeMs = null;
    this.tripDetected = false;
    this.waveformCurrent = [];
    this.waveformVoltage = [];
    this.waveformTemp = [];
    this.waveformI2t = [];
    this.testStartTime = Date.now();
    this.currentAppliedTime = null;
    this.tripTime = null;
    this.activeFaults = [];

    // Save batch record to database
    await runQuery(`
      INSERT INTO test_batches (test_id, machine_id, sample_id, test_type, scenario, data_source, target_current, status, started_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'RUNNING', CURRENT_TIMESTAMP)
    `, [testId, this.machineId, sample.sample_id, testType, scenario, this.dataSource, targetCurrent]);

    this.recordEvent(testId, 0, 'TEST_INITIATED', `Test batch ${testId} started for MCB ${sample.sample_id} (${sample.trip_curve}${sample.rated_current_in}A)`);
    this.emit('test_started', { testId, config });
  }

  computeTargetTripTime(curve, multiplier, scenario) {
    if (scenario === 'MCB_FAIL_TO_TRIP') {
      return 4500; // Stuck mechanism, exceeds limits
    }
    if (scenario === 'CONTACTOR_FAILURE') {
      return 1000;
    }
    // Realistic trip times (calibrated to test window):
    // Magnetic trip (fast): 25ms - 60ms
    if (multiplier >= 5.0) {
      return +(22 + Math.random() * 20).toFixed(1); // 22ms - 42ms
    } else if (multiplier >= 3.0) {
      return +(35 + Math.random() * 25).toFixed(1); // 35ms - 60ms
    } else {
      // Overload thermal curve (scaled for interactive test window)
      return +(3500 + Math.random() * 1000).toFixed(1);
    }
  }

  simulateTestProgress(now) {
    if (!this.activeTest || this.activeTest.isCompleted) return;

    const t = this.activeTest;
    t.elapsedMs = now - t.startTime;

    // State machine steps based on elapsed time:
    // 0 - 300ms: PRE_TEST_SAFETY_CHECK
    if (t.elapsedMs < 300) {
      this.currentStage = 'PRE-TEST SAFETY CHECK';
      this.machineState = 'SAFETY_CHECK';
      this.contactorState = 'OPEN';
      this.relayState = 'READY';
      this.mcbState = 'READY';
      this.current = +(0.02 + 0.02 * Math.random()).toFixed(2);
      this.voltage = +(230.0 + 0.3 * Math.sin(this.time)).toFixed(2);
    }
    // 300 - 600ms: CONTACTOR_INITIALIZATION
    else if (t.elapsedMs < 600) {
      this.currentStage = 'CONTACTOR INITIALIZATION';
      this.machineState = 'TESTING';
      this.relayState = 'ACTIVE';
      this.contactorState = 'CLOSING';

      // Check for CONTACTOR_FAILURE scenario
      if (t.scenario === 'CONTACTOR_FAILURE') {
        this.injectFault('F006', 'CONTACTOR_FAILURE', 'Main AC Contactor', 'CRITICAL', 'Contactor auxiliary contact feedback failed to confirm closure.');
        this.abortTest('Contactor failure detected (F006)');
        return;
      }
    }
    // 600 - 800ms: LOAD_PREPARATION
    else if (t.elapsedMs < 800) {
      this.currentStage = 'LOAD PREPARATION';
      this.contactorState = 'CLOSED';
      this.loadState = 'ACTIVE';
      this.mcbState = 'ON';
    }
    // 800ms+: CURRENT_APPLICATION & LIVE_MEASUREMENT
    else if (t.elapsedMs >= 800 && !this.tripDetected) {
      if (!this.currentAppliedTime) {
        this.currentAppliedTime = now;
        this.currentStage = 'CURRENT APPLICATION';
        this.recordEvent(t.testId, t.elapsedMs, 'CURRENT_APPLIED', `High-current excitation engaged: ${t.targetCurrent} A applied`);
      }

      this.currentStage = 'LIVE MEASUREMENT & TRIP MONITORING';
      this.mcbState = 'TESTING';

      // Check Fault Scenarios
      if (t.scenario === 'CURRENT_SENSOR_FAULT' && t.elapsedMs > 1200) {
        this.sensorHealth.current = 'FAULT';
        this.current = -999.9;
        this.injectFault('F004', 'CURRENT_SENSOR_FAULT', 'Hall-Effect CT Sensor', 'CRITICAL', 'Current sensor signal out of range / ADC rail sat.');
        this.abortTest('Current sensor fault (F004)');
        return;
      }
      if (t.scenario === 'VOLTAGE_SENSOR_FAULT' && t.elapsedMs > 1100) {
        this.sensorHealth.voltage = 'FAULT';
        this.voltage = 0.0;
        this.injectFault('F005', 'VOLTAGE_SENSOR_FAULT', 'Voltage Sensing Module', 'CRITICAL', 'Zero-cross detection lost on L1.');
        this.abortTest('Voltage sensor fault (F005)');
        return;
      }
      if (t.scenario === 'TEMPERATURE_SENSOR_FAULT' && t.elapsedMs > 1300) {
        this.sensorHealth.temperature = 'FAULT';
        this.mcbTemp = -40.0;
        this.injectFault('F003', 'TEMPERATURE_SENSOR_FAULT', 'PT100 RTD Sensor', 'WARNING', 'RTD resistance discontinuity.');
      }
      if (t.scenario === 'EMERGENCY_STOP' && t.elapsedMs > 1200) {
        this.emergencyStop = true;
        this.injectFault('F002', 'EMERGENCY_STOP', 'Safety E-Stop Mushroom', 'CRITICAL', 'Emergency stop button depressed by operator.');
        this.abortTest('Emergency stop activated (F002)');
        return;
      }

      // Physics: Current ramps up to target with AC ripple
      const currentProgress = Math.min(1.0, (t.elapsedMs - 800) / 60); // 60ms rise time
      const testCurr = t.targetCurrent * currentProgress * (1 + 0.02 * Math.sin(this.time * 20));
      this.current = +testCurr.toFixed(2);

      // Voltage dips slightly under heavy load: V = V0 - I * R_source
      this.voltage = +(230.0 - this.current * 0.028 + 0.4 * Math.sin(this.time * 10)).toFixed(2);

      // Thermal accumulation (Joule heating)
      const heatingRate = 0.0003 * (this.current * this.current * 0.012);
      this.mcbTemp = +(this.mcbTemp + heatingRate).toFixed(1);
      this.loadTemp = +(this.loadTemp + heatingRate * 1.8).toFixed(1);
      this.maxTemp = Math.max(this.maxTemp, this.mcbTemp);

      // Joule Integral accumulation: dI2t = I^2 * dt
      const dtSec = this.tickIntervalMs / 1000;
      this.cumulativeI2t += (this.current * this.current) * dtSec;

      // Check if trip duration reached (scaled for realistic UI visibility: instantaneous trips trigger after ~400-800ms of stimulus)
      const stimulusDuration = now - this.currentAppliedTime;
      const effectiveTripWindow = t.scenario === 'MCB_FAIL_TO_TRIP' ? 4000 : (t.targetMultiplier >= 3.0 ? 600 : t.plannedTripMs);
      
      if (stimulusDuration >= effectiveTripWindow) {
        // MCB TRIP EVENT!
        this.tripDetected = true;
        this.tripTime = now;
        this.calculatedTripTimeMs = t.scenario === 'MCB_FAIL_TO_TRIP' 
          ? +(t.plannedTripMs).toFixed(1) 
          : +(t.plannedTripMs).toFixed(1);
        this.mcbState = (t.scenario === 'MCB_FAIL_TO_TRIP') ? 'FAILED_TO_TRIP' : 'TRIPPED';
        this.currentStage = 'MCB TRIP DETECTED';

        this.recordEvent(t.testId, t.elapsedMs, 'MCB_TRIP', `MCB trip mechanism activated. Measured trip time: ${this.calculatedTripTimeMs} ms`);

        // Post-trip de-energization: immediate current collapse
        this.contactorState = 'OPEN';
        this.relayState = 'READY';
        this.loadState = 'OFF';
        this.current = +(0.03 + 0.02 * Math.random()).toFixed(2); // drops instantly to zero instrument noise
      }
    }
    // Post-Trip Analysis & Compliance Stages
    else if (this.tripDetected && !t.isCompleted) {
      const postTripElapsed = now - this.tripTime;

      // Slow thermal cooling
      this.mcbTemp = +(Math.max(this.ambientTemp, this.mcbTemp - 0.03)).toFixed(1);
      this.loadTemp = +(Math.max(this.ambientTemp, this.loadTemp - 0.05)).toFixed(1);

      if (postTripElapsed < 300) {
        this.currentStage = 'DATA ANALYSIS & I²t INTEGRATION';
      } else if (postTripElapsed < 600) {
        this.currentStage = 'COMPLIANCE EVALUATION (IS/IEC 60898-1)';
      } else if (postTripElapsed < 900) {
        this.currentStage = 'RESULT & REPORT GENERATION';
      } else if (postTripElapsed >= 1200) {
        this.finalizeTest();
      }
    }

    // Capture continuous waveform buffers for playback and storage
    if (this.waveformCurrent.length < 300) {
      this.waveformCurrent.push(this.current);
      this.waveformVoltage.push(this.voltage);
      this.waveformTemp.push(this.mcbTemp);
      this.waveformI2t.push(+this.cumulativeI2t.toFixed(2));
    }
  }

  async finalizeTest() {
    const t = this.activeTest;
    t.isCompleted = true;
    this.currentStage = 'TEST COMPLETE';
    this.machineState = 'IDLE';

    // Compliance Evaluation against standard IS/IEC 60898-1
    const { sample, targetMultiplier, scenario } = t;
    let verdict = 'PASS';
    let failureReason = null;
    let limitMinMs = 10.0;
    let limitMaxMs = 100.0;

    if (targetMultiplier >= 5.0) {
      // Magnetic instantaneous trip
      limitMinMs = 10.0;
      limitMaxMs = (sample.trip_curve === 'B') ? 40.0 : (sample.trip_curve === 'C' ? 60.0 : 100.0);
    } else {
      // Overload thermal
      limitMinMs = 1000.0;
      limitMaxMs = 60000.0;
    }

    if (scenario === 'MCB_FAIL_TO_TRIP') {
      verdict = 'FAIL';
      failureReason = `MCB failed to trip within standard limit (${this.calculatedTripTimeMs} ms > ${limitMaxMs} ms). Overcurrent safety cutoff disengaged power.`;
    } else if (this.calculatedTripTimeMs > limitMaxMs) {
      verdict = 'FAIL';
      failureReason = `Trip time of ${this.calculatedTripTimeMs} ms exceeded IS/IEC 60898-1 upper boundary (${limitMaxMs} ms).`;
    }

    // Calculate actual metrics from captured waveform samples
    const peak = this.waveformCurrent.length > 0 
      ? +Math.max(...this.waveformCurrent).toFixed(2) 
      : +(t.targetCurrent * 1.02).toFixed(2);

    const nonZeroCurrents = this.waveformCurrent.filter(c => c > 0.5);
    const rmsCurr = nonZeroCurrents.length > 0
      ? +(Math.sqrt(nonZeroCurrents.reduce((sum, c) => sum + c * c, 0) / nonZeroCurrents.length)).toFixed(2)
      : +(t.targetCurrent * 0.99).toFixed(2);

    const rmsVolt = this.waveformVoltage.length > 0
      ? +(Math.sqrt(this.waveformVoltage.reduce((sum, v) => sum + v * v, 0) / this.waveformVoltage.length)).toFixed(1)
      : 228.4;

    const iOverIn = +(rmsCurr / sample.rated_current_in).toFixed(2);
    const tempRise = +(this.maxTemp - this.initialTemp).toFixed(1);
    const totalI2t = +this.cumulativeI2t.toFixed(2);

    // Update Test Batch in DB
    await runQuery(`
      UPDATE test_batches 
      SET status = ?, completed_at = CURRENT_TIMESTAMP 
      WHERE test_id = ?
    `, [verdict, t.testId]);

    // Insert Test Results
    await runQuery(`
      INSERT INTO test_results (
        test_id, verdict, trip_time_ms, peak_current, rms_current, rms_voltage,
        i_over_in, i2t_value, initial_temp, max_temp, temp_rise,
        standard_ref, standard_limit_min_ms, standard_limit_max_ms, failure_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'IS/IEC 60898-1', ?, ?, ?)
    `, [
      t.testId, verdict, this.calculatedTripTimeMs, peak, rmsCurr, rmsVolt,
      iOverIn, totalI2t, this.initialTemp, this.maxTemp, tempRise,
      limitMinMs, limitMaxMs, failureReason
    ]);

    // Save Waveforms
    await runQuery(`
      INSERT INTO test_waveforms (test_id, time_step_ms, current_data_json, voltage_data_json, temp_data_json, i2t_cumulative_json)
      VALUES (?, 1.0, ?, ?, ?, ?)
    `, [
      t.testId,
      JSON.stringify(this.waveformCurrent),
      JSON.stringify(this.waveformVoltage),
      JSON.stringify(this.waveformTemp),
      JSON.stringify(this.waveformI2t)
    ]);

    // Generate QR Code & Verification Record with Dynamic Base URL
    const baseUrl = process.env.APP_BASE_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'http://localhost:5000');
    const verifyUrl = `${baseUrl}/verify/${t.testId}`;
    const signatureHash = crypto.createHash('sha256').update(`${t.testId}:${verdict}:${this.calculatedTripTimeMs}:${peak}:${this.dataSource}`).digest('hex');
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 256, margin: 1 });

    await runQuery(`
      INSERT INTO qr_records (qr_id, test_id, verify_url, qr_code_data_url, signature_hash)
      VALUES (?, ?, ?, ?, ?)
    `, [uuidv4(), t.testId, verifyUrl, qrDataUrl, signatureHash]);

    // Generate Certificate & Report
    const certNo = `CERT-${t.testId}-${Date.now().toString().slice(-4)}`;
    const reportSummary = {
      test_id: t.testId,
      certificate_no: certNo,
      sample_id: sample.sample_id,
      machine_id: this.machineId,
      date: new Date().toISOString(),
      verdict: verdict,
      trip_time_ms: this.calculatedTripTimeMs,
      peak_current: peak,
      rms_current: rmsCurr,
      rms_voltage: rmsVolt,
      i2t_value: totalI2t,
      i_over_in: iOverIn,
      temp_rise: tempRise,
      initial_temp: this.initialTemp,
      max_temp: this.maxTemp,
      data_source: this.dataSource,
      standard_ref: 'IS/IEC 60898-1',
      failure_reason: failureReason,
      hash: signatureHash
    };

    await runQuery(`
      INSERT INTO reports (report_id, test_id, certificate_no, report_summary_json)
      VALUES (?, ?, ?, ?)
    `, [uuidv4(), t.testId, certNo, JSON.stringify(reportSummary)]);

    this.recordEvent(t.testId, t.elapsedMs, 'TEST_COMPLETED', `Test concluded with verdict: ${verdict}. Certificate ${certNo} issued.`);

    const completedTestPayload = {
      testId: t.testId,
      verdict,
      tripTimeMs: this.calculatedTripTimeMs,
      peakCurrent: peak,
      rmsCurrent: rmsCurr,
      rmsVoltage: rmsVolt,
      iOverIn,
      i2t: totalI2t,
      tempRise,
      failureReason,
      reportSummary,
      qrDataUrl,
      verifyUrl,
      waveform: {
        current: this.waveformCurrent,
        voltage: this.waveformVoltage,
        temperature: this.waveformTemp,
        i2t: this.waveformI2t
      }
    };

    this.emit('test_completed', completedTestPayload);
    this.activeTest = null;
  }

  async abortTest(reason = 'Operator aborted test') {
    if (!this.activeTest) return;

    const t = this.activeTest;
    this.contactorState = 'OPEN';
    this.relayState = 'READY';
    this.loadState = 'OFF';
    this.mcbState = 'UNKNOWN';
    this.current = 0.02;
    this.machineState = 'FAULT';
    this.currentStage = 'ABORTED: ' + reason;

    await runQuery(`
      UPDATE test_batches 
      SET status = 'ABORTED', completed_at = CURRENT_TIMESTAMP, notes = ? 
      WHERE test_id = ?
    `, [reason, t.testId]);

    this.recordEvent(t.testId, t.elapsedMs || 0, 'TEST_ABORTED', `Test aborted: ${reason}`, 'ERROR');
    this.emit('test_aborted', { testId: t.testId, reason });
    this.activeTest = null;
  }

  async emergencyStop() {
    this.emergencyStop = true;
    this.contactorState = 'OPEN';
    this.relayState = 'OFF';
    this.loadState = 'OFF';
    this.current = 0.0;
    this.machineState = 'FAULT';
    this.currentStage = 'EMERGENCY STOP ENGAGED';

    await this.injectFault('F002', 'EMERGENCY_STOP', 'E-Stop Mushroom', 'CRITICAL', 'Emergency stop engaged by operator.');

    if (this.activeTest) {
      await this.abortTest('Emergency Stop Triggered');
    }

    this.emit('emergency_stop', { machineId: this.machineId });
  }

  async resetFaults() {
    this.emergencyStop = false;
    this.interlocks = { door: true, overcurrent: true, overtemperature: true };
    this.sensorHealth = {
      current: 'ONLINE',
      voltage: 'ONLINE',
      temperature: 'ONLINE',
      trip: 'ONLINE',
      feedback: 'ONLINE',
      frequency: 'ONLINE'
    };
    this.activeFaults = [];
    this.machineState = this.isConnected ? 'IDLE' : 'DISCONNECTED';
    this.currentStage = this.isConnected ? 'MACHINE READY' : 'OFFLINE';

    await runQuery(`UPDATE test_faults SET resolved = 1 WHERE resolved = 0`);
    this.emit('faults_reset', { machineId: this.machineId });
  }

  async injectFault(code, type, component, severity, message) {
    const fault = { code, type, component, severity, message, timestamp: new Date().toISOString() };
    this.activeFaults.push(fault);

    await runQuery(`
      INSERT INTO test_faults (test_id, fault_code, fault_type, component, severity, message)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [this.activeTest ? this.activeTest.testId : null, code, type, component, severity, message]);

    this.emit('fault', fault);
  }

  async recordEvent(testId, timestampMs, stageName, description, level = 'INFO') {
    try {
      await runQuery(`
        INSERT INTO test_events (test_id, timestamp_ms, stage_name, description, level)
        VALUES (?, ?, ?, ?, ?)
      `, [testId, Math.floor(timestampMs), stageName, description, level]);

      this.emit('test_event', { testId, timestampMs, stageName, description, level });
    } catch (e) {
      console.error('Record event error:', e);
    }
  }

  getTelemetry() {
    return {
      machineId: this.machineId,
      timestamp: Date.now(),
      voltage: this.voltage,
      current: this.current,
      frequency: this.frequency,
      mcbTemp: this.mcbTemp,
      loadTemp: this.loadTemp,
      maxTemp: this.maxTemp,
      tempRise: Math.max(0, +(this.maxTemp - this.initialTemp).toFixed(1)),
      power: +(this.voltage * this.current).toFixed(1),
      rmsVoltage: +(this.voltage * 0.998).toFixed(1),
      rmsCurrent: +(this.current * 0.995).toFixed(2),
      peakCurrent: +(this.current * 1.414).toFixed(2),
      iOverIn: +(this.current / (this.activeTest?.sample?.rated_current_in || 32)).toFixed(2),
      i2t: +this.cumulativeI2t.toFixed(2),
      tripTimeMs: this.calculatedTripTimeMs,
      mcbState: this.mcbState,
      contactorState: this.contactorState,
      relayState: this.relayState,
      esp32State: this.esp32State,
      loadState: this.loadState,
      tripDetected: this.tripDetected,
      emergencyStop: this.emergencyStop,
      interlocks: this.interlocks,
      sensorHealth: this.sensorHealth,
      machineState: this.machineState,
      currentStage: this.currentStage,
      dataSource: this.dataSource,
      activeTestId: this.activeTest?.testId || null
    };
  }
}

module.exports = SimulatedMachineTransport;
