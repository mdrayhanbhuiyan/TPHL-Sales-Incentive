/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
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

type AppRoute = 'dashboard' | 'projects-on-sale' | 'registration' | 'projects' | 'teams' | 'executives' | 'rules' | 'sales' | 'incentives' | 'docs' | 'settings';

export default function App() {
  const [authToken, setAuthToken] = useState<string | null>('u-admin');
  const [userProfile, setUserProfile] = useState<any | null>({
    id: "u-admin",
    email: "admin@tphl.com",
    name: "TPHL Management",
    role: "Admin"
  });
  const [checkingAuth, setCheckingAuth] = useState(false);

  // Theme support
  const [isDarkMode, setIsDarkMode] = useState<boolean>(localStorage.getItem('tphl_theme') === 'dark');

  // Profile Modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Layout states
  const [activeRoute, setActiveRoute] = useState<AppRoute>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notificationsCount, setNotificationsCount] = useState(0);

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

  // Authenticate on startup
  useEffect(() => {
    localStorage.setItem('tphl_token', 'u-admin');
    fetchUnreadNotifications('u-admin');
  }, []);

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
    setActiveRoute('dashboard');
    fetchUnreadNotifications(token);
  };

  const handleLogout = () => {
    localStorage.removeItem('tphl_token');
    setAuthToken(null);
    setUserProfile(null);
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

  const visibleMenuItems = menuItems.filter(item => item.roles.includes(userProfile.role));

  const renderActiveView = () => {
    switch (activeRoute) {
      case 'dashboard':
        return <DashboardView authToken={authToken} userRole={userProfile.role} userProfile={userProfile} />;
      case 'projects-on-sale':
        return <ProjectsOnSaleView authToken={authToken} userRole={userProfile.role} />;
      case 'registration':
        return <RegistrationView authToken={authToken} userRole={userProfile.role} />;
      case 'projects':
        return <ProjectView authToken={authToken} userRole={userProfile.role} />;
      case 'teams':
        return <TeamsView authToken={authToken} userRole={userProfile.role} />;
      case 'executives':
        return <ExecutivesView authToken={authToken} userRole={userProfile.role} />;
      case 'rules':
        return <RulesView authToken={authToken} userRole={userProfile.role} />;
      case 'sales':
        return <SalesEntryView authToken={authToken} userRole={userProfile.role} userProfile={userProfile} />;
      case 'incentives':
        return <IncentivesView authToken={authToken} userRole={userProfile.role} />;
      case 'docs':
        return <DocsView />;
      case 'settings':
        return <SettingsView authToken={authToken} userRole={userProfile.role} />;
      default:
        return <DashboardView authToken={authToken} userRole={userProfile.role} userProfile={userProfile} />;
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

        {/* User profile capsule */}
        <div className={`rounded-2xl p-4 flex items-center justify-between border ${isDarkMode ? 'bg-slate-800/50 border-slate-705/30' : 'bg-gray-105/50 border-gray-100'}`}>
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
            </div>
            {userProfile.employee_id && (
              <span className="text-[9px] text-gray-400 dark:text-slate-500 font-mono tracking-wider font-bold">ID: {userProfile.employee_id}</span>
            )}
          </div>
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

        {/* Core credits */}
        <div className="text-[10px] text-gray-400 font-mono border-t border-gray-50 pt-3">
          <span>Enterprise System v2.0</span>
        </div>
      </aside>

      {/* 2. MAIN CLIENT CONTENT BODY */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* UPPER NAVIGATION BAR RAIL */}
        <header className={`h-16 border-b flex items-center justify-between px-6 sticky top-0 z-40 transition-colors duration-200 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-100 text-gray-800'}`}>
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
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {renderActiveView()}
        </main>
      </div>

      {/* 3. RESPONSIVE SLIDE-OUT DRAWER FOR TABLET OR MOBILE PANELS */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-gray-900/40 backdrop-blur-xs flex">
          <div className="w-72 bg-white flex flex-col p-6 space-y-6 animate-slide-in h-full shadow-2xl relative border-r border-gray-100">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-950 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 border-b border-gray-50 pb-4">
              <Building2 className="w-6 h-6 text-indigo-600" />
              <div>
                <h1 className="font-bold text-gray-950 text-xs leading-none">TPHL Incentive</h1>
                <span className="text-[9px] text-gray-400 font-mono tracking-wider lowercase">v2.0 dashboard</span>
              </div>
            </div>

            {/* Profile capsule */}
            <div className="bg-gray-100/50 rounded-2xl p-3 flex items-center justify-between">
              <div className="space-y-0.5 truncate">
                <p className="font-bold text-gray-900 text-xs truncate leading-normal">{userProfile.name}</p>
                <div className="flex items-center gap-1">
                  <span className="text-[8px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 font-bold uppercase px-1 rounded-full font-mono">
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
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold w-full transition duration-150 text-left ${
                      isSelected 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-500 hover:text-gray-950 hover:bg-gray-100/50'
                    }`}
                  >
                    <span>{getRouteLabelAndEmoji(item.id as AppRoute)}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* 4. ADMIN PROFILE MODAL */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 dark:bg-slate-955/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 max-w-sm w-full space-y-6 relative shadow-2xl rounded-3xl animate-fade-in text-gray-850 dark:text-slate-100">
            <button
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl text-gray-400 dark:text-slate-550 hover:text-gray-950 dark:hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

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
                <span className="text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Account Node ID</span>
                <span className="font-mono bg-gray-100 dark:bg-slate-800 text-[10px] font-bold px-2 py-0.5 rounded text-gray-700 dark:text-slate-300">{userProfile.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[9px]">E-mail address</span>
                <span className="font-semibold text-gray-800 dark:text-slate-100">{userProfile.email}</span>
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
              <div className="flex justify-between items-center">
                <span className="text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Authorization level</span>
                <span className="bg-blue-50 dark:bg-blue-950/25 text-blue-800 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 text-[10px] font-bold px-2 py-0.5 rounded font-mono">Master</span>
              </div>
            </div>

            <button
              onClick={() => setIsProfileModalOpen(false)}
              className="w-full text-center bg-gray-900 hover:bg-gray-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white py-2.5 rounded-xl text-xs font-bold transition duration-150 cursor-pointer"
            >
              Close Profile Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
