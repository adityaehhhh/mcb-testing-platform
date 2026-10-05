const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { db, runQuery, getQuery, allQuery } = require('./db');
const SimulatedMachineTransport = require('./transport/SimulatedMachineTransport');
const RealMachineTransport = require('./transport/RealMachineTransport');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve static frontend build in production
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDistPath));

// Transport Manager
let activeTransport = null;
const simulatedTransport = new SimulatedMachineTransport('MCB-RIG-001');
const realTransport = new RealMachineTransport('MCB-RIG-001');

// By default: Machine is DISCONNECTED
let currentTransportMode = 'NONE'; // 'NONE' | 'SIMULATED' | 'REAL'

function getActiveTransport() {
  if (currentTransportMode === 'SIMULATED') return simulatedTransport;
  if (currentTransportMode === 'REAL') return realTransport;
  return null;
}

// Broadcast helper for UI clients
function broadcastToUI(type, payload) {
  const message = JSON.stringify({ type, payload, timestamp: Date.now() });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.isUIClient) {
      client.send(message);
    }
  });
}

// Wire up simulated transport events
simulatedTransport.on('telemetry', (data) => broadcastToUI('TELEMETRY', data));
simulatedTransport.on('state_change', (data) => broadcastToUI('STATE_CHANGE', data));
simulatedTransport.on('test_started', (data) => broadcastToUI('TEST_STARTED', data));
simulatedTransport.on('test_event', (data) => broadcastToUI('TEST_EVENT', data));
simulatedTransport.on('test_completed', (data) => broadcastToUI('TEST_COMPLETED', data));
simulatedTransport.on('test_aborted', (data) => broadcastToUI('TEST_ABORTED', data));
simulatedTransport.on('fault', (data) => broadcastToUI('FAULT', data));
simulatedTransport.on('emergency_stop', (data) => broadcastToUI('EMERGENCY_STOP', data));
simulatedTransport.on('connected', (data) => broadcastToUI('MACHINE_CONNECTED', data));
simulatedTransport.on('disconnected', (data) => broadcastToUI('MACHINE_DISCONNECTED', data));

// Wire up real transport events
realTransport.on('telemetry', (data) => broadcastToUI('TELEMETRY', data));
realTransport.on('connected', (data) => broadcastToUI('MACHINE_CONNECTED', data));
realTransport.on('disconnected', (data) => broadcastToUI('MACHINE_DISCONNECTED', data));

// WebSocket Handling
wss.on('connection', (ws, req) => {
  const url = req.url;

  if (url === '/ws/hardware') {
    // Incoming real ESP32 connection
    console.log('[Hardware WS] Real ESP32 hardware bridge connected.');
    ws.isUIClient = false;
    currentTransportMode = 'REAL';
    realTransport.setClientSocket(ws);

    ws.on('message', (msg) => {
      realTransport.handleIncomingPacket(msg);
    });

    ws.on('close', () => {
      console.log('[Hardware WS] Real ESP32 hardware disconnected.');
      realTransport.disconnect();
      currentTransportMode = 'NONE';
    });
  } else {
    // UI Client Connection
    ws.isUIClient = true;
    const transport = getActiveTransport();

    // Send initial status
    ws.send(JSON.stringify({
      type: 'INIT_STATUS',
      payload: {
        serverStatus: 'ONLINE',
        hardwareConnected: realTransport.isConnected,
        simulatorActive: simulatedTransport.isConnected,
        isConnected: transport ? transport.isConnected : false,
        machineState: transport ? transport.machineState : 'DISCONNECTED',
        dataSource: transport ? transport.dataSource : 'DISCONNECTED',
        machineId: 'MCB-RIG-001',
        telemetry: transport && transport.isConnected ? transport.getTelemetry() : null
      }
    }));
  }
});

// ==========================================
// REST API ROUTES
// ==========================================

