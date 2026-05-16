// import PlatformWarRoom from "./pages/PlatformWarRoom";
// import EmpireVerticals from "./pages/EmpireVerticals";
import { Toaster } from "./components/ui/sonner";
import { DebugOverlay } from "./components/DebugOverlay";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
// import FollowListPage from "./pages/FollowListPage";
// import Notifications from "@/pages/Notifications";
// import Messages from "@/pages/Messages";
// import MessageThread from "@/pages/MessageThread";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { CreatorModeProvider } from "./contexts/CreatorModeContext";
import Home from "./pages/Home";
// import BusinessCardDesigner from "./pages/BusinessCardDesigner";
// import CardEditor from "./pages/CardEditor";
// import AICardDesigner from "./pages/AICardDesigner";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CreatorHome from "./pages/CreatorHome";
import KingHome from "./pages/KingHome";
// import KingGemCenter from "./pages/king/KingGemCenter";
// import FlyerGenerator from "./pages/FlyerGenerator";
// import AnimatedFlyerStudio from "./pages/AnimatedFlyerStudio";
// import FontLibrary from "./pages/FontLibrary";
// import ImageLab from "./pages/ImageLab";
// import FlyerComposer from "./pages/FlyerComposer";
// import FlyerDesignStudio from "./pages/FlyerDesignStudio";
// import WhatsAppContentGenerator from "./pages/WhatsAppContentGenerator";
// import WhatsAppBotDashboard from "./pages/WhatsAppBotDashboard";
// import DayShiftDoctor from "./pages/DayShiftDoctor";
// import NurseConsole from "./pages/NurseConsole";
// import DesignDepartment from "./pages/DesignDepartment";
// import StudioSlots from "./pages/StudioSlots";
// import ContentDashboard from "./pages/ContentDashboard";
// import MonetizationPipeline from "./pages/MonetizationPipeline";
// import EmmaHome from "./pages/EmmaHome";
// import EmmaEmpire from "./pages/EmmaEmpire";
// import ChicaCockpit from './pages/ChicaCockpit';
// import EmmaResetDashboard from "./pages/EmmaResetDashboard";
// import EmmaSimpleView from "./pages/EmmaSimpleView";
// import EmmaNetworkHome from "./pages/EmmaNetworkHome";
// import LeadCapture from "./pages/LeadCapture";
// import PerformanceAnalytics from "./pages/PerformanceAnalytics";
import AppHeader from "./components/AppHeader";
import KingDashboard from "./pages/KingDashboard";
import MissionControl from "./pages/MissionControl";
// import KingUsers from "./pages/KingUsers";
// import Marketplace from "./pages/Marketplace";
// import MarketplaceCreate from "./pages/MarketplaceCreate";
// import MarketplaceManage from "./pages/MarketplaceManage";
// import MarketplaceAnalytics from "./pages/MarketplaceAnalytics";
// import MarketplaceProduct from "./pages/MarketplaceProduct";
// import University from "./pages/University";
// import KingCamShowreel from "./pages/KingCamShowreel";
// import KingCamScriptWriter from "./pages/KingCamScriptWriter";
// import KingCamEngine from "./pages/KingCamEngine";
// import EmmaUniversity from "./pages/EmmaUniversity";
import EmmaTransparencyLog from "./pages/EmmaTransparencyLog";
// import Services from "./pages/Services";
import CreatorDashboard from "./pages/CreatorDashboard";
import AIBot from "./pages/AIBot";
import CommandHub from "./pages/CommandHub";
import OwnerControl from "./pages/OwnerControl";
import OwnerStatus from "./pages/OwnerStatus";
import CreatorTools from "./pages/CreatorTools";
import CreatorVideoStudio from "./pages/CreatorVideoStudio";
// import VideoStudio from './pages/VideoStudio';
import AdultSalesBot from "./pages/AdultSalesBot";
// import CreatorManagement from "./pages/CreatorManagement";
// import Onboard from "./pages/Onboard";
// // import { MultiPlatformPosting } from "./pages/MultiPlatformPosting"; // MERGED into SocialHub
// // import { ContentScheduler } from "./pages/ContentScheduler"; // MERGED into SocialHub
// import { CreatorAnalyticsDashboard } from "./pages/CreatorAnalyticsDashboard";
// // import { PlatformConnections } from "./pages/PlatformConnections"; // MERGED into SocialHub
// // import UnifiedContentPublisher from "./pages/UnifiedContentPublisher"; // MERGED into SocialHub
// import VaultLiveSimple from "./pages/VaultLiveSimple";
import EmmaNetwork from "./pages/EmmaNetwork";
// import InfluencerOnboarding from "./pages/InfluencerOnboarding";
// import InfluencerDashboard from "./pages/InfluencerDashboard";
// import JoinVaultLive from "./pages/JoinVaultLive";
// import ControlRoom from "./pages/ControlRoom";
import LaunchTrailerStudio from "./pages/LaunchTrailerStudio";
// import KingCamClone from "./pages/KingCamClone";
// import KingCamShowcase from "./pages/KingCamShowcase";
// import KingCamImport from "./pages/king/KingCamImport";
// import KingCamGallery from "./pages/king/KingCamGallery";
import LaunchCommand from "./pages/king/LaunchCommandWrapper";
// import SmartAlbum from "./pages/SmartAlbum";
// import VaultSnap from "./pages/VaultSnap";
// import VaultPass from "./pages/VaultPass";
// import VaultDrop from "./pages/VaultDrop";
// import VaultAnalytics from "./pages/VaultAnalytics";
// import VaultSpaceDashboard from "./pages/VaultSpaceDashboard";
// import KingCamDemos from "./pages/KingCamDemos";
// import KingCamTours from "./pages/KingCamTours";
// import KingBackOffice from "./pages/KingBackOffice";
// import KingEmpire from "./pages/KingEmpire";
// import KingMoneyMission from "./pages/KingMoneyMission";
// import KingLife from "./pages/KingLife";
// import AgentRoster from "./pages/AgentRoster";
// import KingEmmaOversight from "./pages/KingEmmaOversight";
// import PublicProfile from "./pages/PublicProfile";
// import EditProfile from "./pages/EditProfile";
import FeedPage from "./pages/Feed";
// import Explore from "./pages/Explore";
// import VideoEditorProjects from "./pages/videoeditor/VideoEditorProjects";
// import VideoEditor from "./pages/videoeditor/VideoEditor";
// import VaultPay from "./pages/VaultPay";
// import HollywoodReplacement from "./pages/HollywoodReplacement";
// import ScriptDirectorPage from "./pages/scripttovideo/ScriptDirectorPage";
// import MusicAI from "./pages/MusicAI";
// import MusicLibrary from "./pages/MusicLibrary";
// import ArtistStorefront from "./pages/ArtistStorefront";
// import DubbingAI from "./pages/DubbingAI";
// import ProofGate from "./pages/ProofGate";
// import DominicanSector from "./pages/DominicanSector";
// import VaultGuardian from "./pages/VaultGuardian";
// import CreatorSubscriptions from "./pages/CreatorSubscriptions";
// import FanSubscribe from "./pages/FanSubscribe";
// import CreatorToolbox from "./pages/CreatorToolbox";
// import ViralOptimizer from "./pages/tools/ViralOptimizer"; // @deprecated — use ViralOptimizerPage
// import ViralOptimizerPage from "./pages/ViralOptimizerPage";
import VerticalPackLauncher from "./pages/VerticalPackLauncher";
// import CreatorEarnings from "./pages/CreatorEarnings";
// import AdminPayouts from "./pages/AdminPayouts";
// import AdminManualPayments from "./pages/AdminManualPayments";
// import PodcastStudio from "./pages/PodcastStudio";
// import SocialMediaAudit from "./pages/SocialMediaAudit"; // MERGED into SocialHub Audit tab
import PerformanceInsights from "./pages/PerformanceInsights";
import LiveDemoControl from "./pages/LiveDemoControl";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import PayoutSetup from "./pages/PayoutSetup";
import AdminTips from "./pages/AdminTips";
import GuiaCreador from "./pages/GuiaCreador";
import TelegramSetup from "./pages/TelegramSetup";
import CreatorOnboarding from "./pages/CreatorOnboarding";
import BrowseLive from "./pages/BrowseLive";
import StreamView from "./pages/StreamView";
import GreatestShowLanding from "./pages/greatest-show/index";
// import GreatestShowStudio from "./pages/GreatestShowStudio";
import MailyProfile from "./pages/greatest-show/MailyProfile";
import DianaProfile from "./pages/greatest-show/DianaProfile";
import EmmaProfile from "./pages/greatest-show/EmmaProfile";
import TheBiggestBProfile from "./pages/greatest-show/TheBiggestBProfile";
import DelBaniaProfile from "./pages/greatest-show/DelBaniaProfile";
import AderlyProfile from "./pages/greatest-show/AderlyProfile";
import CanishaProfile from "./pages/greatest-show/CanishaProfile";
import LuvRoxieProfile from "./pages/greatest-show/LuvRoxieProfile";
import LirysProfile from "./pages/greatest-show/LirysProfile";
import LeslieProfile from "./pages/greatest-show/LeslieProfile";
  // @ts-ignore
