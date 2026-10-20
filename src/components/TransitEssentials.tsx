import React from 'react';
import { Bus, Train, Footprints, ArrowRight } from 'lucide-react';

interface TransitEssentialsProps {
  onScrollTo?: (sectionId: string) => void;
}

export const TransitEssentials: React.FC<TransitEssentialsProps> = ({ onScrollTo }) => {
  const handleFindRoute = () => {
    if (onScrollTo) {
      onScrollTo('route-finder');
    } else {
      document.getElementById('route-finder')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="transit-essentials"
      className="w-full py-12 sm:py-16 bg-[#F6F8FC] border-t border-[#E4E7EC]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div className="max-w-2xl">
            <span className="text-xs font-bold text-[#059669] uppercase tracking-wider block mb-1.5">
              BENGALURU TRANSPORT
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#101828] tracking-tight">
              Bengaluru Public Transport
            </h2>
            <p className="text-sm sm:text-base text-[#667085] mt-1.5 leading-relaxed">
              Choose the right way to travel around Bengaluru.
            </p>
          </div>

          <button
            type="button"
            onClick={handleFindRoute}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#059669] hover:bg-[#047857] active:bg-[#065F46] text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs hover:shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <span>Find My Route</span>
            <ArrowRight className="w-4 h-4 text-emerald-200" />
          </button>
        </div>

        {/* Three Compact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {/* Card 1: BMTC Bus */}
          <div className="bg-white rounded-2xl border border-[#E4E7EC] p-6 sm:p-7 shadow-xs hover:shadow-md hover:border-slate-300 hover:-translate-y-1 transition-all duration-200 motion-reduce:transform-none motion-reduce:transition-none flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#2563EB] ring-1 ring-blue-100 flex items-center justify-center mb-5">
                <Bus className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h3 className="font-bold text-[#101828] text-lg">BMTC Bus</h3>
              <p className="text-xs sm:text-sm text-[#667085] mt-2 leading-relaxed">
                Explore city bus services for local and longer journeys.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#E4E7EC] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] shrink-0" />
              <span className="text-xs font-semibold text-slate-700">Road Transit Network</span>
            </div>
          </div>

          {/* Card 2: Namma Metro */}
          <div className="bg-white rounded-2xl border border-[#E4E7EC] p-6 sm:p-7 shadow-xs hover:shadow-md hover:border-slate-300 hover:-translate-y-1 transition-all duration-200 motion-reduce:transform-none motion-reduce:transition-none flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-[#7C3AED] ring-1 ring-purple-100 flex items-center justify-center mb-5">
                <Train className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h3 className="font-bold text-[#101828] text-lg">Namma Metro</h3>
              <p className="text-xs sm:text-sm text-[#667085] mt-2 leading-relaxed">
                Travel between connected metro stations across Bengaluru.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#E4E7EC] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED] shrink-0" />
              <span className="text-xs font-semibold text-slate-700">Urban Rail Corridors</span>
            </div>
          </div>

          {/* Card 3: Walking */}
          <div className="bg-white rounded-2xl border border-[#E4E7EC] p-6 sm:p-7 shadow-xs hover:shadow-md hover:border-slate-300 hover:-translate-y-1 transition-all duration-200 motion-reduce:transform-none motion-reduce:transition-none flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#059669] ring-1 ring-emerald-100 flex items-center justify-center mb-5">
                <Footprints className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h3 className="font-bold text-[#101828] text-lg">Walking</h3>
              <p className="text-xs sm:text-sm text-[#667085] mt-2 leading-relaxed">
                Find pedestrian connections between your location and nearby transit stops.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#E4E7EC] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#059669] shrink-0" />
              <span className="text-xs font-semibold text-slate-700">Pedestrian Pathways</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
