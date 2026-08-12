import React, { useState, memo } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  LineChart,
  TrendingUp,
  Scale,
  Layers,
  Globe2,
  Bitcoin,
  Diamond,
  DollarSign,
  Flame,
  Briefcase,
  FileText,
  Star,
  Mail,
  MapPin,
  ShieldCheck,
  Info,
  CheckCircle2
} from "lucide-react";
import { useTheme as useNextTheme } from "next-themes";

const useTheme = () => {
  const { theme } = useNextTheme();
  return { isDarkMode: theme === "dark" || theme === "system" };
};

/* ── Premium Glass Card ──────── */
const GlassCard = ({ children, className = "", delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) => {
  const { isDarkMode } = useTheme();
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`relative overflow-hidden rounded-3xl border transition-all duration-300 ${
        isDarkMode 
          ? 'bg-slate-900/80 border-slate-700/50 shadow-2xl shadow-black/40 hover:border-gold-custom/50' 
          : 'border-[#1d53ca] bg-[linear-gradient(180deg,#071a57_0%,#08286f_100%)] shadow-[0_24px_60px_rgba(4,15,54,0.34)] hover:border-[#2c63ea]'
      } p-8 md:p-10 ${className}`}
    >
      {!isDarkMode && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(58,114,255,0.16),transparent_34%),linear-gradient(180deg,transparent_0%,rgba(2,12,46,0.12)_100%)]" />
      )}
      {children}
    </motion.div>
  );
};

