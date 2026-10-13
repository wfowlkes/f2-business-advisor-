'use strict';
// Single-store, read-only Shopify client. No tokens or order-level records are persisted.
const DAY_MS = 86400000;
const VERSION = '2026-10';

function shopHost(value) {
  const s = String(value || '').trim().toLowerCase();
  const name = s.endsWith('.myshopify.com') ? s.slice(0, -'.myshopify.com'.length) : s;
  if (!/^[a-z0-9][a-z0-9-]{1,60}[a-z0-9]$/.test(name)) throw Error('Invalid SHOPIFY_SHOP. Set a single store myshopify.com domain.');
  return `${name}.myshopify.com`;
}
function config(env=process.env) {
  const shop = shopHost(env.SHOPIFY_SHOP);
  if (!env.SHOPIFY_CLIENT_ID || !env.SHOPIFY_CLIENT_SECRET) throw Error('Shopify app client credentials are not configured.');
  const version=env.SHOPIFY_API_VERSION||VERSION;
  if (!/^20\d\d-(01|04|07|10)$/.test(version)) throw Error('Invalid Shopify API version');
  return {shop,clientId:env.SHOPIFY_CLIENT_ID,clientSecret:env.SHOPIFY_CLIENT_SECRET,version};
}
function money(m) {
  const n = Number(m?.shopMoney?.amount);
  if(!Number.isFinite(n)) throw Error('Shopify returned an invalid monetary amount');
  return {amount:n,currency:m?.shopMoney?.currencyCode};
}
function shopDay(date,timezone) {
  const d=new Date(date);
  if(Number.isNaN(d.getTime()))throw Error('Shopify returned an invalid order date');
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
function utcAdd(date,n) {const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function aggregate(orders, shop, now=new Date(), days=55) {
  if(!shop || !shop.ianaTimezone || !shop.currencyCode)throw Error('Shopify reporting timezone/currency could not be verified');
  const end=shopDay(now,shop.ianaTimezone), start=utcAdd(end,-days+1);
  const daily=new Map();
  for(let d=start;d<=end;d=utcAdd(d,1))daily.set(d,{date:d,net_sales:0,orders:0});
  let excludedCancelled=0, excludedOutside=0, refundedProxy=0, unpaid=0;
  for(const o of orders) {
    const date=shopDay(o.createdAt,shop.ianaTimezone);
    if(!daily.has(date)){excludedOutside++;continue;}
    if(o.cancelledAt){excludedCancelled++;continue;}
    const subtotal=money(o.currentSubtotalPriceSet),refunded=money(o.totalRefundedSet);
    if(subtotal.currency!==shop.currencyCode || refunded.currency!==shop.currencyCode)throw Error('Currency mismatch in Shopify monetary fields');
    if(!Number.isFinite(subtotal.amount) || !Number.isFinite(refunded.amount))throw Error('Missing Shopify order totals');
    const r=daily.get(date);r.net_sales+=subtotal.amount;r.orders+=1;refundedProxy+=refunded.amount;
    if(!['PAID','PARTIALLY_PAID','PARTIALLY_REFUNDED','REFUNDED'].includes(o.displayFinancialStatus))unpaid++;
  }
  const arr=[...daily.values()].map(r=>({...r,net_sales:Math.round(r.net_sales*100)/100}));
  return {
    source:'SHOPIFY ORDER SUBTOTAL PROXY (NOT RECONCILED)',
    reconciled:false,
    daily:arr,
    warnings:[
      'This is an ORDER SUBTOTAL PROXY, not Shopify net sales or recognized revenue.',
      'Refund totals are lifetime amounts for included orders, not dated refund transactions.',
      'Daily zeros reflect absence of returned matching orders only after full cursor pagination.',
      'Historical order scope is limited; no independent financial reconciliation or forecast approval.'
    ],
    metrics:{days:arr.length,missing:0,orders:arr.reduce((s,r)=>s+r.orders,0),sales:Math.round(arr.reduce((s,r)=>s+r.net_sales,0)*100)/100},
    provenance:{start,end,timezone:shop.ianaTimezone,currency:shop.currencyCode,returnedOrders:orders.length,excludedCancelled,excludedOutside,unpaid,refundedOrderLifetimeProxy:Math.round(refundedProxy*100)/100,metric:'currentSubtotalPriceSet (Shopify shopMoney)',completePagination:true}
  };
}

const ORDERS = `query F2ReadOnlyOrders($cursor: String, $search: String!) {
  shop { ianaTimezone currencyCode }
  orders(first: 100, after: $cursor, query: $search, sortKey: CREATED_AT, reverse: false) {
    pageInfo { hasNextPage endCursor }
    nodes { createdAt cancelledAt displayFinancialStatus
      currentSubtotalPriceSet { shopMoney { amount currencyCode } }
      totalRefundedSet { shopMoney { amount currencyCode } }
    }
  }
}`;

function makeClient({env=process.env, fetchFn=globalThis.fetch, now=()=>Date.now(), maxPages=30}={}) {
  const cfg=config(env);let auth=null;
  async function jsonFetch(url,opts){
    const resp=await fetchFn(url,{...opts,signal:AbortSignal.timeout(15000)});
    let result;
    try{result=await resp.json()}catch{throw Error('Invalid Shopify response format')}
    if(!resp.ok)throw Error(`Shopify HTTP ${resp.status}${resp.status===401||resp.status===403?' (check app installation, credentials and read scopes)':''}`);
    return result;
  }
  async function token(){
    if(auth && now()<auth.until)return auth.token;
    const body=new URLSearchParams({grant_type:'client_credentials',client_id:cfg.clientId,client_secret:cfg.clientSecret});
    const result=await jsonFetch(`https://${cfg.shop}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
    if(!result.access_token)throw Error('Shopify did not issue an access token. Install your app for the store.');
    const scopes=String(result.scope||'').split(',').map(s=>s.trim()).filter(Boolean);
    if(!scopes.includes('read_orders')||scopes.some(s=>s.startsWith('write_')))throw Error('App permissions must include read_orders and no write scopes. Release a read-only app version.');
    const expiry=Number(result.expires_in)||3600;
    auth={token:result.access_token,until:now()+Math.max(60,expiry-120)*1000};
    return auth.token;
  }
  async function getDaily({days=55}={}) {
    if(!Number.isInteger(days)||days<1||days>55)throw Error('Permitted Shopify order window is 1–55 days.');
    const yesterday=new Date(now()-56*DAY_MS).toISOString().slice(0,10);
    const search=`created_at:>=${yesterday}`;
    let cursor=null,pages=0,records=[],shop=null,seen=new Set();
    do {
      if(pages++>=maxPages)throw Error('HOLD: Shopify data exceeds the safe pagination limit; no partial forecast released.');
      const data=await jsonFetch(`https://${cfg.shop}/admin/api/${cfg.version}/graphql.json`,{
        method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':await token()},
        body:JSON.stringify({query:ORDERS,variables:{cursor,search}})
      });
      if(data.errors?.length)throw Error(`Shopify GraphQL query failed: ${data.errors.map(x=>x.message).join('; ').slice(0,250)}`);
      if(!data.data?.orders?.pageInfo || !Array.isArray(data.data.orders.nodes))throw Error('Missing Shopify orders or pagination fields');
      if(shop && (shop.ianaTimezone!==data.data.shop?.ianaTimezone||shop.currencyCode!==data.data.shop?.currencyCode))throw Error('Shopify reporting configuration changed mid-sync');
      shop=data.data.shop;
      records.push(...data.data.orders.nodes);
      const info=data.data.orders.pageInfo;
      if(!info.hasNextPage)break;
      if(!info.endCursor||seen.has(info.endCursor))throw Error('Shopify pagination cursor missing or repeated');
      cursor=info.endCursor;seen.add(cursor);
    }while(true);
    const out=aggregate(records,shop,new Date(now()),days);
    return {...out,provenance:{...out.provenance,pages,shopDomain:cfg.shop,reportAsOf:new Date(now()).toISOString()}};
  }
  return {getDaily};
}
module.exports={shopHost,config,shopDay,aggregate,makeClient,ORDERS};
