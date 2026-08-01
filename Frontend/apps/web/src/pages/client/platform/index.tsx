import React, { useState } from 'react';
import Head from 'next/head';
import { Download, Monitor, Smartphone, Star, Apple, ArrowRight } from 'lucide-react';
import ClientSidebar from '@/components/Client/sidebar';
import ClientHeader from '@/components/Client/header';

const platforms = [
  {
    id: 'windows',
    label: 'Windows',
    sublabel: 'Professional Trading',
    description: 'Get the full VT-Index experience on your desktop with advanced charting and features.',
    icon: Monitor,
    recommended: true,
    buttonLabel: 'Get Terminal',
  },
  {
    id: 'macos',
    label: 'macOS',
    sublabel: 'Optimized for Mac',
    description: 'Native experience for Mac users, providing seamless performance and security.',
    icon: Apple,
    recommended: false,
    buttonLabel: 'Get Terminal',
  },
  {
    id: 'android',
    label: 'Android',
    sublabel: 'Trade Anywhere',
    description: 'Stay connected to the markets 24/7 with our highly-rated Android application.',
    icon: Smartphone,
    recommended: false,
    buttonLabel: 'Get Terminal',
  },
  {
    id: 'iphone',
    label: 'iPhone',
    sublabel: 'Mobile Excellence',
    description: 'The power of professional trading in your pocket. Fast, secure, and intuitive.',
    icon: Apple,
    recommended: false,
    buttonLabel: 'Get Terminal',
  },
];



