"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, LogOut, Menu } from "lucide-react";

type AdminNotificationItem = {
  id: string | number;
  title: string;
  message: string;
  time: string;
  read: boolean;
};

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

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });
    } finally {
      window.location.href = "/";
    }
  };

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const headerBackground = "linear-gradient(90deg, #0b1f67 0%, #102a7d 48%, #18308d 100%)";
  const iconButtonClass =
    "relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 shadow-sm transition-colors hover:bg-white/10 hover:text-white";
  const dropdownBackground = "linear-gradient(180deg, #081530 0%, #0d2456 45%, #173d8d 100%)";
  const softTextClass = "text-slate-300/70";

  return (
    <header
      className="sticky top-0 z-30 w-full border-b border-white/10 shadow-[0_10px_26px_rgba(5,12,36,0.2)]"
      style={{ background: headerBackground }}
    >
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {!isSidebarOpen && (
            <button
              type="button"
              onClick={toggleSidebar}
              className={iconButtonClass}
              aria-label="Toggle Sidebar"
            >
              <Menu size={20} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => setNotificationsOpen((open) => !open)}
              className={iconButtonClass}
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-blue-400 ring-2 ring-[#0b1f67]" />
              )}
            </button>

            {notificationsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                <div
                  className="absolute right-0 z-50 mt-3 w-80 overflow-hidden rounded-2xl border border-white/10 shadow-[0_24px_60px_rgba(4,15,54,0.36)] animate-in fade-in zoom-in-95 duration-150"
                  style={{ background: dropdownBackground }}
                >
                  <div className="flex items-center justify-between border-b border-white/10 p-4">
                    <h3 className="text-sm font-semibold text-white">Notifications</h3>
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="cursor-pointer text-xs font-medium text-[#f5c84b] hover:underline"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-72 space-y-3 overflow-y-auto p-3">
                    {notifications.length === 0 ? (
                      <div className={`py-6 text-center text-xs ${softTextClass}`}>No notifications</div>
                    ) : (
                      notifications.map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => !notification.read && void markAsRead(notification.id)}
                          className="w-full rounded-xl border border-[#C9A227]/20 bg-[#C9A227]/5 p-3 text-left transition-colors hover:bg-[#C9A227]/10"
                        >
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="text-xs font-bold leading-tight text-white">
                              {notification.title}
                            </span>
                            <span className={`text-[10px] whitespace-nowrap ${softTextClass}`}>
                              {notification.time}
                            </span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-slate-300">
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

          <Link
            href="/admin/profile"
            className="flex h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-white/5 shadow-sm"
            aria-label="Admin profile"
          >
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
              alt="Admin Profile"
              className="h-full w-full object-cover"
            />
          </Link>

          <button
            type="button"
            onClick={() => void handleLogout()}
            className={iconButtonClass}
            title="Logout"
            aria-label="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
