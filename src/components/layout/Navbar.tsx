import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LogOut,
  User,
  Settings,
  Shield,
  Bell,
  ChevronDown,
  Menu,
  X,
  LayoutDashboard,
  Languages,
  Phone
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../api/auth';
import { setLoggingOut } from '../../api/client';
import { setLanguage, getCurrentLanguage, supportedLanguages } from '../../i18n';
import SoftPhone from '../sip/Softphone';
import ThemeToggle from '../common/ThemeToggle';

export const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());
  const [showSoftphone, setShowSoftphone] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
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

  const hasAdminAccess =
    user?.is_super_admin ||
    user?.permissions?.some((p) =>
      p.includes(':view') ||
      p.includes(':create') ||
      p.includes(':update') ||
      p.includes(':delete') ||
      p.includes(':manage')
    );

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { href: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
  ];

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo & Navigation */}
          <div className="flex items-center">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 mr-8">
              <img src="/epm-logo.png" alt="Automax" className="h-9 w-auto" />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {isAuthenticated && navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                    ${isActive(link.href)
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2 sm:gap-4">
            {isAuthenticated ? (
              <>
                {/* Search (Desktop) - Commented out for now
                <button className="hidden lg:flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm text-gray-500 transition-colors w-64 focus:outline-none focus:ring-0">
                  <Search className="w-4 h-4" />
                  <span>{t('nav.searchPlaceholder')}</span>
                  <kbd className="ml-auto bg-white px-2 py-0.5 rounded text-xs text-gray-400 border border-gray-200">
                    /
                  </kbd>
                </button>
                */}

                {/* Language Switcher */}
                <div className="relative" ref={langRef}>
                  <button
                    onClick={() => setIsLangOpen(!isLangOpen)}
                    className="flex items-center gap-1.5 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-colors focus:outline-none focus:ring-0"
                    title={t('settings.language')}
                  >
                    <Languages className="w-5 h-5" />
                    <span className="text-xs font-medium uppercase">{currentLang}</span>
                  </button>

                  {isLangOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-scale-in origin-top-right">
                      <div className="px-3 py-2 border-b border-gray-100">
                        <p className="text-xs font-medium text-gray-500 uppercase">{t('settings.selectLanguage')}</p>
                      </div>
                      {supportedLanguages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => handleLanguageChange(lang.code)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-0 ${
                            currentLang === lang.code
                              ? 'bg-primary/5 text-primary'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className="text-lg">{lang.code === 'en' ? '🇺🇸' : '🇸🇦'}</span>
                          <div className="text-left">
                            <p className="font-medium">{lang.nativeName}</p>
                            <p className="text-xs text-gray-500">{lang.name}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sip */}
                <button
                  onClick={() => setShowSoftphone(!showSoftphone)}
                  className={`relative p-2 rounded-xl transition-colors ${
                    showSoftphone
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Phone className="w-5 h-5" />
                </button>

                <SoftPhone
                  showSip={showSoftphone}
                  onClose={() => setShowSoftphone(false)}
                  settings={{"domain": "zkff.automaxsw.com","socketURL": "wss://zkff.automaxsw.com:7443"}}
                  auth={{
                    user: {
                      userID: user?.id || '',
                      extension: (user as any)?.extension || '',
                    }
                  }}
                />

                {/* Notifications */}
                <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                </button>
                       <ThemeToggle />


                {/* Profile Dropdown */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-3 p-1.5 pr-3 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.username}
                        className="w-8 h-8 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {user?.first_name?.[0] || user?.username?.[0] || 'U'}
                        </span>
                      </div>
                    )}
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-medium text-gray-900 leading-tight">
                        {user?.first_name || user?.username}
                      </p>
                      <p className="text-xs text-gray-500 leading-tight">
                        {user?.is_super_admin ? 'Administrator' : user?.roles?.[0]?.name || 'User'}
                      </p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 animate-scale-in origin-top-right">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {user?.is_super_admin ? 'Super Administrator' : user?.roles?.map(r => r.name).join(', ') || 'User'}
                        </p>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        <Link
                          to="/profile"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <User className="w-4 h-4 text-gray-400" />
                          {t('nav.viewProfile')}
                        </Link>
                        <Link
                          to="/settings"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Settings className="w-4 h-4 text-gray-400" />
                          {t('nav.settings')}
                        </Link>
                        {hasAdminAccess && (
                          <Link
                            to="/admin"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Shield className="w-4 h-4 text-gray-400" />
                            {t('nav.admin')}
                          </Link>
                        )}
                      </div>

                      {/* Logout */}
                      <div className="border-t border-gray-100 pt-2">
                        <button
                          onClick={() => {
                            setIsProfileOpen(false);
                            handleLogout();
                          }}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          {t('auth.logout')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="md:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  {t('auth.signIn')}
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl shadow-lg shadow-blue-500/25 transition-all"
                >
                  {t('auth.signUp')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isAuthenticated && isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white animate-fade-in-down">
          <div className="px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                  ${isActive(link.href)
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                  }
                `}
              >
                <link.icon className="w-5 h-5" />
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};
