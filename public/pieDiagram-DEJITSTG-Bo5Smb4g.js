import{g as j,s as H,a as J,b as Q,q as Y,p as tt,_ as s,l as w,c as et,F as at,I as it,K as rt,e as st,z as ot,G as nt}from"./mermaid.core-BJAKG3Np.js";import{p as lt}from"./chunk-4BX2VUAB-CzY3iQRJ.js";import{p as ct}from"./wardley-RL74JXVD-C6PGJZCF.js";import{d as G,o as dt,a as pt}from"./charts-tia1Xx-B.js";import"./index-BZFUjC5X.js";import"./trpc-Dnhv7QmT.js";import"./ui-uex2BQ7x.js";import"./datefns-8oNeA32j.js";import"./stripe-Bwk3HUG7.js";import"./socket-BkL6vOXg.js";import"./min-DG1D6lsA.js";import"./_baseUniq-B43HobHM.js";var gt=nt.pie,C={sections:new Map,showData:!1},m=C.sections,D=C.showData,ht=structuredClone(gt),mt=s(()=>structuredClone(ht),"getConfig"),ut=s(()=>{m=new Map,D=C.showData,ot()},"clear"),ft=s(({label:t,value:a})=>{if(a<0)throw new Error(`"${t}" has invalid value: ${a}. Negative values are not allowed in pie charts. All slice values must be >= 0.`);m.has(t)||(m.set(t,a),w.debug(`added new section: ${t}, with value: ${a}`))},"addSection"),vt=s(()=>m,"getSections"),xt=s(t=>{D=t},"setShowData"),St=s(()=>D,"getShowData"),M={getConfig:mt,clear:ut,setDiagramTitle:tt,getDiagramTitle:Y,setAccTitle:Q,getAccTitle:J,setAccDescription:H,getAccDescription:j,addSection:ft,getSections:vt,setShowData:xt,getShowData:St},wt=s((t,a)=>{lt(t,a),a.setShowData(t.showData),t.sections.map(a.addSection)},"populateDb"),Ct={parse:s(async t=>{const a=await ct("pie",t);w.debug(a),wt(a,M)},"parse")},Dt=s(t=>`
  .pieCircle{
    stroke: ${t.pieStrokeColor};
    stroke-width : ${t.pieStrokeWidth};
    opacity : ${t.pieOpacity};
  }
  .pieOuterCircle{
    stroke: ${t.pieOuterStrokeColor};
    stroke-width: ${t.pieOuterStrokeWidth};
    fill: none;
  }
  .pieTitleText {
    text-anchor: middle;
    font-size: ${t.pieTitleTextSize};
    fill: ${t.pieTitleTextColor};
    font-family: ${t.fontFamily};
  }
  .slice {
    font-family: ${t.fontFamily};
    fill: ${t.pieSectionTextColor};
    font-size:${t.pieSectionTextSize};
    // fill: white;
  }
  .legend text {
    fill: ${t.pieLegendTextColor};
    font-family: ${t.fontFamily};
    font-size: ${t.pieLegendTextSize};
  }
`,"getStyles"),$t=Dt,yt=s(t=>{const a=[...t.values()].reduce((r,n)=>r+n,0),$=[...t.entries()].map(([r,n])=>({label:r,value:n})).filter(r=>r.value/a*100>=1);return pt().value(r=>r.value).sort(null)($)},"createPieArcs"),Tt=s((t,a,$,y)=>{w.debug(`rendering pie chart
`+t);const r=y.db,n=et(),T=at(r.getConfig(),n.pie),A=40,o=18,p=4,c=450,d=c,u=it(a),l=u.append("g");l.attr("transform","translate("+d/2+","+c/2+")");const{themeVariables:i}=n;let[b]=rt(i.pieOuterStrokeWidth);b??=2;const _=T.textPosition,g=Math.min(d,c)/2-A,L=G().innerRadius(0).outerRadius(g),B=G().innerRadius(g*_).outerRadius(g*_);l.append("circle").attr("cx",0).attr("cy",0).attr("r",g+b/2).attr("class","pieOuterCircle");const h=r.getSections(),I=yt(h),O=[i.pie1,i.pie2,i.pie3,i.pie4,i.pie5,i.pie6,i.pie7,i.pie8,i.pie9,i.pie10,i.pie11,i.pie12];let f=0;h.forEach(e=>{f+=e});const E=I.filter(e=>(e.data.value/f*100).toFixed(0)!=="0"),v=dt(O).domain([...h.keys()]);l.selectAll("mySlices").data(E).enter().append("path").attr("d",L).attr("fill",e=>v(e.data.label)).attr("class","pieCircle"),l.selectAll("mySlices").data(E).enter().append("text").text(e=>(e.data.value/f*100).toFixed(0)+"%").attr("transform",e=>"translate("+B.centroid(e)+")").style("text-anchor","middle").attr("class","slice");const P=l.append("text").text(r.getDiagramTitle()).attr("x",0).attr("y",-400/2).attr("class","pieTitleText"),k=[...h.entries()].map(([e,S])=>({label:e,value:S})),x=l.selectAll(".legend").data(k).enter().append("g").attr("class","legend").attr("transform",(e,S)=>{const W=o+p,V=W*k.length/2,X=12*o,Z=S*W-V;return"translate("+X+","+Z+")"});x.append("rect").attr("width",o).attr("height",o).style("fill",e=>v(e.label)).style("stroke",e=>v(e.label)),x.append("text").attr("x",o+p).attr("y",o-p).text(e=>r.getShowData()?`${e.label} [${e.value}]`:e.label);const N=Math.max(...x.selectAll("text").nodes().map(e=>e?.getBoundingClientRect().width??0)),U=d+A+o+p+N,R=P.node()?.getBoundingClientRect().width??0,q=d/2-R/2,K=d/2+R/2,z=Math.min(0,q),F=Math.max(U,K)-z;u.attr("viewBox",`${z} 0 ${F} ${c}`),st(u,c,F,T.useMaxWidth)},"draw"),At={draw:Tt},Ot={parser:Ct,db:M,renderer:At,styles:$t};export{Ot as diagram};
