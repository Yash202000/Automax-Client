import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useLicense } from '../../hooks/useLicense';

export const LicenseGraceBanner: React.FC = () => {
  const { isGracePeriod, daysRemaining, hasLicense, isLicenseActive } = useLicense();

  // Show banner only during grace period
  if (!isGracePeriod) return null;

  // Also show a banner if there's no license at all
  if (!hasLicense) {
    return (
      <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium">
        <AlertTriangle className="w-4 h-4 inline mr-1.5 -mt-0.5" />
        No active license. Some features may be unavailable. Contact your administrator.
      </div>
    );
  }

  if (!isLicenseActive && !isGracePeriod) return null;

  return (
    <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium">
      <AlertTriangle className="w-4 h-4 inline mr-1.5 -mt-0.5" />
      Your license has expired. Read-only access available for{' '}
      {daysRemaining != null ? `${Math.abs(daysRemaining)} more days` : 'a limited time'}.
      Please renew your license.
    </div>
  );
};
