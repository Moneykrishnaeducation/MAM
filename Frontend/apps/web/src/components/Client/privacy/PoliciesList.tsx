import { ChevronRight, Mail, MapPin, Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import type { PolicyItem } from './privacyData';

type PoliciesListProps = {
  items: PolicyItem[];
};

export default function PoliciesList({ items }: PoliciesListProps) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-3">
        {items.map((policy, index) => {
          const PolicyIcon = policy.icon;
          const isOpen = openIndex === index;

          return (
            <details
              key={policy.title}
              open={isOpen}
              onToggle={(event) => {
                if ((event.currentTarget as HTMLDetailsElement).open) {
                  setOpenIndex(index);
                } else if (openIndex === index) {
                  setOpenIndex(-1);
                }
              }}
              className="group rounded-[28px] border border-[#1745b3] bg-[linear-gradient(180deg,#071a57_0%,#082468_100%)] overflow-hidden shadow-[0_24px_60px_rgba(4,15,54,0.36)] transition-all duration-300 hover:border-amber-400/20"
            >
              <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-5 md:px-6 md:py-6">
                <div
                  className={`w-12 h-12 rounded-2xl border border-white/10 p-[1px] shadow-lg transition-transform duration-300 group-open:scale-105 ${
                    index === 0
                      ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
                      : index === 1
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-500'
                        : index === 2
                          ? 'bg-gradient-to-br from-violet-500 to-purple-500'
                          : 'bg-gradient-to-br from-amber-500 to-orange-500'
                  }`}
                >
                  <div className="w-full h-full bg-[#0b226a] rounded-2xl flex items-center justify-center">
                    <PolicyIcon size={22} className="text-white" />
                  </div>
                </div>

              <div className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
                      Privacy {index + 1}
                  </span>
                  <h3 className="text-white font-extrabold text-lg tracking-tight">
                    {policy.title}
                  </h3>
                </div>
                  <p className="mt-1 text-sm text-slate-400">
                    Click to expand the full policy text.
                  </p>
                </div>

                <div className="ml-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300">
                  {isOpen ? <Minus size={16} /> : <Plus size={16} />}
                </div>
              </summary>

              <div className="px-5 pb-5 md:px-6 md:pb-6">
                <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-5 md:p-6">
                  <p className="text-sm md:text-base leading-relaxed text-slate-300/90">
                    {policy.content}
                  </p>
                </div>
              </div>
            </details>
          );
        })}
      </div>

      <div className="mt-12 pt-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-blue-800/50" />
          <h2 className="text-xl font-bold text-slate-300 uppercase tracking-widest px-4">
            Privacy Contacts
          </h2>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-blue-800/50" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <a
            href="mailto:support@vtindex.com"
            className="group flex items-center gap-5 p-6 bg-[linear-gradient(180deg,#071a57_0%,#082468_100%)] backdrop-blur-sm rounded-2xl border border-[#1745b3] hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1 shadow-[0_24px_60px_rgba(4,15,54,0.36)] hover:shadow-xl hover:shadow-blue-500/10"
          >
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
              <Mail size={22} className="text-blue-400 group-hover:text-blue-300" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1 text-lg">Email Support</h3>
              <p className="text-blue-400 text-sm group-hover:text-blue-300 transition-colors">
                support@vtindex.com
              </p>
            </div>
            <ChevronRight size={20} className="text-slate-600 ml-auto group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
          </a>

          <div className="group flex items-center gap-5 p-6 bg-[linear-gradient(180deg,#071a57_0%,#082468_100%)] backdrop-blur-sm rounded-2xl border border-[#1745b3] hover:border-yellow-500/50 transition-all duration-300 hover:-translate-y-1 shadow-[0_24px_60px_rgba(4,15,54,0.36)] hover:shadow-xl hover:shadow-yellow-500/10 cursor-default">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-yellow-500/20 transition-colors shrink-0">
              <MapPin size={22} className="text-yellow-400 group-hover:text-yellow-300" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1 text-lg">HQ Address</h3>
              <p className="text-slate-400 text-sm leading-tight group-hover:text-slate-300 transition-colors">
                #1805, 18th Floor, Al Fahid Heights,
                <br />
                Dubai, UAE
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
