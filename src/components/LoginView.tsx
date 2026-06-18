/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { KeyRound, ShieldAlert, CheckCircle, Flame, Building2, User } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent, customMail?: string, customPass?: string) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);

    const checkMail = customMail || email;
    const checkPass = customPass || password;

    if (!checkMail || !checkPass) {
      setError("Please fill out all credentials.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: checkMail, password: checkPass }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Login fail. Please check credentials.");
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  const handleSeededLogin = (role: 'admin' | 'leader' | 'exec') => {
    if (role === 'admin') {
      setEmail("rayhanbhuiyan2021@gmail.com");
      setPassword("coo@tphl.com");
      handleLogin(null as any, "rayhanbhuiyan2021@gmail.com", "coo@tphl.com");
    } else if (role === 'leader') {
      setEmail("leader@tphl.com");
      setPassword("leader123");
      handleLogin(null as any, "leader@tphl.com", "leader123");
    } else {
      setEmail("executive@tphl.com");
      setPassword("executive123");
      handleLogin(null as any, "executive@tphl.com", "executive123");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4 relative overflow-hidden">
      {/* Visual background details */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />

      <div className="w-full max-w-md bg-white rounded-3xl border border-gray-100 p-8 shadow-xl relative z-10 space-y-6">
        <div className="text-center space-y-2">
          {/* Logo badge */}
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-lg mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">TPHL Sales Incentive</h2>
          <p className="text-xs text-gray-500 font-medium">Incentive Tracking &amp; Target Management Portal</p>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-rose-50 border border-rose-100 text-rose-800 text-xs p-3.5 rounded-xl">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Standard Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 tracking-wide">Work Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. employee@tphl.com"
              className="w-full text-sm bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 tracking-wide">Secure Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-sm bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-semibold hover:bg-gray-800 shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Authenticating security..." : "Sign In to Dashboard"}
          </button>
        </form>

        {/* Quick Test Drive Portal */}
        <div className="border-t border-gray-100 pt-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold px-1">
            <span>🛡️ Quick Test Drive Sign-In</span>
            <span className="text-[10px] text-indigo-600 font-mono">Password auto-filled</span>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleSeededLogin('admin')}
              className="flex flex-col items-center gap-1.5 border border-indigo-100 rounded-xl py-2 bg-indigo-50/30 hover:bg-indigo-50/80 transition-all group"
            >
              <KeyRound className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold text-indigo-900 uppercase">1. Admin</span>
            </button>

            <button
              onClick={() => handleSeededLogin('leader')}
              className="flex flex-col items-center gap-1.5 border border-emerald-100 rounded-xl py-2 bg-emerald-50/30 hover:bg-emerald-50/80 transition-all group"
            >
              <User className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold text-emerald-950 uppercase">2. Leader</span>
            </button>

            <button
              onClick={() => handleSeededLogin('exec')}
              className="flex flex-col items-center gap-1.5 border border-amber-100 rounded-xl py-2 bg-amber-50/30 hover:bg-amber-50/80 transition-all group"
            >
              <Flame className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold text-amber-950 uppercase">3. Exec</span>
            </button>
          </div>
        </div>

        <div className="text-center">
          <p className="text-[10px] text-gray-400 font-mono">TPHL Sales Incentive Management System v2.0</p>
        </div>
      </div>
    </div>
  );
}
