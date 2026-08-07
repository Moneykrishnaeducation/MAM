"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  type LucideIcon,
  Activity,
  ChevronRight,
  Clock,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Mail,
  Repeat,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export default function AdminSidebar() {
  const router = useRouter();
  const currentPath = router.pathname;
  const [isOpen, setIsOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    const handleSidebarStateChange = (event: Event) => {
      const detail = (event as CustomEvent<{ isOpen: boolean }>).detail;
      if (typeof detail?.isOpen === "boolean") {
        setIsOpen(detail.isOpen);
      }
    };

    if (window.innerWidth < 768) {
      setIsOpen(false);
    }

    window.addEventListener("admin-sidebar-state-change", handleSidebarStateChange);
    return () => window.removeEventListener("admin-sidebar-state-change", handleSidebarStateChange);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.body.style.overflow = showLogoutConfirm ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showLogoutConfirm]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      const nameEQ = "role=";
      const ca = document.cookie.split(";");
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === " ") c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) {
          setUserRole(decodeURIComponent(c.substring(nameEQ.length, c.length)).trim());
          break;
        }
      }
    }
  }, []);

  const isSuperAdmin = userRole.toLowerCase() === "superadmin";

  const navItems: NavItem[] = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/requests", label: "Pending Requests", icon: Clock },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/managers", label: "Managers", icon: UserCheck },
    { href: "/admin/investors", label: "Investors", icon: Landmark },
    { href: "/admin/mails", label: "Mails", icon: Mail },
    { href: "/admin/tickets", label: "Support Tickets", icon: LifeBuoy },
    { href: "/admin/activity", label: "Activity Logs", icon: Activity },
    { href: "/admin/transactions", label: "Transactions", icon: Repeat },
    { href: "/admin/admin-users", label: "Admins", icon: ShieldCheck },
  ];

  if (isSuperAdmin) {
    navItems.push({ href: "/admin/settings", label: "Settings", icon: Settings });
  }

  const isNavItemActive = (href: string) => {
    if (href === "/admin/dashboard") {
      return currentPath === "/admin" || currentPath === href || currentPath.startsWith(`${href}/`);
    }
    return currentPath === href || currentPath.startsWith(`${href}/`);
  };

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
    } finally {
      window.location.href = "/";
    }
  };

  const setSidebarOpen = (nextOpen: boolean) => {
    window.dispatchEvent(
      new CustomEvent("admin-sidebar-state-change", {
        detail: { isOpen: nextOpen },
      }),
    );
  };

  const handleNavClick = () => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200 md:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen flex-col overflow-hidden border-r border-white/15 shadow-2xl transition-all duration-300 md:sticky ${
          isOpen
            ? "w-[17.5rem] translate-x-0 opacity-100"
            : "w-0 -translate-x-full overflow-hidden p-0 opacity-0 md:translate-x-0 md:w-0 md:p-0 md:border-none"
        }`}
        style={{
          background: "linear-gradient(180deg, #0b1e46 0%, #102a64 45%, #16377e 100%)",
        }}
      >
        <div className="flex h-full min-h-0 flex-col px-3.5 py-4">
          
          {/* LOGO & CLOSE BUTTON */}
          <div className="mb-6 mt-1 flex items-center justify-between gap-3 px-2">
            <img
              src="/Vt.png"
              alt="VTIndex Logo"
              className="w-32 transition-transform drop-shadow-[0_0_15px_rgba(212,175,55,0.5)] hover:scale-105"
            />
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
              title="Close menu"
              aria-label="Close menu"
            >
              <X size={16} />
            </button>
          </div>

          {/* NAVIGATION LINKS */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 [-ms-overflow-style:'none'] [scrollbar-width:'none'] [&::-webkit-scrollbar]:hidden">
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const isActive = isNavItemActive(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href as any}
                    prefetch={true}
                    onClick={handleNavClick}
                    className={`group relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-[#d4af37] to-[#b38728] text-slate-950 shadow-lg translate-x-1 font-black"
                        : "text-blue-100/90 hover:bg-white/10 hover:text-white hover:border-white/15 border border-transparent"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-slate-950" />
                    )}

                    <Icon
                      size={17}
                      strokeWidth={isActive ? 2.5 : 2}
                      className={`shrink-0 transition-colors ${
                        isActive ? "text-slate-950" : "text-blue-200/80 group-hover:text-[#d4af37]"
                      }`}
                    />

                    <span className="min-w-0 flex-1 truncate">{item.label}</span>

                    <ChevronRight
                      size={14}
                      strokeWidth={2.5}
                      className={`shrink-0 transition-all ${
                        isActive
                          ? "text-slate-950 opacity-100"
                          : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 text-white"
                      }`}
                    />
                  </Link>
                );
              })}
            </nav>
          </div>

          

        </div>
      </aside>

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div 
            className="w-full max-w-sm rounded-2xl border border-white/15 p-5 shadow-2xl relative"
            style={{
              background: "linear-gradient(180deg, #0e2350 0%, #13306e 100%)",
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-300 shrink-0">
                <LogOut size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">Logout Confirmation</h3>
                <p className="text-[11px] text-blue-200/80">Are you sure you want to exit the admin portal session?</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={closeLogoutConfirm}
                disabled={logoutLoading}
                className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-colors border border-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={logoutLoading}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors shadow-md"
              >
                {logoutLoading ? "Logging out..." : "Confirm Logout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
