import { useMemo, useState } from "react";
import { ArrowUpRight, Check, Clapperboard, Film, Image as ImageIcon, Layers3, LoaderCircle, Palette, Play, Sparkles, Wand2 } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import MediaPicker, { type MediaAssetItem } from "@/components/MediaPicker";
import { HOMEPAGE_MEDIA, hasCertifiedPublicProof } from "@/lib/homepageMediaRegistry";

type MarketingFormat = "editorial_flyer" | "motion_flyer" | "motion_mixtape_cover";
type CreationMode = "from_scratch" | "master_art_motion" | "layered_poster_motion";
type CompositionFamily = "monument_type_cutout" | "culture_event_collage" | "editorial_cover_world" | "premium_promo_action" | "client_identity_tour";
type LayerRole = "background" | "hero" | "support" | "logo" | "texture" | "subject" | "foreground" | "effect";
type SelectedLayer = { url: string; mediaType: "image" | "video"; role: LayerRole; fileName: string };

const formats: Array<{ id: MarketingFormat; label: string; eyebrow: string; badge: string }> = [
  { id: "editorial_flyer", label: "Static Master", eyebrow: "Print + social poster", badge: "PNG" },
  { id: "motion_flyer", label: "Motion Flyer", eyebrow: "Poster wakes up", badge: "PNG + MP4" },
  { id: "motion_mixtape_cover", label: "Living Motion Cover", eyebrow: "Vertical release world", badge: "9:16 PNG + MP4" },
];

const families: Array<{ id: CompositionFamily; label: string; note: string; accent: string }> = [
  { id: "monument_type_cutout", label: "Monument Type + Cutout", note: "Huge letters. Real people cut across the title. Badge and event band lock it in.", accent: "#f0c04a" },
  { id: "culture_event_collage", label: "Culture Event Collage", note: "Real people, sports/music energy, sponsor marks, panels, ribbons, and real event facts.", accent: "#f6c445" },
  { id: "editorial_cover_world", label: "Editorial Cover World", note: "A real album, mixtape, magazine, or artist-cover identity—not a square template.", accent: "#d4af37" },
  { id: "premium_promo_action", label: "Premium Promo / Action", note: "Athletes, dancers, hosts, offers, and bold event energy with a clean held finish.", accent: "#f4c542" },
  { id: "client_identity_tour", label: "Client Identity / Tour", note: "The client name is the hero. Perfect for BayBay-style tour, radio, and promoter systems.", accent: "#f2ba2a" },
];

const roles: Array<{ id: LayerRole; label: string; note: string }> = [
  { id: "background", label: "Background", note: "The real scene or environmental world behind the cover." },
  { id: "subject", label: "Subject", note: "A real isolated artist, performer, or main person layer." },
  { id: "foreground", label: "Foreground", note: "A real table, prop, product, vehicle, or front-pass layer." },
  { id: "hero", label: "Hero", note: "The primary cover visual when a separate subject cutout is not available." },
  { id: "support", label: "Support", note: "A second person, crowd, culture image, or detail image." },
  { id: "logo", label: "Logo", note: "Client, venue, artist, sponsor, or KillaGraphics mark." },
  { id: "texture", label: "Texture", note: "Approved visual texture or campaign detail layer." },
  { id: "effect", label: "Effect", note: "Optional real approved smoke, light, particle, or overlay artwork." },
];

function isVideo(asset: MediaAssetItem) {
  return asset.assetType === "video" || String(asset.mimeType || "").startsWith("video/");
}

function preview(asset: MediaAssetItem | SelectedLayer | null) {
  if (!asset) return null;
  const url = "publicUrl" in asset ? (asset.publicUrl || asset.storagePath || "") : asset.url;
  if (!url) return null;
  const video = "mediaType" in asset ? asset.mediaType === "video" : isVideo(asset);
  return video ? <video src={url} muted autoPlay loop playsInline className="h-full w-full object-cover" /> : <img src={url} alt={asset.fileName} className="h-full w-full object-cover" />;
}

function projectTitle(project: any) {
  return String(project?.headline || "KillaGraphics master");
}

