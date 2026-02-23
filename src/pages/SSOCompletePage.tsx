import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/auth';

/**
 * SSOCompletePage — receives a redirected SSO session from the backend.
 *
 * The backend (GET /sso/callback) validates the RS256 SSO token, creates or
 * looks up the local user, generates a standard Automax JWT pair, then
 * redirects here with:
 *   /sso-complete?token=ACCESS_JWT&refresh=REFRESH_JWT
 *
 * This page stores those tokens in the auth store and fetches the user profile
 * before navigating to the dashboard.
 */
const SSOCompletePage = () => {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const refresh = params.get('refresh');

    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    // Store the tokens first so the API client can use them
    localStorage.setItem('token', token);
    if (refresh) {
      localStorage.setItem('refreshToken', refresh);
    }

    // Fetch the full user profile (the SSO callback only gives us basic claims)
    authApi
      .getProfile()
      .then((response) => {
        const user = response.data;
        if (!user) throw new Error('No user in profile response');
        setAuth(user, token, refresh ?? undefined);
        navigate('/dashboard', { replace: true });
      })
      .catch(() => {
        // Fall back to decoding the JWT payload if the profile fetch fails
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setAuth(
            {
              id: payload.user_id ?? payload.sub ?? '',
              email: payload.email ?? '',
              username: payload.email ?? '',
              first_name: '',
              last_name: '',
              phone: '',
              avatar: '',
              department_id: null,
              location_id: null,
              roles: [],
              permissions: [],
              is_active: true,
              is_super_admin: false,
              last_login_at: null,
              created_at: new Date().toISOString(),
            },
            token,
            refresh ?? undefined
          );
          navigate('/dashboard', { replace: true });
        } catch {
          navigate('/login', { replace: true });
        }
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Completing sign-in…</p>
      </div>
    </div>
  );
};

export default SSOCompletePage;
