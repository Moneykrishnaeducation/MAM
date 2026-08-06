"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { LogOut, X, Menu, TrendingUp, Bell } from 'lucide-react';
import { useTheme } from 'next-themes';

const formatRelativeTime = (timestampStr: string) => {
  if (!timestampStr) return 'Recently';
  try {
    // Standardize to ISO format if space is present
    const cleanStr = timestampStr.includes(' ') ? timestampStr.replace(' ', 'T') : timestampStr;
    const date = new Date(cleanStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (isNaN(diffMs) || diffMs < 0) return 'Recently';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'Recently';
  }
};

export default function ClientHeader() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    return window.innerWidth >= 768;
  });
  const [displayName, setDisplayName] = useState('Client Portal');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=120&q=80');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string | number; title: string; message: string; time: string; read: boolean }[]>([]);

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
    const handleAvatarUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ avatar: string }>).detail;
      if (detail?.avatar) {
        setAvatarUrl(detail.avatar);
      }
    };

    window.addEventListener('client-avatar-update', handleAvatarUpdate);
    return () => window.removeEventListener('client-avatar-update', handleAvatarUpdate);
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

    const loadClientData = async () => {
      try {
        const [profileRes, notifRes] = await Promise.all([
          fetch('/api/client/profile', {
            credentials: 'include',
            headers: { Accept: 'application/json' },
          }),
          fetch('/api/notifications/?unread_only=true', {
            credentials: 'include',
            headers: { Accept: 'application/json' },
          }),
        ]);

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          const profile = profileData?.profile;
          const fullName = String(profile?.full_name || '').trim();
          const email = String(profile?.email || '').trim();
          const fallbackName = email ? email.split('@')[0].replace(/[._-]+/g, ' ') : '';
          const nextName = fullName || fallbackName || 'Client Portal';

          if (isMounted) {
            setDisplayName(nextName);
            if (profile?.avatar) {
              setAvatarUrl(profile.avatar);
            }
          }
        }

        if (notifRes.ok) {
          const notifData = await notifRes.json();
          if (isMounted && Array.isArray(notifData?.notifications)) {
            const mapped = notifData.notifications.map((n: any) => ({
              id: n.id,
              title: n.title || 'Notification',
              message: n.message || '',
              time: formatRelativeTime(n.created_at),
              read: !!n.is_read,
            }));
            setNotifications(mapped);
          }
        }
      } catch (err) {
        console.error('Error loading client header data:', err);
      }
    };

    void loadClientData();

    return () => {
      isMounted = false;
    };
  }, []);

  const markAsRead = async (id: string | number) => {
    try {
      const response = await fetch(`/api/notifications/${id}/mark-read/`, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read/', {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (response.ok) {
        setNotifications([]);
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

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

  // Styling based on theme config matching the tickets page
  const dropdownClass = isDarkMode
    ? 'border-slate-800 bg-slate-900 shadow-[0_12px_40px_rgba(0,0,0,0.5)]'
    : 'border-[#1d53ca] bg-[linear-gradient(180deg,#071a57_0%,#08286f_100%)] shadow-[0_24px_60px_rgba(4,15,54,0.36)]';
  const borderMutedClass = isDarkMode ? 'border-white/10' : 'border-[#1745b3]';
  const softTextClass = isDarkMode ? 'text-gray-400' : 'text-[#8fb8ff]';

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

      {/* Right: User Profile & Notifications */}
      <div className="flex items-center gap-3">
        {/* Notifications Icon & Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative flex items-center justify-center h-9 w-9 rounded-xl border border-blue-800/40 text-blue-200 hover:text-white hover:bg-blue-800/30 transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell size={16} />
            {notifications.some(n => !n.read) && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#C9A227] ring-2 ring-blue-900 animate-pulse" />
            )}
          </button>

          {isNotificationsOpen && (
            <>
              {/* Overlay backdrop to close when clicked outside */}
              <div 
                className="fixed inset-0 z-45" 
                onClick={() => setIsNotificationsOpen(false)}
              />
              <div className={`absolute right-0 mt-3 w-80 rounded-2xl border p-4 z-50 animate-in fade-in slide-in-from-top-3 duration-250 ${dropdownClass}`}>
                <div className={`flex items-center justify-between pb-3 border-b mb-3 ${borderMutedClass}`}>
                  <span className="text-sm font-extrabold text-white">Notifications</span>
                  <button 
                    onClick={markAllAsRead}
                    className="text-[10px] font-bold text-[#C9A227] hover:text-[#dcb63b] transition-colors"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-blue-800">
                  {notifications.length === 0 ? (
                    <div className={`text-center py-6 text-xs ${softTextClass}`}>No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div 
                        key={n.id} 
                        onClick={() => !n.read && markAsRead(n.id)}
                        className={`p-2.5 rounded-xl border transition-all ${
                          n.read 
                            ? (isDarkMode ? 'border-slate-800/80 bg-slate-950/20 text-slate-400' : 'border-blue-900/10 bg-blue-950/10 text-slate-400')
                            : 'border-[#C9A227]/20 bg-[#C9A227]/5 text-slate-200 cursor-pointer hover:bg-[#C9A227]/10'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-bold leading-tight text-white">{n.title}</span>
                          <span className={`text-[10px] whitespace-nowrap ${softTextClass}`}>{n.time}</span>
                        </div>
                        <p className={`text-[11px] leading-relaxed ${n.read ? softTextClass : 'text-slate-300'}`}>{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <Link 
          href="/client/profile"
          className="flex items-center gap-3 hover:opacity-85 transition-opacity cursor-pointer"
        >
          <img 
            src={avatarUrl} 
            alt="Client Profile" 
            className="w-8 h-8 rounded-xl border-2 border-[#C9A227]/60 object-cover shadow-sm"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-md px-4">
          <div className="w-[min(92vw,24rem)] rounded-3xl border border-slate-800 bg-[#0c1535] p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_rgba(59,130,246,0.1)] animate-in fade-in zoom-in-95 duration-200 relative overflow-hidden">
            {/* Background glowing gradient pattern */}
            <div className="absolute -top-12 -left-12 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col items-center text-center">
              {/* Warning/Logout Icon Container */}
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 ring-8 ring-red-500/5 mb-4">
                <LogOut size={24} className="translate-x-0.5" />
              </div>

              <h3 className="text-lg font-bold text-white tracking-tight">Confirm Logout</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed max-w-[280px]">
                Are you sure you want to logout? You will need to sign back in to access your client portal.
              </p>

              <div className="mt-6 flex w-full flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={closeLogoutConfirm}
                  disabled={logoutLoading}
                  className="flex-1 rounded-2xl border border-slate-700/80 bg-slate-800/40 py-2.5 text-sm font-semibold text-slate-300 transition-all duration-200 hover:bg-slate-800 hover:text-white hover:border-slate-600 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  disabled={logoutLoading}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-red-500/20 transition-all duration-200 hover:from-red-400 hover:to-rose-500 hover:shadow-red-500/35 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {logoutLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Logging out...
                    </span>
                  ) : (
                    'Logout'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
