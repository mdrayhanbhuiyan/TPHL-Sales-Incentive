/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  ShieldAlert, 
  Download, 
  Upload, 
  Activity, 
  CheckCircle, 
  Trash2, 
  RefreshCw,
  Bell,
  HelpCircle,
  Database,
  Cloud,
  CloudUpload,
  CloudDownload,
  Link2,
  LogOut,
  FolderOpen,
  Search,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';
import { useToast } from './Toast';
import {
  loginToGoogleDrive,
  logoutFromGoogleDrive,
  getCachedGoogleUser,
  listGoogleDriveBackups,
  uploadGoogleDriveBackup,
  downloadGoogleDriveBackup,
  GoogleDriveUser
} from '../lib/googleDrive';

interface SettingsProps {
  authToken: string;
  userRole: string;
}

export default function SettingsView({ authToken, userRole }: SettingsProps) {
  const { toast } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [notifList, setNotifList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Google Drive client integration states
  const [gUser, setGUser] = useState<GoogleDriveUser | null>(getCachedGoogleUser());
  const [gDriveFiles, setGDriveFiles] = useState<any[]>([]);
  const [gLoading, setGLoading] = useState<boolean>(false);
  const [gShowAllJson, setGShowAllJson] = useState<boolean>(false);
  const [gSearchName, setGSearchName] = useState<string>('');

  // Local JSON Database Import interactive states
  const [localFileParsed, setLocalFileParsed] = useState<any | null>(null);
  const [localFileName, setLocalFileName] = useState<string>('');
  const [localFileStats, setLocalFileStats] = useState<{
    projects?: number;
    executives?: number;
    teams?: number;
    sales?: number;
    incentives?: number;
    logs?: number;
  } | null>(null);
  const [localFileError, setLocalFileError] = useState<string | null>(null);
  const [localImportLoading, setLocalImportLoading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Local CSV Database Import/Export interactive states
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [csvFileContent, setCsvFileContent] = useState<string>('');
  const [csvFileStats, setCsvFileStats] = useState<{ [key: string]: number } | null>(null);
  const [csvFileError, setCsvFileError] = useState<string | null>(null);
  const [csvImportLoading, setCsvImportLoading] = useState<boolean>(false);
  const [csvIsDragging, setCsvIsDragging] = useState<boolean>(false);

  // Individual Table manual CSV backup & restore states
  const [selectedTable, setSelectedTable] = useState<string>('sales');
  const [indCsvFileName, setIndCsvFileName] = useState<string>('');
  const [indCsvContent, setIndCsvContent] = useState<string>('');
  const [indCsvError, setIndCsvError] = useState<string | null>(null);
  const [indCsvLoading, setIndCsvLoading] = useState<boolean>(false);
  const [indCsvIsDragging, setIndCsvIsDragging] = useState<boolean>(false);
  const [indCsvStatsRows, setIndCsvStatsRows] = useState<number | null>(null);
  const [indCsvHeaders, setIndCsvHeaders] = useState<string[]>([]);

  // Custom confirmation modal state to prevent INP blocking
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    onConfirm: () => {}
  });

  // Live Firebase/Firestore Connection Diagnostics states
  const [diagResults, setDiagResults] = useState<any | null>(null);
  const [diagLoading, setDiagLoading] = useState<boolean>(false);
  const [diagError, setDiagError] = useState<string | null>(null);

  // Database Integrity Check states
  const [integrityReport, setIntegrityReport] = useState<any | null>(null);
  const [integrityLoading, setIntegrityLoading] = useState<boolean>(false);
  const [integrityError, setIntegrityError] = useState<string | null>(null);

  const runIntegrityCheck = async () => {
    setIntegrityLoading(true);
    setIntegrityError(null);
    try {
      const res = await fetch('/api/system/integrity-report', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (!res.ok) {
        throw new Error(await res.text() || "Failed to compile collection integrity analysis.");
      }
      const data = await res.json();
      setIntegrityReport(data);
      toast.success("Database integrity report completed!");
    } catch (err: any) {
      console.error(err);
      setIntegrityError(err.message || "An unexpected error occurred during database integrity report.");
      toast.error("Integrity check failed.");
    } finally {
      setIntegrityLoading(false);
    }
  };

  const runDiagnostics = async () => {
    setDiagLoading(true);
    setDiagError(null);
    try {
      const res = await fetch('/api/system/firebase-diagnostics', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (!res.ok) {
        throw new Error(await res.text() || "Failed to query server connection diagnostics.");
      }
      const data = await res.json();
      setDiagResults(data);
      toast.success("Firebase diagnostics completed successfully!");
    } catch (err: any) {
      console.error(err);
      setDiagError(err.message || "An unexpected error occurred during database health check.");
      toast.error("Diagnostics check failed.");
    } finally {
      setDiagLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (userRole === 'Admin') {
        const lRes = await fetch('/api/system/logs', {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const lData = await lRes.json();
        setLogs(lData);
      }

      const nRes = await fetch('/api/system/notifications', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const nData = await nRes.json();
      setNotifList(nData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGDriveFiles = async (showAll = gShowAllJson, search = gSearchName) => {
    try {
      const files = await listGoogleDriveBackups(showAll, search);
      setGDriveFiles(files);
    } catch (err: any) {
      console.error("[SettingsView] Failed to list GDrive files:", err);
    }
  };

  useEffect(() => {
    fetchData();
    if (getCachedGoogleUser()) {
      fetchGDriveFiles(gShowAllJson, gSearchName);
    }
  }, [authToken, gShowAllJson]);

  const handleGDriveLogin = async () => {
    setGLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const u = await loginToGoogleDrive();
      setGUser(u);
      toast.success("Successfully authenticated with Google Drive!");
      setTimeout(async () => {
        try {
          const files = await listGoogleDriveBackups(gShowAllJson, gSearchName);
          setGDriveFiles(files);
        } catch (e) {
          console.error(e);
        }
      }, 800);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.message?.includes('popup-closed-by-user')) {
        toast.error("Sign-in cancelled: The Google sign-in window was closed before completing.");
      } else {
        toast.error("Google Drive connection failed: " + err.message);
      }
    } finally {
      setGLoading(false);
    }
  };

  const handleGDriveLogout = async () => {
    setGLoading(true);
    try {
      await logoutFromGoogleDrive();
      setGUser(null);
      setGDriveFiles([]);
      toast.success("Disconnected from Google Drive.");
    } catch (err: any) {
      toast.error("Logout failed.");
    } finally {
      setGLoading(false);
    }
  };

  const handleBackupToGDrive = async () => {
    setError(null);
    setSuccess(null);
    setGLoading(true);
    try {
      const res = await fetch('/api/system/backup', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error("Failed to export current system database dump");
      const data = await res.json();

      const result = await uploadGoogleDriveBackup(data);
      setSuccess(`Successfully backed up project data to Google Drive! File created: ${result.name}`);
      toast.success("Backup uploaded to Google Drive!");
      
      await fetchGDriveFiles(gShowAllJson, gSearchName);
    } catch (err: any) {
      console.error(err);
      setError("Google Drive backup failed: " + err.message);
      toast.error("Failed to upload backup to Google Drive.");
    } finally {
      setGLoading(false);
    }
  };

  const handleUploadLocalFileToGDrive = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setGLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        
        // Basic schema validation
        if (!parsed.users || !parsed.projects) {
          throw new Error("Invalid TPHL master backup format: missing core collections structure.");
        }

        const result = await uploadGoogleDriveBackup(parsed, file.name);
        setSuccess(`Successfully uploaded local backup file "${file.name}" direct to Google Drive!`);
        toast.success("File uploaded to Google Drive successfully!");
        fetchGDriveFiles(gShowAllJson, gSearchName);
      } catch (err: any) {
        console.error(err);
        setError("Failed to upload local backup to Google Drive: " + err.message);
        toast.dark ? toast.error("Upload to Google Drive failed.") : toast.error("Invalid file schema or connection failed.");
      } finally {
        setGLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const handleRestoreFromGDrive = (fileId: string, fileName: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Restore Backup Confirmation",
      message: `Are you sure you want to restore the backup "${fileName}"? This will COMPLETELY overwrite all active platform database records, remap entity IDs, and run dynamic incentive rate calculations. This operation is irreversible.`,
      confirmText: "Yes, Restore Backup",
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setError(null);
        setSuccess(null);
        setGLoading(true);
        try {
          const backupContent = await downloadGoogleDriveBackup(fileId);

          const res = await fetch('/api/system/restore', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(backupContent)
          });

          if (!res.ok) {
            let errorMsg = "Server restore transaction failed";
            try {
              const errData = await res.json();
              errorMsg = errData.error || errorMsg;
            } catch (e) {
              try {
                const txt = await res.text();
                if (txt) errorMsg = txt.slice(0, 150);
              } catch (_) {}
            }
            throw new Error(errorMsg);
          }

          setSuccess(`Successfully loaded backup "${fileName}" from Google Drive! Reloading system catalogs...`);
          toast.success("Google Drive backup restored successfully!");
          fetchData();
          setTimeout(() => window.location.reload(), 1500);
        } catch (err: any) {
          console.error(err);
          setError("Failed to restore backup from Google Drive: " + err.message);
          toast.error("Failed to restore Google Drive backup.");
        } finally {
          setGLoading(false);
        }
      }
    });
  };

  const handleBackup = async () => {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/system/backup', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tphl_incentive_master_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setSuccess("Database master backup JSON serialized and downloaded successfully.");
    } catch (err: any) {
      setError("Backup serialization failed.");
    }
  };

  const handleFirestoreBackup = async () => {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/system/firestore-backup', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (!res.ok) {
        throw new Error(await res.text() || "Failed to download live state");
      }
      const data = await res.json();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tphl_firestore_live_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setSuccess("Live Firestore database backup serialized and downloaded cleanly from cloud collections.");
      toast.success("Live Firestore backup downloaded successfully!");
    } catch (err: any) {
      console.error(err);
      setError("Cloud Firestore raw export compilation failed: " + err.message);
      toast.error("Failed to compile direct Firestore backup.");
    }
  };

  const parseAndValidateJSON = (jsonText: string, filename: string) => {
    setLocalFileError(null);
    setLocalFileParsed(null);
    setLocalFileStats(null);
    setLocalFileName(filename);
    try {
      const parsed = JSON.parse(jsonText);
      
      // Robust structural verification checking for valid key signatures
      const knownKeys = ['users', 'projects', 'salesTeams', 'teamProjects', 'salesExecutives', 'incentiveRules', 'bonusRules', 'sales', 'salesIncentives', 'auditLogs', 'notifications', 'projectsOnSale', 'unitRegistrations'];
      const hasKnownKeys = knownKeys.some(key => parsed && (parsed as any)[key] !== undefined);
      if (!hasKnownKeys) {
        throw new Error("Invalid TPHL Master Backup! The file does not contain any recognizable database tables.");
      }

      // Auto-initialize empty properties defensively
      if (!Array.isArray(parsed.projects)) parsed.projects = [];
      if (!Array.isArray(parsed.salesExecutives)) parsed.salesExecutives = [];
      if (!Array.isArray(parsed.salesTeams)) parsed.salesTeams = [];

      const projectsCount = Array.isArray(parsed.projects) ? parsed.projects.length : 0;
      const executivesCount = Array.isArray(parsed.salesExecutives) ? parsed.salesExecutives.length : 0;
      const teamsCount = Array.isArray(parsed.salesTeams) ? parsed.salesTeams.length : 0;
      const salesCount = Array.isArray(parsed.sales) ? parsed.sales.length : 0;
      const incentivesCount = Array.isArray(parsed.salesIncentives) ? parsed.salesIncentives.length : 0;
      const logsCount = Array.isArray(parsed.auditLogs) ? parsed.auditLogs.length : 0;

      setLocalFileParsed(parsed);
      setLocalFileStats({
        projects: projectsCount,
        executives: executivesCount,
        teams: teamsCount,
        sales: salesCount,
        incentives: incentivesCount,
        logs: logsCount
      });
      toast.success("Validation Successful! Local JSON file ready to import.");
    } catch (err: any) {
      console.error(err);
      setLocalFileError(err.message || "Invalid backup schema or corrupted JSON file structure.");
      toast.error("Incorrect file structure.");
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);
    setSuccess(null);
    setLocalFileError(null);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setLocalFileError("Unsupported file type. Only valid JSON (.json) database files are permitted for import.");
      toast.error("Unsupported file format.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string || '';
      parseAndValidateJSON(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    setLocalFileError(null);

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string || '';
      parseAndValidateJSON(text, file.name);
    };
    reader.readAsText(file);
  };

  const executeLocalImportTransformation = () => {
    if (!localFileParsed) {
      toast.error("No valid dataset loaded.");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Incorporate Database Snapshot",
      message: `CRITICAL CONFIRMATION: Are you sure you want to restore the local database backup file "${localFileName}"? This will COMPLETELY overwrite all active portal database records, wipe corresponding catalog references, and load new calculation matrices. This cannot be undone.`,
      confirmText: "Yes, Inject Database",
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setError(null);
        setSuccess(null);
        setLocalImportLoading(true);
        try {
          const res = await fetch('/api/system/restore', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(localFileParsed)
          });

          if (!res.ok) {
            let errorMsg = "Server restore transaction failed";
            try {
              const errData = await res.json();
              errorMsg = errData.error || errorMsg;
            } catch (e) {
              try {
                const txt = await res.text();
                if (txt) errorMsg = txt.slice(0, 150);
              } catch (_) {}
            }
            throw new Error(errorMsg);
          }

          setSuccess(`Direct JSON database import of "${localFileName}" completed successfully! Reloading configuration catalogs...`);
          toast.success("Database master recovery successfully loaded!");
          
          // Clear loaded local preview
          setLocalFileParsed(null);
          setLocalFileName('');
          setLocalFileStats(null);

          fetchData();
          setTimeout(() => window.location.reload(), 1500);
        } catch (err: any) {
          console.error(err);
          setError("Import transaction failed: " + err.message);
          toast.error("Import failed.");
        } finally {
          setLocalImportLoading(false);
        }
      }
    });
  };

  const cancelLocalBackupImport = () => {
    setLocalFileParsed(null);
    setLocalFileName('');
    setLocalFileStats(null);
    setLocalFileError(null);
    toast.success("Import setup cleared.");
  };

  // CSV Backup Snapshot helper validations/parsing
  const parseAndValidateCSV = (text: string, filename: string) => {
    setCsvFileError(null);
    setCsvFileStats(null);
    setCsvFileContent('');

    try {
      if (!text || text.trim() === '') {
        throw new Error("Uploaded CSV file is empty.");
      }

      const parts = text.split(/#\s*TABLE:\s*/i);
      const tablesFound: { [key: string]: number } = {};

      if (parts.length <= 1) {
        throw new Error("Invalid CSV format! No tables detected. Make sure the file was exported using the platform's CSV export feature.");
      }

      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        const lines = part.split(/\r?\n/);
        if (lines.length === 0) continue;

        const tableName = lines[0].trim();
        if (!tableName) continue;

        let rowCount = 0;
        let accumulator = '';
        let inQuotes = false;

        // Count logical lines (accumulate multi-line strings due to quotes)
        for (let j = 2; j < lines.length; j++) {
          const line = lines[j];
          if (!line.trim() && !accumulator) continue;

          for (const c of line) {
            if (c === '"') inQuotes = !inQuotes;
          }

          if (inQuotes) continue;
          rowCount++;
        }

        tablesFound[tableName] = rowCount;
      }

      const expectedTables = [
        'users', 'projects', 'salesTeams', 'teamProjects', 'salesExecutives', 
        'incentiveRules', 'sales', 'salesIncentives', 'auditLogs', 
        'notifications', 'projectsOnSale', 'unitRegistrations', 'bonusRules'
      ];

      const foundKnownTables = Object.keys(tablesFound).filter(t => expectedTables.includes(t));

      if (foundKnownTables.length === 0) {
        throw new Error("Validation failed! The file does not contain any known database tables (e.g., 'projects', 'users', 'sales'). Please verify it is a valid TPHL CSV database backup.");
      }

      setCsvFileName(filename);
      setCsvFileContent(text);
      setCsvFileStats(tablesFound);
      toast.success("CSV Backup Snapshot validated successfully!");
    } catch (err: any) {
      setCsvFileError(err.message || "Failed to parse CSV database snapshot.");
      toast.error(err.message || "Incorrect CSV schema.");
    }
  };

  const handleExportCSVBackup = async () => {
    try {
      toast.info("Compiling system CSV backup tables...");
      const res = await fetch('/api/system/backup-csv', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (!res.ok) throw new Error("Failed to export database in CSV snapshot.");
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `tphl_database_snapshot_csv_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Consolidated database tables exported and downloaded in CSV format!");
    } catch (err: any) {
      toast.error(err.message || "Failed to download database CSV snapshot.");
    }
  };

  const executeLocalCSVImport = () => {
    if (!csvFileContent) {
      toast.error("No valid CSV content loaded.");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Incorporate CSV Database Snapshot",
      message: `CRITICAL ACTION: Are you sure you want to restore the local database from CSV snapshot backup "${csvFileName}"? This will COMPLETELY overwrite all active portal database tables, wipe current catalog records, reload configuration profiles, and recalculate commission cascades chronologically. This cannot be undone.`,
      confirmText: "Yes, Inject tables from CSV",
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setCsvImportLoading(true);
        try {
          const res = await fetch('/api/system/restore-csv', {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain',
              'Authorization': `Bearer ${authToken}`
            },
            body: csvFileContent
          });

          let data: any = {};
          try {
            const textResponse = await res.text();
            try {
              data = JSON.parse(textResponse);
            } catch {
              data = { error: textResponse || `HTTP Error ${res.status}` };
            }
          } catch {
            data = { error: `Network/Server Communication Failure (Status ${res.status})` };
          }

          if (!res.ok) throw new Error(data.error || "Server CSV restore transaction failed.");

          toast.success("Database restored successfully from CSV tables snapshot!");
          setSuccess("Overwrote all records and recalculated entire database successfully from CSV tables backup!");
          
          setCsvFile(null);
          setCsvFileName('');
          setCsvFileContent('');
          setCsvFileStats(null);
          
          fetchData();
          setTimeout(() => window.location.reload(), 1500);
        } catch (err: any) {
          toast.error(err.message || "Failed to import database from CSV.");
          setCsvFileError(err.message || "Import failed.");
        } finally {
          setCsvImportLoading(false);
        }
      }
    });
  };

  const cancelCSVBackupImport = () => {
    setCsvFile(null);
    setCsvFileName('');
    setCsvFileContent('');
    setCsvFileStats(null);
    setCsvFileError(null);
    toast.success("CSV Import setup cleared.");
  };

  // Individual Table manual CSV Helper Functions
  const handleDownloadTableCSV = async () => {
    try {
      toast.info(`Generating Excel/CSV export for table '${selectedTable}'...`);
      const url = `/api/system/backup-table-csv?table=${selectedTable}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (!res.ok) throw new Error("Failed to export individual table in CSV format.");
      
      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", downloadUrl);
      link.setAttribute("download", `tphl_table_${selectedTable}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Standard CSV table compiled and downloaded for '${selectedTable}'!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to download individual table CSV.");
    }
  };

  const parseAndValidateIndCSV = (text: string, filename: string) => {
    setIndCsvError(null);
    setIndCsvContent('');
    setIndCsvStatsRows(null);
    setIndCsvHeaders([]);
    setIndCsvFileName(filename);

    try {
      if (!text || text.trim() === '') {
        throw new Error("Uploaded CSV file is empty.");
      }

      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) {
        throw new Error("Invalid CSV format! No rows detected.");
      }

      // Check first line columns
      const firstLine = lines[0];
      const headers = firstLine.split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
      if (headers.length === 0 || headers.some(h => !h)) {
        throw new Error("Invalid CSV headers detected. Ensure column names are in the first row.");
      }

      setIndCsvHeaders(headers);
      setIndCsvStatsRows(lines.length - 1);
      setIndCsvContent(text);
      toast.success(`Validated raw table CSV file '${filename}' successfully!`);
    } catch (err: any) {
      setIndCsvError(err.message || "Failed to parse CSV file.");
      toast.error(err.message || "Incorrect CSV schema.");
    }
  };

  const handleIndCSVDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIndCsvIsDragging(false);
    setIndCsvError(null);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setIndCsvError("Unsupported document type. Only files ending with .csv are permitted.");
      toast.error("Unsupported file format.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string || '';
      parseAndValidateIndCSV(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleIndCSVFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIndCsvError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string || '';
      parseAndValidateIndCSV(text, file.name);
    };
    reader.readAsText(file);
  };

  const executeIndCSVRestore = () => {
    if (!indCsvContent) {
      toast.error("No valid CSV content loaded.");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: `Overwrite database table: '${selectedTable}'`,
      message: `CRITICAL ACTION: Are you sure you want to completely overwrite table '${selectedTable}' with the contents of "${indCsvFileName}"? This operation is irreversible, will wipe current rows inside this collection, and automatically trigger commission cascade recalculations state-wide in-memory.`,
      confirmText: "Yes, Overwrite & Recalculate Table",
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setIndCsvLoading(true);
        try {
          const res = await fetch(`/api/system/restore-table-csv?table=${selectedTable}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain',
              'Authorization': `Bearer ${authToken}`
            },
            body: indCsvContent
          });

          let data: any = {};
          try {
            const textResponse = await res.text();
            try {
              data = JSON.parse(textResponse);
            } catch {
              data = { error: textResponse || `HTTP Error ${res.status}` };
            }
          } catch {
            data = { error: `Network/Server Communication Failure (Status ${res.status})` };
          }

          if (!res.ok) throw new Error(data.error || `Server Table RESTORE failed.`);

          toast.success(`Successfully restored database table '${selectedTable}'!`);
          setSuccess(`Wiped and restored table '${selectedTable}' with ${data.count} rows and ran full commission recalculation successfully!`);
          
          setIndCsvFileName('');
          setIndCsvContent('');
          setIndCsvStatsRows(null);
          setIndCsvHeaders([]);
          
          fetchData();
          setTimeout(() => window.location.reload(), 1500);
        } catch (err: any) {
          toast.error(err.message || "Failed to import table CSV.");
          setIndCsvError(err.message || "Import failed.");
        } finally {
          setIndCsvLoading(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const cancelIndCSVRestore = () => {
    setIndCsvFileName('');
    setIndCsvContent('');
    setIndCsvStatsRows(null);
    setIndCsvHeaders([]);
    setIndCsvError(null);
    toast.success("Manual single-table import canceled.");
  };

  const handleCSVDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setCsvIsDragging(false);
    setCsvFileError(null);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setCsvFileError("Unsupported file type. Only valid CSV backup (.csv) files are permitted.");
      toast.error("Unsupported file format.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string || '';
      parseAndValidateCSV(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleCSVFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCsvFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string || '';
      parseAndValidateCSV(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleClearNotif = async () => {
    try {
      await fetch('/api/system/notifications/clear', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      setSuccess("Notifications marked read.");
      toast.success("All system notifications marked as read.");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to clear notifications.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">System Settings &amp; Maintenance</h1>
          <p className="mt-1 text-sm text-gray-500 font-medium">Coordinate database backup snapshots, upload state records, and overview security audit tracks.</p>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl text-xs font-semibold text-emerald-800">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-100 p-3.5 rounded-xl text-xs font-semibold text-rose-800">
          <ShieldAlert className="w-4.5 h-4.5 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Ephemeral Local Storage Warning Box */}
      <div className="bg-amber-50 border border-amber-200/60 rounded-3xl p-6 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-amber-800">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 animate-pulse" />
          <h3 className="text-sm font-bold">Vercel Deployment &amp; Ephemeral Local Filesystem Warning</h3>
        </div>
        <p className="text-xs text-amber-700 leading-relaxed font-medium">
          Because <strong>Vercel</strong> operates on an ephemeral, serverless container architecture, any backend database files stored in the container directory (e.g., <code>db-store.json</code>) will be reset when active instances recycle or spin down.
          To solve this and ensure complete persistence for Vercel, please connect your <strong>Google Drive Cloud Synchronisation</strong> panel below to back up and restore database snapshots dynamically on-demand!
        </p>
      </div>

      {/* Google Drive Cloud Synchronisation Section */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-100 pb-5">
          <div className="flex items-center gap-3">
            <Cloud className="w-6 h-6 text-indigo-600 shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-gray-800">Google Drive Cloud Synchronisation &amp; Database Importer</h2>
              <p className="text-[11px] text-gray-500">Persist, backup, or retrieve complete portal database states dynamically on serverless platforms.</p>
            </div>
          </div>
          
          <div>
            {gUser ? (
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-150 rounded-2xl px-3.5 py-1.5 text-xs">
                {gUser.photoURL && (
                  <img src={gUser.photoURL} alt="Google Profile" referrerPolicy="no-referrer" className="w-6 h-6 rounded-full border border-gray-200" />
                )}
                <div className="text-left leading-tight">
                  <p className="font-semibold text-gray-700 text-[11px]">{gUser.displayName || 'Authorized User'}</p>
                  <p className="text-[9px] text-gray-400 font-mono">{gUser.email}</p>
                </div>
                <button
                  onClick={handleGDriveLogout}
                  disabled={gLoading}
                  className="ml-2 hover:bg-rose-50 p-1.5 rounded-lg text-rose-500 transition cursor-pointer"
                  title="Sign Out of Google Drive"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleGDriveLogin}
                disabled={gLoading}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
              >
                <Link2 className="w-4 h-4" />
                Connect to Google Drive
              </button>
            )}
          </div>
        </div>

        {userRole === 'Admin' ? (
          <div className="grid md:grid-cols-12 gap-6">
            <div className="md:col-span-5 space-y-4">
              <h3 className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">Interactive Cloud Actions</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Connect your Google Drive accounts securely using Google OAuth to directly write master snapshots to your personal cloud files. Backups are stored as private JSON records and can be retrieved instantly.
              </p>

              <div className="space-y-2.5">
                <button
                  onClick={handleBackupToGDrive}
                  disabled={gLoading || !gUser}
                  className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-xs font-semibold py-3 rounded-xl shadow-xs transition cursor-pointer"
                >
                  <CloudUpload className="w-4.5 h-4.5" />
                  Save Active State to Google Drive
                </button>

                {gUser && (
                  <label className="flex items-center justify-center gap-2 w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 text-gray-700 text-xs font-semibold py-3 rounded-xl shadow-3xs transition cursor-pointer text-center select-none">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleUploadLocalFileToGDrive}
                      className="hidden"
                      disabled={gLoading}
                    />
                    <Upload className="w-4 h-4 text-gray-500" />
                    Upload Local File to Google Drive
                  </label>
                )}
              </div>
            </div>

            <div className="md:col-span-7 bg-gray-50/50 border border-gray-100 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <div className="flex items-center gap-2 text-gray-700">
                  <FolderOpen className="w-4 h-4 text-indigo-500" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Scan &amp; Import from Google Drive</span>
                </div>
              </div>

              {gUser && (
                <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={gSearchName}
                      onChange={(e) => setGSearchName(e.target.value)}
                      placeholder="Search file name..."
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 focus:border-indigo-400 rounded-xl text-xs outline-hidden transition"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={gShowAllJson ? 'all' : 'portal'}
                      onChange={(e) => setGShowAllJson(e.target.value === 'all')}
                      className="bg-white border border-gray-200 text-xs rounded-xl px-2.5 py-1.5 focus:border-indigo-400 outline-hidden transition"
                    >
                      <option value="portal">Portal Backups Only</option>
                      <option value="all">All JSON Files</option>
                    </select>
                    <button
                      onClick={() => fetchGDriveFiles(gShowAllJson, gSearchName)}
                      disabled={gLoading}
                      className="bg-gray-800 hover:bg-gray-950 text-white text-xs font-semibold px-4 py-1.5 rounded-xl transition cursor-pointer"
                    >
                      Apply Filter
                    </button>
                  </div>
                </div>
              )}

              {!gUser ? (
                <div className="py-12 text-center text-xs text-gray-400 italic">
                  Please connect Google Drive to scan and import database backup files.
                </div>
              ) : gDriveFiles.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-400 italic">
                  No matching JSON backup files found in connected Google Drive. Click "Upload Local File" or "Save Active State" to create one.
                </div>
              ) : (
                <div className="max-h-44 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {gDriveFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-3 hover:border-indigo-150 transition shadow-3xs">
                      <div className="leading-tight flex-1 min-w-0 pr-3">
                        <p className="text-[11px] font-bold text-gray-700 break-all">{file.name}</p>
                        <p className="text-[9px] text-gray-400 font-mono mt-0.5">
                          Created: {new Date(file.createdTime).toLocaleString()} &bull; Size: {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'N/A'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRestoreFromGDrive(file.id, file.name)}
                        disabled={gLoading}
                        className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-700 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-emerald-100 cursor-pointer transition shrink-0"
                      >
                        <CloudDownload className="w-3.5 h-3.5" />
                        Import &amp; Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-amber-600 italic">🔒 Protected to platform Administrators only</p>
        )}
      </div>

      {/* Firebase & Firestore Connection Diagnostics Panel */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-100 pb-5">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-indigo-600 shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-gray-800 font-sans tracking-tight">Firebase &amp; Firestore Connection Diagnostics</h2>
              <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                Analyze live cloud database communication metrics and detect environment key mismatches or unauthorized domain blocks.
              </p>
            </div>
          </div>
          {userRole === 'Admin' ? (
            <button
              onClick={runDiagnostics}
              disabled={diagLoading}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${diagLoading ? 'animate-spin' : ''}`} />
              {diagLoading ? "Diagnosing..." : "Run Connectivity Check"}
            </button>
          ) : (
            <p className="text-xs text-amber-600 italic">🔒 Protected to platform Administrators only</p>
          )}
        </div>

        {diagError && (
          <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl text-xs font-semibold text-rose-800 flex items-start gap-2">
            <ShieldAlert className="w-4.5 h-4.5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Diagnostics Execution Failure</p>
              <p className="font-normal mt-0.5 text-rose-700">{diagError}</p>
            </div>
          </div>
        )}

        {diagResults ? (
          <div className="space-y-6">
            {/* Live Read Result */}
            <div className="p-4 rounded-2xl border border-gray-100/80 bg-gray-50/30">
              <h3 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Cloud Connectivity Result</h3>
              <div className="flex items-start gap-3">
                {diagResults.connectionTest.status === 'success' ? (
                  <div className="p-2 bg-emerald-50 rounded-xl shrink-0">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                ) : (
                  <div className="p-2 bg-rose-50 rounded-xl shrink-0">
                    <ShieldAlert className="w-6 h-6 text-rose-600" />
                  </div>
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                      diagResults.connectionTest.status === 'success' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {diagResults.connectionTest.status}
                    </span>
                    <span className="text-[11px] text-gray-400 font-mono">Query: read sales_portal_data/projects</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-800">
                    {diagResults.connectionTest.status === 'success' 
                      ? diagResults.connectionTest.message 
                      : `Query failed: ${diagResults.connectionTest.error}`}
                  </p>
                  {diagResults.connectionTest.status !== 'success' && (
                    <div className="mt-2 text-[10px] text-gray-500 font-medium leading-relaxed max-w-2xl bg-white border border-gray-100 rounded-xl p-3">
                      <div>
                        <strong className="text-rose-700">💡 Troubleshooting raw query failure:</strong> Ensure that your security rules are correctly deployed and allow reads from this path, your database region is matching, and network/service configuration holds no active blocks.
                      </div>
                      {diagResults.connectionTest.recommendation && (
                        <div className="mt-2 text-[10px] text-indigo-700 font-bold bg-indigo-50/50 border-t border-indigo-100/50 pt-2 flex items-center gap-1.5 selection:bg-indigo-100">
                          <span>👉</span> <span>{diagResults.connectionTest.recommendation}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Config & Environment Mappings */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Configuration Status Info */}
              <div className="space-y-3.5 border border-gray-100 rounded-2xl p-4.5 bg-white shadow-3xs">
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider text-left">Server Firebase Configurations</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium">Config File Path (Local)</span>
                    <span className={`font-semibold px-2 py-0.5 rounded-sm ${
                      diagResults.firebaseConfigPathExists ? 'bg-emerald-50 text-emerald-700 text-[10px]' : 'bg-rose-50 text-rose-700 text-[10px]'
                    }`}>
                      {diagResults.firebaseConfigPathExists ? 'Detected on system' : 'Missing'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium">Config Loaded Source</span>
                    <span className="font-mono text-gray-700 bg-gray-50 px-2 py-0.5 rounded-sm text-[10px]">
                      {diagResults.loadedFrom}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium">Project ID</span>
                    <span className="font-mono text-gray-700 bg-gray-50 px-2 py-0.5 rounded-sm text-[10px] truncate max-w-44" title={diagResults.projectId}>
                      {diagResults.projectId || 'N/A'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium">Firestore Database ID</span>
                    <span className="font-mono text-indigo-700 bg-indigo-50/50 px-2 py-0.5 rounded-sm text-[10px] truncate max-w-44" title={diagResults.firestoreDatabaseId}>
                      {diagResults.firestoreDatabaseId || 'N/A'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium">Authentication Domain</span>
                    <span className="font-mono text-gray-700 bg-gray-50 px-2 py-0.5 rounded-sm text-[10px] truncate max-w-44" title={diagResults.authDomain}>
                      {diagResults.authDomain || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vercel Environment variables Mapping */}
              <div className="space-y-3.5 border border-gray-100 rounded-2xl p-4.5 bg-white shadow-3xs">
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider text-left">Vercel Environment Keys Mapped</h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
                  {Object.entries(diagResults.envVars).map(([key, isPresent]) => {
                    const cleanKey = key.replace('_present', '');
                    return (
                      <div key={key} className="flex justify-between items-center text-xs border-b border-gray-50 pb-1.5 last:border-0 last:pb-0">
                        <span className="font-mono text-[10px] text-gray-500 selection:bg-indigo-50">{cleanKey}</span>
                        <span className={`text-[10px] font-bold flex items-center gap-1 ${isPresent ? 'text-emerald-600' : 'text-gray-400 font-normal'}`}>
                          {isPresent ? 'Mapped ✅' : 'Not set ⚠️'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Vercel Unauthorized-Domain Warn Guide */}
            <div className="bg-amber-50/60 border border-amber-200/50 rounded-2xl p-5 space-y-3.5">
              <div className="flex items-center gap-2 text-amber-800 font-semibold">
                <HelpCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <h3 className="text-xs font-bold leading-none">Solving 'unauthorized-domain' Errors on Vercel Deployments</h3>
              </div>
              <div className="text-xs text-amber-800 leading-relaxed font-semibold space-y-2.5 text-left">
                <p>
                  When your application is hosted on <strong>Vercel</strong> under your private subdomain or custom domains, Firebase Authentication will reject login popup hooks and return an <code>auth/unauthorized-domain</code> error if the domain is not allowlisted in Google.
                </p>
                <div className="bg-white/80 rounded-xl p-3 border border-amber-200/40 space-y-1.5">
                  <p className="font-bold text-amber-900">Follow these exact instructions to authorize Vercel domains:</p>
                  <ol className="list-decimal pl-4 space-y-1 text-amber-800 leading-relaxed">
                    <li>Copy your Vercel deployment URL (e.g. <code>tphl-incentives.vercel.app</code>). Ensure you omit the protocol (<code>https://</code>).</li>
                    <li>Go to the <a href={`https://console.firebase.google.com/project/${diagResults.projectId || 'your-project-id'}/authentication/settings`} target="_blank" rel="noopener noreferrer" className="underline font-bold text-indigo-700 hover:text-indigo-800">Firebase Console Settings</a> (Authentication &gt; Settings &gt; Authorized domains).</li>
                    <li>Click <strong>Add domain</strong> and paste your Vercel URL.</li>
                    <li>Save changes. Authorized domains sync within 60 seconds of updating.</li>
                  </ol>
                </div>
                <p className="text-[11px] text-amber-700 italic font-medium">
                  Note: Always ensure the environment variable names (such as <code>FIREBASE_API_KEY</code>, <code>FIREBASE_PROJECT_ID</code>, <code>FIREBASE_AUTH_DOMAIN</code> etc.) configured in your Vercel dash match local definitions precisely!
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-gray-200 rounded-2xl py-12 text-center text-xs text-gray-400 font-medium flex flex-col items-center justify-center space-y-2">
            <Database className="w-8 h-8 text-gray-300" />
            <p>No diagnostics ran yet. Click "Run Connectivity Check" to test Firestore communication logs.</p>
          </div>
        )}
      </div>

      {/* Backup and Restore Cards */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-600" />
              <h2 className="text-sm font-bold text-gray-800">Export System Master Dump</h2>
            </div>
            <p className="text-xs text-gray-500 leading-normal">
              Download a single, highly compressed JSON file structure detailing all tables of your database (Projects, Teams, Rule structures, Sales lists, Calculated Incentives, Logs). Great for archival schedules or database migrations.
            </p>
          </div>
          {userRole === 'Admin' ? (
            <button
              onClick={handleBackup}
              className="flex items-center justify-center gap-1.5 w-full bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold py-3 rounded-xl shadow-xs transition cursor-pointer mt-4"
            >
              Export JSON Database Snapshot
            </button>
          ) : (
            <p className="text-xs text-amber-600 italic mt-4">🔒 Protected to platform Administrators only</p>
          )}
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-600" />
              <h2 className="text-sm font-bold text-gray-800">Export Direct Firestore DB</h2>
            </div>
            <p className="text-xs text-gray-500 leading-normal">
              Directly query the live Firestore cloud database collections instantly, bypassing server memory caches, to compile and download a complete JSON backup of the active live Firestore state.
            </p>
          </div>
          {userRole === 'Admin' ? (
            <button
              onClick={handleFirestoreBackup}
              className="flex items-center justify-center gap-1.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-3 rounded-xl shadow-xs transition cursor-pointer mt-4"
            >
              Export Raw Firestore JSON
            </button>
          ) : (
            <p className="text-xs text-amber-600 italic mt-4">🔒 Protected to platform Administrators only</p>
          )}
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-600" />
              <h2 className="text-sm font-bold text-gray-800">Restore System Master Dump (JSON)</h2>
            </div>
            <p className="text-xs text-gray-500 leading-normal">
              Directly import a previously exported TPHL database dump JSON file. The system will pre-validate all elements side-by-side prior to injection.
            </p>
          </div>
          {userRole === 'Admin' ? (
            <div className="mt-2 space-y-3">
              {!localFileParsed && !localFileError ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-4.5 text-center transition cursor-pointer flex flex-col items-center justify-center space-y-2 select-none ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-50/55 text-indigo-700'
                      : 'border-gray-200 hover:border-indigo-300 bg-gray-50 hover:bg-gray-50/80 text-gray-500'
                  }`}
                >
                  <Upload className={`w-6 h-6 ${isDragging ? 'text-indigo-600 animate-bounce' : 'text-gray-400'}`} />
                  <div className="text-center">
                    <p className="text-[11px] font-bold">Drag &amp; drop database backup file</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">only .json format supported</p>
                  </div>
                  <label className="bg-white hover:bg-gray-50 border border-gray-200 text-[10px] font-semibold text-gray-700 px-3 py-1.5 rounded-lg cursor-pointer shadow-3xs inline-block">
                    Browse File
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleLocalFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : localFileError ? (
                <div className="bg-rose-50 border border-rose-105 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="w-4.5 h-4.5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-rose-800">Validation Rejected</p>
                      <p className="text-[9px] text-rose-700 mt-0.5 whitespace-pre-wrap leading-tight">{localFileError}</p>
                    </div>
                  </div>
                  <button
                    onClick={cancelLocalBackupImport}
                    className="w-full bg-white hover:bg-rose-50 text-rose-600 text-[10px] font-bold py-1.5 rounded-lg border border-rose-200 cursor-pointer transition text-center"
                  >
                    Clear &amp; Try Again
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-50/40 border border-emerald-200 rounded-2xl p-4 space-y-3">
                  <div className="leading-tight flex items-center justify-between border-b border-emerald-100/50 pb-2">
                    <div className="min-w-0 pr-2">
                      <p className="text-[11px] font-extrabold text-emerald-800 break-all">{localFileName}</p>
                      <span className="inline-flex items-center gap-0.5 text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-semibold mt-1">
                        <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                        Schema Verified
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="bg-white border border-emerald-100/40 rounded-xl p-1.5 text-center leading-normal">
                      <span className="text-[8px] uppercase tracking-wider text-gray-400 block font-bold">Projects</span>
                      <strong className="text-xs text-gray-700">{localFileStats?.projects ?? 0}</strong>
                    </div>
                    <div className="bg-white border border-emerald-100/40 rounded-xl p-1.5 text-center leading-normal">
                      <span className="text-[8px] uppercase tracking-wider text-gray-400 block font-bold">Executives</span>
                      <strong className="text-xs text-gray-700">{localFileStats?.executives ?? 0}</strong>
                    </div>
                    <div className="bg-white border border-emerald-100/40 rounded-xl p-1.5 text-center leading-normal">
                      <span className="text-[8px] uppercase tracking-wider text-gray-400 block font-bold">Teams</span>
                      <strong className="text-xs text-gray-700">{localFileStats?.teams ?? 0}</strong>
                    </div>
                    <div className="bg-white border border-emerald-100/40 rounded-xl p-1.5 text-center leading-normal">
                      <span className="text-[8px] uppercase tracking-wider text-gray-400 block font-bold">Sales Records</span>
                      <strong className="text-xs text-gray-700">{localFileStats?.sales ?? 0}</strong>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={executeLocalImportTransformation}
                      disabled={localImportLoading}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-bold py-2 rounded-lg transition shadow-xs text-center cursor-pointer"
                    >
                      {localImportLoading ? "Importing..." : "Inject DB"}
                    </button>
                    <button
                      onClick={cancelLocalBackupImport}
                      disabled={localImportLoading}
                      className="bg-gray-105 hover:bg-gray-200 disabled:opacity-50 text-gray-600 text-[10px] font-bold px-3 py-2 rounded-lg transition text-center cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-amber-600 italic mt-4">🔒 Protected to platform Administrators only</p>
          )}
        </div>
      </div>

      {/* CSV Database backup & restore */}
      <div className="mt-6">
        <h3 className="text-xs font-bold tracking-wider text-gray-400 uppercase mb-4">Data Maintenance</h3>
        
        <div className="grid lg:grid-cols-2 gap-6">
          {/* CSV Export Card */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-600" />
                <h2 className="text-sm font-bold text-gray-800">Download System Backup</h2>
              </div>
              <p className="text-xs text-gray-500 leading-normal">
                Download your complete portal database in human-readable CSV format. This triggers a CSV export of all database collections (Users, Projects, Sales Teams, Sales Executives, Incentives, Audit Logs, and more) packaged together inside a single, beautifully organized system backup file.
              </p>
            </div>
            {userRole === 'Admin' ? (
              <button
                onClick={handleExportCSVBackup}
                className="flex items-center justify-center gap-1.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-3 rounded-xl shadow-xs transition cursor-pointer mt-4"
              >
                <Download className="w-4 h-4" /> Download System Backup
              </button>
            ) : (
              <p className="text-xs text-amber-600 italic mt-4">🔒 Protected to platform Administrators only</p>
            )}
          </div>

          {/* CSV Import Card */}
          <div className="bg-white border border-gray-105 rounded-3xl p-6 shadow-2xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-600" />
                <h2 className="text-sm font-bold text-gray-800">Restore from Backup</h2>
              </div>
              <p className="text-xs text-gray-500 leading-normal">
                Restores the entire system state back to Firestore database by uploading your previously downloaded CSV backup snapshot file. This parsed validation is mapped, verified for column consistency, and batch-written directly back to Firestore.
              </p>
            </div>

            {userRole === 'Admin' ? (
              <div className="mt-2 space-y-3">
                {!csvFileContent && !csvFileError ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setCsvIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setCsvIsDragging(false); }}
                    onDrop={handleCSVDrop}
                    className={`border-2 border-dashed rounded-2xl p-4.5 text-center transition cursor-pointer flex flex-col items-center justify-center space-y-2 select-none ${
                      csvIsDragging
                        ? 'border-emerald-500 bg-emerald-50/55 text-emerald-700'
                        : 'border-gray-200 hover:border-emerald-300 bg-gray-50 hover:bg-gray-50/80 text-gray-500'
                    }`}
                  >
                    <Upload className={`w-6 h-6 ${csvIsDragging ? 'text-emerald-600 animate-bounce' : 'text-gray-400'}`} />
                    <div className="text-center">
                      <p className="text-[11px] font-bold">Drag &amp; drop database backup CSV file</p>
                      <p className="text-[9px] text-gray-400 mt-0.5">only .csv format exported by system is supported</p>
                    </div>
                    <label className="bg-white hover:bg-gray-50 border border-gray-200 text-[10px] font-semibold text-gray-700 px-3 py-1.5 rounded-lg cursor-pointer shadow-3xs inline-block">
                      Browse File
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleCSVFileSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : csvFileError ? (
                  <div className="bg-rose-50 border border-rose-105 rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-start gap-2">
                      <ShieldAlert className="w-4.5 h-4.5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold text-rose-800">CSV Precheck Failed</p>
                        <p className="text-[9px] text-rose-700 mt-0.5 whitespace-pre-wrap leading-tight">{csvFileError}</p>
                      </div>
                    </div>
                    <button
                      onClick={cancelCSVBackupImport}
                      className="w-full bg-white hover:bg-rose-50 text-rose-600 text-[10px] font-bold py-1.5 rounded-lg border border-rose-200 cursor-pointer transition text-center"
                    >
                      Clear &amp; Try Again
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                    <div className="leading-tight flex items-center justify-between border-b border-emerald-100/55 pb-2">
                      <div className="min-w-0 pr-2">
                        <p className="text-[11px] font-extrabold text-emerald-800 break-all">{csvFileName}</p>
                        <span className="inline-flex items-center gap-0.5 text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-semibold mt-1">
                          <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                          CSV Schema Parsed
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-gray-700">Detected Database Collections:</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {csvFileStats && Object.entries(csvFileStats).map(([table, count]) => (
                          <div key={table} className="bg-white border border-gray-100 rounded-xl p-1.5 text-center leading-normal shadow-3xs">
                            <span className="text-[8px] uppercase tracking-wider text-gray-400 block font-bold truncate" title={table}>{table}</span>
                            <strong className="text-xs text-emerald-800">{count} rows</strong>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={executeLocalCSVImport}
                        disabled={csvImportLoading}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-bold py-2 rounded-lg transition shadow-xs text-center cursor-pointer flex items-center justify-center gap-1"
                      >
                        {csvImportLoading ? "Importing..." : "Restore from Backup"}
                      </button>
                      <button
                        onClick={cancelCSVBackupImport}
                        disabled={csvImportLoading}
                        className="bg-gray-105 hover:bg-gray-200 disabled:opacity-50 text-gray-600 text-[10px] font-bold px-3 py-2 rounded-lg transition text-center cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-amber-600 italic mt-4">🔒 Protected to platform Administrators only</p>
            )}
          </div>
        </div>
      </div>

      {/* Database Integrity Report */}
      {userRole === 'Admin' && (
        <div id="settings-database-integrity-card" className="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h2 className="text-sm font-bold text-gray-800">Database Integrity Report</h2>
              </div>
              <p className="text-xs text-gray-500 leading-normal">
                Detect missing required parameters or orphaned reference mappings between Construction Projects, Sales Teams, Executives, and Sales records.
              </p>
            </div>
            <button
              id="btn-run-integrity-check"
              onClick={runIntegrityCheck}
              disabled={integrityLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${integrityLoading ? 'animate-spin' : ''}`} />
              {integrityLoading ? "Analyzing..." : "Run Integrity Check"}
            </button>
          </div>

          {integrityError && (
            <div id="integrity-error-banner" className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100 leading-relaxed font-semibold">
              ⚠️ Analysis failed: {integrityError}
            </div>
          )}

          {integrityReport ? (
            <div id="integrity-report-results" className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3 text-center">
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block">Status</span>
                  <span className={`text-xs font-bold ${integrityReport.summary.hasErrors ? 'text-rose-600' : 'text-emerald-500'}`}>
                    {integrityReport.summary.hasErrors ? '⚠️ Errors Found' : '✓ Clean Stat'}
                  </span>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3 text-center">
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block">Total Issues</span>
                  <span className="text-xs font-mono font-bold text-gray-800">{integrityReport.summary.totalIssues} issues</span>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3 text-center">
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block">Projects / Teams</span>
                  <span className="text-xs font-mono font-bold text-gray-800">
                    {integrityReport.summary.stats.projectsCount} / {integrityReport.summary.stats.teamsCount}
                  </span>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3 text-center">
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block">Executives / Sales</span>
                  <span className="text-xs font-mono font-bold text-gray-800">
                    {integrityReport.summary.stats.executivesCount} / {integrityReport.summary.stats.salesCount}
                  </span>
                </div>
              </div>

              {/* Issues display lists */}
              {integrityReport.issues.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 bg-emerald-50/50 border border-emerald-100/50 rounded-2xl text-center space-y-2">
                  <ShieldCheck className="w-10 h-10 text-emerald-500" />
                  <h3 className="text-sm font-bold text-emerald-950">Database references are fully intact!</h3>
                  <p className="text-xs text-emerald-700 max-w-md leading-normal">
                    All scanned project keys, team leader associations, executive mappings, and chrono-sales entries are consistent. No orphaned references detected.
                  </p>
                </div>
              ) : (
                <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-3xs">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Identified Issues Log</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y divide-gray-50 bg-white scrollbar-thin">
                    {integrityReport.issues.map((issue: any, idx: number) => (
                      <div key={idx} className="p-3 flex items-start gap-3 hover:bg-gray-50 transition text-left">
                        <span className="shrink-0 mt-0.5">
                          {issue.level === 'error' ? (
                            <span className="flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" title="Error"></span>
                            </span>
                          ) : (
                            <span className="flex h-2 w-2 relative">
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" title="Warning"></span>
                            </span>
                          )}
                        </span>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[8px] tracking-wider uppercase bg-gray-100 text-gray-600 font-extrabold px-1.5 py-0.5 rounded-sm">
                              {issue.collection}
                            </span>
                            <span className={`text-[8px] tracking-wider uppercase font-bold px-1.5 py-0.5 rounded-sm ${issue.level === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                              {issue.type.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-gray-700 font-medium leading-normal">{issue.message}</p>
                          {issue.details && (
                            <div className="text-[9px] font-mono text-gray-400 bg-gray-50 p-1 rounded-md border border-gray-100">
                              Details: {JSON.stringify(issue.details)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center p-6 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-xs text-gray-400 font-medium">Click "Run Integrity Check" above to search database schemas, structural mapping keys, and cascade chains.</p>
            </div>
          )}
        </div>
      )}

      {/* Individual Table CSV manual Backup & Restore */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xl mt-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xs font-bold tracking-wider text-gray-400 uppercase">Manual Table-by-Table CSV Administration</h3>
            <h2 className="text-sm font-bold text-gray-800">Direct Individual Table Backup & Restore (Excel / Google Sheets Format)</h2>
            <p className="text-xs text-gray-500 max-w-2xl leading-normal w-full">
              Unlike consolidated system snapshots, this tool exports standard, clean individual tables containing no comments, compatible directly with computer spreadsheet editing programs. Select a table, download its current data as a standard column-matching CSV file, and restore or replace table items easily.
            </p>
          </div>
          {userRole === 'Admin' && (
            <div className="flex items-center gap-2">
              <label htmlFor="import-table-selector" className="text-[10px] font-bold text-gray-500 uppercase tracking-wide shrink-0">Manage Table:</label>
              <select
                id="import-table-selector"
                value={selectedTable}
                onChange={(e) => {
                  setSelectedTable(e.target.value);
                  cancelIndCSVRestore();
                }}
                className="bg-gray-50 text-xs font-bold text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500 transition cursor-pointer"
              >
                <option value="sales">Sales & Unit Transactions (sales.csv)</option>
                <option value="projects">Construction Projects (projects.csv)</option>
                <option value="salesExecutives">Sales Executives & Targets (salesExecutives.csv)</option>
                <option value="salesTeams">Sales Teams & Monthly Targets (salesTeams.csv)</option>
                <option value="incentiveRules">Project Commission Levels (incentiveRules.csv)</option>
                <option value="unitRegistrations">Unit Registrations (unitRegistrations.csv)</option>
                <option value="bonusRules">Global Milestone Bonuses (bonusRules.csv)</option>
              </select>
            </div>
          )}
        </div>

        {userRole === 'Admin' ? (
          <div className="grid md:grid-cols-2 gap-6 pt-2 border-t border-gray-50">
            {/* Export single table */}
            <div className="bg-gray-50/50 border border-gray-100/80 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="inline-flex items-center gap-1.5 bg-sky-50 text-sky-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Backup / Download
                </span>
                <p className="text-xs text-gray-700 leading-normal">
                  Export the active <strong>{selectedTable}</strong> collection. This outputs a clean table structure featuring standard headings, ideal for fast spreadsheets auditing or bulk updates.
                </p>
                
                {/* Headers Info block */}
                <div className="bg-white border border-gray-100 rounded-xl p-3 space-y-1">
                  <span className="text-[8px] uppercase tracking-wider text-gray-400 block font-bold">Standard Column Schema:</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedTable === 'sales' && ['id', 'project_id', 'unit_name', 'unit_measure', 'floor_number', 'sale_number', 'sale_date', 'executive_id', 'project_on_sale_id', 'buyer_name'].map(h => (
                      <code key={h} className="text-[9px] bg-gray-50 text-gray-600 px-1 py-0.5 rounded font-mono border border-gray-100">{h}</code>
                    ))}
                    {selectedTable === 'projects' && ['id', 'project_name', 'location', 'unit_measure', 'floors', 'units', 'total_flats', 'land_share_amount', 'status', 'registration', 'created_at'].map(h => (
                      <code key={h} className="text-[9px] bg-gray-50 text-gray-600 px-1 py-0.5 rounded font-mono border border-gray-100">{h}</code>
                    ))}
                    {selectedTable === 'salesExecutives' && ['id', 'employee_id', 'name', 'team_id', 'project_id', 'target', 'joining_date', 'monthly_targets'].map(h => (
                      <code key={h} className="text-[9px] bg-gray-50 text-gray-600 px-1 py-0.5 rounded font-mono border border-gray-100">{h}</code>
                    ))}
                    {selectedTable === 'salesTeams' && ['id', 'team_name', 'team_leader', 'sales_target', 'monthly_targets'].map(h => (
                      <code key={h} className="text-[9px] bg-gray-50 text-gray-600 px-1 py-0.5 rounded font-mono border border-gray-100">{h}</code>
                    ))}
                    {selectedTable === 'incentiveRules' && ['id', 'project_id', 'sale_1_percent', 'sale_2_percent', 'sale_3_percent', 'sale_4_percent', 'sale_5_percent', 'sale_6_percent', 'sale_7_percent', 'first_floor_bonus_percent', 'top_floor_bonus_percent', 'created_at'].slice(0,10).map(h => (
                      <code key={h} className="text-[9px] bg-gray-50 text-gray-600 px-1 py-0.5 rounded font-mono border border-gray-100">{h}</code>
                    ))}
                    {selectedTable === 'unitRegistrations' && ['id', 'project_on_sale_id', 'unit_name', 'registered', 'registration_date', 'created_at'].map(h => (
                      <code key={h} className="text-[9px] bg-gray-50 text-gray-600 px-1 py-0.5 rounded font-mono border border-gray-100">{h}</code>
                    ))}
                    {selectedTable === 'bonusRules' && ['target_90_bonus', 'target_100_bonus', 'team_target_bonus'].map(h => (
                      <code key={h} className="text-[9px] bg-gray-50 text-gray-600 px-1 py-0.5 rounded font-mono border border-gray-100">{h}</code>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadTableCSV}
                className="flex items-center justify-center gap-1.5 w-full bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold py-2.5 rounded-xl shadow-sm transition cursor-pointer mt-4"
              >
                <Download className="w-4 h-4" /> Export {selectedTable}.csv File
              </button>
            </div>

            {/* Import single table */}
            <div className="bg-gray-50/50 border border-gray-100/80 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Restore / Overwrite Table
                </span>
                
                {!indCsvContent ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIndCsvIsDragging(true); }}
                    onDragLeave={() => setIndCsvIsDragging(false)}
                    onDrop={handleIndCSVDrop}
                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                      indCsvIsDragging 
                        ? 'border-sky-500 bg-sky-50/50' 
                        : 'border-gray-200 bg-white hover:border-sky-400 hover:bg-sky-50/10'
                    }`}
                  >
                    <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                    <p className="text-[10px] font-semibold text-gray-600">
                      Drag & Drop corrected {selectedTable}.csv here, or
                    </p>
                    <label className="text-[10px] text-sky-600 font-bold hover:underline mt-1 cursor-pointer inline-block">
                      Browse Files
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleIndCSVFileSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-100 rounded-xl p-3.5 space-y-3 shadow-xs">
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5 animate-pulse">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Target Destination:</span>
                        <strong className="text-xs text-sky-700 uppercase">[{selectedTable}] collection</strong>
                      </div>
                      <span className="text-[10px] block bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
                        {indCsvStatsRows} items ready
                      </span>
                    </div>

                    <div className="space-y-1 text-[10px] leading-normal text-gray-600">
                      <p className="font-semibold text-gray-800">Columns parsed successfully:</p>
                      <div className="flex flex-wrap gap-1 font-mono text-[8px] bg-gray-50 p-2 rounded-lg border border-gray-100 max-h-16 overflow-y-auto">
                        {indCsvHeaders.map(h => (
                          <span key={h} className="text-emerald-700 bg-emerald-50 px-1 rounded">{h}</span>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1.5">
                      <button
                        onClick={executeIndCSVRestore}
                        disabled={indCsvLoading}
                        className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-[10px] font-bold py-2 rounded-lg transition shadow-xs text-center cursor-pointer flex items-center justify-center gap-1"
                      >
                        {indCsvLoading ? "Restoring..." : "Apply & Recalculate Table"}
                      </button>
                      <button
                        onClick={cancelIndCSVRestore}
                        disabled={indCsvLoading}
                        className="bg-gray-105 hover:bg-gray-200 disabled:opacity-50 text-gray-600 text-[10px] font-bold px-3 py-2 rounded-lg transition text-center cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {indCsvError && (
                  <div className="bg-red-50 text-red-700 text-[10px] p-2.5 rounded-lg border border-red-100 leading-normal font-semibold">
                    ⚠️ Parser Failure: {indCsvError}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-amber-600 italic mt-2">🔒 Managed Tables restoration is reserved for platform Administrators only.</p>
        )}
      </div>

      {/* Grid containing logs & notification trackers */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Audit Log Sheet */}
        {userRole === 'Admin' && (
          <div className="lg:col-span-2 bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-sm font-bold text-gray-800">Security Audit Logs Trails</h2>
                </div>
                <button
                  onClick={fetchData}
                  className="p-1 text-gray-400 hover:text-indigo-600 cursor-pointer transition"
                  title="Reload audit trace"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                {logs.map((log, idx) => (
                  <div key={`${log.id}-${idx}`} className="text-[11px] border-b border-gray-50 pb-2.5 last:border-0 last:pb-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-800">{log.action}</span>
                      <span className="font-mono text-gray-400">{log.timestamp.split('T')[1].slice(0, 8)} ({log.timestamp.split('T')[0]})</span>
                    </div>
                    <p className="text-gray-500 leading-normal">{log.details}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-indigo-700 font-semibold font-mono">
                      <span>👤 {log.username}</span>
                      <span>&bull;</span>
                      <span className="uppercase">{log.role}</span>
                    </div>
                  </div>
                ))}
                {logs.length === 0 && (
                  <p className="text-center py-10 text-gray-400 font-mono">No security logs saved.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Notifications sheet */}
        <div className={`${userRole === 'Admin' ? 'lg:col-span-1' : 'col-span-full'} bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs space-y-4 flex flex-col justify-between`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-50 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-600" />
                <h2 className="text-sm font-bold text-gray-800">Active Notifications Logs</h2>
              </div>
              <button
                onClick={handleClearNotif}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
              >
                Mark read
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2.5 pr-2">
              {notifList.map((notif, idx) => {
                let badgeCol = "bg-indigo-50 border-indigo-100 text-indigo-800";
                if (notif.type === 'success') badgeCol = "bg-emerald-50 border-emerald-100 text-emerald-800 font-semibold";
                else if (notif.type === 'warning') badgeCol = "bg-amber-50 border-amber-100 text-amber-800";

                return (
                  <div key={`${notif.id}-${idx}`} className="border border-gray-100/50 rounded-xl p-3 bg-gray-50/50 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[9px] uppercase tracking-wider px-1.5 rounded-md ${badgeCol}`}>{notif.type}</span>
                      <span className="text-[9px] text-gray-400 font-mono">{notif.timestamp.split('T')[1].slice(0, 5)}</span>
                    </div>
                    <h4 className="text-xs font-bold text-gray-800 leading-tight">{notif.title}</h4>
                    <p className="text-[10px] text-gray-500 leading-normal">{notif.message}</p>
                  </div>
                );
              })}
              {notifList.length === 0 && (
                <p className="text-center py-10 text-gray-400 text-xs font-mono">No notifications logged.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-all duration-300">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-gray-100 shadow-2xl space-y-4 scale-100 opacity-100 transition-all duration-300">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-amber-50 rounded-2xl shrink-0">
                <ShieldAlert className="w-6 h-6 text-amber-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-gray-800">{confirmModal.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed font-medium">{confirmModal.message}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                onClick={() => confirmModal.onConfirm()}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer transition shadow-xs text-center"
              >
                {confirmModal.confirmText}
              </button>
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2.5 bg-gray-105 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-xl cursor-pointer transition text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
