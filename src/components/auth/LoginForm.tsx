import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import {
  Mail,
  Lock,
  ArrowRight,
  Fingerprint,
  Building2,
  ArrowLeft,
} from "lucide-react";
import { Button, Input, Checkbox } from "../ui";
import { authApi } from "../../api/auth";
import { ssoApi } from "../../api/sso";
import { ldapApi } from "../../api/ldap";
import { useAuthStore } from "../../stores/authStore";
import type { User } from "../../types";
import { OTPInput } from "./OTPInput";
import { useSettings } from "@/contexts/SettingsContext";
import { otpApi } from "@/api/otp";

const maskPhoneNumber = (phone?: string): string => {
  if (!phone) return "";

  const trimmed = phone.trim();
  const parts = trimmed.split(/\s+/);
  const hasCallingCode = parts.length > 1 && parts[0].startsWith("+");
  const callingCode = hasCallingCode ? parts[0] : "";
  const localDigits = (
    hasCallingCode ? parts.slice(1).join("") : trimmed
  ).replace(/\D/g, "");

  if (localDigits.length <= 4) return trimmed;

  const last4 = localDigits.slice(-4);
  const masked = "•".repeat(localDigits.length - 4);

  return [callingCode, masked, last4].filter(Boolean).join(" ");
};

interface AuthPayload {
  user: User;
  token?: string;
  refreshToken?: string;
  rememberMe?: boolean;
}

type CompletedAuthPayload = AuthPayload & { token: string };

