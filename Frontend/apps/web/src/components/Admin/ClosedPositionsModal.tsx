import React, { useState, useEffect } from 'react';
import { X, Search, RefreshCw, Calendar, ClipboardList } from 'lucide-react';

interface ClosedPosition {
  ticket?: string;
  PositionID?: string;
  Symbol?: string;
  Action?: string | number;
  Volume?: string | number;
  ContractSize?: string | number;
  PriceOpen?: string | number;
  PriceClose?: string | number;
  TimeCreate?: string;
  TimeClose?: string;
  Profit?: string | number;
  Storage?: string | number;
  Commission?: string | number;
  SL?: string | number;
  TP?: string | number;
}

interface ClosedPositionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: { id: string; name: string; accountId: string; } | null;
}

export default function ClosedPositionsModal({ isOpen, onClose, targetUser }: ClosedPositionsModalProps) {
  const [activeFilter, setActiveFilter] = useState<'7' | '30' | '90' | '180' | '365' | 'custom'>('7');
  const [searchSymbol, setSearchSymbol] = useState('');
  const [positions, setPositions] = useState<ClosedPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState<{from: string, to: string}>({ from: '', to: '' });

  const setPresetDate = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - days);
    setDateRange({ from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] });
    setActiveFilter(days.toString() as any);
  };

  useEffect(() => { if (isOpen) setPresetDate(7); }, [isOpen]);

  const fetchClosedPositions = async () => {
    if (!targetUser?.accountId || !dateRange.from || !dateRange.to) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/closed-positions/${targetUser.accountId}?from_date=${dateRange.from}&to_date=${dateRange.to}`);
      const data = await res.json();
      if (data.success) {
        setPositions(data.positions || []);
      } else {
        setError(data.message || 'Failed to fetch closed positions');
        setPositions([]);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading data');
      setPositions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (isOpen && dateRange.from && dateRange.to) fetchClosedPositions(); }, [isOpen, dateRange, targetUser]);

  if (!isOpen || !targetUser) return null;

  const filteredPositions = positions.filter(p => !searchSymbol || (p.Symbol && p.Symbol.toLowerCase().includes(searchSymbol.toLowerCase())));
  const totalVolume = filteredPositions.reduce((acc, p) => acc + (Number(p.Volume) || 0), 0);
  const totalCommission = filteredPositions.reduce((acc, p) => acc + (Number(p.Commission) || 0), 0);
  const netProfit = filteredPositions.reduce((acc, p) => acc + (Number(p.Profit) || 0), 0);

  const formatCurrency = (val: number) => `${val >= 0 ? '+' : ''}${val.toFixed(2)}`;
  const isBuy = (action: string | number | undefined) => action === undefined ? true : typeof action === 'string' ? action.toLowerCase() === 'buy' : action === 0;

  return (
    <div className="fixed inset-0 z-[100010] bg-[#020817]/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-7xl max-h-[90vh] bg-[#0a1128] border border-[#1e3a8a] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-[#1e3a8a] flex justify-between items-start relative">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <ClipboardList className="text-blue-400" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white tracking-wide">Closed Positions</h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-600/30 text-blue-300 text-[10px] font-semibold border border-blue-500/30 uppercase">MT5 Report</span>
              </div>
              <div className="text-xs text-blue-200 mt-1 flex flex-col gap-0.5">
                <span>Account ID: <strong className="text-blue-400">{targetUser.accountId}</strong></span>
                <span>Name: <strong className="text-white">{targetUser.name}</strong></span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-transparent hover:border-white/10">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#0a1128]">
          <div className="bg-[#0f172a] border border-[#1e3a8a] rounded-xl p-4 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-12 h-1 bg-blue-500 rounded-br-lg" />
            <div className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-1">Closed Trades</div>
            <div className="text-2xl font-black text-white">{filteredPositions.length}</div>
            <div className="text-[10px] text-slate-400 mt-1">Matching the current filter</div>
          </div>
          <div className="bg-[#0f172a] border border-[#1e3a8a] rounded-xl p-4 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-12 h-1 bg-purple-500 rounded-br-lg" />
            <div className="text-[10px] font-bold text-purple-300 uppercase tracking-widest mb-1">Volume</div>
            <div className="text-2xl font-black text-white">{totalVolume.toFixed(2)}</div>
            <div className="text-[10px] text-slate-400 mt-1">Lots traded in range</div>
          </div>
          <div className="bg-[#0f172a] border border-[#1e3a8a] rounded-xl p-4 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-12 h-1 bg-amber-500 rounded-br-lg" />
            <div className="text-[10px] font-bold text-amber-300 uppercase tracking-widest mb-1">Commission</div>
            <div className="text-2xl font-black text-white">{totalCommission.toFixed(2)}</div>
            <div className="text-[10px] text-slate-400 mt-1">Total commission charged</div>
          </div>
          <div className="bg-[#0f172a] border border-[#1e3a8a] rounded-xl p-4 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-12 h-1 bg-emerald-500 rounded-br-lg" />
            <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest mb-1">Net Profit</div>
            <div className={`text-2xl font-black ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(netProfit)}</div>
            <div className="text-[10px] text-slate-400 mt-1">Aggregated result</div>
          </div>
        </div>

        <div className="px-5 py-3 border-y border-[#1e3a8a] bg-[#0a1128] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {[7, 30, 90, 180, 365].map(d => (
              <button key={d} onClick={() => setPresetDate(d)} className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all ${activeFilter === d.toString() ? 'bg-blue-600 text-white border-blue-500' : 'bg-transparent text-blue-200 border-[#1e3a8a] hover:bg-[#1e3a8a]'}`}>
                {d === 365 ? '1 Year' : `${d} Days`}
              </button>
            ))}
            <button onClick={() => setActiveFilter('custom')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all ${activeFilter === 'custom' ? 'bg-blue-600 text-white border-blue-500' : 'bg-transparent text-blue-200 border-[#1e3a8a] hover:bg-[#1e3a8a]'}`}>
              <Calendar size={14} /> Custom Range
            </button>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">
              PERIOD: <span className="text-white">{dateRange.from.replace(/-/g, '.')} - {dateRange.to.replace(/-/g, '.')}</span>
            </span>
            <div className="relative flex items-center">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input type="text" placeholder="Search symbol..." value={searchSymbol} onChange={e => setSearchSymbol(e.target.value)} className="pl-9 pr-4 py-1.5 bg-[#0f172a] border border-[#1e3a8a] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-48" />
            </div>
            <button onClick={fetchClosedPositions} className="p-1.5 rounded-lg border border-[#1e3a8a] text-blue-300 hover:bg-[#1e3a8a] hover:text-white transition-colors">
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {activeFilter === 'custom' && (
          <div className="px-5 py-3 bg-[#0f172a] border-b border-[#1e3a8a] flex items-center gap-4 animate-in slide-in-from-top-2">
            <label className="text-xs font-semibold text-blue-200 flex items-center gap-2">From: <input type="date" value={dateRange.from} onChange={e => setDateRange({...dateRange, from: e.target.value})} className="bg-[#0a1128] border border-[#1e3a8a] rounded px-2 py-1 text-white" /></label>
            <label className="text-xs font-semibold text-blue-200 flex items-center gap-2">To: <input type="date" value={dateRange.to} onChange={e => setDateRange({...dateRange, to: e.target.value})} className="bg-[#0a1128] border border-[#1e3a8a] rounded px-2 py-1 text-white" /></label>
            <button onClick={fetchClosedPositions} className="px-4 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold">Apply Filter</button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 bg-[#0a1128]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-sm text-blue-300 font-medium">Fetching MT5 records...</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center text-rose-400 font-medium border border-rose-900/50 bg-rose-900/10 rounded-xl">{error}</div>
          ) : filteredPositions.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-sm font-medium border border-[#1e3a8a]/50 rounded-xl">No closed positions found in the specified range.</div>
          ) : (
            <div className="rounded-lg border border-[#1e3a8a] overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-[#0f172a] border-b border-[#1e3a8a]">
                  <tr className="text-[10px] font-black uppercase text-blue-300 tracking-wider">
                    <th className="py-3 px-4">Open Time</th>
                    <th className="py-3 px-4">Position</th>
                    <th className="py-3 px-4">Symbol</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Volume</th>
                    <th className="py-3 px-4 text-right">Contract Size</th>
                    <th className="py-3 px-4 text-right">Effective Lots</th>
                    <th className="py-3 px-4 text-right">Open Price</th>
                    <th className="py-3 px-4 text-center">S / L</th>
                    <th className="py-3 px-4 text-center">T / P</th>
                    <th className="py-3 px-4">Close Time</th>
                    <th className="py-3 px-4 text-right">Close Price</th>
                    <th className="py-3 px-4 text-right">Commission</th>
                    <th className="py-3 px-4 text-right">Swap</th>
                    <th className="py-3 px-4 text-right">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e3a8a]/50 text-xs text-slate-300 font-mono">
                  {filteredPositions.map((pos, idx) => {
                    const typeIsBuy = isBuy(pos.Action);
                    const posProfit = Number(pos.Profit) || 0;
                    return (
                      <tr key={pos.PositionID || pos.ticket || idx} className="hover:bg-blue-900/10 transition-colors">
                        <td className="py-2.5 px-4">{pos.TimeCreate?.replace('T', ' ')}</td>
                        <td className="py-2.5 px-4 text-blue-200">#{pos.PositionID || pos.ticket}</td>
                        <td className="py-2.5 px-4 font-bold text-white font-sans">{pos.Symbol}</td>
                        <td className="py-2.5 px-4 font-sans"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${typeIsBuy ? 'text-emerald-400' : 'text-rose-400'}`}>{typeIsBuy ? 'Buy' : 'Sell'}</span></td>
                        <td className="py-2.5 px-4 text-right">{pos.Volume}</td>
                        <td className="py-2.5 px-4 text-right">{pos.ContractSize || '-'}</td>
                        <td className="py-2.5 px-4 text-right">{pos.Volume}</td>
                        <td className="py-2.5 px-4 text-right">{pos.PriceOpen}</td>
                        <td className="py-2.5 px-4 text-center text-slate-400">{pos.SL || '-'}</td>
                        <td className="py-2.5 px-4 text-center text-slate-400">{pos.TP || '-'}</td>
                        <td className="py-2.5 px-4">{pos.TimeClose?.replace('T', ' ')}</td>
                        <td className="py-2.5 px-4 text-right">{pos.PriceClose}</td>
                        <td className="py-2.5 px-4 text-right text-amber-300/80">{pos.Commission}</td>
                        <td className="py-2.5 px-4 text-right text-slate-400">{pos.Storage || '0.00'}</td>
                        <td className={`py-2.5 px-4 text-right font-bold ${posProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{posProfit.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
