'use strict';
const {shopHost,ORDERS,aggregate}=require('../shopify.js');
const {verifyIdToken}=require('./security.js');
function tokenUrl(shop){return `https://${shopHost(shop)}/admin/oauth/access_token`}
async function fetchJSON(fetchImpl,url,opts){const res=await fetchImpl(url,{...opts,signal:AbortSignal.timeout(15000)});if(!res.ok)throw Error(`Shopify service status ${res.status}`);return res.json();}
async function exchangeIdToken(idToken,{env=process.env,fetchImpl=fetch,now=Math.floor(Date.now()/1000)}={}){
 const user=verifyIdToken(idToken,env.SHOPIFY_CLIENT_SECRET,env.SHOPIFY_CLIENT_ID,now);
 const body=new URLSearchParams({client_id:env.SHOPIFY_CLIENT_ID,client_secret:env.SHOPIFY_CLIENT_SECRET,
  grant_type:'urn:ietf:params:oauth:grant-type:token-exchange',subject_token:idToken,
  subject_token_type:'urn:ietf:params:oauth:token-type:id_token',requested_token_type:'urn:shopify:params:oauth:token-type:offline-access-token',expiring:'1'});
 const token=await fetchJSON(fetchImpl,tokenUrl(user.shop),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
 if(!token.access_token||!token.refresh_token||!Number.isFinite(Number(token.expires_in)))throw Error('Shopify did not return an expiring offline token');
 return {shop:user.shop,token};
}
async function refreshToken(shop,refresh,{env=process.env,fetchImpl=fetch}={}){
 const body=new URLSearchParams({client_id:env.SHOPIFY_CLIENT_ID,client_secret:env.SHOPIFY_CLIENT_SECRET,grant_type:'refresh_token',refresh_token:refresh});
 const token=await fetchJSON(fetchImpl,tokenUrl(shop),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
 if(!token.access_token||!token.refresh_token)throw Error('Shopify token refresh invalid');return token;
}
async function readShopDaily(shop,accessToken,{env=process.env,fetchImpl=fetch,now=new Date(),maxPages=35}={}){
 shop=shopHost(shop);const end=now.toISOString().slice(0,10);const since=new Date(now.getTime()-61*86400000).toISOString().slice(0,10);
 const query=`created_at:>=${since}`;let cursor=null,shopInfo=null,records=[],seen=new Set(),pages=0;
 do{
  if(pages++>=maxPages)throw Error('HOLD: Shopify pagination exceeded limit');
  const response=await fetchJSON(fetchImpl,`https://${shop}/admin/api/${env.SHOPIFY_API_VERSION||'2026-10'}/graphql.json`,{
   method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':accessToken},body:JSON.stringify({query:ORDERS,variables:{cursor,search:query}})});
  if(response.errors?.length||!response.data?.shop?.ianaTimezone||!response.data?.orders?.pageInfo||!Array.isArray(response.data.orders.nodes))throw Error('HOLD: Incomplete Shopify response');
  if(shopInfo&&(shopInfo.ianaTimezone!==response.data.shop.ianaTimezone||shopInfo.currencyCode!==response.data.shop.currencyCode))throw Error('HOLD: Shopify reporting context changed');
  shopInfo=response.data.shop;records.push(...response.data.orders.nodes);
  const p=response.data.orders.pageInfo;if(!p.hasNextPage)break;
  if(!p.endCursor||seen.has(p.endCursor))throw Error('HOLD: invalid Shopify pagination');cursor=p.endCursor;seen.add(cursor);
 }while(true);
 // Finalize only 55 completed shop-local days, not a partially observed current day.
 const data=aggregate(records,shopInfo,new Date(now.getTime()-86400000),55);
 if(data.provenance.completePagination!==true||data.daily.some(x=>!Number.isFinite(x.net_sales)))throw Error('HOLD: unverified aggregate');
 return {...data,provenance:{...data.provenance,pages,shopDomain:shop,lastObserved:end}};
}
module.exports={exchangeIdToken,refreshToken,readShopDaily};
