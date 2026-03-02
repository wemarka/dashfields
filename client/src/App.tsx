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
import Alerts from "./pages/Alerts";

function Router() {
  return (
    <Switch>
      <Route path="/"            component={Home} />
      <Route path="/campaigns"   component={Campaigns} />
      <Route path="/analytics"   component={Analytics} />
      <Route path="/publishing"  component={Publishing} />
      <Route path="/insights"    component={Insights} />
      <Route path="/ai-tools"    component={AITools} />
      <Route path="/settings"    component={Settings} />
      <Route path="/meta-connect" component={MetaConnect} />
      <Route path="/alerts"        component={Alerts} />
      <Route path="/404"         component={NotFound} />
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
