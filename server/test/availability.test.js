'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createServer}=require('../app.js');
require('../../tests/test_availability.js');
const KEY='test_supply_preview_key_will_never_be_shown_outside_this_fixture';
async function withServer(demo,cb){const env={NODE_ENV:'production',F2_BASE_URL:'https://test.example',F2_DEMO_MODE:demo?'true':'false',F2_DASHBOARD_KEY:KEY};
const client={getDaily:async()=>{throw Error('Shopify reads forbidden in this synthetic test')}};
const srv=createServer({env,client});await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
try{await cb('http://127.0.0.1:'+srv.address().port)}finally{await new Promise(resolve=>srv.close(resolve))}}
const options={headers:{'X-Forwarded-Proto':'https'}};
test('supply research assets appear only in synthetic mode, Shopify API remains private',async()=>{
 await withServer(true,async(base)=>{
  for(const p of ['/lab/availability.html','/lab/availability_ui.js','/lab/availability-results.json']){
   const r=await fetch(base+p,options);assert.equal(r.status,200,p);assert(!(await r.text()).includes(KEY));
  }
  assert.equal((await fetch(base+'/api/snapshot',options)).status,401);
 });
 await withServer(false,async(base)=>{
  for(const p of ['/lab/availability.html','/lab/availability-results.json'])assert.equal((await fetch(base+p,options)).status,404,p);
 });
});