const TermsPage = () => {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState("benefits");

  const benefits = [
    { title: "Fixed Leverage", content: "Enjoy the flexibility of trading with fixed leverage, offering better control over your trades.", icon: Scale, color: "text-gold-custom" },
    { title: "High Leverage", content: "Access high leverage to maximize your trading potential and opportunities.", icon: TrendingUp, color: "text-gold-custom" },
    { title: "Competitive Spreads", content: "Trade with tight and competitive spreads to minimize your trading costs.", icon: LineChart, color: "text-gold-custom" },
    { title: "Multiple Scripts", content: "Expand your portfolio with access to multiple trading scripts across markets.", icon: Layers, color: "text-gold-custom" },
    { title: "Indices", content: "Trade leading indices from around the world and diversify your investments.", icon: Globe2, color: "text-gold-custom" },
    { title: "Cryptos", content: "Explore cryptocurrency trading with a wide range of digital assets available.", icon: Bitcoin, color: "text-gold-custom" },
    { title: "Metals", content: "Invest in precious metals like gold and silver for long-term value retention.", icon: Diamond, color: "text-gold-custom" },
    { title: "Currencies", content: "Trade a variety of currency pairs with low spreads and deep liquidity.", icon: DollarSign, color: "text-gold-custom" },
    { title: "Energies", content: "Get access to global energy markets including oil and natural gas.", icon: Flame, color: "text-gold-custom" },
    { title: "Trade All Assets", content: "A unified platform to trade indices, cryptos, metals, currencies, and more seamlessly.", icon: Briefcase, color: "text-gold-custom" },
  ];

  const policies = [
    { 
      title: "Introduction", 
      icon: Info,
      content: "Welcome to vtindex. By accessing or using our services, you agree to comply with and be bound by the following terms and conditions. Our mission is to provide a transparent and secure environment for all participants in the global financial markets." 
    },
    { 
      title: "User Responsibilities", 
      icon: ShieldCheck,
      content: (
        <ul className="space-y-4">
          {[
            "Ensure the absolute accuracy of your personal information.",
            "Use our services ethically, responsibly and without malice.",
            "Strictly abide by local, national, and international financial laws."
          ].map((text, i) => (
            <li key={i} className="flex items-center gap-3">
              <CheckCircle2 size={16} className="text-gold-custom shrink-0" />
              <span className={`text-sm font-bold ${isDarkMode ? 'text-slate-200' : 'text-[#dbe8ff]'}`}>{text}</span>
            </li>
          ))}
        </ul>
      )
    },
    { 
      title: "AML Policy", 
      icon: ShieldCheck,
      content: "vtindex follows strict Anti-Money Laundering (AML) regulations. All customers must verify their identity and comply with legal requirements to prevent financial crimes. We maintain a zero-tolerance policy towards illicit activities."
    },
    { 
      title: "Risk Warning", 
      icon: Info,
      content: "Trading leveraged products, including Forex and CFDs, carries a significant level of risk to your capital and may not be appropriate for all investors. You should only trade with money you can afford to lose." 
    },
    { 
      title: "Contact Infrastructure", 
      icon: Mail,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'border-[#214fbf] bg-[#081d5f]'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                  isDarkMode ? 'bg-gold-custom/10 text-gold-custom' : 'border border-[#2450b7] bg-[#0b226a] text-[#f0b91f]'
                }`}>
                    <Mail size={20} />
                </div>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'opacity-50' : 'text-[#8fb8ff]'}`}>Email Support</p>
                <a href="mailto:support@vtindex.com" className="text-lg font-black text-gold-custom hover:underline">support@vtindex.com</a>
            </div>
            <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'border-[#214fbf] bg-[#081d5f]'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                  isDarkMode ? 'bg-blue-custom/10 text-blue-custom' : 'border border-[#2450b7] bg-[#0b226a] text-[#8fb8ff]'
                }`}>
                    <MapPin size={20} />
                </div>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'opacity-50' : 'text-[#8fb8ff]'}`}>HQ Address</p>
                <p className={`text-sm font-bold leading-tight ${isDarkMode ? 'text-white' : 'text-[#dbe8ff]'}`}>#1805, 18th Floor, Al Fahid heights, Dubai, UAE</p>
            </div>
        </div>
      ) 
    },
  ];

  return (
    <div className={`min-h-screen transition-all duration-700 p-6 md:p-12 lg:p-20 relative overflow-hidden ${
      isDarkMode
        ? 'bg-[#0f172a]'
        : 'bg-[radial-gradient(circle_at_bottom,rgba(22,55,157,0.18),transparent_25%),linear-gradient(180deg,#050f35_0%,#081846_100%)]'
    }`}>
      
      {/* Clean Decorative Accents */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold-custom/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#245cff]/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        

        {/* Navigation Tabs (partnership-style pill UI) */}
        <div className="flex justify-center mb-12">
          <div className={`inline-flex flex-wrap justify-center gap-3 p-3 rounded-[2.5rem] border shadow-2xl backdrop-blur-2xl ${
            isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'border-[#1747b8] bg-[linear-gradient(180deg,#071a57_0%,#082468_100%)] shadow-[0_10px_32px_rgba(4,15,54,0.22)]'
          }`}>
            <LayoutGroup>
              {[
                { id: "benefits", label: "BENEFITS", icon: Star },
                { id: "policies", label: "POLICIES", icon: FileText }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-4 px-8 py-4 rounded-[1.8rem] text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-500 ${
                    activeTab === tab.id ? "text-white" : isDarkMode ? "text-text-muted-custom hover:text-gold-custom" : "text-[#d8e4ff] hover:text-white"
                  }`}
                >
                  {activeTab === tab.id && (
                    <motion.div 
                      layoutId="active-pill" 
                      className="absolute inset-0 rounded-[1.6rem] border border-[#d3a11a] bg-[linear-gradient(135deg,#e0b01d_0%,#c99508_100%)] shadow-[0_12px_28px_rgba(201,149,8,0.28)]" 
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <tab.icon size={18} className="relative z-10" />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              ))}
            </LayoutGroup>
          </div>
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === "benefits" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {benefits.map((item, i) => (
                  <GlassCard key={i} delay={i * 0.05} className="group">
                    <div className="relative z-10 flex items-center gap-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                          isDarkMode
                            ? 'bg-slate-800'
                            : 'border border-[#2450b7] bg-[#0b226a] shadow-[inset_0_0_0_1px_rgba(72,119,255,0.08)]'
                        } ${item.color} group-hover:scale-110 transition-transform duration-500`}>
                        <item.icon size={28} />
                        </div>
                        <div className="flex-1">
                            <h3 className={`text-lg font-black uppercase tracking-tight mb-1 ${isDarkMode ? 'text-white' : 'text-white'}`}>
                                {item.title}
                            </h3>
                            <p className={`text-xs font-bold leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-[#9ec0ff]'}`}>
                                {item.content}
                            </p>
                        </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                  {policies.map((policy, i) => (
                    <GlassCard key={i} delay={i * 0.1}>
                      <div className="relative z-10 flex flex-col md:flex-row md:items-start gap-8">
                        <div className="md:w-1/4">
                            <div className="flex items-center gap-3 mb-4 md:mb-0">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                  isDarkMode
                                    ? 'bg-gold-custom/10 text-gold-custom'
                                    : 'border border-[#2450b7] bg-[#0b226a] text-[#f0b91f]'
                                }`}>
                                    <policy.icon size={16} />
                                </div>
                                <h3 className={`text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-white'}`}>
                                    {policy.title}
                                </h3>
                            </div>
                        </div>
                        <div className="md:w-3/4">
                            <div className={`text-sm font-bold leading-relaxed tracking-wide ${isDarkMode ? 'text-slate-300' : 'text-[#dbe8ff]'}`}>
                                {policy.content}
                            </div>
                        </div>
                      </div>
                    </GlassCard>
                  ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
};

export default memo(TermsPage);
