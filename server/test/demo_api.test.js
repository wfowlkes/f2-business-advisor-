'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createServer}=require('../app.js');
const env={NODE_ENV:'production',F2_BASE_URL:'https://example.test',F2_DASHBOARD_KEY:'k'.repeat(48),F2_DEMO_MODE:'true'};
async function server(environment){const s=createServer({env:environment,client:{getDaily:async()=>{throw Error('Mock only: no live merchant access');}},now:()=>new Date('2026-10-14T20:00:00Z').valueOf()});await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));return {url:`http://127.0.0.1:${s.address().port}`,close:()=>new Promise(resolve=>s.close(resolve))};}
const h={'X-Forwarded-Proto':'https'};
test('demo-only SQLite API returns 60 completed dates and source metadata without merchant data',async()=>{
 const s=await server(env);try{
  let r=await fetch(s.url+'/api/demo60',{headers:h});assert.equal(r.status,200);
  const body=await r.json();assert.equal(body.daily.length,60);assert.equal(body.database.engine,'SQLite');assert.equal(body.source,'SYNTHETIC DATABASE');assert.equal(body.provenance.mode,'DEMO');assert.equal(body.status,'HOLD');
  assert(!body.daily.some(x=>'phase' in x));assert(!JSON.stringify(body).includes(env.F2_DASHBOARD_KEY));
  let caps=await (await fetch(s.url+'/api/capabilities',{headers:h})).json();assert.equal(caps.demoDatabase,true);assert.equal(caps.chatgptEnabled,false);
  r=await fetch(s.url+'/experience/demo60.js',{headers:h});assert.equal(r.status,200);assert.match(await r.text(),/liberient-synthetic-retail-60d/);
 }finally{await s.close();}
});
test('synthetic database route is hidden when demo mode is disabled; merchant snapshot remains protected',async()=>{
 const s=await server({...env,F2_DEMO_MODE:'false'});try{
  let r=await fetch(s.url+'/api/demo60',{headers:h});assert.equal(r.status,404);
  r=await fetch(s.url+'/api/snapshot',{headers:h});assert.equal(r.status,401);
  const x=await (await fetch(s.url+'/api/capabilities',{headers:h})).json();assert.equal(x.demoDatabase,false);
 }finally{await s.close();}
});
test('cannot modify demo records using HTTP or obtain a private assistant without consent',async()=>{
 const s=await server(env);try{
  let r=await fetch(s.url+'/api/demo60',{method:'POST',headers:h});assert.equal(r.status,405);
  r=await fetch(s.url+'/api/assistant',{method:'POST',headers:{...h,'Content-Type':'application/json'},body:'{}'});assert.equal(r.status,404);
 }finally{await s.close();}
});
