/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { 
  getStore, 
  writeStore, 
  logAction, 
  addNotification, 
  recalculateAllIncentives,
  recalculateAllIncentivesDirect,
  initFirestore,
  getLiveFirestoreBackup,
  DatabaseStore
} from './src/server/db';
import { 
  User, 
  Project, 
  SalesTeam, 
  SalesExecutive, 
  IncentiveRule, 
  Sale 
} from './src/types';

export function getSaleVolume(sale: any, store: DatabaseStore): number {
  if (!sale || typeof sale !== 'object' || !store || !Array.isArray(store.projects)) return 0;
  const proj = store.projects.find(p => p && p.id === sale.project_id);
  let saleVolume = proj ? (Number(proj.land_share_amount) || 0) : 0;
  if (sale.project_on_sale_id && Array.isArray(store.projectsOnSale)) {
    const pos = store.projectsOnSale.find(p => p && p.id === sale.project_on_sale_id);
    if (pos) {
      if (pos.land_share_price !== undefined && pos.land_share_price !== null) {
        saleVolume = Number(pos.land_share_price) || 0;
      }
      if (pos.unit_configs) {
        const letter = (sale.unit_name && typeof sale.unit_name === 'string') ? sale.unit_name.slice(-1).toUpperCase() : '';
        if (letter && pos.unit_configs[letter] !== undefined && pos.unit_configs[letter] !== null) {
          saleVolume = Number(pos.unit_configs[letter].land_share) || 0;
        }
      }
    }
  }
  return saleVolume;
}

