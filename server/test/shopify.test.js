'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {shopHost,shopDay,aggregate,makeClient,ORDERS}=require('../shopify.js');
const fixed=Date.parse('2026-10-13T20:00:00Z');
function one(createdAt='2026-10-12T03:30:00Z',value='125.40',cancelledAt=null){return {createdAt,cancelledAt,displayFinancialStatus:'PAID',currentSubtotalPriceSet:{shopMoney:{amount:value,currencyCode:'USD'}},totalRefundedSet:{shopMoney:{amount:'5.00',currencyCode:'USD'}}};}
const shop={ianaTimezone:'America/Phoenix',currencyCode:'USD'};
test('reject invalid host, normalize genuine myshopify host',()=>{assert.equal(shopHost('Demo-Shop.myshopify.com'),'demo-shop.myshopify.com');assert.throws(()=>shopHost('https://evil.com/a'));assert.throws(()=>shopHost('a.myshopify.com.attacker.example'));});
test('timezone uses store date not UTC date; excludes cancelled orders; no false reconciliation',()=>{const a=aggregate([one(),one('2026-10-12T08:00:00Z','22', '2026-10-12T10:00:00Z')],shop,new Date(fixed),3);assert.equal(shopDay('2026-10-12T03:30:00Z','America/Phoenix'),'2026-10-11');assert.equal(a.daily.find(r=>r.date==='2026-10-11').net_sales,125.4);assert.equal(a.metrics.orders,1);assert.equal(a.provenance.excludedCancelled,1);assert.equal(a.reconciled,false);});
test('read-only queries omit all customer fields',()=>{assert(!/email|address|phone|customer\s*\{|lineItems|shippingAddress/.test(ORDERS));assert(ORDERS.includes('pageInfo'));});
test('client credentials flow, cursor pagination, token cache, and aggregate snapshot',async()=>{
 let authCount=0,graphqlCount=0;
 const fetchFn=async(url,options)=>{
  if(url.includes('access_token')){authCount++;assert.equal(options.method,'POST');assert(options.body.toString().includes('grant_type=client_credentials'));return {ok:true,json:async()=>({access_token:'PRIVATE_TOKEN',scope:'read_orders',expires_in:86400})};}
  graphqlCount++;assert.equal(options.headers['X-Shopify-Access-Token'],'PRIVATE_TOKEN');const body=JSON.parse(options.body);assert(!body.query.includes('customer'));assert(body.variables.search.includes('created_at:'));
  const data=graphqlCount===1?{shop,orders:{nodes:[one()],pageInfo:{hasNextPage:true,endCursor:'next'}}}:{shop,orders:{nodes:[one('2026-10-13T18:00:00Z','250')],pageInfo:{hasNextPage:false,endCursor:'end'}}};
  return {ok:true,json:async()=>({data})};
 };
 const c=makeClient({env:{SHOPIFY_SHOP:'demo-shop',SHOPIFY_CLIENT_ID:'cid',SHOPIFY_CLIENT_SECRET:'secret'},fetchFn,now:()=>fixed});
 const snap=await c.getDaily({days:4});assert.equal(authCount,1);assert.equal(graphqlCount,2);assert.equal(snap.metrics.orders,2);assert.equal(snap.provenance.pages,2);assert.equal(snap.metrics.sales,375.4);assert.equal(snap.reconciled,false);assert(!JSON.stringify(snap).includes('PRIVATE_TOKEN'));
});
test('stop incomplete pagination instead of issuing a partial forecast',async()=>{
 const fetchFn=async(url)=>({ok:true,json:async()=>url.includes('access_token')?{access_token:'SECRET',scope:'read_orders'}:{data:{shop,orders:{nodes:[one()],pageInfo:{hasNextPage:true,endCursor:'another'}}}}});
 const client=makeClient({env:{SHOPIFY_SHOP:'demo-shop',SHOPIFY_CLIENT_ID:'cid',SHOPIFY_CLIENT_SECRET:'secret'},fetchFn,now:()=>fixed,maxPages:1});
 await assert.rejects(client.getDaily(),/safe pagination limit/);
});
test('reject Shopify response without trustworthy reporting context',()=>{assert.throws(()=>aggregate([],{},new Date(fixed),5));assert.throws(()=>aggregate([one('bad-date')],shop,new Date(fixed),5));});
