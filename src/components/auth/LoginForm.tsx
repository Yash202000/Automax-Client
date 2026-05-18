import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mail, Lock, ArrowRight, Fingerprint } from "lucide-react";
import { Button, Input, Checkbox } from "../ui";
import { authApi } from "../../api/auth";
import { ssoApi } from "../../api/sso";
import { useAuthStore } from "../../stores/authStore";
import type { User } from "../../types";

export const LoginForm: React.FC = () => {
  const { t } = useTranslation();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [ssoMode, setSsoMode] = useState(false);
  const [nationalId, setNationalId] = useState("");
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const setUser = useAuthStore((state) => state.setUser);

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

  const toggleMode = () => {
    setSsoMode((prev) => !prev);
    setError("");
    reset();
    setNationalId("");
  };

  const handleSsoLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nationalId.trim()) return;
    setIsLoading(true);
    setError("");

    try {
      const response = await ssoApi.login({ national_id: nationalId });
      if (response.success && response.data) {
        const data = response.data as unknown as {
          token: string;
          refresh_token: string;
          user: User;
          validation_url?: string;
        };
        setAuth(data.user, data.token, data.refresh_token);

        if (data.validation_url) {
          window.location.href = data.validation_url;
        } else {
          navigate("/dashboard");
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

  const handleRegularLogin = async (data: LoginFormData) => {
    const emailData = data as { email: string; password: string };
    const response = await authApi.login({
      ...emailData,
      remember_me: rememberMe,
    });

    if (response.success && response.data) {
      setAuth(
        response.data.user as unknown as User,
        response.data.token,
        response.data.refresh_token,
        rememberMe,
      );
      try {
        const profileResp = await authApi.getProfile();
        if (profileResp.success && profileResp.data) {
          setUser(profileResp.data);
        }
      } catch {}
      navigate("/dashboard");
    } else {
      setError(response.error || t("auth.loginError"));
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError("");

    try {
      if (!ssoMode) {
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

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-3xl font-bold ">
          {ssoMode ? t("auth.ssoLoginTitle") : t("auth.welcomeBack")}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {ssoMode ? t("auth.ssoLoginSubtitle") : t("auth.loginSubtitle")}
        </p>
      </div>

      <div className="mb-6 flex rounded-lg border p-1 bg-gray-50">
        <button
          type="button"
          onClick={() => !ssoMode || toggleMode()}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
            !ssoMode
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Mail className="w-4 h-4 inline mr-1" />
          {t("auth.regularLogin")}
        </button>
        <button
          type="button"
          onClick={() => ssoMode || toggleMode()}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
            ssoMode
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Fingerprint className="w-4 h-4 inline mr-1" />
          {t("auth.ssoLogin")}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl animate-fade-in">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {ssoMode ? (
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
            isLoading={isLoading}
            rightIcon={!isLoading && <ArrowRight className="w-5 h-5" />}
          >
            {t("auth.signIn")}
          </Button>
        </form>
      ) : (
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

          <Button
            type="submit"
            size="lg"
            fullWidth
            isLoading={isLoading}
            rightIcon={!isLoading && <ArrowRight className="w-5 h-5" />}
          >
            {t("auth.signIn")}
          </Button>
        </form>
      )}

      <p className="mt-8 text-center text-gray-600">
        {t("auth.noAccount")}{" "}
        <Link
          to="/register"
          className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          {t("auth.signUp")}
        </Link>
      </p>
    </div>
  );
};
