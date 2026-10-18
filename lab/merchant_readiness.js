/* Read-only pre-validation gate for Shopify aggregate research.
   No credentials, no external traffic, no UI mutation and no forecast promotion.
   Operational thresholds are conservative pilot heuristics, NOT statistical validation.
*/
'use strict';
const MIN_DAYS = 120, MIN_ACTIVE_DAYS = 30, MIN_ORDERS = 100;
const dateOK = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  !Number.isNaN(Date.parse(s+'T00:00:00Z')) &&
  new Date(s+'T00:00:00Z').toISOString().slice(0,10) === s;
const numeric = v => typeof v === 'number' && Number.isFinite(v) && v >= 0;
function assessMerchantReadiness({source='UNCONNECTED', daily=[], inventoryRows=[], customerSeries=[]}={}) {
  const blockers=[];
  if(source !== 'SHOPIFY_AGGREGATE') blockers.push('AUTHENTICATED_AGGREGATE_SOURCE_REQUIRED');
  if(!Array.isArray(daily)) daily=[];
  let valid=true, last=null, totalOrders=0, totalSales=0, activeDays=0;
  for(const row of daily) {
    if(!row || !dateOK(row.date) || !numeric(row.orders) ||
        !Number.isInteger(row.orders) || !numeric(row.total_sales)) { valid=false; break; }
    const t=Date.parse(row.date+'T00:00:00Z');
    if(last!==null && t-last!==86400000) { valid=false; break; }
    last=t;
    totalOrders+=row.orders;
    totalSales+=row.total_sales;
    if(row.orders>0) activeDays++;
  }
  if(!valid) blockers.push('DAILY_HISTORY_INVALID_OR_GAPPED');
  if(daily.length<MIN_DAYS) blockers.push('HISTORY_LESS_THAN_120_DAYS');
  if(valid && (totalOrders===0 || totalSales===0)) blockers.push('NO_OBSERVED_SALES_SIGNAL');
  if(valid && activeDays<MIN_ACTIVE_DAYS) blockers.push('TOO_FEW_ACTIVE_ORDER_DAYS');
  if(valid && totalOrders<MIN_ORDERS) blockers.push('TOO_FEW_ORDERS_FOR_PILOT');
  if(!Array.isArray(inventoryRows) || inventoryRows.length===0)
    blockers.push('INVENTORY_NOT_VERIFIED');
  if(!Array.isArray(customerSeries) || customerSeries.length===0)
    blockers.push('CUSTOMER_ACTIVITY_NOT_VERIFIED');
  const pilotEligible = blockers.length===0;
  return Object.freeze({
    phase:'REAL_MERCHANT_DATA_READINESS_ONLY', authority:'HOLD',
    forecasting_authorized:false, customer_decisions_authorized:false,
    model_promotion:'HOLD', pilot_data_ready:pilotEligible,
    evidence_level:'CALLER_SUPPLIED_NOT_INDEPENDENTLY_RECONCILED',
    days:daily.length, observed_order_days:valid?activeDays:null,
    orders:valid?totalOrders:null, observed_total_sales:valid?Math.round(totalSales*100)/100:null,
    inventory_data_present:Array.isArray(inventoryRows)&&inventoryRows.length>0,
    customer_data_present:Array.isArray(customerSeries)&&customerSeries.length>0,
    blockers,
    next_action:pilotEligible?'RECONCILE_FINANCIALS_AND_PRE_REGISTER_HOLDOUT':'CONTINUE_READ_ONLY_DATA_VALIDATION'
  });
}
module.exports = {assessMerchantReadiness,MIN_DAYS,MIN_ACTIVE_DAYS,MIN_ORDERS};
