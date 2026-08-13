import { useMemo, useState } from "react";
import { ArrowUp, Bot, BrainCircuit, Crown, Loader2, Radar, Send, ShieldCheck, Sparkles, User } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Role = "creator" | "recruiter" | "field_operator" | "ambassador";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const ROLE_OPTIONS: Array<{
  id: Role;
  label: string;
  eyebrow: string;
  description: string;
  color: string;
  prompt: string;
}> = [
  {
    id: "creator",
    label: "Creator",
    eyebrow: "Build the drop",
    description: "Turn your content, audience, and offers into a stronger next move.",
    color: "#F1C95D",
    prompt: "Look at my CreatorVault path and tell me the highest-value move I can make today.",
  },
  {
    id: "recruiter",
    label: "Recruiter",
    eyebrow: "Build the network",
    description: "Create sharper outreach, better qualification, and stronger closes.",
    color: "#8BE7C0",
    prompt: "Give me a direct recruitment plan and the exact first message to send today.",
  },
  {
    id: "field_operator",
    label: "Operator",
    eyebrow: "Run the play",
    description: "Turn your location, connections, and timing into a real opportunity.",
    color: "#89B8FF",
    prompt: "Give me the clearest money move for my location and role today.",
  },
  {
    id: "ambassador",
    label: "Ambassador",
    eyebrow: "Move the culture",
    description: "Build attention, community energy, and the next live opportunity.",
    color: "#FF9EC7",
    prompt: "Help me turn attention into community momentum this week.",
  },
];

function roleLabel(role: Role) {
  return ROLE_OPTIONS.find((option) => option.id === role)?.label || "Creator";
}

