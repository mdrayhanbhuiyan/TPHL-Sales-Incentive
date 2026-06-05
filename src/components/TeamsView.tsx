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
  AlertTriangle
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
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md cursor-pointer transition active:scale-95 self-start sm:self-auto"
          >
            <Plus className="w-4.5 h-4.5" /> Organize Team
          </button>
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
    </div>
  );
}
