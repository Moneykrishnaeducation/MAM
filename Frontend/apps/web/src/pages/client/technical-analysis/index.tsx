import React, { useEffect, useRef, useState, memo, useCallback } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
  TrendingUp,
  Activity,
  Clock,
  Calendar,
  Globe,
  Layers,
  Newspaper,
  RefreshCw,
  Search,
  ArrowRight,
  Info,
  ChevronLeft,
  ChevronRight,
  FileText,
  Eye,
  Download,
} from 'lucide-react';
import TradingViewWidget from '@/components/Client/TradingViewWidget';

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
function fmtSize(bytes: number) {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

function formatDateLabel(name: string) {
  const match = name.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (!match) return 'Latest Release';
  const [, d, m, y] = match;
  const date = new Date(`${y}-${m}-${d}`);
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ─────────────────────────────────────────────────────────────
   Timezone conversion (MT5 server = UTC+3)
───────────────────────────────────────────────────────────── */
const TIMEZONES = [
  { value: 180, label: 'Server Time (UTC+3)' },
  { value: 0, label: 'UTC / GMT (UTC+0)' },
  { value: 330, label: 'IST - India Standard Time (UTC+5:30)' },
  { value: -300, label: 'EST - Eastern Standard Time (UTC-5)' },
  { value: -240, label: 'EDT - Eastern Daylight Time (UTC-4)' },
  { value: 60, label: 'London / West Europe (UTC+1)' },
  { value: 120, label: 'EET - East Europe (UTC+2)' },
  { value: 240, label: 'Gulf Standard Time (UTC+4)' },
  { value: 480, label: 'Singapore / HK (UTC+8)' },
  { value: 540, label: 'Japan Standard Time (UTC+9)' },
  { value: 600, label: 'AEST - Australian East (UTC+10)' },
];

function getBrowserTimezoneOptions() {
  const browserOffset = -new Date().getTimezoneOffset();
  const hasBrowserTz = TIMEZONES.some((tz) => tz.value === browserOffset);
  if (hasBrowserTz) return TIMEZONES;
  const sign = browserOffset >= 0 ? '+' : '-';
  const absOffset = Math.abs(browserOffset);
  const hours = Math.floor(absOffset / 60);
  const mins = absOffset % 60;
  return [
    { value: browserOffset, label: `Local Time (UTC${sign}${hours}:${mins.toString().padStart(2, '0')})` },
    ...TIMEZONES,
  ];
}

interface RawSession { day: string; open: string; close: string; }
interface ConvertedSession { day: string; open: string; close: string; }

function convertSessions(
  sessions: RawSession[],
  targetOffsetMinutes: number,
  serverOffsetMinutes = 180,
): ConvertedSession[] {
  if (!sessions || sessions.length === 0) return [];
  const DAYS_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const diff = targetOffsetMinutes - serverOffsetMinutes;

  const intervals: { start: number; end: number }[] = [];

  sessions.forEach((sess) => {
    const dayIdx = DAYS_NAMES.indexOf(sess.day);
    if (dayIdx === -1) return;
    const [openH, openM] = sess.open.split(':').map(Number);
    const [closeH, closeM] = sess.close.split(':').map(Number);
    const start = dayIdx * 1440 + openH * 60 + openM;
    const end = dayIdx * 1440 + closeH * 60 + closeM;
    intervals.push({ start: start + diff, end: end + diff });
  });

  const result: { open: string; close: string }[][] = DAYS_NAMES.map(() => []);

  const pushChunk = (dayIdx: number, openMin: number, closeMin: number) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    result[dayIdx].push({
      open: `${pad(Math.floor(openMin / 60))}:${pad(openMin % 60)}`,
      close: `${pad(Math.floor(closeMin / 60))}:${pad(closeMin % 60)}`,
    });
  };

  intervals.forEach(({ start, end }) => {
    let s = ((start % 10080) + 10080) % 10080;
    let e = ((end % 10080) + 10080) % 10080;
    if (s < e) {
      let cur = s;
      while (cur < e) {
        const dIdx = Math.floor(cur / 1440) % 7;
        const dayStart = dIdx * 1440;
        const chunkEnd = Math.min(e, dayStart + 1440);
        pushChunk(dIdx, cur - dayStart, chunkEnd - dayStart);
        cur = chunkEnd;
      }
    } else {
      let cur = s;
      while (cur < 10080) {
        const dIdx = Math.floor(cur / 1440) % 7;
        const dayStart = dIdx * 1440;
        const chunkEnd = Math.min(10080, dayStart + 1440);
        pushChunk(dIdx, cur - dayStart, chunkEnd - dayStart);
        cur = chunkEnd;
      }
      cur = 0;
      while (cur < e) {
        const dIdx = Math.floor(cur / 1440) % 7;
        const dayStart = dIdx * 1440;
        const chunkEnd = Math.min(e, dayStart + 1440);
        pushChunk(dIdx, cur - dayStart, chunkEnd - dayStart);
        cur = chunkEnd;
      }
    }
  });

  const list: ConvertedSession[] = [];
  result.forEach((daySessions, dayIdx) => {
    daySessions.forEach((sess) => {
      list.push({ day: DAYS_NAMES[dayIdx], open: sess.open, close: sess.close });
    });
  });
  return list;
}

/* ─────────────────────────────────────────────────────────────
   Glass Card
───────────────────────────────────────────────────────────── */
function GlassCard({
  children,
  className = '',
  noPadding = false,
}: {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-[2.5rem] border backdrop-blur-md shadow-2xl bg-[linear-gradient(180deg,#0a2265_0%,#091948_100%)] border-[#1d58c8] shadow-[0_28px_80px_rgba(4,15,54,0.36)] ${noPadding ? '' : 'p-8'} ${className}`}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ReportPDF — archive of PDF reports fetched from API
───────────────────────────────────────────────────────────── */
interface ReportItem { name: string; size: number; url: string; }

function ReportPDF() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [selected, setSelected] = useState<ReportItem | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/', { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      let fetchedReports: ReportItem[] = data.reports || [];
      fetchedReports.sort((a, b) => {
        const parseDate = (name: string) => {
          const match = name.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
          if (!match) return 0;
          const [, d, m, y] = match;
          return new Date(`${y}-${m}-${d}`).getTime();
        };
        const dA = parseDate(a.name);
        const dB = parseDate(b.name);
        if (dA !== dB) return dB - dA;
        return b.name.localeCompare(a.name);
      });
      setReports(fetchedReports);
      if (fetchedReports.length > 0) setSelected(fetchedReports[0]);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Failed to load reports:', err.message);
        setReports([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchReports(controller.signal);
    return () => controller.abort();
  }, [fetchReports]);

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-32"
          >
            <div className="relative">
              <RefreshCw className="animate-spin text-yellow-400" size={64} />
              <div className="absolute inset-0 blur-2xl bg-yellow-400/20 animate-pulse" />
            </div>
            <p className="font-black uppercase tracking-[0.3em] text-[10px] text-slate-400 mt-8">
              Decrypting Archives
            </p>
          </motion.div>
        ) : reports.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-32 rounded-[3rem] border-2 border-dashed border-blue-800/50 bg-blue-950/20"
          >
            <Layers size={80} className="mx-auto mb-8 opacity-10 text-blue-400" />
            <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Archive Nullified</h3>
            <p className="text-[11px] font-bold text-slate-400 mt-4 uppercase tracking-[0.2em]">
              Intelligence network is synthesizing new data
            </p>
          </motion.div>
        ) : !selected ? (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {reports.map((r, idx) => (
              <motion.button
                key={r.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08, type: 'spring', stiffness: 100 }}
                onClick={() => setSelected(r)}
                className="group relative flex flex-col items-start p-8 rounded-[2rem] border transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl bg-[linear-gradient(180deg,#0a2265_0%,#091d58_100%)] border-[#1d58c8] hover:border-yellow-400 shadow-[0_24px_60px_rgba(4,15,54,0.28)] text-left"
              >
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 bg-[linear-gradient(180deg,#1544c5_0%,#102e92_100%)] border border-[#1f5fe0] text-blue-200 shadow-[0_0_18px_rgba(28,99,255,0.2)]">
                  <FileText size={32} />
                </div>
                <h4 className="text-lg font-black uppercase tracking-tight mb-2 line-clamp-2 text-white">
                  {r.name.replace('.pdf', '')}
                </h4>
                <div className="flex flex-wrap items-center gap-4 mt-auto w-full pt-4 border-t border-dashed border-slate-600/20">
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                    <Calendar size={12} className="text-yellow-400" /> {formatDateLabel(r.name)}
                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                    <Layers size={12} className="text-yellow-400" /> {fmtSize(r.size)}
                  </div>
                </div>
                <div className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0 text-yellow-400">
                  <ArrowRight size={24} />
                </div>
              </motion.button>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="viewer"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-8"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <button
                onClick={() => setSelected(null)}
                className="group flex items-center gap-3 font-black text-[10px] uppercase tracking-[0.2em] text-yellow-400 hover:text-yellow-300 transition-all"
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center group-hover:-translate-x-1 transition-transform bg-yellow-400/10">
                  <ChevronLeft size={18} />
                </div>
                Archives
              </button>
              <div className="flex items-center gap-4">
                <div className="px-6 py-2 rounded-full border text-[9px] font-black uppercase tracking-[0.2em] border-yellow-400/20 bg-yellow-400/5 text-yellow-400">
                  Live Analysis
                </div>
                <h4 className="text-xl font-black uppercase tracking-tighter text-white">{selected.name}</h4>
              </div>
            </div>
            <GlassCard noPadding className="p-1 border-4">
              <div className="relative rounded-[2.2rem] overflow-hidden bg-slate-900">
                <iframe
                  src={selected.url}
                  title={selected.name}
                  className="w-full"
                  style={{ height: '75vh' }}
                />
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Symbol type badge colours
───────────────────────────────────────────────────────────── */
const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  stock: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Stock' },
  forex: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Forex' },
  crypto: { bg: 'bg-orange-500/10', text: 'text-orange-400', label: 'Crypto' },
  futures: { bg: 'bg-purple-500/10', text: 'text-purple-400', label: 'Futures' },
  index: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'Index' },
  cfd: { bg: 'bg-pink-500/10', text: 'text-pink-400', label: 'CFD' },
  fund: { bg: 'bg-teal-500/10', text: 'text-teal-400', label: 'Fund' },
  bond: { bg: 'bg-slate-500/10', text: 'text-slate-400', label: 'Bond' },
};
const typeStyle = (t = '') =>
  TYPE_COLORS[t.toLowerCase()] ?? { bg: 'bg-slate-500/10', text: 'text-slate-400', label: t || '—' };

const QUICK_SYMBOLS = [
  { label: 'GOLD', value: 'OANDA:XAUUSD' },
  { label: 'EURUSD', value: 'FX:EURUSD' },
  { label: 'GBPUSD', value: 'FX:GBPUSD' },
  { label: 'BTC', value: 'BINANCE:BTCUSDT' },
  { label: 'NAS100', value: 'FOREXCOM:NSXUSD' },
  { label: 'OIL', value: 'CAPITALCOM:OIL' },
];

/* ─────────────────────────────────────────────────────────────
   MarketOverview — TradingView Technical Analysis widget
───────────────────────────────────────────────────────────── */
function MarketOverview() {
  const [symbol, setSymbol] = useState('OANDA:XAUUSD');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const container = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!container.current) return;
    container.current.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: 'dark',
      displayMode: 'multiple',
      isTransparent: true,
      locale: 'en',
      interval: '15m',
      disableInterval: false,
      width: '100%',
      height: 450,
      symbol,
      showIntervalTabs: true,
    });
    container.current.appendChild(script);
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
      if (container.current) container.current.innerHTML = '';
    };
  }, [symbol]);

  const applySymbol = (val: string) => {
    const s = val.trim().toUpperCase();
    if (!s) return;
    setSymbol(s);
    setQuery('');
    setSuggestions([]);
    setFocused(false);
    setActiveIdx(-1);
  };

  const onQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setActiveIdx(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) { setSuggestions([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://symbol-search.tradingview.com/symbol_search/?text=${encodeURIComponent(val)}&type=&exchange=&lang=en&search_type=undefined&domain=production`,
        );
        const data = await res.json();
        setSuggestions((data || []).slice(0, 8));
      } catch { setSuggestions([]); }
      finally { setSearching(false); }
    }, 280);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) {
      if (e.key === 'Enter') applySymbol(query);
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0) applySymbol(`${suggestions[activeIdx].exchange}:${suggestions[activeIdx].symbol}`);
      else applySymbol(query);
    } else if (e.key === 'Escape') { setSuggestions([]); setFocused(false); inputRef.current?.blur(); }
  };

  const showDrop = focused && (suggestions.length > 0 || searching);

  return (
    <div className="flex flex-col gap-8 w-full">
      <GlassCard>
        <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
          <Activity size={180} className="text-yellow-400" />
        </div>

        {/* Search */}
        <div className="flex flex-col md:flex-row gap-6 relative z-10 mb-8">
          <div className="flex-1 flex items-center gap-4 rounded-[1.4rem] px-6 py-5 relative border transition-all duration-500 bg-[linear-gradient(180deg,#0a2265_0%,#091d58_100%)] border-[#1b56ca] focus-within:border-[#2f8cff] shadow-[0_24px_60px_rgba(4,15,54,0.2)]">
            <Search className="w-6 h-6 text-blue-300" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={onQueryChange}
              onKeyDown={onKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 180)}
              placeholder="Search Market Symbol..."
              className="flex-1 bg-transparent outline-none text-base font-black uppercase tracking-tight text-white placeholder:text-slate-500"
            />
            {searching && <RefreshCw className="w-5 h-5 text-yellow-400 animate-spin" />}

            <AnimatePresence>
              {showDrop && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  className="absolute left-0 top-[calc(100%+12px)] w-full z-[60] rounded-[2rem] overflow-hidden shadow-2xl border backdrop-blur-xl bg-[#0a2265] border-[#1b56ca]"
                >
                  {suggestions.map((s, i) => {
                    const ts = typeStyle(s.type);
                    return (
                      <button
                        key={i}
                        onMouseDown={() => applySymbol(`${s.exchange}:${s.symbol}`)}
                        className={`w-full flex items-center gap-5 px-8 py-5 text-left transition-all ${i === activeIdx ? 'bg-[#112b74]' : 'hover:bg-[#112b74]/50'}`}
                      >
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl ${ts.bg} ${ts.text}`}>
                          {ts.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-black text-base uppercase tracking-tight text-white">{s.symbol}</div>
                          <div className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-[0.15em] opacity-60">{s.description}</div>
                        </div>
                        <span className="text-[10px] font-black text-yellow-400 font-mono opacity-40">{s.exchange}</span>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="md:w-64 w-full flex flex-col justify-center gap-1 rounded-[1.4rem] px-8 py-4 border bg-[linear-gradient(180deg,#0a2265_0%,#091d58_100%)] border-yellow-400/30 shadow-[0_0_24px_rgba(250,204,21,0.12)]">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Active Symbol</span>
            <span className="font-black text-lg text-yellow-400 tracking-tighter font-mono uppercase truncate">{symbol}</span>
          </div>
        </div>

        {/* Quick Symbols */}
        <div className="flex flex-wrap gap-3 relative z-10">
          {QUICK_SYMBOLS.map((qs) => (
            <button
              key={qs.value}
              onClick={() => applySymbol(qs.value)}
              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 transform active:scale-95 ${
                symbol === qs.value
                  ? 'border border-yellow-400 bg-[linear-gradient(135deg,#d8a109_0%,#c78f05_100%)] text-white shadow-[0_0_28px_rgba(244,188,28,0.34)] scale-105'
                  : 'bg-[#0b246d] border border-[#1b56ca] text-blue-300 hover:border-yellow-400 hover:text-yellow-400'
              }`}
            >
              {qs.label}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Widget */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="relative w-full rounded-[3rem] overflow-hidden border border-blue-800/30 shadow-2xl"
        style={{ minHeight: '55vh' }}
      >
        <div className="tradingview-widget-container h-full" ref={container}>
          <div className="tradingview-widget-container__widget h-full" />
        </div>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   EconomicCalendar — TradingView events widget
───────────────────────────────────────────────────────────── */
function EconomicCalendar() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML =
      '<div class="tradingview-widget-container__widget" style="width:100%;height:800px"></div>';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: 'dark',
      isTransparent: true,
      locale: 'en',
      countryFilter: '',
      importanceFilter: '-1,0,1',
      width: '100%',
      height: 800,
    });
    ref.current.appendChild(script);
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
      if (ref.current) ref.current.innerHTML = '';
    };
  }, []);

  return (
    <GlassCard>
      <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
        <Calendar size={180} className="text-yellow-400" />
      </div>
      <div className="flex items-center gap-3 mb-8 relative z-10">
        <div className="p-3 rounded-2xl bg-yellow-400/10 text-yellow-400">
          <Calendar size={24} />
        </div>
        <div>
          <h3 className="text-xl font-black uppercase tracking-tighter text-white">Economic Calendar</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Market Events</p>
        </div>
      </div>
      <div className="tradingview-widget-container relative z-10" ref={ref} style={{ width: '100%', height: 800 }}>
        <div className="tradingview-widget-container__widget" style={{ width: '100%', height: 800 }} />
      </div>
    </GlassCard>
  );
}

