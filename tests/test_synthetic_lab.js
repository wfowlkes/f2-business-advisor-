'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const LAB=require('../lab/synthetic.js');
const F2=require('../core.js');
const sales=xs=>xs.reduce((s,x)=>s+x.net_sales,0)/Math.max(xs.length,1);

test('nine businesses each yield 1080 daily deterministic and distinct, non-PII observations',()=>{
 const fingerprints=new Set();
 for(const type of LAB.TYPES){
  const d=LAB.generate(type.id,101);const again=LAB.generate(type.id,101);
  assert.equal(d.daily.length,1080);assert.equal(d.daily[0].date,'2023-10-29');
  assert.equal(d.daily[d.daily.length-1].date,LAB.AS_OF);
  assert.equal(d.fingerprint,again.fingerprint);assert.deepEqual(d.daily,again.daily);
  assert(d.daily.every(x=>Number.isFinite(x.net_sales)&&x.net_sales>=0&&x.orders>=0&&x.refunds>=0&&x.new_customers+x.returning_customers===x.orders));
  assert(d.daily.every(x=>!('email'in x)&&!('customer_id'in x)&&!('order_id'in x)));
  fingerprints.add(d.fingerprint);
 }
 assert.equal(fingerprints.size,9);
 assert.notEqual(LAB.generate('stable',101).fingerprint,LAB.generate('stable',102).fingerprint);
});

test('synthetic scenario behavior covers growth, decline, holiday seasons, stockouts and refund surges',()=>{
 const g=LAB.generate('growth',101).daily,decline=LAB.generate('decline',101).daily,s=LAB.generate('seasonal',101).daily,v=LAB.generate('volatile',101).daily;
 assert(sales(g.slice(-60))>sales(g.slice(0,60))*2);
 assert(sales(decline.slice(-60))<sales(decline.slice(0,60))*.5);
 const winter=s.filter(x=>x.date.slice(5,7)==='12'),summer=s.filter(x=>x.date.slice(5,7)==='06');
 assert(sales(winter)>sales(summer)*2.5);
 assert(v.filter(x=>x.stockout).length>30);
 assert(v.filter(x=>x.refund_spike).length>15);
});

test('strict input limits and reproducibility guards',()=>{
 assert.throws(()=>LAB.generate('not-real'),/Unknown/);
 assert.throws(()=>LAB.generate('stable',0),/Seed/);
 assert.throws(()=>LAB.generate('stable',1,{asOf:'2026-02-30'}),/Invalid/);
 assert.throws(()=>LAB.generate('stable',1,{days:80}),/Days/);
 assert.throws(()=>LAB.evaluate(LAB.generate('stable',101,{days:800})),/1000 days/);
 assert.throws(()=>LAB.batch({seed:0}),/Seed/);
 assert.throws(()=>LAB.batch({seeds:9}),/seeds/);
});

test('selected models are chosen ONLY on validation and measured on independent holdout',()=>{
 const original=LAB.generate('stable',33),baseline=LAB.evaluate(original);
 for(const h of [7,30]){
  let t=baseline.tests[h];assert(t.champion&&t.candidate);
  assert(t.validation[t.champion].folds>=8);assert(t.holdout[t.champion].folds>=8);
  assert(t.holdout[t.champion].firstTarget>baseline.split.validation.end);
  assert(t.validation[t.champion].lastTarget<=baseline.split.validation.end);
  assert(t.holdout[t.champion].lastTarget<=baseline.split.holdout.end);
  assert.equal(t.decisionAuthority,'HOLD');
  assert.equal(baseline.nextForecast[h].status,'NOT APPROVED');
  assert.equal(baseline.nextForecast[h].start,F2.addDay(original.asOf,1));
 }
 const tampered={...original,daily:original.daily.map((r,i)=>i>=780?{...r,net_sales:r.net_sales*4}:r)};
 const revised=LAB.evaluate(tampered);
 for(const h of [7,30]){
  assert.equal(baseline.tests[h].champion,revised.tests[h].champion);
  assert.equal(baseline.tests[h].candidate,revised.tests[h].candidate);
  assert.deepEqual(baseline.tests[h].validation,revised.tests[h].validation);
  assert.notEqual(baseline.tests[h].championHoldoutWape,revised.tests[h].championHoldoutWape);
 }
});

