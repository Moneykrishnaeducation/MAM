import React, { useState } from 'react';
import Head from 'next/head';
import { FileText, Star } from 'lucide-react';
import BenefitsList from '@/components/Client/privacy/BenefitsList';
import PoliciesList from '@/components/Client/privacy/PoliciesList';
import { benefits, policies } from '@/components/Client/privacy/privacyData';

export default function PrivacyPage() {
  const [activeTab, setActiveTab] = useState<'benefits' | 'privacy'>('benefits');
  const panelClass = 'rounded-[28px] border border-[#1745b3] bg-[linear-gradient(180deg,#071a57_0%,#082468_100%)] shadow-[0_24px_60px_rgba(4,15,54,0.36)]';

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
              <div className="inline-flex items-center gap-1 rounded-[1.35rem] border border-[#223892] bg-[linear-gradient(180deg,#132056_0%,#0d1a45_100%)] p-1.5 shadow-[0_10px_32px_rgba(4,15,54,0.22)]">
                <button
                  type="button"
                  onClick={() => setActiveTab('benefits')}
                  className={`inline-flex min-w-[140px] items-center justify-center gap-2 rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-[0.16em] transition-all duration-300 lg:min-w-[150px] lg:px-7 lg:py-4.5 lg:text-xs lg:tracking-[0.2em] ${
                    activeTab === 'benefits'
                      ? 'border border-[#d3a11a] bg-[linear-gradient(135deg,#e0b01d_0%,#c99508_100%)] text-white shadow-[0_12px_28px_rgba(201,149,8,0.28)]'
                      : 'border border-[#273a86] bg-[linear-gradient(180deg,#162560_0%,#101d4d_100%)] text-[#a8b8ea] hover:border-[#3850a8] hover:text-white'
                  }`}
                >
                  <Star size={14} />
                  Benefits
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('privacy')}
                  className={`inline-flex min-w-[140px] items-center justify-center gap-2 rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-[0.16em] transition-all duration-300 lg:min-w-[150px] lg:px-7 lg:py-4.5 lg:text-xs lg:tracking-[0.2em] ${
                    activeTab === 'privacy'
                      ? 'border border-[#d3a11a] bg-[linear-gradient(135deg,#e0b01d_0%,#c99508_100%)] text-white shadow-[0_12px_28px_rgba(201,149,8,0.28)]'
                      : 'border border-[#273a86] bg-[linear-gradient(180deg,#162560_0%,#101d4d_100%)] text-[#a8b8ea] hover:border-[#3850a8] hover:text-white'
                  }`}
                >
                  <FileText size={14} />
                  Privacy
                </button>
              </div>
            </div>

            <div className={`${panelClass} p-4 md:p-5`}>
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
