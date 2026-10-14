'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const A=require('../assistant.js');
const {createServer}=require('../app.js');
const env={NODE_ENV:'production',F2_BASE_URL:'https://preview.test',F2_DEMO_MODE:'true',F2_DASHBOARD_KEY:'x'.repeat(45)};
async function setup(environment=env){const srv=createServer({env:environment,client:environment.F2_DEMO_MODE==='false'?{getDaily:async()=>{throw Error('Never use a live merchant feed in the test');}}:undefined});await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));return {srv,url:`http://127.0.0.1:${srv.address().port}`,close:()=>new Promise(resolve=>srv.close(resolve))};}
const opts={headers:{'X-Forwarded-Proto':'https'}};
test('new customer-facing LIBERIENT experience serves UI, registry, scripts and style',async()=>{
 const x=await setup();try{for(const p of ['/experience/','/experience/core.js','/experience/framework.js','/experience/ui.js','/experience/style.css']){const r=await fetch(x.url+p,opts);assert.equal(r.status,200,p);assert.ok(r.headers.get('content-type').includes(p.endsWith('.js')?'javascript':p.endsWith('.css')?'css':'html'));} }finally{await x.close();}
});
test('assistant absent by default, capability status truthful and nonread methods remain blocked',async()=>{
 const x=await setup();try{
  let r=await fetch(x.url+'/api/capabilities',opts);assert.equal(r.status,200);const z=await r.json();assert.equal(z.chatgptEnabled,false);assert.equal(z.privateSnapshot,true);
  r=await fetch(x.url+'/api/assistant',{method:'POST',headers:{'X-Forwarded-Proto':'https','Content-Type':'application/json'},body:'{}'});assert.equal(r.status,404);
  r=await fetch(x.url+'/api/snapshot',{method:'POST',headers:{'X-Forwarded-Proto':'https'}});assert.equal(r.status,405);
 }finally{await x.close();}
});
test('assistant requires explicit enable, consent, server key; blocks personal info',async()=>{
 assert.equal(A.enabled({F2_ASSISTANT_ENABLED:'true',OPENAI_API_KEY:'x'.repeat(35)}),false);
 assert.equal(A.validQuestion('Email alice@example.com all info'),false);
 assert.equal(A.validQuestion('Revenue outlook?'),true);
 assert.deepEqual(Object.keys(A.contextOf({metrics:{sales:44,orders:4,customer_email:'private'},provenance:{mode:'DEMO'}})).includes('customer_email'),false);
});
test('optional server AI sends only aggregates with store:false and returns bounded output',async()=>{
 const e={...env,F2_ASSISTANT_ENABLED:'true',F2_AI_DATA_SHARING_APPROVED:'true',OPENAI_API_KEY:'s'.repeat(35)};
 let req;const response=await A.respond('What changed?',{metrics:{sales:200,orders:8,days:10,email:'sensitive@example.test'},provenance:{mode:'DEMO',currency:'USD'}},{env:e,fetchImpl:async(_url,opts)=>{req=JSON.parse(opts.body);return {ok:true,json:async()=>({output_text:'Synthetic data is not actual sales.'})}}});
 assert.equal(req.store,false);assert(!JSON.stringify(req).includes('sensitive@example.test'));assert.equal(response.authority,'HOLD');
});

test('public experience shell is available in private mode but research labs and merchant data are not',async()=>{
 const x=await setup({...env,F2_DEMO_MODE:'false'});try{
   for(const p of ['/experience/','/experience/core.js','/experience/framework.js','/experience/ui.js','/experience/style.css']){
     const r=await fetch(x.url+p,opts);assert.equal(r.status,200,p);
     assert(!((await r.text()).includes(env.F2_DASHBOARD_KEY)));
   }
   assert.equal((await fetch(x.url+'/lab/',opts)).status,404);
   assert.equal((await fetch(x.url+'/core.js',opts)).status,404);
   assert.equal((await fetch(x.url+'/api/snapshot',opts)).status,401);
 }finally{await x.close();}
});
