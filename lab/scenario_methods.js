/* F2 Learning Lab v1.2: research-only scenario-specific forecasts. No production promotion. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./synthetic.js'),require('../core.js'));
 else root.F2ScenarioMethods=factory(root.F2Synthetic,root.F2);
})(typeof self!=='undefined'?self:this,function(LAB,F2){
'use strict';
const VERSION='F2 Scenario Research 1.2';
const METHODS=Object.freeze([
 '7-day average','28-day average','same weekday','trend','yearly analogue','adaptive weekday',
 'robust weekday','regime reset','damped trend','seasonal normalized','stockout-aware','promotion pulse'
]);
const BASE=['7-day average','28-day average','same weekday'];
const DEVELOPMENT_SEEDS=Object.freeze([121121,232232,343343]);
const CHALLENGE_SEEDS=Object.freeze([454454,565565,676676]);
const HORIZONS=[7,30];
const MIN_FOLDS=8;
function mean(a){return a.reduce((s,n)=>s+n,0)/a.length;}
function sum(a){return a.reduce((s,n)=>s+n,0);}
function round(n){return Math.round(n*100)/100;}
function dayOfWeek(date){return new Date(date+'T00:00:00Z').getUTCDay();}
function dataOK(data){return data.length>400 && data.every((x,i)=>Number.isFinite(x.net_sales)&&x.net_sales>=0&&(!i||x.date===F2.addDay(data[i-1].date,1)));}
function lastWeekday(hist,date,n){const wd=dayOfWeek(date);return hist.slice(-n).filter(x=>dayOfWeek(x.date)===wd).map(x=>x.net_sales);}
function predict(history,h,method){
 if(!METHODS.includes(method))throw Error('Unregistered strategy');
 if(!Number.isInteger(h)||![7,30].includes(h))throw Error('Forecast horizon must be 7 or 30 days');
 if(!dataOK(history))return null;
 if(!METHODS.slice(6).includes(method))return LAB.predict(history,h,method);
 const end=history[history.length-1].date;
 const last=(n)=>mean(history.slice(-n).map(x=>x.net_sales));
 const recent14=last(14), prior14=mean(history.slice(-28,-14).map(x=>x.net_sales));
 const prev28=mean(history.slice(-56,-28).map(x=>x.net_sales)),recent28=last(28);
 const res=[];
 for(let i=1;i<=h;i++){
  const date=F2.addDay(end,i),wd28=lastWeekday(history,date,28),wd56=lastWeekday(history,date,56);
  const weekday=mean(wd56);let value;
  switch(method){
   case 'robust weekday':{
    const a=wd56.slice().sort((x,y)=>x-y);value=mean(a.slice(1,-1));break;
   }
   case 'regime reset':{
    const wd14=lastWeekday(history,date,14);
    value=.8*mean(wd14)+.2*weekday;break;
   }
   case 'damped trend':{
    const trend=prior14>0?Math.max(.74,Math.min(1.26,recent14/prior14)):1;
    value=weekday*Math.pow(trend,.50);break;
   }
   case 'seasonal normalized':{
    // Seasonal analog indexed by same weekday 364 days earlier. Only known history.
    const analog=history[history.length+i-365];
    const baseOld=history.slice(-392,-364),baseNew=history.slice(-28);
    if(!analog||baseOld.length!==28)return null;
    const oldMean=mean(baseOld.map(x=>x.net_sales));
    const factor=oldMean>0?Math.max(.5,Math.min(1.8,mean(baseNew.map(x=>x.net_sales))/oldMean)):1;
    value=analog.net_sales*factor;break;
   }
   case 'stockout-aware':{
    // Only *historically observed* stockouts, never future stockout flags.
    const recent=history.slice(-56),available=recent.filter(x=>!x.stockout && dayOfWeek(x.date)===dayOfWeek(date));
    const stocked=available.length>=4?mean(available.map(x=>x.net_sales)):weekday;
    const observedRate=recent.filter(x=>x.stockout).length/recent.length;
    const normal=weekday;
    value=.45*normal+.55*(stocked*(1-observedRate)+normal*observedRate);break;
   }
   case 'promotion pulse':{
    // Causal 30-day matching calendar *cycle* only; campaign schedule is unknown.
    const obs=history.slice(-150),phase=((i-1)%30),matches=[];
    for(let j=obs.length-1;j>=0;j--){const distance=obs.length-1-j;
      if(distance%30===((30-phase)%30))matches.push(obs[j].net_sales);}
    const periodic=matches.length>=3?mean(matches):recent28;
    value=.65*weekday+.35*periodic;break;
   }
  }
  res.push({date,value:round(Math.max(0,value))});
 }
 return res;
}
function score(history,h,method,start,end){
 const records=[];
 for(let cutoff=start;cutoff+h<=end;cutoff+=h){
  const fc=predict(history.slice(0,cutoff),h,method);
  if(!fc||fc.length!==h)continue;
  const truth=history.slice(cutoff,cutoff+h);
  if(fc[h-1].date!==truth[h-1].date)throw Error('Future boundary violation');
  const actual=sum(truth.map(x=>x.net_sales)),forecast=sum(fc.map(x=>x.value));
  records.push({cutoff:history[cutoff-1].date,actual,forecast,error:forecast-actual});
 }
 const denom=sum(records.map(x=>Math.abs(x.actual))),err=sum(records.map(x=>Math.abs(x.error)));
 return {method,folds:records.length,wape:denom?round(err/denom*100):null,
   bias:denom?round(sum(records.map(x=>x.error))/denom*100):null,
   mae:records.length?round(err/records.length):null,
   firstCutoff:records[0]?.cutoff||null,records};
}
function metricsFor(type,seed,h,stage,methods=METHODS,options={}){
 const ds=LAB.generate(type,seed,options),d=ds.daily,n=d.length;
 const trainEnd=n-600,validationEnd=n-300;
 const start=stage==='validation'?trainEnd:validationEnd;
 const end=stage==='validation'?validationEnd:n;
 if(!['validation','holdout'].includes(stage))throw Error('Invalid evaluation stage');
 return Object.fromEntries(methods.map(m=>[m,score(d,h,m,start,end)]));
}
function frozenSelection(){
 // No holdout data is touched when choosing scenario-specific methods.
 const mapping={};
 for(const type of LAB.TYPES){mapping[type.id]={};for(const h of HORIZONS){
  const scores=Object.fromEntries(METHODS.map(m=>[m,{sumAbs:0,sumActual:0,folds:0,bias:0}]));
  for(const seed of DEVELOPMENT_SEEDS){
   const s=metricsFor(type.id,seed,h,'validation');
   for(const m of METHODS){
    const x=s[m]; if(x.folds<MIN_FOLDS||x.wape===null)continue;
    scores[m].sumAbs+=sum(x.records.map(v=>Math.abs(v.error)));
    scores[m].sumActual+=sum(x.records.map(v=>Math.abs(v.actual)));
    scores[m].folds+=x.folds;
    scores[m].bias+=sum(x.records.map(v=>v.error));
   }
  }
  const rank=METHODS.map(m=>({method:m,folds:scores[m].folds,
    wape:scores[m].sumActual>0?round(100*scores[m].sumAbs/scores[m].sumActual):null,
    bias:scores[m].sumActual>0?round(100*scores[m].bias/scores[m].sumActual):null}))
    .filter(x=>x.wape!==null&&x.folds>=MIN_FOLDS*DEVELOPMENT_SEEDS.length)
    .sort((a,b)=>a.wape-b.wape||METHODS.indexOf(a.method)-METHODS.indexOf(b.method));
  const baseline=rank.find(x=>BASE.includes(x.method));
  const selected=rank[0];
  mapping[type.id][h]={method:selected?.method||null,baseline:baseline?.method||null,
    developmentWape:selected?.wape??null,baselineDevelopmentWape:baseline?.wape??null,
    developmentBias:selected?.bias??null,developmentRank:rank};
 }}
 return {version:VERSION,origin:'DEVELOPMENT-VALIDATION ONLY',developmentSeeds:[...DEVELOPMENT_SEEDS],selection:mapping,productionStatus:'HOLD'};
}
function challenge(selection=frozenSelection()){
 if(JSON.stringify(selection.developmentSeeds)!==JSON.stringify(DEVELOPMENT_SEEDS))throw Error('Development seed manifest changed');
 const results=[];
 for(const type of LAB.TYPES){const horizons={};for(const h of HORIZONS){
  const chosen=selection.selection[type.id][h],method=chosen.method,baseline=chosen.baseline;
  const perSeed=[],perMethod=Object.fromEntries(METHODS.map(m=>[m,{absolute:0,actual:0,bias:0,folds:0}]));
  for(const seed of CHALLENGE_SEEDS){
   const trial=metricsFor(type.id,seed,h,'holdout');
   const candidate=trial[method],reference=trial[baseline];
   if(candidate.folds<MIN_FOLDS||reference.folds<MIN_FOLDS)throw Error('Insufficient test folds');
   perSeed.push({seed,baselineWape:reference.wape,selectedWape:candidate.wape,
    improvement:reference.wape>0?round(100*(reference.wape-candidate.wape)/reference.wape):null,
    selectedBias:candidate.bias});
   for(const m of METHODS){const t=trial[m];perMethod[m].absolute+=sum(t.records.map(x=>Math.abs(x.error)));
    perMethod[m].actual+=sum(t.records.map(x=>Math.abs(x.actual)));
    perMethod[m].bias+=sum(t.records.map(x=>x.error));perMethod[m].folds+=t.folds;}
  }
  const rankings=METHODS.map(m=>({method:m,
    wape:perMethod[m].actual>0?round(perMethod[m].absolute/perMethod[m].actual*100):null,
    bias:perMethod[m].actual>0?round(perMethod[m].bias/perMethod[m].actual*100):null,
    folds:perMethod[m].folds})).sort((a,b)=>a.wape-b.wape||METHODS.indexOf(a.method)-METHODS.indexOf(b.method));
  const selectW=rankings.find(x=>x.method===method),baseW=rankings.find(x=>x.method===baseline);
  const relImprovement=baseW.wape>0?round(100*(baseW.wape-selectW.wape)/baseW.wape):null;
  const wins=perSeed.filter(s=>s.improvement>=10).length;
  const change=perSeed.filter(s=>s.improvement<0).length;
  const quality=relImprovement>=10&&Math.abs(selectW.bias)<=5&&wins>=2&&change===0;
  horizons[h]={...chosen,holdoutWape:selectW.wape,holdoutBias:selectW.bias,baselineHoldoutWape:baseW.wape,
   improvement:relImprovement,wins,losses:change,seedResults:perSeed,methodRanks:rankings,
   observedBest:rankings[0].method,retrospectiveBestOnly:true,
   status:quality?'RESEARCH CANDIDATE — PROSPECTIVE TEST REQUIRED':relImprovement<0?'FAIL — KEEP BASELINE':'HOLD — NO PROMOTION',
   productionStatus:'HOLD'};
 }results.push({type:type.id,name:type.name,horizons});}
 return {version:VERSION,evidence:'SYNTHETIC ONLY',selectionPolicy:'Scenario and horizon chosen using DEVELOPMENT VALIDATION seeds only. Unseen challenge sets never influence selection.',
  caution:'Generator type is known ONLY in simulation. No automatic identification of a real merchant regime is implemented.',
  futureTestSeeds:[...CHALLENGE_SEEDS],developmentSeeds:[...DEVELOPMENT_SEEDS],
  businessCount:results.length,productionStatus:'HOLD',businesses:results};
}
const CALENDAR_SHIFT=Object.freeze({asOf:'2027-04-17',seeds:[787878,898989,909090]});
function calendarStress(selection=frozenSelection()){
 const results=[];
 for(const type of LAB.TYPES){const horizons={};
  for(const h of HORIZONS){
   const chosen=selection.selection[type.id][h];const perSeed=[];
   for(const seed of CALENDAR_SHIFT.seeds){
    const x=metricsFor(type.id,seed,h,'holdout',[...new Set([chosen.method,chosen.baseline])],{asOf:CALENDAR_SHIFT.asOf});
    const a=x[chosen.method],b=x[chosen.baseline];
    if(a.folds<MIN_FOLDS||b.folds<MIN_FOLDS)throw Error('Not enough calendar-stress folds');
    perSeed.push({seed,methodWape:a.wape,baselineWape:b.wape,methodBias:a.bias,
      improvement:b.wape>0?round((b.wape-a.wape)/b.wape*100):null});
   }
   const improvement=round(mean(perSeed.map(x=>x.improvement)));
   horizons[h]={method:chosen.method,baseline:chosen.baseline,seedResults:perSeed,meanImprovement:improvement,
    meanWape:round(mean(perSeed.map(x=>x.methodWape))),meanBias:round(mean(perSeed.map(x=>x.methodBias))),
    positiveGroups:perSeed.filter(x=>x.improvement>0).length,negativeGroups:perSeed.filter(x=>x.improvement<0).length,
    productionStatus:'HOLD'};
  }
  results.push({type:type.id,name:type.name,horizons});
 }
 return {version:VERSION,provenance:'SYNTHETIC shifted calendar, original generator',
  cutoff:CALENDAR_SHIFT.asOf,seeds:[...CALENDAR_SHIFT.seeds],authority:'HOLD',businesses:results};
}
return {VERSION,METHODS,BASE,DEVELOPMENT_SEEDS,CHALLENGE_SEEDS,CALENDAR_SHIFT,HORIZONS,predict,score,metricsFor,frozenSelection,challenge,calendarStress};
});
