'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {createServer}=require('../app.js');
const {aggregate}=require('../shopify.js');
const KEY='test_private_merchant_key_with_32_plus_characters_123';
const fixed=Date.parse('2026-10-13T20:00:00Z');
const mockClient={getDaily:async()=>aggregate([],{ianaTimezone:'America/Phoenix',currencyCode:'USD'},new Date(fixed),55)};
async function fixture(fn){const server=createServer({env:{F2_DASHBOARD_KEY:KEY},client:mockClient,now:()=>fixed});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));try{return await fn(`http://127.0.0.1:${server.address().port}`)}finally{await new Promise(resolve=>server.close(resolve))}}
test('requires long dashboard key; mandatory HTTPS in production',()=>{assert.throws(()=>createServer({env:{F2_DASHBOARD_KEY:'short'},client:mockClient}));assert.throws(()=>createServer({env:{NODE_ENV:'production',F2_DASHBOARD_KEY:KEY,F2_BASE_URL:'http://bad.test'},client:mockClient}));});
test('private API holds with auth, rejects invalid key and write methods, never exposes tokens',async()=>fixture(async(base)=>{
 const page=await fetch(base,{redirect:'manual'});assert.equal(page.status,302);assert.equal(page.headers.get('location'),'/experience/');
 const legacy=await fetch(base+'/legacy/');assert.equal(legacy.status,200);assert((await legacy.text()).includes('Private read-only portal'));
 const noAuth=await fetch(base+'/api/snapshot');assert.equal(noAuth.status,401);assert(!(await noAuth.text()).includes(KEY));
 const wrong=await fetch(base+'/api/snapshot',{headers:{Authorization:'Bearer wrong'}});assert.equal(wrong.status,401);
 const ok=await fetch(base+'/api/snapshot',{headers:{Authorization:'Bearer '+KEY}});assert.equal(ok.status,200);assert.equal(ok.headers.get('cache-control'),'no-store, private');let data=await ok.json();assert.equal(data.status,'HOLD');assert.equal(data.metrics.orders,0);assert.equal(data.analysis.tests[7].status,'HOLD');assert(!JSON.stringify(data).includes(KEY));
 const post=await fetch(base+'/api/snapshot',{method:'POST',headers:{Authorization:'Bearer '+KEY}});assert.equal(post.status,405);
 const health=await fetch(base+'/health');assert.deepEqual((await health.json()).ok,true);
}));

test('synthetic hosted demo requires no Shopify credentials and never claims live data',async()=>{
 const srv=createServer({env:{NODE_ENV:'production',F2_BASE_URL:'https://demo.example.test',F2_DASHBOARD_KEY:KEY,F2_DEMO_MODE:'true'},now:()=>fixed});
 await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
 try{
   const base='http://127.0.0.1:'+srv.address().port;
   const opts={headers:{'X-Forwarded-Proto':'https',Authorization:'Bearer '+KEY}};
   const resp=await fetch(base+'/api/snapshot',opts);
   assert.equal(resp.status,200);
   const data=await resp.json();
   assert.equal(data.status,'HOLD');
   assert.match(data.source,/DEMO/);
   assert.match(data.provenance.metric,/NOT SHOPIFY/);
   assert.equal(data.provenance.mode,'DEMO');
   assert.equal(data.analysis.tests[7].status,'HOLD');
 }finally{await new Promise(resolve=>srv.close(resolve));}
});
