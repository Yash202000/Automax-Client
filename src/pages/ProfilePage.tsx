import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import {
  Camera,
  User,
  Mail,
  Calendar,
  Shield,
  Building2,
  Briefcase,
  Check,
  Edit3,
  Save,
  X,
  Phone,
  MapPin,
  Tag,
} from 'lucide-react';
import { Button, Input, Card } from '../components/ui';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/auth';

const profileSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  phone: z.string().optional(),
  extension: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { user, setUser } = useAuthStore();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username || '',
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: user?.phone || '',
      extension: (user as any)?.extension || '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authApi.updateProfile(data);
      if (response.success && response.data) {
        setUser(response.data);
        setSuccess(t('profile.profileUpdated'));
        setIsEditing(false);
      } else {
        setError(response.error || 'Failed to update profile');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        setError(axiosError.response?.data?.error || errorMessage);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    reset({
      username: user?.username || '',
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: user?.phone || '',
      extension: (user as any)?.extension || '',
    });
    setIsEditing(false);
    setError('');
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError(t('profile.fileSizeError'));
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setError(t('profile.fileTypeError'));
      return;
    }

    setAvatarLoading(true);
    setError('');

    try {
      const response = await authApi.uploadAvatar(file);
      if (response.success && response.data) {
        setUser(response.data);
        setSuccess(t('profile.avatarUpdated'));
      } else {
        setError(response.error || 'Failed to upload avatar');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        setError(axiosError.response?.data?.error || errorMessage);
      } else {
        setError(errorMessage);
      }
    } finally {
      setAvatarLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200 rounded-2xl p-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <User className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t('profile.title')}</h1>
            <p className="mt-1 text-slate-600">{t('profile.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-xl shadow-lg animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0 shadow-md">
              <X className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-red-900">Error</p>
              <p className="text-sm text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
        </div>
      )}
      {success && (
        <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl shadow-lg animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-md">
              <Check className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-emerald-900">Success</p>
              <p className="text-sm text-emerald-700 mt-0.5">{success}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card - Left Column */}
        <div className="lg:col-span-1">
          <Card className="overflow-hidden shadow-lg border-slate-200">
            {/* Gradient Header */}
            <div className="h-28 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>
            </div>

            {/* Avatar Section */}
            <div className="px-6 pb-6">
              <div className="relative -mt-14 mb-5">
                <div className="relative inline-block">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="w-28 h-28 rounded-2xl object-cover border-4 border-white shadow-xl ring-4 ring-slate-100"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center border-4 border-white shadow-xl ring-4 ring-slate-100">
                      <span className="text-white text-4xl font-bold">
                        {user?.first_name?.[0] || user?.username?.[0] || 'U'}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={handleAvatarClick}
                    disabled={avatarLoading}
                    className="absolute -bottom-2 -right-2 p-2.5 bg-white rounded-xl shadow-lg text-slate-600 hover:text-blue-600 hover:scale-110 transition-all disabled:opacity-50 border-2 border-slate-100"
                  >
                    {avatarLoading ? (
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
              </div>

              {/* User Info */}
              <div className="text-center mb-5">
                <h2 className="text-2xl font-bold text-slate-900">
                  {user?.first_name} {user?.last_name}
                </h2>
                <p className="text-slate-500 font-medium">@{user?.username}</p>
              </div>

              {/* Badges */}
              <div className="flex justify-center gap-2 flex-wrap mb-6">
                {user?.is_super_admin && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-rose-500 to-red-600 text-white text-xs font-bold rounded-lg shadow-md">
                    <Shield className="w-3 h-3" />
                    {t('profile.superAdmin')}
                  </span>
                )}
                {user?.roles?.slice(0, 3).map((role) => (
                  <span
                    key={role.id}
                    className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200 text-xs font-semibold rounded-lg"
                  >
                    {role.name}
                  </span>
                ))}
                {(user?.roles?.length || 0) > 3 && (
                  <span className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg">
                    +{user!.roles!.length - 3}
                  </span>
                )}
              </div>

              {/* Quick Info */}
              <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-gray-700 truncate font-medium">{user?.email}</span>
                </div>
                {user?.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-gray-700 font-medium">{user.phone}</span>
                  </div>
                )}
                {(user as any)?.extension && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                      <Tag className="w-4 h-4 text-violet-600" />
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Extension</span>
                      <p className="text-gray-700 font-semibold">Ext. {(user as any).extension}</p>
                    </div>
                  </div>
                )}
                {user?.department && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-amber-600" />
                    </div>
                    <span className="text-gray-700 font-medium">{user.department.name}</span>
                  </div>
                )}
                {user?.location && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-rose-600" />
                    </div>
                    <span className="text-gray-700 font-medium">{user.location.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm pt-3 border-t border-gray-100">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">Member since</span>
                    <p className="text-gray-700 font-medium">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Upload Hint */}
              <p className="text-xs text-slate-400 text-center bg-slate-50 py-2 rounded-lg">
                {t('profile.clickCameraToChange')}
              </p>
            </div>
          </Card>
        </div>

        {/* Details Section - Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card className="shadow-lg border-slate-200">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  {t('profile.personalInfo')}
                </h3>
                <p className="text-sm text-slate-500 mt-1 ml-10">{t('profile.personalInfoDesc')}</p>
              </div>
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Edit3 className="w-4 h-4" />}
                  onClick={() => setIsEditing(true)}
                  className="shrink-0"
                >
                  {t('common.edit')}
                </Button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <Input
                  label={t('profile.email')}
                  type="email"
                  value={user?.email || ''}
                  disabled
                  hint={t('profile.emailCannotChange')}
                  leftIcon={<Mail className="w-5 h-5" />}
                />

                <Input
                  label={t('profile.username')}
                  placeholder="johndoe"
                  error={errors.username?.message}
                  leftIcon={<User className="w-5 h-5" />}
                  {...register('username')}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label={t('profile.firstName')}
                    placeholder="John"
                    error={errors.first_name?.message}
                    {...register('first_name')}
                  />
                  <Input
                    label={t('profile.lastName')}
                    placeholder="Doe"
                    error={errors.last_name?.message}
                    {...register('last_name')}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Phone Number"
                    placeholder="+1 (555) 123-4567"
                    error={errors.phone?.message}
                    leftIcon={<Phone className="w-5 h-5" />}
                    {...register('phone')}
                  />
                  <Input
                    label="Extension"
                    placeholder="1001"
                    error={errors.extension?.message}
                    leftIcon={<Tag className="w-5 h-5" />}
                    hint="Your SIP extension number"
                    {...register('extension')}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    isLoading={isLoading}
                    leftIcon={!isLoading && <Save className="w-4 h-4" />}
                  >
                    {t('profile.saveChanges')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isLoading}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                  <div className="group">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5" />
                      {t('profile.email')}
                    </label>
                    <p className="mt-2 text-gray-900 font-medium">{user?.email}</p>
                  </div>
                  <div className="group">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      <User className="w-3.5 h-3.5" />
                      {t('profile.username')}
                    </label>
                    <p className="mt-2 text-gray-900 font-medium">@{user?.username}</p>
                  </div>
                  <div className="group">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {t('profile.firstName')}
                    </label>
                    <p className="mt-2 text-gray-900 font-medium">{user?.first_name || '—'}</p>
                  </div>
                  <div className="group">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {t('profile.lastName')}
                    </label>
                    <p className="mt-2 text-gray-900 font-medium">{user?.last_name || '—'}</p>
                  </div>
                  <div className="group">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5" />
                      Phone Number
                    </label>
                    <p className="mt-2 text-gray-900 font-medium">{user?.phone || '—'}</p>
                  </div>
                  <div className="group">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5" />
                      Extension
                    </label>
                    {(user as any)?.extension ? (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 text-violet-700 rounded-lg font-semibold text-sm">
                        <Phone className="w-3.5 h-3.5" />
                        Ext. {(user as any).extension}
                      </div>
                    ) : (
                      <p className="mt-2 text-gray-900 font-medium">—</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Account Details */}
          <Card className="shadow-lg border-slate-200">
            <div className="mb-8 pb-4 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                {t('profile.accountDetails')}
              </h3>
              <p className="text-sm text-slate-500 mt-1 ml-10">{t('profile.accountDetailsDesc')}</p>
            </div>

            <div className="space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <Check className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{t('profile.accountStatus')}</p>
                    <p className="text-xs text-slate-600">{t('profile.accountActive')}</p>
                  </div>
                </div>
                <span className="px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md">
                  {t('profile.active')}
                </span>
              </div>

              {/* Roles */}
              {user?.roles && user.roles.length > 0 && (
                <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-xl">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                      <Briefcase className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-bold text-slate-900">{t('profile.assignedRoles')}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {user.roles.map((role) => (
                      <div
                        key={role.id}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-shadow"
                      >
                        {role.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Permissions */}
              {user?.permissions && user.permissions.length > 0 && (
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-slate-600 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-bold text-slate-900">{t('profile.permissions')}</span>
                    <span className="ml-auto px-2 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded-md">
                      {user.permissions.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {user.permissions.slice(0, 12).map((permission) => (
                      <span
                        key={permission}
                        className="px-3 py-1.5 bg-white text-slate-700 text-xs font-medium rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                      >
                        {permission}
                      </span>
                    ))}
                    {user.permissions.length > 12 && (
                      <span className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg">
                        +{user.permissions.length - 12} {t('profile.more')}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
