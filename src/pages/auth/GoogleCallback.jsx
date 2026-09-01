import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RiLoader4Line } from 'react-icons/ri';

export default function GoogleCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  useEffect(() => {
    const token = params.get('token');
    const refresh = params.get('refresh');
    const error = params.get('error');

    if (error || !token) {
      navigate('/login?error=google_failed');
      return;
    }

    localStorage.setItem('accessToken', token);
    if (refresh) localStorage.setItem('refreshToken', refresh);

    // Let AuthContext pick up the token on next render
    navigate('/dashboard');
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
