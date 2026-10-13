'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createServer}=require('../app.js');
const KEY='local_bridge_test_key_long_enough_0123456789123';
test('research bridge assets are served only in synthetic mode, not the private merchant mode',async()=>{
 for(const demo of [true,false]){
  const srv=createServer({env:{NODE_ENV:'production',F2_BASE_URL:'https://example.test',F2_DASHBOARD_KEY:KEY,F2_DEMO_MODE:String(demo)},client:{getDaily:async()=>{throw Error('No Shopify access in bridge tests')}}});
  await new Promise(done=>srv.listen(0,'127.0.0.1',done));
  try{const addr='http://127.0.0.1:'+srv.address().port;
   for(const route of ['/lab/bridge.html','/lab/bridge_ui.js','/lab/bridge-summary.json','/lab/bridge_engine.js']){
    const res=await fetch(addr+route,{headers:{'X-Forwarded-Proto':'https'}});
    assert.equal(res.status,demo?200:404,route);
    assert(!(await res.text()).includes(KEY));
   }
   assert.equal((await fetch(addr+'/api/snapshot',{headers:{'X-Forwarded-Proto':'https'}})).status,401);
  }finally{await new Promise(done=>srv.close(done));}
 }
});
