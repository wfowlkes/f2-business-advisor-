/* LIBERIENT two-month fixture: deterministic, entirely synthetic, zero personal records.
 * This code is shared between static demonstration and the server's real SQLite seed. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.LiberientDemo60=factory();})(typeof self!=='undefined'?self:this,function(){
'use strict';
const VERSION='liberient-synthetic-retail-60d-v1';
function iso(v){const d=new Date(String(v)+'T00:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==v)throw Error('Invalid ISO day');return v;}
function dateOffset(date,days){let d=new Date(iso(date)+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
function lastComplete(clock=new Date()){return dateOffset(new Date(clock).toISOString().slice(0,10),-1)}
function round(x){return Math.round(x*100)/100}
function generate(endDay=lastComplete()){
 const end=iso(endDay),first=dateOffset(end,-59),daily=[];
 for(let i=0;i<60;i++){
  const date=dateOffset(first,i),weekday=new Date(date+'T00:00:00Z').getUTCDay(),weekend=[0,6].includes(weekday);
  const fluctuation=1+0.075*Math.sin(i*1.17)+0.045*Math.cos(i*.71);
  const phase=i<25?'baseline':i<40?'promotion':i<49?'supply disruption':'recovery';
  const multiplier=phase==='promotion'?1.29:phase==='supply disruption'?.64:phase==='recovery'?1.11:1;
  const orders=Math.max(0,Math.round(42*(weekend?1.17:1)*fluctuation*multiplier));
  const averageValue=51+1.6*Math.sin(i/5),gross=round(orders*averageValue);
  const refunds=round(gross*(phase==='promotion'?.065:phase==='supply disruption'?.048:.026));
  const net_sales=round(gross-refunds);
  const new_customers=Math.round(orders*(phase==='promotion'?.47:.35));
  const returning_customers=orders-new_customers;
  const stockout_products=phase==='supply disruption'?(i%3===0?8:5):phase==='recovery'&&i===49?2:0;
  const inventory_units=phase==='supply disruption'?Math.max(140,470-(i-40)*33):phase==='recovery'?750+(i-49)*28:900+Math.round(48*Math.sin(i*.4));
  daily.push({date,net_sales,orders,refunds,new_customers,returning_customers,inventory_units,stockout_products,stockout:stockout_products>0,phase});
 }
 return {version:VERSION,source:'SYNTHETIC DATABASE',status:'HOLD',provenance:{mode:'DEMO',currency:'USD',metric:'SIMULATED NET SALES — NOT SHOPIFY',firstDay:first,lastDay:end,source:'LIBERIENT SQLite demo seed',dataStatus:'SYNTHETIC, NOT LIVE MERCHANT DATA'},daily};
}
return {VERSION,generate,dateOffset,lastComplete};
});
