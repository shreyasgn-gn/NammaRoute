import React from 'react';
import { Bus, Train, Footprints, GitFork, Check } from 'lucide-react';
import { TRAVEL_MODES } from '../data/bengaluruLocations';
import { TravelMode } from '../types/transit';

interface TravelModeSelectorProps {
  selectedMode: TravelMode;
  onSelectMode: (mode: TravelMode) => void;
}

const MODE_ICONS: Record<TravelMode, React.ReactNode> = {
  bus: <Bus className="w-5 h-5" />,
  metro: <Train className="w-5 h-5" />,
  walk: <Footprints className="w-5 h-5" />,
  combined: <GitFork className="w-5 h-5" />,
};

export const TravelModeSelector: React.FC<TravelModeSelectorProps> = ({
  selectedMode,
  onSelectMode,
}) => {
  return (
    <section id="travel-modes" className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-4 gap-1">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Choose Your Travel Mode
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Select how you would prefer to traverse Bengaluru’s transit network.
          </p>
        </div>
        <span className="text-xs text-slate-400 font-medium">
          Selected: {TRAVEL_MODES.find((m) => m.id === selectedMode)?.name}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {TRAVEL_MODES.map((mode) => {
          const isSelected = selectedMode === mode.id;

          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onSelectMode(mode.id)}
              aria-pressed={isSelected}
              className={`text-left p-4 rounded-xl border transition-all duration-150 relative flex flex-col justify-between group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 cursor-pointer ${
                isSelected
                  ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600/30 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 hover:shadow-2xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
                    }`}
                  >
                    {MODE_ICONS[mode.id]}
                  </div>

                  {isSelected ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-white border border-emerald-300 rounded px-2 py-0.5 shadow-2xs">
                      <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                      Active
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-slate-400">
                      {mode.kannadaName}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-1.5">
                  <h3 className="font-bold text-slate-900 text-base">
                    {mode.name}
                  </h3>
                  {isSelected && (
                    <span className="text-xs text-emerald-700 font-medium">
                      ({mode.kannadaName})
                    </span>
                  )}
                </div>

                <p className="text-xs font-medium text-emerald-700 mt-0.5">
                  {mode.tagline}
                </p>

                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {mode.description}
                </p>
              </div>

              <div className="mt-3.5 pt-3 border-t border-slate-100">
                <span className="text-[11px] text-slate-500 font-medium block">
                  Best for: <span className="text-slate-700">{mode.bestFor}</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
