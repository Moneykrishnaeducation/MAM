import type { BenefitItem } from './privacyData';

type BenefitsListProps = {
  items: BenefitItem[];
};

export default function BenefitsList({ items }: BenefitsListProps) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="relative pl-5">
        <div className="absolute left-[10px] top-2 bottom-2 w-px bg-gradient-to-b from-cyan-400/70 via-blue-500/30 to-transparent" />
        {items.map((benefit, index) => {
          const Icon = benefit.icon;
          return (
            <div key={benefit.title} className="relative pb-6 last:pb-0">
              <div className="absolute left-[-3px] top-1.5 h-5 w-5 rounded-full border border-cyan-300/40 bg-[#0b226a] shadow-[0_0_0_4px_rgba(34,211,238,0.05)]" />
              <div className="group rounded-[28px] border border-[#1745b3] bg-[linear-gradient(180deg,#071a57_0%,#082468_100%)] p-5 md:p-6 shadow-[0_24px_60px_rgba(4,15,54,0.36)] transition-all duration-300 hover:border-cyan-400/25 hover:translate-x-1">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-cyan-300/20 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-300">
                <Icon
                  size={24}
                  className="text-cyan-200 drop-shadow-[0_0_8px_rgba(103,232,249,0.35)]"
                  strokeWidth={1.5}
                />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">
                        0{index + 1}
                      </span>
                      <h3 className="text-white font-extrabold text-lg tracking-tight">
                        {benefit.title}
                      </h3>
                    </div>
                    <p className="mt-2 max-w-2xl text-slate-400 text-sm leading-relaxed group-hover:text-slate-300 transition-colors duration-300">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
