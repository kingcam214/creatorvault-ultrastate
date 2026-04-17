import React, { useState } from "react";
import { trpc } from "@/lib/trpc";

// ─── Chica Funnel Manager ─────────────────────────────────────────────────────
// Owner Cockpit page for provisioning, reviewing, and activating
// Tinder → WhatsApp → Telegram → VaultX funnels per chica.
// ─────────────────────────────────────────────────────────────────────────────

const PLATFORM_COLORS: Record<string, string> = {
  tinder: "#FF6B6B",
  whatsapp: "#25D366",
  telegram: "#229ED9",
  vaultx: "#FFD700",
};

const PLATFORM_ICONS: Record<string, string> = {
  tinder: "🔥",
  whatsapp: "💬",
  telegram: "✈️",
  vaultx: "👑",
};

export default function ChicaFunnelManager() {
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null);
  const [provisioningId, setProvisioningId] = useState<number | null>(null);

  const { data: funnels, refetch: refetchFunnels } = trpc.chicaFunnel.listFunnels.useQuery();
  const { data: rendered } = trpc.chicaFunnel.getRenderedFunnel.useQuery(
    { funnelId: selectedFunnelId! },
    { enabled: !!selectedFunnelId }
  );

  const provisionAll = trpc.chicaFunnel.provisionAllUnfunneled.useMutation({
    onSuccess: () => refetchFunnels(),
  });

  const provision = trpc.chicaFunnel.provisionFunnel.useMutation({
    onSuccess: () => { refetchFunnels(); setProvisioningId(null); },
  });

  const activate = trpc.chicaFunnel.activateFunnel.useMutation({
    onSuccess: () => refetchFunnels(),
  });

  const pause = trpc.chicaFunnel.pauseFunnel.useMutation({
    onSuccess: () => refetchFunnels(),
  });

  const statusColor = (status: string) => {
    if (status === "active") return "#00FF88";
    if (status === "draft") return "#FFD700";
    return "#888";
  };

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#fff", padding: "24px", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, margin: 0 }}>🔥 Chica Funnel Manager</h1>
          <p style={{ color: "#888", margin: "4px 0 0", fontSize: "14px" }}>
            Tinder → WhatsApp → Telegram → VaultX — Ready-made for every chica
          </p>
        </div>
        <button
          onClick={() => provisionAll.mutate()}
          disabled={provisionAll.isLoading}
          style={{
            background: "#FFD700", color: "#000", border: "none", borderRadius: "8px",
            padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: "14px"
          }}
        >
          {provisionAll.isLoading ? "Provisioning..." : "⚡ Provision All Unfunneled"}
        </button>
      </div>

      {/* Funnel Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
        {(funnels as any[] || []).map((funnel: any) => (
          <div
            key={funnel.id}
            onClick={() => setSelectedFunnelId(funnel.id === selectedFunnelId ? null : funnel.id)}
            style={{
              background: "#111", border: `1px solid ${selectedFunnelId === funnel.id ? "#FFD700" : "#222"}`,
              borderRadius: "12px", padding: "16px", cursor: "pointer",
              transition: "border-color 0.2s"
            }}
          >
            {/* Chica header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "16px" }}>{funnel.chica_name}</div>
                <div style={{ color: "#888", fontSize: "12px" }}>{funnel.chica_phone}</div>
                <div style={{ color: "#888", fontSize: "12px", marginTop: "2px" }}>{funnel.funnel_name}</div>
              </div>
              <div style={{
                background: statusColor(funnel.status) + "22",
                color: statusColor(funnel.status),
                border: `1px solid ${statusColor(funnel.status)}`,
                borderRadius: "6px", padding: "2px 10px", fontSize: "12px", fontWeight: 600
              }}>
                {funnel.status.toUpperCase()}
              </div>
            </div>

            {/* Platform pipeline */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              {["tinder", "whatsapp", "telegram", "vaultx"].map(p => (
                <div key={p} style={{
                  flex: 1, background: PLATFORM_COLORS[p] + "22",
                  border: `1px solid ${PLATFORM_COLORS[p]}44`,
                  borderRadius: "6px", padding: "6px 4px", textAlign: "center", fontSize: "18px"
                }}>
                  {PLATFORM_ICONS[p]}
                </div>
              ))}
            </div>

            {/* Locale badge */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <span style={{
                background: "#222", borderRadius: "4px", padding: "2px 8px",
                fontSize: "11px", color: "#aaa"
              }}>
                {funnel.locale === "es_DO" ? "🇩🇴 Spanish" : funnel.locale === "ht_HT" ? "🇭🇹 Haitian Creole" : "🇺🇸 English"}
              </span>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "8px" }} onClick={e => e.stopPropagation()}>
              {funnel.status === "draft" && (
                <button
                  onClick={() => activate.mutate({ funnelId: funnel.id })}
                  style={{
                    flex: 1, background: "#00FF88", color: "#000", border: "none",
                    borderRadius: "6px", padding: "8px", fontWeight: 700, cursor: "pointer", fontSize: "12px"
                  }}
                >
                  ▶ Activate
                </button>
              )}
              {funnel.status === "active" && (
                <button
                  onClick={() => pause.mutate({ funnelId: funnel.id })}
                  style={{
                    flex: 1, background: "#333", color: "#fff", border: "1px solid #555",
                    borderRadius: "6px", padding: "8px", fontWeight: 600, cursor: "pointer", fontSize: "12px"
                  }}
                >
                  ⏸ Pause
                </button>
              )}
              <button
                onClick={() => setSelectedFunnelId(funnel.id === selectedFunnelId ? null : funnel.id)}
                style={{
                  flex: 1, background: "#222", color: "#FFD700", border: "1px solid #FFD70044",
                  borderRadius: "6px", padding: "8px", fontWeight: 600, cursor: "pointer", fontSize: "12px"
                }}
              >
                👁 Preview
              </button>
            </div>
          </div>
        ))}

        {/* Empty state */}
        {(!funnels || (funnels as any[]).length === 0) && (
          <div style={{
            gridColumn: "1 / -1", textAlign: "center", padding: "60px 20px",
            color: "#555", border: "1px dashed #333", borderRadius: "12px"
          }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔥</div>
            <div style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>No funnels yet</div>
            <div style={{ fontSize: "14px" }}>Click "Provision All Unfunneled" to auto-generate funnels for all chicas</div>
          </div>
        )}
      </div>

      {/* Funnel Preview Panel */}
      {selectedFunnelId && rendered && (
        <div style={{
          marginTop: "24px", background: "#111", border: "1px solid #FFD70044",
          borderRadius: "12px", padding: "24px"
        }}>
          <h2 style={{ margin: "0 0 20px", fontSize: "18px" }}>
            📋 Funnel Preview — {rendered.chicaName}
            <span style={{ marginLeft: "12px", fontSize: "13px", color: "#888" }}>
              {rendered.locale === "es_DO" ? "🇩🇴 Dominican Spanish" : "🇭🇹 Haitian Creole"}
            </span>
          </h2>

          {/* Tinder Section */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ color: PLATFORM_COLORS.tinder, fontWeight: 700, marginBottom: "8px", fontSize: "14px" }}>
              🔥 TINDER
            </div>
            <div style={{ background: "#1a1a1a", borderRadius: "8px", padding: "12px", marginBottom: "8px" }}>
              <div style={{ color: "#888", fontSize: "11px", marginBottom: "4px" }}>BIO</div>
              <div style={{ fontSize: "14px" }}>{rendered.tinder.bio}</div>
            </div>
            <div style={{ background: "#1a1a1a", borderRadius: "8px", padding: "12px", marginBottom: "8px" }}>
              <div style={{ color: "#888", fontSize: "11px", marginBottom: "4px" }}>OPENER</div>
              <div style={{ fontSize: "14px" }}>{rendered.tinder.opener}</div>
            </div>
            <div style={{ background: "#1a1a1a", borderRadius: "8px", padding: "12px" }}>
              <div style={{ color: "#888", fontSize: "11px", marginBottom: "4px" }}>CTA</div>
              <div style={{ fontSize: "14px" }}>{rendered.tinder.cta}</div>
            </div>
          </div>

          {/* WhatsApp Section */}
          {rendered.whatsapp.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <div style={{ color: PLATFORM_COLORS.whatsapp, fontWeight: 700, marginBottom: "8px", fontSize: "14px" }}>
                💬 WHATSAPP SEQUENCE
              </div>
              {rendered.whatsapp.filter((s: any) => s.step_type !== 'delay').map((step: any, i: number) => (
                <div key={i} style={{ background: "#1a1a1a", borderRadius: "8px", padding: "12px", marginBottom: "8px", display: "flex", gap: "12px" }}>
                  <div style={{
                    background: PLATFORM_COLORS.whatsapp + "33", color: PLATFORM_COLORS.whatsapp,
                    borderRadius: "50%", width: "24px", height: "24px", display: "flex",
                    alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, flexShrink: 0
                  }}>
                    {i + 1}
                  </div>
                  <div>
                    {step.delay_hours > 0 && (
                      <div style={{ color: "#666", fontSize: "11px", marginBottom: "4px" }}>
                        ⏱ Send after {step.delay_hours}h
                      </div>
                    )}
                    <div style={{ fontSize: "14px" }}>{step.message_text}</div>
                    <div style={{ color: "#555", fontSize: "11px", marginTop: "4px", textTransform: "uppercase" }}>
                      {step.step_type}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Telegram Section */}
          {rendered.telegram.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <div style={{ color: PLATFORM_COLORS.telegram, fontWeight: 700, marginBottom: "8px", fontSize: "14px" }}>
                ✈️ TELEGRAM SEQUENCE
              </div>
              {rendered.telegram.filter((s: any) => s.step_type !== 'delay').map((step: any, i: number) => (
                <div key={i} style={{ background: "#1a1a1a", borderRadius: "8px", padding: "12px", marginBottom: "8px", display: "flex", gap: "12px" }}>
                  <div style={{
                    background: PLATFORM_COLORS.telegram + "33", color: PLATFORM_COLORS.telegram,
                    borderRadius: "50%", width: "24px", height: "24px", display: "flex",
                    alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, flexShrink: 0
                  }}>
                    {i + 1}
                  </div>
                  <div>
                    {step.delay_hours > 0 && (
                      <div style={{ color: "#666", fontSize: "11px", marginBottom: "4px" }}>
                        ⏱ Send after {step.delay_hours}h
                      </div>
                    )}
                    <div style={{ fontSize: "14px" }}>{step.message_text}</div>
                    <div style={{ color: "#555", fontSize: "11px", marginTop: "4px", textTransform: "uppercase" }}>
                      {step.step_type}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* VaultX Section */}
          {rendered.vaultx.length > 0 && (
            <div>
              <div style={{ color: PLATFORM_COLORS.vaultx, fontWeight: 700, marginBottom: "8px", fontSize: "14px" }}>
                👑 VAULTX SEQUENCE
              </div>
              {rendered.vaultx.map((step: any, i: number) => (
                <div key={i} style={{ background: "#1a1a1a", borderRadius: "8px", padding: "12px", marginBottom: "8px", display: "flex", gap: "12px" }}>
                  <div style={{
                    background: PLATFORM_COLORS.vaultx + "33", color: PLATFORM_COLORS.vaultx,
                    borderRadius: "50%", width: "24px", height: "24px", display: "flex",
                    alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, flexShrink: 0
                  }}>
                    {i + 1}
                  </div>
                  <div>
                    {step.delay_hours > 0 && (
                      <div style={{ color: "#666", fontSize: "11px", marginBottom: "4px" }}>
                        ⏱ Send after {step.delay_hours}h
                      </div>
                    )}
                    <div style={{ fontSize: "14px" }}>{step.message_text}</div>
                    <div style={{ color: "#555", fontSize: "11px", marginTop: "4px", textTransform: "uppercase" }}>
                      {step.step_type}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
