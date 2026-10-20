import React from 'react';
import { Compass, ExternalLink } from 'lucide-react';

interface FooterProps {
  onScrollTo: (id: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onScrollTo }) => {
  return (
    <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-slate-800">
          {/* Brand Area */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 text-white">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                <Compass className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold tracking-tight">Namma Route</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm leading-relaxed">
              Your Bengaluru travel companion for planning journeys by bus, metro and walking.
            </p>
          </div>

          {/* Application Navigation */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
              Application Navigation
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => onScrollTo('route-finder')}
                  className="hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Find My Route
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onScrollTo('transit-essentials')}
                  className="hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Transport Guide
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onScrollTo('how-to-use')}
                  className="hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  How to Use
                </button>
              </li>
            </ul>
          </div>

          {/* Official Transit Resources */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
              Official Transit Resources
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <a
                  href="https://mybmtc.karnataka.gov.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-emerald-400 transition-colors"
                >
                  <span>BMTC (Bus Corporation)</span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              </li>
              <li>
                <a
                  href="https://english.bmrc.co.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-emerald-400 transition-colors"
                >
                  <span>BMRCL (Namma Metro)</span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© 2026 Namma Route — Bengaluru Travel Assistant.</p>
        </div>
      </div>
    </footer>
  );
};
