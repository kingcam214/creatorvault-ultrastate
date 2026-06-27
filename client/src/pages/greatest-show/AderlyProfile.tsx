/**
 * ADERLY — Sistema de Dinero Real
 * @adysanchesz | La Mas Perra | Dominicana 🇩🇴
 * Stripe real + drops PPV + Telegram automatizado
 */
import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Crown, Flame, Lock, Check, Zap, Instagram } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const RED = "#FF2D2D", ORANGE = "#FF8C00", GOLD = "#FFD700";
const DARK = "#0a0000", CARD = "rgba(255,255,255,0.04)", BORDER = "rgba(255,255,255,0.08)";

function TarjetaTier({ tier, onSuscribir, cargando }: { tier: any; onSuscribir: (id: string) => void; cargando: boolean }) {
  const esPopular = tier.id === "inner_circle";
  return (
    <div style={{ position: "relative", background: esPopular ? "rgba(255,140,0,0.12)" : CARD, border: `1px solid ${esPopular ? ORANGE : BORDER}`, borderRadius: 20, padding: "28px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
      {esPopular && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: ORANGE, color: "#000", fontSize: 11, fontWeight: 900, padding: "4px 14px", borderRadius: 20, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>LA MÁS PEDÍA</div>}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 6 }}>{tier.emoji}</div>
        <p style={{ fontSize: 11, color: tier.color, fontFamily: "monospace", letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 4px" }}>{tier.nombre}</p>
        <div style={{ fontSize: 42, fontWeight: 900, color: "#fff", lineHeight: 1 }}>${tier.precio}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>al mes</div>
      </div>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", textAlign: "center", lineHeight: 1.5 }}>{tier.descripcion}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {tier.beneficios.map((b: string) => (
          <div key={b} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <Check size={14} color={tier.color} style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{b}</span>
          </div>
        ))}
      </div>
      <button onClick={() => onSuscribir(tier.id)} disabled={cargando} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: esPopular ? `linear-gradient(135deg, ${ORANGE}, ${RED})` : `linear-gradient(135deg, ${tier.color}22, ${tier.color}44)`, color: esPopular ? "#000" : "#fff", fontWeight: 900, fontSize: 15, fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.08em", cursor: cargando ? "not-allowed" : "pointer", opacity: cargando ? 0.7 : 1 }}>
        {cargando ? "Espera..." : `Suscribirse — $${tier.precio}/mes`}
      </button>
    </div>
  );
}

function TarjetaDrop({ drop, onComprar, cargando }: { drop: any; onComprar: (drop: any) => void; cargando: boolean }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ aspectRatio: "9/16", background: `linear-gradient(135deg, ${DARK}, #1a0000)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <div style={{ textAlign: "center" }}><Lock size={32} color="rgba(255,255,255,0.3)" /><p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 8 }}>BLOQUEADO</p></div>
        <div style={{ position: "absolute", top: 8, right: 8, background: RED, color: "#000", fontSize: 9, fontWeight: 900, padding: "3px 8px", borderRadius: 6 }}>{drop.tipo?.toUpperCase()}</div>
      </div>
      <div style={{ padding: "12px 14px" }}>
        <p style={{ fontSize: 14, fontWeight: 800, margin: "0 0 4px" }}>{drop.titulo}</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: "0 0 12px", lineHeight: 1.4 }}>{drop.teaser}</p>
        <button onClick={() => onComprar(drop)} disabled={cargando} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${RED}, ${ORANGE})`, color: "#000", fontWeight: 900, fontSize: 14, cursor: cargando ? "not-allowed" : "pointer" }}>
          Desbloquear — ${drop.precio}
        </button>
      </div>
    </div>
  );
}

