import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  UserCheck, 
  Wallet, 
  Compass, 
  Flame,
  LogOut
} from 'lucide-react';

export default function ClientSidebar() {

  const currentPath = usePathname();

  const navItems = [
    { href: '/client/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/client/manager', label: 'Manager', icon: UserCheck },
    { href: '/client/my-invest', label: 'My Invest', icon: Wallet },
    { href: '/client/available', label: 'Available', icon: Compass },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen bg-slate-900/90 backdrop-blur-xl border-r border-slate-800 p-5 z-20 sticky top-0 h-screen justify-between">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black py-2 px-3.5 rounded-2xl text-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] tracking-wider">
            MAM
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 leading-tight">Client Portal</h2>
            <p className="text-xs text-emerald-400 font-medium">Money Krishna Edu</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1.5">
          <div className="px-3 mb-2 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
            Client Menu
          </div>
          {navItems.map((item) => {
            const isActive = currentPath === item.href || (item.href === '/client/dashboard' && currentPath === '/client');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href as any}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border-l-4 border-emerald-500 shadow-[0_4px_20px_rgba(16,185,129,0.15)] font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 hover:translate-x-1'
                }`}
              >
                <Icon size={19} className={isActive ? 'text-emerald-400' : 'text-slate-400'} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Learning Streak / Investment Widget */}
        <div className="mt-8 mx-1 p-4 rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-800/40 border border-slate-700/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Flame size={16} className="text-amber-500 fill-amber-500/30" /> Daily Streak
            </span>
            <span className="text-xs font-bold text-amber-400">7 Days 🔥</span>
          </div>
          <p className="text-[11px] text-slate-400 mb-3">Your portfolio grew +4.2% this week!</p>
          <div className="w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full w-4/5 transition-all duration-500"></div>
          </div>
        </div>
      </div>

      {/* Client User Card at bottom */}
      <div className="pt-4 border-t border-slate-800/80">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 hover:bg-slate-800/80 transition-colors">
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=120&q=80"
              alt="Client Avatar"
              className="w-10 h-10 rounded-xl object-cover ring-2 ring-emerald-500/40"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-slate-200 truncate">Alex Rivera</h4>
            <div className="text-[11px] text-slate-400 truncate">
              Premium Client
            </div>
          </div>
          <button className="text-slate-400 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-slate-700/50" title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
