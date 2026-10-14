'use strict';
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {verifyIdToken,verifyWebhook,isConfigured}=require('./security.js');
const {shopHost}=require('../shopify.js');
const {exchangeIdToken,refreshToken,readShopDaily}=require('./sync.js');
const {postgresStorage}=require('./storage.js');
const SOURCE=fs.readFileSync(path.join(__dirname,'../../experience/index.html'),'utf8');
const UI=fs.readFileSync(path.join(__dirname,'embedded-ui.js'),'utf8');
function page(clientId){
 const head='<meta name="shopify-api-key" content="'+clientId.replace(/[^a-zA-Z0-9_-]/g,'')+'"><script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>';
 return SOURCE.replace('<title>F2 Commerce • LIBERIENT Experience</title>', '<title>LIBERIENT · Shopify</title>'+head)
 .replace('href="./style.css"','href="/experience/style.css"')
 .replace(/<div class="connect-actions">[\s\S]*?<\/div><div id="privateAccess"/, '<div class="connect-actions"><button type="button" id="syncNow">Refresh data</button></div><div id="privateAccess"')
 .replace(/<script src="\.\/core\.js"><\/script>/,'<script src="/experience/core.js"></script>')
 .replace(/<script src="\.\/demo60\.js"><\/script>/,'')
 .replace(/<script src="\.\/framework\.js"><\/script>/,'<script src="/experience/framework.js"></script>')
 .replace(/<script src="\.\/ui\.js"><\/script>/,'<script src="/shopify-app/ui.js"></script>')
 .replace('id="autoDemo" value="true"','id="autoDemo" value="false"')
 .replace('Loading 60 days of synthetic retail data; revenue, orders, refunds, customer activity and inventory are simulated. Unsupported features stay hidden.','Authenticating your Shopify session. Your business data remains private and forecasts are on HOLD.')
 .replace('ECLIPSE STUDY','LIBERIENT');
}
function response(res,status,body,{type='application/json; charset=utf-8',embedded=false}={}){
 const csp=`default-src 'none'; script-src 'self' https://cdn.shopify.com; style-src 'self' 'unsafe-inline'; connect-src 'self' https://admin.shopify.com https://*.myshopify.com https://*.shopify.com; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors ${embedded?'https://admin.shopify.com https://*.myshopify.com':"'none'"}`;
 res.writeHead(status,{'Content-Type':type,'Content-Security-Policy':csp,'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=()'});
 res.end(typeof body==='string'||Buffer.isBuffer(body)?body:JSON.stringify(body));
}
async function bodyBytes(req,limit=256000){return new Promise((resolve,reject)=>{let size=0,parts=[],ended=false;req.on('data',d=>{size+=d.length;if(size>limit){ended=true;reject(Error('Body too large'));req.destroy();}else parts.push(d);});req.on('end',()=>{if(!ended)resolve(Buffer.concat(parts))});req.on('error',reject);});}
function makeEmbedded({env=process.env,storage,fetchImpl=fetch,now=()=>Date.now()}={}){
 if(!storage){if(!isConfigured(env))return null;storage=postgresStorage(env).storage;}
 const inFlight=new Map();let ready=null;
 function ensureReady(){if(!ready)ready=Promise.resolve().then(()=>storage.init()).catch(e=>{ready=null;throw e});return ready;}
 async function sync(shop,idToken){
  if(inFlight.has(shop))return inFlight.get(shop);
  const p=(async()=>{
   await ensureReady();let saved=await storage.getShop(shop);let access=saved?.accessToken;
   if(!access||!saved.token_expires_at||new Date(saved.token_expires_at).getTime()<now()+60000){
    const out=await exchangeIdToken(idToken,{env,fetchImpl,now:Math.floor(now()/1000)});
    if(out.shop!==shop)throw Error('Shop mismatch');await storage.saveToken(shop,out.token);access=out.token.access_token;
   }
   const data=await readShopDaily(shop,access,{env,fetchImpl,now:new Date(now())});
   await storage.replaceDaily(shop,data.daily,{timezone:data.provenance.timezone,currency:data.provenance.currency});
   return data;
  })().finally(()=>inFlight.delete(shop));inFlight.set(shop,p);return p;
 }
 async function backgroundSync(shop){
  if(inFlight.has(shop))return inFlight.get(shop);
  const p=(async()=>{
    await ensureReady();let saved=await storage.getShop(shop);
    if(!saved||!saved.dirty)return;
    let access=saved.accessToken;
    if(!access||!saved.token_expires_at||new Date(saved.token_expires_at).getTime()<now()+60000){
      if(!saved.refreshToken)return; // Remain dirty; merchant must reinstall/reconnect if refresh expired.
      const next=await refreshToken(shop,saved.refreshToken,{env,fetchImpl});
      await storage.saveToken(shop,next);access=next.access_token;
    }
    const data=await readShopDaily(shop,access,{env,fetchImpl,now:new Date(now())});
    await storage.replaceDaily(shop,data.daily,{timezone:data.provenance.timezone,currency:data.provenance.currency});
  })().finally(()=>inFlight.delete(shop));inFlight.set(shop,p);return p;
 }
 async function handle(req,res,url){if(!url.pathname.startsWith('/shopify-app'))return false;
  try{
   await ensureReady();
   if(url.pathname==='/shopify-app/'&&req.method==='GET'){response(res,200,page(env.SHOPIFY_CLIENT_ID),{type:'text/html; charset=utf-8',embedded:true});return true;}
   if(url.pathname==='/shopify-app/ui.js'&&req.method==='GET'){response(res,200,UI,{type:'application/javascript; charset=utf-8',embedded:true});return true;}
   if(url.pathname==='/shopify-app/webhooks'&&req.method==='POST'){
    let raw;try{raw=await bodyBytes(req);}catch{response(res,413,{error:'Payload too large'});return true;}
    if(!verifyWebhook(raw,req.headers['x-shopify-hmac-sha256'],env.SHOPIFY_CLIENT_SECRET)){response(res,401,{error:'Invalid webhook'});return true;}
    let shop,topic;try{shop=shopHost(req.headers['x-shopify-shop-domain']);topic=String(req.headers['x-shopify-topic']||'').toLowerCase();}catch{response(res,400,{error:'Invalid shop'});return true;}
    const permitted=new Set(['app/uninstalled','shop/redact','customers/data_request','customers/redact','orders/create','orders/updated']);
    if(!permitted.has(topic)){response(res,200,{acknowledged:true});return true;}
    const receipt=String(req.headers['x-shopify-webhook-id']||'').slice(0,128);
    if(!receipt){response(res,400,{error:'Missing webhook id'});return true;}
    // Uninstall and redaction must erase a store even if receipt tracking is absent.
    if(topic==='app/uninstalled'||topic==='shop/redact'){await storage.erase(shop);response(res,200,{acknowledged:true});return true;}
    if(topic.startsWith('customers/')){response(res,200,{acknowledged:true,retainedCustomerRecords:false});return true;}
    if(!await storage.getShop(shop)){response(res,200,{acknowledged:true});return true;}
    if(await storage.recordWebhook(shop,receipt)){await storage.markDirty(shop);setImmediate(()=>backgroundSync(shop).catch(()=>{}));}
    response(res,200,{acknowledged:true});return true;
   }
   if(url.pathname==='/shopify-app/api/snapshot'||url.pathname==='/shopify-app/api/sync'){
    const expected=url.pathname.endsWith('/sync')?'POST':'GET';if(req.method!==expected){response(res,405,{error:'Method not allowed'});return true;}
    const bearer=String(req.headers.authorization||'');if(!bearer.startsWith('Bearer ')){response(res,401,{error:'Missing Shopify ID token'});return true;}
    let identity;try{identity=verifyIdToken(bearer.slice(7),env.SHOPIFY_CLIENT_SECRET,env.SHOPIFY_CLIENT_ID,Math.floor(now()/1000));}catch{res.setHeader('X-Shopify-Retry-Invalid-Session-Request','1');response(res,401,{error:'Invalid Shopify ID token'});return true;}
    if(expected==='POST'){
      try{await sync(identity.shop,bearer.slice(7));}catch{response(res,503,{status:'HOLD',error:'Shopify synchronization unavailable or incomplete'});return true;}
    }
    const state=await storage.snapshot(identity.shop);
    const daily=state?.daily||[];
    response(res,200,{status:'HOLD',source:state?.source||'SHOPIFY UNCONNECTED',provenance:state?.provenance||{mode:'SHOPIFY'},
     metrics:state?.metrics||{},dirty:state?.dirty??true,needsSync:!state?.hasData||state?.dirty===true,
     sample:daily.map(r=>({date:r.date,subtotalProxy:r.net_sales,orders:r.orders})),warning:'Order subtotal proxy only; no financial reconciliation, no model promotion.'});return true;
   }
   response(res,404,{error:'Not found'});return true;
  }catch{response(res,503,{status:'HOLD',error:'Embedded service unavailable'});return true;}
 }
 return {handle,sync,backgroundSync};
}
module.exports={makeEmbedded,page,bodyBytes};