/* ─────────────────────────────────────────────────────────────
   EconomicMap — tv-economic-map web component
───────────────────────────────────────────────────────────── */
const EconomicMap = memo(({ isActive }: { isActive: boolean }) => {
  const ref = useRef<HTMLDivElement>(null);
  const mapElRef = useRef<HTMLElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isActive || loaded) return;
    const loadMap = async () => {
      setLoading(true);
      try {
        const SCRIPT_ID = 'tv-economic-map-script';
        if (!document.getElementById(SCRIPT_ID)) {
          const script = document.createElement('script');
          script.id = SCRIPT_ID;
          script.type = 'module';
          script.src = 'https://widgets.tradingview-widget.com/w/en/tv-economic-map.js';
          document.head.appendChild(script);
        }
        await (customElements as any).whenDefined('tv-economic-map');
        if (!ref.current || mapElRef.current) { setLoading(false); return; }
        const mapEl = document.createElement('tv-economic-map') as HTMLElement;
        mapEl.setAttribute('metrics', 'gdp,ur,gdg,intr,iryy');
        mapEl.setAttribute('colorTheme', 'dark');
        mapEl.setAttribute('transparent', 'true');
        mapEl.style.display = 'block';
        mapEl.style.width = '100%';
        mapEl.style.minHeight = '600px';
        mapEl.style.borderRadius = '12px';
        ref.current.appendChild(mapEl);
        mapElRef.current = mapEl;
        setLoaded(true);
      } catch (err) {
        console.error('Economic map load error:', err);
      } finally {
        setLoading(false);
      }
    };
    loadMap();
    return () => {
      if (mapElRef.current && !isActive) {
        mapElRef.current.remove();
        mapElRef.current = null;
      }
    };
  }, [isActive, loaded]);

  return (
    <GlassCard>
      <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
        <Globe size={180} className="text-yellow-400" />
      </div>
      <div className="flex items-center gap-3 mb-8 relative z-10">
        <div className="p-3 rounded-2xl bg-yellow-400/10 text-yellow-400">
          <Globe size={24} />
        </div>
        <div>
          <h3 className="text-xl font-black uppercase tracking-tighter text-white">Economic Map</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Macro Indices</p>
        </div>
      </div>
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 relative z-10">
          <RefreshCw className="animate-spin text-yellow-400 mb-4" size={48} />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Loading map…</span>
        </div>
      )}
      <div className="relative z-10 min-h-[600px]" ref={ref} />
    </GlassCard>
  );
});
EconomicMap.displayName = 'EconomicMap';

