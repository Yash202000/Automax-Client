import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Fingerprint } from "lucide-react";
import { Button, Input } from "../ui";
import { ssoApi } from "../../api/sso";
import { useAuthStore } from "../../stores/authStore";
import type { User } from "../../types";

interface SSOLoginFormProps {
  onSwitchToRegular: () => void;
}

export const SSOLoginForm: React.FC<SSOLoginFormProps> = ({
  onSwitchToRegular,
}) => {
  const { t } = useTranslation();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [nationalId, setNationalId] = useState("");
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async (e: React.FormEvent) => {
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

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t("auth.ssoLoginTitle")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("auth.ssoLoginSubtitle")}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl animate-fade-in">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-5" noValidate>
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

      <p className="mt-8 text-center text-gray-600">
        <button
          type="button"
          onClick={onSwitchToRegular}
          className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          {t("auth.switchToRegular")}
        </button>
      </p>
    </div>
  );
};
