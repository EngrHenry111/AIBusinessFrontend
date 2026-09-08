import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AppLayout from './components/layout/AppLayout';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/globals.css';

// Auth pages (not lazy — needed immediately)
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import GoogleCallback from './pages/auth/GoogleCallback';
import VerifyEmail from './pages/auth/VerifyEmail';
import TwoFactorLogin from './pages/auth/TwoFactorLogin';
import Landing from './pages/landing/Landing';
import Privacy from './pages/legal/Privacy';
import Terms from './pages/legal/Terms';
import PortalLogin from './pages/portal/PortalLogin';
import Portal from './pages/portal/Portal';
import NotFound from './pages/notfound/NotFound';

// Lazy-load all app pages
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const Chat = lazy(() => import('./pages/chat/Chat'));
const Knowledge = lazy(() => import('./pages/knowledge/Knowledge'));
const Leads = lazy(() => import('./pages/leads/Leads'));
const LeadDetail = lazy(() => import('./pages/leads/LeadDetail'));
const Meetings = lazy(() => import('./pages/meetings/Meetings'));
const Invoices = lazy(() => import('./pages/invoices/Invoices'));
const Orders = lazy(() => import('./pages/orders/Orders'));
const Appointments = lazy(() => import('./pages/appointments/Appointments'));
const Social = lazy(() => import('./pages/social/Social'));
const Analytics = lazy(() => import('./pages/analytics/Analytics'));
const Team = lazy(() => import('./pages/team/Team'));
const Settings = lazy(() => import('./pages/settings/Settings'));
const AuditLog = lazy(() => import('./pages/settings/AuditLog'));
const Reports = lazy(() => import('./pages/reports/Reports'));
const Agents = lazy(() => import('./pages/agents/Agents'));
const WhatsApp = lazy(() => import('./pages/whatsapp/WhatsApp'));
const Billing = lazy(() => import('./pages/billing/Billing'));
const Messages = lazy(() => import('./pages/messages/Messages'));
const Admin = lazy(() => import('./pages/admin/Admin'));
const Search = lazy(() => import('./pages/search/Search'));
const Onboarding = lazy(() => import('./pages/onboarding/Onboarding'));

const PageLoader = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '60vh', color: 'var(--text-muted)', flexDirection: 'column', gap: 16,
  }}>
    <div style={{
      width: 32, height: 32,
      border: '3px solid var(--border)',
      borderTopColor: 'var(--color-brand)',
      borderRadius: '50%',
      animation: 'spin 0.6s linear infinite',
    }} />
    <span style={{ fontSize: 14 }}>Loading...</span>
  </div>
);

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

// Root "/" — public marketing page when logged out, dashboard when logged in
function RootRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />;
}

// Fade the page in on every route change (keyed by pathname)
function PageFade({ children }) {
  const location = useLocation();
  return <div key={location.pathname} className="page-fade">{children}</div>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/reset-password/:token" element={<PublicRoute><ResetPassword /></PublicRoute>} />
      <Route path="/auth/google/callback" element={<GoogleCallback />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/2fa-login" element={<TwoFactorLogin />} />

      {/* Public legal pages — no auth */}
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />

      {/* Customer portal — magic-link auth, no user account */}
      <Route path="/portal/login" element={<PortalLogin />} />
      <Route path="/portal" element={<Portal />} />

      {/* Protected app routes */}
      <Route path="/*" element={
        <ProtectedRoute>
          <AppLayout>
            <Suspense fallback={<PageLoader />}>
              <PageFade>
              <Routes>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="chat" element={<Chat />} />
                <Route path="chat/:chatId" element={<Chat />} />
                <Route path="knowledge" element={<Knowledge />} />
                <Route path="agents" element={<Agents />} />
                <Route path="leads" element={<Leads />} />
                <Route path="leads/:id" element={<LeadDetail />} />
                <Route path="meetings" element={<Meetings />} />
                <Route path="invoices" element={<Invoices />} />
                <Route path="orders" element={<Orders />} />
                <Route path="appointments" element={<Appointments />} />
                <Route path="social" element={<Social />} />
                <Route path="reports" element={<Reports />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="team" element={<Team />} />
                <Route path="settings/audit-log" element={<AuditLog />} />
                <Route path="settings/*" element={<Settings />} />
                <Route path="" element={<Navigate to="dashboard" replace />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
                <Route path="whatsapp" element={<WhatsApp />} />
                <Route path="billing" element={<Billing />} />
                <Route path="messages" element={<Messages />} />
                <Route path="admin" element={<Admin />} />
                <Route path="search" element={<Search />} />
                <Route path="onboarding" element={<Onboarding />} />
                <Route path="*" element={<NotFound />} />

              </Routes>
              </PageFade>
            </Suspense>
          </AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/" element={<RootRoute />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
