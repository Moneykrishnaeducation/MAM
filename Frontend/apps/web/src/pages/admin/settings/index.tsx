import React, { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { 
  Server, 
  ShieldCheck, 
  Lock, 
  Globe, 
  Key, 
  Eye,
  EyeOff,
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  ShieldAlert,
  Copy,
  User,
  Info,
  Save,
  X,
  Edit3
} from "lucide-react";

// Helper to get cookie value
function getCookie(name: string): string {
  try {
    const nameEQ = name + "=";
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i].trim();
      if (cookie.indexOf(nameEQ) === 0) {
        return decodeURIComponent(cookie.substring(nameEQ.length));
      }
    }
  } catch {}
  return '';
}

// Check if user is superuser
function isSuperuser(): boolean {
  try {
    const userCookie = getCookie('user');
    if (userCookie) {
      const user = JSON.parse(userCookie);
      return user?.is_superuser === true || user?.is_superuser === 'true';
    }
  } catch {}
  return false;
}

const PASSWORD_MASK = '••••••••';

const validateServerData = (data: any, { requirePassword = true } = {}) => {
  const errors: any = {};
  if (!data.serverIP || !String(data.serverIP).trim()) errors.serverIP = 'Server IP / Address is required';
  if (!data.loginID || !String(data.loginID).trim()) errors.loginID = 'Manager Login ID is required';
  if (requirePassword && (!data.password || !String(data.password).trim())) errors.password = 'Master Password is required';
  return errors;
};

const FormSkeleton = () => (
  <div className="animate-pulse space-y-6">
    <div className="h-4 bg-gray-700/20 rounded w-1/4 mb-2" />
    <div className="h-14 bg-gray-700/10 rounded-2xl w-full" />
    <div className="h-4 bg-gray-700/20 rounded w-1/4 mb-2" />
    <div className="h-14 bg-gray-700/10 rounded-2xl w-full" />
    <div className="h-4 bg-gray-700/20 rounded w-1/4 mb-2" />
    <div className="h-14 bg-gray-700/10 rounded-2xl w-full" />
    <div className="h-12 bg-gray-700/20 rounded-2xl w-full mt-6" />
  </div>
);

const InputField = ({ label, icon: Icon, name, value, onChange, disabled, type = "text", isEditing, error, placeholder, showToast }: any) => {
  const [revealed, setRevealed] = useState(false);
  const idRef = useRef(`input-${name}-${Math.random().toString(36).slice(2,8)}`);
  const inputType = type === 'password' ? (revealed ? 'text' : 'password') : type;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value || '');
      showToast(`${label} copied`, 'success');
    } catch (err) {
      showToast('Copy failed', 'error');
    }
  };

  useEffect(() => {
    if (!isEditing) setRevealed(false);
  }, [isEditing]);

  const autoComplete = type === 'password' ? 'current-password' : (name === 'loginID' ? 'username' : 'off');

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 px-1 flex items-center gap-2">
        <Icon className="w-3 h-3 text-yellow-500" /> {label}
      </label>
      <div className="relative group">
        <input
          id={idRef.current}
          aria-label={label}
          type={inputType}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`w-full px-5 pr-28 py-4 text-sm font-bold rounded-2xl border transition-all outline-none ${
            isEditing 
              ? 'bg-black/40 border-yellow-500/30 text-white placeholder-gray-600 focus:border-yellow-500/60 focus:bg-black/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]' 
              : 'bg-white/5 border-white/5 text-gray-400 cursor-not-allowed opacity-60'
          } ${error ? 'border-red-500/50' : ''}`}
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {type === 'password' && isEditing && (
            <button
              type="button"
              onClick={() => setRevealed(r => !r)}
              className="p-1 text-gray-400 hover:text-gray-200"
            >
              {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
          {value && type !== 'password' && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCopy(); }}
              className="p-1 text-gray-400 hover:text-gray-200"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
          {!isEditing && (
            <Lock className="w-4 h-4 opacity-20" />
          )}
        </div>
      </div>
      {error && <p className="text-xs text-red-500 mt-1 font-medium">{error}</p>}
    </div>
  );
};

