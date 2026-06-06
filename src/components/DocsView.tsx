/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Database, FileCode, Network, BookOpen, Terminal, CheckCircle2 } from 'lucide-react';

export default function DocsView() {
  const [activeTab, setActiveTab] = useState<'er' | 'api' | 'db' | 'deploy'>('er');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">System Documentation &amp; Architecture</h1>
          <p className="mt-1 text-sm text-gray-500">Live reference guides for ER Diagrams, Database Schemas, API Specs, and Server Deployment.</p>
        </div>
      </div>

      {/* Docs Inner Tabs */}
      <div className="flex space-x-1 rounded-xl bg-gray-100/80 p-1 max-w-2xl">
        <button
          onClick={() => setActiveTab('er')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            activeTab === 'er'
              ? 'bg-white text-gray-900 shadow-xs'
              : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
          }`}
        >
          <Network className="w-4 h-4 text-emerald-500" />
          ER Diagram
        </button>
        <button
          onClick={() => setActiveTab('db')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            activeTab === 'db'
              ? 'bg-white text-gray-900 shadow-xs'
              : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
          }`}
        >
          <Database className="w-4 h-4 text-indigo-500" />
          MySQL Table Schema
        </button>
        <button
          onClick={() => setActiveTab('api')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            activeTab === 'api'
              ? 'bg-white text-gray-900 shadow-xs'
              : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
          }`}
        >
          <FileCode className="w-4 h-4 text-rose-500" />
          REST API Docs
        </button>
        <button
          onClick={() => setActiveTab('deploy')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            activeTab === 'deploy'
              ? 'bg-white text-gray-900 shadow-xs'
              : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
          }`}
        >
          <Terminal className="w-4 h-4 text-amber-500" />
          Deployment Guide
        </button>
      </div>

      {/* ER Diagram Section */}
      {activeTab === 'er' && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs space-y-6">
          <div className="border-l-4 border-emerald-500 pl-4">
            <h2 className="text-lg font-semibold text-gray-900">Database Entity Relationship Diagram (ERD)</h2>
            <p className="text-xs text-gray-500">TPHL Sales Incentive Management System - Relational Mapping</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="border border-gray-100 rounded-2xl bg-gray-50/50 p-4 space-y-3">
              <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">1. Core Actors</span>
              <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-2xs">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 border-b border-gray-100 pb-1 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  Users
                </div>
                <div className="text-xs font-mono space-y-1 text-gray-500">
                  <div>🔐 id (PK)</div>
                  <div>📧 email (UNIQUE)</div>
                  <div>👤 name</div>
                  <div>💼 role (Admin / Leader / Exec)</div>
                  <div>🆔 employee_id (FK → Executives)</div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-2xs">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 border-b border-gray-100 pb-1 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  SalesExecutives
                </div>
                <div className="text-xs font-mono space-y-1 text-gray-500">
                  <div>🔐 id (PK)</div>
                  <div>🆔 employee_id (UNIQUE)</div>
                  <div>👤 name</div>
                  <div>👥 team_id (FK → Teams)</div>
                  <div>🏢 project_id (FK → Projects)</div>
                  <div>🎯 target (sales quota)</div>
                </div>
              </div>
            </div>

            <div className="border border-gray-100 rounded-2xl bg-gray-50/50 p-4 space-y-3">
              <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">2. Business Units</span>
              <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-2xs">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 border-b border-gray-100 pb-1 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Projects
                </div>
                <div className="text-xs font-mono space-y-1 text-gray-500">
                  <div>🔐 id (PK)</div>
                  <div>🏠 project_name</div>
                  <div>📍 location</div>
                  <div>📏 unit_measure (SFT)</div>
                  <div>🏢 total_flats | floors</div>
                  <div>💰 land_share_amount</div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-2xs">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 border-b border-gray-100 pb-1 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                  SalesTeams
                </div>
                <div className="text-xs font-mono space-y-1 text-gray-500">
                  <div>🔐 id (PK)</div>
                  <div>👥 team_name</div>
                  <div>👑 team_leader</div>
                  <div>🎯 sales_target (monthly)</div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 border-b border-gray-100 pb-1 mb-1 bg-yellow-50/50 p-1 rounded">
                  🔗 TeamProjects (Many-to-Many Join)
                </div>
                <div className="text-xs font-mono space-y-1 text-gray-500">
                  <div>id (PK) | team_id (FK) | project_id (FK)</div>
                </div>
              </div>
            </div>

            <div className="border border-gray-100 rounded-2xl bg-gray-50/50 p-4 space-y-3">
              <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">3. Incentive Operations</span>
              <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-2xs">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 border-b border-gray-100 pb-1 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Sales Entries
                </div>
                <div className="text-xs font-mono space-y-1 text-gray-500">
                  <div>🔐 id (PK)</div>
                  <div>🏢 project_id (FK)</div>
                  <div>🚪 unit_name</div>
                  <div>📶 floor_number</div>
                  <div>📈 sale_number (Calculated Sequence)</div>
                  <div>👤 executive_id (FK)</div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-2xs">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 border-b border-gray-100 pb-1 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                  SalesIncentives
                </div>
                <div className="text-xs font-mono space-y-1 text-gray-400 bg-gray-950 p-2.5 rounded-lg">
                  <div className="text-emerald-400">💰 total_incentive</div>
                  <div>├─ base_incentive</div>
                  <div>├─ floor_bonus</div>
                  <div>├─ target_bonus</div>
                  <div className="text-gray-500">└─ team_bonus</div>
                  <div className="mt-1 text-[10px]">sale_id (FK) | month | year</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-blue-50 border border-blue-100/50 p-4 text-xs text-blue-800 space-y-1.5">
            <h4 className="font-semibold flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-blue-500"/> Cascading Logic Trigger</h4>
            <p>Every time a <b>Sales Entry</b> is recorded, edited, or deleted, the system database trigger performs an automatic chronological indexing of the sale's sequence within its project. The <b>Incentive Engine</b> instantly re-computes the sequence percentages (1st to 7th sale) based on admin-defined Project Rules, injects Floor Bonuses, and checks Monthly Individual &amp; Team Targets to compute the <b>SalesIncentives</b> row.</p>
          </div>
        </div>
      )}

      {/* MySQL Tables Section */}
      {activeTab === 'db' && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs space-y-6">
          <div className="border-l-4 border-indigo-500 pl-4">
            <h2 className="text-lg font-semibold text-gray-900">MySQL Table Definitions &amp; Relational Indexing</h2>
            <p className="text-xs text-gray-500">SQL DML &amp; DDL commands to create the target schema.</p>
          </div>

          <div className="space-y-4">
            <details open className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden group">
              <summary className="p-4 font-mono text-sm text-gray-700 cursor-pointer font-semibold select-none flex items-center justify-between">
                <span>📦 Core Tables Schema (Projects, Teams, Executives, Sales)</span>
                <span className="text-indigo-600 font-sans text-xs group-open:hidden">Show SQL Code</span>
              </summary>
              <div className="p-4 border-t border-gray-100 bg-gray-950 text-gray-300 font-mono text-xs overflow-x-auto space-y-2">
                <p className="text-emerald-500">{"-- Create Projects Table"}</p>
                <pre>{`CREATE TABLE Projects (
  id VARCHAR(50) PRIMARY KEY,
  project_name VARCHAR(150) NOT NULL,
  location VARCHAR(250) NOT NULL,
  unit_measure INT NOT NULL, -- SFT size
  floors INT DEFAULT 1,
  units INT NOT NULL,
  total_flats INT NOT NULL,
  land_share_amount DECIMAL(15, 2) NOT NULL,
  first_sale_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`}</pre>
                <p className="text-emerald-500">{"-- Create SalesTeams & Bridge TeamProjects"}</p>
                <pre>{`CREATE TABLE SalesTeams (
  id VARCHAR(50) PRIMARY KEY,
  team_name VARCHAR(100) NOT NULL,
  team_leader VARCHAR(100) NOT NULL,
  sales_target DECIMAL(15, 2) DEFAULT 0.00
);

CREATE TABLE TeamProjects (
  id VARCHAR(50) PRIMARY KEY,
  team_id VARCHAR(50),
  project_id VARCHAR(50),
  FOREIGN KEY (team_id) REFERENCES SalesTeams(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE CASCADE
);`}</pre>
                <p className="text-emerald-500">{"-- Create SalesExecutives"}</p>
                <pre>{`CREATE TABLE SalesExecutives (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  team_id VARCHAR(50),
  project_id VARCHAR(50),
  target DECIMAL(15, 2) DEFAULT 0.00,
  joining_date DATE NOT NULL,
  FOREIGN KEY (team_id) REFERENCES SalesTeams(id) ON DELETE SET NULL,
  FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE SET NULL
);`}</pre>
              </div>
            </details>

            <details className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden group">
              <summary className="p-4 font-mono text-sm text-gray-700 cursor-pointer font-semibold select-none flex items-center justify-between">
                <span>💰 Operations Tables Schema (Rules, Sales, Incentives)</span>
                <span className="text-indigo-600 font-sans text-xs group-open:hidden">Show SQL Code</span>
              </summary>
              <div className="p-4 border-t border-gray-100 bg-gray-950 text-gray-300 font-mono text-xs overflow-x-auto space-y-2">
                <p className="text-emerald-500">{"-- IncentiveRules Table for Sales Sequences"}</p>
                <pre>{`CREATE TABLE IncentiveRules (
  id VARCHAR(50) PRIMARY KEY,
  project_id VARCHAR(50) NOT NULL,
  sale_1_percent DECIMAL(5,2) DEFAULT 1.5,
  sale_2_percent DECIMAL(5,2) DEFAULT 1.8,
  sale_3_percent DECIMAL(5,2) DEFAULT 2.0,
  sale_4_percent DECIMAL(5,2) DEFAULT 2.2,
  sale_5_percent DECIMAL(5,2) DEFAULT 2.5,
  sale_6_percent DECIMAL(5,2) DEFAULT 2.8,
  sale_7_percent DECIMAL(5,2) DEFAULT 3.0,
  first_floor_bonus_percent DECIMAL(5,2) DEFAULT 0.50,
  top_floor_bonus_percent DECIMAL(5,2) DEFAULT 0.50,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE CASCADE
);`}</pre>
                <p className="text-emerald-500">{"-- Sales & Incentives"}</p>
                <pre>{`CREATE TABLE Sales (
  id VARCHAR(50) PRIMARY KEY,
  project_id VARCHAR(50) NOT NULL,
  unit_name VARCHAR(50) NOT NULL,
  unit_measure INT NOT NULL,
  floor_number INT NOT NULL,
  sale_number INT NOT NULL,  -- sequence per individual executive per project
  sale_date DATE NOT NULL,
  executive_id VARCHAR(50) NOT NULL,
  FOREIGN KEY (project_id) REFERENCES Projects(id),
  FOREIGN KEY (executive_id) REFERENCES SalesExecutives(id)
);

CREATE TABLE SalesIncentives (
  id VARCHAR(50) PRIMARY KEY,
  sale_id VARCHAR(50) NOT NULL,
  executive_id VARCHAR(50) NOT NULL,
  project_id VARCHAR(50) NOT NULL,
  base_incentive DECIMAL(15,2) NOT NULL,
  floor_bonus DECIMAL(15,2) DEFAULT 0.00,
  target_bonus DECIMAL(15,2) DEFAULT 0.00, -- individual
  team_bonus DECIMAL(15,2) DEFAULT 0.00,   -- team target achievement
  total_incentive DECIMAL(15,2) NOT NULL,
  month INT NOT NULL,
  year INT NOT NULL,
  FOREIGN KEY (sale_id) REFERENCES Sales(id) ON DELETE CASCADE,
  FOREIGN KEY (executive_id) REFERENCES SalesExecutives(id) ON DELETE CASCADE
);`}</pre>
              </div>
            </details>
          </div>
        </div>
      )}

      {/* REST API SECTION */}
      {activeTab === 'api' && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs space-y-6">
          <div className="border-l-4 border-rose-500 pl-4">
            <h2 className="text-lg font-semibold text-gray-900">System REST API Endpoints Specification</h2>
            <p className="text-xs text-gray-500">Fully documented endpoints secured via JWT-mimic Authorization Bearer Headers.</p>
          </div>

          <div className="space-y-4">
            {/* Login */}
            <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50 space-y-2">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-green-500 text-white">POST</span>
                <span className="font-mono text-sm text-gray-800 font-semibold">/api/auth/login</span>
              </div>
              <p className="text-xs text-gray-500">Authenticate user credentials and returns custom session/JWT token parameters.</p>
              <div className="bg-gray-950 p-3 rounded-xl text-xs font-mono text-gray-300">
                <div>{"Body Request:"}</div>
                <div className="text-blue-400">{`{ "email": "admin@tphl.com", "password": "admin123" }`}</div>
              </div>
            </div>

            {/* Dashboard */}
            <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50 space-y-2">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-blue-500 text-white">GET</span>
                <span className="font-mono text-sm text-gray-800 font-semibold">/api/dashboard/analytics</span>
              </div>
              <p className="text-xs text-gray-500">Retrieves cards counts, tops lists, target achievements rates, and monthly chart timeline matrices.</p>
              <div className="bg-gray-950 p-3 rounded-xl text-xs font-mono text-gray-400">
                <span className="text-rose-400">Header:</span> Authorization: Bearer &lt;token&gt;
              </div>
            </div>

            {/* Projects CRUD */}
            <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50 space-y-2">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-blue-500 text-white">GET</span>
                <span className="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-green-500 text-white">POST</span>
                <span className="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-amber-500 text-white">PUT</span>
                <span className="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-rose-500 text-white">DELETE</span>
                <span className="font-mono text-sm text-gray-800 font-semibold">/api/projects[:id]</span>
              </div>
              <p className="text-xs text-gray-500">Full CRUD operations for Projects. Updates automatically recalculate all active incentive payouts.</p>
            </div>

            {/* Rules Updates */}
            <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50 space-y-2">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-amber-500 text-white">PUT</span>
                <span className="font-mono text-sm text-gray-800 font-semibold">/api/rules/project/:project_id</span>
              </div>
              <p className="text-xs text-gray-500">Directly modifies sequence percentage rates (1st Sale to 7th Sale) and Floor multipliers for a project.</p>
            </div>

            {/* Backup/Restore */}
            <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50 space-y-2">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-blue-500 text-white">GET</span>
                <span className="font-mono text-sm text-gray-800 font-semibold">/api/system/backup</span>
              </div>
              <p className="text-xs text-gray-500">Admin-only download. Serializes entire relational DB state to JSON file download.</p>
              
              <div className="flex items-center gap-3 pt-2">
                <span className="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-green-500 text-white">POST</span>
                <span className="font-mono text-sm text-gray-800 font-semibold">/api/system/restore</span>
              </div>
              <p className="text-xs text-gray-500">Upload JSON dump. Completely overrides db state and re-computes all live incentives.</p>
            </div>
          </div>
        </div>
      )}

      {/* Deployment Guide Section */}
      {activeTab === 'deploy' && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs space-y-6">
          <div className="border-l-4 border-amber-500 pl-4">
            <h2 className="text-lg font-semibold text-gray-900">Deployment &amp; Compilation Guide</h2>
            <p className="text-xs text-gray-500">Step-by-step developer runtime environment deployment instructions.</p>
          </div>

          <div className="space-y-4 text-sm text-gray-700">
            <h3 className="font-semibold text-md text-gray-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              1. Local Setup Instructions
            </h3>
            <p className="text-xs text-gray-500">Follow these coordinates to run the system stand-alone on Node.js:</p>
            <div className="bg-gray-950 p-4 rounded-2xl text-xs font-mono text-gray-300 space-y-4">
              <div>
                <p className="text-gray-500">{"# Clone the repository and install dependencies"}</p>
                <p className="text-emerald-400">npm install</p>
              </div>
              <div>
                <p className="text-gray-500">{"# Start development server (supports Hot Reload and tsx daemon)"}</p>
                <p className="text-emerald-400">npm run dev</p>
              </div>
              <div>
                <p className="text-gray-500">{"# Compile building final clean bundles (Node + React bundle)"}</p>
                <p className="text-emerald-400">npm run build</p>
              </div>
              <div>
                <p className="text-gray-500">{"# Boot the applet server for production deployment"}</p>
                <p className="text-emerald-400">npm run start</p>
              </div>
            </div>

            <h3 className="font-semibold text-md text-gray-800 flex items-center gap-2 pt-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              2. Container Build &amp; Cloud Run Deployment
            </h3>
            <p className="text-xs text-gray-500">To publish build using standard Dockerfile specifications:</p>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 font-mono text-xs text-gray-600 space-y-1.5">
              <div>FROM node:20-alpine AS build</div>
              <div>WORKDIR /app</div>
              <div>COPY package*.json ./</div>
              <div>RUN npm ci</div>
              <div>COPY . .</div>
              <div>RUN npm run build</div>
              <div>EXPOSE 3000</div>
              <div>ENV NODE_ENV=production</div>
              <div>CMD ["npm", "run", "start"]</div>
            </div>
            
            <p className="text-xs text-gray-500">Run shell credentials on Google Cloud SDK for automated push:</p>
            <div className="bg-gray-950 p-3 rounded-xl text-xs font-mono text-gray-300">
              <p className="text-emerald-400">{"gcloud run deploy tphl-incentive-app --source . --port 3000 --region asia-southeast1 --allow-unauthenticated"}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
