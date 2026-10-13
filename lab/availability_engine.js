/* F2 Supply Availability Research v1.5 — synthetic, shadow-only and fully causal. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('../core.js'),require('./scenario_methods.js'));else root.F2Availability=factory(root.F2,root.F2ScenarioMethods);})(typeof self!=='undefined'?self:this,function(F2,M){
'use strict';
const VERSION='F2 Supply Availability Research 1.5';
const sum=x=>x.reduce((s,v)=>s+v,0),avg=x=>x.length?sum(x)/x.length:0,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),round=n=>Math.round(n*100)/100;
const day=x=>new Date(x+'T00:00:00Z').getUTCDay();
function check(history,h){
 if(!Array.isArray(history)||history.length<180||![7,30].includes(h))return 'Need 180 consecutive days and 7/30 horizon';
 if(history.some((v,i)=>!v||!/^\d{4}-\d\d-\d\d$/.test(v.date)||!Number.isFinite(v.net_sales)||v.net_sales<0||(i&&v.date!==F2.addDay(history[i-1].date,1))))return 'Invalid or missing daily observations';
 const flags=history.slice(-180);if(flags.some(x=>typeof x.stockout!=='boolean'))return 'Missing observed inventory-availability flags';
 return null;
}
function stockSignature(history){
 // A period may be promoted only after a positive out-of-sample-like past replay.
 // Treat missing inventory signals as not usable, NEVER treat them as in-stock.
 const obs=history.map(x=>x.stockout===true?1:x.stockout===false?0:null),n=obs.length;
 const candidates=[];
 const start=Math.max(0,n-350), recent=Math.max(start,n-180);
 const overall=obs.slice(recent).filter(x=>x!==null),prior=avg(overall);
 for(let period=24;period<=130;period++){
  let pairs=[],hits=0,predicted=0,actual=0;
  for(let i=recent;i<n;i++){
   let x=obs[i],y=obs[i-period];if(x===null||y==null)continue;
   pairs.push([x,y]);if(x===1)actual++;if(y===1)predicted++;if(x===1&&y===1)hits++;
  }
  const nPairs=pairs.length;if(nPairs<75||actual<12||predicted<12)continue;
  const precision=hits/predicted,recall=hits/actual,f1=precision+recall?2*precision*recall/(precision+recall):0;
  // Reliability must surpass naive "always unavailable" frequencies by a wide margin.
  const lift=precision-(actual/nPairs);
  if(f1>=.63&&lift>=.20&&precision>=.55&&recall>=.52){
   candidates.push({period,precision:round(precision),recall:round(recall),f1:round(f1),lift:round(lift),pairs:nPairs});
  }
 }
 candidates.sort((a,b)=>b.f1-a.f1||b.lift-a.lift||a.period-b.period);
 return {baseRate:round(prior),best:candidates[0]||null,candidates:candidates.slice(0,4)};
}
function markov(history,h){
 const obs=history.slice(-180).map(x=>x.stockout);
 let stayOff=0,seenOff=0,onToOff=0,seenOn=0;
 for(let i=1;i<obs.length;i++){
  if(typeof obs[i]!=='boolean'||typeof obs[i-1]!=='boolean')continue;
  if(obs[i-1]){seenOff++;if(obs[i])stayOff++}
  else{seenOn++;if(obs[i])onToOff++}
 }
 // Bayesian smoothing prevents brittle 0% and 100% transitions.
 const q01=(onToOff+1)/(seenOn+2),q11=(stayOff+1)/(seenOff+2);
 let p=history.at(-1).stockout?1:0;const forecast=[];
 for(let i=0;i<h;i++){p=p*q11+(1-p)*q01;forecast.push(p);}
 return {forecast,q01:round(q01),q11:round(q11)};
}
function recurrence(history,h){
 const sig=stockSignature(history),info=markov(history,h),n=history.length,p=sig.best?.period;
 const values=info.forecast.slice(),recur=[];
 if(p){for(let k=1;k<=h;k++){
  // Prior observations ONLY; no future inventory state or hidden simulator index.
  const idx=n+k-1-p,observed=idx>=0&&idx<n?history[idx].stockout:null;
  recur.push(typeof observed==='boolean'?(observed?.90:.10):null);
 }}
 const qualified=!!p&&recur.every(x=>x!==null);
 return {probabilities:qualified?values.map((x,i)=>clamp(.82*recur[i]+.18*x,.02,.98)):values,
         mode:qualified?'RECURRING-AVAILABILITY':'MARKOV-HAZARD',signature:sig,markov:{q01:info.q01,q11:info.q11},qualified};
}
function validDate(s){const x=new Date(s+'T00:00:00Z');return Number.isFinite(x.valueOf())&&x.toISOString().slice(0,10)===s;}
function validatePlan(plan,history,h){
 if(plan===undefined||plan===null)return new Map();
 if(!Array.isArray(plan)||plan.length>h)throw Error('Invalid availability plan');
 const m=new Map(),cutoff=history.at(-1).date,ending=F2.addDay(cutoff,h);
 for(const row of plan){
  if(!row||typeof row.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||row.date<=cutoff||row.date>ending||
   typeof row.knownAt!=='string'||row.knownAt>cutoff||!/^\d{4}-\d{2}-\d{2}$/.test(row.knownAt)||
   !validDate(row.date)||!validDate(row.knownAt)||
   row.source!=='MERCHANT_DECLARED_PLAN'||typeof row.stockoutProbability!=='number'||!Number.isFinite(row.stockoutProbability)||row.stockoutProbability<0||row.stockoutProbability>1||m.has(row.date))throw Error('Invalid, future-leaking or duplicate plan data');
  m.set(row.date,row.stockoutProbability);
 }
 return m;
}
function estimate(history,h,{availabilityPlan}={}){
 const reason=check(history,h);if(reason)return {status:'HOLD',reason};
 const plan=validatePlan(availabilityPlan,history,h);
 const avail=recurrence(history,h),data=history.slice(-112),on=data.filter(x=>x.stockout===false),off=data.filter(x=>x.stockout===true);
 if(on.length<18||off.length<8)return {status:'HOLD',reason:'Insufficient observed in-stock and out-of-stock comparison history'};
 const onWeek=Array.from({length:7},(_,d)=>{let matched=on.filter(x=>day(x.date)===d);return avg((matched.length>=4?matched:on).map(x=>x.net_sales))});
 const offWeek=Array.from({length:7},(_,d)=>{let matched=off.filter(x=>day(x.date)===d);return avg((matched.length>=3?matched:off).map(x=>x.net_sales))});
 const previous=history.at(-1).date,daily=[],unconstrained=[],downside=[];
 for(let t=1;t<=h;t++){
  const date=F2.addDay(previous,t),d=day(date),p=plan.has(date)?plan.get(date):avail.probabilities[t-1];
  // Forecast REALIZED revenue, not unknown latent missed orders.
  const full=onWeek[d],offV=clamp(offWeek[d],0,full);
  const realized=(1-p)*full+p*offV;
  daily.push({date,value:round(realized),stockoutRisk:round(p)});
  unconstrained.push({date,value:round(full)});
  downside.push({date,value:round(offV)});
 }
 const gross=sum(unconstrained.map(x=>x.value)),worst=sum(downside.map(x=>x.value)),mean=sum(daily.map(x=>x.value));
 const risks=daily.reduce((s,x)=>s+x.stockoutRisk,0);
 // This is a scenario envelope, NOT calibrated 80/95 percent confidence intervals.
 const uncertainty=(gross-worst)/Math.max(mean,1);
 return {status:'SYNTHETIC SHADOW — HOLD',version:VERSION,method:avail.mode,mode:avail.mode,
  horizon:h,signalStrength:avail.signature.best?.f1??0,recurrencePeriod:avail.signature.best?.period??null,
  expectedStockoutDays:round(risks),meanForecast:round(mean),
  fullAvailability:round(gross),allConstrained:round(worst),
  scenarioEnvelope:{low:round(worst),central:round(mean),high:round(gross),type:'Uncalibrated supply scenarios — NOT prediction intervals'},
  highUncertainty:uncertainty>.4 || (!avail.qualified&&risks>2),
  guidance:'UNKNOWN OR UNVERIFIED FUTURE AVAILABILITY — HOLD point-decision authority',
  planAssumptionDays:plan.size,planProvenance:plan.size?'MERCHANT_DECLARED_PLAN, UNVERIFIED, NOT FUTURE ACTUALS':'NO FORWARD SUPPLY PLAN',
  probabilities:daily.map(x=>x.stockoutRisk),daily,unconstrained,downside,
  diagnostics:{observedInStockDays:on.length,observedStockoutDays:off.length,markov:avail.markov,periodicity:avail.signature},productionAuthority:'HOLD'};
}
return {VERSION,check,stockSignature,markov,recurrence,validatePlan,estimate};
});
