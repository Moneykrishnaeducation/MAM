import React, { useState } from 'react';
import Head from 'next/head';
import { 
  Users, 
  Search, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  TrendingUp, 
  User, 
  CreditCard, 
  ArrowUpRight, 
  Ticket, 
  PlusCircle, 
  Trash2, 
  Power,
  Building,
  Wallet,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { getAdminUsers } from '@/lib/mockDataLoader';
import CreateUserModalForm from '@/components/Admin/CreateUserModalForm';
import { type CreateUserFormData, type UserData } from '@/types/user';
import { type UserModalType } from '@/types/userModal';

export default function AdminUsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>('USR-001');
  
  // Modal State
  const [activeModalUser, setActiveModalUser] = useState<UserData | null>(null);
  const [activeModalType, setActiveModalType] = useState<UserModalType>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load state from single mockData.json with live backend API override
  const [users, setUsers] = useState<UserData[]>(getAdminUsers() as UserData[]);

  React.useEffect(() => {
    fetch('/api/admin/users')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.users && Array.isArray(data.users)) {
          setUsers(data.users);
        }
      })
      .catch(() => {});
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const toggleDropdownRow = (userId: string) => {
    setExpandedRowId(prev => prev === userId ? null : userId);
  };

  const openSubRowModal = (user: UserData | null, type: UserModalType) => {
    setActiveModalUser(user);
    setActiveModalType(type);
  };

  const closeModal = () => {
    setActiveModalUser(null);
    setActiveModalType(null);
  };

  const handleCreateUserSubmit = async (formData: CreateUserFormData) => {
    try {
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || '',
          role: formData.role || 'Client User',
          country: formData.country || 'United States',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || 'Failed to create user');
        return;
      }
      setUsers(prev => [data.user, ...prev]);
      closeModal();
      showToast(`User ${data.user.name} created successfully!`);
    } catch {
      showToast('Network error — could not create user');
    }
  };

  const toggleUserActiveStatus = (userId: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const nextStatus = u.status === 'Active' ? 'Suspended' : 'Active';
        const updated = { ...u, status: nextStatus as UserData['status'] };
        if (activeModalUser?.id === userId) {
          setActiveModalUser(updated);
        }
        showToast(`User ${u.name} status changed to ${nextStatus}`);
        return updated;
      }
      return u;
    }));
  };

  const toggleVerification = (userId: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const nextState = !u.verified;
        const updated = { ...u, verified: nextState };
        if (activeModalUser?.id === userId) {
          setActiveModalUser(updated);
        }
        showToast(`User ${u.name} verification set to ${nextState ? 'Verified' : 'Unverified'}`);
        return updated;
      }
      return u;
    }));
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    closeModal();
    showToast(`User ${userName} deleted successfully`);
  };

  const handleAddAccountSubmit = (userName: string) => {
    closeModal();
    showToast(`New MT5 Live Account initialized for ${userName}`);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Head>
        <title>Users Directory | Admin Portal</title>
      </Head>

        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
                <Users size={13} /> User Management
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Users Directory</h1>
              <p className="text-slate-400 text-sm mt-1">
                Data loaded dynamically from mockData.json. Expand rows for dropdown controls and popup modals.
              </p>
            </div>
            <button 
              onClick={() => openSubRowModal(null, 'create_user')}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md self-start md:self-auto"
            >
              <Plus size={16} /> Add New User
            </button>
          </div>

          {toastMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-300 text-xs font-semibold flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-blue-400" /> {toastMessage}
              </span>
              <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">&times;</button>
            </div>
          )}

          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3 bg-slate-800/60 px-4 py-2.5 rounded-2xl w-72 md:w-96 border border-slate-700/50">
                <Search size={16} className="text-slate-400 shrink-0" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, email, or user ID..." 
                  className="bg-transparent border-none text-xs text-white outline-none w-full placeholder-slate-500" 
                />
              </div>
              <span className="text-xs text-slate-400 font-medium">Total Accounts: <strong className="text-white">{filteredUsers.length}</strong></span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="pb-3 pl-2 font-semibold">User ID</th>
                    <th className="pb-3 font-semibold">Name & Email</th>
                    <th className="pb-3 font-semibold">Role</th>
                    <th className="pb-3 font-semibold">Verification</th>
                    <th className="pb-3 font-semibold">Account Status</th>
                    <th className="pb-3 font-semibold">Joined</th>
                    <th className="pb-3 pr-2 text-right font-semibold">Options Dropdown</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.map((u) => {
                    const isExpanded = expandedRowId === u.id;

                    return (
                      <React.Fragment key={u.id}>
                        <tr 
                          onClick={() => toggleDropdownRow(u.id)}
                          className={`cursor-pointer transition-colors ${
                            isExpanded ? 'bg-slate-800/60' : 'hover:bg-slate-800/30'
                          }`}
                        >
                          <td className="py-4 pl-2 font-mono text-blue-400 font-bold">{u.id}</td>
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <img src={u.avatar} alt={u.name} className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-700" />
                              <div>
                                <div className="font-bold text-slate-100">{u.name}</div>
                                <div className="text-[11px] text-slate-400">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 text-slate-300 font-medium">{u.role}</td>
                          <td className="py-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              u.verified 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              {u.verified ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                              {u.verified ? 'Verified' : 'Unverified'}
                            </span>
                          </td>
                          <td className="py-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              u.status === 'Active' 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}>
                              {u.status === 'Active' ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                              {u.status}
                            </span>
                          </td>
                          <td className="py-4 text-slate-400">{u.joined}</td>
                          <td className="py-4 pr-2 text-right">
                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleDropdownRow(u.id); }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors"
                            >
                              <span>Sub-Row Menu</span>
                              {isExpanded ? <ChevronUp size={14} className="text-blue-400" /> : <ChevronDown size={14} />}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-slate-900/90 border-b border-slate-800">
                            <td colSpan={7} className="p-4 sm:p-5">
                              <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-4 shadow-inner">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                                  <span>User Management Sub-Actions for <strong className="text-white">{u.name}</strong></span>
                                  <span className="text-slate-600">•</span>
                                  <span className="text-blue-400">Click any item to open Popup Modal</span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2.5">
                                  <button onClick={() => openSubRowModal(u, 'verifi')} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-blue-600/20 text-slate-200 hover:text-blue-300 border border-slate-800 hover:border-blue-500/40 text-xs font-semibold transition-all">
                                    <ShieldCheck size={15} className="text-blue-400" /> <span>Verifi</span>
                                  </button>
                                  <button onClick={() => openSubRowModal(u, 'trading')} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-blue-600/20 text-slate-200 hover:text-blue-300 border border-slate-800 hover:border-blue-500/40 text-xs font-semibold transition-all">
                                    <TrendingUp size={15} className="text-emerald-400" /> <span>Trading</span>
                                  </button>
                                  <button onClick={() => openSubRowModal(u, 'profile')} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-blue-600/20 text-slate-200 hover:text-blue-300 border border-slate-800 hover:border-blue-500/40 text-xs font-semibold transition-all">
                                    <User size={15} className="text-purple-400" /> <span>Profile</span>
                                  </button>
                                  <button onClick={() => openSubRowModal(u, 'bank_crypto')} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-blue-600/20 text-slate-200 hover:text-blue-300 border border-slate-800 hover:border-blue-500/40 text-xs font-semibold transition-all">
                                    <CreditCard size={15} className="text-amber-400" /> <span>Bank/Crypto</span>
                                  </button>
                                  <button onClick={() => openSubRowModal(u, 'transactions')} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-blue-600/20 text-slate-200 hover:text-blue-300 border border-slate-800 hover:border-blue-500/40 text-xs font-semibold transition-all">
                                    <ArrowUpRight size={15} className="text-teal-400" /> <span>Transactions</span>
                                  </button>
                                  <button onClick={() => openSubRowModal(u, 'tickets')} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-blue-600/20 text-slate-200 hover:text-blue-300 border border-slate-800 hover:border-blue-500/40 text-xs font-semibold transition-all">
                                    <Ticket size={15} className="text-indigo-400" /> <span>Tickets ({u.tickets?.length || 0})</span>
                                  </button>
                                  <button onClick={() => openSubRowModal(u, 'add_account')} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600/15 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 text-xs font-bold transition-all">
                                    <PlusCircle size={15} /> <span>Add Account</span>
                                  </button>
                                  <button onClick={() => openSubRowModal(u, 'account_active')} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${u.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                                    <Power size={15} /> <span>Account Active ({u.status})</span>
                                  </button>
                                  <button onClick={() => openSubRowModal(u, 'delete_user')} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-600/15 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 text-xs font-bold transition-all">
                                    <Trash2 size={15} /> <span>Delete User</span>
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      {activeModalType && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 my-auto">
            <div className="p-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              {activeModalUser ? (
                <div className="flex items-center gap-3">
                  <img src={activeModalUser.avatar} alt={activeModalUser.name} className="w-11 h-11 rounded-xl object-cover ring-2 ring-blue-500/40" />
                  <div>
                    <h3 className="font-bold text-white text-base">{activeModalUser.name}</h3>
                    <p className="text-xs text-slate-400">{activeModalUser.id} • {activeModalUser.email}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <PlusCircle size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Add New User</h3>
                    <p className="text-xs text-slate-400">Create a new client profile & trading account</p>
                  </div>
                </div>
              )}
              <button onClick={closeModal} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {activeModalType === 'create_user' && (
                <CreateUserModalForm onSubmit={handleCreateUserSubmit} onCancel={closeModal} />
              )}

              {activeModalUser && (
                <>
                  {activeModalType === 'verifi' && (
                    <div className="space-y-4 text-xs">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <h4 className="font-bold text-white text-sm flex items-center gap-2">
                          <ShieldCheck size={18} className="text-blue-400" /> Identity Verification & KYC
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                          <div className="text-slate-400 mb-1">Passport / ID</div>
                          <div className="font-bold text-emerald-400 flex items-center gap-1.5"><CheckCircle2 size={14} /> Approved</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                          <div className="text-slate-400 mb-1">Proof of Address</div>
                          <div className="font-bold text-emerald-400 flex items-center gap-1.5"><CheckCircle2 size={14} /> Confirmed</div>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-slate-800 flex justify-end">
                        <button onClick={() => toggleVerification(activeModalUser.id)} className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold">
                          {activeModalUser.verified ? 'Revoke Verification' : 'Approve Verification'}
                        </button>
                      </div>
                    </div>
                  )}

                  {activeModalType === 'trading' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                        <div className="text-slate-400 mb-1">Account Number</div>
                        <div className="font-bold text-blue-400">{activeModalUser.tradingAccount.accNumber}</div>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                        <div className="text-slate-400 mb-1">Balance</div>
                        <div className="font-bold text-emerald-400">{activeModalUser.tradingAccount.balance}</div>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                        <div className="text-slate-400 mb-1">Equity</div>
                        <div className="font-bold text-blue-400">{activeModalUser.tradingAccount.equity}</div>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                        <div className="text-slate-400 mb-1">Leverage</div>
                        <div className="font-bold text-purple-400">{activeModalUser.tradingAccount.leverage}</div>
                      </div>
                    </div>
                  )}

                  {activeModalType === 'profile' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                        <div className="text-slate-400 mb-1">Phone</div>
                        <div className="font-bold text-white">{activeModalUser.phone}</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                        <div className="text-slate-400 mb-1">Country</div>
                        <div className="font-bold text-white">{activeModalUser.country}</div>
                      </div>
                    </div>
                  )}

                  {activeModalType === 'bank_crypto' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                        <div className="text-slate-400 mb-1">Bank Name</div>
                        <div className="font-bold text-white">{activeModalUser.bankCrypto.bankName}</div>
                        <div className="text-slate-400">{activeModalUser.bankCrypto.accountMask}</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                        <div className="text-slate-400 mb-1">Crypto Wallet</div>
                        <div className="font-bold text-emerald-400 font-mono">{activeModalUser.bankCrypto.cryptoWallet}</div>
                      </div>
                    </div>
                  )}

                  {activeModalType === 'transactions' && (
                    <div className="space-y-2 text-xs">
                      {(activeModalUser.transactions || []).map(tx => (
                        <div key={tx.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between">
                          <div><span className="font-mono text-blue-400 font-bold">{tx.id}</span> - {tx.type}</div>
                          <span className="font-bold text-emerald-400">{tx.amount}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeModalType === 'tickets' && (
                    <div className="space-y-2 text-xs">
                      {(!activeModalUser.tickets || activeModalUser.tickets.length === 0) ? <p className="text-slate-400">No tickets found.</p> : activeModalUser.tickets.map(t => (
                        <div key={t.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between">
                          <div><span className="font-mono text-blue-400 font-bold">{t.id}</span> - {t.subject}</div>
                          <span className="text-blue-400 font-bold">{t.status}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeModalType === 'add_account' && (
                    <div className="space-y-3 text-xs">
                      <p className="text-slate-300">Create new sub-account for {activeModalUser.name}:</p>
                      <button onClick={() => handleAddAccountSubmit(activeModalUser.name)} className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold">
                        Initialize Account
                      </button>
                    </div>
                  )}

                  {activeModalType === 'account_active' && (
                    <div className="space-y-3 text-xs">
                      <p className="text-slate-300">Status for {activeModalUser.name}: <strong>{activeModalUser.status}</strong></p>
                      <button onClick={() => { toggleUserActiveStatus(activeModalUser.id); closeModal(); }} className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold">
                        Toggle Status
                      </button>
                    </div>
                  )}

                  {activeModalType === 'delete_user' && (
                    <div className="space-y-3 text-xs">
                      <p className="text-red-400 font-bold">Delete user {activeModalUser.name}?</p>
                      <button onClick={() => handleDeleteUser(activeModalUser.id, activeModalUser.name)} className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold">
                        Confirm Delete
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {activeModalType !== 'create_user' && (
              <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end">
                <button onClick={closeModal} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs">
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

