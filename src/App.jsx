import { useState, useEffect, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, LineChart, Line } from "recharts";

const PORTFOLIO = {
  VWRA:  { label:"Vanguard All-World",  layer:"World",    alloc:0.25, ter:0.19, color:"#4fc3f7", bear:6.5,  base:9.5,  bull:13.0 },
  CSNDX: { label:"Nasdaq 100 (USD)",    layer:"Software", alloc:0.25, ter:0.20, color:"#81c784", bear:8.0,  base:12.5, bull:17.0 },
  CSPX:  { label:"S&P 500 Core",        layer:"Economy",  alloc:0.20, ter:0.07, color:"#fff176", bear:7.0,  base:10.5, bull:14.0 },
  SMH:   { label:"Semiconductors",      layer:"Hardware", alloc:0.30, ter:0.35, color:"#ff8a65", bear:6.0,  base:13.5, bull:22.0 },
};
const BLENDED_TER = Object.values(PORTFOLIO).reduce((s,e)=>s+e.alloc*e.ter,0);

const ATH_INIT = {
  VWRA:  { val:178.64,  currency:"USD", exchange:"LSE"     },
  CSNDX: { val:1500.60, currency:"USD", exchange:"EBS/SIX" },
  CSPX:  { val:780.00,  currency:"USD", exchange:"LSE"     },
  SMH:   { val:280.00,  currency:"USD", exchange:"NASDAQ"  },
};

const TIERS = [
  { drop:"0–10%",  freq:"3–4× per year",   action:"Do nothing. DCA only.",         topup:0,     color:"#4a5070", intensity:0 },
  { drop:"10–15%", freq:"Every 1–2 years",  action:"Small top-up on conviction.",   topup:500,   color:"#7986cb", intensity:1 },
  { drop:"15–20%", freq:"Every 2–3 years",  action:"Moderate deployment.",          topup:1500,  color:"#4fc3f7", intensity:2 },
  { drop:"20–30%", freq:"Every 3–5 years",  action:"Deploy Tier 1 war chest.",      topup:5000,  color:"#4caf7d", intensity:3 },
  { drop:"30–40%", freq:"Every 5–7 years",  action:"Deploy Tier 2. Be aggressive.", topup:10000, color:"#c8963e", intensity:4 },
  { drop:"40–50%", freq:"Once a decade",    action:"Deploy Tier 3. Maximum mode.",  topup:15000, color:"#e05555", intensity:5 },
  { drop:"50%+",   freq:"Generational",     action:"Deploy everything available.",  topup:20000, color:"#ff4444", intensity:6 },
];

const ETF_PB = {
  VWRA:  { thresholds:[10,20,30,40],     amounts:[0,2000,5000,10000],        note:"Rarely drops 40%+ — generational buy",                      color:"#4fc3f7" },
  CSNDX: { thresholds:[10,20,30,40,50],  amounts:[0,1500,4000,8000,15000],   note:"-30% on Nasdaq happens every few years. Buy confidently.",   color:"#81c784" },
  CSPX:  { thresholds:[10,20,30,40,50],  amounts:[0,2000,5000,10000,20000],  note:"S&P 500 -50% happened twice in 25yrs. Both generational.",   color:"#fff176" },
  SMH:   { thresholds:[15,25,35,45,55],  amounts:[0,2000,5000,10000,20000],  note:"-40% with AI thesis intact = best opportunity.",             color:"#ff8a65" },
};

const AI_LAYERS = [
  { key:"SMH",   layer:"Hardware",  desc:"Chips power every AI model trained & deployed. No chips = no AI.",        color:"#ff8a65" },
  { key:"CSNDX", layer:"Software",  desc:"Microsoft, Google, Meta, Amazon — monetising AI at scale right now.",     color:"#81c784" },
  { key:"CSPX",  layer:"Economy",   desc:"Every S&P 500 sector transformed by AI productivity gains.",             color:"#fff176" },
  { key:"VWRA",  layer:"World",     desc:"Global AI spillover — European automation, EM leapfrogging.",            color:"#4fc3f7" },
];

const SSB_STEPS = [
  { phase:"Build",     time:"Now → $20K",          action:"Save $500–1,000/mo into SSB",                 detail:"~2% yield while waiting. $2 transaction fee.",        color:"#4caf7d" },
  { phase:"Crash",     time:"Market drops 30%+",   action:"Submit SSB redemption via bank app",           detail:"Partial redemptions in $500 increments.",              color:"#e05555" },
  { phase:"Wait",      time:"~4 weeks",            action:"Cash credited by 2nd business day next month", detail:"Market may still fall — you may buy even cheaper.",    color:"#c8963e" },
  { phase:"Deploy",    time:"Cash arrives",        action:"Buy 4 ETFs at same target allocation",         detail:"Same VWRA/CSNDX/CSPX/SMH ratios. No improvising.",     color:"#4fc3f7" },
  { phase:"Replenish", time:"Next 12–18 months",   action:"Rebuild war chest back to $20K",               detail:"Wait for next crash. Repeat every cycle.",             color:"#81c784" },
];

const RULES6 = [
  { icon:"📏", title:"Measure from ATH",         desc:"Always calculate drop % from all-time high — not last week's price." },
  { icon:"🪜", title:"Stagger deployment",       desc:"Never go all-in at first trigger. Deploy 50%, keep 50% if it drops further." },
  { icon:"🔒", title:"Emergency fund is sacred", desc:"War chest and emergency fund are completely separate. Never mix." },
  { icon:"🎯", title:"Thesis vs macro crash",    desc:"Macro fear crash = buy. Fundamental breakdown = reassess thesis first." },
  { icon:"⚙️", title:"DCA never stops",          desc:"War chest deployment is additional. $1,471/mo DCA runs regardless." },
  { icon:"📝", title:"Written plan wins",        desc:"When it's -40% and terrifying, this written plan overrides emotions." },
];

const GOLD_INIT_PRICE = 2300; // USD per oz default

const QUOTES = [
  { q:"The stock market is a device for transferring money from the impatient to the patient.", a:"Warren Buffett" },
  { q:"Compound interest is the eighth wonder of the world. He who understands it, earns it. He who doesn't, pays it.", a:"Albert Einstein" },
  { q:"The best time to plant a tree was 20 years ago. The second best time is now.", a:"Chinese Proverb" },
  { q:"Do not save what is left after spending, but spend what is left after saving.", a:"Warren Buffett" },
  { q:"An investment in knowledge pays the best interest.", a:"Benjamin Franklin" },
  { q:"The individual investor should act consistently as an investor and not as a speculator.", a:"Benjamin Graham" },
  { q:"Time in the market beats timing the market.", a:"Ken Fisher" },
  { q:"It's not how much money you make, but how much money you keep, how hard it works for you.", a:"Robert Kiyosaki" },
  { q:"Investing is not nearly as difficult as it looks. Successful investing involves doing a few things right and avoiding serious mistakes.", a:"John Bogle" },
  { q:"The four most dangerous words in investing are: this time it's different.", a:"Sir John Templeton" },
  { q:"Markets are never wrong — opinions often are.", a:"Jesse Livermore" },
  { q:"Every next level of your life will demand a different version of you.", a:"Unknown" },
];

const BG="#060810", SURFACE="#0b0e18", CARD="#0f1220", BORDER="#1c2035";
const MUTED="#2a2f45", DIM="#4a5070", TEXT="#dde2f0";
const GOLD="#c8963e", GREEN="#4caf7d", RED="#e05555", BLUE="#4fc3f7";
const TABS=["Overview","My Journey","Growth","Stress Test","Crash Monitor","Rebalance","Buy Playbook","AI Thesis","Portfolio"];

const fmt  = v => v>=1e6?`$${(v/1e6).toFixed(2)}M`:v>=1e3?`$${(v/1e3).toFixed(0)}K`:`$${Math.round(v)}`;
const fmtP = v => `${v.toFixed(2)}%`;

function blended(sc){ return Object.values(PORTFOLIO).reduce((s,e)=>s+e.alloc*e[sc],0)-BLENDED_TER; }

function project(lump,mo,rate,yrs){
  const r=rate/100/12; let val=lump;
  return Array.from({length:yrs+1},(_,y)=>{ const pt={year:y,value:Math.round(val)}; for(let m=0;m<12;m++) val=val*(1+r)+mo; return pt; });
}

function reqMo(lump,rate,yrs,goal){
  const r=rate/100/12,n=yrs*12;
  return Math.max(0,(goal-lump*Math.pow(1+r,n))/((Math.pow(1+r,n)-1)/r));
}

function stressProj(lump,mo,rate,cYr,depth,yrs){
  const r=rate/100/12; let val=lump;
  return Array.from({length:yrs+1},(_,y)=>{ if(y===cYr) val*=(1-depth/100); const pt={year:y,stress:Math.round(val)}; for(let m=0;m<12;m++) val=val*(1+r)+mo; return pt; });
}

function getSignal(drop,ticker){
  const pb=ETF_PB[ticker];
  if(!pb) return {label:"HOLD",color:DIM,deploy:0,action:"DCA only"};
  const L=["HOLD","WATCH","SMALL BUY","BUY","STRONG BUY","MAXIMUM BUY"];
  const C=[DIM,"#7986cb","#4fc3f7","#4caf7d","#c8963e","#e05555"];
  let tier=0,deploy=0;
  for(let i=pb.thresholds.length-1;i>=0;i--){ if(drop>=pb.thresholds[i]){ tier=i+1; deploy=pb.amounts[i]; break; } }
  return {label:L[Math.min(tier,5)],color:C[Math.min(tier,5)],deploy,action:TIERS[Math.min(tier,TIERS.length-1)].action};
}