// 1. Status & Permission
app.get('/api/status', (req, res) => {
  const transport = getActiveTransport();
  const isConnected = !!(transport && transport.isConnected);
  const telemetry = isConnected ? transport.getTelemetry() : null;

  // Test permission check
  const blockedReasons = [];
  if (!isConnected) blockedReasons.push('Machine is disconnected. Connect physical rig or activate Demo Mode.');
  if (telemetry && telemetry.emergencyStop) blockedReasons.push('Emergency stop button is depressed.');
  if (telemetry && (!telemetry.interlocks.door || !telemetry.interlocks.overcurrent || !telemetry.interlocks.overtemperature)) {
    blockedReasons.push('Safety interlocks open / unverified.');
  }
  if (telemetry && Object.values(telemetry.sensorHealth).some(v => v === 'FAULT' || v === 'DISCONNECTED')) {
    blockedReasons.push('Sensor channel fault detected.');
  }
  if (telemetry && telemetry.machineState === 'TESTING') {
    blockedReasons.push('A test is currently in progress.');
  }

  res.json({
    serverStatus: 'ONLINE',
    hardwareConnected: realTransport.isConnected,
    simulatorActive: simulatedTransport.isConnected,
    machineId: 'MCB-RIG-001',
    connected: isConnected,
    mode: currentTransportMode,
    dataSource: transport ? transport.dataSource : 'DISCONNECTED',
    machineState: transport ? transport.machineState : 'DISCONNECTED',
    currentStage: transport ? transport.currentStage : 'OFFLINE',
    testPermission: blockedReasons.length === 0 ? 'READY' : 'BLOCKED',
    blockedReasons: blockedReasons,
    telemetry: telemetry
  });
});

