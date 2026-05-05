import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Film, ChevronLeft, Plus, Play, Zap, RefreshCw, ArrowRight, Clapperboard } from "lucide-react";

const SCRIPT_TYPES = [
  {key:"challenge_update",label:"Challenge Update",desc:"$5k challenge progress post"},
  {key:"torment_thread",label:"Torment Thread",desc:"Viral engagement thread"},
  {key:"promo_video",label:"Promo Video",desc:"Product/service promotion"},
  {key:"recap",label:"Weekly Recap",desc:"Empire highlights"},
  {key:"educational",label:"Educational",desc:"Tutorial or how-to"},
  {key:"motivational",label:"Motivational",desc:"Hype and inspiration"},
];

export function ScriptDirectorPage() {
  const { toast } = useToast();
  const [scriptType, setScriptType] = useState("challenge_update");
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("60s");
  const [generatedScript, setGeneratedScript] = useState("");
  const [scenes, setScenes] = useState<any[]>([]);

  const { data: savedScripts, refetch } = (trpc.kingcamScriptWriter as any)?.getScripts?.useQuery?.() || { data: null, refetch: ()=>{} };

  const generate = (trpc.kingcamScriptWriter as any)?.generateScript?.useMutation?.({
    onSuccess: (d: any) => {
      setGeneratedScript(d.script||"");
      if(d.scenes) setScenes(d.scenes);
      toast({title:"Script generated"});
      refetch();
    },
    onError: (e: any) => toast({title:"Error",description:e.message,variant:"destructive"}),
  }) || { mutate: ()=>{}, isPending: false };

  return (
    <div style={{minHeight:"100vh",background:"#080810",color:"white",fontFamily:"system-ui,sans-serif"}}>
      <div style={{borderBottom:"1px solid #1a1a2e",padding:"16px 24px",display:"flex",alignItems:"center",gap:16,background:"#0a0a1a"}}>
        <Link href="/king"><button style={{background:"none",border:"1px solid #333",borderRadius:8,padding:"6px 12px",color:"#888",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:13}}><ChevronLeft size={14}/> King Hub</button></Link>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:"#E74C3C22",border:"1px solid #E74C3C44",display:"flex",alignItems:"center",justifyContent:"center"}}><Clapperboard size={16} color="#E74C3C"/></div>
          <div><div style={{fontSize:16,fontWeight:700}}>Script Director</div><div style={{fontSize:11,color:"#666"}}>Scene breakdown & production notes</div></div>
        </div>
        <Link href="/king/engine" style={{marginLeft:"auto"}}>
          <button style={{padding:"6px 14px",borderRadius:8,border:"none",background:"#C9A84C",color:"#000",cursor:"pointer",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6}}>
            <ArrowRight size={13}/> Open in Engine
          </button>
        </Link>
      </div>
      <div style={{padding:24,display:"grid",gridTemplateColumns:"280px 1fr",gap:20,height:"calc(100vh - 65px)"}}>
        <div style={{background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:12,padding:20,overflowY:"auto"}}>
          <div style={{fontSize:11,color:"#666",textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>Script Type</div>
          <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16}}>
            {SCRIPT_TYPES.map(t=>(
              <button key={t.key} onClick={()=>setScriptType(t.key)} style={{padding:"10px 12px",borderRadius:8,border:`1px solid ${scriptType===t.key?"#E74C3C":"#1a1a2e"}`,background:scriptType===t.key?"#E74C3C15":"#0a0a1a",cursor:"pointer",textAlign:"left"}}>
                <div style={{fontSize:12,fontWeight:700,color:scriptType===t.key?"#E74C3C":"#aaa"}}>{t.label}</div>
                <div style={{fontSize:11,color:"#555"}}>{t.desc}</div>
              </button>
            ))}
          </div>
          <div style={{fontSize:11,color:"#666",textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Duration</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:16}}>
            {["15s","30s","60s","2min","5min"].map(d=><button key={d} onClick={()=>setDuration(d)} style={{padding:"4px 10px",borderRadius:20,border:`1px solid ${duration===d?"#C9A84C":"#1a1a2e"}`,background:duration===d?"#C9A84C20":"#0a0a1a",cursor:"pointer",fontSize:11,color:duration===d?"#C9A84C":"#666",fontWeight:duration===d?700:400}}>{d}</button>)}
          </div>
          <div style={{fontSize:11,color:"#666",textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Topic / Context</div>
          <textarea value={topic} onChange={e=>setTopic(e.target.value)} placeholder="What is this script about?" rows={4} style={{width:"100%",padding:"10px",background:"#0a0a1a",border:"1px solid #1a1a2e",borderRadius:8,color:"white",fontSize:12,outline:"none",resize:"vertical",boxSizing:"border-box",fontFamily:"inherit",marginBottom:12}}/>
          <button onClick={()=>{ generate.mutate({type:scriptType,topic,duration}); }} disabled={generate.isPending} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:generate.isPending?"#1a1a2e":"#E74C3C",color:generate.isPending?"#555":"white",cursor:generate.isPending?"not-allowed":"pointer",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            {generate.isPending?<><RefreshCw size={14} style={{animation:"spin 1s linear infinite"}}/> Generating...</>:<><Zap size={14}/> Generate Script</>}
          </button>
        </div>
        <div style={{overflowY:"auto"}}>
          {!generatedScript ? (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",color:"#444"}}>
              <Clapperboard size={48} style={{marginBottom:16}}/>
              <div style={{fontSize:16,fontWeight:600,marginBottom:8}}>Select a script type and generate</div>
              <div style={{fontSize:13}}>Scripts are saved automatically and can be sent to the Engine</div>
            </div>
          ) : (
            <div style={{display:"grid",gap:16}}>
              {scenes.length > 0 && (
                <div>
                  <div style={{fontSize:14,fontWeight:700,marginBottom:12,color:"#888"}}>Scene Breakdown</div>
                  <div style={{display:"grid",gap:8}}>
                    {scenes.map((scene:any,i:number)=>(
                      <div key={i} style={{background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:10,padding:14}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                          <div style={{width:24,height:24,borderRadius:6,background:"#E74C3C20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#E74C3C"}}>{i+1}</div>
                          <div style={{fontSize:13,fontWeight:600,color:"#e0e0e0"}}>{scene.title||`Scene ${i+1}`}</div>
                          {scene.duration && <span style={{fontSize:11,color:"#555",marginLeft:"auto"}}>{scene.duration}</span>}
                        </div>
                        {scene.visual && <div style={{fontSize:12,color:"#888",marginBottom:4}}>📷 {scene.visual}</div>}
                        {scene.dialogue && <div style={{fontSize:12,color:"#ccc",fontStyle:"italic"}}>"{scene.dialogue}"</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div style={{fontSize:14,fontWeight:700,marginBottom:12,color:"#888",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  Full Script
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>{navigator.clipboard.writeText(generatedScript);toast({title:"Copied!"});}} style={{padding:"5px 12px",borderRadius:6,border:"1px solid #333",background:"none",color:"#888",cursor:"pointer",fontSize:12}}>Copy</button>
                    <Link href="/king/engine"><button style={{padding:"5px 12px",borderRadius:6,border:"none",background:"#C9A84C",color:"#000",cursor:"pointer",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:4}}><ArrowRight size={12}/> Send to Engine</button></Link>
                  </div>
                </div>
                <div style={{background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:10,padding:16}}>
                  <pre style={{color:"#e0e0e0",fontSize:13,lineHeight:1.7,whiteSpace:"pre-wrap",fontFamily:"inherit",margin:0}}>{generatedScript}</pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}*{box-sizing:border-box}textarea::placeholder{color:#444}`}</style>
    </div>
  );
}
export default ScriptDirectorPage;
