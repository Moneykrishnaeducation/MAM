import React, { useState } from 'react';
import Head from 'next/head';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  UserCheck, 
  DollarSign, 
  BookOpen, 
  Search, 
  ChevronRight,
  Filter,
  ShieldAlert
} from 'lucide-react';
import AdminSidebar from '@/components/Admin/sidebar';
import AdminHeader from '@/components/Admin/header';

interface RequestItem {
  id: string;
  requesterName: string;
  requesterEmail: string;
  avatar: string;
  type: 'Account Verification' | 'Investment Withdrawal' | 'Course Approval' | 'Role Upgrade';
  description: string;
  amount?: string;
  submittedAt: string;
  priority: 'High' | 'Medium' | 'Normal';
  status: 'Pending' | 'Approved' | 'Rejected';
}

export default function AdminPendingRequestsPage() {
  const [filterType, setFilterType] = useState<string>('All');

  const [requests, setRequests] = useState<RequestItem[]>([
    {
      id: 'REQ-8901',
      requesterName: 'Sarah Jenkins',
      requesterEmail: 'sarah.j@example.com',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
      type: 'Account Verification',
      description: 'Submitted identity documents (Passport & Utility Bill) for KYC Level 2 approval.',
      submittedAt: '15 mins ago',
      priority: 'High',
      status: 'Pending',
    },
    {
      id: 'REQ-8902',
      requesterName: 'Michael Chen',
      requesterEmail: 'm.chen@example.com',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
      type: 'Investment Withdrawal',
      description: 'Requested capital withdrawal of $3,500 from High-Yield Venture Fund.',
      amount: '$3,500.00',
      submittedAt: '1 hour ago',
      priority: 'High',
      status: 'Pending',
    },
    {
      id: 'REQ-8903',
      requesterName: 'Dr. Robert Vance',
      requesterEmail: 'robert.vance@moneykrishna.com',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=120&q=80',
      type: 'Course Approval',
      description: 'Submitted new syllabus: "Quantitative Algorithmic Trading Masterclass" for publishing.',
      submittedAt: '3 hours ago',
      priority: 'Medium',
      status: 'Pending',
    },
    {
      id: 'REQ-8904',
      requesterName: 'David Sterling',
      requesterEmail: 'd.sterling@example.com',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
      type: 'Role Upgrade',
      description: 'Requested upgrade from Assistant Instructor to Senior Manager permissions.',
      submittedAt: '5 hours ago',
      priority: 'Normal',
      status: 'Pending',
    },
    {
      id: 'REQ-8905',
      requesterName: 'Elena Rostova',
      requesterEmail: 'elena.r@example.com',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&q=80',
      type: 'Investment Withdrawal',
      description: 'Requested allocation of $10,000 into EdTech Seed Opportunity Pool.',
      amount: '$10,000.00',
      submittedAt: '1 day ago',
      priority: 'Normal',
      status: 'Pending',
    },
  ]);

  const handleStatusChange = (id: string, newStatus: 'Approved' | 'Rejected') => {
    setRequests(prev => prev.map(req => req.id === id ? { ...req, status: newStatus } : req));
  };

  const filteredRequests = requests.filter(req => {
    if (filterType === 'All') return true;
    return req.type === filterType;
  });

  const pendingCount = requests.filter(r => r.status === 'Pending').length;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <Head>
        <title>Pending Requests | Admin Portal</title>
      </Head>
      <AdminSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <AdminHeader />
        <div className="p-6 md:p-8">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-2">
                <Clock size={13} /> Action Required
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Pending Requests</h1>
              <p className="text-slate-400 text-sm mt-1">Review and approve user verifications, withdrawals, and course submissions.</p>
            </div>

            {/* Quick Filter Pills */}
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 self-start md:self-auto overflow-x-auto max-w-full">
              {['All', 'Account Verification', 'Investment Withdrawal', 'Course Approval', 'Role Upgrade'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterType(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    filterType === cat 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Stat Summary Boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-xs font-medium">Pending Approvals</div>
                <div className="text-3xl font-black text-amber-400 mt-1">{pendingCount} Items</div>
              </div>
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock size={24} />
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-xs font-medium">High Priority</div>
                <div className="text-3xl font-black text-red-400 mt-1">
                  {requests.filter(r => r.priority === 'High' && r.status === 'Pending').length} Items
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
                <ShieldAlert size={24} />
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-xs font-medium">Processed Today</div>
                <div className="text-3xl font-black text-emerald-400 mt-1">
                  {requests.filter(r => r.status !== 'Pending').length} Items
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 size={24} />
              </div>
            </div>
          </div>

          {/* Requests List */}
          <div className="space-y-4">
            {filteredRequests.map((req) => (
              <div 
                key={req.id}
                className={`bg-slate-900/70 border rounded-3xl p-6 shadow-xl transition-all duration-200 ${
                  req.status === 'Approved'
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : req.status === 'Rejected'
                    ? 'border-red-500/40 bg-red-500/5'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  {/* Requester Info & Details */}
                  <div className="flex items-start gap-4 flex-1">
                    <img src={req.avatar} alt={req.requesterName} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-700 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-slate-100 text-base">{req.requesterName}</span>
                        <span className="text-xs text-slate-400 font-mono">({req.id})</span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {req.type}
                        </span>
                        {req.priority === 'High' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
                            High Priority
                          </span>
                        )}
                      </div>
                      <p className="text-slate-300 text-xs mb-2 leading-relaxed">{req.description}</p>
                      <div className="flex items-center gap-4 text-[11px] text-slate-400">
                        <span>Submitted: <strong className="text-slate-300">{req.submittedAt}</strong></span>
                        {req.amount && <span>Amount: <strong className="text-emerald-400">{req.amount}</strong></span>}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Status */}
                  <div className="flex items-center gap-3 shrink-0 self-end lg:self-center">
                    {req.status === 'Pending' ? (
                      <>
                        <button
                          onClick={() => handleStatusChange(req.id, 'Approved')}
                          className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-emerald-500/20"
                        >
                          <CheckCircle2 size={16} /> Approve
                        </button>
                        <button
                          onClick={() => handleStatusChange(req.id, 'Rejected')}
                          className="flex items-center gap-1.5 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-500/40 font-semibold px-4 py-2.5 rounded-xl text-xs transition-all"
                        >
                          <XCircle size={16} /> Reject
                        </button>
                      </>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border ${
                        req.status === 'Approved'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-red-500/10 text-red-400 border-red-500/30'
                      }`}>
                        {req.status === 'Approved' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                        {req.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
