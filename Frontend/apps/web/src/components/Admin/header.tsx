"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, Bell, Shield, Sparkles, Menu } from 'lucide-react';

export default function AdminHeader() {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    return window.innerWidth >= 768;
  });
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth >= 768) {
      return;
    }

    setIsSidebarOpen(false);
  }, []);

  useEffect(() => {
    const handleSidebarStateChange = (event: Event) => {
      const detail = (event as CustomEvent<{ isOpen: boolean }>).detail;
      if (typeof detail?.isOpen === 'boolean') {
        setIsSidebarOpen(detail.isOpen);
      }
    };

    window.addEventListener('admin-sidebar-state-change', handleSidebarStateChange);
    return () => window.removeEventListener('admin-sidebar-state-change', handleSidebarStateChange);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNotificationsOpen(false);
      }
    };

    if (notificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [notificationsOpen]);

  const toggleSidebar = () => {
    window.dispatchEvent(
      new CustomEvent('admin-sidebar-state-change', {
        detail: { isOpen: !isSidebarOpen },
      }),
    );
  };

  const notifications = [
    { id: 1, text: 'New MAM Account deposit request ($10,000.00)', time: '10m ago', unread: true },
    { id: 2, text: 'MT5 Server trade sync & profit allocation completed', time: '1h ago', unread: true },
    { id: 3, text: 'Manager "Robert Vance" requested leverage adjustment', time: '3h ago', unread: false },
  ];

  const headerSurfaceClass =
    'bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.08),transparent_34%),linear-gradient(180deg,#07122a_0%,#0c2457_45%,#173f8e_100%)]';
  const dropdownClass =
    'border border-white/10 bg-[linear-gradient(180deg,#081530_0%,#0d2456_45%,#173d8d_100%)] shadow-[0_24px_60px_rgba(4,15,54,0.36)]';
  const borderMutedClass = 'border-white/10';
  const softTextClass = 'text-slate-300/70';

  return (
    <header
      className={`h-16 flex items-center justify-between px-6 md:px-8 sticky top-0 z-30 w-full border-b border-white/10 shadow-[0_12px_30px_rgba(4,10,25,0.22)] ${headerSurfaceClass}`}
    >
      {/* Left section for mobile toggle and search */}
      <div className="flex items-center flex-1 mr-4">
        {/* Mobile Toggle Button */}
        {!isSidebarOpen && (
          <button 
            onClick={toggleSidebar} 
            className="mr-3 cursor-pointer rounded-xl border border-white/10 bg-black/10 p-1.5 text-slate-200/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Toggle Sidebar"
          >
            <Menu size={20} />
          </button>
        )}
      </div>

      {/* Right Action Icons & Badges */}
      <div className="flex items-center gap-4">
        {/* System Badge */}
        <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-blue-100 shadow-sm lg:flex">
          <Sparkles size={14} className="animate-pulse" />
          <span>MT5 Server: Optimal</span>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notificationsRef}>
          <button 
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative cursor-pointer rounded-xl border border-white/10 bg-black/10 p-2.5 text-slate-200/70 shadow-sm transition-all duration-200 hover:bg-white/10 hover:text-white"
            aria-label="Notifications"
          >
            <Bell size={19} />
            <span className="absolute right-1 top-1 flex min-w-4 h-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white ring-2 ring-[#07122a]">
              2
            </span>
          </button>

          {notificationsOpen && (
            <div className={`absolute right-0 z-50 mt-3 w-80 overflow-hidden rounded-2xl animate-in fade-in zoom-in-95 duration-150 ${dropdownClass}`}>
              <div className={`flex items-center justify-between border-b p-4 ${borderMutedClass}`}>
                <h3 className="text-sm font-semibold text-white">Notifications</h3>
                <span className="cursor-pointer text-xs font-medium text-[#f5c84b] hover:underline">Mark all read</span>
              </div>
              <div className="max-h-72 divide-y divide-white/10 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3.5 text-xs transition-colors hover:bg-white/5 ${n.unread ? 'bg-white/5' : ''}`}
                  >
                    <p className="mb-1 font-medium text-slate-100">{n.text}</p>
                    <span className={`text-[10px] ${softTextClass}`}>{n.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Role Badge / User Profile */}
        <Link 
          href="/admin/profile"
          className="flex cursor-pointer items-center gap-3 border-l border-white/10 pl-3 transition-opacity hover:opacity-80 decoration-none"
        >
          <img 
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80" 
            alt="Admin Profile" 
            className="h-9 w-9 rounded-xl border-2 border-[#556cc3]/55 object-cover shadow-sm"
          />
        </Link>
      </div>
    </header>
  );
}
