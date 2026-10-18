/* LIBERIENT Open Decision Lab: dependency-free and synthetic/offline only.
   Inspired by open forecasting and operations-research patterns; does not
   import proprietary Shopify/Anaplan/Inventory Planner data.
   No autonomous orders, merchant action, production forecasts or AI promotion.
*/
'use strict';
const isNonnegative=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const median=xs=>{const a=[...xs].sort((x,y)=>x-y),mid=Math.floor(a.length/2);
 return a.length?a.length%2?a[mid]:(a[mid-1]+a[mid])/2:null;};
function validateHistory(history){
 if(!Array.isArray(history)||history.length<28)throw Error('Need 28 or more consecutive historical daily observations');
 let prior=null;
 for(const v of history){
  if(!v||!/^\d{4}-\d{2}-\d{2}$/.test(v.date)||!isNonnegative(v.units_sold)||
      !Number.isInteger(v.units_sold))throw Error('Invalid daily sales history');
  const ms=Date.parse(v.date+'T00:00:00Z');
  if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,10)!==v.date||
     (prior!==null&&ms-prior!==86400000))throw Error('History must be consecutive UTC calendar days');
  prior=ms;
  if(v.on_hand!==undefined&&(!isNonnegative(v.on_hand)||!Number.isInteger(v.on_hand)))throw Error('Invalid on-hand stock');
  if(v.stockout!==undefined&&typeof v.stockout!=='boolean')throw Error('Stockout must be boolean');
 }
 return true;
}
function weekdayBaseline(history,horizon){
 validateHistory(history);
 if(!Number.isInteger(horizon)||![7,30].includes(horizon))throw Error('Unsupported horizon');
 const hist=history.slice();
 const lastMs=Date.parse(hist[hist.length-1].date+'T00:00:00Z');
 const weekly=new Map();
 for(const v of hist){
  // Only use confirmed in-stock observations for observed-demand proxy.
  const dow=new Date(v.date+'T00:00:00Z').getUTCDay();
  if(v.stockout===true)continue;
  if(!weekly.has(dow))weekly.set(dow,[]);
  weekly.get(dow).push(v.units_sold);
 }
 const clean=hist.filter(v=>v.stockout!==true).map(v=>v.units_sold);
 const global=median(clean);
 const unknownStockouts=hist.filter(v=>v.stockout===undefined).length;
 const missingWeekdays=[...Array(7).keys()].filter(i=>(weekly.get(i)||[]).length<2);
 const daily=[];
 for(let i=1;i<=horizon;i++){
  const at=new Date(lastMs+i*86400000);
  const day=at.getUTCDay();
  daily.push({date:at.toISOString().slice(0,10),
              units:median(weekly.get(day)||[])??global??0});
 }
 return {model:'IN_STOCK_WEEKDAY_MEDIAN_V1',as_of:hist[hist.length-1].date,
         horizon,forecast_daily:daily,forecast_total:daily.reduce((a,b)=>a+b.units,0),
         missing_weekdays:missingWeekdays,unknown_stockout_days:unknownStockouts,
         observations_with_known_in_stock:clean.length,
         caveat:'Observed units sold can understate demand when availability is unknown or constrained.',
         confidence:'UNCALIBRATED',authority:'HOLD'};
}
function simulateReplenishment({dailyForecast,onHand,onOrder=0,leadDays=7,
                                casePack=1,unitCost=0,budget=0,
                                maxStorageUnits=100000}){
 if(!Array.isArray(dailyForecast)||dailyForecast.length===0||
    dailyForecast.some(d=>!d||!isNonnegative(d.units))||
    ![onHand,onOrder,leadDays,casePack,unitCost,budget,maxStorageUnits].every(isNonnegative)||
    !Number.isInteger(leadDays)||!Number.isInteger(casePack)||casePack<1||
    !Number.isInteger(onHand)||!Number.isInteger(onOrder)||!Number.isInteger(maxStorageUnits))
    throw Error('Invalid nonnegative replenishment scenario inputs');
 const unitsToCover=dailyForecast.slice(0,Math.max(0,leadDays)).reduce((a,d)=>a+d.units,0);
 const target=Math.ceil(unitsToCover/casePack)*casePack;
 const shortage=Math.max(0,target-onHand-onOrder);
 const desiredPacks=Math.ceil(shortage/casePack);
 const storageCapacity=Math.max(0,maxStorageUnits-onHand-onOrder);
 const affordablePacks=unitCost>0?Math.floor(budget/(casePack*unitCost)):0;
 const packs=Math.max(0,Math.min(desiredPacks,Math.floor(storageCapacity/casePack),affordablePacks));
 const recommendedUnits=packs*casePack;
 return {method:'BOUNDED_CASE_PACK_HEURISTIC_NOT_OPTIMAL',
         lead_day_observed_sales_proxy:unitsToCover,target_units:target,
         illustrative_order_units:recommendedUnits,
         assumed_cost:recommendedUnits*unitCost,shortage_before:shortage,
         shortage_after:Math.max(0,shortage-recommendedUnits),
         stockout_risk:'UNKNOWN_WITHOUT_DEMAND_AND_SUPPLY_CALIBRATION',
         order_placed:false,merchant_authorized:false,
         confidence:'UNCALIBRATED',authority:'HOLD'};
}
function backtest(history,{horizon=7,minTrain=28}={}){
 validateHistory(history);
 if(![7,30].includes(horizon)||!Number.isInteger(minTrain)||minTrain<28)throw Error('Invalid holdout protocol');
 const cutoffs=[], missed=[];
 // Chronological expanding-window, non-overlapping outcomes; no future leakage.
 for(let cutoff=minTrain;cutoff+horizon<=history.length;cutoff+=horizon){
  const train=history.slice(0,cutoff);
  const test=history.slice(cutoff,cutoff+horizon);
  const candidate=weekdayBaseline(train,horizon);
  const historical=median(train.filter(d=>d.stockout!==true).map(d=>d.units_sold));
  if(historical===null){missed.push(cutoff);continue;}
  const naive=Array(horizon).fill(historical);
  if(test.some(d=>d.stockout===true||d.stockout===undefined)){
   missed.push(cutoff);continue;
  }
  const f2err=test.reduce((a,d,i)=>a+Math.abs(d.units_sold-candidate.forecast_daily[i].units),0);
  const baseerr=test.reduce((a,d,i)=>a+Math.abs(d.units_sold-naive[i]),0);
  cutoffs.push({as_of:train.at(-1).date,horizon,absolute_error_candidate:f2err,
                absolute_error_reference:baseerr,evaluated_days:horizon});
 }
 const total=cuts=>cuts.reduce((a,c)=>a+c,0);
 const cand=total(cutoffs.map(c=>c.absolute_error_candidate)),ref=total(cutoffs.map(c=>c.absolute_error_reference));
 const n=total(cutoffs.map(c=>c.evaluated_days));
 return {mode:'CHRONOLOGICAL_SHADOW_RESEARCH',cutoffs,abstained_cutoffs:missed,
         reference:'TRAINING_ONLY_GLOBAL_MEDIAN',candidate:'IN_STOCK_WEEKDAY_MEDIAN_V1',
         candidate_mae:n?cand/n:null,reference_mae:n?ref/n:null,
         evaluated_days:n,forecast_improvement_validated:false,
         training_data_rights_and_provenance:'NOT_EXTERNALLY_ATTESTED',
         authority:'HOLD',model_promotion:'HOLD'};
}
module.exports={validateHistory,weekdayBaseline,simulateReplenishment,backtest};
