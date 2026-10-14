'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const D=require('../demo_database.js'),Gen=require('../../experience/demo60.js');
const X=require('../../experience/framework.js'),F2=require('../../experience/core.js');
test('SQLite database initializes two months of deterministic synthetic records',()=>{
 const db=D.createDemoDatabase({now:()=>new Date('2026-10-14T03:00:00Z')});
 try {const x=db.snapshot();assert.equal(x.database.engine,'SQLite');assert.equal(x.database.rows,60);assert.equal(x.daily.length,60);assert.equal(x.daily[0].date,'2026-08-15');assert.equal(x.daily.at(-1).date,'2026-10-13');assert.equal(x.source,'SYNTHETIC DATABASE');assert.equal(x.status,'HOLD');assert.deepEqual(x.daily.map(r=>r.net_sales),Gen.generate('2026-10-13').daily.map(r=>r.net_sales));}finally{db.close();}
});
test('simulated promotion spike, stockout decline and recovery are in SQL, no personal information',()=>{
 const db=D.createDemoDatabase({now:()=>new Date('2026-10-14T12:00:00Z')});try{const r=db.snapshot().daily;assert(r.some(x=>x.phase==='promotion'));assert(r.some(x=>x.phase==='supply disruption'&&x.stockout_products>0));assert(r.some(x=>x.phase==='recovery'&&!x.stockout));assert(r.every(x=>x.net_sales>=0&&Number.isInteger(x.orders)&&Number.isInteger(x.inventory_units)));assert(r.every(x=>!Object.keys(x).some(k=>/email|address|phone|name|customer_id/i.test(k))));}finally{db.close();}
});
test('data rolls forward on next completed UTC date, preserving exactly 60 rows',()=>{
 let when=new Date('2026-10-14T23:55:00Z');const db=D.createDemoDatabase({now:()=>when});try{let old=db.snapshot();when=new Date('2026-10-15T00:01:00Z');let next=db.snapshot();assert.equal(next.database.rows,60);assert.equal(next.daily.at(-1).date,'2026-10-14');assert.equal(next.daily[0].date,'2026-08-16');assert.notEqual(old.daily.at(-1).date,next.daily.at(-1).date);}finally{db.close();}
});
test('only source-backed modules become available with bounded 60-day exploratory forecasts',()=>{
 const db=D.createDemoDatabase({now:()=>new Date('2026-10-14')});try{const ds=X.fromDemo60(F2,db.snapshot());assert.equal(ds.kind,'SYNTHETIC');assert.equal(ds.authority,'HOLD');assert.equal(ds.rows.length,60);assert(ds.registry.some(x=>x.id==='refunds'));assert(ds.registry.some(x=>x.id==='inventory'));assert(ds.registry.some(x=>x.id==='customers'));assert(ds.registry.some(x=>x.id==='forecast7'));assert(ds.registry.some(x=>x.id==='forecast30'));assert.equal(ds.provenance.database,'SQLite');assert.match(X.localAnswer(ds,'restock risks'),/simulated inventory/);assert.match(X.localAnswer(ds,'returning customers'),/not unique customers/);}finally{db.close();}
});
test('reject falsified or incomplete 60-day database and never enable absent imports',()=>{
 const demo=Gen.generate('2026-10-13');assert.throws(()=>X.fromDemo60(F2,{...demo,daily:demo.daily.slice(1)}),/Invalid synthetic/);
 assert.throws(()=>X.fromDemo60(F2,{...demo,daily:demo.daily.map((r,i)=>i===7?{...r,inventory_units:null}:r)}),/Incomplete/);
 const imported=X.fromImport(F2,'date,net_sales,orders\n2026-10-11,120,3\n2026-10-12,130,4');assert(imported.registry.some(x=>x.id==='revenue'));assert(!imported.registry.some(x=>x.id==='inventory'));assert(!imported.registry.some(x=>x.id==='forecast7'));});
