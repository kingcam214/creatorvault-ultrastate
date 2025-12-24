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
import CreatorTools from "./pages/CreatorTools";
import CreatorVideoStudio from "./pages/CreatorVideoStudio";
import AdultSalesBot from "./pages/AdultSalesBot";
import Onboard from "./pages/Onboard";
import { MultiPlatformPosting } from "./pages/MultiPlatformPosting";
import { ContentScheduler } from "./pages/ContentScheduler";
import { CreatorAnalyticsDashboard } from "./pages/CreatorAnalyticsDashboard";
import { PlatformConnections } from "./pages/PlatformConnections";
import UnifiedContentPublisher from "./pages/UnifiedContentPublisher";
import VaultLiveStream from "./pages/VaultLiveStream";
import EmmaNetwork from "./pages/EmmaNetwork";
import InfluencerOnboarding from "./pages/InfluencerOnboarding";
import InfluencerDashboard from "./pages/InfluencerDashboard";
import JoinVaultLive from "./pages/JoinVaultLive";
import KingCamDemos from "./pages/KingCamDemos";
import VaultPay from "./pages/VaultPay";
import DayShiftDoctor from "./pages/DayShiftDoctor";
import HollywoodReplacement from "./pages/HollywoodReplacement";
import ProofGate from "./pages/ProofGate";
import DominicanSector from "./pages/DominicanSector";
import VaultGuardian from "./pages/VaultGuardian";
import CreatorSubscriptions from "./pages/CreatorSubscriptions";
import FanSubscribe from "./pages/FanSubscribe";
import CreatorToolbox from "./pages/CreatorToolbox";
import ViralOptimizer from "./pages/tools/ViralOptimizer";
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
      <Route path={"/creator-tools"} component={CreatorTools} />
      <Route path={"/creator-video-studio"} component={CreatorVideoStudio} />
      <Route path={"/adult-sales-bot"} component={AdultSalesBot} />
      <Route path={"/onboard"} component={Onboard} />
      <Route path={"/multi-platform-posting"} component={MultiPlatformPosting} />
      <Route path={"/content-scheduler"} component={ContentScheduler} />
      <Route path={"/creator-analytics"} component={CreatorAnalyticsDashboard} />
      <Route path={"/platform-connections"} component={PlatformConnections} />
      <Route path={"/unified-publisher"} component={UnifiedContentPublisher} />
      <Route path={"/vault-live"} component={VaultLiveStream} />
      <Route path={"/king"} component={KingDashboard} />
      <Route path={"/king/users"} component={KingUsers} />
      <Route path={"/king/emma"} component={EmmaNetwork} />
      <Route path={"/king/demos"} component={KingCamDemos} />
      <Route path={"/onboard/influencer"} component={InfluencerOnboarding} />
      <Route path={"/influencer"} component={InfluencerDashboard} />
      <Route path={"/join-vaultlive"} component={JoinVaultLive} />
      <Route path={"/vault-pay"} component={VaultPay} />
      <Route path={"/dayshift-doctor"} component={DayShiftDoctor} />
      <Route path={"/hollywood-replacement"} component={HollywoodReplacement} />
      <Route path={"/proof-gate"} component={ProofGate} />
      <Route path={"/dominican"} component={DominicanSector} />
      <Route path={"/vault-guardian"} component={VaultGuardian} />
      <Route path={"/creator-subscriptions"} component={CreatorSubscriptions} />
      <Route path={"/subscribe/:tierId"} component={FanSubscribe} />
      <Route path={"/creator-toolbox"} component={CreatorToolbox} />
      <Route path={"/tools/viral-optimizer"} component={ViralOptimizer} />
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
