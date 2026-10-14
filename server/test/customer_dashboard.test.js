'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const F2=require('../../experience/core.js');
const X=require('../../experience/framework.js');
const Demo=require('../../experience/demo60.js');
const {createServer}=require('../app.js');

const root=path.join(__dirname,'../..');
test('60-day synthetic database drives complete carousel and tracker through framework source gates',()=>{
 const d=X.fromDemo60(F2,Demo.generate('2026-10-13'));
 assert.equal(d.connected,true);
 assert.equal(d.rows.length,60);
 assert.equal(d.authority,'HOLD');
 for(const id of ['revenue','orders','customers','inventory','refunds','forecast7','forecast30','source','insights'])assert(d.registry.some(x=>x.id===id),id);
 assert.equal(d.feature['inventory.units'],true);
 assert.equal(d.provenance.demo60,true);
 assert.match(d.sourceLabel,/synthetic/i);
});
test('customization and assistant events cannot crash the framework',()=>{
 const framework=X.createFramework(()=> '2026-10-13T12:00:00.000Z');
 for(const e of ['customize-open','audit-export','source-connect-attempt','source-connect-error','assistant-question','assistant-response','tracker-customized']){
   const value=framework.emit(e,{module:'revenue',source:'SYNTHETIC'});
   assert.equal(value.authority,'HOLD');
 }
});
test('hidden source-gated nav and controls do not override HTML hidden state',()=>{
 const css=fs.readFileSync(path.join(root,'experience/style.css'),'utf8');
 assert.match(css,/\[hidden\]\s*\{\s*display\s*:\s*none\s*!important\s*\}/);
});
test('homepage points to LIBERIENT instead of the older private portal',async()=>{
 const srv=createServer({env:{F2_DEMO_MODE:'true',F2_DASHBOARD_KEY:'synthetic_secure_test_key_1234567890',F2_BASE_URL:'https://demo.example.test',NODE_ENV:'production'}});
 await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
 try{
  const origin='http://127.0.0.1:'+srv.address().port,opts={headers:{'X-Forwarded-Proto':'https'}};
  const landing=await fetch(origin,{...opts,redirect:'manual'});
  assert.equal(landing.status,302);
  assert.equal(landing.headers.get('location'),'/experience/');
  const d=await fetch(origin+'/api/demo60',opts);
  assert.equal(d.status,200);
  const payload=await d.json();
  assert.equal(payload.database.rows,60);
  const ui=await fetch(origin+'/experience/',opts);assert.equal(ui.status,200);
  assert.match(await ui.text(),/LIBERIENT/);
  const legacy=await fetch(origin+'/legacy/',opts);
  assert.equal(legacy.status,200);
 }finally{await new Promise(resolve=>srv.close(resolve));}
});

test('customer stylesheet is allowed by CSP and served with correct type on iPhone browsers',async()=>{
 const srv=createServer({env:{F2_DEMO_MODE:'true',F2_DASHBOARD_KEY:'synthetic_secure_test_key_1234567890',F2_BASE_URL:'https://demo.example.test',NODE_ENV:'production'}});
 await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+srv.address().port;
  const opts={headers:{'X-Forwarded-Proto':'https'}};
  const css=await fetch(base+'/experience/style.css',opts);
  assert.equal(css.status,200);
  assert.match(css.headers.get('content-type'),/text\/css/);
  const csp=css.headers.get('content-security-policy');
  assert.match(csp,/style-src 'self'/);
  assert.match(csp,/script-src 'self'/);
  assert.doesNotMatch(csp,/default-src \*/);
  assert.match(await css.text(),/\.hero/);
  const page=await fetch(base+'/experience/',opts);
  assert.equal(page.status,200);
  assert.match(await page.text(),/href="\.\/style\.css"/);
 }finally{await new Promise(resolve=>srv.close(resolve));}
});