export async function startServer() {
  // Initialize and synchronise the in-memory cache with Firebase Firestore state on startup
  await initFirestore();

  const app = express();
  const PORT = 3000;

  // JSON Body Parser
  app.use(express.json({ limit: '10mb' }));

  // Helper middleware for custom Token authentication (mimicking JWT Bearer)
  const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      res.status(401).json({ error: "Access denied. Auth token missing." });
      return;
    }

    const store = getStore();
    // In our JWT-mimic token system, the token is simply the user's ID
    const user = store.users.find(u => u.id === token);
    if (!user) {
      res.status(403).json({ error: "Invalid token or session expired." });
      return;
    }

    // Attach user to request
    (req as any).user = user;
    next();
  };

  // --- AUTHENTICATION API ---
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const store = getStore();
    const user = store.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // Checking seeded passwords
    let isValid = false;
    if (email === "admin@tphl.com" && password === "admin123") isValid = true;
    else if (email === "leader@tphl.com" && password === "leader123") isValid = true;
    else if (email === "executive@tphl.com" && password === "executive123") isValid = true;
    else if (password === "password123") isValid = true; // Fallback for newly created demo users

    if (!isValid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    logAction(user, "User Login", `Logged in successfully via JWT-mimic token.`);
    res.json({
      token: user.id, // User ID functions as our secure JWT-mimic token
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        employee_id: user.employee_id,
        team_id: user.team_id
      }
    });
  });

  // Get currently logged-in user profile
  app.get('/api/auth/me', authenticateToken, (req, res) => {
    res.json({ user: (req as any).user });
  });

  // --- ANALYTICS & DASHBOARD API ---
  app.get('/api/dashboard/analytics', authenticateToken, (req, res) => {
    const store = getStore();
    const curUser = (req as any).user as User;

    let targetSales = [...store.sales];
    let targetIncentives = [...store.salesIncentives];
    let targetExecutives = [...store.salesExecutives];
    let targetTeams = [...store.salesTeams];

    // Role-Based Analytics Filtering:
    // Team Leader sees only their own Team
    if (curUser.role === 'Sales Team Leader') {
      const leaderTeam = store.salesTeams.find(t => t.team_leader === curUser.name || t.id === curUser.team_id);
      if (leaderTeam) {
        const teamExecs = store.salesExecutives.filter(e => e.team_id === leaderTeam.id);
        const teamExecIds = teamExecs.map(e => e.id);
        
        targetSales = store.sales.filter(s => teamExecIds.includes(s.executive_id));
        targetIncentives = store.salesIncentives.filter(si => teamExecIds.includes(si.executive_id));
        targetExecutives = teamExecs;
        targetTeams = [leaderTeam];
      }
    } 
    // Sales Executive sees only their own data
    else if (curUser.role === 'Sales Executive') {
      const exec = store.salesExecutives.find(e => e.employee_id === curUser.employee_id || e.id === curUser.id);
      if (exec) {
        targetSales = store.sales.filter(s => s.executive_id === exec.id);
        targetIncentives = store.salesIncentives.filter(si => si.executive_id === exec.id);
        targetExecutives = [exec];
        targetTeams = [];
      } else {
        targetSales = [];
        targetIncentives = [];
        targetExecutives = [];
        targetTeams = [];
      }
    }

    // Calculations of top card items
    const totalSalesCount = targetSales.length; 
    const activeProjectsCount = store.projects.filter(p => p.status === 'Active').length;
    const totalTeamsCount = targetTeams.length || store.salesTeams.length;
    const totalExecutivesCount = targetExecutives.length;

    // Total Incentive
    const totalIncentivePaid = targetIncentives.reduce((sum, item) => sum + item.total_incentive, 0);
    // Base Incentive vs Bonus Breakdown
    const totalBaseIncentive = targetIncentives.reduce((sum, item) => sum + item.base_incentive, 0);
    const totalBonuses = targetIncentives.reduce((sum, item) => sum + item.floor_bonus + item.target_bonus + item.team_bonus, 0);

    // Dynamic Top Stats
    // 1. Top Seller (Executive with highest sales volume based on flat-wise share values)
    const execSalesMap: Record<string, { name: string; count: number; volume: number }> = {};
    targetSales.forEach(sale => {
      const exec = store.salesExecutives.find(e => e.id === sale.executive_id);
      const proj = store.projects.find(p => p.id === sale.project_id);
      if (!exec || !proj) return;
      if (!execSalesMap[exec.id]) {
        execSalesMap[exec.id] = { name: exec.name, count: 0, volume: 0 };
      }
      execSalesMap[exec.id].count += 1;
      execSalesMap[exec.id].volume += getSaleVolume(sale, store);
    });

    let topSeller = "None";
    let topSellerVal = 0;
    Object.values(execSalesMap).forEach(item => {
      if (item.volume > topSellerVal) {
        topSellerVal = item.volume;
        topSeller = `${item.name} (${item.count} Sales)`;
      }
    });

    // 2. Top Incentive Earner
    const execIncentiveMap: Record<string, { name: string; total: number }> = {};
    targetIncentives.forEach(inc => {
      const exec = store.salesExecutives.find(e => e.id === inc.executive_id);
      if (!exec) return;
      if (!execIncentiveMap[exec.id]) {
        execIncentiveMap[exec.id] = { name: exec.name, total: 0 };
      }
      execIncentiveMap[exec.id].total += inc.total_incentive;
    });

    let topEarner = "None";
    let topEarnerVal = 0;
    Object.values(execIncentiveMap).forEach(item => {
      if (item.total > topEarnerVal) {
        topEarnerVal = item.total;
        topEarner = `${item.name} (${item.total.toLocaleString()} BDT)`;
      }
    });

    // 3. Highest Incentive Project
    const projIncentiveMap: Record<string, { name: string; total: number }> = {};
    targetIncentives.forEach(inc => {
      const proj = store.projects.find(p => p.id === inc.project_id);
      if (!proj) return;
      if (!projIncentiveMap[proj.id]) {
        projIncentiveMap[proj.id] = { name: proj.project_name, total: 0 };
      }
      projIncentiveMap[proj.id].total += inc.total_incentive;
    });

    let topProject = "None";
    let topProjectVal = 0;
    Object.values(projIncentiveMap).forEach(item => {
      if (item.total > topProjectVal) {
        topProjectVal = item.total;
        topProject = `${item.name} (${item.total.toLocaleString()} BDT)`;
      }
    });

    // 4. Top Sales Team & Team Incentive
    const teamIncentivesMap: Record<string, { name: string; total: number }> = {};
    targetIncentives.forEach(inc => {
      const exec = store.salesExecutives.find(e => e.id === inc.executive_id);
      if (!exec || !exec.team_id) return;
      const team = store.salesTeams.find(t => t.id === exec.team_id);
      if (!team) return;
      if (!teamIncentivesMap[team.id]) {
        teamIncentivesMap[team.id] = { name: team.team_name, total: 0 };
      }
      teamIncentivesMap[team.id].total += inc.total_incentive;
    });

    let topTeam = "None";
    let topTeamVal = 0;
    Object.values(teamIncentivesMap).forEach(item => {
      if (item.total > topTeamVal) {
        topTeamVal = item.total;
        topTeam = `${item.name} (${item.total.toLocaleString()} BDT)`;
      }
    });

    // Target Achievement Summary (Monthly)
    // Find rates of executive target achievements based on the latest logged sale month, or default to current month
    let testMonth = new Date().getMonth() + 1;
    let testYear = new Date().getFullYear();

    if (targetSales.length > 0) {
      const sortedSales = [...targetSales].sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());
      const latestDate = new Date(sortedSales[0].sale_date);
      if (!isNaN(latestDate.getTime())) {
        testMonth = latestDate.getMonth() + 1;
        testYear = latestDate.getFullYear();
      }
    }

    const monthsName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const periodName = `${monthsName[testMonth - 1] || "Latest Month"} ${testYear}`;

    const execAchievementRates = targetExecutives.map(exec => {
      const filtered = targetSales.filter(s => {
        const d = new Date(s.sale_date);
        return s.executive_id === exec.id && (d.getMonth() + 1 === testMonth) && d.getFullYear() === testYear;
      });
      // Count flats sold
      const countFlats = filtered.length;

      const percent = exec.target > 0 ? (countFlats / exec.target) * 100 : 0;

      // Group current month sales into weeks of the month for visual heat map densities
      let w1 = 0, w2 = 0, w3 = 0, w4 = 0, w5 = 0;
      let totalVolumeBDT = 0;

      filtered.forEach(sale => {
        const d = new Date(sale.sale_date);
        const day = d.getDate();
        
        totalVolumeBDT += getSaleVolume(sale, store);

        if (day <= 7) w1++;
        else if (day <= 14) w2++;
        else if (day <= 21) w3++;
        else if (day <= 28) w4++;
        else w5++;
      });

      // Find incentives earned for this executive in the same month/year
      const monthlyIncs = targetIncentives.filter(si => si.executive_id === exec.id && si.month === testMonth && si.year === testYear);
      const totalIncentiveBDT = monthlyIncs.reduce((sum, item) => sum + item.total_incentive, 0);
      const milestoneBonusBDT = monthlyIncs.reduce((sum, item) => sum + (item.floor_bonus + item.target_bonus + item.team_bonus), 0);

      return {
        id: exec.id,
        name: exec.name,
        target: exec.target,
        achieved: countFlats,
        percentage: percent,
        totalVolumeBDT,
        totalIncentiveBDT,
        milestoneBonusBDT,
        weeksCount: [w1, w2, w3, w4, w5]
      };
    });

    // Timeline datasets for Charts (Timeline by Month)
    // Group monthly timeline: April, May, June 2026
    const monthlySeries: Record<string, { monthName: string; sales: number; incentive: number; count: number }> = {};
    
    // Default months to show
    const defaultMonths = [4, 5, 6]; // Apr, May, Jun
    defaultMonths.forEach(m => {
      const key = `2026-${m}`;
      monthlySeries[key] = {
        monthName: `${monthsName[m-1]} 2026`,
        sales: 0,
        incentive: 0,
        count: 0
      };
    });

    targetSales.forEach(sale => {
      const pDate = new Date(sale.sale_date);
      const m = pDate.getMonth() + 1;
      const y = pDate.getFullYear();
      const key = `${y}-${m}`;
      
      const saleVal = getSaleVolume(sale, store);

      if (!monthlySeries[key]) {
        monthlySeries[key] = {
          monthName: `${monthsName[m-1]} ${y}`,
          sales: 0,
          incentive: 0,
          count: 0
        };
      }
      monthlySeries[key].sales += saleVal;
      monthlySeries[key].count += 1;
    });

    targetIncentives.forEach(inc => {
      const key = `${inc.year}-${inc.month}`;
      if (monthlySeries[key]) {
        monthlySeries[key].incentive += inc.total_incentive;
      }
    });

    const chartTimeline = Object.entries(monthlySeries)
      .map(([key, val]) => ({
        key,
        ...val
      }))
      .sort((a, b) => {
        const [yA, mA] = a.key.split('-').map(Number);
        const [yB, mB] = b.key.split('-').map(Number);
        return yA !== yB ? yA - yB : mA - mB;
      });

    // Project Wise Sales chart
    const projectSalesChartList = store.projects.map(proj => {
      const projSales = targetSales.filter(s => s.project_id === proj.id);
      const projSalesVal = projSales.reduce((sum, s) => sum + getSaleVolume(s, store), 0);

      // Group executive contributions
      const execContributionsMap: Record<string, { id: string; name: string; employee_id: string; count: number; salesVal: number }> = {};
      projSales.forEach(s => {
        const exec = store.salesExecutives.find(e => e.id === s.executive_id);
        if (!exec) return;
        if (!execContributionsMap[exec.id]) {
          execContributionsMap[exec.id] = { id: exec.id, name: exec.name, employee_id: exec.employee_id, count: 0, salesVal: 0 };
        }
        execContributionsMap[exec.id].count += 1;
        execContributionsMap[exec.id].salesVal += getSaleVolume(s, store);
      });
      const execContributions = Object.values(execContributionsMap);

      // Status splits
      const totalUnits = proj.total_flats || proj.units || 10;
      const soldUnits = projSales.length;
      const remainingUnits = Math.max(totalUnits - soldUnits, 0);

      const soldUnitsList = projSales.map(s => {
        const exec = store.salesExecutives.find(e => e.id === s.executive_id);
        return {
          id: s.id,
          unit_name: s.unit_name,
          floor_number: s.floor_number,
          sale_date: s.sale_date,
          executive_name: exec ? exec.name : 'Unknown'
        };
      });

      return {
        id: proj.id,
        name: proj.project_name,
        location: proj.location,
        sales: projSalesVal,
        count: projSales.length,
        totalUnits,
        soldUnits,
        remainingUnits,
        execContributions,
        soldUnitsList,
        registration: proj.registration || 'Yes'
      };
    });

    // Team Wise Incentive chart
    const teamIncentiveChartList = (targetTeams.length ? targetTeams : store.salesTeams).map(team => {
      const execIds = store.salesExecutives.filter(e => e.team_id === team.id).map(e => e.id);
      const teamIncs = targetIncentives.filter(si => execIds.includes(si.executive_id));
      const teamIncTotal = teamIncs.reduce((sum, item) => sum + item.total_incentive, 0);
      return {
        id: team.id,
        name: team.team_name,
        incentive: teamIncTotal
      };
    });

    // Generate Activity Timeline
    const activities: any[] = [];

    // 1. Sales entries
    targetSales.forEach(sale => {
      const proj = store.projects.find(p => p.id === sale.project_id);
      const exec = store.salesExecutives.find(e => e.id === sale.executive_id);
      activities.push({
        id: `activity-sale-${sale.id}`,
        type: 'sale',
        date: sale.sale_date,
        title: `Booking Logged: Unit ${sale.unit_name}`,
        description: `Flat ${sale.unit_name} at Level ${sale.floor_number} of "${proj ? proj.project_name : 'Property'}" registered under Sequenced Sale #${sale.sale_number || 1} by Executive ${exec ? exec.name : 'Unknown'}${sale.buyer_name ? ` (Buyer: ${sale.buyer_name})` : ''}.`,
        metadata: proj ? `${(proj.land_share_amount / 100000).toFixed(1)} Lakh BDT` : '',
        timestamp: new Date(sale.sale_date).getTime()
      });
    });

    // 2. Milestone Achievements from Incentives
    targetIncentives.forEach(inc => {
      const sale = store.sales.find(s => s.id === inc.sale_id);
      if (!sale) return;
      const proj = store.projects.find(p => p.id === inc.project_id);
      const exec = store.salesExecutives.find(e => e.id === inc.executive_id);
      const projName = proj ? proj.project_name : 'Project';
      const execName = exec ? exec.name : 'Executive';

      if (inc.floor_bonus > 0) {
        activities.push({
          id: `activity-milestone-fb-${inc.id}`,
          type: 'milestone',
          date: sale.sale_date,
          title: `Floor Level Premium Unlocked 🏢`,
          description: `Executive ${execName} unlocked a dedicated level bonus on Flat ${sale.unit_name} at floor ${sale.floor_number} in "${projName}".`,
          metadata: `+${inc.floor_bonus.toLocaleString()} BDT`,
          timestamp: new Date(sale.sale_date).getTime() + 10
        });
      }

      if (inc.target_bonus > 0) {
        activities.push({
          id: `activity-milestone-tb-${inc.id}`,
          type: 'milestone',
          date: sale.sale_date,
          title: `Sales Target Bonus Cleared 🎯`,
          description: `Executive ${execName} hit individual units threshold, triggering high-performance commission multiplier.`,
          metadata: `+${inc.target_bonus.toLocaleString()} BDT`,
          timestamp: new Date(sale.sale_date).getTime() + 20
        });
      }

      if (inc.team_bonus > 0) {
        const team = exec && exec.team_id ? store.salesTeams.find(t => t.id === exec.team_id) : null;
        activities.push({
          id: `activity-milestone-teamb-${inc.id}`,
          type: 'milestone',
          date: sale.sale_date,
          title: `Team Bonus Achieved 👥`,
          description: `Sales team "${team ? team.team_name : 'Assigned Team'}" achieved monthly collection milestone, earning bonus for ${execName}.`,
          metadata: `+${inc.team_bonus.toLocaleString()} BDT`,
          timestamp: new Date(sale.sale_date).getTime() + 30
        });
      }
    });

    // 3. New Project registrations (Directory Projects & Campaigns)
    store.projects.forEach(proj => {
      const dateStr = proj.first_sale_date || '2026-06-01';
      activities.push({
        id: `activity-proj-${proj.id}`,
        type: 'project',
        date: dateStr,
        title: `Property Registered: ${proj.project_name}`,
        description: `New directory property listed in "${proj.location}", with configured land share value of ${(proj.land_share_amount).toLocaleString()} BDT.`,
        metadata: 'Directory Registry',
        timestamp: new Date(dateStr).getTime()
      });
    });

    if (store.projectsOnSale) {
      store.projectsOnSale.forEach(pos => {
        const dateStr = pos.created_at ? pos.created_at.substring(0, 10) : '2026-06-01';
        activities.push({
          id: `activity-pos-${pos.id}`,
          type: 'project',
          date: dateStr,
          title: `Campaign Registered: ${pos.project_name}`,
          description: `New active campaign created linking project identifier "${pos.project_id}" to ${pos.total_units} catalog listings across ${pos.floor_number} floors.`,
          metadata: `${pos.total_units} Units`,
          timestamp: new Date(dateStr).getTime() + 5
        });
      });
    }

    // Sort by timestamp descending
    const sortedActivities = activities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20); // Keep top 20 recent records

    res.json({
      cards: {
        totalSales: totalSalesCount,
        totalSalesValue: targetSales.reduce((sum, s) => sum + getSaleVolume(s, store), 0),
        totalIncentivePaid,
        totalBaseIncentive,
        totalBonuses,
        totalTeamsCount,
        totalExecutivesCount,
        activeProjectsCount
      },
      tops: {
        topSeller,
        topSellerVal,
        topEarner,
        topEarnerVal,
        topProject,
        topProjectVal,
        topTeam,
        topTeamVal
      },
      charts: {
        timeline: chartTimeline,
        projects: projectSalesChartList,
        teams: teamIncentiveChartList
      },
      execAchievements: execAchievementRates,
      execAchievementsPeriod: periodName,
      timelineActivities: sortedActivities,
      bonusRules: store.bonusRules
    });
  });

  // --- PROJECT MANAGEMENT API ---
  app.get('/api/projects', authenticateToken, (req, res) => {
    const store = getStore();
    res.json(store.projects);
  });

  app.post('/api/projects', authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'Admin') {
      res.status(403).json({ error: "Only Admins can managed projects." });
      return;
    }

    const { project_name, location, unit_measure, floors, units, total_flats, land_share_amount, first_sale_date, status, registration } = req.body;
    if (!project_name || !location || !unit_measure || !land_share_amount) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const store = getStore();
    const pid = `proj-${crypto.randomUUID().slice(0, 8)}`;
    const newProject: Project = {
      id: pid,
      project_name,
      location,
      unit_measure: String(unit_measure),
      floors: Number(floors || 1),
      units: Number(units || 0),
      total_flats: Number(total_flats || units || 0),
      land_share_amount: Number(land_share_amount),
      first_sale_date: first_sale_date || new Date().toISOString().split('T')[0],
      status: status || 'Active',
      registration: registration || 'Yes',
      created_at: new Date().toISOString()
    };

    // Auto-create standard Incentive rule for this project
    const newRule: IncentiveRule = {
      id: `rule-${crypto.randomUUID().slice(0, 8)}`,
      project_id: pid,
      sale_1_percent: 2.0,
      sale_2_percent: 2.2,
      sale_3_percent: 2.5,
      sale_4_percent: 2.8,
      sale_5_percent: 3.0,
      sale_6_percent: 3.2,
      sale_7_percent: 3.5,
      first_floor_bonus_percent: 0.5,
      top_floor_bonus_percent: 0.5,
      created_at: new Date().toISOString()
    };

    store.projects.push(newProject);
    store.incentiveRules.push(newRule);
    writeStore(store);

    logAction(user, "Add Project", `Added project '${project_name}' (ID: ${pid}) and created baseline incentive rules.`);
    addNotification("New Project Created", `Project "${project_name}" has been registered in ${location}.`, 'success');

    res.status(201).json(newProject);
  });

  app.post('/api/projects/bulk', authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'Admin') {
      res.status(403).json({ error: "Only Admins can managed projects." });
      return;
    }

    const { projects } = req.body;
    if (!projects || !Array.isArray(projects)) {
      res.status(400).json({ error: "Invalid data format. Expected an array of projects." });
      return;
    }

    const store = getStore();
    let updatedCount = 0;
    let createdCount = 0;
    let skippedCount = 0;
    const skipped: string[] = [];

    for (const p of projects) {
      const {
        project_name,
        location,
        unit_measure,
        floors,
        units,
        total_flats,
        land_share_amount,
        first_sale_date,
        status,
        registration
      } = p;

      if (!project_name || !location || !unit_measure || !land_share_amount) {
        skippedCount++;
        skipped.push(`Row skipped: "${project_name || 'Unnamed'}" is missing required fields (location, unit_measure, or land_share_amount)`);
        continue;
      }

      const cleanName = project_name.trim();
      const existingProjIndex = store.projects.findIndex(proj => proj.project_name.toLowerCase().trim() === cleanName.toLowerCase());

      const data = {
        project_name: cleanName,
        location: location.trim(),
        unit_measure: String(unit_measure),
        floors: Number(floors || 1),
        units: Number(units || 0),
        total_flats: Number(total_flats !== undefined ? total_flats : (units || 0)),
        land_share_amount: Number(land_share_amount),
        first_sale_date: first_sale_date || new Date().toISOString().split('T')[0],
        status: status || 'Active',
        registration: (registration === 'Yes' || registration === 'No') ? registration : 'Yes'
      };

      if (existingProjIndex > -1) {
        // Update existing project
        store.projects[existingProjIndex] = {
          ...store.projects[existingProjIndex],
          ...data
        };
        updatedCount++;
      } else {
        // Create new project with baseline rules
        const pid = `proj-${crypto.randomUUID().slice(0, 8)}`;
        const newProject: Project = {
          id: pid,
          ...data as any,
          created_at: new Date().toISOString()
        };

        const newRule: IncentiveRule = {
          id: `rule-${crypto.randomUUID().slice(0, 8)}`,
          project_id: pid,
          sale_1_percent: 2.0,
          sale_2_percent: 2.2,
          sale_3_percent: 2.5,
          sale_4_percent: 2.8,
          sale_5_percent: 3.0,
          sale_6_percent: 3.2,
          sale_7_percent: 3.5,
          first_floor_bonus_percent: 0.5,
          top_floor_bonus_percent: 0.5,
          created_at: new Date().toISOString()
        };

        store.projects.push(newProject);
        store.incentiveRules.push(newRule);
        createdCount++;
      }
    }

    if (createdCount > 0 || updatedCount > 0) {
      writeStore(store);
      // Recalculate remaining incentives since project specs could have matching modifications
      recalculateAllIncentivesDirect(store);
    }

    logAction(user, "Bulk Import Projects", `Imported projects directory. Created ${createdCount} and updated ${updatedCount} records.`);
    addNotification("Projects Imported", `Successfully imported projects (Created: ${createdCount}, Updated: ${updatedCount})`, 'success');

    res.json({
      success: true,
      createdCount,
      updatedCount,
      skippedCount,
      skipped
    });
  });

  app.put('/api/projects/:id', authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'Admin') {
      res.status(403).json({ error: "Only admins can execute this action" });
      return;
    }

    const store = getStore();
    const pIndex = store.projects.findIndex(p => p.id === req.params.id);
    if (pIndex === -1) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const updated = {
      ...store.projects[pIndex],
      ...req.body,
      // Force correct types
      unit_measure: String(req.body.unit_measure !== undefined ? req.body.unit_measure : store.projects[pIndex].unit_measure),
      floors: Number(req.body.floors !== undefined ? req.body.floors : store.projects[pIndex].floors),
      units: Number(req.body.units !== undefined ? req.body.units : store.projects[pIndex].units),
      total_flats: Number(req.body.total_flats !== undefined ? req.body.total_flats : store.projects[pIndex].total_flats),
      land_share_amount: Number(req.body.land_share_amount !== undefined ? req.body.land_share_amount : store.projects[pIndex].land_share_amount),
      registration: req.body.registration !== undefined ? req.body.registration : (store.projects[pIndex].registration || 'Yes')
    };

    store.projects[pIndex] = updated;
    writeStore(store);

    // Recompute all incentives because Land Share Amount or Floor levels changed
    recalculateAllIncentives();

    logAction(user, "Edit Project", `Updated project details for '${updated.project_name}'.`);
    res.json(updated);
  });

  app.delete('/api/projects/:id', authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'Admin') {
      res.status(403).json({ error: "Only admins can perform deletion." });
      return;
    }

    const store = getStore();
    const proj = store.projects.find(p => p.id === req.params.id);
    if (!proj) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    // Cascade-delete any associated sales instead of failing
    store.sales = store.sales.filter(s => s.project_id !== req.params.id);

    store.projects = store.projects.filter(p => p.id !== req.params.id);
    store.incentiveRules = store.incentiveRules.filter(r => r.project_id !== req.params.id);
    store.teamProjects = store.teamProjects.filter(tp => tp.project_id !== req.params.id);
    
    // Recalculate remaining incentives since we removed possible sales
    recalculateAllIncentivesDirect(store);
    writeStore(store);

    logAction(user, "Delete Project", `Deleted project '${proj.project_name}' (ID: ${req.params.id}) and all associated sales.`);
    res.json({ message: "Project deleted successfully" });
  });

  // --- PROJECTS ON SALE API ---
  app.get('/api/projects-on-sale', authenticateToken, (req, res) => {
    const store = getStore();
    res.json(store.projectsOnSale || []);
  });

  app.post('/api/projects-on-sale/bulk', authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'Admin') {
      res.status(403).json({ error: "Only Admins can manage projects on sale." });
      return;
    }

    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "Missing or invalid items array for bulk import." });
      return;
    }

    const store = getStore();
    if (!store.projectsOnSale) store.projectsOnSale = [];
    if (!store.unitRegistrations) store.unitRegistrations = [];

    const importedProjects = [];
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];

    for (const item of items) {
      const { project_name, flat_unit_size, project_id, floor_number, units_per_floor } = item;
      if (!project_name) continue;

      // Try matching by project directory name or exact id
      let resolvedProjectId = project_id;
      const matchedProj = store.projects.find(p => 
        p.id === project_id || 
        String(p.id).toLowerCase() === String(project_id).toLowerCase().trim() ||
        p.project_name.toLowerCase() === String(project_id).toLowerCase().trim()
      );

      if (matchedProj) {
        resolvedProjectId = matchedProj.id;
      } else {
        // default fallback if none matches
        if (store.projects && store.projects.length > 0) {
          resolvedProjectId = store.projects[0].id;
        } else {
          resolvedProjectId = `proj-${crypto.randomUUID().slice(0, 8)}`;
        }
      }

      const fNum = Number(floor_number) || 1;
      const uPerFloor = Number(units_per_floor) || 1;
      const total_units = fNum * uPerFloor;
      const pid = `pos-${crypto.randomUUID().slice(0, 8)}`;

      const newProject = {
        id: pid,
        project_name: String(project_name).trim(),
        flat_unit_size: String(flat_unit_size || "1200 SFT").trim(),
        project_id: resolvedProjectId,
        floor_number: fNum,
        units_per_floor: uPerFloor,
        total_units,
        created_at: new Date().toISOString()
      };

      store.projectsOnSale.push(newProject);
      importedProjects.push(newProject);

      // Dynamically spin up unit registrations
      for (let f = 1; f <= fNum; f++) {
        for (let u = 0; u < uPerFloor; u++) {
          const letter = letters[u] || String.fromCharCode(65 + u);
          store.unitRegistrations.push({
            id: `reg-${crypto.randomUUID().slice(0, 8)}`,
            project_on_sale_id: pid,
            unit_name: `${f}${letter}`,
            registered: 'No',
            created_at: new Date().toISOString()
          });
        }
      }
    }

    writeStore(store);
    logAction(user, "Bulk Upload Pre-sales Campaigns", `Succeeded in bulk importing ${importedProjects.length} pre-sale campaign configurations from CSV file.`);
    res.status(201).json({ count: importedProjects.length, items: importedProjects });
  });

  app.post('/api/projects-on-sale', authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'Admin') {
      res.status(403).json({ error: "Only Admins can manage projects on sale." });
      return;
    }

    const { project_name, flat_unit_size, project_id, floor_number, units_per_floor, unit_configs, land_share_price } = req.body;
    if (!project_name || !flat_unit_size || !project_id || !floor_number || !units_per_floor) {
      res.status(400).json({ error: "Missing required fields for project on sale." });
      return;
    }

    const store = getStore();
    const pid = `pos-${crypto.randomUUID().slice(0, 8)}`;
    const total_units = Number(floor_number) * Number(units_per_floor);

    const newProject = {
      id: pid,
      project_name,
      flat_unit_size,
      project_id,
      floor_number: Number(floor_number),
      units_per_floor: Number(units_per_floor),
      total_units,
      land_share_price: land_share_price !== undefined ? Number(land_share_price) : undefined,
      unit_configs: unit_configs || {},
      created_at: new Date().toISOString()
    };

    if (!store.projectsOnSale) store.projectsOnSale = [];
    store.projectsOnSale.push(newProject);

    // Automatically initialize unit registrations to "No" by default for all the units
    if (!store.unitRegistrations) store.unitRegistrations = [];
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
    for (let f = 1; f <= Number(floor_number); f++) {
      for (let u = 0; u < Number(units_per_floor); u++) {
        const letter = letters[u] || String.fromCharCode(65 + u);
        store.unitRegistrations.push({
          id: `reg-${crypto.randomUUID().slice(0, 8)}`,
          project_on_sale_id: pid,
          unit_name: `${f}${letter}`,
          registered: 'No',
          created_at: new Date().toISOString()
        });
      }
    }

    writeStore(store);
    logAction(user, "Add Project On Sale", `Added pre-sale project '${project_name}' (ID: ${pid}) and generated ${total_units} units.`);
    res.status(201).json(newProject);
  });

  app.put('/api/projects-on-sale/:id', authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'Admin') {
      res.status(403).json({ error: "Only Admins can edit projects on sale." });
      return;
    }

    const store = getStore();
    if (!store.projectsOnSale) store.projectsOnSale = [];
    const pIndex = store.projectsOnSale.findIndex(p => p.id === req.params.id);
    if (pIndex === -1) {
      res.status(404).json({ error: "Project on sale not found." });
      return;
    }

    const current = store.projectsOnSale[pIndex];
    const { project_name, flat_unit_size, project_id, floor_number, units_per_floor, unit_configs, land_share_price } = req.body;

    const floorNum = floor_number !== undefined ? Number(floor_number) : current.floor_number;
    const unitsPerFloor = units_per_floor !== undefined ? Number(units_per_floor) : current.units_per_floor;
    const total_units = floorNum * unitsPerFloor;

    const updated = {
      ...current,
      project_name: project_name || current.project_name,
      flat_unit_size: flat_unit_size || current.flat_unit_size,
      project_id: project_id || current.project_id,
      floor_number: floorNum,
      units_per_floor: unitsPerFloor,
      total_units,
      land_share_price: land_share_price !== undefined ? (land_share_price === null ? undefined : Number(land_share_price)) : current.land_share_price,
      unit_configs: unit_configs !== undefined ? unit_configs : current.unit_configs
    };

    store.projectsOnSale[pIndex] = updated;

    // Regenerate/refresh list of unit registrations safely if floor_number or units_per_floor changed!
    if (floorNum !== current.floor_number || unitsPerFloor !== current.units_per_floor) {
      // Find existing unit registrations for this pre-sale project
      const existingRegs = (store.unitRegistrations || []).filter(r => r.project_on_sale_id === req.params.id);
      const existingMap = new Map(existingRegs.map(r => [r.unit_name, r]));

      // Clear existing for this project
      store.unitRegistrations = (store.unitRegistrations || []).filter(r => r.project_on_sale_id !== req.params.id);

      // Re-add matching units to preserve existing "Yes" registrations and create "No" for new units
      const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
      for (let f = 1; f <= floorNum; f++) {
        for (let u = 0; u < unitsPerFloor; u++) {
          const letter = letters[u] || String.fromCharCode(65 + u);
          const uName = `${f}${letter}`;
          const existing = existingMap.get(uName);
          if (existing) {
            store.unitRegistrations.push(existing);
          } else {
            store.unitRegistrations.push({
              id: `reg-${crypto.randomUUID().slice(0, 8)}`,
              project_on_sale_id: req.params.id,
              unit_name: uName,
              registered: 'No',
              created_at: new Date().toISOString()
            });
          }
        }
      }
    }

    writeStore(store);
    logAction(user, "Edit Project On Sale", `Updated pre-sale project details for '${updated.project_name}'.`);
    res.json(updated);
  });

  app.delete('/api/projects-on-sale/:id', authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'Admin') {
      res.status(403).json({ error: "Only Admins can delete projects on sale." });
      return;
    }

    const store = getStore();
    const project = (store.projectsOnSale || []).find(p => p.id === req.params.id);
    if (!project) {
      res.status(404).json({ error: "Project on sale not found." });
      return;
    }

    // Filter out of arrays
    store.projectsOnSale = (store.projectsOnSale || []).filter(p => p.id !== req.params.id);
    store.unitRegistrations = (store.unitRegistrations || []).filter(r => r.project_on_sale_id !== req.params.id);

    writeStore(store);
    logAction(user, "Delete Project On Sale", `Deleted pre-sale project '${project.project_name}' and clean unit registrations.`);
    res.json({ message: "Deleted successfully" });
  });

  // --- UNIT REGISTRATIONS API ---
  app.get('/api/unit-registrations', authenticateToken, (req, res) => {
    const store = getStore();
    res.json(store.unitRegistrations || []);
  });

  app.put('/api/unit-registrations/:id', authenticateToken, (req, res) => {
    const user = (req as any).user;
    const { registered, registration_date } = req.body;

    const store = getStore();
    if (!store.unitRegistrations) store.unitRegistrations = [];
    const rIndex = store.unitRegistrations.findIndex(r => r.id === req.params.id);
    if (rIndex === -1) {
      res.status(404).json({ error: "Unit registration record not found." });
      return;
    }

    const current = store.unitRegistrations[rIndex];
    store.unitRegistrations[rIndex] = {
      ...current,
      registered: registered || 'No',
      registration_date: registration_date || undefined
    };

    // Recalculate remaining incentives since a unit registration is processed or revoked
    recalculateAllIncentivesDirect(store);
    writeStore(store);

    logAction(user, "Update Unit Registration", `Updated Unit '${current.unit_name}' registration to: ${registered} (${registration_date || 'No Date'}).`);
    res.json(store.unitRegistrations[rIndex]);
  });

  // --- SALES TEAM MANAGEMENT API ---
  app.get('/api/teams', authenticateToken, (req, res) => {
    const store = getStore();
    // Resolve project bindings for each team
    const result = store.salesTeams.map(t => {
      const bindings = store.teamProjects.filter(tp => tp.team_id === t.id);
      const projects = bindings.map(b => store.projects.find(p => p.id === b.project_id)).filter(Boolean);
      return {
        ...t,
        assigned_projects: projects
      };
    });
    res.json(result);
  });

  app.post('/api/teams', authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'Admin') {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const { team_name, team_leader, sales_target, assigned_project_ids } = req.body;
    if (!team_name || !team_leader) {
      res.status(400).json({ error: "Team Name and Leader are required" });
      return;
    }

    const store = getStore();
    const tid = `team-${crypto.randomUUID().slice(0, 8)}`;
    const newTeam: SalesTeam = {
      id: tid,
      team_name,
      team_leader,
      sales_target: Number(sales_target || 0)
    };

    store.salesTeams.push(newTeam);

    // Save assigned project associations
    if (Array.isArray(assigned_project_ids)) {
      assigned_project_ids.forEach(pId => {
        store.teamProjects.push({
          id: `tp-${crypto.randomUUID().slice(0, 8)}`,
          team_id: tid,
          project_id: pId
        });
      });
    }

    writeStore(store);
    logAction(user, "Create Team", `Created Sales Team '${team_name}' headed by ${team_leader}.`);
    res.status(201).json(newTeam);
  });

  app.put('/api/teams/:id', authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'Admin') {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const store = getStore();
    const tIndex = store.salesTeams.findIndex(t => t.id === req.params.id);
    if (tIndex === -1) {
      res.status(404).json({ error: "Team not found" });
      return;
    }

    const { team_name, team_leader, sales_target, assigned_project_ids, monthly_targets } = req.body;
    
    // Update team
    store.salesTeams[tIndex] = {
      ...store.salesTeams[tIndex],
      team_name: team_name || store.salesTeams[tIndex].team_name,
      team_leader: team_leader || store.salesTeams[tIndex].team_leader,
      sales_target: Number(sales_target !== undefined ? sales_target : store.salesTeams[tIndex].sales_target),
      monthly_targets: monthly_targets !== undefined ? monthly_targets : store.salesTeams[tIndex].monthly_targets
    };

    // Update team projects
    if (Array.isArray(assigned_project_ids)) {
      // Clear old
      store.teamProjects = store.teamProjects.filter(tp => tp.team_id !== req.params.id);
      // Insert new
      assigned_project_ids.forEach(pId => {
        store.teamProjects.push({
          id: `tp-${crypto.randomUUID().slice(0, 8)}`,
          team_id: req.params.id,
          project_id: pId
        });
      });
    }

    writeStore(store);
    
    // Recalculate target bonuses
    recalculateAllIncentives();

    logAction(user, "Edit Team", `Modified Sales Team '${store.salesTeams[tIndex].team_name}'.`);
    res.json(store.salesTeams[tIndex]);
  });

  app.post('/api/teams/bulk', authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'Admin') {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const { teams } = req.body;
    if (!teams || !Array.isArray(teams)) {
      res.status(400).json({ error: "An array of teams is required" });
      return;
    }

    const store = getStore();
    const imported: any[] = [];
    const skipped: string[] = [];

    for (const teamData of teams) {
      const { team_name, team_leader, sales_target, assigned_projects } = teamData;

      if (!team_name || !team_leader) {
        skipped.push(`${team_name || "Unknown"} (Missing required fields)`);
        continue;
      }

      const isDupe = store.salesTeams.some(t => t.team_name.toLowerCase().trim() === team_name.toLowerCase().trim()) ||
                     imported.some(t => t.team_name.toLowerCase().trim() === team_name.toLowerCase().trim());
      if (isDupe) {
        skipped.push(`${team_name} (Duplicate team name)`);
        continue;
      }

      const tid = `team-${crypto.randomUUID().slice(0, 8)}`;
      const newTeam: SalesTeam = {
        id: tid,
        team_name: team_name.trim(),
        team_leader: team_leader.trim(),
        sales_target: Number(sales_target !== undefined ? sales_target : 5)
      };

      store.salesTeams.push(newTeam);

      if (assigned_projects && typeof assigned_projects === 'string') {
        const projectNames = assigned_projects.split(/[;,]/).map(p => p.trim()).filter(Boolean);
        projectNames.forEach(pName => {
          const matchedProj = store.projects.find(p => p.project_name.toLowerCase().trim() === pName.toLowerCase().trim());
          if (matchedProj) {
            store.teamProjects.push({
              id: `tp-${crypto.randomUUID().slice(0, 8)}`,
              team_id: tid,
              project_id: matchedProj.id
            });
          }
        });
      }

      imported.push({
        ...newTeam,
        assigned_projects: store.teamProjects
          .filter(tp => tp.team_id === tid)
          .map(tp => store.projects.find(p => p.id === tp.project_id))
          .filter(Boolean)
      });
    }

    writeStore(store);

    if (imported.length > 0) {
      logAction(user, "Add Teams Bulk", `Imported ${imported.length} Sales Teams/Divisions via CSV.`);
    }

    res.status(200).json({
      success: true,
      importedCount: imported.length,
      skippedCount: skipped.length,
      skipped,
      imported
    });
  });

  app.delete('/api/teams/:id', authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'Admin') {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const store = getStore();
    const team = store.salesTeams.find(t => t.id === req.params.id);
    if (!team) {
      res.status(404).json({ error: "Sales team not found" });
      return;
    }

    // Unlink Executives
    store.salesExecutives.forEach(e => {
      if (e.team_id === req.params.id) {
        e.team_id = ""; // Unassigned
      }
    });

    store.salesTeams = store.salesTeams.filter(t => t.id !== req.params.id);
    store.teamProjects = store.teamProjects.filter(tp => tp.team_id !== req.params.id);

    writeStore(store);
    logAction(user, "Delete Team", `Deleted sales team '${team.team_name}'.`);
    res.json({ message: "Team deleted successfully" });
  });

  // --- SALES EXECUTIVE MANAGEMENT API ---
  app.get('/api/executives', authenticateToken, (req, res) => {
    const store = getStore();
    // Resolve helper fields for UI
    const result = store.salesExecutives.map(e => {
      const team = store.salesTeams.find(t => t.id === e.team_id);
      const proj = store.projects.find(p => p.id === e.project_id);
      return {
        ...e,
        team_name: team ? team.team_name : 'Unassigned',
        project_name: proj ? proj.project_name : 'None Assigned'
      };
    });
    res.json(result);
  });

  app.post('/api/executives', authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'Admin') {
      res.status(403).json({ error: "Admin credentials required" });
      return;
    }

    const { employee_id, name, team_id, project_id, target, joining_date } = req.body;
    if (!employee_id || !name) {
      res.status(400).json({ error: "Employee ID and Name are required" });
      return;
    }

    const store = getStore();
    
    // Check if ID is redundant
    const duplicate = store.salesExecutives.some(e => e.employee_id.toLowerCase() === employee_id.toLowerCase());
    if (duplicate) {
      res.status(400).json({ error: `An executive with ID '${employee_id}' already exists.` });
      return;
    }

    const eid = `exec-${crypto.randomUUID().slice(0, 8)}`;
    const newExec: SalesExecutive = {
      id: eid,
      employee_id,
      name,
      team_id: team_id || "",
      project_id: project_id || "",
      target: Number(target || 0),
      joining_date: joining_date || new Date().toISOString().split('T')[0]
    };

    // Auto-create standard User profile for login as this executive
    const newAcct: User = {
      id: eid,
      email: `${employee_id.toLowerCase()}@tphl.com`,
      name,
      role: "Sales Executive",
      employee_id,
      team_id: team_id || "",
      created_at: new Date().toISOString()
    };

    store.salesExecutives.push(newExec);
    store.users.push(newAcct);
    
    writeStore(store);
    logAction(user, "Add Executive", `Registered new Sales Executive '${name}' (${employee_id}).`);
    res.status(201).json(newExec);
  });

  app.post('/api/executives/bulk', authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'Admin') {
      res.status(403).json({ error: "Admin credentials required" });
      return;
    }

    const { executives } = req.body;
    if (!executives || !Array.isArray(executives)) {
      res.status(400).json({ error: "An array of executives is required" });
      return;
    }

    const store = getStore();
    const imported: any[] = [];
    const skipped: string[] = [];

    for (const execData of executives) {
      const { employee_id, name, team_name, project_name, target, joining_date } = execData;

      if (!employee_id || !name) {
        skipped.push(`${employee_id || "Unknown"} (Missing required fields)`);
        continue;
      }

      // Check if employee_id already exists in store and current batch
      const isDupe = store.salesExecutives.some(e => e.employee_id.toLowerCase() === employee_id.toLowerCase()) ||
                    imported.some(e => e.employee_id.toLowerCase() === employee_id.toLowerCase());
      if (isDupe) {
        skipped.push(`${employee_id} (Duplicate ID)`);
        continue;
      }

      // Resolve team_id from team_name
      let resolvedTeamId = "";
      if (team_name) {
        const team = store.salesTeams.find(t => t.team_name.toLowerCase().trim() === team_name.toLowerCase().trim());
        if (team) {
          resolvedTeamId = team.id;
        }
      }

      // Resolve project_id from project_name
      let resolvedProjectId = "";
      if (project_name) {
        const proj = store.projects.find(p => p.project_name.toLowerCase().trim() === project_name.toLowerCase().trim());
        if (proj) {
          resolvedProjectId = proj.id;
        }
      }

      const eid = `exec-${crypto.randomUUID().slice(0, 8)}`;
      const newExec: SalesExecutive = {
        id: eid,
        employee_id,
        name,
        team_id: resolvedTeamId,
        project_id: resolvedProjectId,
        target: Number(target !== undefined ? target : 2),
        joining_date: joining_date || new Date().toISOString().split('T')[0]
      };

      const newAcct: User = {
        id: eid,
        email: `${employee_id.toLowerCase()}@tphl.com`,
        name,
        role: "Sales Executive",
        employee_id,
        team_id: resolvedTeamId,
        created_at: new Date().toISOString()
      };

      store.salesExecutives.push(newExec);
      store.users.push(newAcct);
      imported.push(newExec);
    }

    writeStore(store);
    
    if (imported.length > 0) {
      logAction(user, "Add Executive Bulk", `Registered ${imported.length} Sales Executives via CSV importation.`);
    }

    res.status(200).json({
      success: true,
      importedCount: imported.length,
      skippedCount: skipped.length,
      skippedDetails: skipped,
      imported
    });
  });

  app.put('/api/executives/:id', authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'Admin') {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const store = getStore();
    const eIndex = store.salesExecutives.findIndex(e => e.id === req.params.id);
    if (eIndex === -1) {
      res.status(404).json({ error: "Sales Executive not found" });
      return;
    }

    const updated = {
      ...store.salesExecutives[eIndex],
      ...req.body,
      target: Number(req.body.target !== undefined ? req.body.target : store.salesExecutives[eIndex].target)
    };

    store.salesExecutives[eIndex] = updated;

    // Sync team_id and role variables to user account too
    const uIndex = store.users.findIndex(u => u.id === req.params.id || u.employee_id === updated.employee_id);
    if (uIndex !== -1) {
      store.users[uIndex].name = updated.name;
      store.users[uIndex].team_id = updated.team_id;
    }

    writeStore(store);
    
    // Recalculate target calculations
    recalculateAllIncentives();

    logAction(user, "Edit Executive", `Updated files for Executive '${updated.name}'.`);
    res.json(updated);
  });

  app.delete('/api/executives/:id', authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'Admin') {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const store = getStore();
    const exec = store.salesExecutives.find(e => e.id === req.params.id);
    if (!exec) {
      res.status(404).json({ error: "Executive not found" });
      return;
    }

    // Ensure Sales are not corrupted
    const hasSales = store.sales.some(s => s.executive_id === req.params.id);
    if (hasSales) {
      res.status(400).json({ error: "Cannot delete Executive with registered sales entries. Reassign or delete those entries first." });
      return;
    }

    store.salesExecutives = store.salesExecutives.filter(e => e.id !== req.params.id);
    store.users = store.users.filter(u => u.id !== req.params.id && u.employee_id !== exec.employee_id);

    writeStore(store);
    logAction(user, "Delete Executive", `Deleted record of executive '${exec.name}'.`);
    res.json({ message: "Executive deleted successfully" });
  });

  // --- INCENTIVE CALCULATION SETUP API ---
  app.get('/api/rules', authenticateToken, (req, res) => {
    const store = getStore();
    res.json({
      projectRules: store.incentiveRules,
      bonusRules: store.bonusRules
    });
  });

  app.put('/api/rules/project/:project_id', authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'Admin') {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const store = getStore();
    let rIndex = store.incentiveRules.findIndex(r => r.project_id === req.params.project_id);

    const data = {
      sale_1_percent: Number(req.body.sale_1_percent),
      sale_2_percent: Number(req.body.sale_2_percent),
      sale_3_percent: Number(req.body.sale_3_percent),
      sale_4_percent: Number(req.body.sale_4_percent),
      sale_5_percent: Number(req.body.sale_5_percent),
      sale_6_percent: Number(req.body.sale_6_percent),
      sale_7_percent: Number(req.body.sale_7_percent),
      first_floor_bonus_percent: Number(req.body.first_floor_bonus_percent),
      top_floor_bonus_percent: Number(req.body.top_floor_bonus_percent),
    };

    if (rIndex === -1) {
      const newRule: IncentiveRule = {
        id: `rule-${crypto.randomUUID().slice(0, 8)}`,
        project_id: req.params.project_id,
        ...data,
        created_at: new Date().toISOString()
      };
      store.incentiveRules.push(newRule);
    } else {
      store.incentiveRules[rIndex] = {
        ...store.incentiveRules[rIndex],
        ...data
      };
    }

    writeStore(store);
    recalculateAllIncentives(); // Auto Re-calculates on setup edit

    logAction(user, "Update Incentive Setup", `Modified sequence percentage levels and floor bonuses for project ID '${req.params.project_id}'.`);
    res.json({ success: true, message: "Rule updated successfully and incentives recalculated." });
  });

  app.put('/api/rules/global-bonus', authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'Admin') {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const store = getStore();
    store.bonusRules = {
      target_90_bonus: Number(req.body.target_90_bonus || store.bonusRules.target_90_bonus),
      target_100_bonus: Number(req.body.target_100_bonus || store.bonusRules.target_100_bonus),
      team_target_bonus: Number(req.body.team_target_bonus || store.bonusRules.team_target_bonus),
    };

    writeStore(store);
    recalculateAllIncentives(); // Auto recalculate is standard feature!

    logAction(user, "Update Global Bonus Setup", `Modified target bonuses: 90% achieved -> ${store.bonusRules.target_90_bonus}, 100% achieved -> ${store.bonusRules.target_100_bonus}.`);
    res.json({ success: true, bonusRules: store.bonusRules });
  });

  app.post('/api/rules/bulk', authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'Admin') {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const { projectRules, bonusRules } = req.body;
    const store = getStore();

    let updatedCount = 0;
    let skippedCount = 0;
    const skipped: string[] = [];

    // Update global bonus rules if provided
    if (bonusRules) {
      if (bonusRules.target_90_bonus !== undefined) {
        store.bonusRules.target_90_bonus = Number(bonusRules.target_90_bonus);
      }
      if (bonusRules.target_100_bonus !== undefined) {
        store.bonusRules.target_100_bonus = Number(bonusRules.target_100_bonus);
      }
      if (bonusRules.team_target_bonus !== undefined) {
        store.bonusRules.team_target_bonus = Number(bonusRules.team_target_bonus);
      }
    }

    // Update project rules
    if (projectRules && Array.isArray(projectRules)) {
      for (const pr of projectRules) {
        const {
          project_name,
          sale_1_percent,
          sale_2_percent,
          sale_3_percent,
          sale_4_percent,
          sale_5_percent,
          sale_6_percent,
          sale_7_percent,
          first_floor_bonus_percent,
          top_floor_bonus_percent
        } = pr;

        if (!project_name) {
          skippedCount++;
          skipped.push("Row skipped: Missing project name");
          continue;
        }

        const project = store.projects.find(p => p.project_name.toLowerCase().trim() === project_name.toLowerCase().trim());
        if (!project) {
          skippedCount++;
          skipped.push(`Row skipped: Project named "${project_name}" not found in current project list.`);
          continue;
        }

        const projectId = project.id;
        let rIndex = store.incentiveRules.findIndex(r => r.project_id === projectId);

        const data = {
          sale_1_percent: Number(sale_1_percent !== undefined ? sale_1_percent : 1.5),
          sale_2_percent: Number(sale_2_percent !== undefined ? sale_2_percent : 1.8),
          sale_3_percent: Number(sale_3_percent !== undefined ? sale_3_percent : 2.0),
          sale_4_percent: Number(sale_4_percent !== undefined ? sale_4_percent : 2.2),
          sale_5_percent: Number(sale_5_percent !== undefined ? sale_5_percent : 2.5),
          sale_6_percent: Number(sale_6_percent !== undefined ? sale_6_percent : 2.8),
          sale_7_percent: Number(sale_7_percent !== undefined ? sale_7_percent : 3.0),
          first_floor_bonus_percent: Number(first_floor_bonus_percent !== undefined ? first_floor_bonus_percent : 0.5),
          top_floor_bonus_percent: Number(top_floor_bonus_percent !== undefined ? top_floor_bonus_percent : 0.5),
        };

        if (rIndex === -1) {
          store.incentiveRules.push({
            id: `rule-${crypto.randomUUID().slice(0, 8)}`,
            project_id: projectId,
            ...data,
            created_at: new Date().toISOString()
          });
        } else {
          store.incentiveRules[rIndex] = {
            ...store.incentiveRules[rIndex],
            ...data
          };
        }
        updatedCount++;
      }
    }

    writeStore(store);
    recalculateAllIncentives();

    logAction(user, "Bulk Import Rules", `Imported rules via CSV. ${updatedCount} project rules updated, global target bonuses updated.`);

    res.json({
      success: true,
      updatedCount,
      skippedCount,
      skipped
    });
  });

  // --- SALES ENTRY MODULE API ---
  app.get('/api/sales', authenticateToken, (req, res) => {
    const store = getStore();
    const curUser = (req as any).user;

    let list = [...store.sales];

    // Filter list for Leader (only their team's developers) or Executive (only themselves)
    if (curUser.role === 'Sales Team Leader') {
      const leaderTeamId = curUser.team_id;
      if (leaderTeamId) {
        const teamExecs = store.salesExecutives.filter(e => e.team_id === leaderTeamId).map(e => e.id);
        list = list.filter(s => teamExecs.includes(s.executive_id));
      }
    } else if (curUser.role === 'Sales Executive') {
      const exec = store.salesExecutives.find(e => e.employee_id === curUser.employee_id || e.id === curUser.id);
      if (exec) {
        list = list.filter(s => s.executive_id === exec.id);
      } else {
        list = [];
      }
    }

    const resolved = list.map(s => {
      const proj = store.projects.find(p => p.id === s.project_id);
      const exec = store.salesExecutives.find(e => e.id === s.executive_id);
      return {
        ...s,
        project_name: proj ? proj.project_name : 'Deleted Project',
        land_share_amount: getSaleVolume(s, store),
        executive_name: exec ? exec.name : 'Unknown Executive'
      };
    });

    res.json(resolved);
  });

  app.post('/api/sales', authenticateToken, (req, res) => {
    const user = (req as any).user;
    
    // Sales Executive or Admin can enter sales
    const { project_id, unit_name, unit_measure, floor_number, sale_date, executive_id, project_on_sale_id } = req.body;
    if (!project_id || !unit_name || !unit_measure || !floor_number || !sale_date || !executive_id) {
      res.status(400).json({ error: "Missing required sales fields." });
      return;
    }

    const store = getStore();

    // Verify Project
    const proj = store.projects.find(p => p.id === project_id);
    if (!proj) {
      res.status(400).json({ error: "Project specified does not exist." });
      return;
    }

    // Verify Executive
    const exec = store.salesExecutives.find(e => e.id === executive_id);
    if (!exec) {
      res.status(400).json({ error: "Sales Executive specified does not exist." });
      return;
    }

    const sid = `sale-${crypto.randomUUID().slice(0, 8)}`;
    const newSale: Sale = {
      id: sid,
      project_id,
      unit_name,
      unit_measure: String(unit_measure),
      floor_number: Number(floor_number),
      sale_number: 1, // Will be computed chronologically in recalculation
      sale_date,
      executive_id,
      project_on_sale_id,
      buyer_name: req.body.buyer_name ? String(req.body.buyer_name).trim() : undefined
    };

    store.sales.push(newSale);
    
    // Auto calculate
    recalculateAllIncentivesDirect(store);
    writeStore(store);

    const logMsg = `Added sales entry for unit '${unit_name}' in project '${proj.project_name}' sold by ${exec.name}.`;
    logAction(user, "Sales Entry", logMsg);
    
    const computedIncentiveObj = store.salesIncentives.find(si => si.sale_id === sid);
    const amountStr = computedIncentiveObj ? computedIncentiveObj.total_incentive.toLocaleString() : "0";
    addNotification("New Sale & Incentive Calculated", `Sales record created for ${unit_name} (${proj.project_name}). Generated incentive: ${amountStr} BDT.`, 'success');

    res.status(201).json(newSale);
  });

  app.post('/api/sales/bulk', authenticateToken, (req, res) => {
    const user = (req as any).user;
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "Missing or invalid items array for bulk import." });
      return;
    }

    const store = getStore();
    const importedSales = [];

    for (const item of items) {
      const { 
        unit_name, 
        sale_date, 
        project_name, 
        project_id, 
        project_on_sale_name, 
        campaign_name,
        project_on_sale_id, 
        executive_name, 
        executive_id, 
        employee_id, 
        buyer_name,
        unit_measure,
        floor_number
      } = item;

      if (!unit_name || !sale_date) continue;

      // 1. Resolve Executive
      let exec = null;
      if (executive_id) {
        exec = store.salesExecutives.find(e => e.id === executive_id);
      }
      if (!exec && employee_id) {
        exec = store.salesExecutives.find(e => String(e.employee_id).toLowerCase().trim() === String(employee_id).toLowerCase().trim());
      }
      if (!exec && executive_name) {
        exec = store.salesExecutives.find(e => 
          String(e.name).toLowerCase().trim() === String(executive_name).toLowerCase().trim() || 
          String(e.employee_id).toLowerCase().trim() === String(executive_name).toLowerCase().trim()
        );
      }
      if (!exec) continue; // Skip if executive cannot be resolved

      // 2. Resolve Campaign (ProjectOnSale)
      let campaign = null;
      const cleanCampaignName = String(project_on_sale_name || campaign_name || "").toLowerCase().trim();
      const cleanCampaignId = String(project_on_sale_id || "").trim();
      
      if (cleanCampaignId) {
        campaign = store.projectsOnSale.find(pos => pos.id === cleanCampaignId);
      }
      if (!campaign && cleanCampaignName) {
        campaign = store.projectsOnSale.find(pos => pos.project_name.toLowerCase().trim() === cleanCampaignName);
      }

      // 3. Resolve Master Project
      let proj = null;
      const cleanProjName = String(project_name || "").toLowerCase().trim();
      const cleanProjId = String(project_id || "").trim();
      if (cleanProjId) {
        proj = store.projects.find(p => p.id === cleanProjId);
      }
      if (!proj && cleanProjName) {
        proj = store.projects.find(p => p.project_name.toLowerCase().trim() === cleanProjName);
      }
      if (!proj && campaign) {
        proj = store.projects.find(p => p.id === campaign.project_id);
      }
      if (!proj) {
        if (exec.project_id) {
          proj = store.projects.find(p => p.id === exec.project_id);
        }
        if (!proj && store.projects.length > 0) {
          proj = store.projects[0];
        }
      }

      if (!proj) continue; // Skip if no project is associated

      // Calculate floor
      let fNum = Number(floor_number);
      if (isNaN(fNum) || !fNum) {
        fNum = parseInt(unit_name) || 1;
      }

      // Calculate SFT measure
      let measure = String(unit_measure || "");
      if (!measure) {
        if (campaign) {
          const letter = String(unit_name || "").slice(-1).toUpperCase();
          if (campaign.unit_configs && campaign.unit_configs[letter]) {
            measure = `${campaign.unit_configs[letter].size} SFT`;
          } else {
            measure = campaign.flat_unit_size;
          }
        } else {
          measure = proj.unit_measure || "1200 SFT";
        }
      }

      const sid = `sale-${crypto.randomUUID().slice(0, 8)}`;
      const newSale = {
        id: sid,
        project_id: proj.id,
        project_on_sale_id: campaign ? campaign.id : undefined,
        unit_name: String(unit_name).trim().toUpperCase(),
        unit_measure: measure,
        floor_number: fNum,
        sale_number: 1,
        sale_date: String(sale_date).trim(),
        executive_id: exec.id,
        buyer_name: buyer_name ? String(buyer_name).trim() : undefined
      };

      store.sales.push(newSale);
      importedSales.push(newSale);
    }

    if (importedSales.length > 0) {
      recalculateAllIncentivesDirect(store);
      writeStore(store);
      logAction(user, "Bulk Import Sales", `Successfully imported ${importedSales.length} sales booking records from CSV.`);
      addNotification("Sales Bulk Import Successful", `Imported ${importedSales.length} bookings. Recalculated all incentive payout streams chronologically.`, 'success');
    }

    res.status(201).json({ count: importedSales.length, items: importedSales });
  });

  app.put('/api/sales/:id', authenticateToken, (req, res) => {
    const user = (req as any).user;
    const store = getStore();
    const sIndex = store.sales.findIndex(s => s.id === req.params.id);

    if (sIndex === -1) {
      res.status(404).json({ error: "Sales entry not found." });
      return;
    }

    // Ensure Role checks: Executive can edit only their own entries
    if (user.role === 'Sales Executive') {
      const exec = store.salesExecutives.find(e => e.employee_id === user.employee_id || e.id === user.id);
      if (!exec || store.sales[sIndex].executive_id !== exec.id) {
        res.status(403).json({ error: "Access denied. You can only edit your own entries." });
        return;
      }
    }

    const updated = {
      ...store.sales[sIndex],
      ...req.body,
      unit_measure: req.body.unit_measure !== undefined ? String(req.body.unit_measure) : store.sales[sIndex].unit_measure,
      floor_number: Number(req.body.floor_number || store.sales[sIndex].floor_number)
    };

    store.sales[sIndex] = updated;

    recalculateAllIncentivesDirect(store);
    writeStore(store);

    logAction(user, "Edit Sale", `Edited sale record for ID '${req.params.id}'.`);
    res.json(updated);
  });

  app.delete('/api/sales/:id', authenticateToken, (req, res) => {
    const user = (req as any).user;
    const store = getStore();
    const sale = store.sales.find(s => s.id === req.params.id);

    if (!sale) {
      res.status(404).json({ error: "Sales entry not found." });
      return;
    }

    // Auth validation
    if (user.role === 'Sales Executive') {
      const exec = store.salesExecutives.find(e => e.employee_id === user.employee_id || e.id === user.id);
      if (!exec || sale.executive_id !== exec.id) {
        res.status(403).json({ error: "Forbidden. You can only delete your own entry." });
        return;
      }
    }

    store.sales = store.sales.filter(s => s.id !== req.params.id);
    store.salesIncentives = store.salesIncentives.filter(si => si.sale_id !== req.params.id);

    // Dynamic chronological sale number re-indexing
    recalculateAllIncentivesDirect(store);
    writeStore(store);

    logAction(user, "Delete Sale", `Deleted sale entry ID '${req.params.id}'.`);
    res.json({ message: "Sales entry successfully deleted" });
  });

  // --- SALES INCENTIVE MODULE & REPORTS API ---
  app.get('/api/incentives', authenticateToken, (req, res) => {
    const store = getStore();
    const curUser = (req as any).user;

    let targetIncentives = [...store.salesIncentives];

    // Filter list for Leader or Executive
    if (curUser.role === 'Sales Team Leader') {
      const leaderTeamId = curUser.team_id;
      if (leaderTeamId) {
        const teamExecs = store.salesExecutives.filter(e => e.team_id === leaderTeamId).map(e => e.id);
        targetIncentives = targetIncentives.filter(si => teamExecs.includes(si.executive_id));
      }
    } else if (curUser.role === 'Sales Executive') {
      const exec = store.salesExecutives.find(e => e.employee_id === curUser.employee_id || e.id === curUser.id);
      if (exec) {
        targetIncentives = targetIncentives.filter(si => si.executive_id === exec.id);
      } else {
        targetIncentives = [];
      }
    }

    // Resolve details for visual grids
    const resolved = targetIncentives.map(inc => {
      const sale = store.sales.find(s => s.id === inc.sale_id);
      const exec = store.salesExecutives.find(e => e.id === inc.executive_id);
      const team = exec ? store.salesTeams.find(t => t.id === exec.team_id) : null;
      const proj = store.projects.find(p => p.id === inc.project_id);

      return {
        ...inc,
        sale_date: sale ? sale.sale_date : '',
        unit_name: sale ? sale.unit_name : 'N/A',
        floor_number: sale ? sale.floor_number : 0,
        executive_name: exec ? exec.name : 'Unknown Executive',
        employee_id: exec ? exec.employee_id : 'N/A',
        team_name: team ? team.team_name : 'No Team',
        project_name: proj ? proj.project_name : 'Deleted Project',
        land_share_amount: sale ? getSaleVolume(sale, store) : (proj ? proj.land_share_amount : 0)
      };
    });

    const finalIncentives = resolved;

    res.json(finalIncentives);
  });

  // --- SYSTEM SETTINGS, BACKUP & RESTORE APP ---
  app.get('/api/system/logs', authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'Admin') {
      res.status(403).json({ error: "Admin rights required" });
      return;
    }
    const store = getStore();
    res.json(store.auditLogs);
  });

  app.get('/api/system/notifications', authenticateToken, (req, res) => {
    const store = getStore();
    res.json(store.notifications);
  });

  app.post('/api/system/notifications/clear', authenticateToken, (req, res) => {
    const store = getStore();
    store.notifications = store.notifications.map(n => ({ ...n, read: true }));
    writeStore(store);
    res.json({ success: true });
  });

  // Complete Database Backup (Download)
  app.get('/api/system/backup', authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'Admin') {
      res.status(403).json({ error: "Requires Admin authentication" });
      return;
    }
    const store = getStore();
    logAction(user, "Database Backup", "Downloaded a database state backup.");
    res.json(store);
  });

  // Live Firestore Backup (Download raw Firestore snapshot directly)
  app.get('/api/system/firestore-backup', authenticateToken, async (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'Admin') {
      res.status(403).json({ error: "Requires Admin authentication" });
      return;
    }
    try {
      const liveStore = await getLiveFirestoreBackup();
      logAction(user, "Firestore Live Backup", "Downloaded a direct backup of all Firestore collection states.");
      res.json(liveStore);
    } catch (err: any) {
      console.error("[server.ts] Live Firestore Backup endpoint error:", err);
      res.status(500).json({ error: "Failed to download live Firestore datasets: " + err.message });
    }
  });

  // Database Restore (Upload/Import)
  app.post('/api/system/restore', authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user.role !== 'Admin') {
        res.status(403).json({ error: "Requires Admin authentication" });
        return;
      }

      const backupData = req.body;
      if (!backupData || typeof backupData !== 'object') {
        res.status(400).json({ error: "Invalid backup dataset format provided." });
        return;
      }

      // Basic structure verification
      if (!backupData.projects || !backupData.salesExecutives || !backupData.salesTeams) {
        res.status(400).json({ error: "Verification failed. Essential relational schemas missing." });
        return;
      }

      // Sanitize backupData to ensure all collections conform to DatabaseStore structure and contain no null/undefined members
      const sanitizedStore: DatabaseStore = {
        users: Array.isArray(backupData.users) ? backupData.users.filter((x: any) => x && typeof x === 'object') : [],
        projects: Array.isArray(backupData.projects) ? backupData.projects.filter((x: any) => x && typeof x === 'object') : [],
        salesTeams: Array.isArray(backupData.salesTeams) ? backupData.salesTeams.filter((x: any) => x && typeof x === 'object') : [],
        teamProjects: Array.isArray(backupData.teamProjects) ? backupData.teamProjects.filter((x: any) => x && typeof x === 'object') : [],
        salesExecutives: Array.isArray(backupData.salesExecutives) ? backupData.salesExecutives.filter((x: any) => x && typeof x === 'object') : [],
        incentiveRules: Array.isArray(backupData.incentiveRules) ? backupData.incentiveRules.filter((x: any) => x && typeof x === 'object') : [],
        bonusRules: backupData.bonusRules && typeof backupData.bonusRules === 'object' ? backupData.bonusRules : {
          target_90_bonus: 2000,
          target_100_bonus: 3500,
          team_target_bonus: 5000
        },
        sales: Array.isArray(backupData.sales) ? backupData.sales.filter((x: any) => x && typeof x === 'object') : [],
        salesIncentives: Array.isArray(backupData.salesIncentives) ? backupData.salesIncentives.filter((x: any) => x && typeof x === 'object') : [],
        auditLogs: Array.isArray(backupData.auditLogs) ? backupData.auditLogs.filter((x: any) => x && typeof x === 'object') : [],
        notifications: Array.isArray(backupData.notifications) ? backupData.notifications.filter((x: any) => x && typeof x === 'object') : [],
        projectsOnSale: Array.isArray(backupData.projectsOnSale) ? backupData.projectsOnSale.filter((x: any) => x && typeof x === 'object') : [],
        unitRegistrations: Array.isArray(backupData.unitRegistrations) ? backupData.unitRegistrations.filter((x: any) => x && typeof x === 'object') : []
      };

      // Process everything in-memory to consolidate database write cycles defensively
      recalculateAllIncentivesDirect(sanitizedStore);

      // Append audit log record in-memory
      const auditLog = {
        id: `log-${crypto.randomUUID()}`,
        user_id: user ? user.id : 'system',
        username: user ? user.name : 'System Scheduler',
        role: user ? user.role : 'System',
        action: "Database Restore",
        details: "Successfully uploaded and restored database state snapshot files.",
        timestamp: new Date().toISOString()
      };
      sanitizedStore.auditLogs.unshift(auditLog);
      if (sanitizedStore.auditLogs.length > 500) {
        sanitizedStore.auditLogs = sanitizedStore.auditLogs.slice(0, 500);
      }

      // Append notification record in-memory
      const notif = {
        id: `notif-${crypto.randomUUID()}`,
        title: "Database Standard Restore Successful",
        message: "The database state files have been replaced and recalculated from backup.",
        type: "success" as const,
        timestamp: new Date().toISOString(),
        read: false
      };
      sanitizedStore.notifications.unshift(notif);
      if (sanitizedStore.notifications.length > 50) {
        sanitizedStore.notifications = sanitizedStore.notifications.slice(0, 50);
      }

      // Persist the consolidated database state to Firestore exactly once, and await it
      await writeStore(sanitizedStore);

      res.json({ success: true, message: "Database state restored successfully." });
    } catch (err: any) {
      console.error("[server.ts] Database restore failed:", err);
      res.status(500).json({ error: err.message || "An unexpected error occurred during database restore." });
    }
  });

  // Consolidated Multi-Table CSV Backup Export
  app.get('/api/system/backup-csv', authenticateToken, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'Admin') {
      res.status(403).json({ error: "Requires Admin authentication" });
      return;
    }
    try {
      const store = getStore();

      const escapeCSVField = (val: any): string => {
        if (val === null || val === undefined) return '""';
        if (typeof val === 'object') {
          return '"' + JSON.stringify(val).replace(/"/g, '""').replace(/\n/g, '\\n') + '"';
        }
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      };

      const serializeCollection = (tableName: string, items: any[]): string => {
        if (!items || items.length === 0) {
          return `# TABLE: ${tableName}\n\n`;
        }
        // Extract all unique headers/keys from items
        const headersSet = new Set<string>();
        items.forEach(item => {
          if (item && typeof item === 'object') {
            Object.keys(item).forEach(k => headersSet.add(k));
          }
        });
        const headers = Array.from(headersSet);
        let csv = `# TABLE: ${tableName}\n`;
        csv += headers.join(",") + "\n";
        for (const item of items) {
          if (!item) continue;
          const row = headers.map(h => escapeCSVField(item[h]));
          csv += row.join(",") + "\n";
        }
        csv += "\n";
        return csv;
      };

      let csvOutput = "# TPHL PORTAL MULTI-TABLE DATABASE BAK/SNAPSHOT\n";
      csvOutput += `# Date Generated: ${new Date().toISOString()}\n`;
      csvOutput += `# Authorized Operator: ${user.name} (${user.email})\n\n`;

      // Serialize arrays
      const collectionKeys: (keyof DatabaseStore)[] = [
        'users', 'projects', 'salesTeams', 'teamProjects', 'salesExecutives', 
        'incentiveRules', 'sales', 'salesIncentives', 'auditLogs', 
        'notifications', 'projectsOnSale', 'unitRegistrations'
      ];

      for (const key of collectionKeys) {
        const arr = (store[key] as any[]) || [];
        csvOutput += serializeCollection(key, arr);
      }

      // Serialize bonusRules object
      csvOutput += `# TABLE: bonusRules\n`;
      csvOutput += "target_90_bonus,target_100_bonus,team_target_bonus\n";
      const br = store.bonusRules || { target_90_bonus: 2000, target_100_bonus: 3500, team_target_bonus: 5000 };
      csvOutput += `${escapeCSVField(br.target_90_bonus)},${escapeCSVField(br.target_100_bonus)},${escapeCSVField(br.team_target_bonus)}\n\n`;

      logAction(user, "Database CSV Backup", "Downloaded a database state backup in CSV compound format.");
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="tphl_database_snapshot_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvOutput);
    } catch (err: any) {
      console.error("[server.ts] CSV Backup failed:", err);
      res.status(500).json({ error: "Failed to compile database CSV snapshot: " + err.message });
    }
  });

  // Consolidated Multi-Table CSV Restore Import
  app.post('/api/system/restore-csv', authenticateToken, express.text({ limit: '15mb' }), async (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'Admin') {
      res.status(403).json({ error: "Requires Admin authentication" });
      return;
    }
    try {
      const csvContent = req.body;
      if (!csvContent || typeof csvContent !== 'string') {
        res.status(400).json({ error: "No CSV content sent or invalid formatting." });
        return;
      }

      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const c = line[i];
          if (c === '"') {
            if (inQuotes && line[i + 1] === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (c === ',' && !inQuotes) {
            result.push(current);
            current = '';
          } else {
            current += c;
          }
        }
        result.push(current);
        return result;
      };

      const decodeCell = (cell: string) => {
        const t = cell.trim();
        if (t === "") return undefined;
        if (t.startsWith('{') && t.endsWith('}')) {
          try { return JSON.parse(t); } catch (e) { return t; }
        }
        if (t.startsWith('[') && t.endsWith(']')) {
          try { return JSON.parse(t); } catch (e) { return t; }
        }
        if (t === 'true') return true;
        if (t === 'false') return false;
        if (!isNaN(Number(t))) return Number(t);
        return cell;
      };

      const parsedStore: any = {
        users: [], projects: [], salesTeams: [], teamProjects: [], salesExecutives: [],
        incentiveRules: [], bonusRules: { target_90_bonus: 2000, target_100_bonus: 3500, team_target_bonus: 5000 },
        sales: [], salesIncentives: [], auditLogs: [], notifications: [],
        projectsOnSale: [], unitRegistrations: []
      };

      const tableParts = csvContent.split(/(?:\r?\n|^)# TABLE:\s*/i);

      for (let i = 1; i < tableParts.length; i++) {
        const part = tableParts[i];
        if (!part.trim()) continue;

        const lines = part.split(/\r?\n/);
        const tableName = lines[0].trim();
        if (!tableName) continue;

        const headersLine = lines[1];
        if (!headersLine) continue;

        const headers = parseCSVLine(headersLine).map(h => h.trim());
        const rows: any[] = [];

        // Now parse rows inside this part
        let accumulator = '';
        let inQuotes = false;

        for (let j = 2; j < lines.length; j++) {
          const line = lines[j];
          if (accumulator) {
            accumulator += '\n' + line;
          } else {
            accumulator = line;
          }

          for (const c of line) {
            if (c === '"') inQuotes = !inQuotes;
          }

          if (inQuotes) continue;

          const parsedRow = parseCSVLine(accumulator);
          accumulator = '';

          if (parsedRow.length > 0 && parsedRow.some(cell => cell.trim() !== '')) {
            const obj: any = {};
            headers.forEach((h, idx) => {
              if (parsedRow[idx] !== undefined) {
                const val = parsedRow[idx];
                if (val !== '') {
                  obj[h] = decodeCell(val);
                }
              }
            });
            rows.push(obj);
          }
        }

        if (tableName === 'bonusRules') {
          if (rows.length > 0) {
            parsedStore.bonusRules = rows[0];
          }
        } else {
          parsedStore[tableName] = rows;
        }
      }

      // Quick essential validations
      if (!parsedStore.projects || !parsedStore.salesExecutives || !parsedStore.salesTeams) {
        res.status(400).json({ error: "Essential tables (projects, salesTeams, salesExecutives) are missing." });
        return;
      }

      const sanitized: DatabaseStore = {
        users: Array.isArray(parsedStore.users) ? parsedStore.users : [],
        projects: Array.isArray(parsedStore.projects) ? parsedStore.projects : [],
        salesTeams: Array.isArray(parsedStore.salesTeams) ? parsedStore.salesTeams : [],
        teamProjects: Array.isArray(parsedStore.teamProjects) ? parsedStore.teamProjects : [],
        salesExecutives: Array.isArray(parsedStore.salesExecutives) ? parsedStore.salesExecutives : [],
        incentiveRules: Array.isArray(parsedStore.incentiveRules) ? parsedStore.incentiveRules : [],
        bonusRules: parsedStore.bonusRules || { target_90_bonus: 2000, target_100_bonus: 3500, team_target_bonus: 5000 },
        sales: Array.isArray(parsedStore.sales) ? parsedStore.sales : [],
        salesIncentives: Array.isArray(parsedStore.salesIncentives) ? parsedStore.salesIncentives : [],
        auditLogs: Array.isArray(parsedStore.auditLogs) ? parsedStore.auditLogs : [],
        notifications: Array.isArray(parsedStore.notifications) ? parsedStore.notifications : [],
        projectsOnSale: Array.isArray(parsedStore.projectsOnSale) ? parsedStore.projectsOnSale : [],
        unitRegistrations: Array.isArray(parsedStore.unitRegistrations) ? parsedStore.unitRegistrations : []
      };

      // Process everything in-memory to consolidate database write cycles defensively
      recalculateAllIncentivesDirect(sanitized);

      // Append audit log record in-memory
      const auditLog = {
        id: `log-${crypto.randomUUID()}`,
        user_id: user ? user.id : 'system',
        username: user ? user.name : 'System Scheduler',
        role: user ? user.role : 'System',
        action: "Database CSV Import",
        details: `Successfully restored all tables from CSV snapshot backing files.`,
        timestamp: new Date().toISOString()
      };
      sanitized.auditLogs.unshift(auditLog);
      if (sanitized.auditLogs.length > 500) {
        sanitized.auditLogs = sanitized.auditLogs.slice(0, 500);
      }

      // Append notification record in-memory
      const notif = {
        id: `notif-${crypto.randomUUID()}`,
        title: "CSV Catalog Snapshot Imported",
        message: "Portal state successfully populated and active commissions recalculated.",
        type: "success" as const,
        timestamp: new Date().toISOString(),
        read: false
      };
      sanitized.notifications.unshift(notif);
      if (sanitized.notifications.length > 50) {
        sanitized.notifications = sanitized.notifications.slice(0, 50);
      }

      // Persist the consolidated database state to Firestore exactly once, and await it
      await writeStore(sanitized);

      res.json({ success: true, count: Object.keys(sanitized).reduce((sum, key) => sum + (Array.isArray((sanitized as any)[key]) ? (sanitized as any)[key].length : 1), 0) });
    } catch (err: any) {
      console.error("[server.ts] CSV Restore failed:", err);
      res.status(500).json({ error: "Failed to parse or restore CSV snapshot: " + err.message });
    }
  });

  // --- HTML CLIENT INFRASTRUCTURE ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Serve client Router SPA shell
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (process.env.VERCEL) {
    console.log("[server.ts] Server running in Vercel environment. Bypassing active socket listen.");
  } else {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`TPHL Sales Incentive running on port ${PORT}`);
    });
  }

  return app;
}

if (!process.env.VERCEL) {
  startServer().catch(err => {
    console.error("Critical server boot error:", err);
  });
}
