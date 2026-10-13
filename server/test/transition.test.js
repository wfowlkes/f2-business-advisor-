'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createServer}=require('../app.js');
const T=require('../../lab/transition_engine.js'),LAB=require('../../lab/synthetic.js'),M=require('../../lab/scenario_methods.js');
const frozen=require('../../lab/selection-frozen.json'),R=require('../../lab/transition_report.js');
test('all existing simulated stores can be examined without oracle regime features or future data',()=>{
 for(const type of LAB.TYPES){const ds=LAB.generate(type.id,70409),h=ds.daily.slice(0,960),r=T.detect(h);
  assert(r.asOf===h.at(-1).date);assert(['OBSERVED','HOLD'].includes(r.status));
  const future=ds.daily.map((x,i)=>i>=960?{...x,net_sales:0,stockout:true,refunds:9999}:x);
  assert.deepEqual(r,T.detect(future.slice(0,960)));
  assert(!JSON.stringify(r).includes('simulatorType'));
 }
});
test('read-only automatic routing cannot activate candidate methods without a research gate',()=>{
 const gates=R.allowShadow();
 assert.equal(typeof gates.stable[7],'boolean');
 for(const type of LAB.TYPES)for(const h of [7,30]){
  const v=T.methodFor(frozen.selection,type.id,h,{});
  assert.equal(v.eligible,false);
  assert.equal(v.method,frozen.selection[type.id][h].baseline);
 }
});
test('historical transition score uses only prior cutoffs, retains frozen decisions, and stays HOLD',()=>{
 const trial=R.scenarioTrial('stepchange',740001);assert.equal(trial.productionStatus,'HOLD');
 for(const h of [7,30]){const s=trial.scores[h];assert(s.router.folds>=8);assert(Number.isFinite(s.router.wape));assert(Number.isFinite(s.genericBaseline.wape));}
 assert(trial.events.every(x=>x.authority==='SYNTHETIC SHADOW — HOLD'));
});

test('transition research assets are excluded from non-demo server and original merchant API stays guarded',async()=>{
 const KEY='transition_validation_private_key_01234567891234567';
 for(const demo of [true,false]){
  const srv=createServer({env:{F2_DASHBOARD_KEY:KEY,F2_DEMO_MODE:demo?'true':'false',NODE_ENV:'production',F2_BASE_URL:'https://preview.invalid'},client:{getDaily:async()=>{throw Error('Never access Shopify in this test');}}});
  await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
  try{
   const base='http://127.0.0.1:'+srv.address().port;
   for(const page of ['/lab/transitions.html','/lab/transition_engine.js','/lab/transition_ui.js','/lab/transition-results.json','/lab/selection-frozen.json']){
    const r=await fetch(base+page,{headers:{'X-Forwarded-Proto':'https'}});
    assert.equal(r.status,demo?200:404,page);
    assert(!((await r.text()).includes(KEY)));
   }
   const api=await fetch(base+'/api/snapshot',{headers:{'X-Forwarded-Proto':'https'}});assert.equal(api.status,401);
  }finally{await new Promise(resolve=>srv.close(resolve));}
 }
});