export default function AIBot() {
  const [role, setRole] = useState<Role>("creator");
  const [message, setMessage] = useState("");
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const { data: context } = trpc.aiBot.getContext.useQuery();

  const activeRole = useMemo(
    () => ROLE_OPTIONS.find((option) => option.id === role) || ROLE_OPTIONS[0],
    [role],
  );

  const chatMutation = trpc.aiBot.chat.useMutation({
    onSuccess: (data) => {
      setConversationHistory((history) => [...history, { role: "assistant", content: data.message }]);
      setMessage("");
    },
    onError: (error) => toast.error(error.message || "RealGPT could not answer that yet."),
  });

  const sendMessage = (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || chatMutation.isPending) return;
    const nextHistory = [...conversationHistory, { role: "user" as const, content: trimmed }];
    setConversationHistory(nextHistory);
    chatMutation.mutate({
      message: trimmed,
      role,
      conversationHistory: nextHistory.slice(-10),
    });
  };

  const handleSendMessage = (event: React.FormEvent) => {
    event.preventDefault();
    sendMessage(message);
  };

  return (
    <main className="realgpt-shell">
      <style>{`
        @keyframes realgpt-orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes realgpt-breathe { 0%, 100% { opacity: .46; transform: scale(.96); } 50% { opacity: .92; transform: scale(1.05); } }
        @keyframes realgpt-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .realgpt-shell { min-height: 100vh; overflow: hidden; position: relative; background: #050609; color: #f7f4ed; font-family: "DM Sans", Arial, sans-serif; padding: 26px 18px 52px; }
        .realgpt-shell::before { content: ""; position: fixed; inset: 0; pointer-events: none; background: radial-gradient(circle at 16% 0%, rgba(241, 201, 93, .18), transparent 31%), radial-gradient(circle at 88% 78%, rgba(114, 93, 221, .18), transparent 30%), linear-gradient(115deg, rgba(255,255,255,.025) 1px, transparent 1px); background-size: auto, auto, 30px 30px; mask-image: linear-gradient(to bottom, black, rgba(0,0,0,.35)); }
        .realgpt-frame { width: min(1240px, 100%); margin: 0 auto; position: relative; z-index: 1; }
        .realgpt-hero { display: grid; grid-template-columns: minmax(0, 1fr) 260px; align-items: end; gap: 34px; min-height: 280px; padding: 34px 0 42px; border-bottom: 1px solid rgba(255,255,255,.13); }
        .realgpt-kicker { display: inline-flex; align-items: center; gap: 9px; color: #f1c95d; font-size: 10px; font-weight: 900; letter-spacing: .22em; text-transform: uppercase; }
        .realgpt-title { margin: 13px 0 14px; max-width: 820px; font-family: "Bebas Neue", Impact, sans-serif; font-size: clamp(64px, 10vw, 136px); font-weight: 400; line-height: .79; letter-spacing: .025em; }
        .realgpt-title span { color: #f1c95d; text-shadow: 0 0 38px rgba(241,201,93,.28); }
        .realgpt-subtitle { max-width: 610px; margin: 0; color: rgba(247,244,237,.69); font-size: clamp(15px, 2vw, 18px); line-height: 1.55; }
        .realgpt-orb { width: 230px; height: 230px; position: relative; justify-self: end; display: grid; place-items: center; }
        .realgpt-orb::before { content: ""; width: 176px; height: 176px; position: absolute; border-radius: 999px; border: 1px solid rgba(241,201,93,.35); border-right-color: transparent; border-bottom-color: rgba(139,231,192,.62); animation: realgpt-orbit 13s linear infinite; }
        .realgpt-orb::after { content: ""; width: 102px; height: 102px; position: absolute; border-radius: 999px; background: radial-gradient(circle at 37% 28%, #fff8db, #f1c95d 28%, #5e4a16 61%, transparent 71%); filter: blur(.2px); animation: realgpt-breathe 4s ease-in-out infinite; box-shadow: 0 0 55px rgba(241,201,93,.25); }
        .realgpt-orb-icon { position: relative; z-index: 2; color: #12100a; }
        .realgpt-status { position: absolute; bottom: 14px; right: 0; display: inline-flex; align-items: center; gap: 7px; color: rgba(247,244,237,.62); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; }
        .realgpt-status i { display: block; width: 7px; height: 7px; border-radius: 999px; background: #8be7c0; box-shadow: 0 0 12px #8be7c0; }
        .realgpt-grid { display: grid; grid-template-columns: 260px minmax(0, 1fr) 245px; gap: 18px; padding-top: 22px; }
        .realgpt-rail { min-width: 0; }
        .realgpt-rail-title { margin: 0 0 13px; color: rgba(247,244,237,.46); font-size: 10px; font-weight: 900; letter-spacing: .16em; text-transform: uppercase; }
        .realgpt-role { width: 100%; text-align: left; position: relative; display: block; margin-bottom: 7px; padding: 15px 13px 15px 16px; overflow: hidden; border: 1px solid rgba(255,255,255,.09); border-radius: 3px; background: rgba(255,255,255,.025); color: #fff; cursor: pointer; transition: border-color .2s ease, transform .2s ease, background .2s ease; }
        .realgpt-role:hover { transform: translateX(3px); border-color: rgba(255,255,255,.3); }
        .realgpt-role.active { background: rgba(255,255,255,.08); border-color: var(--role-color); box-shadow: inset 3px 0 0 var(--role-color), 0 10px 35px rgba(0,0,0,.22); }
        .realgpt-role .eyebrow { display: block; margin-bottom: 5px; color: var(--role-color); font-size: 9px; font-weight: 900; letter-spacing: .15em; text-transform: uppercase; }
        .realgpt-role strong { display: block; margin-bottom: 4px; font-family: "Bebas Neue", Impact, sans-serif; font-size: 23px; letter-spacing: .07em; }
        .realgpt-role small { display: block; color: rgba(247,244,237,.58); font-size: 11px; line-height: 1.4; }
        .realgpt-chat { min-height: 650px; display: flex; flex-direction: column; border: 1px solid rgba(255,255,255,.14); background: linear-gradient(160deg, rgba(255,255,255,.07), rgba(255,255,255,.025) 46%, rgba(0,0,0,.32)); box-shadow: 0 28px 60px rgba(0,0,0,.28); }
        .realgpt-chat-header { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 19px 21px; border-bottom: 1px solid rgba(255,255,255,.11); }
        .realgpt-chat-header h2 { margin: 0; font-family: "Bebas Neue", Impact, sans-serif; font-size: 31px; letter-spacing: .08em; }
        .realgpt-chat-header p { margin: 3px 0 0; color: rgba(247,244,237,.54); font-size: 12px; }
        .realgpt-context-pill { display: inline-flex; align-items: center; gap: 7px; padding: 8px 10px; border: 1px solid rgba(139,231,192,.28); background: rgba(139,231,192,.06); color: #8be7c0; white-space: nowrap; font-size: 10px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
        .realgpt-message-area { flex: 1; min-height: 430px; max-height: 580px; overflow-y: auto; padding: 22px; }
        .realgpt-empty { min-height: 370px; display: grid; align-content: center; gap: 15px; padding: 18px; animation: realgpt-rise .5s ease both; }
        .realgpt-empty-symbol { width: 54px; height: 54px; display: grid; place-items: center; border: 1px solid #f1c95d; border-radius: 999px; color: #f1c95d; box-shadow: 0 0 28px rgba(241,201,93,.15); }
        .realgpt-empty h3 { margin: 0; max-width: 540px; font-family: "Bebas Neue", Impact, sans-serif; font-size: clamp(32px, 4vw, 49px); line-height: .95; letter-spacing: .055em; }
        .realgpt-empty p { max-width: 470px; margin: 0; color: rgba(247,244,237,.63); font-size: 14px; line-height: 1.55; }
        .realgpt-chip-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 5px; }
        .realgpt-chip { padding: 10px 12px; border: 1px solid rgba(255,255,255,.15); background: rgba(255,255,255,.04); color: #f7f4ed; font-size: 12px; text-align: left; cursor: pointer; transition: background .2s, border-color .2s; }
        .realgpt-chip:hover { background: rgba(241,201,93,.12); border-color: #f1c95d; }
        .realgpt-thread { display: grid; gap: 15px; }
        .realgpt-message { display: grid; grid-template-columns: 30px minmax(0, 1fr); gap: 10px; animation: realgpt-rise .3s ease both; }
        .realgpt-message.you { grid-template-columns: minmax(0, 1fr) 30px; }
        .realgpt-avatar { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 999px; background: #f1c95d; color: #171208; }
        .realgpt-message.you .realgpt-avatar { order: 2; background: rgba(255,255,255,.13); color: #fff; }
        .realgpt-bubble { justify-self: start; max-width: min(630px, 94%); padding: 14px 15px; border-left: 2px solid #f1c95d; background: rgba(255,255,255,.07); color: rgba(247,244,237,.91); font-size: 14px; line-height: 1.58; white-space: pre-wrap; }
        .realgpt-message.you .realgpt-bubble { justify-self: end; border-left: 0; border-right: 2px solid #89b8ff; background: rgba(137,184,255,.12); }
        .realgpt-input-row { display: flex; gap: 10px; padding: 14px; border-top: 1px solid rgba(255,255,255,.11); background: rgba(0,0,0,.22); }
        .realgpt-input-row input { flex: 1; min-width: 0; height: 51px; padding: 0 15px; border: 1px solid rgba(255,255,255,.18); border-radius: 2px; outline: none; background: rgba(255,255,255,.055); color: #fff; font-size: 14px; }
        .realgpt-input-row input:focus { border-color: #f1c95d; box-shadow: 0 0 0 3px rgba(241,201,93,.09); }
        .realgpt-input-row input::placeholder { color: rgba(247,244,237,.36); }
        .realgpt-send { width: 53px; min-width: 53px; height: 51px; display: grid; place-items: center; border: 0; border-radius: 2px; background: #f1c95d; color: #161208; cursor: pointer; transition: transform .15s, background .15s; }
        .realgpt-send:hover:not(:disabled) { background: #fff2c1; transform: translateY(-1px); }
        .realgpt-send:disabled { opacity: .4; cursor: not-allowed; }
        .realgpt-side { display: grid; align-content: start; gap: 12px; }
        .realgpt-brief { border-top: 1px solid rgba(255,255,255,.15); padding: 15px 0 18px; }
        .realgpt-brief:first-child { border-top: 0; padding-top: 0; }
        .realgpt-brief-label { display: flex; align-items: center; gap: 8px; margin: 0 0 8px; color: rgba(247,244,237,.5); font-size: 10px; font-weight: 900; letter-spacing: .15em; text-transform: uppercase; }
        .realgpt-brief strong { display: block; color: #fff; font-family: "Bebas Neue", Impact, sans-serif; font-size: 24px; font-weight: 400; letter-spacing: .07em; }
        .realgpt-brief p { margin: 5px 0 0; color: rgba(247,244,237,.57); font-size: 12px; line-height: 1.5; }
        @media (max-width: 980px) { .realgpt-hero { grid-template-columns: 1fr 170px; min-height: 220px; } .realgpt-orb { width: 160px; height: 160px; transform: scale(.7); transform-origin: right center; } .realgpt-grid { grid-template-columns: 210px minmax(0, 1fr); } .realgpt-side { grid-column: 1 / -1; grid-template-columns: repeat(3, 1fr); padding-top: 8px; } .realgpt-brief { border-top: 0; border-left: 1px solid rgba(255,255,255,.15); padding: 0 0 0 13px; } .realgpt-brief:first-child { border-left: 0; padding-left: 0; } }
        @media (max-width: 700px) { .realgpt-shell { padding: 18px 13px 32px; } .realgpt-hero { grid-template-columns: 1fr; min-height: 0; padding: 22px 4px 27px; } .realgpt-title { font-size: clamp(64px, 21vw, 95px); } .realgpt-orb { display: none; } .realgpt-grid { grid-template-columns: 1fr; gap: 17px; } .realgpt-rail { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; } .realgpt-rail-title { grid-column: 1 / -1; margin-bottom: 5px; } .realgpt-role { min-height: 128px; margin: 0; padding: 12px; } .realgpt-role strong { font-size: 20px; } .realgpt-role small { font-size: 10px; } .realgpt-chat { min-height: 550px; } .realgpt-message-area { min-height: 340px; max-height: 500px; padding: 15px; } .realgpt-side { grid-column: auto; grid-template-columns: 1fr; padding: 0 4px; } .realgpt-brief { border-left: 0; border-top: 1px solid rgba(255,255,255,.15); padding: 13px 0 0; } .realgpt-brief:first-child { border-top: 0; padding-top: 0; } .realgpt-context-pill { display: none; } }
      `}</style>
      <div className="realgpt-frame">
        <section className="realgpt-hero">
          <div>
            <div className="realgpt-kicker"><Radar size={13} /> CreatorVault intelligence</div>
            <h1 className="realgpt-title">REAL<span>GPT</span></h1>
            <p className="realgpt-subtitle">Your CreatorVault intelligence layer. It uses the role and context you already have here to help you make the next move with more power.</p>
          </div>
          <div className="realgpt-orb" aria-hidden="true">
            <BrainCircuit className="realgpt-orb-icon" size={35} strokeWidth={2.4} />
            <span className="realgpt-status"><i /> ready with your context</span>
          </div>
        </section>

        <section className="realgpt-grid">
          <aside className="realgpt-rail" aria-label="Choose your focus">
            <p className="realgpt-rail-title">Choose your current mission</p>
            {ROLE_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.id}
                className={`realgpt-role ${role === option.id ? "active" : ""}`}
                style={{ "--role-color": option.color } as React.CSSProperties}
                onClick={() => setRole(option.id)}
              >
                <span className="eyebrow">{option.eyebrow}</span>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </button>
            ))}
          </aside>

          <section className="realgpt-chat" aria-label="Chat with RealGPT">
            <header className="realgpt-chat-header">
              <div>
                <h2>{activeRole.label} room</h2>
                <p>{activeRole.eyebrow} · RealGPT responds through your saved CreatorVault context.</p>
              </div>
              {context ? <span className="realgpt-context-pill"><ShieldCheck size={13} /> context present</span> : null}
            </header>

            <div className="realgpt-message-area">
              {conversationHistory.length === 0 ? (
                <div className="realgpt-empty">
                  <div className="realgpt-empty-symbol"><Crown size={27} /></div>
                  <h3>What needs to move <span style={{ color: activeRole.color }}>right now?</span></h3>
                  <p>Start with the piece of your business that is holding you back. RealGPT will work from your selected focus and saved CreatorVault context—not a generic script.</p>
                  <div className="realgpt-chip-row">
                    <button type="button" className="realgpt-chip" onClick={() => sendMessage(activeRole.prompt)}>{activeRole.prompt}</button>
                    <button type="button" className="realgpt-chip" onClick={() => sendMessage("Give me the one move that creates the most leverage today.")}>Find my highest-leverage move</button>
                  </div>
                </div>
              ) : (
                <div className="realgpt-thread">
                  {conversationHistory.map((entry, index) => (
                    <article key={`${entry.role}-${index}`} className={`realgpt-message ${entry.role === "user" ? "you" : ""}`}>
                      <div className="realgpt-avatar">{entry.role === "user" ? <User size={15} /> : <Bot size={16} />}</div>
                      <div className="realgpt-bubble">{entry.content}</div>
                    </article>
                  ))}
                  {chatMutation.isPending ? (
                    <article className="realgpt-message">
                      <div className="realgpt-avatar"><Bot size={16} /></div>
                      <div className="realgpt-bubble"><Loader2 size={16} className="animate-spin" /></div>
                    </article>
                  ) : null}
                </div>
              )}
            </div>

            <form className="realgpt-input-row" onSubmit={handleSendMessage}>
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={`Ask RealGPT about your ${activeRole.label.toLowerCase()} mission…`}
                disabled={chatMutation.isPending}
              />
              <button className="realgpt-send" type="submit" aria-label="Send message" disabled={!message.trim() || chatMutation.isPending}>
                {chatMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              </button>
            </form>
          </section>

          <aside className="realgpt-side" aria-label="RealGPT context">
            <div className="realgpt-brief">
              <p className="realgpt-brief-label"><Sparkles size={13} /> Your focus</p>
              <strong>{roleLabel(role)}</strong>
              <p>{activeRole.description}</p>
            </div>
            <div className="realgpt-brief">
              <p className="realgpt-brief-label"><ShieldCheck size={13} /> Saved context</p>
              <strong>{context?.location || "CreatorVault"}</strong>
              <p>{context?.language ? `Language: ${context.language.toUpperCase()}. ` : ""}RealGPT uses the profile context CreatorVault already has for you.</p>
            </div>
            <div className="realgpt-brief">
              <p className="realgpt-brief-label"><ArrowUp size={13} /> Move with power</p>
              <strong>One clear next move.</strong>
              <p>Ask for a plan, a message, a content angle, or a sales move. RealGPT will keep the answer tied to your role.</p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
