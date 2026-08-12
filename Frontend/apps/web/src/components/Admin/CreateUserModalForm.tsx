import React, { useState } from 'react';
import { Eye, EyeOff, User, Mail, Phone, Globe, Lock } from 'lucide-react';
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
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    onSubmit({ name, email, phone, role, country, balance, leverage, password });
  };

  const inputClasses = "w-full bg-[#0b226a]/60 border border-[#1745b3] focus:border-[#3aa0ff] focus:ring-1 focus:ring-[#3aa0ff]/50 rounded-xl py-3 pl-10 pr-4 text-slate-200 text-xs outline-none transition-all placeholder:text-slate-500 font-medium";
  const labelClasses = "block text-[10px] text-[#8fb8ff] font-bold uppercase tracking-widest mb-1.5 ml-1";
  const iconClasses = "absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4d7fe0] pointer-events-none";

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Name */}
        <div className="space-y-1">
          <label className={labelClasses}>Full Name</label>
          <div className="relative">
            <User size={15} className={iconClasses} />
            <input 
              type="text" 
              required 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="John Doe" 
              className={inputClasses} 
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1">
          <label className={labelClasses}>Email Address</label>
          <div className="relative">
            <Mail size={15} className={iconClasses} />
            <input 
              type="email" 
              required 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="john@example.com" 
              className={inputClasses} 
            />
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-1">
          <label className={labelClasses}>Phone Number</label>
          <div className="relative">
            <Phone size={15} className={iconClasses} />
            <input 
              type="text" 
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
              placeholder="+1 555-0199" 
              className={inputClasses} 
            />
          </div>
        </div>

        {/* Country */}
        <div className="space-y-1">
          <label className={labelClasses}>Country</label>
          <div className="relative">
            <Globe size={15} className={iconClasses} />
            <input 
              type="text" 
              value={country} 
              onChange={e => setCountry(e.target.value)} 
              placeholder="United States" 
              className={inputClasses} 
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1 sm:col-span-2">
          <label className={labelClasses}>Initial Password</label>
          <div className="relative">
            <Lock size={15} className={iconClasses} />
            <input 
              type={showPassword ? "text" : "password"} 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••" 
              className={`${inputClasses} pr-11`} 
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4d7fe0] hover:text-[#8fb8ff] transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-[10px] text-slate-500 ml-1 mt-1 font-medium">The user will use this password to log in.</p>
        </div>

      </div>

      <div className="pt-5 mt-2 border-t border-[#1745b3]/50 flex justify-end gap-3">
        <button 
          type="button" 
          onClick={onCancel} 
          className="px-5 py-2.5 rounded-xl border border-[#1745b3] bg-[#0b226a]/40 hover:bg-[#102c7c] text-slate-300 font-bold text-xs transition-all hover:border-[#2450b7]"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          className="px-6 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 bg-[linear-gradient(135deg,#e0b01d_0%,#c99508_100%)] text-slate-950 shadow-[0_4px_14px_rgba(201,149,8,0.25)] hover:shadow-[0_6px_20px_rgba(201,149,8,0.4)] hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0"
        >
          <User size={14} className="opacity-80" />
          Create User
        </button>
      </div>
    </form>
  );
}
