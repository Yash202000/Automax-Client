import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { settingsApi } from '../../api/settings';
import {
  Save,
  Settings as SettingsIcon,
  Palette,
  Image,
  FileText,
  Globe,
  Mail,
  Phone,
  Upload,
} from 'lucide-react';

export const SettingsManagementPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    app_name: '',
    app_tagline: '',
    app_description: '',
    logo_url: '',
    logo_small_url: '',
    favicon_url: '',
    logo_alt_text: '',
    primary_color: '',
    secondary_color: '',
    accent_color: '',
    copyright_text: '',
    contact_email: '',
    contact_phone: '',
    feature1_title: '',
    feature1_description: '',
    feature2_title: '',
    feature2_description: '',
    feature3_title: '',
    feature3_description: '',
    date_format: '',
    time_format: '',
    default_language: '',
  });

  // Fetch settings
  const { data: settingsResponse, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
  });

  // Update form data when settings are loaded
  React.useEffect(() => {
    if (settingsResponse?.data) {
      const data = settingsResponse.data;
      setFormData({
        app_name: data.app_name || '',
        app_tagline: data.app_tagline || '',
        app_description: data.app_description || '',
        logo_url: data.logo_url || '',
        logo_small_url: data.logo_small_url || '',
        favicon_url: data.favicon_url || '',
        logo_alt_text: data.logo_alt_text || '',
        primary_color: data.primary_color || '',
        secondary_color: data.secondary_color || '',
        accent_color: data.accent_color || '',
        copyright_text: data.copyright_text || '',
        contact_email: data.contact_email || '',
        contact_phone: data.contact_phone || '',
        feature1_title: data.feature1_title || '',
        feature1_description: data.feature1_description || '',
        feature2_title: data.feature2_title || '',
        feature2_description: data.feature2_description || '',
        feature3_title: data.feature3_title || '',
        feature3_description: data.feature3_description || '',
        date_format: data.date_format || '',
        time_format: data.time_format || '',
        default_language: data.default_language || '',
      });
    }
  }, [settingsResponse]);

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => {
      toast.success('Settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update settings');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[hsl(var(--muted-foreground))]">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
            <SettingsIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]">System Settings</h1>
            <p className="text-[hsl(var(--muted-foreground))]">
              Configure application branding, logos, and system preferences
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Application Branding Section */}
        <div className="bg-[hsl(var(--card))] rounded-xl p-6 shadow-sm border border-[hsl(var(--border))]">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-5 h-5 text-violet-600" />
            <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">Application Branding</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                Application Name *
              </label>
              <input
                type="text"
                name="app_name"
                value={formData.app_name}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="e.g., Automax"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                Tagline
              </label>
              <input
                type="text"
                name="app_tagline"
                value={formData.app_tagline}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="e.g., Streamline your workflow automation"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                Description
              </label>
              <textarea
                name="app_description"
                value={formData.app_description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="Short description of your application"
              />
            </div>
          </div>
        </div>

        {/* Logo Configuration Section */}
        <div className="bg-[hsl(var(--card))] rounded-xl p-6 shadow-sm border border-[hsl(var(--border))]">
          <div className="flex items-center gap-3 mb-6">
            <Image className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">Logo Configuration</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                Main Logo URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="logo_url"
                  value={formData.logo_url}
                  onChange={handleChange}
                  className="flex-1 px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="/logo.png or https://cdn.example.com/logo.png"
                />
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload
                </button>
              </div>
              {formData.logo_url && (
                <div className="mt-2">
                  <img src={formData.logo_url} alt="Logo preview" className="h-16 object-contain" />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                Small Logo URL (Optional)
              </label>
              <input
                type="text"
                name="logo_small_url"
                value={formData.logo_small_url}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Compact logo for mobile/small screens"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                Favicon URL
              </label>
              <input
                type="text"
                name="favicon_url"
                value={formData.favicon_url}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="/favicon.ico"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                Logo Alt Text
              </label>
              <input
                type="text"
                name="logo_alt_text"
                value={formData.logo_alt_text}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="For accessibility (e.g., Company Logo)"
              />
            </div>
          </div>
        </div>

        {/* Theme Colors Section */}
        <div className="bg-[hsl(var(--card))] rounded-xl p-6 shadow-sm border border-[hsl(var(--border))]">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">Theme Colors</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                Primary Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  name="primary_color"
                  value={formData.primary_color}
                  onChange={handleChange}
                  className="w-16 h-10 rounded border border-[hsl(var(--border))] cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="flex-1 px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="#2563eb"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                Secondary Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  name="secondary_color"
                  value={formData.secondary_color}
                  onChange={handleChange}
                  className="w-16 h-10 rounded border border-[hsl(var(--border))] cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.secondary_color}
                  onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                  className="flex-1 px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="#7c3aed"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                Accent Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  name="accent_color"
                  value={formData.accent_color}
                  onChange={handleChange}
                  className="w-16 h-10 rounded border border-[hsl(var(--border))] cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.accent_color}
                  onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                  className="flex-1 px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="#059669"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information Section */}
        <div className="bg-[hsl(var(--card))] rounded-xl p-6 shadow-sm border border-[hsl(var(--border))]">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="w-5 h-5 text-amber-600" />
            <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">Contact Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Contact Email
              </label>
              <input
                type="email"
                name="contact_email"
                value={formData.contact_email}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="contact@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Contact Phone
              </label>
              <input
                type="tel"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                Copyright Text
              </label>
              <input
                type="text"
                name="copyright_text"
                value={formData.copyright_text}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="© 2024 Company Name. All rights reserved."
              />
            </div>
          </div>
        </div>

        {/* Feature Descriptions Section */}
        <div className="bg-[hsl(var(--card))] rounded-xl p-6 shadow-sm border border-[hsl(var(--border))]">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-5 h-5 text-rose-600" />
            <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">
              Feature Highlights (Login Page)
            </h2>
          </div>

          <div className="space-y-6">
            {[1, 2, 3].map((num) => (
              <div key={num} className="p-4 bg-[hsl(var(--muted))] rounded-lg">
                <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-3">Feature {num}</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      name={`feature${num}_title`}
                      value={formData[`feature${num}_title` as keyof typeof formData]}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] text-sm"
                      placeholder="Feature title"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
                      Description
                    </label>
                    <textarea
                      name={`feature${num}_description`}
                      value={formData[`feature${num}_description` as keyof typeof formData]}
                      onChange={handleChange}
                      rows={2}
                      className="w-full px-3 py-2 rounded border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] text-sm"
                      placeholder="Feature description"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Configuration Section */}
        <div className="bg-[hsl(var(--card))] rounded-xl p-6 shadow-sm border border-[hsl(var(--border))]">
          <div className="flex items-center gap-3 mb-6">
            <SettingsIcon className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">System Configuration</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                Date Format
              </label>
              <input
                type="text"
                name="date_format"
                value={formData.date_format}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="YYYY-MM-DD"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                Time Format
              </label>
              <input
                type="text"
                name="time_format"
                value={formData.time_format}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="HH:mm:ss"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                Default Language
              </label>
              <select
                name="default_language"
                value={formData.default_language}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="en">English</option>
                <option value="ar">Arabic</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-lg shadow-violet-500/30"
          >
            <Save className="w-5 h-5" />
            {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};
