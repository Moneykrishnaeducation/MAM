"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, LogOut, Menu, TrendingUp } from "lucide-react";

export default function AdminHeader() {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.innerWidth >= 768;
  });
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

  const toggleSidebar = () => {
    window.dispatchEvent(
      new CustomEvent("admin-sidebar-state-change", {
        detail: { isOpen: !isSidebarOpen },
      }),
    );
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

  const notifications = [
    { id: 1, text: "New MAM Account deposit request ($10,000.00)", time: "10m ago", unread: true },
    { id: 2, text: "MT5 Server trade sync & profit allocation completed", time: "1h ago", unread: true },
    { id: 3, text: 'Manager "Robert Vance" requested leverage adjustment', time: "3h ago", unread: false },
  ];

  const headerBackground =
    "linear-gradient(90deg, #0b1f67 0%, #102a7d 48%, #18308d 100%)";
  const iconButtonClass =
    "relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 shadow-sm transition-colors hover:bg-white/10 hover:text-white";
  const dropdownBackground =
    "linear-gradient(180deg, #081530 0%, #0d2456 45%, #173d8d 100%)";

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
            >
              <Bell size={18} />
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white ring-2 ring-[#0b1f67]">
                2
              </span>
            </button>

            {notificationsOpen && (
              <div
                className="absolute right-0 z-50 mt-3 w-80 overflow-hidden rounded-2xl border border-white/10 shadow-[0_24px_60px_rgba(4,15,54,0.36)] animate-in fade-in zoom-in-95 duration-150"
                style={{ background: dropdownBackground }}
              >
                <div className="flex items-center justify-between border-b border-white/10 p-4">
                  <h3 className="text-sm font-semibold text-white">Notifications</h3>
                  <span className="cursor-pointer text-xs font-medium text-[#f5c84b] hover:underline">
                    Mark all read
                  </span>
                </div>
                <div className="max-h-72 divide-y divide-white/10 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3.5 text-xs transition-colors hover:bg-white/5 ${
                        notification.unread ? "bg-white/5" : ""
                      }`}
                    >
                      <p className="mb-1 font-medium text-slate-100">{notification.text}</p>
                      <span className="text-[10px] text-slate-300/70">{notification.time}</span>
                    </div>
                  ))}
                </div>
              </div>
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
