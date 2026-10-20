import React from 'react';
import { Map, Info, Compass, AlertCircle } from 'lucide-react';

interface TransitMapPlaceholderProps {
  startLocation: string;
  destination: string;
}

export const TransitMapPlaceholder: React.FC<TransitMapPlaceholderProps> = ({
  startLocation,
  destination,
}) => {
  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
      {/* Map Header Bar */}
      <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Map className="w-4 h-4 text-emerald-700" />
          <h3 className="text-sm font-bold text-slate-800 tracking-tight">
            Bengaluru Transit Schematic (Prototype)
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
            Not for Navigation
          </span>
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500 ml-2">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
              Purple Line
            </span>
            <span className="inline-flex items-center gap-1.5 ml-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              Green Line
            </span>
          </div>
        </div>
      </div>

      {/* Map Graphic Canvas / Placeholder Container */}
      <div className="relative h-80 sm:h-96 bg-slate-100 flex items-center justify-center overflow-hidden select-none">
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#94a3b8 1px, transparent 1px), radial-gradient(#94a3b8 1px, #f8fafc 1px)`,
            backgroundSize: '32px 32px',
            backgroundPosition: '0 0, 16px 16px',
          }}
        />

        {/* Stylized Bengaluru Transit Corridors Vector Graphic */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 600 360"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          {/* Outer Ring Road & Peripheral Expressway (Subtle dashed arcs) */}
          <path
            d="M 80,180 Q 300,40 520,180 Q 300,320 80,180"
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="3"
            strokeDasharray="6 6"
          />

          {/* Hosur Road Elevated Expressway */}
          <path
            d="M 300,200 L 460,330"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Airport Expressway (North NH 44) */}
          <path
            d="M 300,100 L 320,20"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Namma Metro Purple Line (Challaghatta - Majestic - Whitefield) */}
          <path
            d="M 60,250 L 190,190 L 300,180 L 410,170 L 540,160"
            fill="none"
            stroke="#9333ea"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* Namma Metro Green Line (Nagasandra/Peenya - Majestic - Jayanagar - Silk Institute) */}
          <path
            d="M 180,50 L 250,110 L 300,180 L 330,260 L 350,330"
            fill="none"
            stroke="#16a34a"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* Central Interchange: Majestic Hub */}
          <circle cx="300" cy="180" r="11" fill="#ffffff" stroke="#0f172a" strokeWidth="4" />
          <circle cx="300" cy="180" r="5" fill="#16a34a" />

          {/* Key Schematic Transit Nodes */}
          {/* Peenya / Yeshwanthpur */}
          <circle cx="250" cy="110" r="6" fill="#ffffff" stroke="#16a34a" strokeWidth="3" />
          {/* MG Road */}
          <circle cx="370" cy="174" r="6" fill="#ffffff" stroke="#9333ea" strokeWidth="3" />
          {/* Indiranagar */}
          <circle cx="430" cy="168" r="6" fill="#ffffff" stroke="#9333ea" strokeWidth="3" />
          {/* Whitefield */}
          <circle cx="530" cy="160" r="6" fill="#ffffff" stroke="#9333ea" strokeWidth="3" />
          {/* Jayanagar */}
          <circle cx="330" cy="260" r="6" fill="#ffffff" stroke="#16a34a" strokeWidth="3" />
          {/* Silk Board Junction */}
          <circle cx="410" cy="270" r="6" fill="#ffffff" stroke="#64748b" strokeWidth="3" />
          {/* Hebbal */}
          <circle cx="310" cy="80" r="6" fill="#ffffff" stroke="#64748b" strokeWidth="3" />
          {/* BLR Airport Area */}
          <circle cx="320" cy="25" r="7" fill="#ffffff" stroke="#0284c7" strokeWidth="3" />

          {/* Node Labels */}
          <text x="300" y="206" textAnchor="middle" fill="#0f172a" fontSize="12" fontWeight="700">
            Majestic (Central Hub)
          </text>
          <text x="370" y="158" textAnchor="middle" fill="#475569" fontSize="10" fontWeight="600">
            MG Road
          </text>
          <text x="440" y="152" textAnchor="middle" fill="#475569" fontSize="10" fontWeight="600">
            Indiranagar
          </text>
          <text x="530" y="145" textAnchor="middle" fill="#475569" fontSize="10" fontWeight="600">
            Whitefield
          </text>
          <text x="235" y="100" textAnchor="end" fill="#475569" fontSize="10" fontWeight="600">
            Yeshwanthpur
          </text>
          <text x="350" y="265" textAnchor="start" fill="#475569" fontSize="10" fontWeight="600">
            Jayanagar
          </text>
          <text x="425" y="275" textAnchor="start" fill="#475569" fontSize="10" fontWeight="600">
            Silk Board
          </text>
          <text x="325" y="80" textAnchor="start" fill="#475569" fontSize="10" fontWeight="600">
            Hebbal
          </text>
          <text x="335" y="25" textAnchor="start" fill="#0369a1" fontSize="10" fontWeight="600">
            BLR Airport
          </text>
          <text x="470" y="335" textAnchor="start" fill="#475569" fontSize="10" fontWeight="600">
            Electronic City
          </text>
        </svg>

        {/* Compass Indicator */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-xs border border-slate-200 rounded-lg p-2 flex items-center gap-1.5 shadow-2xs">
          <Compass className="w-4 h-4 text-emerald-700" />
          <span className="text-xs font-semibold text-slate-700">Bengaluru Grid</span>
        </div>

        {/* Active Locations Indicator Pill if start and destination are typed */}
        {(startLocation || destination) && (
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-xs border border-slate-200 rounded-lg p-2.5 max-w-xs shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Active Selection
            </span>
            <div className="text-xs text-slate-800 space-y-1 mt-1">
              {startLocation && (
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="font-semibold text-slate-700">From:</span>
                  <span className="truncate">{startLocation}</span>
                </div>
              )}
              {destination && (
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                  <span className="font-semibold text-slate-700">To:</span>
                  <span className="truncate">{destination}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Central Overlay Box clearly stating this is a schematic placeholder */}
        <div className="relative z-10 max-w-md mx-4 p-5 bg-white/95 backdrop-blur-md rounded-xl border border-slate-300 shadow-md text-center">
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 mx-auto flex items-center justify-center mb-2.5">
            <Map className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm">
            Static Transit Schematic (Placeholder)
          </h4>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
            This diagram is a static schematic intended for regional orientation only, <strong>not a navigation map</strong>. Interactive GIS mapping and live turn-by-turn routing are planned for Phase 2.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1">
            <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>Prototype Display · Real map integration scheduled for Phase 2</span>
          </div>
        </div>
      </div>

      {/* Map Legend & Footer */}
      <div className="px-5 py-3 bg-white border-t border-slate-200 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-purple-600 rounded"></span>
            East-West Corridor
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-emerald-600 rounded"></span>
            North-South Corridor
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full border-2 border-slate-800 bg-emerald-500"></span>
            Interchange Hub
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-medium">
          Conceptual schematic · Do not use for real-time navigation
        </span>
      </div>
    </div>
  );
};
