/**
 * ============================================================================
 * VAULTX TRILINGUAL SYSTEM
 * Languages: English (en) | Haitian Creole (ht) | Dominican Spanish (es-do)
 *
 * Usage:
 *   import { useVaultXLang, VaultXLangSwitcher } from "@/lib/vaultxI18n";
 *   const { t, lang, setLang } = useVaultXLang();
 *   <p>{t("hero.tagline")}</p>
 *   <VaultXLangSwitcher />
 * ============================================================================
 */
import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type VaultXLang = "en" | "ht" | "es-do";

// ─── Translation Dictionary ───────────────────────────────────────────────────
// Keys are dot-notation paths. Values are [English, Haitian Creole, Dominican Spanish]
const TRANSLATIONS: Record<string, [string, string, string]> = {

  // ── Language names ──────────────────────────────────────────────────────────
  "lang.en":    ["English",       "Anglè",        "Inglés"],
  "lang.ht":    ["Haitian Creole","Kreyòl Ayisyen","Criollo Haitiano"],
  "lang.es-do": ["Dominican Spanish","Panyòl Dominiken","Español Dominicano"],

  // ── VaultX Hub ──────────────────────────────────────────────────────────────
  "hub.title":          ["VaultX",                    "VaultX",                     "VaultX"],
  "hub.tagline":        ["Turn your content into paid drops. Keep 85%.",
                         "Tounen kontni ou an lajan. Kenbe 85%.",
                         "Convierte tu contenido en drops de pago. Quédate el 85%."],
  "hub.cta_create":     ["Create a Drop",             "Kreye yon Drop",             "Crear un Drop"],
  "hub.cta_start":      ["Start Creating",            "Kòmanse Kreye",              "Empieza a Crear"],
  "hub.how_it_works":   ["How it works",              "Kijan sa travay",            "Cómo funciona"],
  "hub.step1":          ["Upload your video",         "Telechaje videyo ou",        "Sube tu video"],
  "hub.step2":          ["Pick a style",              "Chwazi yon estil",           "Elige un estilo"],
  "hub.step3":          ["Set your price",            "Mete pri ou",                "Pon tu precio"],
  "hub.step4":          ["Get paid",                  "Resevwa lajan ou",           "Cobra tu dinero"],
  "hub.body_cinema":    ["Body Cinema",               "Sinema Kò",                  "Body Cinema"],
  "hub.body_cinema_desc":["AI-powered cinematic video generation",
                          "Jenere videyo sinematis ak AI",
                          "Generación de video cinemático con IA"],
  "hub.paid_drops":     ["Paid Drops",                "Drops Peye",                 "Drops de Pago"],
  "hub.paid_drops_desc":["Create PPV content with Stripe checkout",
                         "Kreye kontni PPV ak Stripe",
                         "Crea contenido PPV con pago por Stripe"],
  "hub.distribution":   ["Distribution",              "Distribisyon",               "Distribución"],
  "hub.distribution_desc":["Auto-post to Telegram & all channels",
                           "Poste otomatikman sou Telegram ak tout kanal",
                           "Publica automáticamente en Telegram y todos los canales"],
  "hub.video_editor":   ["Video Editor",              "Editè Videyo",               "Editor de Video"],
  "hub.content_factory":["Content Factory",           "Faktori Kontni",             "Fábrica de Contenido"],
  "hub.trailers":       ["Viral Trailers",            "Trelè Viral",                "Trailers Virales"],
  "hub.earnings":       ["Earnings",                  "Revni",                      "Ganancias"],
  "hub.messages":       ["Messages",                  "Mesaj",                      "Mensajes"],
  "hub.profile":        ["Profile",                   "Pwofil",                     "Perfil"],

  // ── VaultX Drop ─────────────────────────────────────────────────────────────
  "drop.title":         ["Drop your video. We handle the rest.",
                         "Mete videyo ou. Nou okipe rès la.",
                         "Sube tu video. Nosotros hacemos el resto."],
  "drop.subtitle":      ["Tap to upload your video",  "Klike pou telechaje videyo ou","Toca para subir tu video"],
  "drop.uploading":     ["Uploading...",               "Ap telechaje...",             "Subiendo..."],
  "drop.upload_done":   ["Upload complete",            "Telechajman fini",            "Subida completa"],
  "drop.pick_preset":   ["Pick a preset",              "Chwazi yon prèsè",            "Elige un preset"],
  "drop.preset_desc":   ["Each preset controls the lighting, motion, camera, and copy for your drop.",
                         "Chak prèsè kontwole limyè, mouvman, kamera, ak kopi pou drop ou.",
                         "Cada preset controla la iluminación, movimiento, cámara y texto de tu drop."],
  "drop.skip_preset":   ["Skip →",                    "Pase →",                      "Saltar →"],
  "drop.configure":     ["Configure your drop",        "Konfigire drop ou",           "Configura tu drop"],
  "drop.title_label":   ["Drop title",                 "Tit drop",                    "Título del drop"],
  "drop.price_label":   ["Unlock price ($)",           "Pri pou debloke ($)",         "Precio de desbloqueo ($)"],
  "drop.consent":       ["I confirm I own this content and consent to AI transformation, monetization, and distribution.",
                         "Mwen konfime mwen posede kontni sa a epi mwen dakò ak transfòmasyon AI, monetizasyon, ak distribisyon.",
                         "Confirmo que soy dueño/a de este contenido y doy mi consentimiento para transformación con IA, monetización y distribución."],
  "drop.launch":        ["Launch This Drop",           "Lanse Drop Sa",               "Lanzar Este Drop"],
  "drop.launching":     ["Launching...",               "Ap lanse...",                 "Lanzando..."],
  "drop.building":      ["Building your drop...",      "Ap bati drop ou...",          "Construyendo tu drop..."],
  "drop.live":          ["Drop is live!",              "Drop la vivan!",              "¡El drop está activo!"],
  "drop.checkout_link": ["Open Checkout Link",         "Ouvri Lyen Peman",            "Abrir Enlace de Pago"],
  "drop.post_telegram": ["Post to Telegram",           "Poste sou Telegram",          "Publicar en Telegram"],
  "drop.new_drop":      ["New Drop",                   "Nouvo Drop",                  "Nuevo Drop"],
  "drop.your_cut":      ["Your cut (85%)",             "Pati ou (85%)",               "Tu parte (85%)"],
  "drop.status":        ["Status",                     "Estati",                      "Estado"],
  "drop.package_id":    ["Package ID",                 "ID Pakèt",                    "ID del Paquete"],

  // ── Presets ──────────────────────────────────────────────────────────────────
  "preset.browse":      ["Browse Presets",             "Navige Prèsè yo",             "Ver Presets"],
  "preset.top_converting":["Top Converting",           "Pi Bon Konvèsyon",            "Más Convertidores"],
  "preset.body_features":["Body Features",             "Karakteristik Kò",            "Características del Cuerpo"],
  "preset.heat":        ["Heat",                       "Chalè",                       "Calor"],
  "preset.conversion":  ["Conversion",                 "Konvèsyon",                   "Conversión"],
  "preset.ppv_price":   ["PPV Price",                  "Pri PPV",                     "Precio PPV"],
  "preset.vip_price":   ["VIP Price",                  "Pri VIP",                     "Precio VIP"],
  "preset.selected":    ["Preset applied",             "Prèsè aplike",                "Preset aplicado"],
  "preset.clear":       ["Clear preset",               "Efase prèsè",                 "Quitar preset"],
  "preset.telegram_caption":["Telegram Caption",       "Kaptisyon Telegram",          "Descripción para Telegram"],
  "preset.dm_hook":     ["DM Hook",                    "Krochet DM",                  "Gancho de DM"],
  "preset.ppv_unlock":  ["PPV Unlock Line",            "Liy Debloke PPV",             "Línea de Desbloqueo PPV"],

  // ── VaultX Editor ───────────────────────────────────────────────────────────
  "editor.title":       ["VaultX Editor",              "Editè VaultX",                "Editor VaultX"],
  "editor.tagline":     ["Edit like a studio. Export a finished video.",
                         "Edite tankou yon estidyo. Ekspòte yon videyo fini.",
                         "Edita como un estudio. Exporta un video terminado."],
  "editor.upload":      ["Upload your video",          "Telechaje videyo ou",         "Sube tu video"],
  "editor.timeline":    ["Timeline",                   "Tan Reyèl",                   "Línea de Tiempo"],
  "editor.style":       ["Style",                      "Estil",                       "Estilo"],
  "editor.captions":    ["Captions",                   "Kaptisyon",                   "Subtítulos"],
  "editor.publish":     ["Publish",                    "Pibliye",                     "Publicar"],
  "editor.body":        ["Body Focus",                 "Fòkis Kò",                    "Enfoque Corporal"],
  "editor.render":      ["Render Finished Video",      "Rann Videyo Fini",            "Renderizar Video Terminado"],
  "editor.rendering":   ["Rendering...",               "Ap rann...",                  "Renderizando..."],
  "editor.download":    ["Download",                   "Telechaje",                   "Descargar"],
  "editor.next_step":   ["Next step",                  "Pwochen etap",                "Próximo paso"],
  "editor.upload_first":["Upload your video to start", "Telechaje videyo ou pou kòmanse","Sube tu video para empezar"],
  "editor.pick_style":  ["Next: Pick a style for your drop","Pwochen: Chwazi yon estil pou drop ou","Próximo: Elige un estilo para tu drop"],
  "editor.set_price":   ["Next: Set your unlock price","Pwochen: Mete pri deblokaj ou","Próximo: Pon tu precio de desbloqueo"],
  "editor.confirm_consent":["Next: Confirm consent to unlock export","Pwochen: Konfime konsantman pou debloke ekspòtasyon","Próximo: Confirma el consentimiento para exportar"],
  "editor.export_ready":["Export drop package — ready to launch","Ekspòte pakèt drop — prè pou lanse","Exportar paquete del drop — listo para lanzar"],
  "editor.clips":       ["clips on timeline",          "klip sou tan reyèl",          "clips en la línea de tiempo"],
  "editor.add_clip":    ["Add clip",                   "Ajoute klip",                 "Agregar clip"],
  "editor.trim":        ["Trim",                       "Koupe",                       "Recortar"],
  "editor.split":       ["Split",                      "Divize",                      "Dividir"],
  "editor.undo":        ["Undo",                       "Defè",                        "Deshacer"],
  "editor.redo":        ["Redo",                       "Refè",                        "Rehacer"],

  // ── Trailer Studio ──────────────────────────────────────────────────────────
  "trailer.title":      ["VaultX Trailers",            "Trelè VaultX",                "Trailers VaultX"],
  "trailer.start_over": ["Start over",                 "Rekòmanse",                   "Empezar de nuevo"],
  "trailer.mode_title": ["Choose your creation mode.", "Chwazi mòd kreyasyon ou.",    "Elige tu modo de creación."],
  "trailer.mode_subtitle":["5 ways to create. Pick what fits your content.",
                           "5 fason pou kreye. Chwazi sa ki adapte kontni ou.",
                           "5 formas de crear. Elige lo que va con tu contenido."],
  "trailer.original":   ["Original Edit",              "Edisyon Orijinal",            "Edición Original"],
  "trailer.ai_remix":   ["AI Remix",                   "Remiks AI",                   "Remix con IA"],
  "trailer.ai_full":    ["AI Full Shoot",              "Tout Tournaj AI",             "Rodaje Completo con IA"],
  "trailer.hybrid":     ["Hybrid",                     "Ibrid",                       "Híbrido"],
  "trailer.photo_cine": ["Photo Cinematic",            "Foto Sinematis",              "Foto Cinemática"],
  "trailer.add_clips":  ["Add clips",                  "Ajoute klip",                 "Agregar clips"],
  "trailer.add_music":  ["Add music",                  "Ajoute mizik",                "Agregar música"],
  "trailer.build":      ["BUILD VIRAL TRAILER",        "BATI TRELÈ VIRAL",            "CONSTRUIR TRAILER VIRAL"],
  "trailer.building":   ["Building your trailer...",   "Ap bati trelè ou...",         "Construyendo tu trailer..."],
  "trailer.ready":      ["Your trailer is ready.",     "Trelè ou prè.",               "Tu trailer está listo."],
  "trailer.download":   ["Download trailer",           "Telechaje trelè",             "Descargar trailer"],
  "trailer.paid_drop":  ["Turn this into a paid drop", "Tounen sa an yon drop peye",  "Convertir esto en un drop de pago"],
  "trailer.pick_template":["Pick your viral structure.","Chwazi estrikti viral ou.",  "Elige tu estructura viral."],
  "trailer.fx_title":   ["Dial in your effects.",      "Ajiste efè ou yo.",           "Ajusta tus efectos."],
  "trailer.vibe":       ["Color Vibe",                 "Koule Atmosfè",               "Ambiente de Color"],
  "trailer.aspect":     ["Aspect Ratio",               "Rapò Aspè",                   "Relación de Aspecto"],
  "trailer.effects":    ["Cinematic Effects",          "Efè Sinematis",               "Efectos Cinematográficos"],
  "trailer.chroma":     ["Chromatic Aberration",       "Aberasyon Kromatik",          "Aberración Cromática"],
  "trailer.light_leaks":["Light Leaks",                "Fuit Limyè",                  "Fugas de Luz"],
  "trailer.letterbox":  ["Letterbox Bars",             "Ba Lèt Bwat",                 "Barras Cinemáticas"],
  "trailer.glitch":     ["Glitch Frame",               "Imaj Glitch",                 "Frame con Glitch"],
  "trailer.ai_mode":    ["AI Remix — reshoot from new angles",
                         "Remiks AI — retounen ak nouvo ang",
                         "Remix con IA — refilmar desde nuevos ángulos"],
  "trailer.ai_desc":    ["AI generates brand-new camera angles from your clip.",
                         "AI jenere nouvo ang kamera ki soti nan klip ou.",
                         "La IA genera nuevos ángulos de cámara desde tu clip."],

  // ── Body Cinema ─────────────────────────────────────────────────────────────
  "body.title":         ["Body Cinema",                "Sinema Kò",                   "Body Cinema"],
  "body.tagline":       ["Turn your video into a paid drop.",
                         "Tounen videyo ou an yon drop peye.",
                         "Convierte tu video en un drop de pago."],
  "body.source_label":  ["Source media",               "Medya sous",                  "Medio de origen"],
  "body.teaser_label":  ["Teaser description",         "Deskripsyon tizè",            "Descripción del teaser"],
  "body.price_label":   ["Unlock price",               "Pri deblokaj",                "Precio de desbloqueo"],
  "body.vip_label":     ["VIP price",                  "Pri VIP",                     "Precio VIP"],
  "body.launch":        ["Launch This Drop",           "Lanse Drop Sa",               "Lanzar Este Drop"],
  "body.providers":     ["AI Providers",               "Founisè AI",                  "Proveedores de IA"],
  "body.narration":     ["Generate KingCam voiceover", "Jenere vwa KingCam",          "Generar voz de KingCam"],

  // ── Common / Shared ──────────────────────────────────────────────────────────
  "common.cancel":      ["Cancel",                     "Anile",                       "Cancelar"],
  "common.save":        ["Save",                       "Sove",                        "Guardar"],
  "common.close":       ["Close",                      "Fèmen",                       "Cerrar"],
  "common.back":        ["Back",                       "Retounen",                    "Volver"],
  "common.next":        ["Next",                       "Pwochen",                     "Siguiente"],
  "common.done":        ["Done",                       "Fini",                        "Listo"],
  "common.loading":     ["Loading...",                 "Ap chaje...",                 "Cargando..."],
  "common.error":       ["Something went wrong",       "Yon bagay te mal pase",       "Algo salió mal"],
  "common.copy":        ["Copy",                       "Kopye",                       "Copiar"],
  "common.copied":      ["Copied!",                    "Kopye!",                      "¡Copiado!"],
  "common.download":    ["Download",                   "Telechaje",                   "Descargar"],
  "common.upload":      ["Upload",                     "Telechaje",                   "Subir"],
  "common.or":          ["or",                         "oswa",                        "o"],
  "common.free":        ["Free",                       "Gratis",                      "Gratis"],
  "common.per_month":   ["per month",                  "pa mwa",                      "al mes"],
  "common.cancel_anytime":["Cancel anytime",           "Anile nenpòt ki lè",          "Cancela cuando quieras"],
  "common.secure_checkout":["Secure checkout",         "Peman Sekirize",              "Pago seguro"],
  "common.instant_access":["Instant access",           "Aksè imedya",                 "Acceso inmediato"],
  "common.subscribe":   ["Subscribe",                  "Abòne",                       "Suscribirse"],
  "common.unlock":      ["Unlock",                     "Debloke",                     "Desbloquear"],
  "common.post":        ["Post",                       "Poste",                       "Publicar"],
  "common.send":        ["Send",                       "Voye",                        "Enviar"],
  "common.view":        ["View",                       "Wè",                          "Ver"],
  "common.remix":       ["Remix",                      "Remiks",                      "Remix"],
  "common.generate":    ["Generate",                   "Jenere",                      "Generar"],
  "common.build":       ["Build",                      "Bati",                        "Construir"],
  "common.launch":      ["Launch",                     "Lanse",                       "Lanzar"],
  "common.price":       ["Price",                      "Pri",                         "Precio"],
  "common.title":       ["Title",                      "Tit",                         "Título"],
  "common.description": ["Description",                "Deskripsyon",                 "Descripción"],
  "common.content":     ["Content",                    "Kontni",                      "Contenido"],
  "common.video":       ["Video",                      "Videyo",                      "Video"],
  "common.photo":       ["Photo",                      "Foto",                        "Foto"],
  "common.music":       ["Music",                      "Mizik",                       "Música"],
  "common.telegram":    ["Telegram",                   "Telegram",                    "Telegram"],
  "common.vault":       ["Vault",                      "Vòlt",                        "Vault"],
  "common.drop":        ["Drop",                       "Drop",                        "Drop"],
  "common.drops":       ["Drops",                      "Drops",                       "Drops"],
  "common.history":     ["History",                    "Istwa",                       "Historial"],
  "common.output":      ["Output",                     "Rezilta",                     "Resultado"],
  "common.distribute":  ["Distribute",                 "Distribye",                   "Distribuir"],
  "common.save_vault":  ["Save to Vault",              "Sove nan Vòlt",               "Guardar en Vault"],
  "common.new":         ["New",                        "Nouvo",                       "Nuevo"],
  "common.all":         ["All",                        "Tout",                        "Todo"],
  "common.fastest":     ["FASTEST",                    "PI VIT",                      "MÁS RÁPIDO"],
  "common.popular":     ["POPULAR",                    "POPILÈ",                      "POPULAR"],
  "common.wow_factor":  ["WOW FACTOR",                 "FAKTÈ WOW",                   "FACTOR WOW"],
  "common.max_variety": ["MAX VARIETY",                "MAX VARYETE",                 "MÁXIMA VARIEDAD"],
  "common.cheat_code":  ["CHEAT CODE",                 "KÒD TRICHE",                  "CÓDIGO TRAMPA"],
};

