import { Toaster } from "@/core/components/ui/sonner";
import { TooltipProvider } from "@/core/components/ui/tooltip";
import { lazy, Suspense, useEffect, useState, useCallback } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./app/components/ErrorBoundary";
import { ThemeProvider } from "./core/contexts/ThemeContext";
import { ActiveAccountProvider } from "./core/contexts/ActiveAccountContext";
import { WorkspaceProvider } from "./core/contexts/WorkspaceContext";
import { isMarketingDomain, APP_DOMAIN } from "./shared/lib/domain";
import { DemoModeProvider } from "./core/contexts/DemoModeContext";
import { DemoBanner } from "./app/components/DemoBanner";

// ─── Manus Visual Editor: expose all routes for page navigation ─────────────
// The visual editor reads window.__WOUTER_ROUTES__ to build the page dropdown.
// Keep this list in sync with the Route definitions in AppRouter below.
(window as unknown as Record<string, unknown>).__WOUTER_ROUTES__ = [
  // Public / Marketing
  "/",
  "/privacy",
  "/terms",
  "/demo",
  "/changelog",
  "/blog",
  // Auth
  "/login",
  "/register",
  "/forgot-password",
  "/auth/reset-password",
  "/auth/callback",
  // Dashboard
  "/dashboard",
  // Ads
  "/ads/campaigns",
  // Content
  "/content/planner",
  // Analytics
  "/analytics/overview",
  "/analytics/paid-organic",
  "/analytics/competitors",
  "/analytics/reports",
  // Settings
  "/settings/workspace",
  "/settings/billing",
  // Other app pages
  "/alerts",
  "/profile",
  "/notifications",
  "/monitor",
  "/performance-goals",
];

// ─── Redirect helper ──────────────────────────────────────────────────────────
function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation(to); }, [to, setLocation]);
  return null;
}

// ─── External redirect (hard navigation to another domain) ───────────────────
function ExternalRedirect({ to }: { to: string }) {
  useEffect(() => { window.location.href = to; }, [to]);
  return null;
}

// ─── Eager-loaded (critical path) ────────────────────────────────────────────
import NotFound from "./app/features/shared/NotFound";
import DashboardLayout from "./app/components/DashboardLayout";

// ─── AI Agent (main home page) ───────────────────────────────────────────────
const AIAgentPage = lazy(() => import("./app/features/ai-agent/AIAgentPage"));

// ─── Lazy-loaded pages (code-split for performance) ───────────────────────────
const Alerts            = lazy(() => import("./app/features/alerts/Alerts"));
const Notifications     = lazy(() => import("./app/features/notifications/Notifications"));
const Profile           = lazy(() => import("./app/features/settings/Profile"));
const AcceptInvite      = lazy(() => import("./app/features/workspace/AcceptInvite"));
const PerformanceMonitor = lazy(() => import("./app/features/monitor/PerformanceMonitor").then(m => ({ default: m.PerformanceMonitor })));
const PerformanceGoals   = lazy(() => import("./app/features/analytics/PerformanceGoals"));
// ─── Standalone sub-pages (Accordion Sidebar architecture) ──────────────────
// Ads
const CampaignsPage       = lazy(() => import("./app/pages/ads/CampaignsPage"));
// Content
const PlannerPage         = lazy(() => import("./app/pages/content/PlannerPage"));
// Analytics
const OverviewPage     = lazy(() => import("./app/pages/analytics/OverviewPage"));
const PaidOrganicPage  = lazy(() => import("./app/pages/analytics/PaidOrganicPage"));
const CompetitorsPage  = lazy(() => import("./app/pages/analytics/CompetitorsPage"));
const ReportsPage      = lazy(() => import("./app/pages/analytics/ReportsPage"));
// Settings
// IntegrationsPage removed — now shown as Coming Soon inside Settings Modal
const WorkspaceTeamPage = lazy(() => import("./app/pages/settings/WorkspaceTeamPage"));
const SettingsBillingPage = lazy(() => import("./app/pages/settings/BillingPage"));
/// ─── Website pages (dashfields.com — public marketing site) ─────────────────────
const LandingPage        = lazy(() => import("./website/pages/LandingPage"));
const PrivacyPage        = lazy(() => import("./website/pages/PrivacyPage"));
const TermsPage          = lazy(() => import("./website/pages/TermsPage"));
const ChangelogPage      = lazy(() => import("./website/pages/ChangelogPage"));
// ─── Auth pages (Supabase Auth) ───────────────────────────────────────────────
const LoginPage          = lazy(() => import("./app/features/auth/LoginPage"));
const RegisterPage       = lazy(() => import("./app/features/auth/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./app/features/auth/ForgotPasswordPage"));
const ResetPasswordPage  = lazy(() => import("./app/features/auth/ResetPasswordPage"));
const AuthCallbackPage   = lazy(() => import("./app/features/auth/AuthCallbackPage"));

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

