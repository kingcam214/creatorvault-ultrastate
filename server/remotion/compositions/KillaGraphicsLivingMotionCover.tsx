import React from "react";
import { AbsoluteFill, Img, Video, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { RenderContract } from "../types";

type Layer = NonNullable<RenderContract["sourceLayers"]>[number];

function Source({ layer, style }: { layer?: Layer; style?: React.CSSProperties }) {
  if (!layer?.url) return null;
  if (layer.mediaType === "video") return <Video src={layer.url} muted style={{ width: "100%", height: "100%", objectFit: "contain", ...style }} />;
  return <Img src={layer.url} style={{ width: "100%", height: "100%", objectFit: "contain", ...style }} />;
}

function BubbleField({ frame, width, height, accent }: { frame: number; width: number; height: number; accent: string }) {
  return <>{Array.from({ length: 22 }, (_, index) => {
    const lane = (index * 71) % Math.max(150, width - 120);
    const speed = .42 + (index % 5) * .09;
    const span = height * .47;
    const phase = (frame * speed + index * 27) % 220;
    const y = height * .82 - (phase / 220) * span;
    const size = 5 + (index % 5) * 4;
    const opacity = interpolate(phase, [0, 16, 175, 220], [0, .72, .36, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return <div key={index} style={{ position: "absolute", left: width * .08 + lane, top: y, width: size, height: size, border: `1px solid ${accent}`, borderRadius: "50%", opacity, boxShadow: `0 0 ${size * 2}px ${accent}`, transform: `translateX(${Math.sin((frame + index) * .07) * (4 + index % 4)}px)` }} />;
  })}</>;
}

export type KillaGraphicsLivingMotionCoverProps = RenderContract;

export function KillaGraphicsLivingMotionCover(props: KillaGraphicsLivingMotionCoverProps) {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const layers = props.sourceLayers || [];
  const background = layers.find((layer) => layer.role === "background");
  const foreground = layers.find((layer) => layer.role === "foreground");
  const effect = layers.find((layer) => layer.role === "effect");
  const subjectLayers = layers.filter((layer) => layer.role === "subject" || layer.role === "hero");
  const subjectA = subjectLayers[0];
  const subjectB = subjectLayers[1] || layers.find((layer) => layer.role === "support");
  const accent = `#${String(props.accentColor || "F0C04A").replace(/^#/, "")}`;
  const text = `#${String(props.textColor || "FFFFFF").replace(/^#/, "")}`;
  const progress = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 1], { extrapolateRight: "clamp" });
  const subjectABreath = 1 + Math.sin(frame * .055) * .012;
  const subjectBBreath = 1 + Math.sin(frame * .047 + 1.4) * .010;
  const screenTitleIn = interpolate(frame, [0, fps * 1.1], [0, 1], { extrapolateRight: "clamp" });
  const footerIn = interpolate(frame, [fps * 1.4, fps * 3.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const finalFocus = interpolate(frame, [fps * 14, fps * 18.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleSweep = interpolate(frame, [fps * 1.2, fps * 10.8, fps * 18.6], [-width * .35, width * 1.15, width * 1.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const headline = String(props.songTitle || "LIVING COVER").toUpperCase();
  const host = String(props.artistName || props.subtitle || "KILLAGRAPHICS PRESENTS").toUpperCase();

  return <AbsoluteFill style={{ overflow: "hidden", background: "#030714", color: text, fontFamily: "Arial, sans-serif" }}>
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: "-14% -10%", transform: `translate(${interpolate(progress, [0, 1], [-width * .018, width * .04])}px, ${interpolate(progress, [0, 1], [0, -height * .065])}px) scale(${1 + progress * .19 + finalFocus * .08})`, transformOrigin: "50% 52%" }}>
        <Source layer={background} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
      </div>
      <div style={{ position: "absolute", left: width * .02, top: height * .20, width: width * .55, height: height * .70, transform: `translate(${Math.sin(frame * .04) * 7}px, ${interpolate(progress, [0, 1], [0, -height * .125])}px) scale(${subjectABreath * (1 + progress * .34 + finalFocus * .08)})`, transformOrigin: "50% 62%", filter: "drop-shadow(0 28px 28px rgba(0,0,0,.54))" }}><Source layer={subjectA} /></div>
      {subjectB ? <div style={{ position: "absolute", right: -width * .03, top: height * .24, width: width * .53, height: height * .67, transform: `translate(${Math.sin(frame * .037 + 1.2) * 7}px, ${interpolate(progress, [0, 1], [0, -height * .105])}px) scale(${subjectBBreath * (1 + progress * .28 + finalFocus * .06)})`, transformOrigin: "50% 64%", filter: "drop-shadow(0 29px 28px rgba(0,0,0,.55))" }}><Source layer={subjectB} /></div> : null}
      {foreground ? <div style={{ position: "absolute", left: -width * .22, bottom: -height * .15, width: width * 1.46, height: height * .50, transform: `translateY(${interpolate(progress, [0, 1], [0, height * .42])}px) scale(${1 + progress * .82})`, transformOrigin: "50% 0%", filter: "drop-shadow(0 32px 22px rgba(0,0,0,.58))" }}><Source layer={foreground} /></div> : null}
      {effect ? <div style={{ position: "absolute", inset: 0, opacity: .36 + Math.sin(frame * .05) * .10, mixBlendMode: "screen", transform: `translateY(${interpolate(progress, [0, 1], [height * .09, -height * .08])}px) scale(${1 + progress * .11})` }}><Source layer={effect} style={{ objectFit: "cover" }} /></div> : null}
      <BubbleField frame={frame} width={width} height={height} accent={accent} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 42%, transparent 25%, rgba(1,5,16,.12) 62%, rgba(1,4,12,.64) 100%)" }} />
    </AbsoluteFill>

    <div style={{ position: "absolute", left: width * .052, top: height * .045, right: width * .20, opacity: screenTitleIn, transform: `translateY(${interpolate(screenTitleIn, [0, 1], [-height * .03, 0])}px)` }}>
      <div style={{ color: accent, fontSize: Math.min(width * .024, 27), fontWeight: 900, letterSpacing: ".19em" }}>{host}</div>
      <div style={{ marginTop: height * .014, color: accent, fontFamily: "Arial Black, Impact, sans-serif", fontSize: Math.min(width * .14, 145), lineHeight: .77, letterSpacing: "-.075em", textShadow: "0 8px 20px rgba(0,0,0,.7)" }}>{headline}</div>
    </div>
    <div style={{ position: "absolute", left: titleSweep, top: height * .065, width: width * .26, height: height * .16, opacity: .72, background: "linear-gradient(90deg, transparent, rgba(255,255,255,.95), transparent)", transform: "skewX(-17deg)", mixBlendMode: "screen" }} />
    <div style={{ position: "absolute", top: height * .045, right: width * .05, width: width * .13, height: width * .13, border: `2px solid ${accent}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: accent, textAlign: "center", fontSize: Math.min(width * .017, 18), fontWeight: 900, letterSpacing: ".10em", transform: `rotate(${interpolate(progress, [0, 1], [-8, 12])}deg)` }}>LIVING<br />MOTION<br />COVER</div>
    <div style={{ position: "absolute", left: width * .052, right: width * .052, bottom: height * .052, display: "flex", justifyContent: "space-between", gap: 18, alignItems: "flex-end", opacity: footerIn, transform: `translateY(${interpolate(footerIn, [0, 1], [28, 0])}px)` }}>
      <div style={{ color: accent, fontSize: Math.min(width * .021, 23), fontWeight: 900, letterSpacing: ".12em" }}>{String(props.subtitle || "CAMPAIGN WORLD IN MOTION").toUpperCase()}</div>
      <div style={{ color: text, fontSize: Math.min(width * .014, 17), fontWeight: 900, letterSpacing: ".10em", textAlign: "right" }}>{String(props.callToAction || "DESIGN BY KILLAGRAPHICS").toUpperCase()}</div>
    </div>
    <div style={{ position: "absolute", left: width * .16, right: width * .16, top: height * .46, opacity: finalFocus, transform: `scale(${interpolate(finalFocus, [0, 1], [1.16, 1])})`, textAlign: "center", pointerEvents: "none" }}><div style={{ fontFamily: "Arial Black, Impact, sans-serif", fontSize: Math.min(width * .105, 112), letterSpacing: "-.07em", lineHeight: .78, textShadow: "0 7px 26px rgba(0,0,0,.85)" }}>{String(props.callToAction || "THE FINAL FOCUS").toUpperCase()}</div></div>
  </AbsoluteFill>;
}
