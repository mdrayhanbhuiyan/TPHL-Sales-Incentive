/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  ShieldAlert, 
  Download, 
  Upload, 
  Activity, 
  CheckCircle, 
  Trash2, 
  RefreshCw,
  Bell,
  HelpCircle
} from 'lucide-react';

interface SettingsProps {
  authToken: string;
  userRole: string;
}

export default function SettingsView({ authToken, userRole }: SettingsProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [notifList, setNotifList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (userRole === 'Admin') {
        const lRes = await fetch('/api/system/logs', {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const lData = await lRes.json();
        setLogs(lData);
      }

      const nRes = await fetch('/api/system/notifications', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const nData = await nRes.json();
      setNotifList(nData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [authToken]);

  const handleBackup = async () => {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/system/backup', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tphl_incentive_master_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setSuccess("Database master backup JSON serialized and downloaded successfully.");
    } catch (err: any) {
      setError("Backup serialization failed.");
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const res = await fetch('/api/system/restore', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(parsed)
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to restore");
        }

        setSuccess("Database master recovery successfully loaded. Reloading system catalogs...");
        fetchData();
        // Force fully reload window to lock recalculated db indexes
        setTimeout(() => window.location.reload(), 1500);
      } catch (err: any) {
        setError(err.message || "Invalid backup schema file format.");
      }
    };
    reader.readAsText(file);
  };

  const handleClearNotif = async () => {
    try {
      await fetch('/api/system/notifications/clear', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      setSuccess("Notifications marked read.");
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">System Settings &amp; Maintenance</h1>
          <p className="mt-1 text-sm text-gray-500 font-medium">Coordinate database backup snapshots, upload state records, and overview security audit tracks.</p>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl text-xs font-semibold text-emerald-800">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-100 p-3.5 rounded-xl text-xs font-semibold text-rose-800">
          <ShieldAlert className="w-4.5 h-4.5 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Backup and Restore Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-bold text-gray-800">Export System Master Dump</h2>
          </div>
          <p className="text-xs text-gray-500 leading-normal">
            Download a single, highly compressed JSON file structure detailing all tables of your database (Projects, Teams, Rule structures, Sales lists, Calculated Incentives, Logs). Great for archival schedules or database migrations.
          </p>
          {userRole === 'Admin' ? (
            <button
              onClick={handleBackup}
              className="flex items-center justify-center gap-1.5 w-full bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold py-3 rounded-xl shadow-xs transition cursor-pointer"
            >
              Export JSON Database Snapshot
            </button>
          ) : (
            <p className="text-xs text-amber-600 italic">🔒 Protected to platform Administrators only</p>
          )}
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-bold text-gray-800">Restore System Master Dump</h2>
          </div>
          <p className="text-xs text-gray-500 leading-normal">
            Select a previously exported TPHL database dump file. This completely overwrites the active platform database records, chronologically re-maps the sequence IDs, and re-computes active incentive commission rates.
          </p>
          {userRole === 'Admin' ? (
            <label className="flex items-center justify-center gap-1.5 w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-3 rounded-xl shadow-xs transition cursor-pointer text-center select-none">
              <input
                type="file"
                accept=".json"
                onChange={handleRestore}
                className="hidden"
              />
              Upload Schema Backup &amp; Recalculate
            </label>
          ) : (
            <p className="text-xs text-amber-600 italic">🔒 Protected to platform Administrators only</p>
          )}
        </div>
      </div>

      {/* Grid containing logs & notification trackers */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Audit Log Sheet */}
        {userRole === 'Admin' && (
          <div className="lg:col-span-2 bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-sm font-bold text-gray-800">Security Audit Logs Trails</h2>
                </div>
                <button
                  onClick={fetchData}
                  className="p-1 text-gray-400 hover:text-indigo-600 cursor-pointer transition"
                  title="Reload audit trace"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                {logs.map(log => (
                  <div key={log.id} className="text-[11px] border-b border-gray-50 pb-2.5 last:border-0 last:pb-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-800">{log.action}</span>
                      <span className="font-mono text-gray-400">{log.timestamp.split('T')[1].slice(0, 8)} ({log.timestamp.split('T')[0]})</span>
                    </div>
                    <p className="text-gray-500 leading-normal">{log.details}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-indigo-700 font-semibold font-mono">
                      <span>👤 {log.username}</span>
                      <span>&bull;</span>
                      <span className="uppercase">{log.role}</span>
                    </div>
                  </div>
                ))}
                {logs.length === 0 && (
                  <p className="text-center py-10 text-gray-400 font-mono">No security logs saved.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Notifications sheet */}
        <div className={`${userRole === 'Admin' ? 'lg:col-span-1' : 'col-span-full'} bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs space-y-4 flex flex-col justify-between`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-50 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-600" />
                <h2 className="text-sm font-bold text-gray-800">Active Notifications Logs</h2>
              </div>
              <button
                onClick={handleClearNotif}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
              >
                Mark read
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2.5 pr-2">
              {notifList.map(notif => {
                let badgeCol = "bg-indigo-50 border-indigo-100 text-indigo-800";
                if (notif.type === 'success') badgeCol = "bg-emerald-50 border-emerald-100 text-emerald-800 font-semibold";
                else if (notif.type === 'warning') badgeCol = "bg-amber-50 border-amber-100 text-amber-800";

                return (
                  <div key={notif.id} className="border border-gray-100/50 rounded-xl p-3 bg-gray-50/50 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[9px] uppercase tracking-wider px-1.5 rounded-md ${badgeCol}`}>{notif.type}</span>
                      <span className="text-[9px] text-gray-400 font-mono">{notif.timestamp.split('T')[1].slice(0, 5)}</span>
                    </div>
                    <h4 className="text-xs font-bold text-gray-800 leading-tight">{notif.title}</h4>
                    <p className="text-[10px] text-gray-500 leading-normal">{notif.message}</p>
                  </div>
                );
              })}
              {notifList.length === 0 && (
                <p className="text-center py-10 text-gray-400 text-xs font-mono">No notifications logged.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
