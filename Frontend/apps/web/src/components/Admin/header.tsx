"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, Bell, Shield, Sparkles, Menu, X } from 'lucide-react';

export default function AdminHeader() {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    const handleToggle = () => setIsSidebarOpen(prev => !prev);
    window.addEventListener('toggle-admin-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-admin-sidebar', handleToggle);
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
    window.dispatchEvent(new Event('toggle-admin-sidebar'));
  };

  const notifications = [
    { id: 1, text: 'New MAM Account deposit request ($10,000.00)', time: '10m ago', unread: true },
    { id: 2, text: 'MT5 Server trade sync & profit allocation completed', time: '1h ago', unread: true },
    { id: 3, text: 'Manager "Robert Vance" requested leverage adjustment', time: '3h ago', unread: false },
  ];

  return (
    <header className="h-20 flex items-center justify-between px-6 md:px-8 bg-white border-b border-slate-200 sticky top-0 z-30 w-full shadow-sm">
      {/* Left section for mobile toggle and search */}
      <div className="flex items-center flex-1 mr-4">
        {/* Mobile Toggle Button */}
        <button 
          onClick={toggleSidebar} 
          className="md:hidden text-slate-500 hover:text-slate-900 transition-colors cursor-pointer p-1.5 rounded-xl hover:bg-slate-100 mr-3"
          aria-label="Toggle Sidebar"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Search Bar */}
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-2xl w-full max-w-sm md:w-96 border border-slate-200/85 transition-all duration-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 shadow-inner">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input 
            type="text" 
            placeholder="Search MAM accounts, managers, investors..." 
            className="bg-transparent border-none text-slate-800 outline-none w-full text-sm placeholder-slate-400 font-sans"
          />
        </div>
      </div>

      {/* Right Action Icons & Badges */}
      <div className="flex items-center gap-4">
        {/* System Badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 text-xs font-semibold shadow-sm">
          <Sparkles size={14} className="animate-pulse" />
          <span>MT5 Server: Optimal</span>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notificationsRef}>
          <button 
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="bg-white border border-slate-200 text-slate-500 cursor-pointer relative transition-all duration-200 p-2.5 rounded-xl hover:text-slate-850 hover:bg-slate-50 hover:border-slate-300 shadow-sm"
            aria-label="Notifications"
          >
            <Bell size={19} />
            <span className="absolute top-1 right-1 bg-blue-500 text-white text-[10px] font-bold h-4 min-w-4 rounded-full flex items-center justify-center px-1 ring-2 ring-white">
              2
            </span>
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h3 className="font-semibold text-sm text-slate-800">Notifications</h3>
                <span className="text-xs text-blue-600 font-medium cursor-pointer hover:underline">Mark all read</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className={`p-3.5 hover:bg-slate-50 transition-colors text-xs ${n.unread ? 'bg-blue-500/5' : ''}`}>
                    <p className="text-slate-700 font-medium mb-1">{n.text}</p>
                    <span className="text-slate-450 text-[10px]">{n.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Role Badge / User Profile */}
        <Link 
          href="/admin/profile"
          className="flex items-center gap-3 pl-3 border-l border-slate-200 hover:opacity-80 transition-opacity cursor-pointer decoration-none"
        >
          <div className="hidden sm:block text-right">
            <div className="text-sm font-semibold text-slate-800">MAM Super Admin</div>
            <div className="text-xs text-slate-500 flex items-center justify-end gap-1">
              <Shield size={11} className="text-blue-500" /> Full Access
            </div>
          </div>
          <img 
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80" 
            alt="Admin Profile" 
            className="w-9 h-9 rounded-xl border-2 border-blue-500/40 object-cover shadow-sm"
          />
        </Link>
      </div>
    </header>
  );
}