// ─── Index helper ─────────────────────────────────────────────────────────────
const LANG_INDEX: Record<VaultXLang, number> = { en: 0, ht: 1, "es-do": 2 };

// ─── Context ──────────────────────────────────────────────────────────────────
interface VaultXI18nCtx {
  lang: VaultXLang;
  setLang: (l: VaultXLang) => void;
  t: (key: string, fallback?: string) => string;
}

const Ctx = createContext<VaultXI18nCtx>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
});

const STORAGE_KEY = "vaultx_lang";

export function VaultXI18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<VaultXLang>(() => {
    try { return (localStorage.getItem(STORAGE_KEY) as VaultXLang) || "en"; } catch { return "en"; }
  });

  const setLang = useCallback((l: VaultXLang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
  }, []);

  const t = useCallback((key: string, fallback?: string): string => {
    const entry = TRANSLATIONS[key];
    if (!entry) return fallback || key;
    return entry[LANG_INDEX[lang]] || entry[0] || fallback || key;
  }, [lang]);

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useVaultXLang() { return useContext(Ctx); }

// ─── Language Switcher Component ──────────────────────────────────────────────
const LANG_FLAGS: Record<VaultXLang, string> = { en: "🇺🇸", ht: "🇭🇹", "es-do": "🇩🇴" };
const LANG_SHORT: Record<VaultXLang, string> = { en: "EN", ht: "KR", "es-do": "ES" };

