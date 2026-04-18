import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

// ─── ROUTE CONFIG ────────────────────────────────────────────────────────────
// Every front-end route from App.tsx, categorized and annotated
const ROUTES: RouteEntry[] = [
  // CORE
  { path: "/dashboard", label: "Dashboard", category: "Core", type: "Page", status: "Live", access: "Creator" },
  { path: "/creator", label: "Creator Home", category: "Core", type: "Page", status: "Live", access: "Creator" },
  { path: "/login", label: "Login", category: "Core", type: "Page", status: "Live", access: "Public" },
  { path: "/register", label: "Register", category: "Core", type: "Page", status: "Live", access: "Public" },
  { path: "/onboard", label: "Onboarding V2", category: "Core", type: "Page", status: "Live", access: "Creator" },
  { path: "/onboarding", label: "Onboarding (Legacy)", category: "Core", type: "Page", status: "Live", access: "Creator" },
  { path: "/settings", label: "Settings", category: "Core", type: "Page", status: "Live", access: "Creator" },
  { path: "/profile/edit", label: "Edit Profile", category: "Core", type: "Page", status: "Live", access: "Creator" },
  { path: "/notifications", label: "Notifications", category: "Core", type: "Page", status: "Live", access: "Creator" },
  { path: "/messages", label: "Messages", category: "Core", type: "Page", status: "Live", access: "Creator" },
  { path: "/feed", label: "Feed", category: "Core", type: "Page", status: "Live", access: "Creator" },
  { path: "/explore", label: "Explore", category: "Core", type: "Page", status: "Live", access: "Public" },

  // OWNER TOOLS
  { path: "/owner-cockpit", label: "Owner Cockpit", category: "Owner Tools", type: "Page", status: "Live", access: "Owner" },
  { path: "/owner-control", label: "Owner Control", category: "Owner Tools", type: "Page", status: "Live", access: "Owner" },
  { path: "/owner-status", label: "Owner Status", category: "Owner Tools", type: "Page", status: "Live", access: "Owner" },
  { path: "/king", label: "King Home", category: "Owner Tools", type: "Page", status: "Live", access: "Owner" },
  { path: "/king/backoffice", label: "KingCam Back Office", category: "Owner Tools", type: "Page", status: "Live", access: "Owner" },
  { path: "/king/analytics", label: "King Analytics", category: "Owner Tools", type: "Page", status: "Live", access: "Owner" },
  { path: "/king/users", label: "User Management", category: "Owner Tools", type: "Page", status: "Live", access: "Owner" },
  { path: "/king/content", label: "Content Management", category: "Owner Tools", type: "Page", status: "Live", access: "Owner" },
  { path: "/king/waitlist", label: "Waitlist Manager", category: "Owner Tools", type: "Page", status: "Live", access: "Owner" },
  { path: "/king/demos", label: "King Demos", category: "Owner Tools", type: "Page", status: "Live", access: "Owner" },
  { path: "/king/emma", label: "Emma Oversight", category: "Owner Tools", type: "Page", status: "Live", access: "Owner" },
  { path: "/king/empire", label: "Empire Command", category: "Owner Tools", type: "Page", status: "Live", access: "Owner" },
  { path: "/agents", label: "Agent Roster (Public)", category: "Owner Tools", type: "Page", status: "Live", access: "Owner" },
  { path: "/king/life", label: "Life Mission Board", category: "Owner Tools", type: "Page", status: "Live", access: "Owner" },
  { path: "/command-hub", label: "Command Hub", category: "Owner Tools", type: "Page", status: "Live", access: "Owner" },
  { path: "/command-hub-v2", label: "Command Hub V2", category: "Owner Tools", type: "Page", status: "Live", access: "Owner" },
  { path: "/control-room", label: "Control Room", category: "Owner Tools", type: "Page", status: "Live", access: "Owner" },
  { path: "/admin/manual-payments", label: "Manual Payments", category: "Owner Tools", type: "Page", status: "Live", access: "Owner" },
  { path: "/admin/payouts", label: "Admin Payouts", category: "Owner Tools", type: "Page", status: "Live", access: "Owner" },
  { path: "/admin/tips", label: "Admin Tips", category: "Owner Tools", type: "Page", status: "Live", access: "Owner" },
  { path: "/kingcam-clone", label: "KingCam Clone", category: "Owner Tools", type: "Page", status: "Live", access: "Owner" },
  { path: "/kingcam-vault", label: "KingCam Vault (Credentials)", category: "Owner Tools", type: "Page", status: "Live", access: "Owner" },
  { path: "/kingcam-showcase", label: "KingCam Showcase", category: "Owner Tools", type: "Page", status: "Live", access: "Owner" },
  { path: "/proof-gate", label: "Proof Gate", category: "Owner Tools", type: "Page", status: "Live", access: "Owner" },
  { path: "/live-demo", label: "Live Demo", category: "Owner Tools", type: "Page", status: "Live", access: "Owner" },

  // EMMA SYSTEM
  { path: "/emma/reset", label: "Emma Simple View", category: "Emma", type: "Page", status: "Live", access: "Emma" },
  { path: "/emma/reset-dashboard", label: "Emma Reset Dashboard", category: "Emma", type: "Page", status: "Live", access: "Emma" },
  { path: "/emma-university", label: "Emma University (Private)", category: "Emma", type: "Page", status: "Live", access: "Emma" },
  { path: "/emma", label: "Emma Home", category: "Emma", type: "Page", status: "Live", access: "Emma" },
  { path: "/emma/network", label: "Emma Network", category: "Emma", type: "Page", status: "Live", access: "Emma" },
  { path: "/emma-ai-agents", label: "Emma AI Agents", category: "Emma", type: "Page", status: "Live", access: "Emma" },

  // UNIVERSITY
  { path: "/university", label: "VaultU -- Course Catalog", category: "University", type: "Page", status: "Live", access: "Creator" },
  { path: "/dominican", label: "Dominican Recruiting", category: "University", type: "Page", status: "Live", access: "Public" },
  { path: "/recruiter", label: "Recruiter Page", category: "University", type: "Page", status: "Live", access: "Public" },
  { path: "/guia", label: "Guia (Spanish Guide)", category: "University", type: "Page", status: "Live", access: "Public" },

  // VIDEO TOOLS
  { path: "/video-lab", label: "Video Lab", category: "Video", type: "Page", status: "Live", access: "Creator" },
  { path: "/video-lab-pro", label: "Video Lab Pro", category: "Video", type: "Page", status: "Live", access: "Creator" },
  { path: "/king/video-lab", label: "King Video Lab", category: "Video", type: "Page", status: "Live", access: "Owner" },
  { path: "/king/video-editor", label: "King Video Editor", category: "Video", type: "Page", status: "Live", access: "Owner" },
  { path: "/creator/video-studio", label: "Creator Video Studio", category: "Video", type: "Page", status: "Live", access: "Creator" },
  { path: "/video-production-studio", label: "Video Production Studio", category: "Video", type: "Page", status: "Live", access: "Creator" },
  { path: "/greatest-show", label: "Greatest Show Studio", category: "Video", type: "Page", status: "Live", access: "Creator" },
  { path: "/creator-management", label: "Creator Management", category: "Adult", type: "Page", status: "Live", access: "Owner" },
   { path: "/greatest-show-studio", label: "Greatest Show Studio V2", category: "Video", type: "Page", status: "Live", access: "Creator" },
  { path: "/vault-remix", label: "Vault Remix", category: "Video", type: "Page", status: "Live", access: "Creator" },
  { path: "/thumbnail-generator", label: "Thumbnail Generator", category: "Video", type: "Page", status: "Live", access: "Creator" },
  { path: "/king/dubbing", label: "Dubbing AI", category: "Video", type: "Page", status: "Live", access: "Owner" },
  { path: "/king/script-director", label: "Script Director", category: "Video", type: "Page", status: "Live", access: "Owner" },
  { path: "/king/hollywood-ai", label: "Hollywood AI", category: "Video", type: "Page", status: "Live", access: "Owner" },
  { path: "/hollywood-replacement", label: "Hollywood Replacement V2", category: "Video", type: "Page", status: "Live", access: "Creator" },
  { path: "/studio-slots", label: "Studio Slots", category: "Video", type: "Page", status: "Live", access: "Creator" },

  // SOCIAL & PUBLISHING
  { path: "/multi-platform-posting", label: "Multi-Platform Posting", category: "Social", type: "Page", status: "Live", access: "Creator" },
  { path: "/content-scheduler", label: "Content Scheduler", category: "Social", type: "Page", status: "Live", access: "Creator" },
  { path: "/platform-connections", label: "Platform Connections (OAuth)", category: "Social", type: "Page", status: "Live", access: "Creator" },
  { path: "/unified-publisher", label: "Unified Publisher", category: "Social", type: "Page", status: "Live", access: "Creator" },
  { path: "/content-dashboard", label: "Content Dashboard", category: "Social", type: "Page", status: "Live", access: "Creator" },
  { path: "/social-audit", label: "Social Media Audit", category: "Social", type: "Page", status: "Live", access: "Creator" },
  { path: "/whatsapp-content", label: "WhatsApp Content", category: "Social", type: "Page", status: "Live", access: "Creator" },
  { path: "/performance-insights", label: "Performance Insights", category: "Social", type: "Page", status: "Live", access: "Creator" },

  // ANALYTICS
  { path: "/creator-analytics", label: "Creator Analytics Dashboard", category: "Analytics", type: "Page", status: "Live", access: "Creator" },
  { path: "/vault-analytics", label: "Vault Analytics", category: "Analytics", type: "Page", status: "Live", access: "Creator" },
  { path: "/creator/analytics", label: "Creator Analytics (Alt)", category: "Analytics", type: "Page", status: "Live", access: "Creator" },
  { path: "/analytics", label: "Analytics", category: "Analytics", type: "Page", status: "Live", access: "Creator" },
  { path: "/agent-tracker", label: "Agent Tracker", category: "Analytics", type: "Page", status: "Live", access: "Owner" },

  // PAYMENTS & MONETIZATION
  { path: "/vaultlive", label: "VaultLive (Tipping)", category: "Payments", type: "Page", status: "Live", access: "Creator" },
  { path: "/vault-pay", label: "VaultPay", category: "Payments", type: "Page", status: "Live", access: "Creator" },
  { path: "/creator/earnings", label: "Creator Earnings", category: "Payments", type: "Page", status: "Live", access: "Creator" },
  { path: "/creator/subscriptions", label: "Creator Subscriptions", category: "Payments", type: "Page", status: "Live", access: "Creator" },
  { path: "/subscriptions", label: "Subscriptions", category: "Payments", type: "Page", status: "Live", access: "Creator" },
  { path: "/my-subscriptions", label: "My Subscriptions", category: "Payments", type: "Page", status: "Live", access: "Creator" },
  { path: "/payout-setup", label: "Payout Setup", category: "Payments", type: "Page", status: "Live", access: "Creator" },
  { path: "/monetization", label: "Monetization Hub", category: "Payments", type: "Page", status: "Live", access: "Creator" },
  { path: "/marketplace", label: "Marketplace", category: "Payments", type: "Page", status: "Live", access: "Public" },
  { path: "/marketplace/create", label: "Create Product", category: "Payments", type: "Page", status: "Live", access: "Creator" },
  { path: "/marketplace/manage", label: "Manage Products", category: "Payments", type: "Page", status: "Live", access: "Creator" },
  { path: "/brand-deals", label: "Brand Deals", category: "Payments", type: "Page", status: "Live", access: "Creator" },

  // DESIGN & FLYERS
  { path: "/flyer-generator", label: "Flyer Generator", category: "Design", type: "Page", status: "Live", access: "Creator" },
  { path: "/king/flyer-generator", label: "King Flyer Generator", category: "Design", type: "Page", status: "Live", access: "Owner" },
  { path: "/king/flyer-design-studio", label: "King Flyer Design Studio", category: "Design", type: "Page", status: "Live", access: "Owner" },
  { path: "/flyer-design-studio", label: "Flyer Design Studio", category: "Design", type: "Page", status: "Live", access: "Creator" },
  { path: "/flyer-composer", label: "Flyer Composer", category: "Design", type: "Page", status: "Live", access: "Creator" },
  { path: "/animated-flyer-studio", label: "Animated Flyer Studio", category: "Design", type: "Page", status: "Live", access: "Creator" },
  { path: "/image-lab", label: "Image Lab", category: "Design", type: "Page", status: "Live", access: "Creator" },
  { path: "/apparel-lab", label: "Apparel Lab", category: "Design", type: "Page", status: "Live", access: "Creator" },
  { path: "/business-cards", label: "Business Cards", category: "Design", type: "Page", status: "Live", access: "Creator" },
  { path: "/business-cards/ai-designer", label: "AI Business Card Designer", category: "Design", type: "Page", status: "Live", access: "Creator" },
  { path: "/nfc-cards", label: "NFC Cards", category: "Design", type: "Page", status: "Live", access: "Creator" },

  // MUSIC
  { path: "/king/music-composer", label: "Music Composer", category: "Music", type: "Page", status: "Live", access: "Owner" },
  { path: "/music-library", label: "Music Library", category: "Music", type: "Page", status: "Live", access: "Creator" },
  { path: "/artist/storefront", label: "Artist Storefront", category: "Music", type: "Page", status: "Live", access: "Creator" },
  { path: "/smart-album", label: "Smart Album", category: "Music", type: "Page", status: "Live", access: "Creator" },

  // AI AGENTS
  { path: "/mark-cuban-agent", label: "Mark Cuban Agent", category: "AI Agents", type: "Page", status: "Live", access: "Owner" },
  { path: "/empire-brain", label: "Empire Brain", category: "AI Agents", type: "Page", status: "Live", access: "Owner" },
  { path: "/empire-brain-dashboard", label: "Empire Brain Dashboard", category: "AI Agents", type: "Page", status: "Live", access: "Owner" },
  { path: "/empire-brain-rules", label: "Empire Brain Rules", category: "AI Agents", type: "Page", status: "Live", access: "Owner" },
  { path: "/empire-brain-showrunner", label: "Empire Brain Showrunner", category: "AI Agents", type: "Page", status: "Live", access: "Owner" },
  { path: "/empire-state", label: "Empire State", category: "AI Agents", type: "Page", status: "Live", access: "Owner" },
  { path: "/ai-bot", label: "AI Bot", category: "AI Agents", type: "Page", status: "Live", access: "Creator" },
  { path: "/dayshift-doctor", label: "Day Shift Doctor", category: "AI Agents", type: "Page", status: "Live", access: "Creator" },
  { path: "/real-estate-empire", label: "Real Estate Empire", category: "AI Agents", type: "Page", status: "Live", access: "Creator" },
  { path: "/adult-sales-bot", label: "Adult Sales Bot", category: "AI Agents", type: "Page", status: "Live", access: "Owner" },
  { path: "/viral-optimizer", label: "Viral Optimizer", category: "AI Agents", type: "Page", status: "Live", access: "Creator" },
  { path: "/tools/viral-optimizer", label: "Viral Optimizer (Tools)", category: "AI Agents", type: "Page", status: "Live", access: "Creator" },
  { path: "/podcast-studio", label: "Podcast Studio", category: "AI Agents", type: "Page", status: "Live", access: "Creator" },
  { path: "/shows/lions-den", label: "The Lion's Den (Show Page)", category: "Podcast OS", type: "Page", status: "Live", access: "Owner" },
  { path: "/king/podcast-os", label: "Podcast OS Dashboard", category: "Podcast OS", type: "Page", status: "Live", access: "Owner" },

  // VAULTSPACE & COMMUNITY
  { path: "/vaultspace-dashboard", label: "VaultSpace Social Feed", category: "Community", type: "Page", status: "Live", access: "Creator" },
  { path: "/vault-culture", label: "Vault Culture", category: "Community", type: "Page", status: "Live", access: "Creator" },
  { path: "/vault-drop", label: "Vault Drop", category: "Community", type: "Page", status: "Live", access: "Creator" },
  { path: "/vault-moment", label: "Vault Moment", category: "Community", type: "Page", status: "Live", access: "Creator" },
  { path: "/vault-rise", label: "Vault Rise", category: "Community", type: "Page", status: "Live", access: "Creator" },
  { path: "/vault-snap", label: "Vault Snap", category: "Community", type: "Page", status: "Live", access: "Creator" },
  { path: "/vault-x", label: "Vault X", category: "Community", type: "Page", status: "Live", access: "Creator" },
  { path: "/vault-pass", label: "Vault Pass", category: "Community", type: "Page", status: "Live", access: "Creator" },
  { path: "/vault-guardian", label: "Vault Guardian", category: "Community", type: "Page", status: "Live", access: "Owner" },
  { path: "/telegram-setup", label: "Telegram Setup", category: "Community", type: "Page", status: "Live", access: "Creator" },

  // LIVE
  { path: "/join-vaultlive", label: "Join VaultLive", category: "Live", type: "Page", status: "Live", access: "Public" },
  { path: "/live", label: "Live Stream", category: "Live", type: "Page", status: "Live", access: "Creator" },

  // GREATEST SHOW PROFILES
  { path: "/greatest-show/emma", label: "Greatest Show -- Emma", category: "Greatest Show", type: "Page", status: "Live", access: "Public" },
  { path: "/greatest-show/fitness", label: "Greatest Show -- Fitness", category: "Greatest Show", type: "Page", status: "Live", access: "Public" },
  { path: "/greatest-show/lifestyle", label: "Greatest Show -- Lifestyle", category: "Greatest Show", type: "Page", status: "Live", access: "Public" },
  { path: "/greatest-show/dance", label: "Greatest Show -- Dance", category: "Greatest Show", type: "Page", status: "Live", access: "Public" },
  { path: "/greatest-show/adult", label: "Greatest Show -- Adult", category: "Greatest Show", type: "Page", status: "Live", access: "Public" },
  { path: "/greatest-show/subscribe", label: "Greatest Show -- Subscribe", category: "Greatest Show", type: "Page", status: "Live", access: "Public" },
  { path: "/greatest-show/apply", label: "Greatest Show -- Apply", category: "Greatest Show", type: "Page", status: "Live", access: "Public" },
  { path: "/greatest-show/lirys", label: "Greatest Show -- Lirys (Chef/Host/YouTube)", category: "Greatest Show", type: "Page", status: "Live", access: "Public" },
];

