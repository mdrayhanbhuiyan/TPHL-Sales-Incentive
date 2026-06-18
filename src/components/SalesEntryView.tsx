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
  BookmarkCheck,
  Download,
  Upload,
  Check
} from 'lucide-react';
import { Project, SalesExecutive, ProjectOnSale } from '../types';
import { useToast } from './Toast';

interface SalesEntryProps {
  authToken: string;
  userRole: string;
  userProfile: any;
  refreshTrigger?: number;
}

export default function SalesEntryView({ authToken, userRole, userProfile, refreshTrigger }: SalesEntryProps) {
  const { toast } = useToast();
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
  const [buyerName, setBuyerName] = useState('');

  // List of generated units based on selected Campaign structure
  const [availableUnits, setAvailableUnits] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // CSV Export/Import states
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  // Download dummy template CSV
  const handleDownloadDummyCSV = () => {
    const headers = ["unit_name", "sale_date", "executive_name", "employee_id", "project_on_sale_name", "buyer_name", "floor_number", "unit_measure"];
    const demoRows = [
      ["1A", "2026-06-15", "Md Rayhan", "EMP001", "TPHL Green Valley Campaign", "Buyer Karim", "1", "1250 SFT"],
      ["5B", "2026-06-16", "Nusrat Jahan", "EMP002", "TPHL Sky Heights Campaign", "Buyer Rahim", "5", "1400 SFT"],
    ];
    const csvContent = [headers.join(","), ...demoRows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "tphl_sales_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Standard CSV sales upload sheet template downloaded successfully!");
  };

  // Export current listed filtered sales
  const handleExportCSV = () => {
    const headers = ["Project Name", "Campaign Name", "Sale Sequence No", "Unit ID / Name", "Buyer Name", "Floor Level", "Unit SFT Measure", "Sale Date", "Booking Handled By", "Officer Employee ID"];
    
    const rows = filteredSales.map(sale => {
      const campaignObj = projectsOnSale.find(pos => pos.id === sale.project_on_sale_id);
      const execObj = executives.find(ex => ex.id === sale.executive_id);
      return [
        String(sale.project_name || "").replace(/"/g, '""'),
        String(campaignObj ? campaignObj.project_name : 'Direct Booking').replace(/"/g, '""'),
        `Sale #${sale.sale_number}`,
        String(sale.unit_name || "").replace(/"/g, '""'),
        String(sale.buyer_name || "").replace(/"/g, '""'),
        `Level ${sale.floor_number}`,
        String(sale.unit_measure || "").replace(/"/g, '""'),
        sale.sale_date,
        String(sale.executive_name || "").replace(/"/g, '""'),
        execObj ? execObj.employee_id : ''
      ];
    });

    const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `tphl_sales_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Sales entries successfully exported and downloaded.");
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
        
        const requiredHeaders = ['unit_name', 'sale_date'];
        const missing = requiredHeaders.filter(h => !headers.includes(h));
        if (missing.length > 0) {
          setCsvError(`CSV missing required column headers: ${missing.join(', ')}`);
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

          // Validations
          const unitVal = item.unit_name?.trim();
          const pDateVal = item.sale_date?.trim();
          const execNameVal = item.executive_name?.trim();
          const empIdVal = item.employee_id?.trim();

          if (!unitVal || !pDateVal) {
            item._invalid = true;
            item._reason = "Unit Name and Sale Date are required.";
          } else {
            // Find executive
            let matchedExec = null;
            if (empIdVal) {
              matchedExec = executives.find(e => String(e.employee_id).toLowerCase().trim() === empIdVal.toLowerCase().trim());
            }
            if (!matchedExec && execNameVal) {
              matchedExec = executives.find(e => 
                String(e.name).toLowerCase().trim() === execNameVal.toLowerCase().trim() ||
                String(e.employee_id).toLowerCase().trim() === execNameVal.toLowerCase().trim()
              );
            }

            if (!matchedExec) {
              item._invalid = true;
              item._reason = "Could not resolve Executive name or Employee ID to active personnel.";
            } else {
              item.executive_id = matchedExec.id;
              item.resolved_executive_name = matchedExec.name;
            }

            // Optional Campaign matching validation
            const campaignNameVal = (item.project_on_sale_name || item.campaign_name || '').trim();
            if (campaignNameVal) {
              const matchedCampaign = projectsOnSale.find(pos => pos.project_name.toLowerCase().trim() === campaignNameVal.toLowerCase());
              if (!matchedCampaign) {
                // Not severe enough to reject, but alert or log
                item.campaign_mismatch = true;
              } else {
                item.project_on_sale_id = matchedCampaign.id;
                item.resolved_campaign_name = matchedCampaign.project_name;
              }
            }
          }

          item.unit_name = unitVal || '';
          item.sale_date = pDateVal || '';
          item.buyer_name = item.buyer_name?.trim() || '';
          item.floor_number = item.floor_number ? Number(item.floor_number) : 0;
          item.unit_measure = item.unit_measure?.trim() || '';

          items.push(item);
        }

        if (items.length === 0) {
          setCsvError("No valid rows parsed from the CSV file.");
        } else {
          setParsedData(items);
        }
      } catch (err) {
        setCsvError("Error parsing the CSV file.");
      }
    };
    reader.readAsText(file);
  };

  const submitCsvImport = async () => {
    const validEntries = parsedData.filter(d => !d._invalid);
    if (validEntries.length === 0) {
      setCsvError("There are no valid entries to import.");
      toast.warning("Nothing to import.");
      return;
    }

    setImporting(true);
    setCsvError(null);

    try {
      const res = await fetch('/api/sales/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ items: validEntries })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bulk import failed");

      toast.success(`Success! Bulk imported ${data.count} sales contract bookings successfully!`);
      setSuccess(`Imported list of ${data.count} sales logged chronologically.`);
      setIsCsvModalOpen(false);
      setCsvFile(null);
      setParsedData([]);
      fetchSalesData();
    } catch (err: any) {
      setCsvError(err.message || "Failed to finalize batch insertion.");
      toast.error(err.message || "Failed to bulk import sales.");
    } finally {
      setImporting(false);
    }
  };

  const openCsvModal = () => {
    setCsvFile(null);
    setParsedData([]);
    setCsvError(null);
    setIsCsvModalOpen(true);
  };

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
  }, [authToken, refreshTrigger]);

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

    // Dynamic SFT size lookup
    const campaign = projectsOnSale.find(p => p.id === projectOnSaleId);
    if (campaign) {
      const letter = unitNameVal.slice(-1).toUpperCase();
      if (campaign.unit_configs && campaign.unit_configs[letter]) {
        setUnitMeasure(`${campaign.unit_configs[letter].size} SFT`);
      } else {
        setUnitMeasure(campaign.flat_unit_size);
      }
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
      toast.warning("Please fill all required fields before submitting.");
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
          executive_id: finalExecId,
          buyer_name: buyerName
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to log sale");

      setSuccess(`Sales record successfully added for unit ${unitName}!`);
      toast.success(`Sales record successfully added for unit ${unitName}!`);
      setIsAddOpen(false);
      fetchSalesData();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || "Failed to create sales record");
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
          executive_id: finalExecId,
          buyer_name: buyerName
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to adjust sales entry");

      setSuccess(`Sales entry for unit ${unitName} adjusted successfully.`);
      toast.success(`Sales record for unit ${unitName} adjusted successfully.`);
      setIsEditOpen(false);
      fetchSalesData();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || "Failed to update sales record");
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
      toast.success(`Sales record for unit ${unit} has been cancelled successfully.`);
      fetchSalesData();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || "Failed to delete sales record");
    }
  };

  const openAddModal = () => {
    const firstCampaign = projectsOnSale[0];
    if (firstCampaign) {
      setProjectOnSaleId(firstCampaign.id);
      setProjId(firstCampaign.project_id);
      
      const units = generateUnits(firstCampaign.floor_number, firstCampaign.units_per_floor);
      setAvailableUnits(units);
      const defaultUnit = units[0] || '';
      setUnitName(defaultUnit);
      
      const parsedFloor = parseInt(defaultUnit || '1');
      setFloorNumber(isNaN(parsedFloor) ? 1 : parsedFloor);

      if (defaultUnit) {
        const letter = defaultUnit.slice(-1).toUpperCase();
        if (firstCampaign.unit_configs && firstCampaign.unit_configs[letter]) {
          setUnitMeasure(`${firstCampaign.unit_configs[letter].size} SFT`);
        } else {
          setUnitMeasure(firstCampaign.flat_unit_size);
        }
      } else {
        setUnitMeasure(firstCampaign.flat_unit_size);
      }
    } else {
      setProjectOnSaleId('');
      setProjId('');
      setUnitMeasure('');
      setAvailableUnits([]);
      setUnitName('');
      setFloorNumber(1);
    }

    setSaleDate(new Date().toISOString().split('T')[0]);
    setBuyerName('');
    
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
    setBuyerName(sale.buyer_name || '');

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
        
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-gray-105 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl shadow-3xs cursor-pointer transition"
            title="Export bookings list as CSV spreadsheet"
          >
            <Download className="w-4 h-4 text-gray-500" /> Export CSV
          </button>

          {userRole === 'Admin' && (
            <button
              onClick={openCsvModal}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl shadow-3xs cursor-pointer transition border border-emerald-100"
              title="Bulk import sales agreements via CSV template"
            >
              <Upload className="w-4 h-4 text-emerald-600" /> Import Sales CSV
            </button>
          )}

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
                      <td className="p-4 font-extrabold text-gray-950 font-mono">
                        <div>{sale.unit_name}</div>
                        {sale.buyer_name && (
                          <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold normal-case mt-0.5 whitespace-nowrap" title="Buyer Name">
                            👤 {sale.buyer_name}
                          </div>
                        )}
                      </td>
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

                <div className="col-span-2 space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Buyer / Customer Full Name</label>
                  <input
                    type="text"
                    placeholder="Enter Buyer Full Name (e.g. Sajjad Ahmed)"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full text-xs font-semibold bg-white rounded-xl px-3.5 py-2.5 border border-gray-200 focus:outline-indigo-600 text-gray-800"
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

      {/* CSV Bulk Import Modal */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 bg-gray-905/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-3xl bg-white rounded-3xl border border-gray-100 p-6 shadow-xl space-y-4 relative flex flex-col max-h-[90vh]">
            <button 
              onClick={() => setIsCsvModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:bg-gray-50 hover:text-gray-900 transition font-bold"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="shrink-0 space-y-1 mt-1">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-600" />
                Bulk Import Sales Agreements from CSV File
              </h2>
              <p className="text-xs text-gray-500">
                Instantly import multiple contract bookings. The system matches and links sales team executives and configurations in the background, validating active milestones.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-[150px]">
              {/* Drag Drop Area */}
              <div
                onDragOver={handleCsvDragOver}
                onDrop={handleCsvDrop}
                className="border-2 border-dashed border-gray-200 hover:border-indigo-400 bg-gray-50/50 hover:bg-white rounded-2xl p-6 text-center transition cursor-pointer select-none"
              >
                <div onClick={() => document.getElementById('salesCsvPickerInput')?.click()} className="space-y-2">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center mx-auto text-indigo-600">
                    <Upload className="w-5 h-5" />
                  </div>
                  <input 
                    type="file" 
                    id="salesCsvPickerInput"
                    accept=".csv" 
                    onChange={handleCsvFileChange}
                    className="hidden" 
                  />
                  {csvFile ? (
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-gray-900">File loaded: <span className="font-mono text-indigo-600">{csvFile.name}</span></p>
                      <p className="text-[10px] text-gray-400 font-mono">{(csvFile.size / 1024).toFixed(1)} KB • Click or drop to replace</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-gray-805">Drag &amp; drop your bookings spreadsheet file here, or <span className="text-indigo-600 underline">browse</span></p>
                      <p className="text-[10px] text-gray-300">Comma-separated .csv encoding supported</p>
                    </div>
                  )}
                </div>

                {!csvFile && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDownloadDummyCSV(); }}
                    className="mt-3.5 inline-flex items-center gap-1 bg-white hover:bg-gray-50 border border-gray-200 text-[10px] font-bold text-indigo-600 px-3.5 py-2 rounded-lg cursor-pointer transition shadow-3xs"
                  >
                    <Download className="w-3 h-3" /> Download Standard Bookings Template CSV
                  </button>
                )}
              </div>

              {/* Parsing Errors Display */}
              {csvError && (
                <div className="flex items-start gap-2 bg-rose-50 border border-rose-150 p-3.5 rounded-2xl text-[11px] font-medium text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-normal">{csvError}</span>
                </div>
              )}

              {/* CSV Rows Live Preview Table */}
              {parsedData.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    <span>Parsed CSV Row Preview ({parsedData.length} lines parsed)</span>
                    <span className="text-indigo-600 font-bold">{parsedData.filter(d => !d._invalid).length} validated • {parsedData.filter(d => d._invalid).length} skipped</span>
                  </div>

                  <div className="border border-gray-100 rounded-2xl overflow-hidden max-h-[220px] overflow-y-auto shadow-3xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-[#fcfdfd] sticky top-0 border-b border-gray-100 text-[10px] text-gray-400 uppercase font-mono">
                        <tr>
                          <th className="px-4 py-2.5">Row ID</th>
                          <th className="px-4 py-2.5">Unit ID</th>
                          <th className="px-4 py-2.5">Sale Date</th>
                          <th className="px-4 py-2.5">Executive &amp; Mapping</th>
                          <th className="px-4 py-2.5">Buyer Name</th>
                          <th className="px-4 py-2 text-right">Pre-check Validation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {parsedData.map((row, idx) => (
                          <tr key={idx} className={row._invalid ? 'bg-rose-50/20 opacity-80' : 'hover:bg-gray-50/30'}>
                            <td className="px-4 py-2.5 font-mono font-bold text-gray-400 text-[11px]">{idx + 1}</td>
                            <td className="px-4 py-2.5 font-mono font-bold text-gray-900 text-[11px]">{row.unit_name || <span className="italic text-gray-300">none</span>}</td>
                            <td className="px-4 py-2.5 font-mono text-gray-650 text-[11px]">{row.sale_date || <span className="italic text-gray-300">none</span>}</td>
                            <td className="px-4 py-2.5 space-y-0.5">
                              <div className="text-[10px] font-bold text-gray-850">
                                {row.resolved_executive_name ? `👤 ${row.resolved_executive_name}` : <span className="text-rose-650 italic font-normal">Unresolved Officer: "{row.executive_name || row.employee_id || 'none'}"</span>}
                              </div>
                              <div className="text-[9px] text-gray-400 font-mono">
                                Campaign: {row.resolved_campaign_name ? row.resolved_campaign_name : (row.project_on_sale_name ? `unmatched: "${row.project_on_sale_name}"` : 'Direct Portal Entry')}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-gray-700 font-semibold text-[11px]">{row.buyer_name || <span className="italic text-gray-300">-</span>}</td>
                            <td className="px-4 py-2.5 text-right">
                              {row._invalid ? (
                                <span className="inline-flex items-center gap-1 text-[9px] bg-rose-50 border border-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold max-w-[150px] truncate" title={row._reason}>
                                  ⚠️ {row._reason}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono">
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

            <div className="shrink-0 border-t border-gray-100 pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(false)}
                className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold py-3 rounded-xl transition cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitCsvImport}
                disabled={importing || parsedData.filter(d => !d._invalid).length === 0}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white disabled:text-gray-400 text-xs font-bold py-3 rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {importing ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border border-current border-t-transparent animate-spin" />
                    <span>Processing bookings...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Upload Validated Bookings ({parsedData.filter(d => !d._invalid).length} sales)</span>
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
