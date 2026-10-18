'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {assessMerchantReadiness}=require('../lab/merchant_readiness.js');

function sample(days=140, orders=3, sales=120) {
 return Array.from({length:days},(_,i)=>({
  date:new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10),
  orders,total_sales:sales
 }));
}
const inputs=(daily=sample())=>({source:'SHOPIFY_AGGREGATE',daily,
 inventoryRows:[{product:'synthetic',available:20}],
 customerSeries:[{date:'2026-01-01',new_customers:2}]});
test('real Shopify empty-order history must stay HOLD even with 181 dates',()=>{
 const result=assessMerchantReadiness(inputs(sample(181,0,0)));
 assert.equal(result.pilot_data_ready,false);
 assert.equal(result.days,181);assert.equal(result.orders,0);
 assert(result.blockers.includes('NO_OBSERVED_SALES_SIGNAL'));
 assert(result.blockers.includes('TOO_FEW_ACTIVE_ORDER_DAYS'));
 assert.equal(result.model_promotion,'HOLD');
});
test('missing inventory and customer data block a seemingly active merchant',()=>{
 const data=inputs();data.inventoryRows=[];data.customerSeries=[];
 const x=assessMerchantReadiness(data);
 assert(x.blockers.includes('INVENTORY_NOT_VERIFIED'));
 assert(x.blockers.includes('CUSTOMER_ACTIVITY_NOT_VERIFIED'));
});
test('future pilot data readiness is not commercial approval',()=>{
 const x=assessMerchantReadiness(inputs());
 assert.equal(x.pilot_data_ready,true);
 assert.equal(x.forecasting_authorized,false);
 assert.equal(x.customer_decisions_authorized,false);
 assert.equal(x.model_promotion,'HOLD');
});
test('reject gapped and duplicated dates',()=>{
 const d=sample();d[50].date=d[49].date;
 const x=assessMerchantReadiness(inputs(d));
 assert(x.blockers.includes('DAILY_HISTORY_INVALID_OR_GAPPED'));
 assert.equal(x.orders,null);
});
test('reject negative and nonfinite sales',()=>{
 const d=sample();d[2].total_sales=-5;
 assert(assessMerchantReadiness(inputs(d)).blockers.includes('DAILY_HISTORY_INVALID_OR_GAPPED'));
 d[2].total_sales=NaN;
 assert(assessMerchantReadiness(inputs(d)).blockers.includes('DAILY_HISTORY_INVALID_OR_GAPPED'));
});
test('unverified source cannot be treated as real merchant validation',()=>{
 const d=inputs();d.source='SYNTHETIC';
 assert(assessMerchantReadiness(d).blockers.includes('AUTHENTICATED_AGGREGATE_SOURCE_REQUIRED'));
});
test('minimum history and activity thresholds are explicit',()=>{
 const x=assessMerchantReadiness(inputs(sample(60,1,100)));
 assert(x.blockers.includes('HISTORY_LESS_THAN_120_DAYS'));
 assert(x.blockers.includes('TOO_FEW_ORDERS_FOR_PILOT'));
});
test('input untouched and output cannot be modified',()=>{
 const d=inputs(),copy=JSON.stringify(d),x=assessMerchantReadiness(d);
 assert.equal(JSON.stringify(d),copy);
 assert(Object.isFrozen(x));
 assert.equal(x.authority,'HOLD');
});