// ─── API-ONLY ROUTERS ─────────────────────────────────────────────────────────
const API_ROUTERS: ApiEntry[] = [
  // AI Agents
  { key: "markCubanAgent", label: "Mark Cuban Agent", category: "AI Agents", status: "Live", description: "Outreach pitches, research, follow-up generation via LLM", access: "Owner" },
  { key: "realGPT", label: "RealGPT", category: "AI Agents", status: "Live", description: "Knowledge base, creator assistants, insights, recommendations", access: "Owner" },
  { key: "aiAffiliateOptimizer", label: "AI Affiliate Optimizer", category: "AI Agents", status: "Live", description: "Affiliate product optimization and promotion tracking", access: "Creator" },
  { key: "aiRevenueTracker", label: "AI Revenue Tracker", category: "AI Agents", status: "Live", description: "Revenue stream tracking and projections", access: "Creator" },
  { key: "aiOnboardingConcierge", label: "AI Onboarding Concierge", category: "AI Agents", status: "Live", description: "Personalized onboarding tasks and daily briefings", access: "Creator" },
  { key: "aiEmpireOrchestrator", label: "AI Empire Orchestrator", category: "AI Agents", status: "Live", description: "Multi-agent orchestration for empire building", access: "Owner" },
  { key: "aiCloneArmy", label: "AI Clone Army", category: "AI Agents", status: "Live", description: "Clone content across platforms at scale", access: "Owner" },
  { key: "aiPlatformDominator", label: "AI Platform Dominator", category: "AI Agents", status: "Live", description: "Platform growth automation", access: "Owner" },
  { key: "aiTrendProphet", label: "AI Trend Prophet", category: "AI Agents", status: "Live", description: "Trend prediction and content timing", access: "Creator" },
  { key: "aiEngagementMultiplier", label: "AI Engagement Multiplier", category: "AI Agents", status: "Live", description: "Engagement optimization across content", access: "Creator" },
  { key: "aiMonetizationHunter", label: "AI Monetization Hunter", category: "AI Agents", status: "Live", description: "Revenue opportunity discovery", access: "Creator" },
  { key: "aiScriptSurgeon", label: "AI Script Surgeon", category: "AI Agents", status: "Live", description: "Script editing and optimization", access: "Creator" },
  { key: "aiAudienceClone", label: "AI Audience Clone", category: "AI Agents", status: "Live", description: "Audience replication and targeting", access: "Creator" },
  { key: "aiContentImport", label: "AI Content Import", category: "AI Agents", status: "Live", description: "Import and repurpose content from other platforms", access: "Creator" },
  { key: "empireBrain", label: "Empire Brain", category: "AI Agents", status: "Live", description: "Central AI brain for empire decisions", access: "Owner" },
  { key: "empireBrainIntegration", label: "Empire Brain Integration", category: "AI Agents", status: "Live", description: "Integration layer for Empire Brain", access: "Owner" },
  { key: "empireState", label: "Empire State", category: "AI Agents", status: "Live", description: "Empire state management and tracking", access: "Owner" },
  { key: "realEstateEmpireAgent", label: "Real Estate Empire Agent", category: "AI Agents", status: "Live", description: "Real estate opportunity finder and analyzer", access: "Creator" },
  { key: "autoCreditRepairExecutor", label: "Auto Credit Repair", category: "AI Agents", status: "Live", description: "Automated credit repair guidance", access: "Creator" },
  { key: "autoHousingFinder", label: "Auto Housing Finder", category: "AI Agents", status: "Live", description: "Housing search automation", access: "Creator" },
  { key: "autoGrantApplicator", label: "Auto Grant Applicator", category: "AI Agents", status: "Live", description: "Grant application automation", access: "Creator" },
  { key: "mercedesAgent", label: "Mercedes Agent", category: "AI Agents", status: "Live", description: "Luxury lifestyle and vehicle guidance agent", access: "Creator" },
  { key: "cloneSuccessSystem", label: "Clone Success System", category: "AI Agents", status: "Live", description: "Success pattern cloning and replication", access: "Owner" },
  { key: "missionControl", label: "Mission Control", category: "AI Agents", status: "Live", description: "Central mission and goal tracking", access: "Owner" },
  { key: "orchestrator", label: "Orchestrator", category: "AI Agents", status: "Live", description: "Multi-router orchestration layer", access: "Owner" },

  // Emma System
  { key: "emmaLeads", label: "Emma Leads", category: "Emma", status: "Live", description: "Lead capture, stage tracking, message queue, stats", access: "Emma" },
  { key: "emmaDashboard", label: "Emma Dashboard", category: "Emma", status: "Live", description: "Stats by period (today/week/month/all)", access: "Emma" },
  { key: "emmaPayments", label: "Emma Payments", category: "Emma", status: "Live", description: "Payment links, mark paid, revenue tracking", access: "Emma" },
  { key: "emmaContent", label: "Emma Content", category: "Emma", status: "Live", description: "Content management for Emma's programs", access: "Emma" },
  { key: "emmaNetwork", label: "Emma Network", category: "Emma", status: "Live", description: "Emma's network and referral tracking", access: "Emma" },
  { key: "emmaOs", label: "Emma OS", category: "Emma", status: "Live", description: "Emma operating system procedures", access: "Emma" },
  { key: "telegramBot", label: "Telegram Bot", category: "Emma", status: "Live", description: "RESET trigger, lead capture, message sending", access: "Owner" },
  { key: "telegramWebhook", label: "Telegram Webhook", category: "Emma", status: "Live", description: "Incoming Telegram message handler", access: "Owner" },

  // University
  { key: "university", label: "University (Legacy)", category: "University", status: "Live", description: "Course catalog, enrollment, progress", access: "Creator" },
  { key: "vaultu", label: "VaultU", category: "University", status: "Live", description: "VaultU course system with tracks", access: "Creator" },
  { key: "universityV2", label: "University V2", category: "University", status: "Live", description: "Module-based course system with Emma access control", access: "Creator" },

  // Video
  { key: "videoLab", label: "Video Lab", category: "Video", status: "Live", description: "Video ingestion, processing, variant generation", access: "Creator" },
  { key: "videoLabPro", label: "Video Lab Pro", category: "Video", status: "Live", description: "Pro video processing pipeline", access: "Creator" },
  { key: "videoEditor", label: "Video Editor", category: "Video", status: "Live", description: "Video editing projects and scenes", access: "Owner" },
  { key: "videoProcessing", label: "Video Processing", category: "Video", status: "Live", description: "Platform variant creation (9:16, 1:1, 16:9)", access: "Creator" },
  { key: "vaultRemix", label: "Vault Remix", category: "Video", status: "Live", description: "Content remixing and repurposing", access: "Creator" },
  { key: "scriptToVideo", label: "Script to Video", category: "Video", status: "Live", description: "Script-based video generation", access: "Creator" },
  { key: "storiesCompilation", label: "Stories Compilation", category: "Video", status: "Live", description: "Stories compilation and packaging", access: "Creator" },
  { key: "dubbingAI", label: "Dubbing AI", category: "Video", status: "Live", description: "AI dubbing and voice translation", access: "Owner" },
  { key: "thumbnailGenerator", label: "Thumbnail Generator", category: "Video", status: "Live", description: "AI thumbnail generation and CTR prediction", access: "Creator" },
  { key: "smartCaptions", label: "Smart Captions", category: "Video", status: "Live", description: "AI captions with brand style learning", access: "Creator" },
  { key: "greatestShowStudio", label: "Greatest Show Studio", category: "Video", status: "Live", description: "Full video pipeline with VideoLab + VaultRemix", access: "Creator" },
  { key: "hollywoodReplacement", label: "Hollywood Replacement V2", category: "Video", status: "Live", description: "12 procedures for Hollywood-quality production", access: "Creator" },
  { key: "collabAI", label: "Collab AI", category: "Video", status: "Live", description: "AI collaboration tools", access: "Creator" },
  { key: "scriptAI", label: "Script AI", category: "Video", status: "Live", description: "AI script writing and direction", access: "Creator" },
  { key: "brollGenerator", label: "B-Roll Generator", category: "Video", status: "Live", description: "B-roll footage generation", access: "Creator" },
  { key: "vaultliveProRouter", label: "VaultLive Pro", category: "Video", status: "Live", description: "Pro live streaming features", access: "Creator" },
  { key: "videoStudioV2", label: "Video Studio V2", category: "Video", status: "Live", description: "Advanced video studio", access: "Creator" },

  // Design
  { key: "flyerGenerator", label: "Flyer Generator", category: "Design", status: "Live", description: "AI flyer generation with brand DNA", access: "Creator" },
  { key: "flyerAnalytics", label: "Flyer Analytics", category: "Design", status: "Live", description: "Flyer performance tracking", access: "Creator" },
  { key: "flyerBatchExport", label: "Flyer Batch Export", category: "Design", status: "Live", description: "Batch flyer export and delivery", access: "Creator" },
  { key: "flyerComposer", label: "Flyer Composer", category: "Design", status: "Live", description: "Advanced flyer composition", access: "Creator" },
  { key: "flyerStudio", label: "Flyer Studio V2", category: "Design", status: "Live", description: "Full flyer studio with templates", access: "Creator" },
  { key: "flyerAI", label: "Flyer AI", category: "Design", status: "Live", description: "AI-powered flyer generation", access: "Creator" },
  { key: "animatedFlyer", label: "Animated Flyer", category: "Design", status: "Live", description: "Animated flyer creation", access: "Creator" },
  { key: "imageLab", label: "Image Lab", category: "Design", status: "Live", description: "Image generation and editing", access: "Creator" },
  { key: "brandDNA", label: "Brand DNA", category: "Design", status: "Live", description: "Brand identity extraction and storage", access: "Creator" },
  { key: "brandExtraction", label: "Brand Extraction", category: "Design", status: "Live", description: "Auto-extract brand from content", access: "Creator" },
  { key: "brandCoordination", label: "Brand Coordination", category: "Design", status: "Live", description: "Multi-brand coordination", access: "Owner" },
  { key: "businessCards", label: "Business Cards", category: "Design", status: "Live", description: "Digital and NFC business card creation", access: "Creator" },
  { key: "nfcCards", label: "NFC Cards", category: "Design", status: "Live", description: "NFC card management", access: "Creator" },
  { key: "designDepartment", label: "Design Department", category: "Design", status: "Live", description: "Full design department tools", access: "Creator" },
  { key: "designDepartmentWeaponized", label: "Design Dept Weaponized", category: "Design", status: "Live", description: "Advanced weaponized design tools", access: "Owner" },
  { key: "designerOS", label: "Designer OS", category: "Design", status: "Live", description: "Designer operating system", access: "Creator" },
  { key: "apparel", label: "Apparel", category: "Design", status: "Live", description: "Apparel design and mockups", access: "Creator" },

  // Music
  { key: "musicAI", label: "Music AI", category: "Music", status: "Live", description: "AI music generation and composition", access: "Owner" },
  { key: "musicLibrary", label: "Music Library", category: "Music", status: "Live", description: "Jamendo music library integration", access: "Creator" },
  { key: "artistMusic", label: "Artist Music", category: "Music", status: "Live", description: "Artist storefront and music management", access: "Creator" },
  { key: "smartAlbum", label: "Smart Album", category: "Music", status: "Live", description: "AI-powered album creation", access: "Creator" },

  // Analytics
  { key: "creatorAnalytics", label: "Creator Analytics", category: "Analytics", status: "Live", description: "Revenue, top content, audience growth, engagement", access: "Creator" },
  { key: "vaultAnalytics", label: "Vault Analytics", category: "Analytics", status: "Live", description: "Platform-wide analytics and KPIs", access: "Creator" },
  { key: "analytics", label: "Analytics (Core)", category: "Analytics", status: "Live", description: "Event logging and retrieval", access: "Creator" },
  { key: "socialMediaAudit", label: "Social Media Audit", category: "Analytics", status: "Live", description: "Social account audit and scoring", access: "Creator" },
  { key: "performanceFeedback", label: "Performance Feedback", category: "Analytics", status: "Live", description: "Content performance feedback loop", access: "Creator" },
  { key: "viralOptimizerComplete", label: "Viral Optimizer", category: "Analytics", status: "Live", description: "AI viral scoring and hook generation", access: "Creator" },

  // Payments
  { key: "vaultLive", label: "VaultLive", category: "Payments", status: "Live", description: "Live tipping flow", access: "Creator" },
  { key: "vaultPay", label: "VaultPay", category: "Payments", status: "Live", description: "Payment processing and history", access: "Creator" },
  { key: "payments", label: "Payments", category: "Payments", status: "Live", description: "Core payment management", access: "Creator" },
  { key: "payouts", label: "Payouts", category: "Payments", status: "Live", description: "Creator payout management", access: "Creator" },
  { key: "subscriptions", label: "Subscriptions", category: "Payments", status: "Live", description: "Stripe subscription management -- SEALED", access: "Creator" },
  { key: "stripeCheckout", label: "Stripe Checkout", category: "Payments", status: "Live", description: "Stripe checkout session creation", access: "Creator" },
  { key: "manualPayment", label: "Manual Payment", category: "Payments", status: "Live", description: "Manual payment recording", access: "Owner" },
  { key: "marketplace", label: "Marketplace", category: "Payments", status: "Live", description: "Digital product marketplace", access: "Creator" },
  { key: "marketplaceAI", label: "Marketplace AI", category: "Payments", status: "Live", description: "AI-powered marketplace optimization", access: "Creator" },
  { key: "checkoutBot", label: "Checkout Bot", category: "Payments", status: "Live", description: "Automated checkout assistance", access: "Creator" },
  { key: "adultSalesBot", label: "Adult Sales Bot", category: "Payments", status: "Live", description: "Adult content sales automation", access: "Owner" },

  // Social
  { key: "socialMediaAutoPoster", label: "Social Media Auto Poster", category: "Social", status: "Live", description: "Multi-platform auto-posting (needs OAuth)", access: "Creator" },
  { key: "platformPosting", label: "Platform Posting", category: "Social", status: "Live", description: "Platform-specific posting (needs OAuth)", access: "Creator" },
  { key: "scheduler", label: "Content Scheduler", category: "Social", status: "Live", description: "Content scheduling and calendar", access: "Creator" },
  { key: "whatsappContent", label: "WhatsApp Content", category: "Social", status: "Live", description: "WhatsApp content management", access: "Creator" },
  { key: "whatsappBot", label: "WhatsApp Bot", category: "Social", status: "Live", description: "WhatsApp bot automation", access: "Owner" },
  { key: "post", label: "Post", category: "Social", status: "Live", description: "Social post creation and management", access: "Creator" },
  { key: "follow", label: "Follow", category: "Social", status: "Live", description: "Follow/unfollow system", access: "Creator" },
  { key: "comment", label: "Comment", category: "Social", status: "Live", description: "Comment system", access: "Creator" },
  { key: "message", label: "Message", category: "Social", status: "Live", description: "Direct messaging", access: "Creator" },
  { key: "channels", label: "Channels", category: "Social", status: "Live", description: "Channel management", access: "Creator" },
  { key: "notification", label: "Notification", category: "Social", status: "Live", description: "Push notification system", access: "Creator" },
  { key: "vaultspace", label: "VaultSpace", category: "Social", status: "Live", description: "Social feed with 32 procedures", access: "Creator" },
  { key: "vaultCommunity", label: "Vault Community", category: "Social", status: "Live", description: "Community features", access: "Creator" },
  { key: "vaultDrop", label: "Vault Drop", category: "Social", status: "Live", description: "Content drop system", access: "Creator" },
  { key: "vaultMoment", label: "Vault Moment", category: "Social", status: "Live", description: "Moment sharing", access: "Creator" },
  { key: "vaultLoves", label: "Vault Loves", category: "Social", status: "Live", description: "Likes and reactions", access: "Creator" },
  { key: "vaultCulture", label: "Vault Culture", category: "Social", status: "Live", description: "Cultural content curation", access: "Creator" },
  { key: "vaultRise", label: "Vault Rise", category: "Social", status: "Live", description: "Creator growth tracking", access: "Creator" },
  { key: "vaultSnap", label: "Vault Snap", category: "Social", status: "Live", description: "Quick content sharing", access: "Creator" },
  { key: "vaultx", label: "Vault X", category: "Social", status: "Live", description: "X/Twitter integration", access: "Creator" },
  { key: "vaultMarket", label: "Vault Market", category: "Social", status: "Live", description: "Social marketplace", access: "Creator" },
  { key: "vaultPass", label: "Vault Pass", category: "Social", status: "Live", description: "Access pass system", access: "Creator" },
  { key: "vaultCreatorTools", label: "Vault Creator Tools", category: "Social", status: "Live", description: "Creator-specific tools", access: "Creator" },
  { key: "cultural", label: "Cultural", category: "Social", status: "Live", description: "Cultural content and localization", access: "Creator" },
  { key: "explore", label: "Explore", category: "Social", status: "Live", description: "Content discovery", access: "Public" },

  // Owner/System
  { key: "ownerCockpit", label: "Owner Cockpit API", category: "Owner Tools", status: "Live", description: "Owner cockpit data and controls", access: "Owner" },
  { key: "ownerControl", label: "Owner Control", category: "Owner Tools", status: "Live", description: "Platform control procedures", access: "Owner" },
  { key: "users", label: "Users", category: "Owner Tools", status: "Live", description: "User management (getAll, updateRole, etc.)", access: "Owner" },
  { key: "system", label: "System", category: "Owner Tools", status: "Live", description: "System health check", access: "Public" },
  { key: "auth", label: "Auth", category: "Owner Tools", status: "Live", description: "Login, register, session management", access: "Public" },
  { key: "simpleAuth", label: "Simple Auth", category: "Owner Tools", status: "Live", description: "Simplified auth flow", access: "Public" },
  { key: "kingcamVault", label: "KingCam Vault", category: "Owner Tools", status: "Live", description: "Credential manager -- add/reveal/copy/delete secrets", access: "Owner" },
  { key: "kingcamDemos", label: "KingCam Demos", category: "Owner Tools", status: "Live", description: "Demo management", access: "Owner" },
  { key: "kingcamPerks", label: "KingCam Perks", category: "Owner Tools", status: "Live", description: "Perks and rewards system", access: "Owner" },
  { key: "kingcamCategoryCreating", label: "Category Creator", category: "Owner Tools", status: "Live", description: "Platform category management", access: "Owner" },
  { key: "kingcamClone", label: "KingCam Clone", category: "Owner Tools", status: "Live", description: "KingCam content cloning", access: "Owner" },
  { key: "kingframe", label: "KingFrame", category: "Owner Tools", status: "Live", description: "Frame and template management", access: "Owner" },
  { key: "waitlist", label: "Waitlist", category: "Owner Tools", status: "Live", description: "Waitlist signup and management", access: "Public" },
  { key: "waitlistEngine", label: "Waitlist Engine", category: "Owner Tools", status: "Live", description: "Advanced waitlist automation", access: "Owner" },
  { key: "proofGate", label: "Proof Gate", category: "Owner Tools", status: "Live", description: "Proof of work gating", access: "Owner" },
  { key: "liveDemo", label: "Live Demo", category: "Owner Tools", status: "Live", description: "Live demo management", access: "Owner" },
  { key: "campaign", label: "Campaign", category: "Owner Tools", status: "Live", description: "Marketing campaign management", access: "Owner" },
  { key: "telegram", label: "Telegram", category: "Owner Tools", status: "Live", description: "Telegram integration", access: "Owner" },
  { key: "os", label: "OS", category: "Owner Tools", status: "Live", description: "Operating system procedures", access: "Owner" },
  { key: "oauthCallback", label: "OAuth Callback", category: "Owner Tools", status: "Live", description: "OAuth callback handler", access: "Public" },
  { key: "onboarding", label: "Onboarding", category: "Owner Tools", status: "Live", description: "Creator onboarding flow", access: "Creator" },
  { key: "memberOnboarding", label: "Member Onboarding", category: "Owner Tools", status: "Live", description: "Member onboarding procedures", access: "Creator" },
  { key: "guidedMode", label: "Guided Mode", category: "Owner Tools", status: "Live", description: "Step-by-step guided mode", access: "Creator" },
  { key: "profile", label: "Profile", category: "Owner Tools", status: "Live", description: "User profile management", access: "Creator" },
  { key: "services", label: "Services", category: "Owner Tools", status: "Live", description: "Creator services listing", access: "Creator" },
  { key: "storefront", label: "Storefront", category: "Owner Tools", status: "Live", description: "Creator storefront", access: "Creator" },
  { key: "content", label: "Content", category: "Owner Tools", status: "Live", description: "Content upload and management", access: "Creator" },
  { key: "creatorTools", label: "Creator Tools", category: "Owner Tools", status: "Live", description: "Creator toolbox procedures", access: "Creator" },
  { key: "agentTracker", label: "Agent Tracker", category: "Owner Tools", status: "Live", description: "Agent activity tracking", access: "Owner" },
  { key: "commandHub", label: "Command Hub", category: "Owner Tools", status: "Live", description: "Command hub procedures", access: "Owner" },
  { key: "adminRouter", label: "Admin", category: "Owner Tools", status: "Live", description: "Admin procedures", access: "Owner" },
  { key: "viralHooks", label: "Viral Hooks", category: "AI Agents", status: "Live", description: "Viral hook generation", access: "Creator" },
  { key: "contentRepurposing", label: "Content Repurposing", category: "AI Agents", status: "Live", description: "Content repurposing automation", access: "Creator" },
  { key: "templateRecommendations", label: "Template Recommendations", category: "AI Agents", status: "Live", description: "AI template recommendations", access: "Creator" },
  { key: "verticalWizard", label: "Vertical Wizard", category: "AI Agents", status: "Live", description: "Vertical content wizard", access: "Creator" },
  { key: "crossVerticalMarketplace", label: "Cross-Vertical Marketplace", category: "AI Agents", status: "Live", description: "Cross-vertical content marketplace", access: "Creator" },
  { key: "categoryCreator", label: "Category Creator", category: "AI Agents", status: "Live", description: "Content category creation", access: "Creator" },
  { key: "brands", label: "Brands", category: "Design", status: "Live", description: "Brand management", access: "Creator" },
  { key: "batchGeneration", label: "Batch Generation", category: "Design", status: "Live", description: "Batch content generation", access: "Creator" },
  { key: "liveSessionScheduler", label: "Live Session Scheduler", category: "Live", status: "Live", description: "Live session scheduling", access: "Creator" },
  { key: "demos", label: "Demos", category: "Owner Tools", status: "Live", description: "Demo content management", access: "Owner" },
  { key: "podcasting", label: "Podcasting", category: "AI Agents", status: "Live", description: "Podcast management and distribution", access: "Creator" },
  { key: "podcastStudio", label: "Podcast Studio", category: "AI Agents", status: "Live", description: "15 procedures: shows, episodes, RSS, Spotify/Apple, ads, analytics", access: "Creator" },
  { key: "onlyfansIntegration", label: "OnlyFans Integration", category: "Social", status: "Live", description: "OnlyFans content sync", access: "Creator" },
  { key: "studioSlots", label: "Studio Slots", category: "Video", status: "Live", description: "Studio booking and slot management", access: "Creator" },
  { key: "aiBot", label: "AI Bot", category: "AI Agents", status: "Live", description: "General AI bot", access: "Creator" },
  { key: "dayShiftDoctor", label: "Day Shift Doctor", category: "AI Agents", status: "Live", description: "Healthcare creator tools", access: "Creator" },
  { key: "kingcamPerks", label: "KingCam Perks", category: "Owner Tools", status: "Live", description: "Perks system", access: "Owner" },
];

