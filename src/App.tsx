/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, collection, onSnapshot, enableIndexedDbPersistence } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

let firestoreDb: any = null;
try {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  firestoreDb = initializeFirestore(app, {
    experimentalForceLongPolling: true
  }, firebaseConfig.firestoreDatabaseId);

  if (typeof window !== 'undefined') {
    enableIndexedDbPersistence(firestoreDb).catch((err) => {
      console.warn("[App.tsx] Firestore persistence could not be enabled:", err);
    });
  }
} catch (e) {
  console.warn("[App.tsx] Client firebase connection not initialized:", e);
}
import { 
  Building2, 
  TrendingUp, 
  Users, 
  Target, 
  Settings, 
  FileSpreadsheet, 
  ShieldAlert, 
  Activity, 
  LogOut, 
  Building,
  Menu,
  X,
  Bell,
  HelpCircle,
  Database,
  Sun,
  Moon,
  User
} from 'lucide-react';

import LoginView from './components/LoginView';
import DashboardView from './components/DashboardView';
import ProjectView from './components/ProjectView';
import TeamsView from './components/TeamsView';
import ExecutivesView from './components/ExecutivesView';
import RulesView from './components/RulesView';
import SalesEntryView from './components/SalesEntryView';
import IncentivesView from './components/IncentivesView';
import DocsView from './components/DocsView';
import SettingsView from './components/SettingsView';
import ProjectsOnSaleView from './components/ProjectsOnSaleView';
import RegistrationView from './components/RegistrationView';
import { useToast } from './components/Toast';

type AppRoute = 'dashboard' | 'projects-on-sale' | 'registration' | 'projects' | 'teams' | 'executives' | 'rules' | 'sales' | 'incentives' | 'docs' | 'settings';

