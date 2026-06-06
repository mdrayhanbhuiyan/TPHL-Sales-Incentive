/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'Admin' | 'Sales Team Leader' | 'Sales Executive';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  employee_id?: string; // Links to SalesExecutive if role is Sales Executive
  team_id?: string;      // Links to SalesTeam if leader/executive
  created_at: string;
}

export interface Project {
  id: string;
  project_name: string;
  location: string;
  unit_measure: string; // SFT
  floors: number;
  units: number;
  total_flats: number;
  land_share_amount: number;
  first_sale_date: string;
  status: 'Active' | 'Completed' | 'Draft';
  registration?: 'Yes' | 'No';
  created_at: string;
}

export interface SalesTeam {
  id: string;
  team_name: string;
  team_leader: string; // User ID or Name of team leader
  sales_target: number; // in BDT
  monthly_targets?: { [key: string]: number }; // key: YYYY-MM -> target units
}

export interface TeamProject {
  id: string;
  team_id: string;
  project_id: string;
}

export interface SalesExecutive {
  id: string;
  employee_id: string;
  name: string;
  team_id: string;
  project_id: string; // Principal assigned project id
  target: number; // individual sales target
  joining_date: string;
  monthly_targets?: { [key: string]: number }; // key: YYYY-MM -> target units
}

export interface IncentiveRule {
  id: string;
  project_id: string;
  // sequence percentages for sale order 1st - 7th
  sale_1_percent: number;
  sale_2_percent: number;
  sale_3_percent: number;
  sale_4_percent: number;
  sale_5_percent: number;
  sale_6_percent: number;
  sale_7_percent: number;
  // Floor bonus percentages based on Land Share Amount
  first_floor_bonus_percent: number;
  top_floor_bonus_percent: number;
  created_at: string;
}

export interface BonusRules {
  target_90_bonus: number;  // Default: 2000
  target_100_bonus: number; // Default: 3500
  team_target_bonus: number; // Default: 5000
}

export interface Sale {
  id: string;
  project_id: string;
  unit_name: string;
  unit_measure: string;
  floor_number: number;
  sale_number: number; // chronological order of sale for the executive in this project
  sale_date: string;
  executive_id: string;
  project_on_sale_id?: string;
  buyer_name?: string;
}

export interface SalesIncentive {
  id: string;
  sale_id: string;
  executive_id: string;
  project_id: string;
  base_incentive: number;
  floor_bonus: number;
  target_bonus: number;
  team_bonus: number;
  total_incentive: number;
  month: number; // 1 - 12
  year: number;
}

export interface AuditLog {
  id: string;
  user_id: string;
  username: string;
  role: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
}

export interface ProjectOnSale {
  id: string;
  project_name: string; // Sale or property name
  flat_unit_size: string; // SFT or size, e.g. "1200 SFT"
  project_id: string; // Links to project from Projects Directory
  floor_number: number; // Total number of floors
  units_per_floor: number; // Units per floor (e.g., 2, 4)
  total_units: number; // floor_number * units_per_floor
  created_at: string;
}

export interface UnitRegistration {
  id: string;
  project_on_sale_id: string;
  unit_name: string; // e.g. "1A", "2B"
  registered: 'Yes' | 'No';
  registration_date?: string;
  created_at: string;
}