// ─── TYPES ────────────────────────────────────────────────────────────────────
type RouteEntry = {
  path: string;
  label: string;
  category: string;
  type: "Page" | "API only";
  status: "Live" | "Draft" | "Private" | "Disabled";
  access: "Public" | "Creator" | "Emma" | "Owner";
};

type ApiEntry = {
  key: string;
  label: string;
  category: string;
  status: "Live" | "Draft" | "Disabled";
  description: string;
  access: "Public" | "Creator" | "Emma" | "Owner";
};

const CATEGORIES = ["All", "Owner Tools", "Emma", "University", "Video", "Design", "Music", "Analytics", "Payments", "Social", "AI Agents", "Community", "Live", "Greatest Show", "Core"];
const ACCESS_COLORS: Record<string, string> = {
  Public: "bg-gray-700 text-gray-300",
  Creator: "bg-blue-900 text-blue-300",
  Emma: "bg-pink-900 text-pink-300",
  Owner: "bg-yellow-900 text-yellow-300",
};
const STATUS_COLORS: Record<string, string> = {
  Live: "bg-green-900 text-green-300",
  Draft: "bg-yellow-900 text-yellow-300",
  Private: "bg-purple-900 text-purple-300",
  Disabled: "bg-red-900 text-red-300",
};


// ─── Challenge Cockpit Banner ─────────────────────────────────────────────────
function ChallengeCockpitBanner() {
  const { data: challenge } = trpc.empireAgents.getActiveChallenge.useQuery();
  if (!challenge) return null;
  const pct = challenge.percent_complete || 0;
  const current = parseFloat(challenge.current_revenue) || 0;
  const target = parseFloat(challenge.target_revenue) || 5000;
  const gap = Math.max(0, target - current);
  return (
    <div className="bg-green-950 border border-green-800 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-green-400 font-bold text-xs uppercase tracking-widest">🎯 Active Challenge</span>
          <h2 className="text-white font-black text-lg mt-1">{challenge.title}</h2>
        </div>
        <div className="text-right">
          <div className="text-gray-500 text-xs">Days Left</div>
          <div className={`text-4xl font-black ${challenge.days_left <= 2 ? "text-red-400" : "text-green-400"}`}>
            {challenge.days_left}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-3">
        <div>
          <div className="text-gray-500 text-xs uppercase">Raised</div>
          <div className="text-green-400 font-black text-2xl">${current.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs uppercase">Target</div>
          <div className="text-white font-black text-2xl">${target.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs uppercase">Gap</div>
          <div className={`font-black text-2xl ${gap === 0 ? "text-green-400" : "text-yellow-400"}`}>
            {gap === 0 ? "✅ DONE" : `$${gap.toFixed(0)}`}
          </div>
        </div>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-3 mb-2">
        <div
          className={`h-3 rounded-full transition-all ${pct >= 100 ? "bg-green-400" : pct >= 60 ? "bg-yellow-400" : "bg-cyan-400"}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-500 text-xs">{pct}% complete</span>
        <a href="/king/money-mission" className="bg-green-500 text-black text-xs font-black px-3 py-1.5 rounded-lg no-underline">
          Open War Room →
        </a>
      </div>
    </div>
  );
}

export default function OwnerCockpit() {
  const [, setLocation] = useLocation();
  const { data: allTours } = trpc.cloneTours.getAllTours.useQuery();
  const { data: outreachClips } = trpc.cloneTours.listOutreachClips.useQuery({ limit: 20 });
  const { data: cloneVideos } = trpc.cloneTours.listCloneVideos.useQuery({ limit: 30 });
  const generateAndCreate = trpc.cloneTours.generateAndCreate.useMutation({
    onSuccess: () => window.location.reload(),
  });
  const { data: weeklyBriefs } = trpc.empireWeeklyBrief.listWeeklyBriefs.useQuery({ limit: 12 });
  const generateWeeklyBrief = trpc.empireWeeklyBrief.generateWeeklyBrief.useMutation({
    onSuccess: () => window.location.reload(),
  });
  const [activeTab, setActiveTab] = useState<"pages" | "api" | "clone_tours" | "weekly_brief" | "presentation_builder" | "kingcam_brain">("pages");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAccess, setSelectedAccess] = useState("All");

  const filteredRoutes = ROUTES.filter(r => {
    const matchCat = selectedCategory === "All" || r.category === selectedCategory;
    const matchAccess = selectedAccess === "All" || r.access === selectedAccess;
    const matchSearch = !searchQuery || r.label.toLowerCase().includes(searchQuery.toLowerCase()) || r.path.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchAccess && matchSearch;
  });

  const filteredApis = API_ROUTERS.filter(r => {
    const matchCat = selectedCategory === "All" || r.category === selectedCategory;
    const matchAccess = selectedAccess === "All" || r.access === selectedAccess;
    const matchSearch = !searchQuery || r.label.toLowerCase().includes(searchQuery.toLowerCase()) || r.key.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchAccess && matchSearch;
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-yellow-400">👑 Owner Cockpit</h1>
        <p className="text-gray-400 mt-1">Every route, every router, every feature -- one screen.</p>
        <div className="flex gap-4 mt-3 text-sm text-gray-400">
          <span>📄 {ROUTES.length} Pages</span>
          <span>⚡ {API_ROUTERS.length} API Routers</span>
          <span>✅ Reality Bot: PASS=2 AUTH=10 FAIL=0 ERR=0</span>
          <span>🟢 7/7 Critical Systems</span>
        </div>
      </div>

      <ChallengeCockpitBanner />
      {/* Emma Quick Access */}
      <div className="bg-pink-950 border border-pink-800 rounded-xl p-4 mb-6">
        <h2 className="text-pink-300 font-bold text-lg mb-3">🌸 Emma System -- Quick Access</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Emma Simple View", path: "/emma/reset" },
            { label: "Emma Dashboard", path: "/emma/reset-dashboard" },
            { label: "Emma University", path: "/emma-university" },
            { label: "Emma Oversight (King)", path: "/king/emma" },
            { label: "Emma Network", path: "/emma/network" },
            { label: "Emma AI Agents", path: "/emma-ai-agents" },
          ].map(item => (
            <button
              key={item.path}
              onClick={() => window.open(item.path, "_blank")}
              className="bg-pink-900 hover:bg-pink-800 text-pink-200 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* VaultU Quick Access */}
      <div className="bg-indigo-950 border border-indigo-800 rounded-xl p-4 mb-6">
        <h2 className="text-indigo-300 font-bold text-lg mb-3">🎓 VaultU -- Course Quick Access</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Course Catalog", path: "/university" },
            { label: "Dominican Recruiting", path: "/dominican" },
            { label: "Recruiter Page", path: "/recruiter" },
            { label: "Spanish Guide", path: "/guia" },
          ].map(item => (
            <button
              key={item.path}
              onClick={() => window.open(item.path, "_blank")}
              className="bg-indigo-900 hover:bg-indigo-800 text-indigo-200 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-900 rounded-xl p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search routes or features..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm border border-gray-700 focus:outline-none focus:border-yellow-500 w-64"
          />
          <select
            value={selectedAccess}
            onChange={e => setSelectedAccess(e.target.value)}
            className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm border border-gray-700"
          >
            <option value="All">All Access</option>
            <option value="Public">Public</option>
            <option value="Creator">Creator</option>
            <option value="Emma">Emma</option>
            <option value="Owner">Owner</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("pages")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "pages" ? "bg-yellow-500 text-black" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
            >
              📄 Pages ({ROUTES.length})
            </button>
            <button
              onClick={() => setActiveTab("api")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "api" ? "bg-yellow-500 text-black" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
            >
              ⚡ API Routers ({API_ROUTERS.length})
            </button>
            <button
              onClick={() => setActiveTab("clone_tours")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "clone_tours" ? "bg-purple-500 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
            >
              👑 Clone Tours ({allTours?.length ?? 0})
            </button>
            <button
              onClick={() => setActiveTab("weekly_brief")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "weekly_brief" ? "bg-green-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
            >
              📊 Weekly Brief ({weeklyBriefs?.length ?? 0})
            </button>
            <button
              onClick={() => setActiveTab("kingcam_brain")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "kingcam_brain" ? "bg-cyan-500 text-black" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
            >
              🧠 KingCam Brain
            </button>
          </div>
        </div>
        {/* Category tabs */}
        <div className="flex flex-wrap gap-1 mt-3">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${selectedCategory === cat ? "bg-yellow-500 text-black" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Pages Table */}
      {activeTab === "pages" && (
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <div className="p-3 border-b border-gray-800 text-sm text-gray-400">
            Showing {filteredRoutes.length} of {ROUTES.length} pages
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-gray-400 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Page / Feature</th>
                  <th className="px-4 py-3 text-left">Route</th>
                  <th className="px-4 py-3 text-left">Access</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredRoutes.map((route, i) => (
                  <tr key={i} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{route.category}</td>
                    <td className="px-4 py-2.5 font-medium text-white">{route.label}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{route.path}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${ACCESS_COLORS[route.access]}`}>
                        {route.access}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[route.status]}`}>
                        {route.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => window.open(route.path, "_blank")}
                        className="bg-yellow-500 hover:bg-yellow-400 text-black px-3 py-1 rounded text-xs font-bold transition-colors"
                      >
                        Open →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* API Routers Table */}
      {activeTab === "clone_tours" && (
        <div className="space-y-6">
          {/* Clone Tours Grid */}
          <div className="bg-gray-900 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-purple-400">👑 KingCam Clone Tours</h2>
                <p className="text-gray-500 text-xs mt-0.5">Feature page walkthroughs with KingCam's full-body clone</p>
              </div>
              <span className="text-xs text-gray-500">{allTours?.length ?? 0} tours configured</span>
            </div>
            <div className="divide-y divide-gray-800">
              {(allTours ?? []).map((tour: any) => (
                <div key={tour.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold text-sm">{tour.title}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${tour.isActive ? "bg-green-900 text-green-300" : "bg-gray-800 text-gray-500"}`}>
                        {tour.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="text-gray-500 text-xs mt-0.5 font-mono">{tour.routeKey} → {tour.routePath}</div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {tour.video ? (
                      <div className="text-right">
                        <div className={`text-xs font-medium ${tour.video.renderStatus === "ready" ? "text-green-400" : tour.video.renderStatus === "rendering" ? "text-yellow-400" : "text-gray-500"}`}>
                          {tour.video.renderStatus === "ready" ? "✅ Ready" : tour.video.renderStatus === "rendering" ? "⏳ Rendering" : "⚙️ " + tour.video.renderStatus}
                        </div>
                        <div className="text-gray-600 text-xs">{tour.video.style} · {tour.video.outfitName}</div>
                      </div>
                    ) : (
                      <button
                        onClick={() => generateAndCreate.mutate({ context: tour.routeKey, style: "studio" })}
                        disabled={generateAndCreate.isPending}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                      >
                        {generateAndCreate.isPending ? "Generating..." : "Generate Clone Video"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {(!allTours || allTours.length === 0) && (
                <div className="p-8 text-center text-gray-600 text-sm">
                  No tours configured yet. Run migration 031 to seed tour routes.
                </div>
              )}
            </div>
          </div>

          {/* Outreach Clips */}
          <div className="bg-gray-900 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h2 className="text-lg font-bold text-cyan-400">📤 Outreach Clone Clips</h2>
              <p className="text-gray-500 text-xs mt-0.5">Personalized clone videos sent to leads</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800 text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Target</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Delivery</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {(outreachClips ?? []).map((clip: any) => (
                    <tr key={clip.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-2.5 text-white font-medium">{clip.target_name}</td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{clip.target_type}</td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{clip.delivery_method}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${clip.delivery_status === "delivered" ? "bg-green-900 text-green-300" : clip.delivery_status === "pending" ? "bg-yellow-900 text-yellow-300" : "bg-gray-800 text-gray-400"}`}>
                          {clip.delivery_status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{new Date(clip.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {(!outreachClips || outreachClips.length === 0) && (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-600 text-sm">No outreach clips yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Clone Videos Library */}
          <div className="bg-gray-900 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h2 className="text-lg font-bold text-yellow-400">🎬 Clone Video Library</h2>
              <p className="text-gray-500 text-xs mt-0.5">All generated KingCam clone videos</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4">
              {(cloneVideos ?? []).map((v: any) => (
                <div key={v.id} className="bg-gray-800 rounded-xl overflow-hidden">
                  <div className="aspect-video bg-gray-900 flex items-center justify-center relative">
                    {v.videoUrl ? (
                      <video src={v.videoUrl} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-gray-600 text-xs text-center p-2">
                        <div className="text-2xl mb-1">👑</div>
                        {v.renderStatus}
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <div className="text-white text-xs font-semibold truncate">{v.context}</div>
                    <div className="text-gray-500 text-xs">{v.style} · {v.outfitName || "default"}</div>
                  </div>
                </div>
              ))}
              {(!cloneVideos || cloneVideos.length === 0) && (
                <div className="col-span-3 py-8 text-center text-gray-600 text-sm">No clone videos generated yet</div>
              )}
            </div>
          </div>
        </div>
      )}
      {activeTab === "weekly_brief" && (
        <div className="space-y-6">
          {/* Generate New Brief */}
          <div className="bg-gray-900 rounded-xl p-5 border border-green-900">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-green-400">📊 Empire Brain Weekly Brief</h2>
                <p className="text-gray-500 text-xs mt-0.5">KingCam analyzes platform data and delivers a full-body briefing video</p>
              </div>
              <button
                onClick={() => generateWeeklyBrief.mutate({})}
                disabled={generateWeeklyBrief.isPending}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {generateWeeklyBrief.isPending ? "Generating..." : "⚡ Generate This Week's Brief"}
              </button>
            </div>
            <div className="text-xs text-gray-600">Analyzes: revenue, active creators, Emma leads, course enrollments → generates KingCam script → creates full-body clone video</div>
          </div>
          {/* Briefs Grid */}
          <div className="bg-gray-900 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h2 className="text-lg font-bold text-white">📼 Brief Archive</h2>
            </div>
            <div className="divide-y divide-gray-800">
              {(weeklyBriefs ?? []).map((brief: any) => (
                <div key={brief.id} className="p-4 hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-yellow-400 font-bold text-sm">{brief.week_label}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${brief.render_status === "completed" ? "bg-green-900 text-green-300" : "bg-yellow-900 text-yellow-300"}`}>
                          {brief.render_status || "queued"}
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs text-gray-400 mb-3">
                        <span>💰 ${Number(brief.revenue_total || 0).toFixed(0)} revenue</span>
                        <span>👥 {brief.creator_count} creators</span>
                        <span>📋 {brief.lead_count} leads</span>
                        <span>🎓 {brief.enrollment_count} enrollments</span>
                      </div>
                      <p className="text-gray-400 text-xs leading-relaxed line-clamp-3">{brief.script}</p>
                    </div>
                    {brief.video_url && (
                      <video src={brief.video_url} className="w-32 h-20 object-cover rounded-lg bg-gray-800 flex-shrink-0" />
                    )}
                    {!brief.video_url && (
                      <div className="w-32 h-20 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-600 text-xs text-center">Rendering...</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {(!weeklyBriefs || weeklyBriefs.length === 0) && (
                <div className="py-12 text-center text-gray-600 text-sm">No weekly briefs yet -- generate your first one above</div>
              )}
            </div>
          </div>
        </div>
      )}
      {activeTab === "presentation_builder" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Presentation Builder</h2>
              <p className="text-gray-400 text-sm mt-1">Generate world-class branded documents, decks, and one-pagers -- no external tools, no credits.</p>
            </div>
            <a href="/presentation-builder" className="px-4 py-2 bg-cyan-500 text-black font-bold text-sm rounded-lg hover:bg-cyan-400 transition-colors">
              Open Builder →
            </a>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: "manifesto", name: "Manifesto", icon: "⚡", color: "text-cyan-400", desc: "Full empire story" },
              { key: "pitch_deck", name: "Pitch Deck", icon: "🏆", color: "text-yellow-400", desc: "Investor/partner pitch" },
              { key: "creator_onboarding", name: "Creator Onboarding", icon: "🎯", color: "text-purple-400", desc: "Welcome package" },
              { key: "course_promo", name: "Course Promo", icon: "📚", color: "text-cyan-400", desc: "Course one-pager" },
              { key: "empire_brief", name: "Empire Brief", icon: "📊", color: "text-yellow-400", desc: "Weekly intelligence" },
              { key: "platform_overview", name: "Platform Overview", icon: "🌐", color: "text-purple-400", desc: "Full platform reference" },
            ].map(t => (
              <a key={t.key} href={`/presentation-builder`} className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-600 transition-colors block">
                <div className="text-2xl mb-2">{t.icon}</div>
                <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${t.color}`}>{t.key.replace(/_/g, " ")}</div>
                <div className="text-sm font-semibold text-white mb-1">{t.name}</div>
                <div className="text-xs text-gray-500">{t.desc}</div>
              </a>
            ))}
          </div>
        </div>
      )}

      {activeTab === "kingcam_brain" && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-cyan-400">🧠 KingCam Brain</h2>
              <p className="text-gray-500 text-sm mt-1">Your AI-indexed content library -- import, search, generate</p>
            </div>
            <div className="flex gap-3">
              <a href="/king/life" className="px-4 py-2 bg-red-900 text-red-300 border border-red-700 rounded-lg text-sm font-bold hover:bg-red-800 no-underline">Life Mission Board</a>
              <a href="/king/empire" className="px-4 py-2 bg-gray-800 text-cyan-400 border border-cyan-400 rounded-lg text-sm font-bold hover:bg-gray-700 no-underline">Empire Command</a>
              <a href="/agents" className="px-4 py-2 bg-gray-800 text-cyan-400 border border-cyan-400 rounded-lg text-sm font-bold hover:bg-gray-700 no-underline">Agent Roster</a>
              <a href="/king/whatsapp-bot" className="px-4 py-2 bg-gray-800 text-green-400 border border-green-600 rounded-lg text-sm font-bold hover:bg-gray-700 no-underline">📱 WhatsApp Bot</a>
              <a href="/king/platform-war-room" className="flex items-center gap-2 px-4 py-2 bg-purple-900/20 border border-purple-500/20 rounded-lg text-purple-400 text-sm hover:bg-purple-900/30 transition-all font-semibold">
                <span>🎯</span> Platform War Room
              </a>
              <a href="/king/empire-verticals" className="flex items-center gap-2 px-4 py-2 bg-orange-900/20 border border-orange-500/20 rounded-lg text-orange-400 text-sm hover:bg-orange-900/30 transition-all font-semibold">
                <span>👑</span> Empire Verticals
              </a>
              <a href="/whatsapp-content" className="px-4 py-2 bg-gray-800 text-green-400 border border-green-600 rounded-lg text-sm font-bold hover:bg-gray-700 no-underline">✍️ WA Content</a>
              <a href="/king/import" className="px-4 py-2 bg-gray-800 text-cyan-400 border border-cyan-400 rounded-lg text-sm font-bold hover:bg-gray-700 no-underline">
                + Import Content
              </a>
              <a href="/king/gallery" className="px-4 py-2 text-sm font-bold rounded-lg no-underline" style={{background: "linear-gradient(135deg, #9B59B6, #00D9FF)", color: "#fff"}}>
                Open Brain →
              </a>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Import Tool", desc: "Upload videos, images, audio, text from phone or YouTube. AI auto-classifies into chunks.", href: "/king/import", color: "#00D9FF" },
              { label: "Brain Gallery", desc: "Search all chunks by theme, tone, and type. Select chunks to build scripts.", href: "/king/gallery", color: "#9B59B6" },
              { label: "Script + Clone Video", desc: "Generate course lessons, show segments, short clips, ads, or DM videos from your own content.", href: "/king/gallery", color: "#FFD700" },
            ].map(item => (
              <a key={item.label} href={item.href} className="block p-5 bg-gray-900 border border-gray-800 rounded-xl no-underline hover:border-gray-600 transition-colors">
                <div className="font-bold text-sm mb-2" style={{color: item.color}}>{item.label}</div>
                <div className="text-gray-500 text-xs leading-relaxed">{item.desc}</div>
              </a>
            ))}
          </div>
        </div>
      )}
            {activeTab === "api" && (
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <div className="p-3 border-b border-gray-800 text-sm text-gray-400">
            Showing {filteredApis.length} of {API_ROUTERS.length} API routers
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-gray-400 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Router</th>
                  <th className="px-4 py-3 text-left">Key</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-left">Access</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredApis.map((api, i) => (
                  <tr key={i} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{api.category}</td>
                    <td className="px-4 py-2.5 font-medium text-white">{api.label}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-blue-400">{api.key}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs max-w-xs">{api.description}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${ACCESS_COLORS[api.access]}`}>
                        {api.access}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[api.status]}`}>
                        {api.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
