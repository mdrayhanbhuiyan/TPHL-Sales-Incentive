/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Plus, 
  Trash2, 
  Edit3, 
  LayoutGrid, 
  Calculator, 
  FileText, 
  AlertCircle, 
  Eye, 
  Layers, 
  Hammer,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  HelpCircle,
  X
} from 'lucide-react';
import { Project, ProjectOnSale } from '../types';

interface ProjectsOnSaleViewProps {
  authToken: string;
  userRole: string;
}

export default function ProjectsOnSaleView({ authToken, userRole }: ProjectsOnSaleViewProps) {
  const [projectsOnSale, setProjectsOnSale] = useState<ProjectOnSale[]>([]);
  const [directoryProjects, setDirectoryProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    project_name: '',
    flat_unit_size: '',
    project_id: '',
    floor_number: 1,
    units_per_floor: 2,
  });

  // Details popover state
  const [selectedProject, setSelectedProject] = useState<ProjectOnSale | null>(null);

  // Bulk CSV import states
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  const isAdmin = userRole === 'Admin';

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get projects on sale
      const posRes = await fetch('/api/projects-on-sale', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const posData = await posRes.json();
      setProjectsOnSale(Array.isArray(posData) ? posData : []);

      // Get directory projects
      const dirRes = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const dirData = await dirRes.json();
      setDirectoryProjects(Array.isArray(dirData) ? dirData : []);
    } catch (err) {
      console.error(err);
      setError("Failed to load systems data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [authToken]);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setFormData({
      project_name: '',
      flat_unit_size: '',
      project_id: directoryProjects[0]?.id || '',
      floor_number: 9,
      units_per_floor: 2,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (project: ProjectOnSale) => {
    setEditingId(project.id);
    setFormData({
      project_name: project.project_name,
      flat_unit_size: project.flat_unit_size,
      project_id: project.project_id,
      floor_number: project.floor_number,
      units_per_floor: project.units_per_floor,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this pre-sale project? This will clear unit registrations.")) return;
    try {
      const res = await fetch(`/api/projects-on-sale/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete.");
      }
    } catch (e) {
      console.error(e);
      alert("Error occurred on deletion.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project_name || !formData.flat_unit_size || !formData.project_id) {
      alert("Please fill all required inputs.");
      return;
    }

    const payload = {
      project_name: formData.project_name.trim(),
      flat_unit_size: formData.flat_unit_size.trim(),
      project_id: formData.project_id,
      floor_number: Number(formData.floor_number || 1),
      units_per_floor: Number(formData.units_per_floor || 1),
    };

    try {
      const url = editingId ? `/api/projects-on-sale/${editingId}` : '/api/projects-on-sale';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save pre-sale project.");
      }
    } catch (err) {
      console.error(err);
      alert("Server connection failure.");
    }
  };

  // CSV Import Helpers
  const handleDownloadTemplate = () => {
    const headers = "project_name,project_id,flat_unit_size,floor_number,units_per_floor";
    const matchedProjName = directoryProjects[0]?.project_name || "Green Orchid";
    const rows = [
      `"Orchid Lavender Elite Ed.","${matchedProjName}","1350 SFT",12,4`,
      `"Navy Vanguard Tower Block B","${matchedProjName}","1580 SFT",10,2`,
      `"Mirpur Sky View Apartment","${matchedProjName}","1150 SFT",8,3`
    ];
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "projects_on_sale_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/);
    if (lines.length === 0) return [];
    
    // Clean headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const results: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const rawLine = lines[i].trim();
      if (!rawLine) continue;
      
      const values: string[] = [];
      let current = '';
      let insideQuote = false;
      
      for (let j = 0; j < rawLine.length; j++) {
        const char = rawLine[j];
        if (char === '"' || char === "'") {
          insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      
      const row: any = {};
      headers.forEach((header, index) => {
        let val = values[index] || '';
        val = val.replace(/^["']|["']$/g, '').trim();
        row[header] = val;
      });
      results.push(row);
    }
    return results;
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setCsvError(null);
    setImportSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          setCsvError("No valid rows discovered in CSV.");
          setParsedData([]);
          return;
        }
        
        // Validation check
        const firstRowKeys = Object.keys(parsed[0]);
        const required = ['project_name', 'project_id', 'flat_unit_size', 'floor_number', 'units_per_floor'];
        const missing = required.filter(k => !firstRowKeys.includes(k));
        
        if (missing.length > 0) {
          setCsvError(`Missing columns in CSV headers: ${missing.join(', ')}`);
        }
        
        setParsedData(parsed);
      } catch (err) {
        setCsvError("Failed to parse CSV file standard structure.");
        setParsedData([]);
      }
    };
    reader.readAsText(file);
  };

  const handleCsvImportSubmit = async () => {
    if (parsedData.length === 0 || csvError) {
      alert("Invalid or missing parsed CSV dataset.");
      return;
    }

    setImporting(true);
    setCsvError(null);
    try {
      const response = await fetch('/api/projects-on-sale/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ items: parsedData })
      });

      if (!response.ok) {
        const err = await response.json();
        setCsvError(err.error || "Failed to process bulk import setup.");
      } else {
        const result = await response.json();
        setImportSuccessMessage(`Successfully registered ${result.count || parsedData.length} pre-sale project(s)!`);
        setParsedData([]);
        setCsvFile(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
      setCsvError("Connecting to servers failed.");
    } finally {
      setImporting(false);
    }
  };

  // Helper to generate visual units codes like 1A, 1B, 2A...
  const getUnitNamesList = (floors: number, units_per_floor: number): string[] => {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
    const units = [];
    for (let f = 1; f <= floors; f++) {
      for (let u = 0; u < units_per_floor; u++) {
        const letter = letters[u] || String.fromCharCode(65 + u);
        units.push(`${f}${letter}`);
      }
    }
    return units;
  };

  return (
    <div className="space-y-6" id="projects-on-sale-view">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-indigo-600" /> Active Projects On Sale
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Manage pre-sale campaigns, configuration, flat sizes, and relate them with master Project Developments.
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setCsvFile(null);
                setParsedData([]);
                setCsvError(null);
                setImportSuccessMessage(null);
                setIsCsvModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-sm transition-all"
            >
              <Upload className="w-4 h-4" /> CSV Auto Import
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Add Pre-sale Project
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/50 p-4 rounded-xl text-xs text-rose-800 dark:text-rose-300 font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
        </div>
      ) : projectsOnSale.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-12 text-center text-gray-400 max-w-lg mx-auto space-y-3">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="text-sm font-bold text-gray-800 dark:text-white">No Projects Active on Sale</h3>
          <p className="text-xs text-gray-500 max-w-xs mx-auto">
            Please register the pre-sales project configurations to sync with logging books, mapping and partial unit registrations.
          </p>
          {isAdmin && (
            <button
              onClick={handleOpenCreateModal}
              className="mt-2 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold px-4 py-2 rounded-xl transition"
            >
              Configure First Campaign Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projectsOnSale.map((project) => {
            const mappedDir = directoryProjects.find(dp => dp.id === project.project_id);
            const unitsList = getUnitNamesList(project.floor_number, project.units_per_floor);

            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-6 text-xs space-y-4 shadow-xs relative overflow-hidden"
              >
                <div className="absolute right-0 top-0 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-mono text-[9px] font-extrabold px-3 py-1 rounded-bl-2xl uppercase tracking-wider">
                  {project.flat_unit_size}
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate pr-16">{project.project_name}</h3>
                  <div className="flex items-center gap-1.5 text-gray-400 dark:text-slate-500 font-medium">
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                    <span className="truncate">Mapped: <strong className="text-gray-700 dark:text-slate-300">{mappedDir ? mappedDir.project_name : 'No Directory Mapping'}</strong></span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-gray-100/60 dark:border-slate-800/50">
                  <div className="text-center">
                    <span className="text-[10px] text-gray-400 font-medium block">Total Floors</span>
                    <span className="text-xs font-bold text-gray-800 dark:text-white font-mono">{project.floor_number} Fl</span>
                  </div>
                  <div className="text-center border-x border-gray-100 dark:border-slate-800">
                    <span className="text-[10px] text-gray-400 font-medium block">Units/Floor</span>
                    <span className="text-xs font-bold text-gray-800 dark:text-white font-mono">{project.units_per_floor} Units</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-gray-400 font-medium block">Total Units</span>
                    <span className="text-xs font-bold text-gray-800 dark:text-white font-mono">{project.total_units}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-slate-800">
                  <span className="text-[10px] text-gray-400 font-mono">ID: {project.id}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedProject(project)}
                      className="p-1 px-2 hover:bg-gray-50 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                      title="View Generated Flats Matrix"
                    >
                      <Eye className="w-3.5 h-3.5" /> Details
                    </button>
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => handleOpenEditModal(project)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Generated Units Details Dropdown Modal/Card */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full border border-gray-100 dark:border-slate-800 p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setSelectedProject(null)}
              className="absolute right-4 top-4 text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 p-1 rounded-lg text-xs font-bold"
            >
              ✕
            </button>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <Layers className="w-5 h-5 text-indigo-600" /> Units Matrix: {selectedProject.project_name}
              </h3>
              <p className="text-xs text-gray-400">
                Generated based on {selectedProject.floor_number} floors and {selectedProject.units_per_floor} units per floor structure configurations.
              </p>
            </div>

            <div className="max-h-60 overflow-y-auto border border-gray-100 dark:border-slate-800 p-4 rounded-2xl bg-gray-50/50 dark:bg-slate-900/60">
              <div className="grid grid-cols-4 gap-2.5">
                {getUnitNamesList(selectedProject.floor_number, selectedProject.units_per_floor).map((unitName) => (
                  <div
                    key={unitName}
                    className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-2.5 text-center shadow-2xs"
                  >
                    <span className="block font-bold text-xs text-indigo-600 dark:text-indigo-400 font-mono">{unitName}</span>
                    <span className="text-[9px] text-gray-400 uppercase font-bold mt-0.5">Floor {parseInt(unitName)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedProject(null)}
                className="bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 text-xs font-bold px-4 py-2 rounded-xl transition"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-gray-100 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {editingId ? "Edit Campaign Property On Sale" : "Configure New Pre-sale Property Campaign"}
              </h3>
              <p className="text-xs text-gray-500">
                Define sizes, layout matrix, and match with project developments rulesets.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium text-gray-700 dark:text-slate-300">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase">Property campaign Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Green Orchid Phase-1 Sales"
                  value={formData.project_name}
                  onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                  className="w-full text-xs font-semibold px-4 py-2.5 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-800 text-gray-800 dark:text-white focus:outline-indigo-600"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase">Development Project Directory Name *</label>
                <select
                  required
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  className="w-full text-xs font-semibold px-4 py-2.5 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-800 text-gray-800 dark:text-white focus:outline-indigo-600"
                >
                  <option value="" disabled>-- Choose Project Directory --</option>
                  {directoryProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.project_name} ({p.location})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase">Standard Flat Unit measure (SFT Size) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1250 SFT"
                  value={formData.flat_unit_size}
                  onChange={(e) => setFormData({ ...formData, flat_unit_size: e.target.value })}
                  className="w-full text-xs font-semibold px-4 py-2.5 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-800 text-gray-800 dark:text-white focus:outline-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase">Total Floors *</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={formData.floor_number}
                    onChange={(e) => setFormData({ ...formData, floor_number: Number(e.target.value) })}
                    className="w-full text-xs font-semibold px-4 py-2.5 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-800 text-gray-800 dark:text-white focus:outline-indigo-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase">Units Per Floor *</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    required
                    value={formData.units_per_floor}
                    onChange={(e) => setFormData({ ...formData, units_per_floor: Number(e.target.value) })}
                    className="w-full text-xs font-semibold px-4 py-2.5 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-800 text-gray-800 dark:text-white focus:outline-indigo-600"
                  />
                </div>
              </div>

              <div className="pt-2 bg-indigo-50/50 dark:bg-indigo-950/20 p-3.5 border border-indigo-100/50 dark:border-indigo-900/30 rounded-2xl">
                <p className="text-[10px] text-indigo-700 dark:text-indigo-400 font-semibold leading-relaxed">
                  💡 Autogen Verdict: This setup generates in database exactly <strong>{Number(formData.floor_number || 1) * Number(formData.units_per_floor || 1)}</strong> units (named dynamically floor-wise from 1A, 1B up to {formData.floor_number}{['A','B','C','D','E','F','G'][formData.units_per_floor - 1] || 'X'}).
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  {editingId ? "Save Configurations" : "Instantiate Campaign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Bulk Upload Modal */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-gray-100 dark:border-slate-800 p-6 shadow-2xl space-y-6 relative">
            <button
              onClick={() => setIsCsvModalOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 p-1.5 rounded-lg text-xs font-bold"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1 text-xs">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                CSV-এর মাধ্যমে প্রজেক্ট অন সেল ইমপোর্ট করুন (Bulk Import)
              </h3>
              <p className="text-xs text-gray-500">
                নিচের ডামি ফরম্যাটটি ফলো করে প্রজেক্টের লিস্ট একসাথে আপলোড করুন। সিস্টেম স্বয়ংক্রিয়ভাবে প্রতিটির জন্য ফ্ল্যাট ইউনিট জেনারেট করবে।
              </p>
            </div>

            {/* Dummy Template Format Card */}
            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-gray-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                  ডামি CSV ফরম্যাট গাইড (Required Structure)
                </h4>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-850 border border-indigo-100 dark:border-indigo-950/60 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-lg transition"
                >
                  <Download className="w-3 h-3" />
                  ডামি CSV ডাউনলোড করুন (Template)
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[10px] text-left text-gray-500 dark:text-gray-450 border-collapse">
                  <thead>
                    <tr className="bg-gray-100/80 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 font-bold text-gray-700 dark:text-slate-300">
                      <th className="p-2">project_name</th>
                      <th className="p-2">project_id</th>
                      <th className="p-2">flat_unit_size</th>
                      <th className="p-2">floor_number</th>
                      <th className="p-2">units_per_floor</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100 dark:border-slate-800 font-mono text-gray-600 dark:text-slate-400">
                      <td className="p-2">"Orchid Lavender"</td>
                      <td className="p-2">"{directoryProjects[0]?.project_name || "Green Orchid"}"</td>
                      <td className="p-2">"1350 SFT"</td>
                      <td className="p-2">12</td>
                      <td className="p-2">4</td>
                    </tr>
                    <tr className="text-gray-500 dark:text-slate-400">
                      <td className="p-2 pt-3" colSpan={5}>
                        💡 <strong className="text-indigo-600 dark:text-indigo-400">গুরুত্বপূর্ণ টিপ:</strong> <code className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-450 px-1 py-0.5 rounded text-[9px] font-mono">project_id</code> কলামে আপনার ডিরেক্টরির নাম লিখতে পারেন (যেমন "{directoryProjects[0]?.project_name || "Green Orchid"}"), সিস্টেম নিজেই আইডি ম্যাচ করে নিবে।
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* File Drag and Drop Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">CSV ফাইল সিলেক্ট করুন</label>
              <div className="relative border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-3xl p-6 text-center hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="space-y-1.5 pointer-events-none">
                  <Upload className="w-8 h-8 text-indigo-500 mx-auto" />
                  <p className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                    {csvFile ? `সিলেক্টেড ফাইল: ${csvFile.name}` : "ক্লিক করুন অথবা ফাইল ড্র্যাগ করে এখানে ছাড়ুন"}
                  </p>
                  <p className="text-[10px] text-gray-400 font-medium">শুধুমাত্র .csv ফরম্যাটের ফাইল সাপোর্ট করবে</p>
                </div>
              </div>
            </div>

            {/* Custom feedback messages */}
            {csvError && (
              <div className="bg-rose-50 dark:bg-rose-950/25 border border-rose-100 dark:border-rose-900/50 p-3.5 rounded-xl text-xs text-rose-850 dark:text-rose-350 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{csvError}</span>
              </div>
            )}

            {importSuccessMessage && (
              <div className="bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-100 dark:border-emerald-900/50 p-3.5 rounded-xl text-xs text-emerald-850 dark:text-emerald-355 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{importSuccessMessage}</span>
              </div>
            )}

            {/* Parsed Data Preview Table */}
            {parsedData.length > 0 && !csvError && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-600 dark:text-slate-300">
                    ফাইল প্রিভিউ ({parsedData.length}টি প্রজেক্ট পাওয়া গেছে)
                  </span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/45 dark:text-emerald-400 px-2 py-0.5 rounded-full text-[10px]">Ready to import</span>
                </div>
                <div className="max-h-40 overflow-y-auto border border-gray-100 dark:border-slate-800 rounded-2xl">
                  <table className="w-full text-[10px] text-left text-gray-600 dark:text-slate-400 border-collapse">
                    <thead className="bg-gray-50 dark:bg-slate-800 sticky top-0 font-bold text-gray-700 dark:text-slate-300 border-b border-gray-100 dark:border-slate-800">
                      <tr>
                        <th className="p-2 px-3">Project Campaign Name</th>
                        <th className="p-2 px-3">Project Mapping</th>
                        <th className="p-2 px-3">Size</th>
                        <th className="p-2 px-3">Floors</th>
                        <th className="p-2 px-3">Units/Floor</th>
                        <th className="p-2 px-3">Total Generates</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-850 bg-white dark:bg-slate-900 text-xs">
                      {parsedData.map((row, idx) => {
                        const matched = directoryProjects.find(
                          p => p.id === row.project_id || 
                          p.project_name.toLowerCase() === String(row.project_id).toLowerCase().trim()
                        );
                        return (
                          <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-850/40 text-[11px] font-mono">
                            <td className="p-2 px-3 font-sans font-semibold text-gray-950 dark:text-white">{row.project_name}</td>
                            <td className="p-2 px-3 font-sans">
                              {matched ? (
                                <span className="text-emerald-600 font-semibold flex items-center gap-1">✓ {matched.project_name}</span>
                              ) : (
                                <span className="text-amber-600 font-semibold flex items-center gap-1">⚠ Fallback (First Proj)</span>
                              )}
                            </td>
                            <td className="p-2 px-3 text-gray-600 dark:text-slate-450">{row.flat_unit_size || "1200 SFT"}</td>
                            <td className="p-2 px-3 text-gray-800 dark:text-slate-200">{row.floor_number || 1}</td>
                            <td className="p-2 px-3 text-gray-800 dark:text-slate-200">{row.units_per_floor || 1}</td>
                            <td className="p-2 px-3 font-semibold text-indigo-600 dark:text-indigo-400">{(Number(row.floor_number) || 1) * (Number(row.units_per_floor) || 1)} Units</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actions Footer */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-slate-850">
              <button
                type="button"
                onClick={() => {
                  setIsCsvModalOpen(false);
                  setParsedData([]);
                  setCsvFile(null);
                  setCsvError(null);
                  setImportSuccessMessage(null);
                }}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-350 font-bold rounded-xl transition cursor-pointer text-xs"
              >
                বাতিল করুন
              </button>
              {parsedData.length > 0 && !csvError && (
                <button
                  type="button"
                  onClick={handleCsvImportSubmit}
                  disabled={importing}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer text-xs flex items-center gap-1.5"
                >
                  {importing ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-indigo-200 border-t-white animate-spin" />
                      ইমপোর্ট হচ্ছে...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      ডাটা ইমপোর্ট করুন (Confirm)
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
