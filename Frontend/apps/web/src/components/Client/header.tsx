"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { LogOut, X, Menu, TrendingUp } from 'lucide-react';

export default function ClientHeader() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    return window.innerWidth >= 768;
  });
  const [displayName, setDisplayName] = useState('Client Portal');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    const handleSidebarStateChange = (event: Event) => {
      const detail = (event as CustomEvent<{ isOpen: boolean }>).detail;
      if (typeof detail?.isOpen === 'boolean') {
        setIsSidebarOpen(detail.isOpen);
      }
    };

    window.addEventListener('client-sidebar-state-change', handleSidebarStateChange);
    return () => window.removeEventListener('client-sidebar-state-change', handleSidebarStateChange);
  }, []);

  useEffect(() => {
    const handleLogoutRequest = () => {
      setShowLogoutConfirm(true);
    };

    window.addEventListener('client-request-logout', handleLogoutRequest);
    return () => window.removeEventListener('client-request-logout', handleLogoutRequest);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.body.style.overflow = showLogoutConfirm ? 'hidden' : '';
    window.dispatchEvent(
      new CustomEvent('client-logout-confirm-toggle', {
        detail: { isOpen: showLogoutConfirm },
      }),
    );

    return () => {
      document.body.style.overflow = '';
    };
  }, [showLogoutConfirm]);

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
    window.dispatchEvent(
      new CustomEvent('client-sidebar-state-change', {
        detail: { isOpen: !isSidebarOpen },
      }),
    );
  };

  const requestLogout = () => {
    window.dispatchEvent(new Event('client-request-logout'));
  };

  const closeLogoutConfirm = () => {
    if (!logoutLoading) {
      setShowLogoutConfirm(false);
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await fetch('/api/client/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      });
    } finally {
      window.location.href = '/';
    }
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-950 border-b border-blue-800/50 sticky top-0 z-30 w-full shadow-md shadow-blue-900/20">
      {/* Left: Sidebar Toggle */}
      <div className="w-10 flex items-center justify-start">
        {!isSidebarOpen && (
          <button 
            onClick={toggleSidebar} 
            className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1.5 rounded-xl hover:bg-slate-800"
          >
            <Menu size={20} />
          </button>
        )}
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
        <button
          type="button"
          onClick={requestLogout}
          className="flex items-center justify-center h-9 w-9 rounded-xl border border-blue-800/40 text-blue-200 hover:text-red-300 hover:bg-red-500/10 transition-colors"
          title="Logout"
        >
          <LogOut size={16} />
        </button>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-md px-4">
          <div className="w-[min(92vw,28rem)] rounded-3xl border border-blue-700/50 bg-[#0b1330] shadow-[0_30px_80px_rgba(0,0,0,0.55)] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-extrabold text-white">Logout confirmation</div>
                  <p className="mt-1 text-sm text-slate-300">
                    Are you sure you want to logout from the client portal?
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeLogoutConfirm}
                  disabled={logoutLoading}
                  className="rounded-full p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Close logout confirmation"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeLogoutConfirm}
                  disabled={logoutLoading}
                  className="rounded-2xl border border-blue-800/50 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  disabled={logoutLoading}
                  className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-extrabold text-white shadow-lg shadow-cyan-500/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {logoutLoading ? 'Logging out...' : 'OK'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
