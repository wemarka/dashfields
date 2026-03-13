import { Toaster } from "@/core/components/ui/sonner";
import { TooltipProvider } from "@/core/components/ui/tooltip";
import { lazy, Suspense, useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./app/components/ErrorBoundary";
import { ThemeProvider } from "./core/contexts/ThemeContext";
import { ActiveAccountProvider } from "./core/contexts/ActiveAccountContext";
import { WorkspaceProvider } from "./core/contexts/WorkspaceContext";
import { isMarketingDomain, APP_DOMAIN } from "./shared/lib/domain";
import { DemoModeProvider } from "./core/contexts/DemoModeContext";

// ─── Manus Visual Editor: expose all routes for page navigation ─────────────
(window as unknown as Record<string, unknown>).__WOUTER_ROUTES__ = [
  "/",
  "/privacy",
  "/terms",
  "/changelog",
  "/login",
  "/register",
  "/forgot-password",
  "/auth/reset-password",
  "/auth/callback",
  "/dashboard",
  "/assist",
  "/studios",
  "/ads/campaigns",
  "/content/planner",
  "/analytics/overview",
  "/analytics/paid-organic",
  "/analytics/competitors",
  "/analytics/reports",
  "/assets",
  "/settings/workspace",
  "/settings/billing",
  "/alerts",
  "/profile",
  "/notifications",
  "/monitor",
  "/performance-goals",
  "/campaign-wizard",
];

// ─── Redirect helper ──────────────────────────────────────────────────────────
function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation(to); }, [to, setLocation]);
  return null;
}

// ─── External redirect ─────────────────────────────────────────────────────────
function ExternalRedirect({ to }: { to: string }) {
  useEffect(() => { window.location.href = to; }, [to]);
  return null;
}

// ─── Eager-loaded ────────────────────────────────────────────────────────────
import NotFound from "./app/features/shared/NotFound";
import TopbarLayout from "./app/components/layout/TopbarLayout";

// ─── Lazy-loaded pages ───────────────────────────────────────────────────────
const HomePage           = lazy(() => import("./app/features/home/HomePage"));
const AIAgentPage        = lazy(() => import("./app/features/ai-agent/AIAgentPage"));
const DashStudiosPage    = lazy(() => import("./app/features/studios/DashStudiosPage"));
const AssetsPage         = lazy(() => import("./app/features/assets/AssetsPage"));
const CampaignWizardPage = lazy(() => import("./app/features/campaign-wizard/CampaignWizardPage"));
const Alerts             = lazy(() => import("./app/features/alerts/Alerts"));
const Notifications      = lazy(() => import("./app/features/notifications/Notifications"));
const Profile            = lazy(() => import("./app/features/settings/Profile"));
const AcceptInvite       = lazy(() => import("./app/features/workspace/AcceptInvite"));
const PerformanceMonitor = lazy(() => import("./app/features/monitor/PerformanceMonitor").then(m => ({ default: m.PerformanceMonitor })));
const PerformanceGoals   = lazy(() => import("./app/features/analytics/PerformanceGoals"));
// Ads
const CampaignsPage      = lazy(() => import("./app/pages/ads/CampaignsPage"));
// Content
const PlannerPage        = lazy(() => import("./app/pages/content/PlannerPage"));
// Analytics
const OverviewPage       = lazy(() => import("./app/pages/analytics/OverviewPage"));
const PaidOrganicPage    = lazy(() => import("./app/pages/analytics/PaidOrganicPage"));
const CompetitorsPage    = lazy(() => import("./app/pages/analytics/CompetitorsPage"));
const ReportsPage        = lazy(() => import("./app/pages/analytics/ReportsPage"));
// Settings
const WorkspaceTeamPage  = lazy(() => import("./app/pages/settings/WorkspaceTeamPage"));
const SettingsBillingPage = lazy(() => import("./app/pages/settings/BillingPage"));
// Website pages
const LandingPage        = lazy(() => import("./website/pages/LandingPage"));
const PrivacyPage        = lazy(() => import("./website/pages/PrivacyPage"));
const TermsPage          = lazy(() => import("./website/pages/TermsPage"));
const ChangelogPage      = lazy(() => import("./website/pages/ChangelogPage"));
// Auth
const LoginPage          = lazy(() => import("./app/features/auth/LoginPage"));
const RegisterPage       = lazy(() => import("./app/features/auth/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./app/features/auth/ForgotPasswordPage"));
const ResetPasswordPage  = lazy(() => import("./app/features/auth/ResetPasswordPage"));
const AuthCallbackPage   = lazy(() => import("./app/features/auth/AuthCallbackPage"));

// ─── Page loading fallback ──────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen app-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    </div>
  );
}

// ─── Content loading fallback (inside layout) ───────────────────────────────
function ContentLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    </div>
  );
}

