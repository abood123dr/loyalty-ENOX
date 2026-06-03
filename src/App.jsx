import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { StoreProvider } from '@/lib/StoreContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import AppErrorBoundary from '@/components/AppErrorBoundary';
import SuperAdminRoute from '@/components/SuperAdminRoute';

const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Customers = lazy(() => import('@/pages/Customers'));
const WalletPasses = lazy(() => import('@/pages/WalletPasses'));
const QrScanner = lazy(() => import('@/pages/QrScanner'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const Settings = lazy(() => import('@/pages/Settings'));
const SuperAdmin = lazy(() => import('@/pages/SuperAdmin'));
const StoreRegister = lazy(() => import('@/pages/StoreRegister'));
const CustomerDigitalCard = lazy(() => import('@/pages/CustomerDigitalCard'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const Campaigns = lazy(() => import('@/pages/Campaigns'));
const Branches = lazy(() => import('@/pages/Branches'));
const Staff = lazy(() => import('@/pages/Staff'));
const AIAssistant = lazy(() => import('@/pages/AIAssistant'));

const RouteLoader = () => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();
  const location = useLocation();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      return <Navigate to="/login" replace />;
    }
  }

  return (
    <StoreProvider>
      <AppErrorBoundary resetKey={location.pathname}>
        <Suspense fallback={<RouteLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/store/:slug" element={<StoreRegister />} />
          <Route path="/card/:storeSlug/:customerId" element={<CustomerDigitalCard />} />
          <Route path="/card/:customerId" element={<CustomerDigitalCard />} />

          {/* Protected Dashboard Routes */}
          <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/branches" element={<Branches />} />
              <Route path="/staff" element={<Staff />} />
              <Route path="/wallet-passes" element={<WalletPasses />} />
              <Route path="/qr-scanner" element={<QrScanner />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/ai-assistant" element={<AIAssistant />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/super-admin" element={<SuperAdminRoute><SuperAdmin /></SuperAdminRoute>} />
              <Route path="/stores" element={<Navigate to="/super-admin" replace />} />
            </Route>
          </Route>

          <Route path="*" element={<PageNotFound />} />
        </Routes>
        </Suspense>
      </AppErrorBoundary>
    </StoreProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App

