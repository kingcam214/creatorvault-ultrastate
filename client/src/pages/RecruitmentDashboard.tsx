import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Users, ChevronLeft, Plus, Send, Target, TrendingUp, RefreshCw, Zap } from "lucide-react";

export function RecruitmentDashboard() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"pipeline"|"outreach"|"sequences">("pipeline");
  const [target, setTarget] = useState("");
  const [niche, setNiche] = useState("fitness");
  const [platform, setPlatform] = useState("instagram");

  const { data: leads } = trpc.recruitmentWeapon?.getLeads?.useQuery?.() || { data: null };
  const { data: sequences } = trpc.recruitmentWeapon?.getSequences?.useQuery?.() || { data: null };

  const createOutreach = trpc.recruitmentWeapon?.createOutreachSequence?.useMutation?.({
    onSuccess: () => toast({title:"Outreach sequence created"}),
    onError: (e: any) => toast({title:"Error",description:e.message,variant:"destructive"}),
  }) || { mutate: ()=>{}, isPending: false };

  const NICHES = ["fitness","beauty","music","gaming","food","travel","business","lifestyle"];
  const PLATFORMS = ["instagram","tiktok","youtube","twitter","linkedin","telegram"];

  return (
    <div style={{minHeight:"100vh",background:"#080810",color:"white",fontFamily:"system-ui,sans-serif"}}>
      <div style={{borderBottom:"1px solid #1a1a2e",padding:"16px 24px",display:"flex",alignItems:"center",gap:16,background:"#0a0a1a"}}>
        <Link href="/dashboard"><button style={{background:"none",border:"1px solid #333",borderRadius:8,padding:"6px 12px",color:"#888",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:13}}><ChevronLeft size={14}/> Dashboard</button></Link>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:"#9B59B622",border:"1px solid #9B59B644",display:"flex",alignItems:"center",justifyContent:"center"}}><Users size={16} color="#9B59B6"/></div>
          <div><div style={{fontSize:16,fontWeight:700}}>Recruitment Dashboard</div><div style={{fontSize:11,color:"#666"}}>Creator pipeline & outreach</div></div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          {["pipeline","outreach","sequences"].map(t=><button key={t} onClick={()=>setTab(t as any)} style={{padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:tab===t?700:400,background:tab===t?"#9B59B6":"#1a1a2e",color:tab===t?"white":"#888",textTransform:"capitalize"}}>{t}</button>)}
        </div>
      </div>
      <div style={{padding:24}}>
        {tab==="pipeline" && (
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:20}}>
              {[{label:"Total Leads",value:leads?.total||"0",color:"#9B59B6"},{label:"Contacted",value:leads?.contacted||"0",color:"#00D9FF"},{label:"Interested",value:leads?.interested||"0",color:"#F39C12"},{label:"Converted",value:leads?.converted||"0",color:"#27AE60"}].map(s=>(
                <div key={s.label} style={{background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:10,padding:"14px 16px"}}>
                  <div style={{fontSize:22,fontWeight:800,color:s.color}}>{s.value}</div>
                  <div style={{fontSize:12,color:"#666"}}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:12,padding:20}}>
              <div style={{fontSize:14,fontWeight:700,marginBottom:12,color:"#888"}}>Lead Pipeline</div>
              {!leads?.leads?.length ? (
                <div style={{textAlign:"center",padding:40,color:"#444"}}><Users size={32} style={{marginBottom:8}}/><div>No leads yet. Create an outreach sequence to start recruiting.</div></div>
              ) : (
                <div style={{display:"grid",gap:8}}>
                  {leads.leads.map((lead:any)=>(
                    <div key={lead.id} style={{padding:"12px 14px",background:"#0a0a1a",borderRadius:8,border:"1px solid #1a1a2e",display:"flex",alignItems:"center",gap:12}}>
                      <div style={{width:36,height:36,borderRadius:"50%",background:"#9B59B620",display:"flex",alignItems:"center",justifyContent:"center"}}><Users size={16} color="#9B59B6"/></div>
                      <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:"#e0e0e0"}}>{lead.name||"Lead"}</div><div style={{fontSize:11,color:"#555"}}>{lead.platform||""} · {lead.niche||""}</div></div>
                      <span style={{padding:"3px 8px",borderRadius:20,background:"#9B59B620",color:"#9B59B6",fontSize:11,fontWeight:700,textTransform:"uppercase"}}>{lead.status||"new"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {tab==="outreach" && (
          <div style={{maxWidth:600}}>
            <div style={{fontSize:18,fontWeight:700,marginBottom:20}}>Create Outreach Sequence</div>
            <div style={{display:"grid",gap:14}}>
              <div><label style={{fontSize:11,color:"#666",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:6}}>Target Description</label>
                <textarea value={target} onChange={e=>setTarget(e.target.value)} placeholder="Describe your ideal creator recruit..." rows={3} style={{width:"100%",padding:"10px 12px",background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:8,color:"white",fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>
              <div><label style={{fontSize:11,color:"#666",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:6}}>Niche</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{NICHES.map(n=><button key={n} onClick={()=>setNiche(n)} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${niche===n?"#9B59B6":"#1a1a2e"}`,background:niche===n?"#9B59B620":"#0f0f1a",cursor:"pointer",fontSize:11,color:niche===n?"#9B59B6":"#666",fontWeight:niche===n?700:400,textTransform:"capitalize"}}>{n}</button>)}</div>
              </div>
              <div><label style={{fontSize:11,color:"#666",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:6}}>Platform</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{PLATFORMS.map(p=><button key={p} onClick={()=>setPlatform(p)} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${platform===p?"#00D9FF":"#1a1a2e"}`,background:platform===p?"#00D9FF20":"#0f0f1a",cursor:"pointer",fontSize:11,color:platform===p?"#00D9FF":"#666",fontWeight:platform===p?700:400,textTransform:"capitalize"}}>{p}</button>)}</div>
              </div>
              <button onClick={()=>{ if(!target.trim()){toast({title:"Describe your target",variant:"destructive"});return;} createOutreach.mutate({target,niche,platform}); }} disabled={createOutreach.isPending} style={{padding:"12px",borderRadius:10,border:"none",background:createOutreach.isPending?"#1a1a2e":"#9B59B6",color:"white",cursor:createOutreach.isPending?"not-allowed":"pointer",fontSize:14,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {createOutreach.isPending?<><RefreshCw size={15} style={{animation:"spin 1s linear infinite"}}/> Creating...</>:<><Zap size={15}/> Create Sequence</>}
              </button>
            </div>
          </div>
        )}
        {tab==="sequences" && (
          <div>
            <div style={{fontSize:18,fontWeight:700,marginBottom:16}}>Outreach Sequences</div>
            {!sequences?.sequences?.length ? (
              <div style={{textAlign:"center",padding:60,color:"#444"}}><Target size={40} style={{marginBottom:12}}/><div>No sequences yet. Create one in the Outreach tab.</div></div>
            ) : (
              <div style={{display:"grid",gap:8}}>
                {sequences.sequences.map((seq:any)=>(
                  <div key={seq.id} style={{background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:10,padding:"14px 16px"}}>
                    <div style={{fontSize:13,fontWeight:600,color:"#e0e0e0",marginBottom:4}}>{seq.name||"Sequence"}</div>
                    <div style={{fontSize:12,color:"#555"}}>{seq.platform||""} · {seq.niche||""} · {seq.steps||0} steps</div>
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
export default RecruitmentDashboard;
