import React, { useState, useRef, useEffect } from "react";
import { Outlet, Navigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../stores/authStore";
import { Zap, Languages } from "lucide-react";
import {
  setLanguage,
  getCurrentLanguage,
  supportedLanguages,
} from "../../i18n";
import { publicUrl } from "../../utils/publicUrl";
import { useTheme } from "@/hooks/useTheme";

export const AuthLayout: React.FC = () => {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());
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
  const isEPM940 =
    window.APP_CONFIG?.CLIENT === "EPM940" ||
    import.meta.env.VITE_CLIENT === "EPM940";
  const { theme } = useTheme();

  const isEpmDark = isEPM940 && theme === "dark";
  // Close language dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const features = [
    {
      text: t("navigation.roleBasedAccessControl"),
      icon: (
        <svg
          className={`h-6 w-6 ${isEpmDark ? "text-epm-icon" : "text-white"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
          />
        </svg>
      ),
    },
    {
      text: t("navigation.hierarchicalOrganizationManagement"),
      icon: (
        <svg
          className={`h-6 w-6 ${isEpmDark ? "text-epm-icon" : "text-white"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
          />
        </svg>
      ),
    },
    {
      text: t("navigation.realTimeAnalyticsDashboard"),
      icon: (
        <svg
          className={`h-6 w-6 ${isEpmDark ? "text-epm-icon" : "text-white"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
          />
        </svg>
      ),
    },
  ];
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div
        className={`hidden lg:flex lg:w-1/2 relative overflow-hidden ${
          isEpmDark
            ? "bg-linear-to-br from-epm-background-start via-epm-background-middle to-epm-background-end"
            : "bg-linear-to-br from-blue-600 via-blue-700 to-indigo-800"
        }`}
      >
        <div className="absolute inset-0 opacity-100">
          {/* Background Pattern */}
          <div
            className={`absolute top-0 left-0 w-96 h-96  rounded-full -translate-x-1/2 -translate-y-1/2 ${isEpmDark ? "bg-epm-circle" : "bg-login-circle"}`}
          />
          <div
            className={`absolute bottom-0 right-0 w-lg h-128 ${isEpmDark ? "bg-epm-circle" : "bg-login-circle"} rounded-full translate-x-1/3 translate-y-1/3`}
          />
          <div
            className={`absolute top-1/2 left-1/2 w-64 h-64 rounded-full -translate-x-1/2 -translate-y-1/2 ${isEpmDark ? "bg-epm-circle" : "bg-login-circle"}`}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between w-full p-12">
          {/* Logo */}

          <div className="flex items-center gap-3">
            {isEPM940 ? (
              <div>
                <img
                  src={publicUrl("epm940_rebranding/automax.svg")}
                  alt="Automax"
                  className="h-9 object-contain"
                />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <span className="text-2xl font-bold text-white">Automax</span>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
                {t("navigation.streamlineYour")}
                <br />
                <span
                  className={
                    isEpmDark
                      ? "bg-linear-to-r from-epm-gradient-start via-epm-gradient-middle to-epm-gradient-end bg-clip-text text-transparent"
                      : "text-blue-200"
                  }
                >
                  {t("navigation.workflowAutomation")}
                </span>
              </h1>
              <p className="mt-6 text-lg text-blue-100 max-w-md leading-relaxed">
                {t("navigation.theCompletePlatformForManagingYourBusiness")}
              </p>
            </div>

            <div className="space-y-6">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-lg border ${
                      isEpmDark
                        ? "border-white/10 bg-white/5"
                        : "border-white/10 bg-white/10"
                    }`}
                  >
                    {feature.icon}
                  </div>

                  <span
                    className={`font-medium ${
                      isEpmDark ? "text-gray-300" : "text-blue-100"
                    }`}
                  >
                    {feature.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-blue-200 text-sm">
            v1.0.2 &copy; {new Date().getFullYear()} Automax. All rights
            reserved.
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Forms */}
      <div
        className={`flex-1 flex flex-col ${isEpmDark ? "bg-login-right-panel-4" : ""}`}
      >
        {/* Top Bar with Language Switcher */}
        <div className="flex items-center justify-between p-6">
          {/* Mobile Logo */}
          <div className="lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              {isEPM940 ? (
                <img
                  src={publicUrl(
                    theme === "dark"
                      ? "epm940_rebranding/automax.svg"
                      : "epm940_rebranding/automax-dark.svg",
                  )}
                  alt="Automax"
                  className="h-6 object-contain"
                />
              ) : (
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
              )}
            </Link>
          </div>
          <div className="hidden lg:block" /> {/* Spacer for desktop */}
          {/* Language Switcher */}
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="flex items-center gap-1.5 px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              title={t("settings.language")}
            >
              <Languages className="w-5 h-5" />
              <span className="text-sm font-medium uppercase">
                {currentLang}
              </span>
            </button>

            {isLangOpen && (
              <div className="absolute end-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 animate-scale-in origin-top-right">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase">
                    {t("settings.selectLanguage")}
                  </p>
                </div>
                {supportedLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                      currentLang === lang.code
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-lg">
                      {lang.code === "en" ? "🇺🇸" : "🇸🇦"}
                    </span>
                    <div className="text-left">
                      <p className="font-medium">{lang.nativeName}</p>
                      <p className="text-xs text-gray-500">{lang.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* automax epm940 logos */}
        {isEPM940 && (
          <div className="flex flex-row justify-center px-6 lg:px-12 pb-4 sm:pb-0">
            <img
              src={publicUrl(
                /*  theme === "dark"
                  ? "epm940_rebranding/940-logo-white-hq.png"
                  : */ "epm-logo.png",
              )}
              alt="Automax"
              className="h-33 object-contain"
            />
          </div>
        )}
        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center p-6 pt-0 lg:p-12 lg:pt-6">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </div>

        {/* Mobile Footer */}
        <div className="lg:hidden p-6 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Automax. All rights reserved.
        </div>
      </div>
    </div>
  );
};
