/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Building2, 
  MapPin, 
  Layers, 
  Maximize2, 
  DollarSign, 
  Calendar,
  X,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { Project } from '../types';

interface ProjectViewProps {
  authToken: string;
  userRole: string;
}

export default function ProjectView({ authToken, userRole }: ProjectViewProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedProj, setSelectedProj] = useState<Project | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [measure, setMeasure] = useState<string>('345-1000');
  const [floors, setFloors] = useState(10);
  const [units, setUnits] = useState(0);
  const [totalFlats, setTotalFlats] = useState(0);
  const [landShareAmount, setLandShareAmount] = useState(1200000);
  const [firstSaleDate, setFirstSaleDate] = useState('');
  const [projStatus, setProjStatus] = useState<'Active' | 'Completed' | 'Draft'>('Active');
  const [registration, setRegistration] = useState<'Yes' | 'No'>('Yes');
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchProjects = () => {
    setLoading(true);
    fetch('/api/projects', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    })
    .then(r => r.json())
    .then(data => {
      setProjects(data);
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchProjects();
  }, [authToken]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name || !location || !landShareAmount) {
      setError("Please fill out Name, Location and Land Share Amount");
      return;
    }

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          project_name: name,
          location,
          unit_measure: measure,
          floors,
          units,
          total_flats: totalFlats,
          land_share_amount: landShareAmount,
          first_sale_date: firstSaleDate,
          status: projStatus,
          registration: registration
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create project");

      setSuccess(`Project '${name}' successfully generated!`);
      // Reset
      setName('');
      setLocation('');
      setMeasure('345-1000');
      setFloors(10);
      setUnits(0);
      setTotalFlats(0);
      setLandShareAmount(1200000);
      setFirstSaleDate('');
      setRegistration('Yes');
      
      setIsAddOpen(false);
      fetchProjects();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProj) return;
    setError(null);

    try {
      const res = await fetch(`/api/projects/${selectedProj.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          project_name: name,
          location,
          unit_measure: measure,
          floors,
          units,
          total_flats: totalFlats,
          land_share_amount: landShareAmount,
          first_sale_date: firstSaleDate,
          status: projStatus,
          registration: registration
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update project");

      setSuccess(`Project '${name}' updated successfully!`);
      setIsEditOpen(false);
      fetchProjects();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Custom delete state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleDelete = (projId: string, projName: string) => {
    setDeleteTarget({ id: projId, name: projName });
  };

  const confirmDeleteProj = async () => {
    if (!deleteTarget) return;
    const { id, name: projName } = deleteTarget;
    setDeleteTarget(null);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Deletion aborted");

      setSuccess(`Project '${projName}' deleted successfully!`);
      fetchProjects();
    } catch (err: any) {
      setError(err.message || "Failed to delete project");
    }
  };

  const openAddModal = () => {
    setName('');
    setLocation('');
    setMeasure('345-1000');
    setFloors(10);
    setUnits(0);
    setTotalFlats(0);
    setLandShareAmount(1200000);
    setFirstSaleDate(new Date().toISOString().split('T')[0]);
    setProjStatus('Active');
    setRegistration('Yes');
    setError(null);
    setSuccess(null);
    setIsAddOpen(true);
  };

  const openEditModal = (proj: Project) => {
    setSelectedProj(proj);
    setName(proj.project_name);
    setLocation(proj.location);
    setMeasure(proj.unit_measure);
    setFloors(proj.floors);
    setUnits(proj.units || 0);
    setTotalFlats(proj.total_flats || 0);
    setLandShareAmount(proj.land_share_amount);
    setFirstSaleDate(proj.first_sale_date);
    setProjStatus(proj.status);
    setRegistration(proj.registration || 'Yes');
    setError(null);
    setSuccess(null);
    setIsEditOpen(true);
  };

  const openDetailPane = (proj: Project) => {
    setSelectedProj(proj);
    setIsDetailOpen(true);
  };

  const filteredProjects = projects.filter(p => 
    p.project_name.toLowerCase().includes(search.toLowerCase()) ||
    p.location.toLowerCase().includes(search.toLowerCase()) ||
    p.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Project Management</h1>
          <p className="mt-1 text-sm text-gray-500">Configure real estate structural details, building heights, unit measure benchmarks, and land rates.</p>
        </div>
        {userRole === 'Admin' && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md cursor-pointer transition active:scale-95 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Add Project
          </button>
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

      {/* Search Grid filter */}
      <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 px-3.5 py-2.5 max-w-md shadow-2xs">
        <Search className="w-4.5 h-4.5 text-gray-400 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter projects by name or location ID..."
          className="bg-transparent text-sm w-full focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-2">
          <div className="w-9 h-9 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
          <p className="text-xs text-gray-400 font-mono">Fetching properties directory...</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map(proj => {
            let statusStyle = "bg-indigo-50 text-indigo-700";
            if (proj.status === 'Completed') statusStyle = "bg-emerald-50 text-emerald-700";
            else if (proj.status === 'Draft') statusStyle = "bg-gray-100 text-gray-600";

            return (
              <div 
                key={proj.id} 
                className="bg-white border border-gray-100 rounded-3xl p-5 shadow-2xs hover:shadow-xs transition duration-200 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Card top */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-indigo-600 shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm leading-tight">{proj.project_name}</h3>
                        <span className="text-[10px] text-gray-400 font-mono tracking-wider uppercase font-bold">{proj.id}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusStyle}`}>
                      {proj.status}
                    </span>
                  </div>

                  {/* Fields list */}
                  <div className="space-y-2.5 pt-1 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span>{proj.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
                      <span>{proj.unit_measure} SFT unit size range</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-gray-400" />
                      <span>{proj.floors} floors</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="font-semibold text-gray-900">
                        Share Value: {proj.land_share_amount.toLocaleString()} BDT
                      </span>
                    </div>
                    {/* Project registration incentive status */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Registration:</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${proj.registration === 'No' ? 'bg-rose-50 text-rose-700 border border-rose-100/50' : 'bg-emerald-50 text-emerald-700 border border-emerald-100/50'}`}>
                        {proj.registration || 'Yes'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Operations links */}
                <div className="flex items-center justify-between border-t border-gray-50 pt-4 mt-5">
                  <button
                    onClick={() => openDetailPane(proj)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                  >
                    View Floors Info
                  </button>
                  
                  {userRole === 'Admin' && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEditModal(proj)}
                        className="p-1.5 text-gray-500 hover:text-indigo-600 rounded-lg hover:bg-gray-50 transition cursor-pointer"
                        title="Edit details"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(proj.id, proj.project_name)}
                        className="p-1.5 text-gray-500 hover:text-rose-600 rounded-lg hover:bg-gray-50 transition cursor-pointer"
                        title="Delete project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {filteredProjects.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400 text-xs font-mono">
              No matching properties registered under the system.
            </div>
          )}
        </div>
      )}

      {/* Detail inspect drawer modal */}
      {isDetailOpen && selectedProj && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-xl bg-white rounded-3xl border border-gray-100 p-6 shadow-xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setIsDetailOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:bg-gray-50 hover:text-gray-900 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
              <Building2 className="w-8 h-8 text-indigo-600" />
              <div>
                <span className="text-[10px] text-gray-400 font-mono uppercase font-bold tracking-wider">{selectedProj.id}</span>
                <h2 className="text-lg font-bold text-gray-900">{selectedProj.project_name}</h2>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-100/50 p-3.5 rounded-xl text-xs space-y-1">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Location site</span>
                <p className="font-semibold text-gray-800">{selectedProj.location}</p>
              </div>
              <div className="bg-gray-100/50 p-3.5 rounded-xl text-xs space-y-1">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Land Share Rate</span>
                <p className="font-bold text-emerald-700">{selectedProj.land_share_amount.toLocaleString()} BDT</p>
              </div>
              <div className="bg-gray-100/50 p-3.5 rounded-xl text-xs space-y-1">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Registration Status</span>
                <p className="font-bold text-gray-800">{selectedProj.registration || 'Yes'} (Incentives active: {selectedProj.registration === 'No' ? 'No' : 'Yes'})</p>
              </div>
              <div className="bg-gray-100/50 p-3.5 rounded-xl text-xs space-y-1">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Building Layout Height</span>
                <p className="font-semibold text-gray-800">{selectedProj.floors} Story Tower ({selectedProj.total_flats} Residential units)</p>
              </div>
            </div>

            {/* Visual Floor levels display - highly interactive UX signature! */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Property Tower Multi-Sequence Layout</span>
              <div className="border border-gray-100 rounded-2xl bg-gray-50 p-4 space-y-2">
                <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold">
                  <span>Level Sequence</span>
                  <span>Bonus Eligibility Details</span>
                </div>
                {/* Visual Tower Stack */}
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {Array.from({ length: selectedProj.floors }).map((_, idx) => {
                    const floorIndex = selectedProj.floors - idx;
                    const isTop = floorIndex === selectedProj.floors;
                    const isFirst = floorIndex === 1;
                    
                    let bgCol = "bg-white border-gray-100";
                    let bonusText = "";

                    if (isTop) {
                      bgCol = "bg-amber-50 border-amber-200 text-amber-800 font-bold";
                      bonusText = "⭐ Top Floor Bonus eligible";
                    } else if (isFirst) {
                      bgCol = "bg-sky-50 border-sky-200 text-sky-800 font-bold";
                      bonusText = "⭐ 1st Floor Bonus eligible";
                    }

                    return (
                      <div 
                        key={floorIndex} 
                        className={`border rounded-lg px-3 py-1.5 flex items-center justify-between text-xs transition duration-200 ${bgCol}`}
                      >
                        <span className="font-mono">Floor {floorIndex}</span>
                        <span className="text-[10px] font-semibold">{bonusText || "Standard Incentive scheme"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsDetailOpen(false)}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold py-3 rounded-xl transition"
            >
              Close inspection panel
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Form Modal */}
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
              <Building2 className="w-5 h-5 text-indigo-600" />
              {isAddOpen ? "Add New Building Development" : `Edit Project: ${selectedProj?.project_name}`}
            </h2>

            <form onSubmit={isAddOpen ? handleAddSubmit : handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Project Development Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. TPHL Rose Heights"
                    className="w-full text-xs bg-gray-50 rounded-lg px-3.5 py-2.5 border border-gray-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Property Location Site</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Banani, Dhaka"
                    className="w-full text-xs bg-gray-50 rounded-lg px-3.5 py-2.5 border border-gray-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Unit SFT Measurement Range</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 345-1000"
                    value={measure}
                    onChange={(e) => setMeasure(e.target.value)}
                    className="w-full text-xs bg-gray-50 rounded-lg px-3.5 py-2.5 border border-gray-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Building Elevator Floors</label>
                  <input
                    type="number"
                    value={floors}
                    onChange={(e) => setFloors(Number(e.target.value))}
                    className="w-full text-xs bg-gray-50 rounded-lg px-3.5 py-2.5 border border-gray-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Project Land Share Amount (BDT)</label>
                  <input
                    type="number"
                    value={landShareAmount}
                    onChange={(e) => setLandShareAmount(Number(e.target.value))}
                    className="w-full text-xs bg-gray-50 font-semibold text-emerald-700 rounded-lg px-3.5 py-2.5 border border-gray-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">First Sale Launching Date</label>
                  <input
                    type="date"
                    value={firstSaleDate}
                    onChange={(e) => setFirstSaleDate(e.target.value)}
                    className="w-full text-xs bg-gray-50 rounded-lg px-3.5 py-2.5 border border-gray-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Project Operations Status</label>
                  <select
                    value={projStatus}
                    onChange={(e: any) => setProjStatus(e.target.value)}
                    className="w-full text-xs bg-gray-50 rounded-lg px-3.5 py-2.5 border border-gray-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Active">Active development</option>
                    <option value="Completed">Completed development</option>
                    <option value="Draft">Draft spec</option>
                  </select>
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Registration</label>
                  <select
                    value={registration}
                    onChange={(e: any) => setRegistration(e.target.value as any)}
                    className="w-full text-xs bg-gray-50 rounded-lg px-3.5 py-2.5 border border-gray-100 font-semibold text-gray-800 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Yes">Yes (Add to incentive calculation)</option>
                    <option value="No">No (Incentive is hidden / deleted)</option>
                  </select>
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
                  {isAddOpen ? "Register Project" : "Update Project Details"}
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
              <h3 className="font-bold text-gray-950 text-sm">Delete Project?</h3>
              <p className="text-xs text-gray-500">
                Are you absolutely sure you want to delete project <span className="font-semibold text-gray-800">'{deleteTarget.name}'</span>? 
                This will also cascadingly delete any associated sales entries and recalculate incentives.
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
                onClick={confirmDeleteProj}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold py-2.5 rounded-xl shadow-md transition"
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
