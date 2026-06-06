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
  FolderGit2, 
  Target, 
  Briefcase,
  X,
  CheckCircle,
  AlertTriangle,
  Upload,
  Download,
  Check
} from 'lucide-react';
import { SalesTeam, Project } from '../types';

interface TeamsViewProps {
  authToken: string;
  userRole: string;
}

export default function TeamsView({ authToken, userRole }: TeamsViewProps) {
  const [teams, setTeams] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);

  // Form
  const [name, setName] = useState('');
  const [leader, setLeader] = useState('');
  const [target, setTarget] = useState(3000000);
  const [assignedProjectIds, setAssignedProjectIds] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // CSV States
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const fetchTeamsAndProjects = async () => {
    setLoading(true);
    try {
      const projRes = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const projs = await projRes.json();
      setProjectsList(projs);

      const teamRes = await fetch('/api/teams', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const tms = await teamRes.json();
      setTeams(tms);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamsAndProjects();
  }, [authToken]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name || !leader) {
      setError("Please fill out Team Name and Leader designation");
      return;
    }

    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          team_name: name,
          team_leader: leader,
          sales_target: target,
          assigned_project_ids: assignedProjectIds
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create team");

      setSuccess(`Team '${name}' successfully organized.`);
      setIsAddOpen(false);
      fetchTeamsAndProjects();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;
    setError(null);

    try {
      const res = await fetch(`/api/teams/${selectedTeam.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          team_name: name,
          team_leader: leader,
          sales_target: target,
          assigned_project_ids: assignedProjectIds
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to edit team");

      setSuccess(`Team '${name}' settings updated.`);
      setIsEditOpen(false);
      fetchTeamsAndProjects();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Custom delete state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleDelete = (teamId: string, teamName: string) => {
    setDeleteTarget({ id: teamId, name: teamName });
  };

  const confirmDeleteTeam = async () => {
    if (!deleteTarget) return;
    const { id, name: teamName } = deleteTarget;
    setDeleteTarget(null);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/teams/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete team");

      setSuccess(`Team '${teamName}' dissolved.`);
      fetchTeamsAndProjects();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openAddModal = () => {
    setName('');
    setLeader('');
    setTarget(5);
    setAssignedProjectIds([]);
    setError(null);
    setSuccess(null);
    setIsAddOpen(true);
  };

  const openEditModal = (team: any) => {
    setSelectedTeam(team);
    setName(team.team_name);
    setLeader(team.team_leader);
    setTarget(team.sales_target);
    setAssignedProjectIds(team.assigned_projects.map((p: any) => p.id));
    setError(null);
    setSuccess(null);
    setIsEditOpen(true);
  };

  const handleProjectToggle = (projId: string) => {
    if (assignedProjectIds.includes(projId)) {
      setAssignedProjectIds(assignedProjectIds.filter(id => id !== projId));
    } else {
      setAssignedProjectIds([...assignedProjectIds, projId]);
    }
  };

  // CSV format download and upload logic
  const handleDownloadDummyCSV = () => {
    const headers = "team_name,team_leader,sales_target,assigned_projects\n";
    const sampleProj1 = projectsList[0]?.project_name || "Green Orchid";
    const sampleProj2 = projectsList[1]?.project_name || "Sky Villa";
    
    const row1 = `Dhaka Central Vanguard,Sajjad Hossain,10,${sampleProj1}; ${sampleProj2}\n`;
    const row2 = `Sylhet Pioneers,Tamim Iqbal,5,${sampleProj1}\n`;
    const row3 = `Chittagong Coastal Kings,Jamil Ahmed,8,`;
    
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headers + row1 + row2 + row3);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "tphl_teams_divisions_template.csv");
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
        
        const requiredHeaders = ['team_name', 'team_leader'];
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
          const teamNameVal = item.team_name?.trim();
          const teamLeaderVal = item.team_leader?.trim();
          
          if (!teamNameVal || !teamLeaderVal) {
            item._invalid = true;
            item._reason = "Team Name and Team Leader are required and cannot be blank.";
          } else {
            // Check duplicates in uploaded batch
            if (items.some(it => it.team_name?.toLowerCase().trim() === teamNameVal.toLowerCase().trim())) {
              item._invalid = true;
              item._reason = "Duplicate Team Name within this file.";
            } else {
              // Check duplicate in store list
              const existingDupe = teams.some(t => t.team_name.toLowerCase().trim() === teamNameVal.toLowerCase().trim());
              if (existingDupe) {
                item._invalid = true;
                item._reason = "Team Name already exists in system.";
              }
            }
          }

          item.team_name = teamNameVal || '';
          item.team_leader = teamLeaderVal || '';
          item.sales_target = item.sales_target ? Number(item.sales_target) : 5;
          item.assigned_projects = item.assigned_projects?.trim() || '';

          // Resolve projects to show in preview
          const projNames = item.assigned_projects.split(/[;,]/).map((p: string) => p.trim()).filter(Boolean);
          item._resolvedProjects = projNames.map((pName: string) => {
            const pj = projectsList.find(p => p.project_name.toLowerCase().trim() === pName.toLowerCase().trim());
            return {
              name: pName,
              found: !!pj
            };
          });

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
      const res = await fetch('/api/teams/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ teams: validRows })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "CSV bulk team registration failed.");

      setSuccess(`Success! Organized ${result.importedCount} new teams/divisions via CSV. ${result.skippedCount} rows skipped.`);
      setIsCsvModalOpen(false);
      setCsvFile(null);
      setParsedData([]);
      fetchTeamsAndProjects();
    } catch (err: any) {
      setCsvError(err.message);
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

  const filteredTeams = teams.filter(t => 
    t.team_name.toLowerCase().includes(search.toLowerCase()) ||
    t.team_leader.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Sales Teams Directory</h1>
          <p className="mt-1 text-sm text-gray-500">Coordinate regional project distribution networks and target quotas for team divisions.</p>
        </div>
        {userRole === 'Admin' && (
          <div className="flex flex-wrap gap-2.5 self-start sm:self-auto">
            <button
              onClick={openCsvModal}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 shadow-sm cursor-pointer transition active:scale-95"
              title="Upload Sales Teams directory in batch using CSV"
            >
              <Upload className="w-4 h-4 text-indigo-500 font-bold" /> Import via CSV
            </button>
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md cursor-pointer transition active:scale-95"
            >
              <Plus className="w-4.5 h-4.5" /> Organize Team
            </button>
          </div>
        )}
      </div>

      {/* Message alerts */}
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
          placeholder="Filter teams by name or leader..."
          className="bg-transparent text-sm w-full focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-2">
          <div className="w-9 h-9 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
          <p className="text-xs text-gray-400 font-mono">Loading operations hierarchies...</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {filteredTeams.map(team => (
            <div 
              key={team.id} 
              className="bg-white border border-gray-100 rounded-3xl p-5 shadow-2xs hover:shadow-xs transition duration-200 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm leading-tight">{team.team_name}</h3>
                      <p className="text-[10px] text-gray-400 font-mono">ID: {team.id}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs pt-1">
                  <div className="bg-gray-100/30 p-3 rounded-xl space-y-1">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Division Leader</span>
                    <p className="font-semibold text-gray-800">{team.team_leader}</p>
                  </div>
                  <div className="bg-gray-100/30 p-3 rounded-xl space-y-1">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Monthly Team Target</span>
                    <p className="font-bold text-emerald-700">{team.sales_target} Units/Flats</p>
                  </div>
                </div>

                {/* Assigned projects badge matrix */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Assigned Project Properties</span>
                  <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                    {team.assigned_projects.map((p: any) => (
                      <span 
                        key={p.id} 
                        className="bg-indigo-50/70 text-indigo-700 text-[10px] font-semibold px-2 py-1 rounded-md border border-indigo-100/40"
                      >
                        🏢 {p.project_name}
                      </span>
                    ))}
                    {team.assigned_projects.length === 0 && (
                      <span className="text-gray-400 text-xs italic">No project currently bound to team</span>
                    )}
                  </div>
                </div>
              </div>

              {userRole === 'Admin' && (
                <div className="flex items-center justify-end gap-3 border-t border-gray-50 pt-3.5 mt-5">
                  <button
                    onClick={() => openEditModal(team)}
                    className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" /> Reconfigure
                  </button>
                  <button
                    onClick={() => handleDelete(team.id, team.team_name)}
                    className="p-2 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-gray-50 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
          {filteredTeams.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400 text-xs font-mono">
              No matching teams found under operations.
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Team Modal Form */}
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
              {isAddOpen ? "Organize Sales Team Structure" : `Edit Team: ${selectedTeam?.team_name}`}
            </h2>

            <form onSubmit={isAddOpen ? handleAddSubmit : handleEditSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">Team Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dhaka Central Vanguard"
                  className="w-full text-xs bg-gray-50 rounded-lg px-3.5 py-2.5 border border-gray-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">Team Leader Name</label>
                <input
                  type="text"
                  required
                  value={leader}
                  onChange={(e) => setLeader(e.target.value)}
                  placeholder="e.g. Sajjad Hossain"
                  className="w-full text-xs bg-gray-50 rounded-lg px-3.5 py-2.5 border border-gray-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">Consolidated Monthly Target (Number of units/flats)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 5"
                  value={target}
                  onChange={(e) => setTarget(Number(e.target.value))}
                  className="w-full text-xs bg-gray-50 rounded-lg px-3.5 py-2.5 border border-gray-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Multi Select Grid Checklist - highly intuitive for assigned project bindings! */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Bind Projects (Multi Select)</label>
                <div className="border border-gray-100 rounded-2xl bg-gray-50 p-4 grid grid-cols-2 gap-2 max-h-44 overflow-y-auto">
                  {projectsList.map(proj => {
                    const isChecked = assignedProjectIds.includes(proj.id);
                    return (
                      <button
                        type="button"
                        key={proj.id}
                        onClick={() => handleProjectToggle(proj.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs transition duration-200 outline-none ${
                          isChecked 
                          ? 'border-indigo-300 bg-indigo-500/10 text-indigo-900 font-bold' 
                          : 'border-gray-100 bg-white text-gray-600 hover:bg-gray-100/50'
                        }`}
                      >
                        <div className={`w-4.5 h-4.5 border rounded-xs flex items-center justify-center shrink-0 text-white text-[11px] font-extrabold ${
                          isChecked ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-200'
                        }`}>
                          {isChecked && "✓"}
                        </div>
                        <span className="truncate">{proj.project_name}</span>
                      </button>
                    );
                  })}
                  {projectsList.length === 0 && (
                    <p className="col-span-2 text-center text-xs text-gray-400 font-mono py-2">No active projects to select.</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 border-t border-gray-50 pt-4 mt-5">
                <button
                  type="button"
                  onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }}
                  className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold py-3 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-3 rounded-xl shadow-md transition"
                >
                  {isAddOpen ? "Organize Team" : "Apply Modifications"}
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
              <h3 className="font-bold text-gray-950 text-sm">Dissolve Team?</h3>
              <p className="text-xs text-gray-500">
                Are you sure you want to dissolve the sales team <span className="font-semibold text-gray-800">'{deleteTarget.name}'</span>? 
                Connected executives will be unassigned from this team.
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
                onClick={confirmDeleteTeam}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold py-2.5 rounded-xl shadow-md transition"
              >
                Yes, Dissolve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 max-h-[92vh] flex flex-col justify-between text-gray-850 dark:text-slate-100">
            <div className="flex items-start justify-between border-b border-gray-100 dark:border-slate-800 pb-4 shrink-0">
              <div className="space-y-1">
                <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-indigo-500" /> Bulk Import Sales Teams &amp; Divisions
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Quickly assemble and coordinate multiple sales divisions by dragging or browsing a CSV template file.
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
              {/* Reference instructions / Download Template banner */}
              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/60 dark:border-indigo-950/55 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-350">Download Reference CSV Format</h4>
                  <p className="text-[11px] text-indigo-800/80 dark:text-indigo-400/80 leading-relaxed">
                    Make sure your CSV contains columns for <strong>team_name</strong>, <strong>team_leader</strong>, <strong>sales_target</strong>, and <strong>assigned_projects</strong>.
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

              {/* Upload field drag/drop container */}
              <div 
                onDragOver={handleCsvDragOver}
                onDrop={handleCsvDrop}
                onClick={() => document.getElementById('team-csv-picker')?.click()}
                className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition duration-150 ${
                  csvFile 
                    ? 'border-indigo-400 bg-indigo-50/10 dark:bg-slate-800/20' 
                    : 'border-gray-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-gray-50/50 dark:hover:bg-slate-800/20'
                }`}
              >
                <input 
                  type="file" 
                  id="team-csv-picker"
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
                    <span className="text-indigo-600 dark:text-indigo-405">{parsedData.filter(d => !d._invalid).length} valid • {parsedData.filter(d => d._invalid).length} skipped</span>
                  </div>

                  <div className="border border-gray-100 dark:border-slate-800/80 rounded-2xl overflow-hidden max-h-[220px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-gray-50/70 dark:bg-slate-800/30 sticky top-0 border-b border-gray-100 dark:border-slate-800 text-[10px] text-gray-400 dark:text-slate-500 uppercase font-mono">
                        <tr>
                          <th className="px-4 py-2.5">Row</th>
                          <th className="px-4 py-2.5">Team Division Name</th>
                          <th className="px-4 py-2.5">Team Leader</th>
                          <th className="px-4 py-2.5">Monthly Target</th>
                          <th className="px-4 py-2.5">Assigned projects binding</th>
                          <th className="px-4 py-2.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-slate-800/40 dark:bg-slate-900/25">
                        {parsedData.map((row, idx) => (
                          <tr key={idx} className={row._invalid ? 'bg-rose-50/10 dark:bg-rose-950/5 opacity-85' : 'hover:bg-gray-50/20'}>
                            <td className="px-4 py-3 font-mono font-bold text-gray-400 text-[11px]">{idx + 1}</td>
                            <td className="px-4 py-3 font-semibold text-gray-950 dark:text-white">{row.team_name || <span className="italic text-gray-300">none</span>}</td>
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-slate-300">{row.team_leader || <span className="italic text-gray-300">none</span>}</td>
                            <td className="px-4 py-3 font-mono">{row.sales_target} Flat(s)</td>
                            <td className="px-4 py-3 font-sans">
                              {row._resolvedProjects && row._resolvedProjects.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {row._resolvedProjects.map((proj: any, pIdx: number) => (
                                    <span 
                                      key={pIdx} 
                                      className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                                        proj.found 
                                          ? 'bg-emerald-500/10 text-emerald-800 border border-emerald-500/20' 
                                          : 'bg-amber-500/10 text-amber-800 border border-amber-500/20'
                                      }`}
                                      title={proj.found ? "Matching project property found" : "Project does not exist; alignment will be skipped"}
                                    >
                                      {proj.name} {proj.found ? "✓" : "⚠️"}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[10px] text-gray-400 italic">None</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {row._invalid ? (
                                <span className="inline-flex items-center gap-1 text-[9px] bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-450 px-2 py-0.5 rounded-full font-semibold max-w-[140px] truncate" title={row._reason}>
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
                    <span>Adding Teams...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4.5 h-4.5" />
                    <span>Import {parsedData.filter(d => !d._invalid).length} validated teams</span>
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
