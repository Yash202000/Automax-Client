import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { usePermissions } from "../../hooks/usePermissions";

interface PermissionRouteProps {
  requiredPermissions: string[];
  requireAll?: boolean;
  redirectTo?: string;
}

export const PermissionRoute: React.FC<PermissionRouteProps> = ({
  requiredPermissions,
  requireAll = false,
  redirectTo = "/dashboard",
}) => {
  const { hasAnyPermission, hasAllPermissions, isSuperAdmin } =
    usePermissions();

  // Super admin has access to everything
  if (isSuperAdmin) {
    return <Outlet />;
  }

  const hasAccess = requireAll
    ? hasAllPermissions(requiredPermissions)
    : hasAnyPermission(requiredPermissions);

  if (!hasAccess) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
};

export default PermissionRoute;
