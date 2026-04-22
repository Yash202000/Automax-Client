import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useLicenseInfo } from '../../hooks/useLicense';

export const ProtectedRoute: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Fetch license info on mount for all authenticated users.
  // This populates the global license store used by sidebar gating and feature checks.
  useLicenseInfo();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
