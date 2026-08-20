import { useTranslation } from "react-i18next";
import { Button } from "../ui";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { otpApi } from "@/api/otp";
import type { User } from "@/types";
import { Clock, RotateCcw } from "lucide-react";

interface AuthPayload {
  user: User;
  token: string;
  refreshToken?: string;
  rememberMe?: boolean;
}

interface OTPInputProps {
  onVerified?: (authData: AuthPayload) => void | Promise<void>;

  onResendSuccess?: (sessionId: string) => void;
  sessionId: string;
  user?: User;
  method: "sms" | "whatsapp";
}

export const OTPInput = ({
  onVerified,
  onResendSuccess,
  sessionId,
  user,
  method,
}: OTPInputProps) => {
  const { t } = useTranslation();

  const [fieldError, setFieldError] = useState("");
  const [timer, setTimer] = useState(60);
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));

  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const verifyOtpMutation = useMutation({
    mutationFn: (otp: string) =>
      otpApi.verify({
        phone: user!.phone,
        session_id: sessionId,
        otp,
      }),

    onSuccess: async (response) => {
      if (!response.success || !response.data) {
        setFieldError(response.message || t("auth.failedToVerifyOtp"));

        setDigits(Array(6).fill(""));

        requestAnimationFrame(() => {
          refs.current[0]?.focus();
        });

        return;
      }

      await onVerified?.({
        user: response.data.user,
        token: response.data.token,
        refreshToken: response.data.refresh_token,
      });
    },

    onError: (error: any) => {
      setFieldError(error.response?.data?.error || t("auth.failedToVerifyOtp"));

      setDigits(Array(6).fill(""));

      requestAnimationFrame(() => {
        refs.current[0]?.focus();
      });
    },
  });

  const resendOtpMutation = useMutation({
    mutationFn: () =>
      otpApi.send({
        phone: user!.phone,
        channel: method,
      }),

    onSuccess: (response) => {
      if (!response.session_id) {
        setFieldError(response.error || t("auth.failedToResendOtp"));
        return;
      }

      onResendSuccess?.(response.session_id);
      setDigits(Array(6).fill(""));
      setFieldError("");
      startTimer();

      requestAnimationFrame(() => {
        refs.current[0]?.focus();
      });
    },

    onError: (error: any) => {
      setFieldError(error.response?.data?.error || t("auth.failedToResendOtp"));
    },
  });

  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setTimer(60);

    timerRef.current = setInterval(() => {
      setTimer((current) => {
        if (current <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }

          return 0;
        }

        return current - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    startTimer();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const verifyOtp = () => {
    const otp = digits.join("");

    if (otp.length !== 6) {
      setFieldError(t("auth.enterAllDigits"));
      return;
    }

    if (!user?.phone) {
      setFieldError(t("auth.mobileNumberNotAvailable"));
      return;
    }

    setFieldError("");
    verifyOtpMutation.mutate(otp);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    verifyOtp();
  };

  useEffect(() => {
    const otp = digits.join("");

    if (otp.length === 6 && user?.phone && !verifyOtpMutation.isPending) {
      setFieldError("");
      verifyOtpMutation.mutate(otp);
    }
  }, [digits]);

  const handleResendOtp = () => {
    if (timer > 0 || resendOtpMutation.isPending) {
      return;
    }

    if (!user?.phone) {
      setFieldError(t("auth.mobileNumberNotAvailable"));
      return;
    }

    setFieldError("");
    resendOtpMutation.mutate();
  };

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);

    const next = [...digits];
    next[index] = digit;

    setDigits(next);
    setFieldError("");

    if (digit && index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (
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
    }

    if (e.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    }

    if (e.key === "ArrowRight" && index < 5) {
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

    pasted.split("").forEach((char, index) => {
      next[index] = char;
    });

    setDigits(next);
    setFieldError("");

    refs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const allDigitsFilled = digits.every(Boolean);

  return (
    <form onSubmit={handleVerifyOtp} noValidate>
      <div className="mb-6">
        <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("auth.verificationCode")}
        </label>

        <div className="flex w-full gap-2" onPaste={handlePaste} dir="ltr">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                refs.current[index] = el;
              }}
              type="tel"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              autoFocus={index === 0}
              autoComplete={index === 0 ? "one-time-code" : "off"}
              onChange={(e) => handleDigitChange(index, e.target.value)}
              onKeyDown={(e) => handleDigitKeyDown(index, e)}
              disabled={verifyOtpMutation.isPending}
              className={`
                h-12 w-full rounded-xl border-2
                text-center text-lg font-bold
                outline-none transition-all
                focus:border-blue-500
                focus:ring-4
                focus:ring-blue-500/10
                ${
                  fieldError
                    ? "border-red-400 bg-red-50 text-red-700"
                    : digit
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-300 bg-white text-gray-900"
                }
              `}
              aria-label={`${t("auth.digit")} ${index + 1}`}
            />
          ))}
        </div>

        {fieldError && (
          <p className="mt-2 text-sm text-red-500">{fieldError}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        isLoading={verifyOtpMutation.isPending}
        disabled={!allDigitsFilled || verifyOtpMutation.isPending}
      >
        {verifyOtpMutation.isPending
          ? t("auth.verifying")
          : t("auth.verifyCode")}
      </Button>

      <div className="mt-5 flex justify-center">
        {timer > 0 ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="h-4 w-4" />

            <span>{t("auth.resendIn")}</span>

            <span className="font-semibold text-slate-700">
              00:{String(timer).padStart(2, "0")}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={resendOtpMutation.isPending}
            className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            <RotateCcw
              className={`h-4 w-4 ${
                resendOtpMutation.isPending ? "animate-spin" : ""
              }`}
            />

            {resendOtpMutation.isPending
              ? t("auth.resending")
              : t("auth.resendCode")}
          </button>
        )}
      </div>
    </form>
  );
};