const TIERS_DEFAULT = [
  {
    id: "la_perra", nombre: "LA PERRA", emoji: "🔥", precio: 29,
    descripcion: "Todo lo que subo, sin censura. Fotos, videos, detrás de cámara.",
    beneficios: ["Todos los drops regulares", "Detrás de cámara", "Posts diarios", "Acceso temprano a PPV"],
    color: RED, badge: "POPULAR",
  },
  {
    id: "inner_circle", nombre: "INNER CIRCLE", emoji: "💎", precio: 49,
    descripcion: "Canal VIP de Telegram + drops exclusivos que no subo en ningún otro lado.",
    beneficios: ["Todo lo de LA PERRA", "Canal privado de Telegram VIP", "Drops exclusivos solo aquí", "Respondo tus DMs primero", "Video exclusivo mensual"],
    color: ORANGE, badge: "VIP",
  },
  {
    id: "goddess", nombre: "GODDESS", emoji: "👑", precio: 99,
    descripcion: "Acceso total + contenido personalizado + línea directa conmigo.",
    beneficios: ["Todo lo de INNER CIRCLE", "1 contenido personalizado al mes", "DM directo conmigo", "PPV al 50% de descuento", "Tu nombre en mis créditos"],
    color: GOLD, badge: "ELITE",
  },
];

const DROPS_DEFAULT = [
  { id: "d1", titulo: "La Dominicana 🇩🇴", teaser: "Lo que dijeron que era demasiado pa' internet...", precio: 25, tipo: "video" },
  { id: "d2", titulo: "La Sesión del Cuarto Rojo 🔴", teaser: "Cadenas, luz roja, y sin límites. Punto.", precio: 20, tipo: "video" },
  { id: "d3", titulo: "Mi Ritual de Mañana ☀️", teaser: "Así empiezo yo cada día. Solo pa' suscriptores.", precio: 15, tipo: "foto" },
  { id: "d4", titulo: "Lo Mejor de Junio 🔥", teaser: "8 videos. Un solo precio. Tú decides.", precio: 35, tipo: "bundle" },
];

