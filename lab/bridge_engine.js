/* F2 Learning Lab 1.4: prospective research, no real merchant model promotion. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./transition_engine.js'),require('./scenario_methods.js'),require('../core.js'));else root.F2Bridge=factory(root.F2TransitionEngine,root.F2ScenarioMethods,root.F2);})(typeof self!=='undefined'?self:this,function(T,M,F2){
'use strict';
const VERSION='F2 Transition Bridge 1.4';
const CONFIRM=6, MIN_DWELL=70, BLEND=10, MAX_SWITCHES_90=2, MARGIN=.13;
const sum=a=>a.reduce((s,x)=>s+x,0),avg=a=>a.length?sum(a)/a.length:0;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const round=x=>Math.round(x*10000)/10000;
const dow=s=>new Date(s+'T00:00:00Z').getUTCDay();
const days=(a,b)=> (Date.parse(a+'T00:00:00Z')-Date.parse(b+'T00:00:00Z'))/86400000;
const rate=r=>{let x=sum(r.map(t=>t.refunds||0)),y=x+sum(r.map(t=>t.net_sales));return y?x/y:0;};
const ratio=(a,b)=>b>0?a/b:1;
function evidence(history){
 const last7=history.slice(-7),last14=history.slice(-14),last28=history.slice(-28),prev28=history.slice(-56,-28),last56=history.slice(-56),last84=history.slice(-84),prev84=history.slice(-168,-84);
 const clean=x=>x.filter(y=>y.stockout!==true);
 const availableRatio=ratio(avg(clean(last28).map(x=>x.net_sales)),avg(clean(prev28).map(x=>x.net_sales)));
 const refunds=rate(last28),priorRefunds=rate(history.slice(-112,-56));
 const out14=last14.filter(x=>x.stockout===true).length/14,out56=last56.filter(x=>x.stockout===true).length/56;
 const out84=last84.filter(x=>x.stockout===true).length/84;
 const promo14=last14.filter(x=>x.refund_spike===true).length;
 const promo56=last56.filter(x=>x.refund_spike===true).length;
 const stockoutDays=last56.filter(x=>x.stockout===true).length;
 const cv=T.featureEvidence(history).volatilityCV;
 const weekendShare=a=>{const tot=sum(a.map(x=>x.net_sales));return tot?sum(a.filter(x=>[0,6].includes(dow(x.date))).map(x=>x.net_sales))/tot:0};
 const wdiff=weekendShare(history.slice(-112,-56))-weekendShare(last28);
 const tr=ratio(avg(last7.map(x=>x.net_sales)),avg(history.slice(-35,-7).map(x=>x.net_sales)));
 const level28=ratio(avg(last28.map(x=>x.net_sales)),avg(prev28.map(x=>x.net_sales)));
 const trend84=ratio(avg(last84.map(x=>x.net_sales)),avg(prev84.map(x=>x.net_sales)));
 const downAvailable=availableRatio<.83 && clean(last28).length>=12 && clean(prev28).length>=12;
 const hint=T.featureEvidence(history).yearlyHolidayRatio;
 return {refundShare:round(refunds),refundPrevious:round(priorRefunds),refundChange:round(refunds-priorRefunds),stockout14:round(out14),stockout56:round(out56),stockout84:round(out84),stockoutDays,promotionSpike14:promo14,promotionSpike56:promo56,cleanDemandRatio:round(availableRatio),shortRatio:round(tr),monthlyRatio:round(level28),trend84:round(trend84),volatilityCV:cv,weekendShift:round(wdiff),annualContrast:hint,cleanDown:downAvailable};
}
function detect(history){
 const raw=T.detect(history);
 if(raw.reason && raw.status==='HOLD' && Object.keys(raw.evidence||{}).length===0)return {...raw,bridgeVersion:VERSION};
 const f=evidence(history),scores=[];
 const add=(id,score,why)=>{if(score>=.45)scores.push({type:id,strength:round(clamp(score)),why});};
 // Strong external constraints have priority over demand-growth interpretations.
 add('supply',f.stockout56>=.25&&f.stockout84>=.25&&f.stockoutDays>=12&&f.promotionSpike56<2?(.76+Math.min(.14,(f.stockout56-.24)*.9)+Math.min(.04,f.stockout14*.09)):0,'Observed availability and prolonged stockout clusters, not an assumed demand drop');
 add('promotion',f.refundShare>.15 && (f.refundShare>f.refundPrevious*1.2||f.promotionSpike56>=3)?
  .69+Math.min(.16,(f.refundShare-.09)*1.5)+Math.min(.05,f.promotionSpike14*.009):0,
  'Observed return/refund burden and short-run campaign fatigue');
 add('stepchange',f.cleanDown && f.shortRatio<.84? .77+Math.min(.12,(.84-f.shortRatio)*.5):0,'Sharp deterioration in availability-adjusted demand');
 add('weekdayshift',f.weekendShift>.085?.68+Math.min(.20,(f.weekendShift-.085)*1.5):0,'Observed weekday concentration moved');
 add('volatile',f.volatilityCV>.49&&f.stockout56<.34?.75+Math.min(.15,(f.volatilityCV-.49)*.4):0,'High unexplained variation, not supply bottleneck');
 add('seasonal',f.annualContrast>2.6&&f.volatilityCV<.45?.76+Math.min(.14,(f.annualContrast-2.6)*.07):0,'Repeated yearly seasonal contrast');
 add('growth',f.trend84>1.16&&f.monthlyRatio>1.04?.73+Math.min(.15,(f.trend84-1.16)*.6):0,'Sustained available sales expansion');
 add('decline',f.trend84<.82&&f.monthlyRatio<.96&&f.stockout56<.12?.75+Math.min(.12,(.82-f.trend84)*.5):0,'Sustained fall without significant stockout exposure');
 if(!scores.length)add('stable',.72,'No reproducible disruption signal');
 scores.sort((a,b)=>b.strength-a.strength);
 const top=scores[0],second=scores[1];
 const ambiguous=!!(second && top.strength-second.strength<MARGIN);
 const candidate=ambiguous?null:top.type;
 return {version:VERSION,detector:'bridge-hysteresis-1',asOf:raw.asOf,status:ambiguous?'HOLD':'OBSERVED',candidate,signalStrength:top.strength,
  margin:second?round(top.strength-second.strength):1,competing:scores.slice(0,4),evidence:f,reason:ambiguous?'Competing causal indicators — do not change routing':'Completed-day evidence; strength is not probability'};
}
function initialState(){return {version:VERSION,active:'stable',lastProcessed:null,pending:null,count:0,lastSwitch:null,transition:null,ledger:[],status:'SYNTHETIC SHADOW — HOLD'};}
function update(prev,history){
 const state=prev?structuredClone(prev):initialState(),ind=detect(history),at=ind.asOf;
 if(!at || ind.status==='HOLD' && !ind.evidence?.monthlyRatio)return {state,indicator:ind,action:'HOLD',changed:false};
 if(state.lastProcessed && days(at,state.lastProcessed)<=0)return {state,indicator:ind,action:'DUPLICATE',changed:false};
 const gap=state.lastProcessed && days(at,state.lastProcessed)>1;
 state.lastProcessed=at;
 if(ind.status==='HOLD'||!ind.candidate){state.pending=null;state.count=0;return {state,indicator:ind,action:'AMBIGUOUS',changed:false};}
 if(ind.candidate===state.active){state.pending=null;state.count=0;return {state,indicator:ind,action:'STAY',changed:false};}
 if(gap || state.pending!==ind.candidate){state.pending=ind.candidate;state.count=1;}else state.count++;
 const confirm=ind.candidate==='stable'?Math.max(CONFIRM,21):CONFIRM;
 if(state.count<confirm)return {state,indicator:ind,action:'CONFIRM',changed:false};
 if(state.lastSwitch && days(at,state.lastSwitch)<MIN_DWELL)return {state,indicator:ind,action:'DWELL',changed:false};
 const recent=state.ledger.filter(x=>days(at,x.date)<=90);
 if(recent.length>=MAX_SWITCHES_90)return {state,indicator:ind,action:'ANTI_CHURN',changed:false};
 const from=state.active,to=ind.candidate;
 state.active=to;state.pending=null;state.count=0;state.lastSwitch=at;state.transition={from,to,started:at,blendDays:BLEND};
 const event={date:at,from,to,reason:ind.reason,confidence:'UNVALIDATED',strength:ind.signalStrength,margin:ind.margin,evidence:ind.evidence,authority:'SYNTHETIC SHADOW — HOLD'};
 state.ledger.push(event);
 return {state,indicator:ind,action:'SHADOW_SWITCH',event,changed:true};
}
function bridgeForecast(history,h,kind){
 if(![7,30].includes(h))throw Error('Unsupported horizon');
 if(kind!=='supply'&&kind!=='promotion')throw Error('Unsupported bridge');
 const baseline=M.predict(history,h,'28-day average');if(!baseline)return null;
 const prev=history.slice(-168),r=prev.slice(-84),old=prev.slice(-168,-84);
 const f=evidence(history),last=history.at(-1).date;
 const vals=[];
 for(let i=1;i<=h;i++){
  const day=F2.addDay(last,i),dayNr=dow(day);
  const inStock=r.filter(x=>x.stockout!==true&&dow(x.date)===dayNr),earlier=old.filter(x=>x.stockout!==true&&dow(x.date)===dayNr);
  const inStockAvg=inStock.length>=3?avg(inStock.map(x=>x.net_sales)):avg(r.filter(x=>x.stockout!==true).map(x=>x.net_sales));
  const earlierAvg=earlier.length>=3?avg(earlier.map(x=>x.net_sales)):inStockAvg;
  let proposed=baseline[i-1].value;
  if(kind==='supply'){
   const q=clamp(.6*f.stockout84+.4*f.stockout56,.02,.75);
   const constrained=r.filter(x=>x.stockout===true);
   const severity=constrained.length>=5?clamp(avg(constrained.map(x=>x.net_sales))/Math.max(inStockAvg,1),.1,.7):.25;
   const expected=inStockAvg*(1-q*(1-severity));
   proposed=.35*baseline[i-1].value+.65*expected;
  }else{
   // Suppress unstable campaign pulses: discount shock days in observed daily net sales
   // cannot justify projecting another campaign without a confirmed schedule.
   const weekdays=r.filter(x=>dow(x.date)===dayNr);
   const uncontaminated=weekdays.filter(x=>x.refund_spike!==true);
   const safe=uncontaminated.length>=5?avg(uncontaminated.map(x=>x.net_sales)):avg(weekdays.map(x=>x.net_sales));
   const cleanTrend=earlierAvg>0?clamp(inStockAvg/earlierAvg,.70,1.05):1;
   proposed=.55*baseline[i-1].value+.45*safe*cleanTrend;
  }
  vals.push({date:day,value:round(Math.max(0,proposed))});
 }
 return vals;
}
function methodFor(state,h){const label=state.active;return label==='supply'?'supply bridge':label==='promotion'?'promotion bridge':'28-day average';}
function forecast(history,h,state){
 const kind=state.active,method=methodFor(state,h);
 const best=(label)=>label==='supply'||label==='promotion'?bridgeForecast(history,h,label):M.predict(history,h,'28-day average');
 const current=best(kind);if(!current)return {status:'HOLD',reason:'Insufficient evidence'};
 const trans=state.transition,age=trans?days(history.at(-1).date,trans.started):999;
 let weight=1,prior=null;
 if(trans&&age>=0&&age<BLEND){weight=(age+1)/BLEND;prior=best(trans.from);}
 if(prior&&prior.length!==h)return {status:'HOLD',reason:'Incomplete earlier method'};
 const daily=current.map((x,i)=>({date:x.date,value:round(weight*x.value+(prior?(1-weight)*prior[i].value:0))}));
 return {status:'SYNTHETIC SHADOW — HOLD',method,regime:kind,blend:round(weight),total:round(sum(daily.map(x=>x.value))),daily};
}
// Development pre-registration, NOT a production allowlist. Legacy v1.3
// remains the challenger-comparison anchor outside tested bridge regimes.
const SHADOW_GATES=Object.freeze({promotion:Object.freeze({7:.75}),supply:Object.freeze({30:.70})});
function hybridForecast(history,h,newState,legacyForecast){
 if(!legacyForecast||!Array.isArray(legacyForecast.daily))return {status:'HOLD',reason:'Legacy forecast unavailable'};
 const weight=SHADOW_GATES[newState.active]?.[h]||0;
 if(!weight)return {status:'SYNTHETIC SHADOW — HOLD',method:'FROZEN-LEGACY',route:'LEGACY',daily:legacyForecast.daily,total:legacyForecast.total};
 const trial=forecast(history,h,newState);
 if(!trial.daily)return {status:'SYNTHETIC SHADOW — HOLD',method:'FROZEN-LEGACY',route:'FALLBACK',daily:legacyForecast.daily,total:legacyForecast.total};
 const daily=trial.daily.map((r,i)=>({date:r.date,value:round(r.value*weight+legacyForecast.daily[i].value*(1-weight))}));
 return {status:'SYNTHETIC SHADOW — HOLD',method:trial.method,route:'BRIDGE',blend:weight,daily,total:round(sum(daily.map(x=>x.value)))};
}
function replay(history,{initial=112}={}){
 let state=initialState(),ind;
 for(let i=Math.max(initial,T.MIN_HISTORY);i<=history.length;i++){
  const r=update(state,history.slice(0,i));state=r.state;ind=r.indicator;
 }
 return {state,indicator:ind,events:state.ledger,authority:'SYNTHETIC SHADOW — HOLD'};
}
return {VERSION,CONFIRM,MIN_DWELL,BLEND,MAX_SWITCHES_90,SHADOW_GATES,detect,evidence,initialState,update,bridgeForecast,methodFor,forecast,hybridForecast,replay};
});
