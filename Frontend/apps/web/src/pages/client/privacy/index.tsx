import React, { useState } from 'react';
import Head from 'next/head';
import { 
  Star, 
  FileText, 
  Scale, 
  TrendingUp, 
  LineChart, 
  Layers, 
  Globe, 
  Bitcoin, 
  Gem, 
  DollarSign, 
  Flame, 
  Briefcase,
  Info,
  UserCheck,
  ShieldCheck,
  AlertTriangle,
  Mail,
  MapPin,
  ChevronRight
} from 'lucide-react';

export default function PrivacyPage() {
  const [activeTab, setActiveTab] = useState('BENEFITS');

  const benefits = [
    { title: 'FIXED LEVERAGE', description: 'Enjoy the flexibility of trading with fixed leverage, offering better control over your trades.', icon: Scale },
    { title: 'HIGH LEVERAGE', description: 'Access high leverage to maximize your trading potential and opportunities.', icon: TrendingUp },
    { title: 'COMPETITIVE SPREADS', description: 'Trade with tight and competitive spreads to minimize your trading costs.', icon: LineChart },
    { title: 'MULTIPLE SCRIPTS', description: 'Expand your portfolio with access to multiple trading scripts across markets.', icon: Layers },
    { title: 'INDICES', description: 'Trade leading indices from around the world and diversify your investments.', icon: Globe },
    { title: 'CRYPTOS', description: 'Explore cryptocurrency trading with a wide range of digital assets available.', icon: Bitcoin },
    { title: 'METALS', description: 'Invest in precious metals like gold and silver for long-term value retention.', icon: Gem },
    { title: 'CURRENCIES', description: 'Trade a variety of currency pairs with low spreads and deep liquidity.', icon: DollarSign },
    { title: 'ENERGIES', description: 'Get access to global energy markets including oil and natural gas.', icon: Flame },
    { title: 'TRADE ALL ASSETS', description: 'A unified platform to trade indices, cryptos, metals, currencies, and more seamlessly.', icon: Briefcase },
  ];

  return (
    <>
      {/* Dynamic Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-900/10 blur-[150px]"></div>
        <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] rounded-full bg-yellow-600/5 blur-[100px]"></div>
      </div>

      <Head>
        <title>Benefits & Policies | Client Portal</title>
      </Head>
      
          
          <div className="p-6 md:p-12 flex flex-col items-center flex-1 w-full max-w-7xl mx-auto">
            
            {/* Header Section */}
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-blue-300 tracking-tight">
                Platform Essentials
              </h1>
              <p className="text-blue-300/80 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
                Explore the unique benefits of trading with us and review our comprehensive policies designed to protect your investments and provide transparency.
              </p>
            </div>

            {/* Premium Tabs */}
            <div className="flex bg-[#0f172a]/80 backdrop-blur-md rounded-2xl p-1.5 border border-blue-800/30 shadow-[0_8px_30px_rgb(0,0,0,0.12)] mb-16 relative">
              <button
                onClick={() => setActiveTab('BENEFITS')}
                className={`relative flex items-center gap-3 px-10 py-3.5 rounded-xl text-sm font-bold transition-all duration-500 overflow-hidden ${
                  activeTab === 'BENEFITS'
                    ? 'text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {activeTab === 'BENEFITS' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl opacity-100 transition-opacity duration-500"></div>
                )}
                <Star size={18} className={`relative z-10 ${activeTab === 'BENEFITS' ? 'text-yellow-400' : 'text-slate-500'}`} />
                <span className="relative z-10 tracking-widest uppercase">Benefits</span>
              </button>
              
              <button
                onClick={() => setActiveTab('POLICIES')}
                className={`relative flex items-center gap-3 px-10 py-3.5 rounded-xl text-sm font-bold transition-all duration-500 overflow-hidden ${
                  activeTab === 'POLICIES'
                    ? 'text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {activeTab === 'POLICIES' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl opacity-100 transition-opacity duration-500"></div>
                )}
                <FileText size={18} className={`relative z-10 ${activeTab === 'POLICIES' ? 'text-yellow-400' : 'text-slate-500'}`} />
                <span className="relative z-10 tracking-widest uppercase">Policies</span>
              </button>
            </div>

            {/* Cards Grid - Benefits */}
            {activeTab === 'BENEFITS' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                {benefits.map((benefit, index) => {
                  const Icon = benefit.icon;
                  return (
                    <div 
                      key={index} 
                      className="group relative overflow-hidden bg-[#1e293b]/40 backdrop-blur-xl border border-blue-800/30 rounded-3xl p-8 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.2)] hover:border-blue-500/50 transition-all duration-500"
                    >
                      {/* Background Icon */}
                      <div className="absolute -bottom-6 -right-6 text-blue-500/5 group-hover:text-blue-500/10 group-hover:rotate-12 group-hover:scale-125 transition-all duration-700 pointer-events-none">
                        <Icon size={140} strokeWidth={1} />
                      </div>
                      
                      <div className="relative z-10">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-900/80 to-indigo-900/80 border border-blue-700/50 flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform duration-500">
                          <Icon size={26} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-white font-extrabold text-xl mb-3 tracking-tight">{benefit.title}</h3>
                        <p className="text-slate-400 text-sm leading-relaxed group-hover:text-slate-300 transition-colors duration-300">{benefit.description}</p>
                      </div>
                      
                      {/* Hover gradient line */}
                      <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Policies View */}
            {activeTab === 'POLICIES' && (
              <div className="w-full max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                {[
                  { icon: Info, title: "Introduction", content: "Welcome to vtindex. By accessing or using our services, you agree to comply with and be bound by the following terms and conditions. Our mission is to provide a transparent and secure environment for all participants in the global financial markets.", color: "from-blue-500 to-cyan-500" },
                  { icon: UserCheck, title: "User Responsibilities", content: "• Ensure the absolute accuracy of your personal information.\n• Use our services ethically, responsibly and without malice.\n• Strictly abide by local, national, and international financial laws.", color: "from-emerald-500 to-teal-500" },
                  { icon: ShieldCheck, title: "AML Policy", content: "vtindex follows strict Anti-Money Laundering (AML) regulations. All customers must verify their identity and comply with legal requirements to prevent financial crimes. We maintain a zero-tolerance policy towards illicit activities.", color: "from-violet-500 to-purple-500" },
                  { icon: AlertTriangle, title: "Risk Warning", content: "Trading leveraged products, including Forex and CFDs, carries a significant level of risk to your capital and may not be appropriate for all investors. You should only trade with money you can afford to lose.", color: "from-amber-500 to-orange-500" }
                ].map((policy, idx) => {
                  const PolicyIcon = policy.icon;
                  return (
                    <div key={idx} className="group flex flex-col md:flex-row gap-6 bg-[#1e293b]/40 backdrop-blur-md border border-blue-800/30 rounded-3xl p-8 hover:bg-[#1e293b]/60 hover:border-blue-500/40 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-900/20">
                      <div className="flex-shrink-0">
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${policy.color} p-[1px] shadow-lg group-hover:scale-105 transition-transform duration-500`}>
                          <div className="w-full h-full bg-[#0f172a] rounded-2xl flex items-center justify-center">
                            <PolicyIcon size={28} className="text-white" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white mb-3 tracking-tight flex items-center gap-2">
                          {policy.title}
                        </h2>
                        <div className="text-slate-400 leading-relaxed text-sm md:text-base">
                          {policy.content.split('\n').map((line, i) => (
                            <p key={i} className={line.startsWith('•') ? 'ml-2 mb-1' : 'mb-2'}>{line}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Contact Infrastructure */}
                <div className="mt-12 pt-8">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-blue-800/50"></div>
                    <h2 className="text-xl font-bold text-slate-300 uppercase tracking-widest px-4">Contact Infrastructure</h2>
                    <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-blue-800/50"></div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <a href="mailto:support@vtindex.com" className="group flex items-center gap-5 p-6 bg-gradient-to-br from-[#1e293b]/50 to-[#0f172a]/50 backdrop-blur-sm rounded-2xl border border-blue-800/30 hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10">
                      <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                        <Mail size={22} className="text-blue-400 group-hover:text-blue-300" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold mb-1 text-lg">Email Support</h3>
                        <p className="text-blue-400 text-sm group-hover:text-blue-300 transition-colors">support@vtindex.com</p>
                      </div>
                      <ChevronRight size={20} className="text-slate-600 ml-auto group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                    </a>
                    
                    <div className="group flex items-center gap-5 p-6 bg-gradient-to-br from-[#1e293b]/50 to-[#0f172a]/50 backdrop-blur-sm rounded-2xl border border-blue-800/30 hover:border-yellow-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-yellow-500/10 cursor-default">
                      <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center group-hover:bg-yellow-500/20 transition-colors shrink-0">
                        <MapPin size={22} className="text-yellow-400 group-hover:text-yellow-300" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold mb-1 text-lg">HQ Address</h3>
                        <p className="text-slate-400 text-sm leading-tight group-hover:text-slate-300 transition-colors">#1805, 18th Floor, Al Fahid heights,<br/>Dubai, UAE</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

          </div>
    </>
  );
}