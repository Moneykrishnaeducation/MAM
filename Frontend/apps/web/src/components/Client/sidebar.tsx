import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation'
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
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    window.addEventListener('toggle-client-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-client-sidebar', handleToggle);
  }, []);

  const navItems = [
    { href: '/client/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/client/manager', label: 'Manager', icon: UserCheck },
    { href: '/client/my-invest', label: 'My Invest', icon: Wallet },
    { href: '/client/available', label: 'Available', icon: Compass },
    { href: '/client/platform', label: 'Platform', icon: Flame },
    { href: '/client/tickets', label: 'Tickets', icon: Flame },
    { href: '/client/transactions', label: 'Transactions', icon: Flame },
    { href: '/client/policies', label: 'Policies', icon: Flame },
    
  ];

  return (
    <aside 
      className={`flex-col min-h-screen border-r border-[#153176] z-20 sticky top-0 h-screen justify-between transition-all duration-300 ${
        isOpen ? 'hidden md:flex w-64 p-5' : 'w-0 p-0 overflow-hidden opacity-0 border-none hidden'
      }`} 
      style={{ backgroundColor: '#0e2250' }}
    >
      <div>
        {/* Brand Header */}

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
