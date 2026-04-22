import React, { useState } from "react";
import { toast } from "sonner";
import {
  KeyRound,
  Shield,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  Lock,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Copy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui";
import {
  useLicenseStatus,
  useActivateLicense,
  useDeactivateLicense,
  useLicenseCatalog,
} from "../../hooks/useLicense";
import { usePermissions } from "../../hooks/usePermissions";
import { PERMISSIONS } from "../../constants/permissions";

const LICENSE_TYPE_COLORS: Record<string, string> = {
  trial: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  standard: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  professional: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  enterprise: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
};

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  valid: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", icon: CheckCircle2 },
  expired: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", icon: XCircle },
  invalid: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", icon: XCircle },
  pending: { bg: "bg-slate-100 dark:bg-slate-700/30", text: "text-slate-600 dark:text-slate-300", icon: RefreshCw },
};

export const LicensePage: React.FC = () => {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.LICENSE_MANAGE);

  const { data: license, isLoading, error, refetch } = useLicenseStatus();
  const { data: catalogData } = useLicenseCatalog();
  const allFeatures = catalogData?.features ?? [];
  const activateMutation = useActivateLicense();
  const deactivateMutation = useDeactivateLicense();

  const [licenseKey, setLicenseKey] = useState("");
  const [jwks, setJwks] = useState("");
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showActivationForm, setShowActivationForm] = useState(false);

  const hasLicense = license && !error;

  const handleActivate = async () => {
    if (!licenseKey.trim() || !jwks.trim()) {
      toast.error("Both the license key and JWKS are required");
      return;
    }

    // Client-side JSON validation — the backend also validates, but a quick
    // check here avoids a round-trip for obvious typos.
    try {
      JSON.parse(jwks);
    } catch {
      toast.error("JWKS must be valid JSON");
      return;
    }

    try {
      const result = await activateMutation.mutateAsync({
        license_key: licenseKey.trim(),
        jwks: jwks.trim(),
      });
      toast.success(result.message || "License activated successfully");
      setLicenseKey("");
      setJwks("");
      setShowActivationForm(false);
      refetch();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; error?: string } } };
      const msg = error?.response?.data?.message || "Failed to activate license";
      const errCode = error?.response?.data?.error;

      if (errCode === "user_limit_exceeded") {
        toast.error(msg, { duration: 8000 });
      } else if (errCode === "product_mismatch") {
        toast.error("This license key is not for the Automax product");
      } else {
        toast.error(msg);
      }
    }
  };

  const handleDeactivate = async () => {
    try {
      await deactivateMutation.mutateAsync();
      toast.success("License deactivated");
      setShowDeactivateConfirm(false);
      refetch();
    } catch {
      toast.error("Failed to deactivate license");
    }
  };

  const getExpiryColor = (days: number | null | undefined) => {
    if (days == null) return "text-slate-500";
    if (days <= 0) return "text-red-600 dark:text-red-400";
    if (days <= 7) return "text-orange-600 dark:text-orange-400";
    if (days <= 30) return "text-amber-600 dark:text-amber-400";
    return "text-emerald-600 dark:text-emerald-400";
  };

  const getUserLimitPercent = () => {
    if (!license) return 0;
    if (license.max_users === 0) return 0;
    return Math.min(100, Math.round((license.active_user_count / license.max_users) * 100));
  };

  const getUserLimitColor = () => {
    const pct = getUserLimitPercent();
    if (pct >= 100) return "bg-red-500";
    if (pct >= 80) return "bg-amber-500";
    return "bg-emerald-500";
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in p-6">
        <div className="flex items-center gap-3 mb-6">
          <KeyRound className="w-6 h-6 text-slate-400" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">License Management</h1>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-8 text-center text-slate-500">
          Loading license information...
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <KeyRound className="w-6 h-6 text-indigo-500" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">License Management</h1>
        </div>
        {canManage && hasLicense && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowActivationForm(!showActivationForm)}
            >
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Replace License
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
              onClick={() => setShowDeactivateConfirm(true)}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Deactivate
            </Button>
          </div>
        )}
      </div>

      {/* Grace Period Warning Banner */}
      {license?.is_grace_period && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-900/20 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-200">License Expired - Grace Period Active</p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Your license has expired. Read-only access is available for {license.days_remaining != null ? Math.abs(license.days_remaining) : '?'} more days.
              All write operations are blocked. Please renew your license to restore full functionality.
            </p>
          </div>
        </div>
      )}

      {/* Activation Form */}
      {((!hasLicense && canManage) || showActivationForm) && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {hasLicense ? "Replace License" : "Activate License"}
            </h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              License Key (JWT)
            </label>
            <textarea
              rows={4}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm font-mono text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              placeholder="Paste the license JWT token here..."
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              JWKS (Public Keys JSON)
            </label>
            <textarea
              rows={6}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm font-mono text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              placeholder='{"keys":[{"kty":"RSA","use":"sig","alg":"RS256","kid":"...","n":"...","e":"AQAB"}]}'
              value={jwks}
              onChange={(e) => setJwks(e.target.value)}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Paste the JWKS JSON provided by your license issuer (typically the contents of LMA's /.well-known/jwks.json endpoint). Must be valid JSON with a <code className="font-mono">keys</code> array.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleActivate}
              disabled={activateMutation.isPending || !licenseKey.trim() || !jwks.trim()}
            >
              {activateMutation.isPending ? "Activating..." : "Activate License"}
            </Button>
            {showActivationForm && (
              <Button variant="outline" onClick={() => setShowActivationForm(false)}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}

      {/* No License State */}
      {!hasLicense && !canManage && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-8 text-center">
          <Lock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-300 text-lg font-medium">No Active License</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Contact your administrator to activate a license.
          </p>
        </div>
      )}

      {/* License Status */}
      {hasLicense && (
        <>
          {/* Status & Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Card */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">License Status</span>
              </div>
              {(() => {
                const status = STATUS_COLORS[license.validation_status] || STATUS_COLORS.pending;
                const StatusIcon = status.icon;
                return (
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${status.bg}`}>
                    <StatusIcon className={`w-4 h-4 ${status.text}`} />
                    <span className={`text-sm font-semibold capitalize ${status.text}`}>
                      {license.is_grace_period ? "Grace Period" : license.validation_status}
                    </span>
                  </div>
                );
              })()}
              <div className="mt-3 space-y-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Client: <span className="text-slate-700 dark:text-slate-300">{license.client_name}</span>
                </p>
                {license.company_name && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Company: <span className="text-slate-700 dark:text-slate-300">{license.company_name}</span>
                  </p>
                )}
              </div>
            </div>

            {/* License Type Card */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-5">
              <div className="flex items-center gap-2 mb-3">
                <KeyRound className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">License Type</span>
              </div>
              <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-semibold capitalize ${LICENSE_TYPE_COLORS[license.license_type] || "bg-slate-100 text-slate-700"}`}>
                {license.license_type}
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                ID: <span className="font-mono text-slate-600 dark:text-slate-300">{license.license_id?.slice(0, 8)}...</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(license.license_id || "");
                    toast.success("License ID copied");
                  }}
                  className="ml-1 text-slate-400 hover:text-slate-600"
                >
                  <Copy className="w-3 h-3 inline" />
                </button>
              </p>
            </div>

            {/* Expiry Card */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Expiration</span>
              </div>
              {license.expires_at ? (
                <>
                  <p className={`text-2xl font-bold tabular-nums ${getExpiryColor(license.days_remaining)}`}>
                    {license.days_remaining != null
                      ? license.days_remaining > 0
                        ? `${license.days_remaining} days`
                        : license.days_remaining === 0
                        ? "Expires today"
                        : `Expired ${Math.abs(license.days_remaining)} days ago`
                      : "—"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {new Date(license.expires_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </>
              ) : (
                <p className="text-lg font-semibold text-emerald-600">No expiry</p>
              )}
            </div>
          </div>

          {/* User Limit */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">User Limit</span>
              </div>
              <span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                {license.active_user_count} / {license.max_users}
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getUserLimitColor()}`}
                style={{ width: `${getUserLimitPercent()}%` }}
              />
            </div>
            {getUserLimitPercent() >= 80 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {getUserLimitPercent() >= 100
                  ? "User limit reached. Cannot create new users."
                  : "Approaching user limit."}
              </p>
            )}
          </div>

          {/* Licensed Features Matrix */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 p-5">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">Licensed Features</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {allFeatures.map((feature) => {
                const isLicensed = license.features?.includes(feature.code);
                return (
                  <div
                    key={feature.code}
                    title={feature.description}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                      isLicensed
                        ? "border-emerald-200 dark:border-emerald-700/40 bg-emerald-50 dark:bg-emerald-900/10"
                        : "border-slate-200 dark:border-slate-700/40 bg-slate-50 dark:bg-slate-800/40 opacity-60"
                    }`}
                  >
                    {isLicensed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )}
                    <span
                      className={`text-sm ${
                        isLicensed
                          ? "text-emerald-800 dark:text-emerald-200 font-medium"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {feature.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activation Details (collapsible) */}
          <details className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 group">
            <summary className="p-5 cursor-pointer flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Activation Details</span>
              <ChevronDown className="w-4 h-4 text-slate-400 group-open:hidden" />
              <ChevronUp className="w-4 h-4 text-slate-400 hidden group-open:block" />
            </summary>
            <div className="px-5 pb-5 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Activated At</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {license.activated_at ? new Date(license.activated_at).toLocaleString() : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email</span>
                <span className="text-slate-700 dark:text-slate-300">{license.client_email || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Product</span>
                <span className="text-slate-700 dark:text-slate-300">{license.product}</span>
              </div>
            </div>
          </details>
        </>
      )}

      {/* Deactivate Confirmation Modal */}
      {showDeactivateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl bg-white dark:bg-slate-800 p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
              Deactivate License?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              This will remove the active license. All module access restrictions will apply until a new license is activated.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDeactivateConfirm(false)}>
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeactivate}
                disabled={deactivateMutation.isPending}
              >
                {deactivateMutation.isPending ? "Deactivating..." : "Deactivate"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
