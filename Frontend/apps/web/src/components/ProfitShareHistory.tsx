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

  // Use premium blue theme colors for light mode (which is actually the dark blue theme)
  const headingTextClass = isDarkMode ? "text-white" : "text-white";
  const softTextClass = isDarkMode ? "text-slate-400" : "text-[#8fb8ff]";
  const borderClass = isDarkMode ? "border-slate-800" : "border-[#1745b3]";
  const tableHeaderBg = isDarkMode ? "bg-slate-950/80 backdrop-blur-md" : "bg-[#0b226a]";
  const rowHover = isDarkMode ? "hover:bg-white/5" : "hover:bg-[#0b226a]/40";
  const rowText = isDarkMode ? "text-slate-300" : "text-slate-200";

  return (
    <div>
      <div className={`p-6 border-b ${borderClass} flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center">
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
            <tr className={tableHeaderBg}>
              {['Date', 'Manager', 'Investor', 'Profit', 'Share %', 'Commission', 'Status'].map((h) => (
                <th key={h} className={`px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-[#9ec0ff]'}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-[#153d9f]'}`}>
            {loading ? (
              <tr><td colSpan={7} className={`text-center py-8 text-sm ${softTextClass}`}>Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={7} className={`text-center py-12 text-sm ${softTextClass}`}>No profit shares recorded yet.</td></tr>
            ) : (
              data.map((row: any) => (
                <tr key={row.id} className={`transition-colors ${rowHover} ${rowText}`}>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold">
                    {row.master_login} <span className="text-[10px] text-[#8fb8ff] font-mono ml-1">#{row.master_position}</span>
                  </td>
                  <td className="px-4 py-3 text-sm font-bold">
                    {row.investor_login} <span className="text-[10px] text-[#8fb8ff] font-mono ml-1">#{row.investor_position}</span>
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
