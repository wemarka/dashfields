import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Campaigns from "./pages/Campaigns";
import Analytics from "./pages/Analytics";
import Publishing from "./pages/Publishing";
import Insights from "./pages/Insights";
import AITools from "./pages/AITools";
import Settings from "./pages/Settings";
import MetaConnect from "./pages/MetaConnect";
import Connections from "./pages/Connections";
import Alerts from "./pages/Alerts";
import Reports from "@/pages/Reports";
import Audience from "@/pages/Audience";
import PostAnalytics from "@/pages/PostAnalytics";
import PeriodComparison from "@/pages/PeriodComparison";
import AIContent from "@/pages/AIContent";
import ContentCalendar from "@/pages/ContentCalendar";
import Notifications from "@/pages/Notifications";
import Profile from "@/pages/Profile";

function Router() {
  return (
    <Switch>
      <Route path="/"             component={Home} />
      <Route path="/campaigns"    component={Campaigns} />
      <Route path="/analytics"    component={Analytics} />
      <Route path="/publishing"   component={Publishing} />
      <Route path="/insights"     component={Insights} />
      <Route path="/ai-tools"     component={AITools} />
      <Route path="/settings"     component={Settings} />
      <Route path="/connections"  component={Connections} />
      {/* Keep /meta-connect for backward compatibility */}
      <Route path="/meta-connect" component={MetaConnect} />
      <Route path="/alerts"       component={Alerts} />
      <Route path="/reports"      component={Reports} />
      <Route path="/audience"     component={Audience} />
      <Route path="/post-analytics" component={PostAnalytics} />
      <Route path="/compare"        component={PeriodComparison} />
      <Route path="/ai-content"     component={AIContent} />
      <Route path="/calendar"        component={ContentCalendar} />
      <Route path="/notifications"   component={Notifications} />
      <Route path="/profile"         component={Profile} />
      <Route path="/404"          component={NotFound} />
      <Route component={NotFound} />
    </Switch>
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
