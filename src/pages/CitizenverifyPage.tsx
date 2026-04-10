import React, { useState, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShieldCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui";
import { SmsLinkApi } from "@/api/admin";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";

function resolveError(
  status: number | undefined,
  t: (k: string, fallback: string) => string,
): string {
  switch (status) {
    case 410:
      return t(
        "citizen.error410",
        "This link has expired. Please contact support.",
      );
    case 401:
      return t(
        "citizen.error401",
        "Invalid link. Please use the link from your SMS.",
      );
    case 404:
      return t(
        "citizen.error404",
        "Phone number not recognised. Please check and try again.",
      );
    default:
      return t("citizen.error400", "Something went wrong. Please try again.");
  }
}

export function CitizenVerifyPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const signedToken = searchParams.get("signed_token") ?? "";

  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState("");
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError("");
    if (digit && index < 5) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const next = [...digits];
        next[index] = "";
        setDigits(next);
      } else if (index > 0) {
        refs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (!pasted) return;
    const next = Array(6).fill("");
    pasted.split("").forEach((ch, i) => {
      next[i] = ch;
    });
    setDigits(next);
    const focusIdx = Math.min(pasted.length, 5);
    refs.current[focusIdx]?.focus();
  };

  const mutation = useMutation({
    mutationFn: ({
      id,
      signed_token,
      last6digits,
    }: {
      id: string;
      signed_token: string;
      last6digits: string;
    }) => SmsLinkApi.validate(id, signed_token, last6digits),

    onSuccess: (res) => {
      const { incident, auth_data } = res.data;

      setAuth(auth_data.user, auth_data.token, auth_data.refresh_token);

      navigate(`/ivr/incident/${id}/update`, {
        state: { incident, auth_data },
      });
    },

    onError: (err: any) => {
      setError(resolveError(err?.response?.status, t));
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const last6digits = digits.join("");
    if (last6digits.length < 6) {
      setError(t("citizen.enterAllDigits", "Please enter all 6 digits."));
      return;
    }
    if (!id || !signedToken) {
      setError(
        t(
          "citizen.error401",
          "Invalid link. Please use the link from your SMS.",
        ),
      );
      return;
    }

    mutation.mutate({
      id,
      signed_token: signedToken,
      last6digits,
    });
  };

  if (!id || !signedToken) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 text-center py-12">
        <AlertCircle className="w-10 h-10 text-red-500" />
        <p className="text-gray-700 font-medium">
          {t(
            "citizen.error401",
            "Invalid link. Please use the link from your SMS.",
          )}
        </p>
      </div>
    );
  }

  const allFilled = digits.every(Boolean);

  return (
    <div>
      {/* Header — same rhythm as LoginPage */}
      <div className="mb-8">
        <div className="flex items-center gap-2 justify-start">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 ">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("citizen.verifyTitle", "Verify your identity")}
          </h1>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          {t(
            "citizen.verifySubtitle",
            "Enter the last 6 digits of the mobile number you used to report this incident.",
          )}
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* OTP boxes */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t("citizen.mobileDigitsLabel", "Last 6 digits of mobile number")}
          </label>
          <div
            className="flex w-full gap-2 justify-start"
            onPaste={handlePaste}
            dir="ltr"
          >
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="tel"
                inputMode="numeric"
                maxLength={1}
                value={d}
                autoFocus={i === 0}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`
                  h-12 w-full rounded-xl border-2 text-center text-lg font-bold
                  transition-all duration-150 outline-none
                  focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                  ${
                    error
                      ? "border-red-400 bg-red-50 text-red-700"
                      : d
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-300 bg-white text-gray-900"
                  }
                `}
                aria-label={`${t("citizen.digit", "Digit")} ${i + 1}`}
              />
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 mt-3 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          isLoading={mutation.isPending}
          disabled={!allFilled || mutation.isPending}
        >
          {t("citizen.verifyAndContinue", "Verify & Continue")}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-gray-400">
        {t(
          "citizen.secureNote",
          "This link is unique to your incident and expires after 24 hours.",
        )}
      </p>
    </div>
  );
}
