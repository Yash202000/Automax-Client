import React, { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  LogOut,
  Home,
  Bell,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Plus,
  List,
  Circle,
  User,
  UserCheck,
  PenLine,
  Languages,
  Phone,
  FileText,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../api/auth';
import { setLoggingOut } from '../../api/client';
import { incidentApi } from '../../api/admin';
import { setLanguage, getCurrentLanguage, supportedLanguages } from '../../i18n';
import SoftPhone from '../sip/Softphone';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../constants/permissions';
import { CreateRequestModal } from '@/components/requests/CreateRequestModal';

export const IncidentLayout: React.FC = () => {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [myIncidentsOpen, setMyIncidentsOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());
  const [showSoftphone, setShowSoftphone] = useState(false);
  const [createRequestModalOpen, setCreateRequestModalOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const langRef = useRef<HTMLDivElement>(null);
  const { hasPermission, isSuperAdmin } = usePermissions();

  const canCreateIncident = isSuperAdmin || hasPermission(PERMISSIONS.INCIDENTS_CREATE);
  const canViewIncidents = isSuperAdmin || hasPermission(PERMISSIONS.INCIDENTS_VIEW);
  const canViewAllIncidents = isSuperAdmin || hasPermission(PERMISSIONS.INCIDENTS_VIEW_ALL);
  const canViewRequests = isSuperAdmin || hasPermission(PERMISSIONS.REQUESTS_VIEW);
  const canCreateRequest = isSuperAdmin || hasPermission(PERMISSIONS.REQUESTS_CREATE);

  const handleLanguageChange = async (langCode: string) => {
    if (langCode === currentLang) {
      setIsLangOpen(false);
      return;
    }
    await setLanguage(langCode);
    setCurrentLang(langCode);
    setIsLangOpen(false);
  };

  // Close language dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch incident stats to get statuses
  const { data: statsData } = useQuery({
    queryKey: ['incidents', 'stats', 'incident'],
    queryFn: () => incidentApi.getStats('incident'),
  });

  const handleLogout = async () => {
    // Set flag to prevent 401 interceptor from running during logout
    setLoggingOut(true);

    // Clear auth state first to prevent any race conditions
    logout();

    try {
      await authApi.logout();
    } catch {
      // Continue with logout even if API call fails
    } finally {
      setLoggingOut(false);
    }

    navigate('/login');
  };

  // Build sidebar items from stats
  const statusItems = statsData?.data?.by_state
    ? Object.entries(statsData.data.by_state).map(([stateName, count]) => ({
        name: stateName,
        count: count as number,
      }))
    : [];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo Section */}
      <div className={`h-[70px] flex items-center ${collapsed ? 'justify-center px-2' : 'px-5'} border-b border-white/5`}>
        <div className="flex items-center gap-3">
          <img src="/epm-logo.png" alt="Automax" className={collapsed ? "h-8 w-auto" : "h-10 w-auto"} />
        </div>
      </div>

      {/* Collapse Button - Desktop */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`hidden lg:flex absolute top-[75px] ${collapsed ? 'left-[60px]' : 'left-[248px]'} z-50 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all shadow-lg`}
      >
        <ChevronLeft className={`w-3.5 h-3.5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
      </button>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 overflow-y-auto">
        {/* Main Actions */}
        {!collapsed && (
          <p className="px-3 mb-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            {t('sidebar.actions')}
          </p>
        )}
        <div className="space-y-1">
          {canViewAllIncidents && (
            <NavLink
              to="/incidents"
              end
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `group relative flex items-center ${collapsed ? 'justify-center' : ''} px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600/90 to-cyan-600/90 text-white shadow-lg shadow-blue-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
                  )}
                  <List size={20} className="flex-shrink-0" />
                  {!collapsed && <span className="ml-3 font-medium text-sm">{t('sidebar.allIncidents')}</span>}
                </>
              )}
            </NavLink>
          )}

          {canCreateIncident && (
            <NavLink
              to="/incidents/new"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `group relative flex items-center ${collapsed ? 'justify-center' : ''} px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600/90 to-cyan-600/90 text-white shadow-lg shadow-blue-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
                  )}
                  <Plus size={20} className="flex-shrink-0" />
                  {!collapsed && <span className="ml-3 font-medium text-sm">{t('sidebar.newIncident')}</span>}
                </>
              )}
            </NavLink>
          )}

          {/* My Incidents - Collapsible */}
          {canViewIncidents && (
            <div>
              <button
                onClick={() => setMyIncidentsOpen(!myIncidentsOpen)}
                className={`w-full group relative flex items-center ${collapsed ? 'justify-center' : ''} px-3 py-2.5 rounded-xl transition-all duration-200 text-slate-400 hover:text-white hover:bg-white/5`}
              >
                <User size={20} className="flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="ml-3 font-medium text-sm flex-1 text-left">{t('sidebar.myIncidents')}</span>
                    <ChevronRight
                      size={16}
                      className={`transition-transform duration-200 ${myIncidentsOpen ? 'rotate-90' : ''}`}
                    />
                  </>
                )}
              </button>
              {myIncidentsOpen && !collapsed && (
                <div className="ml-4 mt-1 space-y-1 border-l border-white/10 pl-2">
                  <NavLink
                    to="/incidents/my-assigned"
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `group relative flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600/90 to-cyan-600/90 text-white shadow-lg shadow-blue-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`
                    }
                  >
                    <UserCheck size={16} className="flex-shrink-0" />
                    <span className="ml-2 font-medium text-sm">{t('sidebar.assignedToMe')}</span>
                  </NavLink>
                  <NavLink
                    to="/incidents/my-created"
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `group relative flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600/90 to-cyan-600/90 text-white shadow-lg shadow-blue-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`
                    }
                  >
                    <PenLine size={16} className="flex-shrink-0" />
                    <span className="ml-2 font-medium text-sm">{t('sidebar.createdByMe')}</span>
                  </NavLink>
                </div>
              )}
            </div>
          )}

          {/* Requests */}
          {canViewRequests && (
            <NavLink
              to="/requests"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `group relative flex items-center ${collapsed ? 'justify-center' : ''} px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600/90 to-teal-600/90 text-white shadow-lg shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
                  )}
                  <FileText size={20} className="flex-shrink-0" />
                  {!collapsed && <span className="ml-3 font-medium text-sm">{t('sidebar.requests', 'Requests')}</span>}
                </>
              )}
            </NavLink>
          )}

          {canCreateRequest && (
            <button
              onClick={() => {
                setCreateRequestModalOpen(true);
                setMobileMenuOpen(false);
              }}
              className={`group relative flex items-center ${collapsed ? 'justify-center' : ''} px-3 py-2.5 rounded-xl transition-all duration-200 text-slate-400 hover:text-white hover:bg-white/5`}
            >
              <Plus size={20} className="flex-shrink-0" />
              {!collapsed && <span className="ml-3 font-medium text-sm">{t('sidebar.newRequest', 'New Request')}</span>}
            </button>
          )}
        </div>

        {/* Status Filters */}
        {canViewIncidents && statusItems.length > 0 && (
          <>
            {!collapsed && (
              <>
                <div className="my-6 border-t border-white/5" />
                <p className="px-3 mb-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  {t('sidebar.byStatus')}
                </p>
              </>
            )}
            <div className="space-y-1">
              {statusItems.map((status) => (
                <NavLink
                  key={status.name}
                  to={`/incidents?status=${encodeURIComponent(status.name)}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="group flex items-center px-3 py-2.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
                >
                  <Circle size={8} className="flex-shrink-0 fill-current" />
                  {!collapsed && (
                    <>
                      <span className="ml-3 font-medium text-sm flex-1">{status.name}</span>
                      <span className="text-xs bg-slate-700 px-2 py-0.5 rounded-md">
                        {status.count}
                      </span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </>
        )}

        {/* Quick Stats */}
        {canViewIncidents && statsData?.data && !collapsed && (
          <>
            <div className="my-6 border-t border-white/5" />
            <p className="px-3 mb-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              {t('sidebar.overview')}
            </p>
            <div className="px-3 space-y-3">
              {canViewAllIncidents ? (
                <NavLink
                  to="/incidents"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between text-sm hover:bg-white/5 rounded-lg px-2 py-1.5 -mx-2 transition-colors"
                >
                  <span className="text-slate-400">{t('sidebar.total')}</span>
                  <span className="text-white font-semibold">{statsData.data.total || 0}</span>
                </NavLink>
              ) : (
                <div className="flex items-center justify-between text-sm px-2 py-1.5 -mx-2">
                  <span className="text-slate-400">{t('sidebar.total')}</span>
                  <span className="text-white font-semibold">{statsData.data.total || 0}</span>
                </div>
              )}
              {canViewAllIncidents ? (
                <NavLink
                  to="/incidents?sla_breached=true"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between text-sm hover:bg-white/5 rounded-lg px-2 py-1.5 -mx-2 transition-colors"
                >
                  <span className="text-slate-400">{t('sidebar.slaBreached')}</span>
                  <span className="text-rose-400 font-semibold">{statsData.data.sla_breached || 0}</span>
                </NavLink>
              ) : (
                <div className="flex items-center justify-between text-sm px-2 py-1.5 -mx-2">
                  <span className="text-slate-400">{t('sidebar.slaBreached')}</span>
                  <span className="text-rose-400 font-semibold">{statsData.data.sla_breached || 0}</span>
                </div>
              )}
            </div>
          </>
        )}

        {!collapsed && (
          <>
            <div className="my-6 border-t border-white/5" />
            <p className="px-3 mb-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              {t('sidebar.quickLinks')}
            </p>
          </>
        )}

        <NavLink
          to="/dashboard"
          onClick={() => setMobileMenuOpen(false)}
          className={`group flex items-center ${collapsed ? 'justify-center' : ''} px-3 py-2.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors`}
        >
          <Home size={20} />
          {!collapsed && <span className="ml-3 font-medium text-sm">{t('sidebar.backToHome')}</span>}
        </NavLink>
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-white/5">
        {collapsed ? (
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-full p-2.5 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-rose-500/10 transition-colors"
          >
            <LogOut size={20} />
          </button>
        ) : (
          <div className="p-3 bg-gradient-to-br from-slate-800/80 to-slate-800/40 rounded-xl border border-white/5">
            <div className="flex items-center gap-3">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-blue-500/30"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center ring-2 ring-blue-500/30">
                  <span className="text-white text-sm font-bold">
                    {user?.first_name?.[0] || user?.username?.[0] || 'U'}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {user?.first_name || user?.username}
                </p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 hover:text-rose-400 bg-slate-900/50 hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              {t('sidebar.signOut')}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Desktop Sidebar */}
      <aside
        className={`${
          collapsed ? 'w-[72px]' : 'w-[264px]'
        } bg-slate-900 transition-all duration-300 flex-col hidden lg:flex relative`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-[264px] bg-slate-900 z-50 transform transition-transform duration-300 lg:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
        >
          <X size={20} />
        </button>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-[70px] bg-white border-b border-slate-200/80 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2.5 hover:bg-slate-100 rounded-xl lg:hidden transition-colors"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>

            {/* Breadcrumb / Title */}
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="text-slate-400">{t('sidebar.incidents')}</span>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-slate-700">{t('sidebar.management')}</span>
            </div>
            <h1 className="text-lg font-bold text-slate-800 sm:hidden">{t('sidebar.incidents')}</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Search - Commented out for now
            <div className="hidden md:flex items-center">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={t('sidebar.searchIncidents')}
                  className="w-64 pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>
            */}

            {/* Back to Home */}
            <Link
              to="/"
              className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
              title={t('sidebar.backToHome')}
            >
              <Home className="w-5 h-5" />
              <span className="hidden md:inline text-sm font-medium">{t('sidebar.backToHome')}</span>
            </Link>

            {/* Language Switcher */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-1.5 p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                title={t('settings.language')}
              >
                <Languages className="w-5 h-5" />
                <span className="text-xs font-medium uppercase">{currentLang}</span>
              </button>

              {isLangOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-scale-in origin-top-right">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-medium text-slate-500 uppercase">{t('settings.selectLanguage')}</p>
                  </div>
                  {supportedLanguages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                        currentLang === lang.code
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-lg">{lang.code === 'en' ? '🇺🇸' : '🇸🇦'}</span>
                      <div className="text-left">
                        <p className="font-medium">{lang.nativeName}</p>
                        <p className="text-xs text-slate-500">{lang.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Phone/Softphone */}
            <button
              onClick={() => setShowSoftphone(!showSoftphone)}
              className={`relative p-2.5 rounded-xl transition-colors focus:outline-none focus:ring-0 ${
                showSoftphone
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Phone className="w-5 h-5" />
            </button>

            <SoftPhone
              showSip={showSoftphone}
              onClose={() => setShowSoftphone(false)}
              settings={{ domain: "zkff.automaxsw.com", socketURL: "wss://zkff.automaxsw.com:7443" }}
              auth={{
                user: {
                  userID: user?.id || '',
                  extension: (user as any)?.extension || '',
                }
              }}
            />

            {/* Notifications */}
            <button className="relative p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none focus:ring-0">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
            </button>

            {/* Divider */}
            <div className="hidden sm:block w-px h-8 bg-slate-200" />

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 p-1.5 pr-3 hover:bg-slate-50 rounded-xl transition-colors focus:outline-none focus:ring-0"
              >
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-9 h-9 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {user?.first_name?.[0] || user?.username?.[0] || 'U'}
                    </span>
                  </div>
                )}
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold text-slate-700 leading-tight">
                    {user?.first_name || user?.username}
                  </p>
                  <p className="text-xs text-slate-400 leading-tight flex items-center gap-1">
                    {user?.is_super_admin && <Sparkles className="w-3 h-3 text-amber-500" />}
                    {user?.is_super_admin ? t('profile.superAdmin') : user?.roles?.[0]?.name || t('sidebar.user')}
                  </p>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown */}
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-scale-in origin-top-right">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-medium text-slate-700">{user?.email}</p>
                    </div>
                    <div className="py-2">
                      <NavLink
                        to="/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <Home className="w-4 h-4" />
                        {t('sidebar.backToHome')}
                      </NavLink>
                    </div>
                    <div className="border-t border-slate-100 pt-2">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          handleLogout();
                        }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        {t('sidebar.signOut')}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-slate-100">
          <div className="p-4 lg:p-8">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {/* Create Request Modal */}
      <CreateRequestModal
        isOpen={createRequestModalOpen}
        onClose={() => setCreateRequestModalOpen(false)}
        onSuccess={(requestId) => {
          setCreateRequestModalOpen(false);
          navigate(`/requests/${requestId}`);
        }}
      />
    </div>
  );
};
