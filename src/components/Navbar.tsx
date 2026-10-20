import React from 'react';
import { Compass, MapPin } from 'lucide-react';

interface NavbarProps {
  onScrollTo: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onScrollTo }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand title, one line */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-2.5 text-slate-900 whitespace-nowrap shrink-0 group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-md"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
            <Compass className="w-5 h-5" strokeWidth={2.2} />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-slate-900 leading-none">
              Namma Route
            </span>
            <span className="text-[11px] font-medium text-emerald-700 tracking-wide mt-0.5">
              Bengaluru Travel Assistant
            </span>
          </div>
        </a>

        {/* Zone 2: 4 nav links, 1–2 word labels, single-line */}
        <nav
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
          aria-label="Main Navigation"
        >
          <button
            onClick={() => onScrollTo('route-finder')}
            className="hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded px-1 cursor-pointer"
          >
            Find Route
          </button>
          <button
            onClick={() => onScrollTo('travel-modes')}
            className="hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded px-1 cursor-pointer"
          >
            Travel Modes
          </button>
          <button
            onClick={() => onScrollTo('how-to-use')}
            className="hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded px-1 cursor-pointer"
          >
            How to Use
          </button>
          <button
            onClick={() => onScrollTo('transit-essentials')}
            className="hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded px-1 cursor-pointer"
          >
            Transport Guide
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onScrollTo('route-finder')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-emerald-700 active:bg-emerald-800 transition-colors rounded-lg shadow-sm whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600 cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>Plan Journey</span>
          </button>
        </div>
      </div>
    </header>
  );
};
