import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export const AdminProtectedRoute: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has admin access (super admin or has any admin permission)
  const hasAdminAccess =
    user?.is_super_admin ||
    user?.permissions?.some(p =>
      p.includes(':view') ||
      p.includes(':create') ||
      p.includes(':update') ||
      p.includes(':delete') ||
      p.includes(':manage')
    );

  if (!hasAdminAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