// ─── Marketing Router (dashfields.com / www.dashfields.com) ──────────────────
// Only shows Landing Page + legal pages.
// Auth/app routes redirect to app.dashfields.com.
function MarketingRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/"        component={LandingPage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/terms"   component={TermsPage} />
        <Route path="/demo"      component={() => <ExternalRedirect to={`${APP_DOMAIN}/demo`} />} />
        <Route path="/changelog" component={ChangelogPage} />
        {/* Redirect any app/auth routes to app subdomain */}
        <Route path="/login"            component={() => <ExternalRedirect to={`${APP_DOMAIN}/login`} />} />
        <Route path="/register"         component={() => <ExternalRedirect to={`${APP_DOMAIN}/register`} />} />
        <Route path="/dashboard"        component={() => <ExternalRedirect to={`${APP_DOMAIN}/dashboard`} />} />
        <Route path="/forgot-password"  component={() => <ExternalRedirect to={`${APP_DOMAIN}/forgot-password`} />} />
        <Route path="/auth/:rest*"      component={() => <ExternalRedirect to={`${APP_DOMAIN}${window.location.pathname}`} />} />
        {/* Catch-all: redirect to landing */}
        <Route component={LandingPage} />
      </Switch>
    </Suspense>
  );
}

// ─── Content loading fallback (inside layout — sidebar stays stable) ───────────
// Uses PageSkeleton for a structured loading state instead of a spinner.
import { PageSkeleton } from "@/app/components/skeletons";
function ContentLoader() {
  return (
    <PageSkeleton />
  );
}
function _ContentLoaderLegacy() {
  return (
    <div className="flex items-center justify-center h-full min-h-[300px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    </div>
  );
}