export default function App(){
  const [tab,setTab]=useState("Overview");

  // Helper to load from localStorage with fallback
  function load(key, fallback){
    try { const v=localStorage.getItem("wb_"+key); return v!==null?JSON.parse(v):fallback; } catch{ return fallback; }
  }
  function save(key,val){ try{ localStorage.setItem("wb_"+key,JSON.stringify(val)); }catch{} }

  const [lump,setLump]=useState(()=>load("lump",80000));
  const [monthly,setMonthly]=useState(()=>load("monthly",1471));
  const [years,setYears]=useState(()=>load("years",20));
  const [goal,setGoal]=useState(()=>load("goal",2500000));
  const [scenario,setScenario]=useState(()=>load("scenario","base"));
  const [crashYr,setCrashYr]=useState(()=>load("crashYr",5));
  const [crashDepth,setCrashDepth]=useState(()=>load("crashDepth",40));
  const [prices,setPrices]=useState(()=>load("prices",{ VWRA:178.64, CSNDX:1500.60, CSPX:780.00, SMH:280.00 }));
  const [ath,setAth]=useState(()=>load("ath",{ VWRA:178.64, CSNDX:1500.60, CSPX:780.00, SMH:280.00 }));
  const [warChest,setWarChest]=useState(()=>load("warChest",0));
  const [holdings,setHoldings]=useState(()=>load("holdings",{VWRA:0,CSNDX:0,CSPX:0,SMH:0}));
  const [rebalMode,setRebalMode]=useState(()=>load("rebalMode","sell"));
  const [lastChecked,setLastChecked]=useState(()=>load("lastChecked",""));
  const [dcaLog,setDcaLog]=useState(()=>load("dcaLog",[]));
  const [newDcaDate,setNewDcaDate]=useState(new Date().toISOString().slice(0,7));
  const [newDcaAmt,setNewDcaAmt]=useState(1471);
  const [newDcaNote,setNewDcaNote]=useState("");
  const [portfolioValue,setPortfolioValue]=useState(()=>load("portfolioValue",0));
  const [goldValue,setGoldValue]=useState(()=>load("goldValue",0));
  const [goldMonthly,setGoldMonthly]=useState(()=>load("goldMonthly",400));
  const [startDate]=useState("2026-03");
  const [quoteIdx]=useState(Math.floor(Math.random()*QUOTES.length));
  const [animP,setAnimP]=useState(0);
  const [liveLoading,setLiveLoading]=useState(false);
  const [liveError,setLiveError]=useState("");
  const [liveData,setLiveData]=useState({}); // {VWRA:{price,change,marketState}, ...}
  const [lastLiveFetch,setLastLiveFetch]=useState("");
  const raf=useRef(null);

  // Fetch live prices from our Vercel API route
  async function fetchLivePrices(){
    setLiveLoading(true);
    setLiveError("");
    try {
      const res = await fetch("/api/prices");
      if(!res.ok) throw new Error("API error "+res.status);
      const data = await res.json();
      if(data.success && data.prices){
        setLiveData(data.prices);
        // Auto-update current prices from live data
        const newPrices = {...prices};
        Object.entries(data.prices).forEach(([k,v])=>{ if(v&&v.price) newPrices[k]=parseFloat(v.price.toFixed(2)); });
        setPrices(newPrices);
        setLastLiveFetch(new Date().toLocaleString("en-SG"));
        setLastChecked(new Date().toLocaleString("en-SG"));
      }
    } catch(e){
      setLiveError("Could not fetch prices: "+e.message);
    }
    setLiveLoading(false);
  }

  // Auto-fetch on mount
  useEffect(()=>{ fetchLivePrices(); },[]);

  // Save all state to localStorage whenever it changes
  useEffect(()=>{ save("lump",lump); },[lump]);
  useEffect(()=>{ save("monthly",monthly); },[monthly]);
  useEffect(()=>{ save("years",years); },[years]);
  useEffect(()=>{ save("goal",goal); },[goal]);
  useEffect(()=>{ save("scenario",scenario); },[scenario]);
  useEffect(()=>{ save("crashYr",crashYr); },[crashYr]);
  useEffect(()=>{ save("crashDepth",crashDepth); },[crashDepth]);
  useEffect(()=>{ save("prices",prices); },[prices]);
  useEffect(()=>{ save("ath",ath); },[ath]);
  useEffect(()=>{ save("warChest",warChest); },[warChest]);
  useEffect(()=>{ save("holdings",holdings); },[holdings]);
  useEffect(()=>{ save("rebalMode",rebalMode); },[rebalMode]);
  useEffect(()=>{ save("lastChecked",lastChecked); },[lastChecked]);
  useEffect(()=>{ save("dcaLog",dcaLog); },[dcaLog]);
  useEffect(()=>{ save("portfolioValue",portfolioValue); },[portfolioValue]);
  useEffect(()=>{ save("goldValue",goldValue); },[goldValue]);
  useEffect(()=>{ save("goldMonthly",goldMonthly); },[goldMonthly]);

  useEffect(()=>{
    setAnimP(0); let t0=null;
    const step=ts=>{ if(!t0)t0=ts; const p=Math.min((ts-t0)/1000,1); setAnimP(p); if(p<1)raf.current=requestAnimationFrame(step); };
    raf.current=requestAnimationFrame(step);
    return ()=>cancelAnimationFrame(raf.current);
  },[tab,scenario,lump,monthly,years,goal]);

  const ease=p=>1-Math.pow(1-p,3);
  const anim=v=>Math.round(v*ease(animP));

  const bearR=blended("bear"),baseR=blended("base"),bullR=blended("bull"),curR=blended(scenario);
  const bearD=project(lump,monthly,bearR,years);
  const baseD=project(lump,monthly,baseR,years);
  const bullD=project(lump,monthly,bullR,years);
  const fBear=bearD[years].value,fBase=baseD[years].value,fBull=bullD[years].value;
  const fCur=project(lump,monthly,curR,years)[years].value;
  const onTrack=fCur>=goal;
  const contributed=lump+monthly*12*years;
  const gains=fBase-contributed;
  const stressD=stressProj(lump,monthly,baseR,crashYr,crashDepth,years);
  const stressFinal=stressD[years].stress;
  const chartD=baseD.map((d,i)=>({year:d.year,bear:bearD[i].value,base:d.value,bull:bullD[i].value}));

  const C={background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:24};
  const L={fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",color:DIM,marginBottom:6,fontFamily:"'IBM Plex Mono',monospace"};
  const I={width:"100%",background:"#080b14",border:`1px solid ${BORDER}`,borderRadius:8,color:TEXT,padding:"9px 12px",fontSize:14,fontFamily:"'IBM Plex Mono',monospace",outline:"none",boxSizing:"border-box"};

  const Tip=({active,payload,label:yr})=>{
    if(!active||!payload?.length) return null;
    const N={bear:"Bear",base:"Base",bull:"Bull",stress:"Crash",normal:"No crash"};
    return(
      <div style={{background:"#080b14",border:`1px solid ${BORDER}`,borderRadius:10,padding:"12px 16px"}}>
        <div style={{color:DIM,fontSize:11,marginBottom:8,fontFamily:"'IBM Plex Mono',monospace"}}>YEAR {yr}</div>
        {payload.map(p=><div key={p.name} style={{color:p.color||TEXT,fontSize:12,marginBottom:3,fontFamily:"'IBM Plex Mono',monospace"}}>{N[p.name]||p.name}: {fmt(p.value)}</div>)}
      </div>
    );
  };

  return(
    <div style={{minHeight:"100vh",background:BG,color:TEXT,fontFamily:"'Plus Jakarta Sans',sans-serif",paddingBottom:60}}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Bebas+Neue&display=swap" rel="stylesheet"/>

      {/* HEADER */}
      <div style={{background:SURFACE,borderBottom:`1px solid ${BORDER}`,padding:"22px 24px 0"}}>
        <div style={{maxWidth:960,margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:14,paddingBottom:18}}>
            <div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:38,letterSpacing:2,lineHeight:1}}>WEALTH<span style={{color:GOLD}}>BUILDER</span></div>
              <div style={{color:DIM,fontSize:11,marginTop:4,fontFamily:"'IBM Plex Mono',monospace",letterSpacing:"0.1em"}}>SGP · UCITS · 20YR DCA · AI PRODUCTIVITY THESIS</div>
            </div>
            <div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center"}}>
              {Object.entries(PORTFOLIO).map(([k,v])=>(
                <div key={k} style={{padding:"4px 10px",borderRadius:20,fontSize:11,background:`${v.color}15`,border:`1px solid ${v.color}35`,color:v.color,fontFamily:"'IBM Plex Mono',monospace"}}>{k} {(v.alloc*100).toFixed(0)}%</div>
              ))}
              <div style={{color:DIM,fontSize:10,fontFamily:"'IBM Plex Mono',monospace"}}>TER {fmtP(BLENDED_TER)}</div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{fontSize:10,color:GREEN,fontFamily:"'IBM Plex Mono',monospace",background:`${GREEN}15`,padding:"3px 9px",borderRadius:10,border:`1px solid ${GREEN}30`}}>● AUTO-SAVED</div>
                <button onClick={()=>{ if(window.confirm("Reset all data? This cannot be undone.")){ localStorage.clear(); window.location.reload(); } }} style={{fontSize:10,color:DIM,background:"transparent",border:`1px solid ${MUTED}`,borderRadius:8,padding:"3px 9px",cursor:"pointer",fontFamily:"'IBM Plex Mono',monospace"}}>Reset</button>
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:2,flexWrap:"wrap"}}>
            {TABS.map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{padding:"8px 14px",borderRadius:"7px 7px 0 0",fontSize:11,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:500,background:tab===t?BG:"transparent",color:tab===t?GOLD:DIM,border:`1px solid ${tab===t?BORDER:"transparent"}`,borderBottom:tab===t?`1px solid ${BG}`:"none"}}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:960,margin:"0 auto",padding:"22px 18px"}}>

        {/* OVERVIEW */}
        {tab==="Overview"&&(
          <div style={{display:"grid",gap:14}}>
            <div style={{...C,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at top left,${onTrack?GREEN:RED}08 0%,transparent 60%)`,pointerEvents:"none"}}/>
              <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${onTrack?GREEN:RED} ${Math.min((fCur/goal)*100,100)*ease(animP)}%,${MUTED} 0%)`}}/>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(185px,1fr))",gap:22}}>
                <div>
                  <div style={L}>Projected · {scenario} · Year {years}</div>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:50,letterSpacing:1,color:onTrack?GREEN:RED,lineHeight:1}}>{fmt(anim(fCur))}</div>
                  <div style={{color:DIM,fontSize:12,marginTop:5}}>Goal <span style={{color:GOLD,fontFamily:"'IBM Plex Mono',monospace"}}>{fmt(goal)}</span> &nbsp;<span style={{color:onTrack?GREEN:RED}}>{onTrack?`+${fmt(fCur-goal)} surplus`:`−${fmt(goal-fCur)} short`}</span></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  {[["Contributed",contributed,TEXT],["Market Gains",gains,GREEN],["Lump Sum",lump,BLUE],["Monthly DCA",monthly,GOLD]].map(([lbl,v,c])=>(
                    <div key={lbl}>
                      <div style={L}>{lbl}</div>
                      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:16,color:c,fontWeight:500}}>{lbl==="Monthly DCA"?`$${v.toLocaleString()}`:fmt(anim(v))}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:11}}>
              {[["bear",fBear,RED,bearR],["base",fBase,GOLD,baseR],["bull",fBull,GREEN,bullR]].map(([s,v,c,r])=>(
                <div key={s} onClick={()=>setScenario(s)} style={{...C,cursor:"pointer",border:`1px solid ${scenario===s?c+"70":BORDER}`,background:scenario===s?`${c}0c`:CARD,transition:"all 0.2s"}}>
                  <div style={{...L,color:c}}>{s} case</div>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:c,letterSpacing:1}}>{fmt(v)}</div>
                  <div style={{color:DIM,fontSize:11,marginTop:3,fontFamily:"'IBM Plex Mono',monospace"}}>{fmtP(r)}/yr blended</div>
                </div>
              ))}
            </div>
            <div style={{...C,background:onTrack?`${GREEN}08`:`${RED}08`,border:`1px solid ${onTrack?GREEN:RED}30`}}>
              {onTrack
                ?<><div style={{color:GREEN,fontWeight:600,fontSize:13}}>✓ On track to reach {fmt(goal)}</div><div style={{color:DIM,fontSize:12,marginTop:4}}>Keep your ${monthly.toLocaleString()}/mo DCA consistent. Don't stop during downturns — that's when you buy the most units.</div></>
                :<><div style={{color:RED,fontWeight:600,fontSize:13}}>Need +${Math.round(reqMo(lump,curR,years,goal)-monthly).toLocaleString()}/mo more to hit goal</div><div style={{color:DIM,fontSize:12,marginTop:4}}>Required: <span style={{color:RED,fontFamily:"'IBM Plex Mono',monospace"}}>${Math.round(reqMo(lump,curR,years,goal)).toLocaleString()}/mo</span></div></>
              }
            </div>
            <div style={C}>
              <div style={{...L,marginBottom:16}}>Adjust Parameters</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(165px,1fr))",gap:16}}>
                {[["Lump Sum ($)",lump,setLump,10000,500000,5000],["Monthly DCA ($)",monthly,setMonthly,100,10000,50],["Years",years,setYears,5,35,1],["Goal ($)",goal,setGoal,500000,10000000,100000]].map(([lbl,v,s,mn,mx,st])=>(
                  <div key={lbl}>
                    <div style={L}>{lbl}</div>
                    <input type="number" min={mn} max={mx} step={st} value={v} onChange={e=>s(Number(e.target.value))} style={I}/>
                    <input type="range" min={mn} max={mx} step={st} value={v} onChange={e=>s(Number(e.target.value))} style={{width:"100%",marginTop:7,accentColor:GOLD}}/>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MY JOURNEY */}
        {tab==="My Journey"&&(()=>{
          const totalDCA = dcaLog.reduce((s,e)=>s+e.amount,0);
          const totalInvested = totalDCA + (lump||0);
          const totalWealth = portfolioValue + goldValue;
          const goalPct = totalWealth>0 ? Math.min((totalWealth/goal)*100,100) : 0;
          const monthsInvested = dcaLog.length;
          const yearsLeft = Math.max(0, 20 - monthsInvested/12);
          const projectedFinal = project(lump, monthly, blended("base"), 20)[20].value;
          const onGoalTrack = portfolioValue >= project(lump, monthly, blended("base"), Math.round(monthsInvested/12))[Math.min(Math.round(monthsInvested/12),20)]?.value * 0.85;
          const quote = QUOTES[quoteIdx];

          // Gold projection
          const goldBaseRate = 6;
          const goldR = goldBaseRate/100/12;
          const goldN = yearsLeft*12;
          const goldProjected = goldValue * Math.pow(1+goldR, goldN) + goldMonthly * ((Math.pow(1+goldR,goldN)-1)/goldR);

          return(
            <div style={{display:"grid",gap:14}}>

              {/* Motivational quote */}
              <div style={{...C,background:`linear-gradient(135deg,${GOLD}12,${BLUE}08)`,border:`1px solid ${GOLD}35`,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:-10,right:-10,fontSize:120,opacity:0.04,lineHeight:1}}>"</div>
                <div style={{fontSize:15,fontWeight:500,lineHeight:1.7,color:TEXT,fontStyle:"italic",maxWidth:700}}>"{quote.q}"</div>
                <div style={{color:GOLD,fontSize:12,marginTop:10,fontFamily:"'IBM Plex Mono',monospace"}}>— {quote.a}</div>
                <div style={{color:DIM,fontSize:10,marginTop:8}}>Your 20-year journey started. Every month you DCA is a vote for your future self.</div>
              </div>

              {/* Total Wealth snapshot */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:11}}>
                {[
                  ["ETF Portfolio Value",portfolioValue,GREEN,"Update monthly from your broker"],
                  ["Gold Portfolio Value",goldValue,"#ffd54f","Update monthly from your broker"],
                  ["Total Wealth",totalWealth,BLUE,"ETF + Gold combined"],
                ].map(([lbl,v,c,sub])=>(
                  <div key={lbl} style={{...C,border:`1px solid ${c}30`,background:`${c}08`}}>
                    <div style={{...L,color:c}}>{lbl}</div>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:30,color:c,letterSpacing:1,lineHeight:1}}>{v>0?fmt(v):"—"}</div>
                    <div style={{color:DIM,fontSize:10,marginTop:4}}>{sub}</div>
                  </div>
                ))}
              </div>

              {/* Update portfolio values */}
              <div style={C}>
                <div style={{...L,marginBottom:14}}>Update Your Current Values (USD)</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                  <div>
                    <div style={L}>ETF Portfolio Total ($)</div>
                    <input type="number" min={0} step={100} value={portfolioValue||""} placeholder="e.g. 95000"
                      onChange={e=>setPortfolioValue(parseFloat(e.target.value)||0)}
                      style={{...I,fontSize:16,color:GREEN}}/>
                    <div style={{color:DIM,fontSize:11,marginTop:5}}>Check your broker for total portfolio value</div>
                  </div>
                  <div>
                    <div style={L}>Gold Portfolio Total ($)</div>
                    <input type="number" min={0} step={100} value={goldValue||""} placeholder="e.g. 12000"
                      onChange={e=>setGoldValue(parseFloat(e.target.value)||0)}
                      style={{...I,fontSize:16,color:"#ffd54f"}}/>
                    <div style={{color:DIM,fontSize:11,marginTop:5}}>Gold DCA: <span style={{color:"#ffd54f",fontFamily:"'IBM Plex Mono',monospace"}}>${goldMonthly}/mo</span> &nbsp;
                      <input type="number" value={goldMonthly} onChange={e=>setGoldMonthly(Number(e.target.value))} style={{...I,width:80,fontSize:12,display:"inline",padding:"4px 8px"}}/>
                    </div>
                  </div>
                </div>
              </div>

              {/* Goal progress */}
              {totalWealth>0&&(
                <div style={{...C,position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${GREEN} ${goalPct}%,${MUTED} 0%)`}}/>
                  <div style={{...L,color:GREEN,marginBottom:4}}>Progress to $2.5M Goal</div>
                  <div style={{display:"flex",alignItems:"baseline",gap:12,marginBottom:10}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:44,color:GREEN,letterSpacing:1,lineHeight:1}}>{goalPct.toFixed(1)}%</div>
                    <div style={{color:DIM,fontSize:13}}>{fmt(totalWealth)} of {fmt(goal)}</div>
                  </div>
                  <div style={{height:8,background:MUTED,borderRadius:4,overflow:"hidden",marginBottom:10}}>
                    <div style={{width:`${goalPct}%`,height:"100%",background:`linear-gradient(90deg,${GREEN},${BLUE})`,borderRadius:4,transition:"width 0.6s"}}/>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:11,marginTop:14}}>
                    {[
                      ["Remaining to Goal",fmt(Math.max(goal-totalWealth,0)),GOLD],
                      ["Months Invested",monthsInvested+" months",BLUE],
                      ["Years Left",yearsLeft.toFixed(1)+" years",DIM],
                    ].map(([lbl,v,c])=>(
                      <div key={lbl}>
                        <div style={L}>{lbl}</div>
                        <div style={{fontFamily:"'IBM Plex Mono',monospace",color:c,fontSize:16,fontWeight:500}}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gold projection */}
              {goldValue>0&&(
                <div style={{...C,border:`1px solid #ffd54f30`,background:"#ffd54f06"}}>
                  <div style={{...L,color:"#ffd54f",marginBottom:4}}>Gold Portfolio — 20 Year Projection</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
                    {[
                      ["Current Value",fmt(goldValue),"#ffd54f"],
                      ["Monthly DCA",`$${goldMonthly}/mo`,"#ffd54f"],
                      [`Projected (${yearsLeft.toFixed(0)}yr left)`,fmt(goldProjected),"#ffd54f"],
                    ].map(([lbl,v,c])=>(
                      <div key={lbl}>
                        <div style={L}>{lbl}</div>
                        <div style={{fontFamily:"'IBM Plex Mono',monospace",color:c,fontSize:18,fontWeight:500}}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{color:DIM,fontSize:11,marginTop:10}}>Gold projected at ~6% base annual return. Held separately as geopolitical hedge.</div>
                </div>
              )}

              {/* DCA Log */}
              <div style={C}>
                <div style={{...L,marginBottom:14}}>DCA Log — Record Every Monthly Investment</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:10,marginBottom:14,alignItems:"end"}}>
                  <div>
                    <div style={L}>Month</div>
                    <input type="month" value={newDcaDate} onChange={e=>setNewDcaDate(e.target.value)} style={{...I,fontSize:13}}/>
                  </div>
                  <div>
                    <div style={L}>Amount ($)</div>
                    <input type="number" value={newDcaAmt} onChange={e=>setNewDcaAmt(Number(e.target.value))} style={{...I,fontSize:13,color:GREEN}}/>
                  </div>
                  <div>
                    <div style={L}>Note (optional)</div>
                    <input type="text" value={newDcaNote} onChange={e=>setNewDcaNote(e.target.value)} placeholder="e.g. added extra" style={{...I,fontSize:13}}/>
                  </div>
                  <button onClick={()=>{
                    if(!newDcaDate||!newDcaAmt) return;
                    setDcaLog(l=>[...l,{date:newDcaDate,amount:newDcaAmt,note:newDcaNote}].sort((a,b)=>a.date.localeCompare(b.date)));
                    setNewDcaNote("");
                  }} style={{padding:"9px 16px",borderRadius:8,background:GREEN,color:"#060810",border:"none",cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"'IBM Plex Mono',monospace",whiteSpace:"nowrap"}}>
                    + Log
                  </button>
                </div>

                {dcaLog.length>0?(
                  <>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:11,marginBottom:14,padding:"12px 14px",background:SURFACE,borderRadius:10,border:`1px solid ${BORDER}`}}>
                      {[["Months Logged",dcaLog.length,BLUE],["Total DCA'd",fmt(totalDCA),GREEN],["Avg Monthly",fmt(totalDCA/dcaLog.length),GOLD]].map(([lbl,v,c])=>(
                        <div key={lbl}><div style={L}>{lbl}</div><div style={{fontFamily:"'IBM Plex Mono',monospace",color:c,fontSize:18,fontWeight:500}}>{v}</div></div>
                      ))}
                    </div>
                    <div style={{maxHeight:240,overflowY:"auto",display:"grid",gap:6}}>
                      {[...dcaLog].reverse().map((entry,i)=>(
                        <div key={i} style={{display:"grid",gridTemplateColumns:"100px 1fr 1fr auto",alignItems:"center",gap:12,background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:8,padding:"10px 13px"}}>
                          <div style={{fontFamily:"'IBM Plex Mono',monospace",color:GOLD,fontSize:12}}>{entry.date}</div>
                          <div style={{fontFamily:"'IBM Plex Mono',monospace",color:GREEN,fontSize:14,fontWeight:600}}>${entry.amount.toLocaleString()}</div>
                          <div style={{color:DIM,fontSize:12}}>{entry.note||"Regular DCA"}</div>
                          <button onClick={()=>setDcaLog(l=>l.filter((_,j)=>j!==dcaLog.length-1-i))} style={{background:"transparent",border:`1px solid ${MUTED}`,borderRadius:6,color:DIM,cursor:"pointer",padding:"3px 8px",fontSize:11}}>✕</button>
                        </div>
                      ))}
                    </div>
                  </>
                ):(
                  <div style={{textAlign:"center",padding:"28px",color:DIM,fontSize:13}}>
                    No DCA entries yet. Log your first investment above. 🚀<br/>
                    <span style={{fontSize:11,marginTop:6,display:"block"}}>Every entry is a step toward {fmt(goal)}.</span>
                  </div>
                )}
              </div>

              {/* Discipline streak */}
              <div style={{...C,background:`${GREEN}07`,border:`1px solid ${GREEN}25`}}>
                <div style={{...L,color:GREEN,marginBottom:4}}>Discipline Streak</div>
                {dcaLog.length===0?(
                  <div style={{color:DIM,fontSize:13}}>Start logging your DCA to track your streak. The first entry is the hardest.</div>
                ):(
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                    <div>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:44,color:GREEN,letterSpacing:1,lineHeight:1}}>{dcaLog.length} <span style={{fontSize:20}}>months</span></div>
                      <div style={{color:DIM,fontSize:12,marginTop:4}}>of consistent DCA. Keep going — the next 20 years belong to you.</div>
                    </div>
                    <div>
                      <div style={{color:DIM,fontSize:12,lineHeight:1.8}}>
                        {dcaLog.length>=3&&<div style={{color:GREEN}}>✓ Consistency established</div>}
                        {dcaLog.length>=6&&<div style={{color:GREEN}}>✓ 6-month milestone hit</div>}
                        {dcaLog.length>=12&&<div style={{color:GREEN}}>✓ First full year complete 🎉</div>}
                        {dcaLog.length>=24&&<div style={{color:GOLD}}>⭐ 2 years strong</div>}
                        {dcaLog.length>=60&&<div style={{color:GOLD}}>⭐ 5 year veteran</div>}
                        {dcaLog.length<3&&<div style={{color:DIM}}>→ Reach 3 months to establish habit</div>}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Motivation wall */}
              <div style={C}>
                <div style={{...L,marginBottom:14}}>Why You're Doing This — Read This On Red Days</div>
                <div style={{display:"grid",gap:10}}>
                  {[
                    { icon:"🎯", title:"Your Goal", body:`${fmt(goal)} in 20 years. Not a dream — a mathematical certainty if you stay disciplined.` },
                    { icon:"📅", title:"Your Edge", body:"You have time. A 25-year-old investing $1,471/mo will always beat a 45-year-old investing $5,000/mo. Time in the market is the only unfair advantage available to everyone." },
                    { icon:"🧠", title:"When It Drops 40%", body:"That's not a loss. That's a sale. Your $1,471 buys more units than it ever has. The people who got rich from the 2008 crash were the ones who didn't stop." },
                    { icon:"🌏", title:"The Bigger Picture", body:"AI is transforming global productivity. You own the hardware (SMH), the software (CSNDX), the economy (CSPX), and the world (VWRA). You're positioned at every layer of the most important technological shift in history." },
                    { icon:"⏰", title:"The Cost of Stopping", body:`Missing just 12 months of DCA costs you roughly ${fmt(monthly*12*8)} at Year 20 due to lost compounding. One year of patience = eight years of returns.` },
                  ].map((m,i)=>(
                    <div key={i} style={{display:"flex",gap:14,alignItems:"flex-start",background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:10,padding:"14px 16px"}}>
                      <div style={{fontSize:22,flexShrink:0}}>{m.icon}</div>
                      <div>
                        <div style={{color:GOLD,fontSize:12,fontWeight:600,marginBottom:4}}>{m.title}</div>
                        <div style={{color:DIM,fontSize:12,lineHeight:1.7}}>{m.body}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          );
        })()}

        {/* GROWTH */}
        {tab==="Growth"&&(
          <div style={{display:"grid",gap:14}}>
            <div style={C}>
              <div style={{...L,marginBottom:18}}>20-Year Growth Trajectory — All Scenarios</div>
              <ResponsiveContainer width="100%" height={290}>
                <AreaChart data={chartD} margin={{top:10,right:16,left:0,bottom:0}}>
                  <defs>
                    {[["bull",GREEN],["base",GOLD],["bear",RED]].map(([k,c])=>(
                      <linearGradient key={k} id={`g${k}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={c} stopOpacity={0.18}/><stop offset="100%" stopColor={c} stopOpacity={0}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <XAxis dataKey="year" stroke={MUTED} tick={{fill:DIM,fontSize:11}} tickLine={false}/>
                  <YAxis stroke={MUTED} tick={{fill:DIM,fontSize:11}} tickLine={false} tickFormatter={v=>v>=1e6?`${(v/1e6).toFixed(1)}M`:`${(v/1000).toFixed(0)}K`}/>
                  <Tooltip content={<Tip/>}/>
                  <ReferenceLine y={goal} stroke={GOLD} strokeDasharray="5 4" strokeOpacity={0.5} label={{value:"Goal",fill:GOLD,fontSize:10,position:"insideTopRight"}}/>
                  <Area type="monotone" dataKey="bull" stroke={GREEN} strokeWidth={1.5} fill="url(#gbull)" dot={false}/>
                  <Area type="monotone" dataKey="base" stroke={GOLD} strokeWidth={2.5} fill="url(#gbase)" dot={false}/>
                  <Area type="monotone" dataKey="bear" stroke={RED} strokeWidth={1.5} fill="url(#gbear)" dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
              <div style={{display:"flex",gap:20,marginTop:10,flexWrap:"wrap"}}>
                {[["Bull",GREEN,bullR,fBull],["Base",GOLD,baseR,fBase],["Bear",RED,bearR,fBear]].map(([n,c,r,v])=>(
                  <div key={n} style={{display:"flex",alignItems:"center",gap:7}}>
                    <div style={{width:18,height:2,background:c,borderRadius:2}}/>
                    <span style={{color:DIM,fontSize:11}}>{n} ({fmtP(r)}) → <span style={{color:c,fontFamily:"'IBM Plex Mono',monospace"}}>{fmt(v)}</span></span>
                  </div>
                ))}
              </div>
            </div>
            <div style={C}>
              <div style={{...L,marginBottom:14}}>Compounding Milestones · Base</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:11}}>
                {[5,10,15,20].map(y=>{
                  const v=baseD[y]?.value,co=lump+monthly*12*y,g=v-co;
                  return(
                    <div key={y} style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:11,padding:14}}>
                      <div style={L}>Year {y}</div>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color:TEXT,letterSpacing:1}}>{fmt(v)}</div>
                      <div style={{color:GREEN,fontSize:11,marginTop:3,fontFamily:"'IBM Plex Mono',monospace"}}>+{fmt(g)}</div>
                      <div style={{color:DIM,fontSize:10,marginTop:2}}>{(v/co).toFixed(1)}× your money</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STRESS TEST */}
        {tab==="Stress Test"&&(
          <div style={{display:"grid",gap:14}}>
            <div style={C}>
              <div style={{...L,marginBottom:4}}>Crash Simulation — Keep DCA-ing Through It</div>
              <div style={{color:DIM,fontSize:12,marginBottom:18}}>Drag to simulate a crash at any point in your journey.</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:22}}>
                <div>
                  <div style={L}>Crash Hits in Year</div>
                  <input type="range" min={1} max={19} value={crashYr} onChange={e=>setCrashYr(Number(e.target.value))} style={{width:"100%",accentColor:RED}}/>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:RED,letterSpacing:1,marginTop:3}}>Year {crashYr}</div>
                </div>
                <div>
                  <div style={L}>Portfolio Drops</div>
                  <input type="range" min={10} max={80} value={crashDepth} onChange={e=>setCrashDepth(Number(e.target.value))} style={{width:"100%",accentColor:RED}}/>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:RED,letterSpacing:1,marginTop:3}}>−{crashDepth}%</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stressD.map((d,i)=>({...d,normal:baseD[i]?.value}))} margin={{top:10,right:16,left:0,bottom:0}}>
                  <XAxis dataKey="year" stroke={MUTED} tick={{fill:DIM,fontSize:11}} tickLine={false}/>
                  <YAxis stroke={MUTED} tick={{fill:DIM,fontSize:11}} tickLine={false} tickFormatter={v=>v>=1e6?`${(v/1e6).toFixed(1)}M`:`${(v/1000).toFixed(0)}K`}/>
                  <Tooltip content={<Tip/>}/>
                  <ReferenceLine y={goal} stroke={GOLD} strokeDasharray="5 4" strokeOpacity={0.4}/>
                  <ReferenceLine x={crashYr} stroke={RED} strokeDasharray="3 3" strokeOpacity={0.7} label={{value:"↓ Crash",fill:RED,fontSize:10,position:"insideTopLeft"}}/>
                  <Line type="monotone" dataKey="normal" stroke={GOLD} strokeWidth={1.5} dot={false} strokeDasharray="5 3" strokeOpacity={0.5}/>
                  <Line type="monotone" dataKey="stress" stroke={RED} strokeWidth={2.5} dot={false}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:11}}>
              {[["Year "+years+" Outcome",fmt(stressFinal),stressFinal>=goal?GREEN:RED],["Cost of Crash","−"+fmt(fBase-stressFinal),RED],[stressFinal>=goal?"✓ Goal Met":"✗ Goal Missed",stressFinal>=goal?`Surplus ${fmt(stressFinal-goal)}`:`Short ${fmt(goal-stressFinal)}`,stressFinal>=goal?GREEN:RED]].map(([lbl,v,c])=>(
                <div key={lbl} style={{...C,border:`1px solid ${c}30`,background:`${c}07`}}>
                  <div style={L}>{lbl}</div>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color:c,letterSpacing:1}}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{...C,background:`${GREEN}07`,border:`1px solid ${GREEN}20`}}>
              <div style={{color:GREEN,fontWeight:600,fontSize:13,marginBottom:7}}>Why DCA investors win through crashes</div>
              <div style={{color:DIM,fontSize:12,lineHeight:1.75}}>A −{crashDepth}% crash in year {crashYr} means your ${monthly.toLocaleString()}/mo buys <strong style={{color:TEXT}}>{(100/(100-crashDepth)).toFixed(1)}× more units</strong> at depressed prices. Disciplined DCA investors who kept buying through 2000–2003 and 2008–2009 <span style={{color:GREEN}}>outperformed those who paused.</span></div>
            </div>
          </div>
        )}

        {/* CRASH MONITOR */}
        {tab==="Crash Monitor"&&(()=>{
          const sigs=Object.entries(prices).map(([k,price])=>{
            const athP=ath[k]||price;
            const drop=price>=athP?0:((athP-price)/athP)*100;
            const sig=getSignal(drop,k);
            const recov=price<athP?((athP-price)/price)*100:0;
            return {ticker:k,price,drop,sig,recov,athP};
          });
          const anyBuy=sigs.some(s=>s.sig.deploy>0);
          const totalDeploy=sigs.reduce((sum,s)=>sum+s.sig.deploy,0);
          const wDrop=sigs.reduce((sum,s)=>sum+(s.drop*PORTFOLIO[s.ticker].alloc),0);
          const ov=wDrop>=40?{label:"MAXIMUM BUY",color:RED}:wDrop>=30?{label:"STRONG BUY",color:"#c8963e"}:wDrop>=20?{label:"BUY",color:GREEN}:wDrop>=10?{label:"WATCH",color:"#7986cb"}:{label:"HOLD — DCA ONLY",color:DIM};
          return(
            <div style={{display:"grid",gap:14}}>
              <div style={{...C,border:`1px solid ${ov.color}45`,background:`${ov.color}09`,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:0,right:0,fontFamily:"'Bebas Neue',sans-serif",fontSize:80,color:`${ov.color}07`,lineHeight:1,pointerEvents:"none",userSelect:"none"}}>{ov.label}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr auto",alignItems:"center",gap:16}}>
                  <div>
                    <div style={L}>Portfolio Signal — Live Prices via Yahoo Finance</div>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:40,color:ov.color,letterSpacing:2,lineHeight:1}}>{ov.label}</div>
                    <div style={{color:DIM,fontSize:12,marginTop:5}}>Weighted drop from ATH: <span style={{color:ov.color,fontFamily:"'IBM Plex Mono',monospace"}}>{wDrop.toFixed(1)}%</span></div>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginTop:6,flexWrap:"wrap"}}>
                      {lastLiveFetch&&<div style={{color:GREEN,fontSize:10,fontFamily:"'IBM Plex Mono',monospace"}}>● Updated: {lastLiveFetch}</div>}
                      {liveError&&<div style={{color:RED,fontSize:10,fontFamily:"'IBM Plex Mono',monospace"}}>⚠ {liveError}</div>}
                      <div style={{fontSize:9,color:DIM,fontFamily:"'IBM Plex Mono',monospace"}}>VT·QQQ·SPY·SMH proxies</div>
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:10}}>
                    <button onClick={fetchLivePrices} disabled={liveLoading} style={{padding:"8px 16px",borderRadius:8,background:liveLoading?MUTED:GREEN,color:"#060810",border:"none",cursor:liveLoading?"not-allowed":"pointer",fontWeight:700,fontSize:11,fontFamily:"'IBM Plex Mono',monospace",whiteSpace:"nowrap"}}>
                      {liveLoading?"Fetching...":"⟳ Refresh Prices"}
                    </button>
                    <div style={{textAlign:"right"}}>
                      <div style={L}>Suggested Deploy</div>
                      <div style={{fontFamily:"'IBM Plex Mono',monospace",color:anyBuy?ov.color:DIM,fontSize:24,fontWeight:500}}>{anyBuy?`$${totalDeploy.toLocaleString()}`:"—"}</div>
                      <div style={{color:DIM,fontSize:11,marginTop:3}}>from war chest</div>
                    </div>
                  </div>
                </div>
              </div>

              {sigs.map(({ticker,price,drop,sig,recov,athP})=>{
                const etf=PORTFOLIO[ticker];
                const live=liveData[ticker];
                const proxyMap={VWRA:"VT",CSNDX:"QQQ",CSPX:"SPY",SMH:"SMH"};
                return(
                  <div key={ticker} style={{...C,border:`1px solid ${sig.deploy>0?sig.color+"40":BORDER}`,background:sig.deploy>0?`${sig.color}06`:CARD}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:18,alignItems:"start"}}>
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:6}}>
                          <span style={{fontFamily:"'IBM Plex Mono',monospace",color:etf.color,fontSize:15,fontWeight:600}}>{ticker}</span>
                          <span style={{color:DIM,fontSize:11}}>{etf.label}</span>
                          <span style={{fontSize:9,color:DIM,background:MUTED+"40",padding:"1px 6px",borderRadius:4,fontFamily:"'IBM Plex Mono',monospace"}}>{proxyMap[ticker]}</span>
                        </div>
                        {live&&!live.error&&(
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                            <span style={{color:parseFloat(live.change)>=0?GREEN:RED,fontSize:11,fontFamily:"'IBM Plex Mono',monospace",background:parseFloat(live.change)>=0?`${GREEN}15`:`${RED}15`,padding:"2px 7px",borderRadius:6}}>
                              {parseFloat(live.change)>=0?"+":""}{live.change}% today
                            </span>
                            <span style={{color:DIM,fontSize:9,fontFamily:"'IBM Plex Mono',monospace"}}>{live.marketState}</span>
                          </div>
                        )}
                        <div style={L}>Current Price (USD)</div>
                        <input type="number" step="0.01" value={price}
                          onChange={e=>{setPrices(p=>({...p,[ticker]:parseFloat(e.target.value)||0}));setLastChecked(new Date().toLocaleString("en-SG"));}}
                          style={{...I,fontSize:16,color:etf.color,fontWeight:600,width:150}}/>
                        <div style={{color:DIM,fontSize:10,marginTop:5,fontFamily:"'IBM Plex Mono',monospace"}}>ATH: ${athP.toFixed(2)}</div>
                      </div>
                      <div>
                        <div style={L}>Drop from ATH</div>
                        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:36,color:drop===0?GREEN:sig.color,letterSpacing:1,lineHeight:1}}>{drop===0?"AT ATH":`−${drop.toFixed(1)}%`}</div>
                        <div style={{height:5,background:MUTED,borderRadius:4,overflow:"hidden",marginTop:7,maxWidth:150}}>
                          <div style={{width:`${Math.min((drop/60)*100,100)}%`,height:"100%",borderRadius:4,background:drop<10?DIM:drop<20?"#7986cb":drop<30?"#4fc3f7":drop<40?GREEN:drop<50?"#c8963e":RED,transition:"width 0.4s"}}/>
                        </div>
                        {drop>0&&<div style={{color:DIM,fontSize:10,marginTop:4,fontFamily:"'IBM Plex Mono',monospace"}}>Needs +{recov.toFixed(1)}% to recover</div>}
                      </div>
                      <div>
                        <div style={L}>Signal</div>
                        <div style={{display:"inline-block",padding:"4px 11px",borderRadius:8,background:`${sig.color}20`,border:`1px solid ${sig.color}45`,fontFamily:"'IBM Plex Mono',monospace",color:sig.color,fontSize:11,fontWeight:600,marginBottom:7}}>{sig.label}</div>
                        {sig.deploy>0
                          ?<><div style={{fontFamily:"'IBM Plex Mono',monospace",color:sig.color,fontSize:20,fontWeight:600}}>+${sig.deploy.toLocaleString()}</div><div style={{color:DIM,fontSize:11,marginTop:2}}>{sig.action}</div></>
                          :<div style={{color:DIM,fontSize:12}}>Continue DCA only<br/>${Math.round(monthly*etf.alloc)}/mo</div>
                        }
                      </div>
                    </div>
                  </div>
                );
              })}

              <div style={C}>
                <div style={{...L,marginBottom:13}}>Update All-Time Highs</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:11}}>
                  {Object.keys(PORTFOLIO).map(k=>(
                    <div key={k} style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:10,padding:13}}>
                      <div style={{...L,color:PORTFOLIO[k].color}}>{k} ATH ({ATH_INIT[k].currency})</div>
                      <input type="number" step="0.01" value={ath[k]}
                        onChange={e=>setAth(a=>({...a,[k]:parseFloat(e.target.value)||a[k]}))}
                        style={{...I,fontSize:14,color:PORTFOLIO[k].color}}/>
                      <div style={{color:DIM,fontSize:10,marginTop:5,fontFamily:"'IBM Plex Mono',monospace"}}>{ATH_INIT[k].exchange} · {ATH_INIT[k].currency}</div>
                    </div>
                  ))}
                </div>
                <div style={{color:DIM,fontSize:11,marginTop:11}}>↑ Update whenever a new ATH is set. Check on <span style={{color:BLUE}}>tradingview.com</span> or your broker app.</div>
              </div>

              <div style={{...C,background:`${GREEN}06`,border:`1px solid ${GREEN}25`}}>
                <div style={{...L,color:GREEN,marginBottom:13}}>SSB War Chest Status</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
                  <div>
                    <div style={L}>Current War Chest ($)</div>
                    <input type="number" step="500" min={0} max={50000} value={warChest} onChange={e=>setWarChest(Number(e.target.value))} style={{...I,fontSize:17,color:GREEN}}/>
                    <input type="range" min={0} max={20000} step={500} value={warChest} onChange={e=>setWarChest(Number(e.target.value))} style={{width:"100%",marginTop:7,accentColor:GREEN}}/>
                  </div>
                  <div>
                    <div style={L}>Progress to $20K Target</div>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:36,color:warChest>=20000?GREEN:GOLD,letterSpacing:1,lineHeight:1}}>{Math.min(((warChest/20000)*100),100).toFixed(0)}%</div>
                    <div style={{height:5,background:MUTED,borderRadius:4,overflow:"hidden",marginTop:7}}>
                      <div style={{width:`${Math.min((warChest/20000)*100,100)}%`,height:"100%",background:warChest>=20000?GREEN:GOLD,borderRadius:4,transition:"width 0.4s"}}/>
                    </div>
                    <div style={{color:DIM,fontSize:11,marginTop:5}}>{warChest>=20000?"✓ War chest fully loaded. Ready to deploy.":`$${(20000-warChest).toLocaleString()} remaining`}</div>
                    {anyBuy&&warChest<totalDeploy&&<div style={{color:RED,fontSize:11,marginTop:4}}>⚠ Signal: deploy ${totalDeploy.toLocaleString()} — you have ${warChest.toLocaleString()}. Deploy what you can.</div>}
                  </div>
                </div>
              </div>

              <div style={{color:MUTED,fontSize:10,textAlign:"center",fontFamily:"'IBM Plex Mono',monospace"}}>MANUALLY ENTERED · NOT LIVE DATA · VERIFY ON TRADINGVIEW OR YOUR BROKER · NOT FINANCIAL ADVICE</div>
            </div>
          );
        })()}

        {/* REBALANCE */}
        {tab==="Rebalance"&&(()=>{
          const total=Object.values(holdings).reduce((s,v)=>s+v,0);
          const allocs=Object.entries(PORTFOLIO).map(([k,v])=>{
            const cur=holdings[k]||0;
            const curP=total>0?(cur/total)*100:0;
            const tgtP=v.alloc*100;
            const tgtV=total*v.alloc;
            const diff=cur-tgtV;
            const drift=curP-tgtP;
            return {ticker:k,cur,curP,tgtP,tgtV,diff,drift,needsAction:Math.abs(drift)>=5,action:diff>0?"SELL":"BUY",color:v.color,label:v.label};
          });
          const isDrifted=allocs.some(a=>a.needsAction);
          const nextRebal=(()=>{ const d=new Date(); d.setFullYear(d.getFullYear()+1); return d.toLocaleDateString("en-SG",{day:"numeric",month:"long",year:"numeric"}); })();
          return(
            <div style={{display:"grid",gap:14}}>
              <div style={{...C,background:`${GOLD}07`,border:`1px solid ${GOLD}25`}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr auto",alignItems:"start",gap:18,flexWrap:"wrap"}}>
                  <div>
                    <div style={{...L,color:GOLD}}>Annual Rebalancing Calculator</div>
                    <div style={{fontSize:14,fontWeight:500,lineHeight:1.6,marginTop:4}}>Enter your current portfolio values. See exactly what to sell and buy to restore your target allocation.</div>
                    <div style={{color:DIM,fontSize:12,marginTop:7}}>Trigger: any ETF drifts <span style={{color:GOLD}}>±5%</span> from target. Rebalance once per year on the same date.</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={L}>Next Rebalance Date</div>
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",color:GOLD,fontSize:12}}>{nextRebal}</div>
                    <div style={{color:DIM,fontSize:10,marginTop:3}}>Set a calendar reminder</div>
                  </div>
                </div>
              </div>

              <div style={C}>
                <div style={{...L,marginBottom:14}}>Enter Current Holding Values (USD)</div>
                <div style={{display:"grid",gap:9}}>
                  {Object.entries(PORTFOLIO).map(([k,v])=>(
                    <div key={k} style={{display:"grid",gridTemplateColumns:"100px 1fr 120px",alignItems:"center",gap:13,background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:10,padding:"12px 14px"}}>
                      <div>
                        <div style={{fontFamily:"'IBM Plex Mono',monospace",color:v.color,fontSize:14,fontWeight:600}}>{k}</div>
                        <div style={{color:DIM,fontSize:10,marginTop:2}}>{v.label}</div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{color:DIM,fontFamily:"'IBM Plex Mono',monospace"}}>$</span>
                        <input type="number" min={0} step={100} value={holdings[k]||""} placeholder="0"
                          onChange={e=>setHoldings(h=>({...h,[k]:parseFloat(e.target.value)||0}))}
                          style={{...I,fontSize:15,color:v.color}}/>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{color:DIM,fontSize:10,fontFamily:"'IBM Plex Mono',monospace"}}>Target {(v.alloc*100).toFixed(0)}%</div>
                        {total>0&&<div style={{color:v.color,fontSize:13,fontFamily:"'IBM Plex Mono',monospace",marginTop:2}}>${(total*v.alloc).toLocaleString(undefined,{maximumFractionDigits:0})}</div>}
                      </div>
                    </div>
                  ))}
                </div>
                {total>0&&(
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:14,paddingTop:14,borderTop:`1px solid ${BORDER}`}}>
                    <div style={{color:DIM,fontSize:13}}>Total Portfolio Value</div>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:TEXT,letterSpacing:1}}>{fmt(total)}</div>
                  </div>
                )}
              </div>

              {total>0&&(
                <>
                  <div style={{...C,border:`1px solid ${isDrifted?GOLD:GREEN}40`,background:isDrifted?`${GOLD}08`:`${GREEN}08`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:11}}>
                      <div>
                        <div style={{color:isDrifted?GOLD:GREEN,fontSize:13,fontWeight:600}}>{isDrifted?"⚠ Rebalancing needed — allocation has drifted ±5%":"✓ Portfolio balanced — no action needed"}</div>
                        <div style={{color:DIM,fontSize:12,marginTop:3}}>{isDrifted?"Follow the actions below to restore target allocation.":"All ETFs within ±5% of target. Continue DCA as normal."}</div>
                      </div>
                      {isDrifted&&(
                        <div style={{display:"flex",gap:7}}>
                          {["sell","buy"].map(m=>(
                            <button key={m} onClick={()=>setRebalMode(m)} style={{padding:"5px 12px",borderRadius:8,fontSize:11,cursor:"pointer",fontFamily:"'IBM Plex Mono',monospace",fontWeight:600,textTransform:"uppercase",background:rebalMode===m?GOLD:"transparent",color:rebalMode===m?"#0a0c10":DIM,border:`1px solid ${rebalMode===m?GOLD:BORDER}`}}>{m==="sell"?"Sell to rebalance":"Buy only"}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={C}>
                    <div style={{...L,marginBottom:14}}>Current vs Target Allocation</div>
                    <div style={{display:"grid",gap:13}}>
                      {allocs.map(a=>(
                        <div key={a.ticker}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                            <div style={{display:"flex",alignItems:"center",gap:9}}>
                              <span style={{fontFamily:"'IBM Plex Mono',monospace",color:a.color,fontSize:13,fontWeight:600}}>{a.ticker}</span>
                              {a.needsAction&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:4,background:a.action==="SELL"?`${RED}20`:`${GREEN}20`,color:a.action==="SELL"?RED:GREEN,fontFamily:"'IBM Plex Mono',monospace",fontWeight:600}}>{a.action} ${Math.abs(a.diff).toLocaleString(undefined,{maximumFractionDigits:0})}</span>}
                            </div>
                            <div style={{display:"flex",gap:12,alignItems:"center"}}>
                              <span style={{color:DIM,fontSize:11,fontFamily:"'IBM Plex Mono',monospace"}}>Now: <span style={{color:a.needsAction?(a.drift>0?RED:GREEN):TEXT}}>{a.curP.toFixed(1)}%</span></span>
                              <span style={{color:DIM,fontSize:11,fontFamily:"'IBM Plex Mono',monospace"}}>Target: <span style={{color:a.color}}>{a.tgtP.toFixed(0)}%</span></span>
                              <span style={{color:a.drift>0?RED:a.drift<0?GREEN:DIM,fontSize:11,fontFamily:"'IBM Plex Mono',monospace"}}>{a.drift>0?"+":""}{a.drift.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div style={{height:7,background:MUTED,borderRadius:4,overflow:"hidden",position:"relative"}}>
                            <div style={{position:"absolute",left:`${a.tgtP}%`,top:0,bottom:0,width:2,background:a.color,opacity:0.5,zIndex:2}}/>
                            <div style={{width:`${Math.min(a.curP,100)}%`,height:"100%",borderRadius:4,background:a.needsAction?(a.drift>0?`linear-gradient(90deg,${a.color},${RED})`:`linear-gradient(90deg,${a.color},${GREEN})`):a.color,transition:"width 0.5s"}}/>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {isDrifted&&(
                    <div style={C}>
                      <div style={{...L,marginBottom:14}}>{rebalMode==="sell"?"Sell Overweight → Buy Underweight":"Buy Underweight Only (no selling)"}</div>
                      <div style={{display:"grid",gap:9}}>
                        {allocs.filter(a=>a.needsAction).map(a=>{
                          const isSell=a.diff>0;
                          if(rebalMode==="buy"&&isSell) return null;
                          return(
                            <div key={a.ticker} style={{display:"grid",gridTemplateColumns:"90px 1fr auto",alignItems:"center",gap:14,background:isSell?`${RED}08`:`${GREEN}08`,border:`1px solid ${isSell?RED:GREEN}30`,borderRadius:10,padding:"13px 15px"}}>
                              <div>
                                <div style={{fontFamily:"'IBM Plex Mono',monospace",color:a.color,fontSize:13,fontWeight:600}}>{a.ticker}</div>
                                <div style={{color:isSell?RED:GREEN,fontSize:10,marginTop:2,fontWeight:600}}>{a.action}</div>
                              </div>
                              <div>
                                <div style={{color:TEXT,fontSize:13}}>{isSell?`Sell $${Math.abs(a.diff).toLocaleString(undefined,{maximumFractionDigits:0})} of ${a.ticker}`:`Buy $${Math.abs(a.diff).toLocaleString(undefined,{maximumFractionDigits:0})} of ${a.ticker}`}</div>
                                <div style={{color:DIM,fontSize:11,marginTop:2}}>Bring {a.ticker} from {a.curP.toFixed(1)}% → {a.tgtP.toFixed(0)}% · Target: ${a.tgtV.toLocaleString(undefined,{maximumFractionDigits:0})}</div>
                              </div>
                              <div style={{fontFamily:"'IBM Plex Mono',monospace",color:isSell?RED:GREEN,fontSize:19,fontWeight:600,textAlign:"right"}}>{isSell?"−":"+"}${Math.abs(a.diff).toLocaleString(undefined,{maximumFractionDigits:0})}</div>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{marginTop:13,padding:"11px 13px",background:SURFACE,borderRadius:10,border:`1px solid ${BORDER}`}}>
                        <div style={{color:GOLD,fontSize:12,fontWeight:600,marginBottom:3}}>{rebalMode==="sell"?"Sell method — classic rebalancing":"Buy-only method — no selling"}</div>
                        <div style={{color:DIM,fontSize:11,lineHeight:1.7}}>{rebalMode==="sell"?"Sell overweight ETFs and use proceeds to buy underweight. Singapore has no CGT — selling is completely fine.":"Only buy underweight ETFs. Takes longer but avoids any selling friction. Good for deploying new DCA or war chest cash."}</div>
                      </div>
                    </div>
                  )}

                  <div style={{...C,border:`1px solid ${BLUE}20`,background:`${BLUE}06`}}>
                    <div style={{...L,color:BLUE,marginBottom:13}}>Rebalancing Rules</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                      {[["Once a year only","Same date every year. Over-rebalancing adds unnecessary costs."],["5% drift threshold","Only act when any ETF drifts ±5% from target. Ignore noise."],["Singapore: no CGT","Sell and rebalance freely — no capital gains tax applies."],["Don't time the market","Rebalance on schedule regardless of market conditions."],["DCA micro-rebalances","Buying underweight ETFs monthly reduces manual rebalance frequency."],["Keep records","Note date and amounts after each rebalance for your own records."]].map(([t,d])=>(
                        <div key={t} style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:9,padding:"11px 13px"}}>
                          <div style={{color:BLUE,fontSize:11,fontWeight:600,marginBottom:3}}>{t}</div>
                          <div style={{color:DIM,fontSize:11,lineHeight:1.6}}>{d}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {total===0&&(
                <div style={{...C,textAlign:"center",padding:44}}>
                  <div style={{fontSize:34,marginBottom:12}}>📊</div>
                  <div style={{color:DIM,fontSize:14}}>Enter your current portfolio values above to see rebalancing recommendations</div>
                </div>
              )}
            </div>
          );
        })()}

        {/* BUY PLAYBOOK */}
        {tab==="Buy Playbook"&&(
          <div style={{display:"grid",gap:14}}>
            <div style={{...C,background:`${RED}07`,border:`1px solid ${RED}25`,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,right:0,fontFamily:"'Bebas Neue',sans-serif",fontSize:110,color:`${RED}06`,lineHeight:1,pointerEvents:"none",userSelect:"none"}}>BUY</div>
              <div style={{...L,color:RED}}>Crash Buy Playbook — Singapore Investor</div>
              <div style={{fontSize:15,fontWeight:500,lineHeight:1.5,maxWidth:540}}>When the market drops, most people panic and sell. <span style={{color:RED}}>You buy.</span></div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:11,marginTop:18}}>
                {[["War Chest Target","$20,000",GREEN],["SSB Yield","~2%/yr",GOLD],["Redemption","~4 weeks",BLUE]].map(([lbl,v,c])=>(
                  <div key={lbl} style={{background:`${c}10`,border:`1px solid ${c}25`,borderRadius:10,padding:"11px 13px"}}>
                    <div style={{...L,color:c}}>{lbl}</div>
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",color:c,fontSize:19,fontWeight:500}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={C}>
              <div style={{...L,marginBottom:14}}>Market Drop Tiers — What To Do</div>
              <div style={{display:"grid",gap:7}}>
                {TIERS.map((t,i)=>(
                  <div key={i} style={{display:"grid",gridTemplateColumns:"88px 1fr 1fr auto",alignItems:"center",gap:13,background:i===0?"transparent":`${t.color}08`,border:`1px solid ${i===0?BORDER:t.color+"30"}`,borderRadius:9,padding:"12px 14px"}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:19,color:t.color,letterSpacing:1}}>{t.drop}</div>
                    <div><div style={{color:TEXT,fontSize:12,fontWeight:500}}>{t.action}</div><div style={{color:DIM,fontSize:11,marginTop:2}}>{t.freq}</div></div>
                    <div style={{display:"flex",gap:3,alignItems:"center"}}>{Array.from({length:6}).map((_,j)=><div key={j} style={{width:7,height:7,borderRadius:2,background:j<t.intensity?t.color:MUTED}}/>)}</div>
                    <div style={{textAlign:"right",fontFamily:"'IBM Plex Mono',monospace",color:t.topup?t.color:DIM,fontSize:13,fontWeight:500}}>{t.topup?`+$${t.topup.toLocaleString()}`:"DCA only"}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={C}>
              <div style={{...L,marginBottom:14}}>Per-ETF Buy Thresholds</div>
              <div style={{display:"grid",gap:11}}>
                {Object.entries(ETF_PB).map(([k,v])=>(
                  <div key={k} style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:11,padding:15}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}>
                      <span style={{fontFamily:"'IBM Plex Mono',monospace",color:v.color,fontSize:14,fontWeight:600}}>{k}</span>
                      <span style={{color:DIM,fontSize:11}}>{PORTFOLIO[k].label}</span>
                    </div>
                    <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:9}}>
                      {v.thresholds.map((thr,i)=>(
                        <div key={i} style={{padding:"5px 10px",borderRadius:8,background:v.amounts[i]===0?MUTED+"30":`${v.color}15`,border:`1px solid ${v.amounts[i]===0?MUTED:v.color+"40"}`}}>
                          <div style={{color:v.amounts[i]===0?DIM:v.color,fontSize:11,fontFamily:"'IBM Plex Mono',monospace"}}>−{thr}%</div>
                          <div style={{color:v.amounts[i]===0?DIM:TEXT,fontSize:12,fontWeight:500,marginTop:2}}>{v.amounts[i]===0?"Hold":`+$${v.amounts[i].toLocaleString()}`}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{color:DIM,fontSize:11,fontStyle:"italic"}}>→ {v.note}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={C}>
              <div style={{...L,marginBottom:14}}>SSB War Chest — How to Deploy</div>
              {SSB_STEPS.map((s,i)=>(
                <div key={i} style={{display:"flex",gap:14,alignItems:"flex-start"}}>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                    <div style={{width:32,height:32,borderRadius:"50%",background:`${s.color}20`,border:`2px solid ${s.color}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <span style={{fontFamily:"'IBM Plex Mono',monospace",color:s.color,fontSize:12,fontWeight:700}}>{i+1}</span>
                    </div>
                    {i<SSB_STEPS.length-1&&<div style={{width:2,height:26,background:`${s.color}30`,margin:"3px 0"}}/>}
                  </div>
                  <div style={{paddingBottom:i<SSB_STEPS.length-1?5:0}}>
                    <div style={{display:"flex",gap:9,alignItems:"center",marginBottom:3}}>
                      <span style={{color:s.color,fontSize:12,fontWeight:600}}>{s.phase}</span>
                      <span style={{color:DIM,fontSize:10,fontFamily:"'IBM Plex Mono',monospace",background:MUTED+"40",padding:"1px 7px",borderRadius:4}}>{s.time}</span>
                    </div>
                    <div style={{color:TEXT,fontSize:13}}>{s.action}</div>
                    <div style={{color:DIM,fontSize:11,marginTop:2}}>{s.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={C}>
              <div style={{...L,marginBottom:13}}>The 6 Rules — For When It Feels Terrifying</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                {RULES6.map((r,i)=>(
                  <div key={i} style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:9,padding:"12px 13px"}}>
                    <div style={{fontSize:17,marginBottom:5}}>{r.icon}</div>
                    <div style={{color:TEXT,fontSize:12,fontWeight:600,marginBottom:3}}>{r.title}</div>
                    <div style={{color:DIM,fontSize:11,lineHeight:1.6}}>{r.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AI THESIS */}
        {tab==="AI Thesis"&&(
          <div style={{display:"grid",gap:14}}>
            <div style={{...C,background:`${BLUE}06`,border:`1px solid ${BLUE}20`}}>
              <div style={{...L,color:BLUE}}>Your Investment Thesis</div>
              <div style={{fontSize:17,fontWeight:500,lineHeight:1.6,marginTop:4}}>AI will drive the greatest productivity expansion in human history over the next 20 years. This portfolio captures every layer of that transformation.</div>
            </div>
            <div style={{display:"grid",gap:11}}>
              {AI_LAYERS.map((l,i)=>(
                <div key={l.key} style={{...C,borderLeft:`3px solid ${l.color}`,display:"grid",gridTemplateColumns:"90px 1fr auto",alignItems:"center",gap:18}}>
                  <div>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:21,color:l.color,letterSpacing:1}}>{l.key}</div>
                    <div style={{color:DIM,fontSize:10,fontFamily:"'IBM Plex Mono',monospace"}}>Layer {i+1}</div>
                  </div>
                  <div>
                    <div style={{color:l.color,fontSize:12,fontWeight:600,marginBottom:3}}>{l.layer}</div>
                    <div style={{color:DIM,fontSize:12}}>{l.desc}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",color:l.color,fontSize:16}}>{(PORTFOLIO[l.key].alloc*100).toFixed(0)}%</div>
                    <div style={{color:DIM,fontSize:10,marginTop:2}}>${Math.round(monthly*PORTFOLIO[l.key].alloc)}/mo</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
              <div style={{...C,background:`${GREEN}07`}}>
                <div style={{...L,color:GREEN}}>Why This Holds 20 Years</div>
                {["AI S-curve is early — still in the infrastructure phase","Semiconductor demand compounds with every new AI application","VWRA captures AI spillover as productivity spreads globally","S&P 500 earnings rise as every sector gets AI-transformed"].map((t,i)=>(
                  <div key={i} style={{display:"flex",gap:9,alignItems:"flex-start",marginTop:8}}>
                    <span style={{color:GREEN,fontSize:13}}>→</span>
                    <span style={{color:DIM,fontSize:12,lineHeight:1.5}}>{t}</span>
                  </div>
                ))}
              </div>
              <div style={{...C,background:`${RED}07`}}>
                <div style={{...L,color:RED}}>Risks to the Thesis</div>
                {["AI winter — technology plateaus before mass productivity impact","Geopolitical chip war disrupts semiconductor supply chains","Regulatory crackdown breaks up Nasdaq mega-caps","New paradigm displaces current AI architecture entirely"].map((t,i)=>(
                  <div key={i} style={{display:"flex",gap:9,alignItems:"flex-start",marginTop:8}}>
                    <span style={{color:RED,fontSize:13}}>→</span>
                    <span style={{color:DIM,fontSize:12,lineHeight:1.5}}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PORTFOLIO */}
        {tab==="Portfolio"&&(
          <div style={{display:"grid",gap:14}}>
            <div style={C}>
              <div style={{...L,marginBottom:18}}>Final Confirmed 4-ETF Allocation</div>
              <div style={{display:"grid",gap:11}}>
                {Object.entries(PORTFOLIO).map(([k,v])=>(
                  <div key={k} style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:11,padding:15}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
                      <div style={{display:"flex",alignItems:"center",gap:9,flexWrap:"wrap"}}>
                        <span style={{fontFamily:"'IBM Plex Mono',monospace",color:v.color,fontSize:15,fontWeight:600}}>{k}</span>
                        <span style={{color:DIM,fontSize:12}}>{v.label}</span>
                        {k!=="SMH"&&<span style={{fontSize:10,color:GREEN,background:`${GREEN}15`,padding:"2px 8px",borderRadius:10,fontFamily:"'IBM Plex Mono',monospace"}}>🇮🇪 UCITS ✓</span>}
                        {k==="SMH"&&<span style={{fontSize:10,color:"#ff8a65",background:"#ff8a6515",padding:"2px 8px",borderRadius:10,fontFamily:"'IBM Plex Mono',monospace"}}>🇺🇸 US-domiciled ⚠</span>}
                      </div>
                      <span style={{fontFamily:"'IBM Plex Mono',monospace",color:v.color,fontSize:17,fontWeight:500}}>{(v.alloc*100).toFixed(0)}%</span>
                    </div>
                    <div style={{height:5,background:MUTED,borderRadius:4,overflow:"hidden",marginBottom:9}}>
                      <div style={{width:`${v.alloc*100}%`,height:"100%",background:v.color,borderRadius:4}}/>
                    </div>
                    <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                      {[["Monthly",`$${Math.round(monthly*v.alloc)}`,TEXT],["TER",`${v.ter}%`,DIM],["Bear",`${v.bear}%`,RED],["Base",`${v.base}%`,GOLD],["Bull",`${v.bull}%`,GREEN]].map(([lbl,val,c])=>(
                        <div key={lbl}><span style={{color:DIM,fontSize:11}}>{lbl}: </span><span style={{color:c,fontSize:11,fontFamily:"'IBM Plex Mono',monospace"}}>{val}</span></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:11,marginTop:15,paddingTop:15,borderTop:`1px solid ${BORDER}`}}>
                {[["Blended TER",fmtP(BLENDED_TER),GREEN],["Base Return",fmtP(baseR),GOLD],["Monthly DCA",`$${monthly.toLocaleString()}`,BLUE]].map(([lbl,v,c])=>(
                  <div key={lbl}><div style={L}>{lbl}</div><div style={{fontFamily:"'IBM Plex Mono',monospace",color:c,fontSize:19}}>{v}</div></div>
                ))}
              </div>
            </div>
            <div style={{...C,border:"1px solid #ff8a6530",background:"#ff8a6506"}}>
              <div style={{color:"#ff8a65",fontSize:12,fontWeight:600,marginBottom:7}}>⚠ SMH Tax Note — Singapore Resident</div>
              <div style={{color:DIM,fontSize:12,lineHeight:1.7}}>SMH is US-domiciled. Dividends face <strong style={{color:TEXT}}>30% withholding tax</strong> vs 15% for Ireland UCITS. US estate tax applies on holdings exceeding <strong style={{color:TEXT}}>$60,000</strong> — monitor your SMH position size. All other ETFs are Ireland-domiciled UCITS. Singapore has <strong style={{color:TEXT}}>no capital gains tax</strong>.</div>
            </div>
            <div style={{...C,border:`1px solid ${GREEN}25`,background:`${GREEN}06`}}>
              <div style={{color:GREEN,fontSize:12,fontWeight:600,marginBottom:7}}>✓ CSNDX Confirmed Details</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginTop:4}}>
                {[["Exchange","EBS / SIX Swiss"],["Currency","USD ✓"],["Domicile","Ireland 🇮🇪"],["Share Class","Accumulating ✓"],["AUM","$23 Billion"],["TER","0.20%"],["WHT Rate","15% (IE-US treaty)"],["Launch","Jan 2010"]].map(([l,v])=>(
                  <div key={l} style={{background:SURFACE,border:`1px solid ${BORDER}`,borderRadius:8,padding:"9px 11px"}}>
                    <div style={{color:DIM,fontSize:10,fontFamily:"'IBM Plex Mono',monospace",marginBottom:3}}>{l}</div>
                    <div style={{color:GREEN,fontSize:12,fontFamily:"'IBM Plex Mono',monospace",fontWeight:500}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{color:MUTED,fontSize:10,textAlign:"center",fontFamily:"'IBM Plex Mono',monospace",letterSpacing:"0.06em"}}>ILLUSTRATIVE ONLY · NOT FINANCIAL ADVICE · PAST PERFORMANCE ≠ FUTURE RESULTS</div>
          </div>
        )}

      </div>
    </div>
  );
}
