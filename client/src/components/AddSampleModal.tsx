import React, { useState } from 'react';
import { MCBSample } from '../types';

interface AddSampleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSampleCreated: (sample: MCBSample) => void;
}

export const AddSampleModal: React.FC<AddSampleModalProps> = ({
  isOpen,
  onClose,
  onSampleCreated
}) => {
  const [manufacturer, setManufacturer] = useState('Schneider Electric');
  const [model, setModel] = useState('Acti9 iC60N');
  const [ratedIn, setRatedIn] = useState('32');
  const [curve, setCurve] = useState<'B' | 'C' | 'D'>('C');
  const [poles, setPoles] = useState('2P');
  const [breakingKa, setBreakingKa] = useState('6.0');
  const [voltage, setVoltage] = useState('230');
  const [serialNo, setSerialNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      manufacturer,
      model,
      rated_current_in: parseFloat(ratedIn),
      trip_curve: curve,
      poles,
      breaking_capacity_ka: parseFloat(breakingKa),
      rated_voltage: parseFloat(voltage),
      serial_number: serialNo || `SN-${manufacturer.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`
    };

    try {
      const res = await fetch('/api/samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save MCB sample');
      onSampleCreated(data);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/60 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-surface-container-low px-space-xl py-space-md border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <div className="w-7 h-7 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">add_box</span>
            </div>
            <span className="font-headline-sm text-headline-sm text-on-surface">Register New MCB Under Test</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface-variant text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-space-xl space-y-space-md">
          {error && (
            <div className="p-space-md bg-error-container/40 border border-error/30 rounded-lg text-error font-body-sm text-body-sm flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-space-md">
            <div>
              <label className="block font-label-caps text-label-caps text-outline uppercase mb-1">Manufacturer</label>
              <input
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                required
                className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-space-md py-2 text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block font-label-caps text-label-caps text-outline uppercase mb-1">Model Name</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
                className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-space-md py-2 text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-space-md">
            <div>
              <label className="block font-label-caps text-label-caps text-outline uppercase mb-1">Rated Current (In)</label>
              <select
                value={ratedIn}
                onChange={(e) => setRatedIn(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-space-md py-2 text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary cursor-pointer"
              >
                {[6, 10, 16, 20, 25, 32, 40, 50, 63].map((val) => (
                  <option key={val} value={val}>{val} A</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-label-caps text-label-caps text-outline uppercase mb-1">Trip Curve</label>
              <select
                value={curve}
                onChange={(e) => setCurve(e.target.value as any)}
                className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-space-md py-2 text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="B">Type B (3–5 In)</option>
                <option value="C">Type C (5–10 In)</option>
                <option value="D">Type D (10–20 In)</option>
              </select>
            </div>
            <div>
              <label className="block font-label-caps text-label-caps text-outline uppercase mb-1">Poles</label>
              <select
                value={poles}
                onChange={(e) => setPoles(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-space-md py-2 text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="1P">1P (Single)</option>
                <option value="2P">2P (Double)</option>
                <option value="3P">3P (Triple)</option>
                <option value="4P">4P (Four Pole)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-space-md">
            <div>
              <label className="block font-label-caps text-label-caps text-outline uppercase mb-1">Breaking Capacity (kA)</label>
              <input
                type="number"
                step="0.5"
                value={breakingKa}
                onChange={(e) => setBreakingKa(e.target.value)}
                required
                className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-space-md py-2 text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block font-label-caps text-label-caps text-outline uppercase mb-1">Rated Voltage (V)</label>
              <input
                type="number"
                value={voltage}
                onChange={(e) => setVoltage(e.target.value)}
                required
                className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-space-md py-2 text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block font-label-caps text-label-caps text-outline uppercase mb-1">Batch / Serial Number</label>
            <input
              type="text"
              placeholder="e.g. SN-SCH-2026-081"
              value={serialNo}
              onChange={(e) => setSerialNo(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-space-md py-2 text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex justify-end gap-space-sm pt-space-xs">
            <button
              type="button"
              onClick={onClose}
              className="px-space-lg py-2 rounded-lg bg-surface-container-low text-on-surface font-title-md text-title-md hover:bg-surface-container transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-space-xl py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-title-md text-title-md font-semibold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Saving...' : 'Register Specimen'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
