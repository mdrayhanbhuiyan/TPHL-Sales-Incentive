/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  Layers, 
  Building2, 
  Search, 
  Filter, 
  ArrowRight, 
  HelpCircle,
  FileCheck2,
  CalendarDays,
  Download,
  Upload
} from 'lucide-react';
import { ProjectOnSale, UnitRegistration, Project } from '../types';
import { useToast } from './Toast';

interface RegistrationViewProps {
  authToken: string;
  userRole: string;
}

export default function RegistrationView({ authToken, userRole }: RegistrationViewProps) {
  const { toast } = useToast();
  const [projectsOnSale, setProjectsOnSale] = useState<ProjectOnSale[]>([]);
  const [directoryProjects, setDirectoryProjects] = useState<Project[]>([]);
  const [unitRegistrations, setUnitRegistrations] = useState<UnitRegistration[]>([]);
  
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  // UI filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'registered' | 'pending'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // CSV Import/Export states
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const isAdmin = userRole === 'Admin';

  const handleExportCSV = () => {
    const headers = [
      "ID",
      "Project ID",
      "Project Name",
      "Unit Name",
      "Registered (Yes/No)",
      "Registration Date",
      "Created At"
    ];

    const currentProjectName = selectedProject ? selectedProject.project_name : "All_Projects";

    // Export all registrations for selected project or active list
    const targetRegs = unitRegistrations.filter(r => r.project_on_sale_id === selectedProjectId);

    const rows = targetRegs.map(r => [
      `"${r.id}"`,
      `"${r.project_on_sale_id}"`,
      `"${String(currentProjectName || '').replace(/"/g, '""')}"`,
      `"${String(r.unit_name || '').replace(/"/g, '""')}"`,
      `"${String(r.registered || '').replace(/"/g, '""')}"`,
      `"${String(r.registration_date || '').replace(/"/g, '""')}"`,
      `"${String(r.created_at || '').replace(/"/g, '""')}"`
    ]);

    const csvString = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `tphl_unit_registrations_${currentProjectName.replace(/\s+/g, '_')}_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Successfully exported Unit Registrations!");
  };

  const handleDownloadDummyCSV = () => {
    const headers = [
      "project_name",
      "unit_name",
      "registered",
      "registration_date"
    ].join(",");

    const rows = [
      `"${selectedProject?.project_name || 'Project-A'}","1A","Yes","2026-06-15"`,
      `"${selectedProject?.project_name || 'Project-A'}","1B","No",""`
    ].join("\n");

    const csvContent = headers + "\n" + rows;
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "tphl_unit_registrations_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    readCsvData(file);
  };

  const readCsvData = (file: File) => {
    setCsvError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setCsvError("Uploaded file is empty.");
          return;
        }

        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) {
          setCsvError("CSV file must contain headers and at least one row.");
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
        const required = ['unit_name', 'registered'];
        const missing = required.filter(h => !headers.includes(h));
        if (missing.length > 0) {
          setCsvError(`Missing required column headers: ${missing.join(', ')}`);
          return;
        }

        const items: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const values: string[] = [];
          let currentVal = '';
          let inQuotes = false;
          for (let charIndex = 0; charIndex < line.length; charIndex++) {
            const char = line[charIndex];
            if (char === '"' || char === "'") {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(currentVal.trim().replace(/^["']|["']$/g, ''));
              currentVal = '';
            } else {
              currentVal += char;
            }
          }
          values.push(currentVal.trim().replace(/^["']|["']$/g, ''));

          const item: any = {};
          headers.forEach((h, index) => {
            item[h] = values[index] !== undefined ? values[index] : '';
          });

          if (!item.unit_name) {
            item._invalid = true;
            item._reason = "Unit name is required.";
          } else {
            const regStateStr = String(item.registered).toLowerCase();
            if (regStateStr !== 'yes' && regStateStr !== 'no' && regStateStr !== 'true' && regStateStr !== 'false') {
              item._invalid = true;
              item._reason = "Registered field must be 'Yes', 'No', 'true', or 'false'.";
            }
          }

          items.push(item);
        }

        if (items.length === 0) {
          setCsvError("No valid rows parsed.");
        } else {
          setParsedData(items);
        }
      } catch (err) {
        setCsvError("Error reading the file.");
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  const submitCsvImport = async () => {
    const validRows = parsedData.filter(d => !d._invalid);
    if (validRows.length === 0) {
      setCsvError("No valid rows to import.");
      return;
    }

    const payload = validRows.map(r => ({
      project_name: r.project_name || selectedProject?.project_name,
      project_on_sale_id: r.project_on_sale_id || selectedProjectId,
      unit_name: r.unit_name,
      registered: r.registered,
      registration_date: r.registration_date || undefined
    }));

    setImporting(true);
    setCsvError(null);
    try {
      const res = await fetch('/api/unit-registrations/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ items: payload })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Unit registrations import failed.");

      toast.success(`Successfully imported/updated ${result.updatedCount} unit registration deeds!`);
      setIsCsvModalOpen(false);
      setCsvFile(null);
      setParsedData([]);
      
      fetchInitialData();
    } catch (err: any) {
      setCsvError(err.message);
      toast.error(err.message);
    } finally {
      setImporting(false);
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch campaigns on sale
      try {
        const posRes = await fetch('/api/projects-on-sale', {
          headers: { 
            'Authorization': `Bearer ${authToken}`,
            'Accept': 'application/json'
          }
        });
        if (posRes.ok) {
          const posData = await posRes.json();
          const loadedPos = Array.isArray(posData) ? posData : [];
          setProjectsOnSale(loadedPos);
          if (loadedPos.length > 0) {
            setSelectedProjectId(loadedPos[0].id);
          }
        } else {
          console.warn("[RegistrationView] Failed to fetch campaigns on sale. Status: " + posRes.status);
        }
      } catch (e) {
        console.error("Error fetching projects-on-sale:", e);
      }

      // 2. Fetch directory projects
      try {
        const dirRes = await fetch('/api/projects', {
          headers: { 
            'Authorization': `Bearer ${authToken}`,
            'Accept': 'application/json'
          }
        });
        if (dirRes.ok) {
          const dirData = await dirRes.json();
          setDirectoryProjects(Array.isArray(dirData) ? dirData : []);
        } else {
          console.warn("[RegistrationView] Failed to fetch directory projects. Status: " + dirRes.status);
        }
      } catch (e) {
        console.error("Error fetching directory projects:", e);
      }

      // 3. Fetch registrations
      try {
        const regRes = await fetch('/api/unit-registrations', {
          headers: { 
            'Authorization': `Bearer ${authToken}`,
            'Accept': 'application/json'
          }
        });
        if (regRes.ok) {
          const regData = await regRes.json();
          setUnitRegistrations(Array.isArray(regData) ? regData : []);
        } else {
          console.warn("[RegistrationView] Failed to fetch registrations data. Status: " + regRes.status);
          throw new Error("HTTP " + regRes.status);
        }
      } catch (e) {
        console.error("Failed loading registrations data", e);
      }

    } catch (e) {
      console.error("Global registrations load exception:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [authToken]);

  // Handle setting/toggle registration
  const handleToggleRegistration = async (record: UnitRegistration, forceState?: 'Yes' | 'No', customDate?: string) => {
    setUpdatingId(record.id);

    const nextState = forceState ? forceState : (record.registered === 'Yes' ? 'No' : 'Yes');
    // Set current date or provided date
    const nextDate = nextState === 'Yes' 
      ? (customDate || record.registration_date || new Date().toISOString().split('T')[0])
      : undefined;

    try {
      const res = await fetch(`/api/unit-registrations/${record.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          registered: nextState,
          registration_date: nextDate
        })
      });

      if (res.ok) {
        const updatedRecord = await res.json();
        // Update local state
        setUnitRegistrations(prev => prev.map(r => r.id === record.id ? updatedRecord : r));
        toast.success(`Unit ${record.unit_name} registration status successfully updated to ${nextState}!`);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update registration state.");
        toast.error(err.error || "Failed to update unit registration state.");
      }
    } catch (e) {
      console.error(e);
      alert("Error reaching Server DB.");
      toast.error("Network error reaching server database.");
    } finally {
      setUpdatingId(null);
    }
  };

  const selectedProject = projectsOnSale.find(p => p.id === selectedProjectId);
  const mappedDirProject = selectedProject ? directoryProjects.find(d => d.id === selectedProject.project_id) : null;

  // Filter registrations belonging to selected pre-sale project
  const filteredRegs = unitRegistrations.filter(r => {
    if (r.project_on_sale_id !== selectedProjectId) return false;
    
    // Status Filter
    if (statusFilter === 'registered' && r.registered !== 'Yes') return false;
    if (statusFilter === 'pending' && r.registered !== 'No') return false;

    // Search Query (Unit Name search)
    if (searchQuery && !r.unit_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;

    return true;
  });

  const totalRegisteredCount = unitRegistrations.filter(r => r.project_on_sale_id === selectedProjectId && r.registered === 'Yes').length;
  const projectTotalUnits = selectedProject ? selectedProject.total_units : 0;
  const registrationPercentage = projectTotalUnits > 0 ? Math.round((totalRegisteredCount / projectTotalUnits) * 100) : 0;

  return (
    <div className="space-y-6" id="registration-management-view">
      {/* Header Panel */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-indigo-600" /> Unit Registrations &amp; Deeds
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Specify partial or complete flat-level land registry states (Yes/No) that act as criteria for active incentive commission payouts.
          </p>
        </div>
        {projectsOnSale.length > 0 && (
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Select Campaign Property:</span>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-bold p-2 px-3 rounded-xl border border-gray-200 dark:border-slate-700 focus:outline-none cursor-pointer"
              >
                {projectsOnSale.map(p => (
                  <option key={p.id} value={p.id}>{p.project_name}</option>
                ))}
              </select>
            </div>
            
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-white hover:bg-gray-100 text-gray-700 font-bold p-2 px-3.5 rounded-xl border border-gray-200 cursor-pointer shadow-sm transition active:scale-95 text-xs"
              title="Export unit listings as CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" /> Export CSV
            </button>

            {isAdmin && (
              <button
                onClick={() => {
                  setCsvFile(null);
                  setParsedData([]);
                  setCsvError(null);
                  setIsCsvModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold p-2 px-3.5 rounded-xl cursor-pointer shadow-sm transition active:scale-95 text-xs"
                title="Bulk registry update via CSV"
              >
                <Upload className="w-3.5 h-3.5" /> Import CSV
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 animate-pulse">
          <div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
        </div>
      ) : projectsOnSale.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-12 text-center text-gray-400 max-w-lg mx-auto space-y-3">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="text-sm font-bold text-gray-800 dark:text-white">Configure Pre-sales Project Prior to Deeds</h3>
          <p className="text-xs text-gray-500 max-w-xs mx-auto">
            Deeds &amp; unit legal states require a registered Projects On Sale campaign config directory to establish floor arrays.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Left panel: Quick statistics for selected pre-sale project */}
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-3xl space-y-4 shadow-2xs lg:col-span-1">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Campaign Overview</h2>
              <p className="text-sm font-extrabold text-gray-900 dark:text-white mt-0.5">{selectedProject?.project_name}</p>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-800/40 p-3 rounded-2xl">
                <div>
                  <span className="text-gray-400 block font-medium">Mapped master project</span>
                  <span className="font-extrabold text-gray-800 dark:text-slate-300">{mappedDirProject ? mappedDirProject.project_name : 'No Mapping'}</span>
                </div>
              </div>

              <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-800/40 p-3 rounded-2xl">
                <div>
                  <span className="text-gray-400 block font-medium">Registry Progress</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-extrabold text-gray-900 dark:text-white text-base">{totalRegisteredCount}</span>
                    <span className="text-gray-400"> / {projectTotalUnits} Units</span>
                    <span className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-extrabold px-1.5 py-0.5 rounded-md text-[10px] font-mono">{registrationPercentage}%</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-500" 
                  style={{ width: `${registrationPercentage}%` }}
                />
              </div>

              <div className="pt-2 bg-indigo-50/50 dark:bg-indigo-950/25 p-3 rounded-2xl text-[10px] text-indigo-700 dark:text-indigo-400 space-y-1">
                <div className="flex gap-1.5 items-start">
                  <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Partial registration supports setting registration "Yes" only for purchased/notarized flats. Non-registered units will compute <strong>0 BDT Base incentives</strong> until toggled here.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right panel: Search and Units Grid */}
          <div className="lg:col-span-3 space-y-4">
            {/* Filter Hub Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-3xs">
              {/* Search Box */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Query unit ID (e.g. 1A, 5B)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs font-semibold pl-9 pr-4 py-2 border border-gray-200 dark:border-slate-800 bg-gray-55/40 dark:bg-slate-900 rounded-xl text-gray-800 dark:text-white focus:outline-indigo-600"
                />
              </div>

              {/* Tabs filter */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800/80 p-1 rounded-xl text-[11px] font-bold">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer transition ${statusFilter === 'all' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-2xs' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  All ({filteredRegs.length + (statusFilter !== 'all' ? 1 : 0) ? unitRegistrations.filter(r => r.project_on_sale_id === selectedProjectId).length : 0})
                </button>
                <button
                  onClick={() => setStatusFilter('registered')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer transition ${statusFilter === 'registered' ? 'bg-emerald-500 text-white shadow-2xs' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Registered ({unitRegistrations.filter(r => r.project_on_sale_id === selectedProjectId && r.registered === 'Yes').length})
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer transition ${statusFilter === 'pending' ? 'bg-orange-500 text-white shadow-2xs' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Pending ({unitRegistrations.filter(r => r.project_on_sale_id === selectedProjectId && r.registered === 'No').length})
                </button>
              </div>
            </div>

            {/* Units Grid */}
            {filteredRegs.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-gray-150/60 dark:border-slate-800 p-12 rounded-3xl text-center text-gray-400 max-w-sm mx-auto">
                <Search className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="text-xs font-bold text-gray-700 dark:text-white">No Matching Units</p>
                <p className="text-[10px] text-gray-400 mt-1">Adjust search parameters or status filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredRegs.map((reg) => {
                  const isReg = reg.registered === 'Yes';
                  return (
                    <div
                      key={reg.id}
                      className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between space-y-3 transition shadow-3xs ${
                        isReg 
                          ? 'border-emerald-200/60 dark:border-emerald-900/30 ring-1 ring-emerald-100/30' 
                          : 'border-gray-150/80 dark:border-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-black text-gray-950 dark:text-white font-mono flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-gray-400" /> Unit {reg.unit_name}
                          </span>
                          <span className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Floor {parseInt(reg.unit_name)}</span>
                        </div>

                        {/* Registered badge */}
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          isReg 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' 
                            : 'bg-amber-50 text-amber-700 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {isReg ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <XCircle className="w-3 h-3 text-amber-500" />} {isReg ? 'Registered' : 'Pending'}
                        </span>
                      </div>

                      {/* Registration Date Field (interactive if registered) */}
                      {isReg ? (
                        <div className="space-y-1 bg-emerald-50/20 rounded-xl p-2.5 border border-emerald-100/20 dark:bg-slate-800/40 dark:border-slate-700/30">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-emerald-500" /> Registered Date:
                          </label>
                          <input
                            type="date"
                            value={reg.registration_date || ''}
                            onChange={(e) => handleToggleRegistration(reg, 'Yes', e.target.value)}
                            className="w-full text-[11px] font-semibold bg-white dark:bg-slate-900 border border-emerald-100 dark:border-slate-700 p-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs dark:text-white"
                          />
                        </div>
                      ) : (
                        <div className="text-[10px] text-gray-400 italic bg-gray-50 dark:bg-slate-800/20 p-2 text-center rounded-xl font-medium">
                          Deed not yet registered.
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[9px] text-gray-400">Claims Recalculation Ready</span>
                        {updatingId === reg.id ? (
                          <div className="w-5 h-5 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
                        ) : (
                          <button
                            onClick={() => handleToggleRegistration(reg)}
                            className={`p-1 px-3 rounded-lg text-[10px] font-bold tracking-tight cursor-pointer transition ${
                              isReg 
                                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/20' 
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}
                          >
                            {isReg ? 'Revoke Deed' : 'Complete Deed'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CSV Bulk uploader modal */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-gray-100 dark:border-slate-800 p-6 shadow-2xl space-y-6 relative">
            <button 
              onClick={() => setIsCsvModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full"
            >
              <XCircle className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-805 pb-3">
              <Upload className="w-5 h-5 text-indigo-600" />
              <h2 className="text-sm font-bold text-gray-800 dark:text-white">Bulk Unit Registrations &amp; Deeds Import</h2>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-gray-500 dark:text-slate-400">
                You can import or update deeds using a comma-separated spreadsheet. This automatically maps the unit name to the selected Campaign Property and sets the registered status.
              </p>

              <div className="flex gap-2.5 bg-indigo-50/50 dark:bg-indigo-950/25 p-3.5 rounded-2xl border border-indigo-100/30">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-indigo-955 dark:text-indigo-350">Download Standard CSV Format</h4>
                  <p className="text-[10px] text-indigo-800/80 dark:text-indigo-400">Perfectly preset for your selected Campaign Property: <strong className="font-extrabold">{selectedProject?.project_name}</strong>.</p>
                </div>
                <button
                  onClick={handleDownloadDummyCSV}
                  className="ml-auto flex items-center justify-center gap-1.5 bg-white hover:bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold p-1.5 px-3 rounded-lg shadow-2xs cursor-pointer transition shrink-0"
                >
                  <Download className="w-3.5 h-3.5" /> Get Demo CSV Form
                </button>
              </div>

              {/* Upload Drop Zone */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Upload CSV File</label>
                <div className="border-2 border-dashed border-indigo-200/60 rounded-2xl p-6 hover:bg-indigo-50/10 transition cursor-pointer text-center relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-indigo-950 dark:text-white">
                    {csvFile ? csvFile.name : "Drag & drop CSV file or click to browse"}
                  </p>
                  <p className="text-[9px] text-gray-400 mt-1">Accepts comma-separated spreadsheet only</p>
                </div>
              </div>

              {csvError && (
                <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl text-[10px] text-rose-800 font-semibold">{csvError}</div>
              )}

              {parsedData.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-gray-400">Parsed Entries Preview ({parsedData.length} records)</h3>
                  <div className="border border-gray-100 dark:border-slate-800 rounded-xl max-h-36 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-850">
                    {parsedData.slice(0, 50).map((row, index) => (
                      <div key={index} className={`p-2 text-[10px] flex items-center justify-between font-mono ${row._invalid ? 'bg-rose-50/10' : ''}`}>
                        <div>
                          <span className="font-extrabold text-gray-800 dark:text-white">Unit: {row.unit_name || 'N/A'}</span>
                          <span className="text-gray-400 mx-2">|</span>
                          <span className="text-gray-500 font-bold">Registered: {row.registered || 'N/A'}</span>
                        </div>
                        {row._invalid ? (
                          <span className="text-rose-600 font-bold">{row._reason}</span>
                        ) : (
                          <span className="text-emerald-600 font-bold">✓ Valid</span>
                        )}
                      </div>
                    ))}
                    {parsedData.length > 50 && (
                      <div className="p-2 text-center text-[9px] bg-gray-50/50 text-gray-400">And {parsedData.length - 50} more records...</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-gray-100 dark:border-slate-805">
              <button
                onClick={() => setIsCsvModalOpen(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold py-2 rounded-xl px-4 cursor-pointer transition active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={submitCsvImport}
                disabled={importing || parsedData.filter(d => !d._invalid).length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-xl px-4 cursor-pointer transition active:scale-95 flex items-center gap-1.5 shadow-sm"
              >
                {importing ? "Processing..." : `Import ${parsedData.filter(d => !d._invalid).length} Records`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
