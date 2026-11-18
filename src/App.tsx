import { lazy, Suspense, type ReactNode } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { WordmarkLoader } from "@/components/LogoWordmark";
import { authReturnRoute, safePlannerReturn } from "@/lib/goalWorkbench";
import { isManagedSignInCallback } from "@/lib/googleAuth";
import { supabaseConfigured } from "@/lib/supabase";
import { AuthProvider, useAuth } from "@/providers/auth";
import { LandingScreen } from "@/screens/Landing";

// The landing page loads at once; everything behind it arrives when it is first opened.
const DashboardScreen = lazy(() => import("@/screens/Dashboard").then((module) => ({ default: module.DashboardScreen })));
const ForgotPasswordScreen = lazy(() => import("@/screens/ForgotPassword").then((module) => ({ default: module.ForgotPasswordScreen })));
const PrivacyScreen = lazy(() => import("@/screens/Legal").then((module) => ({ default: module.PrivacyScreen })));
const SupportScreen = lazy(() => import("@/screens/Legal").then((module) => ({ default: module.SupportScreen })));
const TermsScreen = lazy(() => import("@/screens/Legal").then((module) => ({ default: module.TermsScreen })));
const LoginScreen = lazy(() => import("@/screens/Login").then((module) => ({ default: module.LoginScreen })));
const SignupScreen = lazy(() => import("@/screens/Signup").then((module) => ({ default: module.SignupScreen })));
const ResetPasswordScreen = lazy(() => import("@/screens/ResetPassword").then((module) => ({ default: module.ResetPasswordScreen })));
const OAuthConsentScreen = lazy(() => import("@/screens/OAuthConsent").then((module) => ({ default: module.OAuthConsentScreen })));
const SignInCallbackScreen = lazy(() => import("@/screens/SignInCallback").then((module) => ({ default: module.SignInCallbackScreen })));

const LoadingView = () => (
  <div className="ot-loading-page">
    <div className="ot-backdrop" aria-hidden="true" />
    <WordmarkLoader />
  </div>
);

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingView />;
  }

  if (!user) {
    return (
      <Navigate
        to={authReturnRoute("/login", location.pathname + location.search)}
        replace
      />
    );
  }

  return <>{children}</>;
};

const GuestRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingView />;
  }

  if (user) {
    return (
      <Navigate
        to={safePlannerReturn(new URLSearchParams(location.search).get("next"))}
        replace
      />
    );
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

const AppRoutes = () => {
  const location = useLocation();
  return (
    <Suspense fallback={<LoadingView />}>
    <Routes>
      <Route path="/" element={<LandingScreen />} />
      <Route path="/privacy" element={<PrivacyScreen />} />
      <Route path="/privacy-policy" element={<PrivacyScreen />} />
      <Route path="/support" element={<SupportScreen />} />
      <Route path="/contact" element={<SupportScreen />} />
      <Route path="/terms" element={<TermsScreen />} />
      <Route path="/oauth/consent" element={<OAuthConsentScreen />} />
      <Route
        path="/app"
        element={
          isManagedSignInCallback(location) ? (
            <SignInCallbackScreen />
          ) : (
            <ProtectedRoute>
              <DashboardScreen />
            </ProtectedRoute>
          )
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
    </Suspense>
  );
};

/** Shown instead of the site when a build has no backend address, for example a preview without its settings. */
const SetupNotice = () => (
  <div className="ot-loading-page">
    <div className="ot-backdrop" aria-hidden="true" />
    <div className="ot-setup" role="alert">
      <span className="ot-wordmark ot-wordmark--large">
        offtasks<i>.</i>
      </span>
      <h1>This address isn’t set up yet</h1>
      <p>
        This build is missing its Offtasks backend settings, so it can’t sign anyone in. The site at{" "}
        <a className="ot-link" href="https://www.offtasks.com">
          offtasks.com
        </a>{" "}
        is not affected.
      </p>
    </div>
  </div>
);

export default function App() {
  if (!supabaseConfigured) return <SetupNotice />;
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
