/* Independent supply simulations. New mathematical generation process; no Shopify records. */
'use strict';
const F=require('../core.js');const L=require('./synthetic.js');
function random(seed){let x=seed>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296}}
const round=n=>Math.round(n*100)/100;
function generate(mode,seed,{asOf='2027-01-30'}={}){
 if(!['markov','supplier','seasonal','intermittent'].includes(mode))throw Error('unknown stress mode');
 if(!Number.isSafeInteger(seed)||seed<1)throw Error('positive integer seed required');
 const r=random(seed),daily=[],first=F.addDay(asOf,-1079);let stock=0,wait=0,latent=0;
 for(let i=0;i<1080;i++){
  const date=F.addDay(first,i),dow=new Date(date+'T00:00:00Z').getUTCDay();
  let stockout=false,rate=.04,trend=1+.13*i/1080,weekly=[1.18,.91,.98,1,1,1.03,1.13][dow];
  // Independent stochastic supply generator, not based on v1.1 modulo 62/97 patterns.
  if(i>=650){
   if(mode==='markov'){if(stock>0){stock--;stockout=true}else if(r()<.08){stock=3+Math.floor(r()*16);stockout=true}}
   else if(mode==='supplier'){if(wait>0){stockout=true;wait--}else if(r()<.045){wait=8+Math.floor(r()*25);stockout=true}}
   else if(mode==='seasonal'){const month=Number(date.slice(5,7));if(stock>0){stock--;stockout=true}else if((month>=10||month<=1?.12:.025)>r()){stock=4+Math.floor(r()*11);stockout=true}}
   else if(mode==='intermittent'){const incidence=i>840?.11:.055;if(stock>0){stock--;stockout=true}else if(r()<incidence){stock=1+Math.floor(r()*4);stockout=true}}
  }
  const demand=Math.max(0,1100*weekly*trend*(.77+.47*r())*(mode==='seasonal'&&Number(date.slice(5,7))===12?1.4:1));
  const severity=.12+.38*r(),full=demand,net_sales=round((stockout?severity:1)*full*(1-rate));
  const refunds=round((stockout?severity:1)*full*rate);
  const orders=Math.round(net_sales/52);
  daily.push({date,net_sales,orders,refunds,stockout,refund_spike:false,inventory_units:stockout?0:Math.round(200+r()*400)});
 }
 return {mode,seed,asOf,daily,source:'INDEPENDENT SYNTHETIC SUPPLY STRESS; NO SHOPIFY'};
}
module.exports={generate};
