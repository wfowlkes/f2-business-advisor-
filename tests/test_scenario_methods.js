'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const M=require('../lab/scenario_methods.js'),LAB=require('../lab/synthetic.js'),F2=require('../core.js');
const frozen=JSON.parse(fs.readFileSync(path.join(__dirname,'../lab/selection-frozen.json'),'utf8'));
const published=JSON.parse(fs.readFileSync(path.join(__dirname,'../lab/strategy-summary.json'),'utf8'));

test('scenario-specific registry includes 12 declared strategies, nine scenarios, two horizons',()=>{
 assert.equal(M.METHODS.length,12);assert.equal(new Set(M.METHODS).size,12);assert.equal(LAB.TYPES.length,9);
 assert.deepEqual(M.HORIZONS,[7,30]);assert.equal(frozen.productionStatus,'HOLD');
 assert.equal(published.productionStatus,'HOLD');assert.equal(published.businessCount,9);
});
test('all methods are time aligned and none consumes known future stockout or promotion flags',()=>{
 const dataset=LAB.generate('supply',1205),cutoff=780;
 for(const h of [7,30])for(const method of M.METHODS){
  const earlier=dataset.daily.slice(0,cutoff),res=M.predict(earlier,h,method);
  assert.equal(res.length,h,method);assert.equal(res[0].date,F2.addDay(earlier.at(-1).date,1));
  const withModifiedFuture=dataset.daily.map((r,i)=>i>=cutoff?{...r,stockout:!r.stockout,net_sales:r.net_sales*100,promotion:true}:r);
  assert.deepEqual(res,M.predict(withModifiedFuture.slice(0,cutoff),h,method));
 }
});
test('old v1.0 fingerprints remain frozen, independent of new research',()=>{
 const expected={stable:'f8683ce1',growth:'1ecf33be',decline:'8826088e',seasonal:'cfad1c17',volatile:'6af076f4'};
 for(const [type,hash] of Object.entries(expected))assert.equal(LAB.generate(type,101).fingerprint,hash);
});
test('test-time data edits cannot affect development-validation scoring',()=>{
 const d=LAB.generate('weekdayshift',777),altered={...d,daily:d.daily.map((x,i)=>i>=780?{...x,net_sales:x.net_sales*500}:x)};
 for(const h of [7,30])for(const m of M.METHODS){
  const grade=(ds)=>M.score(ds.daily,h,m,480,780);
  assert.deepEqual(grade(d),grade(altered),m);
 }
});
test('frozen scenario mapping replays identically from development validation alone',()=>{
 const reproduced=M.frozenSelection();assert.deepEqual(reproduced,frozen);
 for(const t of LAB.TYPES)for(const h of M.HORIZONS){
  const v=frozen.selection[t.id][h];assert(M.METHODS.includes(v.method));assert(M.BASE.includes(v.baseline));
 }
});
test('independent challenge replays published figures with all failures, never promotes models',()=>{
 const full=M.challenge(frozen),compact=require('../lab/scenario_report.js').compact(full);
 assert.deepEqual(JSON.parse(JSON.stringify(compact)),published);
 assert(full.businesses.every(b=>[7,30].every(h=>b.horizons[h].productionStatus==='HOLD')));
 const promotion=full.businesses.find(x=>x.type==='promotion').horizons[30];
 assert(promotion.improvement<0);assert.equal(promotion.status,'FAIL — KEEP BASELINE');
});

test('calendar-shift synthetic challenge is reproducible with frozen selections and never becomes approved',()=>{
 const expected=require('../lab/calendar-stress.json'),actual=M.calendarStress(frozen);
 assert.deepEqual(JSON.parse(JSON.stringify(actual)),expected);
 assert.equal(actual.authority,'HOLD');
 assert(actual.businesses.every(b=>[7,30].every(h=>b.horizons[h].productionStatus==='HOLD')));
 const promo=actual.businesses.find(b=>b.type==='promotion');
 assert(promo.horizons[30].negativeGroups===3);
});
