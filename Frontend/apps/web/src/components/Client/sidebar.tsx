"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  UserCheck, 
  Wallet, 
  Compass, 
  Shield,
  LogOut,
  Activity,
  LifeBuoy,
  ArrowRightLeft,
  TrendingUp
} from 'lucide-react';

export default function ClientSidebar() {

  const currentPath = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    window.addEventListener('toggle-client-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-client-sidebar', handleToggle);
  }, []);

  useEffect(() => {
    const handleModalToggle = (e: Event) => {
      const detail = (e as CustomEvent<{ isOpen: boolean }>).detail;
      setIsModalOpen(detail.isOpen);
    };
    window.addEventListener('client-invest-modal-toggle', handleModalToggle);
    return () => window.removeEventListener('client-invest-modal-toggle', handleModalToggle);
  }, []);

  const navItems = [
    { href: '/client/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/client/manager', label: 'Manager', icon: UserCheck },
    { href: '/client/my-invest', label: 'My Invest', icon: Wallet },
    { href: '/client/available', label: 'Available', icon: Compass },
    { href: '/client/platform', label: 'Platform', icon: Activity },
    { href: '/client/tickets', label: 'Tickets', icon: LifeBuoy },
    { href: '/client/transaction', label: 'Transactions', icon: ArrowRightLeft },
    { href: '/client/privacy', label: 'Policies', icon: Shield  },
  ];

  return (
    <>
      {/* Mobile Sidebar Overlay Backdrop */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 md:hidden animate-in fade-in duration-200"
        />
      )}

      <aside 
        className={`flex flex-col h-screen border-r border-slate-200 z-50 transition-all duration-300 shadow-sm
          fixed md:sticky top-0 left-0
          ${isOpen 
            ? 'w-64 p-5 translate-x-0 opacity-100' 
            : 'w-0 p-0 overflow-hidden opacity-0 -translate-x-full md:translate-x-0 md:w-0 md:p-0 border-none'
          }
          ${isModalOpen ? 'blur-sm brightness-50 pointer-events-none' : ''}
        `} 
        style={{ backgroundColor: '#eef4fc' }}
      >
        <div>
          {/* Brand Header */}
          <div className="flex items-center gap-2.5 px-2.5 mb-8">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-blue-600 text-slate-950 font-black">
              <TrendingUp size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wider text-slate-800 leading-tight">MONEYKRISHNA</h2>
              <p className="text-[10px] text-emerald-600 font-bold tracking-wide">MAM PORTAL</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1.5">
            <div className="px-3 mb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
              Client Menu
            </div>
            {navItems.map((item) => {
              const isActive = currentPath === item.href || (item.href === '/client/dashboard' && currentPath === '/client');
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href as any}
                  prefetch={true}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-emerald-600 border border-slate-200 border-l-4 border-l-emerald-500 shadow-md font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 hover:translate-x-1'
                  }`}
                >
                  <Icon size={19} className={isActive ? 'text-emerald-600' : 'text-slate-500'} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Client User Card at bottom */}
        <div className="pt-4 border-t border-slate-200">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-55 transition-colors">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=120&q=80"
                alt="Client Avatar"
                className="w-10 h-10 rounded-xl object-cover ring-2 ring-emerald-500/20"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-800 truncate">Alex Rivera</h4>
              <div className="text-[11px] text-slate-500 truncate">
                Premium Client
              </div>
            </div>
            <button className="text-slate-500 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-slate-200/60" title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
