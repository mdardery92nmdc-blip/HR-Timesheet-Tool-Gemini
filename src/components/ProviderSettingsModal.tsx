import React, { useState } from 'react';
import { ExtractionProviderConfig } from '../types';
import { X, Check, Key, Cpu, ShieldCheck } from 'lucide-react';

interface ProviderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ExtractionProviderConfig;
  onSave: (config: ExtractionProviderConfig) => void;
}

export const ProviderSettingsModal: React.FC<ProviderSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave
}) => {
  const [activeProvider, setActiveProvider] = useState(config.activeProvider);
  const [enableOcrFallback, setEnableOcrFallback] = useState(config.enableOcrFallback);
  const [enableDocAiFallback, setEnableDocAiFallback] = useState(config.enableDocAiFallback);
  const [geminiApiKey, setGeminiApiKey] = useState(config.apiKeys.geminiApiKey || '');
  const [customEndpointUrl, setCustomEndpointUrl] = useState(config.apiKeys.customEndpointUrl || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      activeProvider,
      enableOcrFallback,
      enableDocAiFallback,
      apiKeys: {
        geminiApiKey: geminiApiKey.trim(),
        customEndpointUrl: customEndpointUrl.trim()
      }
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">Document Extraction & Fallback Providers</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-slate-600">
          {/* Primary engine */}
          <div>
            <label className="font-semibold text-slate-800 block mb-1">Primary Extraction Engine</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
              <button
                type="button"
                onClick={() => setActiveProvider('vector-pdf')}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  activeProvider === 'vector-pdf'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-semibold'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="font-bold text-xs">Vector PDF</div>
                <div className="text-[10px] text-slate-500 mt-0.5">High-speed client parser</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveProvider('wasm-ocr')}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  activeProvider === 'wasm-ocr'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-semibold'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="font-bold text-xs">WASM OCR</div>
                <div className="text-[10px] text-slate-500 mt-0.5">In-browser Tesseract</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveProvider('doc-ai')}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  activeProvider === 'doc-ai'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-semibold'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="font-bold text-xs">AI Document AI</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Gemini Vision model</div>
              </button>
            </div>
          </div>

          {/* Fallback toggles */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <span className="font-semibold text-slate-800 block">Automatic Fallback Cascade</span>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableOcrFallback}
                onChange={(e) => setEnableOcrFallback(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-medium text-slate-800">Enable Local OCR Fallback (Tier 2)</span>
                <p className="text-[11px] text-slate-500">Automatically trigger OCR if PDF yields 0 extractable text characters.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableDocAiFallback}
                onChange={(e) => setEnableDocAiFallback(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-medium text-slate-800">Enable Cloud Multimodal AI Fallback (Tier 3)</span>
                <p className="text-[11px] text-slate-500">Forward complex unstructured timesheets to configured Document AI provider.</p>
              </div>
            </label>
          </div>

          {/* Provider API Key Mapping */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <Key className="w-3.5 h-3.5 text-blue-600" />
              <span>Provider API Key Map</span>
            </div>

            <div>
              <label className="text-[11px] text-slate-600 block mb-1">Gemini API Key (Optional)</label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Stored securely in browser memory for future multimodal vision extraction.</p>
            </div>

            <div>
              <label className="text-[11px] text-slate-600 block mb-1">Custom DocAI Gateway / Endpoint (Optional)</label>
              <input
                type="text"
                placeholder="https://api.enterprise.internal/v1/extract"
                value={customEndpointUrl}
                onChange={(e) => setCustomEndpointUrl(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Config stored locally in browser</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Saved
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
