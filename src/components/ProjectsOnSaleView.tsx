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
  X,
  User,
  Calendar,
  Check,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { Project, ProjectOnSale } from '../types';
import { useToast } from './Toast';
import { useConfirmation } from './ConfirmationDialog';

interface ProjectsOnSaleViewProps {
  authToken: string;
  userRole: string;
  refreshTrigger?: number;
}

export default function ProjectsOnSaleView({ authToken, userRole, refreshTrigger }: ProjectsOnSaleViewProps) {
  const { toast } = useToast();
  const { confirm } = useConfirmation();
  const [projectsOnSale, setProjectsOnSale] = useState<ProjectOnSale[]>([]);
  const [directoryProjects, setDirectoryProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time floor plan datasets
  const [sales, setSales] = useState<any[]>([]);
  const [unitRegistrations, setUnitRegistrations] = useState<any[]>([]);
  const [executives, setExecutives] = useState<any[]>([]);

  // Selected sub-unit inspection panel state
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);

  // Registration deed edit fields
  const [editRegStatus, setEditRegStatus] = useState<'Yes' | 'No'>('No');
  const [editRegDate, setEditRegDate] = useState<string>('');
  const [regSuccessMessage, setRegSuccessMessage] = useState<string | null>(null);
  const [regUpdating, setRegUpdating] = useState<boolean>(false);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    project_name: '',
    flat_unit_size: '',
    project_id: '',
    floor_number: 1,
    units_per_floor: 2,
    land_share_price: '' as string | number,
  });
  const [unitConfigs, setUnitConfigs] = useState<{ [key: string]: { size: number; land_share: number } }>({});

  // Details popover state
  const [selectedProject, setSelectedProject] = useState<ProjectOnSale | null>(null);
  const [activePlanTab, setActivePlanTab] = useState<'plan' | 'table'>('plan');
  const [selectedHistoryFlat, setSelectedHistoryFlat] = useState<{
    unitName: string;
    sale: any;
    exec: any;
    status: string;
  } | null>(null);

  // Bulk CSV import states
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  const isAdmin = userRole === 'Admin';

  const fetchData = async () => {
    if (projectsOnSale.length === 0) {
      setLoading(true);
    }
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

      // Fetch sales logs
      const salesRes = await fetch('/api/sales', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const salesData = await salesRes.json();
      setSales(Array.isArray(salesData) ? salesData : []);

      // Fetch unit registrations mapping
      const regRes = await fetch('/api/unit-registrations', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const regData = await regRes.json();
      setUnitRegistrations(Array.isArray(regData) ? regData : []);

      // Fetch sales executives mapping
      const execRes = await fetch('/api/executives', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const execData = await execRes.json();
      setExecutives(Array.isArray(execData) ? execData : []);

    } catch (err) {
      console.error(err);
      setError("Failed to load systems data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [authToken, refreshTrigger]);

  const handleExportCSV = () => {
    const headers = [
      "ID",
      "Project Name",
      "Flat Unit Size",
      "Floor Number",
      "Units Per Floor",
      "Total Units",
      "Default Land Share Price",
      "Assigned Project ID"
    ];

    const rows = projectsOnSale.map(p => [
      `"${p.id}"`,
      `"${String(p.project_name || '').replace(/"/g, '""')}"`,
      `"${String(p.flat_unit_size || '').replace(/"/g, '""')}"`,
      p.floor_number,
      p.units_per_floor,
      p.total_units,
      p.land_share_price || 0,
      `"${String(p.project_id || '').replace(/"/g, '""')}"`
    ]);

    const csvString = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `tphl_projects_on_sale_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Successfully exported Projects On Sale!");
  };

  const handleOpenDetails = (project: ProjectOnSale) => {
    setSelectedProject(project);
    setSelectedUnit(null);
    setRegSuccessMessage(null);
  };

  const handleOpenCreateModal = () => {
    setEditingId(null);
    const defaultProjId = directoryProjects[0]?.id || '';
    const dirProj = directoryProjects.find(p => p.id === defaultProjId);
    const defaultLandShare = dirProj ? dirProj.land_share_amount : 500000;
    setFormData({
      project_name: '',
      flat_unit_size: '1200 SFT',
      project_id: defaultProjId,
      floor_number: 9,
      units_per_floor: 2,
      land_share_price: defaultLandShare,
    });
    
    setUnitConfigs({
      'A': { size: 1200, land_share: defaultLandShare },
      'B': { size: 1200, land_share: defaultLandShare },
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
      land_share_price: project.land_share_price !== undefined ? project.land_share_price : '',
    });
    
    const defaultConfigs: { [key: string]: { size: number; land_share: number } } = {};
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
    const units_per_floor = project.units_per_floor || 2;
    const dirProj = directoryProjects.find(p => p.id === project.project_id);
    const defaultLandShare = project.land_share_price !== undefined ? project.land_share_price : (dirProj ? dirProj.land_share_amount : 500000);
    const defaultSize = parseInt(project.flat_unit_size) || 1200;

    for (let u = 0; u < units_per_floor; u++) {
      const letter = letters[u] || String.fromCharCode(65 + u);
      if (project.unit_configs && project.unit_configs[letter]) {
        defaultConfigs[letter] = { ...project.unit_configs[letter] };
      } else {
        defaultConfigs[letter] = { size: defaultSize, land_share: defaultLandShare };
      }
    }
    setUnitConfigs(defaultConfigs);
    setIsModalOpen(true);
  };

  const handleProjectIdChange = (projId: string) => {
    const dirProj = directoryProjects.find(p => p.id === projId);
    const defaultLandShare = dirProj ? dirProj.land_share_amount : 500000;
    setFormData(prev => ({ 
      ...prev, 
      project_id: projId,
      land_share_price: defaultLandShare
    }));
    
    const updatedConfigs = { ...unitConfigs };
    for (const letter of Object.keys(updatedConfigs)) {
      updatedConfigs[letter].land_share = defaultLandShare;
    }
    setUnitConfigs(updatedConfigs);
  };

  const handleLandSharePriceChange = (priceVal: string | number) => {
    setFormData(prev => ({ ...prev, land_share_price: priceVal }));
    const numPrice = Number(priceVal) || 0;
    const updatedConfigs = { ...unitConfigs };
    for (const letter of Object.keys(updatedConfigs)) {
      updatedConfigs[letter].land_share = numPrice;
    }
    setUnitConfigs(updatedConfigs);
  };

  const handleUnitsPerFloorChange = (newVal: number) => {
    setFormData(prev => ({ ...prev, units_per_floor: newVal }));
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
    const newConfigs = { ...unitConfigs };
    
    const dirProj = directoryProjects.find(p => p.id === formData.project_id);
    const defaultLandShare = formData.land_share_price !== '' && formData.land_share_price !== undefined 
      ? Number(formData.land_share_price) 
      : (dirProj ? dirProj.land_share_amount : 500000);
    const defaultSize = parseInt(formData.flat_unit_size) || 1200;

    for (let u = 0; u < newVal; u++) {
      const letter = letters[u] || String.fromCharCode(65 + u);
      if (!newConfigs[letter]) {
        newConfigs[letter] = { size: defaultSize, land_share: defaultLandShare };
      }
    }
    
    for (const letter of Object.keys(newConfigs)) {
      const index = letters.indexOf(letter);
      if (index === -1 || index >= newVal) {
        delete newConfigs[letter];
      }
    }
    setUnitConfigs(newConfigs);
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Pre-Sale Campaign?',
      message: 'Are you sure you want to delete this pre-sale project? This will clear unit registrations.',
      confirmText: 'Yes, Delete',
      cancelText: 'Cancel',
      actionType: 'delete'
    });
    if (!isConfirmed) return;
    try {
      const res = await fetch(`/api/projects-on-sale/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        toast.success("Pre-sale campaign deleted successfully.");
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to delete pre-sale campaign.");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred during deletion.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project_name || !formData.flat_unit_size || !formData.project_id) {
      alert("Please fill all required inputs.");
      toast.warning("Please fill all required inputs.");
      return;
    }

    const payload = {
      project_name: formData.project_name.trim(),
      flat_unit_size: formData.flat_unit_size.trim(),
      project_id: formData.project_id,
      floor_number: Number(formData.floor_number || 1),
      units_per_floor: Number(formData.units_per_floor || 1),
      land_share_price: formData.land_share_price !== '' ? Number(formData.land_share_price) : undefined,
      unit_configs: unitConfigs,
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
        toast.success(editingId ? "Pre-sale campaign updated successfully!" : "Pre-sale campaign launched successfully!");
        setIsModalOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save pre-sale project.");
        toast.error(err.error || "Failed to save pre-sale campaign.");
      }
    } catch (err) {
      console.error(err);
      alert("Server connection failure.");
      toast.error("Internal server connection failure.");
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
        toast.error(err.error || "Failed to bulk import pre-sale campaigns.");
      } else {
        const result = await response.json();
        setImportSuccessMessage(`Successfully registered ${result.count || parsedData.length} pre-sale project(s)!`);
        toast.success(`Successfully imported ${result.count || parsedData.length} pre-sale campaigns!`);
        setParsedData([]);
        setCsvFile(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
      setCsvError("Connecting to servers failed.");
      toast.error("Connecting to server failed.");
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

  const handleUpdateUnitRegistration = async (regId: string) => {
    setRegUpdating(true);
    setRegSuccessMessage(null);
    try {
      const res = await fetch(`/api/unit-registrations/${regId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          registered: editRegStatus,
          registration_date: editRegStatus === 'Yes' ? editRegDate : ''
        })
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to update registration record.");
        toast.error(data.error || "Failed to update deed registration status.");
      } else {
        const updatedReg = await res.json();
        // Update local status in unitRegistrations state
        setUnitRegistrations(prev => prev.map(r => r.id === regId ? updatedReg : r));
        setRegSuccessMessage("Deed registration status successfully synchronized!");
        toast.success("Deed registration status successfully synchronized!");
      }
    } catch (err) {
      console.error(err);
      alert("Server connection failure.");
    } finally {
      setRegUpdating(false);
    }
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
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs px-4 py-2.5 rounded-xl border border-gray-200 cursor-pointer shadow-sm transition-all"
            title="Export listed Campaigns as CSV"
          >
            <Download className="w-4 h-4 text-emerald-600" /> Export CSV
          </button>
          {isAdmin && (
            <>
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
            </>
          )}
        </div>
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
                      onClick={() => handleOpenDetails(project)}
                      className="p-1 px-2 hover:bg-gray-50 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                      title="View Interactive Floor Plan Status"
                    >
                      <Eye className="w-3.5 h-3.5" /> Floor Plan
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

      {/* Interactive Floor Plan availability matrix & Unit Inspector Modal */}
      {selectedProject && (() => {
        // Evaluate dynamic grids and state helpers
        const getUnitStatusDetails = (unitName: string) => {
          const sale = sales.find(s => s.project_on_sale_id === selectedProject.id && s.unit_name === unitName);
          const reg = unitRegistrations.find(r => r.project_on_sale_id === selectedProject.id && r.unit_name === unitName);
          
          let status: 'Available' | 'Booked' | 'Sold' = 'Available';
          if (sale) {
            if (reg && reg.registered === 'Yes') {
              status = 'Sold'; // Registered and Sale confirmed
            } else {
              status = 'Booked'; // Sale confirmed but registration pending
            }
          }
          return { status, sale, reg };
        };

        const handleUnitClick = (unitName: string) => {
          const { reg } = getUnitStatusDetails(unitName);
          setSelectedUnit(unitName);
          setRegSuccessMessage(null);
          if (reg) {
            setEditRegStatus(reg.registered);
            setEditRegDate(reg.registration_date ? reg.registration_date.substring(0, 10) : '');
          } else {
            setEditRegStatus('No');
            setEditRegDate('');
          }
        };

        // Stack floors logically from top down to first floor
        const floorsArray: number[] = [];
        for (let f = selectedProject.floor_number; f >= 1; f--) {
          floorsArray.push(f);
        }

        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
        const getUnitsForFloor = (floorNum: number, unitsCount: number) => {
          const uList: string[] = [];
          for (let u = 0; u < unitsCount; u++) {
            const letter = letters[u] || String.fromCharCode(65 + u);
            uList.push(`${floorNum}${letter}`);
          }
          return uList;
        };

        // Determine column styling
        const uCount = selectedProject.units_per_floor;
        const gridColsClass = 
          uCount === 1 ? 'grid-cols-1' :
          uCount === 2 ? 'grid-cols-2' :
          uCount === 3 ? 'grid-cols-3' :
          uCount === 4 ? 'grid-cols-4' :
          uCount === 5 ? 'grid-cols-5' :
          uCount === 6 ? 'grid-cols-6' :
          uCount === 8 ? 'grid-cols-8' : 'grid-cols-4';

        // Read selected unit properties
        const inspector = selectedUnit ? getUnitStatusDetails(selectedUnit) : null;
        const salesRep = inspector?.sale;
        const regRep = inspector?.reg;
        const execMapped = salesRep ? executives.find(e => e.id === salesRep.executive_id) : null;

        return (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full border border-gray-100 dark:border-slate-800 p-6 shadow-2xl relative space-y-6 flex flex-col max-h-[90vh]">
              
              {/* Header block */}
              <div className="flex items-start justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-600" /> Real-time status: {selectedProject.project_name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Live Booking and Deed Registry details across {selectedProject.floor_number} levels ({selectedProject.total_units} total flats).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedProject(null); setActivePlanTab('plan'); setSelectedHistoryFlat(null); }}
                  className="text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 p-2 rounded-xl text-xs font-bold transition-all"
                >
                  ✕
                </button>
              </div>

              {/* View Tab Selector & Legend Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50 dark:bg-slate-850/20 p-3 rounded-2xl border border-gray-100 dark:border-slate-850">
                <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-slate-900 rounded-xl border border-gray-150 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActivePlanTab('plan')}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${activePlanTab === 'plan' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-gray-500 hover:text-gray-900 dark:text-slate-400'}`}
                  >
                    Interactive Floor Plan
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePlanTab('table')}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${activePlanTab === 'table' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-gray-500 hover:text-gray-900 dark:text-slate-400'}`}
                  >
                    Availability Table
                  </button>
                </div>
                <div className="flex items-center gap-3 text-[10.5px]">
                  <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 font-semibold">
                    <span className="w-3 h-3 rounded-md bg-slate-50 border border-gray-200 dark:bg-slate-850 dark:border-slate-700 block" /> Vacant
                  </span>
                  <span className="flex items-center gap-1.5 text-gray-550 dark:text-gray-300 font-semibold">
                    <span className="w-3 h-3 rounded-md bg-amber-500 border border-amber-600 block" /> Booked
                  </span>
                  <span className="flex items-center gap-1.5 text-gray-550 dark:text-gray-300 font-semibold">
                    <span className="w-3 h-3 rounded-md bg-emerald-600 border border-emerald-700 block" /> Fully Sold
                  </span>
                </div>
              </div>

              {activePlanTab === 'plan' ? (
                /* Grid content split view */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden flex-1">
                  
                  {/* Left Panel: Vertical Floor Stack */}
                  <div className="lg:col-span-7 flex flex-col space-y-4 overflow-hidden h-full">
                    
                    {/* Scrollable multi-floor architecture view */}
                    <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 border border-gray-50 dark:border-slate-850 p-2 rounded-2xl bg-gray-50/20 dark:bg-slate-900/40">
                      {floorsArray.map((floorNum) => {
                        const units = getUnitsForFloor(floorNum, selectedProject.units_per_floor);
                        const isTopFloor = floorNum === selectedProject.floor_number;
                        const isFirstFloor = floorNum === 1;

                        return (
                          <div 
                            key={floorNum} 
                            className="flex items-stretch gap-3 bg-white dark:bg-slate-850 rounded-2xl border border-gray-100 dark:border-slate-800/80 p-2 shadow-xs transition"
                          >
                            {/* Floor label badge with specialized layout values */}
                            <div className="w-16 flex-shrink-0 flex flex-col justify-center items-center rounded-xl bg-gray-50 dark:bg-slate-800/60 p-1 text-center border border-gray-100/60 dark:border-slate-700 text-[10px] font-bold">
                              <span className="text-gray-400 uppercase tracking-widest text-[8px]">LEVEL</span>
                              <span className="text-sm font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">{floorNum}</span>
                              {isTopFloor && <span className="text-[7px] text-amber-600 font-extrabold uppercase mt-0.5 bg-amber-50 dark:bg-amber-950/40 px-1 rounded">TOP</span>}
                              {isFirstFloor && <span className="text-[7px] text-indigo-600 font-extrabold uppercase mt-0.5 bg-indigo-50 dark:bg-indigo-950/40 px-1 rounded">1st</span>}
                            </div>

                            {/* Dynamic unit grid representing level apartments */}
                            <div className={`flex-1 grid ${gridColsClass} gap-2`}>
                              {units.map((unitName) => {
                                const { status } = getUnitStatusDetails(unitName);
                                const isSelected = selectedUnit === unitName;

                                let btnClasses = "relative transition-all duration-200 py-3 rounded-xl border text-center font-bold text-xs cursor-pointer shadow-3xs flex flex-col items-center justify-center min-h-[50px] ";
                                if (isSelected) {
                                  btnClasses += "ring-3 ring-indigo-500 ring-offset-2 dark:ring-indigo-400 scale-[1.03] z-10 font-black ";
                                }

                                if (status === 'Sold') {
                                  btnClasses += "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-emerald-900/10";
                                } else if (status === 'Booked') {
                                  btnClasses += "bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-amber-900/10";
                                } else {
                                  btnClasses += "bg-white hover:bg-indigo-50/50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:text-indigo-600 border-gray-200 dark:border-slate-700";
                                }

                                return (
                                  <button
                                    key={unitName}
                                    type="button"
                                    onClick={() => handleUnitClick(unitName)}
                                    className={btnClasses}
                                  >
                                    <span className="text-xs font-mono font-bold tracking-tight">{unitName}</span>
                                    <span className="text-[8px] font-semibold tracking-wider uppercase opacity-85 mt-0.5">
                                      {status === 'Sold' ? 'Sold' : status === 'Booked' ? 'Booked' : 'Vacant'}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Panel: Selected Unit Properties Inspector */}
                  <div className="lg:col-span-5 border border-gray-100 dark:border-slate-800 rounded-3xl p-4 bg-gray-50/30 dark:bg-slate-850/20 flex flex-col h-full overflow-y-auto">
                    
                    {!selectedUnit ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3.5">
                        <div className="p-4 bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-full animate-pulse">
                          <Building2 className="w-8 h-8" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider">Select Unit to Inspect</h4>
                          <p className="text-[11px] text-gray-400 mt-1 max-w-xs leading-relaxed">
                            Click on any flat box in the floor schema on the left to review its booking timeline, sales execution record, target sequences, and directly manage deed registrations.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 text-xs">
                                               {/* Unit Title and Current Status */}
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Unit {selectedUnit} Properties</h4>
                            <span className="text-[9px] text-gray-400 font-mono">Floor: {parseInt(selectedUnit)} of {selectedProject.project_name}</span>
                          </div>
                          
                          <div>
                            {inspector?.status === 'Sold' ? (
                              <span className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full text-[10px] font-bold border border-emerald-100/60 dark:border-emerald-900/50 flex items-center gap-1">
                                ✓ Sold &amp; Registered
                              </span>
                            ) : inspector?.status === 'Booked' ? (
                              <span className="bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full text-[10px] font-bold border border-amber-100/60 dark:border-amber-900/50 flex items-center gap-1">
                                ⚠ Booked (Reg Pending)
                              </span>
                            ) : (
                              <span className="bg-slate-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 px-2.5 py-1 rounded-full text-[10px] font-bold border border-gray-200 dark:border-slate-700 flex items-center gap-1">
                                Vacant Available
                              </span>
                            )}
                          </div>
                        </div>

                        {/* High Fidelity Dynamic SFT & Land Share Display */}
                        <div className="bg-white dark:bg-slate-900/60 p-3 rounded-2xl border border-gray-150/50 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono leading-tight">
                          <div>
                            <span className="text-[9px] text-gray-400 uppercase block font-sans font-bold">Unit Level Type Layout</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                              {(() => {
                                const letter = selectedUnit.slice(-1).toUpperCase();
                                if (selectedProject.unit_configs && selectedProject.unit_configs[letter]) {
                                  return `${selectedProject.unit_configs[letter].size} SFT (Type ${letter})`;
                                }
                                return `${selectedProject.flat_unit_size} (Default)`;
                              })()}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-gray-400 uppercase block font-sans font-bold">Land Share Price</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-450">
                              {(() => {
                                const letter = selectedUnit.slice(-1).toUpperCase();
                                if (selectedProject.unit_configs && selectedProject.unit_configs[letter]) {
                                  return `${(selectedProject.unit_configs[letter].land_share).toLocaleString()} BDT`;
                                }
                                if (selectedProject.land_share_price !== undefined && selectedProject.land_share_price !== null) {
                                  return `${(selectedProject.land_share_price).toLocaleString()} BDT`;
                                }
                                const dirProj = directoryProjects.find(p => p.id === selectedProject.project_id);
                                return dirProj ? `${(dirProj.land_share_amount).toLocaleString()} BDT` : 'N/A';
                              })()}
                            </span>
                          </div>
                        </div>

                        {/* Display Data Cards depending on status */}
                        {inspector?.status === 'Available' ? (
                          <div className="bg-white dark:bg-slate-800/40 p-4 border border-gray-150/60 dark:border-slate-850 rounded-2xl text-[11px] space-y-2 text-gray-500 leading-relaxed dark:text-slate-400">
                            <p>
                              🏠 This flat is currently <strong>Vacant (Available)</strong>. There is no active booking logged under the sequence engine.
                            </p>
                            <p className="text-[10px] text-gray-400 bg-indigo-50/50 dark:bg-indigo-950/25 p-2.5 rounded-xl border border-indigo-100/40 dark:border-indigo-950">
                              💡 <strong>Incentive Rule Hint:</strong> Every master purchase sequence (1st to 7th sale) recalculates bonuses in real-time once a sales executive registers a new booking with this unit code.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            
                            {/* Sales Contract Segment */}
                            <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-gray-100 dark:border-slate-800/80 p-3.5 space-y-2">
                              <h5 className="font-bold text-gray-800 dark:text-slate-300 border-b border-gray-100 dark:border-slate-850 pb-1.5 uppercase tracking-wider text-[9px] text-indigo-600 dark:text-indigo-400">
                                Sales Log Details
                              </h5>
                              
                              <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-gray-500 dark:text-slate-400">
                                <div>
                                  <span className="text-[10px] text-gray-400 block font-normal">Sale Date</span>
                                  <span className="font-mono font-bold text-gray-800 dark:text-slate-200 flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-gray-400" /> {salesRep?.sale_date || 'N/A'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-gray-400 block font-normal">Chronological Sequence</span>
                                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                    Sale #{salesRep?.sale_number || 1}
                                  </span>
                                </div>
                                <div className="col-span-2 border-t border-gray-100 dark:border-slate-850 pt-2 mt-1">
                                  <span className="text-[10px] text-gray-400 block font-normal">Acquiring Executive</span>
                                  <span className="font-bold text-gray-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                                    <User className="w-3.5 h-3.5 text-indigo-500" />
                                    {execMapped ? execMapped.name : `ID: ${salesRep?.executive_id || 'N/A'}`}
                                  </span>
                                  {execMapped && (
                                    <span className="block text-[10px] text-gray-400 mt-0.5 ml-5 font-mono">
                                      Emp ID: {execMapped.employee_id} | Team: {execMapped.team_name || 'Unassigned'}
                                    </span>
                                  )}
                                </div>
                                {salesRep?.buyer_name && (
                                  <div className="col-span-2 border-t border-gray-100 dark:border-slate-850 pt-2 mt-1">
                                    <span className="text-[10px] text-gray-400 block font-normal">Registered Buyer Full Name</span>
                                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 mt-0.5 font-mono">
                                      👤 {salesRep.buyer_name}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Deed Registration Information Segment */}
                            <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-gray-100 dark:border-slate-800/80 p-3.5 space-y-2">
                              <h5 className="font-bold text-gray-800 dark:text-slate-300 border-b border-gray-100 dark:border-slate-850 pb-1.5 uppercase tracking-wider text-[9px] text-indigo-600 dark:text-indigo-400">
                                Deed Registration Status
                              </h5>

                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-gray-400">Current Record Status:</span>
                                  <span className={`font-bold uppercase ${regRep?.registered === 'Yes' ? 'text-emerald-600' : 'text-amber-500'}`}>
                                    {regRep?.registered === 'Yes' ? 'Registered fully' : 'Deed Booking Pending'}
                                  </span>
                                </div>
                                {regRep?.registered === 'Yes' && regRep?.registration_date && (
                                  <div className="flex items-center justify-between text-[11px] border-t border-gray-50 dark:border-slate-850 pt-1.5 font-mono">
                                    <span className="text-gray-400">Deed Confirmed on:</span>
                                    <span className="font-bold text-gray-800 dark:text-slate-200">{regRep.registration_date.substring(0, 10)}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Inline registration deed management for authorized users */}
                            {regRep && (
                              <div className="bg-indigo-50/40 dark:bg-slate-900/30 rounded-2xl border border-indigo-100/50 dark:border-slate-800/60 p-4 space-y-3.5">
                                <h5 className="font-bold text-gray-800 dark:text-slate-200 flex items-center gap-1 uppercase tracking-wider text-[9px] text-indigo-700 dark:text-indigo-400">
                                  ⚙️ Inline Deed Status Control
                                </h5>

                                <div className="space-y-2">
                                  <label className="block text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase">Is Deed Registered?</label>
                                  <select
                                    value={editRegStatus}
                                    onChange={(e) => setEditRegStatus(e.target.value as 'Yes' | 'No')}
                                    className="w-full text-xs font-semibold px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-800 text-gray-800 dark:text-white focus:outline-indigo-600"
                                  >
                                    <option value="Yes">Yes (Fully Registered)</option>
                                    <option value="No">No (Pending Booked)</option>
                                  </select>
                                </div>

                                {editRegStatus === 'Yes' && (
                                  <div className="space-y-2 animate-fade-in">
                                    <label className="block text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase">Registered Date</label>
                                    <input
                                      type="date"
                                      required
                                      value={editRegDate}
                                      onChange={(e) => setEditRegDate(e.target.value)}
                                      className="w-full text-xs font-semibold px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-800 text-gray-800 dark:text-white font-mono focus:outline-indigo-600"
                                    />
                                  </div>
                                )}

                                {regSuccessMessage && (
                                  <div className="bg-emerald-55 font-semibold text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-450 p-2 text-[10.5px] rounded-lg border border-emerald-100 dark:border-emerald-900/50 flex items-center gap-1.5">
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>{regSuccessMessage}</span>
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleUpdateUnitRegistration(regRep.id)}
                                  disabled={regUpdating || (editRegStatus === 'Yes' && !editRegDate)}
                                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white dark:text-white text-xs font-bold py-2 px-3 rounded-xl transition cursor-pointer shadow-sm text-center flex items-center justify-center gap-1.5 disabled:opacity-50"
                                >
                                  {regUpdating ? "Saving registry details..." : "Synchronize Registry Record"}
                                </button>
                              </div>
                            )}

                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </div>
              ) : (
                /* Availability Table view of all campaign flats */
                <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-slate-50/40 dark:bg-slate-900/20 border border-gray-100 dark:border-slate-800 rounded-2xl p-2">
                  <div className="overflow-y-auto flex-1">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-slate-850/80 text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-gray-150 dark:border-slate-800 text-[9px]">
                          <th className="p-3">Flat Identifier</th>
                          <th className="p-3">Level</th>
                          <th className="p-3">SFT Area</th>
                          <th className="p-3">Current Status</th>
                          <th className="p-3">Buyer Contact Name</th>
                          <th className="p-3">Allocated Broker Executive</th>
                          <th className="p-3 text-right">Operations</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-700 dark:text-slate-300 font-semibold">
                        {getUnitNamesList(selectedProject.floor_number, selectedProject.units_per_floor).map((unitName) => {
                          const { status, sale, reg } = getUnitStatusDetails(unitName);
                          const exec = sale ? executives.find(e => e.id === sale.executive_id) : null;

                          return (
                            <tr 
                              key={unitName}
                              onClick={() => setSelectedHistoryFlat({ unitName, sale, exec, status })}
                              className="hover:bg-indigo-50/30 dark:hover:bg-slate-800/40 transition-all cursor-pointer group"
                            >
                              <td className="p-3 font-mono font-bold text-indigo-700 dark:text-indigo-400 group-hover:text-indigo-600 transition flex items-center gap-1.5">
                                🏢 Unit {unitName}
                              </td>
                              <td className="p-3 text-gray-500 dark:text-slate-400 font-mono">Floor {parseInt(unitName)}</td>
                              <td className="p-3 font-mono font-semibold text-gray-700 dark:text-slate-200">{selectedProject.flat_unit_size}</td>
                              <td className="p-3">
                                {status === 'Sold' ? (
                                  <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/40 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                    ✓ Fully Sold
                                  </span>
                                ) : status === 'Booked' ? (
                                  <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/40 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                    ⚠ Booked (Pending Reg.)
                                  </span>
                                ) : (
                                  <span className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                    Vacant
                                  </span>
                                )}
                              </td>
                              <td className="p-3 font-semibold text-gray-950 dark:text-white">
                                {sale?.buyer_name ? (
                                  <span className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
                                    👤 {sale.buyer_name}
                                  </span>
                                ) : sale ? (
                                  <span className="text-gray-400 italic">Not logged</span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              <td className="p-3">
                                {exec ? (
                                  <div>
                                    <div className="font-bold text-gray-900 dark:text-slate-100">{exec.name}</div>
                                    <div className="text-[9px] text-gray-400 font-mono">ID: {exec.employee_id}</div>
                                  </div>
                                ) : sale ? (
                                  <span className="text-[10px] text-gray-400 font-mono">ID: {sale.executive_id}</span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  type="button"
                                  className="text-indigo-600 dark:text-indigo-400 font-extrabold uppercase text-[10px] hover:underline flex items-center gap-1 ml-auto"
                                >
                                  View History <ExternalLink className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Footer controls */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { setSelectedProject(null); setActivePlanTab('plan'); setSelectedHistoryFlat(null); }}
                  className="bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-755 text-gray-700 dark:text-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Close Plan View
                </button>
              </div>

              {/* Flat detailed historical booking modal popover */}
              {selectedHistoryFlat && (() => {
                const hSale = selectedHistoryFlat.sale;
                const hExec = selectedHistoryFlat.exec;
                const hReg = hSale ? unitRegistrations.find(r => r.project_on_sale_id === selectedProject.id && r.unit_name === selectedHistoryFlat.unitName) : null;

                return (
                  <div className="fixed inset-0 z-[60] bg-gray-950/80 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-gray-150 dark:border-slate-800 p-6 shadow-2xl relative space-y-4 animate-scale-in">
                      <div className="flex items-start justify-between border-b border-gray-150 dark:border-slate-800 pb-3">
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-indigo-600" /> Live Unit History Report
                          </h4>
                          <span className="text-[9px] text-gray-400 font-bold tracking-wider font-mono uppercase bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-md mt-0.5 block w-fit">
                            Flat Space {selectedHistoryFlat.unitName}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedHistoryFlat(null)}
                          className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1.5 rounded-lg transition text-xs font-black"
                        >
                          ✕
                        </button>
                      </div>

                      {hSale ? (
                        <div className="space-y-3">
                          <div className="bg-indigo-50/40 dark:bg-slate-850 p-4 border border-indigo-100/40 dark:border-slate-800 rounded-2xl space-y-2.5 text-xs text-slate-800 dark:text-slate-300">
                            <div className="flex items-center justify-between border-b border-dashed border-gray-200 dark:border-slate-700 pb-1.5">
                              <span className="text-gray-400 font-medium">Availability Status:</span>
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase ${selectedHistoryFlat.status === 'Sold' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}>
                                {selectedHistoryFlat.status === 'Sold' ? 'Sold & Registered' : 'Booked (Reg Pending)'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400">Buyer Full Name:</span>
                              <span className="font-extrabold text-indigo-650 dark:text-indigo-455 font-mono">{hSale.buyer_name || 'Not filled / N/A'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400">Booking Contract Date:</span>
                              <span className="font-bold font-mono">{hSale.sale_date}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400">Sales Order Order:</span>
                              <span className="font-bold text-gray-800 dark:text-white">Sale No. #{hSale.sale_number}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400">Registry Deed Documented:</span>
                              <span className="font-bold font-mono">
                                {hReg?.registered === 'Yes' ? `Yes (${hReg.registration_date?.substring(0, 10)})` : 'No (Pending Deed Confirmation)'}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <span className="text-[8px] uppercase tracking-wider font-black text-gray-400 flex items-center gap-1">Allocated Sales Broker</span>
                            <div className="flex items-center gap-2.5 bg-gray-50 dark:bg-slate-850/50 p-3 rounded-2xl border border-gray-100 dark:border-slate-800 text-xs">
                              <div className="p-2 bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                <User className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 dark:text-white">{hExec ? hExec.name : `Executive Reference ID: ${hSale.executive_id}`}</p>
                                <p className="text-[9px] text-gray-400 font-mono mt-0.5">Emp ID Badge: {hExec ? hExec.employee_id : 'N/A'}</p>
                                {hExec?.team_name && <p className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider mt-0.5">{hExec.team_name} Team Block</p>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-400 space-y-2 text-xs">
                          <p className="font-extrabold text-indigo-600">🏠 Flat is vacant / Available</p>
                          <p className="max-w-xs mx-auto text-gray-400 text-[11px] leading-relaxed">No booking documents, buyer registrations, or sales logs exist under flat code {selectedHistoryFlat.unitName}.</p>
                        </div>
                      )}

                      <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-slate-850">
                        <button
                          type="button"
                          onClick={() => setSelectedHistoryFlat(null)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition"
                        >
                          Acknowledge & Close
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

            </div>
          </div>
        );
      })()}

      {/* Save Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full border border-gray-100 dark:border-slate-800 p-6 shadow-2xl space-y-4">
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
                  onChange={(e) => handleProjectIdChange(e.target.value)}
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

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-50/50 dark:bg-slate-800/30 px-2.5 py-1 rounded-md">
                  Campaign Default Land Share Price (BDT) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 600000"
                    value={formData.land_share_price}
                    onChange={(e) => handleLandSharePriceChange(e.target.value)}
                    className="w-full text-xs font-semibold pl-4 pr-32 py-2.5 border border-indigo-200 dark:border-indigo-900 rounded-xl bg-white dark:bg-slate-800 text-gray-800 dark:text-white focus:outline-indigo-600"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-1 rounded-lg">
                    Propagates to all units
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-slate-400">
                  Changing this will update all unit types to match. You can still modify individual units separately below!
                </p>
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
                    onChange={(e) => handleUnitsPerFloorChange(Number(e.target.value))}
                    className="w-full text-xs font-semibold px-4 py-2.5 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-800 text-gray-800 dark:text-white focus:outline-indigo-600"
                  />
                </div>
              </div>

              {/* Dynamic Suffix configurations section */}
              <div className="space-y-2 border-t border-gray-100 dark:border-slate-800 pt-3">
                <label className="block text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                  Configure Individual Unit Types (Layout, Sizes & Pricing)
                </label>
                <div className="max-h-56 overflow-y-auto space-y-2 border border-dashed border-indigo-100 dark:border-slate-800 p-2.5 rounded-2xl bg-indigo-50/10">
                  {Array.from({ length: Number(formData.units_per_floor || 1) }).map((_, index) => {
                    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
                    const letter = letters[index] || String.fromCharCode(65 + index);
                    const config = unitConfigs[letter] || { size: 1200, land_share: 500000 };
                    
                    return (
                      <div key={letter} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center bg-gray-50/70 dark:bg-slate-850/50 p-2.5 rounded-xl border border-gray-100/30">
                        <div className="text-xs font-bold text-gray-700 dark:text-slate-300">
                          Unit <span className="font-mono text-indigo-600 dark:text-indigo-400 font-extrabold text-sm">{letter}</span> (e.g. {formData.floor_number || 4}{letter})
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Size (SFT)</label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={config.size}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setUnitConfigs(prev => ({
                                ...prev,
                                [letter]: { ...prev[letter], size: val }
                              }));
                            }}
                            className="w-full text-xs font-semibold px-2 py-1 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Land Share price (BDT)</label>
                          <input
                            type="number"
                            min="0"
                            required
                            value={config.land_share}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setUnitConfigs(prev => ({
                                ...prev,
                                [letter]: { ...prev[letter], land_share: val }
                              }));
                            }}
                            className="w-full text-xs font-semibold px-2 py-1 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-white"
                          />
                        </div>
                      </div>
                    );
                  })}
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
