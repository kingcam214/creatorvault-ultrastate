import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Trophy, ChevronLeft, Zap, Send, RefreshCw, TrendingUp, Target, Play, CheckCircle } from "lucide-react";

const POST_TYPES = [
  {key:"daily_update",label:"Daily Update",desc:"Current progress toward $5k",color:"#C9A84C"},
  {key:"milestone",label:"Milestone Post",desc:"Celebrate hitting a target",color:"#27AE60"},
  {key:"countdown",label:"Countdown Trailer",desc:"Video counting down to goal",color:"#E74C3C"},
  {key:"torment_thread",label:"Torment Thread",desc:"Viral engagement thread",color:"#9B59B6"},
  {key:"victory",label:"Victory Trailer",desc:"Celebrate hitting $5k",color:"#F39C12"},
  {key:"recap",label:"Weekly Recap",desc:"7-day empire highlights",color:"#00D9FF"},
];

export function ChallengeStoryEngine() {
  const { toast } = useToast();
  const [postType, setPostType] = useState("daily_update");
  const [channel, setChannel] = useState("");
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [autoPost, setAutoPost] = useState(false);

  const { data: challenge } = trpc.challengeAutomation?.getActiveChallenge?.useQuery?.() || { data: null };
  const { data: channels } = trpc.telegramHub?.getChannels?.useQuery?.() || { data: null };

  const generate = trpc.challengeAutomation?.generateChallengePost?.useMutation?.({
    onSuccess: (d: any) => { setGeneratedContent(d); toast({title:"Content generated"}); },
    onError: (e: any) => toast({title:"Error",description:e.message,variant:"destructive"}),
  }) || { mutate: ()=>{}, isPending: false };

  const post = trpc.telegramHub?.broadcastMessage?.useMutation?.({
    onSuccess: () => toast({title:"Posted to Telegram!"}),
    onError: (e: any) => toast({title:"Error",description:e.message,variant:"destructive"}),
  }) || { mutate: ()=>{}, isPending: false };

  const progress = challenge ? (parseFloat(String(challenge.current_revenue || 0)) / parseFloat(String(challenge.target_revenue || 5000))) * 100 : 0;

  return (
    <div style={{minHeight:"100vh",background:"#080810",color:"white",fontFamily:"system-ui,sans-serif"}}>
      <div style={{borderBottom:"1px solid #1a1a2e",padding:"16px 24px",display:"flex",alignItems:"center",gap:16,background:"#0a0a1a"}}>
        <Link href="/king"><button style={{background:"none",border:"1px solid #333",borderRadius:8,padding:"6px 12px",color:"#888",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:13}}><ChevronLeft size={14}/> King Hub</button></Link>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:"#C9A84C22",border:"1px solid #C9A84C44",display:"flex",alignItems:"center",justifyContent:"center"}}><Trophy size={16} color="#C9A84C"/></div>
          <div><div style={{fontSize:16,fontWeight:700}}>Challenge Story Engine</div><div style={{fontSize:11,color:"#666"}}>Auto-generate $5k challenge content</div></div>
        </div>
      </div>
      <div style={{padding:24,display:"grid",gridTemplateColumns:"300px 1fr",gap:20}}>
        <div style={{display:"grid",gap:12}}>
          {challenge && (
            <div style={{background:"#0f0f1a",border:"1px solid #C9A84C44",borderRadius:12,padding:16}}>
              <div style={{fontSize:12,color:"#C9A84C",fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:"1px"}}>Active Challenge</div>
              <div style={{fontSize:24,fontWeight:900,color:"white"}}>${parseFloat(String(challenge.current_revenue||0)).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
              <div style={{fontSize:12,color:"#888",marginBottom:10}}>of ${parseFloat(String(challenge.target_revenue||5000)).toLocaleString()} goal</div>
              <div style={{height:6,background:"#1a1a2e",borderRadius:3,marginBottom:6}}>
                <div style={{height:"100%",width:`${Math.min(progress,100)}%`,background:"linear-gradient(90deg,#C9A84C,#F39C12)",borderRadius:3,transition:"width 0.5s ease"}}/>
              </div>
              <div style={{fontSize:11,color:"#666"}}>{progress.toFixed(1)}% complete</div>
            </div>
          )}
          <div style={{background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:12,padding:16}}>
            <div style={{fontSize:11,color:"#666",textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>Post Type</div>
            <div style={{display:"grid",gap:6}}>
              {POST_TYPES.map(t=>(
                <button key={t.key} onClick={()=>setPostType(t.key)} style={{padding:"10px 12px",borderRadius:8,border:`1px solid ${postType===t.key?t.color:"#1a1a2e"}`,background:postType===t.key?`${t.color}15`:"#0a0a1a",cursor:"pointer",textAlign:"left"}}>
                  <div style={{fontSize:12,fontWeight:700,color:postType===t.key?t.color:"#aaa"}}>{t.label}</div>
                  <div style={{fontSize:11,color:"#555"}}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>
          {channels?.channels?.length > 0 && (
            <div style={{background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:12,padding:16}}>
              <div style={{fontSize:11,color:"#666",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Target Channel</div>
              <select value={channel} onChange={e=>setChannel(e.target.value)} style={{width:"100%",padding:"8px 10px",background:"#0a0a1a",border:"1px solid #1a1a2e",borderRadius:8,color:"white",fontSize:13,outline:"none"}}>
                <option value="">All channels</option>
                {channels.channels.map((c:any)=><option key={c.id} value={c.chat_id}>{c.name||c.chat_id}</option>)}
              </select>
            </div>
          )}
          <button onClick={()=>generate.mutate({postType,challengeData:challenge})} disabled={generate.isPending} style={{padding:"14px",borderRadius:10,border:"none",background:generate.isPending?"#1a1a2e":"linear-gradient(135deg,#C9A84C,#F39C12)",color:generate.isPending?"#555":"#000",cursor:generate.isPending?"not-allowed":"pointer",fontSize:14,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            {generate.isPending?<><RefreshCw size={15} style={{animation:"spin 1s linear infinite"}}/> Generating...</>:<><Zap size={15}/> Generate Content</>}
          </button>
        </div>
        <div>
          {!generatedContent ? (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",color:"#444",minHeight:400}}>
              <Trophy size={48} style={{marginBottom:16}}/>
              <div style={{fontSize:16,fontWeight:600,marginBottom:8}}>Select a post type and generate</div>
              <div style={{fontSize:13}}>AI will create content based on your real challenge progress</div>
            </div>
          ) : (
            <div style={{display:"grid",gap:16}}>
              {generatedContent.text && (
                <div style={{background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:12,padding:20}}>
                  <div style={{fontSize:13,fontWeight:700,marginBottom:12,color:"#C9A84C",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    Generated Post
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>{navigator.clipboard.writeText(generatedContent.text);toast({title:"Copied!"});}} style={{padding:"5px 12px",borderRadius:6,border:"1px solid #333",background:"none",color:"#888",cursor:"pointer",fontSize:12}}>Copy</button>
                      <button onClick={()=>post.mutate({message:generatedContent.text,channelId:channel||undefined})} disabled={post.isPending} style={{padding:"5px 12px",borderRadius:6,border:"none",background:"#00D9FF",color:"#000",cursor:post.isPending?"not-allowed":"pointer",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:4}}>
                        {post.isPending?<RefreshCw size={12} style={{animation:"spin 1s linear infinite"}}/>:<Send size={12}/>} Post to Telegram
                      </button>
                    </div>
                  </div>
                  <pre style={{color:"#e0e0e0",fontSize:13,lineHeight:1.7,whiteSpace:"pre-wrap",fontFamily:"inherit",margin:0}}>{generatedContent.text}</pre>
                </div>
              )}
              {generatedContent.hashtags?.length > 0 && (
                <div style={{background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:12,padding:16}}>
                  <div style={{fontSize:12,fontWeight:700,marginBottom:8,color:"#888"}}>Hashtags</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{generatedContent.hashtags.map((h:string,i:number)=><span key={i} style={{padding:"4px 10px",borderRadius:20,background:"#C9A84C20",color:"#C9A84C",fontSize:12}}>#{h.replace("#","")}</span>)}</div>
                </div>
              )}
              {generatedContent.videoScript && (
                <div style={{background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:12,padding:16}}>
                  <div style={{fontSize:12,fontWeight:700,marginBottom:8,color:"#888",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    Video Script
                    <Link href="/king/engine"><button style={{padding:"5px 12px",borderRadius:6,border:"none",background:"#C9A84C",color:"#000",cursor:"pointer",fontSize:12,fontWeight:700}}>Open in Engine</button></Link>
                  </div>
                  <pre style={{color:"#e0e0e0",fontSize:13,lineHeight:1.6,whiteSpace:"pre-wrap",fontFamily:"inherit",margin:0}}>{generatedContent.videoScript}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}*{box-sizing:border-box}`}</style>
    </div>
  );
}
export default ChallengeStoryEngine;
