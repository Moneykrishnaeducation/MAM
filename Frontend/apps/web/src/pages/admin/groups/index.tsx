import React, { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import { toast } from "sonner";
import { useRouter } from "next/router";
import { Info, ShieldCheck, Sparkles, ChevronLeft, Search } from "lucide-react";

// Read the role cookie set by the backend on login
function getAdminRole(): string {
  try {
    const nameEQ = 'role=';
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i += 1) {
      const cookie = cookies[i].trim();
      if (cookie.indexOf(nameEQ) === 0) {
        return decodeURIComponent(cookie.substring(nameEQ.length)).trim();
      }
    }
  } catch (e) {}
  return '';
}

const isSuperAdminRole = (role: string) => role.toLowerCase() === 'superadmin';

function Badge({ label, alias, isActive, isDemo }: { label: string; alias?: string; isActive: boolean; isDemo: boolean }) {
  const baseClass =
    "inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-colors border";
  const activeClass = isActive
    ? isDemo
      ? "bg-[#2450b7]/40 text-[#8fb8ff] border-[#2450b7]"
      : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
    : "bg-white/5 text-white/40 border-white/5";

  return (
    <span className={`${baseClass} ${activeClass}`} title={label}>
      {alias || label}
    </span>
  );
}

function StatCard({ label, value, tone, icon: Icon }: { label: string; value: string | number; tone: string; icon?: any }) {
  return (
    <div className={`rounded-2xl border px-6 py-6 transition-all ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">{label}</div>
          <div className="mt-2 text-2xl font-black tracking-tighter text-white">{value}</div>
        </div>
        {Icon ? (
          <div className="rounded-xl bg-[#081d5f] border border-[#2450b7] p-3">
            <Icon size={18} className="text-[#d4af37]" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function GroupItem({
  group,
  onChange,
  onRadioChange,
  onAliasChange,
  onAliasLock,
  selectedDefault,
  selectedDemoDefault,
}: {
  group: any;
  onChange: (id: string) => void;
  onRadioChange: (id: string, type: string) => void;
  onAliasChange: (id: string, val: string) => void;
  onAliasLock: (id: string) => void;
  selectedDefault: string | null;
  selectedDemoDefault: string | null;
}) {
  return (
    <div className="rounded-[2rem] border p-6 transition-all duration-300 shadow-[0_30px_80px_rgba(4,15,54,0.3)] bg-[#081d5f] border-[#2450b7] hover:border-[#d4af37]/50">
      <div className="mb-4 rounded-2xl p-4 border flex items-center justify-between gap-2 bg-[#040f33] border-[#2450b7]">
        <div className="text-base font-black tracking-tight text-white">
          {group.id}
        </div>
        <div className="flex gap-2">
          <span className="rounded-full bg-[#d4af37]/20 border border-[#d4af37]/30 px-2.5 py-1 text-[9px] font-black tracking-widest text-[#d4af37] uppercase">MT5</span>
          {group.aliasLocked && (
            <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[9px] font-black uppercase text-red-500 border border-red-500/20">Locked</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-6">
        <label className="flex flex-col items-center justify-center gap-2 rounded-xl border p-3 text-[9px] font-black uppercase tracking-widest cursor-pointer transition-all border-[#2450b7] bg-[#0c1c59] text-[#8fb8ff] hover:bg-[#123283] hover:text-white shadow-inner">
          <input
            type="checkbox"
            checked={group.enabled}
            onChange={() => onChange(group.id)}
            className="h-4 w-4 cursor-pointer rounded accent-[#d4af37]"
          />
          Enabled
        </label>

        <label className="flex flex-col items-center justify-center gap-2 rounded-xl border p-3 text-[9px] font-black uppercase tracking-widest cursor-pointer transition-all border-[#2450b7] bg-[#0c1c59] text-[#8fb8ff] hover:bg-[#123283] hover:text-white shadow-inner">
          <input
            type="radio"
            checked={selectedDefault === group.id}
            onChange={() => onRadioChange(group.id, "default")}
            name={`defaultGroup-${group.id}`}
            className="h-4 w-4 cursor-pointer accent-[#d4af37]"
          />
          Default
        </label>

        <label className="flex flex-col items-center justify-center gap-2 rounded-xl border p-3 text-[9px] font-black uppercase tracking-widest cursor-pointer transition-all border-[#2450b7] bg-[#0c1c59] text-[#8fb8ff] hover:bg-[#123283] hover:text-white shadow-inner">
          <input
            type="radio"
            checked={selectedDemoDefault === group.id}
            onChange={() => onRadioChange(group.id, "demoDefault")}
            name={`demoDefaultGroup-${group.id}`}
            className="h-4 w-4 cursor-pointer accent-[#2450b7]"
          />
          Demo
        </label>
      </div>

      <div>
        <input
          type="text"
          value={group.alias}
          placeholder="Alias (e.g. Friendly Name)"
          disabled={group.aliasLocked}
          onChange={(e) => onAliasChange(group.id, e.target.value)}
          onBlur={() => onAliasLock(group.id)}
          className={`w-full rounded-2xl border px-5 py-3 text-sm font-bold outline-none transition-all border-[#2450b7] bg-[#0c1c59] text-white placeholder:text-[#8fb8ff]/40 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 shadow-inner ${group.aliasLocked ? "cursor-not-allowed opacity-40" : ""}`}
        />
      </div>
    </div>
  );
}

function GroupConfigurationGuideToggle() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="mt-6">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-[2rem] border px-8 py-6 text-left shadow-[0_14px_30px_rgba(4,15,54,0.3)] transition-all border-[#2450b7] bg-[#081d5f] hover:bg-[#123283]"
      >
        <span className="flex items-center gap-4 text-lg font-black uppercase tracking-tighter text-white">
          <Info size={20} className="text-[#d4af37]" />
          Group Configuration Guide
        </span>
        <span className="text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full border bg-[#040f33] border-[#2450b7] text-[#d4af37]">
          {isOpen ? "Hide Details" : "View Details"}
        </span>
      </button>

      {isOpen ? (
        <div className="mt-4 rounded-[2rem] border px-8 py-8 shadow-2xl animate-in slide-in-from-top-4 duration-300 border-[#2450b7] bg-[#040f33] text-white/80">
          <ol className="list-decimal space-y-4 text-sm font-medium leading-relaxed ml-4">
            <li><strong className="text-[#d4af37] uppercase tracking-widest text-[11px]">Alias Field:</strong> Optional display name for identifying groups easily in the CRM.</li>
            <li><strong className="text-[#d4af37] uppercase tracking-widest text-[11px]">Default Group:</strong> The primary group assigned to new live trading accounts.</li>
            <li><strong className="text-[#d4af37] uppercase tracking-widest text-[11px]">Demo Default Group:</strong> The primary group assigned to new demo trading accounts.</li>
            <li><strong className="text-[#d4af37] uppercase tracking-widest text-[11px]">Save Configuration:</strong> Commits all changes to the MT5 gateway.</li>
          </ol>
          <div className="mt-6 rounded-2xl border-l-4 border-[#d4af37] px-6 py-4 text-xs font-bold uppercase tracking-wide bg-[#d4af37]/10 text-[#d4af37]">
            Warning: Changes take effect immediately for all new account registrations.
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default function GroupConfiguration() {
  const router = useRouter();
  const [superuserCheckDone, setSuperuserCheckDone] = useState(false);
  const [isSuperuserUser, setIsSuperuserUser] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedDefault, setSelectedDefault] = useState<string | null>(null);
  const [selectedDemoDefault, setSelectedDemoDefault] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [showActiveConfig, setShowActiveConfig] = useState(false);
  const [groupSearch, setGroupSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchCurrentGroups = useCallback(async () => {
    const endpoint = "/api/current-group-config/";
    try {
      const res = await fetch(endpoint, {
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch ${endpoint}: ${res.status}`);
      }

      const resJson = await res.json();
      if (resJson.success && resJson.configuration) {
        const config = resJson.configuration;
        const realGroups = (config.real_groups || []).map((g: any) => ({
          id: g.id,
          label: g.name + (g.alias ? ` (${g.alias})` : ""),
          type: "real",
          enabled: true,
          alias: g.alias || "",
          aliasLocked: false,
        }));

        setGroups(realGroups);
        setSelectedDefault(config.default_group?.id || null);
        setSelectedDemoDefault(config.demo_group?.id || null);
        setLastUpdated(config.last_updated || new Date().toLocaleString());
      }
    } catch (err) {}
  }, []);

  const fetchAvailableGroups = useCallback(async () => {
    const endpoint = "/api/available-groups/?server_type=true";
    try {
      const res = await fetch(endpoint, {
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch ${endpoint}: ${res.status}`);
      }

      const data = await res.json();
      if (data.success && data.groups) {
        setGroups(
          data.groups
            .filter((g: any) => !g.is_demo)
            .map((g: any) => ({
              id: g.id,
              label: g.label,
              type: "real",
              enabled: g.enabled,
              alias: g.alias || "",
              is_default: g.is_default,
              is_demo_default: g.is_demo_default,
              aliasLocked: false,
            }))
        );

        setSelectedDefault(data.groups.find((g: any) => g.is_default)?.id || null);
        setSelectedDemoDefault(data.groups.find((g: any) => g.is_demo_default)?.id || null);
        setLastUpdated(new Date().toLocaleString());
      }
    } catch (err) {}
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await fetchCurrentGroups();
    await fetchAvailableGroups();
    setLoading(false);
  }, [fetchCurrentGroups, fetchAvailableGroups]);

  useEffect(() => {
    setIsSuperuserUser(isSuperAdminRole(getAdminRole()));
    setSuperuserCheckDone(true);
    loadData();
  }, [loadData]);


  const [syncing, setSyncing] = useState(false);

  const handleSyncFromMT5 = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/groups/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok && data.status === "ok") {
        toast.success("Groups synchronized directly from MT5 successfully!");
        await loadData();
      } else {
        toast.error(data.message || "Failed to synchronize groups from MT5");
      }
    } catch (err: any) {
      toast.error("Error syncing from MT5: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveGroupConfig = async (editableGroups = []) => {
    const endpoint = "/api/save-group-configuration/";

    if (!selectedDefault) {
      toast.error("Please select a Default group for real accounts.");
      return;
    }

    try {
      const payloadGroups = editableGroups.map((g: any) => ({
        id: g.id,
        enabled: g.enabled || g.id === selectedDefault,
        alias: g.alias ?? "",
        default: g.id === selectedDefault,
      }));

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groups: payloadGroups }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Failed to save group configuration");
        return;
      }

      toast.success("Group configuration saved successfully!");
      await loadData();
    } catch (err: any) {
      toast.error("Error saving configuration: " + err.message);
    }
  };

  const toggleEnable = (id: string) =>
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, enabled: !g.enabled } : g)));

  const changeDefault = (id: string, type: string) => {
    if (type === "default") {
      setSelectedDefault(id);
    } else if (type === "demoDefault") {
      setSelectedDemoDefault(id);
    }
  };

  const updateAlias = (id: string, alias: string) =>
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, alias } : g)));

  const onAliasLock = (groupId: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, aliasLocked: true } : g))
    );
  };

  const selectAll = groups.length > 0 && groups.every((g) => g.enabled);
  const toggleSelectAll = () =>
    setGroups((prev) => prev.map((g) => ({ ...g, enabled: !selectAll })));

  const filteredGroups = groups.filter((group) => {
    const query = groupSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      String(group.id || "").toLowerCase().includes(query) ||
      String(group.alias || "").toLowerCase().includes(query) ||
      String(group.label || "").toLowerCase().includes(query)
    );
  });

  const stats = {
    total: groups.length,
    enabled: groups.filter((g) => g.enabled).length,
    defaultGroup: selectedDefault,
    demoDefaultGroup: selectedDemoDefault,
  };

  if (loading) {
    return (
      <div className="min-h-[90vh] px-5 py-6 bg-[#0c1c59] text-white">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="h-24 animate-pulse rounded-[2rem] border border-[#2450b7] bg-[#081d5f]" />
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl border border-[#2450b7] bg-[#081d5f]" />
            ))}
          </div>
          <div className="h-40 animate-pulse rounded-[2rem] border border-[#2450b7] bg-[#081d5f]" />
          <div className="h-72 animate-pulse rounded-[2rem] border border-[#2450b7] bg-[#081d5f]" />
        </div>
      </div>
    );
  }

  if (superuserCheckDone && !isSuperuserUser) {
    return (
      <div className="flex min-h-[90vh] bg-[#0c1c59] items-center justify-center px-5 py-8 text-white">
        <div className="w-full max-w-xl rounded-[2.5rem] border p-12 text-center shadow-[0_30px_80px_rgba(4,15,54,0.3)] transition-all border-red-500/20 bg-[#081d5f]">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl animate-pulse bg-red-500/10">
            <ShieldCheck size={36} className="text-red-500" />
          </div>
          <h1 className="mt-8 text-4xl font-black uppercase tracking-tighter">Access Denied</h1>
          <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-[#8fb8ff]">
            Only superusers can access Group Configuration.
          </p>
          <button
            onClick={() => router.push("/admin/admin-users")}
            className="mt-10 w-full rounded-2xl bg-gradient-to-r from-red-600 to-red-500 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-xl hover:shadow-red-500/20 transition-all active:scale-95"
          >
            Return to Directory
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Group Management | Admin Portal</title>
      </Head>

      <div className="min-h-[90vh] px-4 py-6 md:p-8 text-white overflow-y-auto max-h-screen bg-[#0c1c59] relative">
        <div className="absolute top-0 right-1/4 h-[520px] w-[520px] rounded-full bg-[#d4af37]/5 blur-[120px] pointer-events-none" />
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 relative z-10">
          <header className="overflow-hidden transition-all rounded-[28px] border border-[#2450b7] bg-[linear-gradient(135deg,#0a2a80_0%,#092467_100%)] shadow-[0_24px_70px_rgba(4,15,54,0.35)]">
            <div className="flex flex-col gap-6 p-8 lg:flex-row lg:items-center lg:justify-between border-b border-[#2450b7]">
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => router.push("/admin/admin-users")}
                  className="inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-[#2450b7] bg-[#081d5f] text-[#8fb8ff] hover:bg-[#123283] hover:text-white"
                >
                  <ChevronLeft size={16} />
                  Back
                </button>
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tighter text-white">Group Management</h1>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d4af37] mt-1">Configure MT5 server groups and defaults</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-8 md:grid-cols-3 bg-black/10">
              <StatCard
                label="Total Groups"
                value={stats.total}
                tone="border-[#2450b7] bg-[#040f33]"
                icon={Sparkles}
              />
              <StatCard
                label="Enabled"
                value={stats.enabled}
                tone="border-emerald-500/20 bg-emerald-500/5"
                icon={ShieldCheck}
              />
              <StatCard
                label="Default"
                value={stats.defaultGroup || "None"}
                tone="border-[#d4af37]/20 bg-[#d4af37]/5"
              />
            </div>
          </header>

          <section className="rounded-[2.5rem] border p-8 shadow-[0_30px_80px_rgba(4,15,54,0.3)] transition-all border-[#2450b7] bg-[#081d5f]">
            <div
              className="flex cursor-pointer flex-col gap-4 md:flex-row md:items-start md:justify-between group"
              onClick={() => setShowActiveConfig((prev) => !prev)}
            >
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-[#040f33] border border-[#2450b7] p-4 text-[#d4af37] transition-transform group-hover:scale-110">
                  <Info size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tighter text-white">Active Configuration</h2>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-[#8fb8ff]">
                    Real-time snapshot of the primary group defaults.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className={`rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest border transition-all ${
                  showActiveConfig
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-[#040f33] text-[#d4af37] border-[#2450b7]"
                }`}>
                  {showActiveConfig ? "Expanded" : "Collapsed"}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#8fb8ff]/50">
                  Updated: {lastUpdated || "N/A"}
                </span>
              </div>
            </div>

            {showActiveConfig ? (
              <div className="mt-8 space-y-6 animate-in slide-in-from-top-4 duration-300">
                <div className="grid gap-4 md:grid-cols-1">
                  <div className="rounded-2xl border p-6 border-[#2450b7] bg-[#040f33]">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d4af37]">Current Real Default</div>
                    <div className="mt-2 text-3xl font-black tracking-tighter text-white">{selectedDefault || "Not assigned"}</div>
                  </div>
                </div>

                <div className="rounded-2xl border p-6 border-[#2450b7] bg-[#040f33]">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff] mb-4 px-1">Available Groups</div>
                  <div className="flex flex-wrap gap-2">
                    {groups.map((g) => (
                      <Badge
                        key={g.id}
                        label={g.id + (g.alias ? ` (${g.alias})` : "")}
                        alias={g.alias}
                        isActive={g.id === selectedDefault || g.id === selectedDemoDefault}
                        isDemo={g.type === "demo"}
                      />
                    ))}
                    {groups.length === 0 ? (
                      <span className="text-sm font-medium opacity-40 italic">
                        Initializing groups...
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <GroupConfigurationGuideToggle />

          <section className="rounded-[2.5rem] border p-8 shadow-[0_30px_80px_rgba(4,15,54,0.3)] transition-all border-[#2450b7] bg-[#081d5f]">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b pb-8 mb-8 border-[#2450b7]">
              <div>
                <h2 className="flex items-center gap-4 text-2xl font-black uppercase tracking-tighter text-white">
                  <span className="rounded-2xl bg-[#040f33] border border-[#2450b7] p-4 text-[#d4af37]">
                    <ShieldCheck size={24} />
                  </span>
                  Group Options
                </h2>
                <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-[#8fb8ff]">
                  Manage group visibility, alias overrides, and primary environment defaults.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="inline-flex items-center gap-3 rounded-xl border px-5 py-3 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all border-[#2450b7] bg-[#0c1c59] text-[#8fb8ff] hover:bg-[#123283] hover:text-white"
                >
                  <input
                    type="checkbox"
                    checked={selectAll}
                    readOnly
                    className="h-4 w-4 cursor-pointer rounded accent-[#d4af37]"
                  />
                  Select All
                </button>

                <div className="relative group">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d4af37] transition-transform group-focus-within:scale-110" />
                  <input
                    type="text"
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                    placeholder="Search groups..."
                    className="w-64 rounded-xl border pl-12 pr-5 py-3 text-[11px] font-black uppercase tracking-widest outline-none transition-all border-[#2450b7] bg-[#0c1c59] text-white placeholder:text-[#8fb8ff]/40 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 shadow-inner"
                  />
                </div>

                <button
                  type="button"
                  disabled={syncing}
                  className="inline-flex items-center justify-center gap-3 rounded-xl bg-[linear-gradient(135deg,#0c1c59_0%,#123283_100%)] px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white border border-[#2450b7] shadow-xl hover:bg-[#1745b3] active:scale-95 disabled:opacity-50"
                  onClick={handleSyncFromMT5}
                >
                  {syncing ? "Syncing..." : "Sync from MT5"}
                </button>

                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-3 rounded-xl bg-[linear-gradient(135deg,#e0b01d_0%,#c99508_100%)] px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-[#d4af37]/20 transition-all hover:scale-[1.02] active:scale-95"
                  onClick={() => handleSaveGroupConfig(groups as any)}
                >
                  Save Changes
                </button>
              </div>
            </div>

            <div className="group-options-scroll max-h-[68vh] overflow-y-auto pr-2">
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredGroups.map((group) => (
                  <GroupItem
                    key={group.id}
                    group={group}
                    onChange={toggleEnable}
                    onRadioChange={changeDefault}
                    onAliasChange={updateAlias}
                    onAliasLock={onAliasLock}
                    selectedDefault={selectedDefault}
                    selectedDemoDefault={selectedDemoDefault}
                  />
                ))}
                {groups.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#2450b7] p-12 text-center text-[10px] font-black uppercase tracking-widest md:col-span-2 xl:col-span-3 text-[#8fb8ff]">
                    No editable groups discovered.
                  </div>
                ) : filteredGroups.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#2450b7] p-12 text-center text-[10px] font-black uppercase tracking-widest md:col-span-2 xl:col-span-3 text-[#8fb8ff]">
                    No matches for "{groupSearch}"
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
