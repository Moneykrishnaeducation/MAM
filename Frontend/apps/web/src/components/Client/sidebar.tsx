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
    { href: '/client/technical-analysis', label: 'Technical Analysis', icon: TrendingUp },
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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300"
        />
      )}

      <aside 
        className={`flex justify-between flex-col h-screen z-50 transition-all duration-300 shadow-2xl
          fixed md:sticky top-0 left-0 bg-[#0e2250] border-r border-blue-900/40
          ${isOpen 
            ? 'w-64 p-5 translate-x-0 opacity-100 ' 
            : 'w-0 p-0 overflow-hidden opacity-0 -translate-x-full md:translate-x-0 md:w-0 md:p-0'
          }
          ${isModalOpen ? 'blur-sm brightness-50 pointer-events-none' : ''}
        `} 
      >
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-2 mb-10 mt-2">
            <img
              src="/Vt.png"
              alt="VTIndex Logo"
              className="drop-shadow-[0_0_15px_rgba(201,162,39,0.4)] transition-transform hover:scale-[1.05] w-32"
            />
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            <div className="px-4 mb-3 text-[10px] font-extrabold tracking-[0.2em] text-blue-400/60 uppercase">
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
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold text-[13px] transition-all duration-300 group ${
                    isActive
                      ? 'bg-white text-[#0a1435] shadow-[0_8px_30px_rgba(255,255,255,0.15)] translate-x-1 border border-white relative overflow-hidden'
                      : 'text-[#d9aa2b] hover:text-[#fcd34d] hover:bg-[#1a2c5b] hover:translate-x-1 border border-transparent'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600 rounded-l-2xl"></div>
                  )}
                  <Icon 
                    size={20} 
                    strokeWidth={isActive ? 2.5 : 2}
                    className={`transition-colors duration-300 z-10 ${isActive ? 'text-blue-700 ml-1' : 'text-blue-200 group-hover:text-blue-100'}`} 
                  />
                  <span className="z-10">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Client User Card at bottom */}
        <div className="pt-5 mt-2 border-t border-blue-900/40">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#0d1a40] border border-blue-800/30 hover:bg-[#122359] hover:border-blue-700/50 transition-all shadow-inner group">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=120&q=80"
                alt="Client Avatar"
                className="w-10 h-10 rounded-xl object-cover ring-2 ring-blue-500/20 group-hover:ring-blue-400/40 transition-all"
              />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#0d1a40]" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-extrabold text-white truncate">Alex Rivera</h4>
              <div className="text-[10px] font-bold text-blue-300 uppercase tracking-wider truncate mt-0.5">
                Premium Client
              </div>
            </div>
            <button className="text-blue-300/50 hover:text-red-400 transition-colors p-2 rounded-xl hover:bg-red-500/10" title="Logout">
              <LogOut size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
