/* F2 Synthetic Business Testing Lab v1.1 — original frozen v1 regimes preserved. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('../core.js'));
  else root.F2Synthetic=factory(root.F2);
})(typeof self!=='undefined'?self:this,function(F2){
'use strict';
if(!F2||typeof F2.forecast!=='function')throw Error('F2 core.js must load first');
const VERSION='F2 Synthetic Lab 1.1';
const FROZEN_LEGACY_VERSION='F2 Synthetic Lab 1.0';
const AS_OF='2026-10-12';
const DAYS=1080, VALIDATION_DAYS=300, HOLDOUT_DAYS=300;
const METHODS=['7-day average','28-day average','same weekday','trend','yearly analogue'];
const BASELINES=METHODS.slice(0,3),CHALLENGERS=METHODS.slice(3);
const TYPES=Object.freeze([
 {id:'stable',name:'Steady Retail',description:'Recurring weekly demand, ordinary refunds, modest growth'},
 {id:'growth',name:'Rapid Growth',description:'Accelerating demand and changing order volume'},
 {id:'decline',name:'Struggling Store',description:'Demand deterioration, weaker retention and more refunds'},
 {id:'seasonal',name:'Seasonal Store',description:'Strong holiday peaks and quieter off-season demand'},
 {id:'volatile',name:'Unpredictable Store',description:'Promotions, demand shocks, refund spikes and stockouts'},
 {id:'stepchange',name:'Sudden Demand Drop',description:'An unforeseen structural demand shift during the test holdout'},
 {id:'promotion',name:'Promotion Fatigue',description:'Campaign spikes followed by discount fatigue and elevated returns'},
 {id:'supply',name:'Supply Disruption',description:'Recurring clustered stockouts, recovery and latent demand uncertainty'},
 {id:'weekdayshift',name:'Customer Behavior Shift',description:'Weekend buying moves toward weekdays after a channel transition'}
]);
function prng(seed){let t=(seed>>>0)||1;return()=>{t+=0x6D2B79F5;let x=t;x=Math.imul(x^(x>>>15),x|1);x^=x+Math.imul(x^(x>>>7),x|61);return((x^(x>>>14))>>>0)/4294967296;};}
function round2(x){return Math.round(x*100)/100;}
function finite(n){return typeof n==='number'&&Number.isFinite(n);}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0');}
function assertAsOf(asOf){if(!/^\d{4}-\d{2}-\d{2}$/.test(asOf))throw Error('asOf must be YYYY-MM-DD');let d=new Date(asOf+'T00:00:00Z');if(!Number.isFinite(d.valueOf())||d.toISOString().slice(0,10)!==asOf)throw Error('Invalid asOf date');}
function generate(type='stable',seed=101,options={}){
 if(!TYPES.some(x=>x.id===type))throw Error('Unknown synthetic store type');
 if(!Number.isInteger(seed)||seed<1||seed>1000000000)throw Error('Seed must be integer 1..1,000,000,000');
 const asOf=options.asOf||AS_OF,days=options.days||DAYS;
 assertAsOf(asOf);if(!Number.isInteger(days)||days<120||days>3650)throw Error('Days must be 120..3650');
 const rnd=prng((seed^hash(type).split('').reduce((s,c)=>s+c.charCodeAt(0),0))>>>0);
 const first=F2.addDay(asOf,1-days),daily=[];
 for(let i=0;i<days;i++){
  const date=F2.addDay(first,i),month=Number(date.slice(5,7)),wd=new Date(date+'T00:00:00Z').getUTCDay();
  let week=(wd===0||wd===6)?1.19:(wd===1?.91:1);
  let base=900,annual=month===12?1.22:month===1?.87:1,refundRate=.035;
  let stockout=false,spike=false;
  if(type==='stable'){base=900*(1+.06*i/days);}
  if(type==='growth'){base=510*(1+1.8*Math.pow(i/days,1.48));refundRate=.025;}
  if(type==='decline'){base=1570*(1-.73*i/days);refundRate=.065+.06*i/days;}
  if(type==='seasonal'){base=815;annual=month===12?2.45:month===11?1.7:month===1?.7:month===6?.67:.98;}
  if(type==='volatile'){base=1100;annual=1;refundRate=.04;stockout=(i%71>=61)||(i%131>=123);spike=(i%58<=2)||(i%83===6);}
  // NEW regimes introduce disturbances that do not exist in the frozen v1 generator.
  // Holdout begins at day 780 on the default 1,080 day history.
  if(type==='stepchange'){base=i<785?980:525;refundRate=i<785?.035:.055;}
  if(type==='promotion'){base=i<780?840:710;refundRate=i<780?.04:.12;spike=(i%30<5);}
  if(type==='supply'){base=1100;stockout=(i>=680&&(i%62>=43&&i%62<=55))||(i>=800&&i%97>=72);refundRate=.04;}
  if(type==='weekdayshift'){base=970;refundRate=.03;if(i>=785)week=(wd===0||wd===6)?.67:((wd===2||wd===3)?1.44:.96);}

  const oscillation=type==='volatile'?.56+1.00*rnd():.90+.21*rnd();
  const promotion=(type==='volatile'&&i%97<4)?1.95:(type==='promotion'&&i%30<5)?(i<780?2.2:1.48):1;
  const stockFactor=stockout?.19:1;
  const gross=base*annual*week*oscillation*promotion*stockFactor;
  const orders=Math.max(0,Math.round(gross/46));
  const refunds=round2(gross*Math.min(.85,refundRate*(spike?5.4:1)));
  const net_sales=round2(Math.max(0,gross-refunds));
  const new_customers=Math.min(orders,Math.round(orders*(type==='decline'?.25-(i/days)*.09:type==='growth'?.48:.35)));
  const returning_customers=Math.max(0,orders-new_customers);
  daily.push({date,net_sales,orders,refunds,new_customers,returning_customers,inventory_units:stockout?Math.max(0,orders-1):Math.round(orders*4.6+25),stockout,refund_spike:spike});
 }
 return {id:type,seed,asOf,days,source:'SYNTHETIC GENERATED • NOT A REAL SHOPIFY STORE',currency:'USD',daily,
   fingerprint:hash((['stable','growth','decline','seasonal','volatile'].includes(type)?FROZEN_LEGACY_VERSION:VERSION)+'|'+type+'|'+seed+'|'+asOf+'|'+days+'|'+daily.map(d=>d.net_sales).join(','))};
}
function yearly(history,h){const n=history.length;if(n<400)return null;
 const origin=history.slice(-392,-364),recent=history.slice(-28);
 if(origin.length!==28||recent.length!==28||origin.some(d=>!finite(d.net_sales))||recent.some(d=>!finite(d.net_sales)))return null;
 const denom=origin.reduce((s,d)=>s+d.net_sales,0)/28;
 const numer=recent.reduce((s,d)=>s+d.net_sales,0)/28;
 const scale=denom>0?Math.max(.45,Math.min(2.15,numer/denom)):1;
 const predicted=[];
 for(let t=1;t<=h;t++){
  const analog=history[n+t-365]; // exactly 364 days before predicted date, same weekday
  if(!analog||!finite(analog.net_sales))return null;
  predicted.push({date:F2.addDay(history[n-1].date,t),value:round2(Math.max(0,analog.net_sales*scale))});
 }
 return predicted;
}
function adaptiveWeekday(history,h){
 // Shadow candidate, deliberately fixed BEFORE independent challenge seeds.
 // Only known observations are used; no future demand/shock labels or oracle regimes.
 if(history.length<56)return null;
 const recent=history.slice(-28),old=history.slice(-56);
 if(old.some(x=>!finite(x.net_sales)||x.net_sales<0))return null;
 const results=[];
 for(let t=1;t<=h;t++){
  const date=F2.addDay(history[history.length-1].date,t),wd=new Date(date+'T00:00:00Z').getUTCDay();
  const recentVals=recent.filter(x=>new Date(x.date+'T00:00:00Z').getUTCDay()===wd),allVals=old.filter(x=>new Date(x.date+'T00:00:00Z').getUTCDay()===wd);
  if(!recentVals.length||!allVals.length)return null;
  const mean=a=>a.reduce((s,x)=>s+x.net_sales,0)/a.length;
  const short=mean(recentVals),long=mean(allVals);
  // Pre-registered 70% short-recency / 30% weekday-history blend.
  results.push({date,value:round2(Math.max(0,short*.70+long*.30))});
 }
 return results;
}
function predict(history,h,method){if(method==='yearly analogue')return yearly(history,h);if(method==='adaptive weekday')return adaptiveWeekday(history,h);return F2.forecast(history,h,method);}

function grade(daily,h,method,start,end){
 const folds=[];
 for(let cutoff=start;cutoff+h<=end;cutoff+=h){
  const hist=daily.slice(0,cutoff); // Only observations available at forecast time
  const prediction=predict(hist,h,method);
  if(!prediction||prediction.length!==h)continue;
  const observed=daily.slice(cutoff,cutoff+h);
  if(observed.length!==h||observed.some(d=>!finite(d.net_sales)))continue;
  const expectedDate=observed[observed.length-1].date;
  if(prediction[prediction.length-1].date!==expectedDate)throw Error('Leakage/date alignment guard failed');
  const pred=prediction.reduce((s,d)=>s+d.value,0),actual=observed.reduce((s,d)=>s+d.net_sales,0);
  folds.push({cutoff:hist[hist.length-1].date,targetEnd:expectedDate,pred:round2(pred),actual:round2(actual),error:round2(pred-actual)});
 }
 const denom=folds.reduce((s,f)=>s+Math.abs(f.actual),0),abs=folds.reduce((s,f)=>s+Math.abs(f.error),0),bias=folds.reduce((s,f)=>s+f.error,0);
 return {method,horizon:h,folds:folds.length,wape:denom>0?round2(abs/denom*100):null,bias:denom>0?round2(bias/denom*100):null,
   mae:folds.length?round2(abs/folds.length):null,foldResults:folds,firstTarget:folds[0]?.targetEnd||null,lastTarget:folds[folds.length-1]?.targetEnd||null};
}
function comparable(a,b){return a&&b&&a.wape!==null&&b.wape!==null&&a.folds>=8&&b.folds>=8;}
function evaluate(ds){
 const d=ds.daily,n=d.length;
 if(n<1000)throw Error('At least 1000 days required for chronological, independent tests');
 if(d.some((v,i)=>!finite(v.net_sales)||v.net_sales<0||(i>0&&v.date!==F2.addDay(d[i-1].date,1))))throw Error('Incomplete/invalid synthetic daily timeline');
 const trainEnd=n-(VALIDATION_DAYS+HOLDOUT_DAYS),validationEnd=n-HOLDOUT_DAYS;
 if(trainEnd<400)throw Error('At least 1000 days required for annual analogue');
 const tests={};
 for(const h of [7,30]){
  const validation=Object.fromEntries(METHODS.map(m=>[m,grade(d,h,m,trainEnd,validationEnd)]));
  const holdout=Object.fromEntries(METHODS.map(m=>[m,grade(d,h,m,validationEnd,n)]));
  const champion=BASELINES.filter(m=>validation[m].folds>=8&&validation[m].wape!==null)
   .sort((a,b)=>validation[a].wape-validation[b].wape)[0]||null;
  const candidate=CHALLENGERS.filter(m=>validation[m].folds>=8&&validation[m].wape!==null)
   .sort((a,b)=>validation[a].wape-validation[b].wape)[0]||null;
  const current=champion?holdout[champion]:null,next=candidate?holdout[candidate]:null;
  const improvement=comparable(current,next)&&current.wape>0?round2((current.wape-next.wape)/current.wape*100):null;
  const proposed=improvement!==null&&improvement>=10&&Math.abs(next.bias)<=5&&validation[candidate].wape<validation[champion].wape;
  // Shadow trial never modifies champion or challenger selections from version 1.0.
  const shadowValidation=grade(d,h,'adaptive weekday',trainEnd,validationEnd);
  const shadowHoldout=grade(d,h,'adaptive weekday',validationEnd,n);
  const shadowImprovement=comparable(current,shadowHoldout)&&current.wape>0?
    round2((current.wape-shadowHoldout.wape)/current.wape*100):null;
  const shadow={method:'adaptive weekday',blend:'70% last-28-day weekday; 30% last-56-day weekday',
    validationWape:shadowValidation.wape,holdoutWape:shadowHoldout.wape,holdoutBias:shadowHoldout.bias,
    folds:shadowHoldout.folds,improvement:shadowImprovement,
    validationBeatsChampion:champion?shadowValidation.wape<validation[champion].wape:false,
    proposedForAnotherTest:shadowImprovement!==null&&shadowImprovement>=10&&Math.abs(shadowHoldout.bias)<=5&&champion!==null&&shadowValidation.wape<validation[champion].wape,
    action:'NO AUTOMATIC MODEL PROMOTION / PRODUCTION HOLD'};
  tests[h]={horizon:h,champion,candidate,validation,holdout,championHoldoutWape:current?.wape??null,candidateHoldoutWape:next?.wape??null,
    improvement,proposed,shadow,action:proposed?'PROSPECTIVE TEST CANDIDATE':'NO MODEL PROMOTION',decisionAuthority:'HOLD'};
 }
 const recent=d.slice(-30),prior=d.slice(-60,-30);
 const sum=(r,k)=>r.reduce((s,v)=>s+(v[k]||0),0);
 const sales=sum(recent,'net_sales'),before=sum(prior,'net_sales');
 const refunds=sum(recent,'refunds');
  const signals=[];
 if(['stepchange','promotion','supply','weekdayshift'].includes(ds.id))signals.push('New structural-stress regime: explicitly compare frozen baseline and shadow challenger across independent seeded histories.');
 if(before>0&&sales/before>1.18)signals.push('Recent 30-day simulated revenue rose more than 18% against the preceding 30 days. Test persistence before extrapolating.');
 if(before>0&&sales/before<.82)signals.push('Recent 30-day simulated revenue fell more than 18%. Stress-test further decline.');
 if(recent.some(x=>x.stockout))signals.push('Simulated stockout detected; revenue may be demand-constrained rather than true market demand.');
 if(recent.some(x=>x.refund_spike)||refunds/Math.max(sales+refunds,1)>.1)signals.push('Simulated refund anomaly; check whether net sales proxies distort apparent demand.');
 if(!signals.length)signals.push('No large short-window anomaly detected; this does not prove future stability.');
 const nextForecast={};for(const h of [7,30]){const method=tests[h].champion;const daily=method?predict(d,h,method):null;nextForecast[h]=daily?{method,forecastTotal:round2(daily.reduce((s,p)=>s+p.value,0)),start:daily[0].date,end:daily[daily.length-1].date,unit:'synthetic USD',status:'NOT APPROVED'}:null;}
 const split={training:{start:d[0].date,end:d[trainEnd-1].date,days:trainEnd},validation:{start:d[trainEnd].date,end:d[validationEnd-1].date,days:VALIDATION_DAYS},holdout:{start:d[validationEnd].date,end:d[n-1].date,days:HOLDOUT_DAYS}};
 return {id:ds.id,seed:ds.seed,fingerprint:ds.fingerprint,asOf:ds.asOf,source:ds.source,split,tests,
  nextForecast,totals:{net_sales:round2(sum(d,'net_sales')),orders:sum(d,'orders'),refunds:round2(sum(d,'refunds')),stockoutDays:d.filter(x=>x.stockout).length},
  signals,productionStatus:'HOLD',ledger:[
   {control:'LL-01 Provenance',state:'PASS-SYNTHETIC',evidence:`Synthetic generator ${VERSION}, fingerprint ${ds.fingerprint}`},
   {control:'LL-02 Frozen chronology',state:'PASS',evidence:`Training ${split.training.end}; selection ends ${split.validation.end}; independent holdout begins ${split.holdout.start}`},
   {control:'LL-03 Champion/challenger',state:'EVALUATED',evidence:'Selection uses only validation; holdout grades fixed choices without reselection'},
   {control:'LL-04 Alternative & adversarial',state:'RECORDED',evidence:'Synthetic shocks, seasonality, refunds and stockouts may mimic or obscure growth'},
   {control:'LL-05 Confidence/calibration',state:'HOLD',evidence:'No calibrated prediction intervals or real-store reconciliation'},
   {control:'LL-06 Learning authority',state:'HOLD',evidence:'Model changes are proposals only; require forward-time tests and real-data evidence'},
   {control:'LL-07 Incremental merchant value',state:'UNVALIDATED',evidence:'No benchmark against real Shopify outcomes or business impact'},
   {control:'LL-08 Independent stress scenarios',state:'RESEARCH ONLY',evidence:'Legacy v1 generator fingerprints preserved; shadow forecast selection frozen before holdout and distinct seed challenges'}
  ]};
}
function batch(options={}){
 const seed=options.seed===undefined?101:Number(options.seed),seeds=options.seeds||3,asOf=options.asOf||AS_OF;
 if(!Number.isInteger(seeds)||seeds<1||seeds>6)throw Error('seeds must be 1..6');
 if(!Number.isInteger(seed)||seed<1||seed>999999900)throw Error('Seed out of allowed range');
 const results=[];
 for(const type of TYPES){
  const runs=[];
  for(let j=0;j<seeds;j++)runs.push(evaluate(generate(type.id,seed+j*7919,{asOf})));
  const summary={};
  for(const h of [7,30]){
   const comparableRuns=runs.filter(x=>x.tests[h].improvement!==null);
   const mean=(key)=>{const vals=comparableRuns.map(r=>r.tests[h][key]).filter(finite);return vals.length?round2(vals.reduce((a,b)=>a+b,0)/vals.length):null};
   const positives=comparableRuns.filter(x=>x.tests[h].proposed).length;
   const shadowImprovements=comparableRuns.map(x=>x.tests[h].shadow.improvement).filter(finite);
   const shadowMean=shadowImprovements.length?round2(shadowImprovements.reduce((a,b)=>a+b,0)/shadowImprovements.length):null;
   const shadowPositive=comparableRuns.filter(x=>x.tests[h].shadow.proposedForAnotherTest).length;
   summary[h]={runs:comparableRuns.length,championWape:mean('championHoldoutWape'),candidateWape:mean('candidateHoldoutWape'),meanImprovement:mean('improvement'),proposals:positives,shadowWape:shadowImprovements.length?round2(comparableRuns.reduce((a,b)=>a+b.tests[h].shadow.holdoutWape,0)/comparableRuns.length):null,shadowImprovement:shadowMean,shadowProposals:shadowPositive,action:positives>=Math.ceil(seeds*2/3)?'FORWARD-TIME EXPERIMENT CANDIDATE':'KEEP CHAMPION / INVESTIGATE'};
  }
  results.push({type:type.id,name:type.name,description:type.description,runs,summary});
 }
 return {version:VERSION,asOf,seed,seeds,provenance:'100% GENERATED SYNTHETIC DATA; NOT SHOPIFY',productionStatus:'HOLD',
   evaluationPolicy:'Validation selects champion and challenger. Independent holdout grades them. No weights auto-deploy. Synthetic successes do not validate real accuracy.',businesses:results};
}
return {VERSION,FROZEN_LEGACY_VERSION,AS_OF,DAYS,TYPES,METHODS,BASELINES,CHALLENGERS,generate,predict,grade,evaluate,batch};
});