import ChicaLoyaltyCommand from './pages/ChicaLoyaltyCommand';
  // @ts-ignore
import MyLoyaltyPortal from './pages/MyLoyaltyPortal';
import FitnessGoddesses from "./pages/greatest-show/FitnessGoddesses";
import PoleArtists from "./pages/greatest-show/PoleArtists";
import LifestyleGoddesses from "./pages/greatest-show/LifestyleGoddesses";
import EliteDancers from "./pages/greatest-show/EliteDancers";
import AdultContent from "./pages/greatest-show/AdultContent";
import CreatorApplication from "./pages/greatest-show/CreatorApplication";
import FanSubscription from "./pages/greatest-show/FanSubscription";
import AICardDesigner from "./pages/AICardDesigner";
import AIEmpireDashboard from "./pages/AIEmpireDashboard";
import AdminManualPayments from "./pages/AdminManualPayments";
import AdminPayouts from "./pages/AdminPayouts";
import AgentRoster from "./pages/AgentRoster";
import AgentTracker from "./pages/AgentTracker";
import AnimatedFlyerStudio from "./pages/AnimatedFlyerStudio";
import ApparelLab from "./pages/ApparelLab";
import AppleQDashboard from "./pages/AppleQDashboard";
import ArtistStorefront from "./pages/ArtistStorefront";
import BrandDeals from "./pages/BrandDeals";
import BusinessCardDesigner from "./pages/BusinessCardDesigner";
import CardEditor from "./pages/CardEditor";
import ChicaCockpit from "./pages/ChicaCockpit";
  // @ts-ignore
