import React, { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { FolderOpen, ChevronLeft, Upload, Video, Image, Music, File, Search, Grid, List, RefreshCw } from "lucide-react";

const FILE_TYPES = ["all","video","image","audio","document"];

export function MediaVault() {
  const { toast } = useToast();
  const [fileType, setFileType] = useState("all");
  const [viewMode, setViewMode] = useState<"grid"|"list">("grid");
  const [search, setSearch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: media, isLoading, refetch } = trpc.kingcamImport?.getImportedMedia?.useQuery?.() || { data: null, isLoading: false, refetch: ()=>{} };

  const importMedia = trpc.kingcamImport?.importMedia?.useMutation?.({
    onSuccess: () => { toast({title:"Media imported"}); refetch(); },
    onError: (e: any) => toast({title:"Error",description:e.message,variant:"destructive"}),
  }) || { mutate: ()=>{}, isPending: false };

  const allMedia = media?.media || [];
  const filtered = allMedia.filter((m:any) => {
    if(fileType !== "all" && m.type !== fileType) return false;
    if(search && !m.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function getIcon(type:string) {
    if(type==="video") return <Video size={20} color="#00D9FF"/>;
    if(type==="image") return <Image size={20} color="#C9A84C"/>;
    if(type==="audio") return <Music size={20} color="#9B59B6"/>;
    return <File size={20} color="#888"/>;
  }

  return (
    <div style={{minHeight:"100vh",background:"#080810",color:"white",fontFamily:"system-ui,sans-serif"}}>
      <div style={{borderBottom:"1px solid #1a1a2e",padding:"16px 24px",display:"flex",alignItems:"center",gap:16,background:"#0a0a1a",flexWrap:"wrap"}}>
        <Link href="/king"><button style={{background:"none",border:"1px solid #333",borderRadius:8,padding:"6px 12px",color:"#888",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:13}}><ChevronLeft size={14}/> King Hub</button></Link>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:"#C9A84C22",border:"1px solid #C9A84C44",display:"flex",alignItems:"center",justifyContent:"center"}}><FolderOpen size={16} color="#C9A84C"/></div>
          <div><div style={{fontSize:16,fontWeight:700}}>Media Vault</div><div style={{fontSize:11,color:"#666"}}>{allMedia.length} assets</div></div>
        </div>
        <div style={{flex:1,display:"flex",alignItems:"center",gap:8,background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:8,padding:"6px 12px",maxWidth:300}}>
          <Search size={14} color="#555"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search media..." style={{background:"none",border:"none",color:"white",fontSize:13,outline:"none",flex:1}}/>
        </div>
        <div style={{display:"flex",gap:6,marginLeft:"auto"}}>
          <button onClick={()=>setViewMode("grid")} style={{padding:"6px 10px",borderRadius:6,border:`1px solid ${viewMode==="grid"?"#C9A84C":"#1a1a2e"}`,background:viewMode==="grid"?"#C9A84C20":"none",cursor:"pointer",color:viewMode==="grid"?"#C9A84C":"#666"}}><Grid size={14}/></button>
          <button onClick={()=>setViewMode("list")} style={{padding:"6px 10px",borderRadius:6,border:`1px solid ${viewMode==="list"?"#C9A84C":"#1a1a2e"}`,background:viewMode==="list"?"#C9A84C20":"none",cursor:"pointer",color:viewMode==="list"?"#C9A84C":"#666"}}><List size={14}/></button>
          <input ref={fileRef} type="file" multiple accept="video/*,image/*,audio/*" style={{display:"none"}} onChange={e=>{ const files=Array.from(e.target.files||[]); files.forEach(f=>{ const reader=new FileReader(); reader.onload=ev=>{ importMedia.mutate({name:f.name,type:f.type.split("/")[0],size:f.size,dataUrl:ev.target?.result as string}); }; reader.readAsDataURL(f); }); }}/>
          <button onClick={()=>fileRef.current?.click()} style={{padding:"6px 14px",borderRadius:8,border:"none",background:"#C9A84C",color:"#000",cursor:"pointer",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6}}><Upload size={13}/> Upload</button>
        </div>
      </div>
      <div style={{padding:24}}>
        <div style={{display:"flex",gap:6,marginBottom:16}}>
          {FILE_TYPES.map(t=><button key={t} onClick={()=>setFileType(t)} style={{padding:"5px 14px",borderRadius:20,border:`1px solid ${fileType===t?"#C9A84C":"#1a1a2e"}`,background:fileType===t?"#C9A84C20":"none",cursor:"pointer",fontSize:12,color:fileType===t?"#C9A84C":"#666",fontWeight:fileType===t?700:400,textTransform:"capitalize"}}>{t}</button>)}
        </div>
        {isLoading ? (
          <div style={{textAlign:"center",padding:60,color:"#444"}}><RefreshCw size={32} style={{animation:"spin 1s linear infinite",marginBottom:12}}/><div>Loading media...</div></div>
        ) : !filtered.length ? (
          <div style={{textAlign:"center",padding:80,color:"#444"}}>
            <FolderOpen size={48} style={{marginBottom:16}}/>
            <div style={{fontSize:16,fontWeight:600,marginBottom:8}}>No media found</div>
            <div style={{fontSize:13,marginBottom:20}}>Upload videos, images, and audio files to your vault</div>
            <button onClick={()=>fileRef.current?.click()} style={{padding:"10px 24px",borderRadius:10,border:"none",background:"#C9A84C",color:"#000",cursor:"pointer",fontSize:14,fontWeight:700,display:"inline-flex",alignItems:"center",gap:8}}><Upload size={14}/> Upload Media</button>
          </div>
        ) : viewMode==="grid" ? (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:12}}>
            {filtered.map((item:any)=>(
              <div key={item.id} style={{background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:10,overflow:"hidden",cursor:"pointer"}}>
                <div style={{aspectRatio:"1",background:"#0a0a1a",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {item.type==="image" && item.url ? <img src={item.url} alt={item.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                   : item.type==="video" && item.url ? <video src={item.url} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                   : <div style={{color:"#333"}}>{getIcon(item.type)}</div>}
                </div>
                <div style={{padding:"8px 10px"}}>
                  <div style={{fontSize:11,fontWeight:600,color:"#ccc",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name||"Untitled"}</div>
                  <div style={{fontSize:10,color:"#555"}}>{item.type||""}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{display:"grid",gap:6}}>
            {filtered.map((item:any)=>(
              <div key={item.id} style={{background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:8,padding:"10px 14px",display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:36,height:36,borderRadius:8,background:"#1a1a2e",display:"flex",alignItems:"center",justifyContent:"center"}}>{getIcon(item.type)}</div>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:"#e0e0e0"}}>{item.name||"Untitled"}</div><div style={{fontSize:11,color:"#555"}}>{item.type||""} · {item.size?`${Math.round(item.size/1024)}KB`:""}</div></div>
                <div style={{fontSize:11,color:"#555"}}>{item.createdAt?new Date(item.createdAt).toLocaleDateString():""}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}*{box-sizing:border-box}input::placeholder{color:#444}`}</style>
    </div>
  );
}
export default MediaVault;
