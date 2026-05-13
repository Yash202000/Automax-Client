import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { User, Mail, Lock, ArrowRight } from "lucide-react";
import { Button, Input, Checkbox } from "../ui";
import { authApi } from "../../api/auth";
import { useAuthStore } from "../../stores/authStore";

export const RegisterForm: React.FC = () => {
  const { t } = useTranslation();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const registerSchema = z
    .object({
      email: z.string().email(t("auth.invalidEmail")),
      username: z
        .string()
        .min(3, t("auth.usernameTooShort"))
        .max(50, t("auth.usernameTooLong"))
        .regex(/^[a-zA-Z0-9_]+$/, t("auth.usernameInvalidChars")),
      password: z
        .string()
        .min(8, t("auth.pwTooShort"))
        .regex(/[A-Z]/, t("auth.pwUppercase"))
        .regex(/[a-z]/, t("auth.pwLowercase"))
        .regex(/[0-9]/, t("auth.pwNumber")),
      confirmPassword: z.string(),
      first_name: z.string().max(100).optional(),
      last_name: z.string().max(100).optional(),
      terms: z.boolean().refine((val) => val === true, t("auth.acceptTerms")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("auth.pwMismatch"),
      path: ["confirmPassword"],
    });

  type RegisterFormData = z.infer<typeof registerSchema>;
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      terms: false,
    },
  });

  const password = watch("password", "");

  const getPasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);

  const strengthLabels = [
    t("settings.weak"),
    t("settings.weak"),
    t("settings.fair"),
    t("settings.good"),
    t("settings.strong"),
  ];
  const strengthColors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-emerald-500",
  ];

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError("");

    try {
      const {
        confirmPassword: _confirmPassword,
        terms: _terms,
        ...registerData
      } = data;
      const response = await authApi.register(registerData);
      if (response.success && response.data) {
        setAuth(
          response.data.user,
          response.data.token,
          response.data.refresh_token,
        );
        navigate("/dashboard");
      } else {
        setError(response.error || t("auth.registrationFailed"));
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : t("auth.registrationError");
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
        <h1 className="text-3xl font-bold text-gray-900">
          {t("auth.registerTitle")}
        </h1>
        <p className="mt-2 text-gray-600">{t("auth.registerSubtitle")}</p>
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
        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t("auth.firstName")}
            placeholder={t("auth.firstNamePlaceholder")}
            error={errors.first_name?.message}
            {...register("first_name")}
          />
          <Input
            label={t("auth.lastName")}
            placeholder={t("auth.lastNamePlaceholder")}
            error={errors.last_name?.message}
            {...register("last_name")}
          />
        </div>

        <Input
          label={t("auth.username")}
          placeholder={t("auth.usernamePlaceholder")}
          error={errors.username?.message}
          leftIcon={<User className="w-5 h-5" />}
          {...register("username")}
        />

        <Input
          label={t("auth.email")}
          type="email"
          placeholder={t("auth.emailPlaceholder")}
          error={errors.email?.message}
          leftIcon={<Mail className="w-5 h-5" />}
          {...register("email")}
        />

        <div>
          <Input
            label={t("auth.password")}
            type="password"
            placeholder={t("settings.createStrongPassword")}
            error={errors.password?.message}
            leftIcon={<Lock className="w-5 h-5" />}
            {...register("password")}
          />
          {/* Password Strength Indicator */}
          {password && (
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
                {t("settings.passwordStrength")}:{" "}
                <span
                  className={`font-medium ${passwordStrength >= 4 ? "text-emerald-600" : passwordStrength >= 3 ? "text-lime-600" : passwordStrength >= 2 ? "text-yellow-600" : "text-red-600"}`}
                >
                  {strengthLabels[passwordStrength - 1] || t("settings.weak")}
                </span>
              </p>
            </div>
          )}
        </div>

        <Input
          label={t("auth.confirmPassword")}
          type="password"
          placeholder={t("settings.confirmYourPassword")}
          error={errors.confirmPassword?.message}
          leftIcon={<Lock className="w-5 h-5" />}
          {...register("confirmPassword")}
        />

        <div>
          <Checkbox
            label={t("auth.agreeToTerms")}
            description={
              <span>
                {t("auth.byCreatingAnAccountYouAgreeTo")}{" "}
                <Link to="/terms" className="text-blue-600 hover:underline">
                  {t("auth.termsOfService")}
                </Link>{" "}
                {t("auth.and")}{" "}
                <Link to="/privacy" className="text-blue-600 hover:underline">
                  {t("auth.privacyPolicy")}
                </Link>
              </span>
            }
            {...register("terms")}
          />
          {errors.terms && (
            <p className="mt-1 text-sm text-red-600">{errors.terms.message}</p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          fullWidth
          isLoading={isLoading}
          rightIcon={
            !isLoading && (
              <ArrowRight className="w-5 h-5 rtl:rotate-180 ml-2 rtl:mr-2" />
            )
          }
        >
          {isLoading ? t("auth.creatingAccount") : t("auth.signUp")}
        </Button>
      </form>

      {/* Sign In Link */}
      <p className="mt-8 text-center text-gray-600">
        {t("auth.hasAccount")}{" "}
        <Link
          to="/login"
          className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          {t("auth.signIn")}
        </Link>
      </p>
    </div>
  );
};
