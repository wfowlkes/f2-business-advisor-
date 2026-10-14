'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const X=require('../experience/framework.js');
const make=(count=150,refunds=false)=>Array.from({length:count},(_,i)=>({date:new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10),net_sales:i<143?100:140,orders:10,...(refunds?{refunds:10}:{})}));
test('no source means no customer features, no forecast cards or source status',()=>{
 const d=X.createDataset();assert.equal(d.connected,false);assert.deepEqual(d.registry,[]);assert.equal(d.authority,'HOLD');
});
test('synthetic source shows only available aggregate modules, never inventory/customer or refunds',()=>{
 const rows=make(),data=X.createDataset({source:'SYNTHETIC',daily:rows,analysis:{forecasts:{7:{point:100},30:{point:400}}}});
 assert(data.registry.some(m=>m.id==='revenue'));assert(data.registry.some(m=>m.id==='orders'));assert(data.registry.some(m=>m.id==='forecast7'));
 assert(!data.registry.some(m=>['customers','inventory','refunds'].includes(m.id)));
 assert.match(data.disclaimer,/Simulated/);assert.equal(data.authority,'HOLD');
});
test('returns and inventory require actual explicit source capabilities and finite values',()=>{
 const rows=make(140,true),d=X.createDataset({source:'IMPORTED',daily:rows,metrics:{inventoryUnits:12,customers:24},capabilities:{inventory:true,customerActivity:true,refunds:true}});
 assert(d.registry.some(m=>m.id==='customers'));assert(d.registry.some(m=>m.id==='inventory'));assert(d.registry.some(m=>m.id==='refunds'));
 const q=X.createDataset({source:'IMPORTED',daily:rows,metrics:{inventoryUnits:12,customers:24},capabilities:{inventory:false,refunds:false}});
 assert(!q.registry.some(m=>['customers','inventory','refunds'].includes(m.id)));
});
test('private snapshots remain unverified subtotal proxies and no fake forecasts',()=>{
 const d=X.fromSnapshot({status:'HOLD',provenance:{mode:'SHOPIFY',currency:'USD'},sample:make(20).map(x=>({date:x.date,subtotalProxy:x.net_sales,orders:x.orders}))});
 assert.equal(d.kind,'SHOPIFY');assert.match(d.disclaimer,/subtotal proxy/);assert(!d.feature['forecast.7']);
});
test('duplicate/out-of-order dates fail source gating',()=>{const rows=make();rows[20].date=rows[19].date;assert.equal(X.createDataset({source:'SYNTHETIC',daily:rows}).connected,false);});
test('selection ignores disabled modules and unknown IDs',()=>{const d=X.createDataset({source:'SYNTHETIC',daily:make()});const s=X.selection(d,['inventory','orders','stranger','orders']);assert.deepEqual(s.selected,['orders']);assert(s.hidden.includes('inventory'));});
test('visible inflection requires at least two observed weeks and is historical',()=>{
 const d=X.createDataset({source:'SYNTHETIC',daily:make()});assert.equal(d.change.direction,'up');assert(d.change.percent>12);assert.equal(d.change.method,'prior-versus-latest-7-day-average');
 const no=X.createDataset({source:'SYNTHETIC',daily:make(20)});assert.equal(no.change,null);
});
test('local insights refuse unsupported requests',()=>{const d=X.createDataset({source:'SYNTHETIC',daily:make()});assert.match(X.localAnswer(d,'Restock?'),/isn.t connected/i);assert.match(X.localAnswer(d,'customers'),/not connected/i);assert.match(X.localAnswer(d,'orders'),/aggregated orders/i);});
test('framework tracks sanitized bounded changes, holds learning and never mutates model parameters',()=>{let n=0;const fw=X.createFramework(()=>String(++n));for(let i=0;i<250;i++)fw.emit('carousel-change',{module:'revenue',source:'SYNTHETIC'});assert.equal(fw.events().length,200);assert.equal(fw.events()[0].id,51);assert.throws(()=>fw.emit('auto-promote'),/Unsupported/);assert.equal(fw.proposal('New regime needs testing').authority,'HOLD');});

test('only source-backed features are rendered in registry and missing rows cannot generate unsupported metrics',()=>{const x=make(140);x[5].orders=null;const d=X.createDataset({source:'SYNTHETIC',daily:x});assert(!d.registry.some(m=>m.id==='orders'));assert(d.registry.some(m=>m.id==='revenue'));});