// 2. Secret Demo Connection Endpoint
app.post('/api/machine/connect-demo', async (req, res) => {
  const { secretKey } = req.body;
  if (secretKey !== 'MCB-DEMO-26') {
    return res.status(403).json({ error: 'Invalid operator demo key.' });
  }

  try {
    currentTransportMode = 'SIMULATED';
    await simulatedTransport.connect();
    res.json({ success: true, message: 'Simulated machine transport activated and connected.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Disconnect Machine
app.post('/api/machine/disconnect', (req, res) => {
  const transport = getActiveTransport();
  if (transport) {
    transport.disconnect();
  }
  currentTransportMode = 'NONE';
  res.json({ success: true, message: 'Machine disconnected.' });
});

// 4. Emergency Stop
app.post('/api/machine/emergency-stop', async (req, res) => {
  const transport = getActiveTransport();
  if (transport) {
    await transport.emergencyStop();
  }
  res.json({ success: true, message: 'Emergency stop activated.' });
});

// 5. Reset Faults
app.post('/api/machine/reset-faults', async (req, res) => {
  const transport = getActiveTransport();
  if (transport) {
    await transport.resetFaults();
  }
  res.json({ success: true, message: 'Faults cleared.' });
});

// 6. Start Test
app.post('/api/test/start', async (req, res) => {
  const transport = getActiveTransport();
  if (!transport || !transport.isConnected) {
    return res.status(400).json({ error: 'Machine is disconnected. Cannot start test.' });
  }

  const { sampleId, testType, scenario, targetMultiplier } = req.body;
  if (!sampleId) {
    return res.status(400).json({ error: 'Sample ID is required.' });
  }

  try {
    const sample = await getQuery('SELECT * FROM mcb_samples WHERE sample_id = ?', [sampleId]);
    if (!sample) {
      return res.status(404).json({ error: 'MCB Sample not found in database.' });
    }

    await transport.startTest({
      sample,
      testType: testType || 'MAGNETIC_TRIP_5In',
      scenario: scenario || 'NORMAL_TEST',
      targetMultiplier: targetMultiplier || (testType === 'OVERLOAD_1.45In' ? 1.45 : (testType === 'SHORT_CIRCUIT_10In' ? 10.0 : 5.0))
    });

    res.json({ success: true, message: 'Test execution initiated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Abort Test
app.post('/api/test/abort', async (req, res) => {
  const transport = getActiveTransport();
  if (transport) {
    await transport.abortTest(req.body.reason || 'Operator manually cancelled test.');
    res.json({ success: true, message: 'Test aborted.' });
  } else {
    res.status(400).json({ error: 'No active transport.' });
  }
});

// 8. MCB Samples Catalog
app.get('/api/samples', async (req, res) => {
  try {
    const samples = await allQuery('SELECT * FROM mcb_samples ORDER BY created_at DESC');
    res.json(samples);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/samples', async (req, res) => {
  const { sample_id, serial_number, manufacturer, model, rated_current_in, trip_curve, rated_voltage, poles, breaking_capacity_ka } = req.body;
  try {
    const id = sample_id || `MCB-2026-${String(Math.floor(10000 + Math.random() * 90000)).slice(-5)}`;
    const sn = serial_number || `SN-${manufacturer.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    
    await runQuery(`
      INSERT INTO mcb_samples (sample_id, serial_number, manufacturer, model, rated_current_in, trip_curve, rated_voltage, poles, breaking_capacity_ka, standard_ref)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'IS/IEC 60898-1')
    `, [id, sn, manufacturer, model, rated_current_in, trip_curve, rated_voltage || 230, poles || '2P', breaking_capacity_ka || 6.0]);

    const created = await getQuery('SELECT * FROM mcb_samples WHERE sample_id = ?', [id]);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Historical Test Batches
app.get('/api/batches', async (req, res) => {
  try {
    const { status, sample_id, data_source, curve, search } = req.query;
    let sql = `
      SELECT b.*, s.manufacturer, s.model, s.rated_current_in, s.trip_curve, s.poles,
             r.verdict, r.trip_time_ms, r.peak_current, r.rms_current, r.rms_voltage, r.i2t_value, r.temp_rise, r.failure_reason,
             q.verify_url, q.qr_code_data_url
      FROM test_batches b
      JOIN mcb_samples s ON b.sample_id = s.sample_id
      LEFT JOIN test_results r ON b.test_id = r.test_id
      LEFT JOIN qr_records q ON b.test_id = q.test_id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'ALL') {
      sql += ' AND b.status = ?';
      params.push(status);
    }
    if (data_source && data_source !== 'ALL') {
      sql += ' AND b.data_source = ?';
      params.push(data_source);
    }
    if (curve && curve !== 'ALL') {
      sql += ' AND s.trip_curve = ?';
      params.push(curve);
    }
    if (sample_id) {
      sql += ' AND b.sample_id = ?';
      params.push(sample_id);
    }
    if (search) {
      sql += ' AND (b.test_id LIKE ? OR s.sample_id LIKE ? OR s.manufacturer LIKE ? OR s.model LIKE ?)';
      const sTerm = `%${search}%`;
      params.push(sTerm, sTerm, sTerm, sTerm);
    }

    sql += ' ORDER BY b.started_at DESC, b.rowid DESC';
    const batches = await allQuery(sql, params);

    // Summary statistics
    const statsQuery = await allQuery(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'PASS' THEN 1 ELSE 0 END) as passCount,
        SUM(CASE WHEN status = 'FAIL' THEN 1 ELSE 0 END) as failCount,
        SUM(CASE WHEN data_source = 'REAL_MACHINE' THEN 1 ELSE 0 END) as realMachineCount,
        SUM(CASE WHEN data_source = 'SIMULATED' THEN 1 ELSE 0 END) as simulatedCount
      FROM test_batches
    `);

    res.json({
      batches,
      stats: statsQuery[0] || { total: 0, passCount: 0, failCount: 0, realMachineCount: 0, simulatedCount: 0 }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Single Batch Full Detail
app.get('/api/batches/:testId', async (req, res) => {
  const { testId } = req.params;
  try {
    const batch = await getQuery(`
      SELECT b.*, s.manufacturer, s.model, s.rated_current_in, s.trip_curve, s.poles, s.breaking_capacity_ka, s.serial_number
      FROM test_batches b
      JOIN mcb_samples s ON b.sample_id = s.sample_id
      WHERE b.test_id = ?
    `, [testId]);

    if (!batch) {
      return res.status(404).json({ error: 'Test batch not found' });
    }

    const result = await getQuery('SELECT * FROM test_results WHERE test_id = ?', [testId]);
    const waveformRow = await getQuery('SELECT * FROM test_waveforms WHERE test_id = ?', [testId]);
    const events = await allQuery('SELECT * FROM test_events WHERE test_id = ? ORDER BY timestamp_ms ASC', [testId]);
    const faults = await allQuery('SELECT * FROM test_faults WHERE test_id = ? ORDER BY id ASC', [testId]);
    const qrRecord = await getQuery('SELECT * FROM qr_records WHERE test_id = ?', [testId]);
    const report = await getQuery('SELECT * FROM reports WHERE test_id = ?', [testId]);

    let waveforms = null;
    if (waveformRow) {
      waveforms = {
        timeStepMs: waveformRow.time_step_ms,
        current: JSON.parse(waveformRow.current_data_json || '[]'),
        voltage: JSON.parse(waveformRow.voltage_data_json || '[]'),
        temperature: JSON.parse(waveformRow.temp_data_json || '[]'),
        i2t: JSON.parse(waveformRow.i2t_cumulative_json || '[]')
      };
    }

    res.json({
      batch,
      result,
      waveforms,
      events,
      faults,
      qrRecord,
      report: report ? { ...report, summary: JSON.parse(report.report_summary_json || '{}') } : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Reports List
app.get('/api/reports', async (req, res) => {
  try {
    const reports = await allQuery(`
      SELECT r.report_id, r.test_id, r.certificate_no, r.generated_at, r.report_summary_json,
             b.sample_id, b.data_source, s.manufacturer, s.model, s.trip_curve, s.rated_current_in,
             res.verdict, res.trip_time_ms, res.peak_current, res.i2t_value
      FROM reports r
      JOIN test_batches b ON r.test_id = b.test_id
      JOIN mcb_samples s ON b.sample_id = s.sample_id
      JOIN test_results res ON r.test_id = res.test_id
      ORDER BY r.generated_at DESC
    `);
    const parsed = reports.map(r => ({
      ...r,
      summary: JSON.parse(r.report_summary_json || '{}')
    }));
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 12. QR Code Verification Endpoint (Accessible publicly for QR scanners)
app.get('/api/verify/:testId', async (req, res) => {
  const { testId } = req.params;
  try {
    const record = await getQuery(`
      SELECT b.test_id, b.machine_id, b.started_at, b.completed_at, b.data_source, b.test_type,
             s.sample_id, s.manufacturer, s.model, s.rated_current_in, s.trip_curve, s.poles, s.breaking_capacity_ka, s.serial_number,
             r.verdict, r.trip_time_ms, r.peak_current, r.rms_current, r.rms_voltage, r.i_over_in, r.i2t_value, r.temp_rise, r.initial_temp, r.max_temp, r.standard_ref, r.failure_reason,
             q.verify_url, q.signature_hash, q.created_at as qr_created_at,
             rep.certificate_no
      FROM test_batches b
      JOIN mcb_samples s ON b.sample_id = s.sample_id
      LEFT JOIN test_results r ON b.test_id = r.test_id
      LEFT JOIN qr_records q ON b.test_id = q.test_id
      LEFT JOIN reports rep ON b.test_id = rep.test_id
      WHERE b.test_id = ?
    `, [testId]);

    if (!record) {
      return res.status(404).json({ verified: false, error: 'Certificate record not found in laboratory database.' });
    }

    res.json({
      verified: true,
      record: record,
      verificationTimestamp: new Date().toISOString(),
      institution: 'MCB High-Current Electrical Testing Laboratory',
      standardReference: 'IS/IEC 60898-1: Circuit-breakers for overcurrent protection for household and similar installations'
    });
  } catch (err) {
    res.status(500).json({ verified: false, error: err.message });
  }
});

// 13. Registered Machines
app.get('/api/machines', async (req, res) => {
  try {
    const machines = await allQuery('SELECT * FROM machines ORDER BY created_at DESC');
    res.json(machines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 14. Standard IEC 60898 Reference Data
app.get('/api/standards/iec60898', (req, res) => {
  res.json({
    standard: 'IS/IEC 60898-1:2019',
    title: 'Electrical accessories — Circuit-breakers for overcurrent protection for household and similar installations',
    curves: {
      B: {
        description: 'Instantaneous tripping between 3 In and 5 In. Ideal for resistive loads, lighting, domestic circuits.',
        magneticRange: '3 × In – 5 × In',
        instantaneousTripTime: '0.01 s – 0.04 s',
        thermalTripTimeAt1_45In: '1 min – 60 min (ambient 30°C)'
      },
      C: {
        description: 'Instantaneous tripping between 5 In and 10 In. Standard for general commercial and inductive motor loads.',
        magneticRange: '5 × In – 10 × In',
        instantaneousTripTime: '0.01 s – 0.06 s',
        thermalTripTimeAt1_45In: '1 min – 60 min (ambient 30°C)'
      },
      D: {
        description: 'Instantaneous tripping between 10 In and 20 In. For high inrush loads, transformers, industrial motors.',
        magneticRange: '10 × In – 20 × In',
        instantaneousTripTime: '0.01 s – 0.10 s',
        thermalTripTimeAt1_45In: '1 min – 60 min (ambient 30°C)'
      }
    },
    thermalLimits: {
      nonTrippingCurrent: '1.13 × In (t ≥ 1 h for In ≤ 63 A)',
      trippingCurrent: '1.45 × In (t < 1 h for In ≤ 63 A)',
      conventionalTimeHours: 1
    }
  });
});

// SPA Catch-all: serve index.html for any non-API routes (client-side routing)
app.use((req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Start Server
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` MCB Testing & Compliance Platform Server Running on :${PORT}`);
  console.log(` Default Mode: MACHINE DISCONNECTED`);
  console.log(` Operator Demo Gesture: 5 clicks on status -> 'MCB-DEMO-26'`);
  console.log(`=======================================================`);
});
