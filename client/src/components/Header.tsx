import React from 'react';
import { SystemStatus, TelemetryData } from '../types';

interface HeaderProps {
  status: SystemStatus;
  telemetry: TelemetryData | null;
  onStatusClick: () => void;
  onEmergencyStop: () => void;
  onResetFaults: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  telemetry,
  onStatusClick,
  onEmergencyStop,
  onResetFaults,
  activeTab,
  setActiveTab
}) => {
  const isConnected = status.connected;
  const isEStop = telemetry?.emergencyStop;
  const hasFaults = telemetry && Object.values(telemetry.sensorHealth).some((v) => v === 'FAULT');

  const navItems = [
    { id: 'dashboard', label: 'Test Workspace' },
    { id: 'mcb-samples', label: 'MCB Samples' },
    { id: 'test-batches', label: 'Test Batches' },
    { id: 'reports', label: 'Reports' },
    { id: 'machines', label: 'Machines' },
    { id: 'settings', label: 'Settings' }
  ];

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/40 select-none">
      <div className="h-20 w-full px-4 sm:px-space-xl lg:px-space-2xl flex items-center justify-between gap-space-lg">
        
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-space-lg flex-shrink-0">
          <div className="flex items-center gap-space-md cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-lg bg-primary text-on-primary flex items-center justify-center font-headline-sm text-headline-sm shadow-sm">
              <span className="material-symbols-outlined">bolt</span>
            </div>
            <div>
              <div className="flex items-center gap-space-sm">
                <span className="font-headline-sm text-headline-sm text-on-surface uppercase tracking-tight font-bold">OPTITRIP SYSTEMS</span>
                <span className="px-space-sm py-0.5 rounded-DEFAULT bg-surface-container-high text-primary font-label-caps text-label-caps font-semibold">IS/IEC 60898-1</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Automated MCB Testing &amp; Compliance Platform</p>
            </div>
          </div>
        </div>

        {/* Center: Navigation Bar (Stitch Exact Tabs) */}
        <nav className="hidden xl:flex items-center h-full gap-space-lg">
          {navItems.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`h-full flex items-center px-space-xs font-title-md text-title-md transition-colors border-b-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'text-primary border-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Right: Server Status, Hardware Status, Rig ID, Vital Signs, E-Stop */}
        <div className="flex items-center gap-space-sm sm:gap-space-md flex-shrink-0">
          
          {/* Server Connection Status */}
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container-low border border-outline-variant/30 text-[11px] font-label-caps text-on-surface-variant">
            <span className="w-2 h-2 rounded-full bg-tertiary"></span>
            <span className="text-outline">SERVER:</span>
            <span className="text-tertiary font-bold">ONLINE</span>
          </div>

          {/* Machine Connection Status Badge (5 Rapid Clicks activates Hidden Demo Mode) */}
          <div
            onClick={onStatusClick}
            title="Click 5x rapidly to activate Operator Demo Mode"
            className={`flex items-center gap-space-xs px-space-md py-1 rounded font-label-caps text-label-caps cursor-pointer select-none transition-all ${
              isConnected
                ? 'bg-tertiary-container/10 border border-tertiary-container/30 text-tertiary hover:bg-tertiary-container/20'
                : 'bg-surface-container-low border border-outline-variant/30 text-outline hover:bg-surface-container'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-tertiary animate-pulse' : 'bg-outline'}`}></span>
            <span className="font-semibold">{isConnected ? 'RIG CONNECTED' : 'RIG DISCONNECTED'}</span>
          </div>

          {/* Rig ID */}
          <div className="hidden md:flex items-center gap-space-xs px-2.5 py-1 rounded bg-surface-container-low border border-outline-variant/30 text-on-surface-variant font-code-id text-code-id">
            <span className="text-outline font-label-caps text-label-caps">RIG:</span>
            <span>{status.machineId || 'MCB-RIG-001'}</span>
          </div>

          {/* Vital signs / Heartbeat */}
          <div className="hidden lg:flex items-center gap-space-xs px-2.5 py-1 rounded bg-surface-container-low border border-outline-variant/30 text-on-surface-variant font-code-timestamp text-code-timestamp">
            <span className={`material-symbols-outlined text-[14px] ${isConnected ? 'text-tertiary animate-pulse' : 'text-outline'}`}>vital_signs</span>
            <span>{isConnected ? '2.4s' : '--'}</span>
          </div>

          {/* Fault Reset (shown when faulted or E-stop triggered) */}
          {(isEStop || hasFaults) && (
            <button
              onClick={onResetFaults}
              className="px-space-md py-1.5 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface font-label-caps text-label-caps hover:bg-surface-variant transition-colors flex items-center gap-space-xs cursor-pointer"
              title="Reset Active Safety Faults & E-Stop"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              <span>RESET</span>
            </button>
          )}

          {/* E-Stop Button */}
          <button
            onClick={onEmergencyStop}
            className={`px-space-md py-1.5 rounded-lg border font-label-caps text-label-caps transition-colors flex items-center gap-space-xs cursor-pointer ${
              isEStop
                ? 'bg-error text-on-error border-error animate-pulse'
                : 'bg-error-container text-on-error-container border-error/30 hover:bg-error hover:text-on-error'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">power_settings_new</span>
            <span>{isEStop ? 'E-STOP ACTIVE' : 'E-STOP'}</span>
          </button>

          {/* Operator Avatar */}
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary">
            <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
          </div>

        </div>

      </div>

      {/* Mobile / Tablet Horizontal Navigation Bar */}
      <div className="flex xl:hidden overflow-x-auto px-4 py-2 border-t border-outline-variant/30 bg-surface-container-low gap-space-md">
        {navItems.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-space-md py-1 rounded font-title-md text-body-sm transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'bg-primary text-on-primary font-semibold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface bg-surface-container-lowest'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </header>
  );
};
