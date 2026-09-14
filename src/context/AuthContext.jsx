import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { authService } from '../services';

const AuthContext = createContext(null);

const initialState = {
  user: null,
  company: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  subscriptionState: 'active', // active | grace | expired | suspended | trial
  graceDays: null,
};

// Normalise the user: OAuth accounts and users predating email verification
// are treated as verified; only new email/password sign-ups are `false`.
function normalizeUser(user) {
  if (!user) return user;
  const verified = user.emailVerified !== false; // undefined / null / true → verified
  return { ...user, emailVerified: verified };
}

function authReducer(state, action) {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, isLoading: true, error: null };
    case 'AUTH_SUCCESS':
      return { ...state, isLoading: false, isAuthenticated: true, user: normalizeUser(action.payload.user), company: action.payload.company, subscriptionState: action.payload.subscriptionState || 'active', graceDays: action.payload.graceDays || null, error: null };
    case 'AUTH_FAILURE':
      return { ...state, isLoading: false, isAuthenticated: false, user: null, company: null, error: action.payload };
    case 'LOGOUT':
      return { ...initialState, isLoading: false };
    case 'UPDATE_USER':
      return { ...state, user: normalizeUser({ ...state.user, ...action.payload }) };
    case 'UPDATE_COMPANY':
      return { ...state, company: { ...state.company, ...action.payload } };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check auth on mount. The session token lives in an httpOnly cookie that
  // JS can't read, so there's no local flag to check first — we just ask the
  // server, and it succeeds or fails based on whatever cookie the browser
  // sends automatically.
  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await authService.getMe();
        dispatch({ type: 'AUTH_SUCCESS', payload: { user: data.user, company: data.company, subscriptionState: data.subscriptionState, graceDays: data.graceDays } });
      } catch {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    init();
  }, []);

  const login = useCallback(async (email, password) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const { data } = await authService.login(email, password);
      // Password was correct but the account has 2FA — hand off to the 2FA page.
      if (data.requiresTwoFactor) {
        dispatch({ type: 'SET_LOADING', payload: false });
        return data;
      }
      try { sessionStorage.removeItem('evb_dismissed'); } catch { /* ignore */ }
      dispatch({ type: 'AUTH_SUCCESS', payload: { user: data.user, company: data.company, subscriptionState: data.subscriptionState, graceDays: data.graceDays } });
      return data;
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please try again.';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      throw err;
    }
  }, []);

  const register = useCallback(async (formData) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const { data } = await authService.register(formData);
      dispatch({ type: 'AUTH_SUCCESS', payload: { user: data.user, company: data.company, subscriptionState: data.subscriptionState, graceDays: data.graceDays } });
      return data;
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed.';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try { await authService.logout(); } catch {}
    dispatch({ type: 'LOGOUT' });
  }, []);

  const updateUser = useCallback((updates) => {
    dispatch({ type: 'UPDATE_USER', payload: updates });
  }, []);

  const updateCompany = useCallback((updates) => {
    dispatch({ type: 'UPDATE_COMPANY', payload: updates });
  }, []);

  // Finalise a session established elsewhere (2FA completion, Google OAuth
  // redirect) — the server has already set the httpOnly cookies, this just
  // updates local UI state to match.
  const completeAuth = useCallback((data) => {
    try { sessionStorage.removeItem('evb_dismissed'); } catch { /* ignore */ }
    dispatch({
      type: 'AUTH_SUCCESS',
      payload: {
        user: data.user,
        company: data.company,
        subscriptionState: data.subscriptionState,
        graceDays: data.graceDays,
      },
    });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateUser, updateCompany, completeAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
