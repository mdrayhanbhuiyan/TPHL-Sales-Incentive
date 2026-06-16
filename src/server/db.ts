

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, setDoc, getDocs, collection } from 'firebase/firestore';

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
}

const DEFAULT_STORE: DatabaseStore = {
  users: [
    {
      id: "u-admin",
      email: "admin@tphl.com",
      name: "TPHL Management",
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
  ]
};

// Global in-memory cache for fast synchronous access
let cachedStore: DatabaseStore | null = null;
let db: any = null;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('[db.ts] Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Initialize Firebase App & Firestore Client Async/Defensively
try {
  let config: any = null;
  const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(firebaseConfigPath)) {
    config = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
  } else if (process.env.FIREBASE_CONFIG) {
    try {
      config = JSON.parse(process.env.FIREBASE_CONFIG);
    } catch (e) {
      console.error("[db.ts] Failed to parse FIREBASE_CONFIG environment variable:", e);
    }
  } else if (process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY) {
    config = {
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
      appId: process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID,
      apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN,
      firestoreDatabaseId: process.env.FIREBASE_FIRESTORE_DATABASE_ID || process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    };
  }

  if (config) {
    if (!config.firestoreDatabaseId) {
      config.firestoreDatabaseId = process.env.FIREBASE_FIRESTORE_DATABASE_ID || process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-68bd67d0-7c65-4254-ae2d-d9f4a64152d6";
    }
    const app = initializeApp(config);
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    }, config.firestoreDatabaseId);
    console.log("[db.ts] Firebase successfully initialized with Firestore Database ID:", config.firestoreDatabaseId);
  } else {
    console.warn("[db.ts] Firebase configuration not found (neither firebase-applet-config.json nor environment variables set). running in offline fallback mode.");
  }
} catch (err) {
  console.error("[db.ts] Failed to initialize Firebase:", err);
}

