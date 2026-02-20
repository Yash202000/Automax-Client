import React, { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  HelpCircle,
  ChevronLeft,
  LogOut,
  Home,
  Bell,
  Search,
  Menu,
  X,
  ChevronDown,
  Sparkles,
  List,
  Phone,
  Languages,
  Mail,
  MessageSquare,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { setLanguage, getCurrentLanguage, supportedLanguages } from '../../i18n';
import SoftPhone from '../sip/Softphone';
import ThemeToggle from '../common/ThemeToggle';

export const CallCentreLayout: React.FC = () => {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showSoftphone, setShowSoftphone] = useState(false);

  const [isLangOpen, setIsLangOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const langRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleInitiateCall = () => {
      setShowSoftphone(true);
    };

    window.addEventListener('initiate-call', handleInitiateCall);
    return () => window.removeEventListener('initiate-call', handleInitiateCall);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };


  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo Section */}
      <div className={`h-[70px] flex items-center ${collapsed ? 'justify-center px-2' : 'px-5'} border-b border-white/5`}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
              <HelpCircle className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -top-1 -end-1 w-3 h-3 bg-primary rounded-full border-2 border-slate-900" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">{t('sidebar.callCentre', 'Call Centre')}</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">{t('sidebar.management', 'Management')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Collapse Button - Desktop */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`hidden lg:flex absolute top-[75px] ${collapsed ? 'start-[60px]' : 'start-[248px]'} z-50 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all shadow-lg`}
      >
        <ChevronLeft className={`w-3.5 h-3.5 transition-transform ${collapsed ? 'ltr:rotate-180 rtl:rotate-0' : 'ltr:rotate-0 rtl:rotate-180'}`} />
      </button>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 overflow-y-auto">
        {/* Main Actions */}

        <div className="space-y-1">
          <NavLink
            to="/call-centre/contacts"
            end
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `group relative flex items-center ${collapsed ? 'justify-center' : ''} px-3 py-2.5 rounded-xl transition-all duration-200 ${isActive
                ? 'bg-gradient-to-r from-primary/90 to-accent/90 text-white shadow-lg shadow-violet-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute start-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white ltr:rounded-r-full rtl:rounded-l-full" />
                )}
                <List size={20} className="flex-shrink-0" />
                {!collapsed && <span className="ms-3 font-medium text-sm">{t('sidebar.contacts', 'Contacts')}</span>}
              </>
            )}
          </NavLink>

          <NavLink
            to="/call-centre/history"
            end
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `group relative flex items-center ${collapsed ? 'justify-center' : ''} px-3 py-2.5 rounded-xl transition-all duration-200 ${isActive
                ? 'bg-gradient-to-r from-primary/90 to-accent/90 text-white shadow-lg shadow-violet-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute start-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white ltr:rounded-r-full rtl:rounded-l-full" />
                )}
                <Phone size={20} className="flex-shrink-0" />
                {!collapsed && <span className="ms-3 font-medium text-sm">{t('sidebar.callHistory', 'Call History')}</span>}
              </>
            )}
          </NavLink>

          <NavLink
            to="/call-centre/email"
            end
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `group relative flex items-center ${collapsed ? 'justify-center' : ''} px-3 py-2.5 rounded-xl transition-all duration-200 ${isActive
                ? 'bg-gradient-to-r from-primary/90 to-accent/90 text-white shadow-lg shadow-violet-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute start-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white ltr:rounded-r-full rtl:rounded-l-full" />
                )}
                <Mail size={20} className="flex-shrink-0" />
                {!collapsed && <span className="ms-3 font-medium text-sm">{t('sidebar.email', 'Email')}</span>}
              </>
            )}
          </NavLink>

          <NavLink
            to="/call-centre/sms"
            end
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `group relative flex items-center ${collapsed ? 'justify-center' : ''} px-3 py-2.5 rounded-xl transition-all duration-200 ${isActive
                ? 'bg-gradient-to-r from-primary/90 to-accent/90 text-white shadow-lg shadow-violet-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute start-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white ltr:rounded-r-full rtl:rounded-l-full" />
                )}
                <MessageSquare size={20} className="flex-shrink-0" />
                {!collapsed && <span className="ms-3 font-medium text-sm">{t('sidebar.sms', 'SMS')}</span>}
              </>
            )}
          </NavLink>
        </div>



        <NavLink
          to="/dashboard"
          onClick={() => setMobileMenuOpen(false)}
          className={`group flex items-center ${collapsed ? 'justify-center' : ''} px-3 py-2.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors`}
        >
          <Home size={20} />
          {!collapsed && <span className="ms-3 font-medium text-sm">{t('sidebar.backToHome', 'Back to Home')}</span>}
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
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-violet-500/30"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-accent flex items-center justify-center ring-2 ring-violet-500/30">
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
              {t('sidebar.signOut', 'Sign Out')}
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
        className={`${collapsed ? 'w-[72px]' : 'w-[264px]'
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
        className={`fixed inset-y-0 start-0 w-[264px] bg-slate-900 z-50 transform transition-transform duration-300 lg:hidden ${mobileMenuOpen ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full'
          }`}
      >
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="absolute top-4 end-4 p-2 text-slate-400 hover:text-white"
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
              <span className="text-slate-400">{t('sidebar.queries', 'Queries')}</span>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-slate-700">{t('sidebar.management', 'Management')}</span>
            </div>
            <h1 className="text-lg font-bold text-slate-800 sm:hidden">{t('sidebar.queries', 'Queries')}</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Softphone Toggle */}
            <button
              onClick={() => setShowSoftphone(!showSoftphone)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${showSoftphone
                ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-violet-500/30'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              title={t('callCentre.softphone', 'Softphone')}
            >
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline text-sm font-medium">{t('callCentre.phone', 'Phone')}</span>
            </button>

            {/* Search */}
            <div className="hidden md:flex items-center">
              <div className="relative">
                <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={t('sidebar.searchQueries', 'Search queries...')}
                  className="w-64 ps-10 pe-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Language Switcher */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-1.5 p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                title={t('settings.language', 'Language')}
              >
                <Languages className="w-5 h-5" />
                <span className="text-xs font-medium uppercase">{currentLang}</span>
              </button>

              {isLangOpen && (
                <div className="absolute end-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-scale-in ltr:origin-top-right rtl:origin-top-left">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-medium text-slate-500 uppercase">{t('settings.selectLanguage', 'Select Language')}</p>
                  </div>
                  {supportedLanguages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${currentLang === lang.code
                        ? 'bg-violet-50 text-primary'
                        : 'text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      <span className="text-lg">{lang.code === 'en' ? '🇺🇸' : '🇸🇦'}</span>
                      <div className="text-start">
                        <p className="font-medium">{lang.nativeName}</p>
                        <p className="text-xs text-slate-500">{lang.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications */}
            <button className="relative p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 end-2 w-2 h-2 bg-violet-500 rounded-full ring-2 ring-white" />
            </button>

            <ThemeToggle/>

            {/* Divider */}
            <div className="hidden sm:block w-px h-8 bg-background" />

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 p-1.5 pe-3 hover:bg-slate-50 rounded-xl transition-colors"
              >
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-9 h-9 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-accent flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {user?.first_name?.[0] || user?.username?.[0] || 'U'}
                    </span>
                  </div>
                )}
                <div className="hidden sm:block text-start">
                  <p className="text-sm font-semibold text-slate-700 leading-tight">
                    {user?.first_name || user?.username}
                  </p>
                  <p className="text-xs text-slate-400 leading-tight flex items-center gap-1">
                    {user?.is_super_admin && <Sparkles className="w-3 h-3 text-violet-500" />}
                    {user?.is_super_admin ? t('profile.superAdmin', 'Super Admin') : t('sidebar.user', 'User')}
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
                  <div className="absolute end-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-scale-in ltr:origin-top-right rtl:origin-top-left">
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
                        {t('sidebar.backToHome', 'Back to Home')}
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
                        {t('sidebar.signOut', 'Sign Out')}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="p-4 lg:p-8">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

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
    </div >
  );
};
