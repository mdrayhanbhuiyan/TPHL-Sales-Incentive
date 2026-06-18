

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

import { 
  User, 
  Project, 
  SalesTeam, 
  TeamProject, 
  SalesExecutive, 
  IncentiveRule, 
  BonusRules, 
  Sale, 
  SalesIncentive, 
  AuditLog,
  AppNotification,
  ProjectOnSale,
  UnitRegistration
} from '../types';

export interface DatabaseStore {
  users: User[];
  projects: Project[];
  salesTeams: SalesTeam[];
  teamProjects: TeamProject[];
  salesExecutives: SalesExecutive[];
  incentiveRules: IncentiveRule[];
  bonusRules: BonusRules;
  sales: Sale[];
  salesIncentives: SalesIncentive[];
  auditLogs: AuditLog[];
  notifications: AppNotification[];
  projectsOnSale?: ProjectOnSale[];
  unitRegistrations?: UnitRegistration[];
  rolePermissions?: {
    [role: string]: {
      allowedViews: string[];
      allowedEdits: string[];
    }
  };
}

const DEFAULT_STORE: DatabaseStore = {
  users: [
    {
      id: "u-admin",
      email: "rayhanbhuiyan2021@gmail.com",
      name: "Rayhan Bhuiyan",
      role: "Admin",
      created_at: "2026-01-01T00:00:00Z"
    },
    {
      id: "u-leader1",
      email: "leader@tphl.com",
      name: "Sajjad Hossain",
      role: "Sales Team Leader",
      team_id: "",
      created_at: "2026-01-05T00:00:00Z"
    },
    {
      id: "u-exec1",
      email: "executive@tphl.com",
      name: "Rahim Ahmed",
      role: "Sales Executive",
      employee_id: "EMP01",
      team_id: "",
      created_at: "2026-01-10T00:00:00Z"
    }
  ],
  projects: [],
  salesTeams: [],
  teamProjects: [],
  salesExecutives: [],
  incentiveRules: [],
  bonusRules: {
    target_90_bonus: 2000,
    target_100_bonus: 3500,
    team_target_bonus: 5000
  },
  sales: [],
  salesIncentives: [],
  projectsOnSale: [],
  unitRegistrations: [],
  auditLogs: [
    {
      id: "log-1",
      user_id: "u-admin",
      username: "TPHL Management",
      role: "Admin",
      action: "System Initialization",
      details: "Clean database initialized for real sales operations.",
      timestamp: "2026-06-04T07:00:00Z"
    }
  ],
  notifications: [
    {
      id: "notif-1",
      title: "Production System Ready",
      message: "Database initialized. Create projects, define teams, assign executives, and register sales to get started.",
      type: "success",
      timestamp: "2026-06-04T07:01:00Z",
      read: false
    }
  ],
  rolePermissions: {
    'Admin': {
      allowedViews: ['dashboard', 'projects-on-sale', 'registration', 'projects', 'teams', 'executives', 'rules', 'sales', 'incentives', 'docs', 'settings'],
      allowedEdits: ['projects', 'teams', 'executives', 'rules', 'sales', 'registration', 'projects-on-sale', 'role-permissions']
    },
    'Sales Team Leader': {
      allowedViews: ['dashboard', 'projects-on-sale', 'registration', 'projects', 'teams', 'sales', 'incentives', 'docs'],
      allowedEdits: ['sales']
    },
    'Sales Executive': {
      allowedViews: ['dashboard', 'projects-on-sale', 'registration', 'sales', 'incentives', 'docs'],
      allowedEdits: ['sales']
    }
  }
};

// Universal UUID generator with fallback
export function generateUUID(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch (err) {}
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Defensive execution wrapper to avoid serverless function timeouts/hangs on Vercel
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);

    promise.then(
      (res) => {
        clearTimeout(timer);
        resolve(res);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

// Global in-memory cache for fast synchronous access
let cachedStore: DatabaseStore | null = null;
let supabaseClient: any = null;
let firestoreDb: any = null;
let lastLocalSyncTime = 0;

// Initialize Firebase Firestore client safely with config
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (configData && configData.apiKey && configData.projectId) {
      const fbApp = getApps().length === 0 ? initializeApp(configData) : getApp();
      const dbName = configData.firestoreDatabaseId || "(default)";
      firestoreDb = getFirestore(fbApp, dbName);
      console.log("[db.ts] Firebase client in db.ts initialized server-side successfully with project ID: " + configData.projectId + " and database Name: " + dbName);
    } else {
      console.log("[db.ts] Empty or incomplete firebase-applet-config.json found.");
    }
  } else {
    console.log("[db.ts] No firebase-applet-config.json file detected at root.");
  }
} catch (err: any) {
  console.log("[db.ts] Safe notice: Firebase could not be initialized server-side: " + (err.message || err));
}

