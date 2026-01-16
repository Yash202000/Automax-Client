import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
} from 'lucide-react';
import { Button, Input, Card } from '../components/ui';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/auth';

const profileSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export const ProfilePage: React.FC = () => {
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
        setSuccess('Profile updated successfully');
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
      setError('File size must be less than 5MB');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setError('Only JPEG, PNG, GIF, and WebP images are allowed');
      return;
    }

    setAvatarLoading(true);
    setError('');

    try {
      const response = await authApi.uploadAvatar(file);
      if (response.success && response.data) {
        setUser(response.data);
        setSuccess('Avatar updated successfully');
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
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="mt-2 text-gray-500">Manage your personal information and account details</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 mt-0.5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <X className="w-3 h-3 text-red-600" />
            </div>
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 mt-0.5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Check className="w-3 h-3 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-emerald-800">{success}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card - Left Column */}
        <div className="lg:col-span-1">
          <Card className="overflow-hidden">
            {/* Gradient Header */}
            <div className="h-24 bg-gradient-to-br from-blue-500 to-blue-600" />

            {/* Avatar Section */}
            <div className="px-6 pb-6">
              <div className="relative -mt-12 mb-4">
                <div className="relative inline-block">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center border-4 border-white shadow-lg">
                      <span className="text-white text-3xl font-bold">
                        {user?.first_name?.[0] || user?.username?.[0] || 'U'}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={handleAvatarClick}
                    disabled={avatarLoading}
                    className="absolute -bottom-1 -right-1 p-2 bg-white rounded-xl shadow-lg text-gray-600 hover:text-blue-600 transition-colors disabled:opacity-50 border border-gray-100"
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
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900">
                  {user?.first_name} {user?.last_name}
                </h2>
                <p className="text-gray-500">@{user?.username}</p>
              </div>

              {/* Badges */}
              <div className="mt-4 flex justify-center gap-2 flex-wrap">
                {user?.is_super_admin && (
                  <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                    Super Admin
                  </span>
                )}
                {user?.roles?.map((role) => (
                  <span
                    key={role.id}
                    className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full"
                  >
                    {role.name}
                  </span>
                ))}
              </div>

              {/* Quick Info */}
              <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-gray-500" />
                  </div>
                  <span className="text-gray-600 truncate">{user?.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-gray-500" />
                  </div>
                  <span className="text-gray-600">
                    Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'}
                  </span>
                </div>
                {user?.department && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-gray-500" />
                    </div>
                    <span className="text-gray-600">{user.department.name}</span>
                  </div>
                )}
              </div>

              {/* Upload Hint */}
              <p className="mt-4 text-xs text-gray-400 text-center">
                Click the camera icon to change your photo
              </p>
            </div>
          </Card>
        </div>

        {/* Details Section - Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Personal Information</h3>
                <p className="text-sm text-gray-500">Update your personal details</p>
              </div>
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Edit3 className="w-4 h-4" />}
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </Button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <Input
                  label="Email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  hint="Email cannot be changed"
                  leftIcon={<Mail className="w-5 h-5" />}
                />

                <Input
                  label="Username"
                  placeholder="johndoe"
                  error={errors.username?.message}
                  leftIcon={<User className="w-5 h-5" />}
                  {...register('username')}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    placeholder="John"
                    error={errors.first_name?.message}
                    {...register('first_name')}
                  />
                  <Input
                    label="Last Name"
                    placeholder="Doe"
                    error={errors.last_name?.message}
                    {...register('last_name')}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    isLoading={isLoading}
                    leftIcon={!isLoading && <Save className="w-4 h-4" />}
                  >
                    Save Changes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="mt-1 text-gray-900">{user?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Username</label>
                    <p className="mt-1 text-gray-900">@{user?.username}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">First Name</label>
                    <p className="mt-1 text-gray-900">{user?.first_name || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Name</label>
                    <p className="mt-1 text-gray-900">{user?.last_name || '—'}</p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Account Details */}
          <Card>
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900">Account Details</h3>
              <p className="text-sm text-gray-500">Your account status and permissions</p>
            </div>

            <div className="space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <Check className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Account Status</p>
                    <p className="text-xs text-gray-500">Your account is active and verified</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                  Active
                </span>
              </div>

              {/* Roles */}
              {user?.roles && user.roles.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Assigned Roles</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {user.roles.map((role) => (
                      <div
                        key={role.id}
                        className="px-4 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-xl border border-blue-100"
                      >
                        {role.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Permissions */}
              {user?.permissions && user.permissions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Permissions</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {user.permissions.slice(0, 10).map((permission) => (
                      <span
                        key={permission}
                        className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg"
                      >
                        {permission}
                      </span>
                    ))}
                    {user.permissions.length > 10 && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-lg">
                        +{user.permissions.length - 10} more
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