export default function AderlyProfile() {
  const [tab, setTab] = useState<"drops" | "suscribirse" | "sobre">("drops");
  const [cargandoCheckout, setCargandoCheckout] = useState<string | null>(null);

  const profileQ = (trpc as any).aderly?.getProfile?.useQuery?.(undefined, { retry: false });
  const dropsQ = (trpc as any).aderly?.getDrops?.useQuery?.(undefined, { retry: false });
  const checkoutMut = (trpc as any).aderly?.createCheckout?.useMutation?.();
  const purchaseMut = (trpc as any).aderly?.purchaseDrop?.useMutation?.();

  const drops = dropsQ?.data?.drops || DROPS_DEFAULT;
  const tiers = profileQ?.data?.tiers || TIERS_DEFAULT;

  const handleSuscribir = async (tierId: string) => {
    if (!checkoutMut) { toast.error("Pago no disponible ahora mismo"); return; }
    setCargandoCheckout(tierId);
    try {
      const res = await checkoutMut.mutateAsync({ tierId });
      if (res?.checkoutUrl) window.location.href = res.checkoutUrl;
    } catch (e: any) { toast.error(e?.message || "Error al procesar el pago"); }
    finally { setCargandoCheckout(null); }
  };

  const handleComprar = async (drop: any) => {
    if (!purchaseMut) { toast.error("Pago no disponible ahora mismo"); return; }
    setCargandoCheckout(drop.id);
    try {
      const res = await purchaseMut.mutateAsync({ dropId: drop.id, dropTitle: drop.titulo, price: drop.precio });
      if (res?.checkoutUrl) window.location.href = res.checkoutUrl;
    } catch (e: any) { toast.error(e?.message || "Error al procesar el pago"); }
    finally { setCargandoCheckout(null); }
  };

  return (
    <div style={{ minHeight: "100vh", background: DARK, color: "#fff", fontFamily: "DM Sans, sans-serif" }}>
      <style>{`@keyframes pulso{from{transform:scale(1);opacity:0.6}to{transform:scale(1.2);opacity:1}}`}</style>

      {/* HERO */}
      <div style={{ position: "relative", minHeight: "60vh", display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 30% 40%, rgba(255,45,45,0.35) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(255,140,0,0.25) 0%, transparent 60%)` }} />
        {[0,1,2].map(i => <div key={i} style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: ["rgba(255,45,45,0.15)","rgba(255,140,0,0.12)","rgba(255,45,45,0.08)"][i], filter: "blur(60px)", top: `${[20,50,70][i]}%`, left: `${[10,60,30][i]}%`, animation: `pulso ${[3,4,5][i]}s ease-in-out infinite alternate` }} />)}

        <Link href="/greatest-show" style={{ position: "absolute", top: 16, left: 16, zIndex: 10, textDecoration: "none" }}>
          <button style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${BORDER}`, borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}><ArrowLeft size={18} /></button>
        </Link>

        <div style={{ position: "relative", zIndex: 2, width: "100%", padding: "60px 20px 40px", textAlign: "center" }}>
          {/* Badges */}
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginBottom: 16 }}>
            {[["🔥","REINA VIRAL",RED],["👑","LA MAS PERRA",ORANGE],["🇩🇴","DOMINICANA",GOLD]].map(([icon,label,color]) => (
              <div key={label} style={{ padding: "6px 14px", background: `${color}22`, border: `1px solid ${color}55`, borderRadius: 20, fontSize: 11, fontWeight: 900, letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 6 }}><span>{icon}</span>{label}</div>
            ))}
          </div>

          <h1 style={{ fontSize: "clamp(56px,12vw,96px)", fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.04em", lineHeight: 1, margin: "0 0 8px", background: `linear-gradient(135deg, ${RED}, ${ORANGE}, ${GOLD})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Aderly</h1>
          <p style={{ fontSize: "clamp(16px,4vw,22px)", color: "rgba(255,140,0,0.9)", fontWeight: 700, margin: "0 0 16px" }}>La Reina del Contenido Viral · @adysanchesz</p>

          <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 20, flexWrap: "wrap" }}>
            {[["1.7K","Me gustas"],["63","Videos"],["29","Fotos"],["Partner","Nivel"]].map(([val,label]) => (
              <div key={label} style={{ textAlign: "center" }}><div style={{ fontSize: 24, fontWeight: 900, color: GOLD }}>{val}</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em" }}>{label}</div></div>
            ))}
          </div>

          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", maxWidth: 480, margin: "0 auto 24px", lineHeight: 1.6, fontStyle: "italic" }}>
            "Te gusta lo prohibido, lo hot, lo perro, el sexo bruto... LA MAS PERRA 🔥🔥 ¿Quieres ver?"
          </p>

          <button onClick={() => setTab("suscribirse")} style={{ padding: "16px 40px", borderRadius: 14, border: "none", background: `linear-gradient(135deg, ${RED}, ${ORANGE})`, color: "#000", fontSize: 18, fontWeight: 900, fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.08em", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Flame size={20} /> ÚNETE AHORA — DESDE $29/MES
          </button>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 8 }}>Cancela cuando quieras · Acceso inmediato · Pago seguro</p>
        </div>
      </div>

      {/* TABS */}
      <div style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(10,0,0,0.95)", borderBottom: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex" }}>
          {([["drops","💎 Drops PPV"],["suscribirse","🔥 Suscribirse"],["sobre","👑 Sobre Mí"]] as const).map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: "14px 8px", border: "none", background: "transparent", color: tab === id ? ORANGE : "rgba(255,255,255,0.45)", fontWeight: 800, fontSize: 14, cursor: "pointer", borderBottom: tab === id ? `2px solid ${ORANGE}` : "2px solid transparent" }}>{label}</button>
          ))}
        </div>
      </div>

      {/* CONTENIDO */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>

        {/* DROPS PPV */}
        {tab === "drops" && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 28, fontFamily: "Bebas Neue, sans-serif", margin: "0 0 6px" }}>Drops Exclusivos PPV</h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: 0 }}>Desbloquea lo que quieras. Sin suscripción.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
              {drops.map((drop: any) => (
                <TarjetaDrop key={drop.id || drop.titulo} drop={drop} onComprar={handleComprar} cargando={cargandoCheckout === drop.id} />
              ))}
            </div>
            <div style={{ marginTop: 24, background: "rgba(255,45,45,0.08)", border: `1px solid ${RED}33`, borderRadius: 16, padding: "20px", textAlign: "center" }}>
              <Zap size={24} color={ORANGE} style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 16, fontWeight: 800, margin: "0 0 6px" }}>Ahorra más con la suscripción</p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: "0 0 14px" }}>Suscríbete a LA PERRA y accede a todo — más contenido nuevo cada semana.</p>
              <button onClick={() => setTab("suscribirse")} style={{ padding: "12px 28px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${RED}, ${ORANGE})`, color: "#000", fontWeight: 900, fontSize: 14, cursor: "pointer" }}>Suscribirme desde $29/mes →</button>
            </div>
          </div>
        )}

        {/* SUSCRIBIRSE */}
        {tab === "suscribirse" && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 28, fontFamily: "Bebas Neue, sans-serif", margin: "0 0 6px" }}>Elige Tu Nivel de Acceso</h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: 0 }}>Suscripción mensual. Cancelas cuando quieras. Acceso inmediato.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
              {tiers.map((tier: any) => <TarjetaTier key={tier.id} tier={tier} onSuscribir={handleSuscribir} cargando={cargandoCheckout === tier.id} />)}
            </div>
            <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
              {[["🔒","Pago seguro con Stripe"],["⚡","Acceso inmediato"],["❌","Cancelas cuando quieras"]].map(([icon,text]) => (
                <div key={text} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.4)" }}><span>{icon}</span>{text}</div>
              ))}
            </div>
          </div>
        )}

        {/* SOBRE MÍ */}
        {tab === "sobre" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "20px" }}>
              <h3 style={{ fontSize: 20, fontFamily: "Bebas Neue, sans-serif", color: ORANGE, margin: "0 0 12px" }}>Mi Historia</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, margin: 0 }}>
                Soy Aderly. Dominicana. Partner. 1.7K me gustas y subiendo. Estaba regalando mi contenido premium a $15 al mes — eso se acabó. Ahora estoy construyendo la marca de creadora de habla hispana más adictiva del internet. Cada drop es un evento. Cada pieza de contenido es una razón pa' suscribirse.
              </p>
            </div>

            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "20px" }}>
              <h3 style={{ fontSize: 20, fontFamily: "Bebas Neue, sans-serif", color: RED, margin: "0 0 12px" }}>¿Qué Recibes?</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  ["🔥","Drops diarios — fotos, videos, detrás de cámara"],
                  ["💎","PPV exclusivos — lo que es demasiado pa' el feed normal"],
                  ["📱","Canal privado de Telegram VIP (INNER CIRCLE en adelante)"],
                  ["👑","Contenido personalizado (nivel GODDESS)"],
                  ["🇩🇴","Contenido en español e inglés — bilingüe de verdad"],
                ].map(([icon,text]) => (
                  <div key={text} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "20px" }}>
              <h3 style={{ fontSize: 20, fontFamily: "Bebas Neue, sans-serif", color: GOLD, margin: "0 0 12px" }}>Encuéntrame</h3>
              <a href="https://instagram.com/adysanchesz" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 10, color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 700 }}>
                <Instagram size={20} color="#E1306C" /> @adysanchesz en Instagram
              </a>
            </div>

            <button onClick={() => setTab("suscribirse")} style={{ padding: "18px", borderRadius: 14, border: "none", background: `linear-gradient(135deg, ${RED}, ${ORANGE})`, color: "#000", fontSize: 18, fontWeight: 900, fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.08em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Crown size={20} /> EMPIEZA TU SUSCRIPCIÓN
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
