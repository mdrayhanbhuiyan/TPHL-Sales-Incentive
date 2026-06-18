/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  Settings, 
  Coins, 
  Percent, 
  Calculator, 
  CheckCircle, 
  AlertTriangle,
  FlameKindling,
  Sparkles,
  Upload,
  Download,
  X,
  Check
} from 'lucide-react';
import { Project, IncentiveRule } from '../types';
import { useToast } from './Toast';

interface RulesViewProps {
  authToken: string;
  userRole: string;
  refreshTrigger?: number;
}

export default function RulesView({ authToken, userRole, refreshTrigger }: RulesViewProps) {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjId, setSelectedProjId] = useState('');
  
  // Rule form states for the project
  const [sale1, setSale1] = useState(1.5);
  const [sale2, setSale2] = useState(1.8);
  const [sale3, setSale3] = useState(2.0);
  const [sale4, setSale4] = useState(2.2);
  const [sale5, setSale5] = useState(2.5);
  const [sale6, setSale6] = useState(2.8);
  const [sale7, setSale7] = useState(3.0);
  const [firstFloorBonus, setFirstFloorBonus] = useState(0.5);
  const [topFloorBonus, setTopFloorBonus] = useState(0.5);

  // Global target achievement bonus rules
  const [target90, setTarget90] = useState(2000);
  const [target100, setTarget100] = useState(3500);
  const [teamBonusRule, setTeamBonusRule] = useState(5000);

  const [loading, setLoading] = useState(true);
  const [submittingProject, setSubmittingProject] = useState(false);
  const [submittingGlobal, setSubmittingGlobal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // CSV Import/Export states
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  // Download Dummy CSV template
  const handleDownloadDummyCSV = () => {
    const headers = [
      "rule_type",
      "name_or_project",
      "sale_1_percent",
      "sale_2_percent",
      "sale_3_percent",
      "sale_4_percent",
      "sale_5_percent",
      "sale_6_percent",
      "sale_7_percent",
      "first_floor_bonus_percent",
      "top_floor_bonus_percent",
      "target_90_bonus",
      "target_100_bonus",
      "team_target_bonus"
    ].join(",");

    const sampleProj1 = projects[0]?.project_name || "Green Orchid";
    const sampleProj2 = projects[1]?.project_name || "Sky Villa";

    const rows = [
      `global,System Global Targets,,,,,,,,,,,2000,3500,5000`,
      `project,${sampleProj1},1.5,1.8,2.0,2.2,2.5,2.8,3.0,0.5,0.5,,,`,
      `project,${sampleProj2},1.2,1.5,1.7,2.0,2.2,2.5,2.8,0.4,0.4,,,`
    ].join("\n");

    const csvContent = headers + "\n" + rows;
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "tphl_incentive_rules_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export current rules to CSV
  const handleExportCSV = async () => {
    setError(null);
    setSuccess(null);
    try {
      const rRes = await fetch('/api/rules', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const rulesObj = await rRes.json();
      
      const headers = [
        "rule_type",
        "name_or_project",
        "sale_1_percent",
        "sale_2_percent",
        "sale_3_percent",
        "sale_4_percent",
        "sale_5_percent",
        "sale_6_percent",
        "sale_7_percent",
        "first_floor_bonus_percent",
        "top_floor_bonus_percent",
        "target_90_bonus",
        "target_100_bonus",
        "team_target_bonus"
      ];

      const rows: any[] = [];
      
      // 1. Add global bonus row
      const gBonus = rulesObj.bonusRules;
      rows.push([
        "global",
        "System Global Targets",
        "", "", "", "", "", "", "", "", "",
        gBonus.target_90_bonus || 0,
        gBonus.target_100_bonus || 0,
        gBonus.team_target_bonus || 0
      ]);

      // 2. Add each project rule row
      for (const rule of rulesObj.projectRules) {
        const proj = projects.find(p => p.id === rule.project_id);
        const pName = proj ? proj.project_name : `Project ID: ${rule.project_id}`;
        rows.push([
          "project",
          `"${pName.replace(/"/g, '""')}"`,
          rule.sale_1_percent,
          rule.sale_2_percent,
          rule.sale_3_percent,
          rule.sale_4_percent,
          rule.sale_5_percent,
          rule.sale_6_percent,
          rule.sale_7_percent,
          rule.first_floor_bonus_percent,
          rule.top_floor_bonus_percent,
          "", "", ""
        ]);
      }

      const csvString = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `tphl_incentive_rules_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccess("Incentive calculation rules exported successfully as CSV.");
    } catch (err) {
      console.error(err);
      setError("Failed to export rules setup.");
    }
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
        
        const requiredHeaders = ['rule_type', 'name_or_project'];
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
          const ruleType = item.rule_type?.trim().toLowerCase();
          const nameOrProject = item.name_or_project?.trim().replace(/^["']|["']$/g, '');

          if (ruleType !== 'global' && ruleType !== 'project') {
            item._invalid = true;
            item._reason = "Rule Type must be either 'global' or 'project'.";
          } else if (!nameOrProject) {
            item._invalid = true;
            item._reason = "Name or Project field is required.";
          } else if (ruleType === 'project') {
            // Check if project exists
            const project = projects.find(p => p.project_name.toLowerCase().trim() === nameOrProject.toLowerCase().trim());
            if (!project) {
              item._invalid = true;
              item._reason = `Project "${nameOrProject}" is not found in systems yet.`;
            } else {
              item._projectName = project.project_name;
              item._projectId = project.id;
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

    const globalRow = validRows.find(r => r.rule_type === 'global');
    const projectRows = validRows.filter(r => r.rule_type === 'project');

    const bonusRulesPayload = globalRow ? {
      target_90_bonus: Number(globalRow.target_90_bonus || target90),
      target_100_bonus: Number(globalRow.target_100_bonus || target100),
      team_target_bonus: Number(globalRow.team_target_bonus || teamBonusRule)
    } : null;

    const projectRulesPayload = projectRows.map(r => ({
      project_name: r.name_or_project,
      sale_1_percent: Number(r.sale_1_percent || 1.5),
      sale_2_percent: Number(r.sale_2_percent || 1.8),
      sale_3_percent: Number(r.sale_3_percent || 2.0),
      sale_4_percent: Number(r.sale_4_percent || 2.2),
      sale_5_percent: Number(r.sale_5_percent || 2.5),
      sale_6_percent: Number(r.sale_6_percent || 2.8),
      sale_7_percent: Number(r.sale_7_percent || 3.0),
      first_floor_bonus_percent: Number(r.first_floor_bonus_percent || 0.5),
      top_floor_bonus_percent: Number(r.top_floor_bonus_percent || 0.5)
    }));

    setImporting(true);
    setCsvError(null);
    try {
      const res = await fetch('/api/rules/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          bonusRules: bonusRulesPayload,
          projectRules: projectRulesPayload
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Rules bulk configuration failed.");

      setSuccess(`Success! Synchronized ${result.updatedCount} incentive rules via CSV configuration.`);
      toast.success(`Synchronized ${result.updatedCount} incentive rules via CSV!`);
      setIsCsvModalOpen(false);
      setCsvFile(null);
      setParsedData([]);
      fetchRulesAndProjects(selectedProjId);
    } catch (err: any) {
      setCsvError(err.message);
      toast.error(err.message || "Failed to bulk import rules via CSV");
    } finally {
      setImporting(false);
    }
  };

  const fetchRulesAndProjects = async (projIdToLoad?: string) => {
    setLoading(true);
    try {
      const pRes = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const projs = await pRes.json();
      setProjects(projs);

      const targetProjId = projIdToLoad || projs[0]?.id || '';
      setSelectedProjId(targetProjId);

      const rRes = await fetch('/api/rules', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const rulesObj = await rRes.json();

      // Set global rules
      setTarget90(rulesObj.bonusRules.target_90_bonus);
      setTarget100(rulesObj.bonusRules.target_100_bonus);
      setTeamBonusRule(rulesObj.bonusRules.team_target_bonus);

      // Load specific rules of default / target projects
      if (targetProjId) {
        const rule = rulesObj.projectRules.find((r: any) => r.project_id === targetProjId);
        if (rule) {
          setSale1(rule.sale_1_percent);
          setSale2(rule.sale_2_percent);
          setSale3(rule.sale_3_percent);
          setSale4(rule.sale_4_percent);
          setSale5(rule.sale_5_percent);
          setSale6(rule.sale_6_percent);
          setSale7(rule.sale_7_percent);
          setFirstFloorBonus(rule.first_floor_bonus_percent);
          setTopFloorBonus(rule.top_floor_bonus_percent);
        } else {
          // Reset default if rule does not exist
          setSale1(1.5); setSale2(1.8); setSale3(2.0); setSale4(2.2); setSale5(2.5); setSale6(2.8); setSale7(3.0);
          setFirstFloorBonus(0.5); setTopFloorBonus(0.5);
        }
      }

    } catch (err) {
      console.error("Failed to load rules setup:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRulesAndProjects();
  }, [authToken, refreshTrigger]);

  const handleProjectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedProjId(val);
    setError(null);
    setSuccess(null);

    // Fetch corresponding rules
    try {
      const rRes = await fetch('/api/rules', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const rulesObj = await rRes.json();
      const rule = rulesObj.projectRules.find((r: any) => r.project_id === val);
      if (rule) {
        setSale1(rule.sale_1_percent);
        setSale2(rule.sale_2_percent);
        setSale3(rule.sale_3_percent);
        setSale4(rule.sale_4_percent);
        setSale5(rule.sale_5_percent);
        setSale6(rule.sale_6_percent);
        setSale7(rule.sale_7_percent);
        setFirstFloorBonus(rule.first_floor_bonus_percent);
        setTopFloorBonus(rule.top_floor_bonus_percent);
      } else {
        setSale1(1.5); setSale2(1.8); setSale3(2.0); setSale4(2.2); setSale5(2.5); setSale6(2.8); setSale7(3.0);
        setFirstFloorBonus(0.5); setTopFloorBonus(0.5);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const saveProjectRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjId) return;
    setError(null);
    setSuccess(null);
    setSubmittingProject(true);

    try {
      const res = await fetch(`/api/rules/project/${selectedProjId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          sale_1_percent: sale1,
          sale_2_percent: sale2,
          sale_3_percent: sale3,
          sale_4_percent: sale4,
          sale_5_percent: sale5,
          sale_6_percent: sale6,
          sale_7_percent: sale7,
          first_floor_bonus_percent: firstFloorBonus,
          top_floor_bonus_percent: topFloorBonus
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update project rule");

      setSuccess("Rules for selected project modified and cached successfully.");
      toast.success("Rules for selected project modified successfully!");
      // Trigger update of state to match recalculations
      fetchRulesAndProjects(selectedProjId);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || "Failed to save project rules");
    } finally {
      setSubmittingProject(false);
    }
  };

  const saveGlobalBonusRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmittingGlobal(true);

    try {
      const res = await fetch('/api/rules/global-bonus', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          target_90_bonus: target90,
          target_100_bonus: target100,
          team_target_bonus: teamBonusRule
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update target bonuses");

      setSuccess("Target bonus thresholds updated successfully! Database recalculated.");
      toast.success("Target bonus thresholds and global rules updated successfully!");
      fetchRulesAndProjects(selectedProjId);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || "Failed to save target bonuses");
    } finally {
      setSubmittingGlobal(false);
    }
  };

  // Find active project metadata
  const activeProj = projects.find(p => p.id === selectedProjId);
  const activeLandShare = activeProj ? activeProj.land_share_amount : 0;
  const activeUnitMeasure = activeProj ? activeProj.unit_measure : 0;

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Incentive Calculation Setup</h1>
          <p className="mt-1 text-sm text-gray-500 font-medium">Fine-tune commission matrices, set floor rate multipliers, and adjust global target thresholds.</p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 shadow-xs cursor-pointer transition active:scale-95"
            title="Export full incentive system rules configuration into a CSV file"
          >
            <Download className="w-4 h-4 text-indigo-500 font-bold" /> Export Rules CSV
          </button>
          {userRole === 'Admin' && (
            <button
              onClick={() => {
                setIsCsvModalOpen(true);
                setCsvFile(null);
                setParsedData([]);
                setCsvError(null);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs cursor-pointer transition active:scale-95"
              title="Import and apply sequence weights or global bonuses in bulk"
            >
              <Upload className="w-4 h-4" /> Import Rules CSV
            </button>
          )}
        </div>
      </div>

      {userRole !== 'Admin' && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 p-4 rounded-xl text-xs text-amber-800">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Restricted Operational Mode</p>
            <p className="leading-relaxed opacity-90">Only platform Administrators possess permissions to alter incentive scales or bonus allocations. Team leaders and Executives can only review rules configurations.</p>
          </div>
        </div>
      )}

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

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-2">
          <div className="w-9 h-9 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
          <p className="text-xs text-gray-400 font-mono">Parsing system schema matrices...</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main sequence project wise form */}
          <form onSubmit={saveProjectRule} className="col-span-2 bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs space-y-6">
            <div className="flex items-center gap-2.5 border-b border-gray-50 pb-3">
              <Settings className="w-5 h-5 text-indigo-600" />
              <h2 className="text-sm font-bold text-gray-800 leading-tight">Project Sequenced Rates Configurations</h2>
            </div>

            {/* Project dropdown selection */}
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Select Project Site</label>
                  <select
                    value={selectedProjId}
                    onChange={handleProjectChange}
                    className="w-full text-xs font-semibold bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 focus:outline-none focus:border-indigo-500"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.project_name}</option>
                    ))}
                  </select>
                </div>

                {/* Auto Feched read-only card */}
                {activeProj && (
                  <div className="bg-indigo-50/40 border border-indigo-100/50 rounded-xl p-3.5 space-y-2 flex flex-col justify-center">
                    <span className="text-[9px] font-bold text-indigo-800 uppercase tracking-wide">🔗 Auto-Fetched Property Specifications</span>
                    <div className="flex items-center justify-between text-xs text-indigo-950 font-medium font-mono">
                      <span>📏 Unit Benchmark: {activeUnitMeasure} SFT</span>
                      <span>💰 Land Share: {activeLandShare.toLocaleString()} BDT</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Editable percentage scales 1st-7th */}
              <div className="space-y-3 pt-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Sequence Commission Scales (%)</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  {[
                    { label: "1st Sale", val: sale1, setFn: setSale1 },
                    { label: "2nd Sale", val: sale2, setFn: setSale2 },
                    { label: "3rd Sale", val: sale3, setFn: setSale3 },
                    { label: "4th Sale", val: sale4, setFn: setSale4 },
                    { label: "5th Sale", val: sale5, setFn: setSale5 },
                    { label: "6th Sale", val: sale6, setFn: setSale6 },
                    { label: "7th+ Sale", val: sale7, setFn: setSale7 },
                  ].map((item, idx) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded-xl border border-gray-100/50 text-center space-y-2 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">{item.label}</span>
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          step="0.05"
                          disabled={userRole !== 'Admin'}
                          value={item.val}
                          onChange={(e) => item.setFn(Number(e.target.value))}
                          className="w-12 text-center text-xs font-bold font-mono bg-white border border-gray-100 rounded p-1 focus:outline-none"
                        />
                        <span className="text-[10px] text-gray-400 font-mono">%</span>
                      </div>
                      {/* Real time computed BDT previews! Highly professional signature! */}
                      {activeProj && (
                        <span className="text-[9px] text-emerald-600 font-bold font-mono block pt-1 border-t border-gray-100/50">
                          {((activeLandShare * item.val) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} BDT
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Floor bonus percentages */}
              <div className="space-y-3 pt-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Additional Floor Multipliers Percentage (%)</span>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100/50 space-y-3 flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-gray-700">1st Floor Bonus Percent</span>
                      <p className="text-[10px] text-gray-400">Bonus paid to executive on registering a first floor sale.</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="flex items-center bg-white border border-gray-100 p-2 rounded-xl">
                        <input
                          type="number"
                          step="0.01"
                          disabled={userRole !== 'Admin'}
                          value={firstFloorBonus}
                          onChange={(e) => setFirstFloorBonus(Number(e.target.value))}
                          className="w-14 text-center text-xs font-bold font-mono focus:outline-none"
                        />
                        <span className="text-xs text-gray-400 shrink-0 font-mono">%</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 font-mono min-w-[70px] text-right">
                        = {((activeLandShare * firstFloorBonus) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} BDT
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100/50 space-y-3 flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-gray-700">Top Floor Bonus Percent</span>
                      <p className="text-[10px] text-gray-400">Bonus paid to executive on registering a top floor sale.</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="flex items-center bg-white border border-gray-100 p-2 rounded-xl">
                        <input
                          type="number"
                          step="0.01"
                          disabled={userRole !== 'Admin'}
                          value={topFloorBonus}
                          onChange={(e) => setTopFloorBonus(Number(e.target.value))}
                          className="w-14 text-center text-xs font-bold font-mono focus:outline-none"
                        />
                        <span className="text-xs text-gray-400 shrink-0 font-mono">%</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 font-mono min-w-[70px] text-right">
                        = {((activeLandShare * topFloorBonus) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} BDT
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {userRole === 'Admin' && (
              <div className="border-t border-gray-50 pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={submittingProject}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-yellow-300 animate-spin" style={{ animationDuration: '3s' }} /> 
                  {submittingProject ? "Adjusting rates..." : "Commit Scales Updates"}
                </button>
              </div>
            )}
          </form>

          {/* Global Target Achievement Bonuses Form */}
          <form onSubmit={saveGlobalBonusRule} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-2.5 border-b border-gray-50 pb-3">
                <FlameKindling className="w-5 h-5 text-amber-500" />
                <h2 className="text-sm font-bold text-gray-800 leading-tight">Global Monthly Target Bonuses</h2>
              </div>

              <div className="space-y-4 text-xs">
                {/* 90% */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">90% Target Achieved (BDT)</span>
                    <span className="text-[10px] text-gray-400 font-mono">Individual bonus code</span>
                  </div>
                  <input
                    type="number"
                    disabled={userRole !== 'Admin'}
                    value={target90}
                    onChange={(e) => setTarget90(Number(e.target.value))}
                    className="w-full bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100 focus:outline-none focus:border-indigo-500 font-mono font-semibold"
                  />
                </div>

                {/* 100% */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">100% Target Achieved (BDT)</span>
                    <span className="text-[10px] text-gray-400 font-mono">Individual bonus code</span>
                  </div>
                  <input
                    type="number"
                    disabled={userRole !== 'Admin'}
                    value={target100}
                    onChange={(e) => setTarget100(Number(e.target.value))}
                    className="w-full bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100 focus:outline-none focus:border-indigo-500 font-mono font-semibold"
                  />
                </div>

                {/* Team target */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">Team Target Achieved (BDT)</span>
                    <span className="text-[10px] text-gray-400 font-mono">Team-wide bonus code</span>
                  </div>
                  <input
                    type="number"
                    disabled={userRole !== 'Admin'}
                    value={teamBonusRule}
                    onChange={(e) => setTeamBonusRule(Number(e.target.value))}
                    className="w-full bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100 focus:outline-none focus:border-indigo-500 font-mono font-semibold"
                  />
                </div>
              </div>
            </div>

            {userRole === 'Admin' && (
              <div className="border-t border-gray-50 pt-4 mt-6">
                <button
                  type="submit"
                  disabled={submittingGlobal}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold py-3 rounded-xl shadow-md transition cursor-pointer"
                >
                  {submittingGlobal ? "Recomputing thresholds..." : "Update Target Bonuses"}
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Dynamic Weight Analysis Visual Card */}
      {!loading && (() => {
        const maxThresholdBonus = Math.max(10000, target90, target100, teamBonusRule);
        return (
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-6 md:p-8 border border-indigo-900/60 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-900/40 pb-5">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] uppercase tracking-wider font-bold text-indigo-300">
                  <Calculator className="w-3.5 h-3.5" /> Core Math Engine Preview
                </div>
                <h3 className="text-lg font-bold tracking-tight text-white">Live Incentive Payout &amp; Weight Architecture</h3>
                <p className="text-xs text-indigo-200/70 max-w-2xl leading-relaxed">
                  Review the hierarchical weights currently actively configured for {activeProj?.project_name || 'the property sites'}.
                </p>
              </div>
              <div className="bg-indigo-900/20 border border-indigo-900/40 px-4 py-3 rounded-2xl shrink-0 text-center sm:text-right space-y-0.5">
                <span className="text-[10px] text-indigo-300 uppercase font-mono block">Valuation Foundation (Current Project)</span>
                <span className="text-base font-extrabold text-indigo-50 font-mono">{(activeLandShare || 0).toLocaleString()} BDT</span>
                <span className="text-[10px] text-indigo-300/60 block font-mono">Land Share Amount</span>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Step 1: Base Commission */}
              <div className="bg-slate-900/45 border border-indigo-900/20 p-5 rounded-2xl space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-bold font-mono">1</span>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-100">Base Commission Scale</span>
                </div>
                
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-300 leading-normal">
                    Incentives scale sequentially according to monthly registered sales count. Current weights applied:
                  </p>
                  
                  <div className="space-y-3.5 font-mono text-[11px]">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-slate-400">
                        <span>1st Sale weight ({sale1}%)</span>
                        <span className="font-semibold text-emerald-400">{((activeLandShare * sale1) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} BDT</span>
                      </div>
                      <div className="w-full h-1 bg-indigo-950/60 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, Math.max(0, (sale1 / 5) * 100))}%` }}
                          transition={{ type: "spring", stiffness: 90, damping: 13 }}
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-slate-400">
                        <span>3rd Sale weight ({sale3}%)</span>
                        <span className="font-semibold text-emerald-400">{((activeLandShare * sale3) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} BDT</span>
                      </div>
                      <div className="w-full h-1 bg-indigo-950/60 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, Math.max(0, (sale3 / 5) * 100))}%` }}
                          transition={{ type: "spring", stiffness: 90, damping: 13 }}
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-slate-400">
                        <span>5th Sale weight ({sale5}%)</span>
                        <span className="font-semibold text-emerald-400">{((activeLandShare * sale5) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} BDT</span>
                      </div>
                      <div className="w-full h-1 bg-indigo-950/60 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, Math.max(0, (sale5 / 5) * 100))}%` }}
                          transition={{ type: "spring", stiffness: 90, damping: 13 }}
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 border-t border-indigo-900/20 pt-2.5">
                      <div className="flex justify-between items-center text-slate-200 font-bold">
                        <span>Peak Weight (7th+: {sale7}%)</span>
                        <span className="text-emerald-400">{((activeLandShare * sale7) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} BDT</span>
                      </div>
                      <div className="w-full h-1 bg-indigo-950/60 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, Math.max(0, (sale7 / 5) * 100))}%` }}
                          transition={{ type: "spring", stiffness: 90, damping: 13 }}
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Multiplier Premium */}
              <div className="bg-slate-900/45 border border-indigo-900/20 p-5 rounded-2xl space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-bold font-mono">2</span>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-100">Floor Rates Weighting</span>
                </div>
                
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-300 leading-normal">
                    Premium multipliers are activated for specific challenging or premium levels to optimize sales alignment:
                  </p>
                  <div className="space-y-3 font-mono text-[11px]">
                    <div className="bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-900/20 space-y-2">
                      <div className="flex justify-between font-bold text-slate-200">
                        <span>1st Floor (+{firstFloorBonus}%)</span>
                        <span className="text-indigo-300">+{((activeLandShare * firstFloorBonus) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} BDT</span>
                      </div>
                      <div className="w-full h-1 bg-indigo-950/60 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, Math.max(0, (firstFloorBonus / 2) * 100))}%` }}
                          transition={{ type: "spring", stiffness: 90, damping: 13 }}
                          className="h-full rounded-full bg-indigo-400"
                        />
                      </div>
                      <p className="text-[9px] text-slate-400 leading-tight">Additional stack reward if unit floor rate triggers the first floor multiplier.</p>
                    </div>

                    <div className="bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-900/20 space-y-2">
                      <div className="flex justify-between font-bold text-slate-200">
                        <span>Top Floor (+{topFloorBonus}%)</span>
                        <span className="text-indigo-300">+{((activeLandShare * topFloorBonus) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} BDT</span>
                      </div>
                      <div className="w-full h-1 bg-indigo-950/60 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, Math.max(0, (topFloorBonus / 2) * 100))}%` }}
                          transition={{ type: "spring", stiffness: 90, damping: 13 }}
                          className="h-full rounded-full bg-indigo-400"
                        />
                      </div>
                      <p className="text-[9px] text-slate-400 leading-tight">Top floor rate premium is calculated based on project structural elevation limits.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Global Target Thresholds */}
              <div className="bg-slate-900/45 border border-indigo-900/20 p-5 rounded-2xl space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-bold font-mono">3</span>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-100">Global Target Threshold Boosts</span>
                </div>
                
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-300 leading-normal">
                    When a sales officer meets their customized target thresholds or coordinates with team milestones, flat-rate volume bonuses trigger on top:
                  </p>
                  <div className="space-y-3 font-mono text-[11px]">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-slate-400">
                        <span>90% of Quota Hit:</span>
                        <span className="text-amber-400 font-bold">+{target90.toLocaleString()} BDT</span>
                      </div>
                      <div className="w-full h-1 bg-indigo-950/60 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (target90 / maxThresholdBonus) * 100)}%` }}
                          transition={{ type: "spring", stiffness: 90, damping: 13 }}
                          className="h-full rounded-full bg-amber-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-slate-400">
                        <span>100% of Quota Hit:</span>
                        <span className="text-amber-400 font-bold">+{target100.toLocaleString()} BDT</span>
                      </div>
                      <div className="w-full h-1 bg-indigo-950/60 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (target100 / maxThresholdBonus) * 100)}%` }}
                          transition={{ type: "spring", stiffness: 90, damping: 13 }}
                          className="h-full rounded-full bg-amber-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Team Division Target Hit:</span>
                        <span className="text-amber-400 font-bold">+{teamBonusRule.toLocaleString()} BDT</span>
                      </div>
                      <div className="w-full h-1 bg-indigo-950/60 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (teamBonusRule / maxThresholdBonus) * 100)}%` }}
                          transition={{ type: "spring", stiffness: 90, damping: 13 }}
                          className="h-full rounded-full bg-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-indigo-500/10 text-indigo-300 rounded-xl p-2.5 text-[9px] leading-relaxed font-sans border border-indigo-500/20">
                    ⚡ <strong>Calculations Note:</strong> Individual bonuses are evaluated upon close of month based on target ratios. Team rewards require overall target completion by the assigned division.
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Formula Pipeline Diagram */}
            <div className="bg-indigo-950/30 border border-indigo-900/30 rounded-2xl p-4 md:p-5">
              <h4 className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-3.5 text-center font-mono">Dynamic Equation Workflow Diagram</h4>
              <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-4 text-center">
                <div className="flex-1 bg-slate-905 bg-slate-950/40 p-3 rounded-xl border border-indigo-900/20 text-xs w-full">
                  <span className="block font-bold text-gray-300 mb-1">Base Commission Component</span>
                  <span className="font-mono text-[11px] text-indigo-300">Share BDT × Sequence Weight %</span>
                </div>
                <div className="text-indigo-400 font-extrabold text-base shrink-0 select-none">+</div>
                <div className="flex-1 bg-slate-905 bg-slate-950/40 p-3 rounded-xl border border-indigo-900/20 text-xs w-full">
                  <span className="block font-bold text-gray-300 mb-1">Floor Rate Multipliers</span>
                  <span className="font-mono text-[11px] text-indigo-300">If Applicable (1st / Top Fl % × Share)</span>
                </div>
                <div className="text-indigo-400 font-extrabold text-base shrink-0 select-none">➜</div>
                <div className="flex-1 bg-emerald-950/30 p-3 rounded-xl border border-emerald-900/30 text-xs w-full shadow-inner animate-pulse">
                  <span className="block font-bold text-emerald-400 mb-1">Calculated Sale Incentive</span>
                  <span className="font-mono text-[11px] text-emerald-350 font-bold">Dispatched to real-time logs</span>
                </div>
                <div className="text-indigo-400 font-extrabold text-base shrink-0 select-none">+</div>
                <div className="flex-1 bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20 text-xs w-full">
                  <span className="block font-bold text-indigo-200 mb-1">Milestone Performance</span>
                  <span className="font-mono text-[11px] text-indigo-300">Target Threshold Flat Bonuses</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* CSV Import Modal */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl max-w-4xl w-full border border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-indigo-600" /> Bulk Incentive Setup CSV Import
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 font-medium">Upload a configuration matrix matching system rules to rewrite project sequence levels or global bonuses.</p>
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
                  onClick={() => document.getElementById('rulesCsvInput')?.click()}
                >
                  <input 
                    type="file" 
                    id="rulesCsvInput" 
                    accept=".csv" 
                    className="hidden" 
                    onChange={handleFileChange} 
                  />
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-gray-100 shadow-xs mx-auto text-gray-400 group-hover:text-indigo-600 group-hover:scale-110 transition duration-300">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-gray-700">Drag &amp; drop your rules configuration CSV here</p>
                    <p className="text-[10px] text-gray-400">or click to browse from local workstation storage directory</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadDummyCSV();
                    }}
                    className="inline-flex items-center gap-1 text-[10px] bg-white border border-gray-200 text-indigo-600 hover:bg-indigo-50 font-bold px-3 py-1.5 rounded-lg transition"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Standard Rules Template CSV
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* File specification tag */}
                  <div className="flex items-center justify-between bg-indigo-50/40 border border-indigo-100/50 p-4 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                        <Coins className="w-5 h-5" />
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
                            <th className="px-4 py-2.5">Rule Type</th>
                            <th className="px-4 py-2.5">Project Target Name</th>
                            <th className="px-4 py-2.5 text-center">Base Scales</th>
                            <th className="px-4 py-2.5 text-center">Multipliers</th>
                            <th className="px-4 py-2.5 text-right">Quota Threshold Bonuses</th>
                            <th className="px-4 py-2.5 text-right">Mapping Verdict</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {parsedData.map((row, idx) => (
                            <tr key={idx} className={row._invalid ? "bg-rose-50/30 text-rose-900" : "hover:bg-gray-50/40"}>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] uppercase font-bold ${
                                  row.rule_type === 'global' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                                }`}>
                                  {row.rule_type || 'Unknown'}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-semibold text-gray-800">
                                {row.name_or_project || <span className="text-rose-400 italic font-normal">Missing Name</span>}
                              </td>
                              <td className="px-4 py-3 text-center text-[11px] font-mono whitespace-nowrap">
                                {row.rule_type === 'project' ? (
                                  <span className="text-gray-600 bg-gray-100 px-2 py-0.5 rounded" title="Sale 1st to 7th seq %">
                                    {row.sale_1_percent}% ➔ {row.sale_7_percent}%
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center text-[10px] font-mono whitespace-nowrap">
                                {row.rule_type === 'project' ? (
                                  <span className="text-slate-600">
                                    Fl-1: +{row.first_floor_bonus_percent}% | Top: +{row.top_floor_bonus_percent}%
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-[10px] font-mono text-amber-700 font-bold whitespace-nowrap">
                                {row.rule_type === 'global' ? (
                                  <div className="space-y-0.5">
                                    <span>90%: +{Number(row.target_90_bonus || 0).toLocaleString()} BDT</span>
                                    <span className="block text-[8px] text-gray-400">100%: +{Number(row.target_100_bonus || 0).toLocaleString()} BDT • Team: +{Number(row.team_target_bonus || 0).toLocaleString()} BDT</span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-[10px] whitespace-nowrap">
                                {row._invalid ? (
                                  <span className="inline-flex items-center gap-1 text-rose-600 bg-rose-100/50 px-2.5 py-1 rounded-full font-semibold">
                                    <AlertTriangle className="w-3 h-3 text-rose-500" /> {row._reason}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-semibold">
                                    <Check className="w-3 h-3 text-emerald-500" /> Found &amp; Validated
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
                Rows with invalid mappings are automatically skipped. Other rows will overwrite the matching project or global thresholds instantly.
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
                        Synchronizing Rules...
                      </>
                    ) : (
                      <>
                        Apply Rules Matrix ({parsedData.filter(d => !d._invalid).length} rows)
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
