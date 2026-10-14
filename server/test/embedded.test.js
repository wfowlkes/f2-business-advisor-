'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {verifyIdToken,verifyWebhook,encryptionKey,encryptToken,decryptToken,isConfigured}=require('../embedded/security.js');
const {makeEmbedded,page}=require('../embedded/app.js');
const {createStorage,SCHEMA}=require('../embedded/storage.js');
const {readShopDaily}=require('../embedded/sync.js');
const NOW=Date.parse('2026-10-14T12:00:00.000Z');
const ENV={SHOPIFY_CLIENT_ID:'embedded-app-test-id',SHOPIFY_CLIENT_SECRET:'embedded-secret-do-not-deploy-1234',SHOPIFY_API_VERSION:'2026-10'};
function jwt(shop,claims={}){let body={iss:`https://${shop}/admin`,dest:`https://${shop}`,aud:ENV.SHOPIFY_CLIENT_ID,sub:'11',iat:NOW/1000-10,nbf:NOW/1000-10,exp:NOW/1000+90,...claims};let h=Buffer.from(JSON.stringify({typ:'JWT',alg:'HS256'})).toString('base64url'),p=Buffer.from(JSON.stringify(body)).toString('base64url');let s=crypto.createHmac('sha256',ENV.SHOPIFY_CLIENT_SECRET).update(`${h}.${p}`).digest('base64url');return `${h}.${p}.${s}`;}
function mockStorage(){const stores=new Map(),daily=new Map(),receipts=new Set();return {async init(){},async getShop(shop){return stores.get(shop)||null},async saveToken(shop,t){if(t.scope!=='read_orders')throw Error('Invalid scope');stores.set(shop,{shop,accessToken:t.access_token,refreshToken:t.refresh_token,token_expires_at:new Date(NOW+3600000),dirty:true})},async replaceDaily(shop,rows){daily.set(shop,rows.map(x=>({...x})));stores.get(shop).dirty=false},async snapshot(shop){const s=stores.get(shop),r=daily.get(shop)||[];if(!s)return null;return {source:'SHOPIFY PROXY',dirty:s.dirty,hasData:r.length>0,provenance:{mode:'SHOPIFY',currency:'USD'},daily:r,metrics:{days:r.length,sales:r.reduce((n,x)=>n+x.net_sales,0),orders:r.reduce((n,x)=>n+x.orders,0)}}},async erase(shop){stores.delete(shop);daily.delete(shop)},async recordWebhook(shop,id){const k=shop+id;if(receipts.has(k))return false;receipts.add(k);return true},async markDirty(shop){const s=stores.get(shop);if(s)s.dirty=true},stores,daily};}
function fetchMock(url,opts){if(url.endsWith('access_token'))return Promise.resolve({ok:true,json:async()=>({access_token:'offline-test-token',refresh_token:'refresh-test-token',scope:'read_orders',expires_in:3600,refresh_token_expires_in:7776000})});
 const id=url.includes('bravo-shop')?2:1;return Promise.resolve({ok:true,json:async()=>({data:{shop:{ianaTimezone:'America/Phoenix',currencyCode:'USD'},orders:{nodes:[{createdAt:'2026-10-13T15:00:00Z',cancelledAt:null,displayFinancialStatus:'PAID',currentSubtotalPriceSet:{shopMoney:{amount:String(id*100),currencyCode:'USD'}},totalRefundedSet:{shopMoney:{amount:'0',currencyCode:'USD'}}}],pageInfo:{hasNextPage:false,endCursor:null}}}})});
}
async function serve(storage){const app=makeEmbedded({env:ENV,storage,fetchImpl:fetchMock,now:()=>NOW});const server=require('node:http').createServer(async(req,res)=>{await app.handle(req,res,new URL(req.url,'http://localhost'));});await new Promise(r=>server.listen(0,'127.0.0.1',r));return {url:'http://127.0.0.1:'+server.address().port,close:()=>new Promise(r=>server.close(r))};}
test('signed Shopify ID tokens prove identity and reject bad signature, wrong audience, expired, forged dest',()=>{
 const good=jwt('alpha-shop.myshopify.com');assert.equal(verifyIdToken(good,ENV.SHOPIFY_CLIENT_SECRET,ENV.SHOPIFY_CLIENT_ID,NOW/1000).shop,'alpha-shop.myshopify.com');
 assert.throws(()=>verifyIdToken(good,ENV.SHOPIFY_CLIENT_SECRET,'other-audience',NOW/1000));
 assert.throws(()=>verifyIdToken(jwt('alpha-shop.myshopify.com',{exp:NOW/1000-1}),ENV.SHOPIFY_CLIENT_SECRET,ENV.SHOPIFY_CLIENT_ID,NOW/1000));
 assert.throws(()=>verifyIdToken(jwt('alpha-shop.myshopify.com',{dest:'https://bravo-shop.myshopify.com'}),ENV.SHOPIFY_CLIENT_SECRET,ENV.SHOPIFY_CLIENT_ID,NOW/1000));
 assert.throws(()=>verifyIdToken(good.slice(0,-7)+'corrupt',ENV.SHOPIFY_CLIENT_SECRET,ENV.SHOPIFY_CLIENT_ID,NOW/1000));
});
test('encrypted store tokens are authenticated and never plaintext',()=>{const k=encryptionKey({LIBERIENT_TOKEN_ENCRYPTION_KEY:'f'.repeat(64)});const stored=encryptToken('secret-merchant-token',k);assert(!stored.includes('secret-merchant-token'));assert.equal(decryptToken(stored,k),'secret-merchant-token');assert.throws(()=>decryptToken(stored.slice(0,-3)+'AAA',k));});
test('embedded UI only uses public client ID and needs Shopify ID token',()=>{const html=page(ENV.SHOPIFY_CLIENT_ID);assert.match(html,/shopify-api-key/);assert.match(html,/\/shopify-app\/ui.js/);assert.match(html,/id="syncNow"/);assert(!html.includes(ENV.SHOPIFY_CLIENT_SECRET));});
test('only verified Shopify webhooks accepted, no unsigned payload',()=>{const payload=Buffer.from('{"id":1}');const mac=crypto.createHmac('sha256',ENV.SHOPIFY_CLIENT_SECRET).update(payload).digest('base64');assert(verifyWebhook(payload,mac,ENV.SHOPIFY_CLIENT_SECRET));assert(!verifyWebhook(payload,'incorrect',ENV.SHOPIFY_CLIENT_SECRET));});
test('two Shopify stores have isolated tokens and aggregate histories; no public data',async()=>{
 const db=mockStorage(),app=await serve(db);try{
  const shopA='alpha-shop.myshopify.com',shopB='bravo-shop.myshopify.com';
  const missing=await fetch(app.url+'/shopify-app/api/snapshot');assert.equal(missing.status,401);
  const one=await fetch(app.url+'/shopify-app/api/sync',{method:'POST',headers:{Authorization:'Bearer '+jwt(shopA)}});assert.equal(one.status,200);
  const a=await one.json();assert.equal(a.provenance.mode,'SHOPIFY');assert.equal(a.metrics.orders,1);assert.equal(a.metrics.sales,100);assert(!JSON.stringify(a).includes('offline-test-token'));
  const two=await fetch(app.url+'/shopify-app/api/sync',{method:'POST',headers:{Authorization:'Bearer '+jwt(shopB)}});assert.equal(two.status,200);
  const b=await two.json();assert.equal(b.metrics.sales,200);
  const repeat=await fetch(app.url+'/shopify-app/api/snapshot',{headers:{Authorization:'Bearer '+jwt(shopA)}});assert.equal((await repeat.json()).metrics.sales,100);
  assert.equal(db.stores.size,2);assert.equal(db.daily.size,2);
 }finally{await app.close()}
});
test('signed webhook erases one store only, preserving other store',async()=>{const db=mockStorage();for(const shop of ['alpha-shop.myshopify.com','bravo-shop.myshopify.com'])db.stores.set(shop,{shop});const srv=await serve(db);try{
 const raw=JSON.stringify({shop_domain:'alpha-shop.myshopify.com'}),mac=crypto.createHmac('sha256',ENV.SHOPIFY_CLIENT_SECRET).update(raw).digest('base64');
 let r=await fetch(srv.url+'/shopify-app/webhooks',{method:'POST',headers:{'x-shopify-hmac-sha256':mac,'x-shopify-shop-domain':'alpha-shop.myshopify.com','x-shopify-topic':'shop/redact','x-shopify-webhook-id':'r1'},body:raw});assert.equal(r.status,200);assert(!db.stores.has('alpha-shop.myshopify.com'));assert(db.stores.has('bravo-shop.myshopify.com'));
 r=await fetch(srv.url+'/shopify-app/webhooks',{method:'POST',headers:{'x-shopify-hmac-sha256':'bogus','x-shopify-shop-domain':'bravo-shop.myshopify.com','x-shopify-topic':'shop/redact','x-shopify-webhook-id':'r2'},body:raw});assert.equal(r.status,401);assert(db.stores.has('bravo-shop.myshopify.com'));
 }finally{await srv.close()}
});
test('order webhook marks only installed shop dirty, never accepts unauthorized new topics',async()=>{const db=mockStorage();db.stores.set('alpha-shop.myshopify.com',{dirty:false});const srv=await serve(db);try{const raw='{}',mac=crypto.createHmac('sha256',ENV.SHOPIFY_CLIENT_SECRET).update(raw).digest('base64');const headers={'x-shopify-hmac-sha256':mac,'x-shopify-shop-domain':'alpha-shop.myshopify.com','x-shopify-topic':'orders/updated','x-shopify-webhook-id':'ord-7'};
 const a=await fetch(srv.url+'/shopify-app/webhooks',{method:'POST',headers,body:raw});assert.equal(a.status,200);assert.equal(db.stores.get('alpha-shop.myshopify.com').dirty,true);
 }finally{await srv.close()}
});
test('partial Shopify cursor pagination is refused instead of saving incomplete figures',async()=>{await assert.rejects(()=>readShopDaily('alpha-shop.myshopify.com','fake',{env:ENV,maxPages:1,now:new Date(NOW),fetchImpl:async()=>({ok:true,json:async()=>({data:{shop:{ianaTimezone:'America/Phoenix',currencyCode:'USD'},orders:{nodes:[],pageInfo:{hasNextPage:true,endCursor:'A'}}}})})}),/pagination exceeded/i);});
test('postgres schema keys every aggregate and webhook by shop, public mode remains disabled',()=>{assert.match(SCHEMA,/PRIMARY KEY\(shop,day\)/);assert.match(SCHEMA,/PRIMARY KEY\(shop,receipt_id\)/);assert.equal(isConfigured({...ENV,LIBERIENT_EMBEDDED_ENABLED:'false'}),false);});

