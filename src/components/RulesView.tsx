/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Settings, 
  Coins, 
  Percent, 
  Calculator, 
  CheckCircle, 
  AlertTriangle,
  FlameKindling,
  Sparkles
} from 'lucide-react';
import { Project, IncentiveRule } from '../types';

interface RulesViewProps {
  authToken: string;
  userRole: string;
}

export default function RulesView({ authToken, userRole }: RulesViewProps) {
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
  }, [authToken]);

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
      // Trigger update of state to match recalculations
      fetchRulesAndProjects(selectedProjId);
    } catch (err: any) {
      setError(err.message);
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
      fetchRulesAndProjects(selectedProjId);
    } catch (err: any) {
      setError(err.message);
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
      <div className="border-b border-gray-100 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Incentive Calculation Setup</h1>
        <p className="mt-1 text-sm text-gray-500 font-medium">Fine-tune commission matrices, set floor rate multipliers, and adjust global target thresholds.</p>
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
    </div>
  );
}
