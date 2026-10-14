/* LIBERIENT Experience: source-verified module registry and in-session adaptation ledger.
   No customer data, model weights or adaptation decisions are persisted or transmitted here. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.LiberientExperience=factory();})(typeof self!=='undefined'?self:this,function(){
'use strict';
const VERSION='LIBERIENT Experience 2.0';
const MODULES=Object.freeze([
 {id:'revenue',label:'Revenue',needs:['daily.sales'],group:'Sales'},
 {id:'orders',label:'Orders',needs:['daily.orders'],group:'Sales'},
 {id:'forecast7',label:'7-day outlook',needs:['forecast.7'],group:'Outlook'},
 {id:'forecast30',label:'30-day outlook',needs:['forecast.30'],group:'Outlook'},
 {id:'customers',label:'Customer activity',needs:['customers.count'],group:'Customers'},
 {id:'inventory',label:'Inventory',needs:['inventory.units'],group:'Inventory'},
 {id:'refunds',label:'Returns',needs:['refunds.amount'],group:'Sales'},
 {id:'source',label:'Data status',needs:['source.verified'],group:'System'},
 {id:'insights',label:'Insights',needs:['daily.sales'],group:'Outlook'}
]);
const safeNum=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
const sum=a=>a.reduce((n,x)=>n+x,0);
const round=x=>Math.round(x*100)/100;
function checkRows(rows){
 if(!Array.isArray(rows)||!rows.length)return [];
 let previous='';const result=[];
 for(const r of rows){
  if(!r||typeof r.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||r.date<=previous)return [];
  previous=r.date;
  result.push({date:r.date,net_sales:safeNum(r.net_sales),orders:safeNum(r.orders),refunds:safeNum(r.refunds),stockout:r.stockout===true});
 }
 return result;
}
function changePoint(rows){
 const ready=rows.slice(-28);if(ready.length<28||ready.some(x=>x.net_sales===null))return null;
 // Require contiguous calendar days for the last 28 rows; never compress missing dates into a trend.
 for(let i=1;i<ready.length;i++)if(Date.parse(ready[i].date+'T00:00:00Z')-Date.parse(ready[i-1].date+'T00:00:00Z')!==86400000)return null;
 const latest=ready.slice(-7),previous=ready.slice(-14,-7);
 const old=sum(previous.map(x=>x.net_sales))/7,current=sum(latest.map(x=>x.net_sales))/7;
 if(old<=0)return null;const pct=(current/old-1)*100;
 return Math.abs(pct)>=12?{date:latest[0].date,percent:round(pct),direction:pct>0?'up':'down',method:'prior-versus-latest-7-day-average'}:null;
}
function createDataset({source='NONE',daily=[],analysis=null,metrics={},provenance={},capabilities={}}={}){
 const rows=checkRows(daily);const kind=source==='SYNTHETIC'?'SYNTHETIC':source==='IMPORTED'?'IMPORTED':source==='SHOPIFY'?'SHOPIFY':'NONE';
 const verified=rows.length>0&&kind!=='NONE';
 const hasSales=verified&&rows.every(x=>x.net_sales!==null&&x.net_sales>=0);
 const hasOrders=verified&&rows.every(x=>x.orders!==null&&Number.isInteger(x.orders)&&x.orders>=0);
 const hasForecast=h=>hasSales&&rows.length>=120&&safeNum(analysis?.forecasts?.[h]?.point)!==null;
 const feature={
  'source.verified':verified,'daily.sales':hasSales,'daily.orders':hasOrders,
  'forecast.7':hasForecast(7),'forecast.30':hasForecast(30),
  'customers.count':verified&&capabilities.customerActivity===true&&safeNum(metrics.customers)!==null,
  'inventory.units':verified&&capabilities.inventory===true&&safeNum(metrics.inventoryUnits)!==null,
  'refunds.amount':verified&&capabilities.refunds===true&&rows.every(x=>x.refunds!==null)
 };
 const n=Math.min(30,rows.length),recent=rows.slice(-n),prior=rows.slice(-2*n,-n);
 const trend=(key)=>{
  if(prior.length!==n||!n||prior.some(x=>x[key]===null)||recent.some(x=>x[key]===null))return null;
  const a=sum(prior.map(x=>x[key])),b=sum(recent.map(x=>x[key]));return a>0?round((b/a-1)*100):null;
 };
 const vals={
  revenue:hasSales?round(sum(recent.map(x=>x.net_sales))):null,
  orders:hasOrders?sum(recent.map(x=>x.orders)):null,
  forecast7:feature['forecast.7']?round(analysis.forecasts[7].point):null,
  forecast30:feature['forecast.30']?round(analysis.forecasts[30].point):null,
  customers:feature['customers.count']?metrics.customers:null,
  inventory:feature['inventory.units']?metrics.inventoryUnits:null,
  refunds:feature['refunds.amount']?round(sum(recent.map(x=>x.refunds))):null,
  source:kind,insights:changePoint(rows)?.direction==='down'?'Sales slowdown detected':'Review recent sales trend'
 };
 const registry=MODULES.filter(m=>m.needs.every(need=>feature[need]===true));
 return Object.freeze({version:VERSION,kind,connected:verified,sourceLabel:kind==='SYNTHETIC'?'Synthetic simulation':kind==='IMPORTED'?'Local CSV aggregate':kind==='SHOPIFY'?'Private Shopify snapshot':'No source',
  disclaimer:kind==='SYNTHETIC'?'Simulated values only — never actual merchant data.':kind==='SHOPIFY'?'Shopify subtotal proxy; financial reconciliation and decisions remain HOLD.':kind==='IMPORTED'?'Local aggregate; not independently reconciled.':'Connect an approved source to enable modules.',
  authority:'HOLD',asOf:rows.at(-1)?.date||null,rows,feature,registry,values:vals,analysis,trend:{revenue:trend('net_sales'),orders:trend('orders')},change:changePoint(rows),provenance});
}
function fromDemo(F2){if(!F2||typeof F2.makeDemo!=='function'||typeof F2.analyze!=='function')throw Error('F2 core required');const d=F2.makeDemo();return createDataset({source:'SYNTHETIC',daily:d.daily,analysis:F2.analyze(d),provenance:{mode:'DEMO',currency:'USD'}});}
function fromImport(F2,text){const d=F2.normalize(text);return createDataset({source:'IMPORTED',daily:d.daily,analysis:F2.analyze(d),provenance:{mode:'IMPORTED',warnings:d.warnings}});}
function fromSnapshot(snapshot){
 if(!snapshot||snapshot.status!=='HOLD'||!Array.isArray(snapshot.sample))throw Error('Unsupported snapshot');
 const mode=snapshot.provenance?.mode==='DEMO'?'SYNTHETIC':'SHOPIFY';
 const daily=snapshot.sample.map(x=>({date:x.date,net_sales:x.subtotalProxy,orders:x.orders}));
 // No client-side promotion to verified revenue or forecast: real Shopify amounts are subtotal proxies.
 return createDataset({source:mode,daily,provenance:snapshot.provenance,metrics:snapshot.metrics});
}
function selection(dataset,preferred=[]){const available=dataset.registry.map(x=>x.id);const known=MODULES.map(x=>x.id);const clean=Array.isArray(preferred)?[...new Set(preferred.filter(x=>known.includes(x)))]:[];
 const chosen=clean.length?clean.filter(x=>available.includes(x)):available;
 return {selected:chosen,available,hidden:known.filter(x=>!available.includes(x)),missingSelections:clean.filter(x=>!available.includes(x))};
}
function localAnswer(dataset,question){
 const q=String(question||'').trim().toLowerCase();if(!q||q.length>400)return 'Ask a short question about the loaded business snapshot.';
 if(!dataset.connected)return 'Connect a source before requesting insights.';
 if(/reorder|restock|inventory|supply/.test(q)&&!dataset.feature['inventory.units'])return 'Inventory isn’t connected. I can’t confirm restock needs from sales totals alone.';
 if(/customer|retention|returning/.test(q)&&!dataset.feature['customers.count'])return 'Customer activity is not connected. Only aggregate sales and orders are available.';
 if(/forecast|ahead|next week/.test(q))return dataset.feature['forecast.7']?`The exploratory 7-day outlook is ${dataset.values.forecast7.toLocaleString()}. All forecast decisions remain on HOLD until validation.`:'A forecast is not available from the connected data.';
 if(/attention|risk|change|wrong/.test(q))return dataset.change?`Observed sales ${dataset.change.direction==='up'?'rose':'fell'} ${Math.abs(dataset.change.percent)}% between the two most recent 7-day windows. This is an observation, not a confirmed cause. Decisions remain on HOLD.`:'No qualifying sales change was detected in the last two 7-day windows; this does not establish there is no business risk.';
 if(/order/.test(q)&&dataset.feature['daily.orders'])return `The latest 30 available days contain ${dataset.values.orders.toLocaleString()} aggregated orders. Authority: HOLD.`;
 if(dataset.feature['daily.sales'])return `The latest 30 days show ${dataset.values.revenue.toLocaleString()} in ${dataset.kind==='SHOPIFY'?'subtotal proxy':'aggregate sales'}. ${dataset.disclaimer}`;
 return 'No connected data supports that question.';
}
function createFramework(clock=()=>new Date().toISOString()){
 const events=[];let seq=0;
 function emit(type,{module=null,source=null,reason=null}={}){
  if(!['source-connected','source-cleared','module-view','tracker-customized','carousel-change','assistant-question','adaptive-proposal','forecast-hold'].includes(type))throw Error('Unsupported event');
  const event=Object.freeze({id:++seq,at:clock(),type,module:module?String(module).slice(0,48):null,source:source?String(source).slice(0,32):null,reason:reason?String(reason).slice(0,120):null,authority:'HOLD'});
  events.push(event);if(events.length>200)events.shift();return event;
 }
 return {emit,events:()=>events.slice(),proposal(reason){return emit('adaptive-proposal',{reason})},authority:'HOLD'};
}
return {VERSION,MODULES,createDataset,fromDemo,fromImport,fromSnapshot,selection,localAnswer,changePoint,createFramework};
});
