const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const dbPath = path.resolve(__dirname, 'data', 'mcb_testing.db');
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err.message);
  } else {
    console.log(`Connected to local SQLite database at: ${dbPath}`);
    initializeSchema();
  }
});

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function initializeSchema() {
  try {
    // 1. machines
    await runQuery(`
      CREATE TABLE IF NOT EXISTS machines (
        machine_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        controller_type TEXT DEFAULT 'ESP32',
        firmware_version TEXT DEFAULT 'v1.0.0',
        location TEXT,
        status TEXT DEFAULT 'DISCONNECTED', -- 'CONNECTED', 'DISCONNECTED', 'FAULT'
        last_seen_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. machine_heartbeats
    await runQuery(`
      CREATE TABLE IF NOT EXISTS machine_heartbeats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        machine_id TEXT NOT NULL,
        received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        voltage_idle REAL,
        frequency_idle REAL,
        temperature_idle REAL,
        sensor_health_json TEXT,
        FOREIGN KEY (machine_id) REFERENCES machines(machine_id)
      );
    `);

    // 3. mcb_samples
    await runQuery(`
      CREATE TABLE IF NOT EXISTS mcb_samples (
        sample_id TEXT PRIMARY KEY,
        serial_number TEXT UNIQUE,
        manufacturer TEXT NOT NULL,
        model TEXT NOT NULL,
        rated_current_in REAL NOT NULL, -- in Amperes, e.g. 10, 16, 32, 63
        trip_curve TEXT NOT NULL, -- 'B', 'C', 'D'
        rated_voltage REAL DEFAULT 230,
        poles TEXT DEFAULT '2P', -- '1P', '2P', '3P', '4P'
        breaking_capacity_ka REAL DEFAULT 6.0, -- e.g. 6kA / 10kA
        standard_ref TEXT DEFAULT 'IS/IEC 60898-1',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. test_batches
    await runQuery(`
      CREATE TABLE IF NOT EXISTS test_batches (
        test_id TEXT PRIMARY KEY,
        machine_id TEXT NOT NULL,
        sample_id TEXT NOT NULL,
        test_type TEXT NOT NULL, -- 'OVERLOAD_1.45In', 'MAGNETIC_TRIP_5In', 'SHORT_CIRCUIT_10In', 'CALIBRATION'
        scenario TEXT DEFAULT 'NORMAL_TEST',
        data_source TEXT NOT NULL, -- 'REAL_MACHINE' or 'SIMULATED'
        target_current REAL NOT NULL,
        status TEXT NOT NULL, -- 'READY', 'RUNNING', 'PASS', 'FAIL', 'ABORTED', 'FAULT'
        started_at DATETIME,
        completed_at DATETIME,
        notes TEXT,
        FOREIGN KEY (machine_id) REFERENCES machines(machine_id),
        FOREIGN KEY (sample_id) REFERENCES mcb_samples(sample_id)
      );
    `);

    // 5. test_measurements (time-series points)
    await runQuery(`
      CREATE TABLE IF NOT EXISTS test_measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_id TEXT NOT NULL,
        timestamp_ms INTEGER NOT NULL, -- ms from test start
        voltage REAL NOT NULL,
        current REAL NOT NULL,
        frequency REAL NOT NULL,
        mcb_temp REAL NOT NULL,
        load_temp REAL NOT NULL,
        power REAL NOT NULL,
        mcb_state TEXT NOT NULL,
        contactor_state TEXT NOT NULL,
        FOREIGN KEY (test_id) REFERENCES test_batches(test_id)
      );
    `);

    // 6. test_waveforms (condensed payload for high-res playback)
    await runQuery(`
      CREATE TABLE IF NOT EXISTS test_waveforms (
        test_id TEXT PRIMARY KEY,
        time_step_ms REAL DEFAULT 1.0,
        current_data_json TEXT NOT NULL, -- array of currents
        voltage_data_json TEXT NOT NULL, -- array of voltages
        temp_data_json TEXT NOT NULL,    -- array of temps
        i2t_cumulative_json TEXT,        -- cumulative I2t array
        FOREIGN KEY (test_id) REFERENCES test_batches(test_id)
      );
    `);

    // 7. test_results
    await runQuery(`
      CREATE TABLE IF NOT EXISTS test_results (
        test_id TEXT PRIMARY KEY,
        verdict TEXT NOT NULL, -- 'PASS', 'FAIL', 'INCONCLUSIVE'
        trip_time_ms REAL,
        peak_current REAL,
        rms_current REAL,
        rms_voltage REAL,
        i_over_in REAL,
        i2t_value REAL, -- A^2*s
        initial_temp REAL,
        max_temp REAL,
        temp_rise REAL,
        standard_ref TEXT DEFAULT 'IS/IEC 60898-1',
        standard_limit_min_ms REAL,
        standard_limit_max_ms REAL,
        failure_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (test_id) REFERENCES test_batches(test_id)
      );
    `);

    // 8. test_faults
    await runQuery(`
      CREATE TABLE IF NOT EXISTS test_faults (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_id TEXT,
        fault_code TEXT NOT NULL, -- 'F001'..'F008'
        fault_type TEXT NOT NULL,
        component TEXT NOT NULL,
        severity TEXT NOT NULL, -- 'CRITICAL', 'WARNING', 'INFO'
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        message TEXT NOT NULL,
        resolved BOOLEAN DEFAULT 0
      );
    `);

    // 9. test_events
    await runQuery(`
      CREATE TABLE IF NOT EXISTS test_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_id TEXT NOT NULL,
        timestamp_ms INTEGER NOT NULL,
        stage_name TEXT NOT NULL,
        description TEXT NOT NULL,
        level TEXT DEFAULT 'INFO',
        FOREIGN KEY (test_id) REFERENCES test_batches(test_id)
      );
    `);

    // 10. reports
    await runQuery(`
      CREATE TABLE IF NOT EXISTS reports (
        report_id TEXT PRIMARY KEY,
        test_id TEXT UNIQUE NOT NULL,
        certificate_no TEXT UNIQUE NOT NULL,
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        report_summary_json TEXT NOT NULL,
        pdf_path TEXT,
        FOREIGN KEY (test_id) REFERENCES test_batches(test_id)
      );
    `);

    // 11. qr_records
    await runQuery(`
      CREATE TABLE IF NOT EXISTS qr_records (
        qr_id TEXT PRIMARY KEY,
        test_id TEXT UNIQUE NOT NULL,
        verify_url TEXT NOT NULL,
        qr_code_data_url TEXT NOT NULL,
        signature_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (test_id) REFERENCES test_batches(test_id)
      );
    `);

    // 12. system_logs
    await runQuery(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        log_level TEXT NOT NULL, -- 'INFO', 'WARN', 'ERROR'
        module TEXT NOT NULL,
        message TEXT NOT NULL,
        payload_json TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await seedInitialData();
  } catch (err) {
    console.error('Schema initialization error:', err);
  }
}

async function seedInitialData() {
  try {
    // Seed default machine
    const machine = await getQuery("SELECT * FROM machines WHERE machine_id = 'MCB-RIG-001'");
    if (!machine) {
      await runQuery(`
        INSERT INTO machines (machine_id, name, controller_type, firmware_version, location, status, last_seen_at)
        VALUES ('MCB-RIG-001', 'High-Current MCB Test Rig #1', 'ESP32-WROOM-32D', 'v1.4.2-firmware', 'Station 04 - High Power Bay', 'DISCONNECTED', NULL)
      `);
      console.log('Seeded default machine MCB-RIG-001 in DISCONNECTED state.');
    }

    // Seed realistic MCB samples
    const sampleCount = await getQuery("SELECT COUNT(*) as count FROM mcb_samples");
    if (sampleCount && sampleCount.count === 0) {
      const samples = [
        {
          sample_id: 'MCB-2026-00142',
          serial_number: 'SN-SCH-2026-9481',
          manufacturer: 'Schneider Electric',
          model: 'Acti9 iC60N',
          rated_current_in: 32.0,
          trip_curve: 'C',
          rated_voltage: 230.0,
          poles: '2P',
          breaking_capacity_ka: 6.0,
          standard_ref: 'IS/IEC 60898-1'
        },
        {
          sample_id: 'MCB-2026-00143',
          serial_number: 'SN-ABB-2026-3312',
          manufacturer: 'ABB Ltd',
          model: 'System pro M compact S200',
          rated_current_in: 16.0,
          trip_curve: 'B',
          rated_voltage: 230.0,
          poles: '1P',
          breaking_capacity_ka: 6.0,
          standard_ref: 'IS/IEC 60898-1'
        },
        {
          sample_id: 'MCB-2026-00144',
          serial_number: 'SN-SIE-2026-8840',
          manufacturer: 'Siemens AG',
          model: 'SENTRON 5SL6',
          rated_current_in: 63.0,
          trip_curve: 'D',
          rated_voltage: 230.0,
          poles: '3P',
          breaking_capacity_ka: 10.0,
          standard_ref: 'IS/IEC 60898-1'
        },
        {
          sample_id: 'MCB-2026-00145',
          serial_number: 'SN-HAV-2026-5521',
          manufacturer: 'Havells India',
          model: 'Euro-X Industrial',
          rated_current_in: 20.0,
          trip_curve: 'C',
          rated_voltage: 230.0,
          poles: '2P',
          breaking_capacity_ka: 6.0,
          standard_ref: 'IS/IEC 60898-1'
        },
        {
          sample_id: 'MCB-2026-00146',
          serial_number: 'SN-LNT-2026-7734',
          manufacturer: 'L&T Electrical & Automation',
          model: 'Exora Tech',
          rated_current_in: 10.0,
          trip_curve: 'B',
          rated_voltage: 230.0,
          poles: '1P',
          breaking_capacity_ka: 6.0,
          standard_ref: 'IS/IEC 60898-1'
        }
      ];

      for (const s of samples) {
        await runQuery(`
          INSERT INTO mcb_samples (sample_id, serial_number, manufacturer, model, rated_current_in, trip_curve, rated_voltage, poles, breaking_capacity_ka, standard_ref)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [s.sample_id, s.serial_number, s.manufacturer, s.model, s.rated_current_in, s.trip_curve, s.rated_voltage, s.poles, s.breaking_capacity_ka, s.standard_ref]);
      }
      console.log('Seeded standard MCB samples.');

      // Seed historical batches so the disconnected dashboard has realistic historical batches ready!
      await seedHistoricalBatches();
    }
  } catch (err) {
    console.error('Seeding initial data error:', err);
  }
}

async function seedHistoricalBatches() {
  const QRCode = require('qrcode');
  const crypto = require('crypto');

  const historicalTests = [
    {
      test_id: 'TEST-2026-00088',
      sample_id: 'MCB-2026-00142',
      test_type: 'MAGNETIC_TRIP_5In',
      scenario: 'NORMAL_TEST',
      data_source: 'REAL_MACHINE',
      target_current: 160.0,
      status: 'PASS',
      started_at: '2026-10-04T10:15:00.000Z',
      completed_at: '2026-10-04T10:15:08.320Z',
      verdict: 'PASS',
      trip_time_ms: 28.4,
      peak_current: 162.8,
      rms_current: 159.4,
      rms_voltage: 228.6,
      i_over_in: 4.98,
      i2t_value: 721.5,
      initial_temp: 26.8,
      max_temp: 34.2,
      temp_rise: 7.4,
      standard_limit_min_ms: 10.0,
      standard_limit_max_ms: 100.0,
      failure_reason: null
    },
    {
      test_id: 'TEST-2026-00089',
      sample_id: 'MCB-2026-00143',
      test_type: 'OVERLOAD_1.45In',
      scenario: 'NORMAL_TEST',
      data_source: 'REAL_MACHINE',
      target_current: 23.2,
      status: 'PASS',
      started_at: '2026-10-04T11:40:00.000Z',
      completed_at: '2026-10-04T11:40:42.150Z',
      verdict: 'PASS',
      trip_time_ms: 38200.0,
      peak_current: 23.8,
      rms_current: 23.1,
      rms_voltage: 229.4,
      i_over_in: 1.44,
      i2t_value: 20412.0,
      initial_temp: 27.2,
      max_temp: 58.6,
      temp_rise: 31.4,
      standard_limit_min_ms: 5000.0,
      standard_limit_max_ms: 60000.0,
      failure_reason: null
    },
    {
      test_id: 'TEST-2026-00090',
      sample_id: 'MCB-2026-00145',
      test_type: 'MAGNETIC_TRIP_5In',
      scenario: 'MCB_FAIL_TO_TRIP',
      data_source: 'SIMULATED',
      target_current: 100.0,
      status: 'FAIL',
      started_at: '2026-10-04T14:20:00.000Z',
      completed_at: '2026-10-04T14:20:12.500Z',
      verdict: 'FAIL',
      trip_time_ms: 2500.0,
      peak_current: 104.2,
      rms_current: 99.8,
      rms_voltage: 227.1,
      i_over_in: 4.99,
      i2t_value: 24900.0,
      initial_temp: 28.1,
      max_temp: 72.4,
      temp_rise: 44.3,
      standard_limit_min_ms: 10.0,
      standard_limit_max_ms: 100.0,
      failure_reason: 'Trip time exceeded maximum threshold (2500ms > 100ms) for Curve C magnetic release. Overcurrent safety cutoff engaged.'
    },
    {
      test_id: 'TEST-2026-00091',
      sample_id: 'MCB-2026-00144',
      test_type: 'SHORT_CIRCUIT_10In',
      scenario: 'NORMAL_TEST',
      data_source: 'REAL_MACHINE',
      target_current: 630.0,
      status: 'PASS',
      started_at: '2026-10-05T09:10:00.000Z',
      completed_at: '2026-10-05T09:10:05.180Z',
      verdict: 'PASS',
      trip_time_ms: 16.2,
      peak_current: 648.5,
      rms_current: 628.0,
      rms_voltage: 226.4,
      i_over_in: 9.97,
      i2t_value: 6389.0,
      initial_temp: 26.5,
      max_temp: 39.8,
      temp_rise: 13.3,
      standard_limit_min_ms: 5.0,
      standard_limit_max_ms: 50.0,
      failure_reason: null
    }
  ];

  for (const t of historicalTests) {
    await runQuery(`
      INSERT INTO test_batches (test_id, machine_id, sample_id, test_type, scenario, data_source, target_current, status, started_at, completed_at, notes)
      VALUES (?, 'MCB-RIG-001', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [t.test_id, t.sample_id, t.test_type, t.scenario, t.data_source, t.target_current, t.status, t.started_at, t.completed_at, 'Routine compliance evaluation']);

    await runQuery(`
      INSERT INTO test_results (test_id, verdict, trip_time_ms, peak_current, rms_current, rms_voltage, i_over_in, i2t_value, initial_temp, max_temp, temp_rise, standard_ref, standard_limit_min_ms, standard_limit_max_ms, failure_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'IS/IEC 60898-1', ?, ?, ?)
    `, [t.test_id, t.verdict, t.trip_time_ms, t.peak_current, t.rms_current, t.rms_voltage, t.i_over_in, t.i2t_value, t.initial_temp, t.max_temp, t.temp_rise, t.standard_limit_min_ms, t.standard_limit_max_ms, t.failure_reason]);

    // Synthetic waveform data points
    const currentPoints = [];
    const voltagePoints = [];
    const tempPoints = [];
    const i2tPoints = [];
    let cumI2t = 0;
    const count = 50;
    for (let i = 0; i < count; i++) {
      const fraction = i / count;
      let curr = (fraction < 0.8) ? t.target_current * (1 + 0.05 * Math.sin(i)) : (t.verdict === 'PASS' ? 0.0 : t.target_current * 0.5);
      let volt = 230 - curr * 0.02 + 1.2 * Math.sin(i * 0.8);
      let temp = t.initial_temp + fraction * t.temp_rise;
      cumI2t += (curr * curr) * (t.trip_time_ms / count / 1000);
      currentPoints.push(parseFloat(curr.toFixed(2)));
      voltagePoints.push(parseFloat(volt.toFixed(2)));
      tempPoints.push(parseFloat(temp.toFixed(2)));
      i2tPoints.push(parseFloat(cumI2t.toFixed(2)));
    }

    await runQuery(`
      INSERT INTO test_waveforms (test_id, time_step_ms, current_data_json, voltage_data_json, temp_data_json, i2t_cumulative_json)
      VALUES (?, 1.0, ?, ?, ?, ?)
    `, [t.test_id, JSON.stringify(currentPoints), JSON.stringify(voltagePoints), JSON.stringify(tempPoints), JSON.stringify(i2tPoints)]);

    // Generate QR record & Certificate
    const certNo = `CERT-${t.test_id}-${Date.now().toString().slice(-4)}`;
    const verifyUrl = `http://localhost:5173/verify/${t.test_id}`;
    const hash = crypto.createHash('sha256').update(`${t.test_id}:${t.verdict}:${t.trip_time_ms}:${t.peak_current}`).digest('hex');
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 256, margin: 1 });

    await runQuery(`
      INSERT INTO qr_records (qr_id, test_id, verify_url, qr_code_data_url, signature_hash)
      VALUES (?, ?, ?, ?, ?)
    `, [uuidv4(), t.test_id, verifyUrl, qrDataUrl, hash]);

    const reportSummary = {
      test_id: t.test_id,
      certificate_no: certNo,
      sample_id: t.sample_id,
      machine_id: 'MCB-RIG-001',
      date: t.completed_at,
      verdict: t.verdict,
      trip_time_ms: t.trip_time_ms,
      peak_current: t.peak_current,
      rms_current: t.rms_current,
      rms_voltage: t.rms_voltage,
      i2t_value: t.i2t_value,
      i_over_in: t.i_over_in,
      temp_rise: t.temp_rise,
      data_source: t.data_source,
      standard_ref: 'IS/IEC 60898-1',
      hash: hash
    };

    await runQuery(`
      INSERT INTO reports (report_id, test_id, certificate_no, report_summary_json)
      VALUES (?, ?, ?, ?)
    `, [uuidv4(), t.test_id, certNo, JSON.stringify(reportSummary)]);
  }
  console.log('Seeded historical batches with waveforms, reports, and QR verification codes.');
}

module.exports = {
  db,
  runQuery,
  getQuery,
  allQuery
};
