'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {createServer}=require('../app.js');
// Render's existing build command already executes server/test/*.test.js.
// Reuse the complete scenario regression suite as a deployment gate.
require('../../tests/test_synthetic_lab.js');
const KEY='synthetic_only_lab_testing_key_0123456789_012345';
async function withServer(demo,fn){const env={F2_DASHBOARD_KEY:KEY,F2_DEMO_MODE:demo?'true':'false',NODE_ENV:'production',F2_BASE_URL:'https://preview.example.test'};
 const client={getDaily:async()=>{throw Error('Live merchant data must not be called during synthetic testing');}};
 const srv=createServer({env,client});await new Promise(res=>srv.listen(0,'127.0.0.1',res));
 try{await fn('http://127.0.0.1:'+srv.address().port)}finally{await new Promise(res=>srv.close(res))}}
const reqOpts={headers:{'X-Forwarded-Proto':'https'}};
test('synthetic lab assets are public only in demo mode, and private live APIs remain key-protected',async()=>{
 await withServer(true,async(base)=>{
  for(const pathname of ['/lab/','/lab/index.html','/lab/synthetic.js','/lab/ui.js','/lab/style.css','/lab/strategies.html','/lab/strategies.js','/lab/strategy-summary.json','/lab/calendar-stress.json','/core.js']){
   const r=await fetch(base+pathname,reqOpts);assert.equal(r.status,200,pathname);assert(!((await r.text()).includes(KEY)),pathname);
  }
  let r=await fetch(base+'/lab',reqOpts);assert.equal(r.status,200);assert(r.url.endsWith('/lab/'));
  r=await fetch(base+'/api/snapshot',reqOpts);assert.equal(r.status,401);
  r=await fetch(base+'/health');assert.equal(r.status,200);
 });
 await withServer(false,async(base)=>{
  for(const pathname of ['/lab/','/lab/synthetic.js','/lab/strategies.html','/lab/strategy-summary.json','/lab/calendar-stress.json','/core.js']){const r=await fetch(base+pathname,reqOpts);assert.equal(r.status,404,pathname)}
 });
});

test('strategy report publicly available only as precomputed synthetic evidence, not merchant data',async()=>{
 await withServer(true,async(base)=>{const r=await fetch(base+'/lab/strategy-summary.json',reqOpts);
  assert.equal(r.status,200);const data=await r.json();assert.equal(data.productionStatus,'HOLD');
  assert.equal(data.businessCount,9);assert.equal(data.businesses.length,9);
  assert(!JSON.stringify(data).includes('SHOPIFY_CLIENT_SECRET'));
  assert(data.businesses.every(b=>b.horizons[7].productionStatus==='HOLD'&&b.horizons[30].productionStatus==='HOLD'));
 });
});