import ChicaLoyaltyCommand from "./pages/ChicaLoyaltyCommand";
import ChicasEmpire from "./pages/ChicasEmpire";
import Chuuch from "./pages/Chuuch";
import ChuuchArchive from "./pages/ChuuchArchive";
import ChuuchCode from "./pages/ChuuchCode";
import ChuuchElders from "./pages/ChuuchElders";
import ChuuchEvents from "./pages/ChuuchEvents";
import ChuuchMedia from "./pages/ChuuchMedia";
import ChuuchMerch from "./pages/ChuuchMerch";
import ChuuchTeaching from "./pages/ChuuchTeaching";
import ChuuchTransition from "./pages/ChuuchTransition";
import CommandHubV2 from "./pages/CommandHubV2";
import ContentDashboard from "./pages/ContentDashboard";
// import { ContentScheduler } from "./pages/ContentScheduler"; // MERGED into SocialHub
import ControlRoom from "./pages/ControlRoom";
import { CreatorAnalyticsDashboard } from "./pages/CreatorAnalyticsDashboard";
import CreatorEarnings from "./pages/CreatorEarnings";
import CreatorManagement from "./pages/CreatorManagement";
import CreatorPublicTiers from "./pages/CreatorPublicTiers";
import CreatorSubscriptionTiers from "./pages/CreatorSubscriptionTiers";
import CreatorSubscriptions from "./pages/CreatorSubscriptions";
import CreatorToolbox from "./pages/CreatorToolbox";
import CreatorVaultDominicana from "./pages/CreatorVaultDominicana";
import CultureSelection from "./pages/CultureSelection";
import DayShiftDoctor from "./pages/DayShiftDoctor";
import DesignDepartment from "./pages/DesignDepartment";
import DominicanSector from "./pages/DominicanSector";
import DubbingAI from "./pages/DubbingAI";
import EditProfile from "./pages/EditProfile";
import EmmaAIAgentDashboard from "./pages/EmmaAIAgentDashboard";
import EmmaEmpire from "./pages/EmmaEmpire";
import EmmaHome from "./pages/EmmaHome";
import EmmaNetworkHome from "./pages/EmmaNetworkHome";
import EmmaResetDashboard from "./pages/EmmaResetDashboard";
import EmmaSimpleView from "./pages/EmmaSimpleView";
import EmmaUniversity from "./pages/EmmaUniversity";
import EmpireBrain from "./pages/EmpireBrain";
import EmpireBrainDashboard from "./pages/EmpireBrainDashboard";
import EmpireBrainRules from "./pages/EmpireBrainRules";
import EmpireBrainShowrunner from "./pages/EmpireBrainShowrunner";
import EmpireCockpitV2 from "./pages/EmpireCockpitV2";
import EmpireDocPrompt from "./pages/EmpireDocPrompt";
import EmpireState from "./pages/EmpireState";
import EmpireVerticals from "./pages/EmpireVerticals";
import EpisodeDetailPage from "./pages/EpisodeDetailPage";
import EspionageDashboard from "./pages/EspionageDashboard";
import Explore from "./pages/Explore";
import FanSubscribe from "./pages/FanSubscribe";
import FlyerComposer from "./pages/FlyerComposer";
import FlyerDesignStudio from "./pages/FlyerDesignStudio";
import FlyerGenerator from "./pages/FlyerGenerator";
import FollowListPage from "./pages/FollowListPage";
import FontLibrary from "./pages/FontLibrary";
import GreatestShowStudio from "./pages/GreatestShowStudio";
import HollywoodAcademy from "./pages/HollywoodAcademy";
import HollywoodChannel from "./pages/HollywoodChannel";
import HollywoodCreatorDashboard from "./pages/HollywoodCreatorDashboard";
import HollywoodEpisode from "./pages/HollywoodEpisode";
import HollywoodReplacement from "./pages/HollywoodReplacement";
import HollywoodShow from "./pages/HollywoodShow";
import HollywoodShows from "./pages/HollywoodShows";
import HollywoodStudio from "./pages/HollywoodStudio";
import ImageLab from "./pages/ImageLab";
import InfluencerDashboard from "./pages/InfluencerDashboard";
import InfluencerOnboarding from "./pages/InfluencerOnboarding";
import JoinVaultLive from "./pages/JoinVaultLive";
import KingAnalytics from "./pages/KingAnalytics";
import KingBackOffice from "./pages/KingBackOffice";
import KingCamClone from "./pages/KingCamClone";
import KingCamCommandCenter from "./pages/KingCamCommandCenter";
import KingCamDemos from "./pages/KingCamDemos";
import KingCamEmpireMap3D from "./pages/KingCamEmpireMap3D";
import KingCamEngine from "./pages/KingCamEngine";
import KingCamEpisodeTheater3D from "./pages/KingCamEpisodeTheater3D";
import KingCamGallery from "./pages/king/KingCamGallery";
import KingCamImport from "./pages/king/KingCamImport";
import KingCamScriptWriter from "./pages/KingCamScriptWriter";
import KingCamShowcase from "./pages/KingCamShowcase";
import KingCamShowreel from "./pages/KingCamShowreel";
import KingCamTours from "./pages/KingCamTours";
import KingConnectSocials from "./pages/KingConnectSocials";
import KingContent from "./pages/KingContent";
import KingEmmaOversight from "./pages/KingEmmaOversight";
import KingEmpire from "./pages/KingEmpire";
import KingGemCenter from "./pages/king/KingGemCenter";
import KingLife from "./pages/KingLife";
import KingMoneyMission from "./pages/KingMoneyMission";
import KingUsers from "./pages/KingUsers";
import KingVaultRemixEngine from "./pages/KingVaultRemixEngine";
import KingVideoLab from "./pages/KingVideoLab";
import KingWaitlist from "./pages/KingWaitlist";
import LeadCapture from "./pages/LeadCapture";
import MarkCubanAgent from "./pages/MarkCubanAgent";
import Marketplace from "./pages/Marketplace";
import MarketplaceAnalytics from "./pages/MarketplaceAnalytics";
import MarketplaceCreate from "./pages/MarketplaceCreate";
import MarketplaceManage from "./pages/MarketplaceManage";
import MarketplaceProduct from "./pages/MarketplaceProduct";
import MessageThread from "./pages/MessageThread";
import Messages from "./pages/Messages";
import MonetizationPipeline from "./pages/MonetizationPipeline";
// import { MultiPlatformPosting } from "./pages/MultiPlatformPosting"; // MERGED into SocialHub
import MusicAI from "./pages/MusicAI";
import MusicLibrary from "./pages/MusicLibrary";
  // @ts-ignore
import MyLoyaltyPortal from "./pages/MyLoyaltyPortal";
import MySubscriptions from "./pages/MySubscriptions";
import NFCCards from "./pages/NFCCards";
import Notifications from "./pages/Notifications";
import NurseConsole from "./pages/NurseConsole";
import Onboard from "./pages/Onboard";
import OnboardingV2 from "./pages/OnboardingV2";
import OperatorDashboard from "./pages/OperatorDashboard";
import OwnerCockpit from "./pages/OwnerCockpit";
import PerformanceAnalytics from "./pages/PerformanceAnalytics";
// import { PlatformConnections } from "./pages/PlatformConnections"; // MERGED into SocialHub
import PlatformWarRoom from "./pages/PlatformWarRoom";
import PodcastStudio from "./pages/PodcastStudio";
import PresentationBuilder from "./pages/PresentationBuilder";
import PresentationEmpire from "./pages/PresentationEmpire";
import PresentationEmpireCockpit from "./pages/PresentationEmpireCockpit";
import ProofGate from "./pages/ProofGate";
import ProtectedContentDemo from "./pages/ProtectedContentDemo";
import PublicProfile from "./pages/PublicProfile";
import RealEstateEmpire from "./pages/RealEstateEmpire";
import RecruitmentDashboard from "./pages/RecruitmentDashboard";
import ScriptDirectorPage from "./pages/scripttovideo/ScriptDirectorPage";
import Services from "./pages/Services";
import ShowPage from "./pages/ShowPage";
import SmartAlbum from "./pages/SmartAlbum";
import StudioSlots from "./pages/StudioSlots";
import Subscriptions from "./pages/Subscriptions";
import TelegramMoneyHub from "./pages/TelegramMoneyHub";
import ThumbnailGeneratorUI from "./pages/ThumbnailGeneratorUI";
// import UnifiedContentPublisher from "./pages/UnifiedContentPublisher"; // MERGED into SocialHub
import University from "./pages/University";
import VaultAnalytics from "./pages/VaultAnalytics";
import VaultCulture from "./pages/VaultCulture";
import VaultDrop from "./pages/VaultDrop";
import VaultGuardian from "./pages/VaultGuardian";
import VaultLiveSimple from "./pages/VaultLiveSimple";
import VaultMoment from "./pages/VaultMoment";
import VaultPass from "./pages/VaultPass";
import VaultPay from "./pages/VaultPay";
import VaultRemix from "./pages/VaultRemix";
import VaultRise from "./pages/VaultRise";
import VaultSnap from "./pages/VaultSnap";
import VaultSpaceDashboard from "./pages/VaultSpaceDashboard";
import VaultX from "./pages/VaultX";
import VideoEditor from "./pages/videoeditor/VideoEditor";
import VideoEditorProjects from "./pages/videoeditor/VideoEditorProjects";
import VideoLab from "./pages/VideoLab";
import VideoLabPro from "./pages/VideoLabPro";
import VideoProductionStudio from "./pages/VideoProductionStudio";
import VideoStudio from "./pages/VideoStudio";
import ReleaseInfo from "./pages/ReleaseInfo";
import ViralOptimizer from "./pages/tools/ViralOptimizer";
import ViralOptimizerPage from "./pages/ViralOptimizerPage";
import WhatsAppBotDashboard from "./pages/WhatsAppBotDashboard";
import WhatsAppContentGenerator from "./pages/WhatsAppContentGenerator";
// import CreatorSubscriptionTiers from "./pages/CreatorSubscriptionTiers";
// import CreatorPublicTiers from "./pages/CreatorPublicTiers";
// import ProtectedContentDemo from "./pages/ProtectedContentDemo";
// import MySubscriptions from "./pages/MySubscriptions";

