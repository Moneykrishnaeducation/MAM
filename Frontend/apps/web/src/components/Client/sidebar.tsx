"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  type LucideIcon,
  LayoutDashboard,
  UserCheck,
  Wallet,
  Compass,
  Shield,
  LogOut,
  X,
  Activity,
  LifeBuoy,
  ArrowRightLeft,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export default function ClientSidebar() {
  const currentPath = usePathname();
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    return window.innerWidth >= 768;
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  useEffect(() => {
    const handleSidebarStateChange = (event: Event) => {
      const detail = (event as CustomEvent<{ isOpen: boolean }>).detail;
      if (typeof detail?.isOpen === 'boolean') {
        setIsOpen(detail.isOpen);
      }
    };

    window.addEventListener('client-sidebar-state-change', handleSidebarStateChange);
    return () => window.removeEventListener('client-sidebar-state-change', handleSidebarStateChange);
  }, []);

  useEffect(() => {
    const handleModalToggle = (e: Event) => {
      const detail = (e as CustomEvent<{ isOpen: boolean }>).detail;
      setIsModalOpen(detail.isOpen);
    };
    window.addEventListener('client-invest-modal-toggle', handleModalToggle);
    return () => window.removeEventListener('client-invest-modal-toggle', handleModalToggle);
  }, []);

  useEffect(() => {
    const handleLogoutConfirmToggle = (e: Event) => {
      const detail = (e as CustomEvent<{ isOpen: boolean }>).detail;
      setIsLogoutConfirmOpen(Boolean(detail?.isOpen));
    };

    window.addEventListener('client-logout-confirm-toggle', handleLogoutConfirmToggle);
    return () => window.removeEventListener('client-logout-confirm-toggle', handleLogoutConfirmToggle);
  }, []);

  const navItems: NavItem[] = [
    { href: '/client/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/client/manager', label: 'Manager', icon: UserCheck },
    { href: '/client/my-invest', label: 'My Invest', icon: Wallet },
    { href: '/client/internal/internal_transfer', label: 'Internal Transfer', icon: ArrowRightLeft },
    { href: '/client/available', label: 'Available', icon: Compass },
    { href: '/client/platform', label: 'Platform', icon: Activity },
    { href: '/client/technical-analysis', label: 'Technical Analysis', icon: TrendingUp },
    { href: '/client/tickets', label: 'Tickets', icon: LifeBuoy },
    { href: '/client/transaction', label: 'Transactions', icon: ArrowRightLeft },
    { href: '/client/privacy', label: 'Policies', icon: Shield },
  ];

  const requestLogout = () => {
    window.dispatchEvent(new Event('client-request-logout'));
  };

  const handleNavClick = () => {
    if (window.innerWidth < 768) {
      window.dispatchEvent(
        new CustomEvent('client-sidebar-state-change', {
          detail: { isOpen: false },
        }),
      );
    }
  };

  return (
    <>
      {/* Mobile Sidebar Overlay Backdrop */}
      {isOpen && (
        <div
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent('client-sidebar-state-change', {
                detail: { isOpen: false },
              }),
            )
          }
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 md:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen flex-col justify-between border-r border-white/10 shadow-[12px_0_40px_rgba(7,16,39,0.28)] transition-all duration-300 md:sticky
          ${isOpen
            ? 'w-68 translate-x-0 p-2 opacity-100'
            : 'w-0 -translate-x-full overflow-hidden p-0 opacity-0 md:translate-x-0 md:w-0 md:p-0'
          }
          ${isModalOpen ? 'pointer-events-none brightness-50 blur-sm' : ''}
          ${isLogoutConfirmOpen ? 'pointer-events-none brightness-50 blur-md' : ''}
        `}
        style={{
          background: 'linear-gradient(180deg, #081530 0%, #0d2456 45%, #173d8d 100%)',
        }}
      >
        <div className="flex-1 overflow-y-auto [-ms-overflow-style:'none'] [scrollbar-width:'none'] [&::-webkit-scrollbar]:hidden">
          {/* Brand Header */}
          <div className="mb-8 mt-2 flex items-center justify-between gap-3 px-2">
            <img
              src="/VT1.png"
              alt="VTIndex Logo"
              className="w-32 transition-transform drop-shadow-[0_0_15px_rgba(201,162,39,0.4)] hover:scale-[1.05]"
            />
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('client-sidebar-state-change', {
                    detail: { isOpen: false },
                  }),
                )
              }
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-200/70 transition-colors hover:bg-white/10 hover:text-white"
              title="Close menu"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            <div className="mb-3 px-4 text-[10px] font-extrabold uppercase tracking-[0.24em] text-blue-100/55">
              Client Menu
            </div>
            {navItems.map((item) => {
              const isActive = currentPath === item.href || (item.href === '/client/dashboard' && currentPath === '/client');
              const Icon = item.icon;

              const itemBaseClasses =
                'group relative flex w-full items-center gap-3.5 overflow-hidden rounded-[22px] px-4 py-3.5 text-[12px] font-extrabold uppercase tracking-[0.22em] transition-all duration-300';
              const itemStateClasses = isActive
                ? 'border border-[#4d65bf]/55 bg-[linear-gradient(180deg,#2b4086_0%,#22356f_100%)] text-[#f5c84b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_32px_rgba(0,0,0,0.28)] translate-x-1'
                : 'border border-transparent text-slate-100/86 hover:bg-white/10 hover:text-white';
              const iconStateClasses = isActive
                ? 'text-[#f5c84b]'
                : 'text-slate-300/75 group-hover:text-white';

              return (
                <Link
                  key={item.href}
                  href={item.href as any}
                  prefetch={true}
                  onClick={handleNavClick}
                  className={`${itemBaseClasses} ${itemStateClasses}`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-3 bottom-3 w-1 rounded-full bg-white" />
                  )}
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.4 : 2}
                    className={`shrink-0 transition-colors duration-300 ${iconStateClasses} ${isActive ? 'ml-0.5' : ''}`}
                  />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {isActive && (
                    <ChevronRight
                      size={15}
                      strokeWidth={2.5}
                      className="shrink-0 text-[#f5c84b]/75"
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>


      </aside>
    </>
  );
}
