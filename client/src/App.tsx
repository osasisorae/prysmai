import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Blog from "./pages/Blog";
import Admin from "./pages/Admin";
import Onboarding from "./pages/Onboarding";
import DashboardShell from "./pages/DashboardShell";
import Docs from "./pages/Docs";
import Login from "./pages/Login";
import SetupAccount from "./pages/SetupAccount";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AcceptInvite from "./pages/AcceptInvite";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/docs"} component={Docs} />
      <Route path={"/blog"} component={Blog} />
      <Route path={"/blog/:slug"} component={Blog} />
      <Route path={"/login"} component={Login} />
      <Route path={"/setup-account"} component={SetupAccount} />
      <Route path={"/forgot-password"} component={ForgotPassword} />
      <Route path={"/reset-password"} component={ResetPassword} />
      <Route path={"/accept-invite"} component={AcceptInvite} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/onboarding"} component={Onboarding} />
      <Route path={"/dashboard"} component={DashboardShell} />
      <Route path={"/dashboard/:page"} component={DashboardShell} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
