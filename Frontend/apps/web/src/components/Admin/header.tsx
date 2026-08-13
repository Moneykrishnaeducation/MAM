"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, LogOut, Menu, Shield, User } from "lucide-react";

type AdminNotificationItem = {
  id: string | number;
  title: string;
  message: string;
  time: string;
  read: boolean;
};

function getAdminRole(): string {
  try {
    const nameEQ = "role=";
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.indexOf(nameEQ) === 0) {
        try {
          return decodeURIComponent(cookie.substring(nameEQ.length)).trim();
        } catch {
          return cookie.substring(nameEQ.length).trim();
        }
      }
    }
  } catch {}
  return "";
}

const formatRelativeTime = (timestampStr: string) => {
  if (!timestampStr) return "Recently";

  try {
    const cleanStr = timestampStr.includes(" ") ? timestampStr.replace(" ", "T") : timestampStr;
    const date = new Date(cleanStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    if (Number.isNaN(diffMs) || diffMs < 0) return "Recently";

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return "Recently";
  }
};

export default function AdminHeader() {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }
    return window.innerWidth >= 768;
  });
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setUserRole(getAdminRole());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth >= 768) {
      return;
    }
    setIsSidebarOpen(false);
  }, []);

  useEffect(() => {
    const handleSidebarStateChange = (event: Event) => {
      const detail = (event as CustomEvent<{ isOpen: boolean }>).detail;
      if (typeof detail?.isOpen === "boolean") {
        setIsSidebarOpen(detail.isOpen);
      }
    };

    window.addEventListener("admin-sidebar-state-change", handleSidebarStateChange);
    return () => window.removeEventListener("admin-sidebar-state-change", handleSidebarStateChange);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
      }
    };

    if (notificationsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [notificationsOpen]);

  useEffect(() => {
    let isMounted = true;

    const loadNotifications = async () => {
      try {
        const response = await fetch("/api/notifications/?unread_only=true", {
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (isMounted && Array.isArray(data?.notifications)) {
          const mapped = data.notifications.map((notification: any) => ({
            id: notification.id,
            title: notification.title || "Notification",
            message: notification.message || "",
            time: formatRelativeTime(notification.created_at),
            read: Boolean(notification.is_read),
          }));

          setNotifications(mapped);
        }
      } catch (error) {
        console.error("Error loading admin notifications:", error);
      }
    };

    void loadNotifications();

    return () => {
      isMounted = false;
    };
  }, []);

  const toggleSidebar = () => {
    window.dispatchEvent(
      new CustomEvent("admin-sidebar-state-change", {
        detail: { isOpen: !isSidebarOpen },
      }),
    );
  };

  const markAsRead = async (id: string | number) => {
    try {
      const response = await fetch(`/api/notifications/${id}/mark-read/`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (response.ok) {
        setNotifications((prev) => prev.filter((notification) => notification.id !== id));
      }
    } catch (error) {
      console.error("Error marking admin notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications/mark-all-read/", {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (response.ok) {
        setNotifications([]);
      }
    } catch (error) {
      console.error("Error marking all admin notifications as read:", error);
    }
  };

  const openLogoutConfirm = () => setShowLogoutConfirm(true);
  const closeLogoutConfirm = () => {
    if (!logoutLoading) {
      setShowLogoutConfirm(false);
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });
    } catch (error) {
      console.error("Error logging out:", error);
    } finally {
      setLogoutLoading(false);
      setShowLogoutConfirm(false);
      window.location.href = "/";
    }
  };

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const roleLabel = userRole ? userRole.toUpperCase() : "ADMIN";
  const isViewer = userRole.toLowerCase() === "viewer";
  const isSuperAdmin = userRole.toLowerCase() === "superadmin";

  const roleBadgeStyle = isViewer
    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
    : isSuperAdmin
    ? "bg-[#d4af37]/25 text-[#f5d77f] border-[#d4af37]/50 shadow-md"
    : "bg-blue-500/20 text-blue-200 border-blue-400/40";

  const iconButtonClass =
    "relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white shadow-sm transition-all hover:bg-white/20 hover:border-[#d4af37]/50";

  return (
    <>
      <header 
        className="sticky top-0 z-30 w-full border-b border-white/15 shadow-[0_4px_20px_rgba(0,0,0,0.25)] backdrop-blur-xl"
        style={{
          background: "linear-gradient(90deg, #0d214d 0%, #122f6d 50%, #183c8a 100%)",
        }}
      >
        <div className="flex h-14 items-center justify-between px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {!isSidebarOpen && (
              <button
                type="button"
                onClick={toggleSidebar}
                className={iconButtonClass}
                aria-label="Toggle Sidebar"
              >
                <Menu size={18} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Role Pill Badge */}
            <div className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black tracking-widest ${roleBadgeStyle}`}>
              <Shield size={12} className={isSuperAdmin ? "text-[#d4af37]" : isViewer ? "text-amber-400" : "text-blue-300"} />
              <span>{roleLabel}</span>
            </div>

            {/* Notifications Dropdown */}
            <div className="relative" ref={notificationsRef}>
              {/* <button
                type="button"
                onClick={() => setNotificationsOpen((open) => !open)}
                className={iconButtonClass}
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell size={17} />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-[#d4af37] ring-2 ring-[#0d214d] animate-pulse" />
                )}
              </button> */}

              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs" onClick={() => setNotificationsOpen(false)} />
                  <div 
                    className="absolute right-0 z-50 mt-2.5 w-80 overflow-hidden rounded-2xl border border-white/15 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                    style={{
                      background: "linear-gradient(180deg, #0e2350 0%, #13306e 100%)",
                    }}
                  >
                    <div className="flex items-center justify-between border-b border-white/10 p-3.5">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Notifications</h3>
                      <button
                        type="button"
                        onClick={markAllAsRead}
                        className="cursor-pointer text-[11px] font-bold text-[#d4af37] hover:underline"
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="max-h-72 space-y-2 overflow-y-auto p-3">
                      {notifications.length === 0 ? (
                        <div className="py-6 text-center text-xs text-blue-200/70 font-medium">No unread notifications</div>
                      ) : (
                        notifications.map((notification) => (
                          <button
                            key={notification.id}
                            type="button"
                            onClick={() => !notification.read && void markAsRead(notification.id)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-left transition-colors hover:bg-white/10 hover:border-[#d4af37]/40"
                          >
                            <div className="mb-0.5 flex items-center justify-between gap-2">
                              <span className="text-xs font-bold leading-tight text-white">
                                {notification.title}
                              </span>
                              <span className="text-[9px] font-mono text-blue-200/70 whitespace-nowrap">
                                {notification.time}
                              </span>
                            </div>
                            <p className="text-[11px] leading-relaxed text-blue-100/80">
                              {notification.message}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Admin Profile Link */}
            <Link
              href="/admin/profile"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white shadow-sm hover:border-[#d4af37]/60 hover:bg-white/20 transition-all"
              aria-label="Admin profile"
              title="Profile Settings"
            >
              <User size={18} className="text-[#d4af37]" />
            </Link>

            {/* Logout Button */}
            <button
              type="button"
              onClick={openLogoutConfirm}
              className={iconButtonClass}
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </header>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-md px-4">
          <div className="w-[min(92vw,24rem)] rounded-3xl border border-slate-800 bg-[#0c1535] p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_rgba(59,130,246,0.1)] animate-in fade-in zoom-in-95 duration-200 relative overflow-hidden text-slate-100">
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
                Are you sure you want to logout? You will need to sign back in to access your admin portal.
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
                    "Logout"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

