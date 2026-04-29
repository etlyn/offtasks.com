import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/providers/auth";
import { DashboardScreen } from "@/screens/Dashboard";
import { ForgotPasswordScreen } from "@/screens/ForgotPassword";
import { LandingScreen } from "@/screens/Landing";
import { PrivacyScreen, SupportScreen, TermsScreen } from "@/screens/Legal";
import { LoginScreen } from "@/screens/Login";
import { SignupScreen } from "@/screens/Signup";
import { ResetPasswordScreen } from "@/screens/ResetPassword";

const LoadingView = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#f3fbf8] px-6 text-[#123532]">
    <div className="rounded-full border border-[#d9ece6] bg-white/85 px-5 py-3 shadow-[0_24px_60px_-32px_rgba(9,48,43,0.28)] backdrop-blur-xl">
      <p className="font-['Sora',_sans-serif] text-sm font-semibold tracking-[0.18em] text-[#134E4A] uppercase">
        Loading Offtasks
      </p>
    </div>
  </div>
);

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingView />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const GuestRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingView />;
  }

  if (user) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
};

const LoadingAwareRoute = ({ children }: { children: ReactNode }) => {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingView />;
  }

  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<LandingScreen />} />
    <Route path="/privacy" element={<PrivacyScreen />} />
    <Route path="/privacy-policy" element={<PrivacyScreen />} />
    <Route path="/support" element={<SupportScreen />} />
    <Route path="/contact" element={<SupportScreen />} />
    <Route path="/terms" element={<TermsScreen />} />
    <Route
      path="/app"
      element={
        <ProtectedRoute>
          <DashboardScreen />
        </ProtectedRoute>
      }
    />
    <Route
      path="/login"
      element={
        <GuestRoute>
          <LoginScreen />
        </GuestRoute>
      }
    />
    <Route
      path="/signup"
      element={
        <GuestRoute>
          <SignupScreen />
        </GuestRoute>
      }
    />
    <Route
      path="/forgot-password"
      element={
        <GuestRoute>
          <ForgotPasswordScreen />
        </GuestRoute>
      }
    />
    <Route
      path="/reset-password"
      element={
        <LoadingAwareRoute>
          <ResetPasswordScreen />
        </LoadingAwareRoute>
      }
    />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
