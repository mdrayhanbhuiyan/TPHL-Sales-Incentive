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
  AlertTriangle,
  Download,
  Upload,
  Check
} from 'lucide-react';
import { motion } from 'motion/react';
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

  // CSV Import/Export states
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  // Download dummy template CSV
  const handleDownloadDummyCSV = () => {
    const headers = [
      "project_name",
      "location",
      "unit_measure",
      "floors",
      "units",
      "total_flats",
      "land_share_amount",
      "first_sale_date",
      "status",
      "registration"
    ].join(",");

    const rows = [
      `"Green Orchid","Uttara Sector-4","345-1200",10,24,24,1200000,"2026-03-01","Active","Yes"`,
      `"Sky Villa","Gulshan Circle-2","500-1500",15,30,30,1800000,"2026-05-15","Draft","Yes"`
    ].join("\n");

    const csvContent = headers + "\n" + rows;
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "tphl_projects_import_template.csv");
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      setCsvFile(file);
      readCsvData(file);
    } else {
      setCsvError("Only CSV files are supported.");
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

        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) {
          setCsvError("CSV file must contain a header row and at least one data row.");
          return;
        }

        // Clean headers
        const headers = lines[0].split(',').map(header => header.trim().replace(/^["']|["']$/g, '').toLowerCase());

        const requiredHeaders = ['project_name', 'location', 'unit_measure', 'land_share_amount'];
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

          // Validation check
          if (!item.project_name) {
            item._invalid = true;
            item._reason = "Project Name is required.";
          } else if (!item.location) {
            item._invalid = true;
            item._reason = "Location specifier is required.";
          } else if (!item.unit_measure) {
            item._invalid = true;
            item._reason = "Unit measure standard is required.";
          } else if (isNaN(Number(item.land_share_amount)) || Number(item.land_share_amount) <= 0) {
            item._invalid = true;
            item._reason = "Land share value must be a valid positive number of BDT limits.";
          } else {
            // Check status is Active, Completed, or Draft
            const rawStatus = item.status?.trim() || 'Active';
            if (!['Active', 'Completed', 'Draft'].includes(rawStatus)) {
              item.status = 'Active';
            }
          }

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

    const payload = validRows.map(r => ({
      project_name: r.project_name,
      location: r.location,
      unit_measure: r.unit_measure,
      floors: Number(r.floors || 10),
      units: Number(r.units || 0),
      total_flats: Number(r.total_flats || r.units || 0),
      land_share_amount: Number(r.land_share_amount),
      first_sale_date: r.first_sale_date || new Date().toISOString().split('T')[0],
      status: r.status || 'Active',
      registration: r.registration || 'Yes'
    }));

    setImporting(true);
    setCsvError(null);
    try {
      const res = await fetch('/api/projects/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ projects: payload })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Project bulk import execution failed.");

      setSuccess(`Successfully imported projects (${result.createdCount} registered, ${result.updatedCount} synchronized)`);
      setIsCsvModalOpen(false);
      setCsvFile(null);
      setParsedData([]);
      fetchProjects();
    } catch (err: any) {
      setCsvError(err.message);
    } finally {
      setImporting(false);
    }
  };

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

  const handleExportCSV = () => {
    const headers = [
      "Project ID",
      "Project Name",
      "Location",
      "Unit Measure (SFT)",
      "Floors",
      "Units",
      "Total Flats",
      "Land Share Amount (BDT)",
      "First Sale Date",
      "Status",
      "Registration Support",
      "Created At"
    ];

    const rows = filteredProjects.map(proj => [
      `"${proj.id}"`,
      `"${proj.project_name.replace(/"/g, '""')}"`,
      `"${proj.location.replace(/"/g, '""')}"`,
      `"${proj.unit_measure.replace(/"/g, '""')}"`,
      proj.floors,
      proj.units || 0,
      proj.total_flats || 0,
      proj.land_share_amount,
      `"${proj.first_sale_date}"`,
      `"${proj.status}"`,
      `"${proj.registration || 'Yes'}"`,
      `"${proj.created_at || ''}"`
    ]);

    const csvString = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `tphl_projects_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Project Management</h1>
          <p className="mt-1 text-sm text-gray-500">Configure real estate structural details, building heights, unit measure benchmarks, and land rates.</p>
        </div>
        <div className="flex flex-wrap gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 shadow-sm cursor-pointer transition active:scale-95"
            title="Export listed projects directory as CSV spreadsheet"
          >
            <Download className="w-4 h-4 text-indigo-500 font-bold" /> Export CSV
          </button>
          {userRole === 'Admin' && (
            <>
              <button
                onClick={() => {
                  setIsCsvModalOpen(true);
                  setCsvFile(null);
                  setParsedData([]);
                  setCsvError(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 shadow-sm cursor-pointer transition active:scale-95"
                title="Import multiple projects in bulk using a CSV spreadsheet"
              >
                <Upload className="w-4 h-4 text-emerald-600" /> Import Projects CSV
              </button>
              <button
                onClick={openAddModal}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md cursor-pointer transition active:scale-95"
              >
                <Plus className="w-4 h-4" /> Add Project
              </button>
            </>
          )}
        </div>
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

      {/* CSV Import Modal */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl max-w-4xl w-full border border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-indigo-600" /> Bulk Projects Import CSV
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 font-medium">Upload a project matrix to insert or update listed real estate projects along with baseline incentive rules.</p>
              </div>
              <button 
                onClick={() => setIsCsvModalOpen(false)}
                className="p-1 px-2.5 rounded-lg text-gray-400 hover:bg-gray-50 text-xs font-semibold"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {csvError && (
                <div className="flex items-start gap-2 bg-rose-50 border border-rose-100 p-4 rounded-xl text-xs text-rose-800 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{csvError}</span>
                </div>
              )}

              {/* Step 1: Upload Field */}
              {!csvFile ? (
                <div 
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-gray-200 hover:border-indigo-400 rounded-2xl p-8 text-center cursor-pointer transition bg-gray-50/50 space-y-4 group"
                  onClick={() => document.getElementById('projectsCsvInput')?.click()}
                >
                  <input 
                    type="file" 
                    id="projectsCsvInput" 
                    accept=".csv" 
                    className="hidden" 
                    onChange={handleFileChange} 
                  />
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-gray-100 shadow-xs mx-auto text-gray-400 group-hover:text-indigo-600 group-hover:scale-110 transition duration-300">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-gray-700">Drag &amp; drop your projects configuration CSV here</p>
                    <p className="text-[10px] text-gray-400">or click to browse from local workstation storage directory</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadDummyCSV();
                    }}
                    className="inline-flex items-center gap-1 text-[10px] bg-white border border-gray-200 text-indigo-600 hover:bg-indigo-50 font-bold px-3 py-1.5 rounded-lg transition mx-auto self-center"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Standard Projects Template CSV
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* File specification tag */}
                  <div className="flex items-center justify-between bg-indigo-50/40 border border-indigo-100/50 p-4 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800">{csvFile.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{(csvFile.size / 1024).toFixed(2)} KB • {parsedData.length} rows processed</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setCsvFile(null);
                        setParsedData([]);
                        setCsvError(null);
                      }}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200/40"
                    >
                      Reset File
                    </button>
                  </div>

                  {/* Previews Grid */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Live Validation &amp; Mapping Tree</span>
                      <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                        {parsedData.filter(d => d._invalid).length} errors found
                      </span>
                    </div>

                    <div className="border border-gray-100 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                          <tr>
                            <th className="px-4 py-2.5">Project Name</th>
                            <th className="px-4 py-2.5">Location</th>
                            <th className="px-4 py-2.5 text-center">Unit Measure</th>
                            <th className="px-4 py-2.5 text-center">Floors / Units</th>
                            <th className="px-4 py-2.5 text-right">Land share BDT</th>
                            <th className="px-4 py-2.5 text-right">Operation / Registration</th>
                            <th className="px-4 py-2.5 text-right">Mapping Verdict</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {parsedData.map((row, idx) => (
                            <tr key={idx} className={row._invalid ? "bg-rose-50/40 text-rose-900 animate-pulse" : "hover:bg-gray-50/40"}>
                              <td className="px-4 py-3 font-semibold text-gray-800">
                                {row.project_name || <span className="text-rose-400 italic font-normal">Missing Name</span>}
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {row.location || <span className="text-rose-400 italic font-normal">Missing location</span>}
                              </td>
                              <td className="px-4 py-3 text-center text-[11px] font-mono whitespace-nowrap text-indigo-600">
                                {row.unit_measure || <span className="text-rose-400 italic font-normal">Missing measure</span>}
                              </td>
                              <td className="px-4 py-3 text-center text-[10px] font-mono whitespace-nowrap">
                                <span className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {row.floors || 10} Fl | {row.total_flats || row.units || 0} Units
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-[11px] font-mono text-emerald-700 font-bold whitespace-nowrap">
                                {Number(row.land_share_amount || 0).toLocaleString()} BDT
                              </td>
                              <td className="px-4 py-3 text-right text-[10px] whitespace-nowrap">
                                <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] uppercase font-bold mr-1 ${
                                  row.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {row.status || 'Active'}
                                </span>
                                <span className="text-gray-400">Reg: {row.registration || 'Yes'}</span>
                              </td>
                              <td className="px-4 py-3 text-right text-[10px] whitespace-nowrap">
                                {row._invalid ? (
                                  <span className="inline-flex items-center gap-1 text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full font-semibold">
                                    <AlertTriangle className="w-3 h-3 text-rose-500" /> {row._reason}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold">
                                    <Check className="w-3 h-3 text-emerald-500" /> Valid
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[10px] text-gray-400 max-w-md font-medium leading-normal">
                Invalid records will be skipped. Valid records will insert or overwrite existing project entries instantly matching target names.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-600 text-xs font-semibold rounded-xl border border-gray-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                {csvFile && (
                  <button
                    type="button"
                    disabled={importing || parsedData.filter(d => !d._invalid).length === 0}
                    onClick={submitCsvImport}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-55 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    {importing ? (
                      <>
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-indigo-200 border-t-white animate-spin" />
                        Synchronizing projects...
                      </>
                    ) : (
                      <>
                        Apply Projects Directory ({parsedData.filter(d => !d._invalid).length} rows)
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
