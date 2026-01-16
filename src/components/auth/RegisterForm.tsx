import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, ArrowRight } from 'lucide-react';
import { Button, Input, Checkbox } from '../ui';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../stores/authStore';

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  terms: z.boolean().refine((val) => val === true, 'You must accept the terms and conditions'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterForm: React.FC = () => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      terms: false,
    },
  });

  const password = watch('password', '');

  const getPasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);

  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-emerald-500'];

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError('');

    try {
      const { confirmPassword: _, terms: __, ...registerData } = data;
      const response = await authApi.register(registerData);
      if (response.success && response.data) {
        setAuth(response.data.user, response.data.token);
        navigate('/dashboard');
      } else {
        setError(response.error || 'Registration failed. Please try again.');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during registration';
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

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create an account</h1>
        <p className="mt-2 text-gray-600">
          Join Automax today and start managing your workflow
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 mt-0.5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <span className="text-red-600 text-xs font-bold">!</span>
            </div>
            <div>
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First name"
            placeholder="John"
            error={errors.first_name?.message}
            {...register('first_name')}
          />
          <Input
            label="Last name"
            placeholder="Doe"
            error={errors.last_name?.message}
            {...register('last_name')}
          />
        </div>

        <Input
          label="Username"
          placeholder="johndoe"
          error={errors.username?.message}
          leftIcon={<User className="w-5 h-5" />}
          {...register('username')}
        />

        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          leftIcon={<Mail className="w-5 h-5" />}
          {...register('email')}
        />

        <div>
          <Input
            label="Password"
            type="password"
            placeholder="Create a strong password"
            error={errors.password?.message}
            leftIcon={<Lock className="w-5 h-5" />}
            {...register('password')}
          />
          {/* Password Strength Indicator */}
          {password && (
            <div className="mt-3">
              <div className="flex gap-1 mb-2">
                {[0, 1, 2, 3, 4].map((index) => (
                  <div
                    key={index}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      index < passwordStrength
                        ? strengthColors[passwordStrength - 1]
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500">
                Password strength:{' '}
                <span className={`font-medium ${passwordStrength >= 4 ? 'text-emerald-600' : passwordStrength >= 3 ? 'text-lime-600' : passwordStrength >= 2 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {strengthLabels[passwordStrength - 1] || 'Too weak'}
                </span>
              </p>
            </div>
          )}
        </div>

        <Input
          label="Confirm password"
          type="password"
          placeholder="Confirm your password"
          error={errors.confirmPassword?.message}
          leftIcon={<Lock className="w-5 h-5" />}
          {...register('confirmPassword')}
        />

        <div>
          <Checkbox
            label="I agree to the terms"
            description={
              <span>
                By creating an account, you agree to our{' '}
                <Link to="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
              </span>
            }
            {...register('terms')}
          />
          {errors.terms && (
            <p className="mt-1 text-sm text-red-600">{errors.terms.message}</p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          fullWidth
          isLoading={isLoading}
          rightIcon={!isLoading && <ArrowRight className="w-5 h-5" />}
        >
          Create account
        </Button>
      </form>

      {/* Sign In Link */}
      <p className="mt-8 text-center text-gray-600">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
};