export function VaultXLangSwitcher({ style }: { style?: React.CSSProperties }) {
  const { lang, setLang, t } = useVaultXLang();
  const [open, setOpen] = useState(false);
  const langs: VaultXLang[] = ["en", "ht", "es-do"];

  return (
    <div style={{ position: "relative", ...style }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 20, padding: "6px 12px", cursor: "pointer", color: "#fff",
          fontSize: 13, fontWeight: 700, letterSpacing: "0.04em",
        }}
      >
        <span>{LANG_FLAGS[lang]}</span>
        <span>{LANG_SHORT[lang]}</span>
        <span style={{ fontSize: 10, opacity: 0.6 }}>▼</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 200,
          background: "#111", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12,
          overflow: "hidden", minWidth: 180, boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}>
          {langs.map(l => (
            <button
              key={l}
              onClick={() => { setLang(l); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "12px 16px", border: "none", background: lang === l ? "rgba(242,177,91,0.15)" : "transparent",
                color: lang === l ? "#F2B15B" : "#fff", cursor: "pointer", fontSize: 14, fontWeight: lang === l ? 800 : 500,
                borderLeft: lang === l ? "3px solid #F2B15B" : "3px solid transparent",
              }}
            >
              <span style={{ fontSize: 18 }}>{LANG_FLAGS[l]}</span>
              <span>{t(`lang.${l}`)}</span>
              {lang === l && <span style={{ marginLeft: "auto", fontSize: 12 }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
