import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Image, ChevronLeft, Video, Download, Send, RefreshCw, Film, Filter } from "lucide-react";

export function KingCamGallery() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all"|"videos"|"images">("all");
  const { data: videosData, isLoading } = trpc.cloneEmpire.listCloneVideos.useQuery({ limit: 100, offset: 0 });

  const videos = videosData?.videos || [];
  const filtered = filter === "images" ? [] : filter === "videos" ? videos : videos;

  return (
    <div style={{minHeight:"100vh",background:"#080810",color:"white",fontFamily:"system-ui,sans-serif"}}>
      <div style={{borderBottom:"1px solid #1a1a2e",padding:"16px 24px",display:"flex",alignItems:"center",gap:16,background:"#0a0a1a"}}>
        <Link href="/king"><button style={{background:"none",border:"1px solid #333",borderRadius:8,padding:"6px 12px",color:"#888",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:13}}><ChevronLeft size={14}/> King Hub</button></Link>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:"#C9A84C22",border:"1px solid #C9A84C44",display:"flex",alignItems:"center",justifyContent:"center"}}><Image size={16} color="#C9A84C"/></div>
          <div><div style={{fontSize:16,fontWeight:700}}>KingCam Gallery</div><div style={{fontSize:11,color:"#666"}}>{videos.length} assets</div></div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
          <Filter size={14} color="#666"/>
          {["all","videos","images"].map(f=><button key={f} onClick={()=>setFilter(f as any)} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${filter===f?"#C9A84C":"#1a1a2e"}`,background:filter===f?"#C9A84C20":"none",cursor:"pointer",fontSize:12,color:filter===f?"#C9A84C":"#666",fontWeight:filter===f?700:400,textTransform:"capitalize"}}>{f}</button>)}
          <Link href="/king/engine"><button style={{padding:"6px 14px",borderRadius:8,border:"none",background:"#C9A84C",color:"#000",cursor:"pointer",fontSize:13,fontWeight:700}}>+ Create</button></Link>
        </div>
      </div>
      <div style={{padding:24}}>
        {isLoading ? (
          <div style={{textAlign:"center",padding:60,color:"#444"}}><RefreshCw size={32} style={{animation:"spin 1s linear infinite",marginBottom:12}}/><div>Loading gallery...</div></div>
        ) : !filtered.length ? (
          <div style={{textAlign:"center",padding:80,color:"#444"}}>
            <Film size={48} style={{marginBottom:16}}/>
            <div style={{fontSize:18,fontWeight:600,marginBottom:8}}>Gallery is empty</div>
            <div style={{fontSize:13,marginBottom:20}}>Generate your first clone video or image</div>
            <Link href="/king/engine"><button style={{padding:"10px 24px",borderRadius:10,border:"none",background:"#C9A84C",color:"#000",cursor:"pointer",fontSize:14,fontWeight:700}}>Open Engine</button></Link>
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:16}}>
            {filtered.map((item:any)=>(
              <div key={item.id} style={{background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:12,overflow:"hidden"}}>
                <div style={{aspectRatio:"9/16",background:"#0a0a1a",display:"flex",alignItems:"center",justifyContent:"center",maxHeight:220,position:"relative"}}>
                  {item.render_status==="ready" && item.video_url ? (
                    <video src={item.video_url} style={{width:"100%",height:"100%",objectFit:"cover"}} controls/>
                  ) : (
                    <div style={{textAlign:"center",color:"#333"}}>
                      <Film size={32} style={{marginBottom:8}}/>
                      <div style={{fontSize:11,color:"#555",textTransform:"uppercase",fontWeight:700}}>{item.render_status||"pending"}</div>
                    </div>
                  )}
                </div>
                <div style={{padding:12}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#e0e0e0",marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.title||"Untitled"}</div>
                  <div style={{fontSize:11,color:"#555",marginBottom:8}}>{item.style||""} · {item.duration_seconds?`${item.duration_seconds}s`:""}</div>
                  {item.render_status==="ready" && item.video_url && (
                    <div style={{display:"flex",gap:6}}>
                      <a href={item.video_url} download style={{flex:1,padding:"6px",borderRadius:6,border:"1px solid #1a1a2e",background:"none",color:"#888",cursor:"pointer",fontSize:12,textAlign:"center",textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}><Download size={12}/> Download</a>
                      <Link href="/king/telegram-hub" style={{flex:1}}><button style={{width:"100%",padding:"6px",borderRadius:6,border:"none",background:"#00D9FF20",color:"#00D9FF",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",gap:4}}><Send size={12}/> Send</button></Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}*{box-sizing:border-box}`}</style>
    </div>
  );
}
export default KingCamGallery;