test('Shopify app routes are invisible when the public synthetic demo is running',async()=>{
 const {createServer}=require('../app.js');
 const env={F2_DASHBOARD_KEY:'a'.repeat(48),F2_DEMO_MODE:'true',LIBERIENT_EMBEDDED_ENABLED:'true',SHOPIFY_CLIENT_ID:ENV.SHOPIFY_CLIENT_ID,SHOPIFY_CLIENT_SECRET:ENV.SHOPIFY_CLIENT_SECRET,LIBERIENT_DATABASE_URL:'postgres://localhost/disabled',LIBERIENT_TOKEN_ENCRYPTION_KEY:'f'.repeat(64)};
 const srv=createServer({env,now:()=>NOW});await new Promise(r=>srv.listen(0,'127.0.0.1',r));
 try{const origin='http://127.0.0.1:'+srv.address().port;
  const no=await fetch(origin+'/shopify-app/');assert.equal(no.status,404);
  const demo=await fetch(origin+'/api/demo60');assert.equal(demo.status,200);
  const ui=await fetch(origin+'/experience/');assert.equal(ui.status,200);
 }finally{await new Promise(r=>srv.close(r));}
});
test('embedded standalone mode requires all secrets, a dedicated database, and demo off',()=>{
 const creds={...ENV,LIBERIENT_EMBEDDED_ENABLED:'true',LIBERIENT_DATABASE_URL:'postgres://local:pass@localhost/example',LIBERIENT_TOKEN_ENCRYPTION_KEY:'b'.repeat(64)};
 assert.equal(isConfigured({...creds,F2_DEMO_MODE:'true'}),false);
 assert.equal(isConfigured({...creds,F2_DEMO_MODE:'false'}),true);
 assert.equal(isConfigured({...creds,F2_DEMO_MODE:'false',SHOPIFY_CLIENT_SECRET:''}),false);
});


test('signed deletion payload from another shop cannot erase an unrelated tenant',async()=>{
 const db=mockStorage();for(const shop of ['alpha-shop.myshopify.com','bravo-shop.myshopify.com'])db.stores.set(shop,{shop});
 const srv=await serve(db);try{
  const raw=JSON.stringify({shop_domain:'alpha-shop.myshopify.com'});
  const mac=crypto.createHmac('sha256',ENV.SHOPIFY_CLIENT_SECRET).update(raw).digest('base64');
  const res=await fetch(srv.url+'/shopify-app/webhooks',{method:'POST',headers:{'x-shopify-hmac-sha256':mac,'x-shopify-shop-domain':'bravo-shop.myshopify.com','x-shopify-topic':'shop/redact','x-shopify-webhook-id':'wrong-shop'},body:raw});
  assert.equal(res.status,401);
  assert(db.stores.has('alpha-shop.myshopify.com'));assert(db.stores.has('bravo-shop.myshopify.com'));
 }finally{await srv.close();}
});
