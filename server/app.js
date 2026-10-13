'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const F2=require('../core.js');
const {makeClient}=require('./shopify.js');
const dashboard=fs.readFileSync(path.join(__dirname,'dashboard.html'));
const script=fs.readFileSync(path.join(__dirname,'dashboard.js'));
// Public static synthetic lab is independent of all Shopify reads or tokens.
const syntheticLab={
  '/lab/': ['index.html','text/html; charset=utf-8'],
  '/lab/index.html': ['index.html','text/html; charset=utf-8'],
  '/lab/synthetic.js': ['synthetic.js','application/javascript; charset=utf-8'],
  '/lab/ui.js': ['ui.js','application/javascript; charset=utf-8'],
  '/lab/style.css': ['style.css','text/css; charset=utf-8'],
  '/lab/strategies.html': ['strategies.html','text/html; charset=utf-8'],
  '/lab/strategies.js': ['strategies.js','application/javascript; charset=utf-8'],
  '/lab/strategy-summary.json': ['strategy-summary.json','application/json; charset=utf-8'],
  '/lab/calendar-stress.json': ['calendar-stress.json','application/json; charset=utf-8']
};

function secretOK(received, expected){
  if(typeof received!=='string'||typeof expected!=='string')return false;
  let a=crypto.createHash('sha256').update(received).digest(),b=crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a,b);
}
function createServer({env=process.env, client, now=()=>Date.now()}={}) {
  const key=env.F2_DASHBOARD_KEY;
  if(!key || key.length<32)throw Error('F2_DASHBOARD_KEY must be at least 32 random characters.');
  if(env.NODE_ENV==='production' && !String(env.F2_BASE_URL||'').startsWith('https://'))throw Error('F2_BASE_URL must be HTTPS in production.');
  const demoClient={getDaily:async()=>{
    const d=F2.makeDemo();
    return {...d,provenance:{start:d.daily[0].date,end:d.daily[d.daily.length-1].date,timezone:'UTC',currency:'USD',metric:'SYNTHETIC DEMO DATA — NOT SHOPIFY',mode:'DEMO',reportAsOf:new Date(now()).toISOString()}};
  }};
  const backend=client||(env.F2_DEMO_MODE==='true'?demoClient:makeClient({env,now}));
  const attempts=new Map();let cached=null,inflight=null;
  function failAuth(req){
    const ip=req.socket.remoteAddress||'unknown';const t=now(),rec=attempts.get(ip)||{count:0,since:t};
    if(t-rec.since>900000){rec.count=0;rec.since=t;}rec.count++;attempts.set(ip,rec);
    return rec.count>8;
  }
  function allowed(req){
    const ip=req.socket.remoteAddress||'unknown';const t=now(),rec=attempts.get(ip);
    if(rec&&t-rec.since<=900000&&rec.count>8)return false;
    const auth=req.headers.authorization||'';
    const ok=auth.startsWith('Bearer ')&&secretOK(auth.slice(7),key);
    if(ok)attempts.delete(ip);
    else failAuth(req);
    return ok;
  }
  function headers(type){return {'Content-Type':type,'Cache-Control':'no-store, private','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",'Permissions-Policy':'camera=(), microphone=(), geolocation=()'};}
  function send(res,status,data,type='application/json; charset=utf-8'){res.writeHead(status,headers(type));res.end(typeof data==='string'||Buffer.isBuffer(data)?data:JSON.stringify(data));}
  async function snapshot(){
    if(cached&&now()-cached.at<10*60*1000)return cached.body;
    if(inflight)return inflight;
    inflight=(async()=>{
      const data=await backend.getDaily();
      const analysis=F2.analyze(data);
      // Never promote unverified sales or forecasts, even if backtest seems promising.
      const body={status:'HOLD',source:data.source,refreshedAt:new Date(now()).toISOString(),metrics:data.metrics,provenance:data.provenance,warnings:data.warnings,
        analysis:{status:analysis.status,hold:analysis.hold,tests:Object.fromEntries([7,30].map(n=>[n,{status:'HOLD',reasons:analysis.tests[n].reasons,bestBaseline:analysis.tests[n].bestBaseline,folds:analysis.tests[n].holdout?.trend?.folds??0}])),ledger:analysis.ledger},
        sample: data.daily.map(x=>({date:x.date,subtotalProxy:x.net_sales,orders:x.orders}))};
      cached={at:now(),body};return body;
    })().finally(()=>{inflight=null;});
    return inflight;
  }
  return http.createServer(async(req,res)=>{
    try{
      // Do not rely on client-supplied X-Forwarded-For for authorization or throttling.
      if(env.NODE_ENV==='production'&&req.url!=='/health'&&req.headers['x-forwarded-proto']!=='https'){send(res,403,{error:'HTTPS required'});return;}
      let url;
      try{url=new URL(req.url,'http://localhost')}catch{send(res,400,{error:'Invalid URL'});return;}
      if(req.method!=='GET'){send(res,405,{error:'Read-only service: GET only'});return;}
      if(url.pathname==='/health'){send(res,200,{ok:true,service:'F2 Commerce read-only backend',shopify:'not exposed'});return;}
      if(url.pathname==='/'){send(res,200,dashboard,'text/html; charset=utf-8');return;}
      if(url.pathname==='/dashboard.js'){send(res,200,script,'application/javascript; charset=utf-8');return;}
      if(env.F2_DEMO_MODE==='true' && (url.pathname==='/lab' || url.pathname==='/core.js' || syntheticLab[url.pathname])){
        if(url.pathname==='/lab'){res.writeHead(302,{Location:'/lab/','Cache-Control':'no-store'});res.end();return;}
        const asset=url.pathname==='/core.js'?{file:path.join(__dirname,'../core.js'),type:'application/javascript; charset=utf-8'}:{file:path.join(__dirname,'../lab',syntheticLab[url.pathname][0]),type:syntheticLab[url.pathname][1]};
        send(res,200,fs.readFileSync(asset.file),asset.type);return;
      }
      if(url.pathname==='/api/snapshot'){
        if(!allowed(req)){send(res,401,{error:'Unauthorized or temporarily rate limited'});return;}
        const data=await snapshot();send(res,200,data);return;
      }
      send(res,404,{error:'Not found'});
    }catch(e){
      // No Shopify raw response / token included in HTTP error responses or application logs.
      send(res,503,{status:'HOLD',error:'Shopify read-only refresh failed. Check the private server configuration and logs.'});
    }
  });
}
if(require.main===module){
  try{const port=Number(process.env.PORT)||3000;createServer().listen(port,()=>console.log(`F2 Commerce secure backend listening on ${port}; forecast authority HOLD`));}
  catch(e){console.error('Backend configuration error:',e.message);process.exitCode=1;}
}
module.exports={createServer,secretOK};
