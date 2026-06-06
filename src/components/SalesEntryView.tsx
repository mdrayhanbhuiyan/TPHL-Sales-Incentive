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
  X,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  Building2,
  BookmarkCheck
} from 'lucide-react';
import { Project, SalesExecutive, ProjectOnSale } from '../types';

interface SalesEntryProps {
  authToken: string;
  userRole: string;
  userProfile: any;
}

export default function SalesEntryView({ authToken, userRole, userProfile }: SalesEntryProps) {
  const [sales, setSales] = useState<any[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsOnSale, setProjectsOnSale] = useState<ProjectOnSale[]>([]);
  const [executives, setExecutives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);

  // Form states
  const [projectOnSaleId, setProjectOnSaleId] = useState('');
  const [projId, setProjId] = useState(''); // Mapped master project ID
  const [unitName, setUnitName] = useState('');
  const [unitMeasure, setUnitMeasure] = useState<string>('');
  const [floorNumber, setFloorNumber] = useState(1);
  const [saleDate, setSaleDate] = useState('');
  const [execId, setExecId] = useState('');

  // List of generated units based on selected Campaign structure
  const [availableUnits, setAvailableUnits] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const sRes = await fetch('/api/sales', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const sls = await sRes.json();
      setSales(Array.isArray(sls) ? sls : []);

      const pRes = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const projs = await pRes.json();
      setProjects(Array.isArray(projs) ? projs : []);

      const posRes = await fetch('/api/projects-on-sale', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const posData = await posRes.json();
      setProjectsOnSale(Array.isArray(posData) ? posData : []);

      const eRes = await fetch('/api/executives', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const execs = await eRes.json();
      setExecutives(Array.isArray(execs) ? execs : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, [authToken]);

  // Helper to generate unit list (e.g., 1A, 1B, 2A, 2B, etc.)
  const generateUnits = (floors: number, unitsPerFloor: number): string[] => {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
    const list: string[] = [];
    for (let f = 1; f <= floors; f++) {
      for (let u = 0; u < unitsPerFloor; u++) {
        const letter = letters[u] || String.fromCharCode(65 + u);
        list.push(`${f}${letter}`);
      }
    }
    return list;
  };

  // Triggered when user selects a Projects On Sale campaign in form
  const handleProjectOnSaleSelect = (posId: string) => {
    setProjectOnSaleId(posId);
    
    const campaign = projectsOnSale.find(p => p.id === posId);
    if (campaign) {
      // 1. Resolve master project development ID
      setProjId(campaign.project_id);

      // 2. Set flat size measure directly
      setUnitMeasure(campaign.flat_unit_size);

      // 3. Generate candidate units listing
      const units = generateUnits(campaign.floor_number, campaign.units_per_floor);
      setAvailableUnits(units);

      // Reset unitName state to let user select
      setUnitName('');
      setFloorNumber(1);
    } else {
      setAvailableUnits([]);
    }
  };

  // Triggered when user chooses a particular unit
  const handleUnitSelect = (unitNameVal: string) => {
    setUnitName(unitNameVal);

    // Auto calculate floor level (e.g. "5B" -> floor level is 5)
    const matchedFloorNum = parseInt(unitNameVal);
    if (!isNaN(matchedFloorNum)) {
      setFloorNumber(matchedFloorNum);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Dynamic executive user tagging if login designation is restrictive
    let finalExecId = execId;
    if (userRole === 'Sales Executive') {
      const matched = executives.find(ex => ex.employee_id === userProfile.employee_id || ex.id === userProfile.id);
      if (matched) finalExecId = matched.id;
    }

    if (!projectOnSaleId || !projId || !unitName || !finalExecId || !saleDate) {
      setError("Please fill all required inputs.");
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
          project_on_sale_id: projectOnSaleId,
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
          project_on_sale_id: projectOnSaleId,
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
    const firstCampaign = projectsOnSale[0];
    if (firstCampaign) {
      setProjectOnSaleId(firstCampaign.id);
      setProjId(firstCampaign.project_id);
      setUnitMeasure(firstCampaign.flat_unit_size);
      
      const units = generateUnits(firstCampaign.floor_number, firstCampaign.units_per_floor);
      setAvailableUnits(units);
      setUnitName(units[0] || '');
      
      const parsedFloor = parseInt(units[0] || '1');
      setFloorNumber(isNaN(parsedFloor) ? 1 : parsedFloor);
    } else {
      setProjectOnSaleId('');
      setProjId('');
      setUnitMeasure('');
      setAvailableUnits([]);
      setUnitName('');
      setFloorNumber(1);
    }

    setSaleDate(new Date().toISOString().split('T')[0]);
    
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
    setProjectOnSaleId(sale.project_on_sale_id || '');
    setProjId(sale.project_id);
    setUnitName(sale.unit_name);
    setUnitMeasure(sale.unit_measure);
    setFloorNumber(sale.floor_number);
    setSaleDate(sale.sale_date);
    setExecId(sale.executive_id);

    // Load available units based on this campaign
    const campaign = projectsOnSale.find(p => p.id === (sale.project_on_sale_id || ''));
    if (campaign) {
      setAvailableUnits(generateUnits(campaign.floor_number, campaign.units_per_floor));
    } else {
      setAvailableUnits([]);
    }

    setError(null);
    setSuccess(null);
    setIsEditOpen(true);
  };

  const filteredSales = sales.filter(s => 
    s.project_name.toLowerCase().includes(search.toLowerCase()) ||
    s.unit_name.toLowerCase().includes(search.toLowerCase()) ||
    s.executive_name.toLowerCase().includes(search.toLowerCase())
  );

  // Look up mapped master directory item
  const mappedMasterProject = projects.find(p => p.id === projId);

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 flex items-center gap-1.5">
            <BookmarkCheck className="w-5.5 h-5.5 text-indigo-600" /> Sales Entries Log book
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Record, examine, and modify active unit booking contracts. Unit IDs are derived from campaign matrices automatically.
          </p>
        </div>
        
        {projectsOnSale.length === 0 ? (
          <div className="text-xs text-rose-600 font-bold bg-rose-50 p-2 px-3 rounded-lg flex items-center gap-1">
            ⚠️ Configure pre-sales project first to record sales.
          </div>
        ) : (
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer transition"
          >
            <Plus className="w-4 h-4" /> Record Sales Entry
          </button>
        )}
      </div>

      {/* Alerts */}
      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl text-xs font-semibold text-emerald-800">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-100 p-3.5 rounded-xl text-xs font-semibold text-rose-800">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Search line filter */}
      <div className="flex items-center gap-2 bg-white border border-gray-200 px-3.5 py-2 max-w-sm rounded-xl shadow-3xs">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter bookings..."
          className="bg-transparent text-xs w-full focus:outline-none focus:ring-0 placeholder:font-medium text-gray-800"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-2 animate-pulse">
          <div className="w-8 h-8 rounded-full border-4 border-indigo-250 border-t-indigo-600 animate-spin" />
        </div>
      ) : (
        /* Grid Spreadsheet style card layout representation */
        <div className="bg-white border border-gray-150 rounded-3xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-55/80 border-b border-gray-100 font-bold text-gray-500 uppercase tracking-wider text-[10px]">
                  <th className="p-4">Project Development</th>
                  <th className="p-4 text-center">Campaign Choice</th>
                  <th className="p-4 text-center">Sale Sequence No</th>
                  <th className="p-4">Unit Name</th>
                  <th className="p-4">Floor Level</th>
                  <th className="p-4 text-center">Unit SFT</th>
                  <th className="p-4">Sale Date</th>
                  <th className="p-4">Booking Handled By</th>
                  <th className="p-4 text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700 font-medium text-xs">
                {filteredSales.map(sale => {
                  const isOwner = userRole === 'Sales Executive' && executives.some(ex => (ex.employee_id === userProfile.employee_id || ex.id === userProfile.id) && sale.executive_id === ex.id);
                  const canModify = userRole === 'Admin' || isOwner;
                  
                  // Look up campaign project on sale name
                  const campaignObj = projectsOnSale.find(pos => pos.id === sale.project_on_sale_id);

                  return (
                    <tr key={sale.id} className="hover:bg-gray-50/50 transition">
                      <td className="p-4">
                        <div className="font-bold text-gray-950">{sale.project_name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">ID: {sale.project_id}</div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-indigo-50/60 dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 font-bold px-2 py-1 rounded-lg text-[10px]">
                          {campaignObj ? campaignObj.project_name : 'Direct Booking'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 rounded-md font-extrabold font-mono text-[10px]">
                          Sale #{sale.sale_number}
                        </span>
                      </td>
                      <td className="p-4 font-extrabold text-gray-950 font-mono">{sale.unit_name}</td>
                      <td className="p-4">
                        <span className="flex items-center gap-1 text-gray-600 font-bold">
                          <Layers className="w-3.5 h-3.5 text-gray-400" />
                          Level {sale.floor_number}
                        </span>
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-indigo-600">{sale.unit_measure}</td>
                      <td className="p-4">
                        <span className="flex items-center gap-1 text-gray-600 font-mono text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {sale.sale_date}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-gray-950 font-bold">{sale.executive_name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{sale.executive_id}</div>
                      </td>
                      <td className="p-4 text-right">
                        {canModify ? (
                          <div className="flex items-center justify-end gap-2.5">
                            <button
                              onClick={() => openEditModal(sale)}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-50 transition cursor-pointer"
                              title="Edit sales entry"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(sale.id, sale.unit_name)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-55 transition cursor-pointer"
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
                    <td colSpan={9} className="text-center py-10 text-gray-400 text-xs font-mono">
                      No sales bookings logged yet.
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
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-gray-100 p-6 shadow-xl space-y-4 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }}
              className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:bg-gray-50 hover:text-gray-900 transition font-bold"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              {isAddOpen ? "Record Sales Booking Entry" : `Edit Sales Log Detail`}
            </h2>

            <form onSubmit={isAddOpen ? handleAddSubmit : handleEditSubmit} className="space-y-4 text-xs font-medium text-gray-700">
              <div className="space-y-3.5 bg-gray-50/50 p-4 border border-gray-100 rounded-2xl">
                {/* 1. Projects on Sale Dropdown */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Projects on Sale *</label>
                  <select
                    value={projectOnSaleId}
                    onChange={(e) => handleProjectOnSaleSelect(e.target.value)}
                    className="w-full text-xs font-semibold bg-white rounded-xl px-3.5 py-2.5 border border-gray-200 focus:outline-indigo-600 cursor-pointer"
                  >
                    <option value="" disabled>-- Choose Project Campaign on Sale --</option>
                    {projectsOnSale.map(pos => (
                      <option key={pos.id} value={pos.id}>{pos.project_name} ({pos.flat_unit_size})</option>
                    ))}
                  </select>
                </div>

                {/* 2. Automated Master site details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Property Site Location (Auto)</label>
                    <div className="bg-gray-100/80 rounded-xl px-3.5 py-2.5 font-bold text-gray-800">
                      🏢 {mappedMasterProject ? mappedMasterProject.location : 'None Select'}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Directory Project Name (Auto)</label>
                    <div className="bg-gray-100/80 rounded-xl px-3.5 py-2.5 font-bold text-gray-800 truncate" title={mappedMasterProject?.project_name}>
                      {mappedMasterProject ? mappedMasterProject.project_name : 'None Select'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* 3. Unit Name Selector Dropdown */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Unit ID / Name *</label>
                  {availableUnits.length === 0 ? (
                    <div className="text-[10px] bg-red-50 text-red-600 font-semibold p-2.5 rounded-xl border border-red-100 text-center">
                      Select campaign first
                    </div>
                  ) : (
                    <select
                      value={unitName}
                      onChange={(e) => handleUnitSelect(e.target.value)}
                      className="w-full text-xs font-bold bg-white rounded-xl px-3.5 py-2.5 border border-gray-200 focus:outline-indigo-600 cursor-pointer text-indigo-700 font-mono"
                    >
                      <option value="" disabled>-- Select Unit --</option>
                      {availableUnits.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* 4. Floor level number (Auto populated) */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Floor Level (Auto derived)</label>
                  <div className="bg-gray-100 rounded-xl px-3.5 py-2.5 font-extrabold font-mono text-gray-800 flex items-center gap-1">
                    <Layers className="w-4 h-4 text-gray-400" /> Floor {floorNumber}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Unit Measure (SFT Size - Auto)</label>
                  <div className="bg-gray-100 rounded-xl px-3.5 py-2.5 font-bold font-mono text-indigo-700">
                    {unitMeasure || 'Not configured'}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Booking Sales Date *</label>
                  <input
                    type="date"
                    required
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="w-full text-xs font-semibold bg-white rounded-xl px-3.5 py-2 border border-gray-200 focus:outline-indigo-600 font-mono text-gray-800"
                  />
                </div>

                {/* Seller designation dropdown */}
                <div className="col-span-2 space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Booking Sales Handled By *</label>
                  {userRole === 'Sales Executive' ? (
                    <div className="w-full text-xs bg-gray-100 rounded-xl px-3.5 py-2.5 border border-gray-100 font-semibold text-gray-800">
                      👤 {userProfile.name} (Your Name locked)
                    </div>
                  ) : (
                    <select
                      value={execId}
                      onChange={(e) => setExecId(e.target.value)}
                      className="w-full text-xs font-semibold bg-white rounded-xl px-3.5 py-2.5 border border-gray-200 focus:outline-indigo-600 cursor-pointer"
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
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2.5 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-xs transition cursor-pointer"
                >
                  {isAddOpen ? "Log Booking Contract" : "Save Adjusted Fields"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sleek Custom Confirm Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-gray-150 p-6 shadow-xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-105 flex items-center justify-center text-rose-600 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1 border-b border-gray-50 pb-2">
              <h3 className="font-bold text-gray-950 text-sm">Cancel Booking Contract?</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Delete unit contract <span className="font-semibold text-gray-800">'{deleteTarget.unit}'</span>? Chronology numbers will auto recalculate instantly.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold py-2.5 rounded-xl transition cursor-pointer"
              >
                No, Keep
              </button>
              <button
                type="button"
                onClick={confirmDeleteSale}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-xs transition cursor-pointer"
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
