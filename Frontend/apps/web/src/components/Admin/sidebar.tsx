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

  const [userRole, setUserRole] = useState("");

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

  const requestLogout = () => {
    setShowLogoutConfirm(true);
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
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[1px] animate-in fade-in duration-200 md:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen flex-col overflow-hidden border-r border-white/10 shadow-[12px_0_40px_rgba(4,10,25,0.25)] transition-all duration-300 md:sticky
          ${
            isOpen
              ? "w-[18rem] translate-x-0 opacity-100"
              : "w-0 -translate-x-full overflow-hidden p-0 opacity-0 md:translate-x-0 md:w-0 md:p-0 md:border-none"
          }
        `}
        style={{
          background:
            "radial-gradient(circle at 18% 0%, rgba(255,255,255,0.08), transparent 34%), linear-gradient(180deg, #07122a 0%, #0c2457 45%, #173f8e 100%)",
        }}
      >
        <div className="flex h-full min-h-0 flex-col px-3 py-4">
          <div className="mb-8 mt-2 flex items-center justify-between gap-3 px-2">
                    <img
                      src="/Vt.png"
                      alt="VTIndex Logo"
                      className="w-32 transition-transform drop-shadow-[0_0_15px_rgba(201,162,39,0.4)] hover:scale-[1.05]"
                    />
                    <button
                      type="button"
                      onClick={() => setSidebarOpen(false)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-200/70 transition-colors hover:bg-white/10 hover:text-white"
                      title="Close menu"
                      aria-label="Close menu"
                    >
                        <X size={18} />
                      </button>
                    </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1 [-ms-overflow-style:'none'] [scrollbar-width:'none'] [&::-webkit-scrollbar]:hidden">
            <nav className="space-y-2">
              {navItems.map((item) => {
                const isActive = isNavItemActive(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href as any}
                    prefetch={true}
                    onClick={handleNavClick}
                    className={`group relative flex w-full items-center gap-3.5 overflow-hidden rounded-[22px] px-4 py-3.5 text-[0.8rem] font-extrabold uppercase  transition-all duration-300 ${
                      isActive
                        ? "border border-[#556cc3]/65 bg-[linear-gradient(180deg,#324b9d_0%,#253a7c_100%)] text-[#f5c84b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_32px_rgba(0,0,0,0.28)] translate-x-1"
                        : "border border-transparent text-slate-100/86 hover:border-white/10 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-3 bottom-3 w-1 rounded-full bg-white" />
                    )}

                    <Icon
                      size={20}
                      strokeWidth={isActive ? 2.35 : 2}
                      className={`shrink-0 transition-colors duration-300 ${
                        isActive ? "text-[#f5c84b]" : "text-slate-300/75 group-hover:text-white"
                      }`}
                    />

                    <span className="min-w-0 flex-1 truncate">{item.label}</span>

                    <ChevronRight
                      size={15}
                      strokeWidth={2.5}
                      className={`shrink-0 transition-all duration-300 ${
                        isActive
                          ? "text-[#f5c84b]/75"
                          : "translate-x-[-4px] text-white/0 opacity-0 group-hover:translate-x-0 group-hover:text-white/70 group-hover:opacity-100"
                      }`}
                    />
                  </Link>
                );
              })}
            </nav>

            {/* <div className="mt-5 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={requestLogout}
                className="group flex w-full items-center gap-3 rounded-[20px] border border-white/10 bg-black/10 px-4 py-3.5 text-left text-[12px] font-extrabold uppercase tracking-[0.22em] text-slate-100/85 transition-all duration-300 hover:-translate-x-1 hover:bg-white/10 hover:text-white"
              >
                <LogOut size={19} className="shrink-0 text-slate-300/75 transition-colors group-hover:text-white" />
                <span className="min-w-0 flex-1 truncate">Logout</span>
                <ChevronRight
                  size={15}
                  strokeWidth={2.5}
                  className="shrink-0 text-white/35 transition-colors group-hover:text-white/70"
                />
              </button>
            </div> */}
          </div>
        </div>
      </aside>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-md">
          <div className="w-[min(92vw,28rem)] animate-in fade-in zoom-in-95 rounded-3xl border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.25)] duration-200">
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-extrabold text-slate-900">Logout confirmation</div>
                  <p className="mt-1 text-sm text-slate-600">
                    Are you sure you want to logout from the admin panel?
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeLogoutConfirm}
                  disabled={logoutLoading}
                  className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
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
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  disabled={logoutLoading}
                  className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-extrabold text-white shadow-lg shadow-blue-500/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {logoutLoading ? "Logging out..." : "OK"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
