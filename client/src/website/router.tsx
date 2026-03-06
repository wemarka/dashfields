/**
 * website/router.tsx
 * Routes for the public-facing marketing website (dashfields.com).
 */
import { lazy } from "react";
import { Route, Switch } from "wouter";
import { APP_DOMAIN } from "@/shared/lib/domain";

const LandingPage   = lazy(() => import("./pages/LandingPage"));
const PrivacyPage   = lazy(() => import("./pages/PrivacyPage"));
const TermsPage     = lazy(() => import("./pages/TermsPage"));
const ChangelogPage = lazy(() => import("./pages/ChangelogPage"));

function ExternalRedirect({ to }: { to: string }) {
  window.location.replace(to);
  return null;
}

export function WebsiteRouter() {
  return (
    <Switch>
      <Route path="/"           component={LandingPage} />
      <Route path="/privacy"    component={PrivacyPage} />
      <Route path="/terms"      component={TermsPage} />
      <Route path="/changelog"  component={ChangelogPage} />
      <Route path="/blog/:slug" component={LandingPage} />
      <Route path="/blog"       component={LandingPage} />
      <Route path="/demo"            component={() => <ExternalRedirect to={APP_DOMAIN + "/demo"} />} />
      <Route path="/login"           component={() => <ExternalRedirect to={APP_DOMAIN + "/login"} />} />
      <Route path="/register"        component={() => <ExternalRedirect to={APP_DOMAIN + "/register"} />} />
      <Route path="/dashboard"       component={() => <ExternalRedirect to={APP_DOMAIN + "/dashboard"} />} />
      <Route path="/forgot-password" component={() => <ExternalRedirect to={APP_DOMAIN + "/forgot-password"} />} />
      <Route component={LandingPage} />
    </Switch>
  );
}
