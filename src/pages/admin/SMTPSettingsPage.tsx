import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail,
  Save,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  RefreshCw,
  Server,
  Lock,
  User,
  AtSign,
} from 'lucide-react';
import { smtpApi } from '../../api/admin';
import type { SMTPConfigCreateRequest, SMTPConfigUpdateRequest } from '../../types';
import { cn } from '@/lib/utils';
import { Button } from '../../components/ui';

interface FormData {
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  encryption: 'none' | 'tls' | 'ssl';
}

const initialFormData: FormData = {
  host: '',
  port: 587,
  username: '',
  password: '',
  from_email: '',
  from_name: '',
  encryption: 'tls',
};

const encryptionOptions = [
  { value: 'none', label: 'None', description: 'No encryption (not recommended)' },
  { value: 'tls', label: 'TLS/STARTTLS', description: 'Recommended for port 587' },
  { value: 'ssl', label: 'SSL', description: 'Recommended for port 465' },
];

const commonPorts = [
  { port: 25, label: 'SMTP (25)', encryption: 'none' },
  { port: 587, label: 'Submission (587)', encryption: 'tls' },
  { port: 465, label: 'SMTPS (465)', encryption: 'ssl' },
  { port: 2525, label: 'Alternative (2525)', encryption: 'tls' },
];

