import { useState } from 'react';
import { trpc } from '../lib/trpc';

type Tab = 'overview' | 'bots' | 'subscribers' | 'content' | 'analytics' | 'funnels' | 'insights' | 'whatsapp';

export default function BotMonetizationDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedBotId, setSelectedBotId] = useState<number | null>(null);
  const [showCreateBot, setShowCreateBot] = useState(false);

  // Data queries
  const { data: bots, refetch: refetchBots } = trpc.botMonetization.getMyBots.useQuery();
  const selectedBot = bots?.find((b: any) => b.id === selectedBotId) || bots?.[0];
  const botId = selectedBot?.id;

  const { data: dashStats } = trpc.botMonetization.getDashboardStats.useQuery(
    { botId: botId! },
    { enabled: !!botId }
  );
  const { data: subscribers } = trpc.botMonetization.getSubscribers.useQuery(
    { botId: botId!, limit: 50, offset: 0 },
    { enabled: !!botId && activeTab === 'subscribers' }
  );
  const { data: subscriberStats } = trpc.botMonetization.getSubscriberStats.useQuery(
    { botId: botId! },
    { enabled: !!botId && (activeTab === 'subscribers' || activeTab === 'overview') }
  );
  const { data: content } = trpc.botMonetization.getContent.useQuery(
    { botId: botId! },
    { enabled: !!botId && activeTab === 'content' }
  );
  const { data: revenueChart } = trpc.botMonetization.getRevenueChart.useQuery(
    { botId: botId!, period: '30d' },
    { enabled: !!botId && activeTab === 'analytics' }
  );
  const { data: insights } = trpc.botMonetization.getInsights.useQuery(
    { botId: botId! },
    { enabled: !!botId && activeTab === 'insights' }
  );
  const { data: funnelTemplates } = trpc.botMonetization.getFunnelTemplates.useQuery(
    undefined,
    { enabled: activeTab === 'funnels' }
  );
  const { data: whatsappCommunities } = trpc.botMonetization.getWhatsAppCommunities.useQuery(
    undefined,
    { enabled: activeTab === 'whatsapp' }
  );

  // Mutations
  const createBot = trpc.botMonetization.createBot.useMutation({
    onSuccess: () => { refetchBots(); setShowCreateBot(false); },
  });
  const addContent = trpc.botMonetization.addContent.useMutation();
  const updateInsight = trpc.botMonetization.updateInsight.useMutation();

  // Form states
  const [newBot, setNewBot] = useState({
    botToken: '', botUsername: '', botDisplayName: '', botDescription: '',
    botType: 'general' as const, acceptsStars: true, acceptsTon: false, acceptsStripe: true,
  });
  const [newContent, setNewContent] = useState({
    title: '', description: '', contentType: 'video' as const,
    fileUrl: '', accessType: 'free' as const, priceInCents: 0, priceInStars: 0,
  });

  const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'bots', label: 'My Bots', icon: '🤖' },
    { id: 'subscribers', label: 'Subscribers', icon: '👥' },
    { id: 'content', label: 'Content', icon: '📦' },
    { id: 'analytics', label: 'Revenue', icon: '💰' },
    { id: 'funnels', label: 'Funnels', icon: '🔄' },
    { id: 'insights', label: 'AI Insights', icon: '🧠' },
    { id: 'whatsapp', label: 'WhatsApp', icon: '📱' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#1a0a2e] to-[#0a1628] text-white">
      {/* Header */}
      <div className="border-b border-purple-500/20 bg-black/30 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                Bot Monetization Empire
              </h1>
              <p className="text-gray-400 mt-1">Telegram & WhatsApp Revenue Engine</p>
            </div>
            {/* Bot Selector */}
            {bots && bots.length > 0 && (
              <select
                value={selectedBotId || bots[0]?.id}
                onChange={(e) => setSelectedBotId(Number(e.target.value))}
                className="bg-purple-900/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white"
              >
                {bots.map((bot: any) => (
                  <option key={bot.id} value={bot.id}>@{bot.bot_username}</option>
                ))}
              </select>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 overflow-x-auto pb-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-t-lg font-medium text-sm whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-purple-600/30 text-purple-300 border-b-2 border-purple-400'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ============ OVERVIEW TAB ============ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Revenue Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-500/20 rounded-xl p-6">
                <p className="text-green-400 text-sm font-medium">Today's Revenue</p>
                <p className="text-3xl font-bold text-white mt-2">{formatCents(dashStats?.revenue?.today || 0)}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-500/20 rounded-xl p-6">
                <p className="text-purple-400 text-sm font-medium">This Month</p>
                <p className="text-3xl font-bold text-white mt-2">{formatCents(dashStats?.revenue?.month || 0)}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-500/20 rounded-xl p-6">
                <p className="text-blue-400 text-sm font-medium">All-Time Revenue</p>
                <p className="text-3xl font-bold text-white mt-2">{formatCents(dashStats?.revenue?.allTime || 0)}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-900/40 to-orange-800/20 border border-orange-500/20 rounded-xl p-6">
                <p className="text-orange-400 text-sm font-medium">Active Subscribers</p>
                <p className="text-3xl font-bold text-white mt-2">{dashStats?.subscribers?.active || 0}</p>
                <p className="text-gray-400 text-xs mt-1">+{dashStats?.subscribers?.new_today || 0} today</p>
              </div>
            </div>

            {/* Subscriber Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-black/30 border border-purple-500/20 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-purple-300 mb-4">Subscriber Breakdown</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Total', value: dashStats?.subscribers?.total || 0, color: 'text-white' },
                    { label: 'Active Paid', value: dashStats?.subscribers?.active || 0, color: 'text-green-400' },
                    { label: 'Free Tier', value: dashStats?.subscribers?.free_tier || 0, color: 'text-blue-400' },
                    { label: 'Whales', value: subscriberStats?.totals?.whales || 0, color: 'text-yellow-400' },
                    { label: 'VIPs', value: subscriberStats?.totals?.vips || 0, color: 'text-purple-400' },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center">
                      <span className="text-gray-400">{item.label}</span>
                      <span className={`font-semibold ${item.color}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-black/30 border border-purple-500/20 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-purple-300 mb-4">Content Stats</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Total Content', value: dashStats?.content?.total || 0 },
                    { label: 'Free Items', value: dashStats?.content?.free_count || 0 },
                    { label: 'PPV Items', value: dashStats?.content?.ppv_count || 0 },
                    { label: 'Subscription Only', value: dashStats?.content?.sub_count || 0 },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center">
                      <span className="text-gray-400">{item.label}</span>
                      <span className="font-semibold text-white">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-black/30 border border-purple-500/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-purple-300 mb-4">Recent Transactions</h3>
              {dashStats?.recentTransactions?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-700">
                        <th className="text-left py-2 px-3">User</th>
                        <th className="text-left py-2 px-3">Type</th>
                        <th className="text-left py-2 px-3">Method</th>
                        <th className="text-right py-2 px-3">Amount</th>
                        <th className="text-right py-2 px-3">Your Share</th>
                        <th className="text-left py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashStats.recentTransactions.map((tx: any) => (
                        <tr key={tx.id} className="border-b border-gray-800 hover:bg-white/5">
                          <td className="py-2 px-3">{tx.first_name || tx.platform_username || 'Unknown'}</td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded-full text-xs bg-purple-900/50 text-purple-300">
                              {tx.payment_type}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            {tx.payment_method === 'telegram_stars' && '⭐ Stars'}
                            {tx.payment_method === 'ton_blockchain' && '💎 TON'}
                            {tx.payment_method === 'stripe' && '💳 Stripe'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono">{formatCents(tx.gross_amount_cents)}</td>
                          <td className="py-2 px-3 text-right font-mono text-green-400">{formatCents(tx.creator_share_cents)}</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              tx.status === 'completed' ? 'bg-green-900/50 text-green-300' :
                              tx.status === 'pending' ? 'bg-yellow-900/50 text-yellow-300' :
                              'bg-red-900/50 text-red-300'
                            }`}>
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No transactions yet. Start monetizing!</p>
              )}
            </div>
          </div>
        )}

        {/* ============ BOTS TAB ============ */}
        {activeTab === 'bots' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">My Bots</h2>
              <button
                onClick={() => setShowCreateBot(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 px-6 py-2 rounded-lg font-semibold transition-all"
              >
                + Create New Bot
              </button>
            </div>

            {/* Bot Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bots?.map((bot: any) => (
                <div key={bot.id} className="bg-black/30 border border-purple-500/20 rounded-xl p-6 hover:border-purple-400/40 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl">
                        🤖
                      </div>
                      <div>
                        <h3 className="font-semibold">{bot.bot_display_name}</h3>
                        <p className="text-gray-400 text-sm">@{bot.bot_username}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      bot.status === 'active' ? 'bg-green-900/50 text-green-300' :
                      bot.status === 'paused' ? 'bg-yellow-900/50 text-yellow-300' :
                      'bg-gray-900/50 text-gray-300'
                    }`}>
                      {bot.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-gray-400 text-xs">Subscribers</p>
                      <p className="font-semibold">{bot.total_subscribers || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Revenue</p>
                      <p className="font-semibold text-green-400">{formatCents(bot.total_revenue_cents || 0)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Messages</p>
                      <p className="font-semibold">{bot.total_messages || 0}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    {bot.accepts_stars && <span className="text-xs bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded">⭐ Stars</span>}
                    {bot.accepts_ton && <span className="text-xs bg-cyan-900/30 text-cyan-300 px-2 py-0.5 rounded">💎 TON</span>}
                    {bot.accepts_stripe && <span className="text-xs bg-green-900/30 text-green-300 px-2 py-0.5 rounded">💳 Stripe</span>}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => { setSelectedBotId(bot.id); setActiveTab('overview'); }}
                      className="flex-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 py-2 rounded-lg text-sm transition"
                    >
                      Dashboard
                    </button>
                    <a
                      href={`https://t.me/${bot.bot_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 py-2 rounded-lg text-sm transition"
                    >
                      Open
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Create Bot Modal */}
            {showCreateBot && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-[#1a1a2e] border border-purple-500/30 rounded-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                  <h2 className="text-2xl font-bold mb-6">Create New Bot</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Bot Token *</label>
                      <input
                        type="text"
                        value={newBot.botToken}
                        onChange={(e) => setNewBot({...newBot, botToken: e.target.value})}
                        placeholder="Get from @BotFather on Telegram"
                        className="w-full bg-black/50 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Bot Username *</label>
                      <input
                        type="text"
                        value={newBot.botUsername}
                        onChange={(e) => setNewBot({...newBot, botUsername: e.target.value})}
                        placeholder="YourBotUsername (without @)"
                        className="w-full bg-black/50 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Display Name *</label>
                      <input
                        type="text"
                        value={newBot.botDisplayName}
                        onChange={(e) => setNewBot({...newBot, botDisplayName: e.target.value})}
                        placeholder="Your Creator Name"
                        className="w-full bg-black/50 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Bot Type</label>
                      <select
                        value={newBot.botType}
                        onChange={(e) => setNewBot({...newBot, botType: e.target.value as any})}
                        className="w-full bg-black/50 border border-gray-600 rounded-lg px-4 py-2 text-white"
                      >
                        <option value="general">General</option>
                        <option value="adult">Adult Content</option>
                        <option value="crypto">Crypto / Trading</option>
                        <option value="education">Education / Courses</option>
                        <option value="influencer">Influencer</option>
                        <option value="business">Business</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Payment Methods</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={newBot.acceptsStars} onChange={(e) => setNewBot({...newBot, acceptsStars: e.target.checked})} className="accent-purple-500" />
                          <span className="text-sm">⭐ Telegram Stars</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={newBot.acceptsTon} onChange={(e) => setNewBot({...newBot, acceptsTon: e.target.checked})} className="accent-purple-500" />
                          <span className="text-sm">💎 TON Crypto</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={newBot.acceptsStripe} onChange={(e) => setNewBot({...newBot, acceptsStripe: e.target.checked})} className="accent-purple-500" />
                          <span className="text-sm">💳 Stripe</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => createBot.mutate(newBot)}
                        disabled={createBot.isLoading || !newBot.botToken || !newBot.botUsername || !newBot.botDisplayName}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 py-3 rounded-lg font-semibold transition-all"
                      >
                        {createBot.isLoading ? 'Creating...' : 'Create Bot'}
                      </button>
                      <button
                        onClick={() => setShowCreateBot(false)}
                        className="px-6 bg-gray-700 hover:bg-gray-600 py-3 rounded-lg font-semibold transition"
                      >
                        Cancel
                      </button>
                    </div>
                    {createBot.error && (
                      <p className="text-red-400 text-sm mt-2">{createBot.error.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============ SUBSCRIBERS TAB ============ */}
        {activeTab === 'subscribers' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Subscribers</h2>
            
            {/* Subscriber Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Total', value: subscriberStats?.totals?.total_subscribers || 0, color: 'text-white' },
                { label: 'Active Paid', value: subscriberStats?.totals?.active_subscribers || 0, color: 'text-green-400' },
                { label: 'Free', value: subscriberStats?.totals?.free_subscribers || 0, color: 'text-blue-400' },
                { label: 'Whales', value: subscriberStats?.totals?.whales || 0, color: 'text-yellow-400' },
                { label: 'Avg Spend', value: formatCents(subscriberStats?.totals?.avg_spend || 0), color: 'text-purple-400' },
              ].map(stat => (
                <div key={stat.label} className="bg-black/30 border border-purple-500/20 rounded-xl p-4 text-center">
                  <p className="text-gray-400 text-xs">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Subscriber Table */}
            <div className="bg-black/30 border border-purple-500/20 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700 bg-black/30">
                      <th className="text-left py-3 px-4">User</th>
                      <th className="text-left py-3 px-4">Platform</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Tag</th>
                      <th className="text-right py-3 px-4">Total Spent</th>
                      <th className="text-right py-3 px-4">Messages</th>
                      <th className="text-left py-3 px-4">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers?.subscribers?.map((sub: any) => (
                      <tr key={sub.id} className="border-b border-gray-800 hover:bg-white/5">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{sub.first_name} {sub.last_name || ''}</p>
                            <p className="text-gray-500 text-xs">@{sub.platform_username || 'unknown'}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {sub.platform === 'telegram' ? '📱 Telegram' : '💬 WhatsApp'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            sub.subscription_status === 'active' ? 'bg-green-900/50 text-green-300' :
                            sub.subscription_status === 'free' ? 'bg-blue-900/50 text-blue-300' :
                            sub.subscription_status === 'expired' ? 'bg-red-900/50 text-red-300' :
                            'bg-gray-900/50 text-gray-300'
                          }`}>
                            {sub.subscription_status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            sub.buyer_tag === 'whale' ? 'bg-yellow-900/50 text-yellow-300' :
                            sub.buyer_tag === 'vip' ? 'bg-purple-900/50 text-purple-300' :
                            sub.buyer_tag === 'regular' ? 'bg-blue-900/50 text-blue-300' :
                            'bg-gray-900/50 text-gray-300'
                          }`}>
                            {sub.buyer_tag}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-green-400">
                          {formatCents(sub.total_spent_cents)}
                        </td>
                        <td className="py-3 px-4 text-right">{sub.message_count}</td>
                        <td className="py-3 px-4 text-gray-400 text-xs">
                          {sub.last_active_at ? new Date(sub.last_active_at).toLocaleDateString() : 'Never'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(!subscribers?.subscribers?.length) && (
                <p className="text-gray-500 text-center py-8">No subscribers yet. Share your bot link to start growing!</p>
              )}
            </div>
          </div>
        )}

        {/* ============ CONTENT TAB ============ */}
        {activeTab === 'content' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Content Library</h2>
              <button
                onClick={() => {
                  if (botId) {
                    addContent.mutate({ botId, ...newContent });
                  }
                }}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 px-6 py-2 rounded-lg font-semibold transition-all"
              >
                + Add Content
              </button>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {content?.map((item: any) => (
                <div key={item.id} className="bg-black/30 border border-purple-500/20 rounded-xl p-5 hover:border-purple-400/40 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      item.access_type === 'free' ? 'bg-green-900/50 text-green-300' :
                      item.access_type === 'ppv' ? 'bg-orange-900/50 text-orange-300' :
                      item.access_type === 'subscription' ? 'bg-purple-900/50 text-purple-300' :
                      'bg-pink-900/50 text-pink-300'
                    }`}>
                      {item.access_type === 'free' ? '🆓 Free' :
                       item.access_type === 'ppv' ? '💰 PPV' :
                       item.access_type === 'subscription' ? '⭐ Sub Only' :
                       '💝 Tip Unlock'}
                    </span>
                    <span className="text-gray-500 text-xs">{item.content_type}</span>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  {item.description && <p className="text-gray-400 text-sm mb-3 line-clamp-2">{item.description}</p>}
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex gap-3">
                      <span className="text-gray-400">👁 {item.views || 0}</span>
                      <span className="text-gray-400">🛒 {item.purchases || 0}</span>
                    </div>
                    {item.price_in_cents > 0 && (
                      <span className="text-green-400 font-semibold">{formatCents(item.price_in_cents)}</span>
                    )}
                  </div>
                  {item.total_revenue_cents > 0 && (
                    <div className="mt-2 text-xs text-green-400">
                      Revenue: {formatCents(item.total_revenue_cents)}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {(!content?.length) && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No content yet</p>
                <p className="text-gray-600 text-sm mt-2">Add your first piece of content to start monetizing</p>
              </div>
            )}
          </div>
        )}

        {/* ============ ANALYTICS TAB ============ */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Revenue Analytics</h2>
            
            {/* Revenue by Payment Method */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {revenueChart?.byMethod?.map((method: any) => (
                <div key={method.payment_method} className="bg-black/30 border border-purple-500/20 rounded-xl p-6">
                  <p className="text-gray-400 text-sm">
                    {method.payment_method === 'telegram_stars' && '⭐ Telegram Stars'}
                    {method.payment_method === 'ton_blockchain' && '💎 TON Blockchain'}
                    {method.payment_method === 'stripe' && '💳 Stripe'}
                  </p>
                  <p className="text-2xl font-bold text-white mt-2">{formatCents(method.total)}</p>
                  <p className="text-gray-500 text-xs mt-1">{method.count} transactions</p>
                </div>
              ))}
              {(!revenueChart?.byMethod?.length) && (
                <div className="col-span-3 text-center py-8 text-gray-500">
                  No revenue data yet. Transactions will appear here.
                </div>
              )}
            </div>

            {/* Revenue by Type */}
            <div className="bg-black/30 border border-purple-500/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-purple-300 mb-4">Revenue by Type</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {revenueChart?.byType?.map((type: any) => (
                  <div key={type.payment_type} className="text-center">
                    <p className="text-gray-400 text-xs capitalize">{type.payment_type}</p>
                    <p className="text-xl font-bold text-white">{formatCents(type.total)}</p>
                    <p className="text-gray-500 text-xs">{type.count} sales</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Revenue Chart (text-based) */}
            {revenueChart?.daily?.length ? (
              <div className="bg-black/30 border border-purple-500/20 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-purple-300 mb-4">Daily Revenue (Last 30 Days)</h3>
                <div className="space-y-2">
                  {revenueChart.daily.map((day: any) => {
                    const maxRevenue = Math.max(...revenueChart.daily.map((d: any) => d.gross || 0));
                    const width = maxRevenue > 0 ? ((day.gross || 0) / maxRevenue) * 100 : 0;
                    return (
                      <div key={day.date} className="flex items-center gap-3">
                        <span className="text-gray-400 text-xs w-20">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        <div className="flex-1 bg-gray-800 rounded-full h-4 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                        <span className="text-green-400 text-xs font-mono w-20 text-right">{formatCents(day.gross)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ============ FUNNELS TAB ============ */}
        {activeTab === 'funnels' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Automated Funnels</h2>
            <p className="text-gray-400">Pre-built conversion funnels that automatically nurture subscribers and maximize revenue.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {funnelTemplates?.map((funnel: any) => (
                <div key={funnel.id} className="bg-black/30 border border-purple-500/20 rounded-xl p-6 hover:border-purple-400/40 transition-all">
                  <h3 className="text-xl font-semibold mb-2">{funnel.name}</h3>
                  <p className="text-gray-400 text-sm mb-4">{funnel.description}</p>
                  
                  <div className="space-y-3">
                    {funnel.steps.map((step: any, i: number) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-600/30 flex items-center justify-center text-sm font-bold text-purple-300 flex-shrink-0">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm text-white">{step.message}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {step.delay === 0 ? 'Immediately' :
                             step.delay < 86400 ? `After ${step.delay / 3600}h` :
                             `After ${step.delay / 86400} day${step.delay / 86400 > 1 ? 's' : ''}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button className="w-full mt-4 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 py-2 rounded-lg text-sm font-semibold transition">
                    Activate Funnel
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============ AI INSIGHTS TAB ============ */}
        {activeTab === 'insights' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">AI-Powered Insights</h2>
            <p className="text-gray-400">Intelligent recommendations to grow your revenue and subscriber base.</p>

            {insights?.length ? (
              <div className="space-y-4">
                {insights.map((insight: any) => (
                  <div key={insight.id} className={`bg-black/30 border rounded-xl p-6 ${
                    insight.priority === 'critical' ? 'border-red-500/40' :
                    insight.priority === 'high' ? 'border-orange-500/30' :
                    insight.priority === 'medium' ? 'border-yellow-500/20' :
                    'border-gray-500/20'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            insight.priority === 'critical' ? 'bg-red-900/50 text-red-300' :
                            insight.priority === 'high' ? 'bg-orange-900/50 text-orange-300' :
                            insight.priority === 'medium' ? 'bg-yellow-900/50 text-yellow-300' :
                            'bg-gray-900/50 text-gray-300'
                          }`}>
                            {insight.priority.toUpperCase()}
                          </span>
                          <span className="text-gray-500 text-xs">{insight.insight_type}</span>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">{insight.title}</h3>
                        <p className="text-gray-400 text-sm mb-3">{insight.description}</p>
                        {insight.actionable && (
                          <div className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-3">
                            <p className="text-purple-300 text-sm font-medium">Recommended Action:</p>
                            <p className="text-gray-300 text-sm mt-1">{insight.actionable}</p>
                          </div>
                        )}
                        {insight.estimated_revenue_cents > 0 && (
                          <p className="text-green-400 text-sm mt-2 font-semibold">
                            Estimated Revenue Impact: {formatCents(insight.estimated_revenue_cents)}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        {insight.status === 'new' && (
                          <>
                            <button
                              onClick={() => updateInsight.mutate({ insightId: insight.id, status: 'acted_on' })}
                              className="px-3 py-1 bg-green-600/30 text-green-300 rounded text-xs hover:bg-green-600/50"
                            >
                              Act On
                            </button>
                            <button
                              onClick={() => updateInsight.mutate({ insightId: insight.id, status: 'dismissed' })}
                              className="px-3 py-1 bg-gray-600/30 text-gray-300 rounded text-xs hover:bg-gray-600/50"
                            >
                              Dismiss
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-4xl mb-4">🧠</p>
                <p className="text-gray-500 text-lg">No insights yet</p>
                <p className="text-gray-600 text-sm mt-2">AI insights will appear as your bot collects subscriber data</p>
              </div>
            )}
          </div>
        )}

        {/* ============ WHATSAPP TAB ============ */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">WhatsApp Communities</h2>
            <p className="text-gray-400">Manage paid WhatsApp communities and cross-platform subscriber funnels.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {whatsappCommunities?.map((community: any) => (
                <div key={community.id} className="bg-black/30 border border-green-500/20 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-green-600/30 flex items-center justify-center text-xl">💬</div>
                    <div>
                      <h3 className="font-semibold">{community.community_name}</h3>
                      <p className="text-gray-400 text-sm">{community.phone_number}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <p className="text-gray-400 text-xs">Members</p>
                      <p className="font-semibold">{community.member_count}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Messages</p>
                      <p className="font-semibold">{community.messages_sent}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Price</p>
                      <p className="font-semibold text-green-400">
                        {community.is_paywalled ? formatCents(community.monthly_price_cents) + '/mo' : 'Free'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {(!whatsappCommunities?.length) && (
              <div className="text-center py-12">
                <p className="text-4xl mb-4">📱</p>
                <p className="text-gray-500 text-lg">No WhatsApp communities yet</p>
                <p className="text-gray-600 text-sm mt-2">Connect your WhatsApp Business account to get started</p>
              </div>
            )}

            {/* WhatsApp Strategy Card */}
            <div className="bg-gradient-to-r from-green-900/20 to-green-800/10 border border-green-500/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-green-300 mb-3">WhatsApp Strategy</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-green-400 font-medium mb-1">Acquire</p>
                  <p className="text-gray-400">Use WhatsApp's 99% open rate to reach creators in DR, Haiti, and Latin America</p>
                </div>
                <div>
                  <p className="text-green-400 font-medium mb-1">Engage</p>
                  <p className="text-gray-400">Free utility messages within 24-hour windows. No cost for conversations.</p>
                </div>
                <div>
                  <p className="text-green-400 font-medium mb-1">Monetize</p>
                  <p className="text-gray-400">Drive to Telegram for Stars/TON/Stripe payments. Cross-platform funnel.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
