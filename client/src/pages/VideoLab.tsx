import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Video, ChevronLeft, Plus, Play, Clock, CheckCircle, AlertCircle, RefreshCw, Zap, Film } from "lucide-react";

const JOB_TYPES = ["talking_head","short_clip","promo","tutorial","testimonial","product_demo"];
const STYLES = ["cinematic","vlog","documentary","corporate","viral","educational"];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string,{c:string;bg:string}> = {
    ready:{c:"#27AE60",bg:"#27AE6020"}, queued:{c:"#F39C12",bg:"#F39C1220"},
    processing:{c:"#00D9FF",bg:"#00D9FF20"}, failed:{c:"#E74C3C",bg:"#E74C3C20"},
  };
  const s = map[status]||{c:"#666",bg:"#1a1a2e"};
  return <span style={{padding:"3px 8px",borderRadius:20,background:s.bg,color:s.c,fontSize:11,fontWeight:700}}>{status?.toUpperCase()}</span>;
}

export function VideoLab() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"jobs"|"create"|"script">("jobs");
  const [jobType, setJobType] = useState("talking_head");
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("cinematic");
  const [duration, setDuration] = useState("60s");
  const [scriptTopic, setScriptTopic] = useState("");

  const { data: jobs, refetch } = trpc.videoLab.getJobs.useQuery();
  const createJob = trpc.videoLab.createJob.useMutation({
    onSuccess: () => { toast({ title: "Job queued" }); setTopic(""); refetch(); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const genScript = trpc.videoLab.generateVideoScript.useMutation({
    onSuccess: (d) => { toast({ title: "Script generated" }); setGeneratedScript(d.script||""); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const [generatedScript, setGeneratedScript] = useState("");

  return (
    <div style={{minHeight:"100vh",background:"#080810",color:"white",fontFamily:"system-ui,sans-serif"}}>
      <div style={{borderBottom:"1px solid #1a1a2e",padding:"16px 24px",display:"flex",alignItems:"center",gap:16,background:"#0a0a1a"}}>
        <Link href="/dashboard"><button style={{background:"none",border:"1px solid #333",borderRadius:8,padding:"6px 12px",color:"#888",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:13}}><ChevronLeft size={14}/> Dashboard</button></Link>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:"#C9A84C22",border:"1px solid #C9A84C44",display:"flex",alignItems:"center",justifyContent:"center"}}><Video size={16} color="#C9A84C"/></div>
          <div><div style={{fontSize:16,fontWeight:700}}>Video Lab</div><div style={{fontSize:11,color:"#666"}}>AI-powered video generation</div></div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          {["jobs","create","script"].map(t=><button key={t} onClick={()=>setTab(t as any)} style={{padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:tab===t?700:400,background:tab===t?"#C9A84C":"#1a1a2e",color:tab===t?"#000":"#888"}}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}
        </div>
      </div>
      <div style={{padding:24}}>
        {tab==="jobs" && (
          <div>
            <div style={{marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontSize:18,fontWeight:700}}>Job Queue ({jobs?.length||0})</div>
              <button onClick={()=>setTab("create")} style={{padding:"8px 16px",borderRadius:8,border:"none",background:"#C9A84C",color:"#000",cursor:"pointer",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6}}><Plus size={14}/> New Job</button>
            </div>
            {!jobs?.length ? (
              <div style={{textAlign:"center",padding:60,color:"#444"}}><Video size={40} style={{marginBottom:12}}/><div>No jobs yet. Create your first video job.</div></div>
            ) : (
              <div style={{display:"grid",gap:8}}>
                {jobs.map((job:any)=>(
                  <div key={job.id} style={{background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:10,padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:40,height:40,borderRadius:8,background:"#C9A84C20",display:"flex",alignItems:"center",justifyContent:"center"}}><Film size={18} color="#C9A84C"/></div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:"#e0e0e0"}}>{job.type||"Video Job"}</div>
                      <div style={{fontSize:11,color:"#555"}}>{job.createdAt?new Date(job.createdAt).toLocaleString():""}</div>
                    </div>
                    <StatusBadge status={job.status||"queued"}/>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {tab==="create" && (
          <div style={{maxWidth:600}}>
            <div style={{fontSize:18,fontWeight:700,marginBottom:20}}>Create Video Job</div>
            <div style={{display:"grid",gap:14}}>
              <div><label style={{fontSize:11,color:"#666",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:6}}>Job Type</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{JOB_TYPES.map(t=><button key={t} onClick={()=>setJobType(t)} style={{padding:"6px 14px",borderRadius:20,border:`1px solid ${jobType===t?"#C9A84C":"#1a1a2e"}`,background:jobType===t?"#C9A84C20":"#0f0f1a",cursor:"pointer",fontSize:12,color:jobType===t?"#C9A84C":"#666",fontWeight:jobType===t?700:400}}>{t.replace(/_/g," ")}</button>)}</div>
              </div>
              <div><label style={{fontSize:11,color:"#666",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:6}}>Topic / Description</label>
                <textarea value={topic} onChange={e=>setTopic(e.target.value)} placeholder="What is this video about?" rows={3} style={{width:"100%",padding:"10px 12px",background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:8,color:"white",fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>
              <div><label style={{fontSize:11,color:"#666",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:6}}>Style</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{STYLES.map(s=><button key={s} onClick={()=>setStyle(s)} style={{padding:"6px 14px",borderRadius:20,border:`1px solid ${style===s?"#00D9FF":"#1a1a2e"}`,background:style===s?"#00D9FF20":"#0f0f1a",cursor:"pointer",fontSize:12,color:style===s?"#00D9FF":"#666",fontWeight:style===s?700:400}}>{s}</button>)}</div>
              </div>
              <div><label style={{fontSize:11,color:"#666",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:6}}>Duration</label>
                <div style={{display:"flex",gap:6}}>{["15s","30s","60s","2min","5min"].map(d=><button key={d} onClick={()=>setDuration(d)} style={{padding:"6px 14px",borderRadius:20,border:`1px solid ${duration===d?"#9B59B6":"#1a1a2e"}`,background:duration===d?"#9B59B620":"#0f0f1a",cursor:"pointer",fontSize:12,color:duration===d?"#9B59B6":"#666",fontWeight:duration===d?700:400}}>{d}</button>)}</div>
              </div>
              <button onClick={()=>{ if(!topic.trim()){toast({title:"Enter a topic",variant:"destructive"});return;} createJob.mutate({type:jobType,input:{topic,style,duration},priority:"normal"}); }} disabled={createJob.isPending} style={{padding:"12px",borderRadius:10,border:"none",background:createJob.isPending?"#1a1a2e":"#C9A84C",color:createJob.isPending?"#555":"#000",cursor:createJob.isPending?"not-allowed":"pointer",fontSize:14,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {createJob.isPending?<><RefreshCw size={15} style={{animation:"spin 1s linear infinite"}}/> Queuing...</>:<><Zap size={15}/> Queue Job</>}
              </button>
            </div>
          </div>
        )}
        {tab==="script" && (
          <div style={{maxWidth:700}}>
            <div style={{fontSize:18,fontWeight:700,marginBottom:20}}>AI Script Generator</div>
            <div style={{display:"grid",gap:12}}>
              <input value={scriptTopic} onChange={e=>setScriptTopic(e.target.value)} placeholder="Video topic..." style={{padding:"12px",background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:8,color:"white",fontSize:14,outline:"none"}}/>
              <div style={{display:"flex",gap:8}}>
                {["30s","60s","2min","5min"].map(d=><button key={d} onClick={()=>setDuration(d)} style={{flex:1,padding:"8px",borderRadius:8,border:`1px solid ${duration===d?"#C9A84C":"#1a1a2e"}`,background:duration===d?"#C9A84C20":"#0f0f1a",cursor:"pointer",fontSize:12,color:duration===d?"#C9A84C":"#666",fontWeight:duration===d?700:400}}>{d}</button>)}
              </div>
              <button onClick={()=>{ if(!scriptTopic.trim()){toast({title:"Enter a topic",variant:"destructive"});return;} genScript.mutate({topic:scriptTopic,duration,style}); }} disabled={genScript.isPending} style={{padding:"12px",borderRadius:10,border:"none",background:genScript.isPending?"#1a1a2e":"linear-gradient(135deg,#C9A84C,#C9A84C88)",color:genScript.isPending?"#555":"#000",cursor:genScript.isPending?"not-allowed":"pointer",fontSize:14,fontWeight:700}}>
                {genScript.isPending?"Generating...":"Generate Script"}
              </button>
              {generatedScript && (
                <div style={{background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:10,padding:16}}>
                  <div style={{fontSize:12,color:"#666",marginBottom:8,textTransform:"uppercase",letterSpacing:"1px"}}>Generated Script</div>
                  <pre style={{color:"#e0e0e0",fontSize:13,lineHeight:1.7,whiteSpace:"pre-wrap",fontFamily:"inherit",margin:0}}>{generatedScript}</pre>
                  <button onClick={()=>{ navigator.clipboard.writeText(generatedScript||""); toast({title:"Copied!"}); }} style={{marginTop:12,padding:"6px 14px",borderRadius:6,border:"1px solid #333",background:"none",color:"#888",cursor:"pointer",fontSize:12}}>Copy Script</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}*{box-sizing:border-box}input::placeholder,textarea::placeholder{color:#444}`}</style>
    </div>
  );
}
export default VideoLab;
