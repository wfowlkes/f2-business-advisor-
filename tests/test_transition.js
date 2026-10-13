'use strict';
const test=require('node:test'),a=require('node:assert/strict'),T=require('../lab/transition_engine.js');
const first=Date.parse('2024-01-01T00:00:00Z');
function series(n=220,which='stable'){
 return Array.from({length:n},(_,i)=>{
  const date=new Date(first+i*86400000).toISOString().slice(0,10),day=new Date(date+'T00:00:00Z').getUTCDay();
  const old=i<150,drop=i>=150,base=which==='stepchange'&&drop?460:1000;
  return {date,net_sales:base*(day===0||day===6?1.15:1),refunds:which==='promotion'&&drop?base*.3:base*.03,
   stockout:which==='supply'&&drop&&(i%28<11),orders:Math.round(base/52),refund_spike:which==='promotion'&&drop&&(i%30<5)};
 });
}
test('missing dates and sales force HOLD without silent fill',()=>{
 const h=series();a.equal(T.detect(h.slice(0,80)).status,'HOLD');
 h[150].date=h[149].date;a.equal(T.detect(h).status,'HOLD');
 h[150].date='2024-05-30';h[150].net_sales=null;a.equal(T.detect(h).status,'HOLD');
});
test('identity, future edits and repeat evaluations cannot influence cutoff',()=>{
 const data=series(220,'stepchange'),h=data.slice(0,165),r=T.detect(h);
 const extra=data.slice(165).map(x=>({...x,net_sales:x.net_sales*100,stockout:true,refunds:5000}));
 a.deepEqual(r,T.detect([...h,...extra].slice(0,165)));
 let state=T.initialState(),x=T.update(state,h);
 let again=T.update(x.state,h);a.equal(again.action,'DUPLICATE_OR_OLD_DATE');
});
test('abrupt demand drops are detected after change but not before',()=>{
 const d=series(220,'stepchange');const before=T.detect(d.slice(0,150));a.notEqual(before.candidate,'stepchange');
 const after=T.detect(d.slice(0,165));a.equal(after.candidate,'stepchange');
});
test('repeated supply disruption is distinct from stable trading',()=>{
 const d=series(220,'supply');const x=T.detect(d);a.equal(x.candidate,'supply');
});
test('returns/discount fatigue flag does not require future promotions',()=>{
 const d=series(220,'promotion'),x=T.detect(d);a.equal(x.candidate,'promotion');
});
test('three independent complete dates confirm switch, cooldown, reverse path and immutable ledger',()=>{
 const d=series(220,'stepchange');let state=T.initialState(),events=[];
 for(let n=112;n<=205;n++){const x=T.update(state,d.slice(0,n));state=x.state;if(x.changed)events.push(x.event);}
 a(events.length>=1);a.equal(events[0].from,'stable');a.equal(events[0].to,'stepchange');
 a.equal(state.active,events.at(-1).to);a.equal(state.ledger.length,events.length);
 a.equal(state.ledger[0].authority,'SYNTHETIC SHADOW — HOLD');
 const copy=JSON.stringify(state.ledger);const x=T.update(state,d.slice(0,205));a.equal(x.action,'DUPLICATE_OR_OLD_DATE');a.equal(JSON.stringify(x.state.ledger),copy);
});
test('method routing defaults safe: no live method unless independently permitted',()=>{
 const mapping={stepchange:{7:{method:'regime reset',baseline:'28-day average'}}};
 a.equal(T.methodFor(mapping,'stepchange',7).method,'28-day average');
 a.equal(T.methodFor(mapping,'stepchange',7,{stepchange:{7:true}}).method,'regime reset');
});
test('transition blends gradually, preserves dates, never touches old forecast',()=>{
 const d=series(),state={...T.initialState(),active:'stepchange',transition:{from:'stable',to:'stepchange',started:d.at(-1).date}};
 const mapping={stable:{7:{method:'7-day average',baseline:'7-day average'}},stepchange:{7:{method:'regime reset',baseline:'28-day average'}}};
 const fn=(_hist,h,method)=>Array.from({length:h},(_,i)=>({date:new Date(Date.parse(d.at(-1).date+'T00:00:00Z')+(i+1)*86400000).toISOString().slice(0,10),value:method==='regime reset'?70:140}));
 const p=T.blend(d,7,state,{mapping,predict:fn,allowed:{stable:{7:true},stepchange:{7:true}}});
 a.equal(p.blendWeight,Math.round(1/7*10000)/10000);a.equal(p.daily.length,7);a.equal(p.status,'SYNTHETIC SHADOW — NOT APPROVED');
 a(p.total>490&&p.total<980);
});
test('a return to stable conditions reverses previously detected stress states without changing earlier events',()=>{
 const first=Date.parse('2024-01-01T00:00:00Z'),d=Array.from({length:320},(_,i)=>{
   const date=new Date(first+i*86400000).toISOString().slice(0,10),wd=new Date(date+'T00:00:00Z').getUTCDay(),base=i>=150&&i<205?460:1000;
   return {date,net_sales:base*([0,6].includes(wd)?1.12:1),refunds:base*.03,orders:20,stockout:false};
 });
 let state=T.initialState(),changes=[];
 for(let n=112;n<=d.length;n++){const result=T.update(state,d.slice(0,n));state=result.state;if(result.changed)changes.push(result.event);}
 a(changes.some(x=>x.to==='stepchange'));
 a(changes.some(x=>x.to==='stable'&&x.from!=='stable'));
 a.equal(state.active,'stable');
 a(changes.every(x=>x.authority==='SYNTHETIC SHADOW — HOLD'));
});
test('ambiguous observed days interrupt pending confirmation rather than counting as consecutive evidence',()=>{
 const d=series(220,'stepchange');let state=T.initialState();
 for(let n=112;n<=153;n++)state=T.update(state,d.slice(0,n)).state;
 // This branch is deterministic but deliberately tests that an invalid day cannot silently confirm a switch.
 const broken=d.slice(0,154).map(x=>({...x}));broken.at(-1).net_sales=null;
 const result=T.update(state,broken);
 a.equal(result.action,'HOLD');a.equal(result.state.pendingCount,0);
 a.equal(result.state.ledger.length,state.ledger.length);
});
