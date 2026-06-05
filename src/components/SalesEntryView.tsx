/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  Building, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Calendar, 
  Layers, 
  Maximize2,
  X,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { Project, SalesExecutive } from '../types';

interface SalesEntryProps {
  authToken: string;
  userRole: string;
  userProfile: any;
}

export default function SalesEntryView({ authToken, userRole, userProfile }: SalesEntryProps) {
  const [sales, setSales] = useState<any[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [executives, setExecutives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);

  // Form states
  const [projId, setProjId] = useState('');
  const [unitName, setUnitName] = useState('');
  const [unitMeasure, setUnitMeasure] = useState<string>('345-1000');
  const [floorNumber, setFloorNumber] = useState(1);
  const [saleDate, setSaleDate] = useState('');
  const [execId, setExecId] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const sRes = await fetch('/api/sales', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const sls = await sRes.json();
      setSales(sls);

      const pRes = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const projs = await pRes.json();
      setProjects(projs);

      const eRes = await fetch('/api/executives', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const execs = await eRes.json();
      setExecutives(execs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, [authToken]);

  // When selected project changes in form, auto-update standard unit SFT measure definition!
  const handleProjectSelect = (id: string) => {
    setProjId(id);
    const proj = projects.find(p => p.id === id);
    if (proj) {
      setUnitMeasure(proj.unit_measure);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // If active user is Executive, lock executive_id to their own executive profile ID
    let finalExecId = execId;
    if (userRole === 'Sales Executive') {
      const matched = executives.find(ex => ex.employee_id === userProfile.employee_id || ex.id === userProfile.id);
      if (matched) finalExecId = matched.id;
    }

    if (!projId || !unitName || !finalExecId || !saleDate) {
      setError("Please complete all required fields.");
      return;
    }

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          project_id: projId,
          unit_name: unitName,
          unit_measure: unitMeasure,
          floor_number: floorNumber,
          sale_date: saleDate,
          executive_id: finalExecId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to log sale");

      setSuccess(`Sales record successfully added for unit ${unitName}!`);
      setIsAddOpen(false);
      fetchSalesData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) return;
    setError(null);

    let finalExecId = execId;
    if (userRole === 'Sales Executive') {
      const matched = executives.find(ex => ex.employee_id === userProfile.employee_id || ex.id === userProfile.id);
      if (matched) finalExecId = matched.id;
    }

    try {
      const res = await fetch(`/api/sales/${selectedSale.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          project_id: projId,
          unit_name: unitName,
          unit_measure: unitMeasure,
          floor_number: floorNumber,
          sale_date: saleDate,
          executive_id: finalExecId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to adjust sales entry");

      setSuccess(`Sales entry for unit ${unitName} adjusted successfully.`);
      setIsEditOpen(false);
      fetchSalesData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Custom delete state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; unit: string } | null>(null);

  const handleDelete = (saleId: string, unit: string) => {
    setDeleteTarget({ id: saleId, unit: unit });
  };

  const confirmDeleteSale = async () => {
    if (!deleteTarget) return;
    const { id, unit } = deleteTarget;
    setDeleteTarget(null);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/sales/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete sales log");

      setSuccess(`Sales record for unit ${unit} cancelled.`);
      fetchSalesData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openAddModal = () => {
    setProjId(projects[0]?.id || '');
    setUnitName('');
    setUnitMeasure(String(projects[0]?.unit_measure || '345-1000'));
    setFloorNumber(1);
    setSaleDate(new Date().toISOString().split('T')[0]);
    
    // Resolve own executive if role matches
    if (userRole === 'Sales Executive') {
      const matched = executives.find(ex => ex.employee_id === userProfile.employee_id || ex.id === userProfile.id);
      setExecId(matched ? matched.id : '');
    } else {
      setExecId(executives[0]?.id || '');
    }

    setError(null);
    setSuccess(null);
    setIsAddOpen(true);
  };

  const openEditModal = (sale: any) => {
    setSelectedSale(sale);
    setProjId(sale.project_id);
    setUnitName(sale.unit_name);
    setUnitMeasure(sale.unit_measure);
    setFloorNumber(sale.floor_number);
    setSaleDate(sale.sale_date);
    setExecId(sale.executive_id);
    setError(null);
    setSuccess(null);
    setIsEditOpen(true);
  };

  const filteredSales = sales.filter(s => 
    s.project_name.toLowerCase().includes(search.toLowerCase()) ||
    s.unit_name.toLowerCase().includes(search.toLowerCase()) ||
    s.executive_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Sales Entries Log book</h1>
          <p className="mt-1 text-sm text-gray-500">Record, examine, and modify active unit booking contracts. Automatic sequence index numbers are calculated chronologically.</p>
        </div>
        
        {/* Sales Executives & Admin can add sales */}
        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md cursor-pointer transition active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4.5 h-4.5" /> Record Sale Entry
        </button>
      </div>

      {/* Alerts */}
      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl text-xs font-medium text-emerald-800">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-100 p-3.5 rounded-xl text-xs font-medium text-rose-800">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Search line filter */}
      <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 px-3.5 py-2.5 max-w-md shadow-2xs">
        <Search className="w-4.5 h-4.5 text-gray-400 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter bookings by property name, unit, officer..."
          className="bg-transparent text-sm w-full focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-2">
          <div className="w-9 h-9 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
          <p className="text-xs text-gray-400 font-mono">Opening ledger files...</p>
        </div>
      ) : (
        /* High contrast grid spreadsheets style card layout list representation */
        <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100/50 border-b border-gray-100 font-bold text-gray-500 uppercase tracking-wider">
                  <th className="p-4">Project Development</th>
                  <th className="p-4 text-center">Sale Sequence No</th>
                  <th className="p-4">Unit Name</th>
                  <th className="p-4">Floor Level</th>
                  <th className="p-4 text-center">Unit SFT</th>
                  <th className="p-4">Sale Date</th>
                  <th className="p-4">Booking Handled By</th>
                  <th className="p-4 text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700 font-medium font-sans">
                {filteredSales.map(sale => {
                  const isOwner = userRole === 'Sales Executive' && executives.some(ex => (ex.employee_id === userProfile.employee_id || ex.id === userProfile.id) && sale.executive_id === ex.id);
                  const canModify = userRole === 'Admin' || isOwner;
                  return (
                    <tr key={sale.id} className="hover:bg-gray-50/55 transition duration-150">
                      <td className="p-4">
                        <div className="font-semibold text-gray-900">{sale.project_name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">Value: {sale.land_share_amount?.toLocaleString()} BDT</div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-100/45 px-2.5 py-1 rounded-full font-bold font-mono text-[10px]">
                          Sale #{sale.sale_number}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-gray-950 font-mono">{sale.unit_name}</td>
                      <td className="p-4">
                        <span className="flex items-center gap-1 text-gray-600">
                          <Layers className="w-3.5 h-3.5 text-gray-400" />
                          Level {sale.floor_number}
                        </span>
                      </td>
                      <td className="p-4 text-center font-mono">{sale.unit_measure}</td>
                      <td className="p-4">
                        <span className="flex items-center gap-1 text-gray-600 font-mono text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {sale.sale_date}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-gray-900 font-semibold">{sale.executive_name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">ID: {sale.executive_id}</div>
                      </td>
                      <td className="p-4 text-right">
                        {/* Executives edit only their own sales. Admins edit all */}
                        {canModify ? (
                          <div className="flex items-center justify-end gap-2.5">
                            <button
                              onClick={() => openEditModal(sale)}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-white transition cursor-pointer"
                              title="Edit sales entry"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(sale.id, sale.unit_name)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-white transition cursor-pointer"
                              title="Cancel booking"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">No access</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredSales.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-gray-400 text-xs font-mono">
                      No sales bookings match filter rules.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Booking entry Modal Form */}
      {(isAddOpen || isEditOpen) && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-gray-100 p-6 shadow-xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }}
              className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:bg-gray-50 hover:text-gray-900 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-gray-900 leading-tight flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              {isAddOpen ? "Record Sales Booking Entry" : `Edit Sales Log: Unit ${unitName}`}
            </h2>

            <form onSubmit={isAddOpen ? handleAddSubmit : handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Project Property Site</label>
                  <select
                    value={projId}
                    onChange={(e) => handleProjectSelect(e.target.value)}
                    className="w-full text-xs font-semibold bg-gray-50 rounded-lg px-3.5 py-2.5 border border-gray-100 focus:outline-none focus:border-indigo-500"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.project_name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Unit ID/Name (Room NO)</label>
                  <input
                    type="text"
                    required
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    placeholder="e.g. Flat-5B"
                    className="w-full text-xs bg-gray-50 rounded-lg px-3.5 py-2.5 border border-gray-100 focus:outline-none focus:border-indigo-500 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Floor Number Level</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={floorNumber}
                    onChange={(e) => setFloorNumber(Number(e.target.value))}
                    className="w-full text-xs bg-gray-50 rounded-lg px-3.5 py-2.5 border border-gray-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Unit Measure (SFT) size</label>
                  {/* Read only from project */}
                  <input
                    type="text"
                    disabled
                    value={unitMeasure}
                    className="w-full text-xs bg-gray-100 rounded-lg px-3.5 py-2.5 border border-gray-100 focus:outline-none opacity-80 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Booking Sales Date</label>
                  <input
                    type="date"
                    required
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="w-full text-xs bg-gray-50 rounded-lg px-3.5 py-2.5 border border-gray-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                {/* Seller designation dropdown */}
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Booking Closed By (Executive Officer)</label>
                  {userRole === 'Sales Executive' ? (
                    <div className="w-full text-xs bg-gray-100 rounded-lg px-3.5 py-2.5 border border-gray-100 font-semibold text-gray-800">
                      👤 {userProfile.name} (Your Name locked)
                    </div>
                  ) : (
                    <select
                      value={execId}
                      onChange={(e) => setExecId(e.target.value)}
                      className="w-full text-xs bg-gray-50 rounded-lg px-3.5 py-2.5 border border-gray-100 focus:outline-none focus:border-indigo-500"
                    >
                      {executives.map(e => (
                        <option key={e.id} value={e.id}>{e.name} ({e.employee_id})</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 border-t border-gray-50 pt-4 mt-5">
                <button
                  type="button"
                  onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }}
                  className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold py-3 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-3 rounded-xl shadow-md transition cursor-pointer"
                >
                  {isAddOpen ? "Log Booking Entry" : "Apply Corrections"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Sleek Custom Confirm Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-gray-100 p-6 shadow-xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-gray-950 text-sm">Cancel Booking?</h3>
              <p className="text-xs text-gray-500">
                Are you completely sure you want to delete the sales record for unit <span className="font-semibold text-gray-800">'{deleteTarget.unit}'</span>? 
                Chronological sale order indices and incentive calculations will be automatically recalculated.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold py-2.5 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteSale}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold py-2.5 rounded-xl shadow-md transition cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
