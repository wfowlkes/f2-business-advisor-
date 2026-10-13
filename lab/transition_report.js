'use strict';
// Fully reproducible synthetic research: no live merchant reads or learned model updates.
const fs=require('node:fs');const path=require('node:path');
const T=require('./transition_engine.js'),LAB=require('./synthetic.js'),M=require('./scenario_methods.js');
const SELECTION=require('./selection-frozen.json');
const CHALLENGE=require('./strategy-summary.json');
const CALENDAR=require('./calendar-stress.json');
const CHALLENGE_SEEDS=Object.freeze([740001,850002,960003]);
const CHALLENGE_AS_OF='2027-05-19';
const HORIZONS=[7,30],START=780;
function round(x){return Math.round(x*100)/100;}
function allowShadow(){
 const r={};for(const b of CHALLENGE.businesses){const cal=CALENDAR.businesses.find(x=>x.type===b.type);r[b.type]={};
  for(const h of HORIZONS){const a=b.horizons[h],c=cal.horizons[h];r[b.type][h]=a.status.startsWith('RESEARCH CANDIDATE')&&a.losses===0&&c.negativeGroups===0&&c.positiveGroups>=2&&Math.abs(c.meanBias)<=5;}
 }return r;
}
function metrics(scores){const actual=scores.reduce((s,x)=>s+Math.abs(x.actual),0),error=scores.reduce((s,x)=>s+Math.abs(x.total-x.actual),0),bias=scores.reduce((s,x)=>s+(x.total-x.actual),0);
 return {folds:scores.length,wape:actual?round(100*error/actual):null,bias:actual?round(100*bias/actual):null};}