/* ─────────────────────────────────────────────────────────────
   AllSymbolsTiming — paginated MT5 session table
───────────────────────────────────────────────────────────── */
interface SymbolTimingItem { symbol: string; category: string; sessions: RawSession[]; }

function AllSymbolsTiming() {
  const [data, setData] = useState<SymbolTimingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedTz, setSelectedTz] = useState(180);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/symbol-timing/');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();
        if (active) setData(result || []);
      } catch (err: any) {
        if (active) setError(err.message || 'Failed to load symbols timing.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const CATEGORIES = [
    { key: 'all', label: 'All Assets' },
    { key: 'forex', label: 'Forex' },
    { key: 'crypto', label: 'Crypto' },
    { key: 'indices', label: 'Indices' },
    { key: 'commodities', label: 'Commodities' },
    { key: 'cfd', label: 'CFD / Shares' },
    { key: 'other', label: 'Other' },
  ];

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const timezoneOptions = getBrowserTimezoneOptions();

  const filteredData = data.filter((item) => {
    const matchesSearch = item.symbol.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex flex-col gap-8 w-full">
      <GlassCard>
        <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
          <Clock size={180} className="text-yellow-400" />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10 mb-8">
          <div>
            <h3 className="text-2xl font-black uppercase tracking-tighter text-white">All Symbols Timing</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">MT5 Session Schedules</p>
          </div>
        </div>

        {/* Category + Timezone */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 relative z-10">
          <div className="flex flex-wrap gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => { setActiveCategory(cat.key); setCurrentPage(1); }}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 transform active:scale-95 ${
                  activeCategory === cat.key
                    ? 'border border-yellow-400 bg-[linear-gradient(135deg,#d8a109_0%,#c78f05_100%)] text-white shadow-[0_0_20px_rgba(244,188,28,0.25)] scale-105'
                    : 'bg-[#0b246d]/65 border border-[#1b56ca]/40 text-blue-300 hover:border-yellow-400 hover:text-yellow-400'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 bg-[#0b246d]/40 px-4 py-2.5 rounded-xl border border-[#1b56ca]/20 shrink-0">
            <select
              value={selectedTz}
              onChange={(e) => setSelectedTz(Number(e.target.value))}
              className="bg-transparent text-xs font-black uppercase tracking-widest text-yellow-400 outline-none border-none cursor-pointer"
            >
              {timezoneOptions.map((tz) => (
                <option key={tz.value} value={tz.value} className="bg-[#0a2265] text-white">
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative z-10 flex items-center gap-4 rounded-[1.4rem] px-6 py-4 border transition-all duration-500 bg-[linear-gradient(180deg,#0a2265_0%,#091d58_100%)] border-[#1b56ca] focus-within:border-[#2f8cff] shadow-[0_24px_60px_rgba(4,15,54,0.2)]">
          <Search className="w-5 h-5 text-yellow-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder={`Search ${activeCategory === 'all' ? 'Symbols' : activeCategory} (e.g. JP225, EURUSD, XAUUSD)…`}
            className="flex-1 bg-transparent outline-none text-sm font-black uppercase tracking-tight placeholder:text-slate-500 text-white"
          />
        </div>
      </GlassCard>

      {/* Table */}
      <GlassCard noPadding className="p-1 border-2 relative overflow-visible">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <RefreshCw className="animate-spin text-yellow-400 mb-4" size={48} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Loading global timings…</span>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <Info size={60} className="mx-auto mb-6 text-red-400/60" />
            <h3 className="text-xl font-black uppercase tracking-tighter text-white">System Error</h3>
            <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-[0.2em]">{error}</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-20">
            <Info size={60} className="mx-auto mb-6 text-yellow-400/60" />
            <h3 className="text-xl font-black uppercase tracking-tighter text-white">No matches found</h3>
            <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-[0.2em]">Check spelling or try a different filter</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto rounded-[2.2rem]">
            <table className="w-full border-collapse text-left text-sm text-slate-400">
              <thead>
                <tr className="bg-[#0c246b] border-b border-[#1b56ca]/30 text-white text-xs font-black uppercase tracking-widest">
                  <th className="px-6 py-5">Symbol</th>
                  {DAYS.map((day) => (
                    <th key={day} className="px-6 py-5 hidden md:table-cell">{day.substring(0, 3)}</th>
                  ))}
                  <th className="px-6 py-5 md:hidden">Schedules</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b56ca]/10 bg-[#091a4c]/50">
                {paginatedData.map((item, index) => {
                  const convertedItemSessions = convertSessions(item.sessions, selectedTz);
                  return (
                    <tr key={index} className="hover:bg-[#112a75]/40 transition-colors">
                      <td className="px-6 py-4 font-black text-white text-lg font-mono">{item.symbol}</td>
                      {DAYS.map((day) => {
                        const daySessions = convertedItemSessions.filter((s) => s.day === day);
                        return (
                          <td key={day} className="px-6 py-4 hidden md:table-cell">
                            {daySessions.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {daySessions.map((s, idx) => (
                                  <span key={idx} className="text-xs font-black font-mono text-yellow-400 bg-yellow-400/5 border border-yellow-400/10 px-2.5 py-1 rounded-md inline-block whitespace-nowrap">
                                    {s.open} – {s.close}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs font-black uppercase opacity-20">—</span>
                            )}
                          </td>
                        );
                      })}
                      {/* Mobile */}
                      <td className="px-6 py-4 md:hidden">
                        <div className="flex flex-col gap-2">
                          {DAYS.map((day) => {
                            const daySessions = convertedItemSessions.filter((s) => s.day === day);
                            if (daySessions.length === 0) return null;
                            return (
                              <div key={day} className="flex justify-between items-center gap-4 border-b border-[#1b56ca]/10 pb-1 last:border-0 last:pb-0">
                                <span className="text-xs font-black uppercase text-white">{day.substring(0, 3)}</span>
                                <div className="flex flex-col items-end gap-1">
                                  {daySessions.map((s, idx) => (
                                    <span key={idx} className="text-xs font-bold font-mono text-yellow-400">{s.open} – {s.close}</span>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                          {convertedItemSessions.length === 0 && <span className="text-xs font-black uppercase opacity-20">Closed</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 rounded-[2rem] border backdrop-blur-md bg-[linear-gradient(180deg,#0a2265_0%,#091d58_100%)] border-[#1b56ca] shadow-lg">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Showing {Math.min(filteredData.length, (currentPage - 1) * itemsPerPage + 1)}–{Math.min(filteredData.length, currentPage * itemsPerPage)} of {filteredData.length} symbols
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2.5 rounded-xl border border-[#1b56ca] text-white hover:border-yellow-400 hover:text-yellow-400 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-black font-mono text-white px-3">{currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2.5 rounded-xl border border-[#1b56ca] text-white hover:border-yellow-400 hover:text-yellow-400 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Tabs config
───────────────────────────────────────────────────────────── */
const TABS = [
  { id: 'report', label: 'Archive', icon: Layers },
  { id: 'analysis', label: 'Analytics', icon: Activity },
  { id: 'market-timing', label: 'Market Timing', icon: Clock },
  { id: 'calendar', label: 'Schedule', icon: Calendar },
  { id: 'news', label: 'Terminal', icon: Newspaper },
  { id: 'map', label: 'Eco Map', icon: Globe },
];

/* ─────────────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────────────── */
export default function ClientTechnicalAnalysisPage() {
  const [activeTab, setActiveTab] = useState('report');

  return (
    <>
      <Head>
        <title>Technical Analysis | Client Portal</title>
      </Head>

      <div
        className="min-h-screen p-6 md:p-12 relative overflow-hidden text-white"
        style={{
          background: 'radial-gradient(circle at bottom,rgba(22,55,157,0.18),transparent 25%),linear-gradient(180deg,#050f35 0%,#081846 100%)',
        }}
      >
        {/* Background glow */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-yellow-400/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-[1600px] mx-auto relative z-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/70 border border-blue-700 text-blue-200 text-xs font-semibold mb-2">
                <TrendingUp size={13} /> Technical Analysis
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Trading Signals &amp; Market Insights</h1>
              <p className="text-slate-400 text-sm mt-1">
                Switch between active analysis views for live feed, market timing, and market map insights.
              </p>
            </div>
          </div>

          {/* Animated Tab Bar */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex flex-wrap justify-center gap-3 p-3 rounded-[2.5rem] border shadow-2xl backdrop-blur-2xl bg-[linear-gradient(180deg,#0a2265_0%,#091d58_100%)] border-[#1b56ca] shadow-[0_24px_60px_rgba(4,15,54,0.28)]">
              <LayoutGroup>
                {TABS.map((t) => {
                  const Icon = t.icon;
                  const isActive = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      className={`relative flex items-center gap-3 px-8 py-4 rounded-[1.8rem] text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-500 ${
                        isActive ? 'text-white' : 'text-slate-400 hover:text-yellow-400'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="active-pill"
                          className="absolute inset-0 rounded-[1.6rem] shadow-2xl border border-yellow-400 bg-[linear-gradient(135deg,#d8a109_0%,#c78f05_100%)] shadow-[0_0_28px_rgba(244,188,28,0.34)]"
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <Icon size={18} className="relative z-10" />
                      <span className="relative z-10 hidden sm:inline">{t.label}</span>
                    </button>
                  );
                })}
              </LayoutGroup>
            </div>
          </div>

          {/* Tab Content */}
          <div className="min-h-[70vh]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -30, filter: 'blur(10px)' }}
                transition={{ duration: 0.5, ease: 'circOut' }}
              >
                {activeTab === 'report' && <ReportPDF />}
                {activeTab === 'analysis' && <MarketOverview />}
                {activeTab === 'market-timing' && <AllSymbolsTiming />}
                {activeTab === 'calendar' && <EconomicCalendar />}
                {activeTab === 'news' && (
                  <GlassCard>
                    <div className="mb-5 flex items-center gap-3 text-slate-100">
                      <TrendingUp size={20} />
                      <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-slate-400 font-semibold">Live TradingView Feed</p>
                        <h2 className="text-lg font-bold">Market Signal Timeline</h2>
                      </div>
                    </div>
                    <TradingViewWidget />
                  </GlassCard>
                )}
                {activeTab === 'map' && <EconomicMap isActive={activeTab === 'map'} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}
