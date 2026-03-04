import { Toaster } from "@/core/components/ui/sonner";
import { TooltipProvider } from "@/core/components/ui/tooltip";
import { lazy, Suspense, useEffect, useState, useCallback } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./core/contexts/ThemeContext";
import { ActiveAccountProvider } from "./core/contexts/ActiveAccountContext";
import { WorkspaceProvider } from "./core/contexts/WorkspaceContext";

// ─── Redirect helper ──────────────────────────────────────────────────────────
function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation(to); }, [to, setLocation]);
  return null;
}

// ─── Eager-loaded (critical path) ────────────────────────────────────────────
import Home from "./features/dashboard/Home";
import NotFound from "./features/shared/NotFound";
import SplashScreen from "./components/SplashScreen";

// ─── Lazy-loaded pages (code-split for performance) ───────────────────────────
const Campaigns         = lazy(() => import("./features/campaigns/Campaigns"));
const Analytics         = lazy(() => import("./features/analytics/Analytics"));
const Settings          = lazy(() => import("./features/settings/Settings"));
const Connections       = lazy(() => import("./features/connections/Connections"));
const Alerts            = lazy(() => import("./features/alerts/Alerts"));
const Reports           = lazy(() => import("./features/reports/Reports"));
const Audience          = lazy(() => import("./features/audience/Audience"));
const PostAnalytics     = lazy(() => import("./features/post-analytics/PostAnalytics"));
const PeriodComparison  = lazy(() => import("./features/analytics/PeriodComparison"));
const AIContent         = lazy(() => import("./features/ai/AIContent"));
const ContentCalendar   = lazy(() => import("./features/publishing/ContentCalendar"));
const Notifications     = lazy(() => import("./features/notifications/Notifications"));
const Profile           = lazy(() => import("./features/settings/Profile"));
const HashtagAnalytics  = lazy(() => import("./features/insights/HashtagAnalytics"));
const Competitors       = lazy(() => import("./features/competitors/Competitors"));
const AdvancedAnalytics = lazy(() => import("./features/analytics/AdvancedAnalytics"));
const ABTesting         = lazy(() => import("./features/ab-testing/ABTesting"));
const AudienceOverlap   = lazy(() => import("./features/audience/AudienceOverlap"));
const CustomDashboards  = lazy(() => import("./features/custom-dashboards/CustomDashboards"));
const Insights          = lazy(() => import("./features/insights/Insights"));
const Publishing        = lazy(() => import("./features/publishing/Publishing"));
const WorkspaceSettings = lazy(() => import("./features/settings/WorkspaceSettings"));
const AcceptInvite      = lazy(() => import("./features/workspace/AcceptInvite"));
const BillingPage       = lazy(() => import("./features/billing/BillingPage").then(m => ({ default: m.BillingPage })));
const PerformanceMonitor = lazy(() => import("./features/monitor/PerformanceMonitor").then(m => ({ default: m.PerformanceMonitor })));
// ─── Landing + Legal pages ───────────────────────────────────────────────────
const LandingPage        = lazy(() => import("./features/landing/LandingPage"));
const PrivacyPage        = lazy(() => import("./features/landing/PrivacyPage"));
const TermsPage          = lazy(() => import("./features/landing/TermsPage"));
// ─── Auth pages (Supabase Auth) ───────────────────────────────────────────────
const LoginPage          = lazy(() => import("./features/auth/LoginPage"));
const RegisterPage       = lazy(() => import("./features/auth/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./features/auth/ForgotPasswordPage"));
const ResetPasswordPage  = lazy(() => import("./features/auth/ResetPasswordPage"));
const AuthCallbackPage   = lazy(() => import("./features/auth/AuthCallbackPage"));

// ─── Page loading fallback ────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* ── Landing + Legal routes ─────────────────────────────────── */}
        <Route path="/"                     component={LandingPage} />
        <Route path="/privacy"              component={PrivacyPage} />
        <Route path="/terms"                component={TermsPage} />
        {/* ── Core routes ────────────────────────────────────────────────── */}
        <Route path="/dashboard"            component={Home} />
        <Route path="/campaigns"            component={Campaigns} />
        <Route path="/analytics"            component={Analytics} />
        <Route path="/alerts"               component={Alerts} />
        <Route path="/calendar"             component={ContentCalendar} />
        <Route path="/ai-content"           component={AIContent} />
        <Route path="/audience"             component={Audience} />
        <Route path="/competitors"          component={Competitors} />
        <Route path="/reports"              component={Reports} />
        <Route path="/connections"          component={Connections} />
        <Route path="/ab-testing"           component={ABTesting} />
        <Route path="/custom-dashboards"    component={CustomDashboards} />
        <Route path="/advanced-analytics"   component={AdvancedAnalytics} />
        <Route path="/settings"             component={Settings} />
        <Route path="/profile"              component={Profile} />
        <Route path="/notifications"        component={Notifications} />
        <Route path="/post-analytics"       component={PostAnalytics} />
        <Route path="/audience-overlap"     component={AudienceOverlap} />
        <Route path="/compare"             component={PeriodComparison} />
        <Route path="/hashtags"             component={HashtagAnalytics} />
        <Route path="/workspace-settings"   component={WorkspaceSettings} />
        <Route path="/invite/:token"          component={AcceptInvite} />
        {/* ── Auth routes (Supabase) ─────────────────────────────────── */}
        <Route path="/login"                component={LoginPage} />
        <Route path="/register"             component={RegisterPage} />
        <Route path="/forgot-password"      component={ForgotPasswordPage} />
        <Route path="/auth/reset-password"  component={ResetPasswordPage} />
        <Route path="/auth/callback"        component={AuthCallbackPage} />
        {/* ── Legacy / backward-compat routes ────────────────────────────── */}
        <Route path="/meta-connect"         component={() => <Redirect to="/connections" />} />
        <Route path="/insights"             component={Insights} />
        <Route path="/publishing"           component={Publishing} />
        <Route path="/billing"              component={BillingPage} />
        <Route path="/monitor"              component={PerformanceMonitor} />
        <Route path="/ai-tools"             component={() => <Redirect to="/ai-content" />} />
        <Route path="/404"                  component={NotFound} />
        <Route                              component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// Show splash only once per session
const SPLASH_KEY = "dashfields-splash-shown";

function App() {
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem(SPLASH_KEY);
  });

  const handleSplashDone = useCallback(() => {
    sessionStorage.setItem(SPLASH_KEY, "1");
    setShowSplash(false);
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <ActiveAccountProvider>
          <WorkspaceProvider>
            <TooltipProvider>
              <Toaster />
              {showSplash && <SplashScreen onDone={handleSplashDone} />}
              <Router />
            </TooltipProvider>
          </WorkspaceProvider>
        </ActiveAccountProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
