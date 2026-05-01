import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Image, ChevronLeft, Zap, RefreshCw, Download } from "lucide-react";

const STYLES = ["youtube","tiktok","instagram","cinematic","bold","minimal","neon","retro"];
const MOODS = ["hype","calm","dramatic","funny","inspirational","dark","bright"];

export function ThumbnailGeneratorUI() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [style, setStyle] = useState("youtube");
  const [mood, setMood] = useState("hype");
  const [mainText, setMainText] = useState("");
  const [generated, setGenerated] = useState<any[]>([]);

  const generate = trpc.thumbnailGenerator?.generateThumbnail?.useMutation?.({
    onSuccess: (d: any) => { toast({title:"Thumbnail generated"}); setGenerated(prev=>[d,...prev]); },
    onError: (e: any) => toast({title:"Error",description:e.message,variant:"destructive"}),
  }) || { mutate: ()=>{}, isPending: false };

  return (
    <div style={{minHeight:"100vh",background:"#080810",color:"white",fontFamily:"system-ui,sans-serif"}}>
      <div style={{borderBottom:"1px solid #1a1a2e",padding:"16px 24px",display:"flex",alignItems:"center",gap:16,background:"#0a0a1a"}}>
        <Link href="/dashboard"><button style={{background:"none",border:"1px solid #333",borderRadius:8,padding:"6px 12px",color:"#888",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:13}}><ChevronLeft size={14}/> Dashboard</button></Link>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:"#E74C3C22",border:"1px solid #E74C3C44",display:"flex",alignItems:"center",justifyContent:"center"}}><Image size={16} color="#E74C3C"/></div>
          <div><div style={{fontSize:16,fontWeight:700}}>Thumbnail Generator</div><div style={{fontSize:11,color:"#666"}}>AI-powered thumbnail creation</div></div>
        </div>
      </div>
      <div style={{padding:24,display:"grid",gridTemplateColumns:"320px 1fr",gap:20,height:"calc(100vh - 65px)"}}>
        <div style={{background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:12,padding:20,overflowY:"auto"}}>
          <div style={{display:"grid",gap:14}}>
            <div><label style={{fontSize:11,color:"#666",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:6}}>Video Title</label>
              <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Your video title..." style={{width:"100%",padding:"10px 12px",background:"#0a0a1a",border:"1px solid #1a1a2e",borderRadius:8,color:"white",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div><label style={{fontSize:11,color:"#666",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:6}}>Main Text / Hook</label>
              <input value={mainText} onChange={e=>setMainText(e.target.value)} placeholder="Bold text overlay..." style={{width:"100%",padding:"10px 12px",background:"#0a0a1a",border:"1px solid #1a1a2e",borderRadius:8,color:"white",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div><label style={{fontSize:11,color:"#666",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:6}}>Platform Style</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{STYLES.map(s=><button key={s} onClick={()=>setStyle(s)} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${style===s?"#E74C3C":"#1a1a2e"}`,background:style===s?"#E74C3C20":"#0a0a1a",cursor:"pointer",fontSize:11,color:style===s?"#E74C3C":"#666",fontWeight:style===s?700:400}}>{s}</button>)}</div>
            </div>
            <div><label style={{fontSize:11,color:"#666",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:6}}>Mood / Energy</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{MOODS.map(m=><button key={m} onClick={()=>setMood(m)} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${mood===m?"#C9A84C":"#1a1a2e"}`,background:mood===m?"#C9A84C20":"#0a0a1a",cursor:"pointer",fontSize:11,color:mood===m?"#C9A84C":"#666",fontWeight:mood===m?700:400}}>{m}</button>)}</div>
            </div>
            <button onClick={()=>{ if(!title.trim()){toast({title:"Enter a title",variant:"destructive"});return;} generate.mutate({title,style,mood,mainText}); }} disabled={generate.isPending} style={{padding:"12px",borderRadius:10,border:"none",background:generate.isPending?"#1a1a2e":"#E74C3C",color:generate.isPending?"#555":"white",cursor:generate.isPending?"not-allowed":"pointer",fontSize:14,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {generate.isPending?<><RefreshCw size={15} style={{animation:"spin 1s linear infinite"}}/> Generating...</>:<><Zap size={15}/> Generate Thumbnail</>}
            </button>
          </div>
        </div>
        <div style={{overflowY:"auto"}}>
          {!generated.length ? (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",color:"#444"}}>
              <Image size={48} style={{marginBottom:16}}/>
              <div style={{fontSize:16,fontWeight:600,marginBottom:8}}>No thumbnails yet</div>
              <div style={{fontSize:13}}>Fill in the details and click Generate</div>
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
              {generated.map((item:any,i:number)=>(
                <div key={i} style={{background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:12,overflow:"hidden"}}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="thumbnail" style={{width:"100%",aspectRatio:"16/9",objectFit:"cover"}}/>
                  ) : (
                    <div style={{aspectRatio:"16/9",background:"linear-gradient(135deg,#1a1a2e,#0f0f1a)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
                      <div style={{textAlign:"center"}}>
                        <div style={{fontSize:18,fontWeight:800,color:"white",marginBottom:8}}>{item.mainText||title}</div>
                        <div style={{fontSize:12,color:"#888"}}>{item.style||style} · {item.mood||mood}</div>
                      </div>
                    </div>
                  )}
                  <div style={{padding:12}}>
                    <div style={{fontSize:12,color:"#888",marginBottom:8}}>{item.title||title}</div>
                    {item.imageUrl && <a href={item.imageUrl} download style={{padding:"6px 12px",borderRadius:6,border:"1px solid #333",background:"none",color:"#888",cursor:"pointer",fontSize:12,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:4}}><Download size={12}/> Download</a>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}*{box-sizing:border-box}input::placeholder{color:#444}`}</style>
    </div>
  );
}
export default ThumbnailGeneratorUI;
