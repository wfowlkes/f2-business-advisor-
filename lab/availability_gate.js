/* F2 Learning Lab 1.5 — forecast-confidence and skill-gated fallback, synthetic ONLY. */
'use strict';
const A=require('./availability_engine.js'),B=require('./bridge_engine.js');
const VERSION='F2 Availability Gate 1.5',H=30;
const sum=x=>x.reduce((s,v)=>s+v,0),round=n=>Math.round(n*100)/100;
function audit(history,{horizon=30,folds=5}={}){
 if(horizon!==H)return {status:'HOLD',reason:'Only 30-day supply routing is in research'};
 if(A.check(history,horizon))return {status:'HOLD',reason:A.check(history,horizon)};
 const outcomes=[];
 // *Every* comparison is to a completed historical period, and all predictions
 // are produced from observations strictly earlier than its forecast cutoff.
 const limit=history.length;
 for(let i=folds;i>=1;i--){
  const cutoff=limit-i*horizon;if(cutoff<180)continue;
  const known=history.slice(0,cutoff),actual=sum(history.slice(cutoff,cutoff+horizon).map(x=>x.net_sales));
  const old=B.bridgeForecast(known,horizon,'supply'),proposal=A.estimate(known,horizon);
  if(!old||proposal.status==='HOLD')continue;
  outcomes.push({cutoff:known.at(-1).date,targetEnd:history[cutoff+horizon-1].date,
    actual,base:sum(old.map(x=>x.value)),candidate:proposal.meanForecast});
 }
 const total=sum(outcomes.map(x=>Math.abs(x.actual)));
 if(outcomes.length<3||total<=0)return {status:'HOLD',reason:'Fewer than 3 completed valid historical supply folds',folds:outcomes.length,ledger:outcomes};
 const baseAbs=sum(outcomes.map(x=>Math.abs(x.base-x.actual))),candidateAbs=sum(outcomes.map(x=>Math.abs(x.candidate-x.actual)));
 const improvement=baseAbs>0?(baseAbs-candidateAbs)/baseAbs*100:null;
 const wins=outcomes.filter(x=>Math.abs(x.candidate-x.actual)<Math.abs(x.base-x.actual)).length;
 const signedBias=sum(outcomes.map(x=>x.candidate-x.actual))/total*100;
 const recent=outcomes.at(-1),recentPass=Math.abs(recent.candidate-recent.actual)<=Math.abs(recent.base-recent.actual)*1.35;
 // Pre-registered gates; not a Shopify production authorisation.
 const qualified=improvement!==null&&improvement>=10&&wins>=Math.ceil(outcomes.length*.6)&&Math.abs(signedBias)<=20&&recentPass;
 return {status:qualified?'QUALIFIED-SYNTHETIC':'HOLD',reason:qualified?'Historical causal replay passed initial synthetic skill gate':'Historical error, bias or consistency gate failed',
  improvement:round(improvement),baselineWape:round(baseAbs/total*100),candidateWape:round(candidateAbs/total*100),
  signedBias:round(signedBias),wins,folds:outcomes.length,latestPassed:recentPass,ledger:outcomes,productionAuthority:'HOLD'};
}
function forecast(history,{horizon=30}={}){
 if(horizon!==H)return {status:'HOLD',route:'NO_FORECAST',reason:'Only 30-day supply routing is in research',productionAuthority:'HOLD'};
 const report=A.estimate(history,horizon);if(report.status==='HOLD')return {status:'HOLD',route:'NO_FORECAST',reason:report.reason,productionAuthority:'HOLD'};
 const skill=audit(history,{horizon}),baseline=B.bridgeForecast(history,horizon,'supply');
 if(!baseline)return {status:'HOLD',route:'NO_FORECAST',reason:'Prior supply baseline unavailable'};
 const selected=skill.status==='QUALIFIED-SYNTHETIC'?'AVAILABILITY-RESEARCH':'FROZEN-V14';
 const daily=selected==='AVAILABILITY-RESEARCH'?report.daily:baseline;
 return {status:'SYNTHETIC SHADOW — HOLD',route:selected,method:selected==='AVAILABILITY-RESEARCH'?report.method:'F2 Frozen v1.4 Supply Bridge',
  horizon,daily,point:round(sum(daily.map(x=>x.value))),skill,
  conditional:report.scenarioEnvelope,highUncertainty:report.highUncertainty,
  expectedStockoutDays:report.expectedStockoutDays,latentDemandScenario:report.fullAvailability,
  warning:'Future stockout timing is not known; scenario envelope is not a calibrated interval. No merchant action or automatic routing authorized.',
  authority:'HOLD',productionAuthority:'HOLD'};
}
module.exports={VERSION,audit,forecast};
