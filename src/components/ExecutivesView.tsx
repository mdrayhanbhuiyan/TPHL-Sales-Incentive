/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Briefcase, 
  Trophy, 
  Calendar,
  X,
  CheckCircle,
  AlertTriangle,
  Upload,
  Download,
  Check
} from 'lucide-react';
import { SalesExecutive, SalesTeam, Project } from '../types';
import { useToast } from './Toast';

interface ExecutivesProps {
  authToken: string;
  userRole: string;
}

export default function ExecutivesView({ authToken, userRole }: ExecutivesProps) {
  const { toast } = useToast();
  const [executives, setExecutives] = useState<any[]>([]);
  const [teams, setTeams] = useState<SalesTeam[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedExec, setSelectedExec] = useState<any | null>(null);

  // CSV Modal & Import states
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  // Form states
  const [empId, setEmpId] = useState('');
  const [name, setName] = useState('');
  const [teamId, setTeamId] = useState('');
  const [projId, setProjId] = useState('');
  const [target, setTarget] = useState(1);
  const [joiningDate, setJoiningDate] = useState('');
  const [monthlyTargets, setMonthlyTargets] = useState<{ [key: string]: number }>({});
  const [targetMonth, setTargetMonth] = useState('2026-06');
  const [targetUnits, setTargetUnits] = useState(1);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const eRes = await fetch('/api/executives', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const execs = await eRes.json();
      setExecutives(execs);

      const tRes = await fetch('/api/teams', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const tms = await tRes.json();
      setTeams(tms);

      const pRes = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const projs = await pRes.json();
      setProjects(projs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [authToken]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!empId || !name) {
      setError("Please fill out Employee ID and Executive Name");
      toast.warning("Please fill out Employee ID and Executive Name");
      return;
    }

    try {
      const res = await fetch('/api/executives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          employee_id: empId,
          name,
          team_id: teamId,
          project_id: projId,
          target,
          joining_date: joiningDate,
          monthly_targets: monthlyTargets
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register executive");

      setSuccess(`Executive '${name}' successfully registered inside TPHL system directory.`);
      toast.success(`Executive '${name}' successfully registered!`);
      setIsAddOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || "Failed to register sales executive");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExec) return;
    setError(null);

    try {
      const res = await fetch(`/api/executives/${selectedExec.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name,
          team_id: teamId,
          project_id: projId,
          target,
          joining_date: joiningDate,
          monthly_targets: monthlyTargets
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to edit executive");

      setSuccess(`Executive File for '${name}' has been updated.`);
      toast.success(`Executive File for '${name}' has been updated!`);
      setIsEditOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || "Failed to update executive");
    }
  };

  // Custom delete state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleDelete = (execId: string, execName: string) => {
    setDeleteTarget({ id: execId, name: execName });
  };

  const confirmDeleteExec = async () => {
    if (!deleteTarget) return;
    const { id, name: execName } = deleteTarget;
    setDeleteTarget(null);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/executives/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete executive");

      setSuccess(`Record for '${execName}' has been removed successfully.`);
      toast.success(`Record for '${execName}' has been deleted successfully.`);
      fetchData();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || "Failed to delete executive record");
    }
  };

  const openAddModal = () => {
    setEmpId('');
    setName('');
    setTeamId(teams[0]?.id || '');
    setProjId(projects[0]?.id || '');
    setTarget(1);
    setJoiningDate(new Date().toISOString().split('T')[0]);
    setMonthlyTargets({});
    setError(null);
    setSuccess(null);
    setIsAddOpen(true);
  };

  const openEditModal = (exec: any) => {
    setSelectedExec(exec);
    setEmpId(exec.employee_id);
    setName(exec.name);
    setTeamId(exec.team_id);
    setProjId(exec.project_id);
    setTarget(exec.target || 1);
    setJoiningDate(exec.joining_date);
    setMonthlyTargets(exec.monthly_targets || {});
    setError(null);
    setSuccess(null);
    setIsEditOpen(true);
  };

  // CSV format download and upload logic
  const handleDownloadDummyCSV = () => {
    const headers = "employee_id,name,team_name,project_name,target,joining_date\n";
    // Find active team, project names if they exist, or use placeholders
    const activeTeamName = teams[0]?.team_name || "Alpha Team";
    const activeProjName = projects[0]?.project_name || "Regular Project (1100 - 1600+)";
    const row1 = `EMP-101,Abrar Hasan,${activeTeamName},${activeProjName},3,2026-06-01\n`;
    const row2 = `EMP-102,Maisha Tahsin,${activeTeamName},${activeProjName},2,2026-06-02\n`;
    const row3 = `EMP-103,Rahat Bin Kabir,,${activeProjName},4,2026-06-03`;
    
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headers + row1 + row2 + row3);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "tphl_sales_executives_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    readCsvData(file);
  };

  const handleCsvDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCsvDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      setCsvFile(file);
      readCsvData(file);
    } else {
      setCsvError("Only standard .csv files are supported.");
    }
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
        
        const lines = text.split(/\r?\n/);
        if (lines.length < 2) {
          setCsvError("CSV file must contain a header row and at least one data row.");
          return;
        }

        // Clean headers
        const headers = lines[0].split(',').map(header => header.trim().replace(/^["']|["']$/g, '').toLowerCase());
        
        const requiredHeaders = ['employee_id', 'name'];
        const missing = requiredHeaders.filter(h => !headers.includes(h));
        if (missing.length > 0) {
          setCsvError(`CSV missing required column headers: ${missing.join(', ')}`);
          return;
        }

        const items: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Simple CSV line parser split by comma but with quote safety
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

          // Validations
          const empIdVal = item.employee_id?.trim();
          const nameVal = item.name?.trim();
          
          if (!empIdVal || !nameVal) {
            item._invalid = true;
            item._reason = "Employee ID and Name are required and cannot be blank.";
          } else {
            // Check duplicates in uploaded batch
            if (items.some(it => it.employee_id?.toLowerCase() === empIdVal.toLowerCase())) {
              item._invalid = true;
              item._reason = `Duplicate Employee ID in upload file.`;
            } else {
              // Check duplicate in database list
              const existingDupe = executives.some(e => e.employee_id.toLowerCase() === empIdVal.toLowerCase());
              if (existingDupe) {
                item._invalid = true;
                item._reason = `Employee ID already exists inside TPHL directory.`;
              }
            }
          }

          item.employee_id = empIdVal || '';
          item.name = nameVal || '';
          item.team_name = item.team_name?.trim() || '';
          item.project_name = item.project_name?.trim() || '';
          item.target = item.target ? Number(item.target) : 2;
          item.joining_date = item.joining_date?.trim() || new Date().toISOString().split('T')[0];

          items.push(item);
        }

        if (items.length === 0) {
          setCsvError("No valid rows parsed from the CSV file.");
        } else {
          setParsedData(items);
        }
      } catch (err) {
        setCsvError("Error parsing the CSV file.");
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  const submitCsvImport = async () => {
    const validRows = parsedData.filter(d => !d._invalid);
    if (validRows.length === 0) {
      setCsvError("There are no valid entries to import.");
      return;
    }

    setImporting(true);
    setCsvError(null);
    try {
      const res = await fetch('/api/executives/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ executives: validRows })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "CSV bulk registration failed.");

      setSuccess(`Success! Registered ${result.importedCount} new Sales Executives of TPHL directory via CSV. ${result.skippedCount} rows skipped.`);
      toast.success(`Successfully imported ${result.importedCount} Sales Executives!`);
      setIsCsvModalOpen(false);
      setCsvFile(null);
      setParsedData([]);
      fetchData();
    } catch (err: any) {
      setCsvError(err.message);
      toast.error(err.message || "Failed to import executives via CSV");
    } finally {
      setImporting(false);
    }
  };

  const openCsvModal = () => {
    setCsvFile(null);
    setParsedData([]);
    setCsvError(null);
    setImporting(false);
    setError(null);
    setSuccess(null);
    setIsCsvModalOpen(true);
  };

  const filteredExecs = executives.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_id.toLowerCase().includes(search.toLowerCase()) ||
    e.team_name.toLowerCase().includes(search.toLowerCase()) ||
    e.project_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Sales Executive Directory</h1>
          <p className="mt-1 text-sm text-gray-500">Track company sales engineers, manage active divisions alignments, and configure monthly targets.</p>
        </div>
        {userRole === 'Admin' && (
          <div className="flex flex-wrap gap-2.5 self-start sm:self-auto">
            <button
              onClick={openCsvModal}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 shadow-sm cursor-pointer transition active:scale-95"
              title="Upload Sales Executive directory in batch using CSV"
            >
              <Upload className="w-4 h-4 text-indigo-500 font-bold" /> Import via CSV
            </button>
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md cursor-pointer transition active:scale-95"
            >
              <Plus className="w-4.5 h-4.5" /> Register Officer
            </button>
          </div>
        )}
      </div>

      {/* Action Line alerts */}
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
          placeholder="Filter officers by ID, name, division, project..."
          className="bg-transparent text-sm w-full focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-2">
          <div className="w-9 h-9 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
          <p className="text-xs text-gray-400 font-mono">Parsing officers directories...</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredExecs.map(exec => (
            <div 
              key={exec.id} 
              className="bg-white border border-gray-100 rounded-3xl p-5 shadow-2xs hover:shadow-xs transition duration-200 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                      🏢
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm leading-tight">{exec.name}</h3>
                      <p className="text-[10px] text-gray-400 font-mono font-bold tracking-wider uppercase">{exec.employee_id}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 pt-1 text-xs text-gray-600">
                  <div className="flex items-center gap-2 text-gray-700 font-semibold">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Team: {exec.team_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🏢 Principal Project: {exec.project_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="font-bold text-emerald-700">Quota Target: {exec.target.toLocaleString()} Flat(s)</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Joined: {exec.joining_date}</span>
                  </div>
                </div>

                {/* Simulated testing credentials badge */}
                <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-2.5 space-y-1">
                  <span className="text-[9px] font-bold text-amber-800 uppercase tracking-wider block">🔒 Demo Account Sign-In</span>
                  <div className="flex items-center justify-between text-[11px] font-mono text-amber-900">
                    <span>{exec.employee_id.toLowerCase()}@tphl.com</span>
                    <span className="text-[9px] bg-white border border-amber-200 px-1.5 rounded text-gray-400 font-bold">password123</span>
                  </div>
                </div>
              </div>

              {userRole === 'Admin' && (
                <div className="flex items-center justify-end gap-3 border-t border-gray-50 pt-3.5 mt-4">
                  <button
                    onClick={() => openEditModal(exec)}
                    className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 transition cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" /> Configure File
                  </button>
                  <button
                    onClick={() => handleDelete(exec.id, exec.name)}
                    className="p-2 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-gray-50 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
          {filteredExecs.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400 text-xs font-mono">
              No matching executives registered.
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Officer Modal Form */}
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
              <Users className="w-5 h-5 text-indigo-600" />
              {isAddOpen ? "Register Sales Executive Profile" : `Configure Executive: ${selectedExec?.name}`}
            </h2>

            <form onSubmit={isAddOpen ? handleAddSubmit : handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Employee/Corp ID</label>
                  <input
                    type="text"
                    required
                    disabled={isEditOpen}
                    value={empId}
                    onChange={(e) => setEmpId(e.target.value)}
                    placeholder="e.g. EMP10"
                    className="w-full text-xs bg-gray-50 rounded-lg px-3.5 py-2.5 border border-gray-100 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Executive Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sultana Razia"
                    className="w-full text-xs bg-gray-50 rounded-lg px-3.5 py-2.5 border border-gray-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Sales Division Team</label>
                  <select
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    className="w-full text-xs bg-gray-50 rounded-lg px-3.5 py-2.5 border border-gray-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">No Team Division (Independent)</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.team_name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Principal Bound Project</label>
                  <select
                    value={projId}
                    onChange={(e) => setProjId(e.target.value)}
                    className="w-full text-xs bg-gray-50 rounded-lg px-3.5 py-2.5 border border-gray-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">No Project Assigned</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.project_name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Individual Base Target Quota (Number of Flats)</label>
                  <input
                    type="number"
                    value={target}
                    onChange={(e) => setTarget(Number(e.target.value))}
                    className="w-full text-xs bg-gray-50 rounded-lg px-3.5 py-2.5 border border-gray-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5 col-span-2 border-t border-gray-55 pt-3">
                  <label className="text-xs font-bold text-gray-500 uppercase">Month-wise Executive Target Configuration (Optional)</label>
                  
                  {/* Monthly Editor inputs */}
                  <div className="grid grid-cols-3 gap-2 bg-gray-55/60 p-2.5 rounded-xl border border-gray-100/80">
                    <input
                      type="month"
                      value={targetMonth}
                      onChange={(e) => setTargetMonth(e.target.value)}
                      className="col-span-1 text-[11px] font-bold bg-white border border-gray-200 rounded-lg p-1.5 focus:outline-none"
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Override units"
                      value={targetUnits}
                      onChange={(e) => setTargetUnits(Number(e.target.value))}
                      className="col-span-1 text-[11px] font-bold bg-white border border-gray-200 rounded-lg p-1.5 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!targetMonth) return;
                        setMonthlyTargets(prev => ({
                          ...prev,
                          [targetMonth]: Number(targetUnits || 1)
                        }));
                      }}
                      className="col-span-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-extrabold py-1 rounded-lg transition"
                    >
                      Add Target
                    </button>
                  </div>

                  {/* List of custom targets overrides */}
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {Object.keys(monthlyTargets).length === 0 ? (
                      <span className="text-[10px] text-gray-400 italic">No monthly target overrides registered. Base target was applied instead.</span>
                    ) : (
                      Object.entries(monthlyTargets).map(([mKey, uVal]) => (
                        <span
                          key={mKey}
                          className="inline-flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-[10px] font-bold"
                        >
                          📅 {mKey}: <strong>{uVal} Units</strong>
                          <button
                            type="button"
                            onClick={() => {
                              setMonthlyTargets(prev => {
                                const next = { ...prev };
                                delete next[mKey];
                                return next;
                              });
                            }}
                            className="text-rose-500 hover:text-rose-700 font-extrabold"
                          >
                            ✕
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Employment Joining Date</label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full text-xs bg-gray-50 rounded-lg px-3.5 py-2.5 border border-gray-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {isAddOpen && (
                <div className="rounded-xl bg-blue-50 border border-blue-100 p-3.5 text-[11px] text-blue-800">
                  <p className="font-semibold flex items-center gap-1">🛡️ Automated Setup Warning</p>
                  <p className="mt-0.5 leading-normal opacity-90">Creating this profile auto-registers a secure user account matching their Employee ID prefix (e.g. <b>{'<corp_id>@tphl.com'}</b>) utilizing default security pass <b>{'password123'}</b> to simplify live validation swaps.</p>
                </div>
              )}

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
                  {isAddOpen ? "Create Profile" : "Apply Modifications"}
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
              <h3 className="font-bold text-gray-950 text-sm">Delete Executive?</h3>
              <p className="text-xs text-gray-500">
                Are you completely sure you want to delete the record for executive <span className="font-semibold text-gray-800">'{deleteTarget.name}'</span>? 
                This fails if they have active sales logged.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold py-2.5 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteExec}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold py-2.5 rounded-xl shadow-md transition"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. DYNAMIC CSV IMPORT MODAL */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 max-h-[92vh] flex flex-col justify-between text-gray-850 dark:text-slate-100">
            <div className="flex items-start justify-between border-b border-gray-100 dark:border-slate-800 pb-4 shrink-0">
              <div className="space-y-1">
                <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-indigo-500" /> Bulk Import Sales Executives
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Quickly register multiple sales executives at once by dragging or browsing a CSV file.
                </p>
              </div>
              <button 
                onClick={() => setIsCsvModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl text-gray-400 dark:text-slate-500 transition hover:text-gray-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-5 py-1">
              {/* Dummy CSV Instructions & Download Block */}
              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/60 dark:border-indigo-950/55 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-350">Download Reference CSV Format</h4>
                  <p className="text-[11px] text-indigo-800/80 dark:text-indigo-400/80 leading-relaxed">
                    Make sure your CSV contains columns for <strong>employee_id</strong>, <strong>name</strong>, <strong>team_name</strong>, <strong>project_name</strong>, <strong>target</strong>, and <strong>joining_date</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadDummyCSV}
                  className="flex items-center gap-1.5 px-3.5 py-2 hover:bg-indigo-600 bg-indigo-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shrink-0 self-start sm:self-auto shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" /> Get Demo CSV Form
                </button>
              </div>

              {/* Drag and Drop Box */}
              <div 
                onDragOver={handleCsvDragOver}
                onDrop={handleCsvDrop}
                onClick={() => document.getElementById('csv-file-picker')?.click()}
                className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition duration-150 ${
                  csvFile 
                    ? 'border-indigo-400 bg-indigo-50/10 dark:bg-slate-800/20' 
                    : 'border-gray-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-gray-50/50 dark:hover:bg-slate-800/20'
                }`}
              >
                <input 
                  type="file" 
                  id="csv-file-picker"
                  accept=".csv"
                  onChange={handleCsvFileChange}
                  className="hidden" 
                />
                
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-slate-800 flex items-center justify-center text-indigo-500 mx-auto border border-indigo-100/40 dark:border-indigo-900/40">
                    <Upload className="w-6 h-6" />
                  </div>
                  {csvFile ? (
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-gray-900 dark:text-white">File selected: <span className="font-mono text-indigo-600 dark:text-indigo-400">{csvFile.name}</span></p>
                      <p className="text-[10px] text-gray-400 font-mono">{(csvFile.size / 1024).toFixed(1)} KB • Click or drop to replace</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-gray-800 dark:text-slate-200">Drag &amp; drop your CSV file here, or <span className="text-indigo-600 dark:text-indigo-400 underline">browse</span></p>
                      <p className="text-[10px] text-gray-400 dark:text-slate-500">Only standard encoded comma-separated .csv values are parsed</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Parsing Alert & Messages */}
              {csvError && (
                <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-950/20 border border-rose-150 dark:border-rose-900/40 p-3.5 rounded-2xl text-[11px] font-medium text-rose-800 dark:text-rose-455">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-normal">{csvError}</span>
                </div>
              )}

              {/* CSV Rows Live Preview Table */}
              {parsedData.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                    <span>Parsed CSV Row Preview ({parsedData.length} records detected)</span>
                    <span className="text-indigo-600 dark:text-indigo-400">{parsedData.filter(d => !d._invalid).length} valid • {parsedData.filter(d => d._invalid).length} skipped</span>
                  </div>

                  <div className="border border-gray-100 dark:border-slate-800/80 rounded-2xl overflow-hidden max-h-[220px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-gray-50/70 dark:bg-slate-800/30 sticky top-0 border-b border-gray-100 dark:border-slate-800 text-[10px] text-gray-400 dark:text-slate-500 uppercase font-mono">
                        <tr>
                          <th className="px-4 py-2.5">Row</th>
                          <th className="px-4 py-2.5">Officer ID</th>
                          <th className="px-4 py-2.5">Name</th>
                          <th className="px-4 py-2.5">Team &amp; Project Mapping</th>
                          <th className="px-4 py-2.5">Target</th>
                          <th className="px-4 py-2.5 text-right">Verification</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-slate-800/40 dark:bg-slate-900/25">
                        {parsedData.map((row, idx) => (
                          <tr key={idx} className={row._invalid ? 'bg-rose-50/10 dark:bg-rose-950/5 opacity-85' : 'hover:bg-gray-50/20'}>
                            <td className="px-4 py-3 font-mono font-bold text-gray-400 text-[11px]">{idx + 1}</td>
                            <td className="px-4 py-3 font-mono font-bold text-gray-900 dark:text-white text-[11px]">{row.employee_id || <span className="italic text-gray-300">none</span>}</td>
                            <td className="px-4 py-3 font-semibold text-gray-700 dark:text-slate-300">{row.name || <span className="italic text-gray-300">none</span>}</td>
                            <td className="px-4 py-3 space-y-1">
                              <div className="text-[10px] flex items-center gap-1">
                                <span className="text-gray-400 font-medium">Team:</span>
                                {row.team_name ? (
                                  teams.some(t => t.team_name.toLowerCase().trim() === row.team_name.toLowerCase().trim()) ? (
                                    <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-450 font-bold px-1.5 py-0.2 rounded-sm text-[9px]">{row.team_name}</span>
                                  ) : (
                                    <span className="bg-amber-500/10 text-amber-700 dark:text-amber-450 font-bold px-1.5 py-0.2 rounded-sm text-[9px]" title="Team name doesn't match database; will set to Independent">{row.team_name} (Unassigned)</span>
                                  )
                                ) : (
                                  <span className="text-gray-400 font-medium italic">Independent</span>
                                )}
                              </div>
                              <div className="text-[10px] flex items-center gap-1">
                                <span className="text-gray-400 font-medium">Proj:</span>
                                {row.project_name ? (
                                  projects.some(p => p.project_name.toLowerCase().trim() === row.project_name.toLowerCase().trim()) ? (
                                    <span className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold px-1.5 py-0.2 rounded-sm text-[9px]">{row.project_name}</span>
                                  ) : (
                                    <span className="bg-amber-500/10 text-amber-700 dark:text-amber-450 font-bold px-1.5 py-0.2 rounded-sm text-[9px]" title="Project name doesn't match database; will set to No Project Assigned">{row.project_name} (No Link)</span>
                                  )
                                ) : (
                                  <span className="text-gray-400 font-medium italic">None Assigned</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono font-medium">{row.target} Flat(s)</td>
                            <td className="px-4 py-3 text-right">
                              {row._invalid ? (
                                <span className="inline-flex items-center gap-1 text-[9px] bg-rose-500/10 border border-rose-500/20 hover:border-rose-500 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded-full font-semibold max-w-[140px] truncate" title={row._reason}>
                                  ⚠️ {row._reason}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono">
                                  <Check className="w-2.5 h-2.5" /> Validated
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 dark:border-slate-800 pt-4 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(false)}
                className="flex-1 bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-100 text-xs font-bold py-3 rounded-xl transition cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitCsvImport}
                disabled={importing || parsedData.filter(d => !d._invalid).length === 0}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 dark:disabled:bg-slate-805 text-white disabled:text-gray-400 dark:disabled:text-slate-500 text-xs font-bold py-3 rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {importing ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border border-current border-t-transparent animate-spin" />
                    <span>Adding Officers...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4.5 h-4.5" />
                    <span>Import {parsedData.filter(d => !d._invalid).length} validated officers</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
