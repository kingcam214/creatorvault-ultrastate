from pathlib import Path

path = Path('/home/ubuntu/creatorvault-ultrastate-clean/client/src/pages/TelegramMoneyHub.tsx')
src = path.read_text()

src = src.replace(
'  Send, ChevronLeft, Bot, Users, MessageSquare, TrendingUp,\n  Plus, Trash2, CheckCircle, XCircle, RefreshCw, Video,\n  Zap, Radio, Eye, Hash, Globe\n',
'  Send, ChevronLeft, Bot, Users, MessageSquare, TrendingUp,\n  Plus, Trash2, CheckCircle, XCircle, RefreshCw, Video,\n  Zap, Radio, Eye, Hash, Globe, Crown\n'
)

needle = '''  const removeChannel = trpc.telegramHub.removeChannel.useMutation({
    onSuccess: () => { toast({ title: "Channel removed" }); refetchChannels(); refetchOverview(); },
  });
'''
insert = '''  const removeChannel = trpc.telegramHub.removeChannel.useMutation({
    onSuccess: () => { toast({ title: "Channel removed" }); refetchChannels(); refetchOverview(); },
  });

  const activateAllSegments = trpc.telegramFunnel["acquisition.activateAllSegments"].useMutation({
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
if 'acquisition.activateAllSegments' not in src:
    if needle not in src:
        raise SystemExit('mutation insert needle not found')
    src = src.replace(needle, insert)

needle2 = '''            {/* Bot Status */}
'''
card = '''            {/* Domination Activation */}
            <div style={{ background: "linear-gradient(135deg, #1a1203, #0f0f1a)", border: "1px solid #C9A84C55", borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: "#C9A84C22", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #C9A84C55" }}>
                  <Crown size={20} color="#C9A84C" />
                </div>
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "white" }}>All-Creator Acquisition Domination</div>
                  <div style={{ fontSize: 12, color: "#bca76a", lineHeight: 1.5 }}>
                    Creates tracked CreatorVault/VaultX Telegram campaigns and keyword funnels for studios, platforms, distributors, indie creators, solo operators, and small creator groups.
                  </div>
                </div>
                <button onClick={() => activateAllSegments.mutate({ sendNow: false, refreshFunnels: true })} disabled={activateAllSegments.isPending}
                  style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: activateAllSegments.isPending ? "#2a2414" : "linear-gradient(135deg, #C9A84C, #F0D27A)", color: activateAllSegments.isPending ? "#777" : "#0a0a0a", cursor: activateAllSegments.isPending ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 900, display: "flex", alignItems: "center", gap: 7 }}>
                  {activateAllSegments.isPending ? <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Activating...</> : <><Zap size={14} /> Activate Every Segment</>}
                </button>
              </div>
              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
                {["Studios", "Platforms", "Distributors", "Indie Creators", "Solo Operators", "Small Groups"].map((item) => (
                  <div key={item} style={{ padding: "8px 10px", background: "#0a0a1a", border: "1px solid #C9A84C22", borderRadius: 8, fontSize: 11, color: "#d8c57d", fontWeight: 700 }}>
                    {item}
                  </div>
                ))}
              </div>
            </div>

'''
if 'All-Creator Acquisition Domination' not in src:
    if needle2 not in src:
        raise SystemExit('overview card insert needle not found')
    src = src.replace(needle2, card + needle2)

path.write_text(src)
print('Patched TelegramMoneyHub.tsx with all-segment acquisition activation UI.')
