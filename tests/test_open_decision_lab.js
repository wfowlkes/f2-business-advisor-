'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {validateHistory,weekdayBaseline,simulateReplenishment,backtest}=
 require('../lab/open_decision_lab.js');

function series(n=110,{pattern='weekday',stockoutAt=[],unknownAt=[]}={}){
 return Array.from({length:n},(_,i)=>{
 const date=new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10);
 const dow=new Date(date+'T00:00:00Z').getUTCDay();
 return {date,units_sold:pattern==='weekday'?(dow===0||dow===6?22:7):10,
         stockout:unknownAt.includes(i)?undefined:stockoutAt.includes(i)};
 });
}
test('normalizes future days from training only',()=>{
 const history=series(42);
 const r=weekdayBaseline(history,7);
 assert.equal(r.forecast_daily.length,7);
 assert.equal(r.observations_with_known_in_stock,42);
 assert.equal(r.authority,'HOLD');
 assert.equal(r.confidence,'UNCALIBRATED');
 assert(r.forecast_total>0);
});
test('no future test leakage or after-test method choice',()=>{
 const input=series(120),cutoff=55;
 const forecast=weekdayBaseline(input.slice(0,cutoff),30);
 input.splice(cutoff,65,...series(65,{pattern:'flat'}).map((r,i)=>({...r,date:new Date(Date.UTC(2026,0,1+cutoff+i)).toISOString().slice(0,10)})));
 assert.deepEqual(weekdayBaseline(input.slice(0,cutoff),30),forecast);
});
test('nonoverlapping strict cutoff backtest',()=>{
 const result=backtest(series(120),{horizon:7,minTrain:28});
 assert(result.cutoffs.length>5);
 assert.equal(result.evaluated_days,result.cutoffs.length*7);
 assert.equal(result.authority,'HOLD');
 assert.equal(result.forecast_improvement_validated,false);
 assert.equal(result.model_promotion,'HOLD');
});
test('missing stockout observation blocks validation window',()=>{
 const x=series(65,{stockoutAt:[42],unknownAt:[50]});
 const out=backtest(x,{horizon:7,minTrain:28});
 assert(out.abstained_cutoffs.length>=1);
 assert(out.evaluated_days<35);
});
test('unknown historical availability is not accepted as unblocked',()=>{
 const x=series(35,{unknownAt:[2]});
 const f=weekdayBaseline(x,7);
 assert.equal(f.unknown_stockout_days,1);
 assert.equal(f.observations_with_known_in_stock,34);
});
test('gapped and duplicate history cannot enter backtest',()=>{
 const x=series(40);x[4].date=x[3].date;
 assert.throws(()=>backtest(x),/consecutive/);
});
test('negative or malformed data blocked',()=>{
 const x=series(30);x[4].units_sold=-1;
 assert.throws(()=>weekdayBaseline(x,7),/Invalid/);
});
test('replenishment obeys case-pack, budget, capacity',()=>{
 const daily=Array.from({length:7},()=>({units:6}));
 const r=simulateReplenishment({dailyForecast:daily,onHand:10,onOrder:0,leadDays:7,
                               casePack:12,unitCost:2,budget:50,maxStorageUnits:36});
 assert.equal(r.illustrative_order_units,24);
 assert.equal(r.assumed_cost,48);
 assert.equal(r.order_placed,false);
 assert.equal(r.merchant_authorized,false);
 assert.equal(r.stockout_risk,'UNKNOWN_WITHOUT_DEMAND_AND_SUPPLY_CALIBRATION');
});
test('zero price does not create infinite free replenishment',()=>{
 const result=simulateReplenishment({dailyForecast:[{units:60}],onHand:0,
                 unitCost:0,budget:100,casePack:1});
 assert.equal(result.illustrative_order_units,0);
 assert.equal(result.authority,'HOLD');
});
test('inventory data cannot be negative, infinite or absurdly coded',()=>{
 for (const bad of [-1,Infinity,NaN]){
 assert.throws(()=>simulateReplenishment({dailyForecast:[{units:2}],
 onHand:10,leadDays:3,casePack:1,unitCost:bad,budget:20}));
 }
});
test('no real store access or customer records',()=>{
 const src=require('node:fs').readFileSync(require.resolve('../lab/open_decision_lab.js'),'utf8');
 assert(!src.includes('shopifyAdminFetch'));
 assert(!src.includes('access_token'));
 assert(!src.includes('fetch('));
});

test('must never infer zero true demand with insufficient in-stock exposure',()=>{
 const x=series(42,{unknownAt:Array.from({length:38},(_,i)=>i)});
 assert.throws(()=>weekdayBaseline(x,7),/HOLD: fewer than 14/);
});
