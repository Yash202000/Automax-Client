import React from "react";
import { AlertTriangle } from "lucide-react";
import { useLicense } from "../../hooks/useLicense";
import { useTranslation } from "react-i18next";

export const LicenseGraceBanner: React.FC = () => {
  const { t } = useTranslation();
  const { isGracePeriod, daysRemaining, hasLicense, isLicenseActive } =
    useLicense();

  // Show banner only during grace period
  if (!isGracePeriod) return null;

  // Also show a banner if there's no license at all
  if (!hasLicense) {
    return (
      <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium">
        <AlertTriangle className="w-4 h-4 inline mr-1.5 -mt-0.5" />
        {t("license.noActiveLicenseSomeFeaturesMayBe")}
      </div>
    );
  }

  if (!isLicenseActive && !isGracePeriod) return null;

  return (
    <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium">
      <AlertTriangle className="w-4 h-4 inline mr-1.5 -mt-0.5" />
      {t("license.yourLicenseHasExpiredReadOnlyAccess")}{" "}
      {daysRemaining != null
        ? `${Math.abs(daysRemaining)} more days`
        : "a limited time"}
      {t("license.pleaseRenewYourLicense")}
    </div>
  );
};