export const LoginForm: React.FC = () => {
  const { t } = useTranslation();
  const { settings, isLoading: isSettingsLoading } = useSettings();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginStep, setLoginStep] = useState<"login" | "otp">("login");
  const [otpMethod, setOtpMethod] = useState<"whatsapp" | "sms">("sms");
  const [pendingAuth, setPendingAuth] = useState<AuthPayload | null>(null);
  const [loginData, setLoginData] = useState<{
    user: User;
    sessionId: string;
  } | null>(null);

  const showRegular =
    (window.APP_CONFIG?.LOGIN_REGULAR ?? import.meta.env.VITE_LOGIN_REGULAR) !==
    "false";
  const showLdap =
    (window.APP_CONFIG?.LOGIN_LDAP ?? import.meta.env.VITE_LOGIN_LDAP) !==
    "false";
  const showSso =
    (window.APP_CONFIG?.LOGIN_SSO ?? import.meta.env.VITE_LOGIN_SSO) !==
    "false";

  const enableSignup =
    (window.APP_CONFIG?.ENABLE_SIGNUP ?? import.meta.env.VITE_ENABLE_SIGNUP) !==
    "false";

  const enabledModes = [
    ...(showRegular ? ["regular" as const] : []),
    ...(showLdap ? ["ldap" as const] : []),
    ...(showSso ? ["sso" as const] : []),
  ];

  const [loginMode, setLoginMode] = useState<"regular" | "sso" | "ldap">(
    enabledModes[0] || "regular",
  );
  const [nationalId, setNationalId] = useState("");
  const [adUsername, setAdUsername] = useState("");
  const [adPassword, setAdPassword] = useState("");
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const setUser = useAuthStore((state) => state.setUser);
  const shouldVerifyTotp = settings?.auth_setting.totp_enabled === true;

  const sendOtpMutation = useMutation({
    mutationFn: ({
      user,
      method,
    }: {
      user: User;
      method: "whatsapp" | "sms";
    }) => otpApi.send({ phone: user.phone, channel: method }),
  });

  const isLoginPending =
    isLoading || isSettingsLoading || sendOtpMutation.isPending;

  const completeLogin = async (auth: CompletedAuthPayload) => {
    setAuth(auth.user, auth.token, auth.refreshToken, auth.rememberMe);
    try {
      const profileResp = await authApi.getProfile();
      if (profileResp.success && profileResp.data) {
        setUser(profileResp.data);
      }
    } catch (err: unknown) {
      console.error("Failed to fetch user profile after login:", err);
    }
    setPendingAuth(null);
    setLoginData(null);
    navigate("/dashboard");
  };

  const sendLoginOtp = async (user: User, method: "whatsapp" | "sms") => {
    const response = await sendOtpMutation.mutateAsync({ user, method });

    if (!response.session_id) {
      throw new Error(response.error || t("auth.failedToSendOtp"));
    }

    setLoginData({ user, sessionId: response.session_id });
  };

  const goToPostLoginStep = async (auth: AuthPayload) => {
    const { token } = auth;

    if (!token) {
      await sendLoginOtp(auth.user, otpMethod);
      setPendingAuth(auth);
      setLoginStep("otp");

      return;
    }

    await completeLogin({ ...auth, token });
  };

  const loginSchema = z.object({
    email: z.string().optional(),
    password: z.string().min(6, t("auth.passwordMinLength")).optional(),
  });

  type LoginFormData = z.infer<typeof loginSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const setMode = (mode: "regular" | "sso" | "ldap") => {
    setLoginMode(mode);
    setError("");
    reset();
    setNationalId("");
    setAdUsername("");
    setAdPassword("");
  };

  const handleSsoLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSettingsLoading) return;
    if (!nationalId.trim()) return;
    setIsLoading(true);
    setError("");

    try {
      const response = await ssoApi.login({ national_id: nationalId });
      if (response.success && response.data) {
        const data = response.data as unknown as {
          token: string;
          refresh_token?: string;
          user: User;
          validation_url?: string;
        };
        if (data.validation_url) {
          window.location.href = data.validation_url;
        } else {
          await completeLogin({
            user: data.user,
            token: data.token,
            refreshToken: data.refresh_token,
          });
        }
      } else {
        setError(response.error || t("auth.loginError"));
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : t("auth.loginError");
      if (typeof err === "object" && err !== null && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        setError(axiosError.response?.data?.error || errorMessage);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSettingsLoading) return;
    if (!adUsername.trim() || !adPassword.trim()) return;
    setIsLoading(true);
    setError("");

    try {
      const response = await ldapApi.login({
        username: adUsername,
        password: adPassword,
      });
      if (response.success && response.data) {
        await completeLogin({
          user: response.data.user as unknown as User,
          token: response.data.token,
          refreshToken: response.data.refresh_token,
        });
      } else {
        setError(response.error || t("auth.loginError"));
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : t("auth.loginError");
      if (typeof err === "object" && err !== null && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        setError(axiosError.response?.data?.error || errorMessage);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegularLogin = async (data: LoginFormData) => {
    const emailData = data as { email: string; password: string };
    const response = await authApi.login({
      ...emailData,
      remember_me: rememberMe,
    });

    if (response.success && response.data) {
      await goToPostLoginStep({
        user: response.data.user as unknown as User,
        token: response.data.token,
        refreshToken: response.data.refresh_token,
        rememberMe,
      });
    } else {
      setError(response.error || t("auth.loginError"));
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    if (isSettingsLoading) return;
    setIsLoading(true);
    setError("");

    try {
      if (loginMode === "regular") {
        await handleRegularLogin(data);
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : t("auth.loginError");
      if (typeof err === "object" && err !== null && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        setError(axiosError.response?.data?.error || errorMessage);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isSso = loginMode === "sso";
  const isLdap = loginMode === "ldap";

  const isEPM940 =
    window.APP_CONFIG?.CLIENT === "EPM940" ||
    import.meta.env.VITE_CLIENT === "EPM940";

  return (
    <div className="animate-fade-in-up">
      <div
        className={`mb-8 ${isEPM940 ? "flex flex-col items-center text-center" : ""}`}
      >
        <h1 className="text-3xl font-bold ">
          {isSso
            ? t("auth.ssoLoginTitle")
            : isLdap
              ? "Active Directory Login"
              : t("auth.welcomeBack")}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {isSso
            ? t("auth.ssoLoginSubtitle")
            : isLdap
              ? "Sign in with your Active Directory credentials"
              : t("auth.loginSubtitle")}
        </p>
      </div>

      {enabledModes.length > 1 && (
        <div className="mb-6 flex rounded-lg border p-1 bg-gray-50">
          {showRegular && (
            <button
              type="button"
              onClick={() => setMode("regular")}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                loginMode === "regular"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Mail className="w-4 h-4 inline mr-1" />
              {t("auth.regularLogin")}
            </button>
          )}
          {showLdap && (
            <button
              type="button"
              onClick={() => setMode("ldap")}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                loginMode === "ldap"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Building2 className="w-4 h-4 inline mr-1" />
              {t("auth.adLogin")}
            </button>
          )}
          {showSso && (
            <button
              type="button"
              onClick={() => setMode("sso")}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                loginMode === "sso"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Fingerprint className="w-4 h-4 inline mr-1" />
              {t("auth.ssoLogin")}
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl animate-fade-in">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {isSso ? (
        <form onSubmit={handleSsoLogin} className="space-y-5" noValidate>
          <Input
            label={t("auth.nationalId")}
            placeholder={t("auth.nationalIdPlaceholder")}
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            leftIcon={<Fingerprint className="w-5 h-5" />}
          />

          <Button
            type="submit"
            size="lg"
            fullWidth
            isLoading={isLoginPending}
            rightIcon={!isLoginPending && <ArrowRight className="w-5 h-5" />}
          >
            {t("auth.signIn")}
          </Button>
        </form>
      ) : isLdap ? (
        <form onSubmit={handleAdLogin} className="space-y-5" noValidate>
          <Input
            label="AD Username"
            placeholder="Enter your Active Directory username"
            value={adUsername}
            onChange={(e) => setAdUsername(e.target.value)}
            leftIcon={<Building2 className="w-5 h-5" />}
          />

          <Input
            label={t("auth.password")}
            type="password"
            placeholder={t("auth.passwordPlaceholder")}
            value={adPassword}
            onChange={(e) => setAdPassword(e.target.value)}
            leftIcon={<Lock className="w-5 h-5" />}
          />

          <Button
            type="submit"
            size="lg"
            fullWidth
            isLoading={isLoginPending}
            rightIcon={!isLoginPending && <ArrowRight className="w-5 h-5" />}
          >
            {t("auth.signIn")}
          </Button>
        </form>
      ) : loginStep === "login" ? (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
          noValidate
        >
          <Input
            label={t("auth.email")}
            type="email"
            placeholder={t("auth.emailPlaceholder")}
            error={errors.email?.message}
            leftIcon={<Mail className="w-5 h-5" />}
            {...register("email")}
          />
          <Input
            label={t("auth.password")}
            type="password"
            placeholder={t("auth.passwordPlaceholder")}
            error={errors.password?.message}
            leftIcon={<Lock className="w-5 h-5" />}
            {...register("password")}
          />
          <div className="flex items-center justify-between">
            <Checkbox
              label={t("auth.rememberMe")}
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              {t("auth.forgotPassword")}
            </Link>
          </div>
          {shouldVerifyTotp ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-800">
                {t("auth.sendCodeVia")}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOtpMethod("sms")}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                    otpMethod === "sms"
                      ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                      otpMethod === "sms"
                        ? "border-blue-600"
                        : "border-slate-300"
                    }`}
                  >
                    {otpMethod === "sms" && (
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                    )}
                  </span>

                  <span className="text-sm font-medium text-slate-800">
                    {t("auth.sms")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setOtpMethod("whatsapp")}
                  className={`flex items-center gap-3 rounded-xl border p-4 transition-all ${
                    otpMethod === "whatsapp"
                      ? "border-green-600 bg-green-50 ring-1 ring-green-600"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      otpMethod === "whatsapp"
                        ? "border-green-600"
                        : "border-slate-300"
                    }`}
                  >
                    {otpMethod === "whatsapp" && (
                      <span className="h-2.5 w-2.5 rounded-full bg-green-600" />
                    )}
                  </span>

                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-900">
                      {t("auth.whatsapp")}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          ) : null}
          <Button
            type="submit"
            size="lg"
            fullWidth
            isLoading={isLoginPending}
            rightIcon={!isLoginPending && <ArrowRight className="w-5 h-5" />}
          >
            {shouldVerifyTotp
              ? t("auth.getVerificationCode")
              : t("auth.signIn")}
          </Button>
        </form>
      ) : loginStep === "otp" && loginData && pendingAuth ? (
        <div className="space-y-6">
          {/* Back */}
          <button
            type="button"
            onClick={() => {
              setPendingAuth(null);
              setLoginData(null);
              setLoginStep("login");
            }}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("auth.backToLogin")}
          </button>

          {/* Heading */}
          <div className="text-center space-y-2 pt-2">
            <h4 className="text-2xl font-semibold text-slate-900">
              {t("auth.verifyYourAccount")}
            </h4>

            <p className="text-sm text-slate-500">
              {t("auth.verificationCodeSentTo")}
              <span className="text-sm ms-2  font-semibold text-slate-900">
                {maskPhoneNumber(loginData.user.phone)}
              </span>
            </p>
          </div>

          {/* OTP */}
          <div className="space-y-3">
            <OTPInput
              onVerified={(authData) =>
                completeLogin({
                  ...authData,
                  rememberMe: pendingAuth.rememberMe,
                })
              }
              onResendSuccess={(sessionId) =>
                setLoginData((prev) => (prev ? { ...prev, sessionId } : prev))
              }
              sessionId={loginData.sessionId}
              user={loginData.user}
              method={otpMethod}
            />
          </div>
        </div>
      ) : null}

      {!isLdap && enableSignup ? (
        <p className="mt-8 text-center text-gray-600">
          {t("auth.noAccount")}{" "}
          <Link
            to="/register"
            className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            {t("auth.signUp")}
          </Link>
        </p>
      ) : null}
    </div>
  );
};
