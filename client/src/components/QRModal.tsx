import React, { useState } from 'react';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  testId: string;
  verifyUrl: string;
  qrDataUrl: string;
}

export const QRModal: React.FC<QRModalProps> = ({
  isOpen,
  onClose,
  testId,
  verifyUrl,
  qrDataUrl
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/60 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col font-body-md text-body-md text-on-surface">
        
        {/* Header */}
        <div className="bg-surface-container-low px-space-xl py-space-md border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-space-sm font-title-md text-title-md font-semibold text-primary">
            <span className="material-symbols-outlined text-[20px]">qr_code</span>
            <span>Certificate Verification QR</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface-variant text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* QR Body */}
        <div className="p-space-xl text-center space-y-space-md">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Scan this dynamic QR code on any mobile device or external auditor terminal to verify certificate authenticity and SHA-256 digital signature.
          </p>

          <div className="bg-white p-space-lg rounded-xl inline-block shadow-md border border-outline-variant/30">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 block mx-auto" />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-outline">Loading QR...</div>
            )}
          </div>

          <div className="bg-surface-container-low p-space-md rounded-lg border border-outline-variant/30 text-left font-body-sm space-y-1">
            <div className="font-label-caps text-label-caps text-outline">TEST BATCH ID:</div>
            <div className="font-code-id text-code-id font-bold text-primary">{testId}</div>
            <div className="font-label-caps text-label-caps text-outline pt-1">PUBLIC VERIFICATION URL:</div>
            <div className="text-secondary truncate font-code-timestamp text-[11px]">{verifyUrl}</div>
          </div>

          <div className="flex items-center justify-center gap-space-sm pt-space-xs">
            <button
              onClick={handleCopy}
              className="px-space-md py-2 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container font-title-md text-title-md flex items-center gap-space-xs cursor-pointer border border-outline-variant/30"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">
                {copied ? 'check' : 'content_copy'}
              </span>
              <span>{copied ? 'Copied URL' : 'Copy URL'}</span>
            </button>
            <a
              href={verifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-space-lg py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-title-md text-title-md font-semibold flex items-center gap-space-xs shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">open_in_new</span>
              <span>Open Verification Page</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