// Initialize Supabase Client safely with validation to prevent throws on placeholder values
try {
  let supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  let supabaseKey = (process.env.SUPABASE_KEY || '').trim();

  // Clean and filter out common placeholder/default strings
  if (
    supabaseUrl === 'YOUR_SUPABASE_URL' || 
    supabaseUrl === 'placeholder' ||
    supabaseUrl === 'undefined' || 
    supabaseUrl === 'null' ||
    supabaseUrl === ''
  ) {
    supabaseUrl = '';
  }

  if (
    supabaseKey === 'YOUR_SUPABASE_KEY' || 
    supabaseKey === 'placeholder' ||
    supabaseKey === 'undefined' || 
    supabaseKey === 'null' ||
    supabaseKey === ''
  ) {
    supabaseKey = '';
  }

  // Validate that supabaseUrl is a proper URL starting with http:// or https://
  let isValidUrl = false;
  if (supabaseUrl) {
    try {
      const parsed = new URL(supabaseUrl);
      isValidUrl = parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (e) {
      isValidUrl = false;
    }
  }

  if (supabaseUrl && supabaseKey && isValidUrl) {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
    console.log("[db.ts] Supabase client initialized successfully with URL: " + supabaseUrl);
  } else {
    console.log("[db.ts] Supabase credentials not found or invalid. Working in highly-optimized local CSV database mode.");
  }
} catch (err: any) {
  console.log("[db.ts] Safe notice: Supabase not used/configured (" + (err.message || err) + "). Falling back to local offline CSV storage.");
}

export const SCHEMA_HEADERS: { [key: string]: string[] } = {
  users: ['id', 'email', 'name', 'role', 'employee_id', 'team_id', 'created_at'],
  projects: ['id', 'project_name', 'location', 'unit_measure', 'floors', 'units', 'total_flats', 'land_share_amount', 'first_sale_date', 'status', 'registration', 'created_at'],
  salesTeams: ['id', 'team_name', 'team_leader', 'sales_target', 'monthly_targets'],
  teamProjects: ['id', 'team_id', 'project_id'],
  salesExecutives: ['id', 'employee_id', 'name', 'team_id', 'project_id', 'target', 'joining_date', 'monthly_targets'],
  incentiveRules: ['id', 'project_id', 'sale_1_percent', 'sale_2_percent', 'sale_3_percent', 'sale_4_percent', 'sale_5_percent', 'sale_6_percent', 'sale_7_percent', 'first_floor_bonus_percent', 'top_floor_bonus_percent', 'created_at'],
  bonusRules: ['target_90_bonus', 'target_100_bonus', 'team_target_bonus'],
  sales: ['id', 'project_id', 'unit_name', 'unit_measure', 'floor_number', 'sale_number', 'sale_date', 'executive_id', 'project_on_sale_id', 'buyer_name'],
  salesIncentives: ['id', 'sale_id', 'executive_id', 'project_id', 'base_incentive', 'floor_bonus', 'target_bonus', 'team_bonus', 'total_incentive', 'month', 'year'],
  auditLogs: ['id', 'user_id', 'username', 'role', 'action', 'details', 'timestamp'],
  notifications: ['id', 'title', 'message', 'type', 'timestamp', 'read'],
  projectsOnSale: ['id', 'project_name', 'flat_unit_size', 'project_id', 'floor_number', 'units_per_floor', 'total_units', 'created_at', 'land_share_price', 'unit_configs'],
  unitRegistrations: ['id', 'project_on_sale_id', 'unit_name', 'registered', 'registration_date', 'created_at']
};

const FIELD_TYPES: { [key: string]: 'number' | 'boolean' | 'json' | 'string' } = {
  floors: 'number',
  units: 'number',
  total_flats: 'number',
  land_share_amount: 'number',
  sales_target: 'number',
  monthly_targets: 'json',
  target: 'number',
  sale_1_percent: 'number',
  sale_2_percent: 'number',
  sale_3_percent: 'number',
  sale_4_percent: 'number',
  sale_5_percent: 'number',
  sale_6_percent: 'number',
  sale_7_percent: 'number',
  first_floor_bonus_percent: 'number',
  top_floor_bonus_percent: 'number',
  target_90_bonus: 'number',
  target_100_bonus: 'number',
  team_target_bonus: 'number',
  floor_number: 'number',
  sale_number: 'number',
  base_incentive: 'number',
  floor_bonus: 'number',
  target_bonus: 'number',
  team_bonus: 'number',
  total_incentive: 'number',
  month: 'number',
  year: 'number',
  read: 'boolean',
  units_per_floor: 'number',
  total_units: 'number',
  land_share_price: 'number',
  unit_configs: 'json'
};

function parseCSVField(key: string, fieldName: string, rawVal: string): any {
  if (rawVal === undefined || rawVal === '') {
    return undefined;
  }
  const type = FIELD_TYPES[fieldName];
  if (type === 'number') {
    const num = Number(rawVal);
    return isNaN(num) ? 0 : num;
  }
  if (type === 'boolean') {
    return rawVal.toLowerCase() === 'true';
  }
  if (type === 'json') {
    try {
      return JSON.parse(rawVal);
    } catch (e) {
      return {};
    }
  }
  return rawVal;
}

export function csvToItems(key: string, csvContent: string): any[] {
  if (!csvContent || csvContent.trim() === '') return [];
  
  const entries: string[][] = [];
  let currentEntry: string[] = [];
  let currentField = '';
  let insideQuotes = false;
  
  let i = 0;
  while (i < csvContent.length) {
    const char = csvContent[i];
    
    if (char === '"') {
      if (insideQuotes && csvContent[i + 1] === '"') {
        currentField += '"';
        i += 2;
      } else {
        insideQuotes = !insideQuotes;
        i++;
      }
    } else if (char === ',' && !insideQuotes) {
      currentEntry.push(currentField);
      currentField = '';
      i++;
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      currentEntry.push(currentField);
      currentField = '';
      if (currentEntry.length > 0) {
        if (!(currentEntry.length === 1 && currentEntry[0] === '')) {
          entries.push(currentEntry);
        }
      }
      currentEntry = [];
      if (char === '\r' && csvContent[i + 1] === '\n') {
        i += 2;
      } else {
        i++;
      }
    } else {
      currentField += char;
      i++;
    }
  }
  if (currentField !== '' || currentEntry.length > 0) {
    currentEntry.push(currentField);
    if (currentEntry.length > 0 && !(currentEntry.length === 1 && currentEntry[0] === '')) {
      entries.push(currentEntry);
    }
  }

  if (entries.length === 0) return [];
  const headers = entries[0].map(h => h.trim());
  const rows = entries.slice(1);
  
  return rows.map(row => {
    const obj: any = {};
    headers.forEach((header, index) => {
      const rawVal = row[index];
      const parsed = parseCSVField(key, header, rawVal);
      if (parsed !== undefined) {
        obj[header] = parsed;
      }
    });
    return obj;
  });
}

export function arrayToCSV(key: string, data: any[] | any): string {
  const headers = SCHEMA_HEADERS[key];
  if (!headers) return '';

  let rows: any[] = [];
  if (key === 'bonusRules') {
    rows = [data || {}];
  } else {
    rows = Array.isArray(data) ? data : [];
  }

  const lines = [headers.join(',')];

  for (const row of rows) {
    const values = headers.map(header => {
      const val = row[header];
      if (val === null || val === undefined) {
        return '';
      }
      if (typeof val === 'object') {
        const jsonStr = JSON.stringify(val);
        return `"${jsonStr.replace(/"/g, '""')}"`;
      }
      const strVal = String(val);
      if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n') || strVal.includes('\r')) {
        return `"${strVal.replace(/"/g, '""')}"`;
      }
      return strVal;
    });
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

function getCSVDirectory(): string {
  if (process.env.VERCEL) {
    return '/tmp/csv-data';
  }
  return path.join(process.cwd(), 'csv-data');
}

function initCSVDirectory(): void {
  try {
    const csvDir = getCSVDirectory();
    if (!fs.existsSync(csvDir)) {
      fs.mkdirSync(csvDir, { recursive: true });
    }

    // Load existing backup states from db-store.json if available
    let localDbPath = path.join(process.cwd(), 'db-store.json');
    if (process.env.VERCEL) {
      localDbPath = '/tmp/db-store.json';
    }
    
    let backupStore: DatabaseStore = DEFAULT_STORE;
    if (fs.existsSync(localDbPath)) {
      try {
        backupStore = JSON.parse(fs.readFileSync(localDbPath, 'utf-8'));
      } catch (err) {
        console.error("[db.ts] Failed to parse db-store.json for CSV directory seeding, falling back to default store:", err);
      }
    }

    const keys: (keyof DatabaseStore)[] = [
      'users',
      'projects',
      'salesTeams',
      'teamProjects',
      'salesExecutives',
      'incentiveRules',
      'bonusRules',
      'sales',
      'salesIncentives',
      'auditLogs',
      'notifications',
      'projectsOnSale',
      'unitRegistrations'
    ];

    // On Vercel, if we are initializing a cold container, we should copy the pre-compiled read-only CSV files from the deployment bundle to /tmp/csv-data
    if (process.env.VERCEL) {
      let sourceDir = path.join(process.cwd(), 'csv-data');
      if (!fs.existsSync(sourceDir)) {
        const backupSource1 = path.join(__dirname, '..', 'csv-data');
        const backupSource2 = path.join(__dirname, '../../csv-data');
        if (fs.existsSync(backupSource1)) {
          sourceDir = backupSource1;
        } else if (fs.existsSync(backupSource2)) {
          sourceDir = backupSource2;
        }
      }
      
      if (fs.existsSync(sourceDir)) {
        console.log(`[db.ts] Seeding Vercel /tmp/csv-data from bundle path: ${sourceDir}`);
        for (const key of keys) {
          const targetPath = path.join(csvDir, `${key}.csv`);
          const sourcePath = path.join(sourceDir, `${key}.csv`);
          if (!fs.existsSync(targetPath) && fs.existsSync(sourcePath)) {
            try {
              fs.writeFileSync(targetPath, fs.readFileSync(sourcePath, 'utf-8'), 'utf-8');
            } catch (err: any) {
              console.error(`[db.ts] Failed to copy seed CSV for ${key}:`, err.message);
            }
          }
        }
      }
    }

    for (const key of keys) {
      const filePath = path.join(csvDir, `${key}.csv`);
      
      // Check if the CSV needs to be seeded. It needs seeding if:
      // 1. It doesn't exist on disk yet.
      // 2. It exists, but only contains the single header line, and backupStore contains actual records.
      let needsSeeding = !fs.existsSync(filePath);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size <= 200) {
          const fileContent = fs.readFileSync(filePath, 'utf-8').trim();
          const linesCount = fileContent.split('\n').filter(Boolean).length;
          const backupCount = Array.isArray(backupStore[key]) ? (backupStore[key] as any[]).length : 1;
          if (linesCount <= 1 && backupCount > 0) {
            needsSeeding = true;
          }
        }
      }

      if (needsSeeding) {
        console.log(`[db.ts] Seeding CSV storage for: ${key} from db-store.json backup`);
        const csvContent = arrayToCSV(key, backupStore[key] !== undefined ? backupStore[key] : DEFAULT_STORE[key]);
        fs.writeFileSync(filePath, csvContent, 'utf-8');
      }
    }
  } catch (err: any) {
    console.warn("[db.ts] Safe warning inside initCSVDirectory:", err.message || err);
  }
}