// ─── Marketing Router (dashfields.com) ──────────────────────────────────────
function MarketingRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/"        component={LandingPage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/terms"   component={TermsPage} />
        <Route path="/changelog" component={ChangelogPage} />
        <Route path="/login"            component={() => <ExternalRedirect to={`${APP_DOMAIN}/login`} />} />
        <Route path="/register"         component={() => <ExternalRedirect to={`${APP_DOMAIN}/register`} />} />
        <Route path="/dashboard"        component={() => <ExternalRedirect to={`${APP_DOMAIN}/dashboard`} />} />
        <Route path="/forgot-password"  component={() => <ExternalRedirect to={`${APP_DOMAIN}/forgot-password`} />} />
        <Route path="/auth/:rest*"      component={() => <ExternalRedirect to={`${APP_DOMAIN}${window.location.pathname}`} />} />
        <Route component={LandingPage} />
      </Switch>
    </Suspense>
  );
}

// ─── App Router (app.dashfields.com / localhost / dev) ──────────────────────
function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Root → dashboard */}
        <Route path="/" component={() => <Redirect to="/dashboard" />} />
        {/* Auth routes (NO TopbarLayout) */}
        <Route path="/login"                component={LoginPage} />
        <Route path="/register"             component={RegisterPage} />
        <Route path="/forgot-password"      component={ForgotPasswordPage} />
        <Route path="/auth/reset-password"  component={ResetPasswordPage} />
        <Route path="/auth/callback"        component={AuthCallbackPage} />
        {/* All app routes — TopbarLayout shell */}
        <Route>
          <TopbarLayout>
            <Suspense fallback={<ContentLoader />}>
              <Switch>
                {/* ── Core ─────────────────────────────────────────────── */}
                <Route path="/dashboard"              component={HomePage} />
                <Route path="/assist"                 component={AIAgentPage} />
                <Route path="/studios"                component={DashStudiosPage} />
                <Route path="/assets"                 component={AssetsPage} />
                <Route path="/campaign-wizard"        component={CampaignWizardPage} />
                {/* ── Ads ──────────────────────────────────────────────── */}
                <Route path="/ads"                    component={() => <Redirect to="/ads/campaigns" />} />
                <Route path="/ads/campaigns"          component={CampaignsPage} />
                {/* ── Content ──────────────────────────────────────────── */}
                <Route path="/content"                component={() => <Redirect to="/content/planner" />} />
                <Route path="/content/planner"        component={PlannerPage} />
                {/* ── Analytics ────────────────────────────────────────── */}
                <Route path="/analytics"              component={() => <Redirect to="/analytics/overview" />} />
                <Route path="/analytics/overview"     component={OverviewPage} />
                <Route path="/analytics/paid-organic" component={PaidOrganicPage} />
                <Route path="/analytics/competitors"  component={CompetitorsPage} />
                <Route path="/analytics/reports"      component={ReportsPage} />
                {/* ── Settings ─────────────────────────────────────────── */}
                <Route path="/settings"               component={() => <Redirect to="/settings/workspace" />} />
                <Route path="/settings/workspace"     component={WorkspaceTeamPage} />
                <Route path="/settings/billing"       component={SettingsBillingPage} />
                {/* ── Standalone ────────────────────────────────────────── */}
                <Route path="/alerts"                 component={Alerts} />
                <Route path="/profile"                component={Profile} />
                <Route path="/notifications"          component={Notifications} />
                <Route path="/invite/:token"          component={AcceptInvite} />
                <Route path="/monitor"                component={PerformanceMonitor} />
                <Route path="/performance-goals"      component={PerformanceGoals} />
                {/* ── Legacy redirects ──────────────────────────────────── */}
                <Route path="/campaigns"              component={() => <Redirect to="/ads/campaigns" />} />
                <Route path="/audience"               component={() => <Redirect to="/dashboard" />} />
                <Route path="/connections"            component={() => <Redirect to="/dashboard" />} />
                <Route path="/reports"                component={() => <Redirect to="/analytics/reports" />} />
                <Route path="/publishing"             component={() => <Redirect to="/content/planner" />} />
                <Route path="/insights"               component={() => <Redirect to="/analytics/overview" />} />
                <Route path="/competitors"            component={() => <Redirect to="/analytics/competitors" />} />
                <Route path="/billing"                component={() => <Redirect to="/settings/billing" />} />
                <Route path="/workspace-settings"     component={() => <Redirect to="/settings/workspace" />} />
                <Route path="/team"                   component={() => <Redirect to="/settings/workspace" />} />
                <Route path="/ai-tools"               component={() => <Redirect to="/assist" />} />
                <Route path="/ai-hub"                 component={() => <Redirect to="/assist" />} />
                <Route path="/404"                    component={NotFound} />
                <Route                                component={NotFound} />
              </Switch>
            </Suspense>
          </TopbarLayout>
        </Route>
      </Switch>
    </Suspense>
  );
}

// ─── Domain-aware Router ─────────────────────────────────────────────────────
function Router() {
  if (isMarketingDomain()) {
    return <MarketingRouter />;
  }
  return <AppRouter />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <DemoModeProvider>
          <ActiveAccountProvider>
            <WorkspaceProvider>
              <TooltipProvider>
                <Toaster />
                <Router />
              </TooltipProvider>
            </WorkspaceProvider>
          </ActiveAccountProvider>
        </DemoModeProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
