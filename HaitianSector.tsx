import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Globe, DollarSign, TrendingUp, Users, Star, BookOpen,
  MessageCircle, Target, Zap, Crown, CheckCircle2,
  GraduationCap, Flame, MapPin, ExternalLink
} from "lucide-react";

// ─── HAITIAN SECTOR CREATORS ─────────────────────────────────────────────────
const HAITIAN_CREATORS = [
  {
    name: "Haitian Network — Pétion-Ville",
    handle: "@petionville",
    city: "Pétion-Ville",
    platforms: ["VaultX", "TK", "IG", "TG"],
    status: "ONBOARDING",
    monthlyRevenue: 0,
    languages: ["HT", "FR", "EN"],
    niche: "Lifestyle + Beauty",
    notes: "Premye kreyatè nan rezo Ayisyen an. Onboarding aktif. Pétion-Ville se mache a.",
    color: "text-blue-400",
  },
  {
    name: "Haitian Network — Cap-Haïtien",
    handle: "@caphaitian",
    city: "Cap-Haïtien",
    platforms: ["TK", "IG", "TG"],
    status: "ONBOARDING",
    monthlyRevenue: 0,
    languages: ["HT", "EN"],
    niche: "Fitness + Lifestyle",
    notes: "Dezyèm mache a. Cap-Haïtien gen anpil potansyèl. Rekritman aktif.",
    color: "text-red-400",
  },
  {
    name: "Haitian Network — Port-au-Prince",
    handle: "@haitianvault",
    city: "Port-au-Prince",
    platforms: ["TK", "IG", "WA"],
    status: "ONBOARDING",
    monthlyRevenue: 0,
    languages: ["HT", "FR"],
    niche: "Lifestyle + Kontni Kreyasyon",
    notes: "Kapital la. Gwo mache. Rekritman pou kreyatè serye ki vle fè lajan.",
    color: "text-yellow-400",
  },
];

// ─── HAITIAN ACADEMY COURSES ──────────────────────────────────────────────────
const HAITIAN_COURSES = [
  {
    id: "debut",
    title: "Angle pou Kreyatè: Nivo Debutan",
    subtitle: "English for Creators: Beginner",
    level: "Debutan",
    price: 97,
    duration: "4 semèn",
    lessons: 12,
    description: "Aprann angle debaz pou konekte ak odyans gringo yo. Salitasyon, fraz kontni, CTA an angle. Pafè pou kòmanse.",
    modules: ["Salitasyon & Entwodiksyon", "Achte & Lajan", "Transpò", "Travay Vokabilè", "Fraz TikTok"],
    status: "DISPONIB",
    color: "from-blue-900/40 to-blue-950/60",
    accent: "text-blue-400",
    border: "border-blue-500/30",
  },
  {
    id: "entermediyer",
    title: "Angle pou Kreyatè: Nivo Entèmedyè",
    subtitle: "English for Creators: Intermediate",
    level: "Entèmedyè",
    price: 147,
    duration: "6 semèn",
    lessons: 18,
    description: "Pote angle ou nan nivo swivan an. Captions, scripts TikTok, repons DM an angle. Pou kreyatè ki gen baz.",
    modules: ["Captions Kontni", "Konvèsasyon DM", "Imèl Brand Deal", "Live Stream Angle", "Fraz Kwasans Odyans"],
    status: "DISPONIB",
    color: "from-purple-900/40 to-purple-950/60",
    accent: "text-purple-400",
    border: "border-purple-500/30",
  },
  {
    id: "vip",
    title: "Coaching VIP 1-a-1: Angle + Estrateji",
    subtitle: "VIP Coaching: English + Strategy",
    level: "Tout Nivo",
    price: 997,
    duration: "12 semèn",
    lessons: 36,
    description: "Coaching prive ak KingCam. Angle + estrateji kontni + monetizasyon konplè. Pou sa ki pare pou nivo pwochèn an.",
    modules: ["Evalyasyon Pèsonèl", "Sesyon 1-a-1 Chak Semèn", "Kourikoulòm Pèsonalize", "Reduksyon Aksan", "Swivi Objektif"],
    status: "DISPONIB",
    color: "from-yellow-900/40 to-yellow-950/60",
    accent: "text-yellow-400",
    border: "border-yellow-500/30",
  },
];

