import React, { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Info, ShieldCheck, Sparkles, ChevronLeft, Save } from "lucide-react";

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

function GroupItem({
  group,
  onChange,
  onRadioChange,
  onAliasChange,
  onAliasLock,
  selectedDefault,
}: {
  group: any;
  onChange: (id: string) => void;
  onRadioChange: (id: string) => void;
  onAliasChange: (id: string, val: string) => void;
  onAliasLock: (id: string) => void;
  selectedDefault: string | null;
}) {
  return (
    <div className="rounded-[2rem] border p-6 transition-all duration-300 shadow-[0_30px_80px_rgba(4,15,54,0.3)] bg-[#081d5f] border-[#2450b7] hover:border-[#d4af37]/50">
      <div className="mb-4 rounded-2xl p-4 border flex items-center justify-between gap-2 bg-[#040f33] border-[#2450b7]">
        <div className="text-base font-black tracking-tight text-white">
          {group.id}
        </div>
        <div className="flex gap-2">
          <span className="rounded-full bg-[#2450b7]/40 border border-[#2450b7] px-2.5 py-1 text-[9px] font-black tracking-widest text-[#8fb8ff] uppercase">MT5</span>
          {group.aliasLocked && (
            <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[9px] font-black uppercase text-red-500 border border-red-500/20">Locked</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-6">
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
            onChange={() => onRadioChange(group.id)}
            name={`demoDefaultGroup-${group.id}`}
            className="h-4 w-4 cursor-pointer accent-[#d4af37]"
          />
          Demo Default
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

export default function GroupConfigurationDemo() {
  const router = useRouter();
  const [superuserCheckDone, setSuperuserCheckDone] = useState(false);
  const [isSuperuserUser, setIsSuperuserUser] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedDefault, setSelectedDefault] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAvailableGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/demo-available-groups/", {
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`demo-available-groups returned ${res.status}`);
      const data = await res.json();

      const serverGroups = (data.groups || []).map((g: any) => ({
        id: g.id || g,
        label: g.label || g.name || g,
        type: "demo",
        enabled: g.enabled ?? false,
        alias: g.alias || "",
        is_demo_default: g.is_demo_default,
        aliasLocked: false,
      }));

      setGroups(serverGroups);
      const demoDefault = serverGroups.find((g: any) => g.is_demo_default);
      setSelectedDefault(demoDefault?.id || serverGroups[0]?.id || null);
    } catch (err) {
      try {
        const res = await fetch("/api/current-group-config/", {
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          const resJson = await res.json();
          if (resJson.success && resJson.configuration) {
            const config = resJson.configuration;
            const demoGroups = (config.demo_groups || []).map((g: any) => ({
              id: g.id,
              label: g.name + (g.alias ? ` (${g.alias})` : ""),
              type: "demo",
              enabled: true,
              alias: g.alias || "",
              aliasLocked: false,
            }));
            setGroups(demoGroups);
            setSelectedDefault(config.demo_group?.id || null);
          }
        }
      } catch (_) {}
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsSuperuserUser(isSuperAdminRole(getAdminRole()));
    setSuperuserCheckDone(true);
    fetchAvailableGroups();
  }, [fetchAvailableGroups]);


  const handleChange = (id: string) => {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, enabled: !g.enabled } : g)));
  };

  const handleRadioChange = (id: string) => {
    setSelectedDefault(id);
  };

  const handleAliasChange = (id: string, val: string) => {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, alias: val } : g)));
  };

  const handleAliasLock = (id: string) => {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, aliasLocked: true } : g)));
  };

  const handleSaveGroupConfig = async () => {
    if (!selectedDefault) {
      alert('Please select a Demo Default group before saving.');
      return;
    }
    const endpoint = "/api/save-demo-group-configuration/";
    const payloadGroups = groups.map((g) => ({
      id: g.id,
      enabled: g.enabled,
      alias: g.alias ?? '',
      demo_default: g.id === selectedDefault,
    }));
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups: payloadGroups }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Demo group configuration saved. Default: ${data.demo_default_group}`);
      } else {
        alert(`Save failed: ${data.message}`);
      }
    } catch (e) {
      alert('Failed to save demo configuration.');
    }
  };

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
        <title>Demo Group Management | Admin Portal</title>
      </Head>

      <div className="min-h-[90vh] px-4 py-6 md:p-8 text-white overflow-y-auto max-h-screen bg-[#0c1c59] relative">
        <div className="absolute top-0 right-1/4 h-[520px] w-[520px] rounded-full bg-[#d4af37]/5 blur-[120px] pointer-events-none" />
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 relative z-10">
          <header className="overflow-hidden transition-all rounded-[28px] border border-[#2450b7] bg-[linear-gradient(135deg,#0a2a80_0%,#092467_100%)] shadow-[0_24px_70px_rgba(4,15,54,0.35)]">
            <div className="flex flex-col gap-6 p-8 lg:flex-row lg:items-center lg:justify-between">
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
                  <h1 className="text-2xl font-black uppercase tracking-tighter text-white">Demo Group Management</h1>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d4af37] mt-1">Configure MT5 demo server groups and defaults</p>
                </div>
              </div>
            </div>
          </header>

          <section className="rounded-[2.5rem] border p-8 shadow-[0_30px_80px_rgba(4,15,54,0.3)] transition-all border-[#2450b7] bg-[#081d5f]">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b pb-8 mb-8 border-[#2450b7]">
              <div>
                <h2 className="flex items-center gap-4 text-2xl font-black uppercase tracking-tighter text-white">
                  <span className="rounded-2xl bg-[#040f33] border border-[#2450b7] p-4 text-[#d4af37]">
                    <Sparkles size={24} />
                  </span>
                  Demo Group Options
                </h2>
                <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-[#8fb8ff]">
                  Manage group visibility, alias overrides, and demo environment defaults.
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-3 rounded-xl bg-[linear-gradient(135deg,#e0b01d_0%,#c99508_100%)] px-8 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-[#d4af37]/20 transition-all hover:scale-[1.02] active:scale-95"
                onClick={handleSaveGroupConfig}
              >
                <Save size={16} />
                Save Changes
              </button>
            </div>

            {loading ? (
              <div className="p-20 text-center">
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#0c1c59] border-t-[#d4af37]" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8fb8ff]">Loading demo groups...</p>
              </div>
            ) : (
              <div className="mt-6 max-h-[68vh] overflow-y-auto pr-2">
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {groups.map((g) => (
                    <GroupItem
                      key={g.id}
                      group={g}
                      onChange={handleChange}
                      onRadioChange={handleRadioChange}
                      onAliasChange={handleAliasChange}
                      onAliasLock={handleAliasLock}
                      selectedDefault={selectedDefault}
                    />
                  ))}
                  {groups.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-[#2450b7] p-12 text-center text-[10px] font-black uppercase tracking-widest md:col-span-2 xl:col-span-3 text-[#8fb8ff]">
                      No demo groups discovered.
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
