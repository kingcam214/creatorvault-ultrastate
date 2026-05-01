import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { TrendingUp, ChevronLeft, Zap, RefreshCw, Star, Target, ArrowUp } from "lucide-react";

const PLATFORMS = ["tiktok","youtube","instagram","twitter","linkedin"];
const CONTENT_TYPES = ["video","short","reel","post","story","thread"];

export function ViralOptimizerPage() {
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [platform, setPlatform] = useState("tiktok");
  const [contentType, setContentType] = useState("video");
  const [result, setResult] = useState<any>(null);

  const analyze = trpc.viralOptimizer?.analyzeContent?.useMutation?.({
    onSuccess: (d: any) => { setResult(d); toast({title:"Analysis complete"}); },
    onError: (e: any) => toast({title:"Error",description:e.message,variant:"destructive"}),
  }) || { mutate: ()=>{}, isPending: false };

  const optimize = trpc.viralOptimizer?.optimizeContent?.useMutation?.({
    onSuccess: (d: any) => { setResult(prev=>({...prev,...d})); toast({title:"Optimization ready"}); },
    onError: (e: any) => toast({title:"Error",description:e.message,variant:"destructive"}),
  }) || { mutate: ()=>{}, isPending: false };

  return (
    <div style={{minHeight:"100vh",background:"#080810",color:"white",fontFamily:"system-ui,sans-serif"}}>
      <div style={{borderBottom:"1px solid #1a1a2e",padding:"16px 24px",display:"flex",alignItems:"center",gap:16,background:"#0a0a1a"}}>
        <Link href="/dashboard"><button style={{background:"none",border:"1px solid #333",borderRadius:8,padding:"6px 12px",color:"#888",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:13}}><ChevronLeft size={14}/> Dashboard</button></Link>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:"#E67E2222",border:"1px solid #E67E2244",display:"flex",alignItems:"center",justifyContent:"center"}}><TrendingUp size={16} color="#E67E22"/></div>
          <div><div style={{fontSize:16,fontWeight:700}}>Viral Optimizer</div><div style={{fontSize:11,color:"#666"}}>AI-powered content optimization</div></div>
        </div>
      </div>
      <div style={{padding:24,display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,height:"calc(100vh - 65px)"}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,marginBottom:16,color:"#888"}}>Content Input</div>
          <div style={{display:"grid",gap:12}}>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{PLATFORMS.map(p=><button key={p} onClick={()=>setPlatform(p)} style={{padding:"6px 14px",borderRadius:20,border:`1px solid ${platform===p?"#E67E22":"#1a1a2e"}`,background:platform===p?"#E67E2220":"#0f0f1a",cursor:"pointer",fontSize:12,color:platform===p?"#E67E22":"#666",fontWeight:platform===p?700:400,textTransform:"capitalize"}}>{p}</button>)}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{CONTENT_TYPES.map(t=><button key={t} onClick={()=>setContentType(t)} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${contentType===t?"#C9A84C":"#1a1a2e"}`,background:contentType===t?"#C9A84C20":"#0f0f1a",cursor:"pointer",fontSize:11,color:contentType===t?"#C9A84C":"#666",fontWeight:contentType===t?700:400}}>{t}</button>)}</div>
            <textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="Paste your content, script, caption, or video description here..." rows={10} style={{width:"100%",padding:"14px",background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:10,color:"white",fontSize:13,lineHeight:1.6,outline:"none",resize:"vertical",boxSizing:"border-box",fontFamily:"inherit"}}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{ if(!content.trim()){toast({title:"Enter content",variant:"destructive"});return;} analyze.mutate({content,platform,contentType}); }} disabled={analyze.isPending} style={{flex:1,padding:"12px",borderRadius:10,border:"none",background:analyze.isPending?"#1a1a2e":"#E67E22",color:analyze.isPending?"#555":"white",cursor:analyze.isPending?"not-allowed":"pointer",fontSize:14,fontWeight:700}}>
                {analyze.isPending?"Analyzing...":"Analyze"}
              </button>
              {result && <button onClick={()=>optimize.mutate({content,platform,contentType,analysis:result})} disabled={optimize.isPending} style={{flex:1,padding:"12px",borderRadius:10,border:"none",background:optimize.isPending?"#1a1a2e":"#C9A84C",color:optimize.isPending?"#555":"#000",cursor:optimize.isPending?"not-allowed":"pointer",fontSize:14,fontWeight:700}}>
                {optimize.isPending?"Optimizing...":"Optimize"}
              </button>}
            </div>
          </div>
        </div>
        <div style={{overflowY:"auto"}}>
          {!result ? (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",color:"#444"}}>
              <TrendingUp size={48} style={{marginBottom:16}}/>
              <div style={{fontSize:16,fontWeight:600,marginBottom:8}}>Paste your content</div>
              <div style={{fontSize:13}}>Get viral score, hooks, hashtags, and optimization tips</div>
            </div>
          ) : (
            <div style={{display:"grid",gap:12}}>
              {result.viralScore !== undefined && (
                <div style={{background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:12,padding:20,textAlign:"center"}}>
                  <div style={{fontSize:48,fontWeight:900,color:result.viralScore>=70?"#27AE60":result.viralScore>=40?"#F39C12":"#E74C3C"}}>{result.viralScore}</div>
                  <div style={{fontSize:14,color:"#888"}}>Viral Score</div>
                </div>
              )}
              {result.hooks?.length > 0 && (
                <div style={{background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:12,padding:16}}>
                  <div style={{fontSize:13,fontWeight:700,marginBottom:10,color:"#C9A84C"}}>🎣 Viral Hooks</div>
                  {result.hooks.map((h:string,i:number)=><div key={i} style={{padding:"8px 0",borderBottom:"1px solid #1a1a2e",fontSize:13,color:"#e0e0e0"}}>{h}</div>)}
                </div>
              )}
              {result.hashtags?.length > 0 && (
                <div style={{background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:12,padding:16}}>
                  <div style={{fontSize:13,fontWeight:700,marginBottom:10,color:"#00D9FF"}}>🏷️ Hashtags</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{result.hashtags.map((h:string,i:number)=><span key={i} style={{padding:"4px 10px",borderRadius:20,background:"#00D9FF20",color:"#00D9FF",fontSize:12}}>#{h.replace("#","")}</span>)}</div>
                </div>
              )}
              {result.optimizedContent && (
                <div style={{background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:12,padding:16}}>
                  <div style={{fontSize:13,fontWeight:700,marginBottom:10,color:"#27AE60"}}>✨ Optimized Version</div>
                  <pre style={{color:"#e0e0e0",fontSize:13,lineHeight:1.6,whiteSpace:"pre-wrap",fontFamily:"inherit",margin:0}}>{result.optimizedContent}</pre>
                  <button onClick={()=>{navigator.clipboard.writeText(result.optimizedContent);toast({title:"Copied!"});}} style={{marginTop:10,padding:"6px 14px",borderRadius:6,border:"1px solid #333",background:"none",color:"#888",cursor:"pointer",fontSize:12}}>Copy</button>
                </div>
              )}
              {result.suggestions?.length > 0 && (
                <div style={{background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:12,padding:16}}>
                  <div style={{fontSize:13,fontWeight:700,marginBottom:10,color:"#9B59B6"}}>💡 Suggestions</div>
                  {result.suggestions.map((s:string,i:number)=><div key={i} style={{padding:"6px 0",borderBottom:"1px solid #1a1a2e",fontSize:13,color:"#ccc",display:"flex",gap:8}}><ArrowUp size={13} color="#9B59B6" style={{flexShrink:0,marginTop:2}}/>{s}</div>)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <style>{`*{box-sizing:border-box}textarea::placeholder{color:#444}`}</style>
    </div>
  );
}
export default ViralOptimizerPage;