function scenarioTrial(type,seed,{asOf=CHALLENGE_AS_OF,allowed=allowShadow()}={}){
 const rows=LAB.generate(type,seed,{asOf}).daily,checkpoints={7:[],30:[]};let state=T.initialState(),events=[],confirmed=0,observed=0,notSure=0;
 for(let cutoff=T.MIN_HISTORY;cutoff<=rows.length;cutoff++){
  const hist=rows.slice(0,cutoff),obs=T.update(state,hist);state=obs.state;
  if(obs.changed)events.push(obs.event);
  if(cutoff>START){observed++;if(obs.indicator.candidate===type)confirmed++;if(obs.indicator.status==='HOLD')notSure++;}
  for(const h of HORIZONS){if(cutoff<START||cutoff+h>rows.length||(cutoff-START)%h!==0)continue;
   const src=rows.slice(cutoff,cutoff+h),actual=src.reduce((s,x)=>s+x.net_sales,0);
   const routed=T.blend(hist,h,state,{mapping:SELECTION.selection,allowed,predict:M.predict});
   const baseline=M.predict(hist,h,'28-day average');
   // Oracle reference knows generator identity; it is NEVER provided to the router.
   const oracle=M.predict(hist,h,SELECTION.selection[type][h].method);
   if(!routed.daily||!baseline||!oracle)throw Error('Incomplete synthetic forecast at cutoff '+cutoff);
   checkpoints[h].push({date:hist.at(-1).date,actual,total:routed.total,
    baseline:baseline.reduce((s,x)=>s+x.value,0),oracle:oracle.reduce((s,x)=>s+x.value,0),
    regime:state.active,method:routed.method,weight:routed.blendWeight});
  }
 }
 const scores={};for(const h of HORIZONS){let c=checkpoints[h];scores[h]={
  router:metrics(c.map(x=>({actual:x.actual,total:x.total}))),
  genericBaseline:metrics(c.map(x=>({actual:x.actual,total:x.baseline}))),
  oracleReference:metrics(c.map(x=>({actual:x.actual,total:x.oracle}))),
  sampledRouting:c.filter(x=>x.weight<1).length};
 }
 const eventsBrief=events.map(x=>({date:x.date,from:x.from,to:x.to,signalStrength:x.signalStrength,authority:x.authority}));
 return {type,seed,asOf,truthOnlyForGrading:type,detectorCorrectShare:round(observed?confirmed/observed:0),detectorHoldShare:round(observed?notSure/observed:0),switches:events.length,events:eventsBrief,finalRegime:state.active,scores,productionStatus:'HOLD'};
}
function run(){const allowed=allowShadow(),businesses=[];
 for(const s of LAB.TYPES){const tests=CHALLENGE_SEEDS.map(seed=>scenarioTrial(s.id,seed,{allowed}));
  const summary={};for(const h of HORIZONS){
   const x=tests.map(t=>t.scores[h]);summary[h]={routerWape:round(x.reduce((sum,z)=>sum+z.router.wape,0)/x.length),static28Wape:round(x.reduce((sum,z)=>sum+z.genericBaseline.wape,0)/x.length),oracleWape:round(x.reduce((sum,z)=>sum+z.oracleReference.wape,0)/x.length),
    wins:x.filter(z=>z.router.wape<z.genericBaseline.wape).length,losses:x.filter(z=>z.router.wape>z.genericBaseline.wape).length,
    meanRouterBias:round(x.reduce((sum,z)=>sum+z.router.bias,0)/x.length),
    improvementPct:round(100*(x.reduce((sum,z)=>sum+z.genericBaseline.wape,0)-x.reduce((sum,z)=>sum+z.router.wape,0))/x.reduce((sum,z)=>sum+z.genericBaseline.wape,0))};}
  businesses.push({type:s.id,name:s.name,seeds:CHALLENGE_SEEDS,detectorCorrectShare:round(tests.reduce((n,t)=>n+t.detectorCorrectShare,0)/tests.length),
   avgSwitches:round(tests.reduce((n,t)=>n+t.switches,0)/tests.length),score:summary,examples:tests.map(t=>({seed:t.seed,events:t.events,final:t.finalRegime}))});
 }
 return {version:T.VERSION,design:'RULES FROZEN BEFORE CHALLENGE EXECUTION',asOf:CHALLENGE_AS_OF,seeds:CHALLENGE_SEEDS,
  registry:T.REGIMES,simulationOnly:true,externalValidity:'UNTESTED',decisionAuthority:'HOLD',
  dataCadence:'Completed DAILY aggregates; not instant transaction-level changes',
  dynamicRoutes:'SYNTHETIC SHADOW ONLY',qualityGate:'Only previously registered method choices with favorable prior challenge and shifted calendar checks are allowed to shadow-route; all other cases fall back to registered simple baselines.',
  allowedShadowMethods:allowed,businesses};
}
if(require.main===module){const output=run();const folder=path.resolve(process.env.F2_TRANSITION_OUTPUT||'transition-evidence');fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'results.json'),JSON.stringify(output,null,2)+'\n');
 const lines=['# Scenario Transition Learning Lab v1.3','', '**SYNTHETIC SHADOW ONLY — production HOLD**','','| Simulated business | Detector match in last 300 days | Avg switches | 7d router WAPE | 7d static 28d WAPE | 7d wins (of 3) | 30d router WAPE | 30d static 28d WAPE | 30d wins |','|---|---:|---:|---:|---:|---:|---:|---:|---:|',...output.businesses.map(b=>`| ${b.name} | ${Math.round(b.detectorCorrectShare*100)}% | ${b.avgSwitches} | ${b.score[7].routerWape}% | ${b.score[7].static28Wape}% | ${b.score[7].wins} | ${b.score[30].routerWape}% | ${b.score[30].static28Wape}% | ${b.score[30].wins} |`),'','**Important:** Detector match uses known simulator labels *for grading only*, never input to prediction. The static comparator uses a single 28-day average for all stores. An oracle-selected prior method is reported separately and is not available to a real detector. Missing, ambiguous and unreliable data HOLD; no model promotions.','', 'No test on real Shopify merchants, no calibrated real-world detection probabilities.'];
 fs.writeFileSync(path.join(folder,'results.md'),lines.join('\n')+'\n');console.log(JSON.stringify({version:output.version,scenarios:output.businesses.length,warnings:output.businesses.filter(b=>b.score[7].improvementPct<0||b.score[30].improvementPct<0).map(b=>b.type),authority:output.decisionAuthority}));
}
module.exports={CHALLENGE_SEEDS,CHALLENGE_AS_OF,allowShadow,scenarioTrial,run};
