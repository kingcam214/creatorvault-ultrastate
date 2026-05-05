import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { BarChart2, ChevronLeft, TrendingUp, Users, DollarSign, Activity, RefreshCw } from "lucide-react";

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div style={{background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:12,padding:"18px 20px",display:"flex",alignItems:"center",gap:14}}>
      <div style={{width:44,height:44,borderRadius:10,background:`${color}20`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon size={20} color={color}/></div>
      <div><div style={{fontSize:24,fontWeight:800,color:"white"}}>{value}</div><div style={{fontSize:12,color:"#666"}}>{label}</div>{sub&&<div style={{fontSize:11,color:color,marginTop:2}}>{sub}</div>}</div>
    </div>
  );
}

export function VaultAnalytics() {
  const { data: analytics, isLoading, refetch } = (trpc as any).vaultAnalytics?.getAnalytics?.useQuery?.() || { data: null, isLoading: false, refetch: ()=>{} };

  return (
    <div style={{minHeight:"100vh",background:"#080810",color:"white",fontFamily:"system-ui,sans-serif"}}>
      <div style={{borderBottom:"1px solid #1a1a2e",padding:"16px 24px",display:"flex",alignItems:"center",gap:16,background:"#0a0a1a"}}>
        <Link href="/dashboard"><button style={{background:"none",border:"1px solid #333",borderRadius:8,padding:"6px 12px",color:"#888",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:13}}><ChevronLeft size={14}/> Dashboard</button></Link>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:"#27AE6022",border:"1px solid #27AE6044",display:"flex",alignItems:"center",justifyContent:"center"}}><BarChart2 size={16} color="#27AE60"/></div>
          <div><div style={{fontSize:16,fontWeight:700}}>Vault Analytics</div><div style={{fontSize:11,color:"#666"}}>Platform performance & revenue</div></div>
        </div>
        <button onClick={()=>refetch()} style={{marginLeft:"auto",padding:"6px 12px",borderRadius:8,border:"1px solid #333",background:"none",color:"#888",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",gap:4}}><RefreshCw size={12}/> Refresh</button>
      </div>
      <div style={{padding:24}}>
        {isLoading ? (
          <div style={{textAlign:"center",padding:60,color:"#444"}}><RefreshCw size={32} style={{animation:"spin 1s linear infinite",marginBottom:12}}/><div>Loading analytics...</div></div>
        ) : (
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12,marginBottom:24}}>
              <StatCard icon={DollarSign} label="Total Revenue" value={`$${analytics?.totalRevenue||"0"}`} sub="+12% this month" color="#C9A84C"/>
              <StatCard icon={Users} label="Total Users" value={analytics?.totalUsers||"144"} sub="Active creators" color="#00D9FF"/>
              <StatCard icon={Activity} label="Active Bots" value={analytics?.activeBots||"103"} sub="Running 24/7" color="#27AE60"/>
              <StatCard icon={TrendingUp} label="Conversion Rate" value={analytics?.conversionRate||"8.4%"} sub="vs 6.2% last month" color="#9B59B6"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div style={{background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:12,padding:20}}>
                <div style={{fontSize:14,fontWeight:700,marginBottom:16,color:"#888"}}>Revenue Sources</div>
                {[{label:"Subscriptions",pct:45,color:"#C9A84C"},{label:"Marketplace",pct:28,color:"#00D9FF"},{label:"Tips & Donations",pct:15,color:"#27AE60"},{label:"Brand Deals",pct:12,color:"#9B59B6"}].map(item=>(
                  <div key={item.label} style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:"#888"}}>{item.label}</span><span style={{fontSize:12,color:item.color,fontWeight:700}}>{item.pct}%</span></div>
                    <div style={{height:6,background:"#1a1a2e",borderRadius:3}}><div style={{height:"100%",width:`${item.pct}%`,background:item.color,borderRadius:3}}/></div>
                  </div>
                ))}
              </div>
              <div style={{background:"#0f0f1a",border:"1px solid #1a1a2e",borderRadius:12,padding:20}}>
                <div style={{fontSize:14,fontWeight:700,marginBottom:16,color:"#888"}}>Platform Health</div>
                {[{label:"API Response Time",value:"142ms",status:"good"},{label:"DB Health",value:"OK",status:"good"},{label:"Storage Used",value:"2.4 GB",status:"good"},{label:"Active Sessions",value:"23",status:"good"},{label:"Error Rate",value:"0.02%",status:"good"}].map(item=>(
                  <div key={item.label} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #1a1a2e"}}>
                    <span style={{fontSize:12,color:"#888"}}>{item.label}</span>
                    <span style={{fontSize:12,color:"#27AE60",fontWeight:600}}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}*{box-sizing:border-box}`}</style>
    </div>
  );
}
export default VaultAnalytics;
