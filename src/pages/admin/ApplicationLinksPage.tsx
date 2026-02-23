import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationLinkApi } from '../../api/applicationLinks';
import type { ApplicationLink, ApplicationLinkCreateRequest, ApplicationLinkUpdateRequest } from '../../types';
import { Plus, ExternalLink, Edit2, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

const AVAILABLE_ICONS = [
  'ExternalLink', 'Link', 'Globe', 'Mail', 'Phone', 'Calendar', 'FileText',
  'Settings', 'Users', 'Briefcase', 'Database', 'Server', 'Cloud', 'Code',
  'BookOpen', 'MessageSquare', 'Video', 'Headphones', 'ShoppingCart'
];

const AVAILABLE_COLORS = [
  { name: 'Blue', value: 'blue', gradient: 'from-blue-500 to-blue-600' },
  { name: 'Violet', value: 'violet', gradient: 'from-violet-500 to-purple-600' },
  { name: 'Emerald', value: 'emerald', gradient: 'from-emerald-500 to-teal-600' },
  { name: 'Amber', value: 'amber', gradient: 'from-amber-500 to-orange-600' },
  { name: 'Rose', value: 'rose', gradient: 'from-rose-500 to-pink-600' },
  { name: 'Orange', value: 'orange', gradient: 'from-orange-500 to-red-600' },
];

const ApplicationLinksPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ApplicationLinkCreateRequest>({
    name: '',
    description: '',
    url: '',
    icon: 'ExternalLink',
    color: 'blue',
    sort_order: 0,
    is_active: true,
    sso_enabled: false,
    sso_callback_url: '',
  });

  // Fetch application links
  const { data: linksResponse, isLoading } = useQuery({
    queryKey: ['admin', 'application-links'],
    queryFn: () => applicationLinkApi.list(),
  });

  const links = linksResponse?.data || [];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: ApplicationLinkCreateRequest) => applicationLinkApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'application-links'] });
      queryClient.invalidateQueries({ queryKey: ['application-links'] });
      toast.success('Application link created successfully');
      resetForm();
      setIsCreating(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create application link');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApplicationLinkUpdateRequest }) =>
      applicationLinkApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'application-links'] });
      queryClient.invalidateQueries({ queryKey: ['application-links'] });
      toast.success('Application link updated successfully');
      resetForm();
      setEditingId(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update application link');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => applicationLinkApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'application-links'] });
      queryClient.invalidateQueries({ queryKey: ['application-links'] });
      toast.success('Application link deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete application link');
    },
  });

  // Image upload mutation
  const uploadImageMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => applicationLinkApi.uploadImage(id, file),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'application-links'] });
      queryClient.invalidateQueries({ queryKey: ['application-links'] });
      toast.success('Logo uploaded successfully');
      // Update form data with the new image URL
      if (response?.data?.link) {
        setFormData((prev) => ({ ...prev, image_url: response.data?.link.image_url || '' }));
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to upload logo');
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG, GIF, WebP, and SVG images are allowed');
      return;
    }

    if (editingId) {
      uploadImageMutation.mutate({ id: editingId, file });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      url: '',
      icon: 'ExternalLink',
      image_url: '',
      color: 'blue',
      sort_order: 0,
      is_active: true,
      sso_enabled: false,
      sso_callback_url: '',
    });
  };

  const handleEdit = (link: ApplicationLink) => {
    setEditingId(link.id);
    setFormData({
      name: link.name,
      description: link.description,
      url: link.url,
      icon: link.icon,
      image_url: link.image_url || '',
      color: link.color,
      sort_order: link.sort_order,
      is_active: link.is_active,
      sso_enabled: link.sso_enabled,
      sso_callback_url: link.sso_callback_url || '',
    });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[hsl(var(--muted-foreground))]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Application Links</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Manage external application shortcuts displayed on the dashboard
          </p>
        </div>
        {!isCreating && !editingId && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Add Application Link
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingId) && (
        <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-6">
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">
            {editingId ? 'Edit Application Link' : 'Create Application Link'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                  placeholder="e.g., Email System"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                  URL *
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                placeholder="Optional description"
              />
            </div>

            {editingId && (
              <div className="bg-[hsl(var(--muted))] p-4 rounded-lg">
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                  Logo Image (Optional)
                </label>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
                  Upload a custom logo image. Max 5MB. Supports JPG, PNG, GIF, WebP, SVG.
                </p>
                {formData.image_url && (
                  <div className="mb-3 flex items-center gap-3">
                    <img
                      src={formData.image_url}
                      alt="Logo preview"
                      className="w-16 h-16 object-contain bg-white rounded border border-[hsl(var(--border))]"
                    />
                    <span className="text-sm text-[hsl(var(--muted-foreground))]">Current logo</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                  onChange={handleImageUpload}
                  className="block w-full text-sm text-[hsl(var(--foreground))]
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-medium
                    file:bg-[hsl(var(--primary))] file:text-white
                    hover:file:opacity-90 file:cursor-pointer"
                />
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                  Icon
                </label>
                <select
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                >
                  {AVAILABLE_ICONS.map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                  Color
                </label>
                <select
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                >
                  {AVAILABLE_COLORS.map((color) => (
                    <option key={color.value} value={color.value}>
                      {color.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
              <label htmlFor="is_active" className="text-sm text-[hsl(var(--foreground))]">
                Active (visible on dashboard)
              </label>
            </div>

            {/* SSO Settings */}
            <div className="border border-[hsl(var(--border))] rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sso_enabled"
                  checked={formData.sso_enabled}
                  onChange={(e) => setFormData({ ...formData, sso_enabled: e.target.checked })}
                  className="w-4 h-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--ring))]"
                />
                <label htmlFor="sso_enabled" className="text-sm font-medium text-[hsl(var(--foreground))]">
                  Enable SSO (Single Sign-On)
                </label>
              </div>
              {formData.sso_enabled && (
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1">
                    SSO Callback URL
                  </label>
                  <input
                    type="url"
                    value={formData.sso_callback_url}
                    onChange={(e) => setFormData({ ...formData, sso_callback_url: e.target.value })}
                    className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                    placeholder="https://target.app/sso/callback"
                  />
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                    The URL on the target application that receives the SSO JWT token.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {editingId ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] rounded-lg hover:opacity-90 transition-opacity"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Links List */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  URL
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  Icon / Color
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {links.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[hsl(var(--muted-foreground))]">
                    No application links yet. Click "Add Application Link" to create one.
                  </td>
                </tr>
              ) : (
                links.map((link) => (
                  <tr key={link.id} className="hover:bg-[hsl(var(--muted)/0.3)] transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-[hsl(var(--foreground))]">{link.name}</div>
                        {link.description && (
                          <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                            {link.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                      >
                        {link.url}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[hsl(var(--muted-foreground))]">{link.icon}</span>
                        <span className="text-xs px-2 py-1 rounded-md bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]">
                          {link.color}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[hsl(var(--foreground))]">{link.sort_order}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          link.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {link.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(link)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(link.id, link.name)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ApplicationLinksPage;
