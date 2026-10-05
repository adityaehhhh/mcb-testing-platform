import React, { useState } from 'react';

interface SecretDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectDemo: (secretKey: string) => Promise<void>;
}

export const SecretDemoModal: React.FC<SecretDemoModalProps> = ({
  isOpen,
  onClose,
  onConnectDemo
}) => {
  const [keyInput, setKeyInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    'CONNECTING',
    'HANDSHAKE',
    'ESP32 DETECTED',
    'SENSOR DISCOVERY',
    'SAFETY CHECK',
    'MACHINE READY',
    'MACHINE CONNECTED'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (keyInput.trim() !== 'MCB-DEMO-26') {
      setError('Invalid operator access key. Please enter MCB-DEMO-26');
      return;
    }

    setError(null);
    setConnecting(true);

    // Animate the connection sequence
    for (let i = 0; i < steps.length; i++) {
      setStep(i);
      await new Promise((r) => setTimeout(r, 280));
    }

    try {
      await onConnectDemo(keyInput.trim());
      setTimeout(() => {
        setConnecting(false);
        onClose();
      }, 350);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize simulated transport.');
      setConnecting(false);
    }
  };

  const handleQuickFill = () => {
    setKeyInput('MCB-DEMO-26');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/60 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        
        {/* Terminal Header */}
        <div className="bg-surface-container-low px-space-xl py-space-md border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <div className="w-7 h-7 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">terminal</span>
            </div>
            <span className="font-headline-sm text-headline-sm text-on-surface">Operator Simulation Terminal</span>
          </div>
          {!connecting && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-surface-variant text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-space-xl space-y-space-md">
          <div className="font-body-sm text-body-sm text-on-surface-variant bg-surface-container-low p-space-md rounded-lg border border-outline-variant/30">
            <span className="font-bold text-primary">OPERATOR INSTRUCTION:</span> In the absence of physical rig hardware, enter the demonstration secret key to activate the centralized physics simulation engine.
          </div>

          {!connecting ? (
            <form onSubmit={handleSubmit} className="space-y-space-md">
              <div>
                <label className="block font-label-caps text-label-caps text-outline uppercase mb-1">
                  Enter Operator Key:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={keyInput}
                    onChange={(e) => {
                      setKeyInput(e.target.value);
                      setError(null);
                    }}
                    placeholder="MCB-DEMO-26"
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-space-md py-2.5 text-on-surface font-code-id text-code-id placeholder:text-outline focus:outline-none focus:border-primary"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleQuickFill}
                    className="absolute right-2 top-2 px-space-sm py-1 bg-surface-container-high hover:bg-surface-variant text-primary font-label-caps text-label-caps rounded transition-colors cursor-pointer"
                  >
                    Quick Fill
                  </button>
                </div>
                {error && (
                  <p className="mt-1 font-body-sm text-body-sm text-error flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">error</span>
                    <span>{error}</span>
                  </p>
                )}
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
                  className="px-space-xl py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-title-md text-title-md font-semibold transition-all shadow-sm cursor-pointer"
                >
                  Initialize Simulated Transport
                </button>
              </div>
            </form>
          ) : (
            /* Animated Connection Handshake Progression (Stitch Exact Steps) */
            <div className="space-y-space-md py-space-xs">
              <div className="flex items-center gap-space-sm font-title-md text-title-md font-semibold text-primary">
                <span className="material-symbols-outlined text-primary text-[20px] animate-spin">sync</span>
                <span>INITIALIZING HARDWARE TRANSPORT BRIDGE...</span>
              </div>

              <div className="space-y-2 bg-surface-container-low p-space-lg rounded-xl border border-outline-variant/30">
                {steps.map((s, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-space-sm font-code-timestamp text-code-timestamp transition-opacity duration-200 ${
                      idx <= step ? 'opacity-100' : 'opacity-25'
                    } ${idx === step ? 'text-primary font-bold' : idx < step ? 'text-tertiary' : 'text-outline'}`}
                  >
                    {idx < step ? (
                      <span className="material-symbols-outlined text-tertiary text-[18px]">check_circle</span>
                    ) : idx === step ? (
                      <span className="material-symbols-outlined text-primary text-[18px] animate-spin">progress_activity</span>
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-outline-variant inline-block"></span>
                    )}
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
