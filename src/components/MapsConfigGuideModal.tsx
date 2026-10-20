import React from 'react';
import { X, Key, CheckCircle, Shield, Globe, ExternalLink, Info } from 'lucide-react';

interface MapsConfigGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  isApiKeyConfigured: boolean;
}

export const MapsConfigGuideModal: React.FC<MapsConfigGuideModalProps> = ({
  isOpen,
  onClose,
  isApiKeyConfigured,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="config-guide-title"
    >
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-emerald-600" />
            <h3 id="config-guide-title" className="font-bold text-slate-900 text-base">
              Developer Settings: Google Maps Platform Configuration
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 focus:outline-none"
            aria-label="Close configuration guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm text-slate-600">
          {/* Status Indicator */}
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-3 ${
              isApiKeyConfigured
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <CheckCircle
              className={`w-5 h-5 shrink-0 ${
                isApiKeyConfigured ? 'text-emerald-600' : 'text-amber-600'
              }`}
            />
            <div>
              <p className="font-semibold text-xs">
                {isApiKeyConfigured
                  ? 'API Key Configured and Active in Environment'
                  : 'API Key Pending in Environment'}
              </p>
              <p className="text-[11px] mt-0.5 opacity-90">
                {isApiKeyConfigured
                  ? 'Interactive map rendering and Place Autocomplete are initialized.'
                  : 'Static schematic diagram is displayed as safe fallback.'}
              </p>
            </div>
          </div>

          {/* Section 1: Required APIs */}
          <div>
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-emerald-600" />
              1. Required Google Maps Platform APIs
            </h4>
            <p className="text-xs text-slate-500 mb-2.5">
              Enable the following APIs in your Google Cloud Console project:
            </p>
            <ul className="space-y-2 text-xs">
              <li className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-semibold text-slate-900 block">
                  Maps JavaScript API
                </span>
                <span className="text-slate-500 text-[11px]">
                  Renders the interactive map viewport, tiles, and AdvancedMarker elements in Bengaluru.
                </span>
              </li>
              <li className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-semibold text-slate-900 block">
                  Places API (New)
                </span>
                <span className="text-slate-500 text-[11px]">
                  Powers promise-based place autocomplete suggestions, place IDs, and location geocoding for origin and destination.
                </span>
              </li>
              <li className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-semibold text-slate-900 block">
                  Routes API (Transit Itineraries)
                </span>
                <span className="text-slate-500 text-[11px]">
                  Computes multi-modal public transit routes, transfers, and route polylines when enabled on the Google Cloud project.
                </span>
              </li>
            </ul>
          </div>

          {/* Section 2: Environment Variable */}
          <div>
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-emerald-600" />
              2. Environment Variable Configuration
            </h4>
            <p className="text-xs text-slate-500 mb-2">
              The application reads the key via Vite’s standard client-side environment variable:
            </p>
            <div className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs select-all">
              VITE_GOOGLE_MAPS_API_KEY="YOUR_KEY_HERE"
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              In Google AI Studio, this is managed via the Secrets panel. For local testing, add it to your <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">.env</code> file.
            </p>
          </div>

          {/* Section 3: Security & Key Restrictions */}
          <div>
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-600" />
              3. Recommended Production Key Restrictions
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Before deploying, restrict the key in the Google Cloud Console to authorized HTTP referrers (your app URL domain) and limit API access to authorized Google Maps Platform APIs.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Namma Route · Developer Reference
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
