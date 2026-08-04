import React, { useState } from 'react';
import Head from 'next/head';
import { FileText, Star } from 'lucide-react';
import BenefitsList from '@/components/Client/privacy/BenefitsList';
import PoliciesList from '@/components/Client/privacy/PoliciesList';
import { benefits, policies } from '@/components/Client/privacy/privacyData';

export default function PrivacyPage() {
  const [activeTab, setActiveTab] = useState<'benefits' | 'privacy'>('benefits');

  return (
    <>
      <Head>
        <title>Benefits & Policies | Client Portal</title>
      </Head>

      <div className="relative p-6 md:p-10 space-y-12 overflow-hidden">
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px] float-anim-slow" />
          <div className="absolute top-1/2 -right-40 w-[400px] h-[400px] rounded-full bg-blue-500/8 blur-[100px] float-anim-2" />
          <div className="absolute bottom-0 left-1/3 w-[350px] h-[350px] rounded-full bg-indigo-600/8 blur-[90px] float-anim-3" />
        </div>

        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 relative z-10">
          <section >
            <div className="mb-5 flex justify-center">
              <div className="inline-flex rounded-2xl border border-blue-800/40 bg-[#12244f]/80 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('benefits')}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                    activeTab === 'benefits'
                      ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Star size={15} />
                  Benefits
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('privacy')}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                    activeTab === 'privacy'
                      ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText size={15} />
                  Privacy
                </button>
              </div>
            </div>

            <div className="rounded-[28px] border border-blue-900/35 bg-[#0b1533]/75 p-4 md:p-5">
              {activeTab === 'benefits' ? (
                <BenefitsList items={benefits} />
              ) : (
                <PoliciesList items={policies} />
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
