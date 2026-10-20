import React from 'react';
import { MapPin, Layers, Navigation, Compass } from 'lucide-react';

export const HowToUseSection: React.FC = () => {
  return (
    <section
      id="how-to-use"
      aria-labelledby="how-to-use-heading"
      className="w-full bg-slate-50/70 border-t border-slate-200 py-12 sm:py-16"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-2xl mb-8">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">
            TRAVEL GUIDE
          </span>
          <h2
            id="how-to-use-heading"
            className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight"
          >
            Plan Your Journey in 4 Simple Steps
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-1.5 leading-relaxed">
            Enter your locations, compare available travel options, and follow your journey across Bengaluru.
          </p>
        </div>

        {/* 4 Compact Numbered Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Enter Your Locations */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center mb-3.5">
                1
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1.5">
                Enter Your Locations
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Enter your starting point and destination. Use Swap to reverse them if needed.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>Start and destination</span>
            </div>
          </div>

          {/* Card 2: Choose Your Route */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center mb-3.5">
                2
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1.5">
                Choose Your Route
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Compare available BMTC bus, Namma Metro, walking and combined journey options.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>Compare travel options</span>
            </div>
          </div>

          {/* Card 3: Follow the Directions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center mb-3.5">
                3
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1.5">
                Follow the Directions
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Review walking segments, transit stops, boarding points and transfers provided by your selected route.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
              <Navigation className="w-3.5 h-3.5 shrink-0" />
              <span>Step-by-step guidance</span>
            </div>
          </div>

          {/* Card 4: View Your Route */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center mb-3.5">
                4
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1.5">
                View Your Route
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Inspect your route on the map. Open Street View or Google Maps when you need additional visual guidance.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span>Map and navigation</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
