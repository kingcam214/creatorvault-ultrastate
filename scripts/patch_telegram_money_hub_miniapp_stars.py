from pathlib import Path
p = Path('/home/ubuntu/creatorvault-ultrastate-clean/client/src/pages/TelegramMoneyHub.tsx')
s = p.read_text()

s = s.replace(
'  Zap, Radio, Eye, Hash, Globe, Crown\n} from "lucide-react";',
'  Zap, Radio, Eye, Hash, Globe, Crown, WalletCards, Smartphone\n} from "lucide-react";'
)

anchor = '''  const activateAllSegments = trpc.telegramFunnel["acquisition.activateAllSegments"].useMutation({
    onSuccess: (data) => {
      toast({
        title: `Activated ${data.totalSegments} creator acquisition lanes`,
        description: `Indie coverage: ${data.independentSegmentsCovered.join(", ")}`,
      });
      refetchOverview();
    },
    onError: (err) => toast({ title: "Acquisition activation failed", description: err.message, variant: "destructive" }),
  });
'''
insert = anchor + '''
  const { data: miniAppRails, refetch: refetchMiniAppRails } = trpc.telegramFunnel["miniApp.packageRails"].useQuery({
    baseUrl: typeof window !== "undefined" ? window.location.origin : undefined,
  });

  const createStarInvoice = trpc.telegramFunnel["stars.createPackageInvoice"].useMutation({
    onSuccess: (data) => {
      if (data.invoiceLink) window.open(data.invoiceLink, "_blank", "noopener,noreferrer");
      toast({
        title: data.success ? `${data.packageName} Stars invoice ready` : "Stars invoice needs bot configuration",
        description: data.success ? `${data.starPrice} Stars · ${data.segment}` : (data.error || "Check Telegram monetization bot token / Stars setup."),
        variant: data.success ? undefined : "destructive",
      });
      refetchMiniAppRails();
    },
    onError: (err) => toast({ title: "Stars invoice failed", description: err.message, variant: "destructive" }),
  });
'''
if 'miniApp.packageRails' not in s:
    if anchor not in s:
        raise SystemExit('mutation anchor not found')
    s = s.replace(anchor, insert)

card_anchor = '''            {/* Bot Status */}
'''
card = '''            {/* Telegram Mini App + Stars Native Checkout */}
            <div style={{ background: "linear-gradient(135deg, #051416, #0f0f1a)", border: "1px solid #00D9FF55", borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: "#00D9FF22", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #00D9FF55" }}>
                  <Smartphone size={20} color="#00D9FF" />
                </div>
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "white" }}>Telegram Mini App + Stars Checkout Rails</div>
                  <div style={{ fontSize: 12, color: "#8fddea", lineHeight: 1.5 }}>
                    Native Telegram package entry is wired for studios, platforms, distributors, indie creators, solo operators, and groups. Star invoices open instantly when the monetization bot is configured.
                  </div>
                </div>
                <a href={miniAppRails?.miniAppEntry || "/vaultx?source=telegram_mini_app"} target="_blank" rel="noreferrer"
                  style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #00D9FF55", background: "#00D9FF18", color: "#9ceeff", cursor: "pointer", fontSize: 13, fontWeight: 900, display: "flex", alignItems: "center", gap: 7, textDecoration: "none" }}>
                  <Smartphone size={14} /> Open Mini App Path
                </a>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                {(miniAppRails?.packages || []).map((pkg: any) => (
                  <div key={pkg.segment} style={{ padding: 12, background: "#0a0a1a", border: "1px solid #00D9FF22", borderRadius: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#dffbff", marginBottom: 4 }}>{pkg.packageName}</div>
                    <div style={{ fontSize: 11, color: "#7fb8c2", marginBottom: 10 }}>{pkg.label} · {pkg.starPrice} Stars</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <a href={pkg.miniAppUrl} target="_blank" rel="noreferrer" style={{ padding: "7px 9px", borderRadius: 8, background: "#00D9FF18", border: "1px solid #00D9FF33", color: "#9ceeff", fontSize: 11, fontWeight: 800, textDecoration: "none" }}>Mini App</a>
                      <button onClick={() => createStarInvoice.mutate({ segment: pkg.segment, trackingCode: pkg.trackingCode, baseUrl: typeof window !== "undefined" ? window.location.origin : undefined })} disabled={createStarInvoice.isPending}
                        style={{ padding: "7px 9px", borderRadius: 8, background: createStarInvoice.isPending ? "#182326" : "#C9A84C22", border: "1px solid #C9A84C44", color: createStarInvoice.isPending ? "#666" : "#f0d27a", fontSize: 11, fontWeight: 900, cursor: createStarInvoice.isPending ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                        <WalletCards size={11} /> Stars Invoice
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

'''
if 'Telegram Mini App + Stars Checkout Rails' not in s:
    if card_anchor not in s:
        raise SystemExit('card anchor not found')
    s = s.replace(card_anchor, card + card_anchor)

p.write_text(s)
print('Patched Telegram Money Hub with Mini App and Stars package controls.')
