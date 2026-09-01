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

function authReducer(state, action) {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, isLoading: true, error: null };
    case 'AUTH_SUCCESS':
      return { ...state, isLoading: false, isAuthenticated: true, user: action.payload.user, company: action.payload.company, subscriptionState: action.payload.subscriptionState || 'active', graceDays: action.payload.graceDays || null, error: null };
    case 'AUTH_FAILURE':
      return { ...state, isLoading: false, isAuthenticated: false, user: null, company: null, error: action.payload };
    case 'LOGOUT':
      return { ...initialState, isLoading: false };
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload } };
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

  // Check auth on mount
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }
      try {
        const { data } = await authService.getMe();
        dispatch({ type: 'AUTH_SUCCESS', payload: { user: data.user, company: data.company, subscriptionState: data.subscriptionState, graceDays: data.graceDays } });
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    init();
  }, []);

  const login = useCallback(async (email, password) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const { data } = await authService.login(email, password);
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
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
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
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
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    dispatch({ type: 'LOGOUT' });
  }, []);

  const updateUser = useCallback((updates) => {
    dispatch({ type: 'UPDATE_USER', payload: updates });
  }, []);

  const updateCompany = useCallback((updates) => {
    dispatch({ type: 'UPDATE_COMPANY', payload: updates });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateUser, updateCompany }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
