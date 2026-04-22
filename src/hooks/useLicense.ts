import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { licenseApi } from '../api/license';
import type { LicenseActivateRequest } from '../api/license';
import { useLicenseStore } from '../stores/licenseStore';
import { useEffect } from 'react';

export const licenseKeys = {
  all: ['license'] as const,
  info: () => [...licenseKeys.all, 'info'] as const,
  status: () => [...licenseKeys.all, 'status'] as const,
  catalog: () => [...licenseKeys.all, 'catalog'] as const,
};

/**
 * useLicenseCatalog returns the canonical list of licensable features from the
 * server. The catalog is static per deploy, so it's cached indefinitely.
 * Use this anywhere the UI needs human-readable labels or the full feature list
 * (license page, admin-side tooling), not for per-tenant license state —
 * for that, use useLicenseInfo / useLicense.
 */
export const useLicenseCatalog = () => {
  return useQuery({
    queryKey: licenseKeys.catalog(),
    queryFn: async () => {
      const res = await licenseApi.getCatalog();
      return res.data;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });
};

export const useLicenseInfo = () => {
  const setInfo = useLicenseStore((s) => s.setInfo);

  const query = useQuery({
    queryKey: licenseKeys.info(),
    queryFn: async () => {
      const res = await licenseApi.getInfo();
      return res.data;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (query.data) {
      setInfo(query.data);
    }
  }, [query.data, setInfo]);

  return query;
};

export const useLicenseStatus = () => {
  return useQuery({
    queryKey: licenseKeys.status(),
    queryFn: async () => {
      const res = await licenseApi.getStatus();
      return res.data;
    },
    retry: false,
  });
};

export const useActivateLicense = () => {
  const queryClient = useQueryClient();
  const setInfo = useLicenseStore((s) => s.setInfo);

  return useMutation({
    mutationFn: (data: LicenseActivateRequest) => licenseApi.activate(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: licenseKeys.all });
      if (result.data) {
        setInfo(result.data);
      }
    },
  });
};

export const useDeactivateLicense = () => {
  const queryClient = useQueryClient();
  const clear = useLicenseStore((s) => s.clear);

  return useMutation({
    mutationFn: () => licenseApi.deactivate(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: licenseKeys.all });
      clear();
    },
  });
};

export const useLicense = () => {
  const info = useLicenseStore((s) => s.info);
  const isLoaded = useLicenseStore((s) => s.isLoaded);

  return {
    info,
    isLoaded,
    isFeatureLicensed: (feature: string) => info?.features?.includes(feature) ?? false,
    isGracePeriod: info?.is_grace_period ?? false,
    daysRemaining: info?.days_remaining ?? null,
    maxUsers: info?.max_users ?? 0,
    activeUsers: info?.active_user_count ?? 0,
    licenseType: info?.license_type ?? 'none',
    isLicenseActive: info?.validation_status === 'valid',
    hasLicense: isLoaded && info != null,
  };
};