// ─── HAITIAN FUNNELS ──────────────────────────────────────────────────────────
const HAITIAN_FUNNELS = [
  {
    name: "Fonèl WhatsApp Ayisyen",
    trigger: "Itilizatè Ayisyen antre nan WhatsApp",
    steps: [
      "Repons otomatik an Kreyòl: 'Bonjou! Byenvini nan CreatorVault 🇭🇹'",
      "Meni bileng: Kreyòl / English",
      "Kalifikasyon: Kreyatè oswa Etidyan?",
      "Kreyatè → Onboarding CreatorVault",
      "Etidyan → Ofèt Akademi Angle",
    ],
    status: "PARE",
    platform: "WhatsApp",
  },
  {
    name: "Fonèl Telegram Ayisyen VIP",
    trigger: "/start an Kreyòl oswa drapo 🇭🇹",
    steps: [
      "Bot detekte lang Kreyòl oswa 🇭🇹",
      "Voye mesaj byenveni bileng",
      "Ofèt: 'Rantre nan VIP Ayisyen' ($97/mwa)",
      "Upsell nan Akademi Angle",
      "Refere yon zanmi: $20 pou chak referans",
    ],
    status: "PARE",
    platform: "Telegram",
  },
  {
    name: "Fonèl TikTok Ayisyen",
    trigger: "Kontni TikTok Kreyòl → lyen bio",
    steps: [
      "Poste TikTok bileng (Kreyòl + subtit angle)",
      "Lyen bio → /ayiti paj aterisaj",
      "Ofèt leson gratis → kaptire imèl",
      "Sekans imèl → vann Akademi Angle",
      "Upsell → Jesyon Kreyatè",
    ],
    status: "PLANIFYE",
    platform: "TikTok",
  },
];

// ─── TERRITORY MAP ────────────────────────────────────────────────────────────
const HAITI_TERRITORIES = [
  { zone: "Pétion-Ville", status: "AKTIF", operators: 1, potential: "Wo", color: "text-green-400", border: "border-green-500/30" },
  { zone: "Cap-Haïtien", status: "ONBOARDING", operators: 1, potential: "Wo", color: "text-blue-400", border: "border-blue-500/30" },
  { zone: "Port-au-Prince", status: "ONBOARDING", operators: 1, potential: "Trè Wo", color: "text-yellow-400", border: "border-yellow-500/30" },
  { zone: "Jacmel", status: "DISPONIB", operators: 0, potential: "Mwayen", color: "text-gray-400", border: "border-gray-500/30" },
  { zone: "Les Cayes", status: "DISPONIB", operators: 0, potential: "Mwayen", color: "text-gray-400", border: "border-gray-500/30" },
  { zone: "Gonaïves", status: "DISPONIB", operators: 0, potential: "Mwayen", color: "text-gray-400", border: "border-gray-500/30" },
];

const REVENUE_STREAMS = [
  { name: "Akademi Angle Ayisyen (Kou)", monthly: 0, target: 3000, status: "pare", growth: "20%/mwa" },
  { name: "Jesyon Kreyatè Ayisyen (Rev Share)", monthly: 0, target: 4000, status: "onboarding", growth: "15%/mwa" },
  { name: "Fonèl WhatsApp Ayisyen VIP", monthly: 0, target: 1500, status: "pare", growth: "18%/mwa" },
  { name: "Kominote Telegram Ayisyen", monthly: 0, target: 1000, status: "pare", growth: "12%/mwa" },
  { name: "Ajans Kontni Bileng", monthly: 0, target: 2500, status: "planifye", growth: "10%/mwa" },
];

const TABS = ["Aperçu", "Akademi Angle", "Kreyatè Ayisyen", "Fonèl", "Revni", "Kat Teritwa"];

