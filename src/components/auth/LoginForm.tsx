import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { Button, Input, Checkbox } from "../ui";
import { authApi } from "../../api/auth";
import { useAuthStore } from "../../stores/authStore";
import type { User } from "../../types";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginForm: React.FC = () => {
  const { t } = useTranslation();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const setUser = useAuthStore((state) => state.setUser);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError("");

    try {
      const response = await authApi.login({
        ...data,
        remember_me: rememberMe,
      });
      if (response.success && response.data) {
        // Store token + slim user so subsequent API calls are authenticated
        setAuth(
          response.data.user as unknown as User,
          response.data.token,
          response.data.refresh_token,
          rememberMe,
        );
        // Fetch full profile (departments, locations, classifications, role permissions)
        // and upgrade the stored user object in the background before navigating
        try {
          const profileResp = await authApi.getProfile();
          if (profileResp.success && profileResp.data) {
            setUser(profileResp.data);
          }
        } catch {
          // Non-fatal — the app works with the slim user; full data loads on next /users/me call
        }
        navigate("/dashboard");
      } else {
        setError(response.error || "Login failed. Please try again.");
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred during login";
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold ">{t("auth.welcomeBack")}</h1>
        <p className="mt-2 text-muted-foreground">{t("auth.loginSubtitle")}</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 mt-0.5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <span className="text-red-600 text-xs font-bold">!</span>
            </div>
            <div>
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Input
          label={t("auth.email")}
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          leftIcon={<Mail className="w-5 h-5" />}
          {...register("email")}
        />

        <Input
          label={t("auth.password")}
          type="password"
          placeholder="••••••••"
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

      {/* Sign Up Link */}
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
