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
  ChevronUp,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import AdminSidebar from '@/components/Admin/sidebar';
import AdminHeader from '@/components/Admin/header';

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: 'Active' | 'Suspended';
  verified: boolean;
  joined: string;
  country: string;
  avatar: string;
  tradingAccount: {
    accNumber: string;
    type: string;
    balance: string;
    equity: string;
    leverage: string;
    activeTrades: number;
  };
  bankCrypto: {
    bankName: string;
    accountMask: string;
    cryptoWallet: string;
  };
  transactions: Array<{ id: string; type: 'Deposit' | 'Withdrawal'; amount: string; status: 'Completed' | 'Pending'; date: string }>;
  tickets: Array<{ id: string; subject: string; status: 'Open' | 'Closed' | 'In Progress'; date: string }>;
}

export type ModalType = 'verifi' | 'trading' | 'profile' | 'bank_crypto' | 'transactions' | 'tickets' | 'add_account' | 'delete_user' | 'account_active' | null;

export default function AdminUsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>('USR-001');
  
  // Modal State
  const [activeModalUser, setActiveModalUser] = useState<UserData | null>(null);
  const [activeModalType, setActiveModalType] = useState<ModalType>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [users, setUsers] = useState<UserData[]>([
    {
      id: 'USR-001',
      name: 'Alex Rivera',
      email: 'alex.rivera@example.com',
      phone: '+1 (555) 019-2834',
      role: 'Student / Client',
      status: 'Active',
      verified: true,
      joined: 'Jan 15, 2026',
      country: 'United States',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=120&q=80',
      tradingAccount: {
        accNumber: 'ACC-891024',
        type: 'Live Pro ECN',
        balance: '$14,250.00',
        equity: '$14,890.50',
        leverage: '1:100',
        activeTrades: 3,
      },
      bankCrypto: {
        bankName: 'JPMorgan Chase Bank',
        accountMask: '**** 4829',
        cryptoWallet: '0x71C...39aB (USDT-TRC20)',
      },
      transactions: [
        { id: 'TX-901', type: 'Deposit', amount: '$5,000.00', status: 'Completed', date: 'Jul 20, 2026' },
        { id: 'TX-902', type: 'Withdrawal', amount: '$1,200.00', status: 'Completed', date: 'Jul 28, 2026' },
      ],
      tickets: [
        { id: 'TCK-104', subject: 'Inquiry regarding Leverage upgrade', status: 'Closed', date: 'Jul 10, 2026' },
      ],
    },
    {
      id: 'USR-002',
      name: 'Sarah Jenkins',
      email: 'sarah.j@example.com',
      phone: '+1 (555) 084-9210',
      role: 'Student / Client',
      status: 'Active',
      verified: true,
      joined: 'Feb 02, 2026',
      country: 'United Kingdom',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
      tradingAccount: {
        accNumber: 'ACC-891025',
        type: 'Standard Live',
        balance: '$8,400.00',
        equity: '$8,400.00',
        leverage: '1:50',
        activeTrades: 0,
      },
      bankCrypto: {
        bankName: 'Barclays Bank UK',
        accountMask: '**** 9102',
        cryptoWallet: '0x32A...89eF (USDT-ERC20)',
      },
      transactions: [
        { id: 'TX-910', type: 'Deposit', amount: '$8,400.00', status: 'Completed', date: 'Jul 15, 2026' },
      ],
      tickets: [
        { id: 'TCK-112', subject: 'Document re-verification status', status: 'In Progress', date: 'Jul 30, 2026' },
      ],
    },
    {
      id: 'USR-003',
      name: 'Michael Chen',
      email: 'm.chen@example.com',
      phone: '+65 9123 4567',
      role: 'Student / Client',
      status: 'Suspended',
      verified: false,
      joined: 'Mar 18, 2026',
      country: 'Singapore',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
      tradingAccount: {
        accNumber: 'ACC-891026',
        type: 'Demo Practice',
        balance: '$3,500.00',
        equity: '$3,500.00',
        leverage: '1:100',
        activeTrades: 1,
      },
      bankCrypto: {
        bankName: 'DBS Bank Singapore',
        accountMask: '**** 1104',
        cryptoWallet: 'Not Configured',
      },
      transactions: [
        { id: 'TX-915', type: 'Withdrawal', amount: '$3,500.00', status: 'Pending', date: 'Jul 31, 2026' },
      ],
      tickets: [
        { id: 'TCK-119', subject: 'Account Suspension Appeal', status: 'Open', date: 'Jul 31, 2026' },
      ],
    },
    {
      id: 'USR-004',
      name: 'Elena Rostova',
      email: 'elena.r@example.com',
      phone: '+49 151 2345678',
      role: 'Student / Client',
      status: 'Active',
      verified: true,
      joined: 'Apr 11, 2026',
      country: 'Germany',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&q=80',
      tradingAccount: {
        accNumber: 'ACC-891027',
        type: 'Live VIP ECN',
        balance: '$25,000.00',
        equity: '$26,140.00',
        leverage: '1:200',
        activeTrades: 4,
      },
      bankCrypto: {
        bankName: 'Deutsche Bank',
        accountMask: '**** 7712',
        cryptoWallet: '0x88F...44aC (USDT-TRC20)',
      },
      transactions: [
        { id: 'TX-920', type: 'Deposit', amount: '$20,000.00', status: 'Completed', date: 'Jul 01, 2026' },
        { id: 'TX-921', type: 'Deposit', amount: '$5,000.00', status: 'Completed', date: 'Jul 22, 2026' },
      ],
      tickets: [],
    },
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const toggleDropdownRow = (userId: string) => {
    setExpandedRowId(prev => prev === userId ? null : userId);
  };

  const openSubRowModal = (user: UserData, type: ModalType) => {
    setActiveModalUser(user);
    setActiveModalType(type);
  };

  const closeModal = () => {
    setActiveModalUser(null);
    setActiveModalType(null);
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
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <Head>
        <title>Users Directory | Admin Portal</title>
      </Head>
      <AdminSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <AdminHeader />

        <div className="p-6 md:p-8">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
                <Users size={13} /> User Management
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Users Directory</h1>
              <p className="text-slate-400 text-sm mt-1">
                Expand rows to reveal dropdown controls, and click any action to trigger popup modal details.
              </p>
            </div>
            <button 
              onClick={() => showToast('User registration modal opened')}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md self-start md:self-auto"
            >
              <Plus size={16} /> Add New User
            </button>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-300 text-xs font-semibold flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-blue-400" /> {toastMessage}
              </span>
              <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">&times;</button>
            </div>
          )}

          {/* Users Table Container */}
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
                    <th className="pb-3 pr-2 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.map((u) => {
                    const isExpanded = expandedRowId === u.id;

                    return (
                      <React.Fragment key={u.id}>
                        {/* MAIN USER ROW */}
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
                              <span>Details</span>
                              {isExpanded ? <ChevronUp size={14} className="text-blue-400" /> : <ChevronDown size={14} />}
                            </button>
                          </td>
                        </tr>

                        {/* DROPDOWN SUB-ROW WITH BUTTONS */}
                        {isExpanded && (
                          <tr className="bg-slate-900/90 border-b border-slate-800">
                            <td colSpan={7} className="p-4 sm:p-5">
                              <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-4 shadow-inner">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                                  <span>User Management Sub-Actions for <strong className="text-white">{u.name}</strong></span>
                                  <span className="text-slate-600">•</span>
                                  <span className="text-blue-400">Click any item to open Popup Modal</span>
                                </div>

                                {/* SUB-ROW ACTION BUTTONS GRID */}
                                <div className="flex flex-wrap items-center gap-2.5">
                                  {/* 1. Verifi */}
                                  <button
                                    onClick={() => openSubRowModal(u, 'verifi')}
                                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-blue-600/20 text-slate-200 hover:text-blue-300 border border-slate-800 hover:border-blue-500/40 text-xs font-semibold transition-all shadow-sm group"
                                  >
                                    <ShieldCheck size={15} className="text-blue-400 group-hover:scale-110 transition-transform" />
                                    <span>Verifi</span>
                                  </button>

                                  {/* 2. Trading */}
                                  <button
                                    onClick={() => openSubRowModal(u, 'trading')}
                                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-blue-600/20 text-slate-200 hover:text-blue-300 border border-slate-800 hover:border-blue-500/40 text-xs font-semibold transition-all shadow-sm group"
                                  >
                                    <TrendingUp size={15} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                                    <span>Trading</span>
                                  </button>

                                  {/* 3. Profile */}
                                  <button
                                    onClick={() => openSubRowModal(u, 'profile')}
                                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-blue-600/20 text-slate-200 hover:text-blue-300 border border-slate-800 hover:border-blue-500/40 text-xs font-semibold transition-all shadow-sm group"
                                  >
                                    <User size={15} className="text-purple-400 group-hover:scale-110 transition-transform" />
                                    <span>Profile</span>
                                  </button>

                                  {/* 4. Bank/Crypto */}
                                  <button
                                    onClick={() => openSubRowModal(u, 'bank_crypto')}
                                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-blue-600/20 text-slate-200 hover:text-blue-300 border border-slate-800 hover:border-blue-500/40 text-xs font-semibold transition-all shadow-sm group"
                                  >
                                    <CreditCard size={15} className="text-amber-400 group-hover:scale-110 transition-transform" />
                                    <span>Bank/Crypto</span>
                                  </button>

                                  {/* 5. Transactions */}
                                  <button
                                    onClick={() => openSubRowModal(u, 'transactions')}
                                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-blue-600/20 text-slate-200 hover:text-blue-300 border border-slate-800 hover:border-blue-500/40 text-xs font-semibold transition-all shadow-sm group"
                                  >
                                    <ArrowUpRight size={15} className="text-teal-400 group-hover:scale-110 transition-transform" />
                                    <span>Transactions</span>
                                  </button>

                                  {/* 6. Tickets */}
                                  <button
                                    onClick={() => openSubRowModal(u, 'tickets')}
                                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-blue-600/20 text-slate-200 hover:text-blue-300 border border-slate-800 hover:border-blue-500/40 text-xs font-semibold transition-all shadow-sm group"
                                  >
                                    <Ticket size={15} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                                    <span>Tickets ({u.tickets.length})</span>
                                  </button>

                                  {/* 7. Add Account */}
                                  <button
                                    onClick={() => openSubRowModal(u, 'add_account')}
                                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600/15 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 text-xs font-bold transition-all shadow-sm group"
                                  >
                                    <PlusCircle size={15} className="group-hover:scale-110 transition-transform" />
                                    <span>Add Account</span>
                                  </button>

                                  {/* 8. Account Active */}
                                  <button
                                    onClick={() => openSubRowModal(u, 'account_active')}
                                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all shadow-sm ${
                                      u.status === 'Active'
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                        : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                                    }`}
                                  >
                                    <Power size={15} />
                                    <span>Account Active ({u.status})</span>
                                  </button>

                                  {/* 9. Delete User */}
                                  <button
                                    onClick={() => openSubRowModal(u, 'delete_user')}
                                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-600/15 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 text-xs font-bold transition-all shadow-sm group"
                                  >
                                    <Trash2 size={15} className="group-hover:scale-110 transition-transform" />
                                    <span>Delete User</span>
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
      </main>

      {/* POPUP STYLE MODALS FOR EACH SUB-ROW BUTTON CLICK */}
      {activeModalUser && activeModalType && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 my-auto">
            
            {/* POPUP MODAL HEADER */}
            <div className="p-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={activeModalUser.avatar} alt={activeModalUser.name} className="w-11 h-11 rounded-xl object-cover ring-2 ring-blue-500/40" />
                <div>
                  <h3 className="font-bold text-white text-base">{activeModalUser.name}</h3>
                  <p className="text-xs text-slate-400">{activeModalUser.id} • {activeModalUser.email}</p>
                </div>
              </div>

              {/* Close Button */}
              <button 
                onClick={closeModal}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* POPUP MODAL BODY BY TYPE */}
            <div className="p-6">

              {/* 1. VERIFI MODAL */}
              {activeModalType === 'verifi' && (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <ShieldCheck size={18} className="text-blue-400" /> Identity Verification & KYC
                    </h4>
                    <span className={`px-2.5 py-0.5 rounded-full font-bold border ${
                      activeModalUser.verified 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {activeModalUser.verified ? 'Verified Level 2' : 'Pending Verification'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="text-slate-400 mb-1">Identity Document (Passport/ID)</div>
                      <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 size={14} /> Approved & Validated
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="text-slate-400 mb-1">Proof of Address</div>
                      <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 size={14} /> Utility Statement Confirmed
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                    <button 
                      onClick={() => toggleVerification(activeModalUser.id)}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md"
                    >
                      {activeModalUser.verified ? 'Revoke Verification' : 'Approve Verification Status'}
                    </button>
                  </div>
                </div>
              )}

              {/* 2. TRADING MODAL */}
              {activeModalType === 'trading' && (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <TrendingUp size={18} className="text-emerald-400" /> Trading Account Details
                    </h4>
                    <span className="font-mono text-blue-400 font-bold bg-blue-500/10 px-2.5 py-0.5 rounded-md border border-blue-500/20">
                      {activeModalUser.tradingAccount.accNumber}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="text-slate-400 text-[11px] mb-1">Account Type</div>
                      <div className="font-bold text-slate-200">{activeModalUser.tradingAccount.type}</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="text-slate-400 text-[11px] mb-1">Current Balance</div>
                      <div className="font-bold text-emerald-400">{activeModalUser.tradingAccount.balance}</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="text-slate-400 text-[11px] mb-1">Total Equity</div>
                      <div className="font-bold text-blue-400">{activeModalUser.tradingAccount.equity}</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="text-slate-400 text-[11px] mb-1">Leverage Ratio</div>
                      <div className="font-bold text-purple-400">{activeModalUser.tradingAccount.leverage}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. PROFILE MODAL */}
              {activeModalType === 'profile' && (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <User size={18} className="text-purple-400" /> User Profile & Credentials
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="text-slate-400 mb-1">Full Name</div>
                      <div className="font-bold text-slate-100 text-sm">{activeModalUser.name}</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="text-slate-400 mb-1">Email Address</div>
                      <div className="font-bold text-slate-100 text-sm">{activeModalUser.email}</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="text-slate-400 mb-1">Phone Number</div>
                      <div className="font-bold text-slate-100 text-sm">{activeModalUser.phone}</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="text-slate-400 mb-1">Country</div>
                      <div className="font-bold text-slate-100 text-sm">{activeModalUser.country}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. BANK/CRYPTO MODAL */}
              {activeModalType === 'bank_crypto' && (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <CreditCard size={18} className="text-amber-400" /> Bank & Crypto Payout Accounts
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                      <Building size={28} className="text-blue-400 shrink-0" />
                      <div>
                        <div className="text-slate-400 mb-0.5">Primary Bank Account</div>
                        <div className="font-bold text-slate-200 text-sm">{activeModalUser.bankCrypto.bankName}</div>
                        <div className="text-slate-400 mt-1">Account: {activeModalUser.bankCrypto.accountMask}</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                      <Wallet size={28} className="text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-slate-400 mb-0.5">USDT Crypto Wallet</div>
                        <div className="font-bold text-emerald-400 font-mono text-xs">{activeModalUser.bankCrypto.cryptoWallet}</div>
                        <div className="text-slate-400 mt-1">Payout Status: Active</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. TRANSACTIONS MODAL */}
              {activeModalType === 'transactions' && (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <ArrowUpRight size={18} className="text-teal-400" /> Recent Transactions Log
                    </h4>
                  </div>

                  <div className="space-y-2">
                    {activeModalUser.transactions.map(tx => (
                      <div key={tx.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="font-mono text-blue-400 font-bold mr-2">{tx.id}</span>
                          <span className="font-semibold text-slate-200">{tx.type}</span>
                          <span className="text-slate-400 ml-2">({tx.date})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-emerald-400">{tx.amount}</span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. TICKETS MODAL */}
              {activeModalType === 'tickets' && (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <Ticket size={18} className="text-indigo-400" /> Support Tickets History
                    </h4>
                  </div>

                  <div className="space-y-2">
                    {activeModalUser.tickets.length === 0 ? (
                      <div className="text-slate-400 p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                        No active or past support tickets.
                      </div>
                    ) : (
                      activeModalUser.tickets.map(tck => (
                        <div key={tck.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                          <div>
                            <span className="font-mono text-blue-400 font-bold mr-2">{tck.id}</span>
                            <span className="font-semibold text-slate-200">{tck.subject}</span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {tck.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* 7. ADD ACCOUNT MODAL */}
              {activeModalType === 'add_account' && (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <PlusCircle size={18} className="text-emerald-400" /> Create Trading / Sub-Account
                    </h4>
                  </div>

                  <p className="text-slate-300">Initialize a new MetaTrader 5 trading account for <strong>{activeModalUser.name}</strong>.</p>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Account Type</label>
                      <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none">
                        <option>Live ECN Pro</option>
                        <option>Standard Live</option>
                        <option>VIP Swap-Free ECN</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Initial Leverage</label>
                      <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none">
                        <option>1:100</option>
                        <option>1:200</option>
                        <option>1:500</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                    <button onClick={closeModal} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold">Cancel</button>
                    <button 
                      onClick={() => handleAddAccountSubmit(activeModalUser.name)}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-md"
                    >
                      Initialize Sub-Account
                    </button>
                  </div>
                </div>
              )}

              {/* 8. ACCOUNT ACTIVE MODAL */}
              {activeModalType === 'account_active' && (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <Power size={18} className="text-amber-400" /> Toggle Account Active Status
                    </h4>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <p className="text-slate-300 mb-2">
                      Current Account Status for <strong>{activeModalUser.name}</strong> is{' '}
                      <span className={`font-bold ${activeModalUser.status === 'Active' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {activeModalUser.status}
                      </span>.
                    </p>
                    <p className="text-slate-400">Toggling status will immediately grant or restrict platform login access.</p>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                    <button onClick={closeModal} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold">Cancel</button>
                    <button 
                      onClick={() => { toggleUserActiveStatus(activeModalUser.id); closeModal(); }}
                      className={`px-4 py-2 rounded-xl font-bold text-slate-950 shadow-md ${
                        activeModalUser.status === 'Active' ? 'bg-red-500 hover:bg-red-400 text-white' : 'bg-emerald-500 hover:bg-emerald-400'
                      }`}
                    >
                      Set Status to {activeModalUser.status === 'Active' ? 'Suspended' : 'Active'}
                    </button>
                  </div>
                </div>
              )}

              {/* 9. DELETE USER MODAL */}
              {activeModalType === 'delete_user' && (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="font-bold text-red-400 text-sm flex items-center gap-2">
                      <Trash2 size={18} className="text-red-400" /> Confirm User Deletion
                    </h4>
                  </div>

                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300">
                    <p className="font-bold mb-1">Warning: Irreversible Action</p>
                    <p className="text-xs">
                      You are about to delete <strong>{activeModalUser.name}</strong> ({activeModalUser.id}). This will remove all user records, trading credentials, and linked access permanently.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                    <button onClick={closeModal} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold">Cancel</button>
                    <button 
                      onClick={() => handleDeleteUser(activeModalUser.id, activeModalUser.name)}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-md shadow-red-600/30"
                    >
                      Permanently Delete User
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* POPUP MODAL FOOTER */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end">
              <button 
                onClick={closeModal}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