export default function ClientPlatformPage() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen font-sans antialiased text-slate-100" style={{ backgroundColor: '#0e2250' }}>
      <Head>
        <title>Trading Platforms | Client Portal</title>
      </Head>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 1; }
          70% { transform: scale(1.15); opacity: 0; }
          100% { transform: scale(0.95); opacity: 0; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(80px) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(80px) rotate(-360deg); }
        }
        @keyframes beam {
          0%, 100% { opacity: 0.3; transform: scaleX(0.8); }
          50% { opacity: 1; transform: scaleX(1); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .float-anim { animation: float 4s ease-in-out infinite; }
        .float-anim-slow { animation: float 6s ease-in-out infinite; }
        .float-anim-2 { animation: float 5s ease-in-out infinite; animation-delay: 1s; }
        .float-anim-3 { animation: float 4.5s ease-in-out infinite; animation-delay: 2s; }
        .shimmer-text {
          background: linear-gradient(90deg, #93c5fd 0%, #ffffff 40%, #60a5fa 60%, #93c5fd 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
        .card-fade { animation: fadeSlideUp 0.5s ease forwards; }
        .beam-line { animation: beam 3s ease-in-out infinite; }
        .orbit-dot { animation: orbit 8s linear infinite; }
        .orbit-dot-2 { animation: orbit 12s linear infinite reverse; }
        .pulse-ring::after {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 9999px;
          border: 2px solid rgba(59,130,246,0.5);
          animation: pulse-ring 2s ease-out infinite;
        }
      `}</style>

      <ClientSidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <ClientHeader />

        <div className="relative p-6 md:p-10 space-y-12 overflow-hidden">

          {/* ── Ambient background orbs ── */}
          <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
            <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px] float-anim-slow" />
            <div className="absolute top-1/2 -right-40 w-[400px] h-[400px] rounded-full bg-blue-500/8 blur-[100px] float-anim-2" />
            <div className="absolute bottom-0 left-1/3 w-[350px] h-[350px] rounded-full bg-indigo-600/8 blur-[90px] float-anim-3" />
          </div>

          {/* ── Page Header ── */}
          <div className="relative max-w-3xl" style={{ animation: 'fadeSlideUp 0.6s ease forwards' }}>
            {/* Badge */}


            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-4">
              <span className="text-white">Trading </span>
              <span className="shimmer-text">Platforms</span>
            </h1>
            <p className="text-blue-200/60 text-base leading-relaxed max-w-xl">
              Access global liquidity through our institutional-grade MT5 infrastructure across all your devices.
            </p>

            {/* Decorative beam lines */}
            <div className="mt-8 flex items-center gap-3">
              <div className="h-px w-24 bg-gradient-to-r from-blue-500/80 to-transparent beam-line rounded-full" />
              <div className="h-px w-12 bg-gradient-to-r from-blue-400/50 to-transparent beam-line rounded-full" style={{ animationDelay: '0.5s' }} />
              <div className="h-px w-6 bg-gradient-to-r from-blue-300/30 to-transparent rounded-full" />
            </div>
          </div>

          {/* ── Platform Cards ── */}
          <div className="relative grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {platforms.map((p, idx) => {
              const Icon = p.icon;
              const isHovered = hoveredCard === p.id;
              return (
                <div
                  key={p.id}
                  onMouseEnter={() => setHoveredCard(p.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  className="card-fade group relative flex flex-col rounded-3xl overflow-hidden cursor-pointer transition-all duration-500"
                  style={{
                    animationDelay: `${idx * 0.1}s`,
                    transform: isHovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
                    transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                    background: isHovered
                      ? 'linear-gradient(135deg, rgba(37,99,235,0.25) 0%, rgba(29,78,216,0.15) 50%, rgba(17,24,39,0.4) 100%)'
                      : 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                    border: isHovered ? '1px solid rgba(59,130,246,0.5)' : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: isHovered
                      ? '0 20px 60px -15px rgba(59,130,246,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
                      : '0 4px 20px -4px rgba(0,0,0,0.3)',
                  }}
                >
                  {/* Top shimmer line */}
                  <div
                    className="absolute top-0 left-0 right-0 h-px transition-opacity duration-500"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.8), transparent)',
                      opacity: isHovered ? 1 : 0,
                    }}
                  />

                  {/* Glow blob */}
                  <div
                    className="absolute -top-8 -right-8 w-40 h-40 rounded-full blur-3xl transition-all duration-700 pointer-events-none"
                    style={{
                      background: 'radial-gradient(circle, rgba(59,130,246,0.3), transparent)',
                      opacity: isHovered ? 1 : 0.2,
                      transform: isHovered ? 'scale(1.4)' : 'scale(1)',
                    }}
                  />

                  {/* Recommended badge */}
                  {p.recommended && (
                    <div className="absolute top-4 right-4 z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
                      style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.35)', color: '#fbbf24' }}>
                      <Star size={9} fill="currentColor" /> Recommended
                    </div>
                  )}

                  <div className="relative z-10 flex flex-col flex-1 p-7">
                    {/* Animated icon container */}
                    <div className="relative mb-7 w-fit">
                      {/* Orbit ring */}
                      <div
                        className="absolute inset-0 rounded-2xl transition-opacity duration-500"
                        style={{
                          boxShadow: isHovered ? '0 0 0 8px rgba(59,130,246,0.08), 0 0 0 16px rgba(59,130,246,0.04)' : 'none',
                        }}
                      />
                      <div
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 ${isHovered ? 'float-anim' : ''}`}
                        style={{
                          background: isHovered
                            ? 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(37,99,235,0.2))'
                            : 'rgba(59,130,246,0.1)',
                          border: isHovered ? '1px solid rgba(59,130,246,0.5)' : '1px solid rgba(59,130,246,0.2)',
                          boxShadow: isHovered ? '0 8px 24px rgba(59,130,246,0.3), inset 0 1px 0 rgba(255,255,255,0.1)' : 'none',
                        }}
                      >
                        <Icon
                          size={28}
                          strokeWidth={1.5}
                          className="transition-colors duration-300"
                          style={{ color: isHovered ? '#93c5fd' : '#60a5fa' }}
                        />
                      </div>
                      {/* Pulse dot */}
                      {isHovered && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-400 pulse-ring relative" />
                      )}
                    </div>

                    {/* Labels */}
                    <div className="mb-3">
                      <h3 className="text-lg font-extrabold text-white leading-tight tracking-tight">{p.label}</h3>
                      <p className="text-xs font-semibold mt-0.5 transition-colors duration-300"
                        style={{ color: isHovered ? '#93c5fd' : '#64748b' }}>
                        {p.sublabel}
                      </p>
                    </div>

                    {/* Description */}
                    <p className="text-sm leading-relaxed flex-1 mb-7 transition-colors duration-300"
                      style={{ color: isHovered ? '#bfdbfe' : '#94a3b8' }}>
                      {p.description}
                    </p>

                    {/* CTA Button */}
                    <button
                      id={`btn-platform-${p.id}`}
                      className="group/btn relative w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm font-bold transition-all duration-300 overflow-hidden"
                      style={{
                        background: isHovered
                          ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                          : 'rgba(37,99,235,0.2)',
                        border: '1px solid rgba(59,130,246,0.4)',
                        color: isHovered ? '#fff' : '#93c5fd',
                        boxShadow: isHovered ? '0 8px 24px rgba(37,99,235,0.4)' : 'none',
                      }}
                    >
                      {/* Button shimmer on hover */}
                      <span
                        className="absolute inset-0 transition-opacity duration-500"
                        style={{
                          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
                          opacity: isHovered ? 1 : 0,
                        }}
                      />
                      <Download size={14} strokeWidth={2.5} className="relative z-10" />
                      <span className="relative z-10">{p.buttonLabel}</span>
                      <ArrowRight
                        size={13}
                        className="relative z-10 transition-transform duration-300"
                        style={{ transform: isHovered ? 'translateX(3px)' : 'translateX(0)' }}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>



        </div>
      </main>
    </div>
  );
}