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
import Home from "./app/features/dashboard/Home";
import NotFound from "./app/features/shared/NotFound";
import SplashScreen from "./app/components/SplashScreen";

// ─── Lazy-loaded pages (code-split for performance) ───────────────────────────
const Campaigns         = lazy(() => import("./app/features/campaigns/Campaigns"));
const Analytics         = lazy(() => import("./app/features/analytics/Analytics"));
const Settings          = lazy(() => import("./app/features/settings/Settings"));
const Connections       = lazy(() => import("./app/features/connections/Connections"));
const Alerts            = lazy(() => import("./app/features/alerts/Alerts"));
const Reports           = lazy(() => import("./app/features/reports/Reports"));
const Audience          = lazy(() => import("./app/features/audience/Audience"));
const PostAnalytics     = lazy(() => import("./app/features/post-analytics/PostAnalytics"));
const PeriodComparison  = lazy(() => import("./app/features/analytics/PeriodComparison"));
const AIContent          = lazy(() => import("./app/features/ai/AIContent"));
const SentimentDashboard = lazy(() => import("./app/features/sentiment/SentimentDashboard"));
const AdsAnalyzer       = lazy(() => import("./app/features/ads-analyzer/AdsAnalyzer"));
const ContentCalendar   = lazy(() => import("./app/features/publishing/ContentCalendar"));
const Notifications     = lazy(() => import("./app/features/notifications/Notifications"));
const Profile           = lazy(() => import("./app/features/settings/Profile"));
const HashtagAnalytics  = lazy(() => import("./app/features/insights/HashtagAnalytics"));
const Competitors       = lazy(() => import("./app/features/competitors/Competitors"));
const AdvancedAnalytics = lazy(() => import("./app/features/analytics/AdvancedAnalytics"));
const ABTesting         = lazy(() => import("./app/features/ab-testing/ABTesting"));
const AudienceOverlap   = lazy(() => import("./app/features/audience/AudienceOverlap"));
const CustomDashboards  = lazy(() => import("./app/features/custom-dashboards/CustomDashboards"));
const Insights          = lazy(() => import("./app/features/insights/Insights"));
const Publishing        = lazy(() => import("./app/features/publishing/Publishing"));
const WorkspaceSettings = lazy(() => import("./app/features/settings/WorkspaceSettings"));
const AcceptInvite      = lazy(() => import("./app/features/workspace/AcceptInvite"));
const BillingPage       = lazy(() => import("./app/features/billing/BillingPage").then(m => ({ default: m.BillingPage })));
const PerformanceMonitor = lazy(() => import("./app/features/monitor/PerformanceMonitor").then(m => ({ default: m.PerformanceMonitor })));
const BrandKit           = lazy(() => import("./app/features/brand/BrandKit"));
const TeamPage           = lazy(() => import("./app/features/team/TeamPage"));
const AIInsightsHub      = lazy(() => import("./app/features/ai/AIInsightsHub"));
const SavedAudiences     = lazy(() => import("./app/features/audience/SavedAudiences"));
const PerformanceGoals   = lazy(() => import("./app/features/analytics/PerformanceGoals"));
const ContentTemplates   = lazy(() => import("./app/features/content/ContentTemplates"));
/// ─── Website pages (dashfields.com — public marketing site) ─────────────────────
const LandingPage        = lazy(() => import("./website/pages/LandingPage"));
const PrivacyPage        = lazy(() => import("./website/pages/PrivacyPage"));
const TermsPage          = lazy(() => import("./website/pages/TermsPage"));
const DemoPage           = lazy(() => import("./website/pages/DemoPage"));
const ChangelogPage      = lazy(() => import("./website/pages/ChangelogPage"));
const BlogPage           = lazy(() => import("./website/pages/BlogPage"));
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
        <Route path="/saved-audiences"      component={SavedAudiences} />
        <Route path="/performance-goals"    component={PerformanceGoals} />
        <Route path="/content-templates"    component={ContentTemplates} />
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
