import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Lock,
  Mail,
  Phone,
  ArrowRight,
  ChevronLeft,
  AlertCircle,
  CheckCircle2,
  EyeOff,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui";
import { authApi } from "@/api/auth";
import { useMutation } from "@tanstack/react-query";

type Channel = "sms" | "email";
type Step = 1 | 2 | 3 | 4;

function resolveError(
  status: number | undefined,
  t: (k: string, fallback: string) => string,
  message: string | undefined,
): string {
  switch (status) {
    case 400:
      if (message?.toLowerCase().includes("record not found")) {
        return t("auth.recordNotFound", "Record not found");
      } else if (message?.toLowerCase().includes("otp")) {
        return t("auth.invalidOtp", "Invalid OTP. Please check and try again.");
      }

      return (
        message ||
        t("auth.errorGeneric", "Something went wrong. Please try again.")
      );
    case 404:
      return t(
        "auth.errorNotFound",
        "Account not found. Please check and try again.",
      );
    case 410:
      return t(
        "auth.errorExpired",
        "This code has expired. Please request a new one.",
      );
    case 401:
      return t("auth.errorInvalid", "Invalid code. Please try again.");
    default:
      return t("auth.errorGeneric", "Something went wrong. Please try again.");
  }
}

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
  const [channel, setChannel] = useState<Channel>("sms");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [fpValue, setFpValue] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw1, setShowPw1] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [timer, setTimer] = useState(0);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = (s: Step) => {
    setFieldError("");
    setStep(s);
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer(60);
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setFieldError("");
    if (digit && index < 5) refs.current[index + 1]?.focus();
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
    } else if (e.key === "ArrowLeft" && index > 0)
      refs.current[index - 1]?.focus();
    else if (e.key === "ArrowRight" && index < 5)
      refs.current[index + 1]?.focus();
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
    refs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const sendOtpMutation = useMutation({
    mutationFn: (payload: { value: string; channel: Channel }) =>
      authApi.forgotPassword(payload),
    onSuccess: (res, variables) => {
      setSessionId(res.data?.sessionID ?? "");
      setFpValue(variables.value);
      goTo(2);
      startTimer();
    },
    onError: (err: any) => {
      setFieldError(
        resolveError(err?.response?.status, t, err?.response?.data?.error),
      );
    },
  });

  const resendOtpMutation = useMutation({
    mutationFn: (payload: { value: string; channel: Channel }) =>
      authApi.forgotPassword(payload),
    onSuccess: (res) => {
      setSessionId(res.data?.sessionID ?? "");
      setDigits(Array(6).fill(""));
      refs.current[0]?.focus();
      startTimer();
    },
    onError: (err: any) => {
      setFieldError(
        resolveError(err?.response?.status, t, err?.response?.data?.error),
      );
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: (payload: {
      value: string;
      channel: Channel;
      session_id: string;
      otp: string;
    }) => authApi.verifyResetOtp(payload),
    onSuccess: (res) => {
      setResetToken(res.data?.resetToken ?? res.data?.resetToken ?? "");
      goTo(3);
    },
    onError: (err: any) => {
      setFieldError(
        resolveError(err?.response?.status, t, err?.response?.data?.error),
      );
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (payload: { resetToken: string; newPassword: string }) =>
      authApi.resetPassword(payload),
    onSuccess: () => goTo(4),
    onError: (err: any) => {
      setFieldError(
        resolveError(err?.response?.status, t, err?.response?.data?.error),
      );
    },
  });

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError("");
    if (channel === "sms") {
      if (phone.trim().length < 6) {
        setFieldError(t("auth.invalidPhone"));
        return;
      }
      sendOtpMutation.mutate({ value: "+" + phone.trim(), channel: "sms" });
    } else {
      if (!email.trim().includes("@")) {
        setFieldError(t("auth.invalidEmail"));
        return;
      }
      sendOtpMutation.mutate({ value: email.trim(), channel: "email" });
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const otp = digits.join("");
    if (otp.length < 6) {
      setFieldError(t("auth.enterAllDigits"));
      return;
    }
    verifyOtpMutation.mutate({
      value: fpValue,
      channel,
      session_id: sessionId,
      otp,
    });
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError("");
    if (password.length < 8) {
      setFieldError(t("auth.pwTooShort"));
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setFieldError(t("auth.pwUppercase"));
      return;
    }
    if (!/[0-9]/.test(password)) {
      setFieldError(t("auth.pwNumber"));
      return;
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      setFieldError(t("auth.pwSpecial"));
      return;
    }
    if (password !== confirmPassword) {
      setFieldError(t("auth.pwMismatch"));
      return;
    }
    resetPasswordMutation.mutate({ resetToken, newPassword: password });
  };

  const StepBar = () => (
    <div className="flex gap-1.5 mb-8">
      {([1, 2, 3] as const).map((n) => (
        <div
          key={n}
          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
            n < step
              ? "bg-blue-600"
              : n === step
                ? "bg-blue-300"
                : "bg-gray-200"
          }`}
        />
      ))}
    </div>
  );

  const BackButton = ({ to }: { to: Step }) => (
    <button
      type="button"
      onClick={() => goTo(to)}
      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
    >
      <ChevronLeft className="w-4 h-4" />
      {t("common.back")}
    </button>
  );

  const ErrorAlert = () =>
    fieldError ? (
      <div className="flex items-center gap-2 mb-5 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>{fieldError}</span>
      </div>
    ) : null;

  const allDigitsFilled = digits.every(Boolean);

  return (
    <div className="animate-fade-in-up">
      {step === 1 && (
        <>
          <div className="mb-8">
            <h1 className="text-3xl font-bold">{t("auth.forgotPassword")}</h1>
            <p className="mt-2 text-muted-foreground">
              {t("auth.forgotSubtitle")}
            </p>
          </div>

          <div className="flex gap-1.5 mb-8">
            {([1, 2, 3] as const).map((n) => (
              <div
                key={n}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  n < step
                    ? "bg-blue-600"
                    : n === step
                      ? "bg-blue-300"
                      : "bg-gray-200"
                }`}
              />
            ))}
          </div>
          {ErrorAlert()}

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("auth.sendCodeVia")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["sms", "email"] as Channel[]).map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => {
                    setChannel(ch);
                    setFieldError("");
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    channel === ch
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  {ch === "sms" ? (
                    <Phone className="w-4 h-4" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  {ch === "sms" ? t("auth.smsPhone") : t("auth.email")}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSendOtp} noValidate>
            {channel === "sms" ? (
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t("auth.mobileNumber")}
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    +
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="919876543210"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\D/g, ""));
                      setFieldError("");
                    }}
                    className="flex-1 h-10 px-3 rounded-r-xl border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                  />
                </div>
              </div>
            ) : (
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t("auth.emailAddress")}
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldError("");
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              isLoading={sendOtpMutation.isPending}
              rightIcon={
                !sendOtpMutation.isPending && <ArrowRight className="w-5 h-5" />
              }
            >
              {t("auth.sendCode")}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-600">
            {t("auth.rememberPassword")}{" "}
            <Link
              to="/login"
              className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              {t("auth.signIn")}
            </Link>
          </p>
        </>
      )}

      {step === 2 && (
        <>
          {BackButton({ to: 1 })}

          <div className="mb-8">
            <h1 className="text-3xl font-bold">{t("auth.enterCode")}</h1>
            <p className="mt-2 text-muted-foreground">
              {channel === "sms"
                ? t("auth.otpSentPhone")
                : t("auth.otpSentEmail")}
            </p>
          </div>

          {StepBar()}
          {ErrorAlert()}

          <form onSubmit={handleVerifyOtp} noValidate>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t("auth.verificationCode")}
              </label>

              <div
                className="flex w-full gap-2"
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
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(i, e)}
                    className={`
                      h-12 w-full rounded-xl border-2 text-center text-lg font-bold
                      transition-all duration-150 outline-none
                      focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                      ${
                        fieldError
                          ? "border-red-400 bg-red-50 text-red-700"
                          : d
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-300 bg-white text-gray-900"
                      }
                    `}
                    aria-label={`${t("auth.digit")} ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              isLoading={verifyOtpMutation.isPending}
              disabled={!allDigitsFilled || verifyOtpMutation.isPending}
              rightIcon={
                !verifyOtpMutation.isPending && (
                  <ArrowRight className="w-5 h-5" />
                )
              }
            >
              {t("auth.verifyCode")}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600">
            {t("auth.didntReceive")}{" "}
            {timer > 0 ? (
              <span className="text-muted-foreground">
                {t("auth.resendIn")}{" "}
                <span className="font-semibold text-gray-900 tabular-nums">
                  {timer}s
                </span>
              </span>
            ) : (
              <button
                type="button"
                disabled={resendOtpMutation.isPending}
                onClick={() =>
                  resendOtpMutation.mutate({ value: fpValue, channel })
                }
                className="font-semibold text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50"
              >
                {resendOtpMutation.isPending
                  ? t("auth.resending")
                  : t("auth.resend")}
              </button>
            )}
          </p>
        </>
      )}

      {step === 3 && (
        <>
          {BackButton({ to: 2 })}

          <div className="mb-8">
            <h1 className="text-3xl font-bold">{t("auth.setNewPassword")}</h1>
            <p className="mt-2 text-muted-foreground">
              {t("auth.setNewPasswordSubtitle")}
            </p>
          </div>

          {StepBar()}
          {ErrorAlert()}

          <form onSubmit={handleResetPassword} noValidate className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t("auth.newPassword")}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPw1 ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldError("");
                  }}
                  className="w-full h-10 pl-9 pr-10 rounded-xl border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw1((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw1 ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t("auth.confirmPassword")}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPw2 ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setFieldError("");
                  }}
                  className="w-full h-10 pl-9 pr-10 rounded-xl border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw2((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw2 ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              isLoading={resetPasswordMutation.isPending}
              rightIcon={
                !resetPasswordMutation.isPending && (
                  <ArrowRight className="w-5 h-5" />
                )
              }
            >
              {t("auth.resetPassword")}
            </Button>
          </form>
        </>
      )}

      {step === 4 && (
        <div className="text-center animate-fade-in">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {t("auth.passwordUpdated")}
          </h1>
          <p className="text-muted-foreground mb-8">
            {t("auth.passwordUpdatedSubtitle")}
          </p>
          <Button
            className="w-full"
            rightIcon={<ArrowRight className="w-5 h-5" />}
            onClick={() => navigate("/login")}
          >
            {t("auth.backToLogin")}
          </Button>
        </div>
      )}
    </div>
  );
}