export function MotionFlyerAgent() {
  const [creationMode, setCreationMode] = useState<CreationMode>("from_scratch");
  const [format, setFormat] = useState<MarketingFormat>("motion_flyer");
  const [family, setFamily] = useState<CompositionFamily>("monument_type_cutout");
  const [headline, setHeadline] = useState("");
  const [campaignType, setCampaignType] = useState("Event poster");
  const [campaignWorld, setCampaignWorld] = useState("");
  const [hostLine, setHostLine] = useState("");
  const [supportingLine, setSupportingLine] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [ticketLine, setTicketLine] = useState("");
  const [callToAction, setCallToAction] = useState("");
  const [clientName, setClientName] = useState("");
  const [creditLine, setCreditLine] = useState("DESIGN BY KILLAGRAPHICS");
  const [primary, setPrimary] = useState("#171717");
  const [accent, setAccent] = useState("#f0c04a");
  const [layers, setLayers] = useState<SelectedLayer[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [nextRole, setNextRole] = useState<LayerRole>("hero");
  const [finishedProject, setFinishedProject] = useState<any>(null);

  const killaProjectsQuery = trpc.flyerStudio.getKillaGraphicsProjects.useQuery();
  const legacyFlyersQuery = trpc.flyerStudio.getFlyers.useQuery();
  const createProject = trpc.flyerStudio.createKillaGraphicsProject.useMutation({
    onSuccess: (project) => { setFinishedProject(project); killaProjectsQuery.refetch(); },
  });
  const createProof = trpc.flyerStudio.createCertifiedProof.useMutation({ onSuccess: () => legacyFlyersQuery.refetch() });

  const selectedFamily = families.find((item) => item.id === family) ?? families[0];
  const selectedFormat = formats.find((item) => item.id === format) ?? formats[1];
  const needsSource = creationMode !== "from_scratch";
  const isLivingMotionCover = format === "motion_mixtape_cover" && creationMode === "layered_poster_motion";
  const livingMotionCoverReady = !isLivingMotionCover || (layers.length >= 3 && layers.some((layer) => layer.role === "background") && layers.some((layer) => layer.role === "foreground") && layers.some((layer) => layer.role === "subject" || layer.role === "hero"));
  const canBuild = Boolean(headline.trim()) && (!needsSource || layers.length > 0) && (creationMode !== "layered_poster_motion" || layers.length >= 2) && livingMotionCoverReady && !createProject.isPending;
  const newestProject = killaProjectsQuery.data?.projects.find((project: any) => project.status === "ready" && project.staticMasterUrl);
  const legacyProof = legacyFlyersQuery.data?.flyers.find((flyer: any) => flyer.status === "ready" && flyer.artifactUrl);
  const acceptedProof = HOMEPAGE_MEDIA.motionFlyerProof;
  const result = finishedProject || newestProject || null;
  const resultStill = result?.staticMasterUrl || null;
  const resultMotion = result?.motionUrl || legacyProof?.artifactUrl || (hasCertifiedPublicProof(acceptedProof) ? acceptedProof.livePath : null);
  const resultIsOwnerOutput = Boolean(result?.staticMasterUrl || legacyProof?.artifactUrl);

  const pickerTitle = useMemo(() => creationMode === "master_art_motion" ? "Choose the finished master artwork" : creationMode === "layered_poster_motion" ? "Choose declared poster layers" : "Add real campaign media", [creationMode]);
  const pickerSubtitle = useMemo(() => creationMode === "master_art_motion" ? "One finished CreatorVault flyer, cover, or poster. It will stay a flat master—CreatorVault will not fake recovered layers." : creationMode === "layered_poster_motion" ? "Choose real source layers only. Give each one its honest role so motion respects the original design." : "Media is optional from scratch. Add real people, logos, textures, or campaign visuals when the campaign needs them.", [creationMode]);

  const chooseAssets = (assets: MediaAssetItem[]) => {
      const additions = assets.slice(0, Math.max(0, 6 - layers.length)).map((asset) => ({
      url: String(asset.publicUrl || asset.storagePath || ""),
      mediaType: isVideo(asset) ? "video" as const : "image" as const,
      role: nextRole,
      fileName: asset.fileName,
    })).filter((asset) => asset.url);
    setLayers((existing) => creationMode === "master_art_motion" ? additions.slice(0, 1) : [...existing, ...additions].slice(0, 6));
    setPickerOpen(false);
  };

  const setLayerRole = (index: number, role: LayerRole) => setLayers((current) => current.map((layer, layerIndex) => layerIndex === index ? { ...layer, role } : layer));
  const removeLayer = (index: number) => setLayers((current) => current.filter((_, layerIndex) => layerIndex !== index));

  const build = () => {
    if (!canBuild) return;
    createProject.mutate({
      creationMode,
      format,
      compositionFamily: family,
      campaignType: campaignType.trim(),
      campaignWorld: campaignWorld.trim(),
      headline: headline.trim(),
      hostLine: hostLine.trim(),
      supportingLine: supportingLine.trim(),
      eventDate: eventDate.trim(),
      eventTime: eventTime.trim(),
      venue: venue.trim(),
      city: city.trim(),
      ticketLine: ticketLine.trim(),
      callToAction: callToAction.trim(),
      clientName: clientName.trim(),
      creditLine: creditLine.trim() || "DESIGN BY KILLAGRAPHICS",
      colorPrimary: primary,
      colorAccent: accent,
      sourceLayers: layers,
    });
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#09090b] text-white">
      <section className="relative isolate overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_5%,rgba(240,192,74,.22),transparent_26%),radial-gradient(circle_at_5%_74%,rgba(216,30,50,.16),transparent_30%),linear-gradient(130deg,#09090b,#141015_52%,#0c0c0f)]" />
        <div className="relative mx-auto max-w-7xl px-5 py-7 sm:px-8 lg:px-12">
          <header className="flex items-center justify-between border-b border-white/15 pb-5">
            <div className="flex items-center gap-3"><Palette className="h-5 w-5 text-[#f0c04a]" /><span className="text-xs font-black uppercase tracking-[.2em] text-[#f0c04a]">KillaGraphics Design System</span></div>
            <Link href="/king/content"><a className="text-xs font-black uppercase tracking-[.15em] text-zinc-300 transition hover:text-white">Creation room</a></Link>
          </header>

          <div className="grid gap-10 py-10 lg:grid-cols-[.9fr_1.1fr] lg:py-14">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.28em] text-[#f0c04a]">The static master is the authority</p>
              <h1 className="mt-5 max-w-2xl text-5xl font-black leading-[.82] tracking-[-.08em] sm:text-7xl">Build the poster.<br /><span className="text-[#f0c04a]">Wake up the world.</span></h1>
              <p className="mt-7 max-w-xl text-base leading-relaxed text-zinc-300 sm:text-lg">This is not a template picker. It builds original KillaGraphics campaign artwork from the event world, real people and marks, massive type, color pressure, details, and the final print-level lockup. Then it makes that same design move.</p>

              <div className="mt-9 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => { setCreationMode("from_scratch"); setLayers([]); }} className={`min-h-40 border p-5 text-left transition ${creationMode === "from_scratch" ? "border-[#f0c04a] bg-[#f0c04a]/10" : "border-white/10 bg-black/25 hover:border-white/30"}`}><Sparkles className="h-5 w-5 text-[#f0c04a]" /><span className="mt-5 block text-xl font-black">Build From Scratch</span><span className="mt-3 block text-sm leading-relaxed text-zinc-400">Start with the campaign. No finished flyer needed. CreatorVault builds the KillaGraphics poster architecture.</span></button>
                <button type="button" onClick={() => { setCreationMode("master_art_motion"); setLayers([]); }} className={`min-h-40 border p-5 text-left transition ${creationMode === "master_art_motion" ? "border-[#f0c04a] bg-[#f0c04a]/10" : "border-white/10 bg-black/25 hover:border-white/30"}`}><Clapperboard className="h-5 w-5 text-[#f0c04a]" /><span className="mt-5 block text-xl font-black">Bring Master to Life</span><span className="mt-3 block text-sm leading-relaxed text-zinc-400">Use one finished flyer or cover. It stays an honest flat master while it gets controlled motion.</span></button>
              </div>
              <button type="button" onClick={() => { setCreationMode("layered_poster_motion"); setLayers([]); }} className={`mt-3 min-h-24 w-full border p-5 text-left transition ${creationMode === "layered_poster_motion" ? "border-[#f0c04a] bg-[#f0c04a]/10" : "border-white/10 bg-black/25 hover:border-white/30"}`}><Layers3 className="inline h-5 w-5 text-[#f0c04a]" /><span className="ml-3 text-lg font-black">Layered Poster Motion</span><span className="ml-3 text-sm text-zinc-400">Use two or more real source layers and declare what each one is. No fake recovered Photoshop layers.</span></button>

              <div className="mt-8 border border-white/10 bg-black/25 p-5">
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#f0c04a]">01 / Campaign sources</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-[.72fr_1.28fr]">
                  <button type="button" onClick={() => setPickerOpen(true)} className="relative min-h-48 overflow-hidden border border-dashed border-white/25 bg-[#0d0d0e] text-left transition hover:border-[#f0c04a]">
                    {layers[0] ? preview(layers[0]) : null}
                    {!layers[0] ? <div className="absolute inset-0 flex flex-col justify-end p-4"><ImageIcon className="mb-auto h-7 w-7 text-[#f0c04a]" /><span className="text-base font-black">{needsSource ? "Choose real CreatorVault artwork" : "Add real media if the campaign needs it"}</span></div> : <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 to-transparent p-3"><span className="text-[10px] font-black uppercase tracking-[.15em]">Add or change source</span></div>}
                  </button>
                  <div className="flex flex-col justify-center"><p className="text-xl font-black">{creationMode === "from_scratch" ? "The campaign can begin with a blank poster field." : creationMode === "master_art_motion" ? "One finished master stays one finished master." : "Every layer gets an honest role."}</p><p className="mt-3 text-sm leading-relaxed text-zinc-400">{creationMode === "from_scratch" ? "Use real people, logos, textures, and approved campaign visuals when they belong in the flyer. The system will not invent somebody else’s campaign." : creationMode === "master_art_motion" ? "Motion uses controlled framing and depth only. It will not falsely claim the system rebuilt the original editable layers." : "Choose up to six real CreatorVault sources. A Living Motion Cover must include a background, a subject or hero, and a foreground layer so it can create real depth—not a fake image wiggle."}</p></div>
                </div>
                {layers.length ? <div className="mt-4 grid gap-2">{layers.map((layer, index) => <div key={`${layer.url}-${index}`} className="flex flex-wrap items-center gap-2 border border-white/10 bg-white/[.03] p-2"><span className="max-w-48 truncate text-xs font-bold text-zinc-200">{layer.fileName}</span><select value={layer.role} onChange={(event) => setLayerRole(index, event.target.value as LayerRole)} className="border border-white/15 bg-black px-2 py-1 text-[10px] font-black uppercase tracking-[.08em] text-white outline-none">{roles.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}</select><button type="button" onClick={() => removeLayer(index)} className="ml-auto text-[10px] font-black uppercase tracking-[.12em] text-red-300">Remove</button></div>)}</div> : null}
              </div>
            </div>

            <div className="border border-white/15 bg-[#101013]/95 p-5 shadow-2xl shadow-black/40 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#f0c04a]">02 / Build the composition</p><p className="mt-2 text-xl font-black">KillaGraphics campaign room</p></div><span className="border border-[#f0c04a]/40 px-3 py-2 text-[9px] font-black uppercase tracking-[.16em] text-[#f0c04a]">{selectedFormat.badge}</span></div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">{formats.map((item) => <button key={item.id} type="button" onClick={() => setFormat(item.id)} className={`min-h-26 border p-3 text-left transition ${item.id === format ? "border-[#f0c04a] bg-[#f0c04a]/10" : "border-white/10 bg-black/25 hover:border-white/30"}`}><span className="text-[9px] font-black uppercase tracking-[.12em] text-zinc-500">{item.eyebrow}</span><span className="mt-2 block text-sm font-black leading-tight">{item.label}</span></button>)}</div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">{families.map((item) => <button key={item.id} type="button" onClick={() => { setFamily(item.id); setAccent(item.accent); }} className={`border p-4 text-left transition ${item.id === family ? "border-white/45 bg-white/[.07]" : "border-white/10 bg-black/25 hover:border-white/30"}`}><span className="block h-1.5 w-12" style={{ backgroundColor: item.accent }} /><span className="mt-3 block text-sm font-black">{item.label}</span><span className="mt-2 block text-xs leading-relaxed text-zinc-500">{item.note}</span></button>)}</div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2"><span className="text-[10px] font-black uppercase tracking-[.17em] text-zinc-400">The main title</span><input value={headline} onChange={(event) => setHeadline(event.target.value)} maxLength={180} placeholder="MAJOR LEAGUE MONDAYS" className="mt-2 min-h-14 w-full border border-white/15 bg-black/30 px-4 text-xl font-black uppercase tracking-[-.04em] text-white outline-none placeholder:text-zinc-700 focus:border-[#f0c04a]" /></label>
                <label className="block"><span className="text-[10px] font-black uppercase tracking-[.17em] text-zinc-400">Campaign type</span><input value={campaignType} onChange={(event) => setCampaignType(event.target.value)} placeholder="Event poster" className="mt-2 min-h-12 w-full border border-white/15 bg-black/30 px-3 text-sm font-bold text-white outline-none placeholder:text-zinc-700 focus:border-[#f0c04a]" /></label>
                <label className="block"><span className="text-[10px] font-black uppercase tracking-[.17em] text-zinc-400">Campaign world</span><input value={campaignWorld} onChange={(event) => setCampaignWorld(event.target.value)} placeholder="Dallas nightlife · football weekend" className="mt-2 min-h-12 w-full border border-white/15 bg-black/30 px-3 text-sm font-bold text-white outline-none placeholder:text-zinc-700 focus:border-[#f0c04a]" /></label>
                <label className="block"><span className="text-[10px] font-black uppercase tracking-[.17em] text-zinc-400">Host / artist / presenter</span><input value={hostLine} onChange={(event) => setHostLine(event.target.value)} placeholder="HOLLYWOOD BAYBAY PRESENTS" className="mt-2 min-h-12 w-full border border-white/15 bg-black/30 px-3 text-sm font-bold uppercase text-white outline-none placeholder:text-zinc-700 focus:border-[#f0c04a]" /></label>
                <label className="block"><span className="text-[10px] font-black uppercase tracking-[.17em] text-zinc-400">Client or brand</span><input value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Hollywood BayBay" className="mt-2 min-h-12 w-full border border-white/15 bg-black/30 px-3 text-sm font-bold text-white outline-none placeholder:text-zinc-700 focus:border-[#f0c04a]" /></label>
                <label className="block sm:col-span-2"><span className="text-[10px] font-black uppercase tracking-[.17em] text-zinc-400">Support line</span><textarea value={supportingLine} onChange={(event) => setSupportingLine(event.target.value)} rows={2} placeholder="The sentence that gives the title its world without crowding it." className="mt-2 w-full resize-none border border-white/15 bg-black/30 p-3 text-sm leading-relaxed text-white outline-none placeholder:text-zinc-700 focus:border-[#f0c04a]" /></label>
                <label className="block"><span className="text-[10px] font-black uppercase tracking-[.17em] text-zinc-400">Date</span><input value={eventDate} onChange={(event) => setEventDate(event.target.value)} placeholder="OCT 6TH" className="mt-2 min-h-12 w-full border border-white/15 bg-black/30 px-3 text-sm font-black uppercase text-white outline-none placeholder:text-zinc-700 focus:border-[#f0c04a]" /></label>
                <label className="block"><span className="text-[10px] font-black uppercase tracking-[.17em] text-zinc-400">Time</span><input value={eventTime} onChange={(event) => setEventTime(event.target.value)} placeholder="10PM–2AM" className="mt-2 min-h-12 w-full border border-white/15 bg-black/30 px-3 text-sm font-black uppercase text-white outline-none placeholder:text-zinc-700 focus:border-[#f0c04a]" /></label>
                <label className="block"><span className="text-[10px] font-black uppercase tracking-[.17em] text-zinc-400">Venue</span><input value={venue} onChange={(event) => setVenue(event.target.value)} placeholder="PRYME BAR" className="mt-2 min-h-12 w-full border border-white/15 bg-black/30 px-3 text-sm font-black uppercase text-white outline-none placeholder:text-zinc-700 focus:border-[#f0c04a]" /></label>
                <label className="block"><span className="text-[10px] font-black uppercase tracking-[.17em] text-zinc-400">City</span><input value={city} onChange={(event) => setCity(event.target.value)} placeholder="DALLAS, TX" className="mt-2 min-h-12 w-full border border-white/15 bg-black/30 px-3 text-sm font-black uppercase text-white outline-none placeholder:text-zinc-700 focus:border-[#f0c04a]" /></label>
                <label className="block"><span className="text-[10px] font-black uppercase tracking-[.17em] text-zinc-400">Tickets / offer</span><input value={ticketLine} onChange={(event) => setTicketLine(event.target.value)} placeholder="$5 RUM PUNCH · TABLES AVAILABLE" className="mt-2 min-h-12 w-full border border-white/15 bg-black/30 px-3 text-sm font-bold uppercase text-white outline-none placeholder:text-zinc-700 focus:border-[#f0c04a]" /></label>
                <label className="block"><span className="text-[10px] font-black uppercase tracking-[.17em] text-zinc-400">Action line</span><input value={callToAction} onChange={(event) => setCallToAction(event.target.value)} placeholder="GET TICKETS NOW" className="mt-2 min-h-12 w-full border border-white/15 bg-black/30 px-3 text-sm font-bold uppercase text-white outline-none placeholder:text-zinc-700 focus:border-[#f0c04a]" /></label>
                <label className="block sm:col-span-2"><span className="text-[10px] font-black uppercase tracking-[.17em] text-zinc-400">Authorship / design credit</span><input value={creditLine} onChange={(event) => setCreditLine(event.target.value)} placeholder="DESIGN BY KILLAGRAPHICS" className="mt-2 min-h-12 w-full border border-white/15 bg-black/30 px-3 text-sm font-black uppercase text-white outline-none placeholder:text-zinc-700 focus:border-[#f0c04a]" /></label>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3"><label className="block"><span className="text-[10px] font-black uppercase tracking-[.17em] text-zinc-400">Campaign field</span><input type="color" value={primary} onChange={(event) => setPrimary(event.target.value)} className="mt-2 h-12 w-full border border-white/15 bg-black p-1" /></label><label className="block"><span className="text-[10px] font-black uppercase tracking-[.17em] text-zinc-400">Accent pressure</span><input type="color" value={accent} onChange={(event) => setAccent(event.target.value)} className="mt-2 h-12 w-full border border-white/15 bg-black p-1" /></label></div>

              <button type="button" onClick={build} disabled={!canBuild} className="mt-7 inline-flex min-h-16 w-full items-center justify-center gap-2 bg-[#f0c04a] px-6 font-black text-[#17120a] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40">{createProject.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}{createProject.isPending ? "Building your real master" : creationMode === "from_scratch" ? "Build KillaGraphics Static Master" : creationMode === "master_art_motion" ? "Bring Master Artwork to Life" : "Build Layered Poster Motion"}</button>
              {createProject.error ? <p className="mt-4 text-sm font-semibold text-red-300">The project was not marked finished. {createProject.error.message}</p> : null}
              {!canBuild ? <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-[.12em] text-zinc-500">{!headline.trim() ? "Add the main title to begin" : creationMode === "master_art_motion" && !layers.length ? "Choose one finished master artwork" : creationMode === "layered_poster_motion" && layers.length < 2 ? "Choose at least two real source layers" : "Ready"}</p> : <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-[.12em] text-zinc-500">Static master first · motion inherits the master · no fake layers</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[1.12fr_.88fr]">
          <div className="overflow-hidden border border-white/15 bg-black"><div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#f0c04a]">03 / Static master + motion proof</p><p className="mt-1 text-lg font-black">{projectTitle(result || legacyProof)}</p></div>{resultIsOwnerOutput ? <span className="text-[9px] font-black uppercase tracking-[.14em] text-[#7ee2aa]">Saved owner output</span> : <span className="text-[9px] font-black uppercase tracking-[.14em] text-zinc-500">Accepted example only</span>}</div><div className="grid min-h-[26rem] bg-[#080706] sm:grid-cols-2"><div className="relative min-h-64 bg-black">{resultStill ? <img src={resultStill} alt="Saved KillaGraphics static master" className="h-full w-full object-cover" /> : <div className="absolute inset-0 flex flex-col justify-end p-6"><ImageIcon className="mb-auto h-8 w-8 text-zinc-700" /><p className="text-2xl font-black">The static master appears only after the real render exists.</p></div>}</div><div className="relative min-h-64 bg-black">{resultMotion ? <video src={String(resultMotion)} poster={result?.thumbnailUrl || legacyProof?.thumbnailUrl || undefined} controls autoPlay loop muted playsInline className="h-full w-full object-cover" aria-label={resultIsOwnerOutput ? "Completed KillaGraphics motion" : "Accepted Motion Flyer example"} /> : <div className="absolute inset-0 flex flex-col justify-end p-6"><Film className="mb-auto h-8 w-8 text-zinc-700" /><p className="text-2xl font-black">Motion appears only after the real MP4 exists.</p></div>}</div></div>{(resultStill || resultMotion) ? <div className="flex flex-wrap gap-3 border-t border-white/10 p-4">{resultStill ? <a href={resultStill} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 border border-white/20 px-4 text-xs font-black uppercase tracking-[.12em] transition hover:border-[#f0c04a]">Open static master <ArrowUpRight className="h-3.5 w-3.5" /></a> : null}{resultMotion ? <a href={String(resultMotion)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 border border-[#f0c04a]/50 px-4 text-xs font-black uppercase tracking-[.12em] text-[#f0c04a] transition hover:bg-[#f0c04a]/10">Play motion <Play className="h-3.5 w-3.5 fill-current" /></a> : null}</div> : null}</div>
          <aside className="border border-white/10 bg-white/[.025] p-6"><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#f0c04a]">The KillaGraphics law</p><h2 className="mt-4 text-3xl font-black leading-none tracking-[-.05em]">Your flyer is the master. Motion respects it.</h2><p className="mt-5 text-sm leading-relaxed text-zinc-400">The system uses the same poster family, title pressure, people, color field, ribbons, information zones, client marks, and KillaGraphics credit from static to motion. It does not turn your work into a generic Canva animation.</p><div className="mt-7 space-y-3 border-t border-white/10 pt-5 text-[10px] font-black uppercase tracking-[.13em] text-zinc-400"><p>Build from campaign facts—not templates</p><p>Use only real source media and honest layer roles</p><p>Static master must exist before motion</p><p>Finish on a readable poster lockup</p></div><div className="mt-8 border-t border-white/10 pt-5"><p className="text-[10px] font-black uppercase tracking-[.16em] text-zinc-500">Existing proof lane preserved</p><button type="button" onClick={() => createProof.mutate()} disabled={createProof.isPending} className="mt-3 inline-flex items-center gap-2 text-sm font-black text-[#f0c04a] transition hover:text-white disabled:opacity-50">{createProof.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}{createProof.isPending ? "Rebuilding accepted proof" : "Rebuild accepted Motion Flyer proof"}</button></div></aside>
        </div>
      </section>

      <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onConfirm={chooseAssets} mode={creationMode === "master_art_motion" ? "single" : "multi"} maxSelect={creationMode === "master_art_motion" ? 1 : Math.max(1, 6 - layers.length)} title={pickerTitle} subtitle={pickerSubtitle} confirmLabel={creationMode === "master_art_motion" ? "Use finished master" : "Use real campaign source"} emptyActionHref="/media/hub" emptyActionLabel="Open Media Hub" />
    </main>
  );
}

export default MotionFlyerAgent;
