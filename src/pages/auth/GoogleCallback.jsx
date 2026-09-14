import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services';
import { RiLoader4Line } from 'react-icons/ri';

export default function GoogleCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { completeAuth } = useAuth();

  useEffect(() => {
    const error = params.get('error');
    if (error) {
      navigate('/login?error=google_failed');
      return;
    }

    // The backend has already set the httpOnly session cookies on this
    // redirect — there's no token in the URL to read. Just ask who we are.
    (async () => {
      try {
        const { data } = await authService.getMe();
        completeAuth(data);
        navigate('/dashboard');
      } catch {
        navigate('/login?error=google_failed');
      }
    })();
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 16,
      color: 'var(--text-muted)',
    }}>
      <RiLoader4Line style={{ fontSize: 36, animation: 'spin 0.8s linear infinite' }} />
      <p style={{ fontSize: 15 }}>Signing you in with Google...</p>
    </div>
  );
}
