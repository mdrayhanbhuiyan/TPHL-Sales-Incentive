/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldAlert, Building2 } from 'lucide-react';

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

        <div className="text-center pt-2 border-t border-gray-50">
          <p className="text-[10px] text-gray-400 font-mono">TPHL Sales Incentive Management System v2.0</p>
        </div>
      </div>
    </div>
  );
}
