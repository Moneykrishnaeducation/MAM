import React, { useState } from 'react';
import { type CreateUserFormData } from '@/types/user';

interface CreateUserModalFormProps {
  onSubmit: (formData: CreateUserFormData) => void;
  onCancel: () => void;
}

export default function CreateUserModalForm({ onSubmit, onCancel }: CreateUserModalFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Client');
  const [country, setCountry] = useState('United States');
  const [balance, setBalance] = useState('10000');
  const [leverage, setLeverage] = useState('1:100');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    onSubmit({ name, email, phone, role, country, balance, leverage });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-slate-450 font-bold uppercase">Name</label>
          <input 
            type="text" 
            required 
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder="John Doe" 
            className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-slate-200 text-xs outline-none" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-slate-450 font-bold uppercase">Email</label>
          <input 
            type="email" 
            required 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            placeholder="john@example.com" 
            className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-slate-200 text-xs outline-none" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-slate-450 font-bold uppercase">Phone</label>
          <input 
            type="text" 
            value={phone} 
            onChange={e => setPhone(e.target.value)} 
            placeholder="+1 555-0199" 
            className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-slate-200 text-xs outline-none" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-slate-450 font-bold uppercase">Role</label>
          <select 
            value={role} 
            onChange={e => setRole(e.target.value)} 
            className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-slate-200 text-xs outline-none"
          >
            <option value="Client">Client</option>
            <option value="MAM Manager">MAM Manager</option>
            <option value="Super Admin">Super Admin</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-slate-450 font-bold uppercase">Country</label>
          <input 
            type="text" 
            value={country} 
            onChange={e => setCountry(e.target.value)} 
            placeholder="United States" 
            className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-slate-200 text-xs outline-none" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-slate-450 font-bold uppercase">Initial Balance ($)</label>
          <input 
            type="number" 
            value={balance} 
            onChange={e => setBalance(e.target.value)} 
            placeholder="10000" 
            className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-slate-200 text-xs outline-none font-mono" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-slate-450 font-bold uppercase">Leverage</label>
          <input 
            type="text" 
            value={leverage} 
            onChange={e => setLeverage(e.target.value)} 
            placeholder="1:100" 
            className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-slate-200 text-xs outline-none font-mono" 
          />
        </div>
      </div>

      <div className="pt-4 border-t border-slate-800 flex justify-end gap-2.5">
        <button 
          type="button" 
          onClick={onCancel} 
          className="px-4 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-xs transition-colors"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors shadow-md shadow-blue-500/10"
        >
          Create User
        </button>
      </div>
    </form>
  );
}
