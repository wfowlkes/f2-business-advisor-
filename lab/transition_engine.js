/* F2 Learning Lab v1.3 — causal, audit-trailed scenario indicator and shadow-only router. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();
 else root.F2TransitionEngine=factory();
})(typeof self!=='undefined'?self:this,function(){
 'use strict';
 const VERSION='F2 Scenario Transitions 1.3.0';
 const DETECTOR_VERSION='signal-rules-1';
 const MIN_HISTORY=112, CONFIRM_DAYS=3, COOLDOWN_DAYS=14, MIN_DWELL_DAYS=28, BLEND_DAYS=7;
 const REGIMES=Object.freeze(['stable','growth','decline','seasonal','volatile','stepchange','promotion','supply','weekdayshift']);
 const DEFAULT_METHOD='28-day average';
 const dateNum=s=>Date.parse(s+'T00:00:00Z')/86400000;
 const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
 const sum=(a)=>a.reduce((s,x)=>s+x,0);
 const mean=(a)=>a.length?sum(a)/a.length:0;
 const ratio=(a,b)=>b>0?a/b:null;
 const round=n=>Math.round(n*10000)/10000;
 const pct=n=>Math.round(n*100)/100;
 const dow=s=>new Date(s+'T00:00:00Z').getUTCDay();
 function valid(history){
  if(!Array.isArray(history)||history.length<MIN_HISTORY)return 'At least 112 consecutive daily observations are required';
  for(let i=0;i<history.length;i++){
   const x=history[i];
   if(!x||typeof x.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x.date)||!Number.isFinite(dateNum(x.date))||new Date(x.date+'T00:00:00Z').toISOString().slice(0,10)!==x.date)return 'Invalid daily date';
   if(typeof x.net_sales!=='number'||!Number.isFinite(x.net_sales)||x.net_sales<0)return 'Invalid or missing daily net sales';
   if(i&&dateNum(x.date)-dateNum(history[i-1].date)!==1)return 'Missing or duplicated dates';
   for(const name of ['orders','refunds'])if(x[name]!==undefined&&(!Number.isFinite(x[name])||x[name]<0))return 'Invalid '+name;
  }
  return null;
 }
 function stdCV(rows){const vals=rows.map(x=>x.net_sales),m=mean(vals);return m>0?Math.sqrt(mean(vals.map(v=>(v-m)**2)))/m:0;}
 function consecutive(rows){let m=0,n=0;for(const x of rows){n=x.stockout===true?n+1:0;m=Math.max(m,n);}return m;}
 function refundRate(rows){return ratio(sum(rows.map(x=>x.refunds||0)),sum(rows.map(x=>x.net_sales+(x.refunds||0))))||0;}
 function featureEvidence(history){
  const last7=history.slice(-7),last14=history.slice(-14),last28=history.slice(-28),prior28=history.slice(-56,-28),last84=history.slice(-84),prior84=history.slice(-168,-84);
  const have84=prior84.length===84;
  const last56=history.slice(-56),older56=history.slice(-112,-56);
  const weekendFraction=rows=>ratio(sum(rows.filter(x=>[0,6].includes(dow(x.date))).map(x=>x.net_sales)),sum(rows.map(x=>x.net_sales)))||0;
  const lastWeek=weekendFraction(last28),priorWeek=weekendFraction(older56),cv=stdCV(last56),stockoutRate=mean(last56.map(x=>x.stockout===true?1:0));
  const recentRatio=ratio(mean(last7.map(x=>x.net_sales)),mean(history.slice(-35,-7).map(x=>x.net_sales)))||1;
  const level28=ratio(mean(last28.map(x=>x.net_sales)),mean(prior28.map(x=>x.net_sales)))||1;
  const level84=have84?(ratio(mean(last84.map(x=>x.net_sales)),mean(prior84.map(x=>x.net_sales)))||1):1;
  const returns=refundRate(last28),previousReturns=refundRate(history.slice(-112,-56));
  let annual=0;
  if(history.length>=730){
   const months=new Map();for(const r of history.slice(-730)){const m=r.date.slice(5,7);const a=months.get(m)||[];a.push(r.net_sales);months.set(m,a);}
   const december=mean(months.get('12')||[]),june=mean(months.get('06')||[]);
   annual=ratio(december,june)||0;
  }
  return {asOf:history.at(-1).date,historyDays:history.length,weekendShare:round(lastWeek),priorWeekendShare:round(priorWeek),volatilityCV:round(cv),stockoutRate:round(stockoutRate),stockoutStreak:consecutive(last56),refundShare:round(returns),previousRefundShare:round(previousReturns),refundSpikeDays:last56.filter(x=>x.refund_spike===true).length,shortDemandRatio:round(recentRatio),monthDemandRatio:round(level28),quarterTrendRatio:round(level84),yearlyHolidayRatio:round(annual),observedInventoryFlags:last56.some(x=>typeof x.stockout==='boolean'),observedRefunds:last56.some(x=>typeof x.refunds==='number')};
 }
 function detect(history){
  const error=valid(history);
  if(error)return {version:VERSION,asOf:history?.at?.(-1)?.date||null,status:'HOLD',candidate:null,signalStrength:0,competing:[],evidence:{},reason:error};
  const f=featureEvidence(history),rank=[];
  function add(type,score,explanation){if(score>0)rank.push({type,signalStrength:round(clamp(score)),explanation});}
  // Indicators use only previous completed daily observations. They are NOT calibrated probabilities.
  if(f.observedInventoryFlags)add('supply',f.stockoutRate>=.18&&f.stockoutStreak>=8?clamp(.72+(f.stockoutRate-.18)*1.6):0,'Recurring stockouts over 56d, including a cluster of 8+ days');
  if(f.observedRefunds)add('promotion',(f.refundShare>=.11&&f.refundShare>f.previousRefundShare*1.35)?clamp(.69+(f.refundShare-.11)*1.3):0,'Refund share elevated relative to earlier observations');
  if(f.shortDemandRatio<.78&&f.monthDemandRatio<.95)add('stepchange',clamp(.64+(.78-f.shortDemandRatio)*.7),'Sharp near-term revenue level drop');
  if(f.monthDemandRatio<.78&&f.quarterTrendRatio<.86)add('stepchange',clamp(.73+(.78-f.monthDemandRatio)*.65),'Persistent level drop over several weeks');
  if(f.priorWeekendShare-f.weekendShare>.085)add('weekdayshift',clamp(.65+(f.priorWeekendShare-f.weekendShare-.085)*2),'Weekend revenue share shifted toward weekdays');
  if(f.volatilityCV>.39&&f.stockoutRate<.22)add('volatile',clamp(.62+(f.volatilityCV-.39)),'High observed variation not explained by persistent stockouts');
  if(f.yearlyHolidayRatio>2.3&&f.volatilityCV<.42)add('seasonal',clamp(.62+(f.yearlyHolidayRatio-2.3)*.08),'Strong prior-year seasonal contrast');
  if(f.quarterTrendRatio>=1.09&&f.monthDemandRatio>=1.025)add('growth',clamp(.63+(f.quarterTrendRatio-1.09)),'Sustained observed demand expansion');
  if(f.quarterTrendRatio<=.87&&f.monthDemandRatio<=.975)add('decline',clamp(.63+(.87-f.quarterTrendRatio)),'Persistent erosion in demand');
  // Default is deliberately low strength so noisy periods can stay on the existing routing state.
  if(!rank.length)add('stable',.56,'No high-signal regime evidence');
  rank.sort((a,b)=>b.signalStrength-a.signalStrength||REGIMES.indexOf(a.type)-REGIMES.indexOf(b.type));
  const top=rank[0],next=rank[1];
  const ambiguous=!!(next&&top.signalStrength-next.signalStrength<.07);
  const lowSignal=top.signalStrength<.61&&top.type!=='stable';
  return {version:VERSION,detector:DETECTOR_VERSION,asOf:f.asOf,status:ambiguous||lowSignal?'HOLD':'OBSERVED',candidate:ambiguous||lowSignal?null:top.type,
   signalStrength:top.signalStrength,reason:ambiguous?'Ambiguous competing indicators':lowSignal?'Insufficient signal':'Causal data-only heuristic; not calibrated',
   competing:rank.slice(0,4),evidence:f};
 }
 function initialState(){return {version:VERSION,active:'stable',lastProcessed:null,pending:null,pendingCount:0,lastSwitch:null,transition:null,ledger:[],status:'SYNTHETIC SHADOW — HOLD'};}
 function methodFor(mapping,type,h,allowed){
  const desired=mapping?.[type]?.[h]||null;
  const proposed=typeof desired==='string'?desired:desired?.method;
  const baseline=typeof desired==='object'?desired?.baseline:DEFAULT_METHOD;
  const canRoute=!!proposed&&allowed?.[type]?.[h]===true;
  return {method:canRoute?proposed:(baseline||DEFAULT_METHOD),proposed,baseline:baseline||DEFAULT_METHOD,eligible:canRoute};
 }
 function update(previous,history,opts={}){
  const state=previous?structuredClone(previous):initialState(),d=detect(history);
  const at=d.asOf;if(!at)return {state,indicator:d,changed:false,action:'HOLD'};
  // Ambiguous complete days interrupt confirmation and count as observed days.
  if(d.status==='HOLD'){
   if(state.lastProcessed && dateNum(at)<=dateNum(state.lastProcessed))return {state,indicator:d,changed:false,action:'DUPLICATE_OR_OLD_DATE'};
   if(valid(history)===null)state.lastProcessed=at;
   state.pending=null;state.pendingCount=0;
   return {state,indicator:d,changed:false,action:'HOLD'};
  }
  if(state.lastProcessed&&dateNum(at)<=dateNum(state.lastProcessed))return {state,indicator:d,changed:false,action:'DUPLICATE_OR_OLD_DATE'};
  // A day gap invalidates consecutive confirmation, never substitutes missing dates as zero.
  const contiguous=!state.lastProcessed||dateNum(at)-dateNum(state.lastProcessed)===1;
  state.lastProcessed=at;
  if(d.candidate===state.active){state.pending=null;state.pendingCount=0;return {state,indicator:d,changed:false,action:'STAY'};}
  if(!contiguous||state.pending!==d.candidate){state.pending=d.candidate;state.pendingCount=1;}else state.pendingCount++;
  if(state.pendingCount<CONFIRM_DAYS)return {state,indicator:d,changed:false,action:'CONFIRMING'};
  if(state.lastSwitch&&dateNum(at)-dateNum(state.lastSwitch)<COOLDOWN_DAYS)return {state,indicator:d,changed:false,action:'COOLDOWN'};
  // Long-lived commercial regimes cannot churn based on brief oscillations.
  if(state.lastSwitch&&dateNum(at)-dateNum(state.lastSwitch)<MIN_DWELL_DAYS)return {state,indicator:d,changed:false,action:'MIN_DWELL'};
  const before=state.active,to=d.candidate;
  state.active=to;state.lastSwitch=at;state.pending=null;state.pendingCount=0;
  state.transition={from:before,to,started:at,blendDays:BLEND_DAYS};
  const event={date:at,from:before,to,detector:DETECTOR_VERSION,signalStrength:d.signalStrength,evidence:d.evidence,alternatives:d.competing.slice(1),authority:'SYNTHETIC SHADOW — HOLD',reason:d.reason};
  state.ledger.push(event); // append only, never rewrite past event
  return {state,indicator:d,changed:true,event,action:'SHADOW_SWITCH'};
 }
 function blend(history,h,state,{mapping,predict,allowed}={}){
  if(![7,30].includes(h))throw Error('Unsupported horizon');
  if(typeof predict!=='function')throw Error('Forecast function is required');
  const active=methodFor(mapping,state.active,h,allowed);
  const latest=history.at(-1)?.date;
  let weight=1,previous=null;
  if(state.transition&&latest){
   const age=dateNum(latest)-dateNum(state.transition.started);
   if(age>=0&&age<BLEND_DAYS){weight=clamp((age+1)/BLEND_DAYS);previous=methodFor(mapping,state.transition.from,h,allowed);}
  }
  const now=predict(history,h,active.method),old=previous?predict(history,h,previous.method):null;
  if(!now||now.length!==h||now.some(x=>!Number.isFinite(x.value))||(previous&&(!old||old.length!==h)))return {status:'HOLD',reason:'Missing/invalid forecast',method:active.method};
  const daily=now.map((x,i)=>({date:x.date,value:round(clamp(x.value,0,Number.MAX_SAFE_INTEGER)*weight+(old?old[i].value*(1-weight):0))}));
  return {status:'SYNTHETIC SHADOW — NOT APPROVED',regime:state.active,method:active.method,proposed:active.proposed,eligible:active.eligible,from:previous?.method||null,blendWeight:round(weight),daily,total:round(sum(daily.map(x=>x.value)))};
 }
 function replay(history,{initial=112,mapping,predict,allowed}={}){
  let state=initialState(),events=[],latest=null;
  for(let n=Math.max(initial,MIN_HISTORY);n<=history.length;n++){
   latest=update(state,history.slice(0,n));state=latest.state;
   if(latest.changed)events.push(latest.event);
  }
  return {state,events,indicator:latest?.indicator,methods:Object.fromEntries([7,30].map(h=>[h,methodFor(mapping,state.active,h,allowed)]))};
 }
 return {VERSION,DETECTOR_VERSION,MIN_HISTORY,CONFIRM_DAYS,COOLDOWN_DAYS,MIN_DWELL_DAYS,BLEND_DAYS,REGIMES,DEFAULT_METHOD,detect,featureEvidence,initialState,methodFor,update,blend,replay};
});