// ─── App Router (app.dashfields.com / localhost / dev) ───────────────────────
// DashboardLayout is the single shared wrapper for ALL authenticated app routes.
// Auth/public routes (login, register) are rendered OUTSIDE the layout.
// The root "/" redirects to "/dashboard" since this is the app subdomain.
function AppRouter() {
  return (
    // Suspense here only covers auth pages (lazy-loaded) — NOT the dashboard layout.
    // Dashboard routes have their own inner Suspense so the sidebar stays stable.
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* ── Root: redirect to dashboard on app domain ─────────────────── */}
        <Route path="/"                     component={() => <Redirect to="/dashboard" />} />
        {/* ── Auth routes (NO DashboardLayout) ──────────────────────────── */}
        <Route path="/login"                component={LoginPage} />
        <Route path="/register"             component={RegisterPage} />
        <Route path="/forgot-password"      component={ForgotPasswordPage} />
        <Route path="/auth/reset-password"  component={ResetPasswordPage} />
        <Route path="/auth/callback"        component={AuthCallbackPage} />
        {/* ── All app routes — single shared DashboardLayout ────────────── */}
        <Route>
          <DashboardLayout>
            {/* Inner Suspense: only the page content area shows a loader.
                The sidebar/topbar remain mounted — no full-screen flash. */}
            <Suspense fallback={<ContentLoader />}>
            <Switch>
              {/* ── Core ──────────────────────────────────────────────────── */}
              <Route path="/dashboard"              component={AIAgentPage} />
              {/* ── Ads sub-pages ──────────────────────────────────────────── */}
              <Route path="/ads"                    component={() => <Redirect to="/ads/campaigns" />} />
              <Route path="/ads/campaigns"          component={CampaignsPage} />
              <Route path="/ads/creatives"          component={() => <Redirect to="/ads/campaigns" />} />
              <Route path="/ads/adsets"             component={() => <Redirect to="/ads/campaigns" />} />
              {/* ── Content sub-pages ──────────────────────────────────────────────── */}
              <Route path="/content"                component={() => <Redirect to="/content/planner" />} />
              <Route path="/content/planner"        component={PlannerPage} />
              {/* ── Analytics sub-pages ────────────────────────────────────── */}
              <Route path="/analytics"              component={() => <Redirect to="/analytics/overview" />} />
              <Route path="/analytics/overview"     component={OverviewPage} />
              <Route path="/analytics/paid-organic" component={PaidOrganicPage} />
              <Route path="/analytics/competitors"  component={CompetitorsPage} />
              <Route path="/analytics/reports"      component={ReportsPage} />
              {/* ── Settings sub-pages ─────────────────────────────────────── */}
              <Route path="/settings"               component={() => <Redirect to="/dashboard" />} />
              <Route path="/settings/workspace"     component={WorkspaceTeamPage} />
              <Route path="/settings/billing"       component={SettingsBillingPage} />
              {/* ── Standalone app routes ──────────────────────────────────── */}
              <Route path="/alerts"                 component={Alerts} />
              <Route path="/profile"                component={Profile} />
              <Route path="/notifications"          component={Notifications} />
              <Route path="/invite/:token"          component={AcceptInvite} />
              <Route path="/monitor"                component={PerformanceMonitor} />
              <Route path="/performance-goals"      component={PerformanceGoals} />
              {/* ── Legacy redirects ───────────────────────────────────────── */}
              <Route path="/campaigns"              component={() => <Redirect to="/ads/campaigns" />} />
              <Route path="/audience"               component={() => <Redirect to="/dashboard" />} />
              <Route path="/ads-analyzer"           component={() => <Redirect to="/dashboard" />} />
              <Route path="/audience-overlap"       component={() => <Redirect to="/dashboard" />} />
              <Route path="/saved-audiences"        component={() => <Redirect to="/dashboard" />} />
              <Route path="/ab-testing"             component={() => <Redirect to="/ads/campaigns" />} />
              <Route path="/calendar"               component={() => <Redirect to="/content/planner" />} />
              <Route path="/ai-content"             component={() => <Redirect to="/dashboard" />} />
              <Route path="/brand-kit"              component={() => <Redirect to="/dashboard" />} />
              <Route path="/content-templates"      component={() => <Redirect to="/dashboard" />} />
              <Route path="/publishing"             component={() => <Redirect to="/content/planner" />} />
              <Route path="/post-analytics"         component={() => <Redirect to="/analytics/overview" />} />
              <Route path="/insights"               component={() => <Redirect to="/analytics/overview" />} />
              <Route path="/sentiment"              component={() => <Redirect to="/analytics/overview" />} />
              <Route path="/hashtags"               component={() => <Redirect to="/analytics/overview" />} />
              <Route path="/competitors"            component={() => <Redirect to="/analytics/competitors" />} />
              <Route path="/reports"                component={() => <Redirect to="/analytics/reports" />} />
              <Route path="/advanced-analytics"     component={() => <Redirect to="/analytics/paid-organic" />} />
              <Route path="/compare"                component={() => <Redirect to="/analytics/paid-organic" />} />
              <Route path="/connections"            component={() => <Redirect to="/dashboard" />} />
              <Route path="/workspace-settings"     component={() => <Redirect to="/settings/workspace" />} />
              <Route path="/team"                   component={() => <Redirect to="/settings/workspace" />} />
              <Route path="/billing"                component={() => <Redirect to="/settings/billing" />} />
              <Route path="/ai-tools"               component={() => <Redirect to="/content/ai-studio" />} />
              <Route path="/ai-hub"                 component={() => <Redirect to="/content/ai-studio" />} />
              <Route path="/custom-dashboards"      component={() => <Redirect to="/dashboard" />} />
              <Route path="/404"                    component={NotFound} />
              <Route                                component={NotFound} />
            </Switch>
            </Suspense>
          </DashboardLayout>
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
      <ThemeProvider defaultTheme="light">
        <DemoModeProvider>
          <ActiveAccountProvider>
            <WorkspaceProvider>
              <TooltipProvider>
                <Toaster />
                <DemoBanner />
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
