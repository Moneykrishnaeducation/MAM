import React from 'react';
import Head from 'next/head';
import { Users, Search, Plus, UserCheck, Shield } from 'lucide-react';
import AdminSidebar from '@/components/Admin/sidebar';
import AdminHeader from '@/components/Admin/header';

export default function AdminUsersPage() {
  const usersList = [
    { id: 'USR-001', name: 'Alex Rivera', email: 'alex.rivera@example.com', role: 'Student', status: 'Active', joined: 'Jan 2026' },
    { id: 'USR-002', name: 'Sarah Jenkins', email: 'sarah.j@example.com', role: 'Student', status: 'Active', joined: 'Feb 2026' },
    { id: 'USR-003', name: 'Michael Chen', email: 'm.chen@example.com', role: 'Student', status: 'Pending', joined: 'Mar 2026' },
    { id: 'USR-004', name: 'Elena Rostova', email: 'elena.r@example.com', role: 'Student', status: 'Active', joined: 'Apr 2026' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <Head>
        <title>Users Management | Admin Portal</title>
      </Head>
      <AdminSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <AdminHeader />
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
                <Users size={13} /> User Directory
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Users Directory</h1>
              <p className="text-slate-400 text-sm mt-1">Manage all registered platform accounts and user roles.</p>
            </div>
            <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md self-start md:self-auto">
              <Plus size={16} /> Add New User
            </button>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3 bg-slate-800/60 px-4 py-2 rounded-xl w-72 border border-slate-700/50">
                <Search size={16} className="text-slate-400" />
                <input type="text" placeholder="Filter users..." className="bg-transparent border-none text-xs text-white outline-none w-full" />
              </div>
              <span className="text-xs text-slate-400 font-medium">Total Users: {usersList.length}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="pb-3 font-semibold">User ID</th>
                    <th className="pb-3 font-semibold">Name</th>
                    <th className="pb-3 font-semibold">Email</th>
                    <th className="pb-3 font-semibold">Role</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 font-mono text-blue-400">{u.id}</td>
                      <td className="py-3.5 font-semibold text-slate-200">{u.name}</td>
                      <td className="py-3.5 text-slate-400">{u.email}</td>
                      <td className="py-3.5 text-slate-300">{u.role}</td>
                      <td className="py-3.5">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right text-slate-400">{u.joined}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
