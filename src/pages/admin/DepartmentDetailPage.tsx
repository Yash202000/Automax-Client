import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Building2,
  MapPin,
  FolderTree,
  Shield,
  Users,
  Edit2,
  CheckCircle2,
  XCircle,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../../components/ui';
import { departmentApi, userApi } from '../../api/admin';
import type { Location, Classification, Role, User } from '../../types';
import { cn } from '@/lib/utils';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../constants/permissions';

export const DepartmentDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission, isSuperAdmin } = usePermissions();

  const canEditDepartment = isSuperAdmin || hasPermission(PERMISSIONS.DEPARTMENTS_UPDATE);

  const { data: departmentData, isLoading: isLoadingDepartment } = useQuery({
    queryKey: ['admin', 'departments', id],
    queryFn: () => departmentApi.getById(id!),
    enabled: !!id,
  });

  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['admin', 'dept-users', id],
    queryFn: () => userApi.list(1, 500, '', [], [id!]),
    enabled: !!id,
  });

  const department = departmentData?.data;
  const departmentUsers = (usersData?.data as unknown as User[]) || [];

  if (isLoadingDepartment) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[hsl(var(--muted-foreground))]">{t('departments.loadingDepartment')}</p>
        </div>
      </div>
    );
  }

  if (!department) {
    return (
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-12 shadow-sm">
        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-[hsl(var(--destructive)/0.1)] rounded-2xl flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-[hsl(var(--destructive))]" />
          </div>
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">{t('departments.departmentNotFound')}</h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-6 text-center max-w-sm">
            {t('departments.departmentNotFoundDesc')}
          </p>
          <Button onClick={() => navigate('/admin/departments')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            {t('departments.backToDepartments')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/admin/departments')}
            className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('departments.backToDepartments')}
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-2xl flex items-center justify-center shadow-lg shadow-[hsl(var(--primary)/0.25)]">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">{department.name}</h1>
                <span
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-full",
                    department.is_active
                      ? 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]'
                      : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                  )}
                >
                  {department.is_active ? t('departments.active') : t('departments.inactive')}
                </span>
              </div>
              <p className="text-[hsl(var(--muted-foreground))] mt-1 font-mono text-sm">{department.code}</p>
            </div>
          </div>
          {department.description && (
            <p className="text-[hsl(var(--muted-foreground))] mt-3 ml-[4.5rem] max-w-xl">
              {department.description}
            </p>
          )}
        </div>
        {canEditDepartment && (
          <Button
            variant="outline"
            onClick={() => navigate('/admin/departments', { state: { editDepartment: department } })}
            leftIcon={<Edit2 className="w-4 h-4" />}
          >
            {t('departments.editDepartment')}
          </Button>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[hsl(var(--primary)/0.1)] rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-[hsl(var(--primary))]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{department.locations?.length || 0}</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('departments.locations')}</p>
            </div>
          </div>
        </div>
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[hsl(var(--accent)/0.1)] rounded-xl flex items-center justify-center">
              <FolderTree className="w-5 h-5 text-[hsl(var(--accent))]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{department.classifications?.length || 0}</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('departments.classifications')}</p>
            </div>
          </div>
        </div>
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[hsl(var(--success)/0.1)] rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-[hsl(var(--success))]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{department.roles?.length || 0}</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('departments.roles')}</p>
            </div>
          </div>
        </div>
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[hsl(var(--warning)/0.1)] rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-[hsl(var(--warning))]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{departmentUsers.length}</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('departments.users')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Locations */}
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[hsl(var(--primary)/0.1)] rounded-lg flex items-center justify-center">
                <MapPin className="w-4 h-4 text-[hsl(var(--primary))]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">{t('departments.locations')}</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">{department.locations?.length || 0} {t('departments.assigned')}</p>
              </div>
            </div>
          </div>
          <div className="p-4">
            {department.locations && department.locations.length > 0 ? (
              <div className="space-y-2">
                {department.locations.map((location: Location) => (
                  <div
                    key={location.id}
                    className="flex items-center justify-between p-3 bg-[hsl(var(--muted)/0.5)] rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[hsl(var(--primary)/0.1)] rounded-lg flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-[hsl(var(--primary))]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[hsl(var(--foreground))]">{location.name}</p>
                        {location.type && (
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">{location.type}</p>
                        )}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "px-2 py-0.5 text-xs font-medium rounded-md",
                        location.is_active
                          ? 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]'
                          : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                      )}
                    >
                      {location.is_active ? t('departments.active') : t('departments.inactive')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MapPin className="w-10 h-10 text-[hsl(var(--muted-foreground)/0.5)] mx-auto mb-2" />
                <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('departments.noLocationsAssigned')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Classifications */}
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[hsl(var(--accent)/0.1)] rounded-lg flex items-center justify-center">
                <FolderTree className="w-4 h-4 text-[hsl(var(--accent))]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">{t('departments.classifications')}</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">{department.classifications?.length || 0} {t('departments.assigned')}</p>
              </div>
            </div>
          </div>
          <div className="p-4">
            {department.classifications && department.classifications.length > 0 ? (
              <div className="space-y-2">
                {department.classifications.map((classification: Classification) => (
                  <div
                    key={classification.id}
                    className="flex items-center justify-between p-3 bg-[hsl(var(--muted)/0.5)] rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[hsl(var(--accent)/0.1)] rounded-lg flex items-center justify-center">
                        <FolderTree className="w-4 h-4 text-[hsl(var(--accent))]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[hsl(var(--foreground))]">{classification.name}</p>
                        {classification.description && (
                          <p className="text-xs text-[hsl(var(--muted-foreground))] truncate max-w-[200px]">
                            {classification.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "px-2 py-0.5 text-xs font-medium rounded-md",
                        classification.is_active
                          ? 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]'
                          : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                      )}
                    >
                      {classification.is_active ? t('departments.active') : t('departments.inactive')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FolderTree className="w-10 h-10 text-[hsl(var(--muted-foreground)/0.5)] mx-auto mb-2" />
                <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('departments.noClassificationsAssigned')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Roles */}
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[hsl(var(--success)/0.1)] rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-[hsl(var(--success))]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">{t('departments.roles')}</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">{department.roles?.length || 0} {t('departments.assigned')}</p>
              </div>
            </div>
          </div>
          <div className="p-4">
            {department.roles && department.roles.length > 0 ? (
              <div className="space-y-2">
                {department.roles.map((role: Role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between p-3 bg-[hsl(var(--muted)/0.5)] rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[hsl(var(--success)/0.1)] rounded-lg flex items-center justify-center">
                        <Shield className="w-4 h-4 text-[hsl(var(--success))]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[hsl(var(--foreground))]">{role.name}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] font-mono">{role.code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs font-medium bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded-md">
                        {role.permissions?.length || 0} {t('departments.permissions')}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 text-xs font-medium rounded-md",
                          role.is_active
                            ? 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]'
                            : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                        )}
                      >
                        {role.is_active ? t('departments.active') : t('departments.inactive')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Shield className="w-10 h-10 text-[hsl(var(--muted-foreground)/0.5)] mx-auto mb-2" />
                <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('departments.noRolesAssigned')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Users */}
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[hsl(var(--warning)/0.1)] rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-[hsl(var(--warning))]" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">{t('departments.users')}</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{departmentUsers.length} {t('departments.members')}</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/admin/users')}
                className="flex items-center gap-1 text-xs text-[hsl(var(--primary))] hover:underline"
              >
                {t('departments.viewAll')} <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="p-4">
            {isLoadingUsers ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('departments.loadingUsers')}</p>
              </div>
            ) : departmentUsers.length > 0 ? (
              <div className="space-y-2">
                {departmentUsers.slice(0, 5).map((user: User) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-[hsl(var(--muted)/0.5)] rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.username}
                          className="w-8 h-8 rounded-lg object-cover ring-1 ring-[hsl(var(--border))]"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">
                            {user.first_name?.[0] || user.username[0]}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                          {user.first_name} {user.last_name}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md",
                        user.is_active
                          ? 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]'
                          : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                      )}
                    >
                      {user.is_active ? (
                        <><CheckCircle2 className="w-3 h-3" /> {t('departments.active')}</>
                      ) : (
                        <><XCircle className="w-3 h-3" /> {t('departments.inactive')}</>
                      )}
                    </span>
                  </div>
                ))}
                {departmentUsers.length > 5 && (
                  <button
                    onClick={() => navigate('/admin/users')}
                    className="w-full text-center py-2 text-sm text-[hsl(var(--primary))] hover:underline"
                  >
                    {t('departments.moreUsers', { count: departmentUsers.length - 5 })}
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-[hsl(var(--muted-foreground)/0.5)] mx-auto mb-2" />
                <p className="text-sm text-[hsl(var(--muted-foreground))]">{t('departments.noUsersInDepartment')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
