import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { loadStripe } from "@stripe/stripe-js";
import { io, Socket } from "socket.io-client";
import { formatDistanceToNow } from "date-fns";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

// ─── Types ───────────────────────────────────────────────────────────────────
interface Conversation {
  id: number;
  creatorId: number;
  fanId: number;
  lastMessageAt: string;
  unreadCount: number;
  isArchived: boolean;
  otherUser: { id: number; name: string | null };
  lastMessage: { body: string | null } | null;
}

interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  body: string | null;
  mediaUrl: string | null;
  mediaThumbnailUrl: string | null;
  mediaType: "image" | "video" | "audio" | null;
  isPpv: boolean;
  ppvPriceCents: number;
  ppvUnlockCount: number;
  isUnlockedByMe: boolean;
  isReadByRecipient: boolean;
  createdAt: string;
}

// ─── Socket singleton ────────────────────────────────────────────────────────
let socket: Socket | null = null;
function getSocket(): Socket {
  if (!socket) {
    socket = io({ path: "/socket.io/", transports: ["websocket"] });
  }
  return socket;
}

// ─── PPV Unlock Modal ────────────────────────────────────────────────────────
function PpvUnlockModal({
  message,
  onClose,
  onUnlocked,
}: {
  message: Message;
  onClose: () => void;
  onUnlocked: (msg: Message) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createIntent = trpc.message.createPpvUnlockIntent.useMutation();
  const confirmUnlock = trpc.message.confirmPpvUnlock.useMutation();

  const handlePay = async () => {
    setLoading(true);
    setError(null);
    try {
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe failed to load");

      const { clientSecret, intentId } = await createIntent.mutateAsync({ messageId: message.id });

  // @ts-ignore
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: { token: "tok_visa" } }, // In production: use Stripe Elements
      });

      if (stripeError) throw new Error(stripeError.message);
      if (paymentIntent?.status !== "succeeded") throw new Error("Payment did not complete");

      const result = await confirmUnlock.mutateAsync({ messageId: message.id, paymentIntentId: intentId });

      onUnlocked({
        ...message,
        body: result.body,
        mediaUrl: result.mediaUrl,
        mediaType: result.mediaType as any,
        isUnlockedByMe: true,
      });
      onClose();
    } catch (e: any) {
      setError(e.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div
        className="bg-[#1a1a2e] border border-[#7c3aed]/40 rounded-2xl p-8 w-full max-w-sm mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔒</div>
          <h2 className="text-xl font-bold text-white">Unlock PPV Content</h2>
          <p className="text-gray-400 mt-2 text-sm">Pay once to unlock this exclusive content</p>
        </div>
        {message.mediaThumbnailUrl && (
          <div className="relative mb-6 rounded-xl overflow-hidden">
            <img src={message.mediaThumbnailUrl} className="w-full h-40 object-cover blur-md" alt="" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white text-5xl">🔒</span>
            </div>
          </div>
        )}
        <div className="bg-[#7c3aed]/20 rounded-xl p-4 mb-6 text-center">
          <span className="text-3xl font-bold text-[#a78bfa]">
            ${(message.ppvPriceCents / 100).toFixed(2)}
          </span>
          <p className="text-gray-400 text-xs mt-1">One-time unlock</p>
        </div>
        {error && (
          <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-3 mb-4 text-red-300 text-sm">
            {error}
          </div>
        )}
        <button
          onClick={handlePay}
          disabled={loading}
          className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Processing..." : `Unlock for $${(message.ppvPriceCents / 100).toFixed(2)}`}
        </button>
        <button onClick={onClose} className="w-full mt-3 text-gray-500 hover:text-gray-300 text-sm py-2">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({
  msg,
  isOwn,
  onUnlockClick,
}: {
  msg: Message;
  isOwn: boolean;
  onUnlockClick: (msg: Message) => void;
}) {
  const isLocked = msg.isPpv && !msg.isUnlockedByMe && !isOwn;

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-3`}>
      <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
        {!isOwn && (
          <span className="text-xs text-gray-500 mb-1 ml-1">{msg.senderName}</span>
        )}
        <div
          className={`rounded-2xl px-4 py-3 ${
            isOwn
              ? "bg-[#7c3aed] text-white rounded-tr-sm"
              : "bg-[#1e1e3a] text-gray-100 rounded-tl-sm border border-[#2d2d5a]"
          }`}
        >
          {/* PPV locked state */}
          {isLocked ? (
            <button
              onClick={() => onUnlockClick(msg)}
              className="flex flex-col items-center gap-2 py-2 px-4 hover:opacity-80 transition-opacity"
            >
              {msg.mediaThumbnailUrl && (
                <div className="relative w-48 h-32 rounded-lg overflow-hidden">
                  <img src={msg.mediaThumbnailUrl} className="w-full h-full object-cover blur-sm" alt="" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="text-3xl">🔒</span>
                  </div>
                </div>
              )}
              {!msg.mediaThumbnailUrl && <span className="text-2xl">🔒</span>}
              <span className="text-[#a78bfa] font-semibold text-sm">
                Unlock for ${(msg.ppvPriceCents / 100).toFixed(2)}
              </span>
            </button>
          ) : (
            <>
              {/* Media content */}
              {msg.mediaUrl && msg.mediaType === "video" && (
                <video
                  src={msg.mediaUrl}
                  controls
                  className="rounded-lg max-w-full mb-2"
                  style={{ maxHeight: 300 }}
                />
              )}
              {msg.mediaUrl && msg.mediaType === "image" && (
                <img
                  src={msg.mediaUrl}
                  className="rounded-lg max-w-full mb-2"
                  style={{ maxHeight: 300 }}
                  alt=""
                />
              )}
              {msg.mediaUrl && msg.mediaType === "audio" && (
                <audio src={msg.mediaUrl} controls className="w-full mb-2" />
              )}
              {/* Text body */}
              {msg.body && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>}
              {/* PPV unlocked badge */}
              {msg.isPpv && msg.isUnlockedByMe && !isOwn && (
                <span className="text-xs text-[#a78bfa] mt-1 block">✓ Unlocked</span>
              )}
              {msg.isPpv && isOwn && (
                <span className="text-xs text-[#a78bfa] mt-1 block">
                  🔒 PPV · {msg.ppvUnlockCount} unlock{msg.ppvUnlockCount !== 1 ? "s" : ""}
                </span>
              )}
            </>
          )}
        </div>
        <span className="text-xs text-gray-600 mt-1 mx-1">
          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
          {isOwn && msg.isReadByRecipient && " · ✓✓"}
        </span>
      </div>
    </div>
  );
}

// ─── Thread View ──────────────────────────────────────────────────────────────
function ThreadView({
  conversationId,
  currentUserId,
  otherUserId,
  isCreator,
  onBack,
}: {
  conversationId: number;
  currentUserId: number;
  otherUserId: number;
  isCreator: boolean;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video" | "audio">("video");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [isPpv, setIsPpv] = useState(false);
  const [ppvPrice, setPpvPrice] = useState("5.00");
  const [showPpvOptions, setShowPpvOptions] = useState(false);
  const [ppvTarget, setPpvTarget] = useState<Message | null>(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = trpc.message.getMessages.useQuery(
    { conversationId, limit: 50 },
    { refetchInterval: false }
  );
  const sendMsg = trpc.message.sendMessage.useMutation();
  const markRead = trpc.message.markRead.useMutation();

  useEffect(() => {
    if (data) setMessages(data as Message[]);
  }, [data]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    markRead.mutate({ conversationId });
    const sock = getSocket();
    sock.on("new_message", (msg: Message) => {
      if (msg.conversationId === conversationId) {
        setMessages((prev) => [...prev, msg]);
        markRead.mutate({ conversationId });
      }
    });
    return () => { sock.off("new_message"); };
  }, [conversationId]);

  const handleSend = async () => {
    if ((!input.trim() && !mediaUrl.trim()) || sending) return;
    setSending(true);
    try {
      await sendMsg.mutateAsync({
        recipientId: otherUserId,
        body: input.trim() || undefined,
        mediaUrl: mediaUrl.trim() || undefined,
        mediaType: mediaUrl ? mediaType : undefined,
        mediaThumbnailUrl: thumbnailUrl.trim() || undefined,
        isPpv,
        ppvPriceCents: isPpv ? Math.round(parseFloat(ppvPrice) * 100) : 0,
      });
      setInput("");
      setMediaUrl("");
      setThumbnailUrl("");
      setIsPpv(false);
      setShowPpvOptions(false);
    } catch (e: any) {
      console.error("Send failed:", e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2d2d5a] bg-[#0d0d1a]">
        <button onClick={onBack} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
          ←
        </button>
        <div className="w-9 h-9 rounded-full bg-[#7c3aed]/30 flex items-center justify-center text-sm font-bold text-[#a78bfa]">
          {conversationId}
        </div>
        <div>
          <p className="text-white font-medium text-sm">Conversation #{conversationId}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isOwn={msg.senderId === currentUserId}
            onUnlockClick={setPpvTarget}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* PPV Options (creator only) */}
      {isCreator && showPpvOptions && (
        <div className="px-4 py-3 bg-[#1a1a2e] border-t border-[#2d2d5a]">
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="Media URL (video/image/audio)"
                className="flex-1 bg-[#0d0d1a] border border-[#2d2d5a] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:border-[#7c3aed] outline-none"
              />
              <select
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value as any)}
                className="bg-[#0d0d1a] border border-[#2d2d5a] rounded-lg px-2 py-2 text-white text-sm focus:border-[#7c3aed] outline-none"
              >
                <option value="video">Video</option>
                <option value="image">Image</option>
                <option value="audio">Audio</option>
              </select>
            </div>
            <input
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="Thumbnail URL (for PPV preview)"
              className="bg-[#0d0d1a] border border-[#2d2d5a] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:border-[#7c3aed] outline-none"
            />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPpv}
                  onChange={(e) => setIsPpv(e.target.checked)}
                  className="w-4 h-4 accent-[#7c3aed]"
                />
                <span className="text-gray-300 text-sm">Lock as PPV</span>
              </label>
              {isPpv && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    min="1"
                    step="0.50"
                    value={ppvPrice}
                    onChange={(e) => setPpvPrice(e.target.value)}
                    className="w-20 bg-[#0d0d1a] border border-[#7c3aed]/50 rounded-lg px-2 py-1 text-white text-sm focus:border-[#7c3aed] outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="px-4 py-3 border-t border-[#2d2d5a] bg-[#0d0d1a]">
        <div className="flex items-end gap-2">
          {isCreator && (
            <button
              onClick={() => setShowPpvOptions(!showPpvOptions)}
              className={`p-2 rounded-lg transition-colors ${showPpvOptions ? "bg-[#7c3aed]/30 text-[#a78bfa]" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"}`}
              title="Attach media / PPV"
            >
              📎
            </button>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-[#1e1e3a] border border-[#2d2d5a] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-[#7c3aed] outline-none resize-none"
            style={{ minHeight: 44, maxHeight: 120 }}
          />
          <button
            onClick={handleSend}
            disabled={sending || (!input.trim() && !mediaUrl.trim())}
            className="bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-40 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* PPV Unlock Modal */}
      {ppvTarget && (
        <PpvUnlockModal
          message={ppvTarget}
          onClose={() => setPpvTarget(null)}
          onUnlocked={(updated) => {
            setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
            setPpvTarget(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Mass DM Panel (creator only) ────────────────────────────────────────────
function MassDmPanel({ onClose }: { onClose: () => void }) {
  const [body, setBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video" | "audio">("video");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [isPpv, setIsPpv] = useState(false);
  const [ppvPrice, setPpvPrice] = useState("9.99");
  const [result, setResult] = useState<{ sent: number; batchId: string | null } | null>(null);
  const [sending, setSending] = useState(false);
  const blast = trpc.message.massDmBlast.useMutation();

  const handleBlast = async () => {
    if (!body.trim() && !mediaUrl.trim()) return;
    setSending(true);
    try {
      const res = await blast.mutateAsync({
        body: body.trim() || undefined,
        mediaUrl: mediaUrl.trim() || undefined,
        mediaType: mediaUrl ? mediaType : undefined,
        mediaThumbnailUrl: thumbnailUrl.trim() || undefined,
        isPpv,
        ppvPriceCents: isPpv ? Math.round(parseFloat(ppvPrice) * 100) : 0,
      });
      setResult(res);
    } catch (e: any) {
      console.error("Mass DM failed:", e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div
        className="bg-[#1a1a2e] border border-[#7c3aed]/40 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Mass DM Blast</h2>
            <p className="text-gray-400 text-sm mt-1">Send to all active subscribers at once</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>

        {result ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">✅</div>
            <p className="text-white text-xl font-bold">Sent to {result.sent} subscribers</p>
            <p className="text-gray-400 text-sm mt-2">Batch ID: {result.batchId}</p>
            <button onClick={onClose} className="mt-6 bg-[#7c3aed] text-white px-6 py-2 rounded-xl hover:bg-[#6d28d9] transition-colors">
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Message to all subscribers..."
              rows={4}
              className="w-full bg-[#0d0d1a] border border-[#2d2d5a] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-[#7c3aed] outline-none resize-none"
            />
            <input
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder="Media URL (optional)"
              className="w-full bg-[#0d0d1a] border border-[#2d2d5a] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:border-[#7c3aed] outline-none"
            />
            {mediaUrl && (
              <div className="flex gap-2">
                <select
                  value={mediaType}
                  onChange={(e) => setMediaType(e.target.value as any)}
                  className="flex-1 bg-[#0d0d1a] border border-[#2d2d5a] rounded-xl px-3 py-2 text-white text-sm focus:border-[#7c3aed] outline-none"
                >
                  <option value="video">Video</option>
                  <option value="image">Image</option>
                  <option value="audio">Audio</option>
                </select>
                <input
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="Thumbnail URL"
                  className="flex-1 bg-[#0d0d1a] border border-[#2d2d5a] rounded-xl px-3 py-2 text-white text-sm placeholder-gray-600 focus:border-[#7c3aed] outline-none"
                />
              </div>
            )}
            <div className="flex items-center gap-4 bg-[#0d0d1a] rounded-xl p-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPpv}
                  onChange={(e) => setIsPpv(e.target.checked)}
                  className="w-4 h-4 accent-[#7c3aed]"
                />
                <span className="text-gray-300 text-sm font-medium">Lock as PPV</span>
              </label>
              {isPpv && (
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-gray-400 text-sm">Price:</span>
                  <span className="text-gray-400">$</span>
                  <input
                    type="number"
                    min="1"
                    step="0.50"
                    value={ppvPrice}
                    onChange={(e) => setPpvPrice(e.target.value)}
                    className="w-24 bg-[#1a1a2e] border border-[#7c3aed]/50 rounded-lg px-2 py-1 text-white text-sm focus:border-[#7c3aed] outline-none"
                  />
                </div>
              )}
            </div>
            <button
              onClick={handleBlast}
              disabled={sending || (!body.trim() && !mediaUrl.trim())}
              className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>📤 Blast to All Subscribers</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Messages Page ───────────────────────────────────────────────────────
export default function Messages() {
  const { user } = useAuth();
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [showMassDm, setShowMassDm] = useState(false);
  const [search, setSearch] = useState("");

  const isCreator = user?.role === "creator" || user?.role === "king" || user?.role === "admin";

  const { data: conversations, isLoading, refetch } = trpc.message.getConversations.useQuery(
    undefined,
    { refetchInterval: 15000 }
  );

  // Join personal socket room for real-time delivery
  useEffect(() => {
    if (!user?.id) return;
    const sock = getSocket();
    sock.emit("join-user-room", user.id);
    sock.on("new_message", () => refetch());
    return () => { sock.off("new_message"); };
  }, [user?.id]);

  const filtered = (conversations as Conversation[] | undefined)?.filter((c) => {
    if (!search) return true;
    return c.otherUser.name?.toLowerCase().includes(search.toLowerCase());
  }) ?? [];

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0d0d1a]">
        <p className="text-gray-400">Please log in to access messages.</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0d0d1a] text-white overflow-hidden">
      {/* Sidebar — conversation list */}
      <div
        className={`${activeConvId ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 border-r border-[#2d2d5a] bg-[#0d0d1a] flex-shrink-0`}
      >
        {/* Header */}
        <div className="px-4 py-4 border-b border-[#2d2d5a]">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-white">Messages</h1>
            {isCreator && (
              <button
                onClick={() => setShowMassDm(true)}
                className="bg-[#7c3aed]/20 hover:bg-[#7c3aed]/40 text-[#a78bfa] text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border border-[#7c3aed]/30"
              >
                📤 Mass DM
              </button>
            )}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-[#1e1e3a] border border-[#2d2d5a] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-[#7c3aed] outline-none"
          />
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="text-5xl mb-4">💬</div>
              <p className="text-gray-400 text-sm">No conversations yet.</p>
              {isCreator && (
                <p className="text-gray-600 text-xs mt-2">Subscribers will appear here when they message you.</p>
              )}
            </div>
          )}
          {filtered.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setActiveConvId(conv.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-[#1a1a2e] text-left ${
                activeConvId === conv.id ? "bg-[#7c3aed]/10 border-l-2 border-l-[#7c3aed]" : ""
              }`}
            >
              <div className="w-11 h-11 rounded-full bg-[#7c3aed]/20 flex items-center justify-center text-[#a78bfa] font-bold text-sm flex-shrink-0">
                {conv.otherUser.name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm font-medium truncate">
                    {conv.otherUser.name ?? `User #${conv.otherUser.id}`}
                  </span>
                  <span className="text-gray-600 text-xs flex-shrink-0 ml-2">
                    {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: false })}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-gray-500 text-xs truncate">
                    {conv.lastMessage?.body ?? "No messages yet"}
                  </p>
                  {conv.unreadCount > 0 && (
                    <span className="bg-[#7c3aed] text-white text-xs font-bold px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Thread view */}
      <div className={`${activeConvId ? "flex" : "hidden md:flex"} flex-1 flex-col`}>
        {activeConvId ? (
          <ThreadView
            conversationId={activeConvId}
            currentUserId={user.id}
            otherUserId={filtered.find(c => c.id === activeConvId)?.otherUser.id ?? 0}
            isCreator={isCreator}
            onBack={() => setActiveConvId(null)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="text-6xl mb-4">💬</div>
            <h2 className="text-xl font-bold text-white mb-2">Your Messages</h2>
            <p className="text-gray-400 text-sm max-w-xs">
              {isCreator
                ? "Select a conversation or blast a mass DM with PPV content to all subscribers."
                : "Select a conversation to start messaging."}
            </p>
          </div>
        )}
      </div>

      {/* Mass DM modal */}
      {showMassDm && <MassDmPanel onClose={() => setShowMassDm(false)} />}
    </div>
  );
}