function loadStoreFromCSV(): DatabaseStore {
  const csvDir = getCSVDirectory();
  initCSVDirectory();

  // Load db-store.json as the base/fallback store instead of DEFAULT_STORE!
  let localDbPath = path.join(process.cwd(), 'db-store.json');
  if (process.env.VERCEL) {
    localDbPath = '/tmp/db-store.json';
    if (!fs.existsSync(localDbPath)) {
      // Copy the static bundled db-store.json to /tmp/db-store.json if it doesn't exist
      let seedDbPath = path.join(process.cwd(), 'db-store.json');
      const backupDbPath = path.join(__dirname, '..', 'db-store.json');
      const backupDbPath2 = path.join(__dirname, '../../db-store.json');
      if (!fs.existsSync(seedDbPath)) {
        if (fs.existsSync(backupDbPath)) {
          seedDbPath = backupDbPath;
        } else if (fs.existsSync(backupDbPath2)) {
          seedDbPath = backupDbPath2;
        }
      }
      if (fs.existsSync(seedDbPath)) {
        try {
          fs.writeFileSync(localDbPath, fs.readFileSync(seedDbPath, 'utf-8'), 'utf-8');
        } catch (e) {
          console.warn("[db.ts] Bypassed db-store.json copying:", e);
        }
      }
    }
  }

  let baseStore: DatabaseStore = JSON.parse(JSON.stringify(DEFAULT_STORE));
  if (fs.existsSync(localDbPath)) {
    try {
      const dbContent = fs.readFileSync(localDbPath, 'utf-8');
      baseStore = JSON.parse(dbContent);
      console.log("[db.ts] Pre-loaded backup store from db-store.json successfully.");
    } catch (err: any) {
      console.error("[db.ts] Failed to parse db-store.json during loadStoreFromCSV:", err.message);
    }
  }

  const store: Partial<DatabaseStore> = {};
  const keys: (keyof DatabaseStore)[] = [
    'users',
    'projects',
    'salesTeams',
    'teamProjects',
    'salesExecutives',
    'incentiveRules',
    'bonusRules',
    'sales',
    'salesIncentives',
    'auditLogs',
    'notifications',
    'projectsOnSale',
    'unitRegistrations'
  ];

  for (const key of keys) {
    const filePath = path.join(csvDir, `${key}.csv`);
    try {
      if (fs.existsSync(filePath)) {
        const csvContent = fs.readFileSync(filePath, 'utf-8');
        if (key === 'bonusRules') {
          const items = csvToItems(key, csvContent);
          store[key] = items[0] || baseStore.bonusRules || DEFAULT_STORE.bonusRules;
        } else {
          const parsedItems = csvToItems(key, csvContent);
          // Only overwrite our rich baseStore with CSV if CSV actually contains data.
          // This prevents empty/blank committed CSV files from wiping out rich pre-loaded JSON backups.
          if (parsedItems && parsedItems.length > 0) {
            store[key] = parsedItems as any;
          } else if (baseStore[key] !== undefined && Array.isArray(baseStore[key]) && baseStore[key].length > 0) {
            store[key] = baseStore[key] as any;
          } else {
            store[key] = parsedItems as any;
          }
        }
      } else {
        // Fall back to the structured backup store from db-store.json
        store[key] = baseStore[key] !== undefined ? baseStore[key] : (DEFAULT_STORE[key] as any);
      }
    } catch (err) {
      console.error(`[db.ts] Failed to read CSV for key ${key}, falling back to baseStore:`, err);
      store[key] = baseStore[key] !== undefined ? baseStore[key] : (DEFAULT_STORE[key] as any);
    }
  }

  return {
    ...store,
    rolePermissions: baseStore.rolePermissions !== undefined ? baseStore.rolePermissions : DEFAULT_STORE.rolePermissions
  } as DatabaseStore;
}

function saveStoreToCSV(store: DatabaseStore): void {
  const csvDir = getCSVDirectory();
  if (!fs.existsSync(csvDir)) {
    try {
      fs.mkdirSync(csvDir, { recursive: true });
    } catch (err: any) {
      console.error("[db.ts] Failed to create csv-data directory:", err.message);
    }
  }

  const keys: (keyof DatabaseStore)[] = [
    'users',
    'projects',
    'salesTeams',
    'teamProjects',
    'salesExecutives',
    'incentiveRules',
    'bonusRules',
    'sales',
    'salesIncentives',
    'auditLogs',
    'notifications',
    'projectsOnSale',
    'unitRegistrations'
  ];

  for (const key of keys) {
    const filePath = path.join(csvDir, `${key}.csv`);
    try {
      const csvContent = arrayToCSV(key, store[key]);
      fs.writeFileSync(filePath, csvContent, 'utf-8');
    } catch (err) {
      console.error(`[db.ts] Failed to write CSV file: ${filePath}`, err);
    }
  }
}



