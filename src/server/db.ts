/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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

const STORE_PATH = path.join(process.cwd(), 'db-store.json');

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

// Initialize or read the store
export function getStore(): DatabaseStore {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      writeStore(DEFAULT_STORE);
      recalculateAllIncentivesDirect(DEFAULT_STORE);
      return DEFAULT_STORE;
    }
    const data = fs.readFileSync(STORE_PATH, 'utf-8');
    const store = JSON.parse(data);
    
    // Ensure all required collections exist
    if (!store.users) store.users = [];
    if (!store.projects) store.projects = [];
    if (!store.salesTeams) store.salesTeams = [];
    if (!store.teamProjects) store.teamProjects = [];
    if (!store.salesExecutives) store.salesExecutives = [];
    if (!store.incentiveRules) store.incentiveRules = [];
    if (!store.bonusRules) store.bonusRules = DEFAULT_STORE.bonusRules;
    if (!store.sales) store.sales = [];
    if (!store.salesIncentives) store.salesIncentives = [];
    if (!store.auditLogs) store.auditLogs = [];
    if (!store.notifications) store.notifications = [];
    if (!store.projectsOnSale) store.projectsOnSale = [];
    if (!store.unitRegistrations) store.unitRegistrations = [];
    
    // Migration: safety conversion of executive targets from BDT values to physical unit numbers
    let migrated = false;
    store.salesExecutives.forEach((exec: any) => {
      if (exec.target > 1000) {
        if (exec.id === "exec-rahim") exec.target = 3;
        else if (exec.id === "exec-karim") exec.target = 2;
        else if (exec.id === "exec-sultana") exec.target = 2;
        else exec.target = Math.max(Math.round(exec.target / 500000), 2);
        migrated = true;
      }
    });
    
    // Recalculate just in case or if migrated
    if (migrated || (store.salesIncentives.length === 0 && store.sales.length > 0)) {
      recalculateAllIncentivesDirect(store);
      if (migrated) {
        writeStore(store);
      }
    }
    return store;
  } catch (err) {
    console.error("Failed to read database store:", err);
    return DEFAULT_STORE;
  }
}

export function writeStore(store: DatabaseStore): void {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error("Failed to write to database store:", err);
  }
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
    execProjectSalesMap[key].sort((a, b) => new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime());
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
    const isRegistered = unitReg ? (unitReg.registered === 'Yes') : (proj.registration !== 'No');

    let dateStr = s.sale_date;
    if (isRegistered) {
      if (unitReg && unitReg.registered === 'Yes' && unitReg.registration_date) {
        dateStr = unitReg.registration_date;
      } else if (proj.registration === 'Yes' && proj.first_sale_date) {
        dateStr = proj.first_sale_date;
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
    const saleVolume = proj.land_share_amount; 

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

    // Find rule for this project. If none exists, create a default ruleset.
    let rule = store.incentiveRules.find(r => r.project_id === sale.project_id);
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

    // Base Incentive
    const baseIncentive = isRegistered ? proj.land_share_amount * (basePercent / 100) : 0;

    // Floor Bonus
    let floorBonus = 0;
    if (isRegistered) {
      const pos = sale.project_on_sale_id ? store.projectsOnSale?.find(p => p.id === sale.project_on_sale_id) : null;
      const totalFloors = pos ? pos.floor_number : proj.floors;

      if (sale.floor_number === 1) {
        floorBonus = proj.land_share_amount * (rule.first_floor_bonus_percent / 100);
      } else if (sale.floor_number === totalFloors) {
        floorBonus = proj.land_share_amount * (rule.top_floor_bonus_percent / 100);
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
