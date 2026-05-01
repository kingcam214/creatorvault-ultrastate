import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Music, ChevronLeft, Play, Pause, Download, Zap, RefreshCw } from "lucide-react";

const GENRES = ["hip-hop","r&b","trap","pop","electronic","lo-fi","gospel","drill","afrobeats"];
const MOODS = ["hype","chill","dark","uplifting","aggressive","romantic","mysterious"];
const TEMPOS = ["slow","medium","fast","very fast"];

export function MusicAI() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"generate"|"library">("generate");
  const [prompt, setPrompt] = useState("");
  const [genre, setGenre] = useState("hip-hop");
  const [mood, setMood] = useState("hype");
  const [tempo, setTempo] = useState("medium");
  const [duration, setDuration] = useState(30);
  const [playing, setPlaying] = useState<string|null>(null);

  const { data: tracks, refetch } = trpc.musicAI?.getTracks?.useQuery?.() || { data: null, refetch: ()=>{} };

  const generate = trpc.musicAI?.generateTrack?.useMutation?.({
    onSuccess: () => { toast({title:"Track generation started"}); refetch(); },
    onError: (e: any) => toast({title:"Error",description:e.message,variant:"destructive"}),
  }) || { mutate: ()=>{}, isPending: false };

  return (
    <div style={{minHeight:"100vh",background:"#080810",color:"white",fontFamily:"system-ui,sans-serif"}}>
      <div style={{borderBottom:"1px solid #1a1a2e",padding:"16px 24px",display:"flex",alignItems:"center",gap:16,background:"#0a0a1a"}}>
        <Link href="/dashboard"><button style={{background:"none",border:"1px solid #333",borderRadius:8,padding:"6px 12px",color:"#888",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:13}}><ChevronLeft size={14}/> Dashboard</button></Link>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:"#9B59B622",border:"1px solid #9B59B644",display:"flex",alignItems:"center",justifyContent:"center"}}><Music size={16} color="#9B59B6"/></div>
          <div><div style={{fontSize:16,fontWeight:700}}>Music AI</div><div style={{fontSize:11,color:"#666"}}>AI-generated beats & tracks</div></div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          {["generate","library"].map(t=><button key={t} onClick={()=>setTab(t as any)} style={{padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:tab===t?700:400,background:tab===t?"#9B59B6":"#1a1a2e",color:tab===t?"white":"#888",textTransform:"capitalize"}}>{t}</button>)}
        </div>
      </div>
      <div style={{padding:24}}>
        {tab==="generate" && (
          <div style={{maxWidth:640}}>
            <div style={{display:"grid",gap:14}}>
              <div><label style={{fontSize:11,color:"#666",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:6}}>Description / Vibe</label>
                <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Describe the track you want... e.g. 'Dark trap beat with 808s and haunting melody for a hype video'" rows={3} style={{width:"100%",padding:"10px 12px",background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:8,color:"white",fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>
              <div><label style={{fontSize:11,color:"#666",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:6}}>Genre</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{GENRES.map(g=><button key={g} onClick={()=>setGenre(g)} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${genre===g?"#9B59B6":"#1a1a2e"}`,background:genre===g?"#9B59B620":"#0f0f1a",cursor:"pointer",fontSize:11,color:genre===g?"#9B59B6":"#666",fontWeight:genre===g?700:400}}>{g}</button>)}</div>
              </div>
              <div><label style={{fontSize:11,color:"#666",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:6}}>Mood</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{MOODS.map(m=><button key={m} onClick={()=>setMood(m)} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${mood===m?"#C9A84C":"#1a1a2e"}`,background:mood===m?"#C9A84C20":"#0f0f1a",cursor:"pointer",fontSize:11,color:mood===m?"#C9A84C":"#666",fontWeight:mood===m?700:400}}>{m}</button>)}</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div><label style={{fontSize:11,color:"#666",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:6}}>Tempo</label>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{TEMPOS.map(t=><button key={t} onClick={()=>setTempo(t)} style={{padding:"5px 10px",borderRadius:20,border:`1px solid ${tempo===t?"#00D9FF":"#1a1a2e"}`,background:tempo===t?"#00D9FF20":"#0f0f1a",cursor:"pointer",fontSize:11,color:tempo===t?"#00D9FF":"#666",fontWeight:tempo===t?700:400}}>{t}</button>)}</div>
                </div>
                <div><label style={{fontSize:11,color:"#666",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:6}}>Duration: {duration}s</label>
                  <input type="range" min={15} max={180} value={duration} onChange={e=>setDuration(Number(e.target.value))} style={{width:"100%",accentColor:"#9B59B6"}}/>
                </div>
              </div>
              <button onClick={()=>{ if(!prompt.trim()){toast({title:"Describe the track",variant:"destructive"});return;} generate.mutate({prompt,genre,mood,tempo,duration}); }} disabled={generate.isPending} style={{padding:"14px",borderRadius:10,border:"none",background:generate.isPending?"#1a1a2e":"linear-gradient(135deg,#9B59B6,#8E44AD)",color:generate.isPending?"#555":"white",cursor:generate.isPending?"not-allowed":"pointer",fontSize:14,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {generate.isPending?<><RefreshCw size={15} style={{animation:"spin 1s linear infinite"}}/> Generating Track...</>:<><Zap size={15}/> Generate Track</>}
              </button>
            </div>
          </div>
        )}
        {tab==="library" && (
          <div>
            <div style={{fontSize:18,fontWeight:700,marginBottom:16}}>Track Library ({tracks?.length||0})</div>
            {!tracks?.length ? (
              <div style={{textAlign:"center",padding:60,color:"#444"}}><Music size={40} style={{marginBottom:12}}/><div>No tracks yet. Generate your first track.</div></div>
            ) : (
              <div style={{display:"grid",gap:8}}>
                {tracks.map((track:any)=>(
                  <div key={track.id} style={{background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:10,padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
                    <button onClick={()=>setPlaying(playing===track.id?null:track.id)} style={{width:40,height:40,borderRadius:"50%",background:"#9B59B620",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {playing===track.id?<Pause size={16} color="#9B59B6"/>:<Play size={16} color="#9B59B6"/>}
                    </button>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:"#e0e0e0"}}>{track.title||"Untitled Track"}</div>
                      <div style={{fontSize:11,color:"#555"}}>{track.genre||""} · {track.mood||""} · {track.duration||""}s</div>
                      {playing===track.id && track.url && <audio src={track.url} autoPlay onEnded={()=>setPlaying(null)} style={{display:"none"}}/>}
                    </div>
                    <span style={{padding:"3px 8px",borderRadius:20,background:track.status==="ready"?"#27AE6020":"#F39C1220",color:track.status==="ready"?"#27AE60":"#F39C12",fontSize:11,fontWeight:700}}>{track.status||"pending"}</span>
                    {track.url && <a href={track.url} download style={{padding:"6px 12px",borderRadius:6,border:"1px solid #333",background:"none",color:"#888",cursor:"pointer",fontSize:12,textDecoration:"none",display:"flex",alignItems:"center",gap:4}}><Download size={12}/></a>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}*{box-sizing:border-box}textarea::placeholder{color:#444}`}</style>
    </div>
  );
}
export default MusicAI;
