"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, X, Menu, TrendingUp } from 'lucide-react';

export default function ClientHeader() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [displayName, setDisplayName] = useState('Client Portal');

  useEffect(() => {
    const handleToggle = () => setIsSidebarOpen(prev => !prev);
    window.addEventListener('toggle-client-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-client-sidebar', handleToggle);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadClientName = async () => {
      try {
        const response = await fetch('/api/client/profile', {
          credentials: 'include',
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const profile = data?.profile;
        const fullName = String(profile?.full_name || '').trim();
        const email = String(profile?.email || '').trim();
        const fallbackName = email ? email.split('@')[0].replace(/[._-]+/g, ' ') : '';
        const nextName = fullName || fallbackName || 'Client Portal';

        if (isMounted) {
          setDisplayName(nextName);
        }
      } catch {
        if (isMounted) {
          setDisplayName('Client Portal');
        }
      }
    };

    void loadClientName();

    return () => {
      isMounted = false;
    };
  }, []);

  const toggleSidebar = () => {
    window.dispatchEvent(new Event('toggle-client-sidebar'));
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-950 border-b border-blue-800/50 sticky top-0 z-30 w-full shadow-md shadow-blue-900/20">
      {/* Left: Sidebar Toggle */}
      <div>
        <button 
          onClick={toggleSidebar} 
          className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1.5 rounded-xl hover:bg-slate-800"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Center: Brand Name */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-xl bg-gradient-to-tr from-emerald-500 to-blue-600 text-slate-950 font-black">
          <TrendingUp size={16} />
        </div>
        <span className="text-base font-black tracking-wider text-white">
          {displayName}
        </span>
      </div>

      {/* Right: User Profile */}
      <div className="flex items-center gap-3">
        <Link 
          href="/client/profile"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <div className="hidden sm:block text-right">
            <div className="text-xs font-bold text-slate-200">{displayName}</div>
            <div className="text-[10px] text-emerald-400 font-semibold">MAM Investor</div>
          </div>
          <img 
            src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=120&q=80" 
            alt="Client Profile" 
            className="w-8 h-8 rounded-xl border-2 border-emerald-500/60 object-cover shadow-sm"
          />
        </Link>
      </div>
    </header>
  );
}
