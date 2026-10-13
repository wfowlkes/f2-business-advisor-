'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const F=require('../core.js'),LAB=require('../lab/synthetic.js'),A=require('../lab/availability_engine.js'),G=require('../lab/availability_gate.js'),STRESS=require('../lab/supply-stress.js');
const sample=()=>LAB.generate('supply',194807).daily;
test('availability estimator creates chronological 30-day forward scenarios, with no real authority',()=>{
 const rows=sample().slice(0,990),r=A.estimate(rows,30);
 assert.equal(r.status,'SYNTHETIC SHADOW — HOLD');assert.equal(r.daily.length,30);assert.equal(r.daily[0].date,F.addDay(rows.at(-1).date,1));
 assert.equal(r.productionAuthority,'HOLD');assert.equal(r.scenarioEnvelope.type.includes('NOT prediction intervals'),true);
 assert(r.scenarioEnvelope.low<=r.meanForecast&&r.meanForecast<=r.scenarioEnvelope.high);
 assert(r.expectedStockoutDays>0);assert.equal(r.planAssumptionDays,0);
 assert.equal(r.fullAvailability,r.scenarioEnvelope.high);
});
test('no future stockout, demand or refund can influence a frozen cutoff',()=>{
 const rows=sample(),cutoff=960,first=rows.slice(0,cutoff);
 const a=A.estimate(first,30),b=G.forecast(first);
 const modified=rows.map((x,i)=>i>=cutoff?{...x,net_sales:999999,stockout:!x.stockout,refunds:9999}:x);
 assert.deepEqual(a,A.estimate(modified.slice(0,cutoff),30));assert.deepEqual(b,G.forecast(modified.slice(0,cutoff)));
});
test('strict missing flags and missing dates cause HOLD rather than fabricated in-stock defaults',()=>{
 const d=sample().slice(0,860);
 const missing=d.map(x=>({...x}));delete missing[820].stockout;
 assert.equal(A.estimate(missing,30).status,'HOLD');
 const bad=d.map(x=>({...x}));bad[855].date=bad[854].date;
 assert.equal(A.estimate(bad,30).status,'HOLD');
 assert.equal(A.estimate(d.slice(0,80),30).status,'HOLD');
});
test('only prior merchant-declared availability plans are allowable, always labeled assumptions',()=>{
 const rows=sample().slice(0,950),t=F.addDay(rows.at(-1).date,1);
 const base=A.estimate(rows,30),p={date:t,stockoutProbability:1,knownAt:rows.at(-1).date,source:'MERCHANT_DECLARED_PLAN'};
 const y=A.estimate(rows,30,{availabilityPlan:[p]});
 assert.equal(y.planAssumptionDays,1);assert.match(y.planProvenance,/UNVERIFIED/);assert.equal(y.daily[0].stockoutRisk,1);
 assert(y.daily[0].value<=base.unconstrained[0].value);assert.equal(y.productionAuthority,'HOLD');
 assert.throws(()=>A.estimate(rows,30,{availabilityPlan:[{...p,knownAt:t}]}),/Invalid/);
 assert.throws(()=>A.estimate(rows,30,{availabilityPlan:[p,p]}),/Invalid/);
 assert.throws(()=>A.estimate(rows,30,{availabilityPlan:[{...p,source:'ORACLE_TRUTH'}]}),/Invalid/);
});
test('recurrence recognition has positive historical evidence or uses a Markov hazard fallback',()=>{
 const rows=sample().slice(0,930),r=A.recurrence(rows,30);
 assert(r.probabilities.every(x=>Number.isFinite(x)&&x>=0&&x<=1));
 assert(['MARKOV-HAZARD','RECURRING-AVAILABILITY'].includes(r.mode));
 assert.equal(r.probabilities.length,30);
});
test('research skill gate rejects unsupported horizons and keeps real decisions HOLD',()=>{
 const rows=sample().slice(0,1020),r=G.forecast(rows),prev=G.forecast(rows);
 assert.deepEqual(r,prev);assert.equal(r.productionAuthority,'HOLD');
 assert(['FROZEN-V14','AVAILABILITY-RESEARCH'].includes(r.route));
 assert.equal(G.forecast(rows.slice(0,80)).status,'HOLD');
 assert.equal(G.forecast(rows,{horizon:7}).status,'HOLD');
});
test('independent generator covers four different causal inventory disruptions',()=>{
 for(const mode of ['markov','supplier','seasonal','intermittent']){
  const x=STRESS.generate(mode,1301),y=STRESS.generate(mode,1301);
  assert.deepEqual(x,y);assert.equal(x.daily.length,1080);assert(x.daily.some(r=>r.stockout));
  assert(x.daily.every(r=>Number.isFinite(r.net_sales)&&r.net_sales>=0));
  const result=A.estimate(x.daily.slice(0,980),30);
  assert.equal(result.productionAuthority,'HOLD');
 }
});
test('frozen old bridge files remain unchanged and candidate failures remain reported',()=>{
 const R=require('../lab/availability_report.js');
 const sample=R.trial(STRESS.generate('supplier',2309).daily);
 assert(sample.metrics.availabilityWape<100);assert(sample.metrics.frozenWape>0);
 assert(sample.metrics.folds===10);assert(sample.metrics.gatedWape>=0);
 assert(sample.metrics.gatedWape>sample.metrics.frozenWape,'Known adverse seed cannot be concealed by reporting only improvements');
});