test('all methods are time-aligned and no missing day is silently treated as zero',()=>{
 const ds=LAB.generate('stable',49),h=30;
 for(const method of LAB.METHODS){let hist=ds.daily.slice(0,500);let pred=LAB.predict(hist,h,method);assert.equal(pred.length,h);
  assert.equal(pred[0].date,F2.addDay(hist[hist.length-1].date,1));}
 const broken={...ds,daily:ds.daily.slice()};broken.daily[500]={...broken.daily[500],net_sales:null};
 assert.throws(()=>LAB.evaluate(broken),/Incomplete/);
 broken.daily[500]={...ds.daily[500],date:ds.daily[499].date};
 assert.throws(()=>LAB.evaluate(broken),/Incomplete/);
});

test('batch yields all nine stores × three replicates and never authorizes production learning',()=>{
 const report=LAB.batch({seed:101,seeds:3});
 assert.equal(report.productionStatus,'HOLD');assert.equal(report.businesses.length,9);
 assert.equal(report.businesses.reduce((s,b)=>s+b.runs.length,0),27);
 for(const b of report.businesses){for(const h of [7,30]){
  assert.equal(b.summary[h].runs,3);
  assert(b.summary[h].championWape!==null);
  assert(['KEEP CHAMPION / INVESTIGATE','FORWARD-TIME EXPERIMENT CANDIDATE'].includes(b.summary[h].action));
  assert(b.runs.every(x=>x.productionStatus==='HOLD'&&x.tests[h].decisionAuthority==='HOLD'));
 }}
 assert.equal(JSON.stringify(report),JSON.stringify(LAB.batch({seed:101,seeds:3})));
});


test('original five generator fingerprints are identical to frozen v1',()=>{
 const known={stable:'f8683ce1',growth:'1ecf33be',decline:'8826088e',seasonal:'cfad1c17',volatile:'6af076f4'};
 for(const [type,expected] of Object.entries(known))assert.equal(LAB.generate(type,101).fingerprint,expected);
});
test('new synthetic regime shifts are visible without using any identifying information',()=>{
 const step=LAB.generate('stepchange',101).daily,promo=LAB.generate('promotion',101).daily;
 const supply=LAB.generate('supply',101).daily,shift=LAB.generate('weekdayshift',101).daily;
 assert(sales(step.slice(-70))<sales(step.slice(650,720))*.75);
 assert(promo.slice(-200).reduce((s,x)=>s+x.refunds,0)>promo.slice(0,200).reduce((s,x)=>s+x.refunds,0));
 assert(supply.slice(780).filter(x=>x.stockout).length>30);
 const weekend=a=>sales(a.filter(x=>[0,6].includes(new Date(x.date+'T00:00:00Z').getUTCDay())));
 const midweek=a=>sales(a.filter(x=>[2,3].includes(new Date(x.date+'T00:00:00Z').getUTCDay())));
 assert(weekend(shift.slice(0,240))>midweek(shift.slice(0,240)));
 assert(weekend(shift.slice(-240))<midweek(shift.slice(-240)));
});
test('shadow challenger is fixed, reproducible, horizon aligned and does not change v1 baseline selection',()=>{
 const ds=LAB.generate('stepchange',404),before=LAB.evaluate(ds);
 for(const h of [7,30]){
  const shadow=before.tests[h].shadow;
  assert(shadow.folds>=8);assert.equal(shadow.action,'NO AUTOMATIC MODEL PROMOTION / PRODUCTION HOLD');
  assert(shadow.holdoutWape>=0);assert.equal(before.tests[h].decisionAuthority,'HOLD');
  const pred=LAB.predict(ds.daily.slice(0,780),h,'adaptive weekday');
  assert.equal(pred[0].date,F2.addDay(ds.daily[779].date,1));
  const altered={...ds,daily:ds.daily.map((r,i)=>i<780?r:{...r,net_sales:r.net_sales*4})};
  const after=LAB.evaluate(altered);
  assert.equal(before.tests[h].champion,after.tests[h].champion);
  assert.equal(before.tests[h].candidate,after.tests[h].candidate);
  assert.equal(before.tests[h].shadow.validationWape,after.tests[h].shadow.validationWape);
  assert.notEqual(before.tests[h].shadow.holdoutWape,after.tests[h].shadow.holdoutWape);
 }
});
test('future actuals cannot alter predictions frozen at the forecast cutoff',()=>{
 const d=LAB.generate('supply',62),cut=780;
 for(const h of [7,30]){
  const forecast=LAB.predict(d.daily.slice(0,cut),h,'adaptive weekday');
  const altered=d.daily.map((x,i)=>i<cut?x:{...x,net_sales:9999999});
  assert.deepEqual(forecast,LAB.predict(altered.slice(0,cut),h,'adaptive weekday'));
 }
});
