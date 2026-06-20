/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  Coins, 
  Search, 
  Printer, 
  FileSpreadsheet, 
  FileText, 
  Calendar, 
  FolderHeart, 
  Users, 
  Trophy, 
  ArrowUpRight,
  Filter,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  Download
} from 'lucide-react';
import { useToast } from './Toast';

interface IncentivesProps {
  authToken: string;
  userRole: string;
  refreshTrigger?: number;
}

export default function IncentivesView({ authToken, userRole, refreshTrigger }: IncentivesProps) {
  const { toast } = useToast();

  const [incentives, setIncentives] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selProject, setSelProject] = useState('All');
  const [selMonth, setSelMonth] = useState('All');

  // Report Type Selection
  const [activeReport, setActiveReport] = useState<string>('mon-inc'); 
  // 'mon-sales' | 'mon-inc' | 'exec-perf' | 'team-perf' | 'proj-sales' | 'proj-inc' | 'top-seller' | 'top-earner'

  // CSV Import States
  const [showImport, setShowImport] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  // Download a Dummy Sales CSV template
  const handleDownloadTemplate = () => {
    const headers = [
      'unit_name',
      'sale_date',
      'project_name',
      'employee_id',
      'executive_name',
      'buyer_name',
      'unit_measure',
      'floor_number'
    ];
    
    const sampleRows = [
      ['A-302', '2026-06-15', 'Orchard Point', 'exec-rahim', 'Rahim Ahmed', 'Karim Al Hasan', '1450 SFT', '3'],
      ['B-501', '2026-06-16', 'Green Valley', 'exec-karim', 'Karim Al Hasan', 'Zareen Tasnim', '1250 SFT', '5']
    ];

    const csvContent = [
      headers.join(','),
      ...sampleRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "tphl_sales_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.info("Sales CSV import template downloaded!");
  };

  // CSV Drag and drop / selection handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv')) {
        readSalesCsv(file);
      } else {
        setCsvError("Only CSV files are supported.");
        toast.error("Invalid file format. Please upload a .csv file.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith('.csv')) {
        readSalesCsv(file);
      } else {
        setCsvError("Only CSV files are supported.");
        toast.error("Invalid file format. Please upload a .csv file.");
      }
    }
  };

  const readSalesCsv = (file: File) => {
    setCsvError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setCsvError("Uploaded file is empty.");
          return;
        }

        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) {
          setCsvError("CSV file must contain a header row and at least one data row.");
          return;
        }

        // Clean and normalize headers (trim whitespace and lowcase)
        const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());

        const required = ['unit_name', 'sale_date'];
        const missing = required.filter(r => !headers.includes(r));
        if (missing.length > 0) {
          setCsvError(`CSV missing required column headers: ${missing.join(', ')}. Please make sure your file contains headers for 'unit_name' and 'sale_date'.`);
          return;
        }

        const parsed: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Split line by comma with quote safety
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
          headers.forEach((h, idx) => {
            item[h] = values[idx] !== undefined ? values[idx] : '';
          });

          // Validation / Normalization
          if (!item.unit_name) {
            item._invalid = true;
            item._reason = "Unit name is required.";
          } else if (!item.sale_date) {
            item._invalid = true;
            item._reason = "Sale date is required.";
          } else if (!item.employee_id && !item.executive_name && !item.executive_id) {
            item._invalid = true;
            item._reason = "At least one seller identification (employee_id, executive_name, or executive_id) is required.";
          }

          parsed.push(item);
        }

        if (parsed.length === 0) {
          setCsvError("No valid rows could be parsed from the CSV file.");
        } else {
          setParsedData(parsed);
          toast.success(`Parsed ${parsed.length} rows successfully! Review them below.`);
        }
      } catch (err) {
        console.error(err);
        setCsvError("An error occurred while parsing the CSV file.");
        toast.error("Failed to parse CSV file.");
      }
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async () => {
    const validItems = parsedData.filter(d => !d._invalid);
    if (validItems.length === 0) {
      toast.error("There are no valid entries to import.");
      return;
    }

    setImporting(true);
    try {
      const response = await fetch('/api/sales/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ items: validItems })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Bulk import failed.");
      }

      const result = await response.json();
      toast.success(`Successfully imported ${result.count} sales records!`);
      
      // Clear out the state
      setParsedData([]);
      setShowImport(false);
      
      // Re-fetch all calculations & ledger state
      await fetchIncentivesAndTeams();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to commit CSV rows to repository.");
    } finally {
      setImporting(false);
    }
  };

  const handleClearImport = () => {
    setParsedData([]);
    setCsvError(null);
  };

  const fetchIncentivesAndTeams = async () => {
    if (incentives.length === 0) {
      setLoading(true);
    }
    try {
      const incRes = await fetch('/api/incentives', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await incRes.json();
      setIncentives(Array.isArray(data) ? data : []);

      // Also get team directory with targets & leaders
      const teamRes = await fetch('/api/teams', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const teamData = await teamRes.json();
      setTeams(Array.isArray(teamData) ? teamData : []);
    } catch (err) {
      console.error("Error loaded report states:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncentivesAndTeams();
  }, [authToken, refreshTrigger]);

  // List unique values for filters
  const uniqueProjects = Array.from(new Set(incentives.map(inc => inc.project_name))).sort();
  const monthsName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Filter incentive rows based on filters
  const getFilteredIncentives = () => {
    return incentives.filter(inc => {
      const matchSearch = 
        String(inc.project_name || '').toLowerCase().includes(search.toLowerCase()) ||
        String(inc.executive_name || '').toLowerCase().includes(search.toLowerCase()) ||
        String(inc.unit_name || '').toLowerCase().includes(search.toLowerCase()) ||
        String(inc.employee_id || '').toLowerCase().includes(search.toLowerCase());

      const matchProj = selProject === 'All' || inc.project_name === selProject;
      const matchMonth = selMonth === 'All' || String(inc.month) === selMonth;

      return matchSearch && matchProj && matchMonth;
    });
  };

  // 1. Report Generators:
  const getReportPayload = () => {
    const list = getFilteredIncentives();

    switch (activeReport) {
      case 'mon-sales':
        // Monthly Sales Report
        return {
          title: "Monthly Sales Journal Report",
          headers: ["Booking Date", "Project Development", "Unit Name", "Level", "Unit SFT", "Broker Officer", "Property Share value (BDT)"],
          rows: list.map(item => [
            item.sale_date,
            item.project_name,
            item.unit_name,
            `Level ${item.floor_number}`,
            String(item.unit_measure),
            `${item.executive_name} (${item.employee_id})`,
            Number(item.land_share_amount).toLocaleString()
          ]),
          sums: [
            "", "", "", "", "", "Total Volume Handled:", 
            list.reduce((sum, item) => sum + Number(item.land_share_amount), 0).toLocaleString() + " BDT"
          ]
        };

      case 'mon-inc':
        // Monthly Incentive Report
        return {
          title: "Monthly Sales Incentive Ledger Report",
          headers: ["Project Site", "Unit Info", "Sales Officer", "Base Inc (BDT)", "Floor Bonus (BDT)", "Target Bonus (BDT)", "Team Bonus (BDT)", "Total Payout (BDT)"],
          rows: list.map(item => [
            item.project_name,
            `${item.unit_name} (L${item.floor_number})`,
            item.executive_name,
            Number(item.base_incentive).toLocaleString(),
            Number(item.floor_bonus).toLocaleString(),
            Number(item.target_bonus).toLocaleString(),
            Number(item.team_bonus).toLocaleString(),
            Number(item.total_incentive).toLocaleString()
          ]),
          sums: [
            "", "", "Cumulative Sums:",
            list.reduce((sum, item) => sum + Number(item.base_incentive), 0).toLocaleString(),
            list.reduce((sum, item) => sum + Number(item.floor_bonus), 0).toLocaleString(),
            list.reduce((sum, item) => sum + Number(item.target_bonus), 0).toLocaleString(),
            list.reduce((sum, item) => sum + Number(item.team_bonus), 0).toLocaleString(),
            list.reduce((sum, item) => sum + Number(item.total_incentive), 0).toLocaleString() + " BDT"
          ]
        };

      case 'exec-perf':
        // Executive Performance Report
        const execMap: Record<string, any> = {};
        list.forEach(item => {
          const key = item.executive_id;
          if (!execMap[key]) {
            execMap[key] = { name: item.executive_name, empId: item.employee_id, count: 0, val: 0, base: 0, bonuses: 0, net: 0 };
          }
          execMap[key].count += 1;
          execMap[key].val += Number(item.land_share_amount);
          execMap[key].base += Number(item.base_incentive);
          execMap[key].bonuses += Number(item.floor_bonus + item.target_bonus + item.team_bonus);
          execMap[key].net += Number(item.total_incentive);
        });
        const execRows = Object.values(execMap);
        return {
          title: "Executive Commission Performance Ledger",
          headers: ["Officer Name", "Employee IDprefix", "Registered Bookings", "Handled Volume (BDT)", "Cumulative Base (BDT)", "Allocated Bonuses (BDT)", "Total Net Payout (BDT)"],
          rows: execRows.map(o => [
            o.name, o.empId, o.count, o.val.toLocaleString(), o.base.toLocaleString(), o.bonuses.toLocaleString(), o.net.toLocaleString()
          ]),
          sums: [
            "Total Officers: " + execRows.length, "", 
            execRows.reduce((sum, o) => sum + o.count, 0),
            execRows.reduce((sum, o) => sum + o.val, 0).toLocaleString(),
            execRows.reduce((sum, o) => sum + o.base, 0).toLocaleString(),
            execRows.reduce((sum, o) => sum + o.bonuses, 0).toLocaleString(),
            execRows.reduce((sum, o) => sum + o.net, 0).toLocaleString() + " BDT"
          ]
        };

      case 'team-perf':
        // Team Performance Report
        // Align data dynamically with the real salesTeams list from the backend
        const directoryTeams = Array.isArray(teams) ? teams : [];
        const teamPerfMap: Record<string, any> = {};

        // 1. Seed report map with active registered teams to ensure 0-sale teams are also listed!
        directoryTeams.forEach(t => {
          teamPerfMap[t.team_name] = {
            team_name: t.team_name,
            team_leader: t.team_leader || 'N/A',
            sales_target: Number(t.sales_target || 0),
            count: 0,
            volume: 0,
            totalInc: 0
          };
        });

        // 2. Accumulate individual sales entries under respective teams (handles unassigned individuals as well)
        list.forEach(item => {
          const name = item.team_name || 'Unassigned / Independent';
          if (!teamPerfMap[name]) {
            teamPerfMap[name] = {
              team_name: name,
              team_leader: 'Independent Officers',
              sales_target: 0,
              count: 0,
              volume: 0,
              totalInc: 0
            };
          }
          teamPerfMap[name].count += 1;
          teamPerfMap[name].volume += Number(item.land_share_amount || 0);
          teamPerfMap[name].totalInc += Number(item.total_incentive || 0);
        });

        const teamPerfRows = Object.values(teamPerfMap);

        // 3. Map into complete audit rows
        const calculatedRows = teamPerfRows.map(t => {
          const compPercent = t.sales_target > 0 ? Math.round((t.count / t.sales_target) * 100) : 0;
          let verdict = "N/A - Off Cycle";
          if (t.sales_target > 0) {
            verdict = compPercent >= 100 ? "🎯 Fully Achieved" : compPercent >= 75 ? "📈 On Target Track" : "⚠️ Under Performing";
          }
          return [
            t.team_name,
            t.team_leader,
            t.sales_target > 0 ? `${t.sales_target} Units` : '-',
            `${t.count} Units`,
            t.sales_target > 0 ? `${compPercent}%` : '-',
            Number(t.volume).toLocaleString(),
            Number(t.totalInc).toLocaleString(),
            verdict
          ];
        });

        // 4. Over-all calculations
        const tTargets = teamPerfRows.reduce((s, t) => s + t.sales_target, 0);
        const tAchieved = teamPerfRows.reduce((s, t) => s + t.count, 0);
        const overallCompPercent = tTargets > 0 ? Math.round((tAchieved / tTargets) * 100) : 0;
        const totalVolume = teamPerfRows.reduce((s, t) => s + t.volume, 0);
        const totalPayouts = teamPerfRows.reduce((s, t) => s + t.totalInc, 0);

        const cumulativeSums = [
          "Sum Totals (" + teamPerfRows.length + " Divisions):",
          "",
          tTargets > 0 ? `${tTargets} Units` : "-",
          `${tAchieved} Units`,
          tTargets > 0 ? `${overallCompPercent}%` : "-",
          totalVolume.toLocaleString(),
          totalPayouts.toLocaleString() + " BDT",
          tTargets > 0 ? (overallCompPercent >= 100 ? "🎯 Target Exceeded" : "⚠️ Needs Improvement") : "N/A"
        ];

        return {
          title: "Sales Teams Performance & Targets Auditing Report",
          headers: ["Sales Team Division Name", "Team Leader", "Target Quota", "Achieved Sales", "Quota Completion %", "Accumulated Sales Volume (BDT)", "Total Distributed Commission (BDT)", "Performance Verdict"],
          rows: calculatedRows,
          sums: cumulativeSums
        };

      case 'proj-sales':
        // Project Wise Sales Report
        const projSalesMap: Record<string, any> = {};
        list.forEach(item => {
          const key = item.project_name;
          if (!projSalesMap[key]) {
            projSalesMap[key] = { project: item.project_name, count: 0, volume: 0 };
          }
          projSalesMap[key].count += 1;
          projSalesMap[key].volume += Number(item.land_share_amount);
        });
        const projSalesRows = Object.values(projSalesMap);
        return {
          title: "Project Wise Sales Volume Summary Report",
          headers: ["Project Site Name", "Units Booked", "Booking Pipeline Volume (BDT)"],
          rows: projSalesRows.map(p => [
            p.project, p.count, p.volume.toLocaleString()
          ]),
          sums: [
            "Total Projects: " + projSalesRows.length,
            projSalesRows.reduce((sum, p) => sum + p.count, 0),
            projSalesRows.reduce((sum, p) => sum + p.volume, 0).toLocaleString() + " BDT"
          ]
        };

      case 'proj-inc':
        // Project Wise Incentive Report
        const projIncMap: Record<string, any> = {};
        list.forEach(item => {
          const key = item.project_name;
          if (!projIncMap[key]) {
            projIncMap[key] = { project: item.project_name, count: 0, payouts: 0 };
          }
          projIncMap[key].count += 1;
          projIncMap[key].payouts += Number(item.total_incentive);
        });
        const projIncRows = Object.values(projIncMap);
        return {
          title: "Project Wise Commission Payout Summaries",
          headers: ["Project Site Name", "Claims Logs Saved", "Total Distributed Commission (BDT)"],
          rows: projIncRows.map(p => [
            p.project, p.count, p.payouts.toLocaleString()
          ]),
          sums: [
            "Total Sites: " + projIncRows.length,
            projIncRows.reduce((sum, p) => sum + p.count, 0),
            projIncRows.reduce((sum, p) => sum + p.payouts, 0).toLocaleString() + " BDT"
          ]
        };

      case 'top-seller':
        // Top Seller Report (sorted by volume handled descending)
        const topSMap: Record<string, any> = {};
        list.forEach(item => {
          const key = item.executive_id;
          if (!topSMap[key]) {
            topSMap[key] = { name: item.executive_name, empId: item.employee_id, team: item.team_name, count: 0, val: 0 };
          }
          topSMap[key].count += 1;
          topSMap[key].val += Number(item.land_share_amount);
        });
        const topSList = Object.values(topSMap).sort((a,b) => b.val - a.val).slice(0, 10);
        return {
          title: "Top 10 High-Value Seller Rankings",
          headers: ["Leaderboard Rank", "Officer Name", "Employee ID", "Sales Division", "Units Hooked", "Cumulative Sales Quota (BDT)"],
          rows: topSList.map((o, idx) => [
            `Rank #${idx + 1}`, o.name, o.empId, o.team, o.count, o.val.toLocaleString()
          ]),
          sums: [
            "", "", "", "Ranked Accumulation:", 
            topSList.reduce((sum, o) => sum + o.count, 0),
            topSList.reduce((sum, o) => sum + o.val, 0).toLocaleString() + " BDT"
          ]
        };

      case 'top-earner':
        // Top Incentive Earners Report (sorted by net payout descending)
        const topEMap: Record<string, any> = {};
        list.forEach(item => {
          const key = item.executive_id;
          if (!topEMap[key]) {
            topEMap[key] = { name: item.executive_name, empId: item.employee_id, team: item.team_name, count: 0, payouts: 0 };
          }
          topEMap[key].count += 1;
          topEMap[key].payouts += Number(item.total_incentive);
        });
        const topEList = Object.values(topEMap).sort((a,b) => b.payouts - a.payouts).slice(0, 10);
        return {
          title: "Top 10 High-Yield Incentive Earners",
          headers: ["Incentive Rank", "Sales Officer", "Employee ID", "Sales Division Team", "Claims Awarded", "Accumulated Commission Paid (BDT)"],
          rows: topEList.map((o, idx) => [
            `Rank #${idx + 1}`, o.name, o.empId, o.team, o.count, o.payouts.toLocaleString()
          ]),
          sums: [
            "", "", "", "Top Earners Cumulative Sum:", 
            topEList.reduce((sum, o) => sum + o.count, 0),
            topEList.reduce((sum, o) => sum + o.payouts, 0).toLocaleString() + " BDT"
          ]
        };

      default:
        return { title: "TPHL Report", headers: [], rows: [], sums: [] };
    }
  };

  const activeRepObj = getReportPayload();

  // Metric aggregates for glass dashboard overview cards
  const listForMetrics = getFilteredIncentives();
  const totalSalesCount = listForMetrics.length;
  const totalVolumeBDT = listForMetrics.reduce((sum, item) => sum + Number(item.land_share_amount || 0), 0);
  const totalIncentivesBDT = listForMetrics.reduce((sum, item) => sum + Number(item.total_incentive || 0), 0);
  const totalBaseIncentive = listForMetrics.reduce((sum, item) => sum + Number(item.base_incentive || 0), 0);
  const totalFloorBonus = listForMetrics.reduce((sum, item) => sum + Number(item.floor_bonus || 0), 0);
  const totalTargetBonus = listForMetrics.reduce((sum, item) => sum + Number(item.target_bonus || 0), 0);
  const totalTeamBonus = listForMetrics.reduce((sum, item) => sum + Number(item.team_bonus || 0), 0);
  const avgIncentiveValue = totalSalesCount > 0 ? Math.round(totalIncentivesBDT / totalSalesCount) : 0;

  // --- ACTIONS EXPORTERS ---

  // EXPORT EXCEL (CSV formatting and triggers with Blob safety)
  const triggerExcelExport = () => {
    let csvString = `"${activeRepObj.title}"\n`;
    csvString += `Generated: ${new Date().toISOString()}\n\n`;
    
    // Headers
    csvString += activeRepObj.headers.map(h => `"${h}"`).join(",") + "\n";
    
    // Rows
    activeRepObj.rows.forEach(r => {
      const sanitized = r.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`);
      csvString += sanitized.join(",") + "\n";
    });

    // Sums
    csvString += activeRepObj.sums.map(s => `"${String(s).replace(/"/g, '""')}"`).join(",") + "\n";

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeFilename = activeRepObj.title.toLowerCase().replace(/\s+/g, "_") + ".csv";
    link.setAttribute("href", url);
    link.setAttribute("download", safeFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Ledger report CSV downloaded successfully for offline auditing!");
  };

  // EXPORT SALES CSV for accounting purposes
  const triggerSalesCSVExport = () => {
    const list = getFilteredIncentives();
    
    const headers = [
      "Incentive ID",
      "Sale ID",
      "Sale Date",
      "Project Name",
      "Unit Name",
      "Floor Number",
      "Executive Name",
      "Employee ID",
      "Team Name",
      "Base Incentive (BDT)",
      "Floor Bonus (BDT)",
      "Target Bonus (BDT)",
      "Team Bonus (BDT)",
      "Total Incentive (BDT)",
      "Month",
      "Year"
    ];

    const rows = list.map(item => [
      item.id || '',
      item.sale_id || '',
      item.sale_date || '',
      item.project_name || '',
      item.unit_name || '',
      item.floor_number || 0,
      item.executive_name || '',
      item.employee_id || '',
      item.team_name || '',
      item.base_incentive || 0,
      item.floor_bonus || 0,
      item.target_bonus || 0,
      item.team_bonus || 0,
      item.total_incentive || 0,
      item.month || '',
      item.year || ''
    ]);

    let csvString = headers.map(h => `"${h}"`).join(",") + "\n";
    rows.forEach(r => {
      const sanitized = r.map(cell => `"${String(cell).replace(/"/g, '""')}"`);
      csvString += sanitized.join(",") + "\n";
    });

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeFilename = `tphl_accounting_sales_data_${new Date().toISOString().slice(0,10)}.csv`;
    link.setAttribute("href", url);
    link.setAttribute("download", safeFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Current sales data CSV downloaded successfully for accounting!");
  };

  // EXPORT PDF (Structured HTML printable sheets template popup)
  const triggerPrintPDF = () => {
    // Generate an absolute styling print wrapper and trigger print!
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Incentive ledger &amp; Reports</h1>
          <p className="mt-1 text-sm text-gray-500 font-medium">Generate operational analyses, inspect commission allocations, and extract documentation sheets.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(!showImport)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition duration-200 cursor-pointer shadow-2xs border border-indigo-100"
          >
            <UploadCloud className="w-4 h-4 text-indigo-500" />
            {showImport ? "Hide Import Suite" : "Import Sales Bookings CSV"}
          </button>
        </div>
      </div>

      {/* Collapsible CSV Import Panel */}
      {showImport && (
        <div className="bg-white border border-indigo-100 rounded-3xl p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-gray-50 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <UploadCloud className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800">Bulk Import Sales Bookings via CSV</h3>
                <p className="text-[11px] text-gray-400 font-semibold">Upload sales logs to automatically trigger chronological commission &amp; bonus recalculations locally.</p>
              </div>
            </div>
            <button
              onClick={() => { setShowImport(false); handleClearImport(); }}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drag & Drop Box */}
          {parsedData.length === 0 ? (
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition flex flex-col items-center justify-center space-y-3 cursor-pointer ${
                dragActive ? 'border-indigo-500 bg-indigo-50/50 shadow-sm' : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50'
              }`}
            >
              <input
                type="file"
                id="sales-csv-upload"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <UploadCloud className="w-10 h-10 text-indigo-400 animate-pulse" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-700">Drag &amp; drop your sales CSV log here</p>
                <p className="text-[11px] text-gray-400">or click to browse your local file system (max. 10MB)</p>
              </div>

              <label
                htmlFor="sales-csv-upload"
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-150 hover:bg-gray-50 text-gray-600 font-semibold rounded-lg text-[11px] cursor-pointer shadow-2xs transition"
              >
                Browse CSV File
              </label>

              {csvError && (
                <div className="mt-2 p-2.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-[11px] flex items-center gap-2 max-w-xl text-left">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{csvError}</span>
                </div>
              )}

              {/* Template download link */}
              <button
                onClick={(e) => { e.stopPropagation(); handleDownloadTemplate(); }}
                className="mt-4 inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-700 font-bold hover:underline"
              >
                <Download className="w-3.5 h-3.5 text-indigo-500" /> Download Standard Sales Booking Template CSV
              </button>
            </div>
          ) : (
            // Preview / Validation Table
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="p-1 px-2.5 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-lg">
                    {parsedData.filter(d => !d._invalid).length} / {parsedData.length} Rows Pass
                  </div>
                  <span className="text-xs text-gray-500 font-semibold">Valid sales booking entries mapped successfully</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleClearImport}
                    className="px-3 py-1.5 bg-white border border-gray-100 hover:bg-gray-50 text-gray-600 font-semibold rounded-lg text-xs transition cursor-pointer"
                  >
                    Clear File
                  </button>
                  <button
                    onClick={handleImportSubmit}
                    disabled={importing || parsedData.filter(d => !d._invalid).length === 0}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    {importing ? (
                      <>
                        <div className="w-3 h-3 rounded-full border border-white border-t-transparent animate-spin inline-block mr-1" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-100" /> Commit &amp; Import Valid Rows
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-gray-100 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-[11px] border-collapse bg-white">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100 font-semibold text-gray-400">
                      <th className="p-2.5 pl-4">Row</th>
                      <th className="p-2.5">Unit Name</th>
                      <th className="p-2.5">Sale Date</th>
                      <th className="p-2.5">Project</th>
                      <th className="p-2.5">Seller Identifiers</th>
                      <th className="p-2.5">Buyer name</th>
                      <th className="p-2.5">Unit Configs</th>
                      <th className="p-2.5 pr-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-600">
                    {parsedData.map((item, idx) => (
                      <tr key={idx} className={`hover:bg-gray-50/50 ${item._invalid ? 'bg-rose-50/15' : ''}`}>
                        <td className="p-2.5 pl-4 text-gray-400 font-mono">#{idx + 1}</td>
                        <td className="p-2.5 font-bold text-gray-800">{item.unit_name || <span className="text-rose-400 italic">None</span>}</td>
                        <td className="p-2.5 font-mono">{item.sale_date || <span className="text-rose-400 italic">None</span>}</td>
                        <td className="p-2.5 font-semibold text-gray-700">{item.project_name || <span className="text-gray-400 italic">(Default)</span>}</td>
                        <td className="p-2.5 font-semibold text-gray-700">
                          {item.employee_id || item.executive_name ? (
                            `${item.employee_id || ''} ${item.executive_name || ''}`.trim()
                          ) : (
                            <span className="text-rose-400 italic">None</span>
                          )}
                        </td>
                        <td className="p-2.5 text-gray-500">{item.buyer_name || '-'}</td>
                        <td className="p-2.5 text-gray-500 font-mono">
                          {item.unit_measure || 'Default'} {item.floor_number ? `(L${item.floor_number})` : ''}
                        </td>
                        <td className="p-2.5 pr-4 text-center">
                          {item._invalid ? (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded-lg border border-rose-100" title={item._reason}>
                              <AlertCircle className="w-3 h-3 text-rose-500" /> Error
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-lg border border-emerald-100">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Valid
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-gray-400 font-semibold flex items-center gap-1 select-none">
                <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> Invalid rows are marked in red and will be skipped automatically on import. Click "Commit &amp; Import" to save.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Reports Directory tabs selectors */}
      <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-2xs space-y-4">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Select Target Report Criteria</span>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'mon-inc', label: "Monthly Incentive Report", icon: Coins, color: 'text-emerald-500 bg-emerald-50' },
            { id: 'mon-sales', label: "Monthly Sales Report", icon: Calendar, color: 'text-indigo-500 bg-indigo-50' },
            { id: 'exec-perf', label: "Executive Performance Report", icon: Trophy, color: 'text-amber-500 bg-amber-50' },
            { id: 'team-perf', label: "Team Performance Report", icon: Users, color: 'text-blue-500 bg-blue-50' },
            { id: 'proj-sales', label: "Project Wise Sales Report", icon: FolderHeart, color: 'text-indigo-500 bg-indigo-50' },
            { id: 'proj-inc', label: "Project Wise Incentive Report", icon: Coins, color: 'text-emerald-500 bg-emerald-50' },
            { id: 'top-seller', label: "Top Seller Report", icon: Trophy, color: 'text-rose-500 bg-rose-50' },
            { id: 'top-earner', label: "Top Earners Report", icon: ArrowUpRight, color: 'text-teal-500 bg-teal-50' },
          ].map(tab => {
            const Icon = tab.icon;
            const isSelected = activeReport === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveReport(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition duration-200 cursor-pointer ${
                  isSelected 
                  ? 'bg-gray-900 border-gray-900 text-white shadow-sm' 
                  : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${tab.color} rounded p-0.5`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Filter bar line */}
      <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-2xs grid sm:grid-cols-4 gap-4 items-center">
        {/* Search */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search keywords..."
            className="bg-transparent w-full focus:outline-none"
          />
        </div>

        {/* Project Selector */}
        <div className="flex items-center gap-2 text-xs font-medium bg-gray-50 border border-gray-100 rounded-xl px-3 py-1 bg-none">
          <div className="text-gray-400 flex items-center justify-center shrink-0">🏠</div>
          <select
            value={selProject}
            onChange={(e) => setSelProject(e.target.value)}
            className="w-full bg-transparent focus:outline-none py-1 cursor-pointer font-semibold text-gray-700"
          >
            <option value="All">All Projects bindings</option>
            {uniqueProjects.map(pName => (
              <option key={pName} value={pName}>{pName}</option>
            ))}
          </select>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 text-xs font-medium bg-gray-50 border border-gray-100 rounded-xl px-3 py-1 bg-none">
          <div className="text-gray-400 flex items-center justify-center shrink-0">📅</div>
          <select
            value={selMonth}
            onChange={(e) => setSelMonth(e.target.value)}
            className="w-full bg-transparent focus:outline-none py-1 cursor-pointer font-semibold text-gray-700"
          >
            <option value="All">All Months list</option>
            {monthsName.map((mName, idx) => (
              <option key={idx} value={String(idx + 1)}>{mName} 2026</option>
            ))}
          </select>
        </div>

        {/* EXPORTERS SUITE */}
        <div className="flex items-center justify-end gap-2 text-xs flex-wrap">
          <button
            onClick={triggerPrintPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-150 dark:border-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/35 text-indigo-700 dark:text-indigo-400 font-bold rounded-xl shadow-2xs hover:shadow-xs transition duration-200 cursor-pointer"
            title="Launch print dialog formatted professionally as audit-ready ledger reports"
          >
            <Printer className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            <span>Print Report</span>
          </button>
          
          <button
            onClick={triggerExcelExport}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-50 dark:bg-slate-800/40 border border-gray-150 dark:border-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-850 text-gray-700 dark:text-slate-350 font-bold rounded-xl transition duration-200 cursor-pointer"
            title="Export filtered database metrics to clean Offline CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-gray-500" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={triggerSalesCSVExport}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition duration-200 cursor-pointer"
            title="Download full database audit table log as CSV spreadsheet"
          >
            <Download className="w-4 h-4 text-emerald-100" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* Ledger report presentation grid sheet - with visual printable CSS rules (screen/print layouts unified!) */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-2">
          <div className="w-9 h-9 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
          <p className="text-xs text-gray-400 font-mono">Running report compilation formulas...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* PREMIUM GLASS-MORPHIC REPORT SUMMARY DECK */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
            {/* Card 1: Sales Summary */}
            <div className="premium-glass-card premium-glass-hover p-5 flex flex-col justify-between min-h-[140px]">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest block mb-1">Volume Summary</span>
                  <h3 className="text-lg font-extrabold text-gray-950 dark:text-white leading-tight">{(totalVolumeBDT / 100000).toFixed(2)} Lakh BDT</h3>
                  <p className="text-[11px] text-gray-500 mt-1 font-semibold">Accumulated from <span className="font-bold text-gray-800 dark:text-slate-200">{totalSalesCount} units</span> sold</p>
                </div>
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-150/40 dark:border-slate-800/50 flex justify-between items-center text-[10px] text-gray-400">
                <span>Avg Unit Ticket</span>
                <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{totalSalesCount > 0 ? (totalVolumeBDT / totalSalesCount).toLocaleString(undefined, {maximumFractionDigits:0}) : 0} BDT</span>
              </div>
            </div>

            {/* Card 2: Commission Ledger */}
            <div className="premium-glass-card premium-glass-hover p-5 flex flex-col justify-between min-h-[140px]">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-widest block mb-1">Total Payouts</span>
                  <h3 className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 leading-tight">{(totalIncentivesBDT / 100000).toFixed(2)} Lakh BDT</h3>
                  <p className="text-[11px] text-gray-500 mt-1 font-semibold">Avg: <span className="font-bold text-gray-800 dark:text-slate-200">{avgIncentiveValue.toLocaleString()} BDT</span> per flat</p>
                </div>
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Coins className="w-5 h-5 animate-pulse" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-150/40 dark:border-slate-800/50 flex justify-between items-center text-[10px] text-gray-400">
                <span>Base Commission Total</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{totalBaseIncentive.toLocaleString()} BDT</span>
              </div>
            </div>

            {/* Card 3: Bonuses Split */}
            <div className="premium-glass-card premium-glass-hover p-5 flex flex-col justify-between min-h-[140px]">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-widest block mb-1">Bonus Distributions</span>
                  <h3 className="text-lg font-extrabold text-blue-600 dark:text-blue-400 leading-tight">{((totalFloorBonus + totalTargetBonus + totalTeamBonus) / 100000).toFixed(2)} Lakh</h3>
                  <div className="text-[10px] text-gray-500 mt-1 flex flex-wrap gap-x-1.5 font-semibold leading-relaxed">
                    <span title="Floor position bonuses spec">Floor: {totalFloorBonus.toLocaleString()}</span>
                    <span>•</span>
                    <span title="Individual quota bonus">Target: {totalTargetBonus.toLocaleString()}</span>
                  </div>
                </div>
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-150/40 dark:border-slate-800/50 flex justify-between items-center text-[10px] text-gray-400">
                <span>Team Manager Bonus</span>
                <span className="font-mono font-bold text-blue-700 dark:text-blue-400">{totalTeamBonus.toLocaleString()} BDT</span>
              </div>
            </div>

            {/* Card 4: Report Insights */}
            <div className="premium-glass-card premium-glass-hover p-5 flex flex-col justify-between min-h-[140px]">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-widest block mb-1">Report Insights</span>
                  <h3 className="text-xs font-bold text-gray-800 dark:text-slate-200 uppercase tracking-tight line-clamp-1">{activeRepObj.title}</h3>
                  <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1 leading-relaxed w-full">
                    {activeReport === 'mon-inc' && "Breaks down base rate commission structure and incremental floor and team payouts."}
                    {activeReport === 'mon-sales' && "Detailed journal containing direct unit configuration values and registered flat booking logs."}
                    {activeReport === 'exec-perf' && "Aggregated commission outputs and volumes grouped by executive user IDs."}
                    {activeReport === 'team-perf' && "Compares entire division achievements against registered monthly sales target quotas."}
                    {activeReport === 'proj-sales' && "Sums exact property sales pipeline values categorized by physical site locations."}
                    {activeReport === 'proj-inc' && "Shows how commission expenses are distributed project-by-project across the city."}
                    {activeReport === 'top-seller' && "Tracks ranking of first-class achievers sorted descending by booking volumes."}
                    {activeReport === 'top-earner' && "Displays high-earning agents who optimized commissions, floor bonuses and quota payouts."}
                  </p>
                </div>
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
                  <Trophy className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-150/40 dark:border-slate-800/50 flex justify-between items-center text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                <span>Status</span>
                <span className="animate-pulse">● System Verified</span>
              </div>
            </div>
          </div>

          {/* HIGHLY-DETAILED SPECIFIC EXPLANATORY INFOGRAPHICS BLOCK */}
          <div className="premium-glass rounded-3xl p-6 border border-gray-150/35 dark:border-slate-800/50 flex flex-col md:flex-row items-center justify-between gap-6 print:hidden">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-extrabold uppercase tracking-wide">
                <span>💡 Specific Analysis Guide</span>
                <span>•</span>
                <span>{activeReport === 'mon-inc' ? "Claims Auditing Math" : activeReport === 'team-perf' ? "Target Fulfillment Math" : "Operation Logic"}</span>
              </div>
              <h4 className="text-sm font-bold text-gray-800 dark:text-slate-200">
                {activeReport === 'mon-inc' && "How is the commission built?"}
                {activeReport === 'mon-sales' && "What does this Sales Journal contain?"}
                {activeReport === 'exec-perf' && "How is an Executive's cumulative yield tracked?"}
                {activeReport === 'team-perf' && "How are Quotas audited?"}
                {activeReport === 'proj-sales' && "What does this Area Performance chart signify?"}
                {activeReport === 'proj-inc' && "Why track project-by-project distributed commissions?"}
                {activeReport === 'top-seller' && "Leaderboard benchmarks and volume thresholds"}
                {activeReport === 'top-earner' && "Who ranks highest in commission optimization?"}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
                {activeReport === 'mon-inc' && "Commission payouts dynamically scale between 1% to 7% based on chronological sales count in that project. Additionally, flats on the 1st floor (+) and Top floors earn flat-rate floor location bonuses. Successful individual quota achievements trigger individual target bonuses, while overall division targets trigger team bonuses."}
                {activeReport === 'mon-sales' && "This log contains all chronological registered flat sales within active development sites. It matches flats with physical parameters, the registered customer purchase date, officer identifiers, and the ultimate land share property evaluation volume."}
                {activeReport === 'exec-perf' && "This monitors performance indicators across our Sales Executives. Handled volume is the sum value of flats sold, while Net Payout represents the finalized cleared payouts incorporating all base calculations, floor bonuses, team target multipliers, and single achievements."}
                {activeReport === 'team-perf' && "This view calculates divisional targets. Completion % represents the division's total registered unit sales divided by their respective monthly quota target. Successful achievement of 100% target guarantees a direct bonus allocation across active staff."}
                {activeReport === 'proj-sales' && "Calculates the booking pipeline, evaluating consumer demand. It illustrates exactly which project site developments produce the highest financial cash flows so our operations division can target appropriate land holdings."}
                {activeReport === 'proj-inc' && "This displays the distribution of developer commissions. Ideal for executive financial teams to ensure total active outlays remain within board-set limits of project revenue margins."}
                {activeReport === 'top-seller' && "Provides real-time visibility into the Top 10 High-Value performers ranked by total BDT volume bookings. Highlighted with premium indicators to track exceptional contributors."}
                {activeReport === 'top-earner' && "Showcases the top 10 earners who maximized active commission rule parameters. This includes optimizing high floor bonuses, individual target bonuses, and participating under highly achieved divisions."}
              </p>
            </div>

            {/* Graphical Stacked Proportion Bar or Visual Multiplier Indicator */}
            <div className="w-full md:w-64 shrink-0 bg-white/50 dark:bg-slate-900/40 p-4 rounded-2xl border border-gray-150/40 dark:border-slate-800 flex flex-col justify-center space-y-3 shadow-3xs">
              <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Interactive Breakdown</span>
              {totalIncentivesBDT > 0 ? (
                <div className="space-y-2.5">
                  <div className="flex justify-between text-[10px] text-gray-500 font-bold">
                    <span>Base Payout</span>
                    <span className="font-mono text-gray-850 dark:text-slate-350">{Math.round((totalBaseIncentive / totalIncentivesBDT) * 100)}%</span>
                  </div>
                  {/* Progress Bar Proportion Stack */}
                  <div className="w-full h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                    <div 
                      className="bg-indigo-500 h-full" 
                      style={{ width: `${(totalBaseIncentive / totalIncentivesBDT) * 100}%` }}
                      title={`Base: ${Math.round((totalBaseIncentive / totalIncentivesBDT) * 100)}%`}
                    />
                    <div 
                      className="bg-amber-400 h-full" 
                      style={{ width: `${(totalFloorBonus / totalIncentivesBDT) * 100}%` }}
                      title={`Floor: ${Math.round((totalFloorBonus / totalIncentivesBDT) * 100)}%`}
                    />
                    <div 
                      className="bg-blue-500 h-full" 
                      style={{ width: `${((totalTargetBonus + totalTeamBonus) / totalIncentivesBDT) * 100}%` }}
                      title={`Bonuses: ${Math.round(((totalTargetBonus + totalTeamBonus) / totalIncentivesBDT) * 100)}%`}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[9px] text-gray-400 font-bold justify-between pt-1">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-50" />
                      <span className="text-indigo-650">Base</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span className="text-amber-600">Floor</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-50" />
                      <span className="text-blue-600">Bonus</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-[11px] text-gray-400 italic">
                  No active payouts computed yet to graph.
                </div>
              )}
            </div>
          </div>

          <div id="print-area" className="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs space-y-5 print:border-none print:shadow-none">
          {/* Print Letterhead block (visible under print only) */}
          <div className="hidden print:block border-b-2 border-gray-800 pb-5 mb-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-gray-900 uppercase">TPHL Real Estate Developers Ltd.</h1>
                <p className="text-xs text-gray-500 font-semibold font-mono">Central Financial Auditing Division</p>
                <p className="text-[10px] text-gray-400">Dhaka, Bangladesh | auditing@tphl-group.com</p>
              </div>
              <div className="text-right text-[10px] text-gray-400 font-mono">
                <div>Document ID: TPHL-REP-{Math.floor(1000 + Math.random()*9000)}</div>
                <div>Generated: {new Date().toLocaleDateString()}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-gray-50 pb-3">
            <div>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">System Generated Spreadsheet</span>
              <h2 className="text-md font-bold text-gray-900 leading-tight">{activeRepObj.title}</h2>
            </div>
            <div className="text-right text-[10px] text-gray-400 font-mono">
              Filtered database records: <span className="font-bold text-indigo-600">{activeRepObj.rows.length} rows</span>
            </div>
          </div>

          {/* Table display */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100/50 border-b border-gray-100 font-bold text-gray-500 uppercase tracking-wider">
                  {activeRepObj.headers.map((h, i) => (
                    <th key={i} className={`p-3.5 ${i === activeRepObj.headers.length - 1 ? 'text-right' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700 font-medium font-sans">
                {activeRepObj.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-gray-50/50 transition">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className={`p-3.5 ${cIdx === row.length - 1 ? 'text-right font-bold text-gray-950 font-mono' : ''}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
                {activeRepObj.rows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-10 text-gray-400 text-xs italic">
                      No records exist matching selected filter bounds.
                    </td>
                  </tr>
                )}
              </tbody>
              {/* Sums summary line */}
              {activeRepObj.rows.length > 0 && (
                <tfoot className="bg-gray-100/30 border-t-2 border-gray-100">
                  <tr className="font-bold text-gray-950 font-mono">
                    {activeRepObj.sums.map((sumCell, idx) => (
                      <td key={idx} className={`p-4 ${idx === activeRepObj.sums.length - 1 ? 'text-right text-emerald-800 text-sm font-black' : ''}`}>
                        {sumCell}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Print bottom sign-off seals block */}
          <div className="hidden print:block pt-20">
            <div className="grid grid-cols-3 gap-10 text-xs font-semibold text-center text-gray-400 font-mono">
              <div className="border-t border-gray-200 pt-2">Prepared By Auditor</div>
              <div className="border-t border-gray-200 pt-2">Division Manager Seal</div>
              <div className="border-t border-gray-200 pt-2">Managing Director Approved</div>
            </div>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
