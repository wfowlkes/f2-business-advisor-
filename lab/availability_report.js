/* Generates reproducible measurements. Predeclared seed lists, never model tuning. */
'use strict';
const F=require('./availability_gate.js'),A=require('./availability_engine.js'),B=require('./bridge_engine.js');
const LAB=require('./synthetic.js'),STRESS=require('./supply-stress.js'),M=require('./scenario_methods.js');
const sum=a=>a.reduce((s,v)=>s+v,0),r=n=>Math.round(n*100)/100;
const DESIGN=[194807,286431], CHALLENGE=[591733,618407,729109], STRESS_SEEDS=[1301,2309,3307], SHIFT_DATE='2027-04-03';
function trial(data){
 let records=[];
 for(let cutoff=780;cutoff+30<=data.length;cutoff+=30){
  const history=data.slice(0,cutoff),forecast=F.forecast(history),actual=sum(data.slice(cutoff,cutoff+30).map(x=>x.net_sales));
  const v14=B.bridgeForecast(history,30,'supply'),simple=M.predict(history,30,'28-day average'),newModel=A.estimate(history,30);
  records.push({cutoff:history.at(-1).date,actual:r(actual),frozen:r(sum(v14.map(x=>x.value))),simple:r(sum(simple.map(x=>x.value))),
    availability:newModel.status==='HOLD'?null:newModel.meanForecast,
    gated:forecast.status==='HOLD'?null:forecast.point,
    route:forecast.route,gate:forecast.skill?.status||'HOLD',
    band:newModel.scenarioEnvelope||null,highUncertainty:newModel.highUncertainty??true,period:newModel.recurrencePeriod||null});
 }
 const total=sum(records.map(x=>x.actual));
 const metric=key=>r(100*sum(records.map(x=>Math.abs((x[key]??x.frozen)-x.actual)))/total);
 return {source:'SYNTHETIC',records,metrics:{simpleWape:metric('simple'),frozenWape:metric('frozen'),availabilityWape:metric('availability'),gatedWape:metric('gated'),
  routed:records.filter(x=>x.route==='AVAILABILITY-RESEARCH').length,
  scenarioEnvelopeHits:records.filter(x=>x.band&&x.actual>=x.band.low&&x.actual<=x.band.high).length,
  highUncertainty:records.filter(x=>x.highUncertainty).length,folds:records.length},authority:'HOLD'};
}
function evaluate(){
 let cohorts=[];
 for(const [group,seeds] of [['development',DESIGN],['untouched_same_generator',CHALLENGE]]){
  for(const seed of seeds)cohorts.push({group,mode:'recurring-supply',seed,asOf:LAB.AS_OF,...trial(LAB.generate('supply',seed).daily)});
 }
 for(const mode of ['markov','supplier','seasonal','intermittent'])for(const seed of STRESS_SEEDS)cohorts.push({group:'independent_generator',mode,seed,asOf:'2027-01-30',...trial(STRESS.generate(mode,seed).daily)});
 for(const seed of [591733,618407])cohorts.push({group:'shifted_calendar',mode:'recurring-supply',seed,asOf:SHIFT_DATE,...trial(LAB.generate('supply',seed,{asOf:SHIFT_DATE}).daily)});
 return {version:F.VERSION,baseline:'Frozen v1.4 Supply Bridge (ungated point forecast)',designSeeds:DESIGN,unseenSeeds:CHALLENGE,independentSeeds:STRESS_SEEDS,
  calendarShift:SHIFT_DATE,productionAuthority:'HOLD',
  note:'Independent generator means different synthetic source rules, not real retailer evidence. Legacy direct supply bridge WAPE differs from frozen v1.4 hybrid-router WAPE (~47.93%).',
  uncertainty:'Scenario envelopes are extreme hypothetical supply states, NOT calibrated prediction intervals.',cohorts};
}
function markdown(data){
 const lines=['# F2 Learning Lab v1.5 — Supply availability research','', '**SYNTHETIC ONLY. Production authority HOLD. No real Shopify store or merchant inventory data.**','',
 '## What the high 30-day supply error means','','Realized revenue is constrained by inventory availability. Without known future replenishment commitments, stockout timing is partially unknowable. Rather than pretending it is known, this research separates conditional demand (if in stock) from estimated realized sales and holds decisions when future availability is uncertain.','',
 '| Cohort | Mode | Seed | Frozen v1.4 WAPE | New availability WAPE | Skill-gated WAPE | Switched folds | High-uncertainty folds |',
 '|---|---|---:|---:|---:|---:|---:|---:|',...data.cohorts.map(x=>`| ${x.group} | ${x.mode} | ${x.seed} | ${x.metrics.frozenWape}% | ${x.metrics.availabilityWape}% | ${x.metrics.gatedWape}% | ${x.metrics.routed}/${x.metrics.folds} | ${x.metrics.highUncertainty}/${x.metrics.folds} |`),
 '', '## Interpretation',
 '- Favor lower WAPE only if observed on previously unused data without future information leakage.',
 '- If an alternate supply process defeats the candidate, preserve the frozen bridge and widen conditional uncertainty; report all losses.',
 '- Without a supplier shipment calendar, inventory-in-transit, fulfillment restrictions, SKU-level stock position, and observed replenishment lead times, no mathematical method can guarantee a low-error 30-day realized-sales forecast.',
 '- Recurrence detection is explicitly gated by completed observations and prior state agreement; it is not allowed to read future stockouts.',
 '- No production method changes, inventory actions, promises of interval coverage, or real-world Shopify advantage are authorized.',
 '', '## Recommended next data contract',
 '- Store-date daily sales, stockouts, refunds (aggregate-only), current stock available, inventory commitments and expected inbound quantities/dates, lead-time reliability, and promotion schedule.',
 '- An inbound plan is a **forecast/commitment** and must be labeled as such, never substituted for actual future inventory or presented as verified outcomes.',
 '- With no confirmed future availability, surface full-stock / all-constrained conditional scenarios and keep downstream inventory/revenue decisions on HOLD.',
 '- Continue independent chronological testing and calibrated interval checks once operational data is authorized.'];
 return lines.join('\n')+'\n';
}
if(require.main===module){const fs=require('node:fs'),path=require('node:path');const report=evaluate();fs.writeFileSync(path.join(__dirname,'availability-results.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(path.join(__dirname,'availability-results.md'),markdown(report));console.log('F2 v1.5 cohorts:',report.cohorts.length,'production HOLD');}
module.exports={DESIGN,CHALLENGE,STRESS_SEEDS,SHIFT_DATE,trial,evaluate,markdown};
