import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { LaboratoryOverview } from './components/LaboratoryOverview';
import { LiveTestWorkspace } from './components/LiveTestWorkspace';
import { MCBSamplesView } from './components/MCBSamplesView';
import { HistoricalBatches } from './components/HistoricalBatches';
import { ReportsView } from './components/ReportsView';
import { MachinesView } from './components/MachinesView';
import { SettingsView } from './components/SettingsView';
import { VerificationPage } from './components/VerificationPage';
import { SecretDemoModal } from './components/SecretDemoModal';
import { AddSampleModal } from './components/AddSampleModal';
import { BatchDetailModal } from './components/BatchDetailModal';
import { ReportModal } from './components/ReportModal';
import { QRModal } from './components/QRModal';

import {
  TelemetryData,
  MCBSample,
  TestBatch,
  TestEvent,
  ReportItem,
  SystemStatus
} from './types';

export const App: React.FC = () => {
  // Check if current URL is a verification route e.g. /verify/TEST-2026-00088
  const currentPath = window.location.pathname;
  const verifyMatch = currentPath.match(/^\/verify\/([^/]+)/);
  const [verifyTestId, setVerifyTestId] = useState<string | null>(verifyMatch ? verifyMatch[1] : null);

  // Core System State
  const [status, setStatus] = useState<SystemStatus>({
    machineId: 'MCB-RIG-001',
    connected: false,
    mode: 'NONE',
    dataSource: 'DISCONNECTED',
    machineState: 'DISCONNECTED',
    currentStage: 'OFFLINE',
    testPermission: 'BLOCKED',
    blockedReasons: ['Machine is disconnected. Connect machine or activate simulator.'],
    telemetry: null
  });

  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [samples, setSamples] = useState<MCBSample[]>([]);
  const [selectedSample, setSelectedSample] = useState<MCBSample | null>(null);
  const [batches, setBatches] = useState<TestBatch[]>([]);
  const [batchStats, setBatchStats] = useState({
    total: 0,
    passCount: 0,
    failCount: 0,
    realMachineCount: 0,
    simulatedCount: 0
  });
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [testEvents, setTestEvents] = useState<TestEvent[]>([]);
  const [lastCompletedTest, setLastCompletedTest] = useState<any | null>(null);

  // Navigation & Config
  const [activeTab, setActiveTab] = useState('dashboard');
  const [testType, setTestType] = useState('MAGNETIC_TRIP_5In');
  const [scenario, setScenario] = useState('NORMAL_TEST');
  const [targetMultiplier, setTargetMultiplier] = useState(5.0);
  const [isTestLoading, setIsTestLoading] = useState(false);

  // Modals
  const [secretModalOpen, setSecretModalOpen] = useState(false);
  const [addSampleOpen, setAddSampleOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [reportModalTestId, setReportModalTestId] = useState<string | null>(null);
  const [qrModalData, setQrModalData] = useState<{ isOpen: boolean; testId: string; verifyUrl: string; qrDataUrl: string }>({
    isOpen: false,
    testId: '',
    verifyUrl: '',
    qrDataUrl: ''
  });

  // Secret Demo Click Gesture State (5 rapid clicks within 2000ms)
  const clickTimestampsRef = useRef<number[]>([]);

  // 1. Initial Data Fetching
  const fetchStatus = () => {
    fetch('/api/status')
      .then((r) => r.json())
      .then((data) => {
        setStatus(data);
        if (data.telemetry) setTelemetry(data.telemetry);
      })
      .catch((e) => console.error('Status fetch error:', e));
  };

  const fetchSamples = () => {
    fetch('/api/samples')
      .then((r) => r.json())
      .then((data) => {
        setSamples(data);
        if (data.length > 0 && !selectedSample) {
          setSelectedSample(data[0]);
        }
      })
      .catch((e) => console.error('Samples fetch error:', e));
  };

  const fetchBatches = () => {
    fetch('/api/batches')
      .then((r) => r.json())
      .then((data) => {
        setBatches(data.batches || []);
        if (data.stats) setBatchStats(data.stats);
        if (data.batches && data.batches.length > 0 && !lastCompletedTest) {
          const first = data.batches[0];
          setLastCompletedTest({
            testId: first.test_id,
            verdict: first.verdict || first.status,
            tripTimeMs: first.trip_time_ms,
            peakCurrent: first.peak_current,
            rmsCurrent: first.rms_current,
            i2t: first.i2t_value,
            failureReason: first.failure_reason
          });
        }
      })
      .catch((e) => console.error('Batches fetch error:', e));
  };

  const fetchReports = () => {
    fetch('/api/reports')
      .then((r) => r.json())
      .then((data) => setReports(data || []))
      .catch((e) => console.error('Reports fetch error:', e));
  };

  useEffect(() => {
    fetchStatus();
    fetchSamples();
    fetchBatches();
    fetchReports();
  }, []);

  // 2. WebSocket Real-time Telemetry & Events
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWS = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'TELEMETRY') {
            setTelemetry(msg.payload);
            setStatus((prev) => ({
              ...prev,
              connected: true,
              machineState: msg.payload.machineState,
              currentStage: msg.payload.currentStage,
              telemetry: msg.payload
            }));
          } else if (msg.type === 'STATE_CHANGE') {
            fetchStatus();
          } else if (msg.type === 'TEST_STARTED') {
            setTestEvents([]);
            fetchStatus();
          } else if (msg.type === 'TEST_EVENT') {
            setTestEvents((prev) => [...prev, msg.payload]);
          } else if (msg.type === 'TEST_COMPLETED') {
            fetchStatus();
            fetchBatches();
            fetchReports();
            if (msg.payload) {
              setLastCompletedTest(msg.payload);
            }
          } else if (msg.type === 'TEST_ABORTED') {
            fetchStatus();
            fetchBatches();
          } else if (msg.type === 'MACHINE_CONNECTED' || msg.type === 'MACHINE_DISCONNECTED') {
            fetchStatus();
            if (msg.type === 'MACHINE_DISCONNECTED') {
              setTelemetry(null);
            }
          }
        } catch (err) {
          console.error('[WebSocket] parse error:', err);
        }
      };

      ws.onclose = () => {
        reconnectTimeout = setTimeout(connectWS, 2000);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connectWS();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  // 3. Hidden Operator 5-Click Handler
  const handleStatusClick = () => {
    const now = Date.now();
    const timestamps = clickTimestampsRef.current;
    const recent = timestamps.filter((t) => now - t < 2000);
    recent.push(now);
    clickTimestampsRef.current = recent;

    if (recent.length >= 5) {
      clickTimestampsRef.current = [];
      setSecretModalOpen(true);
    }
  };

  // 4. Secret Demo Activation (MCB-DEMO-26)
  const handleConnectDemo = async (secretKey: string) => {
    const res = await fetch('/api/machine/connect-demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secretKey })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to activate demo mode');
    fetchStatus();
  };

  // 5. Test Actions
  const handleStartTest = async () => {
    if (!selectedSample) return;
    setIsTestLoading(true);
    try {
      const res = await fetch('/api/test/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleId: selectedSample.sample_id,
          testType,
          scenario,
          targetMultiplier
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start test');
      fetchStatus();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsTestLoading(false);
    }
  };

  const handleAbortTest = async () => {
    try {
      await fetch('/api/test/abort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Operator aborted live test from HMI console.' })
      });
      fetchStatus();
    } catch (err: any) {
      console.error('Abort test error:', err);
    }
  };

  const handleEmergencyStop = async () => {
    try {
      await fetch('/api/machine/emergency-stop', { method: 'POST' });
      fetchStatus();
    } catch (err: any) {
      console.error('E-Stop error:', err);
    }
  };

  const handleResetFaults = async () => {
    try {
      await fetch('/api/machine/reset-faults', { method: 'POST' });
      fetchStatus();
    } catch (err: any) {
      console.error('Reset faults error:', err);
    }
  };

  // Standalone Verification page route
  if (verifyTestId) {
    return (
      <VerificationPage
        testId={verifyTestId}
        onBackToDashboard={() => {
          window.history.pushState({}, '', '/');
          setVerifyTestId(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface antialiased flex flex-col">
      
      {/* 1. STITCH DESIGN SYSTEM HEADER */}
      <Header
        status={status}
        telemetry={telemetry}
        onStatusClick={handleStatusClick}
        onEmergencyStop={handleEmergencyStop}
        onResetFaults={handleResetFaults}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="w-full pt-20 flex-1 bg-background">
        {activeTab === 'dashboard' ? (
          <LaboratoryOverview
            status={status}
            telemetry={telemetry}
            selectedSample={selectedSample}
            targetMultiplier={targetMultiplier}
            onStartTest={handleStartTest}
            onNavigateToLiveTest={() => setActiveTab('live-test')}
            onOpenReport={(id) => setReportModalTestId(id)}
            onOpenQR={(id, vUrl, qUrl) => {
              setQrModalData({ isOpen: true, testId: id, verifyUrl: vUrl, qrDataUrl: qUrl });
            }}
            onSelectBatch={(id) => setSelectedBatchId(id)}
            onViewAllBatches={() => setActiveTab('test-batches')}
            batches={batches}
            lastCompletedTest={lastCompletedTest}
            isLoading={isTestLoading}
          />
        ) : activeTab === 'live-test' ? (
          <LiveTestWorkspace
            status={status}
            telemetry={telemetry}
            selectedSample={selectedSample}
            targetMultiplier={targetMultiplier}
            setTargetMultiplier={setTargetMultiplier}
            scenario={scenario}
            setScenario={setScenario}
            testType={testType}
            setTestType={setTestType}
            onStartTest={handleStartTest}
            onAbortTest={handleAbortTest}
            events={testEvents}
            lastCompletedTest={lastCompletedTest}
            isLoading={isTestLoading}
          />
        ) : activeTab === 'mcb-samples' ? (
          <MCBSamplesView
            samples={samples}
            onAddNewSample={() => setAddSampleOpen(true)}
            onSelectForTest={(sample) => {
              setSelectedSample(sample);
              setActiveTab('dashboard');
            }}
          />
        ) : activeTab === 'test-batches' ? (
          <HistoricalBatches
            batches={batches}
            stats={batchStats}
            onSelectBatch={(id) => setSelectedBatchId(id)}
            onOpenReport={(id) => setReportModalTestId(id)}
            onOpenQR={(tId, vUrl, qUrl) => {
              setQrModalData({ isOpen: true, testId: tId, verifyUrl: vUrl, qrDataUrl: qUrl });
            }}
            onRefresh={fetchBatches}
          />
        ) : activeTab === 'reports' ? (
          <ReportsView
            reports={reports}
            onOpenReport={(id) => setReportModalTestId(id)}
            onOpenQR={(tId, vUrl, qUrl) => {
              setQrModalData({ isOpen: true, testId: tId, verifyUrl: vUrl, qrDataUrl: qUrl });
            }}
          />
        ) : activeTab === 'machines' ? (
          <MachinesView />
        ) : activeTab === 'settings' ? (
          <SettingsView />
        ) : null}
      </main>

      {/* STITCH DESIGN FOOTER */}
      <footer className="w-full bg-surface-container-lowest border-t border-outline-variant/40 py-space-md">
        <div className="w-full px-space-2xl flex flex-col md:flex-row items-center justify-between gap-space-sm text-center md:text-left">
          <div className="flex items-center gap-space-sm font-label-caps text-label-caps text-on-surface-variant">
            <span className="material-symbols-outlined text-primary text-[16px]">verified</span>
            <span>IS/IEC 60898-1 STANDARD CALIBRATED</span>
            <span className="text-outline-variant">•</span>
            <span>CALIBRATION LAB LAB-ENG-44</span>
            <span className="text-outline-variant">•</span>
            <span className="font-code-timestamp text-code-timestamp">SYSTEM V4.2</span>
          </div>
          <div className="font-body-sm text-body-sm text-outline">
            © 2024 MCB Calibration Testing Platform. Strict Industrial Quality Control.
          </div>
        </div>
      </footer>

      {/* Modals */}
      <SecretDemoModal
        isOpen={secretModalOpen}
        onClose={() => setSecretModalOpen(false)}
        onConnectDemo={handleConnectDemo}
      />

      <AddSampleModal
        isOpen={addSampleOpen}
        onClose={() => setAddSampleOpen(false)}
        onSampleCreated={(newSample) => {
          fetchSamples();
          setSelectedSample(newSample);
        }}
      />

      <BatchDetailModal
        testId={selectedBatchId}
        onClose={() => setSelectedBatchId(null)}
        onOpenReport={(id) => {
          setSelectedBatchId(null);
          setReportModalTestId(id);
        }}
        onOpenQR={(id, vUrl, qUrl) => {
          setQrModalData({ isOpen: true, testId: id, verifyUrl: vUrl, qrDataUrl: qUrl });
        }}
      />

      <ReportModal
        testId={reportModalTestId}
        onClose={() => setReportModalTestId(null)}
        onOpenQR={(id, vUrl, qUrl) => {
          setQrModalData({ isOpen: true, testId: id, verifyUrl: vUrl, qrDataUrl: qUrl });
        }}
      />

      <QRModal
        isOpen={qrModalData.isOpen}
        onClose={() => setQrModalData({ isOpen: false, testId: '', verifyUrl: '', qrDataUrl: '' })}
        testId={qrModalData.testId}
        verifyUrl={qrModalData.verifyUrl}
        qrDataUrl={qrModalData.qrDataUrl}
      />

    </div>
  );
};

export default App;
