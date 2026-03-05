import { Toaster } from "@/core/components/ui/sonner";
import { TooltipProvider } from "@/core/components/ui/tooltip";
import { lazy, Suspense, useEffect, useState, useCallback } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./core/contexts/ThemeContext";
import { ActiveAccountProvider } from "./core/contexts/ActiveAccountContext";
import { WorkspaceProvider } from "./core/contexts/WorkspaceContext";
import { isMarketingDomain, APP_DOMAIN } from "./lib/domain";
import { DemoModeProvider } from "./core/contexts/DemoModeContext";
import { DemoBanner } from "./components/DemoBanner";

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
const AIContent          = lazy(() => import("./features/ai/AIContent"));
const SentimentDashboard = lazy(() => import("./features/sentiment/SentimentDashboard"));
const AdsAnalyzer       = lazy(() => import("./features/ads-analyzer/AdsAnalyzer"));
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
const BrandKit           = lazy(() => import("./features/brand/BrandKit"));
const TeamPage           = lazy(() => import("./features/team/TeamPage"));
const AIInsightsHub      = lazy(() => import("./features/ai/AIInsightsHub"));
// ─── Landing + Legal pages ───────────────────────────────────────────────────
const LandingPage        = lazy(() => import("./features/landing/LandingPage"));
const PrivacyPage        = lazy(() => import("./features/landing/PrivacyPage"));
const TermsPage          = lazy(() => import("./features/landing/TermsPage"));
const DemoPage           = lazy(() => import("./features/landing/DemoPage"));
const ChangelogPage      = lazy(() => import("./features/landing/ChangelogPage"));
const BlogPage           = lazy(() => import("./features/landing/BlogPage"));
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

// ─── App Router (app.dashfields.com / localhost / dev) ───────────────────────
// Full application with all routes.
function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* ── Landing + Legal routes ─────────────────────────────────── */}
        <Route path="/"                     component={LandingPage} />
        <Route path="/privacy"              component={PrivacyPage} />
        <Route path="/terms"                component={TermsPage} />
        <Route path="/demo"                 component={DemoPage} />
        <Route path="/changelog"             component={ChangelogPage} />
        <Route path="/blog/:slug"             component={BlogPage} />
        <Route path="/blog"                   component={BlogPage} />
        {/* ── Core routes ────────────────────────────────────────────────── */}
        <Route path="/dashboard"            component={Home} />
        <Route path="/campaigns"            component={Campaigns} />
        <Route path="/analytics"            component={Analytics} />
        <Route path="/alerts"               component={Alerts} />
        <Route path="/calendar"             component={ContentCalendar} />
        <Route path="/ai-content"           component={AIContent} />
        <Route path="/sentiment"             component={SentimentDashboard} />
        <Route path="/ads-analyzer"           component={AdsAnalyzer} />
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
        <Route path="/invite/:token"        component={AcceptInvite} />
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
        <Route path="/brand-kit"            component={BrandKit} />
        <Route path="/team"                 component={TeamPage} />
        <Route path="/ai-hub"               component={AIInsightsHub} />
        <Route path="/ai-tools"             component={() => <Redirect to="/ai-content" />} />
        <Route path="/404"                  component={NotFound} />
        <Route                              component={NotFound} />
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
        <DemoModeProvider>
          <ActiveAccountProvider>
            <WorkspaceProvider>
              <TooltipProvider>
                <Toaster />
                <DemoBanner />
                {showSplash && <SplashScreen onDone={handleSplashDone} />}
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