// import { GuidedModeProvider } from "./contexts/GuidedModeContext";
import GettingStartedChecklist from "./components/GettingStartedChecklist";
// import KingVideoLab from "./pages/KingVideoLab";
// import KingAnalytics from "./pages/KingAnalytics";
// import KingContent from "./pages/KingContent";
// import KingWaitlist from "./pages/KingWaitlist";
// import EmpireDocPrompt from "./pages/EmpireDocPrompt";
// import EmpireBrain from "./pages/EmpireBrain";
// import EmpireBrainDashboard from "./pages/EmpireBrainDashboard";
// import EmpireBrainRules from "./pages/EmpireBrainRules";
// import EmpireState from "./pages/EmpireState";
// import AgentTracker from "./pages/AgentTracker";
// import EmpireBrainShowrunner from "./pages/EmpireBrainShowrunner";
// import ApparelLab from "./pages/ApparelLab";
// import EmmaAIAgentDashboard from "./pages/EmmaAIAgentDashboard";
// import MarkCubanAgent from "./pages/MarkCubanAgent";
// import RealEstateEmpire from "./pages/RealEstateEmpire";
// import BrandDeals from "./pages/BrandDeals";
// import NFCCards from "./pages/NFCCards";
// import Subscriptions from "./pages/Subscriptions";
// import VaultRemix from "./pages/VaultRemix";
// import VideoLab from "./pages/VideoLab";
// import VideoLabPro from "./pages/VideoLabPro";
// import VaultX from "./pages/VaultX";
// import CultureSelection from "./pages/CultureSelection";
// import ThumbnailGeneratorUI from "./pages/ThumbnailGeneratorUI";
// import VideoProductionStudio from './pages/VideoProductionStudio';
// import OnboardingV2 from "./pages/OnboardingV2";
// import CommandHubV2 from "./pages/CommandHubV2";
// import OwnerCockpit from "./pages/OwnerCockpit";
// import ChicasEmpire from "./pages/ChicasEmpire";
// import PresentationEmpire from "./pages/PresentationEmpire";
// import RecruitmentDashboard from "@/pages/RecruitmentDashboard";
// import EspionageDashboard from "./pages/EspionageDashboard";
// import AIEmpireDashboard from "@/pages/AIEmpireDashboard";
// import AppleQDashboard from "@/pages/AppleQDashboard";
// import PresentationEmpireCockpit from "./pages/PresentationEmpireCockpit";
// import EmpireCockpitV3 from './pages/EmpireCockpitV3';
// import EmpireCockpitV2 from "./pages/EmpireCockpitV2";
// import VaultMoment from "./pages/VaultMoment";
// import VaultRise from "./pages/VaultRise";
// import VaultCulture from "./pages/VaultCulture";
// import PresentationBuilder from "./pages/PresentationBuilder";
// import TelegramMoneyHub from "./pages/TelegramMoneyHub";
// import Chuuch from "./pages/Chuuch";
// import ChuuchElders from "./pages/ChuuchElders";
// import ChuuchArchive from "./pages/ChuuchArchive";
// import ChuuchTeaching from "./pages/ChuuchTeaching";
// import ChuuchMedia from "./pages/ChuuchMedia";
// import ChuuchMerch from "./pages/ChuuchMerch";
// import ChuuchTransition from "./pages/ChuuchTransition";
import ChuuchMembersPage from "./pages/ChuuchMembers";
import EmpireCockpitV3 from "./pages/EmpireCockpitV3";
import AgentApprovalInbox from "./pages/AgentApprovalInbox";
import AgentCommandTower from "./pages/AgentCommandTower";
import AlbumCoverDesigner from "./pages/AlbumCoverDesigner";
import BCBPanel from "./pages/BCBPanel";
import BotMonetizationDashboard from "./pages/BotMonetizationDashboard";
import ChicaFunnelManager from "./pages/ChicaFunnelManager";
import CloneEmpire from "./pages/CloneEmpire";
import CloneRenderStudio from "./pages/CloneRenderStudio";
import ComponentShowcase from "./pages/ComponentShowcase";
import CreatorProfilePage from "./pages/CreatorProfilePage";
import CreatorVaultAyiti from "./pages/CreatorVaultAyiti";
import DelbaniaPanel from "./pages/DelbaniaPanel";
import Demos from "./pages/Demos";
import EmmaReset from "./pages/EmmaReset";
import EmmaResetSuccess from "./pages/EmmaResetSuccess";
import FlyerStudio from "./pages/FlyerStudio";
import FunnelForge from "./pages/FunnelForge";
import HaitianSector from "./pages/HaitianSector";
import KingCamVault from "./pages/KingCamVault";
import LipSyncStudio from "./pages/LipSyncStudio";
import MarielkaDashboard from "./pages/MarielkaDashboard";
import MediaHubPage from "./pages/MediaHubPage";
import MotionFlyerAgent from "./pages/MotionFlyerAgent";
import MusicCoverStudio from "./pages/MusicCoverStudio";
import MusicLibraryAgent from "./pages/MusicLibraryAgent";
import OAuthSocialCallback from "./pages/OAuthSocialCallback";
import OpsStatusPage from "./pages/OpsStatusPage";
import Podcasting from "./pages/Podcasting";
import RealGPTDashboard from "./pages/RealGPTDashboard";
import Shop from "./pages/Shop";
// import SocialAutoposterAgent from "./pages/SocialAutoposterAgent"; // MERGED into SocialHub
import SocialHub from "./pages/SocialHub";
import OutreachCommandCenter from "./pages/OutreachCommandCenter";
import VaultXChallenges from "./pages/VaultXChallenges";
import ForYouFeed from "./pages/ForYouFeed";
import VaultXFanLibrary from "./pages/VaultXFanLibrary";
import AIChatter from "./pages/AIChatter";
// SocialFactory, SocialPostingHub, PlatformWarRoom, KingConnectSocials, SocialMediaAudit — MERGED into SocialHub tabs
// import SocialFactory from "./pages/SocialFactory";
// import SocialPostingHub from "./pages/SocialPostingHub";
import SpatialComposer from "./pages/SpatialComposer";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import TestCheckout from "./pages/TestCheckout";
import UniversityEnrollSuccess from "./pages/UniversityEnrollSuccess";
import VaultCut from "./pages/VaultCut";
import VaultLiveControlRoom from "./pages/VaultLiveControlRoom";
import VaultLiveStream from "./pages/VaultLiveStream";
import VaultMarket from "./pages/VaultMarket";
import VaultXOnboarding from "./pages/VaultXOnboarding";
import VaultXStudio from "./pages/VaultXStudio";
import VaultXDistribution from "@/pages/VaultXDistribution";
import VaultXEditor from "./pages/VaultXEditor";
import VaultXAnalytics from "./pages/VaultXAnalytics";
import VideoOS from "./pages/VideoOS";
import Waitlist from "./pages/Waitlist";
import LirysMissedRevenue from "./pages/greatest-show/LirysMissedRevenue";
import MarielkaProfile from "./pages/greatest-show/MarielkaProfile";
import SubscribeSuccess from "./pages/greatest-show/SubscribeSuccess";
import CloneCommand from "./pages/king/CloneCommand";
import CloneStudio from "./pages/king/CloneStudio";
import CloneTrainingLab from "./pages/king/CloneTrainingLab";
import MediaVault from "./pages/king/MediaVault";
import ChallengeStoryEngine from "./pages/king/ChallengeStoryEngine";
import ViralOptimizerV2 from "./pages/tools/ViralOptimizerV2";
// import ChuuchCode from "./pages/ChuuchCode";
// import ChuuchEvents from "./pages/ChuuchEvents";
// import ShowPage from "./pages/ShowPage";
// import EpisodeDetailPage from "./pages/EpisodeDetailPage";
// import HollywoodShows from './pages/HollywoodShows';
// import HollywoodCreatorDashboard from './pages/HollywoodCreatorDashboard';
// import HollywoodStudio from './pages/HollywoodStudio';
// import HollywoodAcademy from './pages/HollywoodAcademy';
// import HollywoodChannel from './pages/HollywoodChannel';
// import HollywoodShow from './pages/HollywoodShow';
// import HollywoodEpisode from './pages/HollywoodEpisode';
// import CreatorVaultDominicana from './pages/CreatorVaultDominicana';
// import OperatorDashboard from "./pages/OperatorDashboard";
// import KingCamCommandCenter from "./pages/KingCamCommandCenter";
// import KingCamEpisodeTheater3D from "./pages/KingCamEpisodeTheater3D";
// import KingCamEmpireMap3D from "./pages/KingCamEmpireMap3D";
// import KingConnectSocials from "./pages/KingConnectSocials";
// import KingVaultRemixEngine from "./pages/KingVaultRemixEngine";
function Router() {
  const [location] = useLocation();
  const authPages = ["/login", "/register", "/signup"];
  const isAuthPage = authPages.some(p => location === p || location.startsWith(p + "?"));
  return (
    <>
      <AppHeader />
      <div className={isAuthPage ? "" : "pt-16"}>
        <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/__release"} component={ReleaseInfo} />
      <Route path={"/login"} component={Login} />
      <Route path={"/register"} component={Register} />
      <Route path={"/dashboard"} component={CreatorHome} />
      <Route path={"/operator"} component={OperatorDashboard} />
      <Route path={"/flyer-generator"} component={FlyerGenerator} />
      <Route path={"/animated-flyer-studio"} component={AnimatedFlyerStudio} />
      <Route path={"/image-lab"} component={ImageLab} />
      <Route path={"/flyer-composer"} component={FlyerComposer} />
      <Route path={"/flyer-design-studio"} component={FlyerDesignStudio} />
      <Route path={"/dayshift-doctor"} component={DayShiftDoctor} />
      <Route path={"/nurse"} component={NurseConsole} />
      <Route path={"/design-department"} component={DesignDepartment} />
      <Route path={"/whatsapp-content"} component={WhatsAppContentGenerator} />
      <Route path={"/king/whatsapp-bot"} component={WhatsAppBotDashboard} />
      <Route path={"/studio-slots"} component={StudioSlots} />
      <Route path={"/content-dashboard"} component={ContentDashboard} />
      <Route path={"/monetization"} component={MonetizationPipeline} />
      <Route path={"/lead-capture"} component={LeadCapture} />
      <Route path={"/analytics"} component={PerformanceAnalytics} />
      <Route path={"/marketplace"} component={Marketplace} />
      <Route path={"/marketplace/create"} component={MarketplaceCreate} />
      <Route path={"/marketplace/manage"} component={MarketplaceManage} />
      <Route path={"/marketplace/analytics/:productId"} component={MarketplaceAnalytics} />
      <Route path={"/marketplace/:productId"} component={MarketplaceProduct} />
      <Route path={"/university"} component={University} />
      <Route path={"/learn"} component={KingCamShowreel} />
      <Route path={"/king/script-writer"} component={KingCamScriptWriter} />
      <Route path={"/king/engine"} component={KingCamEngine} />
      <Route path={"/emma-university"} component={EmmaUniversity} />
      <Route path={"/services"} component={Services} />
      <Route path={"/creator/subscription-tiers"} component={CreatorSubscriptionTiers} />
      <Route path={"/creator/:creatorId/tiers"} component={CreatorPublicTiers} />
      <Route path={"/creator/:creatorId/protected-demo"} component={ProtectedContentDemo} />
      <Route path={"/my-subscriptions"} component={MySubscriptions} />
      <Route path={"/creator"} component={CreatorDashboard} />
      <Route path={"/creator/tools"} component={CreatorTools} />
      <Route path={"/creator/toolbox"} component={CreatorToolbox} />
      <Route path={"/creator-toolbox"} component={CreatorToolbox} />
      <Route path={"/creator/video-studio"} component={CreatorVideoStudio} />
      <Route path={"/creator/subscriptions"} component={CreatorSubscriptions} />
      <Route path={"/creator/earnings"} component={CreatorEarnings} />
      <Route path={"/creator/analytics"} component={CreatorAnalyticsDashboard} />
       <Route path={"/creator-analytics"} component={CreatorAnalyticsDashboard} />
      <Route path={"/tools/viral-optimizer"} component={ViralOptimizer} />
      <Route path={"/ai-bot"} component={AIBot} />
      <Route path={"/adult-sales-bot"} component={AdultSalesBot} />
      <Route path={"/creator-management"} component={CreatorManagement} />
      <Route path={"/command-hub"} component={CommandHub} />
      <Route path={"/command-center"} component={CommandHub} />
      <Route path={"/onboard"} component={Onboard} />
      <Route path={"/onboard/influencer"} component={InfluencerOnboarding} />
      <Route path={"/onboard/creator"} component={CreatorOnboarding} />
      <Route path={"/influencer"} component={InfluencerDashboard} />
      <Route path="/social-hub" component={SocialHub} />
      <Route path="/outreach" component={OutreachCommandCenter} />
      <Route path="/vaultx-challenges" component={VaultXChallenges} />
      <Route path="/challenges" component={ChallengeStoryEngine} />
      <Route path="/for-you" component={ForYouFeed} />
      <Route path="/ai-chatter" component={AIChatter} />



      <Route path={"/vaultlive"} component={VaultLiveSimple} />
      <Route path={"/vault-live"} component={VaultLiveSimple} />
      <Route path={"/live"} component={BrowseLive} />
      <Route path={"/stream/:id"} component={StreamView} />
      <Route path={"/join-vaultlive"} component={JoinVaultLive} />
      <Route path={"/control-room"} component={ControlRoom} />
      <Route path={"/subscribe/:creatorId"} component={FanSubscribe} />
      <Route path={"/emma"} component={EmmaHome} />
      <Route path={"/emma-empire"} component={EmmaEmpire} />
      <Route path="/chica" component={ChicaCockpit} />
      <Route path={"/emma/reset-dashboard"} component={EmmaResetDashboard} />
      <Route path={"/emma/reset"} component={EmmaSimpleView} />
      <Route path={"/emma/network"} component={EmmaNetworkHome} />
      <Route path={"/king"} component={KingHome} />
          <Route path="/king/gem-center" component={KingGemCenter} />
      <Route path={"/king/users"} component={KingUsers} />
      <Route path={"/king/demos"} component={KingCamDemos} />
      <Route path={"/king/presentation-builder"} component={PresentationBuilder} />
      <Route path={"/presentation-builder"} component={PresentationBuilder} />
      <Route path="/king/telegram-hub" component={TelegramMoneyHub} />
      <Route path={"/king/backoffice"} component={KingBackOffice} />
      <Route path="/king/command-center" component={KingCamCommandCenter} />
      <Route path="/king/episodes-3d" component={KingCamEpisodeTheater3D} />
      <Route path="/king/empire-3d" component={KingCamEmpireMap3D} />
      <Route path="/king/connect-socials" component={KingConnectSocials} />
      <Route path="/king/vault-remix" component={KingVaultRemixEngine} />
      <Route path="/king/empire" component={KingEmpire} />
      <Route path="/king/money-mission" component={KingMoneyMission} />
      <Route path="/king/life" component={KingLife} />
      <Route path="/agents" component={AgentRoster} />
      <Route path="/hire" component={AgentRoster} />
      <Route path={"/king/emma"} component={KingEmmaOversight} />
      <Route path={"/king/video-editor"} component={VideoEditorProjects} />
      <Route path="/king/script-director" component={ScriptDirectorPage} />
          <Route path="/king/import" component={KingCamImport} />
          <Route path="/king/gallery" component={KingCamGallery} />
      <Route path="/king/music-composer" component={MusicAI} />
      <Route path={"/music-library"} component={MusicLibrary} />
      <Route path={"/artist/storefront"} component={ArtistStorefront} />
      <Route path="/king/dubbing" component={DubbingAI} />
      <Route path="/business-cards" component={BusinessCardDesigner} />
      <Route path="/business-cards/editor" component={CardEditor} />
      <Route path="/business-cards/editor/:cardId" component={CardEditor} />
      <Route path="/business-cards/ai-designer" component={AICardDesigner} />
      <Route path="/king/hollywood-ai" component={HollywoodReplacement} />
          <Route path="/king/platform-war-room" component={PlatformWarRoom} />
          <Route path="/king/empire-verticals" component={EmpireVerticals} />
      <Route path={"/king/video-editor/:projectId"} component={VideoEditor} />
      <Route path={"/vault-pay"} component={VaultPay} />
      <Route path={"/hollywood-replacement"} component={HollywoodReplacement} />
      <Route path={"/proof-gate"} component={ProofGate} />
      <Route path={"/dominican"} component={DominicanSector} />
      <Route path={"/guia"} component={GuiaCreador} />
      <Route path={"/vault-guardian"} component={VaultGuardian} />
      <Route path={"/vault-remix"} component={VaultRemix} />
      <Route path={"/video-lab"} component={VideoLab} />
      <Route path={"/video-lab-pro"} component={VideoLabPro} />
      <Route path={"/video-studio"} component={VideoStudio} />
      <Route path={"/video-production-studio"} component={VideoProductionStudio} />
      <Route path={"/vault-x"} component={VaultX} />
      <Route path={"/culture-selection"} component={CultureSelection} />
      <Route path={"/thumbnail-generator"} component={ThumbnailGeneratorUI} />
      <Route path={"/admin/payouts"} component={AdminPayouts} />
      <Route path={"/admin/manual-payments"} component={AdminManualPayments} />
      <Route path={"/admin/tips"} component={AdminTips} />
      <Route path={"/podcast-studio"} component={PodcastStudio} />
      <Route path={"/podcasting"} component={Podcasting} />
      <Route path={"/launch-trailer-studio"} component={LaunchTrailerStudio} />
      <Route path={"/shows/:slug/episodes/:episodeId"} component={EpisodeDetailPage} />
      <Route path={"/shows/:slug"} component={ShowPage} />
      {/* /social-audit merged into SocialHub */}
      <Route path={"/performance-insights"} component={PerformanceInsights} />
      <Route path={"/live-demo"} component={LiveDemoControl} />
      <Route path={"/recruiter"} component={RecruiterDashboard} />
      <Route path={"/payout-setup"} component={PayoutSetup} />
      <Route path={"/telegram-setup"} component={TelegramSetup} />
      <Route path={"/owner-control"} component={OwnerControl} />
      <Route path={"/owner-status"} component={OwnerStatus} />
      <Route path={"/greatest-show"} component={GreatestShowLanding} />
      <Route path={"/greatest-show-studio"} component={GreatestShowStudio} />
      <Route path={"/greatest-show/maily"} component={MailyProfile} />
      <Route path={"/greatest-show/diana"} component={DianaProfile} />
      <Route path={"/greatest-show/emma"} component={EmmaProfile} />
      <Route path={"/greatest-show/thebiggestb"} component={TheBiggestBProfile} />
          <Route path={"/greatest-show/delbania"} component={DelBaniaProfile} />
          <Route path={"/greatest-show/aderly"} component={AderlyProfile} />
      <Route path={"/greatest-show/canisha"} component={CanishaProfile} />
      <Route path={"/greatest-show/luvroxie"} component={LuvRoxieProfile} />
      <Route path={"/greatest-show/lirys"} component={LirysProfile} />
      <Route path={"/greatest-show/leslie"} component={LeslieProfile} />
      <Route path={"/greatest-show/fitness"} component={FitnessGoddesses} />
      <Route path={"/greatest-show/pole"} component={PoleArtists} />
      <Route path={"/greatest-show/lifestyle"} component={LifestyleGoddesses} />
      <Route path={"/greatest-show/dance"} component={EliteDancers} />
      <Route path={"/greatest-show/adult"} component={AdultContent} />
      <Route path={"/greatest-show/apply"} component={CreatorApplication} />
      <Route path={"/greatest-show/subscribe"} component={FanSubscription} />
      <Route path={"/king/flyer-generator"} component={FlyerGenerator} />
      <Route path={"/king/flyer-design-studio"} component={FlyerDesignStudio} />
      <Route path={"/king/video-lab"} component={KingVideoLab} />
      <Route path={"/king/analytics"} component={KingAnalytics} />
      <Route path={"/king/content"} component={KingContent} />
      <Route path={"/king/waitlist"} component={KingWaitlist} />
      {/* <Route path={"/king/launch-command"} component={LaunchCommand} /> */}
      <Route path="/king/empire-doc" component={EmpireDocPrompt} />
      <Route path={"/nfc-cards"} component={NFCCards} />
      <Route path={"/empire-brain"} component={EmpireBrain} />
      <Route path={"/empire-brain-dashboard"} component={EmpireBrainDashboard} />
      <Route path={"/empire-brain-rules"} component={EmpireBrainRules} />
      <Route path={"/empire-state"} component={EmpireState} />
      <Route path={"/agent-tracker"} component={AgentTracker} />
      <Route path={"/emma-ai-agents"} component={EmmaAIAgentDashboard} />
      <Route path={"/empire-brain-showrunner"} component={EmpireBrainShowrunner} />
      <Route path={"/apparel-lab"} component={ApparelLab} />
      <Route path={"/king/emma"} component={EmmaNetworkHome} />
      <Route path={"/mark-cuban-agent"} component={MarkCubanAgent} />
      <Route path={"/real-estate-empire"} component={RealEstateEmpire} />
      <Route path={"/viral-optimizer"} component={ViralOptimizerPage} />
      <Route path={"/vertical-pack"} component={VerticalPackLauncher} />
      <Route path={"/brand-deals"} component={BrandDeals} />
      <Route path={"/subscriptions"} component={Subscriptions} />
      {/* <Route path={"/feed"} component={FeedPage} /> */}
      <Route path={"/explore"} component={Explore} />
      <Route path={"/profile/edit"} component={EditProfile} />
      <Route path={"/profile/:username"} component={PublicProfile} />
      <Route path="/follow-list/:userId/:type" component={FollowListPage} />
      <Route path={"/notifications"} component={Notifications} />
      <Route path={"/messages"} component={Messages} />
      <Route path={"/messages/:conversationId"} component={MessageThread} />
      <Route path={"/onboarding"} component={OnboardingV2} />
      <Route path={"/command-hub-v2"} component={CommandHubV2} />
      <Route path={"/owner-cockpit"} component={OwnerCockpit} />
      <Route path={"/owner-cockpit/chicas-empire"} component={ChicasEmpire} />
      <Route path={"/presentation-empire"} component={PresentationEmpire} />
      <Route path={"/owner-cockpit/presentation-empire"} component={PresentationEmpireCockpit} />
      <Route path={"/owner-cockpit/recruitment"} component={RecruitmentDashboard} />
      <Route path={"/owner-cockpit/espionage"} component={EspionageDashboard} />
      <Route path={"/owner-cockpit/ai-empire"} component={AIEmpireDashboard} />
      <Route path={"/owner-cockpit/apple-queue"} component={AppleQDashboard} />
      <Route path="/empire-cockpit-v3" component={EmpireCockpitV3} />
              <Route path="/empire-cockpit-v2" component={EmpireCockpitV2} />
      <Route path={"/kingcam-clone"} component={KingCamClone} />
      <Route path={"/kingcam-demos"} component={KingCamDemos} />
      <Route path={"/kingcam-tours"} component={KingCamTours} />
      <Route path={"/kingcam-showcase"} component={KingCamShowcase} />
      <Route path={"/smart-album"} component={SmartAlbum} />
      <Route path={"/vault-snap"} component={VaultSnap} />
      <Route path={"/vault-pass"} component={VaultPass} />
      <Route path={"/vault-drop"} component={VaultDrop} />
      <Route path={"/vault-analytics"} component={VaultAnalytics} />
       <Route path={"/vaultspace-dashboard"} component={VaultSpaceDashboard} />
      <Route path={"/vault-moment"} component={VaultMoment} />
      <Route path={"/vault-rise"} component={VaultRise} />
      <Route path={"/vault-culture"} component={VaultCulture} />
      <Route path="/hollywood-shows" component={HollywoodShows} />
      <Route path="/hollywood-creator-dashboard" component={HollywoodCreatorDashboard} />
      <Route path="/hollywood-studio" component={HollywoodStudio} />
      <Route path="/hollywood-academy" component={HollywoodAcademy} />
      <Route path="/hollywood/channel/:creatorId" component={HollywoodChannel} />
      <Route path="/hollywood/episode/:episodeId" component={HollywoodEpisode} />
      <Route path="/hollywood/:slug" component={HollywoodShow} />
      <Route path={"/font-library"} component={FontLibrary} />
            <Route path={"/recruiter-dashboard"} component={RecruiterDashboard} />
            <Route path={"/dominicana"} component={CreatorVaultDominicana} />
      <Route path="/chuuch" component={Chuuch} />
      <Route path="/chuuch/elders/:slug" component={ChuuchElders} />
      <Route path="/chuuch/elders" component={ChuuchElders} />
      <Route path="/chuuch/archive/:slug" component={ChuuchArchive} />
      <Route path="/chuuch/archive" component={ChuuchArchive} />
      <Route path="/chuuch/teaching/:slug" component={ChuuchTeaching} />
      <Route path="/chuuch/teaching" component={ChuuchTeaching} />
      <Route path="/chuuch/media" component={ChuuchMedia} />
      <Route path="/chuuch/merch" component={ChuuchMerch} />
      <Route path="/chuuch/transition" component={ChuuchTransition} />
      {/* <Route path="/chuuch/members" component={ChuuchMembersPage} /> */}
      <Route path="/chuuch/code" component={ChuuchCode} />
      <Route path="/chuuch/events" component={ChuuchEvents} />
        <Route path="/loyalty-command" component={ChicaLoyaltyCommand} />
        <Route path="/my-loyalty" component={MyLoyaltyPortal} />
      <Route path="/agents/approvals" component={AgentApprovalInbox} />
      <Route path="/agents/command-tower" component={AgentCommandTower} />
      <Route path="/music/album-cover" component={AlbumCoverDesigner} />
      <Route path="/mi-panel/bcb-panel" component={BCBPanel} />
      <Route path="/bots/monetization" component={BotMonetizationDashboard} />
      <Route path="/chica/funnels" component={ChicaFunnelManager} />
      <Route path="/clone-empire-home" component={CloneEmpire} />
      <Route path="/clone/render-studio" component={CloneRenderStudio} />
      <Route path="/_dev/components" component={ComponentShowcase} />
      <Route path="/creator/profile-page" component={CreatorProfilePage} />
      <Route path="/vault-ayiti" component={CreatorVaultAyiti} />
      <Route path="/mi-panel/delbania-panel" component={DelbaniaPanel} />
      <Route path="/demos-home" component={Demos} />
      <Route path="/emma/reset-home" component={EmmaReset} />
      <Route path="/emma/reset-success" component={EmmaResetSuccess} />
      <Route path="/flyer-studio-v2" component={FlyerStudio} />
      <Route path="/funnels" component={FunnelForge} />
      <Route path="/sector/haiti" component={HaitianSector} />
      <Route path="/kingcam/vault" component={KingCamVault} />
      <Route path="/studio/lipsync" component={LipSyncStudio} />
      <Route path="/mi-panel/marielka-dashboard" component={MarielkaDashboard} />
      <Route path="/media/hub" component={MediaHubPage} />
      <Route path="/agents/motion-flyer-agent" component={MotionFlyerAgent} />
      <Route path="/music/cover-studio" component={MusicCoverStudio} />
      <Route path="/agents/music-library-agent" component={MusicLibraryAgent} />
      <Route path="/oauth/social/callback" component={OAuthSocialCallback} />
      <Route path="/ops/status" component={OpsStatusPage} />
      <Route path="/podcasting-home" component={Podcasting} />
      <Route path="/realgpt/dashboard" component={RealGPTDashboard} />
      <Route path="/shop" component={Shop} />
      {/* social-autoposter-agent, factory, posting-hub merged into /social-hub */}
      <Route path="/social/factory" component={SocialHub} />
      <Route path="/social/posting-hub" component={SocialHub} />
      <Route path="/tools/spatial-composer" component={SpatialComposer} />
      <Route path="/subscription/success" component={SubscriptionSuccess} />
      <Route path="/_dev/test-checkout" component={TestCheckout} />
      <Route path="/university/enroll-success" component={UniversityEnrollSuccess} />
      <Route path="/vault/cut" component={VaultCut} />
      <Route path="/vaultlive/control-room" component={VaultLiveControlRoom} />
      <Route path="/vaultlive/stream" component={VaultLiveStream} />
      <Route path="/vault-market-home" component={VaultMarket} />
      <Route path="/vaultx/onboarding" component={VaultXOnboarding} />
      <Route path="/vaultx/studio" component={VaultXStudio} />
      <Route path="/vaultx/distribution" component={VaultXDistribution} />
      <Route path="/vault-x/studio" component={VaultXStudio} />
      <Route path="/vault-x/editor" component={VaultXEditor} />
      <Route path="/vault-x/analytics" component={VaultXAnalytics} />
      <Route path="/vault-x/fan-library" component={VaultXFanLibrary} />
      <Route path="/vaultx/video-editor/:projectId">{() => { window.location.replace("/vault-x/editor"); return null; }}</Route>
      <Route path="/vaultx/video-editor">{() => { window.location.replace("/vault-x/editor"); return null; }}</Route>
      {/* Redirect aliases for OwnerCockpit and legacy links */}
      <Route path="/vaultx" component={VaultX} />
      <Route path="/vaultx-video-editor">{() => { window.location.replace("/vaultx/studio"); return null; }}</Route>
      <Route path="/video-os" component={VideoOS} />
      <Route path="/waitlist" component={Waitlist} />
      <Route path="/greatest-show/lirys-missed-revenue" component={LirysMissedRevenue} />
      <Route path="/greatest-show/marielka-profile" component={MarielkaProfile} />
      <Route path="/greatest-show/subscribe-success" component={SubscribeSuccess} />
      <Route path="/king/clone-command" component={CloneCommand} />
      <Route path="/king/clone-studio" component={CloneStudio} />
      <Route path="/king/clone-training-lab" component={CloneTrainingLab} />
      <Route path="/king/media-vault" component={MediaVault} />
      <Route path="/king/challenge-story" component={ChallengeStoryEngine} />
      <Route path="/tools/viral-optimizer-v2" component={ViralOptimizerV2} />
      <Route path="/videoeditor/vaultx">{() => { window.location.replace("/vault-x/editor"); return null; }}</Route>
      <Route path="/videoeditor/vaultx-projects">{() => { window.location.replace("/vault-x/editor"); return null; }}</Route>
      <Route component={NotFound} />
      </Switch>
      </div>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
      >
        <TooltipProvider>
          <AuthProvider>
            <CreatorModeProvider>
              <Router />
            </CreatorModeProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
