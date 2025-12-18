import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import KingDashboard from "./pages/KingDashboard";
import KingUsers from "./pages/KingUsers";
import Marketplace from "./pages/Marketplace";
import University from "./pages/University";
import Services from "./pages/Services";
import CreatorDashboard from "./pages/CreatorDashboard";
import AIBot from "./pages/AIBot";
import CommandHub from "./pages/CommandHub";
import OwnerControl from "./pages/OwnerControl";
import OwnerStatus from "./pages/OwnerStatus";
import AppHeader from "./components/AppHeader";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <>
      <AppHeader />
      <div className="pt-16">
        <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/marketplace"} component={Marketplace} />
      <Route path={"/university"} component={University} />
      <Route path={"/services"} component={Services} />
      <Route path={"/creator"} component={CreatorDashboard} />
      <Route path={"/ai-bot"} component={AIBot} />
      <Route path={"/command-hub"} component={CommandHub} />
      <Route path={"/owner-control"} component={OwnerControl} />
      <Route path={"/owner-status"} component={OwnerStatus} />
      <Route path={"/king"} component={KingDashboard} />
      <Route path={"/king/users"} component={KingUsers} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
          <Route component={NotFound} />
        </Switch>
      </div>
    </>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
