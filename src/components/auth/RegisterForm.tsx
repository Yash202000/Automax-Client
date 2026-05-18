import React from "react";
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
  const [error, setError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
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
      password: z.string().min(8, t("auth.pwTooShort")),
      confirmPassword: z.string(),
      first_name: z.string().max(100).optional(),
      last_name: z.string().max(100).optional(),
      terms: z.boolean(),
    })
    .superRefine((data, ctx) => {
      if (data.password !== data.confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("auth.pwMismatch"),
          path: ["confirmPassword"],
        });
      }
      if (data.terms !== true) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("auth.acceptTerms"),
          path: ["terms"],
        });
      }
    });

  type RegisterFormData = z.infer<typeof registerSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { terms: false },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError("");

    try {
      const { confirmPassword: _cp, terms: _terms, ...registerData } = data;
      const response = await authApi.register(registerData as any);
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t("auth.registerTitle")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("auth.registerSubtitle")}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl animate-fade-in">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
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
          <Checkbox label={t("auth.agreeToTerms")} {...register("terms")} />
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