export const SMTPSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [testEmail, setTestEmail] = useState('');

  // Fetch existing SMTP config
  const { data: smtpData, isLoading } = useQuery({
    queryKey: ['admin', 'smtp'],
    queryFn: () => smtpApi.get(),
  });

  const smtpConfig = smtpData?.data;
  const hasExistingConfig = !!smtpConfig;

  // Initialize form with existing data
  useEffect(() => {
    if (smtpConfig) {
      setFormData({
        host: smtpConfig.host,
        port: smtpConfig.port,
        username: smtpConfig.username,
        password: '', // Password not returned from API
        from_email: smtpConfig.from_email,
        from_name: smtpConfig.from_name,
        encryption: smtpConfig.encryption,
      });
    }
  }, [smtpConfig]);

  // Create/Update mutations
  const createMutation = useMutation({
    mutationFn: (data: SMTPConfigCreateRequest) => smtpApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'smtp'] });
      setErrors({});
    },
    onError: (error: Error) => {
      setErrors({ submit: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: SMTPConfigUpdateRequest) => smtpApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'smtp'] });
      setErrors({});
    },
    onError: (error: Error) => {
      setErrors({ submit: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => smtpApi.delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'smtp'] });
      setFormData(initialFormData);
    },
  });

  const testMutation = useMutation({
    mutationFn: (toEmail: string) => smtpApi.test({ to_email: toEmail }),
    onSuccess: (response) => {
      if (response.data?.success) {
        setErrors({ testSuccess: 'Test email sent successfully!' });
      } else {
        setErrors({ test: response.data?.message || 'Test failed' });
      }
    },
    onError: (error: Error) => {
      setErrors({ test: error.message });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: () => smtpApi.verify(),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'smtp'] });
      if (response.data?.success) {
        setErrors({ verifySuccess: 'Connection verified successfully!' });
      } else {
        setErrors({ verify: response.data?.message || 'Verification failed' });
      }
    },
    onError: (error: Error) => {
      setErrors({ verify: error.message });
    },
  });

  const handleChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.host.trim()) {
      newErrors.host = 'SMTP host is required';
    }
    if (!formData.port || formData.port < 1 || formData.port > 65535) {
      newErrors.port = 'Valid port number is required (1-65535)';
    }
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }
    if (!hasExistingConfig && !formData.password.trim()) {
      newErrors.password = 'Password is required';
    }
    if (!formData.from_email.trim()) {
      newErrors.from_email = 'From email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.from_email)) {
      newErrors.from_email = 'Invalid email format';
    }
    if (!formData.from_name.trim()) {
      newErrors.from_name = 'From name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (hasExistingConfig) {
      // Update - only send password if changed
      const updateData: SMTPConfigUpdateRequest = {
        host: formData.host,
        port: formData.port,
        username: formData.username,
        from_email: formData.from_email,
        from_name: formData.from_name,
        encryption: formData.encryption,
      };
      if (formData.password) {
        updateData.password = formData.password;
      }
      updateMutation.mutate(updateData);
    } else {
      createMutation.mutate(formData as SMTPConfigCreateRequest);
    }
  };

  const handleTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail.trim()) {
      setErrors({ test: 'Please enter a test email address' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      setErrors({ test: 'Invalid email format' });
      return;
    }
    setErrors({});
    testMutation.mutate(testEmail);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">SMTP Settings</h1>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] mt-1 ml-12">
            Configure email server settings for sending notifications
          </p>
        </div>
        {hasExistingConfig && (
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
              smtpConfig?.is_verified
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            )}>
              {smtpConfig?.is_verified ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Verified
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  Not Verified
                </>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => verifyMutation.mutate()}
              isLoading={verifyMutation.isPending}
              leftIcon={!verifyMutation.isPending ? <RefreshCw className="w-4 h-4" /> : undefined}
            >
              Verify Connection
            </Button>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{errors.submit}</p>
        </div>
      )}
      {errors.verifySuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700">{errors.verifySuccess}</p>
        </div>
      )}
      {errors.verify && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{errors.verify}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit}>
            <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden">
              <div className="px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">Server Configuration</h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Enter your SMTP server details
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Server Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                      <Server className="w-4 h-4 inline mr-1" />
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      value={formData.host}
                      onChange={(e) => handleChange('host', e.target.value)}
                      placeholder="smtp.example.com"
                      className={cn(
                        "w-full px-4 py-2.5 bg-[hsl(var(--background))] border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]",
                        errors.host ? "border-red-500" : "border-[hsl(var(--border))]"
                      )}
                    />
                    {errors.host && <p className="mt-1 text-xs text-red-500">{errors.host}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                      Port
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={formData.port}
                        onChange={(e) => handleChange('port', parseInt(e.target.value) || 0)}
                        className={cn(
                          "flex-1 px-4 py-2.5 bg-[hsl(var(--background))] border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]",
                          errors.port ? "border-red-500" : "border-[hsl(var(--border))]"
                        )}
                      />
                      <select
                        value={formData.port}
                        onChange={(e) => {
                          const selected = commonPorts.find(p => p.port === parseInt(e.target.value));
                          if (selected) {
                            handleChange('port', selected.port);
                            handleChange('encryption', selected.encryption as 'none' | 'tls' | 'ssl');
                          }
                        }}
                        className="px-3 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)]"
                      >
                        {commonPorts.map(p => (
                          <option key={p.port} value={p.port}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                    {errors.port && <p className="mt-1 text-xs text-red-500">{errors.port}</p>}
                  </div>
                </div>

                {/* Encryption */}
                <div>
                  <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    <Lock className="w-4 h-4 inline mr-1" />
                    Encryption
                  </label>
                  <div className="flex gap-2">
                    {encryptionOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleChange('encryption', opt.value)}
                        className={cn(
                          "flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-all",
                          formData.encryption === opt.value
                            ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
                            : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary)/0.5)]"
                        )}
                      >
                        {opt.label}
                        <p className="text-xs font-normal mt-0.5 opacity-70">{opt.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Credentials */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                      <User className="w-4 h-4 inline mr-1" />
                      Username
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => handleChange('username', e.target.value)}
                      placeholder="your@email.com"
                      className={cn(
                        "w-full px-4 py-2.5 bg-[hsl(var(--background))] border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]",
                        errors.username ? "border-red-500" : "border-[hsl(var(--border))]"
                      )}
                    />
                    {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                      <Lock className="w-4 h-4 inline mr-1" />
                      Password {hasExistingConfig && <span className="text-xs text-[hsl(var(--muted-foreground))]">(leave empty to keep current)</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        placeholder={hasExistingConfig ? '••••••••' : 'Enter password'}
                        className={cn(
                          "w-full px-4 py-2.5 pr-10 bg-[hsl(var(--background))] border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]",
                          errors.password ? "border-red-500" : "border-[hsl(var(--border))]"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
                  </div>
                </div>

                {/* From Address */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                      <AtSign className="w-4 h-4 inline mr-1" />
                      From Email
                    </label>
                    <input
                      type="email"
                      value={formData.from_email}
                      onChange={(e) => handleChange('from_email', e.target.value)}
                      placeholder="noreply@example.com"
                      className={cn(
                        "w-full px-4 py-2.5 bg-[hsl(var(--background))] border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]",
                        errors.from_email ? "border-red-500" : "border-[hsl(var(--border))]"
                      )}
                    />
                    {errors.from_email && <p className="mt-1 text-xs text-red-500">{errors.from_email}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                      From Name
                    </label>
                    <input
                      type="text"
                      value={formData.from_name}
                      onChange={(e) => handleChange('from_name', e.target.value)}
                      placeholder="Automax Notifications"
                      className={cn(
                        "w-full px-4 py-2.5 bg-[hsl(var(--background))] border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]",
                        errors.from_name ? "border-red-500" : "border-[hsl(var(--border))]"
                      )}
                    />
                    {errors.from_name && <p className="mt-1 text-xs text-red-500">{errors.from_name}</p>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-[hsl(var(--border))]">
                  {hasExistingConfig && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete the SMTP configuration?')) {
                          deleteMutation.mutate();
                        }
                      }}
                      isLoading={deleteMutation.isPending}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Delete Configuration
                    </Button>
                  )}
                  <div className="ml-auto">
                    <Button
                      type="submit"
                      isLoading={isPending}
                      leftIcon={<Save className="w-4 h-4" />}
                    >
                      {hasExistingConfig ? 'Update Settings' : 'Save Settings'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Sidebar - Test Email */}
        <div className="space-y-6">
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] overflow-hidden">
            <div className="px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">Test Email</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Send a test email to verify configuration
              </p>
            </div>

            <div className="p-6">
              {!hasExistingConfig ? (
                <div className="text-center py-4">
                  <Mail className="w-10 h-10 text-[hsl(var(--muted-foreground))] mx-auto mb-2" />
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    Save SMTP settings first to test email delivery
                  </p>
                </div>
              ) : (
                <form onSubmit={handleTest} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                      Recipient Email
                    </label>
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="test@example.com"
                      className="w-full px-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))]"
                    />
                  </div>

                  {errors.test && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <p className="text-xs text-red-700">{errors.test}</p>
                    </div>
                  )}

                  {errors.testSuccess && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <p className="text-xs text-green-700">{errors.testSuccess}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full"
                    isLoading={testMutation.isPending}
                    leftIcon={!testMutation.isPending ? <Send className="w-4 h-4" /> : undefined}
                  >
                    Send Test Email
                  </Button>
                </form>
              )}
            </div>
          </div>

          {/* Help Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Common SMTP Providers</h4>
            <div className="space-y-2 text-xs text-blue-700">
              <div>
                <strong>Gmail:</strong> smtp.gmail.com:587 (TLS)
              </div>
              <div>
                <strong>Outlook:</strong> smtp.office365.com:587 (TLS)
              </div>
              <div>
                <strong>SendGrid:</strong> smtp.sendgrid.net:587 (TLS)
              </div>
              <div>
                <strong>Mailgun:</strong> smtp.mailgun.org:587 (TLS)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
