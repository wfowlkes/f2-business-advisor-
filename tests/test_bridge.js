'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const B=require('../lab/bridge_engine.js'),T=require('../lab/transition_engine.js'),L=require('../lab/synthetic.js'),M=require('../lab/scenario_methods.js'),R=require('../lab/bridge_report.js');
const stored=JSON.parse(fs.readFileSync(path.join(__dirname,'../lab/bridge-summary.json')));
const same=(x,y)=>assert.deepEqual(x,y);
test('existing frozen v1.3 transition engine still independently available',()=>{
 assert.equal(T.VERSION,'F2 Scenario Transitions 1.3.0');assert.equal(B.VERSION,'F2 Transition Bridge 1.4');
 assert.equal(Object.keys(B.SHADOW_GATES).length,2);
 assert.equal(B.SHADOW_GATES.promotion[7],.75);assert.equal(B.SHADOW_GATES.supply[30],.70);
 assert(!B.SHADOW_GATES.supply[7]&&!B.SHADOW_GATES.promotion[30]);
});
test('promotion fatigue uses causal observed returns, not future campaign data',()=>{
 const d=L.generate('promotion',731111).daily,cut=860,history=d.slice(0,cut);
 const obs=B.detect(history),copy=d.map((x,i)=>i>=cut?{...x,refund_spike:false,refunds:x.refunds*50,net_sales:3}:x);
 same(obs,B.detect(copy.slice(0,cut)));assert.equal(obs.candidate,'promotion');
 const actual=B.bridgeForecast(history,7,'promotion');same(actual,B.bridgeForecast(copy.slice(0,cut),7,'promotion'));
 assert.equal(actual[0].date,require('../core.js').addDay(history.at(-1).date,1));
});
test('supply indicator counts prior constraints and refuses to read future stockouts',()=>{
 const rows=L.generate('supply',842222).daily,cut=1000,history=rows.slice(0,cut);
 let obs=B.detect(history),changed=rows.map((x,i)=>i>=cut?{...x,net_sales:x.net_sales*100,stockout:!x.stockout}:x);
 same(obs,B.detect(changed.slice(0,cut)));
 const forecast=B.bridgeForecast(history,30,'supply');same(forecast,B.bridgeForecast(changed.slice(0,cut),30,'supply'));
 assert.equal(forecast.length,30);
});
test('all missing or invalid daily observations HOLD before routing',()=>{
 const d=L.generate('promotion',731111).daily.slice(0,200);
 assert.equal(B.detect(d.slice(0,100)).status,'HOLD');
 const invalid=d.map(x=>({...x}));invalid[145].date=invalid[144].date;
 assert.equal(B.detect(invalid).status,'HOLD');
 const missing=d.map(x=>({...x}));missing[150].net_sales=null;
 assert.equal(B.detect(missing).status,'HOLD');
});
test('controller uses multi-day confirmation, duplicate protection, and bounded reversible ledger',()=>{
 const ds=L.generate('volatile',731111).daily;
 const out=B.replay(ds);
 for(const e of out.events)assert.equal(e.authority,'SYNTHETIC SHADOW — HOLD');
 for(let i=1;i<out.events.length;i++)assert(Date.parse(out.events[i].date)-Date.parse(out.events[i-1].date)>=70*86400000);
 for(const e of out.events)assert(out.events.filter(x=>{let dist=Date.parse(e.date)-Date.parse(x.date);return dist>=0&&dist<=90*86400000}).length<=2);
 let before=JSON.stringify(out.state.ledger),again=B.update(out.state,ds);
 assert.equal(again.action,'DUPLICATE');assert.equal(JSON.stringify(again.state.ledger),before);
});
test('gated bridge is horizon-specific, defaults to frozen router, never authorizes production',()=>{
 const ds=L.generate('promotion',731111).daily.slice(0,905),state=B.replay(ds).state;
 const legacy={daily:M.predict(ds,7,'28-day average'),total:M.predict(ds,7,'28-day average').reduce((s,x)=>s+x.value,0)};
 const p=B.hybridForecast(ds,7,state,legacy),q=B.hybridForecast(ds,30,state,{daily:M.predict(ds,30,'28-day average'),total:35});
 assert.equal(p.status,'SYNTHETIC SHADOW — HOLD');assert.equal(p.route,state.active==='promotion'?'BRIDGE':'LEGACY');
 assert.equal(q.route,'LEGACY');assert.equal(q.total,35);
});
test('the published challenge manifest preserves independent seeds and research HOLD',()=>{
 assert.deepEqual(stored.seedGroups.challenge,[731111,842222,953333]);
 assert.equal(stored.businesses.length,9);assert.equal(stored.authority,'HOLD');
 assert.equal(stored.provenance.v13Hash,require('crypto').createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../lab/transition_engine.js'))).digest('hex'));
 assert.equal(stored.provenance.bridgeHash,require('crypto').createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../lab/bridge_engine.js'))).digest('hex'));
 for(const b of stored.businesses){for(const h of [7,30]){assert.equal(b.horizons[h].perSeed.length,3);assert(b.horizons[h].perSeed.every(x=>x.seed>0));}}
});
test('fixed challenge control: compare same seed against frozen router with no oracle regime input',()=>{
 const a=R.trial('promotion',731111);assert(a.horizon[7].hybrid.wape<a.horizon[7].v13.wape);
 assert.equal(a.horizon[30].hybrid.wape,a.horizon[30].v13.wape);
 const s=R.trial('supply',842222);assert(s.horizon[30].hybrid.wape<s.horizon[30].v13.wape);
 assert.equal(s.horizon[7].hybrid.wape,s.horizon[7].v13.wape);
});
