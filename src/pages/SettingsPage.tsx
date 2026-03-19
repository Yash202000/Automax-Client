import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Lock,
  Shield,
  AlertTriangle,
  Key,
  Trash2,
  Eye,
  Bell,
  Moon,
  Globe,
  Check,
  X,
  Languages,
} from "lucide-react";
import { Button, Input, Card } from "../components/ui";
import { useAuthStore } from "../stores/authStore";
import { authApi } from "../api/auth";
import { setLanguage, getCurrentLanguage, supportedLanguages } from "../i18n";

const passwordSchema = z
  .object({
    old_password: z.string().min(1, "Current password is required"),
    new_password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());
  const [languageSuccess, setLanguageSuccess] = useState("");

  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLanguageChange = async (langCode: string) => {
    if (langCode === currentLang) return;

    await setLanguage(langCode);
    setCurrentLang(langCode);
    setLanguageSuccess(t("settings.languageChanged"));

    // Clear success message after 3 seconds
    setTimeout(() => setLanguageSuccess(""), 3000);
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const newPassword = watch("new_password", "");

  const getPasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(newPassword);
  const strengthColors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-emerald-500",
  ];

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setIsPasswordLoading(true);
    setPasswordError("");
    setPasswordSuccess("");

    try {
      const response = await authApi.changePassword({
        old_password: data.old_password,
        new_password: data.new_password,
      });
      if (response.success) {
        setPasswordSuccess("Password changed successfully. Logging you out...");
        reset();
        setTimeout(async () => {
          try {
            await authApi.logout();
          } catch {
            // ignore logout errors — session already invalidated server-side
          }
          logout();
          navigate("/login");
        }, 1500);
      } else {
        setPasswordError(response.error || "Failed to change password");
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      if (typeof err === "object" && err !== null && "response" in err) {
        const axiosError = err as {
          response?: {
            data?: { error?: string; errors?: Array<{ message: string }> };
          };
        };
        const serverError =
          axiosError.response?.data?.error ||
          axiosError.response?.data?.errors?.[0]?.message;
        setPasswordError(serverError || errorMessage);
      } else {
        setPasswordError(errorMessage);
      }
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError("");

    try {
      const response = await authApi.deleteAccount();
      if (response.success) {
        logout();
        navigate("/login");
      } else {
        setDeleteError(response.error || "Failed to delete account");
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      if (typeof err === "object" && err !== null && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        setDeleteError(axiosError.response?.data?.error || errorMessage);
      } else {
        setDeleteError(errorMessage);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const settingsGroups = [
    {
      title: t("settings.notifications"),
      icon: Bell,
      description: t("settings.notificationsDesc"),
      items: [
        {
          label: t("settings.emailNotifications"),
          description: t("settings.emailNotificationsDesc"),
          enabled: true,
        },
        {
          label: t("settings.pushNotifications"),
          description: t("settings.pushNotificationsDesc"),
          enabled: false,
        },
        {
          label: t("settings.weeklyDigest"),
          description: t("settings.weeklyDigestDesc"),
          enabled: true,
        },
      ],
    },
    {
      title: t("settings.appearance"),
      icon: Moon,
      description: t("settings.appearanceDesc"),
      items: [
        {
          label: t("settings.darkMode"),
          description: t("settings.darkModeDesc"),
          enabled: false,
        },
        {
          label: t("settings.compactView"),
          description: t("settings.compactViewDesc"),
          enabled: false,
        },
      ],
    },
    {
      title: t("settings.privacy"),
      icon: Eye,
      description: t("settings.privacyDesc"),
      items: [
        {
          label: t("settings.profileVisibility"),
          description: t("settings.profileVisibilityDesc"),
          enabled: true,
        },
        {
          label: t("settings.activityStatus"),
          description: t("settings.activityStatusDesc"),
          enabled: true,
        },
      ],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold ">{t("settings.title")}</h1>
        <p className="mt-2 text-gray-500">{t("settings.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24 p-2">
            <nav className="space-y-1">
              <a
                href="#security"
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-primary bg-primary/10 rounded-xl"
              >
                <Shield className="w-5 h-5" />
                {t("settings.security")}
              </a>
              <a
                href="#notifications"
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 dark:text-muted-foreground  hover:bg-muted rounded-xl transition-colors"
              >
                <Bell className="w-5 h-5" />
                {t("settings.notifications")}
              </a>
              <a
                href="#appearance"
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 dark:text-muted-foreground hover:bg-muted rounded-xl transition-colors"
              >
                <Moon className="w-5 h-5" />
                {t("settings.appearance")}
              </a>
              <a
                href="#privacy"
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 dark:text-muted-foreground hover:bg-muted rounded-xl transition-colors"
              >
                <Eye className="w-5 h-5" />
                {t("settings.privacy")}
              </a>
              <a
                href="#language"
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 dark:text-muted-foreground hover:bg-muted rounded-xl transition-colors"
              >
                <Globe className="w-5 h-5" />
                {t("settings.language")}
              </a>
              <div className="border-t border-border my-2" />
              <a
                href="#danger"
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                <AlertTriangle className="w-5 h-5" />
                {t("settings.dangerZone")}
              </a>
            </nav>
          </Card>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Security Section */}
          <Card id="security" className="p-4 scroll-mt-28">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-blue-50 rounded-xl">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold ">{t("settings.security")}</h3>
                <p className="text-sm text-gray-500">
                  {t("settings.securityDesc")}
                </p>
              </div>
            </div>

            {/* Alerts */}
            {passwordError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl animate-fade-in">
                <div className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm font-medium text-red-800">
                    {passwordError}
                  </p>
                </div>
              </div>
            )}
            {passwordSuccess && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl animate-fade-in">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <p className="text-sm font-medium text-emerald-800">
                    {passwordSuccess}
                  </p>
                </div>
              </div>
            )}

            <form
              onSubmit={handleSubmit(onPasswordSubmit)}
              className="space-y-5"
              noValidate
            >
              <Input
                label={t("settings.currentPassword")}
                type="password"
                placeholder={t("settings.enterCurrentPassword")}
                error={errors.old_password?.message}
                leftIcon={<Key className="w-5 h-5" />}
                {...register("old_password")}
              />

              <div>
                <Input
                  label={t("settings.newPassword")}
                  type="password"
                  placeholder={t("settings.createStrongPassword")}
                  error={errors.new_password?.message}
                  leftIcon={<Lock className="w-5 h-5" />}
                  {...register("new_password")}
                />
                {newPassword && (
                  <div className="mt-3">
                    <div className="flex gap-1 mb-2">
                      {[0, 1, 2, 3, 4].map((index) => (
                        <div
                          key={index}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            index < passwordStrength
                              ? strengthColors[passwordStrength - 1]
                              : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      {t("settings.passwordHint")}
                    </p>
                  </div>
                )}
              </div>

              <Input
                label={t("settings.confirmNewPassword")}
                type="password"
                placeholder={t("settings.confirmYourPassword")}
                error={errors.confirm_password?.message}
                leftIcon={<Lock className="w-5 h-5" />}
                {...register("confirm_password")}
              />

              <Button
                type="submit"
                isLoading={isPasswordLoading}
                leftIcon={!isPasswordLoading && <Key className="w-4 h-4" />}
              >
                {t("settings.changePassword")}
              </Button>
            </form>
          </Card>

          {/* Dynamic Settings Groups */}
          {settingsGroups.map((group) => (
            <Card
              key={group.title}
              id={group.title.toLowerCase()}
              className="p-4 scroll-mt-28"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <group.icon className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold ">{group.title}</h3>
                  <p className="text-sm text-gray-500">{group.description}</p>
                </div>
              </div>

              <div className="space-y-4">
                {group.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-background rounded-xl"
                  >
                    <div>
                      <p className="text-sm font-medium ">{item.label}</p>
                      <p className="text-xs text-gray-500">
                        {item.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        item.enabled ? "bg-blue-600" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                          item.enabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          ))}

          {/* Language Section */}
          <Card id="language" className="p-4">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Languages className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold ">{t("settings.language")}</h3>
                <p className="text-sm text-gray-500">
                  {t("settings.selectLanguage")}
                </p>
              </div>
            </div>

            {languageSuccess && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl animate-fade-in">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <p className="text-sm font-medium text-emerald-800">
                    {languageSuccess}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {supportedLanguages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    currentLang === lang.code
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-border hover:bg-primary/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {lang.code === "en" ? "🇺🇸" : "🇸🇦"}
                    </span>
                    <div className="text-left">
                      <p
                        className={`text-sm font-medium ${
                          currentLang === lang.code ? "text-primary" : ""
                        }`}
                      >
                        {lang.nativeName}
                      </p>
                      <p className="text-xs text-gray-500">{lang.name}</p>
                    </div>
                  </div>
                  {currentLang === lang.code && (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </Card>

          {/* Danger Zone */}
          <Card id="danger" className="border-red-200 p-4">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-red-500/10 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-600">
                  {t("settings.dangerZone")}
                </h3>
                <p className="text-sm text-gray-500">
                  {t("settings.dangerZoneDesc")}
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl animate-fade-in">
                <div className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm font-medium text-red-800">
                    {deleteError}
                  </p>
                </div>
              </div>
            )}

            <div className="p-4 bg-red-50 rounded-xl border border-red-100">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900">
                    {t("settings.deleteAccount")}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {t("settings.deleteAccountDesc")}
                  </p>

                  {!showDeleteConfirm ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="mt-4"
                      onClick={() => setShowDeleteConfirm(true)}
                      leftIcon={<Trash2 className="w-4 h-4" />}
                    >
                      {t("settings.deleteAccount")}
                    </Button>
                  ) : (
                    <div className="mt-4 p-4 bg-white rounded-xl border border-red-200">
                      <p className="text-sm text-red-700 font-medium mb-4">
                        {t("settings.deleteConfirmation")}{" "}
                        <span className="font-bold">{user?.email}</span>.
                      </p>
                      <div className="flex gap-3">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleDeleteAccount}
                          isLoading={isDeleting}
                        >
                          {t("settings.yesDeleteAccount")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDeleteConfirm(false)}
                          disabled={isDeleting}
                        >
                          {t("common.cancel")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
