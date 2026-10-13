'use strict';
// No Shopify access. Simulated generator type is referenced only for scoring.
const fs=require('node:fs'),path=require('node:path');
const B=require('./bridge_engine.js'),T=require('./transition_engine.js'),R=require('./transition_report.js'),M=require('./scenario_methods.js'),LAB=require('./synthetic.js');
const FROZEN=require('./selection-frozen.json');
const DESIGN_SEEDS=Object.freeze([242424,353535]);
const CHALLENGE_SEEDS=Object.freeze([731111,842222,953333]);
const SHIFT_SEEDS=Object.freeze([365365]);
const SHIFT_DATE='2027-07-17';
const ALLOWED=R.allowShadow(),START=780,HS=[7,30];
const total=a=>a.reduce((v,x)=>v+x,0),average=a=>total(a)/a.length,round=n=>Math.round(n*100)/100;
function score(xs,key){let a=total(xs.map(x=>Math.abs(x.actual))),abs=total(xs.map(x=>Math.abs(x[key]-x.actual))),signed=total(xs.map(x=>x[key]-x.actual));return {folds:xs.length,wape:a?round(abs/a*100):null,bias:a?round(signed/a*100):null};}
function trial(type,seed,{asOf=LAB.AS_OF}={}){
 const rows=LAB.generate(type,seed,{asOf}).daily;
 let v13=T.initialState(),v14=B.initialState(),switches13=[],switches14=[],observed=0,match13=0,match14=0;
 const checkpoints={7:[],30:[]};
 for(let n=112;n<=rows.length;n++){
  const hist=rows.slice(0,n),old=T.update(v13,hist),newest=B.update(v14,hist);v13=old.state;v14=newest.state;
  if(old.changed)switches13.push(old.event);if(newest.changed)switches14.push(newest.event);
  if(n>START){observed++;if(old.indicator.candidate===type)match13++;if(newest.indicator.candidate===type)match14++;}
  for(const h of HS){if(n<START||n+h>rows.length||(n-START)%h)continue;
   const expected=total(rows.slice(n,n+h).map(x=>x.net_sales));
   const original=T.blend(hist,h,v13,{mapping:FROZEN.selection,allowed:ALLOWED,predict:M.predict});
   const current=B.forecast(hist,h,v14);
   const simple=M.predict(hist,h,'28-day average');
   const step=(simple||[]).map(x=>x.value);
   if(!original.daily||!current.daily||!simple||step.length!==h)throw Error('Invalid history or missing forecast '+type+' '+n+' '+h);
   checkpoints[h].push({date:hist.at(-1).date,actual:expected,original:original.total,new:current.total,hybrid:B.hybridForecast(hist,h,v14,original).total,simple:total(step)});
  }
 }
 const horizon=Object.fromEntries(HS.map(h=>[h,{v13:score(checkpoints[h],'original'),v14:score(checkpoints[h],'new'),hybrid:score(checkpoints[h],'hybrid'),simple:score(checkpoints[h],'simple')}]));
 return {type,seed,asOf,production:'HOLD',switchesV13:switches13.length,switchesV14:switches14.length,
  churnReduction:round((1-switches14.length/Math.max(1,switches13.length))*100),matchV13:round(match13/observed*100),matchV14:round(match14/observed*100),
  eventsV14:switches14.map(x=>({date:x.date,from:x.from,to:x.to})),horizon};
}
function run({seeds=CHALLENGE_SEEDS,asOf=LAB.AS_OF,types=LAB.TYPES.map(x=>x.id)}={}){
 const businesses=types.map(type=>{
  const trials=seeds.map(seed=>trial(type,seed,{asOf}));
  const outcomes={};for(const h of HS){const x=trials.map(t=>t.horizon[h]),pooled={};
   for(const key of ['v13','v14','hybrid','simple'])pooled[key]=round(average(x.map(v=>v[key].wape)));
   outcomes[h]={...pooled,winsV13:x.filter(v=>v.hybrid.wape<v.v13.wape).length,lossesV13:x.filter(v=>v.hybrid.wape>v.v13.wape).length,
    deltaVsV13:round(pooled.v13-pooled.hybrid),deltaVsSimple:round(pooled.simple-pooled.hybrid)};
  }
  return {type,name:LAB.TYPES.find(x=>x.id===type).name,
   meanSwitchesV13:round(average(trials.map(t=>t.switchesV13))),meanSwitchesV14:round(average(trials.map(t=>t.switchesV14))),
   meanMatchV13:round(average(trials.map(t=>t.matchV13))),meanMatchV14:round(average(trials.map(t=>t.matchV14))),
   outcomes,trials};
 });
 return {version:B.VERSION,baselineVersion:T.VERSION,kind:'SYNTHETIC SHADOW ONLY',seeds,asOf,holdoutStart:START,productionAuthority:'HOLD',
  note:'All forecasts computed only from dated observations before each scoring cutoff; scenario labels used for grading, never routing. Results across seeds of the same generator do not establish external validity.',businesses};
}
function markdown(r){const l=['# F2 Learning Lab — Transition Bridge '+B.VERSION,'','**SYNTHETIC DATA ONLY — NO CUSTOMER ROUTING APPROVED.**','','Causal replay: original v1.3 frozen detector versus new v1.4 proposal against identical simulated daily series.','',`Seeds: ${r.seeds.join(', ')}. Date: ${r.asOf}. Each forecast uses only history before the cutoff; scenario truth is grading-only.`, '', '| Regime | Old switches | New switches | 7d old WAPE | 7d gated WAPE | 30d old WAPE | 30d gated WAPE |','|---|---:|---:|---:|---:|---:|---:|',...r.businesses.map(b=>`| ${b.name} | ${b.meanSwitchesV13} | ${b.meanSwitchesV14} | ${b.outcomes[7].v13}% | ${b.outcomes[7].hybrid}% | ${b.outcomes[30].v13}% | ${b.outcomes[30].hybrid}% |`),'', 'Lower WAPE is better. Relative improvement is not a claim of model superiority on real commerce data.', '', '## Negative outcomes',''];
 for(const b of r.businesses)for(const h of HS){const o=b.outcomes[h];if(o.deltaVsV13<0)l.push(`- ${b.name}, ${h}d: new bridge **worsened** WAPE by ${round(-o.deltaVsV13)} points versus frozen detector; no automatic promotion.`);}
 l.push('','## Governance','- Selected methods never use the generator label or future known stockouts/promotions.','- The current merchant endpoint is unchanged; automatic switching remains experimental and all decisions HOLD.','- Internal audit records are synthetic test snapshots, not persistent customer audit logs.');return l.join('\n')+'\n';}
if(require.main===module){const stage=process.argv[2]||'challenge',r=stage==='development'?run({seeds:DESIGN_SEEDS}):stage==='calendar'?run({seeds:SHIFT_SEEDS,asOf:SHIFT_DATE}):run();const out=path.resolve(__dirname,`bridge-${stage}.json`);fs.writeFileSync(out,JSON.stringify(r,null,2)+'\n');fs.writeFileSync(path.resolve(__dirname,`bridge-${stage}.md`),markdown(r));console.log(JSON.stringify({stage,businesses:r.businesses.length,negative:r.businesses.flatMap(b=>[7,30].filter(h=>b.outcomes[h].deltaVsV13<0).map(h=>b.type+':'+h)),switches:r.businesses.map(b=>[b.type,b.meanSwitchesV13,b.meanSwitchesV14])}));}
module.exports={trial,run,DESIGN_SEEDS,CHALLENGE_SEEDS,SHIFT_SEEDS,SHIFT_DATE};
