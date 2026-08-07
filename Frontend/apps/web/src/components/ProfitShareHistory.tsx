import React, { useEffect, useState } from 'react';
import { History, TrendingUp, DollarSign } from 'lucide-react';

export default function ProfitShareHistory({ 
  isAdmin, 
  isDarkMode = true,
  managerLogin
}: { 
  isAdmin: boolean; 
  isDarkMode?: boolean;
  managerLogin?: string;
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        let url = isAdmin ? '/api/admin/profit-share/history' : '/api/client/profit-share/history';
        if (managerLogin) {
          url += `?manager_login=${managerLogin}`;
        }
        const res = await fetch(url);
        const json = await res.json();
        if (json?.status === 'success') {
          setData(json.data);
        }
      } catch (e) {
        console.error("Failed to fetch profit share history", e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [isAdmin]);

  // const panelClass = isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-blue-900/40";
  const headingTextClass = isDarkMode ? "text-white" : "text-[#0b226a]";
  const softTextClass = isDarkMode ? "text-slate-400" : "text-[#476bbf]";

  return (
    <div>
      <div className={`p-6 border-b ${isDarkMode ? 'border-slate-800' : 'border-blue-900/20'} flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <History size={20} />
          </div>
          <div>
            <h3 className={`text-xl font-black ${headingTextClass}`}>Profit Share History</h3>
            <p className={`text-sm font-semibold mt-0.5 ${softTextClass}`}>Recent automated profit settlements</p>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[500px]">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className={isDarkMode ? 'bg-slate-950/80 backdrop-blur-md' : 'bg-[#0b226a]'}>
              <th className={`px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-[#9ec0ff]`}>Date</th>
              <th className={`px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-[#9ec0ff]`}>Manager</th>
              <th className={`px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-[#9ec0ff]`}>Investor</th>
              <th className={`px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-[#9ec0ff]`}>Profit</th>
              <th className={`px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-[#9ec0ff]`}>Share %</th>
              <th className={`px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-[#9ec0ff]`}>Commission</th>
              <th className={`px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-[#9ec0ff]`}>Status</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-[#153d9f]'}`}>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-sm text-slate-400">Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-sm text-slate-400">No profit shares recorded yet.</td></tr>
            ) : (
              data.map((row: any) => (
                <tr key={row.id} className={`transition-colors hover:bg-white/5 ${isDarkMode ? '' : 'text-slate-800'}`}>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold">
                    {row.master_login} <span className="text-[10px] text-slate-500 font-mono ml-1">#{row.master_position}</span>
                  </td>
                  <td className="px-4 py-3 text-sm font-bold">
                    {row.investor_login} <span className="text-[10px] text-slate-500 font-mono ml-1">#{row.investor_position}</span>
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-emerald-400">
                    ${row.profit?.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-purple-400">
                    {row.commission_percentage}%
                  </td>
                  <td className="px-4 py-3 text-sm font-black text-amber-400">
                    ${row.commission_amount?.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
