import React, { useState } from 'react';
import Head from 'next/head';
import { ArrowUpRight, ShieldCheck, Sparkles, FileText, Star } from 'lucide-react';
import BenefitsList from '@/components/Client/privacy/BenefitsList';
import PoliciesList from '@/components/Client/privacy/PoliciesList';
import { benefits, policies } from '@/components/Client/privacy/privacyData';

export default function PrivacyPage() {
  const [activeTab, setActiveTab] = useState<'benefits' | 'privacy'>('benefits');
  const benefitCount = benefits.length;
  const policyCount = policies.length;

  return (
    <>
      <Head>
        <title>Benefits & Policies | Client Portal</title>
      </Head>

      <div className="relative z-10 min-h-screen p-6 md:p-10 lg:p-12">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-[120px]" />
          <div className="absolute top-1/3 -right-24 h-[360px] w-[360px] rounded-full bg-blue-600/10 blur-[120px]" />
          <div className="absolute bottom-0 left-1/4 h-[280px] w-[280px] rounded-full bg-amber-500/5 blur-[100px]" />
        </div>

        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8">
          <section className="rounded-[32px] border border-blue-800/25 bg-[#0a1324]/85 p-5 md:p-6 shadow-2xl shadow-slate-950/40">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-white">
                  Separate tabs for benefits and privacy
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Use the tabs below to switch between the two sections.
                </p>
              </div>

              <div className="inline-flex rounded-2xl border border-white/10 bg-white/5 p-1">
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

            <div className="rounded-[28px] border border-white/8 bg-[#07111f]/70 p-4 md:p-5">
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