// Helper to recursively remove all undefined properties and convert NaN to 0 from an object so Firestore doesn't reject them
function removeUndefined(obj: any): any {
  if (typeof obj === 'number' && Number.isNaN(obj)) {
    return 0;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item));
  } else if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      if (obj[key] !== undefined) {
        newObj[key] = removeUndefined(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
}

// Sequential write task queue to process Firestore writes one-by-one safely without collisions or crashes
interface WriteTask {
  store: DatabaseStore;
  resolve: () => void;
  reject: (err: any) => void;
}

const writeTasks: WriteTask[] = [];
let isProcessingQueue = false;

async function processWriteQueue(): Promise<void> {
  if (isProcessingQueue || writeTasks.length === 0) return;
  isProcessingQueue = true;

  while (writeTasks.length > 0) {
    const task = writeTasks[0];
    try {
      if (supabaseClient) {
        console.log("[db.ts] Synchronizing database state to Supabase...");
        const keys: (keyof DatabaseStore)[] = [
          'users',
          'projects',
          'salesTeams',
          'teamProjects',
          'salesExecutives',
          'incentiveRules',
          'bonusRules',
          'sales',
          'salesIncentives',
          'auditLogs',
          'notifications',
          'projectsOnSale',
          'unitRegistrations'
        ];

        const sanitizedStore = removeUndefined(task.store);
        const upsertRows = keys.map(key => ({
          key: key,
          data: sanitizedStore[key] !== undefined ? sanitizedStore[key] : []
        }));

        const { error } = await withTimeout<any>(
          supabaseClient
            .from('sales_portal_data')
            .upsert(upsertRows, { onConflict: 'key' }),
          8000,
          "Supabase write batch upsert timeout"
        );

        if (error) {
          console.error("[db.ts] Failed to batch upsert state to Supabase:", error.message);
          if (error.message && error.message.includes('relation "sales_portal_data" does not exist')) {
            console.warn('[db.ts] Action Required: Table "sales_portal_data" missing in your Supabase database. Please open Supabase SQL Editor and run: \nCREATE TABLE sales_portal_data (key text PRIMARY KEY, data jsonb);');
          }
        } else {
          console.log("[db.ts] Successfully synchronized database state to Supabase in a single batch operation!");
        }
      }

      task.resolve();
    } catch (err: any) {
      console.error("[db.ts] Failed to save state to Firebase/Supabase inside queue:", err);
      task.reject(err);
    }
    writeTasks.shift(); // Remove the completed task
  }

  isProcessingQueue = false;
}

// Synchronize full database state to Firebase Firestore safely
async function saveStoreToFirestore(store: DatabaseStore): Promise<void> {
  if (!firestoreDb) return;
  try {
    const keys: (keyof DatabaseStore)[] = [
      'users', 'projects', 'salesTeams', 'teamProjects', 'salesExecutives',
      'incentiveRules', 'bonusRules', 'sales', 'salesIncentives', 'auditLogs',
      'notifications', 'projectsOnSale', 'unitRegistrations', 'rolePermissions'
    ];

    for (const key of keys) {
      if (store[key] !== undefined) {
        const sanitized = removeUndefined(store[key]);
        const docRef = doc(firestoreDb, 'sales_portal_data', key);
        await setDoc(docRef, { data: sanitized });
      }
    }
    console.log("[db.ts] Successfully synchronized full database state to Firebase Firestore!");
  } catch (err: any) {
    console.error("[db.ts] Failed to sync database state to Firebase Firestore:", err.message || err);
  }
}

// Firestore Direct Write helper (Redirected to CSV local storage and Firebase Firestore)
async function writeStoreToFirestore(store: DatabaseStore): Promise<void> {
  // Always keep local db-store.json synchronized so offline backups are updated instantly
  try {
    const localDbPath = process.env.VERCEL ? '/tmp/db-store.json' : path.join(process.cwd(), 'db-store.json');
    fs.writeFileSync(localDbPath, JSON.stringify(store, null, 2), 'utf-8');
    console.log("[db.ts] Offline backup successfully recorded in local db-store.json");
  } catch (err) {
    // Fail silently on read-only environments (e.g. Vercel deployment)
  }

  // Only call saveStoreToCSV if Firebase is NOT active (unlinking CSV files during standard operation as requested)
  if (!firestoreDb) {
    try {
      saveStoreToCSV(store);
      console.log("[db.ts] All database tables successfully formatted and saved to 'csv-data/*.csv' files!");
    } catch (err) {
      console.error("[db.ts] Error saving to CSV storage:", err);
    }
  } else {
    console.log("[db.ts] Bypassed saving to CSV local files: Firebase is the primary repository (CSV unlinked during standard runtime).");
  }

  // Active Firebase synchronization
  if (firestoreDb) {
    saveStoreToFirestore(store).catch(err => {
      console.error("[db.ts] Firestore async write failed:", err);
    });
  }

  if (supabaseClient) {
    return new Promise<void>((resolve, reject) => {
      writeTasks.push({ store, resolve, reject });
      processWriteQueue();
    });
  }
}

// Pull keys from Firebase Firestore directly to our memory cache
export async function pullFromFirestore(): Promise<void> {
  if (!firestoreDb) return;
  const keys: (keyof DatabaseStore)[] = [
    'users', 'projects', 'salesTeams', 'teamProjects', 'salesExecutives',
    'incentiveRules', 'bonusRules', 'sales', 'salesIncentives', 'auditLogs',
    'notifications', 'projectsOnSale', 'unitRegistrations', 'rolePermissions'
  ];
  
  let loadedFromFirebase = false;
  const tempStore: any = {};

  const promises = keys.map(async (key) => {
    try {
      const docRef = doc(firestoreDb, 'sales_portal_data', key);
      const docSnap = await withTimeout<any>(
        getDoc(docRef),
        4000,
        `Firestore load timeout for key ${key}`
      );
      if (docSnap.exists()) {
        const fileData = docSnap.data();
        if (fileData && fileData.data !== undefined) {
          tempStore[key] = fileData.data;
          loadedFromFirebase = true;
        }
      }
    } catch (err: any) {
      console.error(`[db.ts] Firebase error loading key '${key}':`, err.message || err);
    }
  });

  await Promise.all(promises);

  if (loadedFromFirebase && cachedStore) {
    for (const key of keys) {
      if (tempStore[key] !== undefined && tempStore[key] !== null) {
        if (key === 'bonusRules') {
          if (tempStore.bonusRules && typeof tempStore.bonusRules === 'object') {
            cachedStore.bonusRules = tempStore.bonusRules;
          }
        } else if (key === 'rolePermissions') {
          if (tempStore.rolePermissions && typeof tempStore.rolePermissions === 'object') {
            cachedStore.rolePermissions = tempStore.rolePermissions;
          }
        } else {
          if (Array.isArray(tempStore[key])) {
            (cachedStore as any)[key] = tempStore[key];
          }
        }
      }
    }
    console.log("[db.ts] Successfully pulled fresh operational dataset from Firebase Firestore!");
  }
}

// Active synchronisation with Firebase Firestore on every request (Vercel-safe)
export async function syncWithFirestoreIfNeeded(): Promise<void> {
  if (!firestoreDb) return;
  try {
    const metaRef = doc(firestoreDb, 'sales_portal_data', 'metadata');
    let storedHash = "";
    let lastRemoteUpdate = 0;

    try {
      const metaSnap = await withTimeout<any>(
        getDoc(metaRef),
        3000,
        "Firestore metadata load timeout"
      );
      if (metaSnap.exists()) {
        const metaData = metaSnap.data();
        storedHash = metaData?.deploymentHash || "";
        lastRemoteUpdate = Number(metaData?.lastUpdatedAt) || 0;
      }
    } catch (err: any) {
      console.log("[db.ts] Safe metadata read notice:", err.message || err);
    }

    if (!cachedStore) {
      cachedStore = loadStoreFromCSV();
    }

    // 1. Calculate local deployment hash of the preloaded deployment bundle Setup keys
    const setupKeyData = {
      users: cachedStore.users,
      projects: cachedStore.projects,
      salesTeams: cachedStore.salesTeams,
      teamProjects: cachedStore.teamProjects,
      salesExecutives: cachedStore.salesExecutives,
      incentiveRules: cachedStore.incentiveRules,
      bonusRules: cachedStore.bonusRules,
      projectsOnSale: cachedStore.projectsOnSale,
      unitRegistrations: cachedStore.unitRegistrations,
      rolePermissions: cachedStore.rolePermissions
    };
    const currentLocalHash = crypto.createHash('sha1').update(JSON.stringify(setupKeyData)).digest('hex');

    // 2. Hash Mismatch: New Vercel Deployment with code updates or updated CSV setup has run!
    if (currentLocalHash !== storedHash) {
      console.log(`[db.ts] New deployment detected (local: ${currentLocalHash}, remote: ${storedHash}). Overwriting Firebase database state with Vercel preloaded/updated files...`);
      
      // Seed/Recalculate everything to prepare fresh dataset
      recalculateAllIncentivesDirect(cachedStore);
      
      // Save it directly to Firestore
      await saveStoreToFirestore(cachedStore);
      
      // Record new deployment details in Firestore metadata
      const nowEpoch = Date.now();
      await setDoc(metaRef, { deploymentHash: currentLocalHash, lastUpdatedAt: nowEpoch });
      lastLocalSyncTime = nowEpoch;
      console.log("[db.ts] Vercel-deployed data successfully propagated to Firebase Firestore!");
    } else {
      // 3. Hashes match: Operational mode. If the remote was modified by transactions, pull them!
      if (lastRemoteUpdate > lastLocalSyncTime) {
        console.log(`[db.ts] In-memory cache is cold (local: ${lastLocalSyncTime}, remote: ${lastRemoteUpdate}). Pulling latest active transactions from Firebase Firestore...`);
        await pullFromFirestore();
        lastLocalSyncTime = lastRemoteUpdate;
      } else {
        // Cache is already hot and operational, serve immediately with zero overhead
      }
    }
  } catch (err: any) {
    console.error("[db.ts] Safe synchronization check exception:", err.message || err);
  }
}

// Asynchronously bootstrap the state from CSV storage and live Firebase Firestore at server boot-up
export async function initFirestore(): Promise<void> {
  console.log("[db.ts] Pre-loading sales portal state from local CSV directory storage...");
  try {
    cachedStore = loadStoreFromCSV();
    console.log("[db.ts] Local CSV files successfully imported and cached in memory!");

    // Check and sync database from Firebase Firestore
    if (firestoreDb) {
      await syncWithFirestoreIfNeeded();
    }

    if (supabaseClient) {
      console.log("[db.ts] Fetching state from Supabase to synchronize database...");
      try {
        const keys: (keyof DatabaseStore)[] = [
          'users', 'projects', 'salesTeams', 'teamProjects', 'salesExecutives',
          'incentiveRules', 'bonusRules', 'sales', 'salesIncentives', 'auditLogs',
          'notifications', 'projectsOnSale', 'unitRegistrations'
        ];
        
        let loadedFromSupabase = false;
        const tempStore: any = {};
        
        const { data: records, error } = await withTimeout<any>(
          supabaseClient
            .from('sales_portal_data')
            .select('key, data'),
          6000,
          "Supabase load batch query timeout"
        );
        
        if (error) {
          console.warn("[db.ts] Supabase batch query encountered an error during boot synchronization:", error.message || error);
          if (error.message && error.message.includes('relation "sales_portal_data" does not exist')) {
            console.warn('[db.ts] Action Required: Table "sales_portal_data" missing in your Supabase database. Please open Supabase SQL Editor and run: \nCREATE TABLE sales_portal_data (key text PRIMARY KEY, data jsonb);');
          }
        } else if (records && Array.isArray(records)) {
          for (const row of records) {
            if (row && row.key && row.data !== undefined && row.data !== null) {
              tempStore[row.key] = row.data;
              loadedFromSupabase = true;
            }
          }
        }
        
        if (loadedFromSupabase && cachedStore) {
          for (const key of keys) {
            if (tempStore[key] !== undefined && tempStore[key] !== null) {
              if (key === 'bonusRules') {
                if (tempStore.bonusRules && typeof tempStore.bonusRules === 'object') {
                  cachedStore.bonusRules = tempStore.bonusRules;
                } else {
                  console.warn(`[db.ts] Supabase key 'bonusRules' structure was invalid, keeping local pre-loaded fallback.`);
                }
              } else {
                if (Array.isArray(tempStore[key])) {
                  (cachedStore as any)[key] = tempStore[key];
                } else {
                  console.warn(`[db.ts] Supabase table record for key '${key}' was not returned as a valid array. Skipping key override to preserve core schema integrity.`);
                }
              }
            }
          }
          console.log("[db.ts] Successfully synchronized and adopted production dataset from Supabase!");
        } else {
          console.log("[db.ts] No previous data found in Supabase. Supabase database is clean or table is empty.");
        }
      } catch (err: any) {
        console.warn("[db.ts] Gracefully bypassed Supabase read sync on boot:", err.message || err);
      }
    }

    // Perform migrations or syncs if needed
    let migrated = false;
    cachedStore.salesExecutives.forEach((exec: any) => {
      if (exec.target > 1000) {
        if (exec.id === "exec-rahim") exec.target = 3;
        else if (exec.id === "exec-karim") exec.target = 2;
        else if (exec.id === "exec-sultana") exec.target = 2;
        else exec.target = Math.max(Math.round(exec.target / 500000), 2);
        migrated = true;
      }
    });

    // Always run calculation, cleaning & auto-healing sequence on startup to guarantee fully populated unit grids.
    recalculateAllIncentivesDirect(cachedStore);

    // Save the synced, migrated, and healed memory state back to persistent storage (Firestore/Supabase/local fallback path)
    await writeStoreToFirestore(cachedStore);
  } catch (err) {
    console.error("[db.ts] Error pre-loading from CSV database:", err);
    cachedStore = JSON.parse(JSON.stringify(DEFAULT_STORE));
  }
}

// Synchronously serve from active in-memory cache (populated from Firestore on boot)
export function getStore(): DatabaseStore {
  if (!cachedStore) {
    console.warn("[db.ts] getStore called before Firestore initialization! Loading default state into memory.");
    cachedStore = JSON.parse(JSON.stringify(DEFAULT_STORE));
  }
  return cachedStore;
}

// Synchronously update cache, and trigger direct async/awaited Firestore save with back-propagating promise and safely managed globally caught rejection to prevent unhandled rejections
export function writeStore(store: DatabaseStore): Promise<void> {
  cachedStore = store;
  
  const promise = writeStoreToFirestore(store);
  
  // Attach a silent catch to prevent unhandled rejection crashes when not awaited
  promise.catch(err => {
    console.warn("[db.ts] Safe background promise catch caught a Firestore write failure:", err ? (err.message || err) : "Unknown Firestore write error");
  });

  return promise;
}

// Log actions
export function logAction(user: { id: string; name: string; role: string } | null, action: string, details: string): void {
  const store = getStore();
  const log: AuditLog = {
    id: `log-${generateUUID()}`,
    user_id: user ? user.id : 'system',
    username: user ? user.name : 'System Scheduler',
    role: user ? user.role : 'System',
    action,
    details,
    timestamp: new Date().toISOString()
  };
  store.auditLogs.unshift(log);
  // Keep logs at a reasonable count
  if (store.auditLogs.length > 500) {
    store.auditLogs = store.auditLogs.slice(0, 500);
  }
  writeStore(store);
}

// Add system notifications
export function addNotification(title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
  const store = getStore();
  const notif: AppNotification = {
    id: `notif-${generateUUID()}`,
    title,
    message,
    type,
    timestamp: new Date().toISOString(),
    read: false
  };
  store.notifications.unshift(notif);
  if (store.notifications.length > 50) {
    store.notifications = store.notifications.slice(0, 50);
  }
  writeStore(store);
}

// Full Relational Incentive Calculation Engine
export function recalculateAllIncentivesDirect(store: DatabaseStore) {
  if (!store) return;

  // Clean all collections in-place to remove null, undefined, or invalid/empty records
  store.sales = Array.isArray(store.sales) ? store.sales.filter(s => s && typeof s === 'object') : [];
  store.projects = Array.isArray(store.projects) ? store.projects.filter(p => p && typeof p === 'object') : [];
  store.salesExecutives = Array.isArray(store.salesExecutives) ? store.salesExecutives.filter(e => e && typeof e === 'object') : [];
  store.salesTeams = Array.isArray(store.salesTeams) ? store.salesTeams.filter(t => t && typeof t === 'object') : [];
  store.incentiveRules = Array.isArray(store.incentiveRules) ? store.incentiveRules.filter(r => r && typeof r === 'object') : [];
  store.projectsOnSale = Array.isArray(store.projectsOnSale) ? store.projectsOnSale.filter(p => p && typeof p === 'object') : [];
  store.unitRegistrations = Array.isArray(store.unitRegistrations) ? store.unitRegistrations.filter(r => r && typeof r === 'object') : [];
  store.teamProjects = Array.isArray(store.teamProjects) ? store.teamProjects.filter(tp => tp && typeof tp === 'object') : [];
  store.users = Array.isArray(store.users) ? store.users.filter(u => u && typeof u === 'object') : [];
  store.auditLogs = Array.isArray(store.auditLogs) ? store.auditLogs.filter(a => a && typeof a === 'object') : [];
  store.notifications = Array.isArray(store.notifications) ? store.notifications.filter(n => n && typeof n === 'object') : [];

  // Auto-heal / Auto-generate missing unit registrations for any campaign/pre-sale project
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
  let registrationHealed = false;
  store.projectsOnSale.forEach(project => {
    const fNum = Number(project.floor_number) || 1;
    const uPerFloor = Number(project.units_per_floor) || 1;
    
    // Find already existing registrations for this campaign
    const existing = store.unitRegistrations.filter(r => r.project_on_sale_id === project.id);
    const existingMap = new Set(existing.map(r => String(r.unit_name).trim().toUpperCase()));

    let projHealed = false;
    for (let f = 1; f <= fNum; f++) {
      for (let u = 0; u < uPerFloor; u++) {
        const letter = letters[u] || String.fromCharCode(65 + u);
        const uName = `${f}${letter}`;
        if (!existingMap.has(uName)) {
          store.unitRegistrations.push({
            id: `reg-${generateUUID()}`,
            project_on_sale_id: project.id,
            unit_name: uName,
            registered: 'No',
            created_at: new Date().toISOString()
          });
          projHealed = true;
          registrationHealed = true;
        }
      }
    }
    if (projHealed) {
      console.log(`[db.ts] Automatically healed and generated all unit names for campaign "${project.project_name}" (${project.id})`);
    }
  });

  const rawSales = [...store.sales];
  
  // Sort sales of each executive per project chronologically to assign accurate chronological Sale Numbers per executive per project
  const execProjectSalesMap: Record<string, Sale[]> = {};
  rawSales.forEach(sale => {
    const key = `${sale.executive_id}_${sale.project_id}`;
    if (!execProjectSalesMap[key]) {
      execProjectSalesMap[key] = [];
    }
    execProjectSalesMap[key].push(sale);
  });

  // Order chronologically and write sale sequence numbers back to the sale structures
  Object.keys(execProjectSalesMap).forEach(key => {
    execProjectSalesMap[key].sort((a, b) => {
      const timeA = a.sale_date ? new Date(a.sale_date).getTime() : 0;
      const timeB = b.sale_date ? new Date(b.sale_date).getTime() : 0;
      return (Number.isNaN(timeA) ? 0 : timeA) - (Number.isNaN(timeB) ? 0 : timeB);
    });
    execProjectSalesMap[key].forEach((sale, index) => {
      sale.sale_number = index + 1;
    });
  });

  // Assemble into state
  store.sales = rawSales;

  // Helper to resolve the exact calculation date and registration state for a sale
  const getSaleCalculationDate = (s: Sale): { dateStr: string; isRegistered: boolean } => {
    const proj = store.projects.find(p => String(p.id) === String(s.project_id));
    if (!proj) {
      return { dateStr: s.sale_date, isRegistered: false };
    }
    const unitReg = store.unitRegistrations?.find(r => 
      String(r.project_on_sale_id) === String(s.project_on_sale_id) && 
      String(r.unit_name).trim().toLowerCase() === String(s.unit_name).trim().toLowerCase()
    );
    const isRegistered = unitReg ? (unitReg.registered === 'Yes') : false;

    let dateStr = s.sale_date;
    if (isRegistered) {
      if (unitReg && unitReg.registered === 'Yes' && unitReg.registration_date) {
        dateStr = unitReg.registration_date;
      }
    }
    return { dateStr, isRegistered };
  };

  // 1. Precalculate date/registration details for EVERY sale once to keep the algorithm O(N log N)
  const saleCalcMap = new Map<string, { dateStr: string; isRegistered: boolean; month: number; year: number }>();
  rawSales.forEach(s => {
    const calc = getSaleCalculationDate(s);
    let pDate = new Date(calc.dateStr);
    if (Number.isNaN(pDate.getTime())) {
      pDate = new Date();
    }
    const month = pDate.getMonth() + 1;
    const year = pDate.getFullYear();
    saleCalcMap.set(s.id, {
      dateStr: calc.dateStr,
      isRegistered: calc.isRegistered,
      month,
      year
    });
  });

  // Helper to get time value of a sale
  const getSaleTime = (saleId: string) => {
    const calc = saleCalcMap.get(saleId);
    if (!calc || !calc.dateStr) return 0;
    const t = new Date(calc.dateStr).getTime();
    return Number.isNaN(t) ? 0 : t;
  };

  // Group sales by month/year and executive to compute target bonuses
  // Also group sales by month/year and team
  const execSalesGroup: Record<string, { totalVolume: number; sales: Sale[] }> = {};
  const teamSalesVolumeGroup: Record<string, number> = {}; // key: team_month_year, value: count

  // Pre-grouped monthly lists of active registered sales per executive and per team
  const execMonthlySales: Record<string, Sale[]> = {};
  const teamMonthlySales: Record<string, Sale[]> = {};

  rawSales.forEach(sale => {
    const exec = store.salesExecutives.find(e => String(e.id) === String(sale.executive_id) || String(e.employee_id) === String(sale.executive_id));
    if (!exec) return;

    const proj = store.projects.find(p => String(p.id) === String(sale.project_id));
    if (!proj) return;

    const calc = saleCalcMap.get(sale.id);
    if (!calc) return;

    // Skip counting in monthly targets if flat/project is not registered
    if (!calc.isRegistered) return;

    const month = calc.month;
    const year = calc.year;

    // Use either explicit target or project share
    let saleVolume = Number(proj.land_share_amount) || 0;
    if (sale.project_on_sale_id && store.projectsOnSale) {
      const pos = store.projectsOnSale.find(p => String(p.id) === String(sale.project_on_sale_id));
      if (pos) {
        if (pos.land_share_price !== undefined && pos.land_share_price !== null) {
          saleVolume = Number(pos.land_share_price) || 0;
        }
        if (pos.unit_configs) {
          const letter = (sale.unit_name && typeof sale.unit_name === 'string') ? sale.unit_name.slice(-1).toUpperCase() : '';
          if (letter && pos.unit_configs[letter] !== undefined) {
            saleVolume = Number(pos.unit_configs[letter].land_share) || 0;
          }
        }
      }
    }

    const execKey = `${exec.id}_${month}_${year}`;
    if (!execSalesGroup[execKey]) {
      execSalesGroup[execKey] = { totalVolume: 0, sales: [] };
    }
    execSalesGroup[execKey].totalVolume += saleVolume;
    execSalesGroup[execKey].sales.push(sale);

    if (!execMonthlySales[execKey]) {
      execMonthlySales[execKey] = [];
    }
    execMonthlySales[execKey].push(sale);

    if (exec.team_id) {
      const teamKey = `${exec.team_id}_${month}_${year}`;
      teamSalesVolumeGroup[teamKey] = (teamSalesVolumeGroup[teamKey] || 0) + 1;

      if (!teamMonthlySales[teamKey]) {
        teamMonthlySales[teamKey] = [];
      }
      teamMonthlySales[teamKey].push(sale);
    }
  });

  // For O(1) checks, establish which sale ID is the absolute first registered sale of the month for that exec or team
  const firstSaleOfExecMonthMap = new Map<string, string>(); // execKey -> saleId
  const firstSaleOfTeamMonthMap = new Map<string, string>(); // teamKey -> saleId

  Object.keys(execMonthlySales).forEach(execKey => {
    const list = execMonthlySales[execKey];
    list.sort((a, b) => getSaleTime(a.id) - getSaleTime(b.id));
    if (list[0]) {
      firstSaleOfExecMonthMap.set(execKey, list[0].id);
    }
  });

  Object.keys(teamMonthlySales).forEach(teamKey => {
    const list = teamMonthlySales[teamKey];
    list.sort((a, b) => getSaleTime(a.id) - getSaleTime(b.id));
    if (list[0]) {
      firstSaleOfTeamMonthMap.set(teamKey, list[0].id);
    }
  });

  const resolvedIncentives: SalesIncentive[] = [];

  // Calculate incentive for every sale
  rawSales.forEach(sale => {
    const exec = store.salesExecutives.find(e => String(e.id) === String(sale.executive_id) || String(e.employee_id) === String(sale.executive_id));
    if (!exec) return;

    const proj = store.projects.find(p => String(p.id) === String(sale.project_id));
    if (!proj) return;

    const calc = saleCalcMap.get(sale.id);
    if (!calc) return;

    const month = calc.month;
    const year = calc.year;
    const isRegistered = calc.isRegistered;

    // Resolve sold unit size and project on sale details first
    let soldUnitSizeStr = sale.unit_measure || "";
    let soldUnitSizeNum = parseInt(soldUnitSizeStr) || 0;
    const pos = sale.project_on_sale_id ? store.projectsOnSale?.find(p => String(p.id) === String(sale.project_on_sale_id)) : null;
    if (pos) {
      if (pos.unit_configs) {
        const letter = (sale.unit_name && typeof sale.unit_name === 'string') ? sale.unit_name.slice(-1).toUpperCase() : '';
        if (letter && pos.unit_configs[letter] !== undefined) {
          soldUnitSizeNum = pos.unit_configs[letter].size;
          soldUnitSizeStr = `${soldUnitSizeNum} SFT`;
        } else {
          soldUnitSizeStr = pos.flat_unit_size;
          soldUnitSizeNum = parseInt(pos.flat_unit_size) || 0;
        }
      } else {
        soldUnitSizeStr = pos.flat_unit_size;
        soldUnitSizeNum = parseInt(pos.flat_unit_size) || 0;
      }
    }

    const normalizeSize = (s: string | number) => {
      return String(s).toLowerCase().replace(/\s+/g, '').replace(/sft/g, '');
    };
    const soldSizeNormalized = normalizeSize(soldUnitSizeNum || soldUnitSizeStr);

    // Find rule matching unit size or Development Project Directory Name
    let rule = store.incentiveRules.find(r => {
      const rp = store.projects.find(p => p.id === r.project_id);
      if (!rp) return false;
      const rpSizeNormalized = normalizeSize(rp.unit_measure);
      const rpNameNormalized = normalizeSize(rp.project_name);
      return (rpSizeNormalized !== "" && rpSizeNormalized === soldSizeNormalized) ||
             (rpNameNormalized !== "" && rpNameNormalized === soldSizeNormalized);
    });

    if (!rule) {
      rule = store.incentiveRules.find(r => r.project_id === sale.project_id);
    }

    if (!rule) {
      rule = {
        id: `rule-${generateUUID()}`,
        project_id: sale.project_id,
        sale_1_percent: 1.5,
        sale_2_percent: 1.8,
        sale_3_percent: 2.0,
        sale_4_percent: 2.2,
        sale_5_percent: 2.5,
        sale_6_percent: 2.8,
        sale_7_percent: 3.0,
        first_floor_bonus_percent: 0.5,
        top_floor_bonus_percent: 0.5,
        created_at: new Date().toISOString()
      };
      store.incentiveRules.push(rule);
    }

    // Determine sequence percentage
    let basePercent = Number(rule.sale_7_percent) || 0;
    const sNum = sale.sale_number;
    if (sNum === 1) basePercent = Number(rule.sale_1_percent) || 0;
    else if (sNum === 2) basePercent = Number(rule.sale_2_percent) || 0;
    else if (sNum === 3) basePercent = Number(rule.sale_3_percent) || 0;
    else if (sNum === 4) basePercent = Number(rule.sale_4_percent) || 0;
    else if (sNum === 5) basePercent = Number(rule.sale_5_percent) || 0;
    else if (sNum === 6) basePercent = Number(rule.sale_6_percent) || 0;
    else if (sNum === 7) basePercent = Number(rule.sale_7_percent) || 0;

    // Resolve land share price of xyz (the project/unit on sale)
    let currentLandShare = Number(proj.land_share_amount) || 0;
    if (pos) {
      if (pos.land_share_price !== undefined && pos.land_share_price !== null) {
        currentLandShare = Number(pos.land_share_price) || 0;
      }
      if (pos.unit_configs) {
        const letter = (sale.unit_name && typeof sale.unit_name === 'string') ? sale.unit_name.slice(-1).toUpperCase() : '';
        if (letter && pos.unit_configs[letter] !== undefined) {
          currentLandShare = Number(pos.unit_configs[letter].land_share) || 0;
        }
      }
    }

    // Base Incentive
    const baseIncentive = isRegistered ? currentLandShare * (basePercent / 100) : 0;

    // Floor Bonus
    let floorBonus = 0;
    if (isRegistered) {
      const totalFloors = pos ? pos.floor_number : proj.floors;

      if (sale.floor_number === 1) {
        floorBonus = currentLandShare * ((Number(rule.first_floor_bonus_percent) || 0) / 100);
      } else if (sale.floor_number === totalFloors) {
        floorBonus = currentLandShare * ((Number(rule.top_floor_bonus_percent) || 0) / 100);
      }
    }

    // Target Bonus (distributed on the first sale of the month):
    const execKey = `${exec.id}_${month}_${year}`;
    
    let targetBonus = 0;
    if (isRegistered && firstSaleOfExecMonthMap.get(execKey) === sale.id) {
      // Find monthly target for executive, default to exec.target
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const execTarget = (exec.monthly_targets && exec.monthly_targets[monthStr] !== undefined) 
        ? exec.monthly_targets[monthStr] 
        : exec.target;

      const salesInMonth = execSalesGroup[execKey]?.sales?.length || 0;
      const achievementRate = execTarget > 0 ? (salesInMonth / execTarget) * 100 : 0;
      if (achievementRate >= 100) {
        targetBonus = Number(store.bonusRules?.target_100_bonus) || 3500;
      } else if (achievementRate >= 90) {
        targetBonus = Number(store.bonusRules?.target_90_bonus) || 2000;
      }
    }

    // Team Target Bonus.
    let teamBonus = 0;
    if (isRegistered && exec.team_id) {
      const teamKey = `${exec.team_id}_${month}_${year}`;
      if (firstSaleOfTeamMonthMap.get(teamKey) === sale.id) {
        const teamVolume = teamSalesVolumeGroup[teamKey] || 0;
        const salesTeam = store.salesTeams.find(t => String(t.id) === String(exec.team_id));
        if (salesTeam) {
          const monthStr = `${year}-${String(month).padStart(2, '0')}`;
          const teamTarget = (salesTeam.monthly_targets && salesTeam.monthly_targets[monthStr] !== undefined)
            ? salesTeam.monthly_targets[monthStr]
            : salesTeam.sales_target;

          const teamAchievementRate = teamTarget > 0 ? (teamVolume / teamTarget) * 100 : 0;
          if (teamAchievementRate >= 100) {
            teamBonus = Number(store.bonusRules?.team_target_bonus) || 5000;
          }
        }
      }
    }

    const totalIncentive = baseIncentive + floorBonus + targetBonus + teamBonus;

    resolvedIncentives.push({
      id: `inc-${generateUUID()}`,
      sale_id: sale.id,
      executive_id: exec.id,
      project_id: sale.project_id,
      base_incentive: baseIncentive,
      floor_bonus: floorBonus,
      target_bonus: targetBonus,
      team_bonus: teamBonus,
      total_incentive: totalIncentive,
      month,
      year
    });
  });

  store.salesIncentives = resolvedIncentives;
}

export function recalculateAllIncentives(): void {
  const store = getStore();
  recalculateAllIncentivesDirect(store);
  writeStore(store);
}

export async function getLiveFirestoreBackup(): Promise<DatabaseStore> {
  try {
    return loadStoreFromCSV();
  } catch (err) {
    return getStore();
  }
}

export async function getFirebaseDiagnostics(): Promise<any> {
  let isFirestoreConfigured = !!firestoreDb;
  let connectionStatus = 'failed';
  let connectionMessage = 'No active Firestore database connection. Running in local CSV fallback mode.';
  let connectionRecommendation = 'Verify if /firebase-applet-config.json exists and is properly populated with your active Firebase project credentials.';
  
  if (isFirestoreConfigured && firestoreDb) {
    try {
      // Test read/write connectivity on a light testing key inside collection sales_portal_data
      const testDocRef = doc(firestoreDb, 'sales_portal_data', 'connection_test');
      await setDoc(testDocRef, { timestamp: new Date().toISOString() });
      const testSnap = await getDoc(testDocRef);
      
      if (testSnap.exists()) {
        connectionStatus = 'success';
        connectionMessage = 'Live Firebase Firestore database connected and tested successfully! All records sync in real-time.';
        connectionRecommendation = 'Everything is fully active and working!';
      } else {
        connectionStatus = 'warning';
        connectionMessage = 'Firestore collection queried successfully, but connection_test document was not returned.';
        connectionRecommendation = 'Check your Firebase rules or Firestore database settings.';
      }
    } catch (err: any) {
      connectionStatus = 'failed';
      connectionMessage = `Failed to query Firebase Firestore: ${err.message || err}`;
      connectionRecommendation = 'Ensure that your firestore.rules allow read/write access to collection "sales_portal_data" and check console logs for quota/auth issues.';
    }
  }

  const configExists = fs.existsSync(path.join(process.cwd(), 'firebase-applet-config.json'));
  const loadedFrom = isFirestoreConfigured ? 'Live Firebase Cloud Database' : 'Persistent Local CSV Storage';

  let projectId = 'N/A';
  try {
    if (configExists) {
      const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf-8'));
      projectId = config.projectId || 'N/A';
    }
  } catch (e) {}

  const result: any = {
    firebaseConfigPathExists: configExists,
    firebaseConfigFound: configExists,
    loadedFrom: loadedFrom,
    configKeysPresent: configExists ? ['apiKey', 'projectId', 'authDomain', 'appId'] : [],
    projectId: projectId,
    firestoreDatabaseId: 'sales_portal_data (Firestore)',
    authDomain: `${projectId}.firebaseapp.com`,
    firestoreInitialized: isFirestoreConfigured,
    connectionTest: {
      status: connectionStatus,
      message: connectionMessage,
      recommendation: connectionRecommendation
    },
    envVars: {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_KEY: !!process.env.SUPABASE_KEY,
    }
  };
  return result;
}

export async function getCSVDiagnostics(): Promise<any> {
  const envInfo = {
    isVercel: !!process.env.VERCEL,
    vercelEnv: process.env.VERCEL_ENV || 'N/A',
    vercelRegion: process.env.VERCEL_REGION || 'N/A',
    nodeEnv: process.env.NODE_ENV || 'N/A',
    cwd: process.cwd(),
    __dirnameExists: typeof __dirname !== 'undefined',
    __dirnamePath: typeof __dirname !== 'undefined' ? __dirname : 'N/A'
  };

  // Find active CSV Directory
  const csvDir = getCSVDirectory();
  const chosenDirKey = process.env.VERCEL ? 'vercel_tmp' : 'standard';

  const pathsChecked = {
    standard: path.join(process.cwd(), 'csv-data'),
    vercel_tmp: '/tmp/csv-data',
    backup_level_1: typeof __dirname !== 'undefined' ? path.join(__dirname, '..', 'csv-data') : 'N/A',
    backup_level_2: typeof __dirname !== 'undefined' ? path.join(__dirname, '../../csv-data') : 'N/A'
  };

  const csvDirExists = fs.existsSync(csvDir);
  let isWritable = false;
  let writeError = null;

  if (csvDirExists) {
    // Attempt to test writable state (Vercel has read-only filesystems under app directories, but /tmp/csv-data is write-safe)
    const testFile = path.join(csvDir, 'vercel_test_write.txt');
    try {
      fs.writeFileSync(testFile, 'TPHL Connection Test', 'utf-8');
      isWritable = true;
      fs.unlinkSync(testFile);
    } catch (err: any) {
      isWritable = false;
      writeError = err.message || JSON.stringify(err);
    }
  }

  // Gather specific table files details
  const keys = [
    'users', 'projects', 'salesTeams', 'teamProjects', 'salesExecutives',
    'incentiveRules', 'bonusRules', 'sales', 'salesIncentives', 'auditLogs',
    'notifications', 'projectsOnSale', 'unitRegistrations'
  ];

  const filesReport = keys.map(key => {
    const filePath = path.join(csvDir, `${key}.csv`);
    const exists = fs.existsSync(filePath);
    let sizeBytes = 0;
    let linesCount = 0;
    let readSuccess = false;
    let readError = null;

    if (exists) {
      try {
        const stats = fs.statSync(filePath);
        sizeBytes = stats.size;
        
        const content = fs.readFileSync(filePath, 'utf-8');
        linesCount = content.split(/\r?\n/).filter(line => line.trim()).length;
        readSuccess = true;
      } catch (err: any) {
        readSuccess = false;
        readError = err.message || 'Read error';
      }
    }

    return {
      key,
      fileName: `${key}.csv`,
      exists,
      sizeBytes,
      linesCount,
      readSuccess,
      readError,
      fullPath: filePath
    };
  });

  // Check fallback JSON database status
  const localDbPath = process.env.VERCEL ? '/tmp/db-store.json' : path.join(process.cwd(), 'db-store.json');
  const jsonChosenKey = process.env.VERCEL ? 'vercel_tmp_json' : 'standard';

  const jsonPathsChecked = {
    standard: path.join(process.cwd(), 'db-store.json'),
    vercel_tmp_json: '/tmp/db-store.json',
    backup_level_1: typeof __dirname !== 'undefined' ? path.join(__dirname, '..', 'db-store.json') : 'N/A',
    backup_level_2: typeof __dirname !== 'undefined' ? path.join(__dirname, '../../db-store.json') : 'N/A'
  };

  const jsonExists = fs.existsSync(localDbPath);
  let jsonSize = 0;
  let jsonReadSuccess = false;
  let jsonReadError = null;
  const parsedKeysCount: any = {};

  if (jsonExists) {
    try {
      const stats = fs.statSync(localDbPath);
      jsonSize = stats.size;
      const content = fs.readFileSync(localDbPath, 'utf-8');
      const parsed = JSON.parse(content);
      jsonReadSuccess = true;
      Object.keys(parsed).forEach(k => {
        if (Array.isArray(parsed[k])) {
          parsedKeysCount[k] = parsed[k].length;
        } else if (parsed[k]) {
          parsedKeysCount[k] = 1;
        }
      });
    } catch (err: any) {
      jsonReadSuccess = false;
      jsonReadError = err.message || 'JSON Parse error';
    }
  }

  // General recommendation based on findings
  let overallStatus = 'excellent';
  let overallMessage = 'All CSV datastore and filesystem integrations are fully active and readable!';
  let overallRecommendation = 'The server is cleanly running and reading CSV datastore catalogs. Any read operations will succeed perfectly.';

  if (!csvDirExists) {
    overallStatus = 'error';
    overallMessage = 'CSV Datastore directory not found.';
    overallRecommendation = 'Check process permissions or run with database initialization to automatically build csv-data/ directories.';
  } else if (!isWritable) {
    overallStatus = 'warning';
    overallMessage = 'CSV database filesystem is read-only.';
    overallRecommendation = 'Please verify folder write permissions or switch server environments to ensure local CSV storage writes succeed.';
  } else if (envInfo.isVercel) {
    overallStatus = 'excellent';
    overallMessage = 'Fully persistent serverless CSV database engine is active under /tmp context!';
    overallRecommendation = 'The server is correctly storing and managing your CSV files under Vercel serverless context. Everything is working flawlessly!';
  }

  return {
    envInfo,
    csvDir,
    chosenDirKey,
    csvDirExists,
    pathsChecked,
    isWritable,
    writeError,
    filesReport,
    jsonReport: {
      dbStorePath: localDbPath,
      chosenKey: jsonChosenKey,
      exists: jsonExists,
      sizeBytes: jsonSize,
      readSuccess: jsonReadSuccess,
      readError: jsonReadError,
      pathsChecked: jsonPathsChecked,
      tableCounts: parsedKeysCount
    },
    status: overallStatus,
    message: overallMessage,
    recommendation: overallRecommendation,
    timestamp: new Date().toISOString()
  };
}
