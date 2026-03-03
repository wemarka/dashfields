import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// ─── Eager-loaded (critical path) ────────────────────────────────────────────
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

// ─── Lazy-loaded pages (code-split for performance) ───────────────────────────
const Campaigns         = lazy(() => import("./pages/Campaigns"));
const Analytics         = lazy(() => import("./pages/Analytics"));
const Publishing        = lazy(() => import("./pages/Publishing"));
const Insights          = lazy(() => import("./pages/Insights"));
const AITools           = lazy(() => import("./pages/AITools"));
const Settings          = lazy(() => import("./pages/Settings"));
const MetaConnect       = lazy(() => import("./pages/MetaConnect"));
const Connections       = lazy(() => import("./pages/Connections"));
const Alerts            = lazy(() => import("./pages/Alerts"));
const Reports           = lazy(() => import("./pages/Reports"));
const Audience          = lazy(() => import("./pages/Audience"));
const PostAnalytics     = lazy(() => import("./pages/PostAnalytics"));
const PeriodComparison  = lazy(() => import("./pages/PeriodComparison"));
const AIContent         = lazy(() => import("./pages/AIContent"));
const ContentCalendar   = lazy(() => import("./pages/ContentCalendar"));
const Notifications     = lazy(() => import("./pages/Notifications"));
const Profile           = lazy(() => import("./pages/Profile"));
const HashtagAnalytics  = lazy(() => import("./pages/HashtagAnalytics"));
const Competitors       = lazy(() => import("./pages/Competitors"));
const AdvancedAnalytics = lazy(() => import("./pages/AdvancedAnalytics"));
const ABTesting         = lazy(() => import("./pages/ABTesting"));
const AudienceOverlap   = lazy(() => import("./pages/AudienceOverlap"));
const CustomDashboards  = lazy(() => import("./pages/CustomDashboards"));

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
        <Route path="/"                     component={Home} />
        <Route path="/campaigns"            component={Campaigns} />
        <Route path="/analytics"            component={Analytics} />
        <Route path="/publishing"           component={Publishing} />
        <Route path="/insights"             component={Insights} />
        <Route path="/ai-tools"             component={AITools} />
        <Route path="/settings"             component={Settings} />
        <Route path="/connections"          component={Connections} />
        {/* Keep /meta-connect for backward compatibility */}
        <Route path="/meta-connect"         component={MetaConnect} />
        <Route path="/alerts"               component={Alerts} />
        <Route path="/reports"              component={Reports} />
        <Route path="/audience"             component={Audience} />
        <Route path="/post-analytics"       component={PostAnalytics} />
        <Route path="/compare"              component={PeriodComparison} />
        <Route path="/ai-content"           component={AIContent} />
        <Route path="/calendar"             component={ContentCalendar} />
        <Route path="/notifications"        component={Notifications} />
        <Route path="/profile"              component={Profile} />
        <Route path="/hashtags"             component={HashtagAnalytics} />
        <Route path="/competitors"          component={Competitors} />
        <Route path="/advanced-analytics"   component={AdvancedAnalytics} />
        <Route path="/ab-testing"           component={ABTesting} />
        <Route path="/audience-overlap"     component={AudienceOverlap} />
        <Route path="/custom-dashboards"    component={CustomDashboards} />
        <Route path="/404"                  component={NotFound} />
        <Route                              component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