// Helper to recursively remove all undefined properties from an object so Firestore doesn't reject them
function removeUndefined(obj: any): any {
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

// Firestore Direct Write helper
async function writeStoreToFirestore(store: DatabaseStore): Promise<void> {
  // Always keep local db-store.json synchronized so offline backups are updated instantly
  try {
    const localDbPath = path.join(process.cwd(), 'db-store.json');
    fs.writeFileSync(localDbPath, JSON.stringify(store, null, 2), 'utf-8');
    console.log("[db.ts] Offline backup successfully recorded in local db-store.json");
  } catch (err) {
    // Fail silently on read-only environments (e.g. Vercel deployment)
  }

  if (!db) return;
  try {
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

    const sanitizedStore = removeUndefined(store);

    for (const key of keys) {
      const docRef = doc(db, 'sales_portal_data', key);
      await setDoc(docRef, { data: sanitizedStore[key] !== undefined ? sanitizedStore[key] : [] });
    }
    console.log("[db.ts] Successfully synchronized database state to Firebase Firestore!");
  } catch (err) {
    console.error("[db.ts] Failed to save state to Firebase Firestore:", err);
    handleFirestoreError(err, OperationType.WRITE, 'sales_portal_data');
  }
}

// Asynchronously bootstrap the Firestore state at server boot-up
export async function initFirestore(): Promise<void> {
  const localDbPath = path.join(process.cwd(), 'db-store.json');

  if (!db) {
    console.warn("[db.ts] Firestore is not connected. Attempting local db-store.json data checkout...");
    if (fs.existsSync(localDbPath)) {
      try {
        cachedStore = JSON.parse(fs.readFileSync(localDbPath, 'utf-8'));
        console.log("[db.ts] Successfully checked out existing data from db-store.json!");
      } catch (err) {
        console.error("[db.ts] Failed to parse local db-store.json, creating DEFAULT_STORE fallback:", err);
        cachedStore = JSON.parse(JSON.stringify(DEFAULT_STORE));
      }
    } else {
      cachedStore = JSON.parse(JSON.stringify(DEFAULT_STORE));
    }
    return;
  }

  try {
    console.log("[db.ts] Pre-loading sales portal state from Firebase Firestore...");
    const colRef = collection(db, 'sales_portal_data');
    const snapshot = await getDocs(colRef).catch(err => {
      handleFirestoreError(err, OperationType.GET, 'sales_portal_data');
      throw err;
    });
    
    const dbData: Partial<DatabaseStore> = {};
    snapshot.forEach(docSnap => {
      const id = docSnap.id;
      const docData = docSnap.data();
      if (docData && docData.data !== undefined) {
        dbData[id as keyof DatabaseStore] = docData.data;
      }
    });

    if (dbData.users && dbData.users.length > 0) {
      console.log("[db.ts] Found existing sales portal database in Firebase Firestore!");
      cachedStore = {
        users: dbData.users,
        projects: dbData.projects || [],
        salesTeams: dbData.salesTeams || [],
        teamProjects: dbData.teamProjects || [],
        salesExecutives: dbData.salesExecutives || [],
        incentiveRules: dbData.incentiveRules || [],
        bonusRules: dbData.bonusRules || DEFAULT_STORE.bonusRules,
        sales: dbData.sales || [],
        salesIncentives: dbData.salesIncentives || [],
        auditLogs: dbData.auditLogs || [],
        notifications: dbData.notifications || [],
        projectsOnSale: dbData.projectsOnSale || [],
        unitRegistrations: dbData.unitRegistrations || []
      };

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
      if (migrated) {
        await writeStoreToFirestore(cachedStore);
      }
    } else {
      console.log("[db.ts] Firebase Firestore is empty. Seeding Firestore from local db-store.json if available...");
      if (fs.existsSync(localDbPath)) {
        try {
          cachedStore = JSON.parse(fs.readFileSync(localDbPath, 'utf-8'));
          console.log("[db.ts] Seeding Firestore with active data from local db-store.json...");
        } catch (err) {
          console.error("[db.ts] Failed to parse db-store.json for seeding, using default state:", err);
          cachedStore = JSON.parse(JSON.stringify(DEFAULT_STORE));
        }
      } else {
        cachedStore = JSON.parse(JSON.stringify(DEFAULT_STORE));
      }
      await writeStoreToFirestore(cachedStore);
    }
  } catch (err) {
    console.error("[db.ts] Error pre-loading from Firebase Firestore. Falling back to local offline mode...", err);
    if (fs.existsSync(localDbPath)) {
      try {
        cachedStore = JSON.parse(fs.readFileSync(localDbPath, 'utf-8'));
      } catch (e) {
        cachedStore = JSON.parse(JSON.stringify(DEFAULT_STORE));
      }
    } else {
      cachedStore = JSON.parse(JSON.stringify(DEFAULT_STORE));
    }
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

// Synchronously update cache, and trigger direct async/awaited Firestore save
export function writeStore(store: DatabaseStore): void {
  cachedStore = store;
  
  writeStoreToFirestore(store).catch(err => {
    console.error("[db.ts] Direct save to Firestore failed:", err);
  });
}

// Log actions
export function logAction(user: { id: string; name: string; role: string } | null, action: string, details: string): void {
  const store = getStore();
  const log: AuditLog = {
    id: `log-${crypto.randomUUID()}`,
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
    id: `notif-${crypto.randomUUID()}`,
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

  // Clear previous incentives
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

  const resolvedIncentives: SalesIncentive[] = [];

  // Helper helper to resolve the exact calculation date and registration state for a sale
  const getSaleCalculationDate = (s: Sale): { dateStr: string; isRegistered: boolean } => {
    const proj = store.projects.find(p => p.id === s.project_id);
    if (!proj) {
      return { dateStr: s.sale_date, isRegistered: false };
    }
    const unitReg = store.unitRegistrations?.find(r => r.project_on_sale_id === s.project_on_sale_id && r.unit_name === s.unit_name);
    const isRegistered = unitReg ? (unitReg.registered === 'Yes') : false;

    let dateStr = s.sale_date;
    if (isRegistered) {
      if (unitReg && unitReg.registered === 'Yes' && unitReg.registration_date) {
        dateStr = unitReg.registration_date;
      }
    }
    return { dateStr, isRegistered };
  };

  // Group sales by month/year and executive to compute target bonuses
  // Also group sales by month/year and team
  const execSalesGroup: Record<string, { totalVolume: number; sales: Sale[] }> = {};
  const teamSalesVolumeGroup: Record<string, number> = {}; // key: group_team_month_year, value: sum bdt

  rawSales.forEach(sale => {
    // Find Executive
    const exec = store.salesExecutives.find(e => e.id === sale.executive_id || e.employee_id === sale.executive_id);
    if (!exec) return;

    // Project
    const proj = store.projects.find(p => p.id === sale.project_id);
    if (!proj) return;

    // Use getSaleCalculationDate helper
    const calc = getSaleCalculationDate(sale);

    // Skip counting in monthly targets if flat/project is not registered
    if (!calc.isRegistered) return;

    const pDate = new Date(calc.dateStr);
    const month = pDate.getMonth() + 1;
    const year = pDate.getFullYear();

    // Use either explicit target or project share
    let saleVolume = proj.land_share_amount;
    if (sale.project_on_sale_id && store.projectsOnSale) {
      const pos = store.projectsOnSale.find(p => p.id === sale.project_on_sale_id);
      if (pos) {
        if (pos.land_share_price !== undefined && pos.land_share_price !== null) {
          saleVolume = pos.land_share_price;
        }
        if (pos.unit_configs) {
          const letter = (sale.unit_name && typeof sale.unit_name === 'string') ? sale.unit_name.slice(-1).toUpperCase() : '';
          if (letter && pos.unit_configs[letter] !== undefined) {
            saleVolume = pos.unit_configs[letter].land_share;
          }
        }
      }
    }

    const key = `${exec.id}_${month}_${year}`;
    if (!execSalesGroup[key]) {
      execSalesGroup[key] = { totalVolume: 0, sales: [] };
    }
    execSalesGroup[key].totalVolume += saleVolume;
    execSalesGroup[key].sales.push(sale);

    // Add to Team Grouping (counting flats/units instead of volume sum)
    if (exec.team_id) {
      const teamKey = `${exec.team_id}_${month}_${year}`;
      teamSalesVolumeGroup[teamKey] = (teamSalesVolumeGroup[teamKey] || 0) + 1;
    }
  });

  // Calculate incentive for every sale
  rawSales.forEach(sale => {
    // Resolve Executive
    const exec = store.salesExecutives.find(e => e.id === sale.executive_id || e.employee_id === sale.executive_id);
    if (!exec) return;

    // Project
    const proj = store.projects.find(p => p.id === sale.project_id);
    if (!proj) return;

    // Resolve calculation date details
    const calc = getSaleCalculationDate(sale);
    const pDate = new Date(calc.dateStr);
    const month = pDate.getMonth() + 1;
    const year = pDate.getFullYear();
    const isRegistered = calc.isRegistered;

    // Resolve sold unit size and project on sale details first
    let soldUnitSizeStr = sale.unit_measure || "";
    let soldUnitSizeNum = parseInt(soldUnitSizeStr) || 0;
    const pos = sale.project_on_sale_id ? store.projectsOnSale?.find(p => p.id === sale.project_on_sale_id) : null;
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
        id: `rule-${crypto.randomUUID()}`,
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
    let basePercent = rule.sale_7_percent; // default for 7+
    const sNum = sale.sale_number;
    if (sNum === 1) basePercent = rule.sale_1_percent;
    else if (sNum === 2) basePercent = rule.sale_2_percent;
    else if (sNum === 3) basePercent = rule.sale_3_percent;
    else if (sNum === 4) basePercent = rule.sale_4_percent;
    else if (sNum === 5) basePercent = rule.sale_5_percent;
    else if (sNum === 6) basePercent = rule.sale_6_percent;
    else if (sNum === 7) basePercent = rule.sale_7_percent;

    // Resolve land share price of xyz (the project/unit on sale)
    let currentLandShare = proj.land_share_amount;
    if (pos) {
      if (pos.land_share_price !== undefined && pos.land_share_price !== null) {
        currentLandShare = pos.land_share_price;
      }
      if (pos.unit_configs) {
        const letter = (sale.unit_name && typeof sale.unit_name === 'string') ? sale.unit_name.slice(-1).toUpperCase() : '';
        if (letter && pos.unit_configs[letter] !== undefined) {
          currentLandShare = pos.unit_configs[letter].land_share;
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
        floorBonus = currentLandShare * (rule.first_floor_bonus_percent / 100);
      } else if (sale.floor_number === totalFloors) {
        floorBonus = currentLandShare * (rule.top_floor_bonus_percent / 100);
      }
    }

    // Target Bonus (distributed on the first sale of the month):
    const execKey = `${exec.id}_${month}_${year}`;
    const monthlyExecStats = execSalesGroup[execKey];
    
    let targetBonus = 0;
    if (isRegistered && monthlyExecStats) {
      // Find monthly target for executive, default to exec.target
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const execTarget = (exec.monthly_targets && exec.monthly_targets[monthStr] !== undefined) 
        ? exec.monthly_targets[monthStr] 
        : exec.target;

      // Evaluate based on flat count instead of BDT volume sum
      const achievementRate = execTarget > 0 ? (monthlyExecStats.sales.length / execTarget) * 100 : 0;
      const sortedMonthSales = [...monthlyExecStats.sales].sort((a,b) => {
        const calcA = getSaleCalculationDate(a);
        const calcB = getSaleCalculationDate(b);
        return new Date(calcA.dateStr).getTime() - new Date(calcB.dateStr).getTime();
      });
      if (sortedMonthSales[0] && sortedMonthSales[0].id === sale.id) {
        if (achievementRate >= 100) {
          targetBonus = store.bonusRules.target_100_bonus;
        } else if (achievementRate >= 90) {
          targetBonus = store.bonusRules.target_90_bonus;
        }
      }
    }

    // Team Target Bonus.
    let teamBonus = 0;
    if (isRegistered && exec.team_id) {
      const teamKey = `${exec.team_id}_${month}_${year}`;
      const teamVolume = teamSalesVolumeGroup[teamKey] || 0;
      const salesTeam = store.salesTeams.find(t => t.id === exec.team_id);
      if (salesTeam) {
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        const teamTarget = (salesTeam.monthly_targets && salesTeam.monthly_targets[monthStr] !== undefined)
          ? salesTeam.monthly_targets[monthStr]
          : salesTeam.sales_target;

        const teamAchievementRate = teamTarget > 0 ? (teamVolume / teamTarget) * 100 : 0;
        if (teamAchievementRate >= 100) {
          const teamExecsIds = store.salesExecutives.filter(e => e.team_id === exec.team_id).map(e => e.id);
          const teamMonthSales = store.sales.filter(s => {
            const sCalc = getSaleCalculationDate(s);
            if (!sCalc.isRegistered) return false;
            const sDate = new Date(sCalc.dateStr);
            return (sDate.getMonth() + 1 === month) && 
                   (sDate.getFullYear() === year) && 
                   teamExecsIds.includes(s.executive_id);
          }).sort((a, b) => {
            const calcA = getSaleCalculationDate(a);
            const calcB = getSaleCalculationDate(b);
            return new Date(calcA.dateStr).getTime() - new Date(calcB.dateStr).getTime();
          });

          if (teamMonthSales[0] && teamMonthSales[0].id === sale.id) {
            teamBonus = store.bonusRules.team_target_bonus;
          }
        }
      }
    }

    const totalIncentive = baseIncentive + floorBonus + targetBonus + teamBonus;

    resolvedIncentives.push({
      id: `inc-${crypto.randomUUID()}`,
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
  const localDbPath = path.join(process.cwd(), 'db-store.json');
  if (!db) {
    if (fs.existsSync(localDbPath)) {
      try {
        return JSON.parse(fs.readFileSync(localDbPath, 'utf-8'));
      } catch (err) {
        // Fallback below
      }
    }
    return getStore();
  }

  try {
    console.log("[db.ts] Fetching raw live backup from Firebase Firestore directly...");
    const colRef = collection(db, 'sales_portal_data');
    const snapshot = await getDocs(colRef).catch(err => {
      handleFirestoreError(err, OperationType.GET, 'sales_portal_data');
      throw err;
    });
    
    const dbData: Partial<DatabaseStore> = {};
    snapshot.forEach(docSnap => {
      const id = docSnap.id;
      const docData = docSnap.data();
      if (docData && docData.data !== undefined) {
        dbData[id as keyof DatabaseStore] = docData.data;
      }
    });

    if (dbData.users && dbData.users.length > 0) {
      return {
        users: dbData.users,
        projects: dbData.projects || [],
        salesTeams: dbData.salesTeams || [],
        teamProjects: dbData.teamProjects || [],
        salesExecutives: dbData.salesExecutives || [],
        incentiveRules: dbData.incentiveRules || [],
        bonusRules: dbData.bonusRules || DEFAULT_STORE.bonusRules,
        sales: dbData.sales || [],
        salesIncentives: dbData.salesIncentives || [],
        auditLogs: dbData.auditLogs || [],
        notifications: dbData.notifications || [],
        projectsOnSale: dbData.projectsOnSale || [],
        unitRegistrations: dbData.unitRegistrations || []
      };
    } else {
      return getStore();
    }
  } catch (err) {
    console.error("[db.ts] Failed to fetch live backup from Firestore directly, falling back to local store:", err);
    return getStore();
  }
}