export default function HaitianSector() {
  const [activeTab, setActiveTab] = useState("Aperçu");
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  const totalTarget = REVENUE_STREAMS.reduce((s, r) => s + r.target, 0);

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🇭🇹</span>
          <h1 className="text-3xl font-black text-white tracking-tight">SEKTÈ AYISYEN</h1>
          <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs font-bold">ONBOARDING</Badge>
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs font-bold">KREYÒL NATIF</Badge>
        </div>
        <p className="text-gray-400 text-sm">Akademi Angle · Rezo Kreyatè Ayisyen · Fonèl Bileng · Dominasyon WhatsApp 🔥</p>
        <div className="mt-2 flex gap-2">
          <a href="/ayiti" className="text-xs text-blue-400 hover:text-blue-300 underline flex items-center gap-1">
            <ExternalLink className="w-3 h-3" /> Paj Piblik /ayiti
          </a>
          <span className="text-gray-600">·</span>
          <a href="/dominican" className="text-xs text-red-400 hover:text-red-300 underline flex items-center gap-1">
            🇩🇴 Sektè Dominiken
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Kreyatè Aktif", value: HAITIAN_CREATORS.filter(c => c.status === "ACTIVE").length.toString(), icon: Users, color: "text-blue-400" },
          { label: "Onboarding", value: HAITIAN_CREATORS.filter(c => c.status === "ONBOARDING").length.toString(), icon: TrendingUp, color: "text-yellow-400" },
          { label: "Revni Sib/Mwa", value: `$${totalTarget.toLocaleString()}`, icon: DollarSign, color: "text-green-400" },
          { label: "Kou Disponib", value: HAITIAN_COURSES.length.toString(), icon: GraduationCap, color: "text-purple-400" },
        ].map((kpi) => (
          <Card key={kpi.label} className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                <span className="text-xs text-gray-400">{kpi.label}</span>
              </div>
              <div className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
              activeTab === tab
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ─── APERÇU TAB ─────────────────────────────────────────────────────── */}
      {activeTab === "Aperçu" && (
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-blue-900/20 to-red-900/20 border-blue-500/30">
            <CardContent className="p-6">
              <h2 className="text-xl font-black text-white mb-3">🇭🇹 Vizyon Sektè Ayisyen an</h2>
              <p className="text-gray-300 text-sm leading-relaxed mb-4">
                Sektè Ayisyen an pa sèlman yon chanjman lang — se yon ekosistèm konplè pou kreyatè Ayisyen yo.
                Akademi Angle nou an ba yo zouti pou rive jwenn odyans gringo yo. Rezo kreyatè nou an ba yo
                enfrastrikti pou monetize kontni yo. Fonèl nou yo ba yo sistèm pou konvèti swivè an lajan.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { icon: "🎓", title: "Akademi Angle", desc: "3 kou disponib. $97 → $997. Kreyatè ki pale angle fè 10x plis lajan." },
                  { icon: "👥", title: "Rezo Kreyatè", desc: "3 teritwa an onboarding. Pétion-Ville, Cap-Haïtien, Port-au-Prince." },
                  { icon: "💰", title: "Sistèm Rekritman", desc: "Chak kreyatè vin yon rekritè. $25-$50 + 5% revni chak mwa." },
                ].map((item) => (
                  <div key={item.title} className="bg-black/30 rounded-lg p-4 border border-blue-500/20">
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <div className="text-white font-bold text-sm mb-1">{item.title}</div>
                    <div className="text-gray-400 text-xs">{item.desc}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-400">Potansyèl Revni Anyèl</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-green-400">${(totalTarget * 12).toLocaleString()}</div>
                <div className="text-xs text-gray-500 mt-1">Si tout sib yo reyalize nan 12 mwa</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-400">Prochèn Etap</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {["Fini onboarding 3 kreyatè yo", "Aktive fonèl WhatsApp Kreyòl", "Lanse premye kou Akademi Angle", "Rekrite 5 kreyatè adisyonèl"].map((step, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-300">
                    <div className="w-5 h-5 rounded-full bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400 font-bold text-xs">{i + 1}</div>
                    {step}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ─── AKADEMI ANGLE TAB ───────────────────────────────────────────────── */}
      {activeTab === "Akademi Angle" && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
            <h2 className="text-lg font-black text-white mb-1">🎓 Akademi Angle pou Kreyatè Ayisyen</h2>
            <p className="text-gray-400 text-xs">Kreyatè ki pale angle fè 10x plis lajan. Ba yo zouti a. Vann yo kou a.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {HAITIAN_COURSES.map((course) => (
              <div
                key={course.id}
                className={`bg-gradient-to-br ${course.color} border ${course.border} rounded-xl p-5 cursor-pointer transition-all hover:scale-[1.02]`}
                onClick={() => setSelectedCourse(selectedCourse === course.id ? null : course.id)}
              >
                <div className="flex justify-between items-start mb-3">
                  <Badge className="bg-black/40 text-white border-white/20 text-xs">{course.level}</Badge>
                  <span className={`text-2xl font-black ${course.accent}`}>${course.price}</span>
                </div>
                <h3 className="text-white font-black text-sm mb-1">{course.title}</h3>
                <p className="text-xs text-gray-400 italic mb-3">{course.subtitle}</p>
                <p className="text-gray-300 text-xs mb-3">{course.description}</p>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>⏱ {course.duration}</span>
                  <span>📚 {course.lessons} leson</span>
                </div>
                {selectedCourse === course.id && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="text-xs text-gray-400 mb-2 font-bold">Modil yo:</div>
                    {course.modules.map((mod, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-gray-300 mb-1">
                        <CheckCircle2 className={`w-3 h-3 ${course.accent}`} />
                        {mod}
                      </div>
                    ))}
                    <button className={`mt-3 w-full py-2 rounded-lg text-xs font-black bg-white/10 hover:bg-white/20 text-white transition-all`}>
                      Enskri Kounye a — ${course.price}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── KREYATÈ AYISYEN TAB ─────────────────────────────────────────────── */}
      {activeTab === "Kreyatè Ayisyen" && (
        <div className="space-y-4">
          {HAITIAN_CREATORS.map((creator) => (
            <Card key={creator.name} className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className={`text-lg font-black ${creator.color}`}>{creator.name}</div>
                    <div className="text-gray-500 text-xs">{creator.handle} · {creator.city}</div>
                  </div>
                  <Badge className={`text-xs font-bold ${
                    creator.status === "ACTIVE" ? "bg-green-500/20 text-green-300 border-green-500/30" :
                    creator.status === "ONBOARDING" ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" :
                    "bg-gray-500/20 text-gray-300 border-gray-500/30"
                  }`}>
                    {creator.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Niche</div>
                    <div className="text-xs text-white font-medium">{creator.niche}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Platfòm</div>
                    <div className="flex gap-1 flex-wrap">
                      {creator.platforms.map(p => (
                        <span key={p} className="text-xs bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">{p}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Lang</div>
                    <div className="flex gap-1">
                      {creator.languages.map(l => (
                        <span key={l} className="text-xs bg-blue-900/40 text-blue-300 px-1.5 py-0.5 rounded">{l}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Revni/Mwa</div>
                    <div className="text-sm font-black text-green-400">${creator.monthlyRevenue.toLocaleString()}</div>
                  </div>
                </div>
                <div className="bg-black/30 rounded p-3 text-xs text-gray-400 italic">
                  📝 {creator.notes}
                </div>
              </CardContent>
            </Card>
          ))}
          <Card className="bg-gradient-to-br from-blue-900/20 to-black border-blue-500/30 border-dashed">
            <CardContent className="p-5 text-center">
              <div className="text-3xl mb-2">➕</div>
              <div className="text-white font-bold text-sm mb-1">Ajoute Kreyatè Ayisyen</div>
              <div className="text-gray-500 text-xs mb-3">Rekrite nan Pétion-Ville, Cap-Haïtien, Port-au-Prince</div>
              <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all">
                Kòmanse Rekritman
              </button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── FONÈL TAB ───────────────────────────────────────────────────────── */}
      {activeTab === "Fonèl" && (
        <div className="space-y-4">
          {HAITIAN_FUNNELS.map((funnel) => (
            <Card key={funnel.name} className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-white font-black text-sm">{funnel.name}</div>
                    <div className="text-gray-500 text-xs">{funnel.platform} · Deklanche pa: {funnel.trigger}</div>
                  </div>
                  <Badge className={`text-xs font-bold ${
                    funnel.status === "WIRED" ? "bg-green-500/20 text-green-300 border-green-500/30" :
                    funnel.status === "PARE" ? "bg-blue-500/20 text-blue-300 border-blue-500/30" :
                    "bg-gray-500/20 text-gray-300 border-gray-500/30"
                  }`}>
                    {funnel.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {funnel.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400 font-bold text-xs flex-shrink-0 mt-0.5">{i + 1}</div>
                      <div className="text-xs text-gray-300">{step}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ─── REVNI TAB ───────────────────────────────────────────────────────── */}
      {activeTab === "Revni" && (
        <div className="space-y-4">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-sm text-gray-400">Sib Revni Anyèl</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-green-400 mb-1">${(totalTarget * 12).toLocaleString()}</div>
              <div className="text-xs text-gray-500">$0 aktyèl → ${totalTarget.toLocaleString()}/mwa sib</div>
            </CardContent>
          </Card>
          <div className="space-y-3">
            {REVENUE_STREAMS.map((stream) => (
              <Card key={stream.name} className="bg-gray-900/50 border-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-white font-bold">{stream.name}</div>
                    <Badge className={`text-xs ${
                      stream.status === "aktif" ? "bg-green-500/20 text-green-300 border-green-500/30" :
                      stream.status === "pare" ? "bg-blue-500/20 text-blue-300 border-blue-500/30" :
                      stream.status === "onboarding" ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" :
                      "bg-gray-500/20 text-gray-300 border-gray-500/30"
                    }`}>
                      {stream.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mb-2">
                    <div>
                      <div className="text-xs text-gray-500">Aktyèl</div>
                      <div className="text-lg font-black text-white">${stream.monthly.toLocaleString()}</div>
                    </div>
                    <div className="text-gray-600">→</div>
                    <div>
                      <div className="text-xs text-gray-500">Sib/Mwa</div>
                      <div className="text-lg font-black text-green-400">${stream.target.toLocaleString()}</div>
                    </div>
                    <div className="ml-auto">
                      <div className="text-xs text-gray-500">Kwasans</div>
                      <div className="text-sm font-bold text-blue-400">{stream.growth}</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-green-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min((stream.monthly / stream.target) * 100, 100)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ─── KAT TERITWA TAB ─────────────────────────────────────────────────── */}
      {activeTab === "Kat Teritwa" && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-blue-900/20 to-red-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
            <h2 className="text-lg font-black text-white mb-1">🗺️ Kat Teritwa Ayiti</h2>
            <p className="text-gray-400 text-xs">Chak zòn gen yon operatè. Yon operatè rekrite kreyatè nan teritwa li. Yo fè lajan. Ou fè lajan.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {HAITI_TERRITORIES.map((territory) => (
              <Card key={territory.zone} className={`bg-gray-900/50 border ${territory.border}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`text-lg font-black ${territory.color}`}>
                      <MapPin className="w-4 h-4 inline mr-1" />
                      {territory.zone}
                    </div>
                    <Badge className={`text-xs font-bold ${
                      territory.status === "AKTIF" ? "bg-green-500/20 text-green-300 border-green-500/30" :
                      territory.status === "ONBOARDING" ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" :
                      "bg-gray-500/20 text-gray-300 border-gray-500/30"
                    }`}>
                      {territory.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-gray-500">Operatè</div>
                      <div className="text-white font-bold">{territory.operators}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Potansyèl</div>
                      <div className={`font-bold ${territory.color}`}>{territory.potential}</div>
                    </div>
                  </div>
                  {territory.status === "DISPONIB" && (
                    <button className="mt-3 w-full py-1.5 rounded text-xs font-bold bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 transition-all">
                      Pran Teritwa Sa a
                    </button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