const ServerCard = ({ serverType = true, Icon, title, showToast }: any) => {
  const [settingId, setSettingId] = useState<number | null>(null);
  const [data, setData] = useState({ serverIP: '', loginID: '', password: '', serverName: '' });
  const [original, setOriginal] = useState<any>(null);
  const [loadingLocal, setLoadingLocal] = useState(true);
  const [savingLocal, setSavingLocal] = useState(false);
  const [isEditingLocal, setIsEditingLocal] = useState(false);
  const [errorsLocal, setErrorsLocal] = useState<any>({});
  const [passwordEdited, setPasswordEdited] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const hasChanges = () => {
    if (!original) return true;
    if (data.serverIP !== original.serverIP) return true;
    if (data.loginID !== original.loginID) return true;
    if (data.serverName !== original.serverName) return true;
    if (passwordEdited) return true;
    return false;
  };

  const fetchData = async () => {
    setLoadingLocal(true);
    try {
      const res = await fetch(`/api/admin/server-settings?server_type=${serverType}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const body = await res.json();
      if (body.status === 'ok' && body.server_settings && body.server_settings.length > 0) {
        const item = body.server_settings[0];
        const mapped = {
          serverIP: item.server_ip || '',
          loginID: item.real_account_login || '',
          password: PASSWORD_MASK,
          serverName: item.server_name_client || '',
        };
        setSettingId(item.id);
        setHasPassword(true);
        setLastUpdated(item.updated_at || item.created_at || null);
        setData(mapped);
        setOriginal(mapped);
      } else {
        const defaultData = { serverIP: '', loginID: '', password: '', serverName: '' };
        setData(defaultData);
        setOriginal(defaultData);
        setHasPassword(false);
      }
    } catch (err: any) {
      showToast(err.message || `Error loading ${title} settings`, 'error');
    } finally {
      setLoadingLocal(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [serverType, title]);

  const handleChangeLocal = (e: any) => {
    const { name, value } = e.target;
    if (name === 'password') {
      setPasswordEdited(true);
      setData(prev => ({ ...prev, password: value }));
      setErrorsLocal((prev: any) => ({ ...prev, password: null }));
      return;
    }
    setData({ ...data, [name]: value });
    setErrorsLocal((prev: any) => ({ ...prev, [name]: null }));
  };

  const handleEditToggleLocal = () => {
    if (isEditingLocal) {
      if (hasChanges()) {
        if (!window.confirm('Discard unsaved changes?')) return;
      }
      setData(original);
      setErrorsLocal({});
      setPasswordEdited(false);
      setIsEditingLocal(false);
      return;
    }

    if (hasPassword && data.password === PASSWORD_MASK) {
      setData(prev => ({ ...prev, password: '' }));
      setPasswordEdited(false);
    }
    setIsEditingLocal(true);
  };

  const handleSubmitLocal = async (e: any) => {
    e.preventDefault();
    const validation = validateServerData(data, { requirePassword: passwordEdited || !hasPassword });
    if (Object.keys(validation).length) {
      setErrorsLocal(validation);
      showToast('Please fix validation errors', 'error');
      return;
    }
    setSavingLocal(true);
    try {
      const payload: any = {
        server_ip: data.serverIP,
        real_account_login: data.loginID,
        server_name_client: data.serverName,
        server_type: serverType,
      };
      if (passwordEdited) {
        payload.real_account_password = data.password;
      }

      let url = '/api/admin/server-settings';
      let method = 'POST';
      if (settingId) {
        url = `/api/admin/server-settings/${settingId}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      if (!res.ok || body.status !== 'ok') {
        throw new Error(body.message || 'Failed to save configuration');
      }

      const saved = body.server_setting || body;
      const updated = {
        serverIP: saved.server_ip || data.serverIP,
        loginID: saved.real_account_login || data.loginID,
        password: PASSWORD_MASK,
        serverName: saved.server_name_client || data.serverName,
      };
      setSettingId(saved.id || settingId);
      setOriginal(updated);
      setData(updated);
      setIsEditingLocal(false);
      setErrorsLocal({});
      setPasswordEdited(false);
      setHasPassword(true);
      setLastUpdated(new Date().toISOString());
      showToast(`${title} updated successfully!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSavingLocal(false);
    }
  };

  const iconBgClass = serverType ? 'bg-emerald-500/10' : 'bg-blue-500/10';
  const iconTextClass = serverType ? 'text-emerald-400' : 'text-blue-400';
  const badgeClass = serverType ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  const submitGradient = serverType ? 'from-yellow-600 to-yellow-500' : 'from-blue-600 to-blue-500';
  const editIconColor = serverType ? 'text-yellow-500' : 'text-blue-500';

  return (
    <div className="relative rounded-[2.5rem] p-8 border bg-slate-900/40 border-white/5 shadow-2xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className={`${iconBgClass} p-2 rounded-lg`}>
            <Icon className={`w-5 h-5 ${iconTextClass}`} />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-white">{title}</h2>
            {lastUpdated && (
              <p className="text-xs text-white/40 mt-1">Last updated: {new Date(lastUpdated).toLocaleString()}</p>
            )}
          </div>
        </div>
        <span className={`px-3 py-1 ${badgeClass} text-[10px] font-black uppercase tracking-widest rounded-full border`}>
          Active
        </span>
      </div>

      {loadingLocal ? <FormSkeleton /> : (
        <form onSubmit={handleSubmitLocal} className="space-y-6">
          <InputField label="Server IP / Address" icon={Globe} name="serverIP" value={data.serverIP} onChange={handleChangeLocal} disabled={!isEditingLocal || savingLocal} isEditing={isEditingLocal} error={errorsLocal.serverIP} placeholder="host:port (e.g. mt5.example.com:443)" showToast={showToast} />
          <InputField label="Manager Login ID" icon={User} name="loginID" value={data.loginID} onChange={handleChangeLocal} disabled={!isEditingLocal || savingLocal} isEditing={isEditingLocal} error={errorsLocal.loginID} placeholder="Manager login ID" showToast={showToast} />
          <InputField label="Master Password" icon={Key} name="password" value={data.password} onChange={handleChangeLocal} disabled={!isEditingLocal || savingLocal} isEditing={isEditingLocal} type="password" error={errorsLocal.password} placeholder="••••••••" showToast={showToast} />
          <InputField label="Display Name" icon={Server} name="serverName" value={data.serverName} onChange={handleChangeLocal} disabled={!isEditingLocal || savingLocal} isEditing={isEditingLocal} error={errorsLocal.serverName} placeholder="Friendly name (e.g. MT5 Live)" showToast={showToast} />

          <div className="pt-4 grid grid-cols-2 gap-4">
            {isEditingLocal ? (
              <>
                <button
                  type="button"
                  onClick={handleEditToggleLocal}
                  disabled={savingLocal}
                  className="flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all bg-slate-800 border-white/5 text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button
                  type="submit"
                  disabled={!hasChanges() || savingLocal}
                  className={`flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r ${submitGradient} text-white font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50`}
                >
                  {savingLocal ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {savingLocal ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button 
                type="button" 
                onClick={handleEditToggleLocal} 
                className="col-span-2 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all bg-slate-800/40 border-slate-700/50 text-slate-350 hover:bg-slate-800/60 hover:shadow-lg"
              >
                <Edit3 className={`w-4 h-4 ${editIconColor}`} /> Unlock & Edit
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
};

export default function AdminSettingsPage() {
  const router = useRouter();
  const [superuserCheckDone, setSuperuserCheckDone] = useState(false);
  const [isSuperuserUser, setIsSuperuserUser] = useState(false);
  const [toast, setToast] = useState<any>(null);
  const [showGuidelines, setShowGuidelines] = useState(false);

  const showToast = (message: string, variant: string = 'success') => {
    setToast({ message, variant });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    setIsSuperuserUser(isSuperuser());
    setSuperuserCheckDone(true);
  }, []);

  if (superuserCheckDone && !isSuperuserUser) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center p-4 bg-[#050505] text-white">
        <div className="max-w-md w-full p-10 rounded-[2.5rem] text-center border transition-all bg-slate-900 border-red-500/20 shadow-2xl">
          <div className="w-24 h-24 mx-auto mb-8 rounded-3xl flex items-center justify-center animate-pulse bg-red-500/10">
            <ShieldAlert className="w-12 h-12 text-red-500" />
          </div>
          
          <h1 className="text-3xl font-black tracking-tighter mb-4 text-white">Access Denied</h1>
          <p className="text-sm font-medium leading-relaxed mb-10 text-white/60">
            Administrative settings are restricted to superusers only. Please contact your system administrator for access.
          </p>
          
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 text-white font-black text-sm uppercase tracking-widest hover:shadow-lg hover:shadow-red-500/20 transition-all active:scale-95"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>MT5 Core Settings | Admin Portal</title>
      </Head>

      <div className="w-full max-h-screen overflow-y-auto text-white">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl shadow-inner bg-yellow-400/10">
                <Server className="w-8 h-8 text-yellow-500" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tighter uppercase text-white">MT5 Core Settings</h1>
                <p className="text-sm font-medium text-white/60">
                  Configure master credentials for MT5 Live and Demo gateways
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowGuidelines(prev => !prev)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all bg-slate-900 hover:bg-slate-800 text-white border border-white/5"
            >
              <Info className="w-4 h-4" />
              {showGuidelines ? 'Hide Protocols' : 'Show Protocols'}
            </button>
          </div>

          {/* Protocols Info Box */}
          {showGuidelines && (
            <div className="mb-12 p-8 rounded-[2rem] border shadow-2xl bg-slate-900/30 border-blue-500/10 animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400">
                  <Info className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-black tracking-tighter text-white">Security Protocols</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                {[
                  { label: 'Master Access', text: 'These credentials grant full manager-level control over the MT5 gateway.' },
                  { label: 'IP White-listing', text: 'Ensure the production server IP is whitelisted in your MT5 firewall.' },
                  { label: 'Encryption', text: 'Passwords are encrypted at rest and never logged in plain text.' },
                  { label: 'Environment Sync', text: 'Live and Demo environments are kept strictly separate.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                    <div>
                      <p className="font-black text-xs uppercase tracking-widest mb-1 text-white">{item.label}</p>
                      <p className="text-sm text-white/60 font-medium">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <ServerCard serverType={true} Icon={ShieldCheck} title="Live Environment" showToast={showToast} />
            <ServerCard serverType={false} Icon={Lock} title="Demo Environment" showToast={showToast} />
          </div>

          {/* Toast notifications */}
          {toast && (
            <div className="fixed top-20 right-8 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
              <div className={`w-auto max-w-xs px-5 py-3 rounded-2xl flex items-start gap-3 border transition-shadow shadow-2xl ${
                toast.variant === 'error' 
                  ? 'bg-red-600 border-red-500 text-white' 
                  : 'bg-green-600 border-green-500 text-white'
              }`}>
                {toast.variant === 'error' ? <AlertCircle className="w-5 h-5 mt-0.5" /> : <CheckCircle className="w-5 h-5 mt-0.5" />}
                <div className="flex-1">
                  <div className="text-sm font-black tracking-tight">{toast.message}</div>
                </div>
                <button type="button" onClick={() => setToast(null)} className="p-1 ml-2 rounded hover:bg-white/10">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