export default function App() {
  const { toast } = useToast();
  const [authToken, setAuthToken] = useState<string | null>('u-admin');
  const [userProfile, setUserProfile] = useState<any | null>({
    id: "u-admin",
    email: "rayhanbhuiyan2021@gmail.com",
    name: "Rayhan Bhuiyan",
    role: "Admin"
  });
  const [checkingAuth, setCheckingAuth] = useState(false);

  // Theme support
  const [isDarkMode, setIsDarkMode] = useState<boolean>(localStorage.getItem('tphl_theme') === 'dark');

  // Profile Modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Password change states
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Layout states
  const [activeRoute, setActiveRoute] = useState<AppRoute>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notificationsCount, setNotificationsCount] = useState(0);

  // Real-time synchronization states
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'Live Connected' | 'Fallback'>('Fallback');

  // Firestore real-time listener subscription
  useEffect(() => {
    if (!firestoreDb) {
      setSyncStatus('Fallback');
      return;
    }

    try {
      setSyncStatus('Live Connected');
      let isInitialSetup = true;

      const unsub = onSnapshot(collection(firestoreDb, 'sales_portal_data'), (snapshot) => {
        if (!isInitialSetup) {
          console.log("[App.tsx] Real-time Firestore update triggered, updating refreshTrigger!");
          setIsSyncing(true);
          toast.success("Database sync successful! State updated in real-time.");
          setRefreshTrigger(prev => prev + 1);
          setTimeout(() => {
            setIsSyncing(false);
          }, 1000);
        } else {
          isInitialSetup = false;
        }
      }, (error) => {
        console.error("Firestore onSnapshot subscription failed:", error);
        setSyncStatus('Fallback');
      });

      return () => unsub();
    } catch (err) {
      console.error("Failed to register isSnapshot event listener:", err);
      setSyncStatus('Fallback');
    }
  }, []);

  // Fallback Polling when client-side direct listener is inactive or offline
  useEffect(() => {
    if (syncStatus !== 'Fallback') return;

    const interval = setInterval(() => {
      // Periodic ping check to refresh UI states safely
      fetch('/api/system/firebase-diagnostics', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })
      .then(res => res.json())
      .then(data => {
        // Increment trigger to sync frontend with any backend state changes
        setRefreshTrigger(prev => prev + 1);
      })
      .catch((e) => console.warn("[App.tsx] Fallback sync poll failed:", e));
    }, 12000); // Poll every 12 seconds in fallback mode

    return () => clearInterval(interval);
  }, [syncStatus, authToken]);

  // Sync dark class list
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('tphl_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('tphl_theme', 'light');
    }
  }, [isDarkMode]);

  // Simulation and dynamic permission tracking
  const [allRolePermissions, setAllRolePermissions] = useState<any>(null);
  const [simulatedRole, setSimulatedRole] = useState<string | null>(null);

  const effectiveRole = simulatedRole || userProfile?.role || 'Admin';
  const effectivePermissions = allRolePermissions?.[effectiveRole] || userProfile?.permissions || {
    allowedViews: ['dashboard', 'projects-on-sale', 'registration', 'sales', 'incentives', 'docs'],
    allowedEdits: ['sales']
  };

  // Authenticate and load permissions state on startup
  useEffect(() => {
    const defaultToken = 'u-admin';
    localStorage.setItem('tphl_token', defaultToken);
    fetchUnreadNotifications(defaultToken);
    loadGlobalAccessPolicies(defaultToken);
  }, []);

  useEffect(() => {
    if (authToken) {
      loadGlobalAccessPolicies(authToken);
    }
  }, [authToken]);

  const loadGlobalAccessPolicies = (token: string) => {
    // Sync active profile schema
    fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(data => {
      if (data && data.user) {
        setUserProfile(data.user);
      }
    })
    .catch(err => console.error(err));

    // Get current Cloud Policies from Firestore
    fetch('/api/permissions', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(data => {
      if (data && typeof data === 'object') {
        setAllRolePermissions(data);
      }
    })
    .catch(err => console.error("Failed to load Firebase permission boundaries configuration:", err));
  };

  const fetchUnreadNotifications = (token: string) => {
    fetch('/api/system/notifications', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(notifList => {
      const count = notifList.filter((n: any) => !n.read).length;
      setNotificationsCount(count);
    })
    .catch(err => console.error(err));
  };

  const handleLoginSuccess = (token: string, user: any) => {
    localStorage.setItem('tphl_token', token);
    setAuthToken(token);
    setUserProfile(user);
    setSimulatedRole(null);
    setActiveRoute('dashboard');
    fetchUnreadNotifications(token);
    loadGlobalAccessPolicies(token);
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }
    if (!newPassword) {
      setPasswordError('New password is required');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (newPassword.length < 4) {
      setPasswordError('New password must be at least 4 characters long');
      return;
    }

    setIsSavingPassword(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update password');
      }
      setPasswordSuccess('Password changed successfully!');
      // Reset input fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // After 2.5 seconds, hide success message and exit changing-password view
      setTimeout(() => {
        setIsChangingPassword(false);
        setPasswordSuccess('');
      }, 2500);
    } catch (err: any) {
      setPasswordError(err.message || 'An error occurred.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tphl_token');
    setAuthToken(null);
    setUserProfile(null);
    setSimulatedRole(null);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50/50 space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
        <p className="text-sm font-semibold text-gray-500 font-mono">Initializing TPHL Sales Incentive Access...</p>
      </div>
    );
  }

  if (!authToken || !userProfile) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // Define sidebar navigation items based on Role Access Bounds
  // Admin -> Full Access
  // Team Leader -> Performance, Projects, Sales Teams, Record Bookings, Ledgers, Docs
  // Exec -> Performance, Record Bookings, Ledgers, Docs
  const menuItems = [
    { id: 'dashboard', label: 'Performance Analytics', icon: TrendingUp, roles: ['Admin', 'Sales Team Leader', 'Sales Executive'] },
    { id: 'projects-on-sale', label: 'Projects On Sale', icon: Building, roles: ['Admin', 'Sales Team Leader', 'Sales Executive'] },
    { id: 'registration', label: 'Unit Registration', icon: FileSpreadsheet, roles: ['Admin', 'Sales Team Leader', 'Sales Executive'] },
    { id: 'projects', label: 'Projects Directory', roles: ['Admin', 'Sales Team Leader'] },
    { id: 'teams', label: 'Sales Team Divisions', roles: ['Admin', 'Sales Team Leader'] },
    { id: 'executives', label: 'Sales Executives', roles: ['Admin'] },
    { id: 'rules', label: 'Calculation Setup', roles: ['Admin'] },
    { id: 'sales', label: 'Record Sales Entries', icon: Building, roles: ['Admin', 'Sales Team Leader', 'Sales Executive'] },
    { id: 'incentives', label: 'Ledgers & Reports', icon: FileSpreadsheet, roles: ['Admin', 'Sales Team Leader', 'Sales Executive'] },
    { id: 'docs', label: 'System Schemas Docs', icon: Database, roles: ['Admin', 'Sales Team Leader', 'Sales Executive'] },
    { id: 'settings', label: 'System Maintenance', icon: Settings, roles: ['Admin'] },
  ];

  const visibleMenuItems = menuItems.filter(item => {
    if (effectiveRole === 'Admin') return true;
    if (effectivePermissions && Array.isArray(effectivePermissions.allowedViews)) {
      return effectivePermissions.allowedViews.includes(item.id);
    }
    return item.roles.includes(effectiveRole);
  });

  const renderActiveView = () => {
    switch (activeRoute) {
      case 'dashboard':
        return <DashboardView authToken={authToken} userRole={userProfile.role} userProfile={userProfile} refreshTrigger={refreshTrigger} />;
      case 'projects-on-sale':
        return <ProjectsOnSaleView authToken={authToken} userRole={userProfile.role} refreshTrigger={refreshTrigger} />;
      case 'registration':
        return <RegistrationView authToken={authToken} userRole={userProfile.role} refreshTrigger={refreshTrigger} />;
      case 'projects':
        return <ProjectView authToken={authToken} userRole={userProfile.role} refreshTrigger={refreshTrigger} />;
      case 'teams':
        return <TeamsView authToken={authToken} userRole={userProfile.role} refreshTrigger={refreshTrigger} />;
      case 'executives':
        return <ExecutivesView authToken={authToken} userRole={userProfile.role} refreshTrigger={refreshTrigger} />;
      case 'rules':
        return <RulesView authToken={authToken} userRole={userProfile.role} refreshTrigger={refreshTrigger} />;
      case 'sales':
        return <SalesEntryView authToken={authToken} userRole={userProfile.role} userProfile={userProfile} refreshTrigger={refreshTrigger} />;
      case 'incentives':
        return <IncentivesView authToken={authToken} userRole={userProfile.role} refreshTrigger={refreshTrigger} />;
      case 'docs':
        return <DocsView />;
      case 'settings':
        return <SettingsView authToken={authToken} userRole={userProfile.role} />;
      default:
        return <DashboardView authToken={authToken} userRole={userProfile.role} userProfile={userProfile} refreshTrigger={refreshTrigger} />;
    }
  };

  const getRouteLabelAndEmoji = (route: AppRoute) => {
    switch (route) {
      case 'dashboard': return '📊 Dashboard';
      case 'projects-on-sale': return '🏷️ Projects On Sale';
      case 'registration': return '🔑 Unit Registration';
      case 'projects': return '🏢 Projects Directory';
      case 'teams': return '👥 Sales Divisions';
      case 'executives': return '👤 Sales Executives';
      case 'rules': return '⚙️ Incentive Engine Rules';
      case 'sales': return '✍️ Log Sales entries';
      case 'incentives': return '💵 Incentive Claims & Reports';
      case 'docs': return '📄 System Schemas Docs';
      case 'settings': return '🛠️ System Maintenance';
      default: return 'TPHL App';
    }
  };

  return (
    <div className={`min-h-screen flex transition-colors duration-200 ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-gray-50/50 text-gray-900'}`}>
      {/* 1. DESKTOP SIDEBAR PANEL */}
      <aside className={`hidden lg:flex flex-col w-72 border-r p-6 space-y-8 h-screen sticky top-0 shrink-0 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600 text-white shadow-md">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 dark:text-white text-sm tracking-tight leading-tight">TPHL Incentive</h1>
            <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono font-medium lowercase">Management portal</span>
          </div>
        </div>

        {/* User profile capsule with Sim Switcher for Admins */}
        <div className={`rounded-2xl p-4 space-y-3 border ${isDarkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-gray-50 border-gray-100'}`}>
          <div 
            onClick={() => setIsProfileModalOpen(true)}
            className="space-y-0.5 truncate pr-2 cursor-pointer group flex-1"
            title="Click to view profile details"
          >
            <h4 className="font-bold text-gray-900 dark:text-white text-xs truncate leading-normal group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">{userProfile.name}</h4>
            <div className="flex items-center gap-1.5 ">
              <span className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-400 font-bold uppercase px-1.5 py-0.5 rounded-full tracking-wider select-none font-mono">
                {userProfile.role === 'Sales Team Leader' ? 'Leader' : userProfile.role === 'Sales Executive' ? 'Executive' : 'Admin'}
              </span>
              {simulatedRole && (
                <span className="text-[9px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-bold uppercase px-1.5 py-0.5 rounded-full tracking-wider select-none font-mono">
                  Simulating
                </span>
              )}
            </div>
            {userProfile.employee_id && (
              <span className="text-[9px] text-gray-400 dark:text-slate-500 font-mono tracking-wider font-bold block mt-1">ID: {userProfile.employee_id}</span>
            )}
          </div>

          {(userProfile.role === 'Admin' || simulatedRole) && (
            <div className="pt-2 border-t border-gray-200/50 dark:border-slate-800">
              <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Simulate Role View</label>
              <select
                value={effectiveRole}
                onChange={(e) => {
                  const val = e.target.value;
                  setSimulatedRole(val === 'Admin' ? null : val);
                  const mockPerms = allRolePermissions?.[val] || userProfile.permissions || { allowedViews: [] };
                  if (val !== 'Admin' && (!mockPerms.allowedViews || !mockPerms.allowedViews.includes(activeRoute))) {
                    setActiveRoute('dashboard');
                  }
                }}
                className={`w-full bg-transparent border rounded-lg px-2 py-1 text-[10px] font-semibold focus:ring-1 outline-hidden cursor-pointer ${
                  isDarkMode 
                    ? 'border-slate-800 text-slate-300 focus:ring-indigo-500 bg-slate-900' 
                    : 'border-gray-200 text-gray-700 focus:ring-indigo-500 bg-white'
                }`}
              >
                <option value="Admin">🔑 Full System Admin</option>
                <option value="Sales Team Leader">👤 Sales Team Leader</option>
                <option value="Sales Executive">🌱 Sales Executive</option>
              </select>
            </div>
          )}
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {visibleMenuItems.map(item => {
            const isSelected = activeRoute === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveRoute(item.id as AppRoute)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold w-full transition duration-150 cursor-pointer ${
                  isSelected 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-950 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-slate-800/40'
                }`}
              >
                <span>{getRouteLabelAndEmoji(item.id as AppRoute)}</span>
              </button>
            );
          })}
        </nav>

        {/* Desktop Sign Out Button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold w-full text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer border border-dashed border-rose-200/50 dark:border-rose-950/30"
        >
          <LogOut className="w-4 h-4 text-rose-500" />
          <span>Sign Out / Log Out</span>
        </button>

        {/* Core credits */}
        <div className="text-[10px] text-gray-400 font-mono border-t border-gray-50 pt-3">
          <span>Enterprise System v2.0</span>
        </div>
      </aside>

      {/* 2. MAIN CLIENT CONTENT BODY */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* UPPER NAVIGATION BAR RAIL */}
        <header className={`h-16 border-b flex items-center justify-between px-6 sticky top-0 z-40 transition-all duration-300 shadow-xs dark:shadow-md ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white shadow-slate-950/45' : 'bg-white border-gray-100 text-gray-800 shadow-gray-100/50'}`}>
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={`lg:hidden p-2 rounded-xl transition ${isDarkMode ? 'hover:bg-slate-850 text-slate-400' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden lg:flex items-center gap-2 text-xs font-bold font-mono text-gray-400 dark:text-slate-500 uppercase tracking-widest">
              <span>Auditing Portal</span>
              <span>/</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{activeRoute}</span>
            </div>
            {/* Mobile Brand Label */}
            <div className="lg:hidden flex items-center gap-1.5">
              <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span className="font-black text-gray-900 dark:text-white text-xs">TPHL</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Real-time synchronization state badge */}
            <div className={`flex items-center gap-1.5 border text-[10px] font-mono px-2.5 py-1 rounded-full select-none transition-all duration-300 ${
              syncStatus === 'Live Connected'
                ? (isDarkMode ? 'bg-indigo-950/40 border-indigo-900/40 text-indigo-400' : 'bg-indigo-50 border-indigo-100 text-indigo-700')
                : (isDarkMode ? 'bg-amber-950/40 border-amber-900/40 text-amber-500' : 'bg-amber-50 border-amber-100 text-amber-700')
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                syncStatus === 'Live Connected' ? 'bg-indigo-500' : 'bg-amber-500'
              } ${isSyncing ? 'animate-ping' : ''}`} />
              <span className="font-bold">{syncStatus === 'Live Connected' ? '📡 LIVE SYNC' : '💾 STANDBY'}</span>
            </div>

            {/* Quick system check badge */}
            <div className={`flex items-center gap-1.5 border text-[10px] font-mono px-2.5 py-1 rounded-full ${isDarkMode ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-400' : 'bg-emerald-50 border-emerald-100/65 text-emerald-800'}`}>
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              <span className="font-bold select-none">SYSTEMS SECURE</span>
            </div>

            {/* Dark & Light Theme Mode Toggle */}
            <button
              onClick={() => setIsDarkMode(prev => !prev)}
              className={`p-2 rounded-xl transition cursor-pointer ${isDarkMode ? 'hover:bg-slate-800 text-slate-4e0 hover:text-amber-400' : 'hover:bg-gray-100 text-gray-500 hover:text-indigo-600'}`}
              title={isDarkMode ? "Deactivate Dark Mode" : "Activate Dark Mode"}
            >
              {isDarkMode ? (
                <Sun className="w-4.5 h-4.5" />
              ) : (
                <Moon className="w-4.5 h-4.5" />
              )}
            </button>

            {/* Notifications icon */}
            <button 
              onClick={() => {
                setActiveRoute('settings');
                setNotificationsCount(0);
              }}
              className={`p-2 rounded-xl relative transition cursor-pointer ${isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-indigo-400' : 'hover:bg-gray-100 text-gray-500 hover:text-indigo-600'}`}
            >
              <Bell className="w-4.5 h-4.5" />
              {notificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-bounce" />
              )}
            </button>
          </div>
        </header>

        {/* DYNAMIC SCROLL CONTAINER PANEL */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto overflow-y-auto relative">
          {/* Global loader during synchronous backend update broadcasts */}
          {isSyncing && (
            <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-indigo-600 dark:bg-indigo-500 text-white px-4 py-2 rounded-xl shadow-lg text-[11px] font-mono font-bold animate-bounce border border-indigo-400/30">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Broadcasting data update...</span>
            </div>
          )}
          {renderActiveView()}
        </main>
      </div>

      {/* 3. RESPONSIVE SLIDE-OUT DRAWER FOR TABLET OR MOBILE PANELS */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-50 lg:hidden bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-xs flex cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-72 bg-white dark:bg-slate-900 flex flex-col p-6 space-y-6 animate-slide-in h-full shadow-2xl relative border-r border-gray-100 dark:border-slate-800 cursor-default"
          >
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl text-gray-400 dark:text-slate-500 hover:text-gray-950 dark:hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 border-b border-gray-50 dark:border-slate-800 pb-4">
              <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h1 className="font-bold text-gray-950 dark:text-white text-xs leading-none">TPHL Incentive</h1>
                <span className="text-[9px] text-gray-400 dark:text-slate-500 font-mono tracking-wider lowercase">v2.0 dashboard</span>
              </div>
            </div>

            {/* Profile capsule */}
            <div 
              onClick={() => {
                setIsProfileModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="bg-gray-100/50 dark:bg-slate-800/40 rounded-2xl p-3 flex items-center justify-between cursor-pointer hover:bg-gray-200/50 dark:hover:bg-slate-800/70 border border-transparent dark:border-slate-800 transition group"
              title="Click to view profile details"
            >
              <div className="space-y-0.5 truncate flex-1">
                <p className="font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition text-xs truncate leading-normal">{userProfile.name}</p>
                <div className="flex items-center gap-1">
                  <span className="text-[8px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-400 font-bold uppercase px-1 rounded-full font-mono">
                    {userProfile.role}
                  </span>
                </div>
              </div>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto pt-2">
              {visibleMenuItems.map(item => {
                const isSelected = activeRoute === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveRoute(item.id as AppRoute);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold w-full transition duration-150 text-left cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-600 text-white shadow-xs' 
                        : 'text-gray-500 dark:text-slate-400 hover:text-gray-950 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <span>{getRouteLabelAndEmoji(item.id as AppRoute)}</span>
                  </button>
                );
              })}
            </nav>

            {/* Mobile drawer Sign Out */}
            <div className="border-t border-gray-100 dark:border-slate-800 pt-4">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold w-full text-rose-600 dark:text-rose-450 bg-rose-50 dark:bg-rose-955/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-500 dark:text-rose-450" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. ADMIN & USER PROFILE MODAL */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 dark:bg-slate-955/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 max-w-sm w-full space-y-6 relative shadow-2xl rounded-3xl animate-fade-in text-gray-850 dark:text-slate-100">
            <button
              onClick={() => {
                setIsProfileModalOpen(false);
                setIsChangingPassword(false);
                setPasswordError('');
                setPasswordSuccess('');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl text-gray-400 dark:text-slate-550 hover:text-gray-950 dark:hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {isChangingPassword ? (
              <form onSubmit={handlePasswordChangeSubmit} className="space-y-4 pt-1">
                <div className="text-center">
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">Change Password</h3>
                  <p className="text-[11px] text-gray-400 dark:text-slate-400">Update your account credentials below</p>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Current Password</label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 bg-transparent outline-hidden border-gray-250 dark:border-slate-800 text-gray-850 dark:text-slate-100 placeholder-gray-300 dark:placeholder-slate-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">New Password</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 bg-transparent outline-hidden border-gray-250 dark:border-slate-800 text-gray-850 dark:text-slate-100 placeholder-gray-300 dark:placeholder-slate-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 bg-transparent outline-hidden border-gray-250 dark:border-slate-800 text-gray-850 dark:text-slate-100 placeholder-gray-300 dark:placeholder-slate-600"
                    />
                  </div>
                </div>

                {passwordError && (
                  <div className="text-[11px] bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 px-3 py-2 rounded-xl text-center font-semibold leading-normal">
                    ⚠️ {passwordError}
                  </div>
                )}

                {passwordSuccess && (
                  <div className="text-[11px] bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-3 py-2 rounded-xl text-center font-semibold leading-normal">
                    ✅ {passwordSuccess}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswordError('');
                      setPasswordSuccess('');
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="w-1/2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 py-2.5 rounded-xl text-xs font-bold transition duration-150 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPassword}
                    className="w-1/2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-xs font-bold transition duration-150 cursor-pointer text-center"
                  >
                    {isSavingPassword ? 'Saving...' : 'Update'}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex flex-col items-center text-center space-y-3 pt-2">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold font-mono shadow-md">
                    {userProfile.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="font-bold text-gray-900 dark:text-white text-base">
                      {userProfile.name}
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-700 dark:text-indigo-400 font-bold uppercase px-2.5 py-0.5 rounded-full font-mono">
                      {userProfile.role}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-100 dark:border-slate-800 pt-4 space-y-3.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Account ID</span>
                    <span className="font-mono bg-gray-100 dark:bg-slate-800 text-[10px] font-bold px-2 py-0.5 rounded text-gray-700 dark:text-slate-300">{userProfile.id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[9px]">E-mail address</span>
                    <span className="font-semibold text-gray-800 dark:text-slate-100 truncate max-w-[185px]">{userProfile.email}</span>
                  </div>
                  {userProfile.employee_id && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Employee ID</span>
                      <span className="font-mono font-bold text-gray-700 dark:text-slate-300">{userProfile.employee_id}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[9px]">DB Access</span>
                    <span className="bg-emerald-50 dark:bg-emerald-950/25 text-emerald-800 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 text-[10px] font-bold px-2 py-0.5 rounded">All Write-Read</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-gray-100/60 dark:border-slate-800/60">
                  <button
                    onClick={() => {
                      setIsChangingPassword(true);
                      setPasswordError('');
                      setPasswordSuccess('');
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 py-2.5 rounded-xl text-xs font-bold transition duration-150 cursor-pointer"
                  >
                    🔒 Change Password
                  </button>
                  <button
                    onClick={() => {
                      setIsProfileModalOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-955/20 dark:hover:bg-rose-900/30 text-rose-700 dark:text-rose-450 py-2.5 rounded-xl text-xs font-bold transition duration-150 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-550" /> Sign Out
                  </button>
                  <button
                    onClick={() => setIsProfileModalOpen(false)}
                    className="w-full text-center bg-gray-905 hover:bg-gray-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white py-2.5 rounded-xl text-xs font-bold transition duration-150 cursor-pointer"
                  >
                    Close Profile Details
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
